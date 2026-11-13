import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { listJson, readJson, writeJson } from "../../../lib/datastore";
import { driverKey } from "../../../lib/driver-link";
import { PHOTO_BUCKET, PLAN_CLIENTS, PLAN_TOURS, clientName, patchVehicle, readClient } from "../../../lib/fleet";
import { DEFAULT_HUBS, type Hub, type PlanClient, type PlanTour } from "../../../lib/planif";
import { DEPOTS, isDepot, isStage, vehicleDepot, vehicleStage } from "../../../lib/shipments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const HUBS = "planificateur/hubs.json";
const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);

/** Stock entrant et suivi véhicule par véhicule (code d'accès NeoDrive). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "list") {
      const [{ data: ships }, { data: vehicles }, clients, tours, hubs] = await Promise.all([
        db.from("shipments").select("id,name,port,status,eta,arrived_at,loaded_at,depot,vehicles,container_list,model").order("eta", { ascending: true, nullsFirst: false }),
        db.from("shipment_vehicles").select("*").order("vin"),
        listJson<PlanClient>(db, PLAN_CLIENTS), listJson<PlanTour>(db, PLAN_TOURS), readJson<Hub[]>(db, HUBS)]);
      const links = [{ id: "libre", name: "Lien général (hors tournée)", date: "", driver: "", status: "", key: driverKey("libre") },
        ...tours.filter(t => t.status !== "termine").sort((a, z) => String(z.date).localeCompare(String(a.date))).map(t => ({ id: t.id, name: t.name, date: t.date, driver: t.driver, status: t.status, key: driverKey(t.id) }))];
      return NextResponse.json({ ok: true, ships, vehicles, depots: DEPOTS, hubs: hubs?.length ? hubs : DEFAULT_HUBS, links,
        clients: clients.map(c => ({ id: c.id, name: clientName(c), modele: c.modele, couleur: c.couleur, status: c.status, tour_id: c.tour_id || null, created_at: c.created_at })) });
    }
    if (b.action === "set" && b.id) {
      const id = Number(b.id); const patch: Record<string, unknown> = {}; const notes: string[] = [];
      if (isStage(b.status)) { patch.status = b.status; if (b.status === "au dépôt") patch.depot_at = new Date().toISOString(); if (b.status === "livrée") patch.delivered_at = new Date().toISOString(); if (b.status === "chargée") patch.picked_at = new Date().toISOString(); }
      if ("depot" in b) { patch.depot = isDepot(b.depot) ? b.depot : null; notes.push(`dépôt ${b.depot || "—"}`); }
      if ("client_id" in b) {
        if (!b.client_id) { patch.client_id = null; patch.client_name = null; notes.push("réservation retirée"); }
        else { const c = await readClient(db, clean(b.client_id, 80)); if (!c) return NextResponse.json({ ok: false, error: "Réservation introuvable" }, { status: 404 });
          const { data: other } = await db.from("shipment_vehicles").select("vin").eq("client_id", c.id).neq("id", id).neq("status", "livrée");
          if (other?.length) return NextResponse.json({ ok: false, error: `${clientName(c)} est déjà lié au VIN ${other[0].vin}. Retirez-le d'abord.` }, { status: 409 });
          patch.client_id = c.id; patch.client_name = clientName(c); notes.push(`réservé pour ${clientName(c)}`); }
      }
      await patchVehicle(db, id, patch, { stage: isStage(b.status) ? b.status : undefined, by: "Mansour", note: notes.join(" · ") });
      return NextResponse.json({ ok: true });
    }
    // Tout un conteneur / dossier passe à une étape (ex. dépoté à Lamasquère) : seuls les véhicules pas encore chargés ou livrés.
    if (b.action === "bulk" && b.shipment_id && isStage(b.status) && (b.status === "en mer" || b.status === "au port" || b.status === "au dépôt")) {
      let q = db.from("shipment_vehicles").select("id,status").eq("shipment_id", Number(b.shipment_id));
      if (b.container) q = q.eq("container", clean(b.container, 20));
      const { data } = await q; let n = 0;
      for (const v of data || []) { if (v.status === "chargée" || v.status === "livrée") continue;
        await patchVehicle(db, v.id, { status: b.status, ...(isDepot(b.depot) ? { depot: b.depot } : {}), ...(b.status === "au dépôt" ? { depot_at: new Date().toISOString() } : {}) }, { stage: b.status, by: "Mansour", note: b.container ? `conteneur ${b.container}` : "dossier complet" }); n++; }
      return NextResponse.json({ ok: true, updated: n });
    }
    if (b.action === "photo_url" && typeof b.path === "string" && b.path.startsWith("vehicles/")) {
      const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(b.path, 900); return NextResponse.json({ ok: !!data, url: data?.signedUrl });
    }
    // Stock des hubs du planificateur = véhicules physiquement au dépôt (pas encore chargés)
    if (b.action === "sync_hubs") {
      const [{ data: ships }, { data: veh }] = await Promise.all([db.from("shipments").select("id,status,eta,arrived_at,depot"), db.from("shipment_vehicles").select("shipment_id,status,depot,client_id")]);
      const count: Record<string, number> = {};
      for (const v of veh || []) { const sh = (ships || []).find(x => x.id === v.shipment_id); if (vehicleStage(v, sh) !== "au dépôt") continue; const d = vehicleDepot(v, sh); if (d) count[d] = (count[d] || 0) + 1; }
      const hubs = [...((await readJson<Hub[]>(db, HUBS)) || DEFAULT_HUBS)];
      for (const d of DEPOTS) { const h = hubs.find(x => x.id === d.id); if (h) h.stock = count[d.id] || 0; else if (count[d.id]) hubs.push({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, stock: count[d.id] }); }
      await writeJson(db, HUBS, hubs);
      return NextResponse.json({ ok: true, hubs, count });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[VEHICULES]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
