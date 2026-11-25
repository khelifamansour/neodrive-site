"use client";
import { useCallback, useEffect, useState } from "react";
import s from "../app.module.css";
import { api, Header, Loading, Login, ROLE_FR, useMe, type Role } from "../ui";

/** Comptes de l'application : le fondateur crée et coupe les accès (transporteurs, chauffeurs, équipe) ; un transporteur gère ses chauffeurs. */
type U = { id: number; role: Role; name: string; company: string; phone: string; email: string; active: boolean; created_at: string; last_login_at: string | null };
const EMPTY = { id: 0, role: "chauffeur" as Role, name: "", company: "Transports Rabouin", phone: "", email: "", active: true };
const APP_URL = "https://www.easydrive-auto.fr/app";

export default function AppAdmin() {
  const { me, setMe } = useMe();
  const [users, setUsers] = useState<U[] | null>(null); const [migration, setMigration] = useState("");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const founder = me?.role === "fondateur";
  const load = useCallback(async () => {
    try { const j = await api<{ users: U[]; migration?: string }>("admin_list"); setUsers(j.users); setMigration(j.migration || ""); }
    catch (e) { if ((e as { logout?: boolean }).logout) setMe(null); else setErr((e as Error).message); }
  }, [setMe]);
  useEffect(() => { if (me && (me.role === "fondateur" || me.role === "transporteur")) load(); }, [me, load]);

  if (me === undefined) return <Loading />;
  if (me === null) return <Login onDone={setMe} />;
  if (me.role !== "fondateur" && me.role !== "transporteur") return <main className={s.page}><Header me={me} back="/app" /><div className={s.err}>Réservé au fondateur.</div></main>;

  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); setErr(""); setMsg(""); try { const m = await fn(); if (m) setMsg(m); } catch (e) { setErr((e as Error).message); } setBusy(""); };
  const save = () => run("save", async () => { if (!form) return; await api("admin_save", { ...form }); setForm(null); await load(); return form.id ? "Compte mis à jour." : "Compte créé : envoyez-lui le lien d'installation."; });
  const toggle = (u: U) => run(`t${u.id}`, async () => { await api("admin_save", { ...u, active: !u.active }); await load(); return u.active ? `Accès de ${u.name} coupé.` : `Accès de ${u.name} réactivé.`; });
  const send = (u: U, via: "sms" | "email") => run(`${via}${u.id}`, async () => { await api("admin_send_link", { id: u.id, via }); return `Lien envoyé à ${u.name} par ${via === "sms" ? "SMS" : "e-mail"}.`; });
  const copy = () => { navigator.clipboard?.writeText(APP_URL).then(() => setMsg("Lien copié : " + APP_URL)).catch(() => setMsg(APP_URL)); };
  const groups = (users || []).reduce<Record<string, U[]>>((g, u) => { const k = u.role === "transporteur" || u.role === "chauffeur" ? u.company || "Sans société" : ROLE_FR[u.role]; (g[k] ||= []).push(u); return g; }, {});

  return <main className={s.page}>
    <Header me={me} back={founder ? "/app" : "/app/transporteur"} />
    <h1 className={s.h1}>{founder ? "Comptes de l'application" : "Mes chauffeurs"}</h1>
    <p className={s.sub}>Chaque personne se connecte avec son portable (ou son e-mail) et un code reçu par SMS. Couper un accès le déconnecte tout de suite.</p>
    {migration && <div className={s.err}>{migration}</div>}
    {err && <div className={s.err}>{err}</div>}
    {msg && <div className={s.ok}>{msg}</div>}
    {!form && <div className={s.grid2} style={{ marginBottom: 12 }}>
      <button className={s.btn} onClick={() => setForm({ ...EMPTY, company: founder ? EMPTY.company : me.company })}>＋ Chauffeur</button>
      {founder ? <button className={`${s.btn} ${s.btn2}`} onClick={() => setForm({ ...EMPTY, role: "transporteur" })}>＋ Transporteur</button> : <button className={`${s.btn} ${s.btnLight}`} onClick={copy}>Copier le lien</button>}
    </div>}
    {form && <form className={s.card} onSubmit={e => { e.preventDefault(); save(); }}>
      <b style={{ display: "block", marginBottom: 10, fontSize: 17 }}>{form.id ? "Modifier le compte" : "Nouveau compte"}</b>
      {founder && <><label className={s.label} htmlFor="f-role">Rôle</label>
        <select id="f-role" className={s.select} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
          {(Object.keys(ROLE_FR) as Role[]).map(r => <option key={r} value={r}>{ROLE_FR[r]}</option>)}
        </select></>}
      <label className={s.label} htmlFor="f-name">{form.role === "transporteur" ? "Nom du contact" : "Nom"}</label>
      <input id="f-name" className={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" required />
      {founder && (form.role === "transporteur" || form.role === "chauffeur") && <><label className={s.label} htmlFor="f-company">Société de transport</label>
        <input id="f-company" className={s.input} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Transports Rabouin" required /></>}
      <label className={s.label} htmlFor="f-phone">Portable</label>
      <input id="f-phone" className={s.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06 12 34 56 78" inputMode="tel" />
      <label className={s.label} htmlFor="f-email">E-mail (facultatif si portable)</label>
      <input id="f-email" className={s.input} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nom@exemple.fr" inputMode="email" />
      <div className={s.grid2}>
        <button type="button" className={`${s.btn} ${s.btnLight}`} onClick={() => setForm(null)}>Annuler</button>
        <button className={s.btn} disabled={busy === "save"}>{busy === "save" ? "…" : "Enregistrer"}</button>
      </div>
    </form>}
    {!users && !err && <p className={s.muted}>Chargement…</p>}
    {users && !users.length && !migration && <div className={s.card}><p className={s.muted} style={{ margin: 0 }}>Aucun compte pour l&apos;instant.</p></div>}
    {Object.entries(groups).map(([g, list]) => <section key={g} style={{ marginBottom: 6 }}>
      <h2 style={{ fontSize: 15, fontWeight: 900, color: "#6b6259", margin: "16px 0 8px" }}>{g}</h2>
      {list.map(u => <div key={u.id} className={`${s.card} ${u.active ? "" : s.off}`} data-user={u.id}>
        <div className={s.user}>
          <div style={{ minWidth: 0 }}><b>{u.name}</b> <span className={s.badge}>{ROLE_FR[u.role]}</span><br /><span className={s.muted}>{[u.phone, u.email].filter(Boolean).join(" · ")}</span><br /><span className={s.muted}>{u.active ? (u.last_login_at ? `Dernière connexion : ${new Date(u.last_login_at).toLocaleDateString("fr-FR")}` : "Jamais connecté") : "Accès coupé"}</span></div>
          <button className={s.ghost} onClick={() => setForm({ id: u.id, role: u.role, name: u.name, company: u.company, phone: u.phone, email: u.email, active: u.active })}>Modifier</button>
        </div>
        <div className={s.row} style={{ marginTop: 10 }}>
          {u.active && u.phone && <button className={`${s.btn} ${s.small}`} disabled={!!busy} onClick={() => send(u, "sms")}>📲 Lien par SMS</button>}
          {u.active && u.email && <button className={`${s.btn} ${s.btn2} ${s.small}`} disabled={!!busy} onClick={() => send(u, "email")}>✉️ Par e-mail</button>}
          <button className={`${s.btn} ${s.btnLight} ${s.small}`} disabled={!!busy} onClick={() => toggle(u)}>{u.active ? "Couper l'accès" : "Réactiver"}</button>
        </div>
      </div>)}
    </section>)}
  </main>;
}
