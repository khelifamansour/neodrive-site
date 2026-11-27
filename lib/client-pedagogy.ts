/**
 * « Pédagogie client » : de temps en temps, une courte vidéo rassurante (témoignage, livraison, prise en main, recharge,
 * SAV et pièces en France, voiture en stock, coulisses du déchargement) envoyée sur WhatsApp aux clients qui ont réservé
 * et attendent leur livraison, pour garder le lien jusqu'au jour J.
 *
 * Vidéos : celles du site (marketing_settings « pedagogie_wa ».videos, activables depuis /studio/bibliotheque) + les vidéos
 * de la bibliothèque marquées « Pédagogie client » (étiquette « pedagogie » sur video_library).
 * Envoi : modèle Meta « neodrive_attente_livraison_video » (en-tête VIDÉO), uniquement s'il est APPROVED.
 * Règles : 1 vidéo tous les 5 jours au plus, 4 au total, jamais deux fois la même, réservation de plus de 2 jours,
 * statut Nouvelle / Confirmée / Planifiée non livrée, contacts désinscrits exclus, jamais au 06 76 19 22 34.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { relay, templateStatus } from "./package-sender";
import { BUCKET } from "./studio-video";

type Db = ReturnType<typeof crmDatabase>;
const SITE = "https://www.easydrive-auto.fr";
export const PEDAGOGIE_TEMPLATE = "neodrive_attente_livraison_video";
export const PEDAGOGIE_TAG = "pedagogie";
export const PEDAGOGIE_KEY = "pedagogie_wa";
/** WhatsApp refuse les vidéos de plus de 16 Mo en en-tête. */
export const WA_VIDEO_MAX = 16 * 1024 * 1024;
const EVERY_DAYS = 5, MAX_PER_CLIENT = 4, MIN_AGE_DAYS = 2;
const STATUTS = ["Nouvelle", "Confirmée", "Planifiée"];
const EXCLUDED = new Set(["676192234"]);
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);

export const PEDAGOGIE_BODY = [
  "Bonjour {{1}},",
  "",
  "En attendant la livraison de votre NeoDrive, voici une courte vidéo : {{2}}.",
  "",
  "Votre voiture est garantie 2 ans et le paiement se fait à la livraison. Une question d'ici là ? Répondez simplement à ce message, nous sommes là.",
  "",
  "L'équipe NeoDrive",
].join("\n");
const FOOTER = "Répondez STOP pour ne plus recevoir nos messages";

export type SiteVideo = { id: string; title: string; topic: string; url: string; active: boolean };
export type PedagogySettings = { enabled: boolean; videos: SiteVideo[] };
export type PedagogyVideo = { id: string; title: string; topic: string; source: "site" | "bibliotheque"; size: number | null; url?: string; path?: string };

/** Vidéos publiques du site proposées d'office (modifiables depuis la bibliothèque). */
export const DEFAULT_SITE_VIDEOS: SiteVideo[] = [
  { id: "site-temoignage-yonne", title: "Témoignage cliente (Yonne)", topic: "une cliente de l'Yonne vous raconte sa livraison et ses premiers trajets", url: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/site/temoignage-yonne.mp4", active: true },
  { id: "site-client2", title: "Livraison et prise en main (Brest)", topic: "une livraison et la prise en main avec un client à Brest", url: `${SITE}/client2.mp4`, active: true },
  { id: "site-client1", title: "Livraison client (région de Strasbourg)", topic: "la livraison d'un client dans la région de Strasbourg", url: `${SITE}/client1.mp4`, active: true },
];

export async function readPedagogySettings(db: Db): Promise<PedagogySettings> {
  const { data } = await db.from("marketing_settings").select("value").eq("key", PEDAGOGIE_KEY).maybeSingle();
  const v = (data?.value || {}) as Partial<PedagogySettings>;
  const videos = Array.isArray(v.videos) && v.videos.length ? v.videos : DEFAULT_SITE_VIDEOS;
  return { enabled: v.enabled !== false, videos };
}

export async function writePedagogySettings(db: Db, s: PedagogySettings) {
  const { error } = await db.from("marketing_settings").upsert({ key: PEDAGOGIE_KEY, value: s, description: "Vidéos « Pédagogie client » envoyées sur WhatsApp aux clients en attente de livraison (enabled = interrupteur général).", updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/** Phrase courte ({{2}}) déduite des étiquettes d'une vidéo de la bibliothèque. */
function topicFromTags(tags: string[]) {
  const t = new Set(tags);
  if (t.has("remise-des-cles")) return "la remise des clés à un client";
  if (t.has("livraison") || (t.has("client") && t.has("remorque"))) return "une livraison chez un client";
  if (t.has("remorque") || t.has("camion")) return "les coulisses d'une livraison, du camion jusqu'à la porte du client";
  if (t.has("voiture-interieur")) return "l'intérieur de la NeoDrive et sa prise en main";
  if (t.has("conduite")) return "la NeoDrive sur la route";
  if (t.has("fondateur-face-camera")) return "un mot de l'équipe NeoDrive";
  if (t.has("client")) return "un client NeoDrive avec sa voiture";
  return "la NeoDrive en vidéo";
}

/** Toutes les vidéos actives du jeu « Pédagogie client », dans l'ordre d'envoi. */
export async function pedagogyVideos(db: Db): Promise<{ settings: PedagogySettings; videos: PedagogyVideo[]; skipped: { id: string; title: string; why: string }[] }> {
  const settings = await readPedagogySettings(db);
  const videos: PedagogyVideo[] = settings.videos.filter(v => v.active && v.url).map(v => ({ id: v.id, title: v.title, topic: v.topic, source: "site", size: null, url: v.url }));
  const skipped: { id: string; title: string; why: string }[] = [];
  const { data } = await db.from("video_library").select("id,name,path,size,status,tags,has_client,consent,created_at").contains("tags", [PEDAGOGIE_TAG]).order("created_at", { ascending: true }).limit(100);
  for (const r of (data || []) as { id: string; name: string; path: string; size: number; status: string; tags: string[]; has_client: boolean; consent: boolean }[]) {
    if (r.status !== "analysed") { skipped.push({ id: r.id, title: r.name, why: "pas encore analysée" }); continue; }
    if (!r.size || r.size > WA_VIDEO_MAX) { skipped.push({ id: r.id, title: r.name, why: "plus de 16 Mo (limite WhatsApp)" }); continue; }
    if (r.has_client && !r.consent) { skipped.push({ id: r.id, title: r.name, why: "client visible sans accord" }); continue; }
    videos.push({ id: `lib-${r.id}`, title: r.name, topic: topicFromTags(r.tags || []), source: "bibliotheque", size: r.size, path: r.path });
  }
  return { settings, videos, skipped };
}

async function videoUrl(db: Db, v: PedagogyVideo) {
  if (v.url) return v.url;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(v.path || "", 7 * 86400);
  if (error || !data?.signedUrl) throw new Error("Lien vidéo impossible : " + (error?.message || ""));
  return data.signedUrl;
}

/** État du modèle chez Meta ; create=true le soumet s'il n'existe pas (rien n'est envoyé tant qu'il n'est pas APPROVED). */
export async function pedagogyTemplateStatus(create: boolean) {
  return templateStatus(PEDAGOGIE_TEMPLATE, create, async () => {
    const up = await relay("upload-handle", { url: `${SITE}/client1.mp4`, type: "video/mp4" });
    if (!up.ok || !up.j?.h) throw new Error(up.j?.error?.message || up.j?.error || "Téléversement de la vidéo d'exemple refusé");
    return [
      { type: "HEADER", format: "VIDEO", example: { header_handle: [up.j.h] } },
      { type: "BODY", text: PEDAGOGIE_BODY, example: { body_text: [["Marie", "une cliente de l'Yonne vous raconte sa livraison et ses premiers trajets"]] } },
      { type: "FOOTER", text: FOOTER },
    ];
  }, "MARKETING");
}

type Sent = { video: string; at: string };
type Res = { id: number; created_at: string; statut: string; prenom: string | null; nom: string | null; telephone: string | null; lead_id: number | null; livre_at: string | null; confirm: Record<string, unknown> | null; notes: string | null };
type Lead = { id: number; telephone: string | null; history: unknown; opted_out_at: string | null };

const sentOf = (r: Res): Sent[] => { const p = (r.confirm || {}).pedagogie; return Array.isArray(p) ? (p as Sent[]).filter(x => x && x.video && x.at) : []; };
const prenomOf = (r: Res) => { const p = String(r.prenom || "").trim().replace(/\s+/g, " ").slice(0, 40); return p ? p.charAt(0).toUpperCase() + p.slice(1) : "à vous"; };
const parisHour = () => Number(new Date().toLocaleString("fr-FR", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }).slice(0, 2));
const parisDay = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });

export type PlanRow = { reservation: number; prenom: string; phone: string; statut: string; video: string; title: string; topic: string; already: number; lastAt: string | null };

/** Qui recevrait quoi maintenant (sans rien envoyer). */
export async function pedagogyPlan(db: Db) {
  const { settings, videos, skipped } = await pedagogyVideos(db);
  const { data, error } = await db.from("reservations").select("id,created_at,statut,prenom,nom,telephone,lead_id,livre_at,confirm,notes")
    .in("statut", STATUTS).is("livre_at", null).lt("created_at", new Date(Date.now() - MIN_AGE_DAYS * 86400000).toISOString()).order("created_at", { ascending: true }).limit(500);
  if (error) throw new Error(error.message);
  const rows = (data || []) as Res[];
  // Plusieurs réservations au même numéro : un seul client (envois cumulés).
  const byPhone = new Map<string, Res[]>();
  for (const r of rows) { const k = last9(r.telephone); if (k.length === 9) byPhone.set(k, [...(byPhone.get(k) || []), r]); }
  const keys = [...byPhone.keys()];
  const variants = keys.flatMap(k => [`0${k}`, `33${k}`, `+33${k}`, k]);
  const [{ data: black }, { data: leadRows }] = await Promise.all([
    keys.length ? db.from("whatsapp_blacklist").select("phone").in("phone", variants) : Promise.resolve({ data: [] as { phone: string }[] }),
    db.from("leads").select("id,telephone,history,opted_out_at").or(`id.in.(${[0, ...rows.map(r => r.lead_id).filter(Boolean)].join(",")})${keys.length ? "," + keys.map(k => `telephone.ilike.*${k}`).join(",") : ""}`).limit(2000),
  ]);
  const blocked = new Set(((black || []) as { phone: string }[]).map(b => last9(b.phone)));
  const leads = (leadRows || []) as Lead[];
  const plan: PlanRow[] = []; const excluded: { reservation: number; why: string }[] = [];
  const now = Date.now();
  for (const [k, rs] of byPhone) {
    const r = rs[rs.length - 1];
    const ls = leads.filter(l => last9(l.telephone) === k || rs.some(x => x.lead_id === l.id));
    if (EXCLUDED.has(k)) { excluded.push({ reservation: r.id, why: "numéro exclu" }); continue; }
    if (blocked.has(k) || ls.some(l => l.opted_out_at)) { excluded.push({ reservation: r.id, why: "désinscrit (STOP)" }); continue; }
    const sent = rs.flatMap(sentOf);
    if (sent.length >= MAX_PER_CLIENT) { excluded.push({ reservation: r.id, why: `${MAX_PER_CLIENT} vidéos déjà envoyées` }); continue; }
    const lastAt = sent.map(s => s.at).sort().pop() || null;
    if (lastAt && now - new Date(lastAt).getTime() < EVERY_DAYS * 86400000 - 3 * 3600000) continue;
    const seen = new Set(sent.map(s => s.video));
    const fresh = videos.filter(v => !seen.has(v.id));
    if (!fresh.length) { excluded.push({ reservation: r.id, why: "toutes les vidéos déjà envoyées" }); continue; }
    // Rotation : chaque client démarre à un endroit différent de la liste, sans jamais revoir une vidéo.
    const v = fresh[(r.id + sent.length) % fresh.length];
    plan.push({ reservation: r.id, prenom: prenomOf(r), phone: k, statut: r.statut, video: v.id, title: v.title, topic: v.topic, already: sent.length, lastAt });
  }
  return { settings, videos, skipped, plan, excluded };
}

/** Envoie la vidéo prévue à chaque client (au plus `limit` par passage, espacés), et note tout. */
export async function sendPedagogy(db: Db, opts: { dry?: boolean; limit?: number; spacingMs?: number } = {}) {
  const tpl = await pedagogyTemplateStatus(false).catch(e => ({ name: PEDAGOGIE_TEMPLATE, status: "ERREUR", reason: (e as Error).message }));
  const p = await pedagogyPlan(db);
  const base = { template: tpl, enabled: p.settings.enabled && process.env.PEDAGOGIE_WA !== "off", videos: p.videos.map(v => ({ id: v.id, title: v.title, source: v.source })), skippedVideos: p.skipped, excluded: p.excluded };
  if (opts.dry) return { ok: true, dry: true, ...base, wouldSend: p.plan.length, plan: p.plan };
  if (!base.enabled) return { ok: true, ...base, sent: 0, note: "Envois « Pédagogie client » coupés (interrupteur)." };
  if (tpl.status !== "APPROVED") return { ok: true, ...base, sent: 0, note: "Modèle pas encore approuvé par Meta : rien n'a été envoyé." };
  if (parisDay() === "dimanche" || parisHour() < 9 || parisHour() >= 19) return { ok: true, ...base, sent: 0, note: "Hors horaires (9 h – 19 h, hors dimanche)." };

  const limit = Math.min(30, opts.limit || 20); const spacing = opts.spacingMs ?? 8000;
  const byId = new Map(p.videos.map(v => [v.id, v]));
  const results: { reservation: number; video: string; sent: boolean; error?: string }[] = []; let stopped = "";
  for (const [i, row] of p.plan.slice(0, limit).entries()) {
    if (i) await new Promise(r => setTimeout(r, spacing));
    const v = byId.get(row.video)!;
    try {
      const headerVideo = await videoUrl(db, v);
      const r = await relay("send-template", { to: normalizePhone("0" + row.phone), name: PEDAGOGIE_TEMPLATE, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [row.prenom, row.topic], headerVideo });
      if (!r.ok) {
        const code = r.j?.error?.code;
        const err = Object.assign(new Error(r.j?.error?.message || r.j?.error || "Envoi refusé"), { fatal: r.status === 401 || r.status === 403 || code === 190 || code === 132001 || code === 131042 });
        throw err;
      }
      const at = new Date().toISOString(); const mid = r.j?.messages?.[0]?.id || null;
      const { data: cur } = await db.from("reservations").select("id,confirm,notes,lead_id,telephone").eq("id", row.reservation).maybeSingle();
      const c = (cur?.confirm || {}) as Record<string, unknown>;
      const line = `${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} : vidéo WhatsApp « ${v.title} » envoyée (pédagogie attente livraison, ${row.already + 1}/${MAX_PER_CLIENT})`;
      await db.from("reservations").update({ confirm: { ...c, pedagogie: [...(Array.isArray(c.pedagogie) ? c.pedagogie : []), { video: v.id, at }] }, notes: [cur?.notes, line].filter(Boolean).join(" · "), updated_at: at }).eq("id", row.reservation);
      const { data: ls } = await db.from("leads").select("id,history").or(`telephone.ilike.*${row.phone}${cur?.lead_id ? `,id.eq.${cur.lead_id}` : ""}`).limit(5);
      const body = `🎬 [vidéo : ${v.title}]\n` + PEDAGOGIE_BODY.replace("{{1}}", row.prenom).replace("{{2}}", row.topic);
      for (const l of (ls || []) as { id: number; history: unknown }[]) {
        const h = Array.isArray(l.history) ? l.history : [];
        await db.from("leads").update({ history: [...h, { type: "wa_pedagogie", channel: "whatsapp", template: PEDAGOGIE_TEMPLATE, video: v.id, reservation: row.reservation, sent_at: at }].slice(-60), last_contact_at: at, updated_at: at }).eq("id", l.id);
        await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "whatsapp", body, provider_message_id: mid, status: "sent", ai_generated: false });
      }
      results.push({ reservation: row.reservation, video: v.id, sent: true });
    } catch (e) {
      const m = (e as Error).message || "erreur";
      results.push({ reservation: row.reservation, video: row.video, sent: false, error: m.slice(0, 160) });
      if ((e as { fatal?: boolean }).fatal) { stopped = m; break; }
    }
  }
  return { ok: true, ...base, sent: results.filter(r => r.sent).length, stopped, results };
}
