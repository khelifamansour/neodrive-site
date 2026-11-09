"use client";
import { useMemo, useState } from "react";
import { DEMO, PRO_OFFERS, proQuote, validSiren } from "../../lib/pro-pricing";
import s from "./pro.module.css";

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";

export default function ProSimulator() {
  const [id, setId] = useState({ company: "", siren: "", contact_name: "", phone: "", email: "", postal_code: "", website: "" });
  const [unlocked, setUnlocked] = useState(false);
  const [offer, setOffer] = useState<string>("demo");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setId(p => ({ ...p, [k]: v }));
  const q = useMemo(() => proQuote(offer, id.postal_code), [offer, id.postal_code]);

  function unlock(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!id.company || !id.contact_name || id.phone.replace(/\D/g, "").length < 9) return setErr("Indiquez la société, votre nom et votre téléphone.");
    if (!validSiren(id.siren)) return setErr("Ce numéro SIREN n’est pas valide. Vérifiez-le sur votre Kbis (9 chiffres).");
    if (!/^\d{5}$/.test(id.postal_code)) return setErr("Indiquez le code postal de votre établissement.");
    setUnlocked(true);
  }
  async function order() {
    setErr(""); setState("sending");
    const r = await fetch("/api/pro/devis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...id, offer, message }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) setState("done"); else { setState("idle"); setErr(j?.error || "Envoi impossible, réessayez."); }
  }

  if (!unlocked) return (
    <form className={s.gate} onSubmit={unlock}>
      <div className={s.gateHead}><span className={s.eyebrow}>SIMULATEUR DE DEVIS PRO</span><h2>Obtenez votre devis en 1 minute.</h2><p>Réservé aux professionnels : indiquez votre société pour afficher les prix réseau de votre région.</p></div>
      <label>Société *<input required value={id.company} onChange={e => set("company", e.target.value)} placeholder="Garage Dupont" /></label>
      <label>SIREN *<input required inputMode="numeric" value={id.siren} onChange={e => set("siren", e.target.value)} placeholder="9 chiffres" /></label>
      <label>Votre nom *<input required value={id.contact_name} onChange={e => set("contact_name", e.target.value)} /></label>
      <label>Téléphone *<input required type="tel" value={id.phone} onChange={e => set("phone", e.target.value)} /></label>
      <label>E-mail<input type="email" value={id.email} onChange={e => set("email", e.target.value)} placeholder="pour recevoir votre devis" /></label>
      <label>Code postal de l'établissement *<input required inputMode="numeric" maxLength={5} value={id.postal_code} onChange={e => set("postal_code", e.target.value)} /></label>
      <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" value={id.website} onChange={e => set("website", e.target.value)} />
      {err && <p className={s.err}>{err}</p>}
      <button className={s.primary}>Afficher mes prix réseau</button>
    </form>
  );

  if (state === "done") return <div className={s.done}><b>Votre demande de commande est envoyée ✅</b><p>Nous vous rappelons sous 48 h pour la confirmer.{id.email ? " Le récapitulatif vient de vous être envoyé par e-mail." : ""}</p><a className={s.secondary} href="/catalogue">📖 Feuilleter le catalogue en attendant</a></div>;

  return (
    <div className={s.sim}>
      <div className={s.gateHead}><span className={s.eyebrow}>{id.company.toUpperCase()} · {id.postal_code}</span><h2>Choisissez votre commande.</h2></div>
      <div className={s.offers}>
        {PRO_OFFERS.map(o => (
          <button key={o.key} type="button" className={offer === o.key ? s.offerOn : s.offer} onClick={() => setOffer(o.key)}>
            <span>{o.short}</span><b>{eur(o.priceHT)} HT</b><small>{o.note}</small>
          </button>
        ))}
      </div>
      {!q.ok ? <p className={s.err}>{q.reason}. Contactez-nous pour un devis personnalisé.</p> : (
        <div className={s.quote}>
          <div className={s.lines}>
            <h3>{q.offer.label} · NeoDrive Confort</h3>
            <p><span>Prix véhicule</span><b>{eur(q.perCar.vehicleHT)} HT</b></p>
            {q.isDemo ? <p><span>Livraison chez vous (forfait France)</span><b>{eur(q.perCar.forfaitReseauHT)} HT</b></p> : <>
            <p><span>Forfait réseau (département {q.department})</span><b>{eur(q.perCar.forfaitReseauHT)} HT</b></p>
            <p><span>Mise à disposition (documents, carte grise)</span><b>{eur(q.perCar.miseADispositionHT)} HT</b></p></>}
            <p className={s.sub}><span>Par voiture</span><b>{eur(q.perCar.totalHT)} HT</b></p>
            <p><span>× {q.offer.qty} voiture{q.offer.qty > 1 ? "s" : ""}</span><b>{eur(q.totalHT)} HT</b></p>
            <p><span>TVA 20 %</span><b>{eur(q.totalTVA)}</b></p>
            <p className={s.total}><span>Total</span><b>{eur(q.totalTTC)} TTC</b></p>
            <p className={s.deposit}><span>Acompte 30 % à la commande</span><b>{eur(q.depositTTC)} TTC</b></p>
          </div>
          {q.isDemo ? (
          <div className={s.resale}>
            <h3>Votre point NeoDrive</h3>
            <p className={s.hint}>Vous exposez votre voiture de démonstration au moins {DEMO.keepMonths} mois et publiez une annonce Leboncoin avec nos photos et textes. Les clients commandent par vous, nous livrons une voiture neuve.</p>
            <div className={s.margin}><span>Commission par commande</span><b>{eur(DEMO.commissionHT)} HT</b><small>+{eur(DEMO.bonusHT)} HT dès la 3e commande du trimestre</small></div>
            <ul className={s.perksList}>
              <li>Annonce Leboncoin remboursée jusqu'à {eur(DEMO.leboncoinMonthlyHT)} HT par mois, versée avec vos commissions</li>
              <li>Après {DEMO.keepMonths} mois, vous pouvez vendre la démo au prix que vous voulez</li>
              <li>Puis passez distributeur : lots de 3, 9 ou 13</li>
            </ul>
            <p className={s.hint}>Une seule voiture de démonstration par société, réservée aux professionnels de l'automobile ou du deux-roues. Vente avant {DEMO.keepMonths} mois : remboursement de la remise ({eur(DEMO.clawbackHT)} HT).</p>
          </div>) : (
          <div className={s.resale}>
            <h3>Ce que vous revendez</h3>
            <p className={s.big}>{eur(q.publicCleEnMainTTC)} <small>TTC clé en main</small></p>
            <p className={s.hint}>Prix public conseillé dans votre secteur : le même que sur notre site.</p>
            <div className={s.margin}><span>Votre marge</span><b>≈ {eur(q.marginPerCarHT)} HT</b><small>par voiture</small>{q.offer.qty > 1 && <em>≈ {eur(q.marginTotalHT)} HT sur la commande</em>}</div>
          </div>)}
        </div>
      )}
      <label className={s.msg}>Un message, une question ?<textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Date souhaitée, couleur, questions…" /></label>
      {err && <p className={s.err}>{err}</p>}
      <div className={s.actions}>
        <button className={s.primary} disabled={!q.ok || state === "sending"} onClick={order}>{state === "sending" ? "Envoi…" : q.ok && q.isDemo ? "Réserver ma voiture de démonstration" : "Réserver ma commande"}</button>
        <a className={s.secondary} href="/catalogue" target="_blank">📖 Catalogue</a>
      </div>
      <p className={s.legal}>Réservation sans paiement en ligne : NeoDrive vous rappelle sous 48 h pour valider votre dossier (Kbis, local) et confirmer la commande. Acompte de 30 % à la confirmation, solde avant livraison. Prix HT. Prix public conseillé donné à titre indicatif.</p>
    </div>
  );
}
