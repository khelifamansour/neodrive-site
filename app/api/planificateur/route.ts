import { NextResponse } from "next/server";
import { isAuthorized, serviceClient } from "../../../lib/integrations";
import { DEFAULT_HUBS, type Hub, type PlanClient, type PlanTour } from "../../../lib/planif";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "erp-documents";
const C = "planificateur/clients", T = "planificateur/tours", H = "planificateur/hubs.json";
const clean = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

async function geocode(adresse: string, cp: string, ville: string) {
  try {
    const q = encodeURIComponent(`${adresse} ${cp} ${ville}`.trim());
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1${/^\d{5}$/.test(cp) ? `&postcode=${cp}` : ""}`, { cache: "no-store" });
    const j = await r.json();
    const f = j?.features?.[0];
    if (f) return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
    const r2 = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cp + " " + ville)}&type=municipality&limit=1`, { cache: "no-store" });
    const f2 = (await r2.json())?.features?.[0];
    if (f2) return { lng: f2.geometry.coordinates[0], lat: f2.geometry.coordinates[1] };
  } catch { /* ignore */ }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readAll<X>(sb: any, folder: string): Promise<X[]> {
  const { data } = await sb.storage.from(BUCKET).list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  const files = (data || []).filter((f: { name: string }) => f.name.endsWith(".json"));
  const out = await Promise.all(files.map(async (f: { name: string }) => { const { data: d } = await sb.storage.from(BUCKET).download(`${folder}/${f.name}`); try { return d ? JSON.parse(await d.text()) : null; } catch { return null; } }));
  return out.filter(Boolean) as X[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const write = (sb: any, path: string, obj: unknown) => sb.storage.from(BUCKET).upload(path, Buffer.from(JSON.stringify(obj)), { contentType: "application/json", upsert: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readHubs(sb: any): Promise<Hub[]> {
  const { data } = await sb.storage.from(BUCKET).download(H);
  if (!data) return DEFAULT_HUBS;
  try { const h = JSON.parse(await data.text()); return Array.isArray(h) && h.length ? h : DEFAULT_HUBS; } catch { return DEFAULT_HUBS; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJson<X>(sb: any, path: string): Promise<X | null> { const { data } = await sb.storage.from(BUCKET).download(path); if (!data) return null; try { return JSON.parse(await data.text()); } catch { return null; } }

async function buildClient(b: Record<string, unknown>, source: PlanClient["source"]): Promise<PlanClient | { error: string }> {
  const c = { prenom: clean(b.prenom, 80), nom: clean(b.nom, 80), telephone: clean(b.telephone, 30), email: clean(b.email, 120), adresse: clean(b.adresse), code_postal: clean(b.code_postal, 5), ville: clean(b.ville, 80), modele: clean(b.modele, 60), couleur: clean(b.couleur, 40), note: clean(b.note, 500) };
  if (!c.nom || !/^\d{5}$/.test(c.code_postal) || !c.ville) return { error: "Nom, code postal et ville sont obligatoires." };
  const pos = await geocode(c.adresse, c.code_postal, c.ville);
  if (!pos) return { error: "Adresse introuvable, vérifiez le code postal et la ville." };
  const total = Number(b.total);
  return { id: `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`, created_at: new Date().toISOString(), source, ...c, total: Number.isFinite(total) && total > 0 ? total : null, status: "a_planifier", tour_id: null, ...pos };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });

  // Public : appelé par la page de réservation après l'envoi réussi.
  if (b.action === "reservation") {
    const c = await buildClient(b, "reservation");
    if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    await write(sb, `${C}/${c.id}.json`, c);
    return NextResponse.json({ ok: true });
  }

  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

  if (b.action === "list") {
    const [clients, tours, hubs] = await Promise.all([readAll<PlanClient>(sb, C), readAll<PlanTour>(sb, T), readHubs(sb)]);
    return NextResponse.json({ ok: true, clients, tours, hubs });
  }
  if (b.action === "add") {
    const c = await buildClient(b, "manuel");
    if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    await write(sb, `${C}/${c.id}.json`, c);
    return NextResponse.json({ ok: true, client: c });
  }
  if (b.action === "client_status") {
    const id = clean(b.id, 80);
    const { data } = await sb.storage.from(BUCKET).download(`${C}/${id}.json`);
    if (!data) return NextResponse.json({ ok: false, error: "Client introuvable" }, { status: 404 });
    const c = JSON.parse(await data.text()) as PlanClient;
    if (b.delete) { await sb.storage.from(BUCKET).remove([`${C}/${id}.json`]); return NextResponse.json({ ok: true }); }
    c.status = (["a_planifier", "planifie", "livre"].includes(String(b.status)) ? b.status : c.status) as PlanClient["status"];
    if (c.status === "a_planifier") c.tour_id = null;
    await write(sb, `${C}/${id}.json`, c);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "save_hubs") {
    const hubs = (Array.isArray(b.hubs) ? b.hubs : []) as Hub[];
    const okHubs = hubs.filter(h => h && h.id && h.name && Number.isFinite(h.lat) && Number.isFinite(h.lng)).map(h => ({ id: clean(h.id, 60), name: clean(h.name, 80), lat: Number(h.lat), lng: Number(h.lng), stock: Math.max(0, Math.round(Number(h.stock) || 0)) }));
    if (!okHubs.length) return NextResponse.json({ ok: false, error: "Au moins un hub est nécessaire." }, { status: 400 });
    await write(sb, H, okHubs);
    return NextResponse.json({ ok: true, hubs: okHubs });
  }
  if (b.action === "add_hub") {
    const name = clean(b.name, 80);
    if (name.length < 2) return NextResponse.json({ ok: false, error: "Nom de ville requis" }, { status: 400 });
    let pos: { lat: number; lng: number } | null = null;
    try { const f = (await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(name)}&type=municipality&limit=1`, { cache: "no-store" })).json())?.features?.[0]; if (f) pos = { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }; } catch { /* ignore */ }
    if (!pos) return NextResponse.json({ ok: false, error: "Ville introuvable" }, { status: 400 });
    const hubs = await readHubs(sb);
    hubs.push({ id: `hub-${Date.now()}`, name, stock: Math.max(0, Math.round(Number(b.stock) || 0)), ...pos });
    await write(sb, H, hubs);
    return NextResponse.json({ ok: true, hubs });
  }
  if (b.action === "save_tour") {
    const t = b.tour as PlanTour;
    if (!t?.id || !Array.isArray(t.clientIds)) return NextResponse.json({ ok: false, error: "Tournée invalide" }, { status: 400 });
    const prev = await readJson<PlanTour>(sb, `${T}/${t.id}.json`);
    const validating = t.status === "valide" && prev?.status !== "valide";
    if (validating && !t.stops?.length) return NextResponse.json({ ok: false, error: "Calculez la tournée avant de la valider." }, { status: 400 });
    // Clients : rattachés à la tournée / détachés
    const ids = new Set(t.clientIds);
    const all = await readAll<PlanClient>(sb, C);
    for (const c of all) {
      if (ids.has(c.id) && c.status !== "livre" && (c.tour_id !== t.id || c.status !== "planifie")) { c.tour_id = t.id; c.status = "planifie"; await write(sb, `${C}/${c.id}.json`, c); }
      else if (!ids.has(c.id) && c.tour_id === t.id && c.status === "planifie") { c.tour_id = null; c.status = "a_planifier"; await write(sb, `${C}/${c.id}.json`, c); }
    }
    // Validation : le stock des hubs diminue des voitures chargées
    if (validating) {
      const hubs = await readHubs(sb);
      for (const s of t.stops || []) if (s.kind === "depot" && s.loaded) { const h = hubs.find(x => x.id === s.id); if (h) h.stock = Math.max(0, h.stock - s.loaded); }
      await write(sb, H, hubs);
    }
    await write(sb, `${T}/${t.id}.json`, t);
    return NextResponse.json({ ok: true, hubs: await readHubs(sb) });
  }
  if (b.action === "delete_tour") {
    const id = clean(b.id, 80);
    const t = await readJson<PlanTour>(sb, `${T}/${id}.json`);
    if (t) {
      for (const cid of t.clientIds || []) { const c = await readJson<PlanClient>(sb, `${C}/${cid}.json`); if (c && c.tour_id === id && c.status === "planifie") { c.status = "a_planifier"; c.tour_id = null; await write(sb, `${C}/${c.id}.json`, c); } }
      if (t.status === "valide") { const hubs = await readHubs(sb); for (const s of t.stops || []) if (s.kind === "depot" && s.loaded) { const h = hubs.find(x => x.id === s.id); if (h) h.stock += s.loaded; } await write(sb, H, hubs); }
    }
    await sb.storage.from(BUCKET).remove([`${T}/${id}.json`]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
