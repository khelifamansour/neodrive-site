import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail } from "../../../lib/brevo";
import { DOC_TYPES, docLabel, isDocType } from "../../../lib/shipments";
import { storeFiles } from "./store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "shipment-docs";
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SHIP_FIELDS = ["name", "port", "supplier", "vessel", "bl_number", "containers", "vehicles", "loaded_at", "eta", "arrived_at", "status", "forwarder_email", "notes"];

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
    const [{ data: ships }, { data: docs }] = await Promise.all([db.from("shipments").select("*").order("eta", { ascending: true, nullsFirst: false }), db.from("shipment_docs").select("*").order("created_at")]);
    return NextResponse.json({ ok: true, ships, docs });
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
  if (b.action === "send" && b.id) {
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    const { data: s } = await db.from("shipments").select("*").eq("id", b.id).single();
    const to = clean(b.to || s?.forwarder_email, 160); if (!s || !to) return NextResponse.json({ ok: false, error: "E-mail du transitaire manquant" }, { status: 400 });
    const { data: docs } = await db.from("shipment_docs").select("*").eq("shipment_id", b.id);
    // Pour chaque type, on envoie la version corrigée si elle existe, sinon l'originale.
    const pick = DOC_TYPES.flatMap(t => { const all = (docs || []).filter(d => d.doc_type === t.key); const cor = all.filter(d => d.version === "corrigée"); return cor.length ? cor : all; });
    const links = await Promise.all(pick.map(async d => ({ d, url: (await db.storage.from(BUCKET).createSignedUrl(d.file_path, 14 * 86400)).data?.signedUrl })));
    const missing = DOC_TYPES.filter(t => t.required && !(docs || []).some(d => d.doc_type === t.key)).map(t => t.fr);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Bonjour,</p><p>Veuillez trouver ci-dessous les documents du dossier <b>${esc(s.name)}</b> pour le dédouanement.</p>
<table style="border-collapse:collapse;font-size:14px">${[["Port d'arrivée", s.port], ["Navire / voyage", s.vessel], ["Connaissement (B/L)", s.bl_number], ["Conteneur(s)", s.containers], ["Véhicules", s.vehicles], ["Chargement", s.loaded_at], ["Arrivée prévue", s.eta]].map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#666">${k}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>
<p><b>Documents</b> (liens valables 14 jours) :</p><ul>${links.map(({ d, url }) => `<li>${esc(docLabel(d.doc_type))}${d.version === "corrigée" ? " (version corrigée)" : ""} : <a href="${url}">${esc(d.file_name)}</a></li>`).join("")}</ul>
${missing.length ? `<p style="color:#b91c1c">Documents à venir : ${esc(missing.join(", "))}.</p>` : ""}<p>Merci de nous confirmer la bonne réception et de nous indiquer s'il manque un élément.</p><p>Cordialement,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive – 06 28 26 14 46</p></div>`;
    await sendEmail(to, "", `Dossier import ${s.name} – B/L ${s.bl_number || "?"} – MK HOLDING`, html);
    await db.from("shipments").update({ sent_at: new Date().toISOString(), forwarder_email: to }).eq("id", b.id);
    return NextResponse.json({ ok: true, sent: links.length, missing });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
