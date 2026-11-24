"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { supabase } from "../../lib/supabase";
import { DOC_STATUS_LABEL, type Employment } from "../../lib/driver-docs";
import Contract from "./Contract";
import Delivery from "./Delivery";
import ds from "./delivery.module.css";
import Billing, { type BillingInfo } from "./Billing";
import Invoice from "./Invoice";
import Hours from "./Hours";
import TicketsBulk from "./TicketsBulk";
import SignaturePad from "./SignaturePad";
import TourMap from "../planificateur/TourMap";
import type { Stop } from "../../lib/planif";

type DocInfo = { status: string; filename?: string | null; uploaded_at?: string; note?: string | null; signed_name?: string | null; signed_at?: string | null; signature?: string | null; outdated?: boolean };
type Personal = { birth_date?: string; birth_place?: string; nationality?: string; address?: string; ssn?: string; updated_at?: string };
type Me = { who: "owner" | "member"; name: string; contract_type?: "prestataire" | "salarie"; employment?: Employment | null; personal?: Personal; kinds: { id: string; label: string; hint: string }[]; required: string[]; docs: Record<string, DocInfo>; billing?: BillingInfo };
type MyInvoice = { id: number; tour_id: string; tour_name: string; number: string; status: string; worked_min: number; total: number; sent_at: string; paid_at: string | null; url: string | null };
type Res = { id: number; prenom: string; nom: string; ville: string; code_postal: string; departement: string; telephone: string; statut: string; date_promise: string | null; modele: string; priorite: string };
type LL = [number, number];
type Trip = { n: number; color: string; hub: string; hubPos?: LL; action: string; clients: { id: string; name: string; ville: string; pos?: LL }[]; next: string | null; nextPos?: LL | null; driveH?: number; km: number; hours: number };
/** Itinéraire Google Maps (voiture) : vers un point, ou départ → étapes → arrivée. */
const gmaps = (to: LL, from?: LL, via: LL[] = []) => `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.join(",")}` : ""}&destination=${to.join(",")}${via.length ? `&waypoints=${encodeURIComponent(via.map(x => x.join(",")).join("|"))}` : ""}&travelmode=driving`;
/** Pauses : 15 min toutes les 2 h de conduite (remorque, ≈ 72 km/h). */
const pauseH = (drive: number) => Math.floor(drive / 2) * 0.25;
/** Waze ne gère pas les étapes : on guide vers le prochain arrêt du voyage. */
const wazeTo = (p: LL) => `https://waze.com/ul?ll=${p[0]},${p[1]}&navigate=yes`;
const tripRoute = (v: Trip) => { const pts = v.clients.map(x => x.pos).filter(Boolean) as LL[]; const end = v.nextPos || pts[pts.length - 1]; if (!end) return null; const via = v.nextPos ? pts : pts.slice(0, -1); return gmaps(end, v.hubPos, via); };
const nextWeek = (d: string) => { const now = new Date(); const day = (now.getDay() + 6) % 7; const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7); const sun = new Date(mon.getTime() + 7 * 86400e3); const x = new Date(d + "T12:00:00"); return x >= mon && x < sun; };
type Plan = { draft: boolean; stops: Stop[]; trips: Trip[]; km: number; hours: number; days: number; end: string | null };
type Tour = { id: string; tickets?: number; name: string; date: string; departTime: string; driver: string; status: string; clients: number; km: number; closed_at: string | null; en_route: number; link: string | null; plan: Plan };
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
  const [tab, setTab] = useState<"livraisons" | "tournees" | "factures" | "reservations" | "documents" | "contrat">("livraisons");
  const [me, setMe] = useState<Me | null>(null); const [res, setRes] = useState<Res[]>([]); const [tours, setTours] = useState<Tour[]>([]);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const [sign, setSign] = useState(""); const [accept, setAccept] = useState(false); const [sigPng, setSigPng] = useState<string | null>(null);
  const [guide, setGuide] = useState(true);
  const [pers, setPers] = useState<Personal>({});
  useEffect(() => { try { if (localStorage.getItem("nd_livreur_guide") === "0") setGuide(false); } catch { /* privé */ } }, []);
  const toggleGuide = (v: boolean) => { setGuide(v); try { localStorage.setItem("nd_livreur_guide", v ? "1" : "0"); } catch { /* privé */ } };
  const go = (t: "livraisons" | "tournees" | "factures" | "documents" | "contrat") => { setTab(t); setTimeout(() => document.getElementById("nd-tab-zone")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const [mapOf, setMapOf] = useState(""); const [tixOf, setTixOf] = useState(""); const [invOf, setInvOf] = useState(""); const [invoices, setInvoices] = useState<MyInvoice[]>([]);

  const load = useCallback(async () => {
    try {
      const m = await api<Me>({ action: "me" });
      // Tournées et réservations chargées à part : une erreur sur l'une ne vide pas tout l'espace.
      const [r, t] = await Promise.allSettled([m.who === "owner" ? api<{ reservations: Res[] }>({ action: "reservations" }) : Promise.resolve({ reservations: [] as Res[] }), api<{ tours: Tour[] }>({ action: "tours" })]);
      setMe(m); setPers(m.personal || {}); setRes(r.status === "fulfilled" ? r.value.reservations : []); setTours(t.status === "fulfilled" ? t.value.tours : []); setState("ready");
      if (t.status === "rejected") setMsg("❌ Tournées : " + (t.reason as Error).message);
      if (m.who === "member") api<{ invoices: MyInvoice[] }>({ action: "my_invoices" }).then(j => setInvoices(j.invoices)).catch(() => null);
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

  const savePersonal = async () => {
    setBusy("pers"); setMsg("");
    try { await api({ action: "personal_save", ...pers }); await load(); setMsg("✅ Informations enregistrées."); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const signContract = async () => {
    setBusy("sign"); setMsg("");
    try { await api({ action: "contract_sign", signed_name: sign, accept, signature: sigPng }); await load(); setMsg("✅ Contrat signé. Merci !"); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <main className={c.page}><div className={c.login}>
    <h1>🧰 Mon espace NeoDrive</h1>
    <p className={c.muted}>Livraison, préparation</p>
    <p className={c.muted}>Entrez votre code ici (le même que sur la page Organisation).</p>
    <form style={{ display: "grid", gap: 8 }} onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("code") || "").trim(); if (!v) return; try { sessionStorage.setItem("nd_pc", v); } catch { /* privé */ } setState("loading"); load(); }}>
      <input name="code" type="password" inputMode="text" autoComplete="current-password" placeholder="Votre code" className={c.input} style={{ padding: 12, fontSize: 16 }} />
      <button className={`${c.btn} ${c.btnBrand}`} type="submit">Se connecter</button>
    </form>
    <a className={c.muted} href="/organisation" style={{ textAlign: "center" }}>Membre de l’équipe : se connecter depuis Organisation</a>
  </div></main>;

  const contract = me?.docs.contrat;
  const signed = contract && contract.status !== "manquant" && contract.status !== "refuse";
  const missing = (me?.required || []).filter(k => ["manquant", "refuse"].includes(me?.docs[k]?.status || "manquant")).length + (signed ? 0 : 1);
  const member = me?.who === "member";
  const salarie = me?.contract_type === "salarie";
  const persDone = !!(me?.personal?.birth_date && me.personal.ssn && me.personal.address);
  const tabs: [typeof tab, string][] = [["livraisons", "🚗 Livraisons"], ["tournees", `🚚 Mes tournées (${tours.length})`], ["factures", salarie ? "🧾 Heures et tickets" : "🧾 Heures, tickets et factures"], ...(member ? [] : [["reservations", `📋 Réservations en cours (${res.length})`]] as [typeof tab, string][]), ["documents", `🪪 Mes documents${missing ? ` (${missing} à faire)` : " ✅"}`], ["contrat", signed ? "✍️ Contrat ✅" : "✍️ Contrat à signer"]];
  const drafts = tours.filter(t => t.plan.draft);
  const validated = tours.filter(t => !t.plan.draft).length;
  const docsTotal = (me?.required || []).length;
  const docsDone = (me?.required || []).filter(k => !["manquant", "refuse"].includes(me?.docs[k]?.status || "manquant")).length;
  const tester = me?.who === "owner" || /\(test\)/i.test(me?.name || "");
  const emptyTours = <section className={c.card} style={{ display: "grid", gap: 6 }}><b>Aucune tournée pour l’instant.</b><span className={c.muted}>Mansour prépare vos tournées dans le planificateur et vous les revoyez ensemble avant le départ.</span>{tester ? <small className={c.muted}>Pour tester : dans le planificateur, choisissez « Serge » comme livreur sur une tournée et validez-la. <a href="/planificateur">Ouvrir le planificateur</a></small> : null}</section>;
  /** Fin de tournée : heures et pauses → tickets → facture de CETTE tournée (heures × taux), dans cet ordre. */
  const closeBox = (t: Tour) => {
    if (t.plan.draft) return <div style={{ padding: 10, borderRadius: 10, background: "#fffaeb", fontSize: 14 }}>⏳ Tournée prévisionnelle : Mansour la revoit avec vous avant le départ. Une fois validée, vous la ferez, puis vous la clôturerez ici (heures, tickets, facture).</div>;
    if (!member) return <small className={c.muted}>Aperçu fondateur : la clôture se fait depuis le compte du prestataire.</small>;
    if (salarie) return <small className={c.muted}>Fin de tournée : saisissez vos heures et vos pauses dans « 🧾 Heures et tickets » (type « Tournée »), et déposez vos tickets chaque soir. Pas de facture : vos heures sont transmises par le relevé du mois.</small>;
    const inv = invoices.find(x => x.tour_id === t.id);
    if (inv) return <div style={{ padding: 10, borderRadius: 10, background: inv.status === "payee" ? "#e7f6ec" : "#fffaeb" }}>🧾 Facture <b>{inv.number}</b> · {inv.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} · {inv.status === "payee" ? "✅ payée" : "⏳ à payer par NeoDrive"}{inv.url ? <> · <a href={inv.url} target="_blank" rel="noreferrer">PDF</a></> : null}</div>;
    return <div style={{ display: "grid", gap: 6 }}>
      <button className={`${c.btn} ${invOf === t.id ? c.btnGhost : c.btnBrand}`} style={{ justifyContent: "center", fontSize: 17 }} onClick={() => setInvOf(invOf === t.id ? "" : t.id)}>{invOf === t.id ? "Fermer" : "🏁 Clôturer cette tournée"}</button>
      {invOf === t.id ? <Invoice tourId={t.id} api={api} onMsg={setMsg} onDone={() => { setInvOf(""); load(); }} /> : <small className={c.muted}>À faire à la fin de la tournée, une seule fois : 1. vos heures et pauses, jour par jour, 2. vos tickets en photo, 3. la facture de cette tournée (heures × 25 € HT), générée toute seule.</small>}
    </div>;
  };

  return <main className={c.page} style={{ overflowX: "hidden" }}><div className={`${c.wrap} ${ds.shell}`}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a></div>
    <h1 style={{ margin: "14px 0 4px" }}>{salarie ? "🧰 Mon espace – Livraison, préparation" : "🧰 Espace prestataire"}</h1>
    <p className={c.muted}>{salarie ? "" : "Livraison, préparation. "}Bonjour {me?.name?.split(" ")[0] || ""} : vos tournées, vos heures, vos documents et votre contrat.</p>
    {msg ? <p className={c.msg} style={{ fontWeight: 700 }}>{msg}</p> : null}
    {guide ? <section className={c.card} style={{ display: "grid", gap: 10, margin: "14px 0", background: "#fffdf8" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><b style={{ fontSize: 19 }}>🧭 Comment ça marche</b><button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => toggleGuide(false)}>Masquer le guide</button></div>
      {([
        salarie
          ? { n: "①", t: "Mes documents d’embauche", d: "Pièce d’identité, carte Vitale (n° de sécurité sociale), RIB, permis, justificatif de domicile, et vos informations (date et lieu de naissance, adresse) : c’est ce qu’il faut pour votre déclaration d’embauche et votre paie.", st: `${docsDone}/${docsTotal} déposés${persDone ? " · infos ✅" : " · infos à remplir"}`, done: docsTotal > 0 && docsDone >= docsTotal && persDone, b: "Déposer mes documents", to: "documents" as const }
          : { n: "①", t: "Mes documents", d: "SIRET, assurance RC pro, permis, pièce d’identité, RIB : une photo ou un PDF chacun.", st: `${docsDone}/${docsTotal} déposés`, done: docsTotal > 0 && docsDone >= docsTotal, b: "Déposer mes documents", to: "documents" as const },
        { n: "②", t: "Contrat", d: salarie ? "Lisez votre contrat de travail (CDD), puis signez-le avec le doigt." : "Lisez le contrat de prestation, puis signez-le avec le doigt.", st: signed ? `Signé le ${contract?.signed_at ? new Date(contract.signed_at).toLocaleDateString("fr-FR") : ""}` : "À signer", done: !!signed, b: "Lire et signer", to: "contrat" as const },
        { n: "③", t: "Mes tournées", d: "Mansour prépare la tournée, vous la revoyez ensemble avant le départ.", st: `${validated} validée${validated > 1 ? "s" : ""}${drafts.length ? ` · ${drafts.length} prévisionnelle${drafts.length > 1 ? "s" : ""}` : ""}`, done: validated > 0, b: "Voir mes tournées", to: "tournees" as const },
        { n: "④", t: "Livraisons", d: "Pour chaque client : numéro de série + photo de la plaque → paiement confirmé par Mansour → le client déclare comment il a payé et signe l’accusé.", st: validated ? "Clients des tournées validées" : "Dès qu’une tournée est validée", done: false, b: "Voir les livraisons", to: "livraisons" as const },
        salarie
          ? { n: "⑤", t: "Heures", d: "Saisissez vos heures et vos pauses après chaque mission (tournée, préparation, contrôle, réparation, transport), déposez vos tickets chaque soir, puis générez le relevé d’heures du mois : il arrive chez Mansour pour votre paie.", st: "Relevé mensuel", done: false, b: "Saisir mes heures", to: "factures" as const }
          : { n: "⑤", t: "Heures et factures", d: "Saisissez vos heures (tournée ou autre mission : préparation, contrôle, réparation, transport), déposez vos tickets chaque soir, puis générez votre facture (heures × 25 € HT) : elle arrive chez Mansour automatiquement.", st: invoices.length ? `${invoices.length} facture${invoices.length > 1 ? "s" : ""}` : "Aucune facture", done: false, b: "Saisir mes heures", to: "factures" as const },
      ]).map(x => <div key={x.n} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: 10, borderRadius: 12, background: x.done ? "#e7f6ec" : "#fff", border: "1px solid #eee" }}>
        <div style={{ display: "grid", gap: 2 }}><b style={{ fontSize: 16 }}>{x.done ? "✅" : x.n} {x.t} <span className={c.badge} style={{ background: x.done ? "#d1fadf" : "#f1f1f1", color: "#111", marginLeft: 4 }}>{x.st}</span></b><small className={c.muted}>{x.d}</small></div>
        <button className={`${c.btn} ${x.done ? c.btnGhost : c.btnBrand}`} style={{ padding: "12px 14px", fontSize: 15 }} onClick={() => go(x.to)}>{x.b}</button>
      </div>)}
    </section> : <button className={`${c.btn} ${c.btnGhost}`} style={{ margin: "10px 0", padding: "6px 10px", fontSize: 13 }} onClick={() => toggleGuide(true)}>🧭 Afficher le guide « Comment ça marche »</button>}
    <div id="nd-tab-zone" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0" }}>
      {tabs.map(([k, l]) => { const alert = k === "documents" && missing > 0 && tab !== k; return <button key={k} className={`${c.btn} ${tab === k || alert ? c.btnBrand : c.btnGhost}`} style={{ padding: "8px 12px", ...(alert ? { background: "#fff4ec", color: "#b54708", border: "2px solid #f05a28" } : {}) }} onClick={() => setTab(k)}>{l}</button>; })}
    </div>

    {tab === "livraisons" ? <div style={{ display: "grid", gap: 10 }}>
      <Delivery api={api} onMsg={setMsg} driverName={me?.who === "owner" ? "Mansour Khelifa" : (me?.name || "").replace(/\s*\(test\)\s*$/i, "").trim()} />
      {drafts.length ? <section className={c.card} style={{ display: "grid", gap: 8, background: "#fffaeb" }}>
        <b>🗓️ Prochaines tournées (prévisionnelles)</b>
        <small className={c.muted}>Mansour les revoit avec vous avant le départ. Les adresses, téléphones et étapes de livraison apparaissent ici dès qu’une tournée est validée.</small>
        {drafts.map(t => <div key={t.id} style={{ display: "grid", gap: 2 }}><b>{t.name} · vers le {fmt(t.date)}</b>
          {t.plan.trips.flatMap(v => v.clients).map((x, i) => <span key={x.id} className={c.muted}>{i + 1}. 🚗 {x.name}{x.ville ? ` — ${x.ville}` : ""}</span>)}</div>)}
      </section> : null}
    </div> : null}
    {tab === "factures" ? <div style={{ display: "grid", gap: 10 }}>
      {member ? <Hours api={api} onMsg={setMsg} salarie={salarie} tours={tours.filter(t => !t.plan.draft).map(t => ({ id: t.id, name: t.name }))} onInvoiced={() => api<{ invoices: MyInvoice[] }>({ action: "my_invoices" }).then(j => setInvoices(j.invoices)).catch(() => null)} /> : <p className={c.muted} style={{ margin: 0 }}>Aperçu fondateur : la saisie des heures se fait depuis le compte du livreur.</p>}
      <p className={c.muted} style={{ margin: 0 }}>{salarie ? "Saisissez vos heures après chaque mission et générez le relevé du mois pour la paie. Déposez vos tickets chaque soir (photos) et gardez les originaux papier pour Mansour. Repas en tournée remboursés jusqu’à 30 €/jour." : "Une facture par tournée : à la fin de chaque tournée, cliquez « Clôturer cette tournée » et suivez les étapes (heures et pauses → tickets → facture). Déposez vos tickets chaque soir (photos) et gardez les originaux papier pour Mansour. Hôtel max 70 €/nuit, repas max 30 €/jour."}</p>
      {[...tours].sort((a, z) => String(z.date).localeCompare(String(a.date))).map(t => <section key={t.id} className={c.card} style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><b style={{ fontSize: 17 }}>{t.name}</b><span className={c.muted}>📅 {fmt(t.date)}</span>
          {t.plan.draft ? <span className={c.badge} style={{ background: "#fef0c7", color: "#93370d" }}>Prévisionnelle</span> : <span className={c.badge} style={{ background: "#e8f0fe", color: "#111" }}>{t.status === "termine" ? "Terminée" : "Validée"}</span>}
          {!t.plan.draft ? <span className={c.badge} style={{ background: "#f1f1f1", color: "#111" }}>🧾 {t.tickets || 0} ticket{(t.tickets || 0) > 1 ? "s" : ""}</span> : null}</div>
        {closeBox(t)}
      </section>)}
      {!tours.length ? emptyTours : null}
      {member && !salarie ? <Billing initial={me?.billing || null} api={api} onSaved={load} onMsg={setMsg} /> : null}
      {invoices.length ? <section className={c.card} style={{ display: "grid", gap: 6, padding: 14 }}><b>🧾 Toutes mes factures</b>{invoices.map(x => <span key={x.id}>{x.number} · {x.tour_name} · {x.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} · {x.status === "payee" ? `✅ payée le ${x.paid_at ? new Date(x.paid_at).toLocaleDateString("fr-FR") : ""}` : "⏳ à payer"}{x.url ? <> · <a href={x.url} target="_blank" rel="noreferrer">PDF</a></> : null}</span>)}</section> : null}
    </div> : null}
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
        {t.link ? <a className={`${c.btn} ${c.btnBrand}`} href={t.link} style={{ justifyContent: "center", textAlign: "center", textDecoration: "none", fontSize: 18, padding: 16 }}>🚚 Ouvrir ma tournée (Waze / Maps)</a> : null}
        <div className={c.muted}>📅 {p.draft ? "Vers le " : ""}{fmt(t.date)}{p.end && p.end !== t.date ? ` → ${fmt(p.end)}` : ""}{t.departTime ? ` · départ ${t.departTime.replace(":", "h")}` : ""}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[`👥 ${t.clients} client${t.clients > 1 ? "s" : ""}`, `🛣️ ≈ ${p.km.toLocaleString("fr-FR")} km`, `⏱️ ≈ ${hm(p.hours)} de travail`, `🗓️ ≈ ${p.days} jour${p.days > 1 ? "s" : ""}`, `🔁 ${p.trips.length} voyage${p.trips.length > 1 ? "s" : ""}`].map(x => <span key={x} className={c.badge} style={{ background: "#f1f1f1", color: "#111" }}>{x}</span>)}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {p.trips.map(v => <div key={v.n} style={{ borderLeft: `5px solid ${v.color}`, background: "#fafafa", borderRadius: 10, padding: "8px 10px", display: "grid", gap: 3 }}>
            <b>Voyage {v.n} · ≈ {v.km.toLocaleString("fr-FR")} km · ≈ {hm(v.hours)}</b>
            {(() => { const d = v.driveH ?? v.km / 72; return <small className={c.muted}>🚚 Conduite ≈ {hm(d)} (72 km/h avec remorque){pauseH(d) ? ` + ${hm(pauseH(d))} de pauses` : ""}</small>; })()}
            <small className={c.muted}>📦 {v.hub} : {v.action}{v.hubPos ? <> · <a href={gmaps(v.hubPos)} target="_blank" rel="noreferrer">GPS</a></> : null}</small>
            {v.clients.map((x, i) => <span key={x.id}>{i + 1}. 🚗 {x.name}{x.ville ? ` — ${x.ville}` : ""}{x.pos ? <> · <a href={wazeTo(x.pos)} target="_blank" rel="noreferrer">🚙 Waze</a> · <a href={gmaps(x.pos)} target="_blank" rel="noreferrer">🧭 Maps</a></> : null}</span>)}
            {v.next ? <small className={c.muted}>➡️ Ensuite : {v.next}{v.nextPos ? <> · <a href={gmaps(v.nextPos)} target="_blank" rel="noreferrer">GPS</a></> : null}</small> : null}
            {(() => { const u = tripRoute(v); const first = v.clients.find(x => x.pos)?.pos || v.nextPos; return u ? <div style={{ display: "grid", gridTemplateColumns: first ? "1fr 1fr" : "1fr", gap: 6 }}>
              {first ? <a className={`${c.btn} ${c.btnGhost}`} href={wazeTo(first)} target="_blank" rel="noreferrer" style={{ justifyContent: "center", textDecoration: "none", padding: "6px 10px", background: "#33ccff", color: "#04202b", border: 0 }}>🚙 Waze (1er arrêt)</a> : null}
              <a className={`${c.btn} ${c.btnGhost}`} href={u} target="_blank" rel="noreferrer" style={{ justifyContent: "center", textDecoration: "none", padding: "6px 10px" }}>🧭 Tout le voyage dans Google Maps</a>
            </div> : null; })()}
          </div>)}
        </div>
        {p.stops.length ? <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setMapOf(mapOf === t.id ? "" : t.id)}>{mapOf === t.id ? "Masquer la carte" : "🗺️ Voir la carte"}</button> : null}
        {mapOf === t.id ? <TourMap stops={p.stops} /> : null}
        {p.draft ? <small className={c.muted}>Tournée prévisionnelle : clients, dates et ordre peuvent changer. Les adresses et téléphones apparaîtront quand la tournée sera validée.</small> : null}
        {!p.draft ? <div style={{ display: "grid", gap: 6, padding: 10, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
          <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", fontSize: 17 }} onClick={() => setTixOf(tixOf === t.id ? "" : t.id)}>🧾 {tixOf === t.id ? "Fermer les tickets" : "Ajouter mes tickets (photos)"} · {t.tickets || 0} ticket{(t.tickets || 0) > 1 ? "s" : ""} pour cette tournée</button>
          {tixOf === t.id ? <TicketsBulk btnClass={`${c.btn} ${c.btnBrand}`} todayCount={0} onMsg={setMsg}
            upload={async f => { if (f.size > 15 * 1024 * 1024) throw new Error("Photo trop lourde (15 Mo maximum)."); const u = await api<{ bucket: string; path: string; token: string }>({ action: "ticket_upload_url", tour_id: t.id }); const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "image/jpeg" }); if (error) throw new Error("Envoi de la photo impossible, réessayez."); return u.path; }}
            save={async paths => { await api({ action: "ticket_add", tour_id: t.id, paths }); await load(); }} /> : null}
          <small className={c.muted}>Déposez vos tickets chaque soir (photos) et gardez les originaux papier pour Mansour. Hôtel max 70 €/nuit, repas max 30 €/jour.</small>
        </div> : null}
        {closeBox(t)}
      </section>; }) : emptyTours}
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
      {invoices.length ? <section className={c.card} style={{ display: "grid", gap: 6, padding: 14 }}><b>🧾 Mes factures</b>{invoices.map(x => <span key={x.id}>{x.number} · {x.tour_name} · {x.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} · {x.status === "payee" ? `✅ payée le ${x.paid_at ? new Date(x.paid_at).toLocaleDateString("fr-FR") : ""}` : "⏳ à payer"}{x.url ? <> · <a href={x.url} target="_blank" rel="noreferrer">PDF</a></> : null}</span>)}</section> : null}
      {salarie && member ? <section className={c.card} style={{ display: "grid", gap: 8, padding: 14 }}>
        <b>👤 Mes informations pour l’embauche {persDone ? "✅" : ""}</b>
        <small className={c.muted}>Nécessaires pour votre déclaration d’embauche et vos fiches de paie. Elles ne sont visibles que par Mansour.</small>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
          <label className={c.small}>Date de naissance<input className={c.input} type="date" value={pers.birth_date || ""} onChange={e => setPers({ ...pers, birth_date: e.target.value })} style={{ width: "100%" }} /></label>
          <label className={c.small}>Lieu de naissance (ville, pays)<input className={c.input} value={pers.birth_place || ""} onChange={e => setPers({ ...pers, birth_place: e.target.value })} style={{ width: "100%" }} /></label>
          <label className={c.small}>Nationalité<input className={c.input} value={pers.nationality || ""} onChange={e => setPers({ ...pers, nationality: e.target.value })} style={{ width: "100%" }} /></label>
          <label className={c.small}>N° de sécurité sociale<input className={c.input} inputMode="numeric" value={pers.ssn || ""} onChange={e => setPers({ ...pers, ssn: e.target.value })} placeholder="1 85 12 31 555 123 45" style={{ width: "100%" }} /></label>
          <label className={c.small} style={{ gridColumn: "1 / -1" }}>Adresse complète<input className={c.input} value={pers.address || ""} onChange={e => setPers({ ...pers, address: e.target.value })} placeholder="N°, rue, code postal, ville" style={{ width: "100%" }} /></label>
        </div>
        <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center" }} disabled={busy === "pers"} onClick={savePersonal}>{busy === "pers" ? "…" : "Enregistrer mes informations"}</button>
      </section> : null}
      <p style={{ margin: 0, padding: 12, borderRadius: 12, background: "#fff4ec", fontWeight: 600 }}>📄 Déposez ici vos documents : appuyez sur le bouton orange de chaque document, prenez-le en photo (ou choisissez un PDF). NeoDrive vérifie chaque document et le valide.</p>
      {me.kinds.map(k => { const d = me.docs[k.id] || { status: "manquant" }; const [bg, col] = ST_COLOR[d.status] || ST_COLOR.manquant; const req = me.required.includes(k.id);
        return <section key={k.id} className={c.card} style={{ display: "grid", gap: 6, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <b>{k.label}{req ? "" : " (facultatif)"}</b>
            <span className={c.badge} style={{ background: bg, color: col }}>{DOC_STATUS_LABEL[d.status] || d.status}</span>
          </div>
          {k.hint ? <small className={c.muted}>{k.hint}</small> : null}
          {d.filename ? <small className={c.muted}>Dernier envoi : {d.filename} · {fmt(d.uploaded_at)}</small> : null}
          {d.status === "refuse" && d.note ? <small className={c.err}>Motif : {d.note}</small> : null}
          <label className={`${c.btn} ${d.status === "manquant" || d.status === "refuse" ? c.btnBrand : c.btnGhost}`} style={{ justifyContent: "center", textAlign: "center", cursor: "pointer", fontSize: 17, padding: 14 }}>{busy === k.id ? "Envoi…" : d.status === "manquant" ? "📷 Prendre en photo / choisir un fichier" : "📷 Envoyer une nouvelle version"}
            <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={e => { upload(k.id, e.target.files?.[0]); e.target.value = ""; }} /></label>
        </section>; })}
    </div> : null}

    {tab === "contrat" ? <section className={c.card} style={{ display: "grid", gap: 12 }}>
      <Contract salarie={salarie} name={me?.name || ""} employment={me?.employment || null} />
      {signed ? <p style={{ margin: 0, padding: 12, borderRadius: 12, background: "#e7f6ec", color: "#067647", fontWeight: 700 }}>✅ Signé par {contract?.signed_name} le {contract?.signed_at ? new Date(contract.signed_at).toLocaleString("fr-FR") : ""}{contract?.status === "valide" ? " · validé par NeoDrive" : ""}{contract?.signature ? <img src={contract.signature} alt="Signature" style={{ display: "block", maxWidth: 260, marginTop: 8, background: "#fff", borderRadius: 8 }} /> : null}</p>
        : me?.who === "member" ? <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 }}>
          {contract?.outdated ? <p style={{ margin: 0, padding: 10, borderRadius: 10, background: "#fffaeb" }}>Le contrat a été mis à jour : merci de le relire et de le signer à nouveau, à la main.</p> : null}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Nom et prénom (signature)<input className={c.input} value={sign} onChange={e => setSign(e.target.value)} placeholder="Ex. : Jean Dupont" /></label>
          <div style={{ display: "grid", gap: 4 }}><b>Signature à la main</b><SignaturePad onChange={setSigPng} btnClass={`${c.btn} ${c.btnGhost}`} /></div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} /><span>Lu et approuvé : j’ai lu {salarie ? "mon contrat de travail" : "le contrat de prestation"} et je l’accepte. Je signe aujourd’hui, le {new Date().toLocaleDateString("fr-FR")}.</span></label>
          <button className={`${c.btn} ${c.btnBrand}`} disabled={busy === "sign" || sign.trim().length < 3 || !accept || !sigPng} onClick={signContract}>{busy === "sign" ? "…" : "✍️ Signer le contrat"}</button>
        </div> : <p className={c.muted}>Aperçu fondateur : la signature se fait depuis le compte du prestataire.</p>}
    </section> : null}
  </div></main>;
}
