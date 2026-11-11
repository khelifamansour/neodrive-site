import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../lib/brevo";
import { COMMON, POSTES, WRITING_PROMPT, FRENCH_TEST, LOGIC_TEST, isPoste, type PosteKey } from "../../../lib/hiring";
import { FRENCH_KEY, LOGIC_KEY, RIDDLE_KEY } from "../../../lib/hiring-keys";
import { BAC_SUBJECTS, RIDDLES } from "../../../lib/hiring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "job-applications";
const clean = (v: unknown, max = 3000) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Analyse IA : CV (PDF/image) + réponses → note sur 100, verdict, points forts, risques, questions d'entretien. */
async function evaluate(poste: PosteKey, row: Record<string, any>, cv?: { mime: string; b64: string; name: string }) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const p = POSTES[poste];
  const qa = [...COMMON, ...p.questions].map(q => `Q: ${q.label}\nR: ${row.answers?.[q.id] ?? row[q.id] ?? "—"}`).join("\n\n");
  const content: any[] = [{ type: "input_text", text: `Poste : ${p.title}\nMission : ${p.summary}\nCritères d'évaluation : ${p.rubric}\n\nCandidat : ${row.full_name}, ${row.city || "?"}. Formation : ${row.education || "?"}. Expérience : ${row.experience_years || "?"} ans. Bac : ${row.bac_stream || "?"} ${row.bac_year || ""}, moyenne ${row.bac_average ?? "?"}/20.\nNotes au bac par matière : ${JSON.stringify(row.bac_grades)}. Dernier employeur : ${JSON.stringify(row.last_employer)} (un départ en conflit ou une raison floue est un risque ; un départ en bons termes avec une référence est un bon signe).\nTests corrigés automatiquement : français ${row.test_french}/10, logique ${row.test_logic}/8, énigmes ${row.answers?.riddles_score} en ${row.riddle_sec ?? "?"} s. Durée de remplissage : ${Math.round((row.duration_sec || 0) / 60)} min. Collages de texte détectés : ${row.paste_count || 0}.\n\n${WRITING_PROMPT}\nRédaction du candidat :\n${row.answers?.writing || "—"}\n\nRéponses au questionnaire :\n${qa}\n\nÉvalue ce candidat de façon exigeante et factuelle (le CV éventuel est joint). Pénalise fortement : français approximatif, réponses vagues ou copiées, refus du freelance, du présentiel à Alger ou des horaires. Réponds en JSON : {"score": entier 0-100 (tient compte des tests, de la rédaction et des réponses), "writing": note de la rédaction sur 20 (orthographe, ton professionnel rassurant, solution concrète proposée), "verdict": "à convoquer" | "à revoir" | "à écarter", "summary": "2 phrases", "strengths": "3 points courts", "risks": "3 points courts", "questions": "3 questions précises à poser en entretien"}` }];
  if (cv?.mime === "application/pdf") content.push({ type: "input_file", filename: cv.name || "cv.pdf", file_data: `data:application/pdf;base64,${cv.b64}` });
  else if (cv && /^image\//.test(cv.mime)) content.push({ type: "input_image", image_url: `data:${cv.mime};base64,${cv.b64}` });
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", input: [{ role: "user", content }], text: { format: { type: "json_object" } }, max_output_tokens: 900, store: false }) });
  const j = await r.json().catch(() => null);
  if (!r.ok) { console.error("[CANDIDATURE] IA", r.status, JSON.stringify(j).slice(0, 300)); return null; }
  const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join("");
  try { const o = JSON.parse(txt); return { test_writing: Math.max(0, Math.min(20, Math.round(Number(o.writing) || 0))), ai_score: Math.max(0, Math.min(100, Math.round(Number(o.score) || 0))), ai_verdict: clean(o.verdict, 40), ai_summary: clean(o.summary, 600), ai_strengths: clean(o.strengths, 800), ai_risks: clean(o.risks, 800), ai_questions: clean(o.questions, 1000) }; } catch { return null; }
}

/** Dépôt d'une candidature (formulaire public multipart). */
export async function POST(req: Request) {
  await applyStoredSecrets();
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "Formulaire invalide." }, { status: 400 });
  if (clean(fd.get("website"))) return NextResponse.json({ ok: true });
  const poste = clean(fd.get("poste"), 20);
  if (!isPoste(poste)) return NextResponse.json({ ok: false, error: "Poste inconnu." }, { status: 400 });
  const questions = [...COMMON, ...POSTES[poste].questions];
  const answers: Record<string, string> = {};
  for (const q of questions) { answers[q.id] = clean(fd.get(q.id)); if (q.required && !answers[q.id]) return NextResponse.json({ ok: false, error: `Merci de répondre : « ${q.label.slice(0, 60)}… »` }, { status: 400 }); }
  const row: Record<string, any> = {
    poste, full_name: clean(fd.get("full_name"), 120), email: clean(fd.get("email"), 160), phone: clean(fd.get("phone"), 40), city: clean(fd.get("city"), 80),
    education: clean(fd.get("education"), 300), experience_years: clean(fd.get("experience_years"), 20),
    freelance_ok: answers.freelance_ok, billing_structure: answers.billing_structure, availability: answers.availability, salary_expectation: answers.salary_expectation, answers,
  };
  const score = (tests: { id: string }[], key: Record<string, string>) => tests.reduce((n, q) => n + (clean(fd.get(q.id), 200) === key[q.id] ? 1 : 0), 0);
  for (const q of [...FRENCH_TEST, ...LOGIC_TEST]) answers[q.id] = clean(fd.get(q.id), 200);
  answers.writing = clean(fd.get("writing"), 4000);
  if (answers.writing.length < 150) return NextResponse.json({ ok: false, error: "La rédaction est trop courte (8 à 12 lignes demandées)." }, { status: 400 });
  row.test_french = score(FRENCH_TEST, FRENCH_KEY); row.test_logic = score(LOGIC_TEST, LOGIC_KEY);
  row.bac_stream = clean(fd.get("bac_stream"), 80); row.bac_year = clean(fd.get("bac_year"), 10);
  const avg = Number(String(fd.get("bac_average") || "").replace(",", ".")); row.bac_average = Number.isFinite(avg) && avg > 0 && avg <= 20 ? avg : null;
  const started = Number(fd.get("started_at")); row.duration_sec = started > 0 ? Math.max(0, Math.round((Date.now() - started) / 1000)) : null;
  row.paste_count = Math.min(999, Number(fd.get("paste_count")) || 0);
  const grade = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 20 ? n : null; };
  row.bac_grades = Object.fromEntries([...BAC_SUBJECTS.map(([id, l]) => [l, grade(fd.get(id))]), [clean(fd.get("bac_main_subject"), 60) || "Matière principale", grade(fd.get("bac_main_grade"))]]);
  for (const r of RIDDLES) answers[r.id] = clean(fd.get(r.id), 40);
  const riddles = RIDDLES.filter(r => answers[r.id].replace(/\D/g, "") === RIDDLE_KEY[r.id]).length;
  row.riddle_ok = riddles === RIDDLES.length; answers.riddles_score = `${riddles}/${RIDDLES.length}`;
  row.riddle_sec = Math.min(36000, Number(fd.get("riddle_sec")) || 0) || null;
  row.last_employer = { entreprise: clean(fd.get("emp_company"), 120), poste: clean(fd.get("emp_role"), 120), dates: clean(fd.get("emp_dates"), 60), depart: clean(fd.get("emp_departure"), 60), raison: clean(fd.get("emp_reason"), 1500), reference: clean(fd.get("ref_name"), 120), reference_tel: clean(fd.get("ref_phone"), 40), accord_contact: fd.get("ref_consent") === "oui" };
  if (!row.full_name || !row.phone) return NextResponse.json({ ok: false, error: "Nom et téléphone obligatoires." }, { status: 400 });
  const db = crmDatabase();
  let cv: { mime: string; b64: string; name: string } | undefined;
  const file = fd.get("cv");
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ ok: false, error: "CV trop lourd (8 Mo maximum)." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `${poste}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream" });
    if (!up.error) { row.cv_path = path; row.cv_name = file.name.slice(0, 120); }
    cv = { mime: file.type, b64: buf.toString("base64"), name: file.name };
  }
  const { data, error } = await db.from("job_applications").insert(row).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "Enregistrement impossible, réessayez." }, { status: 502 });
  const ai = await evaluate(poste, row, cv).catch(() => null);
  if (ai) await db.from("job_applications").update({ ...ai, status: ai.ai_verdict === "à écarter" ? "écarté (IA)" : ai.ai_verdict === "à convoquer" && ai.ai_score >= 70 ? "à appeler" : "nouveau" }).eq("id", data.id);
  if (brevoReady() && ai && ai.ai_score >= 70) {
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Bon candidat ${POSTES[poste].short} : ${row.full_name} (${ai.ai_score}/100)`, `<p><b>${esc(row.full_name)}</b> – ${esc(row.city)} – ${esc(row.phone)}</p><p>${esc(ai.ai_summary)}</p><p>Points forts : ${esc(ai.ai_strengths)}</p><p>Risques : ${esc(ai.ai_risks)}</p><p>Tests : français ${row.test_french}/10 · logique ${row.test_logic}/8 · rédaction ${ai.test_writing}/20 · bac ${row.bac_average ?? "?"}/20</p><p>Voir tous les candidats : https://www.easydrive-auto.fr/recrutement-admin</p>`); } catch (e) { console.error("[CANDIDATURE] email", e); }
  }
  return NextResponse.json({ ok: true, id: data.id });
}

/** Espace de tri (code d'accès NeoDrive). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  if (b.action === "list") {
    const { data, error } = await db.from("job_applications").select("*").order("ai_score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data });
  }
  if (b.action === "cv" && b.path) {
    const { data } = await db.storage.from(BUCKET).createSignedUrl(String(b.path), 600);
    return NextResponse.json({ ok: !!data, url: data?.signedUrl });
  }
  if (b.action === "update" && b.id) {
    const patch: Record<string, string> = {}; for (const k of ["status", "notes"]) if (k in (b.patch || {})) patch[k] = clean(b.patch[k], 2000);
    await db.from("job_applications").update(patch).eq("id", b.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
