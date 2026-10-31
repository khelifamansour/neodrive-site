import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FINANCE_DOCS, FINANCE_MAX_FILE, FINANCE_TYPES } from "../../../../lib/neodrive-finance";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "erp-documents";
const KEYS = new Set<string>(FINANCE_DOCS.map(d => d.key));
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);

/** Prépare un dossier : renvoie une référence et des URL d'envoi signées (envoi direct vers le stockage privé, sans limite de taille Vercel). */
export async function POST(req: Request) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 503 });
  const body = await req.json().catch(() => null) as { files?: { key: string; name: string; type: string; size: number }[] } | null;
  const files = Array.isArray(body?.files) ? body!.files : [];
  if (!files.length || files.length > 12) return NextResponse.json({ ok: false, error: "Ajoutez vos justificatifs." }, { status: 400 });
  for (const f of files) {
    if (!KEYS.has(f.key)) return NextResponse.json({ ok: false, error: "Document inconnu." }, { status: 400 });
    if (!(f.size > 0) || f.size > FINANCE_MAX_FILE) return NextResponse.json({ ok: false, error: `${f.name} dépasse 10 Mo.` }, { status: 400 });
    if (f.type && !FINANCE_TYPES.includes(f.type)) return NextResponse.json({ ok: false, error: `${f.name} : format non accepté (PDF, JPG, PNG).` }, { status: 400 });
  }
  const ref = `FIN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  // Dossier privé : référence lisible + identifiant aléatoire non devinable
  const folder = `${ref}-${crypto.randomUUID()}`;
  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const uploads = [];
  for (const f of files) {
    const path = `financement/${folder}/${f.key}-${crypto.randomUUID().slice(0, 8)}-${safeName(f.name || "document")}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible, réessayez." }, { status: 502 });
    uploads.push({ key: f.key, path: data.path, token: data.token });
  }
  return NextResponse.json({ ok: true, ref, folder, bucket: BUCKET, uploads });
}
