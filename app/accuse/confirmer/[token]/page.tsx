"use client";
import { use, useEffect, useState } from "react";
import PaymentDeclare, { payValid, type PayDecl } from "../../../_components/PaymentDeclare";
import SignaturePad from "../../../livreur/SignaturePad";
import ReserveDeclare from "../../../_components/ReserveDeclare";
import { VIRE_CHECK, keptLabel, needsVireCheck, type Declaration, type Kept } from "../../../../lib/reserve-text";

/**
 * Page client (lien personnel reçu par SMS ou e-mail, ou ouvert sur le téléphone du chauffeur).
 * Le lien reste valable à chaque étape : il affiche où en est la livraison.
 * Paiement pas encore arrivé : remise avec réserve de propriété. Paiement arrivé : accusé de réception final.
 */
type Step = "done" | "reserve_done" | "no_vin" | "reserve" | "final";
type Info = { ok: boolean; error?: string; step: Step; done: boolean; accuse_url: string | null; accuse_at: string | null; reserve_url: string | null; reserve_at: string | null; has_email: boolean; client: string; modele: string; couleur: string; vin: string; date: string; pending: boolean; montant_du: number | null; driver: string; total: number | null; checks: { id: string; label: string }[]; reserve?: boolean; reserve_done?: boolean; due?: string; clauses?: string[] | null; ready?: boolean; kept?: Kept | null };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 16, display: "grid", gap: 10 };
const btn2: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, borderRadius: 14, background: "#fff", color: "#141414", border: "2px solid #141414", cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block", boxSizing: "border-box" };
const when = (d: string | null) => d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(":", " h ") : "";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
const btn: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, border: 0, borderRadius: 14, background: "#e8592a", color: "#fff", cursor: "pointer" };

export default function Confirmer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null); const [err, setErr] = useState("");
  const [accept, setAccept] = useState(false); const [ck, setCk] = useState<Record<string, boolean>>({}); const [name, setName] = useState(""); const [remarks, setRemarks] = useState(""); const [busy, setBusy] = useState(false); const [pay, setPay] = useState<PayDecl>({ lines: [], driver: "" }); const [sig, setSig] = useState<string | null>(null); const [decl, setDecl] = useState<Declaration | null>(null); const [reload, setReload] = useState(false);
  const [tick, setTick] = useState(0); const [email, setEmail] = useState(""); const [back, setBack] = useState("");
  // Ouvert depuis la page chauffeur : bouton « Retour à la tournée » (adresse interne uniquement).
  useEffect(() => { try { const r = new URLSearchParams(window.location.search).get("retour") || ""; if (/^\/chauffeur(\?|$)/.test(r)) setBack(r); } catch { /* ignore */ } }, []);
  useEffect(() => { fetch(`/api/accuse-confirmer?token=${encodeURIComponent(token)}`).then(r => r.json()).then((j: Info) => { if (!j.ok) setErr(j.error || "Ce lien n’existe pas."); else { setErr(""); setReload(false); setInfo(j); setName(n => n || j.client); setCk({ ...Object.fromEntries(j.checks.map(c => [c.id, true])), virement: true }); } }).catch(() => setErr("Connexion impossible, réessayez.")); }, [token, tick]);
  const keep = info?.kept ? keptLabel(info.kept) : "les clés et les documents";
  const vire = !!info && needsVireCheck(!!info.reserve || !!info.pending, info.reserve ? null : pay.lines);
  const checks = info ? [...info.checks, ...(vire ? [VIRE_CHECK] : [])] : [];
  const emailOk = !email.trim() || EMAIL.test(email.trim());
  const canSend = !!info && accept && !!sig && name.trim().length >= 3 && (info.reserve ? !!decl : payValid(pay)) && (!vire || !!ck.virement) && emailOk && !busy;
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/accuse-confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, accept, name, remarks, checks: ck, payment: info?.reserve ? [] : pay.lines, driver_name: pay.driver, signature: sig, reserve: !!info?.reserve, declaration: info?.reserve ? decl : null, email: email.trim() }) });
      const j = await r.json(); if (!j.ok) { if (j.reload) setReload(true); throw new Error(j.error || "Erreur"); }
      setTick(t => t + 1); window.scrollTo(0, 0);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <main style={{ minHeight: "100vh", background: "#f6f4f0", padding: "20px 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#141414" }}>
    <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#ff7a00,#ff006e)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 22 }}>N</span><b style={{ fontSize: 22 }}>NeoDrive</b></div>
      {back ? <a href={back} style={{ ...btn2, padding: 10, fontSize: 15 }}>↩️ Retour à la tournée</a> : null}
      {err && !info ? <div style={box}><b style={{ fontSize: 20 }}>{err}</b><span>Vérifiez le lien reçu par SMS, ou appelez-nous au <a href="tel:0689781710">06 89 78 17 10</a>.</span>{err.startsWith("Connexion") ? <button style={btn} onClick={() => setTick(t => t + 1)}>🔄 Réessayer</button> : null}</div> : null}
      {!info && !err ? <p>Chargement…</p> : null}
      {info?.step === "done" ? <div style={{ ...box, background: "#e7f6ec" }}>
        <b style={{ fontSize: 22 }}>✅ Accusé de réception signé</b>
        <span>{info.accuse_at ? `Signé le ${when(info.accuse_at)}. ` : ""}Tout est en ordre. Vous le recevez aussi par e-mail si nous avons votre adresse.</span>
        {info.accuse_url ? <a href={info.accuse_url} target="_blank" rel="noreferrer" style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Télécharger l’accusé (PDF)</a> : null}
        {info.reserve_url ? <a href={info.reserve_url} target="_blank" rel="noreferrer" style={btn2}>📄 Document de remise (PDF)</a> : null}
        <span>Bonne route avec votre NeoDrive !</span>
      </div> : info?.step === "reserve_done" ? <div style={{ ...box, background: "#fff4d6" }}>
        <b style={{ fontSize: 22 }}>✅ Remise signée{info.reserve_at ? ` le ${when(info.reserve_at)}` : ""} – en attente du paiement</b>
        <span>Votre signature est bien enregistrée. Le document vous est aussi envoyé par e-mail si nous avons votre adresse.</span>
        <span>Dès que votre paiement arrive sur notre compte{keep ? `, nous vous remettons ${keep}` : ""}. Vous signerez alors l’accusé de réception final <b>sur ce même lien</b>.</span>
        {info.reserve_url ? <a href={info.reserve_url} target="_blank" rel="noreferrer" style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Télécharger la remise signée (PDF)</a> : null}
        <button style={btn2} onClick={() => setTick(t => t + 1)}>🔄 Actualiser</button>
        <span>Une question ? <a href="tel:0689781710">06 89 78 17 10</a></span>
      </div> : info?.step === "no_vin" ? <div style={box}>
        <b style={{ fontSize: 22 }}>🚗 Pas encore prêt à signer</b>
        <span>Le chauffeur doit d’abord enregistrer le numéro de série de la voiture. Ensuite, touchez « Actualiser ».</span>
        <button style={btn} onClick={() => setTick(t => t + 1)}>🔄 Actualiser</button>
        <span>Une question ? <a href="tel:0689781710">06 89 78 17 10</a></span>
      </div> : info ? <>
        {info.step === "final" && info.reserve_url ? <div style={{ ...box, background: "#e7f6ec" }}>
          <b>✅ Paiement reçu. Merci !</b>
          <span>Remise signée{info.reserve_at ? ` le ${when(info.reserve_at)}` : ""}. Il reste à signer l’accusé de réception final ci-dessous.</span>
        </div> : null}
        <h1 style={{ fontSize: 22, margin: 0 }}>{info.reserve ? "Remise de votre véhicule (paiement pas encore arrivé)" : "Accusé de réception de votre véhicule"}</h1>
        <div style={box}>
          <span>👤 <b>{info.client}</b></span>
          <span>🚗 {info.modele}{info.couleur ? ` · ${info.couleur}` : ""}</span>
          <span>🔢 N° de série : <b style={{ fontFamily: "monospace" }}>{info.vin}</b></span>
          <span>📅 {new Date(info.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {info.pending ? <span style={{ background: "#fff4d6", borderRadius: 10, padding: 10 }}>💶 <b>Paiement pas encore arrivé sur notre compte{info.montant_du ? ` : ${Math.round(info.montant_du).toLocaleString("fr-FR")} €` : ""}.</b>{keep ? ` ${keep[0].toUpperCase()}${keep.slice(1)} vous seront remis dès son arrivée.` : ""} Ensuite, vous signerez l’accusé final sur ce même lien.</span> : null}
        </div>
        {info.reserve && info.clauses ? <div style={{ ...box, borderColor: "#f5c2c0" }}>
          <b>Conditions de la remise</b>
          {info.clauses.map((t, i) => <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}><b>{i + 1}.</b> {t}</p>)}
        </div> : null}
        {info.reserve ? <ReserveDeclare vin={info.vin} montant={info.montant_du} due={info.due || null} onChange={setDecl} /> : <PaymentDeclare driver={info.driver} total={info.total} defaultVirement onChange={setPay} />}
        <div style={box}>
          <b>Vérifications</b>
          <button type="button" onClick={() => setCk(Object.fromEntries(checks.map(c => [c.id, true])))} style={{ padding: 12, borderRadius: 12, border: "1px solid #d8d2c8", background: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>✅ Tout cocher</button>
          {checks.map(c => <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: c.id === "virement" ? 15 : 16, fontWeight: c.id === "virement" ? 700 : 400 }}><input type="checkbox" checked={!!ck[c.id]} onChange={e => setCk({ ...ck, [c.id]: e.target.checked })} style={{ width: 22, height: 22, flex: "0 0 22px" }} />{c.label}</label>)}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques (facultatif)<textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Ex. petite rayure porte gauche" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 16, font: "inherit" }} /></label>
        </div>
        <div style={box}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 17, fontWeight: 700 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 24, height: 24, flex: "0 0 24px" }} />{info.reserve ? "J’ai lu et j’accepte les conditions ci-dessus, dont la réserve de propriété" : "J’ai bien reçu mon véhicule"}</label>
          {!info.has_email ? <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre e-mail pour recevoir le PDF (facultatif)<input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@exemple.fr" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} />{!emailOk ? <small style={{ color: "#b42318" }}>Cette adresse e-mail semble incomplète.</small> : null}</label> : null}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre nom et prénom<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} /></label>
          <b>Votre signature</b>
          <SignaturePad onChange={setSig} />
          {err ? <b style={{ color: "#b42318" }}>{err}</b> : null}
          {vire && !ck.virement ? <small style={{ color: "#b42318" }}>Cochez l’engagement sur le virement (dans « Vérifications »).</small> : null}
          {reload ? <button style={{ ...btn, background: "#141414" }} onClick={() => setTick(t => t + 1)}>🔄 Recharger la page</button> : null}
          <button style={{ ...btn, opacity: canSend ? 1 : .5 }} disabled={!canSend} onClick={send}>{busy ? "Envoi…" : info.reserve ? "✍️ Je signe la remise" : "✍️ Je signe l’accusé de réception"}</button>
          <small style={{ color: "#666" }}>{info.reserve ? "En signant, vous acceptez les conditions ci-dessus. Vous pourrez télécharger le document signé juste après." : "En signant, vous confirmez avoir reçu ce véhicule, sous réserve de vos remarques. Vous pourrez télécharger l’accusé juste après."}</small>
        </div>
      </> : null}
    </div>
  </main>;
}
