"use client";
import { useEffect, useState } from "react";
import s from "../planificateur/planif.module.css";
import { DOC_TYPES, VERSIONS } from "../../lib/shipments";

type Row = Record<string, any>;
const STATUS = ["en production", "en mer", "arrivé au port", "dédouané", "dépoté", "terminé"];
const FIELDS: [string, string, string?][] = [["name", "Nom du dossier"], ["port", "Port d'arrivée"], ["supplier", "Fournisseur"], ["vessel", "Navire / voyage"], ["bl_number", "N° connaissement (B/L)"], ["containers", "Conteneur(s) / scellés"], ["vehicles", "Nb de véhicules", "number"], ["loaded_at", "Date de chargement", "date"], ["eta", "Arrivée prévue (ETA)", "date"], ["arrived_at", "Arrivée réelle", "date"], ["forwarder_email", "E-mail du transitaire", "email"]];

export default function Conteneurs() {
  const [code, setCode] = useState(""); const [ships, setShips] = useState<Row[] | null>(null); const [docs, setDocs] = useState<Row[]>([]); const [msg, setMsg] = useState(""); const [open, setOpen] = useState<number | null>(null); const [busy, setBusy] = useState("");
  const api = async (body: object, pc = code) => { const r = await fetch("/api/conteneurs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await api({ action: "list" }, pc); setShips(j.ships); setDocs(j.docs); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = async (id: number | null, ship: Row) => { try { await api({ action: "save", id, ship }); setMsg("✅ Enregistré"); load(); } catch (e) { setMsg((e as Error).message) } };
  const upload = async (id: number, form: HTMLFormElement) => { setBusy("up" + id); const fd = new FormData(form); fd.append("passcode", code); fd.append("shipment_id", String(id)); const r = await fetch("/api/conteneurs", { method: "POST", body: fd }); const j = await r.json().catch(() => null); setBusy(""); setMsg(j?.ok ? `✅ ${j.saved.length} document(s) classé(s)` : "❌ Erreur d'envoi"); form.reset(); load(); };
  const openDoc = async (path: string) => { const j = await api({ action: "url", path }); if (j.url) window.open(j.url, "_blank"); };
  const send = async (sh: Row) => { const to = prompt("E-mail du transitaire", sh.forwarder_email || ""); if (!to) return; setBusy("send" + sh.id); try { const j = await api({ action: "send", id: sh.id, to }); setMsg(`✅ Dossier envoyé (${j.sent} documents)${j.missing.length ? ` — manquants : ${j.missing.join(", ")}` : ""}`); load(); } catch (e) { setMsg((e as Error).message) } setBusy(""); };
  const share = (sh: Row) => { const url = `${window.location.origin}/depot/${sh.share_token}`; navigator.clipboard?.writeText(url).catch(() => null); setMsg(`🔗 Lien de dépôt copié (usine / transitaire, FR-EN-中文) : ${url}`); };

  if (!ships) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Dossiers conteneurs</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  return <main className={s.page}>
    <div className={s.top}><div><h1>📦 Dossiers conteneurs</h1><p>Un coffre-fort par arrivage : documents, suivi et envoi au transitaire.</p></div><button className={s.ghost} onClick={() => save(null, { name: prompt("Nom du dossier (ex. Le Havre – EVER ACE – nov. 2026)") || "", status: "en mer" })}>+ Nouveau dossier</button></div>
    {msg ? <p style={{ background: "#f0fdf4", padding: 10, borderRadius: 10, wordBreak: "break-all" }}>{msg}</p> : null}
    {ships.map(sh => { const d = docs.filter(x => x.shipment_id === sh.id); const req = DOC_TYPES.filter(t => t.required); const ok = req.filter(t => d.some(x => x.doc_type === t.key)).length; const days = sh.eta ? Math.round((new Date(sh.eta).getTime() - Date.now()) / 86400000) : null;
      return <section key={sh.id} className={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", cursor: "pointer" }} onClick={() => setOpen(open === sh.id ? null : sh.id)}>
          <div><h2>{sh.name}</h2><p className={s.muted}>{sh.port || "?"} · {sh.vehicles ?? "?"} véhicules · B/L {sh.bl_number || "—"} · {sh.containers || ""}</p></div>
          <div style={{ textAlign: "right" }}><b>{sh.status}</b><br /><small>{sh.eta ? `Arrivée ${new Date(sh.eta).toLocaleDateString("fr-FR")}${days != null ? ` (J${days >= 0 ? "-" : "+"}${Math.abs(days)})` : ""}` : "ETA ?"}</small><br /><small style={{ color: ok === req.length ? "#15803d" : "#b45309" }}>Documents obligatoires : {ok}/{req.length}</small>{sh.sent_at ? <><br /><small>📨 envoyé au transitaire le {new Date(sh.sent_at).toLocaleDateString("fr-FR")}</small></> : null}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{req.map(t => <span key={t.key} style={{ fontSize: 12.5, padding: "4px 9px", borderRadius: 999, background: d.some(x => x.doc_type === t.key) ? "#dcfce7" : "#fee2e2" }}>{d.some(x => x.doc_type === t.key) ? "✅" : "❌"} {t.fr.split(" (")[0]}</span>)}</div>
        {open === sh.id ? <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            {FIELDS.map(([k, l, type]) => <label key={k} className={s.field}>{l}<input type={type || "text"} defaultValue={sh[k] ?? ""} onBlur={e => String(e.target.value) !== String(sh[k] ?? "") && save(sh.id, { [k]: type === "number" ? Number(e.target.value) || null : e.target.value })} /></label>)}
            <label className={s.field}>Statut<select defaultValue={sh.status} onChange={e => save(sh.id, { status: e.target.value })}>{STATUS.map(x => <option key={x}>{x}</option>)}</select></label>
          </div>
          <label className={s.field}>Notes<textarea rows={2} defaultValue={sh.notes || ""} onBlur={e => e.target.value !== (sh.notes || "") && save(sh.id, { notes: e.target.value })} style={{ font: "inherit", padding: 10, borderRadius: 12, border: "1px solid #d4d7db" }} /></label>
          {DOC_TYPES.map(t => { const list = d.filter(x => x.doc_type === t.key); if (!list.length && !t.required) return null; return <div key={t.key}><b>{list.length ? "✅" : "❌"} {t.fr}</b>
            {list.map(x => <div key={x.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, padding: "4px 0 4px 22px" }}>
              <a href="#" onClick={e => { e.preventDefault(); openDoc(x.file_path); }}>📄 {x.file_name}</a>{x.ref ? <small>· {x.ref}</small> : null}
              <select value={x.version} onChange={async e => { await api({ action: "doc_update", id: x.id, version: e.target.value }); load(); }} style={{ width: "auto", padding: 4 }}>{VERSIONS.map(v => <option key={v}>{v}</option>)}</select>
              <select value={x.doc_type} onChange={async e => { await api({ action: "doc_update", id: x.id, doc_type: e.target.value }); load(); }} style={{ width: "auto", padding: 4 }}>{DOC_TYPES.map(o => <option key={o.key} value={o.key}>{o.fr.split(" (")[0]}</option>)}</select>
              <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={async () => { if (confirm("Supprimer ce document ?")) { await api({ action: "doc_delete", id: x.id }); load(); } }}>✕</button>
              {x.ai_note ? <small style={{ flexBasis: "100%", color: "#5b6573" }}>{x.ai_note}</small> : null}
            </div>)}</div>; })}
          <form onSubmit={e => { e.preventDefault(); upload(sh.id, e.currentTarget); }} style={{ display: "grid", gap: 8, background: "#fafaf9", padding: 12, borderRadius: 12 }}>
            <b>Ajouter des documents (un ou plusieurs)</b>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select name="doc_type" defaultValue="autre">{DOC_TYPES.map(o => <option key={o.key} value={o.key}>{o.key === "autre" ? "Classement automatique (IA)" : o.fr}</option>)}</select>
              <select name="version" defaultValue="originale">{VERSIONS.map(v => <option key={v}>{v}</option>)}</select>
            </div>
            <input type="file" name="files" multiple required />
            <button className={s.primary} disabled={busy === "up" + sh.id}>{busy === "up" + sh.id ? "Classement…" : "Ajouter"}</button>
          </form>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className={s.primary} disabled={busy === "send" + sh.id} onClick={() => send(sh)}>📨 Envoyer le dossier au transitaire</button>
            <button className={s.ghost} onClick={() => share(sh)}>🔗 Lien de dépôt (usine / transitaire)</button>
          </div>
        </> : null}
      </section>; })}
  </main>;
}
