import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail } from "../../../lib/brevo";
import { DOC_TYPES, docLabel, isDocType, portKey } from "../../../lib/shipments";
import { storeFiles } from "./store";
import { invoicePdf, packingPdf } from "./pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "shipment-docs";
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SHIP_FIELDS = ["name", "port", "supplier", "vessel", "bl_number", "containers", "vehicles", "loaded_at", "eta", "arrived_at", "status", "forwarder_email", "notes", "invoice_no", "invoice_date", "incoterm", "unit_price", "model", "extra_lines", "container_list"];

/** Dépôt de documents par le fondateur (multipart : passcode, shipment_id, doc_type, version, files[]). */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd || !isAuthorized(req, String(fd.get("passcode") || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  await applyStoredSecrets();
  const id = Number(fd.get("shipment_id")); if (!id) return NextResponse.json({ ok: false, error: "Dossier manquant" }, { status: 400 });
  const out = await storeFiles(id, fd, "Mansour");
  return NextResponse.json({ ok: true, ...out });
}

/** Actions JSON (code d'accès NeoDrive). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  await applyStoredSecrets();
  const db = crmDatabase();
  if (b.action === "list") {
    const [{ data: ships }, { data: docs }, { data: vehicles }, { data: forwarders }] = await Promise.all([db.from("shipments").select("*").order("eta", { ascending: true, nullsFirst: false }), db.from("shipment_docs").select("*").order("created_at"), db.from("shipment_vehicles").select("*").order("vin"), db.from("forwarders").select("*").order("port")]);
    return NextResponse.json({ ok: true, ships, docs, vehicles, forwarders });
  }
  if (b.action === "save") {
    const row: Record<string, unknown> = {}; for (const k of SHIP_FIELDS) if (k in (b.ship || {})) row[k] = b.ship[k] === "" ? null : b.ship[k];
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
    const { data: s } = await db.from("shipments").select("*").eq("id", b.id).single();
    const { data: veh } = await db.from("shipment_vehicles").select("vin,container").eq("shipment_id", b.id).order("vin");
    if (!s || !veh?.length) return NextResponse.json({ ok: false, error: "Ajoutez d'abord les numéros de série (VIN)" }, { status: 400 });
    if (!s.invoice_no || !s.unit_price) return NextResponse.json({ ok: false, error: "Renseignez le n° de facture usine et le prix unitaire" }, { status: 400 });
    const out: string[] = [];
    for (const [type, buf, label] of [["facture", await invoicePdf(s, veh), "Invoice"], ["colisage", await packingPdf(s, veh), "Packing-list"]] as const) {
      const name = `${label}-VIN-${s.invoice_no}.pdf`; const path = `${b.id}/gen-${type}-${Date.now()}.pdf`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf" }); if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
      const { data: old } = await db.from("shipment_docs").select("id,file_path").eq("shipment_id", b.id).eq("doc_type", type).eq("uploaded_by", "plateforme");
      if (old?.length) { await db.storage.from(BUCKET).remove(old.map(o => o.file_path)); await db.from("shipment_docs").delete().in("id", old.map(o => o.id)); }
      await db.from("shipment_docs").insert({ shipment_id: b.id, doc_type: type, version: "corrigée", file_path: path, file_name: name, uploaded_by: "plateforme", ref: s.invoice_no, ai_note: `Version propre avec les ${veh.length} VIN et les COC, générée le ${new Date().toLocaleDateString("fr-FR")} à partir de la facture usine (montants identiques).` });
      out.push(path);
    }
    return NextResponse.json({ ok: true, paths: out });
  }
  if (b.action === "send" && b.id) {
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    const { data: s } = await db.from("shipments").select("*").eq("id", b.id).single();
    const { data: fw } = s ? await db.from("forwarders").select("*").eq("port", portKey(s.port)).maybeSingle() : { data: null };
    const to = clean(b.to || fw?.email || s?.forwarder_email, 160); if (!s || !to) return NextResponse.json({ ok: false, error: "E-mail du transitaire manquant" }, { status: 400 });
    const { data: docs } = await db.from("shipment_docs").select("*").eq("shipment_id", b.id);
    // Pour chaque type : la version corrigée si elle existe, sinon l'originale ; les versions avec VIN générées par la plateforme sont toujours jointes en plus de l'original usine.
    const pick = DOC_TYPES.flatMap(t => { const all = (docs || []).filter(d => d.doc_type === t.key); const gen = all.filter(d => d.uploaded_by === "plateforme"); const rest = all.filter(d => d.uploaded_by !== "plateforme"); const cor = rest.filter(d => d.version === "corrigée"); return [...gen, ...(cor.length ? cor : rest)]; });
    const links = await Promise.all(pick.map(async d => ({ d, url: (await db.storage.from(BUCKET).createSignedUrl(d.file_path, 14 * 86400)).data?.signedUrl })));
    const missing = DOC_TYPES.filter(t => t.required && !(docs || []).some(d => d.doc_type === t.key)).map(t => t.fr);
    const vins = (await db.from("shipment_vehicles").select("vin").eq("shipment_id", b.id)).data || [];
    if (!vins.length) missing.push("Liste des VIN par conteneur");
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Bonjour${fw?.contact && to === fw.email ? " " + esc(fw.contact) : ""},</p><p>Veuillez trouver ci-dessous les documents du dossier <b>${esc(s.name)}</b> pour le dédouanement.</p>
<table style="border-collapse:collapse;font-size:14px">${[["Port d'arrivée", s.port], ["Navire / voyage", s.vessel], ["Connaissement (B/L)", s.bl_number], ["Conteneur(s)", s.containers], ["Véhicules", s.vehicles], ["Chargement", s.loaded_at], ["Arrivée prévue", s.eta]].map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#666">${k}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>
<p><b>Documents</b> (liens valables 14 jours) :</p><ul>${links.map(({ d, url }) => `<li>${esc(docLabel(d.doc_type))}${d.uploaded_by === "plateforme" ? " (détail par VIN)" : d.version === "corrigée" ? " (version corrigée)" : " (original usine)"} : <a href="${url}">${esc(d.file_name)}</a></li>`).join("")}</ul>
${missing.length ? `<p style="color:#b91c1c">Documents à venir : ${esc(missing.join(", "))}.</p>` : ""}<p>Merci de nous confirmer la bonne réception et de nous indiquer s'il manque un élément.</p><p>Cordialement,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive – 06 28 26 14 46</p></div>`;
    await sendEmail(to, fw?.contact || "", `Dossier import ${s.name} – B/L ${s.bl_number || "?"} – MK HOLDING`, html);
    for (const cc of String(fw?.cc || "").split(/[,; ]+/).filter(x => /@/.test(x) && x !== to)) await sendEmail(cc, "", `Dossier import ${s.name} – B/L ${s.bl_number || "?"} – MK HOLDING`, html).catch(() => null);
    await db.from("shipments").update({ sent_at: new Date().toISOString(), forwarder_email: to }).eq("id", b.id);
    return NextResponse.json({ ok: true, sent: links.length, missing });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
