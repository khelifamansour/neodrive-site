"use client";
import {useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import p from "./pilotage.module.css";
import {fr,unitMargin,type Gestion} from "../../lib/gestion";
import {DEFAULT_STRAT,dealerTable,lbcCost,lbcSales,optimizeStrategy,score,storageTable,type StratData} from "../../lib/strategy";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
function Big({t,v,sub,cls}:{t:string;v:string;sub?:string;cls?:string}){return <div className={cls||""}><small>{t}</small><b>{v}</b>{sub?<span>{sub}</span>:null}</div>;}
function Num({label,value,step=1,onChange}:{label:string;value:number;step?:number;onChange:(v:number)=>void}){return <label className={s.param}><span>{label}</span><input type="number" step={step} value={value} onChange={e=>onChange(Number(e.target.value)||0)}/></label>;}

export default function Strategie({d,upd,today}:{d:Gestion;upd:(f:(x:Gestion)=>Gestion)=>void;today:string}){
 const raw=d.strategy as StratData|undefined;
 const sd:StratData=useMemo(()=>({...DEFAULT_STRAT,...raw,strat:{...DEFAULT_STRAT.strat,...(raw?.strat||{})}}),[raw]);
 const S=sd.strat;const P=d.params;
 const setS=(v:Partial<StratData["strat"]>)=>upd(x=>({...x,strategy:{...sd,strat:{...sd.strat,...v}}}));
 const setM=<K extends "lbc"|"dealer"|"price">(k:K,v:Partial<StratData[K]>)=>upd(x=>({...x,strategy:{...sd,[k]:{...sd[k],...v}}}));
 const [busy,setBusy]=useState(false);const [note,setNote]=useState("");
 const sc=useMemo(()=>score(d,sd,today),[d,sd,today]);
 const unit=unitMargin({...P,priceTtc:P.priceTtc+(S.priceUp?sd.price.increase:0)});
 const months=sc.plan;
 const tot=(k:"total"|"marketing"|"commissions"|"adsCost"|"viaDealers"|"direct")=>months.reduce((a,x)=>a+x[k],0);
 const hub=d.hubs.find(h=>h.id==="boran");
 const [st,setSt]=useState({siteRent:600,siteUnloadPerContainer:400,extraKm:120});
 const sto=storageTable({transferPerCar:hub?.transferPerCar??150,warehouseTransfer:P.warehouseTransfer,unload:P.unload,siteRent:st.siteRent,siteUnloadPerContainer:st.siteUnloadPerContainer,extraKm:st.extraKm,costPerKm:P.costPerKm,carsPerTrip:P.carsPerTrip,boranPerCarMonth:hub?.perCarMonthly??25});
 const [northPct,setNorthPct]=useState(45);
 const north=Math.round(tot("total")/12*northPct/100);
 const best=()=>{setBusy(true);setTimeout(()=>{const o=optimizeStrategy(d,sd,today);if(o.best){const b=o.best;upd(x=>({...x,strategy:b.sd}));setNote(`✅ ${o.tried} combinaisons testées. Meilleure : ${b.sd.strat.adsEnd} annonces en ligne, ${b.sd.strat.dealersMax} points de vente à ${b.sd.strat.commission} €, prix ${b.sd.strat.priceUp?"+500 €":"inchangé"} → ${eur(b.end)} de trésorerie dans 12 mois, jamais sous ${eur(b.minLow)} même en vente lente. Pense à enregistrer.`);}else setNote("Aucune combinaison ne garde la trésorerie positive en vente lente : il faut plus de trésorerie de départ.");setBusy(false);},30);};

 return <section className={s.card}>
  <h2>📈 Stratégie commerciale</h2>
  <button className={p.bestBtn} disabled={busy} onClick={best}>{busy?"Calcul… (une centaine de combinaisons)":"🔎 Trouver la stratégie la plus rentable"}</button>
  {note?<p className={s.ok}>{note}</p>:null}
  <div className={p.big6}>
   <Big t="Ventes sur 12 mois" v={String(sc.sold)} sub={`dont ≈ ${Math.round(tot("viaDealers"))} par points de vente · ${sc.lost?`${sc.lost} perdues faute de stock`:"pas de rupture"}`} cls={sc.lost>20?p.warn:""}/>
   <Big t="Marge par voiture" v={eur(unit)} sub={S.priceUp?`prix +${sd.price.increase} € appliqué`:"prix actuel"}/>
   <Big t="Marketing sur 12 mois" v={eur(tot("marketing"))} sub={`annonces ${eur(tot("adsCost"))} + commissions ${eur(tot("commissions"))}`}/>
   <Big t="Trésorerie la plus basse" v={eur(sc.min)} sub={`en vente lente : ${eur(sc.minLow)}`} cls={sc.minLow<0?p.bad:sc.minLow<P.minCash?p.warn:p.good}/>
   <Big t="Trésorerie dans 12 mois" v={eur(sc.end)} sub="avant impôts et ton salaire"/>
   <Big t="Points de vente à la fin" v={String(months[11].dealers)} sub={`${months.reduce((a,x)=>a+x.newDealers,0)} voitures de démo à placer`}/>
  </div>

  <h3>1️⃣ Leboncoin : combien d’annonces ?</h3>
  <p className={s.muted}>Calé sur ta réalité : ≈ {sd.lbc.refAds} annonces en ligne en même temps (60 € pour 2 mois chacune, 120 € avec remontée) → ≈ {sd.lbc.refSales + S.organic} ventes par mois. Chaque annonce en plus rapporte un peu moins que la précédente.</p>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Annonces en ligne</th><th>Ventes / mois</th><th>Coût / mois</th><th>Coût par vente</th><th>Ventes en plus vs aujourd’hui</th></tr></thead><tbody>
   {[40,70,100,150,200,250].map(n=>{const v=lbcSales(sd.lbc,n,S.remonteePct)+S.organic,c=lbcCost(sd.lbc,n,S.remonteePct),v0=lbcSales(sd.lbc,70,S.remonteePct)+S.organic;return <tr key={n} style={n===S.adsEnd?{background:"#fff8f2"}:undefined}><td><b>{n}</b></td><td>{v.toFixed(1)}</td><td>{eur(c)}</td><td>{eur(c/v)}</td><td className={v-v0>0?s.okTxt:""}>{v-v0>0?"+":""}{(v-v0).toFixed(1)}</td></tr>;})}
  </tbody></table></div>
  <div className={s.params}><Num label="Annonces en ligne au départ" value={S.adsStart} onChange={v=>setS({adsStart:v})}/><Num label="Annonces en ligne visées" value={S.adsEnd} onChange={v=>setS({adsEnd:v})}/><Num label="Montée en (mois)" value={S.rampMonths} onChange={v=>setS({rampMonths:v})}/><Num label="Part avec remontée (0 à 1)" value={S.remonteePct} step={0.1} onChange={v=>setS({remonteePct:v})}/></div>

  <h3>2️⃣ Points de vente : combien et à quelle commission ?</h3>
  <p className={s.muted}>Chaque point de vente reçoit 1 voiture de démonstration (qui reste à toi) et une commission par voiture vendue. Plus la commission est haute, plus il pousse tes voitures (hypothèse : {sd.dealer.baseSales} ventes/mois à {sd.dealer.refCommission} €).</p>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Commission / voiture</th><th>Ventes / point / mois</th><th>Il gagne / mois</th><th>Tu gagnes / mois / point</th><th>Démo remboursée en</th></tr></thead><tbody>
   {dealerTable(sd,unit,P.landedEstimate).map(r=><tr key={r.commission} style={r.commission===S.commission?{background:"#fff8f2"}:undefined}><td><b>{eur(r.commission)}</b></td><td>{r.rate.toFixed(1)}</td><td>{eur(r.dealerEarns)}</td><td className={s.okTxt}>{eur(r.youEarn)}</td><td>{r.paybackMonths<99?`${r.paybackMonths.toFixed(1)} mois`:"—"}</td></tr>)}
  </tbody></table></div>
  <div className={s.params}><Num label="Points de vente au départ" value={S.dealersStart} onChange={v=>setS({dealersStart:v})}/><Num label="En ajouter par mois" value={S.dealersPerMonth} onChange={v=>setS({dealersPerMonth:v})}/><Num label="Nombre maximum" value={S.dealersMax} onChange={v=>setS({dealersMax:v})}/><Num label="Commission par voiture (€)" value={S.commission} step={50} onChange={v=>setS({commission:v})}/></div>
  <details className={p.month}><summary><b>⚙️ Hypothèses points de vente</b></summary><div className={s.params}><Num label="Ventes / point / mois (réf.)" value={sd.dealer.baseSales} step={0.1} onChange={v=>setM("dealer",{baseSales:v})}/><Num label="À commission de (€)" value={sd.dealer.refCommission} step={50} onChange={v=>setM("dealer",{refCommission:v})}/><Num label="Effet de la commission (0,3 à 0,7)" value={sd.dealer.motivation} step={0.05} onChange={v=>setM("dealer",{motivation:v})}/><Num label="1er mois (part des ventes)" value={sd.dealer.firstMonthFactor} step={0.1} onChange={v=>setM("dealer",{firstMonthFactor:v})}/></div></details>

  <h3>3️⃣ Prix : +{sd.price.increase} € ou pas ?</h3>
  <label className={p.chk} style={{width:"fit-content"}}><input type="checkbox" checked={S.priceUp} onChange={e=>setS({priceUp:e.target.checked})}/> Appliquer la hausse de {sd.price.increase} € TTC</label>
  <p className={s.muted}>Hypothèse : la hausse fait perdre {Math.round(sd.price.directDrop*100)} % des ventes directes et {Math.round(sd.price.directDrop*sd.dealer.priceSensitivity*100)} % des ventes en point de vente (le client y voit et essaie la voiture, il est moins sensible au prix).</p>
  <div className={s.params}><Num label="Hausse (€ TTC)" value={sd.price.increase} step={100} onChange={v=>setM("price",{increase:v})}/><Num label="Ventes directes perdues (0 à 1)" value={sd.price.directDrop} step={0.02} onChange={v=>setM("price",{directDrop:v})}/></div>

  <h3>4️⃣ Le plan mois par mois</h3>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Mois</th><th>Annonces en ligne</th><th>Points de vente</th><th>Démos à placer</th><th>Ventes directes</th><th>Ventes points</th><th>Total</th><th>Marketing</th></tr></thead><tbody>
   {months.map(x=><tr key={x.m}><td><b>{x.label}</b></td><td>{x.ads}</td><td>{x.dealers}</td><td>{x.newDealers||"—"}</td><td>{x.direct.toFixed(0)}</td><td>{x.viaDealers.toFixed(1)}</td><td><b>{x.total.toFixed(0)}</b></td><td>{eur(x.marketing)}</td></tr>)}
  </tbody></table></div>
  <p className={s.muted}>Point le plus bas : {eur(sc.pr.min.cash)} la semaine du {fr(sc.pr.min.start)}. Les commandes de conteneurs nécessaires sont calculées dans 🧠 Décision.</p>

  <h3>5️⃣ Où stocker : Boran ou un terrain près du Havre ?</h3>
  <p className={s.muted}>Aujourd’hui, une voiture du Nord coûte ≈ {eur(sto.viaBoran)} entre le port et Boran (transfert vers l’entrepôt, dépotage, transfert à Boran, un mois de stockage). Sur un terrain près du Havre : ≈ {eur(sto.varSite)} par voiture (dépotage sur place + km de livraison en plus), plus le loyer.</p>
  <div className={p.big6}>
   <Big t="Économie par voiture" v={eur(sto.saving)} sub="terrain au Havre vs Boran"/>
   <Big t="Rentable à partir de" v={sto.breakeven<99?`${Math.ceil(sto.breakeven)} voit./mois`:"jamais"} sub={`au Nord (loyer ${eur(st.siteRent)} / mois)`}/>
   <Big t="Ton volume au Nord" v={`≈ ${north} / mois`} sub={north>=sto.breakeven?"✅ le terrain devient intéressant":"⏳ reste à Boran pour l’instant"} cls={north>=sto.breakeven?p.good:""}/>
  </div>
  <div className={s.params}><Num label="Loyer terrain / mois (€)" value={st.siteRent} step={50} onChange={v=>setSt({...st,siteRent:v})}/><Num label="Dépotage sur place / conteneur (€)" value={st.siteUnloadPerContainer} step={50} onChange={v=>setSt({...st,siteUnloadPerContainer:v})}/><Num label="Km en plus par livraison (aller)" value={st.extraKm} step={10} onChange={v=>setSt({...st,extraKm:v})}/><Num label="Part des ventes au Nord (%)" value={northPct} step={5} onChange={setNorthPct}/></div>
  <p className={s.tip}>Règle : Fos → Lamasquère pour le Sud, Le Havre → Boran pour le Nord, pas de transfert entre hubs. Un terrain au Havre seulement quand le Nord dépasse le seuil ci-dessus <b>et</b> que quelqu’un peut vider les conteneurs (chariot ou cariste loué).</p>
 </section>;
}
