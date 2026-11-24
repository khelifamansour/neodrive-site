import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { CARTE_GRISE_BUCKET } from "../../../../lib/carte-grise-server";
import { CARTE_GRISE_COLUMNS, CARTE_GRISE_FILE_LABEL, type CarteGriseFile } from "../../../../lib/carte-grise";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ImportFile = { key: string; label?: string; name: string; type?: string; content: string };
type Payload = { dossier: Record<string, unknown>; files: ImportFile[] };

const safe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);

/**
 * Import d'un dossier carte grise déjà constitué (pièces reçues par e-mail ou WhatsApp) dans le suivi « Carte grise » :
 * pièces enregistrées dans le stockage privé et fiche créée. Déclenché par un jeton à usage unique
 * (admin_once_tokens.purpose « cg-import », payload = { dossier, files: [{ key, label, name, type, content base64 }] }).
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "cg-import").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: Payload } | undefined)?.payload;
  if (!p?.dossier || !Array.isArray(p.files) || !p.files.length) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const d = p.dossier;
    const ref = `CG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const folder = `${ref}-${crypto.randomUUID()}`;
    const files: CarteGriseFile[] = [];
    for (const f of p.files.slice(0, 15)) {
      if (!CARTE_GRISE_FILE_LABEL[f.key]) throw new Error(`Pièce inconnue : ${f.key}`);
      const buf = Buffer.from(f.content, "base64");
      const path = `carte-grise/${folder}/${f.key}-${crypto.randomUUID().slice(0, 8)}-${safe(f.name)}`;
      const { error } = await db.storage.from(CARTE_GRISE_BUCKET).upload(path, buf, { contentType: f.type || "application/octet-stream", upsert: false });
      if (error) throw new Error(`Envoi de ${f.name} : ${error.message}`);
      files.push({ key: f.key, label: f.label || CARTE_GRISE_FILE_LABEL[f.key], path, name: f.name, size: buf.length, type: f.type });
    }
    const cols: Record<string, unknown> = {};
    for (const k of CARTE_GRISE_COLUMNS) if (typeof d[k] === "string") cols[k] = d[k];
    const extra: Record<string, unknown> = {};
    for (const k of ["status", "notes", "vin", "vin_source", "sent_to", "sent_to_provider_at", "reservation_id", "vehicle_id", "match_note"]) if (d[k] !== undefined) extra[k] = d[k];
    if (typeof extra.vin === "string") extra.vin_check_ok = true;
    const fields = (d.fields && typeof d.fields === "object" ? d.fields : {}) as Record<string, string>;
    const { data: row, error } = await db.from("carte_grise_dossiers").insert({ ref, folder, ...cols, fields, files, status: "reçu", ...extra }).select("id,ref").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id: row.id, ref: row.ref, files: files.map(f => f.name) });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
export const GET = run;
