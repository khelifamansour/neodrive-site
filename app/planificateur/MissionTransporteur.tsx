"use client";
import { useState } from "react";
import s from "./planif.module.css";
import { DEFAULT_CARRIER, type PickupHub } from "../../lib/planif";

/**
 * « Créer une mission transporteur » : réservations choisies → tournée confiée à Transports Rabouin (chauffeur inconnu à l'avance),
 * lien chauffeur /chauffeur?k=… envoyé par SMS ou e-mail, puis suivi client par client (photo de remise, prise en main à faire).
 */
type Api = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Cand = { id: number; name: string; ville: string; code_postal: string; departement: string; statut: string; date_promise: string | null; livraison_mode: string | null; modele: string; temperature: string | null };
type MClient = { id: string; name: string; slot: string; status: string; refusNote: string | null; photo: string | null; resId: number | null; prise_due: string | null; prise_done: string | null };
type Mission = { id: string; name: string; date: string; departTime: string; hub: string; link: string | null; carrier: { name: string; driverName?: string; driverPhone?: string; email?: string; sent_at?: string | null }; clients: MClient[] };
const TEMP: Record<string, { t: string; bg: string; c: string }> = { chaud: { t: "🔥 Chaud", bg: "#fde8e7", c: "#b42318" }, tiede: { t: "🌤️ Tiède", bg: "#fff4d6", c: "#b54708" }, froid: { t: "❄️ Froid", bg: "#e8f0fe", c: "#1d4ed8" } };
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const dt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const bigBtn: React.CSSProperties = { minHeight: 52, fontSize: 16, fontWeight: 800 };

function SendLink({ m, api, onMsg, reload }: { m: Mission; api: Api; onMsg: (t: string) => void; reload: () => Promise<void> }) {
  const [phone, setPhone] = useState(m.carrier.driverPhone || ""); const [email, setEmail] = useState(m.carrier.email || ""); const [busy, setBusy] = useState("");
  const send = (what: "sms" | "email") => { setBusy(what); onMsg(""); api({ action: "mission_send", id: m.id, ...(what === "sms" ? { phone } : { email }) }).then(async () => { onMsg(`✅ Lien envoyé au transporteur par ${what === "sms" ? "SMS" : "e-mail"}.`); await reload(); }).catch(e => onMsg("❌ " + (e as Error).message)).finally(() => setBusy("")); };
  const copy = () => m.link && navigator.clipboard?.writeText(m.link).then(() => onMsg("✅ Lien chauffeur copié."));
  return <div style={{ display: "grid", gap: 8 }}>
    {m.link ? <code style={{ fontSize: 12, wordBreak: "break-all", background: "#f6f3ee", padding: 8, borderRadius: 8 }}>{m.link}</code> : <p className={s.err}>Lien indisponible (secret serveur manquant).</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone du transporteur" inputMode="tel" /><button className={s.primary} style={bigBtn} disabled={!!busy || phone.replace(/\D/g, "").length < 9 || !m.link} onClick={() => send("sms")}>{busy === "sms" ? "…" : "📩 Envoyer le lien par SMS"}</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}><input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail du transporteur" inputMode="email" /><button className={s.primary} style={bigBtn} disabled={!!busy || !/@/.test(email) || !m.link} onClick={() => send("email")}>{busy === "email" ? "…" : "✉️ Envoyer le lien par e-mail"}</button></div>
    <div className={s.btns}><button className={s.ghost} style={bigBtn} disabled={!m.link} onClick={copy}>📋 Copier le lien</button>{m.link ? <a className={s.ghost} style={bigBtn} href={m.link} target="_blank" rel="noreferrer">👀 Voir la page chauffeur</a> : null}</div>
    {m.carrier.sent_at ? <small className={s.okTxt}>Lien envoyé le {dt(m.carrier.sent_at)}</small> : <small className={s.muted}>Lien pas encore envoyé.</small>}
  </div>;
}

export default function MissionTransporteur({ api, onMsg, reload }: { api: Api; onMsg: (t: string) => void; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState("");
  const [cands, setCands] = useState<Cand[]>([]); const [hubs, setHubs] = useState<PickupHub[]>([]); const [missions, setMissions] = useState<Mission[]>([]);
  const [sel, setSel] = useState<number[]>([]); const [slots, setSlots] = useState<Record<number, string>>({}); const [hotOnly, setHotOnly] = useState(false);
  const [f, setF] = useState({ hubId: "lamasquere", hubAddress: "", date: inDays(7), departTime: "08:00", carrier: DEFAULT_CARRIER, driverName: "", driverPhone: "", email: "" });
  const [created, setCreated] = useState<string | null>(null);
  const hasTemp = cands.some(c => c.temperature);

  const refresh = async () => { const j = await api({ action: "mission_list" }); setCands(j.reservations || []); setHubs(j.hubs || []); setMissions(j.missions || []); };
  const toggle = () => { if (open) { setOpen(false); return; } setOpen(true); setBusy("load"); refresh().catch(e => onMsg("❌ " + (e as Error).message)).finally(() => setBusy("")); };
  const hub = hubs.find(h => h.id === f.hubId);
  const create = () => {
    if (!sel.length) return onMsg("Choisissez au moins une réservation.");
    setBusy("create"); onMsg("");
    api({ action: "mission_create", resIds: sel, slots, ...f, hubAddress: f.hubAddress || hub?.address || "" })
      .then(async j => { setCreated(j.tour); setSel([]); setSlots({}); await refresh(); await reload(); onMsg(`✅ Mission créée (${j.clients.length} client${j.clients.length > 1 ? "s" : ""}). Envoyez maintenant le lien au transporteur.`); })
      .catch(e => onMsg("❌ " + (e as Error).message)).finally(() => setBusy(""));
  };
  const priseDone = (resId: number) => { setBusy("p" + resId); api({ action: "mission_prise_en_main", reservation_id: resId }).then(async () => { await refresh(); onMsg("✅ Prise en main notée."); }).catch(e => onMsg("❌ " + (e as Error).message)).finally(() => setBusy("")); };
  const list = cands.filter(c => !hotOnly || c.temperature === "chaud");
  const newOne = missions.find(m => m.id === created);

  return <section className={s.card}>
    <div className={s.rowHead}><h2>🚛 Mission transporteur</h2><button className={s.primary} style={bigBtn} onClick={toggle}>{open ? "Fermer" : "Créer une mission transporteur"}</button></div>
    {!open ? <p className={s.muted}>Livraisons confiées à {DEFAULT_CARRIER} : le chauffeur ouvre un lien sans code, photographie les plaques VIN, le client à côté de la voiture et fait signer la remise. Aucun prix ni montant ne lui est montré.</p> : null}
    {open && busy === "load" ? <p className={s.muted}>Chargement…</p> : null}
    {open && busy !== "load" ? <div style={{ display: "grid", gap: 12 }}>
      {newOne ? <div className={s.ok} style={{ display: "grid", gap: 8, fontWeight: 400 }}><b>✅ Mission créée : {newOne.name}</b><SendLink m={newOne} api={api} onMsg={onMsg} reload={refresh} /></div> : null}

      <div className={s.rowHead}><b>1. Réservations à livrer ({sel.length} choisie{sel.length > 1 ? "s" : ""})</b>{hasTemp ? <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={hotOnly} onChange={e => setHotOnly(e.target.checked)} /> Seulement les 🔥 chaudes</label> : null}</div>
      {!list.length ? <p className={s.muted}>Aucune réservation à livrer.</p> : null}
      <ul className={s.clients} style={{ maxHeight: 420, overflow: "auto" }}>{list.map(c => { const on = sel.includes(c.id); const t = c.temperature ? TEMP[c.temperature] : null; return <li key={c.id} className={on ? s.selected : ""} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, alignItems: "start" }}>
        <input type="checkbox" style={{ width: 22, height: 22 }} checked={on} onChange={() => setSel(v => on ? v.filter(x => x !== c.id) : [...v, c.id])} />
        <div className={s.cinfo}>
          <b>{c.name} {t ? <span className={s.badge} style={{ background: t.bg, color: t.c }}>{t.t}</span> : null}{c.livraison_mode === "transporteur" ? <span className={s.badge} style={{ marginLeft: 4 }}>🚛 déjà transporteur</span> : null}</b>
          <small>{c.ville || "?"} ({c.departement || c.code_postal.slice(0, 2)}) · {c.statut}{c.date_promise ? ` · promise le ${new Date(c.date_promise + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC" })}` : ""}{c.modele ? ` · ${c.modele}` : ""}</small>
          {on ? <input value={slots[c.id] || ""} onChange={e => setSlots(x => ({ ...x, [c.id]: e.target.value }))} placeholder="Créneau (ex. 9 h – 12 h) : facultatif" style={{ marginTop: 4 }} /> : null}
        </div>
      </li>; })}</ul>

      <b>2. Chargement et transporteur</b>
      <div className={s.grid2}>
        <label className={s.field}><span>Point de chargement</span><select value={f.hubId} onChange={e => setF({ ...f, hubId: e.target.value, hubAddress: "" })}>{hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <label className={s.field}><span>Adresse donnée au chauffeur</span><input value={f.hubAddress || hub?.address || ""} onChange={e => setF({ ...f, hubAddress: e.target.value })} /></label>
        <label className={s.field}><span>Date</span><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <label className={s.field}><span>Heure de chargement</span><input type="time" value={f.departTime} onChange={e => setF({ ...f, departTime: e.target.value })} /></label>
        <label className={s.field}><span>Transporteur</span><input value={f.carrier} onChange={e => setF({ ...f, carrier: e.target.value })} /></label>
        <label className={s.field}><span>Nom du chauffeur (facultatif)</span><input value={f.driverName} onChange={e => setF({ ...f, driverName: e.target.value })} placeholder="Inconnu pour l’instant" /></label>
        <label className={s.field}><span>Téléphone du transporteur (facultatif)</span><input value={f.driverPhone} inputMode="tel" onChange={e => setF({ ...f, driverPhone: e.target.value })} /></label>
        <label className={s.field}><span>E-mail du transporteur (facultatif)</span><input value={f.email} inputMode="email" onChange={e => setF({ ...f, email: e.target.value })} /></label>
      </div>
      <small className={s.muted}>Les réservations passent en livraison « transporteur », statut « Planifiée », date promise = date de la mission. Ordre des clients : le plus proche à chaque fois depuis le chargement.</small>
      <button className={s.primary} style={{ ...bigBtn, minHeight: 58 }} disabled={!!busy || !sel.length} onClick={create}>{busy === "create" ? "Création…" : `🚛 Créer la mission (${sel.length} client${sel.length > 1 ? "s" : ""})`}</button>

      {missions.length ? <><b>3. Missions en cours</b>
        {missions.map(m => <details key={m.id} className={s.tour} open={m.id === created}>
          <summary className={s.tourHead} style={{ cursor: "pointer" }}><b>{m.name}</b><small>{m.clients.filter(c => c.status === "livré").length}/{m.clients.length} livrés{m.clients.some(c => c.status === "refus") ? " · ↩️ refus" : ""}</small></summary>
          <div className={s.tourBody} style={{ display: "grid", gap: 10 }}>
            <ul className={s.mini}>{m.clients.map(c => <li key={c.id} style={{ display: "grid", gap: 4 }}>
              <span><b>{c.name}</b> · {c.status}{c.slot ? ` · ${c.slot}` : ""}{c.photo ? <> · <a href={c.photo} target="_blank" rel="noreferrer">📷 photo de remise</a></> : null}</span>
              {c.refusNote ? <small className={s.err}>Refus : « {c.refusNote} »</small> : null}
              {c.status === "livré" && c.resId ? (c.prise_done ? <small className={s.okTxt}>✅ Prise en main faite le {dt(c.prise_done)}</small> : <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><small style={{ background: "#fff4d6", color: "#7a4b00", fontWeight: 800, padding: "4px 8px", borderRadius: 8 }}>📞 Appeler le client pour la prise en main</small><button className={s.small} disabled={!!busy} onClick={() => priseDone(c.resId!)}>{busy === "p" + c.resId ? "…" : "✅ Appel fait"}</button></span>) : null}
            </li>)}</ul>
            <SendLink m={m} api={api} onMsg={onMsg} reload={refresh} />
          </div>
        </details>)}
      </> : null}
    </div> : null}
  </section>;
}
