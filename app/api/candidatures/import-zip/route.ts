import { NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { POSTES, isPoste, type PosteKey } from "../../../../lib/hiring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "job-applications";
const BATCH = 6;
const clean = (v: unknown, max = 600) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const t9 = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);
const GRIDS: Record<PosteKey, string> = {
  closer: "vente par téléphone à des clients français (35) · niveau de français visible dans le CV (20) · administratif / back-office / CRM (15) · stabilité (10) · habite Alger (10) · bonus pertinent : automobile, centre d'appels (10)",
  coordinateur: "expérience import-export / transit / douane / logistique / supply chain (35) · rigueur administrative, documents, ERP, Excel (20) · français écrit (15) · anglais (10) · stabilité et ancienneté (10) · habite Alger (10)",
  social: "résultats prouvés en vidéo courte / réseaux sociaux, avec chiffres ou liens (35) · montage vidéo et outils (20) · esprit marketing et acquisition (15) · français écrit (10) · stabilité (10) · habite Alger (10)",
};

/** Note un CV avec l'IA pour les 3 postes, garde le meilleur, et extrait les coordonnées. */
async function score(_poste: PosteKey, name: string, buf: Uint8Array) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const ext = name.toLowerCase().split(".").pop() || "";
  const b64 = Buffer.from(buf).toString("base64");
  const file = ext === "pdf" ? { type: "input_file", filename: name, file_data: `data:application/pdf;base64,${b64}` } : /^(jpe?g|png|webp)$/.test(ext) ? { type: "input_image", image_url: `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${b64}` } : null;
  if (!file) return null;
  const postes = (Object.keys(POSTES) as PosteKey[]).map(k => `- "${k}" : ${POSTES[k].title}. Mission : ${POSTES[k].summary}. Grille sur 100 : ${GRIDS[k]}.`).join("\n");
  const instructions = `Tu présélectionnes des CV (candidats algériens) pour NeoDrive, marque française de voitures sans permis électriques. Trois postes freelance en présentiel à Alger, aux horaires français :\n${postes}\nNote le CV sur 100 pour CHACUN des 3 postes avec sa grille, puis choisis le poste le plus adapté. Sois exigeant et discriminant ; un CV vague sans détail obtient une note basse ; note uniquement sur ce qui est écrit. Réponds uniquement en json : {"full_name": "Prénom Nom" avec majuscules et accents, "city": ville ou commune (ajoute « (Alger) » pour une commune d'Alger), "phone": chiffres uniquement au format international commençant par 213 (0555123456 → 213555123456) ou null, "email": ou null, "scores": {"closer": entier, "coordinateur": entier, "social": entier}, "best": "closer" | "coordinateur" | "social", "cv_summary": une ligne en français, "cv_strengths": 2 à 3 phrases pour le meilleur poste, "cv_risks": 1 à 2 phrases, "cv_questions": 1 à 2 questions d'entretien entre « »}.`;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", instructions, input: [{ role: "user", content: [{ type: "input_text", text: `CV : ${name}. Réponds en json.` }, file] }], text: { format: { type: "json_object" } }, max_output_tokens: 700 }) });
  const j = await r.json().catch(() => null); if (!r.ok) { console.error("[import-zip] IA", r.status, JSON.stringify(j).slice(0, 200)); return null; }
  const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join("");
  try { const o = JSON.parse(txt); const sc = o.scores || {}; const best = (["closer", "coordinateur", "social"] as PosteKey[]).includes(o.best) ? o.best as PosteKey : (Object.keys(sc) as PosteKey[]).sort((a, c) => (sc[c] || 0) - (sc[a] || 0))[0] || _poste; return { ...o, best, cv_score: Number(sc[best]) || 0, scores: sc }; } catch { return null; }
}
const verdict = (sc: number) => sc >= 60 ? "À appeler" : sc >= 45 ? "À revoir" : "Écarter";
const scoresLine = (sc: Record<string, number>) => `Notes : closer ${sc.closer ?? "?"} · coordinateur ${sc.coordinateur ?? "?"} · social ${sc.social ?? "?"}`;

/** Analyse les CV importés sans note (lot de 8) : poste le plus adapté, note, coordonnées ; supprime les doublons d'une personne déjà connue. */
async function rescore(limit = 8) {
  const db = crmDatabase();
  const { data: rows } = await db.from("job_invitations").select("*").is("cv_score", null).not("cv_path", "is", null).order("id").limit(limit);
  const out: Record<string, unknown>[] = [];
  await Promise.all((rows || []).map(async r => {
    if (r.cv_file) { const { data: same } = await db.from("job_invitations").select("id,poste").neq("id", r.id).eq("cv_file", r.cv_file).not("cv_score", "is", null).limit(1); if (same?.length) { await db.from("job_invitations").delete().eq("id", r.id); out.push({ id: r.id, name: r.full_name, status: `doublon supprimé (déjà connu en ${same[0].poste})` }); return; } }
    const { data: blob } = await db.storage.from(BUCKET).download(r.cv_path);
    const ai = blob ? await score(r.poste, r.cv_file || "cv.pdf", new Uint8Array(await blob.arrayBuffer())).catch(() => null) : null;
    if (!ai) { await db.from("job_invitations").update({ cv_score: -1, cv_verdict: "À revoir (CV à lire)" }).eq("id", r.id); out.push({ id: r.id, name: r.full_name, status: "non lisible" }); return; }
    const phone = String(ai.phone || "").replace(/\D/g, "") || r.phone;
    if (phone) {
      const { data: dup } = await db.from("job_invitations").select("id,poste").neq("id", r.id).not("cv_score", "is", null).ilike("phone", `%${t9(phone)}`).limit(1);
      if (dup?.length) { await db.from("job_invitations").delete().eq("id", r.id); out.push({ id: r.id, name: ai.full_name || r.full_name, status: `doublon supprimé (déjà connu en ${dup[0].poste})` }); return; }
    }
    const sc = Math.max(0, Math.min(100, Math.round(ai.cv_score)));
    await db.from("job_invitations").update({ poste: ai.best, full_name: clean(ai.full_name || r.full_name, 120), city: clean(ai.city, 80) || null, phone: phone || null, email: clean(ai.email, 160) || null, cv_score: sc, cv_verdict: verdict(sc), cv_summary: clean(`${ai.cv_summary || ""} (${scoresLine(ai.scores)})`, 400), cv_strengths: clean(ai.cv_strengths), cv_risks: clean(ai.cv_risks), cv_questions: clean(ai.cv_questions) }).eq("id", r.id);
    out.push({ id: r.id, name: ai.full_name, status: "noté", poste: ai.best, score: sc });
  }));
  const { count } = await db.from("job_invitations").select("id", { count: "exact", head: true }).is("cv_score", null).not("cv_path", "is", null);
  return { results: out, remaining: count || 0 };
}

/** Relance de l'analyse par jeton (admin_once_tokens, purpose « cv-rescore », valable jusqu'à expiration). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const { data } = await crmDatabase().from("admin_once_tokens").select("token").eq("token", token).eq("purpose", "cv-rescore").gt("expires_at", new Date().toISOString()).limit(1);
  if (!data?.length) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  return NextResponse.json({ ok: true, ...(await rescore(10)) });
}

/** Import d'un ZIP de CV Emploitic déposé dans le stockage : lit, note et enregistre les CV par lots (code d'accès). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  if (b.action === "init") {
    const path = `imports/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.zip`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
    return NextResponse.json({ ok: true, bucket: BUCKET, path: data.path, token: data.token });
  }
  if (b.action === "rescore") { await applyStoredSecrets(); return NextResponse.json({ ok: true, ...(await rescore(8)) }); }
  if (b.action !== "process" || !isPoste(b.poste) || !/^imports\/[\w.-]+\.zip$/.test(String(b.path))) return NextResponse.json({ ok: false, error: "Paramètres invalides" }, { status: 400 });
  await applyStoredSecrets();
  const poste = b.poste as PosteKey; const offset = Math.max(0, Number(b.offset) || 0);
  const { data: blob, error } = await db.storage.from(BUCKET).download(String(b.path));
  if (error || !blob) return NextResponse.json({ ok: false, error: "ZIP introuvable" }, { status: 404 });
  let files: [string, Uint8Array][];
  try { files = Object.entries(unzipSync(new Uint8Array(await blob.arrayBuffer()))).filter(([n, d]) => !n.endsWith("/") && d.length > 0 && !/(^|\/)(__MACOSX|\.)/.test(n)).sort(([a], [c]) => a.localeCompare(c)); }
  catch { return NextResponse.json({ ok: false, error: "Fichier ZIP illisible" }, { status: 400 }); }
  const { data: existing } = await db.from("job_invitations").select("cv_file,phone");
  const known = new Set((existing || []).map(e => e.cv_file)); const phones = new Set((existing || []).map(e => t9(e.phone)).filter(Boolean));
  const slice = files.slice(offset, offset + BATCH);
  const results = await Promise.all(slice.map(async ([full, data]) => {
    const name = full.split("/").pop()!.slice(0, 120);
    if (known.has(name)) return { name, status: "déjà importé" };
    const ai = await score(poste, name, data).catch(() => null);
    if (ai?.phone && phones.has(t9(ai.phone))) return { name, status: "déjà importé (même téléphone)" };
    const target: PosteKey = ai?.best || poste;
    const path = `cvs/${target}/${name.replace(/[^\w.-]+/g, "_")}`;
    await db.storage.from(BUCKET).upload(path, data, { contentType: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream", upsert: true });
    const sc = Math.max(0, Math.min(100, Math.round(Number(ai?.cv_score) || 0)));
    const row = { poste: target, cv_file: name, cv_path: path, full_name: clean(ai?.full_name || name.replace(/_cv\.\w+$/i, "").replace(/_/g, " "), 120), city: clean(ai?.city, 80) || null, phone: (String(ai?.phone || "").replace(/\D/g, "") || null), email: clean(ai?.email, 160) || null, cv_score: ai ? sc : null, cv_verdict: ai ? verdict(sc) : "À revoir (CV à lire)", cv_summary: ai ? clean(`${ai.cv_summary || ""} (${scoresLine(ai.scores)})`, 400) : "CV non lisible automatiquement : à ouvrir", cv_strengths: clean(ai?.cv_strengths), cv_risks: clean(ai?.cv_risks), cv_questions: clean(ai?.cv_questions) };
    const { data: ins } = await db.from("job_invitations").insert(row).select("id").single();
    return { name, status: "importé", id: ins?.id, full_name: row.full_name, score: row.cv_score, verdict: row.cv_verdict, poste: target };
  }));
  const next = offset + slice.length;
  if (next >= files.length) await db.storage.from(BUCKET).remove([String(b.path)]);
  return NextResponse.json({ ok: true, total: files.length, next, done: next >= files.length, results });
}
