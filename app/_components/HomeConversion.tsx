"use client";
import Link from "next/link";
import s from "./home-conversion.module.css";
import {monthlyPayment,FINANCE} from "../../lib/neodrive-finance";
import {VEHICLES,REGISTRATION_PRICE} from "../../lib/neodrive-pricing";

const WHATSAPP="https://wa.me/33628261446?text="+encodeURIComponent("Bonjour, je souhaite des informations sur la NeoDrive.");
const fromMonthly=Math.ceil(monthlyPayment(VEHICLES.essentielle.price+REGISTRATION_PRICE,84));

/** Prix constructeur de la Citroën Ami relevé sur citroen.fr (août 2026). À mettre à jour si le tarif change. */
const AMI_PRICE=8190;
const AMI_SOURCE="Tarif constructeur Citroën Ami relevé sur citroen.fr en août 2026, version d’entrée de gamme.";

const I={
 check:<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>,
 x:<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>,
 euro:<svg viewBox="0 0 24 24"><path d="M17 6.5A6.5 6.5 0 007 12a6.5 6.5 0 0010 5.5M5 10h8M5 14h8"/></svg>,
 shield:<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"/></svg>,
 car:<svg viewBox="0 0 24 24"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM5 11h14"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/></svg>,
 wallet:<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/></svg>,
 truck:<svg viewBox="0 0 24 24"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>,
 tool:<svg viewBox="0 0 24 24"><path d="M14.5 6.5a4 4 0 01-5 5L4 17l3 3 5.5-5.5a4 4 0 015-5l-2.5-2.5 1.5-1.5z"/></svg>,
 building:<svg viewBox="0 0 24 24"><path d="M4 21V5l8-3v19M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M2 21h20"/></svg>,
 steel:<svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>,
 play:<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>,
};

export function HomeHero(){
 return <section className={s.hero}>
  <div className={s.heroCopy}>
   <span className={s.kicker}><i/> Entreprise française · Muret (31) · depuis 6 ans</span>
   <h1>La voiture sans permis électrique <span>neuve, dès {VEHICLES.essentielle.price.toLocaleString("fr-FR")}&nbsp;€.</span></h1>
   <p className={s.lead}>Carrosserie <b>acier</b>, chauffage, caméra de recul, Bluetooth. Livrée devant chez vous partout en France — <b>vous ne payez rien avant de l’avoir vue.</b></p>
   <div className={s.priceRow}>
    <div><small>Prix TTC</small><strong>{VEHICLES.essentielle.price.toLocaleString("fr-FR")} €</strong></div>
    <span>ou</span>
    <div><small>Financement</small><strong>{fromMonthly} €<em>/mois*</em></strong></div>
   </div>
   <div className={s.ctas}>
    <Link className={s.btnPrimary} href="/reservation-devis">Calculer mon prix livré</Link>
    <Link className={s.btnGhost} href="/videos">{I.play} Voir la voiture en vidéo</Link>
   </div>
   <ul className={s.heroChecks}>
    <li>{I.check} 0 € d’acompte</li>
    <li>{I.check} Paiement à la livraison</li>
    <li>{I.check} Garantie 2 ans</li>
   </ul>
  </div>
  <figure className={s.heroMedia}>
   <picture>
    <source media="(max-width:760px)" srcSet="/reservation/neodrive-jardin-mobile.webp"/>
    <img src="/reservation/neodrive-jardin-large.webp" alt="NeoDrive Confort grise, voiture sans permis électrique" fetchPriority="high"/>
   </picture>
   <div className={s.heroBadge}><strong>{(AMI_PRICE-VEHICLES.confort.price).toLocaleString("fr-FR")} € de moins</strong><small>que la Citroën Ami de base**</small></div>
   <figcaption><i/> NeoDrive Confort · véhicule réel</figcaption>
  </figure>
 </section>;
}

export function TrustStrip(){
 return <ul className={s.trust}>
  <li><span>{I.wallet}</span><div><b>0 € à la commande</b><small>Vous payez à la livraison, après avoir vu la voiture</small></div></li>
  <li><span>{I.shield}</span><div><b>Garantie 2 ans</b><small>Garantie légale de conformité + SAV NeoDrive</small></div></li>
  <li><span>{I.truck}</span><div><b>Livraison partout en France</b><small>Sur camion, jusqu’à votre porte</small></div></li>
  <li><span>{I.building}</span><div><b>Une vraie entreprise</b><small>MK HOLDING SAS · SIREN 908 645 393 · Muret</small></div></li>
 </ul>;
}

export function WhyUs(){
 const items=[
  {icon:I.euro,t:"Le bon prix, sans détour",d:`Dès ${VEHICLES.essentielle.price.toLocaleString("fr-FR")} € TTC pour une voiture neuve. Le prix de livraison s’affiche selon votre code postal, sans surprise.`},
  {icon:I.steel,t:"Une carrosserie en acier",d:"Une structure et des panneaux en acier, là où beaucoup de voitures sans permis utilisent du plastique."},
  {icon:I.car,t:"Vraiment équipée",d:"Chauffage et ventilation, caméra de recul, Bluetooth / USB, alarme antivol, grand coffre (version Confort)."},
  {icon:I.wallet,t:"Zéro risque à la commande",d:"Aucun acompte. Vous découvrez la voiture à la livraison, puis vous réglez le montant convenu."},
  {icon:I.tool,t:"Un SAV qui répond",d:"Diagnostic en ligne NeoDiag, pièces détachées et un interlocuteur joignable sur WhatsApp."},
  {icon:I.building,t:"Une entreprise identifiable",d:"6 ans d’expérience dans la voiture sans permis. Société française, adresse et SIREN publics."},
 ];
 return <section className={s.section}>
  <header className={s.head}><span className={s.eyebrow}>Pourquoi NeoDrive</span><h2>Moins cher, mieux équipée, et sans prendre de risque.</h2><p>On sait qu’acheter une voiture en ligne demande de la confiance. Voici ce que nous mettons en place pour la mériter.</p></header>
  <div className={s.why}>{items.map(x=><article key={x.t}><span>{x.icon}</span><h3>{x.t}</h3><p>{x.d}</p></article>)}</div>
 </section>;
}

export function Compare(){
 const rows:[string,string|boolean,string|boolean][]=[
  ["Prix neuf TTC",`${VEHICLES.confort.price.toLocaleString("fr-FR")} €`,`${AMI_PRICE.toLocaleString("fr-FR")} €**`],
  ["Carrosserie","Acier","Plastique (polypropylène)"],
  ["Caméra de recul",true,"—"],
  ["Bluetooth / USB",true,"—"],
  ["Alarme antivol",true,"—"],
  ["Paiement à la livraison, sans acompte",true,"—"],
 ];
 return <section className={s.section}>
  <header className={s.head}><span className={s.eyebrow}>Comparez</span><h2>NeoDrive Confort ou Citroën Ami&nbsp;?</h2><p>Deux voitures sans permis électriques, deux places, accessibles dès 14 ans avec le permis AM. La différence se voit sur le prix et l’équipement.</p></header>
  <div className={s.compare}>
   <div className={s.cmpHead}><span/><b className={s.us}>NeoDrive Confort</b><b>Citroën Ami</b></div>
   {rows.map(([l,a,b])=><div className={s.cmpRow} key={l}><span>{l}</span><strong className={s.us}>{a===true?<i className={s.yes}>{I.check}</i>:a}</strong><strong>{b===true?<i className={s.yes}>{I.check}</i>:b}</strong></div>)}
   <div className={s.cmpFoot}><b>{(AMI_PRICE-VEHICLES.confort.price).toLocaleString("fr-FR")} € d’économie</b> avec la NeoDrive Confort, livraison en plus selon votre code postal.</div>
  </div>
  <p className={s.fine}>** {AMI_SOURCE} « — » : équipement non mentionné dans la dotation de série de la version comparée. Citroën et Ami sont des marques de leurs propriétaires respectifs. Comparatif fourni à titre informatif ; vérifiez les tarifs et équipements en vigueur.</p>
  <div className={s.center}><Link className={s.btnPrimary} href="/reservation-devis">Voir mon prix livré</Link><Link className={s.link} href="/citroen-ami-ou-neodrive">Lire le comparatif complet →</Link></div>
 </section>;
}

export function HowItWorks(){
 const steps=[
  ["Vous réservez en ligne","Choisissez votre version, votre prix livré s’affiche. 3 minutes, 0 € à payer."],
  ["On vous appelle","Un conseiller confirme la disponibilité et la date de livraison. Vos questions, en direct."],
  ["Livraison chez vous","Votre NeoDrive arrive sur camion, devant votre porte, partout en France."],
  ["Vous vérifiez, puis vous payez","Vous découvrez la voiture et réglez le montant convenu. Carte grise gérée par nous."],
 ];
 return <section className={`${s.section} ${s.howWrap}`}>
  <header className={s.head}><span className={s.eyebrow}>Comment ça marche</span><h2>Vous ne payez qu’une fois la voiture devant chez vous.</h2></header>
  <ol className={s.how}>{steps.map(([t,d],i)=><li key={t}><b>{i+1}</b><h3>{t}</h3><p>{d}</p></li>)}</ol>
  <div className={s.center}><Link className={s.btnPrimary} href="/reservation-devis">Réserver sans acompte</Link><a className={s.link} href={WHATSAPP} target="_blank" rel="noreferrer">Poser une question sur WhatsApp →</a></div>
 </section>;
}

export function HomeFootnotes(){
 return <p className={s.foot}>* Exemple de financement pour une NeoDrive Essentielle ({(VEHICLES.essentielle.price+REGISTRATION_PRICE).toLocaleString("fr-FR")} € carte grise incluse, hors livraison), sans apport, sur 84 mois, TAEG fixe indicatif {FINANCE.taeg.toLocaleString("fr-FR")} %. Simulation non contractuelle, sous réserve d’acceptation par l’organisme prêteur. Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager. ** {AMI_SOURCE}</p>;
}

export function MobileCta(){
 return <div className={s.mobileCta}><div><small>NeoDrive neuve</small><strong>dès {VEHICLES.essentielle.price.toLocaleString("fr-FR")} €</strong></div><Link className={s.btnPrimary} href="/reservation-devis">Mon prix livré</Link></div>;
}
