import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { readJson, listJson } from "../../../lib/datastore";
import { checkDriverKey } from "../../../lib/driver-link";
import { PHOTO_BUCKET, PLAN_CLIENTS, PLAN_TOURS, clientName, matchVin, patchVehicle, readClient } from "../../../lib/fleet";
import { DEPOTS, isDepot, normVin, vehicleStage, vinDistance } from "../../../lib/shipments";
import { plannedSchedule, tourProgress } from "../../../lib/schedule";
import { OFFICE_KINDS, addEvent, cleanGeo, deliverVehicle, isEventKind, listEvents, stopIndexOf } from "../../../lib/tour-live";
import type { PlanClient, PlanTour } from "../../../lib/planif";
import { readVinPhoto } from "../conteneurs/extract";
import { addTickets } from "../../../lib/driver-tickets";
import { DEFAULT_DRIVER_RATE, estimateHours, isExpenseType, isPaidBy } from "../../../lib/driver-hours";
import { AccuseError, accuseLink, sendAccuseLink } from "../../../lib/accuse-link";

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
  /** Réservation liée à un client de la tournée (planificateur ↔ réservations). */
  const resOf = async (clientId: string) => {
    if (!t || !t.clientIds.includes(clientId)) return null;
    const { data } = await db.from("reservations").select("id,vin,accuse_token").eq("plan_client_id", clientId).order("id", { ascending: false }).limit(1).maybeSingle();
    return data;
  };
  const photoOk = (p: unknown) => typeof p === "string" && p.startsWith(`vehicles/${tour}/`) && !p.includes("..");

  try {
    if (b.action === "get") {
      const all = await listJson<PlanClient>(db, PLAN_CLIENTS);
      const clients = (t ? all.filter(c => t.clientIds.includes(c.id)) : all.filter(c => c.status !== "livre"))
        .sort((a, z) => (t ? t.clientIds.indexOf(a.id) - t.clientIds.indexOf(z.id) : String(a.ville).localeCompare(String(z.ville))))
        .map(c => ({ id: c.id, name: clientName(c), adresse: `${c.adresse ? c.adresse + ", " : ""}${c.code_postal} ${c.ville}`, telephone: c.telephone, modele: c.modele, couleur: c.couleur, status: c.status, received_at: c.received_at || null, reception: c.token ? `/reception?id=${encodeURIComponent(c.id)}&t=${encodeURIComponent(c.token)}` : null }));
      let q = db.from("shipment_vehicles").select("id,vin,container,status,depot,client_id,client_name,tour_id,picked_at,delivered_at,plate_photo,shipments(name,status,eta,arrived_at,depot)").order("picked_at", { ascending: false });
      q = t ? q.eq("tour_id", tour) : q.eq("status", "chargée");
      const { data: veh } = await q;
      const events = t ? await listEvents(db, [tour]) : [];
      // Suivi par client : VIN, paiement confirmé par Mansour, lien d'accusé envoyé, accusé signé (et règlement déclaré)
      const res: Record<string, unknown> = {};
      if (t && t.clientIds.length) {
        const { data: rs } = await db.from("reservations").select("id,plan_client_id,vin,paiement_confirme_at,paiement_en_attente,confirm_sent_at,accuse_token,accuse_data,livre_at").in("plan_client_id", t.clientIds);
        for (const r of rs || []) {
          const d = (r.accuse_data || {}) as { signed_at?: string; reglement?: { mode: string; amount: number }[] | null; driver_name?: string | null };
          res[String(r.plan_client_id)] = { id: r.id, vin: r.vin, paid: r.paiement_confirme_at, pending: !!r.paiement_en_attente, sent_at: r.confirm_sent_at, signed_at: r.accuse_token ? (d.signed_at || r.livre_at) : null, reglement: d.reglement || null, driver_name: d.driver_name || null, pdf: r.accuse_token ? `/api/accuse/${r.accuse_token}` : null };
        }
      }
      return NextResponse.json({ ok: true, tour: t ? { id: t.id, name: t.name, date: t.date, driver: t.driver, hubId: t.hubId, status: t.status, departTime: t.departTime || "", stops: t.stops || [], km: t.km || 0, rate: t.driverRate || DEFAULT_DRIVER_RATE, estH: estimateHours(t), closed_at: t.closed_at || null, en_route: t.en_route || [] } : null, res, clients, depots: DEPOTS, events, vehicles: (veh || []).map((v: any) => ({ ...v, has_plate: !!v.plate_photo, plate_photo: undefined, shipment: v.shipments?.name || "", stage: vehicleStage(v, v.shipments), shipments: undefined })) });
    }
    // Journal de tournée : départ, pause, reprise, arrivée, livraison, problème, position GPS
    if (b.action === "event") {
      if (!t) return NextResponse.json({ ok: false, error: "Ce lien n'est pas lié à une tournée." }, { status: 400 });
      const kind = b.kind;
      if (!isEventKind(kind) || (OFFICE_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ ok: false, error: "Événement inconnu" }, { status: 400 });
      const geo = cleanGeo(b);
      const stops = t.stops || [];
      const events = await listEvents(db, [tour]);
      if (kind === "position") {
        // Vie privée : positions acceptées seulement pendant une tournée en cours
        const prog = tourProgress(stops, plannedSchedule(stops, t.date, t.departTime), events);
        if (!prog.started || prog.finished || geo.lat == null) return NextResponse.json({ ok: true, skipped: true });
        const last = [...events].reverse().find(e => e.kind === "position");
        if (last && Date.now() - Date.parse(last.created_at) < 60000) return NextResponse.json({ ok: true, skipped: true });
      }
      const si = Number(b.stop_index); const stop_index = Number.isInteger(si) && stops[si] ? si : null;
      const cid = clean(b.client_id, 80); const client_id = cid && t.clientIds.includes(cid) ? cid : null;
      const base = { tour_id: tour, kind, client_id, stop_index, ...geo, author: driver, note: clean(b.note, 500) || null };
      // Heures et frais du chauffeur indépendant
      const isDay = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
      if (kind === "frais") {
        const type = b.type, amount = Math.round(Number(String(b.amount ?? "").replace(",", ".")) * 100) / 100;
        if (!isExpenseType(type)) return NextResponse.json({ ok: false, error: "Type de frais inconnu." }, { status: 400 });
        if (!(amount >= 0 && amount <= 2000)) return NextResponse.json({ ok: false, error: "Montant invalide." }, { status: 400 });
        const photo = photoOk(b.path) ? String(b.path) : null;
        if (!photo) return NextResponse.json({ ok: false, error: "Photo du ticket obligatoire." }, { status: 400 });
        const paid = isPaidBy(b.paid) ? b.paid : "carte";
        const event = await addEvent(db, { ...base, photo_path: photo, data: { type, amount, paid, date: isDay(b.date) ? b.date : new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }) } });
        return NextResponse.json({ ok: true, event });
      }
      if (kind === "correction") {
        const minutes = Math.round(Number(b.minutes));
        if (!isDay(b.date)) return NextResponse.json({ ok: false, error: "Choisissez le jour à corriger." }, { status: 400 });
        if (!Number.isFinite(minutes) || !minutes || Math.abs(minutes) > 720) return NextResponse.json({ ok: false, error: "Durée de correction invalide (12 h maximum)." }, { status: 400 });
        if (String(base.note || "").length < 5) return NextResponse.json({ ok: false, error: "Expliquez la correction (ex. « oublié de cliquer Fin de journée, fini à 19h »)." }, { status: 400 });
        const event = await addEvent(db, { ...base, data: { date: b.date, minutes } });
        return NextResponse.json({ ok: true, event });
      }
      if (kind === "livre") {
        if (!client_id) return NextResponse.json({ ok: false, error: "Choisissez le client livré." }, { status: 400 });
        const { data: vs } = await db.from("shipment_vehicles").select("id,vin,status,client_id,client_name,tour_id,plate_photo").eq("client_id", client_id).order("picked_at", { ascending: false });
        const v = (vs || []).find(x => x.status !== "livrée");
        if (!v) return NextResponse.json({ ok: false, error: (vs || []).length ? "Ce client est déjà marqué livré." : "Aucune voiture chargée pour ce client : faites d'abord le chargement avec la photo de la plaque VIN (« Charger un véhicule »)." }, { status: 400 });
        const plate = photoOk(b.plate_path) ? String(b.plate_path) : null;
        if (!v.plate_photo && !plate) return NextResponse.json({ ok: false, needPlate: true, error: "Photographiez la plaque VIN de la voiture avant « Livré »." }, { status: 400 });
        let note = "";
        if (plate) {
          const { data: blob } = await db.storage.from(PHOTO_BUCKET).download(plate);
          const read = blob ? await readVinPhoto(Buffer.from(await blob.arrayBuffer()), "image/jpeg").catch(() => null) : null;
          const reads = read ? [read.vin, ...read.candidates].map(normVin).filter(x => x.length === 17) : [];
          if (reads.length && Math.min(...reads.map(x => vinDistance(x, v.vin))) > 2) return NextResponse.json({ ok: false, needPlate: true, error: `Le VIN lu (${reads[0]}) n'est pas celui de la voiture prévue pour ce client (${v.vin}). Vérifiez la voiture et reprenez la photo.` }, { status: 400 });
          note = reads.length ? "plaque VIN vérifiée à la livraison" : "plaque VIN photographiée (lecture automatique impossible)";
        }
        const photo = photoOk(b.path) ? String(b.path) : null;
        const r = await deliverVehicle(db, v, { driver, photo, plate, note });
        let event = null;
        try { event = await addEvent(db, { ...base, stop_index: stop_index ?? stopIndexOf(t, client_id), photo_path: photo || plate, note: base.note || note || null }); } catch (e) { console.error("[CHAUFFEUR] event", e); }
        return NextResponse.json({ ok: true, reception: r.reception, event, vin: v.vin });
      }
      const event = await addEvent(db, base);
      return NextResponse.json({ ok: true, event });
    }
    // Tickets : photos seules, triées ensuite par l'IA (catégorie, montant, date)
    if (b.action === "tickets") {
      if (!t) return NextResponse.json({ ok: false, error: "Ce lien n'est pas lié à une tournée." }, { status: 400 });
      const paths = (Array.isArray(b.paths) ? b.paths : []).filter(photoOk).map(String);
      if (!paths.length) return NextResponse.json({ ok: false, error: "Aucune photo reçue." }, { status: 400 });
      return NextResponse.json({ ok: true, ...(await addTickets(db, tour, driver, paths)) });
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
    // Véhicule hors conteneur (ancien stock, véhicule déjà au dépôt) : ajouté au stock pour pouvoir le charger.
    if (b.action === "add_vehicle") {
      const vin = normVin(String(b.vin || ""));
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return NextResponse.json({ ok: false, error: "VIN invalide (17 caractères, sans I, O ni Q)." }, { status: 400 });
      const { data: ex } = await db.from("shipment_vehicles").select("id").eq("vin", vin).limit(1);
      if (ex?.length) return NextResponse.json({ ok: true, match: await matchVin(db, vin) });
      const name = "Stock dépôt (hors conteneur)";
      let { data: sh } = await db.from("shipments").select("id").eq("name", name).limit(1).maybeSingle();
      if (!sh) { const ins = await db.from("shipments").insert({ name, status: "dédouané", pipeline: "en stock", auto_send: false, arrived_at: new Date().toISOString(), notes: "Véhicules ajoutés depuis la page chauffeur (ancien stock, hors conteneur). Pas de dossier transitaire." }).select("id").single(); if (ins.error) throw new Error(ins.error.message); sh = ins.data; }
      const test = tour.startsWith("test-");
      const depot = isDepot(b.depot) ? b.depot : (t?.hubId && isDepot(t.hubId) ? t.hubId : null);
      const { error } = await db.from("shipment_vehicles").insert({ shipment_id: sh!.id, vin, status: "au dépôt", depot, depot_at: new Date().toISOString(), note: test ? "TEST – ajouté pendant la démo" : `ajouté par ${driver} (hors conteneur)`, history: [{ at: new Date().toISOString(), stage: "au dépôt", by: driver, note: "ajouté depuis la page chauffeur" }] });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, match: await matchVin(db, vin) });
    }
    // Accusé de réception : lien de signature envoyé au client (SMS + e-mail) ou ouvert sur ce téléphone
    if (b.action === "accuse_send" || b.action === "accuse_link") {
      const r = await resOf(clean(b.client_id, 80));
      if (!r) return NextResponse.json({ ok: false, error: "Pas de réservation liée à ce client : appelez Mansour." }, { status: 404 });
      try {
        if (b.action === "accuse_link") return NextResponse.json({ ok: true, url: await accuseLink(db, r.id) });
        const sent = await sendAccuseLink(db, r.id);
        return NextResponse.json({ ok: true, sent });
      } catch (e) { if (e instanceof AccuseError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status }); throw e; }
    }

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
        // Même VIN sur la réservation (espace livreur, accusé de réception)
        const r = await resOf(c.id);
        if (r && !r.accuse_token && r.vin !== v.vin) await db.from("reservations").update({ vin: v.vin, updated_at: new Date().toISOString() }).eq("id", r.id);
      }
      await patchVehicle(db, id, patch, { stage: "chargée", by: driver, note: [t ? `tournée ${t.name || t.id}` : "", note].filter(Boolean).join(" · ") });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "deliver") {
      if (t && v.tour_id !== tour) return NextResponse.json({ ok: false, error: "Ce véhicule n'est pas sur cette tournée." }, { status: 400 });
      // Sur une tournée : la photo de la plaque VIN est obligatoire avant « Livré »
      const plate = photoOk(b.plate_path) ? String(b.plate_path) : null;
      if (t && !v.plate_photo && !plate) return NextResponse.json({ ok: false, needPlate: true, error: "Photographiez la plaque VIN de la voiture avant « Livré »." }, { status: 400 });
      const photo = photoOk(b.path) ? String(b.path) : null;
      // Véhicule « livrée » + réservation « livré » dans le planificateur (l'accusé de réception client reste à signer)
      const { reception } = await deliverVehicle(db, v, { driver, photo, plate });
      if (t) { const geo = cleanGeo(b); try { await addEvent(db, { tour_id: tour, kind: "livre", client_id: v.client_id || null, stop_index: stopIndexOf(t, v.client_id), ...geo, photo_path: photo || plate, author: driver, note: null }); } catch (e) { console.error("[CHAUFFEUR] event", e); } }
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
