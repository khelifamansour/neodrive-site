import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { readJson, listJson, writeJson } from "../../../lib/datastore";
import { checkDriverKey } from "../../../lib/driver-link";
import { PHOTO_BUCKET, PLAN_CLIENTS, PLAN_TOURS, clientName, matchVin, patchVehicle, readClient } from "../../../lib/fleet";
import { DEPOTS, isDepot, vehicleStage } from "../../../lib/shipments";
import type { PlanClient, PlanTour } from "../../../lib/planif";
import { readVinPhoto } from "../conteneurs/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);

/** Page chauffeur (lien signé, sans code) : chargement au dépôt avec photo de la plaque VIN, puis livraison. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const tour = checkDriverKey(b.k);
  if (!tour) return NextResponse.json({ ok: false, error: "Lien chauffeur invalide." }, { status: 401 });
  const db = crmDatabase();
  const t = tour === "libre" ? null : await readJson<PlanTour>(db, `${PLAN_TOURS}/${tour}.json`);
  if (tour !== "libre" && !t) return NextResponse.json({ ok: false, error: "Tournée introuvable (supprimée ?)." }, { status: 404 });
  const driver = clean(b.driver, 60) || t?.driver || "chauffeur";
  const photoOk = (p: unknown) => typeof p === "string" && p.startsWith(`vehicles/${tour}/`) && !p.includes("..");

  try {
    if (b.action === "get") {
      const all = await listJson<PlanClient>(db, PLAN_CLIENTS);
      const clients = (t ? all.filter(c => t.clientIds.includes(c.id)) : all.filter(c => c.status !== "livre"))
        .sort((a, z) => (t ? t.clientIds.indexOf(a.id) - t.clientIds.indexOf(z.id) : String(a.ville).localeCompare(String(z.ville))))
        .map(c => ({ id: c.id, name: clientName(c), adresse: `${c.adresse ? c.adresse + ", " : ""}${c.code_postal} ${c.ville}`, telephone: c.telephone, modele: c.modele, couleur: c.couleur, status: c.status, received_at: c.received_at || null, reception: c.token ? `/reception?id=${encodeURIComponent(c.id)}&t=${encodeURIComponent(c.token)}` : null }));
      let q = db.from("shipment_vehicles").select("id,vin,container,status,depot,client_id,client_name,tour_id,picked_at,delivered_at,shipments(name,status,eta,arrived_at,depot)").order("picked_at", { ascending: false });
      q = t ? q.eq("tour_id", tour) : q.eq("status", "chargée");
      const { data: veh } = await q;
      return NextResponse.json({ ok: true, tour: t ? { id: t.id, name: t.name, date: t.date, driver: t.driver, hubId: t.hubId } : null, clients, depots: DEPOTS, vehicles: (veh || []).map((v: any) => ({ ...v, shipment: v.shipments?.name || "", stage: vehicleStage(v, v.shipments), shipments: undefined })) });
    }
    if (b.action === "upload_url") {
      const path = `vehicles/${tour}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: PHOTO_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "read_vin") {
      if (!photoOk(b.path)) return NextResponse.json({ ok: false, error: "Photo invalide" }, { status: 400 });
      const { data: blob } = await db.storage.from(PHOTO_BUCKET).download(String(b.path));
      if (!blob) return NextResponse.json({ ok: false, error: "Photo non reçue, reprenez-la." }, { status: 400 });
      const read = await readVinPhoto(Buffer.from(await blob.arrayBuffer()), "image/jpeg");
      if (!read) return NextResponse.json({ ok: true, read: null, match: null });
      return NextResponse.json({ ok: true, read, match: await matchVin(db, read.vin, read.candidates) });
    }
    if (b.action === "match") return NextResponse.json({ ok: true, match: await matchVin(db, String(b.vin || "")) });

    const id = Number(b.vehicle_id);
    const { data: v } = id ? await db.from("shipment_vehicles").select("*").eq("id", id).single() : { data: null };
    if (!v) return NextResponse.json({ ok: false, error: "Véhicule introuvable" }, { status: 404 });

    if (b.action === "load") {
      if (v.status === "livrée") return NextResponse.json({ ok: false, error: "Ce véhicule est déjà marqué livré." }, { status: 400 });
      const patch: Record<string, unknown> = { status: "chargée", picked_at: new Date().toISOString(), tour_id: t ? tour : null, driver };
      if (photoOk(b.path)) patch.plate_photo = b.path;
      if (isDepot(b.depot)) patch.depot = b.depot;
      let note = "";
      if (b.client_id) {
        const c = await readClient(db, clean(b.client_id, 80));
        if (!c) return NextResponse.json({ ok: false, error: "Client introuvable" }, { status: 404 });
        const { data: other } = await db.from("shipment_vehicles").select("id,vin").eq("client_id", c.id).neq("id", id).neq("status", "livrée");
        if (other?.length && !b.force) return NextResponse.json({ ok: false, conflict: other[0].vin, error: `Ce client est déjà lié au VIN ${other[0].vin}. Confirmez pour le remplacer par ce véhicule.` }, { status: 409 });
        for (const o of other || []) await patchVehicle(db, o.id, { client_id: null, client_name: null }, { by: driver, note: `client ${clientName(c)} réattribué au VIN ${v.vin}` });
        patch.client_id = c.id; patch.client_name = clientName(c); note = `pour ${clientName(c)}`;
      }
      await patchVehicle(db, id, patch, { stage: "chargée", by: driver, note: [t ? `tournée ${t.name || t.id}` : "", note].filter(Boolean).join(" · ") });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "deliver") {
      if (t && v.tour_id !== tour) return NextResponse.json({ ok: false, error: "Ce véhicule n'est pas sur cette tournée." }, { status: 400 });
      const patch: Record<string, unknown> = { status: "livrée", delivered_at: new Date().toISOString() };
      if (photoOk(b.path)) patch.delivery_photo = b.path;
      await patchVehicle(db, id, patch, { stage: "livrée", by: driver, note: v.client_name ? `livré à ${v.client_name}` : "" });
      // Réservation correspondante : marquée livrée dans le planificateur (l'accusé de réception client reste à signer)
      let reception: string | null = null;
      if (v.client_id) { const c = await readClient(db, v.client_id); if (c) { if (c.status !== "livre") { c.status = "livre"; await writeJson(db, `${PLAN_CLIENTS}/${c.id}.json`, c); } if (c.token && !c.received_at) reception = `/reception?id=${encodeURIComponent(c.id)}&t=${encodeURIComponent(c.token)}`; } }
      return NextResponse.json({ ok: true, reception });
    }
    if (b.action === "undo") {
      if (v.status !== "chargée" || (t && v.tour_id !== tour)) return NextResponse.json({ ok: false, error: "Rien à annuler." }, { status: 400 });
      await patchVehicle(db, id, { status: "au dépôt", tour_id: null, picked_at: null }, { stage: "au dépôt", by: driver, note: "chargement annulé" });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[CHAUFFEUR]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
