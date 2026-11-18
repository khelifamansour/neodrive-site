"use client";
import { use, useEffect, useState } from "react";
import PaymentDeclare, { payValid, type PayDecl } from "../../../_components/PaymentDeclare";

/** Page client : confirmation de la réception du véhicule (lien personnel reçu par SMS ou e-mail). */
type Info = { ok: boolean; error?: string; done: boolean; accuse_url: string | null; client: string; modele: string; couleur: string; vin: string; date: string; pending: boolean; montant_du: number | null; driver: string; total: number | null; checks: { id: string; label: string }[] };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 16, display: "grid", gap: 10 };
const btn: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, border: 0, borderRadius: 14, background: "#e8592a", color: "#fff", cursor: "pointer" };

export default function Confirmer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null); const [err, setErr] = useState("");
  const [accept, setAccept] = useState(false); const [ck, setCk] = useState<Record<string, boolean>>({}); const [name, setName] = useState(""); const [remarks, setRemarks] = useState(""); const [busy, setBusy] = useState(false); const [pay, setPay] = useState<PayDecl>({ lines: [], driver: "" });
  useEffect(() => { fetch(`/api/accuse-confirmer?token=${encodeURIComponent(token)}`).then(r => r.json()).then((j: Info) => { if (!j.ok) setErr(j.error || "Lien invalide."); else { setInfo(j); setName(j.client); setCk(Object.fromEntries(j.checks.map(c => [c.id, true]))); } }).catch(() => setErr("Connexion impossible, réessayez.")); }, [token]);
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/accuse-confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, accept, name, remarks, checks: ck, payment: pay.lines, driver_name: pay.driver }) });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || "Erreur");
      setInfo(i => i ? { ...i, done: true, accuse_url: j.accuse_url } : i);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <main style={{ minHeight: "100vh", background: "#f6f4f0", padding: "20px 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#141414" }}>
    <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#ff7a00,#ff006e)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 22 }}>N</span><b style={{ fontSize: 22 }}>NeoDrive</b></div>
      {err && !info ? <div style={box}><b>{err}</b><span>Besoin d’aide ? Appelez-nous au <a href="tel:0689781710">06 89 78 17 10</a>.</span></div> : null}
      {!info && !err ? <p>Chargement…</p> : null}
      {info?.done ? <div style={{ ...box, background: "#e7f6ec" }}>
        <b style={{ fontSize: 20 }}>✅ Merci, c’est confirmé !</b>
        <span>Votre accusé de réception est enregistré{info.pending ? ". Les clés et les documents vous seront remis ou envoyés dès réception de votre paiement" : ""}. Vous le recevez aussi par e-mail si nous avons votre adresse.</span>
        {info.accuse_url ? <a href={info.accuse_url} style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Voir mon accusé (PDF)</a> : null}
        <span>Bonne route avec votre NeoDrive !</span>
      </div> : info ? <>
        <h1 style={{ fontSize: 22, margin: 0 }}>Confirmez la réception de votre véhicule</h1>
        <div style={box}>
          <span>👤 <b>{info.client}</b></span>
          <span>🚗 {info.modele}{info.couleur ? ` · ${info.couleur}` : ""}</span>
          <span>🔢 N° de série : <b style={{ fontFamily: "monospace" }}>{info.vin}</b></span>
          <span>📅 {new Date(info.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {info.pending ? <span style={{ background: "#fff4d6", borderRadius: 10, padding: 10 }}>💶 <b>Paiement en attente{info.montant_du ? ` : ${Math.round(info.montant_du).toLocaleString("fr-FR")} €` : ""}.</b> Les clés et les documents vous seront remis ou envoyés par courrier suivi dès réception de votre virement.</span> : null}
        </div>
        <div style={box}>
          <b>Vérifications</b>
          {info.checks.map(c => <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}><input type="checkbox" checked={!!ck[c.id]} onChange={e => setCk({ ...ck, [c.id]: e.target.checked })} style={{ width: 22, height: 22, flex: "0 0 22px" }} />{c.label}</label>)}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques (facultatif)<textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Ex. petite rayure porte gauche" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 16, font: "inherit" }} /></label>
        </div>
        <PaymentDeclare driver={info.driver} total={info.total} onChange={setPay} />
        <div style={box}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 17, fontWeight: 700 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 24, height: 24, flex: "0 0 24px" }} />J’ai bien reçu mon véhicule</label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre nom et prénom<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} /></label>
          {err ? <b style={{ color: "#b42318" }}>{err}</b> : null}
          <button style={{ ...btn, opacity: accept && name.trim().length >= 3 && payValid(pay) && !busy ? 1 : .5 }} disabled={!accept || name.trim().length < 3 || !payValid(pay) || busy} onClick={send}>{busy ? "Envoi…" : "Je confirme la réception"}</button>
          <small style={{ color: "#666" }}>En confirmant, vous reconnaissez avoir reçu ce véhicule, sous réserve de vos remarques. Votre accusé de réception vous est envoyé en PDF.</small>
        </div>
      </> : null}
    </div>
  </main>;
}
