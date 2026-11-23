import { NextResponse } from "next/server";
import { dataClient } from "../../../../lib/datastore";
import { CARTE_GRISE_COLUMNS, CARTE_GRISE_FILE_LABEL, CARTE_GRISE_MAX_FILE, type CarteGriseFile } from "../../../../lib/carte-grise";
import { CARTE_GRISE_BUCKET } from "../../../../lib/carte-grise-server";

export const dynamic = "force-dynamic";
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
const TYPES = /^(application\/pdf|image\/[a-z0-9.+-]+)?$/i;
const FOLDER = /^(CG-\d{4}-\d{8})-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Limite simple par adresse IP (formulaire public)
const hits = new Map<string, number[]>();
function tooMany(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(); const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 10;
}

/**
 * Copie côté serveur du dossier carte grise (en plus de l'envoi Formspree, qui reste la voie principale).
 * « init » : crée la fiche et renvoie des URL d'envoi signées (dépôt direct dans le stockage privé, sans limite de taille Vercel).
 * « complete » : vérifie les pièces reçues et passe la fiche à « reçu ».
 */
export async function POST(req: Request) {
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 503 });
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    if (b.action === "init") {
      if (tooMany(req)) return NextResponse.json({ ok: false, error: "Trop de demandes" }, { status: 429 });
      const raw = (b.fields && typeof b.fields === "object" ? b.fields : {}) as Record<string, unknown>;
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw).slice(0, 60)) if (/^[a-z_]{1,40}$/i.test(k) && typeof v === "string" && !k.startsWith("_")) fields[k] = v.slice(0, 2000);
      const files = (Array.isArray(b.files) ? b.files : []) as { key?: string; name?: string; type?: string; size?: number }[];
      if (!files.length || files.length > 12) return NextResponse.json({ ok: false, error: "Aucune pièce" }, { status: 400 });
      for (const f of files) {
        if (!f.key || !CARTE_GRISE_FILE_LABEL[f.key]) return NextResponse.json({ ok: false, error: "Pièce inconnue" }, { status: 400 });
        if (!(Number(f.size) > 0) || Number(f.size) > CARTE_GRISE_MAX_FILE) return NextResponse.json({ ok: false, error: "Fichier trop lourd" }, { status: 400 });
        if (!TYPES.test(String(f.type || ""))) return NextResponse.json({ ok: false, error: "Format non accepté" }, { status: 400 });
      }
      if (!fields.nom && !fields.prenom && !fields.telephone) return NextResponse.json({ ok: false, error: "Coordonnées manquantes" }, { status: 400 });
      const ref = `CG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
      const folder = `${ref}-${crypto.randomUUID()}`;
      const uploads: { key: string; path: string; token: string }[] = []; const planned: CarteGriseFile[] = [];
      for (const f of files) {
        const name = safeName(f.name || "document") || "document";
        const path = `carte-grise/${folder}/${f.key}-${crypto.randomUUID().slice(0, 8)}-${name}`;
        const { data, error } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUploadUrl(path);
        if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
        uploads.push({ key: f.key!, path: data.path, token: data.token });
        planned.push({ key: f.key!, label: CARTE_GRISE_FILE_LABEL[f.key!], path: data.path, name, size: Number(f.size), type: f.type || "" });
      }
      const cols = Object.fromEntries(CARTE_GRISE_COLUMNS.map(k => [k, (fields[k] || "").trim() || null]));
      const { data: row, error } = await sb.from("carte_grise_dossiers").insert({ ref, folder, ...cols, fields, files: planned, status: "envoi en cours" }).select("id").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, id: row.id, ref, folder, bucket: CARTE_GRISE_BUCKET, uploads });
    }

    if (b.action === "complete") {
      const folder = String(b.folder || "");
      const m = folder.match(FOLDER);
      if (!m) return NextResponse.json({ ok: false, error: "Référence invalide" }, { status: 400 });
      const { data: d } = await sb.from("carte_grise_dossiers").select("id,files,status").eq("ref", m[1]).eq("folder", folder).maybeSingle();
      if (!d) return NextResponse.json({ ok: false, error: "Dossier introuvable" }, { status: 404 });
      if (d.status !== "envoi en cours") return NextResponse.json({ ok: true, id: d.id });
      const { data: listed, error } = await sb.storage.from(CARTE_GRISE_BUCKET).list(`carte-grise/${folder}`, { limit: 50 });
      if (error) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      const present = new Map((listed || []).map(f => [`carte-grise/${folder}/${f.name}`, Number((f.metadata as { size?: number } | null)?.size) || 0]));
      const files = ((d.files || []) as CarteGriseFile[]).filter(f => present.has(f.path)).map(f => ({ ...f, size: present.get(f.path) || f.size }));
      const lost = ((d.files || []) as CarteGriseFile[]).length - files.length;
      await sb.from("carte_grise_dossiers").update({ files, status: "reçu", ...(lost ? { notes: `⚠️ ${lost} pièce(s) non reçue(s) côté serveur (voir l'e-mail Formspree)` } : {}), updated_at: new Date().toISOString() }).eq("id", d.id);
      return NextResponse.json({ ok: true, id: d.id, files: files.length, lost });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[carte-grise] dossier", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
