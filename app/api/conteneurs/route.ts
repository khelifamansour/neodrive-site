import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../lib/integrations";
import { authorizeSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, SITE } from "../../../lib/brevo";
import { FOLLOWUP_KINDS, FORWARDER_ROLES, isDepot, isDocType, isPipelineStage, portKey } from "../../../lib/shipments";
import { notifyOwner } from "../../../lib/import-notify";
import { storeFiles } from "./store";
import { genDocs } from "./gen";
import { planDossier, sendDossier } from "./send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "shipment-docs";
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const SHIP_FIELDS = ["name", "port", "supplier", "vessel", "bl_number", "containers", "vehicles", "loaded_at", "eta", "arrived_at", "status", "forwarder_email", "notes", "invoice_no", "invoice_date", "incoterm", "unit_price", "model", "extra_lines", "container_list", "invoice_part", "factory_email", "auto_send", "depot"];

/** Dépôt de documents par le fondateur (multipart : passcode, shipment_id, doc_type, version, files[]). */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const acc = fd ? await authorizeSection(req, String(fd.get("passcode") || ""), "conteneurs") : null;
  if (!fd || !acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  await applyStoredSecrets();
  const id = Number(fd.get("shipment_id")); if (!id) return NextResponse.json({ ok: false, error: "Dossier manquant" }, { status: 400 });
  const out = await storeFiles(id, fd, acc.name);
  return NextResponse.json({ ok: true, ...out });
}

/** Actions JSON (code d'accès NeoDrive). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const acc = await authorizeSection(req, b.passcode, "conteneurs");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  // Suppressions et envoi du dossier au transitaire : fondateur uniquement.
  if (acc.who !== "owner" && ["doc_delete", "vehicle_delete", "send", "new_order", "forwarder_delete"].includes(b.action)) return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
  await applyStoredSecrets();
  const db = crmDatabase();
  if (b.action === "list") {
    const [{ data: ships }, { data: docs }, { data: vehicles }, { data: forwarders }, { data: followups }] = await Promise.all([db.from("shipments").select("*").order("eta", { ascending: true, nullsFirst: false }), db.from("shipment_docs").select("*").order("created_at"), db.from("shipment_vehicles").select("*").order("vin"), db.from("forwarders").select("*").order("port").order("id"), db.from("shipment_followups").select("*").order("sent_at", { ascending: false })]);
    return NextResponse.json({ ok: true, ships, docs, vehicles, forwarders, followups });
  }
  if (b.action === "save") {
    const row: Record<string, unknown> = {}; for (const k of SHIP_FIELDS) if (k in (b.ship || {})) row[k] = b.ship[k] === "" ? null : b.ship[k];
    if ("depot" in row && row.depot != null && !isDepot(row.depot)) row.depot = null;
    if ("auto_send" in row) row.auto_send = !!row.auto_send;
    if (b.id) { const { error } = await db.from("shipments").update(row).eq("id", b.id); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); return NextResponse.json({ ok: true }); }
    if (!row.name) return NextResponse.json({ ok: false, error: "Nom obligatoire" }, { status: 400 });
    const { data, error } = await db.from("shipments").insert(row).select("id").single(); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (b.action === "doc_update" && b.id) {
    const patch: Record<string, string | null> = {}; if (isDocType(b.doc_type)) patch.doc_type = b.doc_type; if (b.version === "originale" || b.version === "corrigée") patch.version = b.version; if ("container" in b) patch.container = clean(b.container, 20) || null;
    await db.from("shipment_docs").update(patch).eq("id", b.id); return NextResponse.json({ ok: true });
  }
  if (b.action === "doc_delete" && b.id) {
    const { data } = await db.from("shipment_docs").select("file_path").eq("id", b.id).single();
    if (data) await db.storage.from(BUCKET).remove([data.file_path]); await db.from("shipment_docs").delete().eq("id", b.id); return NextResponse.json({ ok: true });
  }
  if (b.action === "url" && b.path) { const { data } = await db.storage.from(BUCKET).createSignedUrl(String(b.path), 900); return NextResponse.json({ ok: !!data, url: data?.signedUrl }); }
  if (b.action === "vehicles_add" && b.id) {
    const vins = [...new Set(String(b.vins || "").toUpperCase().match(/[A-HJ-NPR-Z0-9]{17}/g) || [])].slice(0, 200);
    if (!vins.length) return NextResponse.json({ ok: false, error: "Aucun VIN valide (17 caractères)" }, { status: 400 });
    const { error } = await db.from("shipment_vehicles").upsert(vins.map(vin => ({ shipment_id: b.id, vin, ...(b.container ? { container: clean(b.container, 20) } : {}) })), { onConflict: "shipment_id,vin" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, added: vins.length });
  }
  if (b.action === "vehicle_update" && b.id) {
    const patch: Record<string, unknown> = {}; if ("container" in b) patch.container = clean(b.container, 20) || null; if ("vin" in b && /^[A-HJ-NPR-Z0-9]{17}$/.test(String(b.vin).toUpperCase())) patch.vin = String(b.vin).toUpperCase(); if ("note" in b) patch.note = clean(b.note, 300) || null;
    await db.from("shipment_vehicles").update(patch).eq("id", b.id); return NextResponse.json({ ok: true });
  }
  if (b.action === "vehicle_delete" && b.id) { await db.from("shipment_vehicles").delete().eq("id", b.id); return NextResponse.json({ ok: true }); }
  if (b.action === "forwarder_save" && b.port) {
    const row = { port: portKey(b.port), company: clean(b.company, 120) || null, contact: clean(b.contact, 120) || null, email: clean(b.email, 160) || null, cc: clean(b.cc, 400) || null, phone: clean(b.phone, 40) || null, role: (FORWARDER_ROLES as readonly string[]).includes(b.role) ? b.role : "dédouanement", notes: clean(b.notes, 1000) || null, active: b.active !== false };
    const { error } = b.id ? await db.from("forwarders").update(row).eq("id", b.id) : await db.from("forwarders").insert(row); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "forwarder_delete" && b.id) { await db.from("forwarders").delete().eq("id", b.id); return NextResponse.json({ ok: true }); }
  if (b.action === "pipeline" && b.id && isPipelineStage(b.stage)) {
    const { data: sh } = await db.from("shipments").select("name,pipeline,pipeline_history").eq("id", b.id).single(); if (!sh) return NextResponse.json({ ok: false, error: "Dossier introuvable" }, { status: 404 });
    const hist = [...(Array.isArray(sh.pipeline_history) ? sh.pipeline_history : []), { at: new Date().toISOString(), stage: b.stage, from: sh.pipeline, by: acc.name, note: clean(b.note, 300) || null }].slice(-80);
    await db.from("shipments").update({ pipeline: b.stage, pipeline_history: hist }).eq("id", b.id);
    await notifyOwner(`📦 ${sh.name} : ${sh.pipeline || "?"} → ${b.stage}${b.note ? ` (${clean(b.note, 120)})` : ""}`).catch(() => null);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "followup_add" && b.shipment_id && b.recipient) {
    const row = { shipment_id: Number(b.shipment_id), kind: (FOLLOWUP_KINDS as readonly string[]).includes(b.kind) ? b.kind : "autre", label: clean(b.label, 200) || null, recipient: clean(b.recipient, 160), cc: clean(b.cc, 400) || null, subject: clean(b.subject, 250) || null, auto: b.auto !== false };
    const { error } = await db.from("shipment_followups").insert(row); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "followup_update" && b.id) {
    const patch: Record<string, unknown> = {}; if ("answered" in b) patch.answered_at = b.answered ? new Date().toISOString() : null; if ("auto" in b) patch.auto = !!b.auto;
    await db.from("shipment_followups").update(patch).eq("id", b.id); return NextResponse.json({ ok: true });
  }
  if (b.action === "new_order") {
    const name = clean(b.name, 160); if (!name) return NextResponse.json({ ok: false, error: "Nom obligatoire" }, { status: 400 });
    const row = { name, port: clean(b.port, 40) || "Le Havre", vehicles: Number(b.vehicles) || null, model: clean(b.model, 160) || null, factory_email: clean(b.factory_email, 200) || null, status: "en production", pipeline: "commandé", pipeline_history: [{ at: new Date().toISOString(), stage: "commandé", by: acc.name }] };
    const { data, error } = await db.from("shipments").insert(row).select("id,factory_token").single(); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const link = `${SITE}/factory/${data.factory_token}`;
    const wechat = `Hello! New order from MK HOLDING (NeoDrive): ${name}${row.vehicles ? `, ${row.vehicles} vehicles` : ""}${row.model ? ` (${row.model})` : ""}. Please upload all the documents for this order on this page (no login): ${link}\nNeeded: proforma invoice, commercial invoice, packing list with the VIN of each vehicle container by container, COC for every VIN, B/L and loading photos. Thank you!`;
    let mailed = false;
    if (b.send && row.factory_email && brevoReady()) {
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Hello,</p><p>Please find our new order <b>${name.replace(/[<>&]/g, "")}</b>${row.vehicles ? ` (${row.vehicles} vehicles${row.model ? `, ${row.model.replace(/[<>&]/g, "")}` : ""})` : ""}.</p><p>When the vehicles are ready, please upload all the documents on this private page (no login needed): <a href="${link}">${link}</a></p><ul><li>Proforma invoice and commercial invoice</li><li>Packing list with the VIN of each vehicle, container by container</li><li>Certificate of conformity (COC) for every VIN</li><li>Bill of lading and loading photos</li></ul><p>The page checks the VIN, quantities and totals automatically.</p><p>Thank you,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive (France)</p></div>`;
      await sendEmail(String(row.factory_email).split(/[,; ]+/)[0], "", `New order ${name} – MK HOLDING`, html, [], { replyTo: "khelifamansour@hotmail.fr" });
      await db.from("shipment_followups").insert({ shipment_id: data.id, kind: "usine", label: "Commande envoyée à l'usine", recipient: String(row.factory_email).split(/[,; ]+/)[0], subject: `New order ${name} – MK HOLDING`, auto: false });
      mailed = true;
    }
    return NextResponse.json({ ok: true, id: data.id, link, wechat, mailed });
  }
  if (b.action === "preview" && b.id) {
    try { const out = await planDossier(db, Number(b.id), b.to); return NextResponse.json({ ok: true, ...out }); }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }
  if (b.action === "gen_docs" && b.id) {
    const r = await genDocs(db, Number(b.id));
    return NextResponse.json(r, { status: r.ok ? 200 : (r.status || 400) });
  }
  if (b.action === "send" && b.id) {
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    try { const out = await sendDossier(db, Number(b.id), b.to); return NextResponse.json({ ok: true, sent: out.sent, missing: out.missing, mails: out.mails }); }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
