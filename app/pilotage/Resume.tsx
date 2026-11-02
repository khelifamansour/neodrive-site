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

  <div className={p.rFoot}>
   <span>Trésorerie la plus basse : <b>{eur(sc.min)}</b> ({fr(sc.pr.min.start)})</span>
   {best&&JSON.stringify(best.strat)!==JSON.stringify(cur.strat)?<button className={s.small} onClick={()=>onKeep(best)}>Garder cette stratégie</button>:null}
  </div>
 </section>;
}
