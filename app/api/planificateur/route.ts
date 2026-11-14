import { NextResponse } from "next/server";
import { authorizeSection } from "../../../lib/access";
import { dataClient, listJson, readJson, removeJson, writeJson } from "../../../lib/datastore";
import { DEFAULT_HUBS, type Hub, type PlanClient, type PlanTour } from "../../../lib/planif";
import { deliveryPriceForDepartment } from "../../../lib/neodrive-pricing";
import { ALERT_ENDPOINT } from "../../../lib/sav";
import { driverKey } from "../../../lib/driver-link";
import { addEvent, listEvents, purgeOldPositions } from "../../../lib/tour-live";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const C = "planificateur/clients", T = "planificateur/tours", H = "planificateur/hubs.json";
const SITE = "https://www.easydrive-auto.fr";
const clean = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
type SB = NonNullable<ReturnType<typeof dataClient>>;

async function geocode(adresse: string, cp: string, ville: string) {
  try {
    const q = encodeURIComponent(`${adresse} ${cp} ${ville}`.trim());
    const f = (await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1${/^\d{5}$/.test(cp) ? `&postcode=${cp}` : ""}`, { cache: "no-store" })).json())?.features?.[0];
    if (f) return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
    const f2 = (await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cp + " " + ville)}&type=municipality&limit=1`, { cache: "no-store" })).json())?.features?.[0];
    if (f2) return { lng: f2.geometry.coordinates[0], lat: f2.geometry.coordinates[1] };
  } catch (e) { console.error("[PLANIF] geocode", e); }
  return null;
}
const readHubs = async (sb: SB): Promise<Hub[]> => { const h = await readJson<Hub[]>(sb, H); return Array.isArray(h) && h.length ? h : DEFAULT_HUBS; };

async function buildClient(b: Record<string, unknown>, source: PlanClient["source"]): Promise<PlanClient | { error: string }> {
  const c = { prenom: clean(b.prenom, 80), nom: clean(b.nom, 80), telephone: clean(b.telephone, 30), email: clean(b.email, 120), adresse: clean(b.adresse), code_postal: clean(b.code_postal, 5), ville: clean(b.ville, 80), modele: clean(b.modele, 60), couleur: clean(b.couleur, 40), note: clean(b.note, 500) };
  if (!c.nom || !/^\d{5}$/.test(c.code_postal) || !c.ville) return { error: "Nom, code postal et ville sont obligatoires." };
  const pos = await geocode(c.adresse, c.code_postal, c.ville);
  if (!pos) return { error: "Adresse introuvable, vérifiez le code postal et la ville." };
  const total = Number(b.total);
  return { id: `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`, token: crypto.randomUUID(), created_at: new Date().toISOString(), source, ...c, total: Number.isFinite(total) && total > 0 ? total : null, status: "a_planifier", tour_id: null, ...pos };
}

/** Prix moyen national des carburants (données officielles prix-carburants). */
async function fuelPrices() {
  try {
    const u = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?select=avg(gazole_prix)%20as%20gazole,avg(e10_prix)%20as%20e10,avg(sp95_prix)%20as%20sp95,avg(e85_prix)%20as%20e85,avg(gplc_prix)%20as%20gpl&limit=1";
    const r = await fetch(u, { cache: "no-store" });
    const row = (await r.json())?.results?.[0];
    if (row?.gazole) return { ok: true, at: new Date().toISOString(), prices: { gazole: +row.gazole, e10: +row.e10, sp95: +row.sp95, e85: +row.e85, gpl: +row.gpl } };
  } catch (e) { console.error("[PLANIF] fuel", e); }
  return { ok: false, at: null, prices: null };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    // ── Public : réservation du site → planificateur
    if (b.action === "reservation") {
      const c = await buildClient(b, "reservation");
      if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
      await writeJson(sb, `${C}/${c.id}.json`, c);
      return NextResponse.json({ ok: true });
    }
    // ── Public : accusé de réception du client (lien personnel)
    if (b.action === "reception_get" || b.action === "reception_confirm") {
      const id = clean(b.id, 80), token = clean(b.token, 80);
      const c = await readJson<PlanClient>(sb, `${C}/${id}.json`);
      if (!c || !c.token || c.token !== token) return NextResponse.json({ ok: false, error: "Lien invalide." }, { status: 404 });
      if (b.action === "reception_get") return NextResponse.json({ ok: true, client: { prenom: c.prenom, nom: c.nom, modele: c.modele, ville: c.ville, received_at: c.received_at || null } });
      const signature = clean(b.signature, 120);
      if (signature.length < 3 || !b.accept) return NextResponse.json({ ok: false, error: "Signature et confirmation requises." }, { status: 400 });
      c.status = "livre"; c.received_at = new Date().toISOString(); c.received_by = signature; c.reception_note = clean(b.note, 1000);
      await writeJson(sb, `${C}/${c.id}.json`, c);
      // Suivi par VIN : le véhicule attribué à cette réservation passe « livrée »
      const { data: veh } = await sb.from("shipment_vehicles").select("id,status,history").eq("client_id", c.id).neq("status", "livrée");
      for (const v of veh || []) await sb.from("shipment_vehicles").update({ status: "livrée", delivered_at: c.received_at, updated_at: c.received_at, history: [...(Array.isArray(v.history) ? v.history : []), { at: c.received_at, stage: "livrée", by: signature, note: "accusé de réception signé par le client" }] }).eq("id", v.id);
      fetch(ALERT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Referer: SITE + "/reception", Origin: SITE }, body: JSON.stringify({ _subject: `✅ Livraison confirmée — ${c.prenom} ${c.nom} (${c.ville})`, client: `${c.prenom} ${c.nom}`, ville: `${c.code_postal} ${c.ville}`, modele: c.modele, signe_par: signature, remarque: c.reception_note || "aucune", date: new Date().toLocaleString("fr-FR") }) }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    // Public : prix moyen national des carburants (données publiques)
    if (b.action === "fuel") return NextResponse.json(await fuelPrices());
    const acc = await authorizeSection(req, b.passcode, "tournees");
    if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
    // Suppressions et simulation : fondateur uniquement.
    if (acc.who !== "owner" && (b.action === "demo" || b.action === "demo_clear" || b.action === "delete_tour" || (b.action === "client_status" && b.delete))) return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });

    if (b.action === "list") {
      const [clients, tours, hubs] = await Promise.all([listJson<PlanClient>(sb, C), listJson<PlanTour>(sb, T), readHubs(sb)]);
      // jeton de réception pour les anciens clients
      for (const c of clients) if (!c.token) { c.token = crypto.randomUUID(); await writeJson(sb, `${C}/${c.id}.json`, c); }
      return NextResponse.json({ ok: true, clients, tours, hubs });
    }
    if (b.action === "demo") {
      // Simulation : 10 clients test répartis en France + 20 voitures par hub
      const DEMO: [string, string, string, string, string][] = [["Martin","Julie","12 rue Alsace Lorraine","31000","Toulouse"],["Dubois","Karim","10 cours de l'Intendance","33000","Bordeaux"],["Bernard","Sophie","5 rue Foch","34000","Montpellier"],["Petit","Nadia","20 La Canebière","13001","Marseille"],["Robert","Paul","3 rue de la République","69001","Lyon"],["Richard","Emma","8 rue Crébillon","44000","Nantes"],["Durand","Hugo","15 rue Nationale","37000","Tours"],["Leroy","Inès","2 rue Faidherbe","59000","Lille"],["Moreau","Lucas","1 place Kléber","67000","Strasbourg"],["Simon","Léa","30 rue du Gros Horloge","76000","Rouen"]];
      const existing = await listJson<PlanClient>(sb, C);
      let created = 0;
      for (const [i, [nom, prenom, adresse, code_postal, ville]] of DEMO.entries()) {
        if (existing.some(c => c.nom === nom && c.prenom === prenom && c.note?.startsWith("TEST"))) continue;
        const c = await buildClient({ nom, prenom, adresse, code_postal, ville, telephone: `06 12 34 56 ${String(10 + i)}`, email: `test${i + 1}@example.com`, modele: "NeoDrive Confort", total: 4990 + (deliveryPriceForDepartment(code_postal.slice(0, 2)) || 0), note: "TEST simulation — à supprimer" }, "reservation");
        if (!("error" in c)) { await writeJson(sb, `${C}/${c.id}.json`, c); created++; }
      }
      const hubs = (await readHubs(sb)).map(h => ({ ...h, stock: h.id === "lamasquere" || h.id === "boran" ? 20 : h.stock }));
      await writeJson(sb, H, hubs);
      return NextResponse.json({ ok: true, created });
    }
    if (b.action === "demo_clear") {
      const del = (await listJson<PlanClient>(sb, C)).filter(c => c.note?.startsWith("TEST") || c.prenom === "TEST");
      if (del.length) await removeJson(sb, del.map(c => `${C}/${c.id}.json`));
      return NextResponse.json({ ok: true, deleted: del.length });
    }
    if (b.action === "add") {
      const c = await buildClient(b, "manuel");
      if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
      await writeJson(sb, `${C}/${c.id}.json`, c);
      return NextResponse.json({ ok: true, client: c });
    }
    if (b.action === "client_status") {
      const id = clean(b.id, 80);
      if (b.delete) { await removeJson(sb, [`${C}/${id}.json`]); return NextResponse.json({ ok: true }); }
      const c = await readJson<PlanClient>(sb, `${C}/${id}.json`);
      if (!c) return NextResponse.json({ ok: false, error: "Client introuvable" }, { status: 404 });
      if (["a_planifier", "planifie", "livre"].includes(String(b.status))) c.status = b.status as PlanClient["status"];
      if (c.status === "a_planifier") c.tour_id = null;
      await writeJson(sb, `${C}/${id}.json`, c);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "save_hubs") {
      const hubs = (Array.isArray(b.hubs) ? b.hubs : []) as Hub[];
      const ok = hubs.filter(h => h && h.id && h.name && Number.isFinite(h.lat) && Number.isFinite(h.lng)).map(h => ({ id: clean(h.id, 60), name: clean(h.name, 80), lat: Number(h.lat), lng: Number(h.lng), stock: Math.max(0, Math.round(Number(h.stock) || 0)) }));
      if (!ok.length) return NextResponse.json({ ok: false, error: "Au moins un hub est nécessaire." }, { status: 400 });
      await writeJson(sb, H, ok);
      return NextResponse.json({ ok: true, hubs: ok });
    }
    if (b.action === "add_hub") {
      const name = clean(b.name, 80);
      const pos = name.length >= 2 ? await geocode("", "", name) : null;
      if (!pos) return NextResponse.json({ ok: false, error: "Ville introuvable" }, { status: 400 });
      const hubs = await readHubs(sb);
      hubs.push({ id: `hub-${Date.now()}`, name, stock: Math.max(0, Math.round(Number(b.stock) || 0)), ...pos });
      await writeJson(sb, H, hubs);
      return NextResponse.json({ ok: true, hubs });
    }
    if (b.action === "save_tour") {
      const t = b.tour as PlanTour;
      if (!t?.id || !Array.isArray(t.clientIds)) return NextResponse.json({ ok: false, error: "Tournée invalide" }, { status: 400 });
      const prev = await readJson<PlanTour>(sb, `${T}/${t.id}.json`);
      const validating = t.status === "valide" && prev?.status !== "valide";
      if (validating && !t.stops?.length) return NextResponse.json({ ok: false, error: "Calculez la tournée avant de la valider." }, { status: 400 });
      const ids = new Set(t.clientIds);
      for (const c of await listJson<PlanClient>(sb, C)) {
        if (ids.has(c.id) && c.status !== "livre" && (c.tour_id !== t.id || c.status !== "planifie")) { c.tour_id = t.id; c.status = "planifie"; await writeJson(sb, `${C}/${c.id}.json`, c); }
        else if (!ids.has(c.id) && c.tour_id === t.id && c.status === "planifie") { c.tour_id = null; c.status = "a_planifier"; await writeJson(sb, `${C}/${c.id}.json`, c); }
      }
      if (validating) {
        const hubs = await readHubs(sb);
        for (const s of t.stops || []) if (s.kind === "depot" && s.loaded) { const h = hubs.find(x => x.id === s.id); if (h) h.stock = Math.max(0, h.stock - s.loaded); }
        await writeJson(sb, H, hubs);
      }
      await writeJson(sb, `${T}/${t.id}.json`, t);
      return NextResponse.json({ ok: true, hubs: await readHubs(sb) });
    }
    // ── Planning : heure (et date) de départ, modifiable même après validation
    if (b.action === "tour_depart") {
      const id = clean(b.id, 80);
      const t = await readJson<PlanTour>(sb, `${T}/${id}.json`);
      if (!t) return NextResponse.json({ ok: false, error: "Tournée introuvable" }, { status: 404 });
      const time = clean(b.time, 5), date = clean(b.date, 10);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NextResponse.json({ ok: false, error: "Heure de départ invalide (ex. 07:30)." }, { status: 400 });
      t.departTime = time; if (/^\d{4}-\d{2}-\d{2}$/.test(date)) t.date = date;
      await writeJson(sb, `${T}/${t.id}.json`, t);
      return NextResponse.json({ ok: true, tour: t });
    }
    // ── Suivi en direct d'une tournée (journal, dernière position, lien chauffeur)
    if (b.action === "live") {
      const id = clean(b.id, 80);
      const t = await readJson<PlanTour>(sb, `${T}/${id}.json`);
      if (!t) return NextResponse.json({ ok: false, error: "Tournée introuvable" }, { status: 404 });
      await purgeOldPositions(sb).catch(e => console.error("[PLANIF] purge", e));
      const [events, clients] = await Promise.all([listEvents(sb, [t.id], !!b.track), Promise.all(t.clientIds.map(cid => readJson<PlanClient>(sb, `${C}/${cid}.json`)))]);
      return NextResponse.json({ ok: true, tour: t, events, clients: clients.filter(Boolean), driverLink: driverKey(t.id) });
    }
    // ── Carte compacte (Organisation) : tournées validées récentes ou en cours
    if (b.action === "live_summary") {
      const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), past = new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10);
      const tours = (await listJson<PlanTour>(sb, T)).filter(t => t.status === "valide" && t.stops?.length && t.date >= past && t.date <= soon).sort((a, z) => a.date.localeCompare(z.date)).slice(0, 8);
      const events = await listEvents(sb, tours.map(t => t.id));
      return NextResponse.json({ ok: true, tours: tours.map(t => ({ id: t.id, name: t.name, date: t.date, departTime: t.departTime || "", driver: t.driver, clientIds: t.clientIds, stops: t.stops })), events });
    }
    // ── « Prévenir le client » : le message WhatsApp est ouvert par l'utilisateur ; on le note seulement
    if (b.action === "log_notify") {
      const id = clean(b.id, 80), cid = clean(b.client_id, 80);
      const t = await readJson<PlanTour>(sb, `${T}/${id}.json`);
      if (!t || !t.clientIds.includes(cid)) return NextResponse.json({ ok: false, error: "Tournée ou client introuvable" }, { status: 404 });
      const si = t.stops?.findIndex(s => s.kind === "client" && s.id === cid) ?? -1;
      const event = await addEvent(sb, { tour_id: t.id, kind: "prevenir", client_id: cid, stop_index: si >= 0 ? si : null, note: clean(b.note, 300) || null, author: acc.name });
      return NextResponse.json({ ok: true, event });
    }
    if (b.action === "delete_tour") {
      const id = clean(b.id, 80);
      const t = await readJson<PlanTour>(sb, `${T}/${id}.json`);
      if (t) {
        for (const cid of t.clientIds || []) { const c = await readJson<PlanClient>(sb, `${C}/${cid}.json`); if (c && c.tour_id === id && c.status === "planifie") { c.status = "a_planifier"; c.tour_id = null; await writeJson(sb, `${C}/${c.id}.json`, c); } }
        if (t.status === "valide") { const hubs = await readHubs(sb); for (const s of t.stops || []) if (s.kind === "depot" && s.loaded) { const h = hubs.find(x => x.id === s.id); if (h) h.stock += s.loaded; } await writeJson(sb, H, hubs); }
      }
      await removeJson(sb, [`${T}/${id}.json`]);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[PLANIF]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
