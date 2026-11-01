import { NextResponse } from "next/server";
import { isAuthorized, serviceClient } from "../../../lib/integrations";
import type { PlanClient, PlanTour } from "../../../lib/planif";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "erp-documents";
const C = "planificateur/clients", T = "planificateur/tours";
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
    const [clients, tours] = await Promise.all([readAll<PlanClient>(sb, C), readAll<PlanTour>(sb, T)]);
    return NextResponse.json({ ok: true, clients, tours });
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
  if (b.action === "save_tour") {
    const t = b.tour as PlanTour;
    if (!t?.id || !Array.isArray(t.stops)) return NextResponse.json({ ok: false, error: "Tournée invalide" }, { status: 400 });
    await write(sb, `${T}/${t.id}.json`, t);
    // Les clients de la tournée passent en « planifié »
    for (const s of t.stops.filter(s => s.kind === "client")) {
      const { data } = await sb.storage.from(BUCKET).download(`${C}/${s.id}.json`);
      if (!data) continue;
      const c = JSON.parse(await data.text()) as PlanClient;
      if (c.status === "a_planifier") { c.status = "planifie"; c.tour_id = t.id; await write(sb, `${C}/${c.id}.json`, c); }
    }
    return NextResponse.json({ ok: true });
  }
  if (b.action === "delete_tour") {
    const id = clean(b.id, 80);
    const { data } = await sb.storage.from(BUCKET).download(`${T}/${id}.json`);
    if (data) {
      const t = JSON.parse(await data.text()) as PlanTour;
      for (const s of t.stops.filter(s => s.kind === "client")) {
        const { data: cd } = await sb.storage.from(BUCKET).download(`${C}/${s.id}.json`);
        if (!cd) continue;
        const c = JSON.parse(await cd.text()) as PlanClient;
        if (c.tour_id === id && c.status === "planifie") { c.status = "a_planifier"; c.tour_id = null; await write(sb, `${C}/${c.id}.json`, c); }
      }
    }
    await sb.storage.from(BUCKET).remove([`${T}/${id}.json`]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
