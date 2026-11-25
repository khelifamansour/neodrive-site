"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";

type Word = { w: string; s: number; e: number };
type Mask = { id: string; start: number; end: number; label: string; kind: string; source: "ia" | "manuel" | "instruction"; on: boolean };
type Overlay = { id: string; text: string; start: number; end: number | null; position: "top" | "center" | "bottom" };
type Plan = {
  cuts: { start: number; end: number; label: string }[]; masks: Mask[]; maskMode: "beep" | "silence"; speed: number; subtitles: boolean; overlays: Overlay[];
  frame: "auto" | "blur" | "crop"; originalVolume: number;
  voiceover: { enabled: boolean; scenario: string; text: string; voice: string; audioPath: string | null; audioText: string | null; duck: number };
  music: { enabled: boolean; volume: number };
};
type Render = { path: string; created_at: string; size: number; duration: number; note?: string | null };
type Project = { id: string; title: string; created_at: string; source: { duration: number; width: number; height: number; hasAudio: boolean; name: string }; transcript: { text: string; words: Word[] } | null; detected: boolean; plan: Plan; history: Plan[]; renders: Render[] };
type Proposal = { undo: boolean; plan?: Plan; changes: string[]; message: string; unsupported: string | null; duration?: number };
type ListRender = { name: string; created_at: string; size: number; url: string | null; project: string };
type ListProject = { id: string; title: string; created_at: string; duration: number; renders: number };

const TUS = "https://tzlsdjzcxdjaatcpwqwn.storage.supabase.co/storage/v1/upload/resumable/sign";
const MAX_S = 90, MAX_MB = 200;
const SCEN = [["livraison", "🚚 Livraison client"], ["temoignage", "⭐ Témoignage"], ["modele", "🚗 Présentation du modèle"], ["libre", "✍️ Libre"]] as const;
const VOICES = [["coral", "Femme chaleureuse"], ["nova", "Femme dynamique"], ["ash", "Homme posé"], ["onyx", "Homme grave"]] as const;
const KIND: Record<string, string> = { adresse: "🏠", ville: "📍", telephone: "📞", nom: "👤", plaque: "🚘", autre: "🔒" };
const t1 = (s: number) => s.toFixed(1).replace(".", ",") + " s";
const outDur = (p: Plan, D: number) => { const cs = [...p.cuts].sort((a, b) => a.start - b.start); let t = 0, keep = 0; for (const c of cs) { if (c.start > t) keep += c.start - t; t = Math.max(t, c.end); } keep += Math.max(0, D - t); return keep / p.speed; };

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

export default function StudioVideo() {
  const [code, setCode] = useState(""); const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(""); const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  const [pct, setPct] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [list, setList] = useState<{ projects: ListProject[]; renders: ListRender[] }>({ projects: [], renders: [] });
  const [instr, setInstr] = useState(""); const [prop, setProp] = useState<Proposal | null>(null);
  const [listening, setListening] = useState(false);
  const [scenario, setScenario] = useState("livraison"); const [voPrompt, setVoPrompt] = useState(""); const [voText, setVoText] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [manual, setManual] = useState({ start: "", end: "" });
  const [title, setTitle] = useState({ text: "", position: "top" as Overlay["position"] });
  const [result, setResult] = useState<{ url: string; downloadUrl: string; note: string | null; size: number; duration: number } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const rec = useRef<SpeechRec | null>(null);

  const api = useCallback(async (body: Record<string, unknown>, pc = code) => {
    const r = await fetch("/api/studio/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: r.status === 504 ? "Le serveur a mis trop de temps : réessayez avec une vidéo plus courte." : "Réponse illisible du serveur" }));
    if (r.status === 401) { setAuthed(false); throw new Error("Code incorrect"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, [code]);
  const loadList = useCallback(async (pc = code) => { const j = await api({ action: "list" }, pc); setList({ projects: j.projects, renders: j.renders }); setAuthed(true); }, [api, code]);

  useEffect(() => {
    let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* navigation privée */ }
    setCode(pc);
    loadList(pc).catch(() => setAuthed(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enter = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); try { await loadList(code); try { sessionStorage.setItem("nd_pc", code); } catch { /* privé */ } } catch (x) { setErr((x as Error).message); } };

  const step = async (label: string, fn: () => Promise<void>) => { setErr(""); setInfo(""); setBusy(label); try { await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(""); setPct(0); } };
  const openProject = (p: Project, url?: string | null) => { setProject(p); if (url !== undefined) setSrcUrl(url); setVoText(p.plan.voiceover.text); setScenario(p.plan.voiceover.scenario || "livraison"); setProp(null); setResult(null); };

  const upload = (file: File) => step("Préparation de l’envoi…", async () => {
    if (file.size > MAX_MB * 1048576) throw new Error(`Vidéo trop lourde : ${MAX_MB} Mo maximum.`);
    const dur = await new Promise<number>(res => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => { res(v.duration || 0); URL.revokeObjectURL(v.src); }; v.onerror = () => res(0); v.src = URL.createObjectURL(file); });
    if (dur > MAX_S + 1) throw new Error(`Vidéo de ${Math.round(dur)} s : ${MAX_S} s maximum. Raccourcissez-la dans la galerie du téléphone puis recommencez.`);
    const init = await api({ action: "init", name: file.name, size: file.size, type: file.type });
    setBusy("Envoi de la vidéo… 0 %");
    await new Promise<void>((resolve, reject) => {
      const up = new tus.Upload(file, {
        endpoint: TUS, retryDelays: [0, 3000, 5000, 10000, 20000], headers: { "x-signature": init.token }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, chunkSize: 6 * 1024 * 1024,
        metadata: { bucketName: init.bucket, objectName: init.path, contentType: file.type || "video/mp4", cacheControl: "3600" },
        onProgress: (a, t) => { const p = t ? Math.round(a / t * 100) : 0; setPct(p); setBusy(`Envoi de la vidéo… ${p} %`); },
        onError: e => reject(new Error("L’envoi a échoué, vérifiez votre connexion. " + String(e.message || "").slice(0, 80))),
        onSuccess: () => resolve(),
      });
      up.start();
    });
    setPct(0); setBusy("Transcription de la parole… (30 s à 1 min)");
    const c = await api({ action: "create", id: init.id, path: init.path, name: file.name, size: file.size, title: file.name.replace(/\.[^.]+$/, "") });
    openProject(c.project, c.sourceUrl);
    setBusy("Recherche des infos personnelles…");
    const d = await api({ action: "detect", id: init.id });
    openProject(d.project);
    setInfo(d.found ? `🔒 ${d.found} passage(s) sensible(s) repéré(s) : vérifiez-les ci-dessous.` : "✅ Aucune info personnelle repérée. Vous pouvez en ajouter une à la main.");
    loadList().catch(() => null);
  });

  const detect = () => step("Recherche des infos personnelles…", async () => { const d = await api({ action: "detect", id: project!.id }); openProject(d.project); setInfo(d.found ? `🔒 ${d.found} passage(s) sensible(s) repéré(s).` : "✅ Aucune info personnelle repérée."); });
  const reopen = (id: string) => step("Ouverture…", async () => { const j = await api({ action: "get", id }); openProject(j.project, j.sourceUrl); setVoiceUrl(j.voiceUrl); window.scrollTo({ top: 0, behavior: "smooth" }); });
  const save = (plan: Plan) => { if (!project) return; const id = project.id; setProject({ ...project, plan }); api({ action: "save", id, plan }).then(j => setProject(j.project)).catch(e => setErr((e as Error).message)); };
  const patch = (x: Partial<Plan>) => project && save({ ...project.plan, ...x });
  const undo = () => step("Annulation…", async () => { const j = await api({ action: "undo", id: project!.id }); openProject(j.project); setInfo("↩️ Dernière modification annulée."); });
  const seek = (t: number) => { const v = video.current; if (!v) return; v.currentTime = Math.max(0, t); v.play().catch(() => null); };
  const now = () => Math.round((video.current?.currentTime || 0) * 10) / 10;

  const addManual = () => {
    if (!project) return; const s = Number(manual.start.replace(",", ".")), e = Number(manual.end.replace(",", "."));
    if (!(s >= 0) || !(e > s)) { setErr("Indiquez un début et une fin valides (en secondes)."); return; }
    save({ ...project.plan, masks: [...project.plan.masks, { id: Math.random().toString(36).slice(2, 9), start: s, end: Math.min(e, project.source.duration), label: "Passage ajouté à la main", kind: "autre", source: "manuel", on: true }] });
    setManual({ start: "", end: "" });
  };
  const addTitle = () => { if (!project || !title.text.trim()) return; save({ ...project.plan, overlays: [...project.plan.overlays, { id: Math.random().toString(36).slice(2, 9), text: title.text.trim(), start: 0, end: null, position: title.position }] }); setTitle({ ...title, text: "" }); };

  const dictate = () => {
    if (listening) { rec.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!C) { setInfo("🎤 Dictée non disponible ici : utilisez le micro du clavier du téléphone."); return; }
    const r = new C(); r.lang = "fr-FR"; r.interimResults = false; r.continuous = false;
    r.onresult = e => { const t = Array.from(e.results).map(x => x[0].transcript).join(" "); setInstr(v => (v ? v + " " : "") + t); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  };
  const propose = () => step("L’IA prépare les changements…", async () => { setProp(null); const j = await api({ action: "instruction", id: project!.id, text: instr }); setProp(j); });
  const apply = (andRender: boolean) => step("Application…", async () => {
    if (!prop) return;
    const j = await api(prop.undo ? { action: "apply", id: project!.id, undo: true } : { action: "apply", id: project!.id, plan: prop.plan });
    openProject(j.project); setInstr(""); setInfo("✅ Modification appliquée.");
    if (andRender) await doRender(j.project);
  });

  const writeScript = () => step("L’IA écrit la voix off…", async () => { const j = await api({ action: "voice_script", id: project!.id, scenario, prompt: voPrompt }); setVoText(j.text); setVoiceUrl(null); });
  const listen = () => step("Création de la voix…", async () => { const j = await api({ action: "voice_tts", id: project!.id, voiceover: { ...project!.plan.voiceover, text: voText, scenario, enabled: true } }); openProject(j.project); setVoiceUrl(j.voiceUrl); });
  const saveVoice = (enabled: boolean) => project && save({ ...project.plan, voiceover: { ...project.plan.voiceover, text: voText, scenario, enabled: enabled && !!voText.trim() } });

  const doRender = async (p: Project) => {
    setBusy("Création de la vidéo TikTok… (1 à 4 min, gardez la page ouverte)"); setResult(null);
    if (voText !== p.plan.voiceover.text) await api({ action: "save", id: p.id, plan: { ...p.plan, voiceover: { ...p.plan.voiceover, text: voText, scenario } } });
    const j = await api({ action: "render", id: p.id });
    openProject(j.project); setResult({ url: j.url, downloadUrl: j.downloadUrl, note: j.note, size: j.size, duration: j.duration });
    loadList().catch(() => null);
  };
  const render = () => step("Création de la vidéo TikTok…", () => doRender(project!));

  if (authed === null) return <main className="s"><p className="muted">Chargement…</p><style jsx>{css}</style></main>;
  if (!authed) return <main className="s"><form className="login" onSubmit={enter}><span className="logo">N</span><h1>Studio vidéo</h1><p>Code d’accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus /><button>Entrer</button>{err ? <p className="err">{err}</p> : null}</form><style jsx>{css}</style></main>;

  const plan = project?.plan; const D = project?.source.duration || 0;
  const words = project?.transcript?.words || [];
  const wordClass = (w: Word) => {
    if (!plan) return "";
    if (plan.cuts.some(c => w.s < c.end && w.e > c.start)) return "cut";
    const m = plan.masks.find(m => w.s < m.end && w.e > m.start);
    return m ? (m.on ? "mask" : "maskoff") : "";
  };

  return <main className="s">
    <p className="nav"><a href="/studio">← Studio</a> · <a href="/studio/bibliotheque">📚 Bibliothèque vidéo</a></p>
    <h1>Studio vidéo</h1>
    <p className="sub">Vidéo de livraison prête pour TikTok : infos personnelles masquées, sous-titres, voix off, format 9:16.</p>
    <p className="limits">📏 Limites : vidéo de <b>{MAX_S} s maximum</b>, <b>{MAX_MB} Mo maximum</b> (mp4 ou mov). Le rendu prend 1 à 4 minutes.</p>

    {!project ? <label className="file"><input type="file" accept="video/mp4,video/quicktime,video/*" disabled={!!busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} /><b>＋ Choisir une vidéo</b><small>Filmée au téléphone, 15 à 90 secondes</small></label>
      : <div className="row"><button className="ghost" disabled={!!busy} onClick={() => { setProject(null); setSrcUrl(null); setResult(null); setProp(null); setVoiceUrl(null); }}>＋ Nouvelle vidéo</button></div>}

    {busy ? <div className="busy"><b>{busy}</b>{pct ? <div className="bar"><i style={{ width: pct + "%" }} /></div> : <div className="bar pulse"><i /></div>}</div> : null}
    {err ? <p className="err">{err}</p> : null}
    {info ? <p className="ok">{info}</p> : null}

    {project && plan ? <>
      <div className="card">
        <input className="title" value={project.title} onChange={e => setProject({ ...project, title: e.target.value })} onBlur={() => api({ action: "save", id: project.id, plan, title: project.title }).catch(() => null)} />
        <small className="muted">Durée d’origine {t1(D)} · vidéo finale ≈ {t1(outDur(plan, D))} · {project.source.width}×{project.source.height}</small>
        {srcUrl ? <video ref={video} src={srcUrl} controls playsInline preload="metadata" className="player" /> : null}
      </div>

      <div className="card">
        <h2>🔒 Infos personnelles</h2>
        <p className="muted">Touchez un passage pour l’écouter. Dans la vidéo finale, le son des passages « Masqué » est remplacé par un bip (ou du silence).</p>
        <div className="seg">{([["beep", "🔔 Bip 1 kHz"], ["silence", "🤫 Silence"]] as const).map(([k, l]) => <button key={k} className={plan.maskMode === k ? "on" : ""} onClick={() => patch({ maskMode: k })}>{l}</button>)}</div>
        {plan.masks.length ? plan.masks.map(m => <div key={m.id} className={"mask-row" + (m.on ? "" : " off")}>
          <button className="lab" onClick={() => seek(m.start - 0.5)}><span>{KIND[m.kind] || "🔒"} {m.label}</span><small>{t1(m.start)} → {t1(m.end)} · {m.source === "ia" ? "repéré par l’IA" : m.source === "manuel" ? "ajouté à la main" : "instruction"}</small></button>
          <button className={"tog" + (m.on ? " on" : "")} onClick={() => save({ ...plan, masks: plan.masks.map(x => x.id === m.id ? { ...x, on: !x.on } : x) })}>{m.on ? "Masqué" : "Audible"}</button>
          {m.source !== "ia" ? <button className="x" aria-label="Supprimer" onClick={() => save({ ...plan, masks: plan.masks.filter(x => x.id !== m.id) })}>✕</button> : null}
        </div>) : <p className="muted">Aucun passage masqué.</p>}
        {words.length ? <button className="link" disabled={!!busy} onClick={detect}>🔍 Relancer la recherche automatique</button> : null}
        <div className="manual">
          <b>Ajouter un passage à masquer</b>
          <div className="two">
            <label>Début (s)<input inputMode="decimal" value={manual.start} onChange={e => setManual({ ...manual, start: e.target.value })} placeholder="ex. 12,4" /><button className="mini" onClick={() => setManual({ ...manual, start: String(now()) })}>⏱ Position actuelle</button></label>
            <label>Fin (s)<input inputMode="decimal" value={manual.end} onChange={e => setManual({ ...manual, end: e.target.value })} placeholder="ex. 14" /><button className="mini" onClick={() => setManual({ ...manual, end: String(now()) })}>⏱ Position actuelle</button></label>
          </div>
          <button className="dark" onClick={addManual}>＋ Masquer ce passage</button>
        </div>
      </div>

      <div className="card">
        <h2>📝 Transcription</h2>
        {words.length ? <p className="tr">{words.map((w, i) => <span key={i} className={wordClass(w)} onClick={() => seek(w.s)}>{w.w} </span>)}</p> : <p className="muted">Pas de parole détectée.</p>}
        <p className="legend"><span className="mask">masqué</span> <span className="maskoff">repéré mais audible</span> <span className="cut">coupé</span></p>
      </div>

      <div className="card instr">
        <h2>✂️ Instruction de montage</h2>
        <p className="muted">Écrivez ou dictez ce que vous voulez, en français : « coupe les 3 premières secondes », « enlève le passage où je dis bonjour », « mets le bip sur le nom du village », « accélère un peu », « ajoute un titre en haut : Livraison dans l’Yonne », « mets la musique plus basse », « annule la dernière modif ».</p>
        <textarea rows={3} value={instr} onChange={e => setInstr(e.target.value)} placeholder="Votre instruction…" />
        <div className="row">
          <button className={"ghost" + (listening ? " rec" : "")} onClick={dictate}>{listening ? "⏹ Arrêter" : "🎤 Dicter"}</button>
          <button className="go" disabled={!!busy || instr.trim().length < 3} onClick={propose}>Proposer les changements</button>
        </div>
        {prop ? <div className="prop">
          {prop.message ? <p><b>{prop.message}</b></p> : null}
          {prop.changes.length ? <ul>{prop.changes.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="muted">Aucun changement à appliquer.</p>}
          {prop.unsupported ? <p className="warn">ℹ️ {prop.unsupported}</p> : null}
          {prop.duration ? <p className="muted">Vidéo finale ≈ {t1(prop.duration)}</p> : null}
          {prop.changes.length ? <div className="row"><button className="go" disabled={!!busy} onClick={() => apply(true)}>✅ Appliquer et créer la vidéo</button><button className="ghost" disabled={!!busy} onClick={() => apply(false)}>Appliquer seulement</button></div> : null}
          <button className="link" onClick={() => setProp(null)}>Ignorer</button>
        </div> : null}
        {project.history.length ? <button className="ghost full" disabled={!!busy} onClick={undo}>↩️ Annuler la dernière modification</button> : null}
      </div>

      <div className="card">
        <h2>🎛️ Réglages</h2>
        <div className="opt"><span>💬 Sous-titres (mots masqués remplacés par ***)</span><button className={"tog" + (plan.subtitles ? " on" : "")} onClick={() => patch({ subtitles: !plan.subtitles })}>{plan.subtitles ? "Oui" : "Non"}</button></div>
        <div className="opt col"><span>🖼️ Cadrage 9:16</span><div className="seg">{([["auto", "Automatique"], ["blur", "Fond flou"], ["crop", "Plein écran"]] as const).map(([k, l]) => <button key={k} className={plan.frame === k ? "on" : ""} onClick={() => patch({ frame: k })}>{l}</button>)}</div></div>
        <div className="opt col"><span>⏩ Vitesse</span><div className="seg">{[1, 1.15, 1.25, 1.5].map(v => <button key={v} className={plan.speed === v ? "on" : ""} onClick={() => patch({ speed: v })}>×{String(v).replace(".", ",")}</button>)}</div></div>
        <div className="opt"><span>🎵 Musique de fond NeoDrive</span><button className={"tog" + (plan.music.enabled ? " on" : "")} onClick={() => patch({ music: { ...plan.music, enabled: !plan.music.enabled } })}>{plan.music.enabled ? "Oui" : "Non"}</button></div>
        {plan.music.enabled ? <label className="range">Volume musique {Math.round(plan.music.volume * 100)} %<input type="range" min={0} max={0.6} step={0.05} value={plan.music.volume} onChange={e => setProject({ ...project, plan: { ...plan, music: { ...plan.music, volume: Number(e.target.value) } } })} onPointerUp={() => save(project.plan)} onTouchEnd={() => save(project.plan)} /></label> : null}
        {plan.cuts.length ? <div className="list"><b>Passages coupés</b>{plan.cuts.map((c, i) => <div key={i} className="li"><span>✂️ {t1(c.start)} → {t1(c.end)} {c.label}</span><button className="x" onClick={() => patch({ cuts: plan.cuts.filter((_, k) => k !== i) })}>✕</button></div>)}</div> : null}
        <div className="list"><b>Textes à l’écran</b>
          {plan.overlays.map(o => <div key={o.id} className="li"><span>🔤 « {o.text} » · {o.position === "top" ? "haut" : o.position === "center" ? "centre" : "bas"} · {t1(o.start)} → {o.end === null ? "fin" : t1(o.end)}</span><button className="x" onClick={() => patch({ overlays: plan.overlays.filter(x => x.id !== o.id) })}>✕</button></div>)}
          <input value={title.text} onChange={e => setTitle({ ...title, text: e.target.value })} placeholder="ex. Livraison dans l’Yonne" />
          <div className="seg">{([["top", "En haut"], ["center", "Au centre"], ["bottom", "En bas"]] as const).map(([k, l]) => <button key={k} className={title.position === k ? "on" : ""} onClick={() => setTitle({ ...title, position: k })}>{l}</button>)}</div>
          <button className="dark" disabled={!title.text.trim()} onClick={addTitle}>＋ Ajouter ce texte (toute la vidéo)</button>
        </div>
      </div>

      <div className="card">
        <h2>🎙️ Voix off</h2>
        <div className="seg wrap">{SCEN.map(([k, l]) => <button key={k} className={scenario === k ? "on" : ""} onClick={() => setScenario(k)}>{l}</button>)}</div>
        {scenario === "libre" ? <textarea rows={2} value={voPrompt} onChange={e => setVoPrompt(e.target.value)} placeholder="Ce que la voix doit dire, ex. « remercier Martine et parler de la livraison partout en France »" /> : null}
        <button className="dark" disabled={!!busy} onClick={writeScript}>✍️ Écrire le texte avec l’IA</button>
        <textarea rows={5} value={voText} onChange={e => setVoText(e.target.value)} onBlur={() => voText !== plan.voiceover.text && saveVoice(plan.voiceover.enabled)} placeholder="Texte de la voix off (25 secondes maximum, environ 60 mots). Vous pouvez le modifier." />
        <small className="muted">{voText.trim() ? voText.trim().split(/\s+/).length : 0} mots · ≈ {Math.round((voText.trim() ? voText.trim().split(/\s+/).length : 0) / 2.5)} s</small>
        <div className="seg wrap">{VOICES.map(([k, l]) => <button key={k} className={plan.voiceover.voice === k ? "on" : ""} onClick={() => save({ ...plan, voiceover: { ...plan.voiceover, text: voText, voice: k } })}>{l}</button>)}</div>
        <button className="ghost full" disabled={!!busy || !voText.trim()} onClick={listen}>🔊 Écouter la voix</button>
        {voiceUrl && plan.voiceover.audioText === voText ? <audio src={voiceUrl} controls className="audio" /> : null}
        <div className="opt"><span>Ajouter la voix off à la vidéo (son d’origine baissé à {Math.round(plan.voiceover.duck * 100)} %)</span><button className={"tog" + (plan.voiceover.enabled ? " on" : "")} disabled={!voText.trim()} onClick={() => saveVoice(!plan.voiceover.enabled)}>{plan.voiceover.enabled ? "Oui" : "Non"}</button></div>
      </div>

      <button className="go big" disabled={!!busy} onClick={render}>🎬 Créer la vidéo TikTok</button>
      {result ? <div className="card res">
        <h2>✅ Vidéo prête</h2>
        {result.note ? <p className="warn">{result.note}</p> : null}
        <video src={result.url} controls playsInline className="player" />
        <a className="go big dl" href={result.downloadUrl}>⬇️ Télécharger ({Math.round(result.size / 1048576)} Mo · {t1(result.duration)})</a>
        <small className="muted">Enregistrée aussi dans « Mes vidéos » ci-dessous.</small>
      </div> : null}
    </> : null}

    <div className="card">
      <h2>🎞️ Mes vidéos</h2>
      {list.renders.length ? list.renders.map(r => <div key={r.name} className="li"><span>{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {list.projects.find(p => p.id === r.project)?.title || "Vidéo"} · {Math.round(r.size / 1048576)} Mo</span>{r.url ? <a className="mini" href={r.url} target="_blank" rel="noopener">Voir</a> : null}</div>) : <p className="muted">Aucune vidéo créée pour l’instant.</p>}
      {list.projects.length ? <><b className="sp">Reprendre un montage</b>{list.projects.map(p => <div key={p.id} className="li"><span>{p.title} · {t1(p.duration)}</span><button className="mini" disabled={!!busy} onClick={() => reopen(p.id)}>Ouvrir</button></div>)}</> : null}
    </div>
    <style jsx>{css}</style>
  </main>;
}

const css = `.s{max-width:620px;margin:0 auto;padding:18px 14px 90px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;background:#fff}
.nav{margin:0 0 6px}.nav a{color:#f05a28;font-weight:800;text-decoration:none}
h1{font-size:32px;letter-spacing:-1px;margin:0}h2{font-size:20px;margin:0 0 8px}.sub{color:#555;margin:4px 0 8px}
.limits{background:#f4f4f5;border-radius:12px;padding:10px 12px;font-size:14px;margin:0 0 12px}
.login{display:grid;gap:12px;text-align:center;margin-top:40px}.login p{color:#666;margin:0}.logo{justify-self:center;display:grid;place-items:center;width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:30px}
input,textarea{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px;background:#fff;color:#111}
textarea{margin:8px 0}button,.go,.dl{font:inherit;cursor:pointer}
.login button,.go,.dark{padding:15px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:900;font-size:16px;width:100%}
.go{background:linear-gradient(135deg,#ff8a00,#f05a28)}.big{font-size:18px;padding:18px;margin:6px 0 12px;display:block;text-align:center;text-decoration:none;box-sizing:border-box}
.go:disabled,.dark:disabled,.ghost:disabled{opacity:.5}
.ghost{padding:14px;border:1px solid #d4d7db;border-radius:14px;background:#fff;font-weight:800;font-size:15px;color:#111}.ghost.rec{background:#fee4e2;border-color:#f04438}.full{width:100%;margin-top:10px}
.row{display:flex;gap:8px;margin:8px 0}.row>*{flex:1}
.file{position:relative;display:grid;gap:4px;padding:26px 18px;border:2px dashed #c9ccd1;border-radius:18px;text-align:center;margin-bottom:10px;background:#fafafa;font-size:18px}.file input{position:absolute;inset:0;opacity:0}.file small{color:#777;font-size:14px}
.busy{background:#fff7ed;border:1px solid #fde3c8;border-radius:14px;padding:12px;margin:8px 0}.bar{height:8px;background:#fde3c8;border-radius:9px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:#f05a28;transition:width .3s}.pulse i{width:35%;animation:p 1.4s infinite ease-in-out}@keyframes p{0%{margin-left:-35%}100%{margin-left:100%}}
.err{color:#b42318;font-weight:700;background:#fef3f2;padding:10px 12px;border-radius:12px}.ok{color:#067647;font-weight:700;background:#ecfdf3;padding:10px 12px;border-radius:12px}.warn{color:#93370d;background:#fffaeb;padding:10px 12px;border-radius:12px;font-weight:600}
.muted{color:#777;font-size:14px}
.card{border:1px solid #e5e7eb;border-radius:18px;padding:14px;background:#fff;margin:12px 0;display:grid;gap:8px}
.title{font-weight:800;font-size:18px;border:0;padding:4px 0;border-bottom:1px dashed #ddd;border-radius:0}
.player{width:100%;max-height:70vh;border-radius:12px;background:#000}.audio{width:100%}
.seg{display:flex;gap:6px}.seg.wrap{flex-wrap:wrap}.seg button{flex:1;padding:11px 10px;border:1px solid #ddd;background:#fff;border-radius:12px;font-weight:800;font-size:14px;color:#111;min-height:46px}.seg button.on{background:#111;color:#fff;border-color:#111}
.mask-row{display:flex;gap:8px;align-items:stretch;border:1px solid #fecdca;background:#fef3f2;border-radius:14px;padding:6px}.mask-row.off{background:#f9fafb;border-color:#e5e7eb}
.lab{flex:1;text-align:left;border:0;background:none;display:grid;gap:2px;padding:6px;color:#111}.lab span{font-weight:800}.lab small{color:#666}
.tog{min-width:92px;min-height:46px;border:1px solid #d0d5dd;border-radius:12px;background:#fff;font-weight:900;color:#344054}.tog.on{background:#f05a28;border-color:#f05a28;color:#fff}.tog:disabled{opacity:.5}
.x{width:46px;min-height:46px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;font-weight:900;color:#666}
.manual{display:grid;gap:8px;border-top:1px solid #eee;padding-top:10px;margin-top:4px}.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.two label{display:grid;gap:4px;font-size:14px;font-weight:700}
.mini{padding:9px 10px;border:1px solid #ddd;background:#fff;border-radius:10px;font-weight:800;font-size:13px;color:#111;text-decoration:none;white-space:nowrap}
.tr{line-height:1.9;font-size:16px;margin:0}.tr span{cursor:pointer;border-radius:4px}.mask{background:#f04438;color:#fff;padding:1px 3px}.maskoff{background:#fde68a;padding:1px 3px}.cut{text-decoration:line-through;color:#aaa}.legend{font-size:13px;display:flex;gap:10px;flex-wrap:wrap;margin:0}
.instr{border-color:#fde3c8;background:#fffdfa}.prop{border:1px solid #e5e7eb;border-radius:14px;padding:10px 12px;background:#fff}.prop ul{margin:6px 0;padding-left:20px;line-height:1.6}
.link{border:0;background:none;color:#666;text-decoration:underline;padding:6px 0}
.opt{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:700}.opt.col{flex-direction:column;align-items:stretch}
.range{display:grid;gap:6px;font-weight:700;font-size:14px}.range input{padding:0}
.list{display:grid;gap:6px;border-top:1px solid #eee;padding-top:10px}.li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f2f2f2;font-size:14px}.sp{margin-top:10px}
.res{border-color:#abefc6;background:#f6fef9}`;
