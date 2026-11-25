/**
 * « Mission transporteur » : livraisons confiées à un transporteur partenaire (Transports Rabouin).
 * Le chauffeur est inconnu à l'avance : la mission est une tournée (même format que createCustomTour)
 * marquée `transporteur`, ouverte par un lien /chauffeur?k=… qui n'expire pas. Serveur uniquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listJson, readJson, writeJson } from "./datastore";
import { PHOTO_BUCKET, PLAN_CLIENTS, PLAN_TOURS } from "./fleet";
import { DEFAULT_CARRIER, PICKUP_HUBS, roadKm, type PlanClient, type PlanTour, type Point } from "./planif";
import { geocode } from "./planif-server";
import { createCustomTour } from "./demo-tour";
import { driverKey } from "./driver-link";
import { listEvents } from "./tour-live";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, SITE, sendEmail, sendSms } from "./brevo";
import { appendNote, gsm } from "./delivery-pack";

export class MissionError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
const OWNER_SMS = () => process.env.OWNER_SMS_PHONE || "0689781710";
const frDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const missionLink = (tourId: string) => { const k = driverKey(tourId); return k ? `${SITE}/chauffeur?k=${encodeURIComponent(k)}` : null; };

/** Réservations proposées pour une mission : pas encore livrées ni annulées. La « température » est lue si la colonne existe. */
export async function missionCandidates(db: SupabaseClient) {
  const cols = "id,prenom,nom,ville,code_postal,departement,statut,date_promise,livraison_mode,plan_client_id,modele,couleur,livre_at";
  const q = (c: string) => db.from("reservations").select(c).in("statut", ["Nouvelle", "Confirmée", "Planifiée"]).is("livre_at", null).order("id", { ascending: false }).limit(300);
  let { data, error } = await q(cols + ",temperature");
  if (error) ({ data, error } = await q(cols)); // colonne « temperature » pas encore créée
  if (error) throw new Error(error.message);
  const rank = (t: unknown) => (t === "chaud" ? 0 : t === "tiede" ? 1 : t === "froid" ? 3 : 2);
  const rows = ((data || []) as unknown as Record<string, unknown>[]).map(r => ({
    id: Number(r.id), name: `${r.prenom || ""} ${r.nom || ""}`.trim() || `Réservation ${r.id}`, ville: String(r.ville || ""), code_postal: String(r.code_postal || ""),
    departement: String(r.departement || String(r.code_postal || "").slice(0, 2) || ""), statut: String(r.statut || ""), date_promise: (r.date_promise as string) || null,
    livraison_mode: (r.livraison_mode as string) || null, modele: String(r.modele || ""), couleur: String(r.couleur || ""), temperature: (r.temperature as string) || null,
  }));
  return rows.sort((a, z) => rank(a.temperature) - rank(z.temperature) || a.departement.localeCompare(z.departement));
}

export type MissionInput = { resIds?: unknown; hubId?: unknown; hubAddress?: unknown; date?: unknown; departTime?: unknown; carrier?: unknown; driverName?: unknown; driverPhone?: unknown; email?: unknown; slots?: unknown };

/** Crée la mission : tournée « transporteur », réservations en livraison transporteur, statut « Planifiée », date promise. */
export async function createMission(db: SupabaseClient, b: MissionInput) {
  const ids = [...new Set((Array.isArray(b.resIds) ? b.resIds : []).map(Number).filter(n => Number.isInteger(n) && n > 0))];
  if (!ids.length) throw new MissionError("Choisissez au moins une réservation.");
  if (ids.length > 12) throw new MissionError("12 réservations au maximum par mission.");
  const base = PICKUP_HUBS.find(h => h.id === b.hubId);
  if (!base) throw new MissionError("Choisissez le point de chargement.");
  const hub = { id: base.id, name: base.name, address: clean(b.hubAddress, 200) || base.address, lat: base.lat, lng: base.lng };
  const date = String(b.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new MissionError("Choisissez la date de la mission.");
  const departTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.departTime || "")) ? String(b.departTime) : "08:00";
  const email = clean(b.email, 120);
  if (email && !EMAIL_RE.test(email)) throw new MissionError("E-mail du transporteur invalide.");
  const carrier = { name: clean(b.carrier, 80) || DEFAULT_CARRIER, ...(clean(b.driverName, 60) ? { driverName: clean(b.driverName, 60) } : {}), ...(clean(b.driverPhone, 30) ? { driverPhone: clean(b.driverPhone, 30) } : {}), ...(email ? { email } : {}), sent_at: null };
  if (!driverKey("t-test")) throw new MissionError("Lien chauffeur indisponible (secret serveur manquant).", 503);

  const { data, error } = await db.from("reservations").select("id,prenom,nom,adresse,code_postal,ville,plan_client_id,statut,livre_at").in("id", ids);
  if (error) throw new Error(error.message);
  const rows = data || [];
  const slots = (b.slots && typeof b.slots === "object" ? b.slots : {}) as Record<string, unknown>;
  const pts: { resId: number; lat: number; lng: number; slot: string }[] = [];
  for (const id of ids) {
    const r = rows.find(x => x.id === id);
    if (!r) throw new MissionError(`Réservation ${id} introuvable.`, 404);
    if (r.livre_at || r.statut === "Livrée" || r.statut === "Annulée") throw new MissionError(`${r.prenom || ""} ${r.nom || ""} : réservation déjà ${r.statut === "Annulée" ? "annulée" : "livrée"}.`);
    const pc = r.plan_client_id ? await readJson<PlanClient>(db, `${PLAN_CLIENTS}/${r.plan_client_id}.json`) : null;
    const pos = pc && Number.isFinite(pc.lat) && Number.isFinite(pc.lng) ? { lat: pc.lat, lng: pc.lng } : await geocode(r.adresse || "", r.code_postal || "", r.ville || "");
    if (!pos) throw new MissionError(`Adresse introuvable pour ${r.prenom || ""} ${r.nom || ""} : corrigez-la dans la réservation.`);
    pts.push({ resId: id, ...pos, slot: clean(slots[String(id)], 40) || "à confirmer avec le client" });
  }
  // Ordre de livraison : le client le plus proche à chaque fois, en partant du point de chargement.
  const order: (typeof pts[number] & { km: number; h: number })[] = []; let at: Point = hub; const left = [...pts];
  while (left.length) {
    let bi = 0; for (let k = 1; k < left.length; k++) if (roadKm(at, left[k]) < roadKm(at, left[bi])) bi = k;
    const [p] = left.splice(bi, 1); const km = Math.round(roadKm(at, p));
    order.push({ ...p, km, h: Math.round(km / 70 * 10) / 10 }); at = p;
  }
  const tourId = `t-mission-${date}-${Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, "x")}`;
  const r = await createCustomTour(db, {
    tourId, name: `${carrier.name} · ${hub.name} · ${date.slice(8, 10)}/${date.slice(5, 7)}`, date, departTime, driver: carrier.name, hub, back: null,
    clients: order.map(p => ({ resId: p.resId, lat: p.lat, lng: p.lng, slot: p.slot, legKm: p.km, legH: p.h })),
    transporteur: true, carrier, clientNote: `livraison par ${carrier.name}`,
  });
  for (const id of ids) await appendNote(db, id, `Mission transporteur ${carrier.name} du ${date} (chargement ${hub.name})`).catch(() => null);
  return { tour: r.tour, clients: r.clients, link: missionLink(r.tour) };
}

/** Envoie le lien de la mission au transporteur, par SMS et/ou e-mail. */
export async function sendMissionLink(db: SupabaseClient, tourId: string, o: { phone?: unknown; email?: unknown }) {
  const t = await readJson<PlanTour>(db, `${PLAN_TOURS}/${tourId}.json`);
  if (!t || !t.transporteur) throw new MissionError("Mission introuvable.", 404);
  const link = missionLink(t.id);
  if (!link) throw new MissionError("Lien chauffeur indisponible (secret serveur manquant).", 503);
  const phone = clean(o.phone, 30), email = clean(o.email, 120);
  if (!phone && !email) throw new MissionError("Entrez le téléphone ou l'e-mail du transporteur.");
  if (email && !EMAIL_RE.test(email)) throw new MissionError("E-mail invalide.");
  await applyStoredSecrets();
  if (!brevoReady()) throw new MissionError("Envoi indisponible (Brevo non connecté) : copiez le lien.", 503);
  const hub = (t.stops || [])[0];
  const n = t.clientIds.length;
  const sent = { sms: false, email: false, errors: [] as string[] };
  if (phone) {
    try { sent.sms = !!(await sendSms(phone, gsm(`NeoDrive : mission du ${frDay(t.date)}, chargement ${hub?.name || ""} a ${String(t.departTime || "08:00").replace(":", "h")}, ${n} voiture${n > 1 ? "s" : ""}. Ouvrez ce lien sur le telephone du chauffeur (valable sans limite) : ${link}`), "transactional")); }
    catch (e) { sent.errors.push("SMS : " + (e as Error).message); }
  }
  if (email) {
    const html = `<p>Bonjour,</p><p>Voici la mission NeoDrive du <b>${esc(frDay(t.date))}</b> : chargement à <b>${esc(hub?.name || "")}</b> (${esc(hub?.address || "")}) à ${esc(String(t.departTime || "08:00").replace(":", " h "))}, ${n} voiture${n > 1 ? "s" : ""} à livrer.</p><p>Le chauffeur ouvre ce lien sur son téléphone, sans code ni compte. Il reste valable jusqu'à la fin de la mission :</p><p><a href="${link}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Ouvrir la mission</a></p><p style="color:#555">${esc(link)}</p><p>À chaque client : photo de la plaque au chargement, photo du client à côté de la voiture, signature de la remise sur le téléphone. Aucun paiement à encaisser.</p><p>Une question : 06 89 78 17 10 (Mansour).</p><p>Merci,<br>NeoDrive</p>`;
    try { sent.email = !!(await sendEmail(email, t.carrier?.name || "", `Mission NeoDrive du ${frDay(t.date)} – lien chauffeur`, html, undefined, { replyTo: OWNER_EMAIL })); }
    catch (e) { sent.errors.push("E-mail : " + (e as Error).message); }
  }
  if (!sent.sms && !sent.email) throw new MissionError("Envoi impossible : " + sent.errors.join(" · "), 502);
  t.carrier = { ...(t.carrier || { name: t.driver }), sent_at: new Date().toISOString(), sent_to: [...(sent.sms ? [phone] : []), ...(sent.email ? [email] : [])] };
  await writeJson(db, `${PLAN_TOURS}/${t.id}.json`, t);
  return sent;
}

/** Coordinateurs logistiques actifs (équipe, rôle « logistique ») : prévenus de chaque étape de la mission. */
async function coordinators(db: SupabaseClient) {
  const { data, error } = await db.from("team_members").select("name,email,phone,role,active,revoked_at,expires_at,is_test").eq("role", "logistique");
  if (error) { console.error("[MISSION] coordinateurs", error.message); return []; }
  return (data || []).filter(m => m.active !== false && !m.revoked_at && !m.is_test && (!m.expires_at || Date.parse(m.expires_at) > Date.now())) as { name: string; email: string | null; phone: string | null }[];
}

export type CarrierEventKind = "charge" | "arrive" | "livre" | "refus" | "probleme";

/** Prévient le fondateur (e-mail à chaque étape, SMS pour « livré » et « refus ») et le coordinateur. Ne lève jamais d'erreur. */
export async function notifyCarrierEvent(db: SupabaseClient, t: PlanTour, kind: CarrierEventKind, o: { clientId?: string | null; note?: string | null; vin?: string | null } = {}) {
  try {
    await applyStoredSecrets();
    if (!brevoReady()) return;
    const stop = (t.stops || []).find(s => s.kind === "client" && s.id === o.clientId);
    const who = stop?.name || "client";
    const city = stop?.address ? stop.address.split(",").pop()?.trim() || "" : "";
    const carrier = t.carrier?.name || t.driver || "Transporteur";
    const head: Record<CarrierEventKind, string> = {
      charge: `📦 ${carrier} : voiture chargée pour ${who}`,
      arrive: `📍 ${carrier} est arrivé chez ${who}`,
      livre: `✅ Livré par ${carrier} : ${who} – appeler le client pour la prise en main`,
      refus: `↩️ REFUS : ${who} n'a pas signé, voiture rechargée`,
      probleme: `⚠️ Problème signalé par ${carrier}${o.clientId ? ` (${who})` : ""}`,
    };
    const url = `${SITE}/planificateur?tour=${encodeURIComponent(t.id)}`;
    const html = `<p><b>${esc(head[kind])}</b></p><p>Mission : ${esc(t.name)} (${esc(t.date)})${city ? `<br>Client : ${esc(who)}, ${esc(city)}` : ""}${o.vin ? `<br>VIN : ${esc(o.vin)}` : ""}${o.note ? `<br>Note du chauffeur : « ${esc(o.note)} »` : ""}</p>${kind === "livre" ? "<p><b>À faire : appeler le client aujourd'hui pour la prise en main.</b></p>" : ""}${kind === "refus" ? "<p><b>Appelez le client et le transporteur tout de suite.</b></p>" : ""}<p><a href="${url}">${esc(url)}</a></p>`;
    const coords = await coordinators(db);
    const mails = [OWNER_EMAIL, ...(process.env.COORDINATOR_EMAIL ? [process.env.COORDINATOR_EMAIL] : []), ...coords.map(c => c.email || "")].filter(e => EMAIL_RE.test(e));
    const [to, ...cc] = [...new Set(mails.map(e => e.toLowerCase()))];
    if (to) await sendEmail(to, "NeoDrive", head[kind], html, undefined, { cc }).catch(e => console.error("[MISSION] e-mail", e));
    if (kind === "livre" || kind === "refus") {
      const sms = gsm(`NeoDrive : ${head[kind]}${o.note ? ` (${o.note.slice(0, 80)})` : ""}.`);
      const phones = [OWNER_SMS(), ...coords.map(c => c.phone || "").filter(Boolean)];
      for (const p of [...new Set(phones)]) await sendSms(p, sms, "transactional").catch(e => console.error("[MISSION] SMS", e));
    }
  } catch (e) { console.error("[MISSION] notification", kind, e); }
}

/** Réservation liée au client de la mission. */
async function resOfClient(db: SupabaseClient, clientId: string) {
  const { data } = await db.from("reservations").select("id,vin,reserve_token,accuse_token").eq("plan_client_id", clientId).order("id", { ascending: false }).limit(1).maybeSingle();
  return data as { id: number; vin: string | null; reserve_token: string | null; accuse_token: string | null } | null;
}

/** Photo du client à côté de la voiture : rangée sur la réservation (colonne delivery_client_photo_path, sinon dans les notes). */
export async function saveClientPhoto(db: SupabaseClient, clientId: string, path: string) {
  const r = await resOfClient(db, clientId);
  if (!r) return null;
  const { error } = await db.from("reservations").update({ delivery_client_photo_path: path, updated_at: new Date().toISOString() }).eq("id", r.id);
  if (error) await appendNote(db, r.id, `Photo de remise (client à côté de la voiture) : ${path}`);
  return r.id;
}

/** Livrée par le transporteur : la coordinatrice doit appeler le client pour la prise en main (prise_en_main_due_at). */
export async function markPriseEnMainDue(db: SupabaseClient, clientId: string, carrier: string) {
  const r = await resOfClient(db, clientId);
  if (!r) return null;
  const at = new Date().toISOString();
  const { error } = await db.from("reservations").update({ prise_en_main_due_at: at, updated_at: at }).eq("id", r.id);
  await appendNote(db, r.id, `Livrée par ${carrier} : appeler le client pour la prise en main${error ? " (colonne prise_en_main_due_at absente : migration à passer)" : ""}`);
  return r.id;
}

/** Signature du client faite (remise avec réserve ou accusé final) ? */
export async function clientSigned(db: SupabaseClient, clientId: string) {
  const r = await resOfClient(db, clientId);
  return { res: r, signed: !!(r?.reserve_token || r?.accuse_token) };
}

/** Refus de signature : noté sur la réservation. */
export async function noteRefusal(db: SupabaseClient, clientId: string, carrier: string, note: string) {
  const r = await resOfClient(db, clientId);
  if (r) await appendNote(db, r.id, `REFUS de signature à la livraison (${carrier}) : voiture rechargée${note ? ` – « ${note} »` : ""}`);
  return r?.id || null;
}

export async function markPriseEnMainDone(db: SupabaseClient, resId: number) {
  const at = new Date().toISOString();
  const { error } = await db.from("reservations").update({ prise_en_main_done_at: at, updated_at: at }).eq("id", resId);
  if (error) throw new MissionError("Colonne prise_en_main_done_at absente : passez la migration « mission transporteur ».", 503);
  await appendNote(db, resId, "Prise en main faite (appel au client)");
}

/** Missions récentes : lien, envoi, et avancement client par client (photo de remise, prise en main). */
export async function listMissions(db: SupabaseClient) {
  const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => t.transporteur).sort((a, z) => z.date.localeCompare(a.date) || z.created_at.localeCompare(a.created_at)).slice(0, 12);
  if (!tours.length) return [];
  const events = await listEvents(db, tours.map(t => t.id));
  const cids = tours.flatMap(t => t.clientIds);
  const cols = "id,plan_client_id,prenom,nom,ville";
  const full = await db.from("reservations").select(cols + ",prise_en_main_due_at,prise_en_main_done_at").in("plan_client_id", cids);
  const rs: unknown = full.error ? (await db.from("reservations").select(cols).in("plan_client_id", cids)).data : full.data; // colonnes de prise en main pas encore créées
  const res = (rs || []) as { id: number; plan_client_id: string; prise_en_main_due_at?: string | null; prise_en_main_done_at?: string | null }[];
  const photoPaths = [...new Set(events.filter(e => e.kind === "photo_client" && e.photo_path).map(e => String(e.photo_path)))];
  const photos: Record<string, string> = {};
  if (photoPaths.length) { const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(photoPaths, 3600); for (const x of data || []) if (x.path && x.signedUrl) photos[x.path] = x.signedUrl; }
  return tours.map(t => ({
    id: t.id, name: t.name, date: t.date, departTime: t.departTime || "", carrier: t.carrier || { name: t.driver }, link: missionLink(t.id),
    hub: (t.stops || [])[0]?.name || t.hubId,
    clients: (t.stops || []).filter(s => s.kind === "client").map(s => {
      const ev = events.filter(e => e.tour_id === t.id && e.client_id === s.id);
      const last = (k: string) => ev.filter(e => e.kind === k).pop();
      const r = res.filter(x => x.plan_client_id === s.id).sort((a, z) => z.id - a.id)[0];
      const refus = last("refus"), livre = last("livre"), photo = last("photo_client");
      const status = livre ? "livré" : refus ? "refus" : photo ? "photo de remise prise" : last("arrive") ? "arrivé" : last("charge") ? "chargé" : "à charger";
      return { id: s.id, name: s.name, slot: s.slot || "", status, refusNote: refus?.note || null, photo: photo?.photo_path ? photos[String(photo.photo_path)] || null : null, resId: r?.id || null, prise_due: r?.prise_en_main_due_at || (livre ? livre.created_at : null), prise_done: r?.prise_en_main_done_at || null };
    }),
  }));
}
