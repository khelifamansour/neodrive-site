"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { supabase } from "../../lib/supabase";
import { DOC_STATUS_LABEL } from "../../lib/driver-docs";
import Contract from "./Contract";
import Delivery from "./Delivery";
import TourMap from "../planificateur/TourMap";
import type { Stop } from "../../lib/planif";

type DocInfo = { status: string; filename?: string | null; uploaded_at?: string; note?: string | null; signed_name?: string | null; signed_at?: string | null };
type Me = { who: "owner" | "member"; name: string; kinds: { id: string; label: string; hint: string }[]; required: string[]; docs: Record<string, DocInfo> };
type Res = { id: number; prenom: string; nom: string; ville: string; code_postal: string; departement: string; telephone: string; statut: string; date_promise: string | null; modele: string; priorite: string };
type LL = [number, number];
type Trip = { n: number; color: string; hub: string; hubPos?: LL; action: string; clients: { id: string; name: string; ville: string; pos?: LL }[]; next: string | null; nextPos?: LL | null; driveH?: number; km: number; hours: number };
/** Itinéraire Google Maps (voiture) : vers un point, ou départ → étapes → arrivée. */
const gmaps = (to: LL, from?: LL, via: LL[] = []) => `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.join(",")}` : ""}&destination=${to.join(",")}${via.length ? `&waypoints=${encodeURIComponent(via.map(x => x.join(",")).join("|"))}` : ""}&travelmode=driving`;
/** Pauses : 15 min toutes les 2 h de conduite (remorque, ≈ 72 km/h). */
const pauseH = (drive: number) => Math.floor(drive / 2) * 0.25;
const tripRoute = (v: Trip) => { const pts = v.clients.map(x => x.pos).filter(Boolean) as LL[]; const end = v.nextPos || pts[pts.length - 1]; if (!end) return null; const via = v.nextPos ? pts : pts.slice(0, -1); return gmaps(end, v.hubPos, via); };
const nextWeek = (d: string) => { const now = new Date(); const day = (now.getDay() + 6) % 7; const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7); const sun = new Date(mon.getTime() + 7 * 86400e3); const x = new Date(d + "T12:00:00"); return x >= mon && x < sun; };
type Plan = { draft: boolean; stops: Stop[]; trips: Trip[]; km: number; hours: number; days: number; end: string | null };
type Tour = { id: string; name: string; date: string; departTime: string; driver: string; status: string; clients: number; km: number; closed_at: string | null; en_route: number; link: string | null; plan: Plan };
const hm = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`; };

const pc = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object): Promise<T> {
  const r = await fetch("/api/livreur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc(), ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Connexion nécessaire");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
const ST_COLOR: Record<string, [string, string]> = { manquant: ["#f1f1f1", "#555"], recu: ["#e8f0fe", "#1e3a8a"], valide: ["#e7f6ec", "#067647"], refuse: ["#fde8e7", "#b42318"] };

export default function Livreur() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [tab, setTab] = useState<"livraisons" | "tournees" | "reservations" | "documents" | "contrat">("livraisons");
  const [me, setMe] = useState<Me | null>(null); const [res, setRes] = useState<Res[]>([]); const [tours, setTours] = useState<Tour[]>([]);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const [sign, setSign] = useState(""); const [accept, setAccept] = useState(false);
  const [mapOf, setMapOf] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, r, t] = await Promise.all([api<Me>({ action: "me" }), api<{ reservations: Res[] }>({ action: "reservations" }), api<{ tours: Tour[] }>({ action: "tours" })]);
      setMe(m); setRes(r.reservations); setTours(t.tours); setState("ready");
    } catch (e) { if (e instanceof Unauthorized) setState("login"); else { setMsg("❌ " + (e as Error).message); setState("ready"); } }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = (kind: string, f?: File) => f && (async () => {
    setBusy(kind); setMsg("");
    try {
      if (f.size > 15 * 1024 * 1024) throw new Error("Fichier trop lourd (15 Mo maximum).");
      const ext = (f.name.split(".").pop() || (f.type === "application/pdf" ? "pdf" : "jpg")).toLowerCase();
      const u = await api<{ bucket: string; path: string; token: string }>({ action: "upload_url", kind, ext });
      const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || undefined });
      if (error) throw new Error("Envoi impossible : " + error.message);
      await api({ action: "upload_done", kind, path: u.path, filename: f.name });
      await load(); setMsg("✅ Document envoyé. NeoDrive va le vérifier.");
    } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  })();

  const signContract = async () => {
    setBusy("sign"); setMsg("");
    try { await api({ action: "contract_sign", signed_name: sign, accept }); await load(); setMsg("✅ Contrat signé. Merci !"); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <main className={c.page}><div className={c.login}>
    <h1>🚚 Espace livreur</h1>
    <p className={c.muted}>Connectez-vous avec votre code personnel sur la page Organisation, puis revenez ici.</p>
    <a className={`${c.btn} ${c.btnBrand}`} href="/organisation" style={{ textAlign: "center", textDecoration: "none" }}>Se connecter</a>
  </div></main>;

  const contract = me?.docs.contrat;
  const signed = contract && contract.status !== "manquant" && contract.status !== "refuse";
  const missing = (me?.required || []).filter(k => ["manquant", "refuse"].includes(me?.docs[k]?.status || "manquant")).length + (signed ? 0 : 1);
  const tabs: [typeof tab, string][] = [["livraisons", "🚗 Livraisons"], ["tournees", `🚚 Mes tournées (${tours.length})`], ["reservations", `📋 Réservations en cours (${res.length})`], ["documents", `🪪 Mes documents${missing ? ` (${missing} à faire)` : " ✅"}`], ["contrat", signed ? "✍️ Contrat ✅" : "✍️ Contrat à signer"]];

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a></div>
    <h1 style={{ margin: "14px 0 4px" }}>🚚 Espace livreur</h1>
    <p className={c.muted}>Bonjour {me?.name?.split(" ")[0] || ""}. Vos tournées, les réservations en cours, vos documents et votre contrat.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0" }}>
      {tabs.map(([k, l]) => <button key={k} className={`${c.btn} ${tab === k ? c.btnBrand : c.btnGhost}`} style={{ padding: "8px 12px" }} onClick={() => setTab(k)}>{l}</button>)}
    </div>

    {tab === "livraisons" ? <Delivery api={api} onMsg={setMsg} /> : null}
    {tab === "tournees" ? <div style={{ display: "grid", gap: 10 }}>
      {(() => { const nw = tours.filter(t => t.date && nextWeek(t.date)); if (!nw.length) return null; const km = nw.reduce((a, t) => a + (t.plan.km || 0), 0); const drive = nw.reduce((a, t) => a + t.plan.trips.reduce((b, v) => b + (v.driveH ?? v.km / 72), 0), 0); const stops = nw.reduce((a, t) => a + t.clients, 0); return <section className={c.card} style={{ display: "grid", gap: 6, background: "#eef6ff" }}>
        <b style={{ fontSize: 16 }}>📆 Semaine prochaine : {nw.length} tournée{nw.length > 1 ? "s" : ""}</b>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[`👥 ${stops} arrêt${stops > 1 ? "s" : ""} client`, `🛣️ ≈ ${Math.round(km).toLocaleString("fr-FR")} km`, `🚚 ≈ ${hm(drive)} de conduite (72 km/h avec remorque)`, `☕ + ${hm(pauseH(drive))} de pauses`].map(x => <span key={x} className={c.badge} style={{ background: "#fff", color: "#111" }}>{x}</span>)}</div>
        <small className={c.muted}>Détail, ordre des arrêts et liens GPS ci-dessous.</small>
      </section>; })()}
      {tours.length ? [...tours].sort((a, z) => Number(nextWeek(z.date || "")) - Number(nextWeek(a.date || ""))).map(t => { const p = t.plan; return <section key={t.id} className={c.card} style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b style={{ fontSize: 17 }}>{t.name}</b>
          {t.date && nextWeek(t.date) ? <span className={c.badge} style={{ background: "#e8f0fe", color: "#1849a9" }}>Semaine prochaine</span> : null}
          {p.draft ? <span className={c.badge} style={{ background: "#fef0c7", color: "#93370d" }}>Prévisionnel — peut évoluer</span>
            : <span className={c.badge} style={{ background: t.status === "termine" ? "#e7f6ec" : "#e8f0fe", color: "#111" }}>{t.status === "termine" ? "Terminée" : "Validée"}</span>}
          {t.closed_at ? <span className={c.badge} style={{ background: "#fef0c7", color: "#93370d" }}>🔒 Clôturée</span> : null}
        </div>
        <div className={c.muted}>📅 {p.draft ? "Vers le " : ""}{fmt(t.date)}{p.end && p.end !== t.date ? ` → ${fmt(p.end)}` : ""}{t.departTime ? ` · départ ${t.departTime.replace(":", "h")}` : ""}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[`👥 ${t.clients} client${t.clients > 1 ? "s" : ""}`, `🛣️ ≈ ${p.km.toLocaleString("fr-FR")} km`, `⏱️ ≈ ${hm(p.hours)} de travail`, `🗓️ ≈ ${p.days} jour${p.days > 1 ? "s" : ""}`, `🔁 ${p.trips.length} voyage${p.trips.length > 1 ? "s" : ""}`].map(x => <span key={x} className={c.badge} style={{ background: "#f1f1f1", color: "#111" }}>{x}</span>)}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {p.trips.map(v => <div key={v.n} style={{ borderLeft: `5px solid ${v.color}`, background: "#fafafa", borderRadius: 10, padding: "8px 10px", display: "grid", gap: 3 }}>
            <b>Voyage {v.n} · ≈ {v.km.toLocaleString("fr-FR")} km · ≈ {hm(v.hours)}</b>
            {(() => { const d = v.driveH ?? v.km / 72; return <small className={c.muted}>🚚 Conduite ≈ {hm(d)} (72 km/h avec remorque){pauseH(d) ? ` + ${hm(pauseH(d))} de pauses` : ""}</small>; })()}
            <small className={c.muted}>📦 {v.hub} : {v.action}{v.hubPos ? <> · <a href={gmaps(v.hubPos)} target="_blank" rel="noreferrer">GPS</a></> : null}</small>
            {v.clients.map((x, i) => <span key={x.id}>{i + 1}. 🚗 {x.name}{x.ville ? ` — ${x.ville}` : ""}{x.pos ? <> · <a href={gmaps(x.pos)} target="_blank" rel="noreferrer">📍 GPS</a></> : null}</span>)}
            {v.next ? <small className={c.muted}>➡️ Ensuite : {v.next}{v.nextPos ? <> · <a href={gmaps(v.nextPos)} target="_blank" rel="noreferrer">GPS</a></> : null}</small> : null}
            {(() => { const u = tripRoute(v); return u ? <a className={`${c.btn} ${c.btnGhost}`} href={u} target="_blank" rel="noreferrer" style={{ textAlign: "center", textDecoration: "none", padding: "6px 10px" }}>🧭 Tout le voyage dans Google Maps</a> : null; })()}
          </div>)}
        </div>
        {p.stops.length ? <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setMapOf(mapOf === t.id ? "" : t.id)}>{mapOf === t.id ? "Masquer la carte" : "🗺️ Voir la carte"}</button> : null}
        {mapOf === t.id ? <TourMap stops={p.stops} /> : null}
        {p.draft ? <small className={c.muted}>Tournée prévisionnelle : clients, dates et ordre peuvent changer. Les adresses et téléphones apparaîtront quand la tournée sera validée.</small> : null}
        {t.link ? <a className={`${c.btn} ${c.btnBrand}`} href={t.link} style={{ textAlign: "center", textDecoration: "none" }}>Ouvrir la tournée (chargement, livraisons, heures)</a> : null}
      </section>; }) : <p className={c.muted}>Aucune tournée à votre nom pour l’instant.</p>}
    </div> : null}

    {tab === "reservations" ? <div style={{ display: "grid", gap: 8 }}>
      <p className={c.muted}>Lecture seule : les clients qui attendent leur voiture. Les livraisons se font uniquement dans le cadre d’une tournée.</p>
      {res.length ? res.map(r => <section key={r.id} className={c.card} style={{ display: "grid", gap: 4, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><b>{r.prenom} {r.nom}</b><span className={c.badge} style={{ background: "#f1f1f1", color: "#111" }}>{r.statut}</span>{r.priorite === "Urgente" ? <span className={c.badge} style={{ background: "#fde8e7", color: "#b42318" }}>Urgente</span> : null}</div>
        <div className={c.muted}>📍 {r.code_postal} {r.ville} · Date promise : {fmt(r.date_promise)}</div>
        {r.telephone ? <a href={`tel:${r.telephone}`} className={c.muted}>📞 {r.telephone}</a> : null}
      </section>) : <p className={c.muted}>Aucune réservation en cours.</p>}
    </div> : null}

    {tab === "documents" && me ? <div style={{ display: "grid", gap: 10 }}>
      <p className={c.muted}>Une photo nette ou un PDF par document. NeoDrive vérifie chaque document et le valide.</p>
      {me.kinds.map(k => { const d = me.docs[k.id] || { status: "manquant" }; const [bg, col] = ST_COLOR[d.status] || ST_COLOR.manquant; const req = me.required.includes(k.id);
        return <section key={k.id} className={c.card} style={{ display: "grid", gap: 6, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <b>{k.label}{req ? "" : " (facultatif)"}</b>
            <span className={c.badge} style={{ background: bg, color: col }}>{DOC_STATUS_LABEL[d.status] || d.status}</span>
          </div>
          {k.hint ? <small className={c.muted}>{k.hint}</small> : null}
          {d.filename ? <small className={c.muted}>Dernier envoi : {d.filename} · {fmt(d.uploaded_at)}</small> : null}
          {d.status === "refuse" && d.note ? <small className={c.err}>Motif : {d.note}</small> : null}
          <label className={`${c.btn} ${c.btnGhost}`} style={{ textAlign: "center", cursor: "pointer" }}>{busy === k.id ? "Envoi…" : d.status === "manquant" ? "📎 Envoyer le document" : "📎 Envoyer une nouvelle version"}
            <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={e => { upload(k.id, e.target.files?.[0]); e.target.value = ""; }} /></label>
        </section>; })}
    </div> : null}

    {tab === "contrat" ? <section className={c.card} style={{ display: "grid", gap: 12 }}>
      <Contract />
      {signed ? <p style={{ margin: 0, padding: 12, borderRadius: 12, background: "#e7f6ec", color: "#067647", fontWeight: 700 }}>✅ Signé par {contract?.signed_name} le {contract?.signed_at ? new Date(contract.signed_at).toLocaleString("fr-FR") : ""}{contract?.status === "valide" ? " · validé par NeoDrive" : ""}</p>
        : me?.who === "member" ? <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Nom et prénom (signature)<input className={c.input} value={sign} onChange={e => setSign(e.target.value)} placeholder="Ex. : Jean Dupont" /></label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} /><span>J’ai lu le contrat de prestation et je l’accepte. Je signe électroniquement aujourd’hui, le {new Date().toLocaleDateString("fr-FR")}.</span></label>
          <button className={`${c.btn} ${c.btnBrand}`} disabled={busy === "sign" || sign.trim().length < 3 || !accept} onClick={signContract}>{busy === "sign" ? "…" : "✍️ Signer le contrat"}</button>
        </div> : <p className={c.muted}>Aperçu fondateur : la signature se fait depuis le compte du livreur.</p>}
    </section> : null}
  </div></main>;
}
