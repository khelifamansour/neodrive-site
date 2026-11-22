"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ARGUMENTAIRE, MODULES, PASS_MARK, type Module } from "../../lib/academy";

/* NeoDrive Academy : formation closer (leçons, QCM, argumentaire). Membre : cookie d'équipe + section « academy ». Fondateur : code principal (aperçu + suivi de l'équipe). */

const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28", soft: "#fff1ea", green: "#15803d", greenBg: "#dcfce7", red: "#b91c1c", redBg: "#fee2e2" };
const btn = (bg = C.ink, small = false): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: small ? "8px 12px" : "13px 18px", borderRadius: 12, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: small ? 14 : 16, textDecoration: "none", lineHeight: 1.2 });
const ghost: React.CSSProperties = { ...btn("#fff", true), color: C.ink, border: "1px solid #d8d2c8" };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 14 };
const input: React.CSSProperties = { width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d8d2c8", font: "inherit", fontSize: 16, boxSizing: "border-box", background: "#fff" };

type Progress = { module_key: string; best_score: number; last_score: number | null; attempts: number; read_at: string | null; passed_at: string | null };
type Me = { who: "owner" | "member"; name: string };
type Result = { score: number; good: number; total: number; passed: boolean; best: number; attempts: number; firstPass: boolean; results: { chosen: number; correct: number; ok: boolean }[] };
type AdminMember = { id: number; name: string; role: string; active: boolean; progress: Progress[] };

const isMemberCode = (c: string) => /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(c.toUpperCase());
const shuffle = (n: number) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtDay = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Academy() {
  const [pc, setPc] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [view, setView] = useState("");
  const [err, setErr] = useState("");

  const api = useCallback(async (body: Record<string, unknown>, p = pc) => {
    const r = await fetch("/api/academy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: p, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
    if (r.status === 401) { setMe(null); throw new Error("Non connecté"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, [pc]);

  const loadMe = useCallback(async (p: string) => {
    try { const j = await api({ action: "me" }, p); setMe(j.me); setProgress(j.progress || []); return true; } catch { return false; }
  }, [api]);

  useEffect(() => {
    (async () => { let p = ""; try { p = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ } setPc(p); await loadMe(p); setReady(true); })();
    const onHash = () => { setView(decodeURIComponent(location.hash.slice(1))); window.scrollTo(0, 0); };
    onHash(); window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Temps de travail : même signal que l'espace équipe (une fois par minute, onglet visible).
  useEffect(() => {
    if (me?.who !== "member") return;
    const ping = () => fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ping", visible: document.visibilityState === "visible" }) }).catch(() => null);
    ping(); const it = setInterval(ping, 60000); return () => clearInterval(it);
  }, [me?.who]);

  const go = (v: string) => { if (location.hash.slice(1) === v) window.scrollTo(0, 0); else location.hash = v; };
  const byKey = useMemo(() => Object.fromEntries(progress.map(p => [p.module_key, p])), [progress]);
  const upsert = (p: Progress) => setProgress(l => [...l.filter(x => x.module_key !== p.module_key), p]);

  if (!ready) return <Shell><p style={{ color: C.mute }}>Chargement…</p></Shell>;
  if (!me) return <Shell><Login onOwner={async c => { if (await loadMe(c)) { try { sessionStorage.setItem("nd_pc", c); } catch { /* privé */ } setPc(c); return true; } return false; }} onMember={async () => loadMe("")} /></Shell>;

  const [kind, key] = view.split(":");
  const mod = MODULES.find(m => m.key === key);
  const idx = mod ? MODULES.indexOf(mod) : -1;

  if (kind === "module" && mod) return <Shell me={me}>
    <LessonView mod={mod} n={idx + 1} p={byKey[mod.key]} onOpen={() => { if (me.who === "member" && !byKey[mod.key]?.read_at) { api({ action: "read", module: mod.key }).catch(() => null); upsert({ ...(byKey[mod.key] || { module_key: mod.key, best_score: 0, last_score: null, attempts: 0, passed_at: null }), read_at: new Date().toISOString() }); } }} go={go} />
  </Shell>;
  if (kind === "qcm" && mod) return <Shell me={me}>
    <QuizView key={mod.key} mod={mod} n={idx + 1} next={MODULES[idx + 1]} owner={me.who === "owner"} go={go} submit={async answers => {
      const j: Result = await api({ action: "submit", module: mod.key, answers });
      const cur = byKey[mod.key];
      upsert({ module_key: mod.key, best_score: j.best, last_score: j.score, attempts: j.attempts, read_at: cur?.read_at || new Date().toISOString(), passed_at: cur?.passed_at || (j.passed ? new Date().toISOString() : null) });
      return j;
    }} />
  </Shell>;
  if (kind === "argumentaire") return <Shell me={me}><Argumentaire go={go} /></Shell>;
  if (kind === "suivi" && me.who === "owner") return <Shell me={me}><TeamProgress api={api} /></Shell>;

  const passed = MODULES.filter(m => byKey[m.key]?.passed_at).length;
  const first = me.name.split(/\s+/)[0];
  const nextMod = MODULES.find(m => !byKey[m.key]?.passed_at);
  return <Shell me={me}>
    {err ? <p style={{ color: C.red, fontWeight: 600 }}>{err}</p> : null}
    <h1 style={{ fontSize: 28, margin: "14px 0 6px" }}>🎓 NeoDrive Academy</h1>
    <p style={{ fontSize: 17, lineHeight: 1.55, margin: "0 0 12px" }}>{me.who === "owner" ? "Aperçu fondateur : vous voyez la formation comme un membre de l’équipe. Vos réponses aux QCM ne sont pas enregistrées." : <>Bienvenue {first} ! Voici votre formation de closer NeoDrive. Lisez chaque module, puis passez son QCM : il faut <b>{PASS_MARK} %</b> de bonnes réponses pour le valider. Vous pouvez recommencer autant de fois que nécessaire.</>}</p>

    {me.who === "member" ? <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: 700 }}><span>Votre progression</span><span>{passed} / {MODULES.length} modules validés</span></div>
      <div style={{ height: 10, background: "#eee8df", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ width: `${(passed / MODULES.length) * 100}%`, height: "100%", background: passed === MODULES.length ? C.green : C.brand, borderRadius: 99, transition: "width .4s" }} /></div>
      {passed === MODULES.length ? <p style={{ margin: "10px 0 0", color: C.green, fontWeight: 700 }}>🎉 Bravo, vous avez validé toute la formation !</p> : nextMod ? <button onClick={() => go(`module:${nextMod.key}`)} style={{ ...btn(C.brand), width: "100%", marginTop: 12 }}>{passed ? "Continuer" : "Commencer"} : module {MODULES.indexOf(nextMod) + 1}</button> : null}
    </div> : null}

    <div style={{ display: "grid", gap: 8, gridTemplateColumns: me.who === "owner" ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr", marginBottom: 14 }}>
      <button onClick={() => go("argumentaire")} style={{ ...card, textAlign: "left", cursor: "pointer", font: "inherit", color: C.ink, background: C.soft, borderColor: "#f8c8b0" }}>
        <b style={{ fontSize: 17 }}>💡 Argumentaire</b><br /><span style={{ color: C.mute, fontSize: 14 }}>Objection → réponse. À garder ouvert pendant les appels.</span>
      </button>
      {me.who === "owner" ? <button onClick={() => go("suivi")} style={{ ...card, textAlign: "left", cursor: "pointer", font: "inherit", color: C.ink }}>
        <b style={{ fontSize: 17 }}>📊 Suivi de l’équipe</b><br /><span style={{ color: C.mute, fontSize: 14 }}>Modules lus, validés, meilleurs scores.</span>
      </button> : null}
    </div>

    <h2 style={{ fontSize: 19, margin: "18px 0 8px" }}>Les {MODULES.length} modules</h2>
    <div style={{ display: "grid", gap: 8 }}>{MODULES.map((m, i) => {
      const p = byKey[m.key];
      const st = p?.passed_at ? { t: `✅ Validé · ${p.best_score} %`, bg: C.greenBg, fg: C.green } : p?.attempts ? { t: `À revoir · meilleur ${p.best_score} %`, bg: C.redBg, fg: C.red } : p?.read_at ? { t: "📖 Lu · QCM à passer", bg: "#e0f2fe", fg: "#075985" } : { t: "À lire", bg: "#f1f1f1", fg: "#555" };
      return <button key={m.key} onClick={() => { setErr(""); go(`module:${m.key}`); }} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", cursor: "pointer", font: "inherit", color: C.ink, width: "100%" }}>
        <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>{m.icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: C.brand, fontWeight: 800, fontSize: 12, letterSpacing: .5 }}>MODULE {i + 1}</span><br />
          <b style={{ fontSize: 17 }}>{m.title}</b><br />
          <span style={{ color: C.mute, fontSize: 14 }}>{m.summary}</span><br />
          {me.who === "member" ? <span style={{ display: "inline-block", marginTop: 6, background: st.bg, color: st.fg, borderRadius: 99, padding: "3px 10px", fontSize: 13, fontWeight: 700 }}>{st.t}</span> : <span style={{ display: "inline-block", marginTop: 6, color: "#888", fontSize: 13 }}>{m.lessons.length} leçons · QCM de {m.quiz.length} questions</span>}
        </span>
      </button>;
    })}</div>
  </Shell>;
}

function Shell({ children, me }: { children: React.ReactNode; me?: Me | null }) {
  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 16px 80px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
        <a href="/academy#" style={{ display: "flex", alignItems: "center", gap: 10, color: C.ink, textDecoration: "none", minWidth: 0 }}>
          <span style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: C.brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18 }}>N</span>
          <b style={{ fontSize: 18, whiteSpace: "nowrap" }}>Academy</b>
          {me ? <span style={{ color: C.mute, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {me.name}</span> : null}
        </a>
        <a href="/organisation" style={{ color: C.mute, fontSize: 14, whiteSpace: "nowrap" }}>← Organisation</a>
      </div>
      {children}
    </div>
  </main>;
}

function Login({ onOwner, onMember }: { onOwner: (c: string) => Promise<boolean>; onMember: () => Promise<boolean> }) {
  const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const memberLogin = async (c: string) => {
    const r = await fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", code: c }) });
    const j = await r.json().catch(() => ({ ok: false }));
    if (j.ok) { try { sessionStorage.removeItem("nd_pc"); } catch { /* privé */ } }
    return { ok: !!j.ok, error: j.error as string | undefined, status: r.status };
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setBusy(true);
    const c = code.trim();
    try {
      if (isMemberCode(c)) {
        const m = await memberLogin(c.toUpperCase());
        if (m.ok) { if (!(await onMember())) setMsg("La NeoDrive Academy n’est pas encore ouverte pour vous. Demandez à Mansour de cocher « NeoDrive Academy »."); return; }
        if (m.status === 403) { setMsg(m.error || "Accès désactivé."); return; }
      }
      if (await onOwner(c)) return;
      setMsg("Code incorrect. Vérifiez-le ou demandez un nouveau code à Mansour.");
    } finally { setBusy(false); }
  };
  return <>
    <h1 style={{ fontSize: 28, margin: "18px 0 6px" }}>🎓 NeoDrive Academy</h1>
    <p style={{ fontSize: 16, lineHeight: 1.55 }}>La formation de l’équipe NeoDrive. Connectez-vous avec votre code personnel.</p>
    <form onSubmit={submit} style={{ ...card, maxWidth: 420 }}>
      <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Votre code d’accès</label>
      <input value={code} onChange={e => setCode(e.target.value)} type="password" autoComplete="off" autoFocus placeholder="Ex. : ABCDE-FGH23" style={input} />
      <button disabled={busy || code.trim().length < 4} style={{ ...btn(C.brand), width: "100%", marginTop: 12 }}>{busy ? "Vérification…" : "Entrer"}</button>
      {msg ? <p style={{ color: C.red, fontWeight: 600 }}>{msg}</p> : null}
      <p style={{ color: C.mute, fontSize: 13, marginBottom: 0 }}>Le code est personnel : ne le partagez pas. Vous êtes déjà connecté(e) sur <a href="/organisation" style={{ color: C.brand, fontWeight: 700 }}>l’espace Organisation</a> ? Rechargez simplement cette page.</p>
    </form>
  </>;
}

function LessonView({ mod, n, p, onOpen, go }: { mod: Module; n: number; p?: Progress; onOpen: () => void; go: (v: string) => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onOpen(); }, [mod.key]);
  return <article style={{ fontSize: 17, lineHeight: 1.6 }}>
    <p style={{ margin: "14px 0 0" }}><button onClick={() => go("")} style={ghost}>← Les modules</button></p>
    <div style={{ color: C.brand, fontWeight: 800, fontSize: 13, marginTop: 14 }}>MODULE {n} / {MODULES.length}</div>
    <h1 style={{ fontSize: 26, lineHeight: 1.25, margin: "4px 0 6px" }}>{mod.icon} {mod.title}</h1>
    <p style={{ color: C.mute, margin: "0 0 10px", fontSize: 16 }}>{mod.summary}{p?.passed_at ? <b style={{ color: C.green }}> · ✅ Validé ({p.best_score} %)</b> : null}</p>

    {mod.lessons.map((l, i) => <section key={i} style={{ ...card, marginTop: 10 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 6px" }}>{i + 1}. {l.title}</h2>
      {(l.text || []).map((t, j) => <p key={j} style={{ margin: "6px 0" }}>{t}</p>)}
      {l.list?.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{l.list.map((t, j) => <li key={j} style={{ margin: "4px 0" }}>{t}</li>)}</ul> : null}
    </section>)}

    <section style={{ ...card, marginTop: 14, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px", color: C.green }}>🗣️ Les phrases clés</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{mod.say.map((t, j) => <li key={j} style={{ margin: "6px 0" }}>{t}</li>)}</ul>
    </section>
    <section style={{ ...card, marginTop: 10, background: "#fef2f2", borderColor: "#fecaca" }}>
      <h2 style={{ fontSize: 18, margin: "0 0 6px", color: C.red }}>🚫 Ce qu’on ne dit / ne promet jamais</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{mod.never.map((t, j) => <li key={j} style={{ margin: "6px 0" }}>{t}</li>)}</ul>
    </section>

    <div style={{ ...card, marginTop: 14, textAlign: "center" }}>
      <p style={{ margin: "0 0 10px" }}>Prêt(e) ? Le QCM compte <b>{mod.quiz.length} questions</b>. Il faut <b>{PASS_MARK} %</b> pour valider.</p>
      <button onClick={() => go(`qcm:${mod.key}`)} style={{ ...btn(C.brand), width: "100%", maxWidth: 360 }}>📝 Passer le QCM</button>
    </div>
  </article>;
}

function QuizView({ mod, n, next, owner, go, submit }: { mod: Module; n: number; next?: Module; owner: boolean; go: (v: string) => void; submit: (answers: number[]) => Promise<Result> }) {
  const [round, setRound] = useState(0);
  const orders = useMemo(() => mod.quiz.map(q => shuffle(q.options.length)), [mod, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [picks, setPicks] = useState<(number | null)[]>(() => mod.quiz.map(() => null));
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const missing = picks.filter(x => x == null).length;
  const retry = () => { setPicks(mod.quiz.map(() => null)); setRes(null); setErr(""); setRound(r => r + 1); window.scrollTo(0, 0); };
  const send = async () => {
    if (missing) return; setBusy(true); setErr("");
    try { setRes(await submit(picks as number[])); window.scrollTo(0, 0); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return <div style={{ fontSize: 17, lineHeight: 1.5 }}>
    <p style={{ margin: "14px 0 0", display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => go(`module:${mod.key}`)} style={ghost}>← Relire le module</button><button onClick={() => go("")} style={ghost}>Les modules</button></p>
    <div style={{ color: C.brand, fontWeight: 800, fontSize: 13, marginTop: 14 }}>QCM · MODULE {n}</div>
    <h1 style={{ fontSize: 24, lineHeight: 1.25, margin: "4px 0 10px" }}>{mod.title}</h1>

    {res ? <div style={{ ...card, background: res.passed ? C.greenBg : C.redBg, borderColor: res.passed ? "#86efac" : "#fca5a5", textAlign: "center" }}>
      <div style={{ fontSize: 40, fontWeight: 900, color: res.passed ? C.green : C.red }}>{res.score} %</div>
      <div style={{ fontWeight: 700 }}>{res.good} bonnes réponses sur {res.total}</div>
      <p style={{ margin: "8px 0 0" }}>{res.passed ? (res.firstPass ? "🎉 Bravo, module validé !" : "✅ Module validé.") : `Pas encore : il faut ${PASS_MARK} %. Relisez les explications ci-dessous et réessayez.`}{owner ? " (Aperçu fondateur : non enregistré.)" : ` Meilleur score : ${res.best} % · essai n° ${res.attempts}.`}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
        {res.passed && next ? <button onClick={() => go(`module:${next.key}`)} style={btn(C.brand)}>Module suivant →</button> : null}
        {!res.passed ? <button onClick={retry} style={btn(C.brand)}>🔁 Recommencer</button> : <button onClick={retry} style={{ ...btn("#555") }}>Refaire le QCM</button>}
        <button onClick={() => go("")} style={btn("#777")}>Les modules</button>
      </div>
    </div> : <p style={{ color: C.mute, margin: "0 0 6px", fontSize: 15 }}>Choisissez une réponse par question. {PASS_MARK} % pour valider.</p>}

    <ol style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 10 }}>{mod.quiz.map((q, qi) => {
      const r = res?.results[qi];
      return <li key={qi} style={{ ...card, borderColor: r ? (r.ok ? "#86efac" : "#fca5a5") : C.line }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}><span style={{ color: C.brand }}>{qi + 1}.</span> {q.q}</div>
        <div style={{ display: "grid", gap: 6 }}>{orders[qi].map(oi => {
          const chosen = picks[qi] === oi; const isRight = oi === q.answer;
          const bg = r ? (isRight ? C.greenBg : chosen ? C.redBg : "#fff") : chosen ? C.soft : "#fff";
          const bd = r ? (isRight ? C.green : chosen ? C.red : "#e5e0d8") : chosen ? C.brand : "#d8d2c8";
          return <label key={oi} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, border: `2px solid ${bd}`, background: bg, cursor: r ? "default" : "pointer", fontSize: 16 }}>
            <input type="radio" name={`q${qi}-${round}`} checked={chosen} disabled={!!r} onChange={() => setPicks(p => p.map((x, i) => i === qi ? oi : x))} style={{ marginTop: 4, accentColor: C.brand, flex: "none" }} />
            <span>{q.options[oi]}{r && isRight ? " ✅" : r && chosen ? " ❌" : ""}</span>
          </label>;
        })}</div>
        {r ? <p style={{ margin: "8px 0 0", fontSize: 15, color: r.ok ? C.green : C.red }}><b>{r.ok ? "Bonne réponse." : "Réponse attendue ci-dessus en vert."}</b> <span style={{ color: "#333" }}>{q.why}</span></p> : null}
      </li>;
    })}</ol>

    {!res ? <div style={{ position: "sticky", bottom: 0, background: C.bg, padding: "12px 0", marginTop: 6 }}>
      {err ? <p style={{ color: C.red, fontWeight: 600, margin: "0 0 8px" }}>{err}</p> : null}
      <button onClick={send} disabled={busy || missing > 0} style={{ ...btn(missing ? "#bbb" : C.brand), width: "100%" }}>{busy ? "Correction…" : missing ? `Encore ${missing} question${missing > 1 ? "s" : ""} sans réponse` : "Valider mes réponses"}</button>
    </div> : null}
  </div>;
}

function Argumentaire({ go }: { go: (v: string) => void }) {
  const themes = useMemo(() => Array.from(new Set(ARGUMENTAIRE.map(a => a.theme))), []);
  const [t, setT] = useState(""); const [q, setQ] = useState("");
  const shown = ARGUMENTAIRE.filter(a => (!t || a.theme === t) && (!q.trim() || fold(`${a.objection} ${a.reponse}`).includes(fold(q.trim()))));
  return <div>
    <p style={{ margin: "14px 0 0" }}><button onClick={() => go("")} style={ghost}>← Les modules</button></p>
    <h1 style={{ fontSize: 26, margin: "12px 0 4px" }}>💡 Argumentaire</h1>
    <p style={{ color: C.mute, margin: "0 0 10px" }}>Le client dit… → vous répondez. Écoutez jusqu’au bout, reformulez, répondez avec un fait, puis posez une question.</p>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher : prix, arnaque, Ami, plusieurs fois…" style={input} />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
      {["", ...themes].map(x => <button key={x || "tous"} onClick={() => setT(x)} style={{ ...btn(t === x ? C.ink : "#fff", true), color: t === x ? "#fff" : C.ink, border: `1px solid ${t === x ? C.ink : "#d8d2c8"}` }}>{x || "Tous"}</button>)}
    </div>
    <div style={{ display: "grid", gap: 8 }}>{shown.map((a, i) => <div key={i} style={card}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.brand, letterSpacing: .5 }}>{a.theme.toUpperCase()}</div>
      <div style={{ fontWeight: 700, fontSize: 17, margin: "2px 0 6px" }}>{a.objection}</div>
      <div style={{ fontSize: 16, lineHeight: 1.55, background: "#f0fdf4", borderRadius: 10, padding: "8px 10px" }}>→ {a.reponse}</div>
    </div>)}{shown.length ? null : <p style={{ color: C.mute }}>Rien trouvé. Essayez un autre mot.</p>}</div>
    <div style={{ ...card, marginTop: 14, background: "#fef2f2", borderColor: "#fecaca", fontSize: 15, lineHeight: 1.55 }}>
      <b style={{ color: C.red }}>🚫 Toujours :</b> pas de remise, pas de fausse urgence, pas de « pardon », pas d’« entrepôt », jamais « 50 km ». Aucune promesse de remboursement, de date ou de prise en charge sans l’accord écrit de Mansour. Appels en semaine, 10 h–13 h et 14 h–20 h (heure de France).
    </div>
  </div>;
}

function TeamProgress({ api }: { api: (b: Record<string, unknown>) => Promise<{ members: AdminMember[] }> }) {
  const [list, setList] = useState<AdminMember[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api({ action: "admin" }).then(j => setList(j.members)).catch(e => setErr((e as Error).message)); }, [api]);
  return <div>
    <p style={{ margin: "14px 0 0" }}><a href="/academy#" style={ghost}>← Les modules</a></p>
    <h1 style={{ fontSize: 26, margin: "12px 0 4px" }}>📊 Suivi de l’équipe</h1>
    <p style={{ color: C.mute, margin: "0 0 10px" }}>Les membres qui ont la section « NeoDrive Academy ». ✅ validé (meilleur score) · 📖 lu · ✗ QCM tenté sans succès.</p>
    {err ? <p style={{ color: C.red, fontWeight: 600 }}>{err}</p> : null}
    {!list ? <p style={{ color: C.mute }}>Chargement…</p> : !list.length ? <p style={{ color: C.mute }}>Aucun membre n’a encore la section Academy. Cochez-la dans « Équipe et accès ».</p> : <div style={{ display: "grid", gap: 10 }}>{list.map(m => {
      const by = Object.fromEntries(m.progress.map(p => [p.module_key, p]));
      const ok = MODULES.filter(x => by[x.key]?.passed_at).length;
      const last = m.progress.reduce((a, p) => (p.passed_at && (!a || p.passed_at > a) ? p.passed_at : a), "" as string);
      return <div key={m.id} style={{ ...card, opacity: m.active ? 1 : .6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 17 }}>{m.name}{m.active ? "" : " (accès coupé)"}</b><span style={{ fontWeight: 700, color: ok === MODULES.length ? C.green : C.ink }}>{ok} / {MODULES.length} validés{last ? ` · dernier le ${fmtDay(last)}` : ""}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, marginTop: 8 }}>{MODULES.map((x, i) => {
          const p = by[x.key];
          const s = p?.passed_at ? { t: `✅ ${p.best_score} %`, bg: C.greenBg, fg: C.green } : p?.attempts ? { t: `✗ ${p.best_score} % (${p.attempts} essai${p.attempts > 1 ? "s" : ""})`, bg: C.redBg, fg: C.red } : p?.read_at ? { t: "📖 lu", bg: "#e0f2fe", fg: "#075985" } : { t: "—", bg: "#f5f5f5", fg: "#777" };
          return <div key={x.key} title={x.title} style={{ background: s.bg, color: s.fg, borderRadius: 10, padding: "6px 8px", fontSize: 13 }}><b>{i + 1}. {x.title.length > 18 ? x.title.slice(0, 17) + "…" : x.title}</b><br />{s.t}</div>;
        })}</div>
      </div>;
    })}</div>}
  </div>;
}
