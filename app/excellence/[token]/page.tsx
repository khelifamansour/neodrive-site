"use client";
import { use, useEffect, useRef, useState } from "react";

type Q = { id: string; theme: string; q: string; options: string[] };
const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#111", lineHeight: 1.55 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e2da", borderRadius: 16, padding: 16, margin: "12px 0" };

export default function Excellence({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<{ name?: string; minutes?: number; count?: number; finished?: boolean; started_at?: string } | null>(null);
  const [qs, setQs] = useState<Q[] | null>(null); const [ans, setAns] = useState<Record<string, number>>({}); const [left, setLeft] = useState(0); const [err, setErr] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const blur = useRef(0); const sent = useRef(false); const ansRef = useRef(ans); ansRef.current = ans;
  useEffect(() => { fetch(`/api/excellence?t=${token}`).then(r => r.json()).then(j => { if (!j.ok) setErr(j.error || "Lien invalide."); else { setInfo(j); if (j.finished) setDone(true); if (j.questions) { setQs(j.questions); tick(j.started_at, j.minutes); } } }).catch(() => setErr("Connexion impossible.")); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => { if (document.hidden && qs && !done) blur.current += 1; }; document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, [qs, done]);
  const submit = async () => { if (sent.current) return; sent.current = true; setBusy(true); const r = await fetch("/api/excellence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action: "submit", answers: ansRef.current, blur: blur.current }) }).catch(() => null); const j = await r?.json().catch(() => null); setBusy(false); if (j?.ok) setDone(true); else { sent.current = false; setErr("Envoi impossible : vérifiez votre connexion et appuyez de nouveau sur « Terminer »."); } };
  const tick = (start: string, minutes: number) => { const end = new Date(start).getTime() + minutes * 60000; const it = setInterval(() => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); setLeft(s); if (s <= 0) { clearInterval(it); submit(); } }, 500); };
  const start = async () => { const r = await fetch("/api/excellence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action: "start" }) }).catch(() => null); const j = await r?.json().catch(() => null); if (!j?.ok) { setErr(j?.error || "Impossible de démarrer."); return; } setQs(j.questions); tick(j.started_at, info?.minutes || 12); };

  return <main style={{ background: "#f7f4ef", minHeight: "100vh" }}><div style={wrap}>
    <div style={{ fontWeight: 900, fontSize: 22 }}>NeoDrive</div>
    {err ? <p style={{ color: "#b91c1c" }}>{err}</p> : null}
    {done ? <section style={card}><h1 style={{ fontSize: 22 }}>✅ Merci, votre test est enregistré.</h1><p>Nous revenons vers vous très vite pour la suite de la sélection.</p></section>
    : !info ? (err ? null : <p>Chargement…</p>)
    : !qs ? <section style={card}>
      <h1 style={{ fontSize: 24, lineHeight: 1.2 }}>Test d'excellence</h1>
      <p>Bonjour {info.name?.split(" ")[0]}, félicitations : vous êtes parmi les meilleurs candidats. Voici l'étape suivante.</p>
      <ul><li><b>{info.count} questions</b> : raisonnement, calcul, logique, français et jugement.</li><li><b>{info.minutes} minutes</b> au total. Le chronomètre démarre dès que vous cliquez sur « Commencer » et le test s'envoie tout seul à la fin.</li><li>À faire <b>seul(e), en une seule fois, sans calculatrice, sans aide ni outil d'IA</b>. Les sorties de la page sont enregistrées.</li><li>Une seule tentative : installez-vous au calme avant de commencer.</li></ul>
      <button onClick={start} style={{ width: "100%", padding: 14, borderRadius: 12, border: 0, background: "#f05a28", color: "#fff", fontWeight: 800, fontSize: 16 }}>Commencer le test</button>
    </section>
    : <>
      <div style={{ position: "sticky", top: 0, background: "#f7f4ef", padding: "8px 0", zIndex: 5, display: "flex", justifyContent: "space-between", fontWeight: 800 }}><span>{Object.keys(ans).length}/{qs.length} répondues</span><span style={{ color: left < 120 ? "#b91c1c" : "#111" }}>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span></div>
      {qs.map((q, i) => <section key={q.id} style={card}><small style={{ color: "#6b7280" }}>{i + 1}. {q.theme}</small><p style={{ fontWeight: 700, margin: "4px 0 8px" }}>{q.q}</p>
        {q.options.map((o, k) => <label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 4px" }}><input type="radio" name={q.id} checked={ans[q.id] === k} onChange={() => setAns(a => ({ ...a, [q.id]: k }))} style={{ marginTop: 5 }} /><span>{o}</span></label>)}</section>)}
      <button disabled={busy} onClick={submit} style={{ width: "100%", padding: 14, borderRadius: 12, border: 0, background: "#111", color: "#fff", fontWeight: 800, fontSize: 16 }}>{busy ? "Envoi…" : "Terminer et envoyer"}</button>
    </>}
  </div></main>;
}
