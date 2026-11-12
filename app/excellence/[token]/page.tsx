"use client";
import { use, useEffect, useRef, useState } from "react";

type Q = { id: string; theme: string; q: string; options: string[] };
const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#111", lineHeight: 1.55 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e2da", borderRadius: 16, padding: 18, margin: "12px 0" };

export default function Excellence({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<{ name?: string; seconds?: number; count?: number; started?: boolean; finished?: boolean } | null>(null);
  const [qs, setQs] = useState<Q[] | null>(null); const [i, setI] = useState(0); const [left, setLeft] = useState(40);
  const [err, setErr] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const answers = useRef<Record<string, { a: number; t: number }>>({}); const qStart = useRef(0); const blur = useRef(0); const sent = useRef(false);
  const secs = info?.seconds || 40;

  useEffect(() => { fetch(`/api/excellence?t=${token}`).then(r => r.json()).then(j => { if (!j.ok) setErr(j.error || "Lien invalide."); else { setInfo(j); if (j.finished) setDone(true); else if (j.started) setErr("Ce test a déjà été commencé : une seule tentative est possible. Contactez NeoDrive en cas de problème technique."); } }).catch(() => setErr("Connexion impossible.")); }, [token]);
  useEffect(() => { const f = () => { if (document.hidden && qs && !done) blur.current += 1; }; document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, [qs, done]);

  const submit = async () => {
    if (sent.current) return; sent.current = true; setBusy(true);
    const r = await fetch("/api/excellence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action: "submit", answers: answers.current, blur: blur.current }) }).catch(() => null);
    const j = await r?.json().catch(() => null); setBusy(false);
    if (j?.ok) setDone(true); else { sent.current = false; setErr("Envoi impossible : vérifiez votre connexion puis appuyez sur « Réessayer l'envoi »."); }
  };
  const next = (choice: number | null) => {
    if (!qs) return; const q = qs[i];
    if (choice !== null) answers.current[q.id] = { a: choice, t: Math.round((Date.now() - qStart.current) / 100) / 10 };
    if (i + 1 >= qs.length) { setQs(null); submit(); return; }
    setI(i + 1); qStart.current = Date.now(); setLeft(secs);
  };
  // Compte à rebours par question : à 0, on passe à la suivante sans réponse.
  useEffect(() => {
    if (!qs) return;
    const it = setInterval(() => { const s = Math.max(0, secs - Math.floor((Date.now() - qStart.current) / 1000)); setLeft(s); if (s <= 0) { clearInterval(it); next(null); } }, 250);
    return () => clearInterval(it);
  }, [qs, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    const r = await fetch("/api/excellence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action: "start" }) }).catch(() => null);
    const j = await r?.json().catch(() => null); if (!j?.ok) { setErr(j?.error || "Impossible de démarrer."); return; }
    qStart.current = Date.now(); setLeft(secs); setI(0); setQs(j.questions);
  };

  const q = qs?.[i];
  return <main style={{ background: "#f7f4ef", minHeight: "100vh" }}><div style={wrap}>
    <div style={{ fontWeight: 900, fontSize: 22 }}>NeoDrive</div>
    {err ? <p style={{ color: "#b91c1c" }}>{err}</p> : null}
    {done ? <section style={card}><h1 style={{ fontSize: 22 }}>✅ Merci, votre test est enregistré.</h1><p>Nous revenons vers vous très vite pour la suite de la sélection.</p></section>
    : busy || (sent.current && !done) ? <section style={card}><p>{busy ? "Envoi de vos réponses…" : ""}</p>{!busy ? <button onClick={submit} style={{ padding: 12, borderRadius: 10, border: 0, background: "#111", color: "#fff", fontWeight: 800 }}>Réessayer l'envoi</button> : null}</section>
    : !info || err ? (info || err ? null : <p>Chargement…</p>)
    : !q ? <section style={card}>
      <h1 style={{ fontSize: 24, lineHeight: 1.2 }}>Test d'excellence</h1>
      <p>Bonjour {info.name?.split(" ")[0]}, félicitations : vous faites partie des meilleurs candidats. Ce test est volontairement difficile.</p>
      <ul>
        <li><b>{info.count} questions</b> : raisonnement, calcul mental, logique, français, puis des questions sur votre futur métier.</li>
        <li><b>{secs} secondes par question</b>, une question à la fois. À la fin du temps, on passe automatiquement à la suivante. <b>Impossible de revenir en arrière.</b></li>
        <li>La note tient compte de vos bonnes réponses <b>et de votre rapidité</b>.</li>
        <li>À faire <b>seul(e), sans calculatrice, sans aide ni outil d'IA</b>. Les sorties de la page sont enregistrées.</li>
        <li><b>Une seule tentative</b> : installez-vous au calme, avec une bonne connexion, avant de commencer.</li>
      </ul>
      <button onClick={start} style={{ width: "100%", padding: 14, borderRadius: 12, border: 0, background: "#f05a28", color: "#fff", fontWeight: 800, fontSize: 16 }}>Commencer le test</button>
    </section>
    : <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginBottom: 6 }}><span>Question {i + 1}/{qs!.length} · {q.theme}</span><span style={{ color: left <= 10 ? "#b91c1c" : "#111" }}>⏱ {left} s</span></div>
      <div style={{ height: 6, background: "#eee", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}><div style={{ height: "100%", width: `${left / secs * 100}%`, background: left <= 10 ? "#dc2626" : "#f05a28", transition: "width .25s linear" }} /></div>
      <p style={{ fontWeight: 700, fontSize: 17, margin: "0 0 12px" }}>{q.q}</p>
      <div style={{ display: "grid", gap: 8 }}>{q.options.map((o, k) => <button key={k} onClick={() => next(k)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: "1px solid #d4d7db", background: "#fff", font: "inherit", cursor: "pointer" }}>{o}</button>)}</div>
    </section>}
  </div></main>;
}
