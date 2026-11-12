import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { defaultAd } from "../../../lib/oldstock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "old-stock";
const FIELDS = ["ref", "model", "version", "color", "year", "km", "starts", "repairs", "condition", "cg_status", "cg_notes", "vin", "location", "price_min", "price_ad", "status", "ad_title", "ad_text", "notes", "sold_price"];
const safe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-70);

/** Ancien stock (code d'accès NeoDrive). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  if (b.action === "list") {
    const [{ data: rows }, { data: media }] = await Promise.all([db.from("old_stock").select("*").order("id"), db.from("old_stock_media").select("*").order("id")]);
    const urls: Record<string, string> = {};
    const paths = (media || []).map(m => m.path);
    for (let i = 0; i < paths.length; i += 100) { const { data } = await db.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 3600); for (const u of data || []) if (u.path && u.signedUrl) urls[u.path] = u.signedUrl; }
    return NextResponse.json({ ok: true, rows: rows || [], media: (media || []).map(m => ({ ...m, url: urls[m.path] })) });
  }
  if (b.action === "save") {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of FIELDS) if (k in (b.row || {})) { const v = b.row[k]; row[k] = v === "" ? null : ["km", "price_min", "price_ad", "sold_price"].includes(k) ? (v == null ? null : Math.round(Number(v)) || 0) : String(v).slice(0, 4000); }
    if (b.row?.status === "vendu") row.sold_at = new Date().toISOString();
    if (b.id) { const { error } = await db.from("old_stock").update(row).eq("id", b.id); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); return NextResponse.json({ ok: true }); }
    const { data, error } = await db.from("old_stock").insert(row).select("id").single(); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (b.action === "delete" && b.id) { const { data: m } = await db.from("old_stock_media").select("path").eq("stock_id", b.id); if (m?.length) await db.storage.from(BUCKET).remove(m.map(x => x.path)); await db.from("old_stock").delete().eq("id", b.id); return NextResponse.json({ ok: true }); }
  if (b.action === "upload_init" && b.id) {
    const files = (Array.isArray(b.files) ? b.files : []).slice(0, 30) as { name: string; type: string }[];
    const uploads = [];
    for (const f of files) { const path = `${b.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safe(f.name || "media")}`; const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path); if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 }); uploads.push({ path: data.path, token: data.token, name: f.name, kind: String(f.type).startsWith("video/") ? "video" : "photo" }); }
    return NextResponse.json({ ok: true, bucket: BUCKET, uploads });
  }
  if (b.action === "media_add" && b.id) { const items = (b.items || []) as { path: string; kind: string; name: string }[]; if (items.length) await db.from("old_stock_media").insert(items.map(i => ({ stock_id: b.id, path: String(i.path).slice(0, 300), kind: i.kind === "video" ? "video" : "photo", name: String(i.name || "").slice(0, 150) }))); return NextResponse.json({ ok: true }); }
  if (b.action === "media_delete" && b.mid) { const { data } = await db.from("old_stock_media").select("path").eq("id", b.mid).single(); if (data) await db.storage.from(BUCKET).remove([data.path]); await db.from("old_stock_media").delete().eq("id", b.mid); return NextResponse.json({ ok: true }); }
  if (b.action === "ai_ad" && b.id) {
    await applyStoredSecrets();
    const { data: v } = await db.from("old_stock").select("*").eq("id", b.id).single(); if (!v) return NextResponse.json({ ok: false }, { status: 404 });
    const fallback = defaultAd(v); const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ ok: true, ...fallback });
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-4.1-mini", text: { format: { type: "json_object" } }, max_output_tokens: 700, instructions: "Tu rédiges des annonces Leboncoin honnêtes et efficaces pour des voitures sans permis d'occasion vendues par NeoDrive (près de Muret, 31). Réponds en JSON {\"title\": ≤ 70 caractères, \"text\": 8 à 14 lignes}. Mets en avant les points forts réels, indique clairement l'état, les réparations à prévoir et si la voiture ne démarre pas (vente en l'état). N'invente aucune caractéristique, aucun équipement ni aucune garantie absents des données. Termine par : visible près de Muret (31), livraison possible partout en France, et le contact NeoDrive 06 89 78 17 10.", input: "Réponds en json. Données du véhicule : " + JSON.stringify({ modele: v.model, version: v.version, couleur: v.color, annee: v.year, km: v.km, demarre: v.starts, etat: v.condition, reparations: v.repairs, carte_grise: v.cg_status, prix: v.price_ad, notes: v.notes }) }) }).then(x => x.json()).catch(() => null);
    try { const out = JSON.parse(r.output.find((o: any) => o.type === "message").content[0].text); return NextResponse.json({ ok: true, title: String(out.title || fallback.title).slice(0, 100), text: String(out.text || fallback.text) }); } catch { return NextResponse.json({ ok: true, ...fallback }); }
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
