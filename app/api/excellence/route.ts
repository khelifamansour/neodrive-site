import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { applyStoredSecrets } from "../../../lib/integrations";
import { authorizeSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../lib/brevo";
import { EXCELLENCE_MINUTES, EXCELLENCE_SECONDS, REASONING, questionsFor } from "../../../lib/excellence";
import { EXCELLENCE_KEY } from "../../../lib/excellence-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://www.easydrive-auto.fr";
const ok = (t: string) => /^[a-f0-9]{32}$/.test(t);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


/** Correction IA du problème des 8 pommes : justesse et exhaustivité (60), clarté et structure (25), français (15). */
async function gradeReasoning(text: string) {
  const key = process.env.OPENAI_API_KEY; if (!key || text.trim().length < 20) return { score: 0, feedback: text.trim() ? "Réponse trop courte." : "Pas de réponse." };
  const instructions = `Tu corriges la réponse d'un candidat au problème suivant : « ${REASONING.text} ». Solution de référence : 1re pesée, 3 pommes contre 3 (2 restent de côté). Si équilibre, la légère est parmi les 2 restantes : 2e pesée, 1 contre 1, la plus légère monte. Si déséquilibre, la légère est parmi les 3 du plateau qui monte : 2e pesée, 1 contre 1 parmi ces 3 ; si équilibre, c'est la 3e pomme gardée en main, sinon c'est celle qui monte. Barème sur 100 : justesse et exhaustivité de la méthode, tous les cas traités (60) ; clarté, logique et structure de l'explication (25) ; qualité du français écrit (15). Une méthode fausse ou qui ne garantit pas le résultat en 2 pesées ne peut pas dépasser 35. Sois exigeant. Réponds en json : {"score": entier, "feedback": "2 phrases en français pour le recruteur"}.`;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", instructions, input: `Réponse du candidat (réponds en json) :\n${text.slice(0, 4000)}`, text: { format: { type: "json_object" } }, max_output_tokens: 300 }) }).catch(() => null);
  const j = await r?.json().catch(() => null);
  try { const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join(""); const o = JSON.parse(txt); return { score: Math.max(0, Math.min(100, Math.round(Number(o.score) || 0))), feedback: String(o.feedback || "").slice(0, 600) }; } catch { return { score: null as number | null, feedback: "Correction automatique indisponible : à lire." }; }
}

/** Page candidat : état du test (et questions une fois commencé). */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || ""; if (!ok(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const { data: x } = await crmDatabase().from("excellence_tests").select("full_name,poste,started_at,finished_at,score").eq("token", t).maybeSingle();
  if (!x) return NextResponse.json({ ok: false, error: "Lien invalide." }, { status: 404 });
  return NextResponse.json({ ok: true, name: x.full_name, seconds: EXCELLENCE_SECONDS, reasoning: REASONING, count: questionsFor(x.poste).length, started: !!x.started_at, finished: !!x.finished_at });
}

/** Page candidat : démarrer (action start) ou rendre ses réponses (action submit). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>; const t = String(b.t || ""); if (!ok(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const db = crmDatabase(); const { data: x } = await db.from("excellence_tests").select("*").eq("token", t).maybeSingle();
  if (!x) return NextResponse.json({ ok: false, error: "Lien invalide." }, { status: 404 });
  if (x.finished_at) return NextResponse.json({ ok: false, error: "Test déjà terminé." }, { status: 409 });
  const QS = questionsFor(x.poste);
  if (b.action === "start") { if (x.started_at) return NextResponse.json({ ok: false, error: "Le test a déjà été commencé : une seule tentative est possible." }, { status: 409 }); await db.from("excellence_tests").update({ started_at: new Date().toISOString() }).eq("id", x.id); return NextResponse.json({ ok: true, questions: QS }); }
  if (b.action !== "submit" || !x.started_at) return NextResponse.json({ ok: false }, { status: 400 });
  // Réponses : { id: { a: index, t: secondes } }. Note = 70 % justesse + 30 % rapidité sur les bonnes réponses.
  const answers = (b.answers || {}) as Record<string, { a: number; t: number }>;
  const good = QS.filter(q => answers[q.id] && Number(answers[q.id].a) === EXCELLENCE_KEY[q.id]);
  const correct = good.length;
  const speed = good.reduce((sum, q) => sum + Math.max(0, 1 - Math.min(EXCELLENCE_SECONDS, Math.max(0, Number(answers[q.id].t) || EXCELLENCE_SECONDS)) / EXCELLENCE_SECONDS), 0);
  const dur = Math.round((Date.now() - new Date(x.started_at).getTime()) / 1000); const late = dur > QS.length * EXCELLENCE_SECONDS + 90;
  const qcm = Math.round((70 * correct / QS.length + 30 * speed / QS.length) * (late ? 0.8 : 1));
  await applyStoredSecrets();
  const rText = String(b.reasoning || "").slice(0, 6000); const rPaste = Math.min(999, Number(b.reasoning_paste) || 0);
  const g = await gradeReasoning(rText);
  const rScore = g.score == null ? null : Math.max(0, g.score - Math.min(30, rPaste * 15));
  // Note finale : 75 % QCM (justesse + rapidité) + 25 % problème rédigé.
  const score = Math.round(rScore == null ? qcm : qcm * 0.75 + rScore * 0.25);
  await db.from("excellence_tests").update({ finished_at: new Date().toISOString(), answers, correct, qcm_score: qcm, score, duration_sec: dur, late, blur_count: Math.min(999, Number(b.blur) || 0), reasoning_text: rText, reasoning_sec: Math.min(36000, Number(b.reasoning_sec) || 0) || null, reasoning_paste: rPaste, reasoning_score: rScore, reasoning_feedback: g.feedback }).eq("id", x.id);
  if (brevoReady() && score >= 75) { try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `NeoDrive talent : ${x.full_name} a eu ${score}/100 au test d'excellence (QCM ${correct}/${QS.length}, problème ${rScore ?? "?"}/100, en ${Math.round(dur / 60)} min${b.blur ? `, ${b.blur} sortie(s) d'onglet` : ""}).`); } catch { } }
  return NextResponse.json({ ok: true });
}

/** Espace recrutement : créer et envoyer un test (send), ou lister (list). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!(await authorizeSection(req, b.passcode, "recrutement"))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  if (b.action === "list") { const { data } = await db.from("excellence_tests").select("id,token,poste,application_id,invitation_id,full_name,phone,sent_at,started_at,finished_at,correct,score,qcm_score,duration_sec,blur_count,late,reasoning_text,reasoning_sec,reasoning_paste,reasoning_score,reasoning_feedback").order("created_at", { ascending: false }); return NextResponse.json({ ok: true, tests: data || [] }); }
  if (b.action === "send") {
    await applyStoredSecrets();
    const { data: prev } = await db.from("excellence_tests").select("*").eq("application_id", Number(b.application_id) || -1).maybeSingle();
    const row = prev || (await db.from("excellence_tests").insert({ token: randomBytes(16).toString("hex"), poste: String(b.poste || "").slice(0, 20), application_id: Number(b.application_id) || null, invitation_id: Number(b.invitation_id) || null, full_name: String(b.full_name || "").slice(0, 120), phone: String(b.phone || "").slice(0, 30), email: String(b.email || "").slice(0, 160) || null }).select("*").single()).data;
    if (!row) return NextResponse.json({ ok: false, error: "Création impossible" }, { status: 500 });
    const link = `${SITE}/excellence/${row.token}`; const first = String(row.full_name).split(" ")[0]; const via: string[] = [];
    if (b.channels !== "whatsapp" && brevoReady()) {
      if (row.phone) { try { await sendSms("+" + String(row.phone).replace(/\D/g, "").replace(/^0/, "213"), `Bonjour ${first}, felicitations : vous passez a l'etape suivante NeoDrive. Test d'excellence de ${EXCELLENCE_MINUTES} min, a faire seul, en une fois : ${link.replace("https://www.", "")} Mansour - NeoDrive`); via.push("sms"); } catch { } }
      if (row.email) { try { await sendEmail(row.email, row.full_name, "NeoDrive – étape suivante : test d'excellence", `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><p>Bonjour ${esc(first)},</p><p>Félicitations : vos résultats vous qualifient pour l'étape suivante de notre sélection.</p><p>Il s'agit d'un <b>test d'excellence de ${EXCELLENCE_MINUTES} minutes</b> (questions de raisonnement, de calcul, de français et de votre futur métier, 40 secondes par question), à faire <b>seul(e), en une seule fois, sans aide ni outil</b>. Le chronomètre démarre quand vous cliquez sur « Commencer ».</p><p><a href="${link}" style="display:inline-block;background:#f05a28;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Passer le test</a></p><p>Cordialement,<br>Mansour Khelifa – NeoDrive</p></div>`); via.push("e-mail"); } catch { } }
    }
    await db.from("excellence_tests").update({ sent_at: new Date().toISOString() }).eq("id", row.id);
    return NextResponse.json({ ok: true, link, via, token: row.token });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
