import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../lib/integrations";
import { authorizeSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail } from "../../../lib/brevo";
import { isDepot, isDocType, portKey } from "../../../lib/shipments";
import { storeFiles } from "./store";
import { genDocs } from "./gen";
import { sendDossier } from "./send";

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
  if (acc.who !== "owner" && (b.action === "doc_delete" || b.action === "vehicle_delete" || b.action === "send")) return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
  await applyStoredSecrets();
  const db = crmDatabase();
  if (b.action === "list") {
    const [{ data: ships }, { data: docs }, { data: vehicles }, { data: forwarders }] = await Promise.all([db.from("shipments").select("*").order("eta", { ascending: true, nullsFirst: false }), db.from("shipment_docs").select("*").order("created_at"), db.from("shipment_vehicles").select("*").order("vin"), db.from("forwarders").select("*").order("port")]);
    return NextResponse.json({ ok: true, ships, docs, vehicles, forwarders });
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
    const patch: Record<string, string> = {}; if (isDocType(b.doc_type)) patch.doc_type = b.doc_type; if (b.version === "originale" || b.version === "corrigée") patch.version = b.version;
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
    const row = { port: portKey(b.port), company: clean(b.company, 120) || null, contact: clean(b.contact, 120) || null, email: clean(b.email, 160) || null, cc: clean(b.cc, 300) || null, phone: clean(b.phone, 40) || null };
    const { error } = await db.from("forwarders").upsert(row, { onConflict: "port" }); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "gen_docs" && b.id) {
    const r = await genDocs(db, Number(b.id));
    return NextResponse.json(r, { status: r.ok ? 200 : (r.status || 400) });
  }
  if (b.action === "send" && b.id) {
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    try { const out = await sendDossier(db, Number(b.id), b.to); return NextResponse.json({ ok: true, sent: out.sent, missing: out.missing }); }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
