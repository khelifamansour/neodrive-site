"use client";

import { useEffect, useState } from "react";
import type { PackPublicView } from "../../../lib/delivery-pack";

const euro = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const C = { navy: "#16202e", acc: "#e8592a", grey: "#5b6573", soft: "#f4f6fa", line: "#e3e6ec" };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 18px", margin: "14px 0" };
const btn: React.CSSProperties = { display: "block", width: "100%", border: 0, borderRadius: 12, padding: "14px 16px", fontSize: 16, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" };

export default function PackClient({ token }: { token: string }) {
  const [pack, setPack] = useState<PackPublicView | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [copied, setCopied] = useState(false);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    fetch(`/api/livraison-pack/client/${token}`, { cache: "no-store" }).then(r => r.json()).then(j => { if (j.ok) { setPack(j.pack); setState("ok"); } else setState("missing"); }).catch(() => setState("missing"));
  }, [token]);

  const copy = async () => {
    if (!pack) return;
    try { await navigator.clipboard.writeText(pack.rib.ibanCompact); }
    catch { const t = document.createElement("textarea"); t.value = pack.rib.ibanCompact; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };
  const act = async (action: "confirm" | "change") => {
    setBusy(true); setInfo("");
    try {
      const r = await fetch(`/api/livraison-pack/client/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, message }) });
      const j = await r.json();
      if (j.ok) { if (j.pack) setPack(j.pack); setChanging(false); setInfo(action === "confirm" ? "Merci, votre présence est confirmée. À très bientôt !" : "C'est noté : nous vous rappelons très vite pour fixer une nouvelle date."); }
      else setInfo(j.error || "Une erreur est survenue, réessayez ou appelez-nous.");
    } catch { setInfo("Pas de connexion. Réessayez dans un instant."); }
    setBusy(false);
  };

  const wrap = (children: React.ReactNode) => <main style={{ background: C.soft, minHeight: "100vh", padding: "24px 16px 48px", color: C.navy, fontFamily: "inherit" }}><div style={{ maxWidth: 560, margin: "0 auto" }}>{children}</div></main>;
  if (state === "loading") return wrap(<p style={{ textAlign: "center", color: C.grey }}>Chargement de votre livraison…</p>);
  if (state === "missing" || !pack) return wrap(<div style={card}><h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Lien introuvable</h1><p>Ce lien de livraison n'est pas valide. Vérifiez le SMS ou l'e-mail reçu, ou contactez-nous.</p><a href="/preparer-ma-livraison" style={{ color: C.acc, fontWeight: 700 }}>Préparer ma livraison</a></div>);

  const closed = pack.delivered || pack.cancelled;
  return wrap(<>
    <p style={{ margin: 0, color: C.acc, fontWeight: 700, fontSize: 14 }}>NeoDrive · {pack.reference}</p>
    <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: "6px 0 4px" }}>{pack.prenom ? `${pack.prenom}, votre` : "Votre"} NeoDrive arrive bientôt</h1>
    <p style={{ margin: 0, color: C.grey }}>Tout ce qu'il faut savoir pour le jour de la livraison.</p>

    <section style={{ ...card, background: C.navy, color: "#fff", border: 0 }}>
      <p style={{ margin: 0, opacity: .75, fontSize: 14 }}>{pack.delivered ? "Livrée" : pack.cancelled ? "Réservation annulée" : "Livraison prévue"}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, textTransform: "capitalize" }}>{pack.dateText || "Date à confirmer"}</p>
      {pack.creneau && <p style={{ margin: "4px 0 0", fontSize: 17 }}>Créneau : <b>{pack.creneau}</b></p>}
      {pack.adresse && <p style={{ margin: "10px 0 0", fontSize: 14, opacity: .85 }}>📍 {pack.adresse}</p>}
    </section>

    {!closed && <section style={card}>
      {info && <p style={{ background: "#fff4ec", borderRadius: 10, padding: "10px 12px", margin: "0 0 12px", fontWeight: 600 }}>{info}</p>}
      {pack.confirmedAt
        ? <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#1d7a46" }}>✅ Vous avez confirmé votre présence. Merci !</p>
        : <button disabled={busy} onClick={() => act("confirm")} style={{ ...btn, background: C.acc, color: "#fff", marginBottom: 10, opacity: busy ? .6 : 1 }}>Je confirme ma présence</button>}
      {!changing
        ? <button disabled={busy} onClick={() => setChanging(true)} style={{ ...btn, background: "#fff", color: C.navy, border: `2px solid ${C.line}` }}>Je souhaite changer de date</button>
        : <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Quelles dates vous conviendraient ?</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={3} placeholder="Ex. plutôt le vendredi après-midi, ou la semaine prochaine" style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: `1px solid ${C.line}`, padding: 10, fontSize: 16, fontFamily: "inherit" }} />
            <button disabled={busy} onClick={() => act("change")} style={{ ...btn, background: C.navy, color: "#fff", marginTop: 8, opacity: busy ? .6 : 1 }}>Envoyer ma demande</button>
            <button onClick={() => setChanging(false)} style={{ ...btn, background: "transparent", color: C.grey, fontWeight: 500, fontSize: 14 }}>Annuler</button>
          </div>}
      {pack.changeRequestedAt && !info && <p style={{ margin: "10px 0 0", fontSize: 14, color: C.grey }}>Votre demande de changement de date a bien été reçue : nous vous rappelons.</p>}
    </section>}

    <section style={card}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Ce qui est compris</h2>
      {pack.lines.map((l, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
        <span>{l.label}{l.detail && <><br /><small style={{ color: C.grey }}>{l.detail}</small></>}</span>
        <b style={{ whiteSpace: "nowrap" }}>{l.amount < 0 ? `- ${euro(-l.amount)}` : euro(l.amount)}</b>
      </div>)}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px", fontSize: 19, fontWeight: 800 }}><span>Total TTC</span><span>{pack.total == null ? "à confirmer" : euro(pack.total)}</span></div>
      {pack.paid && <p style={{ margin: "6px 0 0", color: "#1d7a46", fontWeight: 700 }}>✅ Paiement reçu, merci.</p>}
      <a href={`/api/livraison-pack/client/${token}/devis`} target="_blank" rel="noopener" style={{ ...btn, background: C.soft, color: C.navy, marginTop: 12 }}>📄 Télécharger le devis</a>
    </section>

    {!pack.paid && <section style={{ ...card, border: `2px solid ${C.acc}` }}>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Paiement par virement instantané</h2>
      <p style={{ margin: "0 0 12px", color: C.grey, fontSize: 15 }}>Le jour de la livraison, au moment de la remise du véhicule. Aucun acompte.</p>
      {([["Titulaire", pack.rib.titulaire], ["Banque", pack.rib.banque], ["IBAN", pack.rib.iban], ["BIC", pack.rib.bic], ["Libellé", pack.reference]] as const).map(([k, v]) => <div key={k} style={{ display: "flex", gap: 10, padding: "4px 0" }}><span style={{ width: 80, color: C.grey, flexShrink: 0 }}>{k}</span><b style={{ fontFamily: k === "IBAN" || k === "BIC" ? "ui-monospace, Menlo, monospace" : "inherit", wordBreak: "break-all" }}>{v}</b></div>)}
      <button onClick={copy} style={{ ...btn, background: copied ? "#1d7a46" : C.acc, color: "#fff", marginTop: 12 }}>{copied ? "IBAN copié ✓" : "Copier l'IBAN"}</button>
      <p style={{ margin: "12px 0 0", fontSize: 14 }}>⚠️ <b>Vérifiez dès maintenant avec votre banque votre plafond de virement instantané</b> : il doit être au moins égal au total. Ajoutez aussi MK HOLDING comme bénéficiaire (cela peut prendre 24 à 72 h).</p>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: C.grey }}>🔒 Ce sont nos seules coordonnées bancaires. Nous ne vous enverrons jamais un autre RIB : en cas de doute, appelez-nous avant de payer.</p>
    </section>}

    <section style={card}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Comment se passe la livraison</h2>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.55 }}>
        <li style={{ marginBottom: 8 }}><b>Avant le jour J</b> : ajoutez le bénéficiaire et vérifiez votre plafond de virement instantané.</li>
        <li style={{ marginBottom: 8 }}><b>La veille</b> : vous recevez un SMS de rappel. Gardez votre téléphone à portée de main, le transporteur peut vous appeler.</li>
        <li style={{ marginBottom: 8 }}><b>Le jour J</b> : le véhicule est déchargé devant chez vous, on vous montre comment il marche, puis vous faites le virement.</li>
        <li><b>La remise</b> : vous recevez les clés et le certificat de conformité (COC), indispensable pour la carte grise.</li>
      </ol>
      <a href="/preparer-ma-livraison" style={{ ...btn, background: C.soft, color: C.navy, marginTop: 14 }}>Tous les conseils : préparer ma livraison</a>
    </section>
    <p style={{ textAlign: "center", fontSize: 12, color: C.grey }}>MK HOLDING SAS - NeoDrive · SIREN 908 645 393 · 31 rue Jean Nougaro, 31600 Muret</p>
  </>);
}
