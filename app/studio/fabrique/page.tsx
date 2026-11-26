"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Segment = { clip: string; start: number; end: number; why: string };
type Proposal = {
  id: string; day: string; angle: string; title: string; hook: string; script: string; voice: "tts" | "original"; segments: Segment[];
  caption: string; hashtags: string[]; status: "draft" | "rendering" | "rendered" | "error"; duration: number | null; error: string | null;
  feedback: string | null; published: boolean; url: string | null; downloadUrl: string | null;
  captions?: { facebook?: string; instagram?: string } | null;
};
type Lib = { total: number; usable: number; pending: number; needConsent: number };

const API = "/api/studio/fabrique";
const ST: Record<Proposal["status"], string> = { draft: "En attente de rendu", rendering: "Rendu en cours…", rendered: "Prête", error: "Erreur" };
/** Trou à remplir ([X], [à vérifier]…) : la vidéo doit être vérifiée avant téléchargement. */
const toCheck = (p: Proposal) => /\[[^\]]*\]/.test(`${p.hook} ${p.script} ${p.caption}`);
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function Fabrique() {
  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [err, setErr] = useState(""); const [info, setInfo] = useState(""); const [busy, setBusy] = useState("");
  const [day, setDay] = useState(""); const [today, setToday] = useState(""); const [days, setDays] = useState<string[]>([]);
  const [angles, setAngles] = useState<Record<string, string>>({});
  const [ps, setPs] = useState<Proposal[]>([]); const [lib, setLib] = useState<Lib | null>(null);
  const [fb, setFb] = useState<Record<string, string>>({}); const [checked, setChecked] = useState<Record<string, boolean>>({}); const [one, setOne] = useState<Record<string, boolean>>({});
  const codeRef = useRef(""); const rendering = useRef(false); const autoDone = useRef(false);

  const api = useCallback(async (body: Record<string, unknown>, pc = codeRef.current) => {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: r.status === 504 ? "Le serveur a mis trop de temps, réessayez." : "Réponse illisible du serveur" }));
    if (r.status === 401) { setAuthed(false); throw new Error("Code incorrect"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, []);
  const load = useCallback(async (d = "", pc = codeRef.current) => {
    const j = await api({ action: "list", day: d || undefined }, pc);
    setDay(j.day); setToday(j.today); setDays(j.days); setAngles(j.angles); setPs(j.proposals); setLib(j.library); setAuthed(true);
    return j.proposals as Proposal[];
  }, [api]);
  const put = (p: Proposal) => setPs(xs => xs.some(x => x.id === p.id) ? xs.map(x => x.id === p.id ? p : x) : [...xs, p]);

  const renderAll = useCallback(async () => {
    if (rendering.current) return; rendering.current = true; setErr("");
    try {
      for (let i = 0; i < 15; i++) {
        setBusy("Fabrication des vidéos… (1 à 3 min chacune, gardez la page ouverte — sinon elles se font aussi tôt le matin)");
        const j = await api({ action: "render_next", day });
        if (j.proposal) put(j.proposal);
        if (!j.proposal || !j.remaining) break;
      }
      await load(day);
    } catch (e) { setErr((e as Error).message); load(day).catch(() => null); }
    finally { rendering.current = false; setBusy(""); }
  }, [api, day, load]);

  useEffect(() => {
    let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ }
    setCode(pc); codeRef.current = pc;
    load("", pc).catch(() => setAuthed(false));
  }, [load]);
  // À l'ouverture, on lance les rendus en attente du jour (la page sert de file d'attente).
  useEffect(() => {
    if (!authed || autoDone.current || !day || day !== today) return;
    if (ps.some(p => p.status === "draft")) { autoDone.current = true; renderAll(); }
  }, [authed, day, today, ps, renderAll]);

  const enter = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); codeRef.current = code; try { await load("", code); try { sessionStorage.setItem("nd_pc", code); } catch { /* privé */ } } catch (x) { setErr((x as Error).message); } };
  const plan = async () => {
    setErr(""); setInfo(""); setBusy("L’IA prépare les propositions… (30 s à 1 min)");
    try { const j = await api({ action: "plan", day }); setPs(j.proposals); setInfo(`✅ ${j.created} proposition(s) créée(s).${j.rejected?.length ? ` ${j.rejected.length} écartée(s) par le contrôle (chiffres, concurrents).` : ""}`); setBusy(""); autoDone.current = false; }
    catch (e) { setErr((e as Error).message); setBusy(""); }
  };
  const renderOne = async (p: Proposal) => {
    setOne(o => ({ ...o, [p.id]: true })); put({ ...p, status: "rendering" }); setErr("");
    try { const j = await api({ action: "render", id: p.id, day }); put(j.proposal); } catch (e) { setErr((e as Error).message); load(day).catch(() => null); }
    finally { setOne(o => ({ ...o, [p.id]: false })); }
  };
  const redo = async (p: Proposal) => {
    const feedback = (fb[p.id] || "").trim(); if (feedback.length < 3) { setErr("Écrivez ce qu’il faut changer."); return; }
    setOne(o => ({ ...o, [p.id]: true })); setErr("");
    try {
      const j = await api({ action: "redo", id: p.id, day, feedback }); put(j.proposal); setFb(f => ({ ...f, [p.id]: "" }));
      put({ ...j.proposal, status: "rendering" });
      const r = await api({ action: "render", id: p.id, day }); put(r.proposal);
    } catch (e) { setErr((e as Error).message); load(day).catch(() => null); }
    finally { setOne(o => ({ ...o, [p.id]: false })); }
  };
  const publish = async (p: Proposal, v: boolean) => { put({ ...p, published: v }); try { const j = await api({ action: "update", id: p.id, day, published: v }); put(j.proposal); } catch (e) { setErr((e as Error).message); put(p); } };
  const toTikTok = async (p: Proposal) => {
    setOne(o => ({ ...o, [p.id]: true })); setErr(""); setInfo("");
    try { const j = await api({ action: "tiktok", id: p.id, day }); setInfo("✅ " + (j.note || "Envoyée dans vos brouillons TikTok.") + " Collez la légende, publiez, puis cochez « Publiée sur TikTok »."); }
    catch (e) { setErr((e as Error).message); } finally { setOne(o => ({ ...o, [p.id]: false })); }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => setInfo("📋 Légende copiée."), () => setInfo("Copie impossible : sélectionnez le texte.")); };

  if (authed === null) return <main className="s"><p className="muted">Chargement…</p><style jsx>{css}</style></main>;
  if (!authed) return <main className="s"><form className="login" onSubmit={enter}><span className="logo">N</span><h1>Fabrique TikTok</h1><p>Code d’accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus /><button>Entrer</button>{err ? <p className="err">{err}</p> : null}</form><style jsx>{css}</style></main>;

  const pending = ps.filter(p => p.status === "draft" || p.status === "error").length;
  return <main className="s">
    <p className="nav"><a href="/studio/bibliotheque">← Bibliothèque vidéo</a></p>
    <h1>Fabrique TikTok</h1>
    <p className="sub">Chaque matin, des vidéos prêtes à publier, fabriquées avec vos rushes analysés.</p>
    <div className="bar1">
      <select value={day} onChange={e => { autoDone.current = true; load(e.target.value).catch(x => setErr((x as Error).message)); }}>{days.map(d => <option key={d} value={d}>{d === today ? "Aujourd’hui" : fmtDay(d)}</option>)}</select>
      {lib ? <span className="muted">{lib.usable} clip(s) utilisable(s){lib.pending ? ` · ${lib.pending} à analyser` : ""}</span> : null}
    </div>
    {lib?.needConsent ? <p className="warn">⚠️ {lib.needConsent} clip(s) montrent un client sans accord coché : ils ne sont pas utilisés. <a href="/studio/bibliotheque">Cocher l’accord</a></p> : null}
    {busy ? <div className="busy">{busy}<div className="pb pulse"><i /></div></div> : null}
    {err ? <p className="err">{err}</p> : null}
    {info ? <p className="ok">{info}</p> : null}

    {!ps.length && !busy ? <button className="go" onClick={plan}>🏭 Fabriquer les propositions {day === today ? "du jour" : `du ${fmtDay(day)}`}</button> : null}
    {ps.length && ps.length < 10 && !busy ? <button className="ghost" onClick={plan}>＋ Compléter jusqu’à 10 propositions</button> : null}
    {pending && !busy ? <button className="go" onClick={renderAll}>▶️ Fabriquer les {pending} vidéo(s) en attente</button> : null}

    {ps.map((p, i) => <article key={p.id} className={`card ${p.status}`}>
      <div className="head"><small>{i + 1}. {angles[p.angle]?.split(" (")[0] || p.angle}{p.voice === "original" ? " · voix du fondateur" : " · voix off"}</small><span className={`st ${p.status}`}>{one[p.id] && p.status !== "rendering" ? "…" : ST[p.status]}</span></div>
      <h2>{p.hook || p.title}</h2>
      {p.url ? <video className="vid" src={p.url} controls playsInline preload="metadata" /> : null}
      {p.status === "error" && p.error ? <p className="err small">{p.error}</p> : null}
      {toCheck(p) ? <label className="warn chk"><input type="checkbox" checked={!!checked[p.id]} onChange={e => setChecked(c => ({ ...c, [p.id]: e.target.checked }))} /> ⚠️ À vérifier : le texte contient un élément entre crochets. Cochez après vérification (ou « Refaire »).</label> : null}
      {p.downloadUrl && (!toCheck(p) || checked[p.id]) ? <a className="go dl" href={p.downloadUrl}>⬇️ Télécharger la vidéo{p.duration ? ` (${Math.round(p.duration)} s)` : ""}</a> : null}
      {(p.status === "draft" || p.status === "error") && !busy ? <button className="ghost" disabled={!!one[p.id]} onClick={() => renderOne(p)}>▶️ Fabriquer cette vidéo</button> : null}
      <div className="cap"><p>{p.caption}{p.hashtags.length ? "\n\n" + p.hashtags.join(" ") : ""}</p><button className="mini" onClick={() => copy(`${p.caption}\n\n${p.hashtags.join(" ")}`)}>Copier la légende</button></div>
      {p.status === "rendered" ? <button className="ghost" disabled={!!one[p.id] || !!busy || (toCheck(p) && !checked[p.id])} onClick={() => toTikTok(p)}>📲 Envoyer en brouillon TikTok</button> : null}
      {p.captions?.facebook || p.captions?.instagram ? <details><summary>Légendes Facebook et Instagram</summary>{(["facebook", "instagram"] as const).map(k => p.captions?.[k] ? <div className="cap" key={k}><small className="muted">{k === "facebook" ? "Facebook" : "Instagram"}</small><p>{p.captions[k]}</p><button className="mini" onClick={() => copy(p.captions?.[k] || "")}>Copier</button></div> : null)}<p className="muted">Une fois cochée « Publiée sur TikTok », la vidéo peut aussi partir automatiquement sur Facebook et Instagram (jusqu’à 3 publications par jour et par réseau, jamais deux fois en 14 jours).</p></details> : null}
      <details><summary>Script et extraits</summary><p className="script">{p.script}</p><ul>{p.segments.map((s, k) => <li key={k}>{s.clip.slice(-5)} : {s.start.toFixed(1)}–{s.end.toFixed(1)} s{s.why ? ` — ${s.why}` : ""}</li>)}</ul>{p.feedback ? <p className="muted">Dernière remarque : « {p.feedback} »</p> : null}</details>
      <label className="pub"><input type="checkbox" checked={p.published} onChange={e => publish(p, e.target.checked)} /> Publiée sur TikTok</label>
      <div className="redo"><textarea rows={2} placeholder="Refaire : ex. « accroche plus courte », « utilise la vidéo de la remorque », « parle du financement »" value={fb[p.id] || ""} onChange={e => setFb(f => ({ ...f, [p.id]: e.target.value }))} /><button className="ghost" disabled={!!one[p.id] || !!busy} onClick={() => redo(p)}>↻ Refaire</button></div>
    </article>)}
    <style jsx>{css}</style>
  </main>;
}

const css = `.s{max-width:640px;margin:0 auto;padding:18px 16px 90px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;background:#fff;box-sizing:border-box}
.nav{margin:0 0 6px}.nav a{color:#f05a28;font-weight:800;text-decoration:none}
h1{font-size:30px;letter-spacing:-1px;margin:0}h2{font-size:21px;line-height:1.2;margin:2px 0 6px}.sub{color:#555;margin:4px 0 10px}
.login{display:grid;gap:12px;text-align:center;margin-top:40px}.login p{color:#666;margin:0}.logo{justify-self:center;display:grid;place-items:center;width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:30px}
input,textarea,select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px;background:#fff;color:#111}
button{font:inherit;cursor:pointer}.login button{padding:15px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:900;font-size:16px}
.bar1{display:grid;gap:4px;margin-bottom:8px}.bar1 select{font-weight:800;text-transform:capitalize}
.go{display:block;box-sizing:border-box;text-align:center;text-decoration:none;padding:15px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff8a00,#f05a28);color:#fff;font-weight:900;font-size:16px;width:100%;margin:6px 0}
.ghost{padding:12px;border:1px solid #d4d7db;border-radius:14px;background:#fff;font-weight:800;font-size:15px;color:#111;width:100%;margin:4px 0}.ghost:disabled{opacity:.5}
.busy{background:#fff7ed;border:1px solid #fde3c8;border-radius:14px;padding:12px;margin:8px 0}.pb{height:8px;background:#fde3c8;border-radius:9px;overflow:hidden;margin-top:8px}.pb i{display:block;height:100%;width:35%;background:#f05a28;animation:p 1.4s infinite ease-in-out}@keyframes p{0%{margin-left:-35%}100%{margin-left:100%}}
.err{color:#b42318;font-weight:700;background:#fef3f2;padding:10px 12px;border-radius:12px}.err.small{font-size:13px}.ok{color:#067647;font-weight:700;background:#ecfdf3;padding:10px 12px;border-radius:12px}.warn{color:#93370d;background:#fffaeb;padding:10px 12px;border-radius:12px;font-size:14px}.warn a{color:#93370d;font-weight:800}
.muted{color:#777;font-size:13px}
.card{border:1px solid #e5e7eb;border-radius:18px;padding:14px;margin:14px 0;display:grid;gap:6px}.card.rendered{border-color:#abefc6}
.head{display:flex;justify-content:space-between;gap:8px;align-items:center}.head small{color:#666;font-weight:700}
.st{font-size:12px;font-weight:800;padding:3px 8px;border-radius:999px;background:#f2f4f7;color:#344054;white-space:nowrap}.st.rendered{background:#ecfdf3;color:#067647}.st.rendering{background:#fff7ed;color:#b54708}.st.error{background:#fef3f2;color:#b42318}
.vid{width:100%;max-height:72vh;border-radius:12px;background:#000;aspect-ratio:9/16}
.cap{background:#f9fafb;border-radius:12px;padding:10px;display:grid;gap:6px}.cap p{margin:0;white-space:pre-line;font-size:14px;line-height:1.45}
.mini{justify-self:start;padding:8px 12px;border:1px solid #ddd;background:#fff;border-radius:10px;font-weight:800;font-size:13px;color:#111}
details summary{font-weight:800;cursor:pointer;padding:4px 0}.script{white-space:pre-line;font-size:15px;line-height:1.5}details ul{padding-left:18px;font-size:13px;color:#444}
.pub{display:flex;gap:8px;align-items:center;font-weight:800}.pub input{width:22px;height:22px;margin:0}
.chk{display:flex;gap:8px;align-items:flex-start}.chk input{width:20px;height:20px;margin:2px 0 0;flex:none}
.redo{display:grid;gap:4px;border-top:1px dashed #e5e7eb;padding-top:8px}`;
