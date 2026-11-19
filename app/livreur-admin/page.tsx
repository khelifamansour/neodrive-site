"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { DOC_STATUS_LABEL } from "../../lib/driver-docs";
import Contract from "../livreur/Contract";
import Invoices from "./Invoices";

type Doc = { id: number; status: string; filename: string | null; uploaded_at: string; validated_at: string | null; note: string | null; url: string | null; data: { signed_name?: string; signed_at?: string } };
type Employment = { start?: string; end?: string; salary?: number; hours?: number; title?: string };
type Personal = { birth_date?: string; birth_place?: string; nationality?: string; address?: string; ssn?: string };
type Report = { id: number; month: string; uploaded_at: string; url: string | null; totals: { total_min?: number; normal_min?: number; ot25_min?: number; ot50_min?: number } };
type Driver = { id: number; name: string; phone: string | null; email: string | null; active: boolean; expires_at: string | null; revoked_at: string | null; last_seen_at: string | null; is_test?: boolean; contract_type?: string; employment?: Employment | null; personal?: Personal | null; reports?: Report[]; docs: Record<string, Doc> };
const hm = (m = 0) => `${Math.floor(m / 60)} h${m % 60 ? String(Math.round(m % 60)).padStart(2, "0") : ""}`;
const dFr = (d?: string) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "—";
const monthTxt = (m: string) => m ? new Date(m + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const plus6 = (d: string) => { const x = new Date(d + "T12:00:00Z"); x.setUTCMonth(x.getUTCMonth() + 6); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
/** Texte à recopier dans la DPAE (due.urssaf.fr). */
function dpaeText(d: Driver) {
  const p = d.personal || {}; const e = d.employment || {};
  const parts = d.name.trim().split(/\s+/);
  return [`Nom : ${parts.length > 1 ? parts.slice(-1)[0].toUpperCase() : d.name}`, `Prénom(s) : ${parts.length > 1 ? parts.slice(0, -1).join(" ") : ""}`, `Date de naissance : ${dFr(p.birth_date)}`, `Lieu de naissance : ${p.birth_place || "—"}`, `Nationalité : ${p.nationality || "—"}`, `N° de sécurité sociale : ${p.ssn || "—"}`, `Adresse : ${p.address || "—"}`, `Date d'embauche : ${dFr(e.start)} (heure : à compléter)`, `Contrat : CDD du ${dFr(e.start)} au ${dFr(e.end)}`, `Emploi : ${e.title || "Chauffeur-livreur et préparateur de véhicules"} · ${e.hours || 35} h/semaine · ${e.salary ? e.salary.toLocaleString("fr-FR") + " € brut/mois" : "—"}`].join("\n");
}
type Kind = { id: string; label: string };
const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/livreur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw Object.assign(new Error(j.error || "Code incorrect"), { auth: true });
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const ST: Record<string, [string, string]> = { manquant: ["#f1f1f1", "#555"], recu: ["#e8f0fe", "#1e3a8a"], valide: ["#e7f6ec", "#067647"], refuse: ["#fde8e7", "#b42318"] };
const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function LivreurAdmin() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]); const [kinds, setKinds] = useState<Kind[]>([]); const [required, setRequired] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", days: "90", contract_type: "prestataire", start: today(), end: plus6(today()), salary: "2000", hours: "35", title: "Chauffeur-livreur et préparateur de véhicules" });
  const [empKinds, setEmpKinds] = useState<Kind[]>([]); const [empRequired, setEmpRequired] = useState<string[]>([]);
  const [invite, setInvite] = useState<{ name: string; code: string; text: string; sent: { sms: boolean; email: boolean; errors: string[] } } | null>(null);
  const [showContract, setShowContract] = useState(false);

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ drivers: Driver[]; kinds: Kind[]; required: string[]; employee_kinds: Kind[]; employee_required: string[] }>({ action: "admin_list" }, p); setDrivers(j.drivers); setKinds([...j.kinds, { id: "contrat", label: "Contrat signé en ligne" }]); setRequired([...j.required, "contrat"]); setEmpKinds([...(j.employee_kinds || []), { id: "contrat", label: "Contrat de travail (CDD) signé en ligne" }]); setEmpRequired([...(j.employee_required || []), "contrat"]); setState("ready"); }
    catch (e) { if ((e as { auth?: boolean }).auth) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);
  const run = async (fn: () => Promise<string | void>) => { setBusy(true); setMsg(""); try { const m = await fn(); await load(); if (m) setMsg(m); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(false); } };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🪪 Livreurs</h1><p className={c.muted}>Code d’accès NeoDrive (fondateur).</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  const field = { display: "grid", gap: 4, fontSize: 14, fontWeight: 600 } as const;
  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><a className={`${c.btn} ${c.btnGhost}`} href="/planificateur">🚚 Planificateur</a></div>
    <h1 style={{ margin: "14px 0 4px" }}>🪪 Prestataires</h1>
    <p className={c.muted}>Invitez un livreur : il reçoit son code par SMS et par e-mail, dépose ses documents et signe son contrat dans son « Espace prestataire ». Il ne voit que les réservations en cours (sans les prix), ses tournées et ses documents.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}
    <section className={c.card} style={{ display: "grid", gap: 8, margin: "10px 0", background: "#fffaeb" }}>
      <b>🧪 Données de test</b>
      <small className={c.muted}>Tournée « Tournée TEST – démo Serge » (2 clients de test à Muret et Seysses, vos téléphone et e-mail) pour essayer l’espace prestataire avec le compte « Serge (test) ».</small>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnGhost}`} disabled={busy} onClick={() => confirm("Créer (ou recréer) la tournée de test pour Serge ?") && run(async () => { const j = await api<{ reservations: number[] }>({ action: "admin_create_demo_tour" }); return `✅ Tournée de test créée (${j.reservations.length} réservations de test).`; })}>➕ Créer la tournée de test</button>
        <button className={`${c.btn} ${c.btnGhost}`} disabled={busy} onClick={() => confirm("Supprimer TOUTES les données de test (tournée, clients et réservations de test, accusés, heures et factures du compte de test) ?") && run(async () => { const j = await api<{ tours: number; reservations: number; hours: number; invoices: number }>({ action: "admin_delete_test_data" }); return `🗑️ Supprimé : ${j.tours} tournée(s), ${j.reservations} réservation(s), ${j.hours} ligne(s) d’heures, ${j.invoices} facture(s) de test.`; })}>🗑️ Supprimer les données de test</button>
      </div>
    </section>

    {invite ? <section className={c.card} style={{ marginTop: 12, display: "grid", gap: 8, borderColor: "#f05a28" }}>
      <b>Accès créé pour {invite.name} : code <span style={{ fontSize: 20, letterSpacing: 2 }}>{invite.code}</span></b>
      <p className={c.muted}>{invite.sent.sms ? "✅ SMS envoyé. " : ""}{invite.sent.email ? "✅ E-mail envoyé. " : ""}{invite.sent.errors.length ? "⚠️ " + invite.sent.errors.join(" ; ") : ""}{!invite.sent.sms && !invite.sent.email ? "Rien n’a été envoyé automatiquement : transmettez le message ci-dessous." : ""}</p>
      <textarea className={c.input} rows={3} readOnly value={invite.text} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => navigator.clipboard?.writeText(invite.text).then(() => setMsg("📋 Message copié."))}>📋 Copier</button>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setInvite(null)}>J’ai noté le code</button>
      </div>
      <small className={c.muted}>Le code ne sera plus affiché. Perdu ? Générez-en un nouveau dans « Équipe et accès ».</small>
    </section> : null}

    <section className={c.card} style={{ marginTop: 14, display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>➕ Inviter un prestataire ou un salarié</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <label style={field}>Nom et prénom *<input className={c.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label style={field}>Téléphone (SMS)<input className={c.input} inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <label style={field}>E-mail<input className={c.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label style={field}>Statut<select className={c.input} value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })}><option value="prestataire">Prestataire (indépendant)</option><option value="salarie">Salarié (CDD)</option></select></label>
        {form.contract_type === "salarie" ? <>
          <label style={field}>Début du CDD<input className={c.input} type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value, end: plus6(e.target.value || today()) })} /></label>
          <label style={field}>Fin du CDD<input className={c.input} type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
          <label style={field}>Salaire brut mensuel (€)<input className={c.input} inputMode="decimal" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></label>
          <label style={field}>Heures par semaine<input className={c.input} inputMode="numeric" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} /></label>
          <label style={{ ...field, gridColumn: "1 / -1" }}>Intitulé du poste<input className={c.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        </> : <label style={field}>Accès valable (jours)<input className={c.input} inputMode="numeric" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} /></label>}
      </div>
      <div><button className={`${c.btn} ${c.btnBrand}`} disabled={busy || form.name.trim().length < 2} onClick={() => run(async () => { const j = await api<{ code: string; text: string; sent: { sms: boolean; email: boolean; errors: string[] } }>({ action: "admin_invite", ...form }); setInvite({ name: form.name, code: j.code, text: j.text, sent: j.sent }); setForm({ ...form, name: "", phone: "", email: "" }); })}>{busy ? "…" : "Créer l’accès et envoyer l’invitation"}</button></div>
      <small className={c.muted}>Pour qu’il voie ses tournées, écrivez son prénom dans le champ « Livreur » de la tournée (planificateur).</small>
    </section>

    <Invoices api={api} onMsg={setMsg} />

    <div style={{ margin: "14px 0" }}><button className={`${c.btn} ${c.btnGhost}`} onClick={() => setShowContract(!showContract)}>{showContract ? "Masquer" : "📄 Voir"} le modèle de contrat</button></div>
    {showContract ? <section className={c.card}><Contract /></section> : null}

    {drivers.length ? <div style={{ display: "grid", gap: 12, marginTop: 12 }}>{drivers.map(d => {
      const sal = d.contract_type === "salarie";
      const dKinds = sal ? empKinds : kinds; const dReq = sal ? empRequired : required;
      const done = dReq.filter(k => d.docs[k]?.status === "valide").length;
      return <section key={d.id} className={c.card} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b style={{ fontSize: 18 }}>{d.name}</b>
          {d.phone ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} disabled={busy} onClick={() => confirm(`Envoyer un nouveau code par SMS à ${d.name} (${d.phone}) ? L'ancien code ne marchera plus.`) && run(async () => { await api({ action: "admin_resend_code", id: d.id }); return "📲 Nouveau code envoyé par SMS."; })}>📲 Renvoyer le code</button> : null}
          {d.is_test ? <><span className={c.badge} style={{ background: "#fde8e7", color: "#b42318" }}>COMPTE DE TEST</span><button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} disabled={busy} onClick={() => confirm(`Supprimer le compte de test « ${d.name} » (documents et factures de test compris) ?`) && run(async () => { const j = await api<{ revoked_only?: boolean }>({ action: "admin_delete_test", id: d.id }); return j.revoked_only ? "Accès coupé (suppression impossible : historique lié)." : "🗑️ Compte de test supprimé."; })}>🗑️ Supprimer</button></> : null}
          <span className={c.badge} style={{ background: d.active && !d.revoked_at ? "#e7f6ec" : "#f1f1f1", color: "#111" }}>{d.active && !d.revoked_at ? "Accès actif" : "Accès coupé"}</span>
          <span className={c.badge} style={{ background: sal ? "#e8f0fe" : "#f1f1f1", color: "#111" }}>{sal ? "Salarié CDD" : "Prestataire"}</span>
          <span className={c.badge} style={{ background: done === dReq.length ? "#e7f6ec" : "#fffaeb", color: "#111" }}>{done}/{dReq.length} validés</span>
        </div>
        {sal ? <div style={{ display: "grid", gap: 6, padding: 10, borderRadius: 12, background: "#f5f8ff", border: "1px solid #dbe5ff" }}>
          <b>📋 Infos pour la DPAE</b>
          <small className={c.muted}>À déclarer au plus tard avant sa première heure de travail, sur due.urssaf.fr (déclaration préalable à l’embauche).</small>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14 }}>{dpaeText(d)}</pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 10px" }} onClick={() => navigator.clipboard?.writeText(dpaeText(d)).then(() => setMsg("📋 Infos DPAE copiées."))}>📋 Copier</button>
            <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 10px" }} href="https://www.due.urssaf.fr" target="_blank" rel="noreferrer">Ouvrir due.urssaf.fr</a>
          </div>
          {!(d.personal?.birth_date && d.personal?.ssn) ? <small className={c.err}>Le salarié n’a pas encore rempli ses informations (date de naissance, n° de sécurité sociale) dans « Mon espace ».</small> : null}
          <b style={{ marginTop: 6 }}>📄 Relevés d’heures (paie)</b>
          {d.reports?.length ? d.reports.map(r => <span key={r.id} style={{ fontSize: 14 }}>{monthTxt(r.month)} · {hm(r.totals.total_min)} dont {hm(r.totals.normal_min)} normales, {hm(r.totals.ot25_min)} à +25 %, {hm(r.totals.ot50_min)} à +50 % · transmis le {fmt(r.uploaded_at)}{r.url ? <> · <a href={r.url} target="_blank" rel="noreferrer">PDF</a></> : null}</span>) : <small className={c.muted}>Aucun relevé transmis pour l’instant.</small>}
        </div> : null}
        <div className={c.muted}>{d.phone || "—"} · {d.email || "—"} · accès jusqu’au {fmt(d.expires_at)} · dernière visite {fmt(d.last_seen_at)}</div>
        <div style={{ display: "grid", gap: 6 }}>{dKinds.map(k => { const doc = d.docs[k.id]; const st = doc?.status || "manquant"; const [bg, col] = ST[st] || ST.manquant;
          return <div key={k.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "#faf8f5" }}>
            <span style={{ fontSize: 14 }}><b>{k.label}</b>{!dReq.includes(k.id) ? " (facultatif)" : ""}{doc ? <small className={c.muted}> · {k.id === "contrat" ? `signé par ${doc.data?.signed_name} le ${new Date(doc.data?.signed_at || "").toLocaleString("fr-FR")}` : `${doc.filename || ""} · ${fmt(doc.uploaded_at)}`}</small> : null}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className={c.badge} style={{ background: bg, color: col }}>{DOC_STATUS_LABEL[st] || st}</span>
              {doc?.url ? <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} href={doc.url} target="_blank" rel="noreferrer">Voir</a> : null}
              {doc && st !== "valide" ? <button className={`${c.btn} ${c.btnBrand}`} style={{ padding: "4px 10px" }} disabled={busy} onClick={() => run(async () => { await api({ action: "admin_validate", id: doc.id, status: "valide" }); return "✅ Document validé."; })}>Valider</button> : null}
              {doc && st !== "refuse" ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} disabled={busy} onClick={() => { const note = prompt("Motif du refus (le livreur le verra) :") || ""; if (note.trim()) run(async () => { await api({ action: "admin_validate", id: doc.id, status: "refuse", note }); return "Document refusé : le livreur doit le renvoyer."; }); }}>Refuser</button> : null}
            </span>
          </div>; })}</div>
      </section>; })}</div> : <p className={c.muted}>Aucun livreur pour l’instant.</p>}
  </div></main>;
}
