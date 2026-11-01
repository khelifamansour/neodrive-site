"use client";
import {useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import p from "./pilotage.module.css";
import {DEFAULT_CHANNELS,DEFAULT_DEALERS,FREIGHT_SCEN,MARKET,channelSales,containerDates,decide,fr,optimize,type Container,type Gestion} from "../../lib/gestion";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const SALES:[string,string][]=[["défavorable","🌧️ Défavorable"],["probable","⛅ Probable"],["favorable","☀️ Favorable"]];
type Summary=ReturnType<typeof decide>["month"];
function Card({t,v,sub,cls}:{t:string;v:string;sub?:string;cls?:string}){return <div className={cls||""}><small>{t}</small><b>{v}</b>{sub?<span>{sub}</span>:null}</div>;}

export default function Decision({d,upd,today,addC}:{d:Gestion;upd:(f:(x:Gestion)=>Gestion)=>void;today:string;addC:(c:Partial<Container>)=>void}){
 const [ff,setFf]=useState(1);const [sc,setSc]=useState(1);const [view,setView]=useState<"month"|"quarter"|"year">("month");const [busy,setBusy]=useState(false);const [note,setNote]=useState("");
 const P=d.params,ch=d.channels||DEFAULT_CHANNELS,dl=d.dealers||DEFAULT_DEALERS;
 const r=useMemo(()=>decide(d,today,FREIGHT_SCEN[ff][1],sc),[d,today,ff,sc]);
 const setCh=(id:string,v:number)=>upd(x=>({...x,channels:(x.channels||DEFAULT_CHANNELS).map(c=>c.id===id?{...c,budget:Math.max(0,v)}:c)}));
 const setDl=(v:Partial<typeof dl>)=>upd(x=>({...x,dealers:{...(x.dealers||DEFAULT_DEALERS),...v}}));
 const best=()=>{setBusy(true);setTimeout(()=>{const o=optimize(d,today,FREIGHT_SCEN[ff][1]);upd(x=>({...x,channels:o.channels,dealers:{...(x.dealers||DEFAULT_DEALERS),count:o.dealers.count}}));setNote(`✅ Meilleure stratégie trouvée : ≈ ${Math.round(o.sales)} ventes/mois (maximum finançable avec ta trésorerie : ${o.cap}). Budgets et points de vente remplis ci-dessous. Pense à enregistrer.`);setBusy(false);},30);};
 const S:Summary=r[view];

 return <section className={s.card}>
  <h2>🧠 Outil de décision</h2>
  <div className={p.simIn}>
   <label><span>Prix du transport maritime</span><em>{FREIGHT_SCEN.map((x,i)=><button key={x[0]} className={ff===i?p.on:""} onClick={()=>setFf(i)}>{x[0]} · {Math.round(P.freightUsd.havre*x[1]).toLocaleString("fr-FR")} $</button>)}</em><span style={{fontWeight:600,fontSize:12}}>{FREIGHT_SCEN[ff][2]}</span></label>
   <label><span>Si les ventes sont…</span><em>{SALES.map((x,i)=><button key={x[0]} className={sc===i?p.on:""} onClick={()=>setSc(i)}>{x[1]}</button>)}</em><button className={p.bestBtn} disabled={busy} onClick={best}>{busy?"Calcul…":"🔎 Trouver la meilleure stratégie"}</button></label>
  </div>
  {note?<p className={s.ok}>{note}</p>:null}

  <div className={p.big6}>
   <Card t="Ventes par mois" v={String(Math.round(r.salesMonth))} sub={`dont ${Math.round(r.sm.dealerSales)} par points de vente`}/>
   <Card t="Gain net par mois" v={eur(r.profitMonth)} sub={`${eur(r.unit)} par voiture − marketing − charges`} cls={r.profitMonth>0?p.good:p.bad}/>
   <Card t="Budget marketing / mois" v={eur(r.sm.marketingCost)} sub={`pub ${eur(r.sm.adsCost)} + commissions ${eur(r.sm.dealerCost)}`}/>
   <Card t="Trésorerie la plus basse" v={eur(r.sel.min.cash)} sub={`semaine du ${fr(r.sel.min.start)}`} cls={r.sel.min.cash<0?p.bad:r.sel.min.cash<P.minCash?p.warn:p.good}/>
   <Card t="Trésorerie dans 12 mois" v={eur(r.year.cashEnd)} sub="avant impôts"/>
   <Card t="Conteneurs à commander (12 mois)" v={`${r.year.orders.length}`} sub={`${r.year.orders.reduce((a,c)=>a+c.cars,0)} voitures · ${r.year.lost?`${r.year.lost} ventes perdues`:"pas de rupture"}`} cls={r.year.lost?p.warn:""}/>
  </div>

  <h3>📋 Résumé</h3>
  <div className={s.seg}>{([["month","Ce mois-ci"],["quarter","3 prochains mois"],["year","12 mois"]] as const).map(([k,l])=><button key={k} className={view===k?s.on:""} onClick={()=>setView(k)}>{l}</button>)}</div>
  <div className={p.sumGrid}>
   <div><small>🛒 À commander</small><b>{S.orders.length} conteneur{S.orders.length>1?"s":""}</b><span>{S.orders.reduce((a,c)=>a+c.cars,0)} voitures</span></div>
   <div><small>🚢 Arrivées</small><b>{S.arrivals} voitures</b><span>{S.enCours.length} conteneurs encore en route à la fin</span></div>
   <div><small>🚗 Ventes livrées</small><b>{S.sold}</b><span>{S.lost?`${S.lost} perdues faute de stock`:"pas de rupture"}</span></div>
   <div><small>🏦 Trésorerie</small><b>{eur(S.cashStart)} → {eur(S.cashEnd)}</b><span>plus bas : {eur(S.cashMin)}</span></div>
   <div><small>📣 Marketing</small><b>{eur(S.marketing)}</b><span>{eur(r.sm.marketingCost)} par mois</span></div>
   <div><small>💶 Marge après marketing et charges</small><b>{eur(S.margin)}</b><span>avant impôts</span></div>
  </div>
  {S.orders.length?<ul className={s.mini}>{S.orders.map(o=><li key={o.id}><span><b>{fr(o.orderDate)}</b> · {o.cars} voitures · {o.port==="fos"?"Fos → Sud":"Le Havre → Nord"} · au hub ≈ {fr(containerDates(P,o).hub)}</span>{d.containers.some(c=>c.id===o.id)?<span>✔︎</span>:<button title="Ajouter à mes conteneurs" onClick={()=>addC(o)}>＋</button>}</li>)}</ul>:null}

  {view!=="year"?<><h3>✅ Tâches {view==="month"?"du mois":"des 3 prochains mois"}</h3>
   <ul className={p.tasks}>{S.tasks.slice(0,view==="month"?20:40).map((t,i)=><li key={i}><span>{fr(t.date)}</span><div>{t.text}</div>{t.amount?<b className={p.red}>{eur(t.amount)}</b>:null}</li>)}
    {ch.filter(c=>c.budget>0).map(c=><li key={c.id}><span>chaque mois</span><div>📣 {c.name} : {eur(c.budget)}{c.id==="lbc"?` (≈ ${Math.round(c.budget*2/120)} annonces avec remontée en ligne)`:""}</div></li>)}
    {dl.count?<li><span>ce mois</span><div>🤝 Animer {dl.count} points de vente : stock de démonstration, commission {eur(dl.commission)} par vente</div></li>:null}
   </ul></>:null}

  <h3>📣 Marketing : où mettre l’argent</h3>
  <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Canal</th><th>Budget / mois</th><th>Ventes / mois</th><th>Coût par vente</th></tr></thead><tbody>
   <tr><td><b>Bouche-à-oreille, site, Google naturel</b><small> base sans pub</small></td><td>—</td><td>{Math.round(r.sm.organic)}</td><td>0 €</td></tr>
   {ch.map(c=>{const sl=channelSales(c);return <tr key={c.id}><td><b>{c.name}</b><br/><small>{c.note}</small></td><td><input className={p.mini} style={{width:90}} type="number" step={50} value={c.budget} onChange={e=>setCh(c.id,Number(e.target.value)||0)}/></td><td>{sl.toFixed(1)}</td><td>{sl?eur(c.budget/sl):"—"}</td></tr>;})}
   <tr><td><b>🤝 Points de vente partenaires</b><br/><small>garages, vendeurs de motoculture, concessions moto… payés à la vente</small></td><td><input className={p.mini} type="number" value={dl.count} onChange={e=>setDl({count:Math.max(0,Number(e.target.value)||0)})}/> points</td><td>{(dl.count*dl.salesPerDealer).toFixed(1)}</td><td>{eur(dl.commission)}</td></tr>
  </tbody></table></div>
  <div className={s.params}>
   <label className={s.param}><span>Ventes par point de vente / mois</span><input type="number" step={0.5} value={dl.salesPerDealer} onChange={e=>setDl({salesPerDealer:Number(e.target.value)||0})}/></label>
   <label className={s.param}><span>Commission par vente (€)</span><input type="number" step={50} value={dl.commission} onChange={e=>setDl({commission:Number(e.target.value)||0})}/></label>
   <label className={s.param}><span>Ventes sans pub / mois</span><input type="number" value={d.organic??5} onChange={e=>upd(x=>({...x,organic:Number(e.target.value)||0}))}/></label>
  </div>
  <details className={p.month}><summary><b>⚙️ Hypothèses des canaux (à recaler avec tes vrais chiffres)</b></summary>
   <p className={s.muted}>« Coût par vente » = ce que coûte une vente quand on commence ; « Maximum » = ventes par mois qu’un canal peut apporter au plus. Plus on dépense, plus chaque vente coûte cher. Marché national : {MARKET.newPerYear.toLocaleString("fr-FR")} voitures sans permis neuves par an ; avec {Math.round(r.salesMonth)} ventes/mois tu ferais {(r.salesMonth*12/MARKET.newPerYear*100).toFixed(1)} %.</p>
   {ch.map(c=><div key={c.id} className={s.params}><label className={s.param}><span>{c.name} · coût par vente au début</span><input type="number" value={c.cpa} onChange={e=>upd(x=>({...x,channels:(x.channels||DEFAULT_CHANNELS).map(y=>y.id===c.id?{...y,cpa:Number(e.target.value)||1}:y)}))}/></label><label className={s.param}><span>Maximum ventes / mois</span><input type="number" value={c.max} onChange={e=>upd(x=>({...x,channels:(x.channels||DEFAULT_CHANNELS).map(y=>y.id===c.id?{...y,max:Number(e.target.value)||1}:y)}))}/></label></div>)}
  </details>
 </section>;
}
