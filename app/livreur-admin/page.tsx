"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { DOC_STATUS_LABEL } from "../../lib/driver-docs";
import Contract from "../livreur/Contract";
import Invoices from "./Invoices";

type Doc = { id: number; status: string; filename: string | null; uploaded_at: string; validated_at: string | null; note: string | null; url: string | null; data: { signed_name?: string; signed_at?: string } };
type Driver = { id: number; name: string; phone: string | null; email: string | null; active: boolean; expires_at: string | null; revoked_at: string | null; last_seen_at: string | null; docs: Record<string, Doc> };
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", days: "90" });
  const [invite, setInvite] = useState<{ name: string; code: string; text: string; sent: { sms: boolean; email: boolean; errors: string[] } } | null>(null);
  const [showContract, setShowContract] = useState(false);

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ drivers: Driver[]; kinds: Kind[]; required: string[] }>({ action: "admin_list" }, p); setDrivers(j.drivers); setKinds([...j.kinds, { id: "contrat", label: "Contrat signé en ligne" }]); setRequired([...j.required, "contrat"]); setState("ready"); }
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
    <h1 style={{ margin: "14px 0 4px" }}>🪪 Livreurs prestataires</h1>
    <p className={c.muted}>Invitez un livreur : il reçoit son code par SMS et par e-mail, dépose ses documents et signe son contrat dans son « Espace livreur ». Il ne voit que les réservations en cours (sans les prix), ses tournées et ses documents.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}

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
      <h2 style={{ margin: 0 }}>➕ Inviter un livreur</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <label style={field}>Nom et prénom *<input className={c.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label style={field}>Téléphone (SMS)<input className={c.input} inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <label style={field}>E-mail<input className={c.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label style={field}>Accès valable (jours)<input className={c.input} inputMode="numeric" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} /></label>
      </div>
      <div><button className={`${c.btn} ${c.btnBrand}`} disabled={busy || form.name.trim().length < 2} onClick={() => run(async () => { const j = await api<{ code: string; text: string; sent: { sms: boolean; email: boolean; errors: string[] } }>({ action: "admin_invite", ...form }); setInvite({ name: form.name, code: j.code, text: j.text, sent: j.sent }); setForm({ name: "", phone: "", email: "", days: "90" }); })}>{busy ? "…" : "Créer l’accès et envoyer l’invitation"}</button></div>
      <small className={c.muted}>Pour qu’il voie ses tournées, écrivez son prénom dans le champ « Livreur » de la tournée (planificateur).</small>
    </section>

    <Invoices api={api} onMsg={setMsg} />

    <div style={{ margin: "14px 0" }}><button className={`${c.btn} ${c.btnGhost}`} onClick={() => setShowContract(!showContract)}>{showContract ? "Masquer" : "📄 Voir"} le modèle de contrat</button></div>
    {showContract ? <section className={c.card}><Contract /></section> : null}

    {drivers.length ? <div style={{ display: "grid", gap: 12, marginTop: 12 }}>{drivers.map(d => {
      const done = required.filter(k => d.docs[k]?.status === "valide").length;
      return <section key={d.id} className={c.card} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b style={{ fontSize: 18 }}>{d.name}</b>
          <span className={c.badge} style={{ background: d.active && !d.revoked_at ? "#e7f6ec" : "#f1f1f1", color: "#111" }}>{d.active && !d.revoked_at ? "Accès actif" : "Accès coupé"}</span>
          <span className={c.badge} style={{ background: done === required.length ? "#e7f6ec" : "#fffaeb", color: "#111" }}>{done}/{required.length} validés</span>
        </div>
        <div className={c.muted}>{d.phone || "—"} · {d.email || "—"} · accès jusqu’au {fmt(d.expires_at)} · dernière visite {fmt(d.last_seen_at)}</div>
        <div style={{ display: "grid", gap: 6 }}>{kinds.map(k => { const doc = d.docs[k.id]; const st = doc?.status || "manquant"; const [bg, col] = ST[st] || ST.manquant;
          return <div key={k.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "#faf8f5" }}>
            <span style={{ fontSize: 14 }}><b>{k.label}</b>{!required.includes(k.id) ? " (facultatif)" : ""}{doc ? <small className={c.muted}> · {k.id === "contrat" ? `signé par ${doc.data?.signed_name} le ${new Date(doc.data?.signed_at || "").toLocaleString("fr-FR")}` : `${doc.filename || ""} · ${fmt(doc.uploaded_at)}`}</small> : null}</span>
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
