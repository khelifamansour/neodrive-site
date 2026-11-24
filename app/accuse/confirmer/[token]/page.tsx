"use client";
import { use, useEffect, useState } from "react";
import PaymentDeclare, { payValid, type PayDecl } from "../../../_components/PaymentDeclare";
import SignaturePad from "../../../livreur/SignaturePad";
import ReserveDeclare from "../../../_components/ReserveDeclare";
import { keptLabel, type Declaration, type Kept } from "../../../../lib/reserve-text";

/** Page client : confirmation de la réception du véhicule (lien personnel reçu par SMS ou e-mail). */
type Info = { ok: boolean; error?: string; done: boolean; accuse_url: string | null; client: string; modele: string; couleur: string; vin: string; date: string; pending: boolean; montant_du: number | null; driver: string; total: number | null; checks: { id: string; label: string }[]; reserve?: boolean; reserve_done?: boolean; due?: string; clauses?: string[] | null; ready?: boolean; kept?: Kept | null };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 16, display: "grid", gap: 10 };
const btn: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, border: 0, borderRadius: 14, background: "#e8592a", color: "#fff", cursor: "pointer" };

export default function Confirmer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null); const [err, setErr] = useState("");
  const [accept, setAccept] = useState(false); const [ck, setCk] = useState<Record<string, boolean>>({}); const [name, setName] = useState(""); const [remarks, setRemarks] = useState(""); const [busy, setBusy] = useState(false); const [pay, setPay] = useState<PayDecl>({ lines: [], driver: "" }); const [sig, setSig] = useState<string | null>(null); const [decl, setDecl] = useState<Declaration | null>(null); const [reload, setReload] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { fetch(`/api/accuse-confirmer?token=${encodeURIComponent(token)}`).then(r => r.json()).then((j: Info) => { if (!j.ok) setErr(j.error || "Lien invalide."); else { setErr(""); setReload(false); setInfo(j); setName(n => n || j.client); setCk(Object.fromEntries(j.checks.map(c => [c.id, true]))); } }).catch(() => setErr("Connexion impossible, réessayez.")); }, [token, tick]);
  const keep = info?.kept ? keptLabel(info.kept) : "les clés et les documents";
  const canSend = !!info && accept && !!sig && name.trim().length >= 3 && (info.reserve ? !!decl : payValid(pay)) && !busy;
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/accuse-confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, accept, name, remarks, checks: ck, payment: info?.reserve ? [] : pay.lines, driver_name: pay.driver, signature: sig, reserve: !!info?.reserve, declaration: info?.reserve ? decl : null }) });
      const j = await r.json(); if (!j.ok) { if (j.reload) setReload(true); throw new Error(j.error || "Erreur"); }
      setInfo(i => i ? { ...i, done: true, accuse_url: j.accuse_url, reserve_done: !!j.reserve || i.reserve_done } : i);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <main style={{ minHeight: "100vh", background: "#f6f4f0", padding: "20px 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#141414" }}>
    <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#ff7a00,#ff006e)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 22 }}>N</span><b style={{ fontSize: 22 }}>NeoDrive</b></div>
      {err && !info ? <div style={box}><b>{err}</b><span>Besoin d’aide ? Appelez-nous au <a href="tel:0689781710">06 89 78 17 10</a>.</span></div> : null}
      {!info && !err ? <p>Chargement…</p> : null}
      {info?.done && info.reserve_done ? <div style={{ ...box, background: "#fff4d6" }}>
        <b style={{ fontSize: 20 }}>✅ Remise signée</b>
        <span>Votre document de remise avec paiement en attente (réserve de propriété) est enregistré et vous est envoyé par e-mail.{keep ? ` Dès réception de votre paiement, nous vous remettons ou envoyons ${keep} du véhicule.` : ""}</span>
        {info.accuse_url ? <a href={info.accuse_url} style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Voir le document signé (PDF)</a> : null}
        <span>Une question ? <a href="tel:0689781710">06 89 78 17 10</a></span>
      </div> : info?.done ? <div style={{ ...box, background: "#e7f6ec" }}>
        <b style={{ fontSize: 20 }}>✅ Merci, c’est confirmé !</b>
        <span>Votre accusé de réception est enregistré{info.pending && keep ? `. ${keep[0].toUpperCase()}${keep.slice(1)} vous seront remis ou envoyés dès réception de votre paiement` : ""}. Vous le recevez aussi par e-mail si nous avons votre adresse.</span>
        {info.accuse_url ? <a href={info.accuse_url} style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Voir mon accusé (PDF)</a> : null}
        <span>Bonne route avec votre NeoDrive !</span>
      </div> : info && info.ready === false ? <div style={box}>
        <b style={{ fontSize: 20 }}>🚗 Votre livreur arrive</b>
        <span>Le bon de livraison sera prêt à signer quand le livreur sera avec vous et aura vérifié le véhicule. Gardez cette page ouverte et touchez « Actualiser » à son arrivée.</span>
        <button style={btn} onClick={() => setTick(t => t + 1)}>🔄 Actualiser</button>
        <span>Une question ? <a href="tel:0689781710">06 89 78 17 10</a></span>
      </div> : info ? <>
        <h1 style={{ fontSize: 22, margin: 0 }}>{info.reserve ? "Remise de votre véhicule – paiement en attente (réserve de propriété)" : "Confirmez la réception de votre véhicule"}</h1>
        <div style={box}>
          <span>👤 <b>{info.client}</b></span>
          <span>🚗 {info.modele}{info.couleur ? ` · ${info.couleur}` : ""}</span>
          <span>🔢 N° de série : <b style={{ fontFamily: "monospace" }}>{info.vin}</b></span>
          <span>📅 {new Date(info.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {info.pending ? <span style={{ background: "#fff4d6", borderRadius: 10, padding: 10 }}>💶 <b>Paiement en attente{info.montant_du ? ` : ${Math.round(info.montant_du).toLocaleString("fr-FR")} €` : ""}.</b>{keep ? ` ${keep[0].toUpperCase()}${keep.slice(1)} vous seront remis ou envoyés dès réception de votre virement.` : ""}</span> : null}
        </div>
        {info.reserve && info.clauses ? <div style={{ ...box, borderColor: "#f5c2c0" }}>
          <b>Conditions de la remise</b>
          {info.clauses.map((t, i) => <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}><b>{i + 1}.</b> {t}</p>)}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques (facultatif)<textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 16, font: "inherit" }} /></label>
        </div> : <div style={box}>
          <b>Vérifications</b>
          {info.checks.map(c => <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}><input type="checkbox" checked={!!ck[c.id]} onChange={e => setCk({ ...ck, [c.id]: e.target.checked })} style={{ width: 22, height: 22, flex: "0 0 22px" }} />{c.label}</label>)}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques (facultatif)<textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Ex. petite rayure porte gauche" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 16, font: "inherit" }} /></label>
        </div>}
        {info.reserve ? <ReserveDeclare vin={info.vin} montant={info.montant_du} due={info.due || null} onChange={setDecl} /> : <PaymentDeclare driver={info.driver} total={info.total} onChange={setPay} />}
        <div style={box}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 17, fontWeight: 700 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 24, height: 24, flex: "0 0 24px" }} />{info.reserve ? "J’ai lu et j’accepte les conditions ci-dessus, dont la réserve de propriété" : "J’ai bien reçu mon véhicule"}</label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre nom et prénom<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} /></label>
          <b>Votre signature</b>
          <SignaturePad onChange={setSig} />
          {err ? <b style={{ color: "#b42318" }}>{err}</b> : null}
          {reload ? <button style={{ ...btn, background: "#141414" }} onClick={() => setTick(t => t + 1)}>🔄 Recharger la page</button> : null}
          <button style={{ ...btn, opacity: canSend ? 1 : .5 }} disabled={!canSend} onClick={send}>{busy ? "Envoi…" : info.reserve ? "Je signe la remise du véhicule" : "Je signe et confirme la réception"}</button>
          <small style={{ color: "#666" }}>{info.reserve ? "En signant, vous acceptez les conditions ci-dessus. Le document signé vous est envoyé en PDF." : "En confirmant, vous reconnaissez avoir reçu ce véhicule, sous réserve de vos remarques. Votre accusé de réception vous est envoyé en PDF."}</small>
        </div>
      </> : null}
    </div>
  </main>;
}
