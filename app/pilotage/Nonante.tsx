"use client";
import {useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import p from "./pilotage.module.css";
import {containerDates,decide,fr,iso,unitMargin,type Gestion} from "../../lib/gestion";
import {DEFAULT_STRAT,lbcCost,score,type StratData} from "../../lib/strategy";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
/** Emplacements conseillés pour les points de vente : grandes zones de clients, loin des hubs, sur les trajets de livraison. */
const DEALER_SPOTS=[
 {zone:"Lyon – Rhône-Alpes",ou:"Villefranche-sur-Saône, Bourgoin-Jallieu ou Vienne",why:"2e bassin de clients, loin des 2 hubs, sur l’axe Nord–Sud"},
 {zone:"Bordeaux – Gironde",ou:"Libourne ou Mérignac",why:"Gros bassin, à 3 h de Lamasquère, relais vers la côte atlantique"},
 {zone:"Nantes – Angers",ou:"Ancenis ou Cholet",why:"Ouest très demandeur, loin des hubs"},
 {zone:"Lille – Hauts-de-France",ou:"Arras ou Lens",why:"Très forte demande de voitures sans permis, à 2 h de Boran"},
 {zone:"Montpellier – Nîmes",ou:"Lunel ou Alès",why:"Sud-Est, relais vers la Provence"},
 {zone:"Rennes – Bretagne",ou:"Vitré ou Saint-Brieuc",why:"Bretagne rurale, livraisons longues aujourd’hui"},
 {zone:"Clermont-Ferrand",ou:"Riom ou Issoire",why:"Centre rural, aucune concurrence de concession proche"},
 {zone:"Marseille – Aix",ou:"Salon-de-Provence",why:"Grand bassin, proche du port de Fos"},
];

export default function Nonante({d,today}:{d:Gestion;today:string}){
 const raw=d.strategy as StratData|undefined;
 const sd:StratData=useMemo(()=>({...DEFAULT_STRAT,...raw,strat:{...DEFAULT_STRAT.strat,...(raw?.strat||{})}}),[raw]);
 const [driverCost,setDriverCost]=useState(3200);const [vehicleCost,setVehicleCost]=useState(22000);
 const dec=useMemo(()=>decide(d,today,1,1),[d,today]);
 const sc=useMemo(()=>score(d,sd,today),[d,sd,today]);
 const P=d.params,S=sd.strat,unit=unitMargin({...P,priceTtc:P.priceTtc+(S.priceUp?sd.price.increase:0)});
 const m3=sc.plan.slice(0,3);
 const end90=iso(new Date(new Date(today).getTime()+92*864e5));
 const rows90=sc.pr.rows.filter(r=>r.start<end90);
 const min90=Math.min(...rows90.map(r=>r.cash)),cashIn90=rows90[rows90.length-1]?.cash??0;
 const orders=[...dec.r.plan,...d.containers.filter(c=>c.orderDate>=today)].filter(c=>c.orderDate<end90).sort((a,b)=>a.orderDate.localeCompare(b.orderDate));
 const salesM=m3.reduce((a,x)=>a+x.total,0)/3;
 // recrutement chauffeur : dès que les livraisons dépassent ~20/mois ou que tu passes plus de 8 jours/mois sur la route
 const daysOnRoad=salesM/30*18;const hireOk=min90-driverCost*3>P.minCash;
 const vehicleOk=min90-vehicleCost>P.minCash;
 const firstMonthDealers=sc.plan.findIndex(x=>x.newDealers>0);
 const lbc=(n:number)=>lbcCost(sd.lbc,n,S.remonteePct);

 const marketing=[
  {poste:"Leboncoin",detail:`${S.adsStart} → ${sc.plan[2].ads} annonces/an · ${Math.round(S.remonteePct*100)} % avec remontée hebdo (120 € / 2 mois)`,m:[lbc(sc.plan[0].ads),lbc(sc.plan[1].ads),lbc(sc.plan[2].ads)],why:"Ton canal n°1 : < 40 € par vente"},
  {poste:"TikTok",detail:"3 vidéos/semaine (livraisons, essais) + boost des meilleures",m:[200,300,300],why:"Test : garder si < 150 € par vente"},
  {poste:"Facebook / Instagram",detail:"Pub parents 35-55 ans, 150 km autour des hubs et des points de vente",m:[200,300,300],why:"Test : garder si < 150 € par vente"},
  {poste:"Points de vente (soutien local)",detail:"Kit PLV + flyers à l’ouverture (≈ 150 €) + pub locale autour du point",m:[0,1,2].map(i=>sc.plan[i].newDealers*150+sc.plan[i].dealers*50),why:"Faire venir les clients chez eux"},
  {poste:"Commissions points de vente",detail:`${eur(S.commission)} par voiture vendue`,m:[0,1,2].map(i=>sc.plan[i].commissions),why:"Payées seulement s’ils vendent"},
  {poste:"Presse locale / radio",detail:"Article « ouverture d’un point NeoDrive » à chaque nouveau point",m:[0,1,2].map(i=>sc.plan[i].newDealers*100),why:"Gratuit ou presque si bien raconté"},
 ];
 const mTot=[0,1,2].map(i=>marketing.reduce((a,x)=>a+x.m[i],0));

 const decisions:{when:string;what:string;why:string;level:"go"|"wait"|"warn"}[]=[];
 for(const o of orders)decisions.push({when:fr(o.orderDate),what:`Commander ${o.cars} voitures — ${o.port==="fos"?"Fos → Sud":"Le Havre → Nord"} (au hub ≈ ${fr(containerDates(P,o).hub)})`,why:`Acompte ${eur(o.cars*P.deposit)}`,level:"go"});
 decisions.push({when:"maintenant",what:`Leboncoin : passer de ${S.adsStart} à ${sc.plan[2].ads} annonces/an d’ici 3 mois, ${Math.round(S.remonteePct*100)} % avec remontée`,why:`≈ ${eur(lbc(sc.plan[2].ads))}/mois pour ≈ ${Math.round(sc.plan[2].direct)} ventes directes/mois`,level:"go"});
 if(firstMonthDealers>=0&&firstMonthDealers<3)decisions.push({when:sc.plan[firstMonthDealers].label,what:`Ouvrir ${sc.plan.slice(0,3).reduce((a,x)=>a+x.newDealers,0)} point(s) de vente : ${DEALER_SPOTS.slice(0,sc.plan.slice(0,3).reduce((a,x)=>a+x.newDealers,0)).map(x=>x.zone).join(", ")}`,why:`1 voiture de démo chacun (sort du stock), commission ${eur(S.commission)} par vente`,level:"go"});
 else decisions.push({when:"plus tard",what:"Points de vente : pas encore dans ton plan",why:"Active-les dans 📈 Stratégie (ou bouton « Trouver la stratégie »)",level:"wait"});
 decisions.push({when:S.priceUp?"au changement de gamme":"à décider",what:S.priceUp?`Hausse de prix +${sd.price.increase} € appliquée dans le plan`:"Hausse de prix +500 € : non appliquée",why:S.priceUp?"Plus de marge par voiture pour financer le stock":"À tester dans 📈 Stratégie",level:S.priceUp?"go":"wait"});
 decisions.push({when:daysOnRoad>8?"maintenant":"quand > 20 livraisons/mois",what:`Recruter un chauffeur-livreur (≈ ${eur(driverCost)}/mois chargé, ou indépendant payé à la tournée)`,why:`≈ ${Math.round(daysOnRoad)} jours de route par mois pour ${Math.round(salesM)} livraisons : ${hireOk?"la trésorerie le permet":"⚠️ trésorerie juste, commence en indépendant"}`,level:daysOnRoad>8?(hireOk?"go":"warn"):"wait"});
 decisions.push({when:vehicleOk?"après le recrutement":"plus tard",what:`Acheter un 2e véhicule tracteur (≈ ${eur(vehicleCost)}) + remorque 3 places`,why:`Remorque 3 places : livraison ≈ 517 € → ≈ 416–474 € par voiture selon les hubs. ${vehicleOk?"Trésorerie OK":"⚠️ attendre que la trésorerie le permette"}`,level:vehicleOk?"go":"wait"});
 decisions.push({when:"dans 3–6 mois",what:"Terrain près du Havre (location 500–1 000 €/mois, voir rapport)",why:"Rentable si ≥ 3 conteneurs/mois au Havre ET quelqu’un pour vider les conteneurs",level:"wait"});

 return <section className={s.card}>
  <h2>🗓️ Décisions des 90 prochains jours</h2>
  <div className={p.big6}>
   <div><small>Ventes / mois (moyenne 3 mois)</small><b>{Math.round(salesM)}</b><span>dont {Math.round(m3.reduce((a,x)=>a+x.viaDealers,0)/3)} par points de vente</span></div>
   <div className={min90<P.minCash?p.warn:p.good}><small>Trésorerie la plus basse (90 j)</small><b>{eur(min90)}</b><span>dans 90 jours : {eur(cashIn90)}</span></div>
   <div><small>Conteneurs à commander (90 j)</small><b>{orders.length}</b><span>{orders.reduce((a,c)=>a+c.cars,0)} voitures</span></div>
   <div><small>Marketing / mois</small><b>{eur(mTot[2])}</b><span>mois 1 : {eur(mTot[0])}</span></div>
   <div><small>Marge par voiture</small><b>{eur(unit)}</b><span>{S.priceUp?"avec +500 €":"prix actuel"}</span></div>
   <div><small>Jours de route / mois</small><b>{Math.round(daysOnRoad)}</b><span>{daysOnRoad>8?"→ recruter un chauffeur":"tu peux encore livrer toi-même"}</span></div>
  </div>

  <h3>✅ Les décisions, dans l’ordre</h3>
  <ul className={p.tasks}>{decisions.map((x,i)=><li key={i} style={{background:x.level==="go"?"#f0fdf4":x.level==="warn"?"#fffbeb":"#f8fafc"}}><span>{x.level==="go"?"✅":x.level==="warn"?"⚠️":"⏳"}</span><div><b>{x.when}</b> — {x.what}<br/><small className={s.muted}>{x.why}</small></div></li>)}</ul>

  <h3>📣 Budget marketing, poste par poste</h3>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Poste</th><th>{sc.plan[0].label}</th><th>{sc.plan[1].label}</th><th>{sc.plan[2].label}</th><th>Pourquoi</th></tr></thead><tbody>
   {marketing.map(x=><tr key={x.poste}><td><b>{x.poste}</b><br/><small>{x.detail}</small></td>{x.m.map((v,i)=><td key={i}>{eur(v)}</td>)}<td><small>{x.why}</small></td></tr>)}
   <tr className={s.tot}><td>Total</td>{mTot.map((v,i)=><td key={i}>{eur(v)}</td>)}<td></td></tr>
  </tbody></table></div>

  <h3>🤝 Points de vente : où, combien, comment</h3>
  <p className={s.muted}>Ordre conseillé (loin des hubs, gros bassins, sur tes trajets de livraison — ils servent aussi de point relais : tu livres 3 voitures d’un coup chez eux).</p>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>#</th><th>Zone</th><th>Où chercher</th><th>Pourquoi</th></tr></thead><tbody>
   {DEALER_SPOTS.map((x,i)=><tr key={x.zone} style={i<S.dealersMax?{background:"#fff8f2"}:undefined}><td>{i+1}</td><td><b>{x.zone}</b></td><td>{x.ou}</td><td><small>{x.why}</small></td></tr>)}
  </tbody></table></div>
  <ul className={p.tasks}>
   <li><span>🎯</span><div><b>Qui démarcher</b> : garages indépendants, vendeurs de motoculture, concessions scooter/moto, loueurs de matériel — déjà une vitrine et des clients ruraux.</div></li>
   <li><span>💶</span><div><b>Commission</b> : {eur(S.commission)} par voiture, + <b>bonus 200 €</b> dès 3 ventes dans le mois. La voiture de démo reste à toi ; elle est vendue en « démo » au bout de 6 mois et remplacée.</div></li>
   <li><span>🔥</span><div><b>Les motiver</b> : tu leur envoies les demandes de leur zone (Leboncoin, site), kit PLV + flyers, une vidéo locale sur ton TikTok, et le classement des meilleurs points chaque mois.</div></li>
   <li><span>📦</span><div><b>Stock</b> : chaque ouverture retire 1 voiture de ton stock (déjà compté dans le calcul).</div></li>
  </ul>

  <h3>👤 Paramètres recrutement et véhicule</h3>
  <div className={s.params}>
   <label className={s.param}><span>Chauffeur : coût chargé / mois (€)</span><input type="number" step={100} value={driverCost} onChange={e=>setDriverCost(Number(e.target.value)||0)}/></label>
   <label className={s.param}><span>Véhicule tracteur + remorque 3 places (€)</span><input type="number" step={1000} value={vehicleCost} onChange={e=>setVehicleCost(Number(e.target.value)||0)}/></label>
  </div>
 </section>;
}
