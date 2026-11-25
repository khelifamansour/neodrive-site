"use client";
import { use, useEffect, useState } from "react";
import SignaturePad from "../../../livreur/SignaturePad";

/**
 * Bon de livraison (lien personnel reçu par SMS ou e-mail, ou ouvert sur le téléphone du chauffeur ou du transporteur).
 * Document unique, toujours le même, signé une seule fois à la remise : il contient la clause de réserve de propriété,
 * que le client ait déjà payé ou non. Aucun montant n'est affiché. Le lien ne périme jamais : une fois signé,
 * il affiche « Bon de livraison déjà signé » avec le PDF.
 */
type Step = "done" | "no_vin" | "sign";
type Info = { ok: boolean; error?: string; step: Step; done: boolean; pdf_url: string | null; signed_at: string | null; has_email: boolean; client: string; modele: string; couleur: string; vin: string; lieu: string; date: string; checks: { id: string; label: string }[]; clauses: string[] };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 16, display: "grid", gap: 10 };
const btn2: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, borderRadius: 14, background: "#fff", color: "#141414", border: "2px solid #141414", cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block", boxSizing: "border-box" };
const when = (d: string | null) => d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(":", " h ") : "";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
const btn: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: 800, border: 0, borderRadius: 14, background: "#e8592a", color: "#fff", cursor: "pointer" };

export default function Confirmer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null); const [err, setErr] = useState("");
  const [accept, setAccept] = useState(false); const [ck, setCk] = useState<Record<string, boolean>>({}); const [name, setName] = useState(""); const [remarks, setRemarks] = useState(""); const [busy, setBusy] = useState(false); const [sig, setSig] = useState<string | null>(null); const [reload, setReload] = useState(false);
  const [tick, setTick] = useState(0); const [email, setEmail] = useState(""); const [back, setBack] = useState("");
  // Ouvert depuis la page chauffeur : bouton « Retour à la tournée » (adresse interne uniquement).
  useEffect(() => { try { const r = new URLSearchParams(window.location.search).get("retour") || ""; if (/^\/chauffeur(\?|$)/.test(r)) setBack(r); } catch { /* ignore */ } }, []);
  useEffect(() => { fetch(`/api/accuse-confirmer?token=${encodeURIComponent(token)}`).then(r => r.json()).then((j: Info) => { if (!j.ok) setErr(j.error || "Ce lien n’existe pas."); else { setErr(""); setReload(false); setInfo(j); setName(n => n || j.client); setCk(Object.fromEntries((j.checks || []).map(c => [c.id, true]))); } }).catch(() => setErr("Connexion impossible, réessayez.")); }, [token, tick]);
  const emailOk = !email.trim() || EMAIL.test(email.trim());
  const canSend = !!info && accept && !!sig && name.trim().length >= 3 && emailOk && !busy;
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/accuse-confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, accept, name, remarks, checks: ck, signature: sig, email: email.trim() }) });
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
        <b style={{ fontSize: 22 }}>✅ Bon de livraison déjà signé</b>
        <span>{info.signed_at ? `Signé le ${when(info.signed_at)}. ` : ""}Tout est en ordre : vous n’avez rien d’autre à signer. Vous le recevez aussi par e-mail si nous avons votre adresse.</span>
        {info.pdf_url ? <a href={info.pdf_url} target="_blank" rel="noreferrer" style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>📄 Télécharger le bon de livraison (PDF)</a> : null}
        <span>Bonne route avec votre NeoDrive !</span>
      </div> : info?.step === "no_vin" ? <div style={box}>
        <b style={{ fontSize: 22 }}>🚗 Pas encore prêt à signer</b>
        <span>Le chauffeur doit d’abord enregistrer le numéro de série de la voiture. Ensuite, touchez « Actualiser ».</span>
        <button style={btn} onClick={() => setTick(t => t + 1)}>🔄 Actualiser</button>
        <span>Une question ? <a href="tel:0689781710">06 89 78 17 10</a></span>
      </div> : info ? <>
        <h1 style={{ fontSize: 22, margin: 0 }}>Bon de livraison de votre véhicule</h1>
        <div style={box}>
          <span>👤 <b>{info.client}</b></span>
          <span>🚗 {info.modele}{info.couleur ? ` · ${info.couleur}` : ""}</span>
          <span>🔢 N° de série : <b style={{ fontFamily: "monospace" }}>{info.vin}</b></span>
          <span>📅 {new Date(info.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {info.lieu ? <span>📍 {info.lieu}</span> : null}
        </div>
        <div style={box}>
          <b>État du véhicule et éléments remis</b>
          <button type="button" onClick={() => setCk(Object.fromEntries(info.checks.map(c => [c.id, true])))} style={{ padding: 12, borderRadius: 12, border: "1px solid #d8d2c8", background: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>✅ Tout cocher</button>
          {info.checks.map(c => <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16 }}><input type="checkbox" checked={!!ck[c.id]} onChange={e => setCk({ ...ck, [c.id]: e.target.checked })} style={{ width: 22, height: 22, flex: "0 0 22px" }} />{c.label}</label>)}
          <small style={{ color: "#666" }}>Décochez ce qui ne vous a pas été remis.</small>
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Remarques sur l’état du véhicule (facultatif)<textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Ex. petite rayure porte gauche" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 16, font: "inherit" }} /></label>
        </div>
        <div style={{ ...box, borderColor: "#f5c2c0" }}>
          <b>Réserve de propriété</b>
          {info.clauses.map((t, i) => <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}><b>{i + 1}.</b> {t}</p>)}
        </div>
        <div style={box}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 17, fontWeight: 700 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ width: 24, height: 24, flex: "0 0 24px" }} />J’ai bien reçu mon véhicule et j’accepte la réserve de propriété ci-dessus</label>
          {!info.has_email ? <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre e-mail pour recevoir le PDF (facultatif)<input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@exemple.fr" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} />{!emailOk ? <small style={{ color: "#b42318" }}>Cette adresse e-mail semble incomplète.</small> : null}</label> : null}
          <label style={{ display: "grid", gap: 4, fontWeight: 600 }}>Votre nom et prénom<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={{ padding: 12, borderRadius: 10, border: "1px solid #d8d2c8", fontSize: 17 }} /></label>
          <b>Votre signature</b>
          <SignaturePad onChange={setSig} />
          {err ? <b style={{ color: "#b42318" }}>{err}</b> : null}
          {reload ? <button style={{ ...btn, background: "#141414" }} onClick={() => setTick(t => t + 1)}>🔄 Recharger la page</button> : null}
          <button style={{ ...btn, opacity: canSend ? 1 : .5 }} disabled={!canSend} onClick={send}>{busy ? "Envoi…" : "✍️ Je signe le bon de livraison"}</button>
          <small style={{ color: "#666" }}>En signant, vous confirmez avoir reçu ce véhicule, sous réserve de vos remarques. C’est le seul document à signer : vous pourrez le télécharger juste après.</small>
        </div>
      </> : null}
    </div>
  </main>;
}
