import { NextResponse } from "next/server";
import { isPoste } from "../../../../lib/hiring";
import { advanceTimeouts, answer, findByPhone, loadSession, newState, phoneTail, publicView, saveSession, startRiddles, submitRiddles } from "../../../../lib/recruit-test";

export const dynamic = "force-dynamic";
const no = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });

/**
 * Test de la candidature, une question à la fois (la bonne réponse ne quitte jamais le serveur).
 * Actions : start (démarrer ou reprendre), answer, riddles_start, riddles_submit.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const action = String(b.action || "");
  let loaded = b.sid ? await loadSession(b.sid) : null;

  if (action === "start") {
    if (!loaded) {
      const phone = String(b.phone || "").slice(0, 40); const name = String(b.name || "").replace(/[<>]/g, "").trim();
      if (phoneTail(phone).length < 8) return no("Indiquez d'abord votre numéro de téléphone (en haut du formulaire), puis démarrez le test.");
      if (name.length < 3) return no("Indiquez d'abord votre nom et prénom (en haut du formulaire), puis démarrez le test.");
      // Nouveau départ depuis un autre navigateur ou appareil : on reprend le premier tirage de ce numéro.
      const prev = await findByPhone(phone);
      if (prev) { prev.state.otherDevice = true; loaded = prev; }
      else {
        const poste = String(b.poste || ""); const s = newState(phone, name, isPoste(poste) ? poste : "");
        advanceTimeouts(s);
        const sid = await saveSession(null, s);
        return NextResponse.json({ ok: true, sid, ...publicView(s) }, { headers: { "cache-control": "no-store" } });
      }
    }
    loaded.state.restarts = Math.min(99, (loaded.state.restarts || 0) + 1);
  } else if (!loaded) return no("Test introuvable : rechargez la page et redémarrez le test.", 404);

  const s = loaded.state;
  if (action === "answer") answer(s, String(b.qid || ""), b.pick == null ? null : Number(b.pick), Number(b.hidden) || 0);
  else if (action === "riddles_start") startRiddles(s);
  else if (action === "riddles_submit") { if (s.riddleShownAt && !s.riddleAnswers) s.hidden = Math.min(999, s.hidden + Math.max(0, Math.min(99, Math.round(Number(b.hidden) || 0)))); submitRiddles(s, b.values); }
  else if (action !== "start") return no("Action inconnue.");
  advanceTimeouts(s);
  const sid = await saveSession(loaded.sid, s);
  return NextResponse.json({ ok: true, sid, ...publicView(s) }, { headers: { "cache-control": "no-store" } });
}
