"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import c from "../giga/giga.module.css";
import { LITIGE_ACCEPT, LITIGE_MAX_FILE, LITIGE_STATUTS, PIECE_CATEGORIES } from "../../lib/litiges";

type L = {
  id: number; ref: string; created_at: string; updated_at: string; titre: string; adverse_partie: string | null; adverse_adresse: string | null;
  montant_reclame: number | string | null; statut: string; avocat: string | null; resume: string | null; prochaine_action: string | null;
  prochaine_echeance: string | null; notes: string | null; litige_pieces?: { count: number }[];
};
type P = {
  id: number; created_at: string; label: string; categorie: string; date_piece: string | null; path: string; name: string; size: number | null;
  mime: string | null; extracted_at: string | null; extracted_chars: number; extract_error: string | null;
};
type Up = { name: string; state: "attente" | "envoi" | "ok" | "erreur"; error?: string };

const ST_BG: Record<string, string> = { "en cours": "#fff4d6", "mise en demeure": "#fde8e8", "amiable": "#e8f0fe", "procédure": "#f3e8fd", "clos gagné": "#e7f6ec", "clos perdu": "#f1f1f1", "clos accord": "#e7f6ec" };
const CAT_ICON: Record<string, string> = { "courrier avocat": "⚖️", "facture": "🧾", "bon de livraison": "🚚", "e-mail": "✉️", "photo": "📷", "plainte-médical": "🏥", "autre": "📄" };
const dfr = (d?: string | null) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : "—";
const eur = (v: unknown) => v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const mo = (n?: number | null) => n ? n > 1024 * 1024 ? `${(n / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko` : "";
const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/litiges/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const label = (t: string) => <span className={c.small} style={{ display: "block", margin: "8px 0 4px" }}>{t}</span>;

/** Litiges : un dossier par litige, ses pièces (déposées depuis le téléphone) et leur transcription pour analyse. Fondateur seulement. */
export default function Litiges() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<L[]>([]); const [sel, setSel] = useState<number | null>(() => typeof window === "undefined" ? null : Number(location.hash.slice(1)) || null);

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ litiges: L[] }>({ action: "list" }, p); setRows(j.litiges); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => {
    const onHash = () => setSel(Number(location.hash.slice(1)) || null);
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état n'est modifié qu'après la réponse du serveur
  useEffect(() => { load().catch(() => null); }, [load]);
  const open = (id: number | null) => { location.hash = id ? String(id) : ""; setSel(id); window.scrollTo(0, 0); };

  const create = async () => {
    const titre = prompt("Titre du litige (ex. « Garage X / impayé véhicule ») :")?.trim();
    if (!titre) return;
    try { const r = await api<{ id: number }>({ action: "create", titre }); await load(); open(r.id); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>⚖️ Litiges</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  if (sel) return <Detail id={sel} onBack={() => { open(null); load().catch(() => null); }} />;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><button className={`${c.btn} ${c.btnBrand}`} onClick={create}>+ Nouveau litige</button></div>
    <h1 style={{ margin: "0 0 4px" }}>⚖️ Litiges</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Un dossier par litige : toutes les pièces (courriers, factures, lettres de voiture, e-mails, photos, plainte…), lues automatiquement pour l’analyse.</p>
    {msg ? <p className={c.msg}>{msg}</p> : null}
    {!rows.length ? <p className={c.empty}>Aucun litige.</p> : null}
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map(l => <button key={l.id} onClick={() => open(l.id)} className={c.card} style={{ textAlign: "left", font: "inherit", cursor: "pointer", color: "inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <b style={{ fontSize: 17 }}>{l.titre}</b>
          <span className={c.pill} style={{ background: ST_BG[l.statut] || "#eee" }}>{l.statut}</span>
        </div>
        <div className={c.small} style={{ marginTop: 6, lineHeight: 1.5 }}>
          {l.ref} · {eur(l.montant_reclame)} · 📎 {l.litige_pieces?.[0]?.count ?? 0} pièce(s)
          {l.prochaine_action ? <><br />➡️ {l.prochaine_action.slice(0, 140)}{l.prochaine_action.length > 140 ? "…" : ""}</> : null}
          {l.prochaine_echeance ? <><br />📅 Échéance : <b>{dfr(l.prochaine_echeance)}</b></> : null}
        </div>
      </button>)}
    </div>
  </div></main>;
}

function Detail({ id, onBack }: { id: number; onBack: () => void }) {
  const [l, setL] = useState<L | null>(null); const [form, setForm] = useState<Record<string, string>>({});
  const [pieces, setPieces] = useState<P[]>([]); const [msg, setMsg] = useState(""); const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState("autre"); const [ups, setUps] = useState<Up[]>([]);
  const [edit, setEdit] = useState<number | null>(null); const [texts, setTexts] = useState<Record<number, string>>({}); const [busy, setBusy] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null); const camRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const j = await api<{ litige: L; pieces: P[] }>({ action: "get", id });
      setL(j.litige); setPieces(j.pieces);
      setForm(f => Object.keys(f).length ? f : Object.fromEntries(Object.entries(j.litige).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])));
      return j.pieces;
    } catch (e) { setMsg("❌ " + (e as Error).message); return null; }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Transcriptions en cours : on actualise toutes les 6 s (au plus 4 min).
  const pending = pieces.some(p => !p.extracted_at);
  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const t = setInterval(async () => { const ps = await load(); if (!ps?.some(p => !p.extracted_at) || Date.now() - started > 240_000) clearInterval(t); }, 6000);
    return () => clearInterval(t);
  }, [pending, load]);

  const save = async (extra?: Record<string, string>) => {
    setSaving(true); setMsg("");
    try { await api({ action: "update", id, ...form, ...extra }); await load(); setMsg("✅ Enregistré."); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setSaving(false); }
  };

  const upload = async (list: FileList | null) => {
    const files = Array.from(list || []); if (!files.length) return;
    setMsg("");
    const tooBig = files.filter(f => f.size > LITIGE_MAX_FILE);
    const ok = files.filter(f => f.size > 0 && f.size <= LITIGE_MAX_FILE);
    const status: Up[] = [...ok.map(f => ({ name: f.name, state: "attente" as const })), ...tooBig.map(f => ({ name: f.name, state: "erreur" as const, error: "plus de 25 Mo" }))];
    setUps(status);
    if (!ok.length) return;
    const set = (i: number, u: Partial<Up>) => setUps(s => s.map((x, k) => k === i ? { ...x, ...u } : x));
    try {
      const init = await api<{ bucket: string; uploads: { path: string; token: string }[] }>({ action: "upload_init", id, files: ok.map(f => ({ name: f.name, type: f.type, size: f.size })) });
      const { supabase } = await import("../../lib/supabase");
      let next = 0;
      const worker = async () => {
        while (next < ok.length) {
          const i = next++; const f = ok[i]; const u = init.uploads[i];
          set(i, { state: "envoi" });
          try {
            const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "application/octet-stream" });
            if (error) throw new Error(error.message);
            await api({ action: "upload_done", id, path: u.path, name: f.name, size: f.size, mime: f.type, categorie: cat });
            set(i, { state: "ok" });
          } catch (e) { set(i, { state: "erreur", error: (e as Error).message }); }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    } catch (e) { setMsg("❌ " + (e as Error).message); setUps(s => s.map(x => x.state === "attente" ? { ...x, state: "erreur", error: "non envoyé" } : x)); }
    if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = "";
    await load();
  };

  const view = async (p: P) => {
    const w = window.open("", "_blank"); // ouvert tout de suite (sinon bloqué sur iPhone)
    try { const j = await api<{ url: string }>({ action: "piece_link", id, piece_id: p.id }); if (w) w.location.href = j.url; else location.href = j.url; }
    catch (e) { w?.close(); setMsg("❌ " + (e as Error).message); }
  };
  const toggleText = async (p: P) => {
    if (texts[p.id] !== undefined) { setTexts(t => { const n = { ...t }; delete n[p.id]; return n; }); return; }
    try { const j = await api<{ text: string }>({ action: "piece_text", id, piece_id: p.id }); setTexts(t => ({ ...t, [p.id]: j.text || "(pas encore de texte)" })); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };
  const reread = async (p: P) => {
    setBusy(p.id); setMsg("");
    try { const r = await api<{ ok: boolean; chars?: number }>({ action: "piece_extract", id, piece_id: p.id }); setMsg(r.chars ? `✅ « ${p.label} » relue (${r.chars.toLocaleString("fr-FR")} caractères).` : "Relue."); setTexts(t => { const n = { ...t }; delete n[p.id]; return n; }); await load(); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); }
  };
  const savePiece = async (p: P, el: HTMLFormElement) => {
    const fd = new FormData(el);
    try { await api({ action: "piece_update", id, piece_id: p.id, label: fd.get("label"), categorie: fd.get("categorie"), date_piece: fd.get("date_piece") }); setEdit(null); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };
  const del = async (p: P) => {
    if (!confirm(`Supprimer définitivement la pièce « ${p.label} » ?`)) return;
    try { await api({ action: "piece_delete", id, piece_id: p.id }); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };

  if (!l) return <main className={c.page}><div className={c.wrap}><button className={c.back} style={{ border: 0, background: "none", padding: 0 }} onClick={onBack}>← Litiges</button><p className={c.muted}>{msg || "Chargement…"}</p></div></main>;
  const F = (k: string, t: string, rows = 0, type = "text") => <label style={{ display: "block" }}>{label(t)}
    {rows ? <textarea className={c.input} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} rows={rows} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
      : <input className={c.input} style={{ width: "100%", boxSizing: "border-box" }} type={type} inputMode={k === "montant_reclame" ? "decimal" : undefined} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />}
  </label>;
  const busyUp = ups.some(u => u.state === "attente" || u.state === "envoi");

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><button className={c.back} style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }} onClick={onBack}>← Litiges</button><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load()}>Actualiser</button></div>
    <div className={c.small}>{l.ref} · ouvert le {dfr(l.created_at)}</div>
    <h1 style={{ margin: "2px 0 8px", fontSize: 24 }}>{l.titre}</h1>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select className={c.input} style={{ width: "auto", background: ST_BG[form.statut] || "#fff" }} value={form.statut} onChange={e => { setForm(f => ({ ...f, statut: e.target.value })); save({ statut: e.target.value }); }}>
        {LITIGE_STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <b>{eur(l.montant_reclame)}</b>
    </div>
    {msg ? <p className={c.msg}>{msg}</p> : null}

    <div className={c.card} style={{ marginTop: 14, borderColor: "#f05a28" }}>
      <b>➡️ Prochaine action</b>
      {F("prochaine_action", "Quoi", 3)}
      {F("prochaine_echeance", "Échéance", 0, "date")}
      <button className={`${c.btn} ${c.btnBrand}`} style={{ marginTop: 10 }} disabled={saving} onClick={() => save()}>{saving ? "…" : "Enregistrer"}</button>
    </div>

    <div style={{ margin: "16px 0", display: "grid", gap: 8 }}>
      <input ref={fileRef} type="file" multiple accept={LITIGE_ACCEPT} style={{ display: "none" }} onChange={e => upload(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => upload(e.target.files)} />
      <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center", fontSize: 18, padding: "18px 16px" }} disabled={busyUp} onClick={() => fileRef.current?.click()}>{busyUp ? "Envoi en cours…" : "📎 Ajouter des pièces"}</button>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`${c.btn} ${c.btnGhost}`} style={{ flex: 1, justifyContent: "center" }} disabled={busyUp} onClick={() => camRef.current?.click()}>📷 Prendre une photo</button>
        <select className={c.input} style={{ flex: 1, minWidth: 0 }} value={cat} onChange={e => setCat(e.target.value)} aria-label="Catégorie des pièces ajoutées">
          <option value="autre">Catégorie : auto</option>
          {PIECE_CATEGORIES.filter(x => x !== "autre").map(x => <option key={x} value={x}>{CAT_ICON[x]} {x}</option>)}
        </select>
      </div>
      <span className={c.small}>PDF, photos, captures, Word, e-mails (.eml), texte · 25 Mo max par fichier · plusieurs à la fois. Chaque pièce est ensuite lue automatiquement (date, intitulé et catégorie remplis si possible).</span>
      {ups.length ? <ul className={c.small} style={{ margin: 0, paddingLeft: 18 }}>{ups.map((u, i) => <li key={i}>{u.state === "ok" ? "✅" : u.state === "erreur" ? "❌" : u.state === "envoi" ? "⏳" : "•"} {u.name}{u.error ? ` — ${u.error}` : ""}</li>)}</ul> : null}
    </div>

    <h2 style={{ fontSize: 18, margin: "18px 0 8px" }}>Pièces ({pieces.length})</h2>
    {!pieces.length ? <p className={c.empty} style={{ padding: 20 }}>Aucune pièce pour l’instant.</p> : null}
    <div style={{ display: "grid", gap: 8 }}>
      {pieces.map(p => <div key={p.id} className={c.card} style={{ padding: "12px 14px" }}>
        {edit === p.id ? <form onSubmit={e => { e.preventDefault(); savePiece(p, e.currentTarget); }} style={{ display: "grid", gap: 6 }}>
          <input className={c.input} name="label" defaultValue={p.label} />
          <div style={{ display: "flex", gap: 6 }}>
            <select className={c.input} name="categorie" defaultValue={p.categorie} style={{ flex: 1, minWidth: 0 }}>{PIECE_CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <input className={c.input} name="date_piece" type="date" defaultValue={p.date_piece || ""} style={{ flex: 1, minWidth: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className={`${c.btn} ${c.btnBrand}`}>Enregistrer</button>
            <button type="button" className={`${c.btn} ${c.btnGhost}`} onClick={() => setEdit(null)}>Annuler</button>
            <button type="button" className={`${c.btn} ${c.btnGhost}`} style={{ color: "#b42318" }} onClick={() => del(p)}>Supprimer</button>
          </div>
        </form> : <>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 15, wordBreak: "break-word" }}>{CAT_ICON[p.categorie] || "📄"} {p.label}</b>
            <span className={c.small} style={{ whiteSpace: "nowrap" }}>{p.date_piece ? dfr(p.date_piece) : "sans date"}</span>
          </div>
          <div className={c.small} style={{ marginTop: 3, wordBreak: "break-word" }}>
            {p.categorie} · {p.name} {mo(p.size)} · {!p.extracted_at ? "⏳ lecture en cours…" : p.extract_error ? `⚠️ ${p.extract_error}` : `📝 lu (${p.extracted_chars.toLocaleString("fr-FR")} car.)`}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "8px 12px", fontSize: 14 }} onClick={() => view(p)}>Voir</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "8px 12px", fontSize: 14 }} onClick={() => toggleText(p)}>{texts[p.id] !== undefined ? "Masquer le texte" : "Texte"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "8px 12px", fontSize: 14 }} onClick={() => setEdit(p.id)}>Modifier</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "8px 12px", fontSize: 14 }} disabled={busy === p.id} onClick={() => reread(p)}>{busy === p.id ? "Lecture…" : "Relancer la lecture"}</button>
          </div>
          {texts[p.id] !== undefined ? <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, background: "#faf8f4", borderRadius: 10, padding: 10, margin: "8px 0 0", maxHeight: 360, overflow: "auto" }}>{texts[p.id]}</pre> : null}
        </>}
      </div>)}
    </div>

    <details className={c.card} style={{ marginTop: 18 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Fiche du litige (parties, avocat, résumé)</summary>
      {F("titre", "Titre")}
      {F("montant_reclame", "Montant réclamé (€)")}
      {F("adverse_partie", "Partie adverse", 3)}
      {F("adverse_adresse", "Adresse de la partie adverse", 2)}
      {F("avocat", "Avocat", 2)}
      {F("resume", "Résumé des faits", 8)}
      <button className={`${c.btn} ${c.btnBrand}`} style={{ marginTop: 10 }} disabled={saving} onClick={() => save()}>{saving ? "…" : "Enregistrer"}</button>
    </details>

    <div className={c.card} style={{ marginTop: 12 }}>
      <b>🗒️ Notes</b>
      {F("notes", "", 6)}
      <button className={`${c.btn} ${c.btnBrand}`} style={{ marginTop: 10 }} disabled={saving} onClick={() => save()}>{saving ? "…" : "Enregistrer les notes"}</button>
    </div>
  </div></main>;
}
