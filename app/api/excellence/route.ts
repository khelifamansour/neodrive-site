import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../lib/brevo";
import { EXCELLENCE_MINUTES, EXCELLENCE_SECONDS, questionsFor } from "../../../lib/excellence";
import { EXCELLENCE_KEY } from "../../../lib/excellence-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://www.easydrive-auto.fr";
const ok = (t: string) => /^[a-f0-9]{32}$/.test(t);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Page candidat : état du test (et questions une fois commencé). */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || ""; if (!ok(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const { data: x } = await crmDatabase().from("excellence_tests").select("full_name,poste,started_at,finished_at,score").eq("token", t).maybeSingle();
  if (!x) return NextResponse.json({ ok: false, error: "Lien invalide." }, { status: 404 });
  return NextResponse.json({ ok: true, name: x.full_name, seconds: EXCELLENCE_SECONDS, count: questionsFor(x.poste).length, started: !!x.started_at, finished: !!x.finished_at });
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
  const score = Math.round((70 * correct / QS.length + 30 * speed / QS.length) * (late ? 0.8 : 1));
  await db.from("excellence_tests").update({ finished_at: new Date().toISOString(), answers, correct, score, duration_sec: dur, late, blur_count: Math.min(999, Number(b.blur) || 0) }).eq("id", x.id);
  await applyStoredSecrets();
  if (brevoReady() && score >= 75) { try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `NeoDrive talent : ${x.full_name} a eu ${score}/100 au test d'excellence (${correct}/${QS.length} en ${Math.round(dur / 60)} min${b.blur ? `, ${b.blur} sortie(s) d'onglet` : ""}).`); } catch { } }
  return NextResponse.json({ ok: true });
}

/** Espace recrutement : créer et envoyer un test (send), ou lister (list). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  if (b.action === "list") { const { data } = await db.from("excellence_tests").select("id,token,poste,application_id,invitation_id,full_name,phone,sent_at,started_at,finished_at,correct,score,duration_sec,blur_count,late").order("created_at", { ascending: false }); return NextResponse.json({ ok: true, tests: data || [] }); }
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
