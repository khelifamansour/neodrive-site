import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL, SITE } from "../../../../lib/brevo";
import { DOC_TYPES, FACTORY_DOCS, factoryChecks, portKey, type Extracted } from "../../../../lib/shipments";
import { extractDoc } from "../extract";
import { sendDossier } from "../send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "shipment-docs";
const tokenOk = (t: string) => /^[a-f0-9]{36}$/.test(t);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip: "application/zip" };
const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
const READ = ["pi", "facture", "colisage", "coc"];

async function shipByToken(db: SupabaseClient, t: string) {
  if (!tokenOk(t)) return null;
  const { data } = await db.from("shipments").select("*").eq("factory_token", t).maybeSingle();
  return data;
}
async function state(db: SupabaseClient, s: Record<string, any>) {
  const { data: docs } = await db.from("shipment_docs").select("id,doc_type,version,file_name,created_at,uploaded_by,extracted").eq("shipment_id", s.id).order("created_at");
  const own = (docs || []).filter(d => d.uploaded_by !== "plateforme");
  return { docs: own, checks: factoryChecks(s, own) };
}

/** Portail usine (lien privé, interface en anglais) : état du dossier, pièces reçues et contrôles. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  const db = crmDatabase(); const s = await shipByToken(db, t);
  if (!s) return NextResponse.json({ ok: false }, { status: 404 });
  const { docs, checks } = await state(db, s);
  return NextResponse.json({ ok: true, ship: { name: s.name, port: s.port, vehicles: s.vehicles, containers: (s.container_list || []).length || null, eta: s.eta, loaded_at: s.loaded_at, model: s.model, sent: !!s.sent_at }, docs: docs.map(d => ({ id: d.id, doc_type: d.doc_type, version: d.version, file_name: d.file_name, created_at: d.created_at, vins: (d.extracted as Extracted | null)?.vins?.length ?? null })), checks });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const db = crmDatabase(); const s = await shipByToken(db, String(b.t || ""));
  if (!s) return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  const who = String(b.who || "").replace(/[<>]/g, "").trim().slice(0, 60) || "factory";

  // 1) URLs d'envoi direct vers le stockage privé (pas de limite de taille Vercel)
  if (b.action === "upload_url") {
    const files = (Array.isArray(b.files) ? b.files : []).slice(0, 40) as { name: string }[];
    const uploads = [];
    for (const f of files) {
      const ext = extOf(String(f.name || "")) || "pdf";
      const path = `${s.id}/f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Storage unavailable" }, { status: 502 });
      uploads.push({ path: data.path, token: data.token });
    }
    return NextResponse.json({ ok: true, bucket: BUCKET, uploads });
  }

  // 2) Enregistrement d'un fichier envoyé + lecture automatique (VIN, montants)
  if (b.action === "register") {
    await applyStoredSecrets();
    const path = String(b.path || ""); const name = String(b.name || "document").replace(/[<>]/g, "").slice(0, 160);
    const type = FACTORY_DOCS.some(d => d.key === b.doc_type) ? String(b.doc_type) : "autre";
    if (!path.startsWith(`${s.id}/f-`) || path.includes("..")) return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
    const { data: blob, error } = await db.storage.from(BUCKET).download(path);
    if (error || !blob) return NextResponse.json({ ok: false, error: "File not received, please upload again" }, { status: 400 });
    const mime = MIME[extOf(path)] || "application/octet-stream";
    let extracted: Extracted | null = null;
    if (READ.includes(type)) extracted = await extractDoc(type, Buffer.from(await blob.arrayBuffer()), mime, name).catch(e => ({ error: String((e as Error).message || e).slice(0, 80) }));
    const version = b.version === "corrigée" ? "corrigée" : "originale";
    const ai_note = extracted && !extracted.error ? `Lu automatiquement : ${extracted.vins?.length || 0} VIN${extracted.total != null ? `, total ${extracted.total} ${extracted.currency || ""}` : ""}${extracted.containers?.length ? `, ${extracted.containers.length} conteneur(s)` : ""}.` : extracted?.error ? `Lecture automatique : ${extracted.error}` : "";
    const { error: insErr } = await db.from("shipment_docs").insert({ shipment_id: s.id, doc_type: type, version, file_path: path, file_name: name, uploaded_by: `usine (${who})`, ref: extracted?.invoice_no || null, ai_note, extracted });
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    // Colisage : les VIN (et leur conteneur) alimentent la liste des véhicules du dossier, sans rien écraser.
    let added = 0;
    if (type === "colisage" && extracted?.vins?.length) {
      const contOf = (v: string) => extracted!.containers?.find(c => c.vins?.includes(v))?.no || null;
      const rows = extracted.vins.filter(v => /^[A-HJ-NPR-Z0-9]{17}$/.test(v)).map(vin => ({ shipment_id: s.id, vin, container: contOf(vin) }));
      if (rows.length) { const { data } = await db.from("shipment_vehicles").upsert(rows, { onConflict: "shipment_id,vin", ignoreDuplicates: true }).select("id"); added = data?.length || 0; }
      if (!(s.container_list || []).length && extracted.containers?.length) await db.from("shipments").update({ container_list: extracted.containers.map(c => ({ no: c.no })) }).eq("id", s.id);
    }
    return NextResponse.json({ ok: true, type, read: extracted ? !extracted.error : null, vins: extracted?.vins?.length ?? null, added });
  }

  // 3) Fin d'envoi : contrôles, alerte au fondateur et envoi automatique au transitaire si tout est complet
  if (b.action === "finish") {
    await applyStoredSecrets();
    const fresh = (await db.from("shipments").select("*").eq("id", s.id).single()).data || s;
    const { docs, checks } = await state(db, fresh);
    let autoSent: string | null = null, sendErr = "";
    if (checks.complete && !fresh.factory_complete_at) await db.from("shipments").update({ factory_complete_at: new Date().toISOString() }).eq("id", s.id);
    if (checks.complete && fresh.auto_send && !fresh.sent_at && brevoReady()) {
      try { autoSent = (await sendDossier(db, s.id)).to; } catch (e) { sendErr = (e as Error).message; }
    }
    if (brevoReady()) {
      const recent = docs.filter(d => Date.now() - new Date(d.created_at).getTime() < 3 * 3600 * 1000);
      const label = (k: string) => DOC_TYPES.find(d => d.key === k)?.fr || k;
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>L'usine (${esc(who)}) a déposé des documents dans le dossier <b>${esc(fresh.name)}</b> (${esc(fresh.port || "")}).</p>
<p><b>Reçus ces dernières heures :</b></p><ul>${recent.map(d => `<li>${esc(label(d.doc_type))} : ${esc(d.file_name)}</li>`).join("") || "<li>—</li>"}</ul>
${checks.missing.length ? `<p style="color:#b45309"><b>Encore manquant :</b> ${esc(checks.missing.map(label).join(", "))}</p>` : ""}
${checks.issues.length ? `<p><b>Contrôles :</b></p><ul>${checks.issues.map(i => `<li style="color:${i.level === "error" ? "#b91c1c" : "#b45309"}">${esc(i.fr)}</li>`).join("")}</ul>` : `<p style="color:#15803d">✅ Contrôles automatiques OK (VIN, quantités, totaux).</p>`}
${autoSent ? `<p style="color:#15803d"><b>✅ Dossier complet : envoyé automatiquement au transitaire ${esc(portKey(fresh.port))} (${esc(autoSent)}).</b></p>` : checks.complete ? `<p><b>Dossier usine complet.</b> ${fresh.sent_at ? "Déjà envoyé au transitaire auparavant." : !fresh.auto_send ? "Envoi automatique désactivé : envoyez-le depuis la page conteneurs." : `Envoi automatique impossible : ${esc(sendErr || "Brevo")}.`}</p>` : ""}
<p><a href="${SITE}/conteneurs">${SITE}/conteneurs</a></p></div>`;
      await sendEmail(OWNER_EMAIL, "Mansour", `${autoSent ? "✅ Dossier envoyé au transitaire" : checks.complete ? "✅ Dossier usine complet" : "📥 Documents usine"} : ${fresh.name}`, html).catch(() => null);
    }
    return NextResponse.json({ ok: true, checks, autoSent: !!autoSent });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
