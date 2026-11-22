"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "../devenir-partenaire/partenaire.module.css";

/** Ce que le serveur renvoie (jamais la bonne réponse). */
type Question = { qid: string; section: string; n: number; of: number; index: number; q: string; options: string[]; seconds: number; remaining: number };
type View = { ok: boolean; error?: string; sid: string; total: number; scenario: string; restarted: boolean; done: boolean; question?: Question; riddles?: { n: number; q: string }[] | null; riddlesStarted?: boolean; riddlesDone?: boolean; riddleElapsed?: number };
export type TestInfo = { sid: string; scenario: string; complete: boolean };

const KEY = "nd_cand_test_sid";
const box: React.CSSProperties = { border: "2px solid #f97316", borderRadius: 14, padding: 14, background: "#fff7ed" };

/**
 * Test de français et de logique (une question à la fois, chronométrée, sans retour) puis énigmes.
 * Les questions sont tirées et corrigées par le serveur (/api/candidatures/test).
 */
export default function RecruitTest({ identity, onInfo, onPaste }: { identity: () => { phone: string; name: string; poste: string }; onInfo: (i: TestInfo) => void; onPaste?: () => void }) {
  const [view, setView] = useState<View | null>(null);
  const [stored, setStored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [riddleVals, setRiddleVals] = useState<string[]>([]);
  const [rSec, setRSec] = useState(0);
  const deadline = useRef(0); const sent = useRef(""); const hid = useRef(0); const hidSent = useRef(0); const lastHide = useRef(0);
  const retry = useRef<null | (() => void)>(null);
  const qBox = useRef<HTMLDivElement>(null);
  const qid = view?.question?.qid;
  // Nouvelle question : on la remet en haut de l'écran si elle est passée sous l'en-tête du site.
  useEffect(() => { const r = qBox.current?.getBoundingClientRect(); if (qid && r && (r.top < 80 || r.top > window.innerHeight * 0.6)) window.scrollBy({ top: r.top - 90 }); }, [qid]);

  useEffect(() => { try { setStored(!!localStorage.getItem(KEY)); } catch { } }, []);
  const running = !!view && !(view.done && view.riddlesDone);
  // Sorties de la page pendant le test (changement d'onglet, d'application, écran verrouillé).
  useEffect(() => {
    if (!running) return;
    const hit = () => { const t = Date.now(); if (t - lastHide.current > 1500) { hid.current++; lastHide.current = t; } };
    const vis = () => { if (document.visibilityState === "hidden") hit(); };
    document.addEventListener("visibilitychange", vis); window.addEventListener("blur", hit);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", hit); };
  }, [running]);

  const call = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true); setErr(""); retry.current = null;
    let r: Response | null = null;
    for (let i = 0; i < 3 && !r; i++) { r = await fetch("/api/candidatures/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" }).catch(() => null); if (!r && i < 2) await new Promise(res => setTimeout(res, 1200)); }
    const j = (await r?.json().catch(() => null)) as View | null;
    setBusy(false);
    if (!j?.ok) {
      if (r?.status === 404) { try { localStorage.removeItem(KEY); } catch { } setStored(false); setView(null); }
      setErr(j?.error || "Connexion interrompue : vérifiez votre réseau puis réessayez."); if (!j) retry.current = () => call(body); return;
    }
    try { localStorage.setItem(KEY, j.sid); } catch { }
    setView(j); setPick(null);
    if (j.question) { deadline.current = Date.now() + j.question.remaining * 1000; setLeft(j.question.remaining); }
    if (j.riddles) setRiddleVals(v => v.length === j.riddles!.length ? v : j.riddles!.map(() => ""));
    onInfo({ sid: j.sid, scenario: j.scenario, complete: !!(j.done && j.riddlesDone) });
  }, [onInfo]);

  const start = () => { const id = identity(); let sid = ""; try { sid = localStorage.getItem(KEY) || ""; } catch { } call({ action: "start", sid: sid || undefined, ...id }); };
  const send = useCallback((p: number | null) => {
    if (!view?.question || sent.current === view.question.qid) return;
    sent.current = view.question.qid; const delta = hid.current - hidSent.current; hidSent.current = hid.current;
    call({ action: "answer", sid: view.sid, qid: view.question.qid, pick: p, hidden: delta });
  }, [view, call]);

  // Compte à rebours : à zéro, la question compte comme fausse et la suivante est révélée.
  useEffect(() => {
    if (!view?.question) return;
    const t = setInterval(() => { const l = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setLeft(l); if (l <= 0) send(null); }, 250);
    return () => clearInterval(t);
  }, [view, send]);
  // Chronomètre des énigmes.
  useEffect(() => {
    if (!view?.riddlesStarted || view.riddlesDone) return;
    const t0 = Date.now() - (view.riddleElapsed || 0) * 1000;
    const t = setInterval(() => setRSec(Math.round((Date.now() - t0) / 1000)), 1000); return () => clearInterval(t);
  }, [view]);

  const errBox = err ? <p className={s.err} style={{ margin: "8px 0" }}>{err} {retry.current ? <button type="button" className={s.primary} style={{ padding: "8px 14px", fontSize: 14 }} onClick={() => retry.current?.()}>Réessayer</button> : null}</p> : null;

  if (!view) return <div className={s.full} style={box}>
    <p style={{ margin: "0 0 8px", lineHeight: 1.5 }}><b>Test de français (10 questions, 45 s chacune) puis de logique (8 questions, 60 s chacune), puis 3 énigmes.</b><br />
      Les questions s&apos;affichent une par une, sans retour en arrière. Une question non validée à temps compte comme fausse. Les questions sont différentes pour chaque candidat. Restez sur cette page pendant tout le test : les sorties de la page sont enregistrées. Le test ne peut être passé qu&apos;une seule fois.</p>
    {errBox}
    <button type="button" className={s.primary} disabled={busy} onClick={start}>{busy ? "Chargement…" : stored ? "Reprendre le test" : "Démarrer le test"}</button>
  </div>;

  if (!view.done && view.question) { const q = view.question; const pct = Math.max(0, Math.min(100, left / q.seconds * 100));
    return <div ref={qBox} className={s.full} style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontWeight: 900 }}><span>{q.section} · question {q.n}/{q.of}</span><span style={{ color: left <= 10 ? "#b91c1c" : undefined, fontVariantNumeric: "tabular-nums" }}>⏱ {left} s</span></div>
      <div style={{ height: 6, background: "#fed7aa", borderRadius: 99, margin: "8px 0 12px", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: left <= 10 ? "#dc2626" : "#f97316", transition: "width .25s linear" }} /></div>
      <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 16, lineHeight: 1.4, userSelect: "none" }} onCopy={e => e.preventDefault()}>{q.q}</p>
      <div style={{ display: "grid", gap: 8 }}>{q.options.map((o, i) => <button key={i} type="button" disabled={busy} onClick={() => setPick(i)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: pick === i ? "2px solid #f97316" : "1px solid #e7e5e4", background: pick === i ? "#ffedd5" : "#fff", fontSize: 15, fontWeight: pick === i ? 800 : 500, color: "#111", cursor: "pointer", userSelect: "none" }}>{o}</button>)}</div>
      {errBox}
      <button type="button" className={s.primary} style={{ marginTop: 12, width: "100%" }} disabled={busy || pick == null} onClick={() => send(pick)}>{busy ? "Envoi…" : q.index === view.total ? "Valider et terminer" : "Valider et passer à la suivante"}</button>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, opacity: .75 }}>Question {q.index} sur {view.total}. Pas de retour en arrière.</p>
    </div>; }

  // QCM terminé : énigmes.
  return <div className={s.full} style={box}>
    <p style={{ margin: "0 0 8px", fontWeight: 900 }}>✅ Test de français et de logique terminé.</p>
    {!view.riddlesStarted ? <><p style={{ margin: "0 0 8px" }}><b>Énigmes chronométrées</b> : 3 énigmes, répondez par un nombre.</p>{errBox}<button type="button" className={s.primary} disabled={busy} onClick={() => call({ action: "riddles_start", sid: view.sid })}>Démarrer les énigmes (chronomètre)</button></>
      : view.riddlesDone ? <p style={{ margin: 0 }}>✅ Énigmes terminées ({Math.floor((view.riddleElapsed || 0) / 60)} min {String((view.riddleElapsed || 0) % 60).padStart(2, "0")} s). Vous pouvez continuer le formulaire.</p>
      : <>
        <p style={{ margin: "0 0 8px", fontWeight: 900 }}>⏱ {Math.floor(rSec / 60)} min {String(rSec % 60).padStart(2, "0")} s</p>
        {(view.riddles || []).map(r => <label key={r.n} style={{ marginBottom: 10 }}>{r.q} *<input value={riddleVals[r.n] || ""} inputMode="numeric" onPaste={e => { e.preventDefault(); onPaste?.(); }} onChange={e => { const v = e.target.value.slice(0, 40); setRiddleVals(a => a.map((x, k) => k === r.n ? v : x)); }} /></label>)}
        {errBox}
        <button type="button" className={s.primary} disabled={busy} onClick={() => { if (riddleVals.some(v => !v.trim())) { setErr("Répondez aux 3 énigmes (un nombre pour chacune)."); return; } const delta = hid.current - hidSent.current; hidSent.current = hid.current; call({ action: "riddles_submit", sid: view.sid, values: riddleVals, hidden: delta }); }}>J&apos;ai terminé les énigmes</button>
      </>}
  </div>;
}
