"use client";
import { useEffect, useState } from "react";

/** Onglet « Scripts » du Studio : l'IA écrit des scripts (face caméra, voix off) ; bibliothèque avec statut et vues pour apprendre ce qui marche. */
type Script = { title: string; hook: string; onscreen?: string; format?: string; shots?: string[]; face?: string; voiceover?: string; cta?: string; pinned?: string; caption?: string; why?: string };
type Saved = { id: number; created_at: string; context: string | null; script: Script; status: string; views: number | null; likes: number | null; comments: number | null; notes: string | null };
const ANGLES = [["libre", "✨ Au choix"], ["livraison", "🚚 Livraison du jour"], ["coulisses", "🔧 Coulisses remorque"], ["prix", "💶 Prix qui fait débattre"], ["question", "❓ Question client"], ["confiance", "🤝 Rassurer (arnaque ?)"]] as const;
const STATUS = ["idée", "tourné", "publié", "abandonné"];

const scriptText = (s: Script) => [
  `🎬 ${s.title}`, `Accroche (2 premières secondes) : ${s.hook}`, s.onscreen ? `Texte à l'écran : ${s.onscreen}` : "", s.format ? `Format : ${s.format}` : "",
  s.shots?.length ? `Plans à filmer :\n${s.shots.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
  s.face ? `À dire face caméra :\n${s.face}` : "", s.voiceover ? `Voix off :\n${s.voiceover}` : "", s.cta ? `Fin : ${s.cta}` : "",
  s.pinned ? `Commentaire à épingler : ${s.pinned}` : "", s.caption ? `Légende : ${s.caption}` : "",
].filter(Boolean).join("\n\n");

export default function Scripts({ code }: { code: string }) {
  const [angle, setAngle] = useState("libre"); const [ctx, setCtx] = useState(""); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const [fresh, setFresh] = useState<Script[]>([]); const [saved, setSaved] = useState<Saved[]>([]); const [open, setOpen] = useState<number | null>(null); const [copied, setCopied] = useState("");
  const api = async (body: object) => { const r = await fetch("/api/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async () => { try { const j = await api({ action: "script_list" }); setSaved(j.scripts); } catch (e) { setErr((e as Error).message) } };
  useEffect(() => { (async () => { try { const j = await api({ action: "script_list" }); setSaved(j.scripts); } catch (e) { setErr((e as Error).message) } })(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => { setErr(""); setFresh([]); setBusy("L’IA écrit 3 scripts… (environ 30 s)"); try { const j = await api({ action: "scripts", angle, context: ctx, count: 3 }); setFresh(j.scripts); } catch (e) { setErr((e as Error).message) } finally { setBusy("") } };
  const keep = async (s: Script, i: number) => { try { await api({ action: "script_save", script: s, context: ctx }); setFresh(f => f.filter((_, k) => k !== i)); await load(); } catch (e) { setErr((e as Error).message) } };
  const update = async (id: number, patch: Record<string, unknown>) => { setSaved(l => l.map(x => x.id === id ? { ...x, ...patch } as Saved : x)); try { await api({ action: "script_update", id, ...patch }); if (patch.delete) await load(); } catch (e) { setErr((e as Error).message) } };
  const copy = async (k: string, t: string) => { try { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1500) } catch { } };
  const speak = (t: string) => { try { const u = new SpeechSynthesisUtterance(t); u.lang = "fr-FR"; u.rate = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { setErr("Lecture vocale indisponible sur ce téléphone.") } };

  const card = (s: Script, key: string, actions: React.ReactNode) => <div className="card" key={key}>
    <small>{s.format || "script"}</small><b className="tt">{s.title}</b>
    <p className="hk">« {s.hook} »</p>
    {s.onscreen ? <p><small>Texte à l’écran</small><br />{s.onscreen}</p> : null}
    {s.shots?.length ? <><small>Plans à filmer</small><ol>{s.shots.map((x, i) => <li key={i}>{x}</li>)}</ol></> : null}
    {s.face ? <><small>À dire face caméra</small><p className="tx">{s.face}</p></> : null}
    {s.voiceover ? <><small>Voix off</small><p className="tx">{s.voiceover}</p></> : null}
    {s.cta ? <p><small>Fin</small><br />{s.cta}</p> : null}
    {s.pinned ? <p><small>Commentaire à épingler</small><br />{s.pinned}</p> : null}
    {s.why ? <p className="why">💡 {s.why}</p> : null}
    <div className="row">
      <button type="button" onClick={() => speak(`${s.hook}. ${s.face || s.voiceover || ""} ${s.cta || ""}`)}>▶️ Écouter</button>
      <button type="button" onClick={() => copy(key, scriptText(s))}>{copied === key ? "✅ Copié" : "📋 Copier le script"}</button>
      {s.caption ? <button type="button" onClick={() => copy(key + "c", s.caption!)}>{copied === key + "c" ? "✅ Copié" : "📋 Légende"}</button> : null}
      {actions}
    </div>
  </div>;

  return <div>
    <p className="muted">L’IA écrit des scripts à partir de ce qui marche sur ton compte (accroche sur un problème, prix choc, débat, coulisses). Note les vues de chaque vidéo publiée : l’IA s’en sert pour les scripts suivants.</p>
    <div className="chips">{ANGLES.map(([k, l]) => <button key={k} type="button" className={angle === k ? "on" : ""} onClick={() => setAngle(k)}>{l}</button>)}</div>
    <textarea value={ctx} onChange={e => setCtx(e.target.value)} rows={2} placeholder="Contexte du jour (facultatif) : ex. « Livraison à Ludon-Médoc, Mme Benoist, Confort rouge, 2 voitures sur la remorque »" />
    <button className="go" disabled={!!busy} onClick={generate}>{busy || "✍️ Écrire 3 scripts"}</button>
    {err ? <p className="err">{err}</p> : null}
    {fresh.map((s, i) => card(s, "n" + i, <button type="button" className="keep" onClick={() => keep(s, i)}>⭐ Garder</button>))}

    <h2>Bibliothèque ({saved.length})</h2>
    {saved.length ? null : <p className="muted">Garde un script pour le retrouver ici.</p>}
    {saved.map(x => <div key={x.id} className="lib">
      <div className="lh" onClick={() => setOpen(open === x.id ? null : x.id)}>
        <b>{x.script.title || x.script.hook}</b>
        <span className={`st st-${x.status}`}>{x.status}{x.views != null ? ` · ${x.views.toLocaleString("fr-FR")} vues` : ""}</span>
      </div>
      {open === x.id ? <>
        {card(x.script, "s" + x.id, null)}
        <div className="edit">
          <label>Statut<select value={x.status} onChange={e => update(x.id, { status: e.target.value })}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Vues<input type="number" inputMode="numeric" defaultValue={x.views ?? ""} onBlur={e => update(x.id, { views: e.target.value })} /></label>
          <label>Commentaires<input type="number" inputMode="numeric" defaultValue={x.comments ?? ""} onBlur={e => update(x.id, { comments: e.target.value })} /></label>
          <label className="wide">Note (ce qui a marché ou pas)<input defaultValue={x.notes ?? ""} onBlur={e => update(x.id, { notes: e.target.value })} /></label>
          <button type="button" className="del" onClick={() => { if (confirm("Supprimer ce script ?")) update(x.id, { delete: true }); }}>Supprimer</button>
        </div>
      </> : null}
    </div>)}
    <style jsx>{`
      .muted{color:#666;font-size:14px;margin:0 0 10px}
      textarea{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}
      .go{padding:15px;border:0;border-radius:14px;color:#fff;font-weight:900;font-size:16px;width:100%;background:linear-gradient(135deg,#ff8a00,#f05a28);margin-top:10px}
      .go:disabled{opacity:.55}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
      .chips button{padding:9px 12px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800;font-size:14px}
      .chips button.on{background:#111;color:#fff;border-color:#111}
      .err{color:#b42318;font-weight:700}
      h2{font-size:20px;margin:26px 0 8px}
      .card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin:12px 0;background:#fff;display:grid;gap:6px}
      .card small{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
      .tt{font-size:17px}.hk{font-size:17px;font-weight:700;margin:4px 0;color:#c2410c}
      .tx{white-space:pre-wrap;margin:2px 0 6px;line-height:1.5}
      ol{margin:2px 0 6px;padding-left:20px}p{margin:2px 0}
      .why{background:#fffbeb;border-radius:10px;padding:8px}
      .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
      .row button,.edit button{padding:9px 12px;border-radius:10px;border:1px solid #d4d7dd;background:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
      .row .keep{background:#111;color:#fff;border-color:#111}
      .lib{border:1px solid #e5e7eb;border-radius:12px;margin:8px 0;padding:10px 12px;background:#fafafa}
      .lh{display:flex;justify-content:space-between;gap:10px;align-items:center;cursor:pointer}
      .st{font-size:12px;font-weight:700;padding:3px 8px;border-radius:99px;background:#eee;white-space:nowrap}
      .st-publié{background:#dcfce7;color:#166534}.st-tourné{background:#dbeafe;color:#1e40af}.st-abandonné{background:#f3f4f6;color:#9ca3af}
      .edit{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:end}
      .edit label{display:grid;gap:4px;font-size:12px;color:#555}.edit .wide{grid-column:1/-1}
      .edit select,.edit input{padding:9px;border:1px solid #d4d7dd;border-radius:10px;font:inherit;width:100%;box-sizing:border-box}
      .edit .del{grid-column:1/-1;color:#b91c1c}
      @media (max-width:420px){.edit{grid-template-columns:1fr 1fr}}
    `}</style>
  </div>;
}
