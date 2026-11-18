"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import PaymentDeclare, { payValid, type PayDecl } from "../_components/PaymentDeclare";
import c from "../giga/giga.module.css";
import { supabase } from "../../lib/supabase";

/** Livraisons : numéro de série (VIN) + photo de la plaque, puis accusé de réception confirmé par le client (lien SMS) ou signé sur le téléphone du livreur. */
export type Dlv = {
  id: number; prenom: string; nom: string; adresse: string; code_postal: string; ville: string; telephone: string; has_email: boolean;
  modele: string; couleur: string; statut: string; date_promise: string | null; vin: string | null; has_vin_photo: boolean;
  paiement_confirme_at: string | null; livre_at: string | null; accuse_url: string | null;
  confirm_sent_at: string | null; remote_confirmed: boolean; paiement_en_attente: boolean; montant_du: number | null; prevenu_at: string | null; total: number | null;
  /** Tournée du livreur qui contient ce client (ordre de passage, position GPS). */
  tour_id?: string; tour_name?: string; tour_date?: string; ordre?: number; lat?: number | null; lng?: number | null; link?: string | null;
};
type Check = { id: string; label: string };
type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const big: React.CSSProperties = { width: "100%", padding: "14px 16px", fontSize: 17, borderRadius: 14, justifyContent: "center", textAlign: "center" };
/** Navigation : position GPS de l'arrêt si connue, sinon l'adresse. */
const dest = (x: Dlv) => x.lat != null && x.lng != null ? `${x.lat},${x.lng}` : [x.adresse, x.code_postal, x.ville].filter(Boolean).join(" ");
const gmapsTo = (x: Dlv) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest(x))}&travelmode=driving`;
const wazeTo = (x: Dlv) => x.lat != null && x.lng != null ? `https://waze.com/ul?ll=${x.lat},${x.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(dest(x))}&navigate=yes`;
const hasDest = (x: Dlv) => (x.lat != null && x.lng != null) || !!(x.adresse || x.ville);
function NavBtns({ x }: { x: Dlv }) {
  if (!hasDest(x)) return null;
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
    <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center", background: "#33ccff", color: "#04202b", border: 0 }} href={wazeTo(x)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🚙 Waze</a>
    <a className={`${c.btn} ${c.btnGhost}`} style={{ justifyContent: "center" }} href={gmapsTo(x)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🧭 Google Maps</a>
  </div>;
}
const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const drawing = useRef(false); const strokes = useRef(0);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1); const w = cv.clientWidth; const h = 200;
    cv.width = w * ratio; cv.height = h * ratio; const ctx = cv.getContext("2d")!; ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  }, []);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent) => { e.preventDefault(); ref.current!.setPointerCapture(e.pointerId); drawing.current = true; const [x, y] = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const [x, y] = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; strokes.current++; onChange(strokes.current ? ref.current!.toDataURL("image/png") : null); };
  const clear = () => { const cv = ref.current!; const ctx = cv.getContext("2d")!; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore(); strokes.current = 0; onChange(null); };
  return <div>
    <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} style={{ width: "100%", height: 200, border: "2px dashed #bbb", borderRadius: 12, touchAction: "none", background: "#fff", display: "block" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}><small className={c.muted}>Le client signe avec le doigt dans le cadre.</small><button type="button" className={`${c.btn} ${c.btnGhost}`} onClick={clear}>Effacer</button></div>
  </div>;
}

export default function Delivery({ api, onMsg, driverName = "" }: { api: Api; onMsg: (m: string) => void; driverName?: string }) {
  const [pay, setPay] = useState<PayDecl>({ lines: [], driver: driverName });
  const [list, setList] = useState<Dlv[]>([]); const [mine, setMine] = useState(false); const [checksAll, setChecks] = useState<Check[]>([]); const [checksPending, setChecksPending] = useState<Check[]>([]);
  const [sigMode, setSigMode] = useState(false); const [sent, setSent] = useState<{ sms: boolean; email: boolean; whatsapp: string | null } | null>(null);
  const [notif, setNotif] = useState({ date: "", from: "14:00", to: "16:00" }); const [pend, setPend] = useState({ montant: "", cles: false, documents: false }); const [vins, setVins] = useState<{ vin: string; container: string | null }[]>([]);
  const [sel, setSel] = useState<number | null>(null); const [busy, setBusy] = useState("");
  const [vin, setVin] = useState(""); const [photo, setPhoto] = useState(""); const [tail, setTail] = useState("");
  const [ck, setCk] = useState<Record<string, boolean>>({}); const [reserves, setReserves] = useState(""); const [signer, setSigner] = useState(""); const [sig, setSig] = useState<string | null>(null);
  const [done, setDone] = useState<{ url: string; emailed: boolean; whatsapp: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ deliveries: Dlv[]; checks: Check[]; checks_pending: Check[]; mine?: boolean }>({ action: "deliveries" });
      setList(d.deliveries); setMine(!!d.mine); setChecks(d.checks); setChecksPending(d.checks_pending || d.checks);
      // Liste des numéros de série libres : utile mais pas bloquante pour afficher les livraisons.
      api<{ vins: { vin: string; container: string | null }[] }>({ action: "free_vins" }).then(v => setVins(v.vins)).catch(() => null);
    } catch (e) { onMsg("❌ " + (e as Error).message); }
  }, [api, onMsg]);
  useEffect(() => { load(); }, [load]);

  const r = list.find(x => x.id === sel) || null;
  const open = (x: Dlv) => { setSel(x.id); setVin(x.vin || ""); setPhoto(""); setCk({}); setReserves(""); setSigner(`${x.prenom} ${x.nom}`.replace(/\(.*?\)/g, "").trim()); setSig(null); setDone(null); setSigMode(false); setSent(null); setNotif({ date: x.date_promise || "", from: "14:00", to: "16:00" }); setPend({ montant: x.montant_du != null ? String(x.montant_du) : x.total != null ? String(x.total) : "", cles: false, documents: false }); window.scrollTo({ top: 0 }); };

  const uploadPhoto = async (f?: File) => {
    if (!f || !r) return; setBusy("photo");
    try {
      if (f.size > 15 * 1024 * 1024) throw new Error("Photo trop lourde (15 Mo maximum).");
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const u = await api<{ bucket: string; path: string; token: string }>({ action: "vin_photo_url", id: r.id, ext });
      const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || undefined });
      if (error) throw new Error("Envoi impossible : " + error.message);
      setPhoto(u.path); onMsg("✅ Photo de la plaque prête. Vérifiez le numéro puis enregistrez.");
    } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const saveVin = async () => {
    if (!r) return; const v = vin.toUpperCase().replace(/[\s-]/g, "");
    if (!VIN_RE.test(v)) { onMsg("❌ Le numéro de série doit faire 17 caractères (lettres et chiffres, sans I, O ni Q)."); return; }
    setBusy("vin");
    try { await api({ action: "save_vin", id: r.id, vin: v, photo_path: photo || undefined }); onMsg(`✅ Numéro de série ${v} enregistré pour ${r.prenom} ${r.nom}.`); await load(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const position = () => new Promise<{ lat: number | null; lng: number | null }>(res => {
    if (!navigator.geolocation) return res({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res({ lat: null, lng: null }), { timeout: 6000, maximumAge: 60000 });
  });
  const signNow = async () => {
    if (!r || !sig) return; setBusy("sign");
    try {
      const pos = await position();
      const j = await api<{ url: string; emailed: boolean; whatsapp: string | null }>({ action: "sign", id: r.id, checks: ck, reserves, signer, signature: sig, payment: pay.lines, driver_name: pay.driver, ...pos });
      setDone(j); onMsg(`✅ Livraison de ${r.prenom} ${r.nom} terminée, accusé signé.`); await load();
    } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };

  const notifyClient = async () => {
    if (!r) return; setBusy("notif");
    try { await api({ action: "notify_client", id: r.id, date: notif.date, from: notif.from, to: notif.to }); onMsg(`✅ ${r.prenom} est prévenu(e) par SMS.`); await load(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const setPending = async (on: boolean) => {
    if (!r) return; setBusy("pend");
    try { await api({ action: "pending_mode", id: r.id, on, montant_du: pend.montant, kept: { cles: pend.cles, documents: pend.documents } }); onMsg(on ? "✅ Livraison avec paiement en attente : gardez les clés et les documents." : "Paiement en attente annulé."); await load(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const sendConfirm = async () => {
    if (!r) return; setBusy("send");
    try { const j = await api<{ sent: { sms: boolean; email: boolean }; whatsapp: string | null }>({ action: "send_confirm", id: r.id }); setSent({ ...j.sent, whatsapp: j.whatsapp }); onMsg(`✅ Lien envoyé à ${r.prenom}${j.sent.sms ? " par SMS" : ""}${j.sent.email ? (j.sent.sms ? " et" : "") + " par e-mail" : ""}. Il confirme sur son téléphone.`); await load(); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };
  const checkConfirm = async () => {
    if (!r) return; setBusy("check");
    try { const j = await api<{ confirmed: boolean }>({ action: "confirm_status", id: r.id }); if (j.confirmed) { onMsg(`✅ ${r.prenom} a confirmé la réception.`); await load(); } else onMsg("⏳ Pas encore confirmé. Demandez au client d’ouvrir le lien reçu par SMS."); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); }
  };

  if (r) {
    const paid = !!r.paiement_confirme_at; const pending = !paid && r.paiement_en_attente; const ready = !!r.vin && (paid || pending);
    const checks = pending ? checksPending : checksAll; const allChecked = checks.every(x => ck[x.id]);
    const canSign = ready && signer.trim().length >= 3 && !!sig && !r.accuse_url && payValid(pay);
    return <section style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { setSel(null); load(); }}>← Toutes les livraisons</button>
      <div className={c.card} style={{ display: "grid", gap: 6 }}>
        <b style={{ fontSize: 19 }}>{r.prenom} {r.nom}</b>
        <span>📍 {[r.adresse, `${r.code_postal} ${r.ville}`].filter(Boolean).join(", ") || "Adresse à demander à Mansour"}</span>
        <span>🚗 {r.modele || "NeoDrive"}{r.couleur ? ` · ${r.couleur}` : ""}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.telephone ? <a className={`${c.btn} ${c.btnGhost}`} href={`tel:${r.telephone}`}>📞 Appeler</a> : null}
        </div>
        <NavBtns x={r} />
      </div>

      {r.accuse_url ? <div className={c.card} style={{ background: "#e7f6ec" }}>
        <b>✅ Livrée{r.livre_at ? ` le ${fmt(r.livre_at)}` : ""} · accusé {r.remote_confirmed ? "confirmé à distance par le client" : "signé"}</b>
        {pending ? <p style={{ margin: "6px 0", color: "#b42318", fontWeight: 700 }}>💶 Paiement en attente : gardez les clés et les documents. NeoDrive les enverra au client dès réception du paiement.</p> : null}
        <p style={{ margin: "6px 0" }}>N° de série : <b style={{ fontFamily: "monospace" }}>{r.vin}</b></p>
        <a className={`${c.btn} ${c.btnBrand}`} style={big} href={r.accuse_url} target="_blank" rel="noreferrer">📄 Voir l’accusé (PDF)</a>
        {done?.whatsapp ? <a className={`${c.btn} ${c.btnGhost}`} style={{ ...big, marginTop: 8, background: "#1fa855", color: "#fff" }} href={done.whatsapp} target="_blank" rel="noreferrer">💬 Envoyer l’accusé au client par WhatsApp</a> : null}
        {done ? <p className={c.muted}>{done.emailed ? "📧 Envoyé aussi par e-mail au client." : "Pas d’e-mail envoyé (adresse inconnue) : envoyez le lien par WhatsApp."}</p> : null}
      </div> : <>
        <div className={c.card} style={{ display: "grid", gap: 8 }}>
          <b>📨 Prévenir le client de la livraison</b>
          <small className={c.muted}>Un SMS avec la date et le créneau. À envoyer la veille ou le matin.{r.prevenu_at ? ` Déjà prévenu le ${fmt(r.prevenu_at)}.` : ""}</small>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 6 }}>
            <input className={c.input} type="date" value={notif.date} onChange={e => setNotif({ ...notif, date: e.target.value })} />
            <input className={c.input} type="time" value={notif.from} onChange={e => setNotif({ ...notif, from: e.target.value })} />
            <input className={c.input} type="time" value={notif.to} onChange={e => setNotif({ ...notif, to: e.target.value })} />
          </div>
          <button className={`${c.btn} ${c.btnGhost}`} style={big} disabled={!!busy || !notif.date || !r.telephone} onClick={() => { if (confirm(`Envoyer le SMS à ${r.prenom} : livraison le ${fmt(notif.date)} entre ${notif.from} et ${notif.to} ?`)) notifyClient(); }}>{busy === "notif" ? "Envoi…" : "📨 Prévenir le client par SMS"}</button>
        </div>

        <div className={c.card} style={{ display: "grid", gap: 8 }}>
          <b>1. Numéro de série (VIN)</b>
          <small className={c.muted}>Lisez la plaque du véhicule (17 caractères) et photographiez-la. Sans appareil photo : tapez juste la fin du VIN (ex. 483) et touchez la bonne voiture ; la photo est alors facultative.</small>
          <input className={c.input} value={tail} placeholder="Derniers chiffres du VIN (3 à 6)" onChange={e => setTail(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} style={{ fontFamily: "monospace" }} />
          {tail.length >= 3 ? (() => { const hits = vins.filter(v => v.vin.endsWith(tail)).slice(0, 8); return hits.length ? <div style={{ display: "grid", gap: 6 }}>{hits.map(v => <button key={v.vin} className={`${c.btn} ${c.btnGhost}`} style={{ fontFamily: "monospace", justifyContent: "flex-start" }} onClick={() => { setVin(v.vin); setTail(""); }}>{v.vin}{v.container ? ` · ${v.container}` : ""}</button>)}</div> : <small className={c.err}>Aucun VIN libre ne finit par « {tail} » : tapez le VIN complet.</small>; })() : null}
          <datalist id="dlv-vins">{vins.map(v => <option key={v.vin} value={v.vin}>{v.container || ""}</option>)}</datalist>
          <input className={c.input} list="dlv-vins" value={vin} maxLength={17} autoCapitalize="characters" spellCheck={false} placeholder="Ex. LP4SE0D0…" onChange={e => setVin(e.target.value.toUpperCase())} style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 1 }} />
          <label className={`${c.btn} ${c.btnGhost}`} style={{ ...big, opacity: busy === "photo" ? .6 : 1 }}>{busy === "photo" ? "Envoi…" : photo || r.has_vin_photo ? "📷 Reprendre la photo de la plaque" : "📷 Photographier la plaque VIN (facultatif)"}
            <input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={e => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
          {photo || r.has_vin_photo ? <small className={c.muted}>✅ Photo de la plaque enregistrée.</small> : null}
          <button className={`${c.btn} ${c.btnBrand}`} style={big} disabled={!!busy || vin.length !== 17} onClick={saveVin}>{busy === "vin" ? "…" : r.vin === vin && !photo ? "✅ Numéro enregistré" : "Enregistrer le numéro de série"}</button>
        </div>

        <div className={c.card} style={{ display: "grid", gap: 8, background: paid ? "#e7f6ec" : pending ? "#fde8e7" : "#fff4d6" }}>
          <b>2. Paiement</b>
          {paid ? <span>✅ <b>Paiement reçu : confirmé par NeoDrive.</b> Vous pouvez remettre les clés après l’accusé.</span>
            : pending ? <span>💶 <b>Livraison avec paiement en attente{r.montant_du ? ` (${Math.round(r.montant_du).toLocaleString("fr-FR")} € dus)` : ""}.</b> Laissez la voiture, mais <b>gardez les clés et les documents</b>. NeoDrive les enverra au client par courrier suivi dès réception du paiement.</span>
            : <span>⏳ <b>Paiement pas encore confirmé.</b> Ne remettez pas les clés. Le client fait son virement instantané, Mansour le confirme, puis appuyez sur « Vérifier ».</span>}
          {!paid ? <button className={`${c.btn} ${c.btnGhost}`} style={big} onClick={load}>🔄 Vérifier le paiement</button> : null}
          {!paid && !pending ? <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Le virement n’est pas instantané ? Livraison avec paiement en attente</summary>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <small className={c.muted}>Seulement avec l’accord de Mansour. La voiture reste chez le client, vous repartez avec les clés et les documents.</small>
              <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Montant restant dû (€)<input className={c.input} inputMode="decimal" value={pend.montant} onChange={e => setPend({ ...pend, montant: e.target.value })} /></label>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={pend.cles} onChange={e => setPend({ ...pend, cles: e.target.checked })} style={{ width: 22, height: 22 }} />Je garde les clés (2)</label>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={pend.documents} onChange={e => setPend({ ...pend, documents: e.target.checked })} style={{ width: 22, height: 22 }} />Je garde les documents du véhicule</label>
              <button className={`${c.btn} ${c.btnBrand}`} style={big} disabled={!!busy || !pend.cles || !pend.documents} onClick={() => setPending(true)}>{busy === "pend" ? "…" : "Livrer avec paiement en attente"}</button>
            </div>
          </details> : null}
          {pending && !r.accuse_url ? <button className={`${c.btn} ${c.btnGhost}`} onClick={() => { if (confirm("Annuler la livraison avec paiement en attente ?")) setPending(false); }}>Annuler le paiement en attente</button> : null}
        </div>

        <div className={c.card} style={{ display: "grid", gap: 10 }}>
          <b>3. Accusé de réception</b>
          <small className={c.muted}>Le plus simple : le client reçoit un lien par SMS et confirme sur son propre téléphone. Sinon, il signe sur le vôtre.</small>
          <button className={`${c.btn} ${c.btnBrand}`} style={{ ...big, opacity: ready ? 1 : .5 }} disabled={!ready || !!busy} onClick={sendConfirm}>{busy === "send" ? "Envoi…" : r.confirm_sent_at ? "📲 Renvoyer le lien au client" : "📲 Envoyer l’accusé au client"}</button>
          {r.confirm_sent_at ? <div style={{ display: "grid", gap: 6, background: "#e8f0fe", borderRadius: 10, padding: 10 }}>
            <span>📲 Lien envoyé le {new Date(r.confirm_sent_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{sent ? ` (${[sent.sms ? "SMS" : "", sent.email ? "e-mail" : ""].filter(Boolean).join(" + ")})` : ""}. Le client coche « J’ai bien reçu mon véhicule » et écrit son nom.</span>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={checkConfirm}>{busy === "check" ? "…" : "🔄 Vérifier si le client a confirmé"}</button>
            {sent?.whatsapp ? <a className={`${c.btn} ${c.btnGhost}`} style={{ background: "#1fa855", color: "#fff", textAlign: "center" }} href={sent.whatsapp} target="_blank" rel="noreferrer">💬 Envoyer aussi le lien par WhatsApp</a> : null}
          </div> : null}
          {!ready ? <small className={c.err}>{!r.vin ? "Enregistrez d’abord le numéro de série (étape 1)." : "Attendez la confirmation du paiement (étape 2)."}</small> : null}
          <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setSigMode(!sigMode)}>{sigMode ? "Masquer la signature sur mon téléphone" : "✍️ Ou faire signer sur mon téléphone"}</button>
        </div>
        {sigMode ? <div className={c.card} style={{ display: "grid", gap: 10 }}>
          <b>Signature sur votre téléphone (le client lit et signe)</b>
          {checks.map(x => <label key={x.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}><input type="checkbox" checked={!!ck[x.id]} onChange={e => setCk({ ...ck, [x.id]: e.target.checked })} style={{ width: 22, height: 22, flex: "0 0 22px" }} />{x.label}</label>)}
          {!allChecked ? <small className={c.muted}>Une case non cochée apparaîtra comme non vérifiée sur l’accusé.</small> : null}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Réserves ou remarques du client (facultatif)
            <textarea className={c.input} rows={2} value={reserves} onChange={e => setReserves(e.target.value)} placeholder="Ex. petite rayure porte gauche" /></label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Nom et prénom du client
            <input className={c.input} value={signer} onChange={e => setSigner(e.target.value)} autoComplete="off" style={{ fontSize: 17 }} /></label>
          <PaymentDeclare key={r.id} driver={driverName} total={r.total} onChange={setPay} />
          <SignaturePad onChange={setSig} />
          <button className={`${c.btn} ${c.btnBrand}`} style={{ ...big, opacity: canSign ? 1 : .5 }} disabled={!canSign || !!busy} onClick={signNow}>{busy === "sign" ? "Enregistrement…" : "✍️ Valider la livraison"}</button>
          {!r.vin ? <small className={c.err}>Enregistrez d’abord le numéro de série (étape 1).</small> : !ready ? <small className={c.err}>Attendez la confirmation du paiement (étape 2).</small> : !payValid(pay) ? <small className={c.muted}>Le client indique comment il a réglé (moyen + montant).</small> : !sig ? <small className={c.muted}>Le client doit signer dans le cadre.</small> : null}
        </div> : null}
      </>}
    </section>;
  }

  const todo = list.filter(x => !x.accuse_url); const recent = list.filter(x => x.accuse_url);
  const card = (x: Dlv) => <div key={x.id} className={c.card} style={{ display: "grid", gap: 8 }}>
    <button onClick={() => open(x)} style={{ textAlign: "left", display: "grid", gap: 4, cursor: "pointer", font: "inherit", background: "none", border: 0, padding: 0, color: "inherit" }}>
      <b style={{ fontSize: 17 }}>{x.ordre ? `${x.ordre}. ` : ""}{x.prenom} {x.nom}</b>
      <span className={c.muted}>📍 {x.ville || "—"}{x.code_postal ? ` (${x.code_postal.slice(0, 2)})` : ""} · 🚗 {x.modele || "—"}{x.couleur ? ` · ${x.couleur}` : ""}{mine ? "" : ` · 📅 ${fmt(x.date_promise)}`}</span>
      <span style={{ fontSize: 14 }}>{x.vin ? `🔢 ${x.vin}` : "🔢 VIN à saisir"} · {x.paiement_confirme_at ? "💶 paiement confirmé" : x.paiement_en_attente ? "💶 paiement en attente" : "⏳ paiement à confirmer"}{x.confirm_sent_at ? " · 📲 lien envoyé" : ""}</span>
    </button>
    <NavBtns x={x} />
    <button className={`${c.btn} ${c.btnBrand}`} style={{ justifyContent: "center" }} onClick={() => open(x)}>✅ Livrer ce client (VIN, paiement, accusé)</button>
  </div>;
  const groups: { id: string; name: string; date: string; link: string | null; items: Dlv[] }[] = [];
  for (const x of todo) { const k = x.tour_id || ""; let g = groups.find(y => y.id === k); if (!g) { g = { id: k, name: x.tour_name || "Hors tournée", date: x.tour_date || "", link: x.link || null, items: [] }; groups.push(g); } g.items.push(x); }
  return <section style={{ display: "grid", gap: 10, marginTop: 12 }}>
    <p className={c.muted} style={{ margin: 0 }}>{mine ? "Vos clients à livrer, tournée par tournée, dans l’ordre de passage. " : ""}Pour chaque voiture : 1. numéro de série et photo de la plaque, 2. paiement confirmé par Mansour, 3. accusé : lien envoyé au client par SMS, ou signature sur votre téléphone.</p>
    {todo.length ? (mine ? groups.map(g => <div key={g.id} style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}><b style={{ fontSize: 18 }}>🚚 {g.name}</b>{g.date ? <span className={c.badge} style={{ background: "#e8f0fe", color: "#1849a9" }}>📅 {fmt(g.date)}</span> : null}</div>
      {g.link ? <a className={`${c.btn} ${c.btnGhost}`} href={g.link} style={{ justifyContent: "center", textDecoration: "none" }}>Ouvrir la tournée (chargement, étapes, heures)</a> : null}
      {g.items.map(card)}
    </div>) : todo.map(card)) : <p className={c.muted}>{mine ? "Les clients à livrer apparaissent ici quand une tournée est validée." : "Aucune livraison en attente."}</p>}
    {recent.length ? <><b style={{ marginTop: 8 }}>Livrées ces 3 derniers jours</b>{recent.map(x => <button key={x.id} className={c.card} onClick={() => open(x)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", background: "#e7f6ec" }}>{x.paiement_en_attente && !x.paiement_confirme_at ? "💶" : "✅"} {x.prenom} {x.nom} · {x.ville} · <span style={{ fontFamily: "monospace" }}>{x.vin}</span>{x.paiement_en_attente && !x.paiement_confirme_at ? " · paiement en attente" : ""}</button>)}</> : null}
  </section>;
}
