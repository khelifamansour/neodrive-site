"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import c from "../giga/giga.module.css";

type R = {
  id: number; created_at: string; source: string; nom: string; prenom: string; telephone: string; email: string;
  adresse: string; code_postal: string; ville: string; departement: string; modele: string; couleur: string; quantite: number;
  delivery_price: number | null; total: number | null; message: string; statut: string; date_promise: string | null;
  acompte: number | null; priorite: string; notes: string; plan_client_id: string | null; options: string;
};
const STATUTS = ["Nouvelle", "Confirmée", "Planifiée", "Livrée", "Annulée"];
const PRIOS = ["Urgente", "Haute", "Normale", "Basse"];
const ST_BG: Record<string, string> = { Nouvelle: "#fff4d6", Confirmée: "#e8f0fe", Planifiée: "#ede7fb", Livrée: "#e7f6ec", Annulée: "#f1f1f1" };
const SRC: Record<string, string> = { site_devis: "Site (devis)", site_formulaire: "Site (formulaire)", manuel: "Saisie manuelle", planificateur: "Planificateur" };
const eur = (n: number | null) => n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const blank = { nom: "", prenom: "", telephone: "", email: "", adresse: "", code_postal: "", ville: "", modele: "VSP Version Confort", couleur: "", total: "", acompte: "", statut: "Confirmée", priorite: "Normale", date_promise: "", created_on: "", notes: "" };

export default function ReservationsAdmin() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<R[]>([]); const [filter, setFilter] = useState("actives");
  const [sel, setSel] = useState<Set<number>>(new Set()); const [open, setOpen] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<R>>({}); const [add, setAdd] = useState<typeof blank | null>(null);

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ reservations: R[] }>({ action: "list" }, p); setRows(j.reservations); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  const counts = useMemo(() => Object.fromEntries(STATUTS.map(s => [s, rows.filter(r => r.statut === s).length])), [rows]);
  const shown = rows.filter(r => filter === "toutes" ? true : filter === "actives" ? !["Livrée", "Annulée"].includes(r.statut) : r.statut === filter);
  const chosen = rows.filter(r => sel.has(r.id));

  const run = async (fn: () => Promise<string | void>) => { setBusy(true); setMsg(""); try { const m = await fn(); await load(); if (m) setMsg(m); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(false); } };
  const save = (id: number, patch: Partial<R>) => run(async () => { await api({ action: "update", id, ...patch }); setOpen(null); return "✅ Enregistré."; });
  const toPlanner = () => run(async () => { const j = await api<{ done: number; errors: string[] }>({ action: "to_planner", ids: [...sel] }); setSel(new Set()); return `🚚 ${j.done} réservation(s) dans le planificateur.${j.errors.length ? " ⚠️ " + j.errors.join(" ; ") : ""}`; });
  const importPlanner = () => run(async () => { const j = await api<{ added: number }>({ action: "import_planner" }); return `📥 ${j.added} réservation(s) reprise(s) du planificateur.`; });
  const copyList = () => { const t = (chosen.length ? chosen : shown).map(r => `${r.prenom} ${r.nom}, ${r.adresse}, ${r.code_postal} ${r.ville}, ${r.telephone}`).join("\n"); navigator.clipboard?.writeText(t).then(() => setMsg("📋 Liste copiée.")); };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>📋 Réservations</h1><p className={c.muted}>Code d’accès NeoDrive.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  const field = { display: "grid", gap: 4, fontSize: 14, fontWeight: 600 } as const;
  const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" } as const;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}>
      <a href="/organisation" className={c.back}>← Organisation</a>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnBrand}`} onClick={() => setAdd({ ...blank })}>＋ Ajouter manuellement</button>
        <a className={`${c.btn} ${c.btnGhost}`} href="/planificateur">🚚 Planificateur</a>
      </div>
    </div>
    <h1 style={{ margin: "14px 0 4px" }}>📋 Réservations clients</h1>
    <p className={c.muted}>Toutes les réservations du site arrivent ici automatiquement. Ajoutez à la main les anciennes (reçues seulement par e-mail), fixez une date promise, puis envoyez-les au planificateur.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}

    {add ? <section className={c.card} style={{ marginTop: 14, display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>Nouvelle réservation</h2>
      <div style={grid}>
        {([["prenom", "Prénom"], ["nom", "Nom *"], ["telephone", "Téléphone"], ["email", "E-mail"], ["adresse", "Adresse"], ["code_postal", "Code postal"], ["ville", "Ville"], ["modele", "Modèle"], ["couleur", "Couleur"], ["total", "Total TTC (€)"], ["acompte", "Acompte versé (€)"]] as const).map(([k, l]) =>
          <label key={k} style={field}>{l}<input className={c.input} value={add[k]} inputMode={k === "total" || k === "acompte" || k === "code_postal" ? "numeric" : undefined} onChange={e => setAdd({ ...add, [k]: e.target.value })} /></label>)}
        <label style={field}>Statut<select className={c.input} value={add.statut} onChange={e => setAdd({ ...add, statut: e.target.value })}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label style={field}>Priorité<select className={c.input} value={add.priorite} onChange={e => setAdd({ ...add, priorite: e.target.value })}>{PRIOS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label style={field}>Date promise<input className={c.input} type="date" value={add.date_promise} onChange={e => setAdd({ ...add, date_promise: e.target.value })} /></label>
        <label style={field}>Réservé le<input className={c.input} type="date" value={add.created_on} onChange={e => setAdd({ ...add, created_on: e.target.value })} /></label>
      </div>
      <label style={field}>Notes<textarea className={c.input} rows={3} value={add.notes} onChange={e => setAdd({ ...add, notes: e.target.value })} placeholder="Ex. : pressé (suspension de permis), couleur grise…" /></label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`${c.btn} ${c.btnBrand}`} disabled={busy || !add.nom.trim()} onClick={() => run(async () => { await api({ action: "add", ...add }); setAdd(null); return "✅ Réservation ajoutée."; })}>{busy ? "…" : "Enregistrer"}</button>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setAdd(null)}>Annuler</button>
      </div>
    </section> : null}

    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "16px 0 8px" }}>
      {[["actives", `En cours (${rows.filter(r => !["Livrée", "Annulée"].includes(r.statut)).length})`], ...STATUTS.map(s => [s, `${s} (${counts[s] || 0})`]), ["toutes", `Toutes (${rows.length})`]].map(([k, l]) =>
        <button key={k} className={`${c.btn} ${filter === k ? c.btnBrand : c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => setFilter(k)}>{l}</button>)}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setSel(sel.size === shown.length ? new Set() : new Set(shown.map(r => r.id)))}>{sel.size && sel.size === shown.length ? "Tout désélectionner" : "Tout sélectionner"}</button>
      <button className={`${c.btn} ${c.btnBrand}`} disabled={busy || !sel.size} onClick={toPlanner}>🚚 Envoyer au planificateur ({sel.size})</button>
      <button className={`${c.btn} ${c.btnGhost}`} onClick={copyList}>📋 Copier la liste{sel.size ? ` (${sel.size})` : ""}</button>
      <button className={`${c.btn} ${c.btnGhost}`} disabled={busy} onClick={importPlanner}>📥 Reprendre celles du planificateur</button>
    </div>

    {shown.length ? <div style={{ display: "grid", gap: 10 }}>{shown.map(r => { const isOpen = open === r.id; const late = r.date_promise && r.date_promise < new Date().toISOString().slice(0, 10) && !["Livrée", "Annulée"].includes(r.statut);
      return <section key={r.id} className={c.card} style={{ display: "grid", gap: 8, borderColor: r.priorite === "Urgente" ? "#f97066" : undefined }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" checked={sel.has(r.id)} style={{ width: 20, height: 20, marginTop: 3 }} onChange={e => { const n = new Set(sel); if (e.target.checked) n.add(r.id); else n.delete(r.id); setSel(n); }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={c.badge} style={{ background: ST_BG[r.statut] || "#eee", color: "#111" }}>{r.statut}</span>
              {r.priorite !== "Normale" ? <span className={c.badge} style={{ background: r.priorite === "Urgente" ? "#fde8e7" : r.priorite === "Haute" ? "#fff4d6" : "#f1f1f1", color: "#111" }}>{r.priorite}</span> : null}
              {r.plan_client_id ? <span className={c.badge} style={{ background: "#ede7fb", color: "#111" }}>🚚 au planificateur</span> : null}
              <b style={{ fontSize: 17 }}>{r.prenom} {r.nom}</b>
            </div>
            <div className={c.muted} style={{ marginTop: 4 }}>
              📍 {r.ville || "—"} {r.departement ? `(${r.departement})` : ""} · 🚗 {r.modele || "—"}{r.quantite > 1 ? ` ×${r.quantite}` : ""} · 💶 {eur(r.total)}{r.acompte ? ` (acompte ${eur(r.acompte)})` : ""}
            </div>
            <div className={c.muted}>Réservé le {fmt(r.created_at)} · Date promise : <b style={{ color: late ? "#b42318" : undefined }}>{fmt(r.date_promise)}{late ? " (dépassée)" : ""}</b></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {r.telephone ? <a className={`${c.btn} ${c.btnGhost}`} href={`tel:${r.telephone}`}>📞 {r.telephone}</a> : null}
              {r.telephone ? <a className={`${c.btn} ${c.btnGhost}`} target="_blank" rel="noreferrer" href={`https://wa.me/${r.telephone.replace(/[^\d]/g, "").replace(/^0/, "33")}`}>💬 WhatsApp</a> : null}
              <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { setOpen(isOpen ? null : r.id); setEdit({ statut: r.statut, priorite: r.priorite, date_promise: r.date_promise, acompte: r.acompte, notes: r.notes }); }}>{isOpen ? "Fermer" : "✏️ Modifier"}</button>
            </div>
          </div>
        </div>
        {isOpen ? <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div className={c.muted}>{r.adresse} {r.code_postal} {r.ville}{r.email ? ` · ${r.email}` : ""} · Source : {SRC[r.source] || r.source}{r.delivery_price != null ? ` · Livraison ${eur(r.delivery_price)}` : ""}{r.options ? ` · ${r.options}` : ""}</div>
          <div style={grid}>
            <label style={field}>Statut<select className={c.input} value={edit.statut || ""} onChange={e => setEdit({ ...edit, statut: e.target.value })}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></label>
            <label style={field}>Priorité<select className={c.input} value={edit.priorite || ""} onChange={e => setEdit({ ...edit, priorite: e.target.value })}>{PRIOS.map(s => <option key={s}>{s}</option>)}</select></label>
            <label style={field}>Date promise<input className={c.input} type="date" value={edit.date_promise || ""} onChange={e => setEdit({ ...edit, date_promise: e.target.value })} /></label>
            <label style={field}>Acompte (€)<input className={c.input} inputMode="numeric" value={edit.acompte ?? ""} onChange={e => setEdit({ ...edit, acompte: e.target.value as unknown as number })} /></label>
          </div>
          <label style={field}>Notes<textarea className={c.input} rows={3} value={edit.notes || ""} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></label>
          {r.message ? <div className={c.muted}>Message du client : {r.message}</div> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`${c.btn} ${c.btnBrand}`} disabled={busy} onClick={() => save(r.id, edit)}>{busy ? "…" : "Enregistrer"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setOpen(null)}>Annuler</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { if (confirm("Supprimer définitivement cette réservation ?")) run(async () => { await api({ action: "delete", id: r.id }); return "🗑️ Supprimée."; }); }}>🗑️</button>
          </div>
        </div> : null}
      </section>; })}</div> : <p className={c.muted}>Aucune réservation dans cette liste.</p>}
  </div></main>;
}
