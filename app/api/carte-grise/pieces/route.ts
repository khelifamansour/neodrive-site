import { NextResponse, after } from "next/server";
import { dataClient } from "../../../../lib/datastore";
import { CARTE_GRISE_FILE_LABEL, CARTE_GRISE_MAX_FILE, pendingKeys, type CarteGriseFile } from "../../../../lib/carte-grise";
import { CARTE_GRISE_BUCKET, type CarteGriseDossier } from "../../../../lib/carte-grise-server";
import { afterPieces, receivePieces } from "../../../../lib/carte-grise-check";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
const TYPES = /^(application\/pdf|image\/[a-z0-9.+-]+)?$/i;

const hits = new Map<string, number[]>();
function tooMany(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(); const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 30;
}

/**
 * Dépôt des pièces manquantes par le client (lien /carte-grise/pieces/<jeton>).
 * « init » : URL d'envoi signées (dépôt direct dans le stockage privé). « complete » : pièces ajoutées au dossier puis contrôlées.
 */
export async function POST(req: Request) {
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Service momentanément indisponible" }, { status: 503 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const token = String(b.token || "");
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false, error: "Lien invalide" }, { status: 404 });
  if (tooMany(req)) return NextResponse.json({ ok: false, error: "Trop d’envois, réessayez dans une heure" }, { status: 429 });
  try {
    const { data } = await sb.from("carte_grise_dossiers").select("*").eq("missing_token", token).maybeSingle();
    const d = data as CarteGriseDossier | null;
    if (!d || d.status === "annulé") return NextResponse.json({ ok: false, error: "Lien invalide ou expiré" }, { status: 404 });
    const files = (Array.isArray(b.files) ? b.files : []) as { key?: string; name?: string; type?: string; size?: number; path?: string }[];
    if (!files.length || files.length > 10) return NextResponse.json({ ok: false, error: "Ajoutez au moins un document" }, { status: 400 });
    for (const f of files) if (!f.key || !CARTE_GRISE_FILE_LABEL[f.key]) return NextResponse.json({ ok: false, error: "Document inconnu" }, { status: 400 });

    if (b.action === "init") {
      const uploads: { key: string; path: string; token: string; name: string; type: string }[] = [];
      for (const f of files) {
        if (!(Number(f.size) > 0) || Number(f.size) > CARTE_GRISE_MAX_FILE) return NextResponse.json({ ok: false, error: "Fichier trop lourd (25 Mo maximum)" }, { status: 400 });
        if (!TYPES.test(String(f.type || ""))) return NextResponse.json({ ok: false, error: "Envoyez une photo ou un PDF" }, { status: 400 });
        const name = safeName(f.name || "document") || "document";
        const path = `carte-grise/${d.folder}/${f.key}-complement-${crypto.randomUUID().slice(0, 8)}-${name}`;
        const { data: up, error } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUploadUrl(path);
        if (error || !up) return NextResponse.json({ ok: false, error: "Envoi momentanément indisponible" }, { status: 502 });
        uploads.push({ key: f.key!, path: up.path, token: up.token, name, type: f.type || "" });
      }
      return NextResponse.json({ ok: true, bucket: CARTE_GRISE_BUCKET, uploads });
    }

    if (b.action === "complete") {
      const prefix = `carte-grise/${d.folder}/`;
      const { data: listed, error } = await sb.storage.from(CARTE_GRISE_BUCKET).list(`carte-grise/${d.folder}`, { limit: 200 });
      if (error) return NextResponse.json({ ok: false, error: "Envoi momentanément indisponible" }, { status: 502 });
      const size = new Map((listed || []).map(f => [`${prefix}${f.name}`, Number((f.metadata as { size?: number } | null)?.size) || 0]));
      const known = new Set((d.files || []).map(f => f.path));
      const got: CarteGriseFile[] = [];
      for (const f of files) {
        const path = String(f.path || "");
        if (!path.startsWith(`${prefix}${f.key}-complement-`) || !size.has(path) || known.has(path)) continue;
        got.push({ key: f.key!, label: CARTE_GRISE_FILE_LABEL[f.key!], path, name: safeName(f.name || "document") || "document", size: size.get(path) || Number(f.size) || 0, type: String(f.type || "") });
      }
      if (!got.length) return NextResponse.json({ ok: false, error: "Aucun document reçu : réessayez" }, { status: 400 });
      const out = await receivePieces(sb, d, got);
      after(() => afterPieces(sb, d.id, out.keys).catch(e => console.error("[carte-grise] après dépôt", e)));
      const pieces = Object.fromEntries(out.keys.map(k => [k, { status: out.check.pieces[k]?.status || "à vérifier", reason: out.check.pieces[k]?.reason || "" }]));
      return NextResponse.json({ ok: true, pieces, pending: pendingKeys(out.req, out.check) });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[carte-grise] pièces", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur, réessayez" }, { status: 500 });
  }
}
