import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FINANCE_DOCS } from "../../../../lib/neodrive-finance";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "erp-documents";
const LINK_TTL = 60 * 60 * 24 * 7; // liens de téléchargement valables 7 jours

/** Finalise le dossier : vérifie les fichiers reçus, enregistre la fiche et renvoie des liens de consultation sécurisés pour NeoDrive. */
export async function POST(req: Request) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 503 });
  const body = await req.json().catch(() => null) as { folder?: string; applicant?: Record<string, string>; simulation?: Record<string, unknown>; consent?: boolean } | null;
  const folder = String(body?.folder || "");
  const m = folder.match(/^(FIN-\d{4}-\d{8})-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  if (!m) return NextResponse.json({ ok: false, error: "Référence invalide." }, { status: 400 });
  const ref = m[1];
  if (!body?.consent) return NextResponse.json({ ok: false, error: "Consentement requis." }, { status: 400 });
  const a = body.applicant || {};
  if (!a.nom || !a.prenom || !a.email || !a.telephone) return NextResponse.json({ ok: false, error: "Coordonnées incomplètes." }, { status: 400 });

  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const { data: listed, error } = await sb.storage.from(BUCKET).list(`financement/${folder}`, { limit: 50 });
  if (error) return NextResponse.json({ ok: false, error: "Stockage indisponible." }, { status: 502 });
  const files = (listed || []).filter(f => f.name !== "dossier.json");
  const missing = FINANCE_DOCS.filter(d => d.required && !files.some(f => f.name.startsWith(d.key + "-"))).map(d => d.label);
  if (missing.length) return NextResponse.json({ ok: false, error: `Documents manquants : ${missing.join(", ")}` }, { status: 400 });

  const links: { label: string; url: string }[] = [];
  for (const f of files) {
    const doc = FINANCE_DOCS.find(d => f.name.startsWith(d.key + "-"));
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(`financement/${folder}/${f.name}`, LINK_TTL);
    if (data?.signedUrl) links.push({ label: doc?.label || f.name, url: data.signedUrl });
  }
  const dossier = { ref, folder, created_at: new Date().toISOString(), applicant: a, simulation: body.simulation || {}, files: files.map(f => f.name), consent: true };
  await sb.storage.from(BUCKET).upload(`financement/${folder}/dossier.json`, Buffer.from(JSON.stringify(dossier, null, 2)), { contentType: "application/json", upsert: true });
  return NextResponse.json({ ok: true, ref, links });
}
