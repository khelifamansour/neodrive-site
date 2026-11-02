"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import p from "./pilotage.module.css";
import {containerDates,decide,fr,iso,type Gestion} from "../../lib/gestion";
import {DEFAULT_STRAT,lbcCost,optimizeStrategy,score,type StratData} from "../../lib/strategy";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
function Col({t,sales,cash,cmd}:{t:string;sales:number;cash:number;cmd:number}){return <div className={p.rCol}><small>{t}</small><b>{Math.round(sales)} ventes</b><span>🏦 {eur(cash)}</span><span>🛒 {cmd} conteneur{cmd>1?"s":""} à commander</span></div>;}
const SPOTS=["Lyon","Bordeaux","Nantes–Angers","Lille","Montpellier–Nîmes","Rennes","Clermont-Ferrand","Marseille–Aix"];

/** Le résumé en un coup d'œil, basé sur la meilleure stratégie trouvée. */
export default function Resume({d,today,onKeep}:{d:Gestion;today:string;onKeep:(sd:StratData)=>void}){
 const raw=d.strategy as StratData|undefined;
 const cur:StratData=useMemo(()=>({...DEFAULT_STRAT,...raw,strat:{...DEFAULT_STRAT.strat,...(raw?.strat||{})}}),[raw]);
 const [best,setBest]=useState<StratData|null>(null);
 useEffect(()=>{const t=setTimeout(()=>{const o=optimizeStrategy(d,cur,today);setBest(o.best?.sd||cur);},50);return()=>clearTimeout(t);},[d,cur,today]);
 const sd=best||cur;
 const sc=useMemo(()=>score(d,sd,today),[d,sd,today]);
 const dec=useMemo(()=>decide(d,today,1,1),[d,today]);
 const S=sd.strat,P=d.params,pl=sc.plan;
 const cashAt=(days:number)=>{const lim=iso(new Date(new Date(today).getTime()+days*864e5));const r=sc.pr.rows.filter(x=>x.start<lim);return r.length?r[r.length-1].cash:P.bank+P.cashOnHand;};
 const end30=iso(new Date(new Date(today).getTime()+31*864e5)),end90=iso(new Date(new Date(today).getTime()+92*864e5));
 const orders=[...dec.r.plan,...d.containers.filter(c=>c.orderDate>=today)];
 const nOrd=(lim:string)=>orders.filter(c=>c.orderDate<lim).length;
 const next=orders.filter(c=>c.orderDate<end90).sort((a,b)=>a.orderDate.localeCompare(b.orderDate))[0];
 const openNow=pl[0].newDealers,dealers3=pl[2].dealers;
 const salesM=(pl[0].total+pl[1].total+pl[2].total)/3,daysRoad=salesM/30*18;


 return <section className={s.card}>
  <h2>⭐ Résumé {best?"":"(calcul de la meilleure stratégie…)"}</h2>
  <div className={p.rGrid}>
   <Col t="CE MOIS-CI" sales={pl[0].total} cash={cashAt(31)} cmd={nOrd(end30)}/>
   <Col t="DANS 3 MOIS" sales={pl[2].total} cash={cashAt(92)} cmd={nOrd(end90)}/>
   <Col t="DANS 12 MOIS" sales={pl[11].total} cash={sc.end} cmd={orders.length}/>
  </div>

  <h3>🗓️ Trimestre par trimestre</h3>
  <div className={p.rQ}>{[0,1,2,3].map(q=>{const ms=pl.slice(q*3,q*3+3);const pq=sc.pr.quarters[q];const sales=ms.reduce((a,x)=>a+x.total,0);const mk=ms.reduce((a,x)=>a+x.marketing,0)/3;
   const focus=["Vendre l’ancien stock, monter Leboncoin, 1er point de vente","Nouvelle gamme, 2e véhicule + remorque 3 places, +2 points de vente","Chauffeur salarié, test d’un nouveau produit, décision terrain Havre","Rentrée scolaire (pub parents), 8 points de vente, 2e produit"][q];
   return <div key={q}><small>{pq?.id.split(" · ")[1]||`T${q+1}`}</small><b>{Math.round(sales/3)} ventes / mois</b>
    <span>🏦 fin : {eur(pq?.endCash||0)}</span><span>🛒 {pq?.orders??0} conteneurs · 📣 {eur(mk)}/mois · 🤝 {ms[2]?.dealers??0} points</span><em>{focus}</em></div>;})}</div>
  <div className={p.rYear}><b>Dans 1 an</b> : ≈ {Math.round(pl[11].total)} ventes / mois · {sc.sold} voitures sur l’année · trésorerie ≈ {eur(sc.end)} (avant impôts et ton salaire) · {pl[11].dealers} points de vente · {pl[11].ads} annonces Leboncoin</div>

  <h3>🚀 Stratégie marketing</h3>
  <ul className={p.rDo}>
   <li>1️⃣ <b>Leboncoin d’abord</b> : de {pl[0].ads} à {pl[5].ads} annonces en ligne en 6 mois (+{Math.max(1,Math.round((pl[5].ads-pl[0].ads)/6))}/mois). Remontée hebdo (120 €) seulement sur les 10 annonces qui reçoivent le plus de messages. Une annonce par ville de plus de 20 000 habitants, titre « Neuve · livrée · garantie », prix tout compris.</li>
   <li>2️⃣ <b>TikTok (200–300 €/mois)</b> : 3 vidéos/semaine — livraison filmée, réaction du client, essai en côte. Booster seulement la vidéo de la semaine qui marche le mieux.</li>
   <li>3️⃣ <b>Facebook / Instagram (200–300 €/mois)</b> : cible parents 35–55 ans autour des hubs et des points de vente ; message « Neuve au prix d’une occasion ». Arrêter si &gt; 150 € par vente.</li>
   <li>4️⃣ <b>Points de vente</b> : {S.dealersPerMonth} par mois jusqu’à {S.dealersMax} ({SPOTS.slice(0,Math.min(4,S.dealersMax||4)).join(", ")}…). Un article dans la presse locale à chaque ouverture.</li>
   <li>5️⃣ <b>Parrainage</b> : 150 € offerts à tout client qui amène un acheteur — le canal le moins cher.</li>
   <li>⚡ <b>Pour accélérer vite</b> : 1) plus d’annonces Leboncoin, 2) points de vente dans les zones loin des hubs, 3) acompte sur les arrivages pour financer plus de stock. La limite n’est pas la demande, c’est le stock que la trésorerie peut payer.</li>
  </ul>

  <h3>🤝 Commission des points de vente</h3>
  <ul className={p.rDo}>
   <li>💶 <b>300 € HT par voiture</b> (360 € TTC sur sa facture, tu récupères la TVA) pour un garage qui <b>expose la voiture et montre</b> : le client paie NeoDrive, tu livres et fais la carte grise. C’est ≈ 7 % du prix HT.</li>
   <li>➕ <b>Bonus 100 € HT</b> par voiture à partir de la 3e vente du mois, et <b>+100 € HT</b> s’il fait lui-même la prise en main / livraison locale.</li>
   <li>📈 <b>500 € HT</b> seulement s’il fait tout (vente, encaissement, livraison, 1er niveau de SAV).</li>
   <li>🏷️ Chaque garage a un <b>code vendeur</b> : la commission est due sur les ventes faites avec son code. La voiture de démo reste à toi.</li>
  </ul>

  <h3>📣 Budget pub ce mois-ci</h3>
  <div className={p.rList}>
   <div><span>Leboncoin</span><b>{eur(lbcCost(sd.lbc,pl[0].ads,S.remonteePct))}</b><small>{pl[0].ads} annonces en ligne → {pl[2].ads} dans 3 mois</small></div>
   <div><span>TikTok</span><b>200 €</b><small>3 vidéos / semaine + boost des meilleures</small></div>
   <div><span>Instagram / Facebook</span><b>200 €</b><small>pub parents 35–55 ans autour des hubs</small></div>
   <div><span>Points de vente</span><b>{openNow?`${openNow} à ouvrir`:"—"}</b><small>{dealers3?`${dealers3} dans 3 mois (${SPOTS.slice(0,dealers3).join(", ")}) · ${eur(S.commission)} par voiture vendue`:"pas encore"}</small></div>
  </div>

  <h3>✅ À faire</h3>
  <ul className={p.rDo}>
   {next?<li>🛒 <b>Commander {next.cars} voitures</b> le {fr(next.orderDate)} ({next.port==="fos"?"Fos, pour le Sud":"Le Havre, pour le Nord"}) — au hub vers le {fr(containerDates(P,next).hub)}</li>:<li>🛒 Pas de commande dans les 90 jours</li>}
   <li>📣 Passer à <b>{pl[2].ads} annonces Leboncoin</b> d’ici 3 mois</li>
   {S.priceUp?<li>💶 Nouvelle gamme : <b>Confort Longo à {eur(P.priceTtc+sd.price.increase)}</b></li>:null}
   {daysRoad>8?<li>🚚 <b>Prendre un chauffeur indépendant</b> (≈ {Math.round(daysRoad)} jours de route / mois pour toi aujourd’hui)</li>:null}
   <li>🏷️ Vendre l’ancien stock et livrer les voitures vendues en priorité</li>
  </ul>

  <h3>📦 Où stocker</h3>
  <ul className={p.rDo}>
   <li>🔵 <b>Nord</b> : Le Havre → Boran. 🟠 <b>Sud</b> : Fos → Lamasquère. Pas de transfert entre hubs.</li>
   <li>⏳ <b>Terrain au Havre</b> : quand tu reçois 3 conteneurs/mois au Havre et que quelqu’un peut les vider (6 à 9 mois).</li>
   <li>⏳ <b>2e véhicule + remorque 3 places</b> : quand la trésorerie reste au-dessus de 35 000 € sur 3 mois.</li>
  </ul>

  <h3>🏗️ Dépotage : continuer au port ou changer ?</h3>
  <ul className={p.rDo}>
   <li>✅ <b>Maintenant : garde ton prestataire au port</b> ({eur(P.unload)} + {eur(P.warehouseTransfer)} de transfert par conteneur ≈ {eur((P.unload+P.warehouseTransfer)/9)} par voiture). Tu es seul : pas de risque de casse ni de temps perdu.</li>
   <li>📞 <b>Cette semaine</b> : demande 2 autres devis de dépotage au Havre (et à Fos) pour comparer. Un prix sous {eur(P.unload)} tout compris = tu changes.</li>
   <li>🔁 <b>Basculer</b> quand tu reçois <b>≥ 3 conteneurs/mois au même port</b> : conteneur livré entier sur un terrain près du Havre (ou à Boran), vidé par un cariste loué (≈ 400–450 €). Gain ≈ 150–200 € par voiture.</li>
   <li>📊 Aujourd’hui : ≈ {(orders.length/12).toFixed(1)} conteneur(s)/mois prévus → {orders.length/12>=3?"✅ le moment approche":"⏳ pas encore"}.</li>
  </ul>

  <div className={p.rFoot}>
   <span>Trésorerie la plus basse : <b>{eur(sc.min)}</b> ({fr(sc.pr.min.start)})</span>
   {best&&JSON.stringify(best.strat)!==JSON.stringify(cur.strat)?<button className={s.small} onClick={()=>onKeep(best)}>Garder cette stratégie</button>:null}
  </div>
 </section>;
}
