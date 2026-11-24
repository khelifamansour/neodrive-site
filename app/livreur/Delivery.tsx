"use client";
import { useCallback, useEffect, useState } from "react";
import PaymentDeclare, { payValid, type PayDecl } from "../_components/PaymentDeclare";
import ReserveDeclare from "../_components/ReserveDeclare";
import SignaturePad from "./SignaturePad";
import c from "../giga/giga.module.css";
import s from "./delivery.module.css";
import { supabase } from "../../lib/supabase";
import { VIN_FORMAT, vinCheckOk } from "../../lib/vin";
import { VIRE_CHECK, keptLabel, needsVireCheck, type Declaration, type Kept } from "../../lib/reserve-text";

/** Livraisons en 4 étapes : 1 prévenir le client (« j'arrive »), 2 numéro de série (photo → lecture auto), 3 paiement, 4 signature (téléphone du client ou du livreur). */
/** Échéance par défaut : 3 jours ouvrés. */
const dueDefault = () => { const d = new Date(); let n = 0; while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return d.toISOString().slice(0, 10); };
export type Dlv = {
  id: number; prenom: string; nom: string; adresse: string; code_postal: string; ville: string; telephone: string; has_email: boolean;
  modele: string; couleur: string; statut: string; date_promise: string | null; vin: string | null; has_vin_photo: boolean;
  paiement_confirme_at: string | null; livre_at: string | null; accuse_url: string | null;
  confirm_sent_at: string | null; remote_confirmed: boolean; paiement_en_attente: boolean; montant_du: number | null; prevenu_at: string | null; total: number | null; reserve_url?: string | null; reserve_due?: string | null;
  /** Remise sans paiement : ce que NeoDrive garde (rien = client de confiance). */
  kept?: Kept | null;
  /** Tournée du livreur qui contient ce client (ordre de passage, position GPS). */
  tour_id?: string; tour_name?: string; tour_date?: string; ordre?: number; lat?: number | null; lng?: number | null; link?: string | null;
};
type Check = { id: string; label: string };
type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;
type VinInfo = { check_ok: boolean; match: string | null; doubt: string };

const MANSOUR_TEL = "0689781710";
const big: React.CSSProperties = { width: "100%", padding: "14px 16px", fontSize: 17, borderRadius: 14, justifyContent: "center", textAlign: "center" };
const eur = (n: number | null | undefined) => n == null ? "" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`;
const dFr = (d?: string | null) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "";
/** Navigation : position GPS de l'arrêt si connue, sinon l'adresse. */
const dest = (x: Dlv) => x.lat != null && x.lng != null ? `${x.lat},${x.lng}` : [x.adresse, x.code_postal, x.ville].filter(Boolean).join(" ");
const gmapsTo = (x: Dlv) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest(x))}&travelmode=driving`;
const wazeTo = (x: Dlv) => x.lat != null && x.lng != null ? `https://waze.com/ul?ll=${x.lat},${x.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(dest(x))}&navigate=yes`;
const hasDest = (x: Dlv) => (x.lat != null && x.lng != null) || !!(x.adresse || x.ville);
function NavBtns({ x }: { x: Dlv }) {
  if (!hasDest(x)) return null;
  return <div className={s.two}>
    <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", background: "#33ccff", color: "#04202b", border: 0 }} href={wazeTo(x)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🚙 Waze</a>
    <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} href={gmapsTo(x)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🧭 Maps</a>
  </div>;
}
const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
const hm = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

function Step({ n, title, done, tone, children }: { n: number; title: string; done?: boolean; tone?: string; children: React.ReactNode }) {
  return <div className={`${c.card} ${s.step}`} style={tone ? { background: tone } : undefined}>
    <div className={s.stepHead}><span className={`${s.num} ${done ? s.numDone : ""}`}>{done ? "✓" : n}</span><b style={{ fontSize: 17 }}>{title}</b></div>
    {children}
  </div>;
}

/** Photo → JPEG réduit (≤ 2000 px) : envoi rapide et lisible par la lecture automatique (HEIC compris quand le navigateur sait l'ouvrir). */
async function toJpeg(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise<Blob | null>(res => cv.toBlob(res, "image/jpeg", 0.88));
    if (b) return b;
  } catch { /* format non lisible par le navigateur : on envoie l'original */ }
  return f;
}

export default function Delivery({ api, onMsg, driverName = "" }: { api: Api; onMsg: (m: string) => void; driverName?: string }) {
  const [pay, setPay] = useState<PayDecl>({ lines: [], driver: driverName });
  const [list, setList] = useState<Dlv[]>([]); const [mine, setMine] = useState(false); const [who, setWho] = useState<"owner" | "member">("member");
  const [checksAll, setChecks] = useState<Check[]>([]);
  const [sigMode, setSigMode] = useState(false); const [sent, setSent] = useState<{ sms: boolean; email: boolean; whatsapp: string | null } | null>(null);
  const [notif, setNotif] = useState({ date: "", from: "14:00", to: "16:00" }); const [arrived, setArrived] = useState<string>("");
  const [pend, setPend] = useState({ montant: "", cles: true, documents: true, due: "" }); const [choice, setChoice] = useState<"" | "trust" | "keep">("");
  const [vins, setVins] = useState<{ vin: string; container: string | null }[]>([]);
  const [sel, setSel] = useState<number | null>(null); const [busy, setBusy] = useState("");
  const [vin, setVin] = useState(""); const [photo, setPhoto] = useState(""); const [tail, setTail] = useState(""); const [vinInfo, setVinInfo] = useState<VinInfo | null>(null); const [editVin, setEditVin] = useState(false);
  const [ck, setCk] = useState<Record<string, boolean>>({}); const [reserves, setReserves] = useState(""); const [signer, setSigner] = useState(""); const [sig, setSig] = useState<string | null>(null);
  const [decl, setDecl] = useState<Declaration | null>(null); const [accept, setAccept] = useState(false);
  const [done, setDone] = useState<{ url: string; emailed: boolean; whatsapp: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ deliveries: Dlv[]; checks: Check[]; mine?: boolean; who?: "owner" | "member" }>({ action: "deliveries" });
      setList(d.deliveries); setMine(!!d.mine); setChecks(d.checks); if (d.who) setWho(d.who);
      // Liste des numéros de série libres : utile mais pas bloquante pour afficher les livraisons.
      api<{ vins: { vin: string; container: string | null }[] }>({ action: "free_vins" }).then(v => setVins(v.vins)).catch(() => null);
    } catch (e) { onMsg("❌ " + (e as Error).message); }
  }, [api, onMsg]);
  useEffect(() => { load(); }, [load]);

  const r = list.find(x => x.id === sel) || null;
  const open = (x: Dlv) => {
    setSel(x.id); setVin(x.vin || ""); setPhoto(""); setVinInfo(null); setEditVin(false); setTail(""); setCk({}); setReserves(""); setSigner(`${x.prenom} ${x.nom}`.replace(/\(.*?\)/g, "").trim()); setSig(null); setDone(null); setSigMode(false); setSent(null); setArrived(""); setDecl(null); setAccept(false); setChoice("");
    setNotif({ date: x.date_promise || "", from: "14:00", to: "16:00" }); setPend({ montant: x.montant_du != null ? String(x.montant_du) : x.total != null ? String(x.total) : "", cles: true, documents: true, due: "" }); window.scrollTo({ top: 0 });
  };
  const run = async (key: string, f: () => Promise<void>) => { setBusy(key); try { await f(); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };

  // ── 1. Prévenir le client
  const arrive = (min: number) => r && run("arrive", async () => {
    const j = await api<{ sent: { sms: boolean; email: boolean } }>({ action: "notify_arrival", id: r.id, minutes: min });
    const how = [j.sent.sms ? "SMS" : "", j.sent.email ? "e-mail" : ""].filter(Boolean).join(" + ");
    setArrived(`${min ? `« J'arrive dans ${min} min »` : "« Je suis là »"} envoyé (${how}) avec le lien pour signer.`); onMsg(`✅ ${r.prenom} est prévenu(e) (${how}).`); await load();
  });
  const notifyClient = () => r && run("notif", async () => { await api({ action: "notify_client", id: r.id, date: notif.date, from: notif.from, to: notif.to }); onMsg(`✅ ${r.prenom} est prévenu(e) par SMS.`); await load(); });

  // ── 2. Numéro de série
  const readVin = (path?: string) => r && run("read", async () => {
    const j = await api<{ vin: string | null; raw: string; check_ok: boolean; match: string | null; doubt: string }>({ action: "vin_read", id: r.id, photo_path: path || undefined });
    if (!j.vin) { onMsg("⚠️ Numéro illisible sur la photo. Reprenez-la de plus près, ou tapez le numéro."); setVinInfo(null); return; }
    setVin(j.vin); setVinInfo({ check_ok: j.check_ok, match: j.match, doubt: j.doubt });
    onMsg(j.check_ok ? `✅ Numéro lu : ${j.vin}. Vérifiez puis touchez « Enregistrer ».` : `⚠️ Numéro lu : ${j.vin}, à vérifier sur la plaque.`);
  });
  const uploadPhoto = (f?: File) => f && r && run("photo", async () => {
    if (f.size > 25 * 1024 * 1024) throw new Error("Photo trop lourde (25 Mo maximum).");
    const blob = await toJpeg(f);
    const ext = blob === f ? (f.name.split(".").pop() || "jpg").toLowerCase() : "jpg";
    const u = await api<{ bucket: string; path: string; token: string }>({ action: "vin_photo_url", id: r.id, ext });
    const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, blob, { contentType: blob.type || f.type || undefined });
    if (error) throw new Error("Envoi impossible : " + error.message);
    setPhoto(u.path); setBusy("");
    await readVin(u.path);
  });
  const saveVin = () => r && run("vin", async () => {
    const v = vin.toUpperCase().replace(/[\s-]/g, "");
    if (!VIN_FORMAT.test(v)) throw new Error("Le numéro de série fait 17 caractères (lettres et chiffres, sans I, O ni Q).");
    await api({ action: "save_vin", id: r.id, vin: v, photo_path: photo || undefined });
    onMsg(`✅ Numéro de série ${v} enregistré.`); setEditVin(false); setVinInfo(null); setPhoto(""); await load();
  });

  // ── 3. Paiement
  const unconfirmPaid = () => r && run("paid", async () => { await api({ action: "unconfirm_payment", id: r.id }); onMsg("Paiement remis à « non reçu ». Choisissez à nouveau."); await load(); });
  const confirmPaid = () => r && run("paid", async () => { await api({ action: "confirm_payment", id: r.id }); onMsg("✅ Paiement reçu enregistré."); await load(); });
  const setPending = (on: boolean, kept?: Kept) => r && run("pend", async () => {
    await api({ action: "pending_mode", id: r.id, on, montant_du: pend.montant, due: pend.due || dueDefault(), kept: kept || { cles: pend.cles, documents: pend.documents } });
    onMsg(on ? "✅ Enregistré. Passez à la signature (étape 4)." : "Choix du paiement annulé."); setChoice(""); await load();
  });

  // ── 4. Signature
  const position = () => new Promise<{ lat: number | null; lng: number | null }>(res => {
    if (!navigator.geolocation) return res({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res({ lat: null, lng: null }), { timeout: 6000, maximumAge: 60000 });
  });
  const signNow = () => r && sig && run("sign", async () => {
    const pos = await position();
    const j = await api<{ url: string; emailed: boolean; whatsapp: string | null; reserve?: boolean }>({ action: "sign", id: r.id, checks: ck, reserves, signer, signature: sig, payment: pay.lines, driver_name: pay.driver, declaration: decl, ...pos });
    setDone(j); setSigMode(false); onMsg(j.reserve ? `✅ Remise sans paiement signée par ${r.prenom}.` : `✅ Livraison de ${r.prenom} ${r.nom} terminée, accusé signé.`); await load();
  });
  const sendConfirm = () => r && run("send", async () => {
    const j = await api<{ sent: { sms: boolean; email: boolean }; whatsapp: string | null }>({ action: "send_confirm", id: r.id });
    setSent({ ...j.sent, whatsapp: j.whatsapp }); onMsg(`✅ Lien envoyé à ${r.prenom}${j.sent.sms ? " par SMS" : ""}${j.sent.email ? (j.sent.sms ? " et" : "") + " par e-mail" : ""}.`); await load();
  });
  const checkConfirm = () => r && run("check", async () => {
    const j = await api<{ confirmed: boolean }>({ action: "confirm_status", id: r.id });
    await load(); onMsg(j.confirmed ? `✅ ${r.prenom} a signé.` : "⏳ Pas encore signé. Demandez au client d’ouvrir le lien reçu par SMS.");
  });

  if (r) {
    const owner = who === "owner";
    const paid = !!r.paiement_confirme_at; const pending = !paid && r.paiement_en_attente;
    const kept: Kept = r.kept || { cles: true, documents: true }; const keep = keptLabel(kept);
    const ready = !!r.vin && (paid || (pending && !r.reserve_url));
    const vire = needsVireCheck(!!pending, pay.lines);
    const checks = [...(pending ? checksAll.filter(x => !(x.id === "cles" && kept.cles) && !(x.id === "documents" && kept.documents)) : checksAll), ...(vire ? [VIRE_CHECK] : [])];
    const canSign = ready && signer.trim().length >= 3 && !!sig && !r.accuse_url && (pending ? !!decl && accept : payValid(pay)) && (!vire || !!ck.virement);
    const vinNow = vin.toUpperCase().replace(/[\s-]/g, "");
    const vinOk = VIN_FORMAT.test(vinNow); const checkOk = vinOk && vinCheckOk(vinNow);
    const showVinForm = !r.vin || editVin;
    const pendForm = (k: "trust" | "keep") => <div style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Montant à payer (€)<input className={c.input} inputMode="decimal" value={pend.montant} onChange={e => setPend({ ...pend, montant: e.target.value })} /></label>
      <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>À payer au plus tard le<input className={c.input} type="date" value={pend.due || dueDefault()} onChange={e => setPend({ ...pend, due: e.target.value })} /></label>
      {k === "keep" ? <>
        <b>Je garde :</b>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 16 }}><input type="checkbox" checked={pend.cles} onChange={e => setPend({ ...pend, cles: e.target.checked })} />les clés</label>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 16 }}><input type="checkbox" checked={pend.documents} onChange={e => setPend({ ...pend, documents: e.target.checked })} />les documents</label>
      </> : null}
      <button className={`${c.btn} ${c.btnBrand}`} style={big} disabled={!!busy || (k === "keep" && !pend.cles && !pend.documents) || (!owner && (!pend.cles || !pend.documents))}
        onClick={() => setPending(true, k === "trust" ? { cles: false, documents: false } : { cles: pend.cles, documents: pend.documents })}>{busy === "pend" ? "…" : "Valider"}</button>
    </div>;

    return <section className={s.root} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { setSel(null); load(); }}>← Toutes les livraisons</button>
      <div className={c.card} style={{ display: "grid", gap: 6, padding: 14 }}>
        <b style={{ fontSize: 19 }}>{r.prenom} {r.nom}</b>
        <span>📍 {[r.adresse, `${r.code_postal} ${r.ville}`].filter(Boolean).join(", ") || "Adresse à demander à Mansour"}</span>
        <span>🚗 {r.modele || "NeoDrive"}{r.couleur ? ` · ${r.couleur}` : ""}{r.total ? ` · ${eur(r.total)}` : ""}</span>
        <div className={s.two}>
          {r.telephone ? <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} href={`tel:${r.telephone}`}>📞 Client</a> : <span />}
          {!owner ? <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} href={`tel:${MANSOUR_TEL}`}>📞 Mansour</a> : null}
        </div>
        <NavBtns x={r} />
      </div>

      {r.accuse_url ? <div className={c.card} style={{ background: "#e7f6ec", display: "grid", gap: 8, padding: 14 }}>
        <b>✅ Livrée{r.livre_at ? ` le ${fmt(r.livre_at)}` : ""} · accusé {r.remote_confirmed ? "signé par le client sur son téléphone" : "signé"}</b>
        <span>N° de série : <b style={{ fontFamily: "monospace" }}>{r.vin}</b></span>
        <a className={`${c.btn} ${c.btnBrand}`} style={big} href={r.accuse_url} target="_blank" rel="noreferrer">📄 Voir l’accusé (PDF)</a>
        {done?.whatsapp ? <a className={`${c.btn} ${c.btnGhost}`} style={{ ...big, background: "#1fa855", color: "#fff" }} href={done.whatsapp} target="_blank" rel="noreferrer">💬 Envoyer l’accusé par WhatsApp</a> : null}
        {done ? <small className={c.muted}>{done.emailed ? "📧 Envoyé aussi par e-mail au client." : "Pas d’e-mail client : envoyez-le par WhatsApp."}</small> : null}
      </div> : <>
        <Step n={1} title="Prévenir le client" done={!!r.prevenu_at || !!arrived}>
          <b>🔔 J’arrive dans…</b>
          <div className={s.four}>
            {[15, 30, 60].map(m => <button key={m} className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", padding: "12px 4px" }} disabled={!!busy || (!r.telephone && !r.has_email)} onClick={() => arrive(m)}>{m} min</button>)}
            <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center", padding: "12px 4px" }} disabled={!!busy || (!r.telephone && !r.has_email)} onClick={() => arrive(0)}>Je suis là</button>
          </div>
          <small className={c.muted}>{busy === "arrive" ? "Envoi…" : arrived || `Le client reçoit un SMS${r.has_email ? " et un e-mail" : ""} avec le lien pour signer sur son téléphone.${r.prevenu_at ? ` Déjà prévenu le ${hm(r.prevenu_at)}.` : ""}`}</small>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Prévenir la veille (date et créneau)</summary>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <input className={c.input} type="date" value={notif.date} onChange={e => setNotif({ ...notif, date: e.target.value })} />
              <div className={s.two}>
                <input className={c.input} type="time" value={notif.from} onChange={e => setNotif({ ...notif, from: e.target.value })} />
                <input className={c.input} type="time" value={notif.to} onChange={e => setNotif({ ...notif, to: e.target.value })} />
              </div>
              <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} disabled={!!busy || !notif.date || !r.telephone} onClick={() => { if (confirm(`SMS à ${r.prenom} : livraison le ${fmt(notif.date)} entre ${notif.from} et ${notif.to} ?`)) notifyClient(); }}>{busy === "notif" ? "Envoi…" : "📨 Envoyer le SMS"}</button>
            </div>
          </details>
        </Step>

        <Step n={2} title="Numéro de série" done={!!r.vin && !editVin}>
          {!showVinForm ? <div className={s.ok} style={{ display: "grid", gap: 6 }}>
            <span>✅ <b style={{ fontFamily: "monospace", fontSize: 17 }}>{r.vin}</b></span>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} onClick={() => { setEditVin(true); setVin(r.vin || ""); }}>Modifier</button>
          </div> : <>
            <small className={c.muted}>Photographiez la plaque du constructeur : le numéro se remplit tout seul.</small>
            <div className={s.two}>
              <label className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center", textAlign: "center", padding: "14px 6px", opacity: busy ? .6 : 1 }}>📷 Prendre la photo
                <input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={e => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
              <label className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", textAlign: "center", padding: "14px 6px", opacity: busy ? .6 : 1 }}>🖼️ Galerie
                <input type="file" accept="image/*" hidden disabled={!!busy} onChange={e => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </div>
            {r.has_vin_photo && !photo ? <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} disabled={!!busy} onClick={() => readVin()}>🔍 Lire le VIN sur la photo déjà prise</button> : null}
            {busy === "photo" ? <small>Envoi de la photo…</small> : busy === "read" ? <small>🔍 Lecture du numéro…</small> : null}
            <datalist id="dlv-vins">{vins.map(v => <option key={v.vin} value={v.vin}>{v.container || ""}</option>)}</datalist>
            <input className={c.input} list="dlv-vins" value={vin} maxLength={17} autoCapitalize="characters" spellCheck={false} placeholder="Numéro de série (17 caractères)" onChange={e => { setVin(e.target.value.toUpperCase()); setVinInfo(null); }} style={{ fontFamily: "monospace", fontSize: 17, letterSpacing: .5 }} />
            {vinOk && !checkOk ? <div className={s.warn}>⚠️ Le 9e caractère (contrôle) ne correspond pas. Vérifiez le numéro sur la plaque avant d’enregistrer.</div> : null}
            {vinInfo?.doubt ? <small className={c.muted}>Lecture incertaine : {vinInfo.doubt}</small> : null}
            {vinInfo?.match && vinInfo.match !== vinNow ? <div className={s.warn} style={{ display: "grid", gap: 6 }}>Numéro proche dans le stock : <b style={{ fontFamily: "monospace" }}>{vinInfo.match}</b>
              <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} onClick={() => setVin(vinInfo.match || "")}>Utiliser ce numéro</button></div> : null}
            <button className={`${c.btn} ${c.btnBrand}`} style={big} disabled={!!busy || !vinOk} onClick={saveVin}>{busy === "vin" ? "…" : "Enregistrer"}</button>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Sans photo : taper la fin du numéro</summary>
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                <input className={c.input} value={tail} placeholder="Derniers chiffres (3 à 6)" onChange={e => setTail(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} style={{ fontFamily: "monospace" }} />
                {tail.length >= 3 ? (() => { const hits = vins.filter(v => v.vin.endsWith(tail)).slice(0, 8); return hits.length ? hits.map(v => <button key={v.vin} className={`${c.btn} ${c.btnGhost}`} style={{ fontFamily: "monospace", justifyContent: "flex-start" }} onClick={() => { setVin(v.vin); setTail(""); setVinInfo(null); }}>{v.vin}{v.container ? ` · ${v.container}` : ""}</button>) : <small className={c.err}>Aucun numéro libre ne finit par « {tail} ».</small>; })() : null}
              </div>
            </details>
            {editVin ? <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { setEditVin(false); setVin(r.vin || ""); setVinInfo(null); }}>Annuler</button> : null}
          </>}
        </Step>

        <Step n={3} title="Paiement" done={paid || (pending && !!r.reserve_url)} tone={paid ? "#e7f6ec" : pending ? "#fff4d6" : undefined}>
          {paid ? <>
              <span>✅ <b>Paiement reçu.</b>{r.reserve_url ? " Remettez ce qui avait été gardé et faites signer l’accusé final." : ""}</span>
              {owner && !r.livre_at && !r.reserve_url ? <button className={`${c.btn} ${c.btnGhost}`} disabled={!!busy} onClick={() => { if (confirm("Annuler « Paiement reçu » et choisir à nouveau ?")) unconfirmPaid(); }}>Modifier</button> : null}
            </>
            : pending && r.reserve_url ? <>
              <span>🔒 <b>Remise sans paiement signée</b>{r.montant_du ? ` · ${eur(r.montant_du)} à payer` : ""}{r.reserve_due ? ` avant le ${dFr(r.reserve_due)}` : ""}. {keep ? `NeoDrive garde ${keep}.` : "Tout a été remis."}</span>
              <a href={r.reserve_url} target="_blank" rel="noreferrer">📄 Document signé (PDF)</a>
            </>
            : pending ? <>
              <span>⏳ <b>Paiement pas encore reçu</b>{r.montant_du ? ` · ${eur(r.montant_du)}` : ""}{r.reserve_due ? ` avant le ${dFr(r.reserve_due)}` : ""}.</span>
              <span>{keep ? <>Laissez la voiture mais <b>gardez {keep}</b>.</> : <>Vous laissez la voiture, les clés et les documents.</>}</span>
              <button className={`${c.btn} ${c.btnGhost}`} disabled={!!busy} onClick={() => { if (confirm("Modifier le choix du paiement ?")) setPending(false); }}>Modifier</button>
            </>
            : owner ? <>
              <button className={`${c.btn} ${c.btnBrand} ${s.choice}`} style={{ background: "#067647" }} disabled={!!busy} onClick={() => { if (confirm(`Confirmer : paiement de ${r.prenom} ${r.nom} reçu ?`)) confirmPaid(); }}>{busy === "paid" ? "…" : "✅ Paiement reçu"}</button>
              <button className={`${c.btn} ${c.btnGhost} ${s.choice}`} style={choice === "trust" ? { border: "2px solid #f05a28" } : undefined} onClick={() => setChoice(choice === "trust" ? "" : "trust")}>⏳ Paiement pas encore reçu — je laisse la voiture, les clés et les documents</button>
              {choice === "trust" ? pendForm("trust") : null}
              <button className={`${c.btn} ${c.btnGhost} ${s.choice}`} style={choice === "keep" ? { border: "2px solid #f05a28" } : undefined} onClick={() => setChoice(choice === "keep" ? "" : "keep")}>⏳ Paiement pas encore reçu — je laisse la voiture mais je garde les clés et/ou les documents</button>
              {choice === "keep" ? pendForm("keep") : null}
            </> : <>
              <span>⏳ <b>Paiement pas encore confirmé par Mansour.</b> Ne remettez pas les clés.</span>
              <div className={s.two}>
                <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} onClick={load}>🔄 Vérifier</button>
                <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} href={`tel:${MANSOUR_TEL}`}>📞 Mansour</a>
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mansour m’a dit de laisser la voiture sans paiement</summary>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <small className={c.muted}>Vous laissez la voiture, mais vous gardez les clés et les documents.</small>
                  {pendForm("keep")}
                </div>
              </details>
            </>}
        </Step>

        <Step n={4} title="Signature du client" done={!!r.accuse_url}>
          {!ready ? <small className={c.err}>{!r.vin ? "D’abord le numéro de série (étape 2)." : pending && r.reserve_url ? "Remise déjà signée. L’accusé final se signe après le paiement." : "D’abord le paiement (étape 3)."}</small> : <>
            <button className={`${c.btn} ${c.btnBrand}`} style={big} disabled={!!busy} onClick={sendConfirm}>{busy === "send" ? "Envoi…" : r.confirm_sent_at ? "📲 Renvoyer au client" : "📲 Envoyer au client (il signe sur son téléphone)"}</button>
            {r.confirm_sent_at ? <div style={{ display: "grid", gap: 6, background: "#e8f0fe", borderRadius: 10, padding: 10 }}>
              <span>📲 Lien envoyé le {hm(r.confirm_sent_at)}{sent ? ` (${[sent.sms ? "SMS" : "", sent.email ? "e-mail" : ""].filter(Boolean).join(" + ")})` : ""}.</span>
              <button className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} onClick={checkConfirm}>{busy === "check" ? "…" : "🔄 Le client a-t-il signé ?"}</button>
              {sent?.whatsapp ? <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", background: "#1fa855", color: "#fff" }} href={sent.whatsapp} target="_blank" rel="noreferrer">💬 Envoyer aussi par WhatsApp</a> : null}
            </div> : null}
            <button className={`${c.btn} ${sigMode ? c.btnGhost : c.btnBrand}`} style={{ ...big, ...(sigMode ? {} : { background: "#141414" }) }} onClick={() => setSigMode(!sigMode)}>{sigMode ? "Fermer" : "✍️ Faire signer sur mon téléphone"}</button>
          </>}
        </Step>

        {sigMode && ready ? <div className={c.card} style={{ display: "grid", gap: 10, padding: 14 }}>
          <b>Le client lit et signe</b>
          {pending ? <span className={s.warn}>Paiement pas encore reçu{r.montant_du ? ` (${eur(r.montant_du)})` : ""}. {keep ? `NeoDrive garde ${keep} jusqu’au paiement.` : "Le client reçoit la voiture, les clés et les documents."}</span> : null}
          <button type="button" className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} onClick={() => setCk(Object.fromEntries(checks.map(x => [x.id, true])))}>✅ Tout cocher</button>
          {checks.map(x => <label key={x.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}><input type="checkbox" checked={!!ck[x.id]} onChange={e => setCk({ ...ck, [x.id]: e.target.checked })} /><span style={x.id === "virement" ? { fontWeight: 700, fontSize: 15 } : undefined}>{x.label}</span></label>)}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques du client (facultatif)
            <textarea className={c.input} rows={2} value={reserves} onChange={e => setReserves(e.target.value)} placeholder="Ex. petite rayure porte gauche" /></label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Nom et prénom du client
            <input className={c.input} value={signer} onChange={e => setSigner(e.target.value)} autoComplete="off" style={{ fontSize: 17 }} /></label>
          {pending ? <>
            <ReserveDeclare vin={r.vin || ""} montant={r.montant_du} due={r.reserve_due || null} onChange={setDecl} />
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16, fontWeight: 700 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} /><span>J’ai lu et j’accepte ces conditions, dont la réserve de propriété.</span></label>
          </> : <PaymentDeclare key={r.id} driver={driverName} total={r.total} onChange={setPay} />}
          <SignaturePad onChange={setSig} btnClass={`${c.btn} ${c.btnGhost}`} />
          <button className={`${c.btn} ${c.btnBrand}`} style={{ ...big, opacity: canSign ? 1 : .5 }} disabled={!canSign || !!busy} onClick={signNow}>{busy === "sign" ? "Enregistrement…" : "✍️ Valider la signature"}</button>
          {pending && !decl ? <small className={c.muted}>Le client choisit sa déclaration de paiement.</small> : pending && !accept ? <small className={c.muted}>Le client coche « J’ai lu et j’accepte ».</small> : !pending && !payValid(pay) ? <small className={c.muted}>Le client indique comment il a réglé (moyen + montant).</small> : vire && !ck.virement ? <small className={c.muted}>Le client coche l’engagement sur le virement.</small> : !sig ? <small className={c.muted}>Le client signe dans le cadre.</small> : null}
        </div> : null}
      </>}
    </section>;
  }

  const todo = list.filter(x => !x.accuse_url); const recent = list.filter(x => x.accuse_url);
  const card = (x: Dlv) => <div key={x.id} className={c.card} style={{ display: "grid", gap: 8, padding: 14 }}>
    <button onClick={() => open(x)} style={{ textAlign: "left", display: "grid", gap: 4, cursor: "pointer", font: "inherit", background: "none", border: 0, padding: 0, color: "inherit" }}>
      <b style={{ fontSize: 17 }}>{x.ordre ? `${x.ordre}. ` : ""}{x.prenom} {x.nom}</b>
      <span className={c.muted}>📍 {x.ville || "—"}{x.code_postal ? ` (${x.code_postal.slice(0, 2)})` : ""} · 🚗 {x.modele || "—"}{x.couleur ? ` · ${x.couleur}` : ""}{mine ? "" : ` · 📅 ${fmt(x.date_promise)}`}</span>
      <span style={{ fontSize: 14 }}>{x.vin ? `🔢 ${x.vin}` : "🔢 numéro à saisir"} · {x.paiement_confirme_at ? "💶 payé" : x.paiement_en_attente ? "💶 paiement en attente" : "⏳ paiement à confirmer"}{x.confirm_sent_at ? " · 📲 lien envoyé" : ""}</span>
    </button>
    <NavBtns x={x} />
    <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center" }} onClick={() => open(x)}>✅ Livrer ce client</button>
  </div>;
  const groups: { id: string; name: string; date: string; link: string | null; items: Dlv[] }[] = [];
  for (const x of todo) { const k = x.tour_id || ""; let g = groups.find(y => y.id === k); if (!g) { g = { id: k, name: x.tour_name || "Hors tournée", date: x.tour_date || "", link: x.link || null, items: [] }; groups.push(g); } g.items.push(x); }
  return <section className={s.root} style={{ display: "grid", gap: 10, marginTop: 12 }}>
    <p className={c.muted} style={{ margin: 0 }}>{mine ? "Vos clients, dans l’ordre de passage. " : ""}Pour chaque voiture : 1 prévenir · 2 numéro de série · 3 paiement · 4 signature.</p>
    {todo.length ? (mine ? groups.map(g => <div key={g.id} style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}><b style={{ fontSize: 18 }}>🚚 {g.name}</b>{g.date ? <span className={c.badge} style={{ background: "#e8f0fe", color: "#1849a9" }}>📅 {fmt(g.date)}</span> : null}</div>
      {g.link ? <a className={`${c.btn} ${c.btnGhost}`} href={g.link} style={{ justifyContent: "center", textDecoration: "none" }}>Ouvrir la tournée (chargement, étapes, heures)</a> : null}
      {g.items.map(card)}
    </div>) : todo.map(card)) : <p className={c.muted}>{mine ? "Les clients à livrer apparaissent ici quand une tournée est validée." : "Aucune livraison en attente."}</p>}
    {recent.length ? <><b style={{ marginTop: 8 }}>Livrées ces 3 derniers jours</b>{recent.map(x => <button key={x.id} className={c.card} onClick={() => open(x)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", background: "#e7f6ec", padding: 14 }}>{x.paiement_en_attente && !x.paiement_confirme_at ? "💶" : "✅"} {x.prenom} {x.nom} · {x.ville} · <span style={{ fontFamily: "monospace" }}>{x.vin}</span>{x.paiement_en_attente && !x.paiement_confirme_at ? " · paiement en attente" : ""}</button>)}</> : null}
  </section>;
}
