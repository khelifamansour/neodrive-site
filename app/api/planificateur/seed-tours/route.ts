import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { listJson, readJson, writeJson } from "../../../../lib/datastore";
import { DEFAULT_HUBS, DEFAULT_PARAMS, computeCosts, estimateKm, planRoute, type Hub, type PlanClient, type PlanTour, type Stop } from "../../../../lib/planif";
import { PLAN_CLIENTS as C, buildClient } from "../../../../lib/planif-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const T = "planificateur/tours", H = "planificateur/hubs.json";

type SeedTour = { slug: string; name: string; date: string; departTime?: string; hubs: Record<string, number>; reservations: number[] };
type Payload = { driver: string; tours: SeedTour[] };
const digits = (p: string) => String(p || "").replace(/\D/g, "").slice(-9);

/** Distances routières réelles (OSRM), comme le planificateur ; repli : estimation à vol d'oiseau. */
async function route(stops: Stop[]) {
  let km = estimateKm(stops), hours = km / 72, precise = false; let path: [number, number][] | undefined;
  try {
    const coords = stops.map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson`, { cache: "no-store" }).then(x => x.json());
    const rt = r?.routes?.[0];
    if (rt) {
      km = rt.distance / 1000; hours = (rt.duration / 3600) * 1.2; precise = true;
      rt.legs?.forEach((l: { distance: number; duration: number }, i: number) => { stops[i + 1].legKm = Math.round(l.distance / 1000); stops[i + 1].legH = Math.round(l.duration / 360 * 1.2) / 10; });
      path = rt.geometry?.coordinates?.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch (e) { console.error("[SEED-TOURS] osrm", e); }
  return { km: Math.round(km), hours: Math.round(hours * 10) / 10, precise, path };
}

/** Création ponctuelle de tournées prévisionnelles (brouillon) à partir des réservations, déclenchée par un jeton à usage unique (admin_once_tokens, purpose « plan-seed »). */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "plan-seed").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: Payload } | undefined)?.payload;
  if (!p?.tours?.length || !p.driver) return NextResponse.json({ ok: false }, { status: 401 });

  const stored = await readJson<Hub[]>(db, H);
  const baseHubs = Array.isArray(stored) && stored.length ? stored : DEFAULT_HUBS;
  const existing = await listJson<PlanClient>(db, C);
  const out: unknown[] = [];

  for (const st of p.tours) {
    const id = `prev-${st.slug}`;
    const { data: rows } = await db.from("reservations").select("*").in("id", st.reservations);
    const clients: PlanClient[] = [], errors: string[] = [];
    for (const r of rows || []) {
      let c: PlanClient | null = r.plan_client_id ? await readJson<PlanClient>(db, `${C}/${r.plan_client_id}.json`) : null;
      if (!c) c = existing.find(x => x.status !== "livre" && digits(x.telephone) && digits(x.telephone) === digits(r.telephone)) || null;
      if (!c) {
        const built = await buildClient({ prenom: r.prenom, nom: r.nom, telephone: r.telephone, email: r.email, adresse: r.adresse, code_postal: r.code_postal, ville: r.ville, modele: r.modele, couleur: r.couleur, total: r.total, note: `Réservation n°${r.id}` }, "reservation");
        if ("error" in built) { errors.push(`${r.prenom} ${r.nom} : ${built.error}`); continue; }
        c = built; existing.push(c);
      }
      c.status = "planifie"; c.tour_id = id;
      await writeJson(db, `${C}/${c.id}.json`, c);
      if (r.plan_client_id !== c.id) await db.from("reservations").update({ plan_client_id: c.id, updated_at: new Date().toISOString() }).eq("id", r.id);
      clients.push(c);
    }
    // Stock simulé : seulement les hubs prévus pour cette tournée.
    const hubs = Object.entries(st.hubs).map(([hid, stock]) => { const h = baseHubs.find(x => x.id === hid) || DEFAULT_HUBS.find(x => x.id === hid); return h ? { ...h, stock } : null; }).filter(Boolean) as Hub[];
    const start = hubs[0];
    const { stops, unserved } = planRoute(hubs, start.id, 2, clients);
    const r = await route(stops);
    const prev = await readJson<PlanTour>(db, `${T}/${id}.json`);
    const tour: PlanTour = {
      id, name: st.name, created_at: prev?.created_at || new Date().toISOString(), date: st.date, departTime: st.departTime || "07:00", driver: p.driver,
      hubId: start.id, trailer: 2, clientIds: clients.map(c => c.id), status: "brouillon", stops, path: r.path, km: r.km, hours: r.hours, precise: r.precise,
      params: DEFAULT_PARAMS, costs: computeCosts(r.km, r.hours, DEFAULT_PARAMS), driverRate: 25,
      warning: unserved.length ? `${unserved.length} client(s) non livrable(s) : stock insuffisant (simulation).` : undefined,
    };
    await writeJson(db, `${T}/${id}.json`, tour);
    out.push({ id, name: st.name, clients: clients.length, km: r.km, hours: r.hours, precise: r.precise, errors, unserved: unserved.map(u => `${u.prenom} ${u.nom}`) });
  }
  return NextResponse.json({ ok: true, tours: out });
}
export const GET = run;
export const POST = run;
