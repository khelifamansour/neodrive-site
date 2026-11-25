"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  allBatches, backgroundSupported, dropBatch, keepAwake, readVideoMeta, registerUploadWorker, startBackground, takeSharedFiles, uploadInPage, watchBackground,
  type JobState, type StoredBatch, type UploadJob,
} from "../../../lib/bg-upload";

type Item = {
  id: string; path: string; name: string; size: number; duration: number | null; width: number | null; height: number | null;
  posterUrl: string | null; status: "uploaded" | "analysing" | "analysed" | "error"; consent: boolean; has_client: boolean; tags: string[];
  analysis: Record<string, unknown> | null; error: string | null; created_at: string;
};
type Slot = { name: string; id?: string; path?: string; signedUrl?: string; bgUrl?: string | null; token?: string; poster?: { path: string; signedUrl: string }; ticket?: string; error?: string };
type Row = { key: string; name: string; size: number; status: JobState["status"] | "prep"; sent: number; error?: string; bg?: boolean };

const TUS = "https://tzlsdjzcxdjaatcpwqwn.storage.supabase.co/storage/v1/upload/resumable/sign";
const API = "/api/studio/library";
const BG_OFF = "nd_bg_off";
const bgOff = () => { try { return localStorage.getItem(BG_OFF) === "1"; } catch { return false; } };
const setBgOff = (v: boolean) => { try { if (v) localStorage.setItem(BG_OFF, "1"); else localStorage.removeItem(BG_OFF); } catch { /* privé */ } };
const mb = (n: number) => n >= 1073741824 ? `${(n / 1073741824).toFixed(2).replace(".", ",")} Go` : `${Math.max(1, Math.round(n / 1048576))} Mo`;
const dur = (s: number | null) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
const STATUS: Record<Item["status"], string> = { uploaded: "À analyser", analysing: "Analyse…", analysed: "Analysée", error: "Erreur" };

async function pool<T>(xs: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) { const k = i++; await fn(xs[k], k); } }));
}

export default function Bibliotheque() {
  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<"background" | "page" | null>(null);
  const [bgOk, setBgOk] = useState<boolean | null>(null);
  const [bgTotal, setBgTotal] = useState<{ sent: number; total: number } | null>(null);
  const [prep, setPrep] = useState("");
  const [failedBatches, setFailedBatches] = useState<StoredBatch[]>([]);
  const [install, setInstall] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [filter, setFilter] = useState<"all" | Item["status"]>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [batch, setBatch] = useState("");
  const jobsRef = useRef<Map<string, UploadJob>>(new Map());
  const codeRef = useRef("");

  const api = useCallback(async (body: Record<string, unknown>, pc = codeRef.current) => {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Réponse illisible du serveur" }));
    if (r.status === 401 && body.action !== "register") { setAuthed(false); throw new Error("Code incorrect"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, []);
  const load = useCallback(async (pc = codeRef.current) => { const j = await api({ action: "list" }, pc); setItems(j.items); setAuthed(true); }, [api]);

  const patchRow = (key: string, p: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...p } : r));

  // ───── envoi ─────
  const sendFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setErr(""); setInfo(""); setPrep(`Préparation de ${files.length} vidéo(s)…`);
    try {
      const init = await api({ action: "init", files: files.map(f => ({ name: f.name, size: f.size, type: f.type || "video/mp4" })) });
      const slots = init.files as Slot[];
      const ready: { file: File; slot: Required<Pick<Slot, "id" | "path" | "signedUrl" | "token" | "ticket">> & Slot }[] = [];
      const newRows: Row[] = [];
      slots.forEach((s, i) => {
        const f = files[i];
        if (s.error || !s.id) newRows.push({ key: `x${i}-${f.name}`, name: f.name, size: f.size, status: "error", sent: 0, error: s.error || "Refusée" });
        else { ready.push({ file: f, slot: s as never }); newRows.push({ key: s.id, name: f.name, size: f.size, status: "prep", sent: 0 }); }
      });
      setRows(rs => [...newRows, ...rs.filter(r => r.status !== "done")]);
      // Vignette + durée (lues sur le téléphone, rapide) puis tâches d'envoi.
      let n = 0;
      const jobs: UploadJob[] = new Array(ready.length);
      await pool(ready, 3, async ({ file, slot }, i) => {
        const m = await readVideoMeta(file).catch(() => ({ duration: null, width: null, height: null, poster: null }));
        let poster: string | null = null;
        if (m.poster && slot.poster) {
          const r = await fetch(slot.poster.signedUrl, { method: "PUT", headers: { "content-type": "image/jpeg", "x-upsert": "true" }, body: m.poster }).catch(() => null);
          if (r?.ok) poster = slot.poster.path;
        }
        jobs[i] = {
          key: slot.id, file, putUrl: slot.signedUrl, bgUrl: slot.bgUrl, contentType: file.type || "video/mp4",
          tus: { endpoint: TUS, token: slot.token, bucket: init.bucket, path: slot.path },
          register: { url: `${location.origin}${API}`, body: { action: "register", ticket: slot.ticket, duration: m.duration, width: m.width, height: m.height, poster } },
          refresh: async () => { const t = await api({ action: "retoken", ticket: slot.ticket }); return { putUrl: t.signedUrl, token: t.token }; },
        };
        jobsRef.current.set(slot.id, jobs[i]);
        patchRow(slot.id, { status: "queued" });
        setPrep(`Préparation… ${++n}/${ready.length}`);
      });
      setPrep("");
      if (!jobs.length) return;
      if (!bgOff() && await backgroundSupported()) {
        try {
          const id = `bib-${Date.now().toString(36)}`;
          await startBackground({ id, title: `NeoDrive : envoi de ${jobs.length} vidéo(s)`, jobs, page: "/studio/bibliotheque" });
          setMode("background");
          jobs.forEach(j => patchRow(j.key, { status: "uploading", bg: true }));
          setInfo("✅ Envoi lancé en arrière-plan : vous pouvez quitter la page, changer d’appli ou verrouiller le téléphone. Suivi dans la notification.");
          return;
        } catch (e) { console.warn("[bibliotheque] arrière-plan refusé", e); }
      }
      await sendInPage(jobs);
    } catch (e) { setErr((e as Error).message); setPrep(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const sendInPage = async (jobs: UploadJob[]) => {
    setMode("page");
    const lock = await keepAwake();
    try {
      await uploadInPage(jobs, { parallel: 3, onState: s => patchRow(s.key, { status: s.status, sent: s.sent, error: s.error, bg: false }) });
    } finally { lock.release(); }
    setMode(null);
    load().catch(() => null);
  };
  const sendInPageRef = useRef(sendInPage); sendInPageRef.current = sendInPage;
  const retryFailed = () => {
    const keys = rows.filter(r => r.status === "error").map(r => r.key);
    const jobs = keys.map(k => jobsRef.current.get(k)).filter((j): j is UploadJob => !!j);
    if (!jobs.length) { setInfo("Resélectionnez ces vidéos dans la galerie pour les renvoyer."); return; }
    jobs.forEach(j => patchRow(j.key, { status: "queued", error: undefined }));
    sendInPage(jobs).catch(e => setErr((e as Error).message));
  };

  // ───── démarrage ─────
  useEffect(() => {
    let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ }
    setCode(pc); codeRef.current = pc;
    load(pc).catch(() => setAuthed(false));
    registerUploadWorker().then(() => backgroundSupported()).then(ok => setBgOk(ok && !bgOff())).catch(() => setBgOk(false));
    const bip = (e: Event) => { e.preventDefault(); const ev = e as Event & { prompt: () => Promise<void> }; setInstall({ prompt: () => ev.prompt() }); };
    window.addEventListener("beforeinstallprompt", bip);
    return () => window.removeEventListener("beforeinstallprompt", bip);
  }, [load]);

  // Suivi des envois en arrière-plan (y compris lancés avant une fermeture de la page).
  useEffect(() => {
    if (!authed) return;
    let stop = () => {};
    watchBackground(p => {
      if (p.total) setBgTotal({ sent: p.sent, total: p.total });
      p.done.forEach(k => patchRow(k, { status: "done" }));
      p.failed.forEach(k => patchRow(k, { status: "error", error: "Envoi en arrière-plan échoué" }));
      if (p.result) {
        // Échec en arrière-plan : on renvoie dans la page les fichiers encore en mémoire ; si rien n'est passé, on n'utilise plus l'arrière-plan sur ce téléphone.
        if (p.failed.size && !p.done.size) { setBgOff(true); setBgOk(false); }
        const again = [...p.failed].map(k => jobsRef.current.get(k)).filter((j): j is UploadJob => !!j);
        if (again.length) { setInfo("L’envoi en arrière-plan a échoué : nouvel envoi dans la page, gardez l’écran allumé."); again.forEach(j => patchRow(j.key, { status: "queued", error: undefined })); sendInPageRef.current(again); }
        setBgTotal(null); setMode(m => again.length ? "page" : m === "background" ? null : m); load().catch(() => null); allBatches().then(bs => setFailedBatches(bs.filter(b => b.finished && Object.values(b.results || {}).some(v => v !== "done")))); }
    }).then(w => { stop = w.stop; }).catch(() => null);
    allBatches().then(async bs => {
      for (const b of bs) if (b.finished && !Object.values(b.results || {}).some(v => v !== "done")) await dropBatch(b.id);
      setFailedBatches(bs.filter(b => b.finished && Object.values(b.results || {}).some(v => v !== "done")));
      const running = bs.filter(b => !b.finished);
      if (running.length) setRows(rs => rs.length ? rs : running.flatMap(b => b.items.map(it => ({ key: it.key, name: it.name, size: it.size, status: "uploading" as const, sent: 0, bg: true }))));
    }).catch(() => null);
    return () => stop();
  }, [authed, load]);

  // Vidéos reçues par « Partager → NeoDrive Studio ».
  useEffect(() => {
    if (!authed) return;
    const q = new URLSearchParams(location.search).get("partage");
    if (!q) return;
    history.replaceState(null, "", "/studio/bibliotheque");
    if (q === "sanssw") { setInfo("Ouvrez d’abord cette page une fois (c’est fait), puis partagez à nouveau vos vidéos vers NeoDrive Studio."); return; }
    if (q === "erreur") { setErr("Le partage n’a pas pu être reçu. Réessayez ou choisissez les vidéos ici."); return; }
    takeSharedFiles().then(fs => { if (fs.length) sendFiles(fs); else setInfo("Aucune vidéo reçue par le partage."); });
  }, [authed, sendFiles]);

  const enter = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); codeRef.current = code; try { await load(code); try { sessionStorage.setItem("nd_pc", code); } catch { /* privé */ } } catch (x) { setErr((x as Error).message); } };
  const del = async (it: Item) => {
    if (!confirm(`Supprimer « ${it.name} » de la bibliothèque ?`)) return;
    try { await api({ action: "delete", id: it.id }); setItems(xs => xs.filter(x => x.id !== it.id)); } catch (e) { setErr((e as Error).message); }
  };
  const upd = (it: Item) => setItems(xs => xs.map(x => x.id === it.id ? { ...x, ...it } : x));
  const analyse = async (it: Item) => {
    setBusy(b => ({ ...b, [it.id]: true })); upd({ ...it, status: "analysing" }); setErr("");
    try { const j = await api({ action: "analyse", id: it.id }); upd(j.item); setSel(it.id); }
    catch (e) { setErr((e as Error).message); load().catch(() => null); }
    finally { setBusy(b => ({ ...b, [it.id]: false })); }
  };
  const analyseAll = async () => {
    setErr("");
    for (let round = 0; round < 60; round++) {
      setBatch(`Analyse en cours… (gardez la page ouverte, ou laissez faire l’analyse automatique)`);
      try { const j = await api({ action: "queue", max: 2 }); await load(); if (!j.remaining || !j.done.length) break; setBatch(`Analyse en cours… encore ${j.remaining}`); }
      catch (e) { setErr((e as Error).message); break; }
    }
    setBatch("");
  };
  const setFlag = async (it: Item, patch: Partial<Pick<Item, "consent" | "has_client">>) => {
    upd({ ...it, ...patch });
    try { const j = await api({ action: "update", id: it.id, ...patch }); if (j.item) upd(j.item); } catch (e) { setErr((e as Error).message); upd(it); }
  };
  const open = async (it: Item) => { try { const j = await api({ action: "get", id: it.id }); if (j.url) window.open(j.url, "_blank", "noopener"); } catch (e) { setErr((e as Error).message); } };

  if (authed === null) return <main className="s"><p className="muted">Chargement…</p><style jsx>{css}</style></main>;
  if (!authed) return <main className="s"><form className="login" onSubmit={enter}><span className="logo">N</span><h1>Bibliothèque vidéo</h1><p>Code d’accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus /><button>Entrer</button>{err ? <p className="err">{err}</p> : null}</form><style jsx>{css}</style></main>;

  const active = rows.filter(r => r.status !== "done" && r.status !== "error");
  const totalBytes = rows.reduce((s, r) => s + r.size, 0);
  const sentBytes = bgTotal ? bgTotal.sent : rows.reduce((s, r) => s + (r.status === "done" || r.status === "registering" ? r.size : r.sent), 0);
  const pct = bgTotal && bgTotal.total ? Math.round(bgTotal.sent / bgTotal.total * 100) : totalBytes ? Math.round(sentBytes / totalBytes * 100) : 0;
  const nDone = rows.filter(r => r.status === "done").length, nErr = rows.filter(r => r.status === "error").length;
  const shown = filter === "all" ? items : items.filter(i => i.status === filter);

  return <main className="s">
    <p className="nav"><a href="/studio/video">← Studio vidéo</a> · <a href="/studio/fabrique">🏭 Fabrique TikTok</a></p>
    <h1>Bibliothèque vidéo</h1>
    <p className="sub">Envoyez tous vos rushes d’un coup. L’IA les analysera ensuite pour fabriquer les vidéos TikTok.</p>

    <label className={`file${prep || active.length ? " dim" : ""}`}>
      <input type="file" multiple accept="video/*" onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ""; sendFiles(fs); }} />
      <b>＋ Choisir des vidéos</b><small>Plusieurs d’un coup depuis la galerie · jusqu’à 1 Go chacune</small>
    </label>
    {bgOk === true ? <p className="hint ok2">📶 L’envoi continue même si vous quittez la page ou verrouillez le téléphone.</p>
      : bgOk === false ? <p className="hint warn">🔆 {bgOff() ? "Envoi en arrière-plan désactivé après un échec" : "Ce navigateur ne sait pas envoyer en arrière-plan"} : <b>gardez l’écran allumé et la page ouverte</b> pendant l’envoi.{bgOff() ? <> <button className="link" onClick={() => { setBgOff(false); backgroundSupported().then(setBgOk); }}>Réessayer l’arrière-plan</button></> : null}</p> : null}
    {install ? <button className="ghost full" onClick={() => install.prompt().then(() => setInstall(null))}>📲 Installer « NeoDrive Studio » (pour partager depuis la galerie)</button> : null}

    {prep ? <div className="busy">{prep}<div className="bar pulse"><i /></div></div> : null}
    {err ? <p className="err">{err}</p> : null}
    {info ? <p className="ok">{info}</p> : null}

    {rows.length ? <section className="card">
      <div className="head"><b>Envoi {mode === "background" ? "en arrière-plan" : mode === "page" ? "en cours — gardez l’écran allumé" : ""}</b><span>{nDone}/{rows.length}{nErr ? ` · ${nErr} échec(s)` : ""}</span></div>
      <div className="bar big"><i style={{ width: `${pct}%` }} /></div>
      <p className="muted">{pct} % · {mb(sentBytes)} sur {mb(bgTotal?.total || totalBytes)}</p>
      {nErr ? <button className="ghost full" onClick={retryFailed}>↻ Renvoyer les échecs</button> : null}
      <div className="rows">{rows.map(r => <div key={r.key} className={`row ${r.status}`}>
        <div className="rn"><span>{r.name}</span><small>{mb(r.size)} · {r.status === "prep" ? "préparation" : r.status === "queued" ? (r.error || "en attente") : r.status === "uploading" ? (r.bg ? "en arrière-plan" : `${Math.round(r.sent / (r.size || 1) * 100)} %`) : r.status === "registering" ? "enregistrement" : r.status === "done" ? "✅ envoyée" : `❌ ${r.error || "échec"}`}</small></div>
        {!r.bg && r.status === "uploading" ? <div className="bar"><i style={{ width: `${Math.round(r.sent / (r.size || 1) * 100)}%` }} /></div> : null}
      </div>)}</div>
      {!active.length ? <button className="link" onClick={() => setRows([])}>Effacer cette liste</button> : null}
    </section> : null}

    {failedBatches.length ? <section className="card warnc">
      <b>Envois précédents incomplets</b>
      {failedBatches.map(b => <div key={b.id}><p className="muted">{new Date(b.created).toLocaleString("fr-FR")} : à resélectionner et renvoyer :</p><ul>{b.items.filter(it => b.results?.[it.key] !== "done").map(it => <li key={it.key}>{it.name} ({mb(it.size)})</li>)}</ul><button className="link" onClick={() => dropBatch(b.id).then(() => setFailedBatches(fb => fb.filter(x => x.id !== b.id)))}>Ignorer</button></div>)}
    </section> : null}

    <h2>Vidéos ({items.length})</h2>
    {items.some(i => i.status === "uploaded") ? <button className="go" disabled={!!batch} onClick={analyseAll}>🧠 Analyser les {items.filter(i => i.status === "uploaded").length} vidéo(s) en attente</button> : null}
    {batch ? <div className="busy">{batch}<div className="bar pulse"><i /></div></div> : null}
    <p className="muted">L’analyse se fait aussi automatiquement toutes les 20 minutes.</p>
    {(() => { const it = items.find(i => i.id === sel); if (!it || !it.analysis) return null; const a = it.analysis as Record<string, unknown> & { best_moments?: { start: number; end: number; why: string; kind: string }[]; pii?: { start: number; end: number; label: string; visual: boolean }[]; hooks?: string[]; scenes?: string[] };
      return <section className="card det" id="det">
        <div className="head"><b>{it.name}</b><button className="link" onClick={() => setSel(null)}>Fermer</button></div>
        <p>{String(a.summary || "")}</p>
        {a.scenes?.length ? <p className="chips">{a.scenes.map(x => <span key={x}>{x}</span>)}</p> : null}
        <p className="muted">Qualité {String(a.quality || "?")}/5 · {String(a.light || "")} · {String(a.setting || "")}</p>
        {a.best_moments?.length ? <><b>Meilleurs moments</b><ul>{a.best_moments.map((m, i) => <li key={i}><b>{dur(m.start) || "0:00"}–{dur(m.end)}</b> {m.why}</li>)}</ul></> : null}
        {a.hooks?.length ? <><b>Accroches</b><ul>{a.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul></> : null}
        {a.pii?.length ? <><b>🔒 Infos personnelles repérées (masquées au montage)</b><ul>{a.pii.map((m, i) => <li key={i}>{dur(m.start) || "0:00"} : {m.label}{m.visual ? " (image)" : ""}</li>)}</ul></> : null}
      </section>; })()}
    <div className="seg">{(["all", "uploaded", "analysed", "error"] as const).map(f => <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f === "all" ? "Toutes" : STATUS[f]}</button>)}</div>
    <div className="grid">{shown.map(it => <article key={it.id} className="vid">
      <button className="thumb" onClick={() => open(it)} aria-label={`Voir ${it.name}`}>{it.posterUrl ? <img src={it.posterUrl} alt="" loading="lazy" /> : <span>🎬</span>}{it.duration ? <em>{dur(it.duration)}</em> : null}</button>
      <div className="meta"><b title={it.name}>{it.name}</b><small>{mb(it.size)} · {new Date(it.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</small>
        <span className={`st ${it.status}`}>{busy[it.id] ? "Analyse…" : STATUS[it.status]}</span>
        <button className="x" onClick={() => del(it)} aria-label="Supprimer">🗑</button>
        {it.status === "analysed" ? <button className="mini" onClick={() => { setSel(it.id); setTimeout(() => document.getElementById("det")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Détails</button>
          : <button className="mini" disabled={!!busy[it.id] || it.status === "analysing"} onClick={() => analyse(it)}>{it.status === "error" ? "Réessayer" : "Analyser"}</button>}
        {it.status === "error" && it.error ? <small className="e">{it.error}</small> : null}
        <label className="cons"><input type="checkbox" checked={it.has_client} onChange={e => setFlag(it, { has_client: e.target.checked })} /> Client visible</label>
        {it.has_client ? <label className={`cons${it.consent ? " yes" : " no"}`}><input type="checkbox" checked={it.consent} onChange={e => setFlag(it, { consent: e.target.checked })} /> Accord du client</label> : null}
      </div>
    </article>)}</div>
    {!shown.length ? <p className="muted">Aucune vidéo pour l’instant.</p> : null}
    <style jsx>{css}</style>
  </main>;
}

const css = `.s{max-width:720px;margin:0 auto;padding:18px 16px 90px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;background:#fff;min-height:100vh;box-sizing:border-box}
.nav{margin:0 0 6px}.nav a{color:#f05a28;font-weight:800;text-decoration:none}
h1{font-size:30px;letter-spacing:-1px;margin:0}h2{font-size:20px;margin:18px 0 8px}.sub{color:#555;margin:4px 0 12px}
.login{display:grid;gap:12px;text-align:center;margin-top:40px}.login p{color:#666;margin:0}.logo{justify-self:center;display:grid;place-items:center;width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:30px}
input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}
button{font:inherit;cursor:pointer}.login button{padding:15px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:900;font-size:16px}
.file{position:relative;display:grid;gap:4px;padding:28px 18px;border:2px dashed #f0a07f;border-radius:18px;text-align:center;background:#fff7f2;font-size:19px}.file.dim{opacity:.85}.file input{position:absolute;inset:0;opacity:0;width:100%}.file small{color:#777;font-size:14px}
.hint{font-size:14px;border-radius:12px;padding:9px 12px;margin:8px 0}.ok2{background:#ecfdf3;color:#067647}.warn{background:#fffaeb;color:#93370d}
.ghost{padding:13px;border:1px solid #d4d7db;border-radius:14px;background:#fff;font-weight:800;font-size:15px;color:#111}.full{width:100%;margin:6px 0}
.busy{background:#fff7ed;border:1px solid #fde3c8;border-radius:14px;padding:12px;margin:8px 0}
.bar{height:8px;background:#f1f1f3;border-radius:9px;overflow:hidden;margin-top:6px}.bar.big{height:12px}.bar i{display:block;height:100%;background:#f05a28;transition:width .3s}.pulse i{width:35%;animation:p 1.4s infinite ease-in-out}@keyframes p{0%{margin-left:-35%}100%{margin-left:100%}}
.err{color:#b42318;font-weight:700;background:#fef3f2;padding:10px 12px;border-radius:12px}.ok{color:#067647;font-weight:700;background:#ecfdf3;padding:10px 12px;border-radius:12px}
.muted{color:#777;font-size:14px;margin:4px 0}
.card{border:1px solid #e5e7eb;border-radius:18px;padding:14px;margin:12px 0;display:grid;gap:6px}.warnc{background:#fffaeb;border-color:#fedf89}.warnc ul{margin:4px 0;padding-left:20px;font-size:14px}
.head{display:flex;justify-content:space-between;gap:8px}.head span{color:#555;font-weight:700;white-space:nowrap}
.rows{display:grid;gap:6px;max-height:50vh;overflow:auto}.row{border-bottom:1px solid #f2f2f2;padding:6px 0}.rn{display:flex;justify-content:space-between;gap:8px;font-size:14px}.rn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.rn small{white-space:nowrap;color:#666}.row.error small{color:#b42318}.row.done small{color:#067647}
.link{border:0;background:none;color:#666;text-decoration:underline;padding:6px 0;justify-self:start}
.seg{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.seg button{padding:9px 12px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800;font-size:14px;color:#111}.seg button.on{background:#111;color:#fff;border-color:#111}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.vid{border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;display:grid;background:#fff}
.thumb{position:relative;border:0;padding:0;background:#111;aspect-ratio:9/12;display:grid;place-items:center;color:#fff;font-size:34px;overflow:hidden}.thumb img{width:100%;height:100%;object-fit:cover}.thumb em{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;font-style:normal;padding:2px 6px;border-radius:6px;font-weight:700}
.meta{display:grid;grid-template-columns:1fr auto;gap:2px 6px;padding:8px;font-size:13px;align-items:center}.meta b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;grid-column:1/3}.meta small{color:#777;grid-column:1/3}
.st{justify-self:start;font-size:12px;font-weight:800;padding:3px 8px;border-radius:999px;background:#f2f4f7;color:#344054}.st.analysed{background:#ecfdf3;color:#067647}.st.analysing{background:#fff7ed;color:#b54708}.st.error{background:#fef3f2;color:#b42318}
.go{padding:14px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff8a00,#f05a28);color:#fff;font-weight:900;font-size:16px;width:100%;margin:4px 0}.go:disabled{opacity:.5}
.mini{grid-column:1/3;padding:9px 10px;border:1px solid #ddd;background:#fff;border-radius:10px;font-weight:800;font-size:13px;color:#111}.mini:disabled{opacity:.5}
.cons{grid-column:1/3;display:flex;gap:6px;align-items:center;font-size:12px;font-weight:700;color:#344054}.cons input{width:18px;height:18px;padding:0;margin:0}.cons.no{color:#b42318}.cons.yes{color:#067647}
.e{color:#b42318!important;font-size:11px}
.det ul{margin:4px 0 8px;padding-left:18px;font-size:14px;line-height:1.5}.det p{margin:2px 0}.chips{display:flex;flex-wrap:wrap;gap:4px}.chips span{background:#f2f4f7;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:700}
.x{border:1px solid #eee;background:#fff;border-radius:10px;min-width:40px;min-height:40px;font-size:16px}`;
