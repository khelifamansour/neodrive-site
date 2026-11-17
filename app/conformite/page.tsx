"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import c from "../giga/giga.module.css";
import { supabase } from "../../lib/supabase";
import { CATEGORIES, ORGANISMES, STATUTS, type ComplianceDoc, type ComplianceRequest, type HistoryEntry } from "../../lib/conformite";
import { Unauthorized, api, rememberCode, storedCode } from "./client";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string | null) => d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
const daysLeft = (d?: string | null) => d ? Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000) : null;
const ST_BG: Record<string, string> = { a_faire: "#fff4d6", envoye: "#e8f0fe", valide: "#e7f6ec", refuse: "#fde8e7" };
const kb = (n?: number | null) => n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`) : "";
const empty = (): Partial<ComplianceRequest> => ({ organisme: "Revolut", objet: "", demande: "", date_demande: today(), date_limite: "", statut: "a_faire", reponse: "", notes: "", history: [] });

export default function ConformitePage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<ComplianceRequest[]>([]); const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [edit, setEdit] = useState<Partial<ComplianceRequest> | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [up, setUp] = useState({ categorie: "autre", titre: "", description: "", date_doc: today(), request_id: "" });

  const load = useCallback(async (pc = storedCode()) => {
    try { const j = await api<{ requests: ComplianceRequest[]; docs: ComplianceDoc[] }>({ action: "list" }, pc); setReqs(j.requests); setDocs(j.docs); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  const saveReq = async (r: Partial<ComplianceRequest>) => {
    setBusy(true); setMsg("");
    try { await api({ action: "req_save", request: r }); setEdit(null); await load(); setMsg("✅ Enregistré."); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const addHistory = async (r: ComplianceRequest, sens: HistoryEntry["sens"]) => {
    const texte = prompt(sens === "recu" ? "Collez le message reçu :" : "Collez le message envoyé :"); if (!texte) return;
    await saveReq({ ...r, history: [...(r.history || []), { date: today(), sens, texte }], statut: sens === "envoye" && r.statut === "a_faire" ? "envoye" : r.statut });
  };
  const openDoc = async (id: number, download = false) => {
    try { const j = await api<{ url: string }>({ action: "doc_url", id, download }); window.open(j.url, "_blank"); } catch (e) { setMsg((e as Error).message); }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return; setBusy(true); setMsg("");
    try {
      for (const f of Array.from(files)) {
        if (f.size > 30 * 1048576) throw new Error(`${f.name} dépasse 30 Mo.`);
        const init = await api<{ bucket: string; path: string; token: string }>({ action: "doc_init", name: f.name });
        const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(init.path, init.token, f, { contentType: f.type || "application/octet-stream" });
        if (error) throw new Error("Envoi impossible : " + error.message);
        await api({ action: "doc_save", path: init.path, mime: f.type, size: f.size, categorie: up.categorie, titre: up.titre || f.name, description: up.description, date_doc: up.date_doc, request_id: up.request_id });
      }
      setUp({ ...up, titre: "", description: "" }); await load(); setMsg(`✅ ${files.length} document(s) ajouté(s).`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const delDoc = async (id: number) => { if (!confirm("Supprimer ce document ?")) return; try { await api({ action: "doc_delete", id }); await load(); } catch (e) { setMsg((e as Error).message); } };
  const linkDoc = async (d: ComplianceDoc, request_id: string) => { try { await api({ action: "doc_update", ...d, id: d.id, request_id }); await load(); } catch (e) { setMsg((e as Error).message); } };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(code.trim()); rememberCode(code.trim()); } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🛡️ Conformité</h1><p className={c.muted}>Code d’accès NeoDrive.</p>
    <input className={c.input} type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  const field = { display: "grid", gap: 4, fontSize: 14, fontWeight: 600 } as const;
  const todo = reqs.filter(r => r.statut === "a_faire" || r.statut === "envoye");

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}>
      <a href="/organisation" className={c.back}>← Organisation</a>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/conformite/presentation" className={`${c.btn} ${c.btnBrand}`}>📄 Présentation de l’activité</Link>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setEdit(empty())}>＋ Nouvelle demande</button>
      </div>
    </div>
    <h1 style={{ margin: "14px 0 4px" }}>🛡️ Conformité</h1>
    <p className={c.muted}>Gardez ici la trace de chaque demande d’une banque ou d’un organisme (Revolut, douane, URSSAF, impôts…), les réponses envoyées et les documents justificatifs.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}

    {todo.length ? <div className={c.card} style={{ background: "#fff7ed", borderColor: "#fdba74", marginTop: 12 }}>
      <b>⏰ À traiter :</b> {todo.map(r => { const n = daysLeft(r.date_limite); return <div key={r.id} style={{ marginTop: 4 }}>• {r.organisme} — {r.objet} {r.date_limite ? <b style={{ color: n !== null && n <= 7 ? "#b42318" : undefined }}>(avant le {fmt(r.date_limite)}{n !== null ? `, ${n < 0 ? "dépassé" : `${n} jour(s)`}` : ""})</b> : null}</div>; })}
    </div> : null}

    {edit ? <section className={c.card} style={{ marginTop: 14, display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>{edit.id ? "Modifier la demande" : "Nouvelle demande"}</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={field}>Organisme<select className={c.input} value={edit.organisme} onChange={e => setEdit({ ...edit, organisme: e.target.value })}>{ORGANISMES.map(o => <option key={o}>{o}</option>)}</select></label>
        <label style={field}>Date de la demande<input className={c.input} type="date" value={edit.date_demande || ""} onChange={e => setEdit({ ...edit, date_demande: e.target.value })} /></label>
        <label style={field}>Date limite<input className={c.input} type="date" value={edit.date_limite || ""} onChange={e => setEdit({ ...edit, date_limite: e.target.value })} /></label>
        <label style={field}>Statut<select className={c.input} value={edit.statut} onChange={e => setEdit({ ...edit, statut: e.target.value })}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <label style={field}>Objet<input className={c.input} value={edit.objet || ""} onChange={e => setEdit({ ...edit, objet: e.target.value })} placeholder="Ex. : demande de justificatifs" /></label>
      <label style={field}>Texte de la demande (copier-coller)<textarea className={c.input} rows={5} value={edit.demande || ""} onChange={e => setEdit({ ...edit, demande: e.target.value })} /></label>
      <label style={field}>Réponse envoyée (ou brouillon)<textarea className={c.input} rows={5} value={edit.reponse || ""} onChange={e => setEdit({ ...edit, reponse: e.target.value })} /></label>
      <label style={field}>Notes<textarea className={c.input} rows={3} value={edit.notes || ""} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></label>
      <div style={{ display: "flex", gap: 8 }}><button className={`${c.btn} ${c.btnBrand}`} disabled={busy} onClick={() => saveReq(edit)}>{busy ? "…" : "Enregistrer"}</button><button className={`${c.btn} ${c.btnGhost}`} onClick={() => setEdit(null)}>Annuler</button></div>
    </section> : null}

    <h2 style={{ margin: "22px 0 8px" }}>📨 Demandes des banques et organismes</h2>
    {reqs.length ? reqs.map(r => { const n = daysLeft(r.date_limite); const linked = docs.filter(d => d.request_id === r.id); const isOpen = open === r.id;
      return <section key={r.id} className={c.card} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : r.id)}>
          <span className={c.badge} style={{ background: ST_BG[r.statut] || "#eee", color: "#111" }}>{STATUTS[r.statut] || r.statut}</span>
          <b style={{ fontSize: 17 }}>{r.organisme} — {r.objet || "(sans objet)"}</b>
          <span className={c.muted} style={{ marginLeft: "auto" }}>{r.date_limite ? <>Avant le <b style={{ color: n !== null && n <= 7 && r.statut === "a_faire" ? "#b42318" : undefined }}>{fmt(r.date_limite)}</b></> : null} {isOpen ? "▲" : "▼"}</span>
        </div>
        {isOpen ? <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div><b>Demande</b> <span className={c.muted}>(reçue le {fmt(r.date_demande)})</span><div style={{ whiteSpace: "pre-wrap", background: "#f6f4f0", borderRadius: 10, padding: 10, marginTop: 4 }}>{r.demande || "—"}</div></div>
          <div><b>Réponse</b><div style={{ whiteSpace: "pre-wrap", background: "#f2f7f2", borderRadius: 10, padding: 10, marginTop: 4 }}>{r.reponse || "—"}</div>
            {r.reponse ? <button className={`${c.btn} ${c.btnGhost}`} style={{ marginTop: 6 }} onClick={() => navigator.clipboard?.writeText(r.reponse).then(() => setMsg("📋 Réponse copiée."))}>📋 Copier la réponse</button> : null}</div>
          {r.notes ? <div><b>Notes</b><div style={{ whiteSpace: "pre-wrap" }}>{r.notes}</div></div> : null}
          <div><b>Documents joints</b>{linked.length ? linked.map(d => <div key={d.id}>• <a href="#" onClick={e => { e.preventDefault(); openDoc(d.id); }}>{d.titre}</a> <span className={c.muted}>({CATEGORIES[d.categorie] || d.categorie})</span></div>) : <div className={c.muted}>Aucun. Ajoutez-en dans « Documents » plus bas, en choisissant cette demande.</div>}</div>
          <div><b>Historique des échanges</b>{(r.history || []).length ? r.history.map((h, i) => <div key={i} style={{ marginTop: 6, padding: 8, borderRadius: 10, background: h.sens === "envoye" ? "#e8f0fe" : "#f6f4f0" }}><small><b>{h.sens === "envoye" ? "➡️ Envoyé" : "⬅️ Reçu"}</b> · {fmt(h.date)}</small><div style={{ whiteSpace: "pre-wrap" }}>{h.texte}</div></div>) : <div className={c.muted}>Aucun échange noté.</div>}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => addHistory(r, "recu")}>⬅️ Ajouter un message reçu</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => addHistory(r, "envoye")}>➡️ Ajouter un message envoyé</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setEdit(r)}>✏️ Modifier</button>
            {Object.keys(STATUTS).filter(k => k !== r.statut).map(k => <button key={k} className={`${c.btn} ${c.btnGhost}`} onClick={() => saveReq({ ...r, statut: k })}>→ {STATUTS[k]}</button>)}
          </div>
        </div> : null}
      </section>; }) : <p className={c.muted}>Aucune demande pour l’instant.</p>}

    <h2 style={{ margin: "22px 0 8px" }}>📁 Documents</h2>
    <section className={c.card} style={{ display: "grid", gap: 10, marginBottom: 12 }}>
      <b>Ajouter un document (PDF, JPG, PNG, 30 Mo maximum)</b>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={field}>Catégorie<select className={c.input} value={up.categorie} onChange={e => setUp({ ...up, categorie: e.target.value })}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label style={field}>Titre<input className={c.input} value={up.titre} onChange={e => setUp({ ...up, titre: e.target.value })} placeholder="Par défaut : nom du fichier" /></label>
        <label style={field}>Date du document<input className={c.input} type="date" value={up.date_doc} onChange={e => setUp({ ...up, date_doc: e.target.value })} /></label>
        <label style={field}>Lié à la demande<select className={c.input} value={up.request_id} onChange={e => setUp({ ...up, request_id: e.target.value })}><option value="">Aucune</option>{reqs.map(r => <option key={r.id} value={r.id}>{r.organisme} — {r.objet.slice(0, 50)}</option>)}</select></label>
      </div>
      <label style={field}>Description<input className={c.input} value={up.description} onChange={e => setUp({ ...up, description: e.target.value })} /></label>
      <label className={`${c.btn} ${c.btnBrand}`} style={{ cursor: busy ? "wait" : "pointer", justifySelf: "start" }}>{busy ? "Envoi…" : "📤 Choisir le(s) fichier(s)"}<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" hidden disabled={busy} onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
    </section>
    {docs.length ? <div style={{ display: "grid", gap: 10 }}>{docs.map(d => <section key={d.id} className={c.card} style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className={c.badge} style={{ background: "#f1ede6", color: "#111" }}>{CATEGORIES[d.categorie] || d.categorie}</span>
        <b style={{ fontSize: 16 }}>{d.titre}</b><span className={c.muted}>{fmt(d.date_doc)} {kb(d.size) ? `· ${kb(d.size)}` : ""}</span>
      </div>
      {d.description ? <div className={c.muted}>{d.description}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`${c.btn} ${c.btnBrand}`} onClick={() => openDoc(d.id)}>👁️ Ouvrir</button>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => openDoc(d.id, true)}>⬇️ Télécharger</button>
        <select className={c.input} style={{ width: "auto" }} value={d.request_id || ""} onChange={e => linkDoc(d, e.target.value)}><option value="">Lier à une demande…</option>{reqs.map(r => <option key={r.id} value={r.id}>{r.organisme} — {r.objet.slice(0, 40)}</option>)}</select>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => delDoc(d.id)}>🗑️</button>
      </div>
    </section>)}</div> : <p className={c.muted}>Aucun document pour l’instant.</p>}
  </div></main>;
}
