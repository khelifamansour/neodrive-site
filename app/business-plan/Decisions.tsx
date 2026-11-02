"use client";
import {Fragment,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {OPPS,decisionScore,simulateOpp,verdictOf,type Opp} from "../../lib/opportunities";

const k=(n:number)=>`${Math.round(n/1000).toLocaleString("fr-FR")} k€`;
const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const pct=(x:number)=>`${(x*100).toLocaleString("fr-FR",{maximumFractionDigits:2})} %`;
export type OppState={shares?:Record<string,number>;picks?:string[]};
const GROUP:Record<Opp["group"],string>={coeur:"Référence",levier:"Vendre plus de VSP",produit:"Nouveau produit",conteneur:"Dans le conteneur"};

/** Tableau de décision : chaque opportunité simulée depuis la taille du marché. */
export default function Decisions({state,onChange,extra=[]}:{state:OppState;onChange:(s:OppState)=>void;extra?:Opp[]}){
 const [open,setOpen]=useState("");const [filter,setFilter]=useState<Opp["group"]|"all">("all");
 const all=useMemo(()=>[...OPPS,...extra],[extra]);
 const shares=useMemo(()=>state.shares||{},[state.shares]);const picks=state.picks||[];
 const rows=useMemo(()=>all.map(o=>{const r=simulateOpp(o,shares[o.id]);const sc=decisionScore(o,r);return {o,r,sc,v:verdictOf(sc,r)};}).sort((a,b)=>(a.o.group==="coeur"?-1:b.o.group==="coeur"?1:b.sc-a.sc)),[all,shares]);
 const chosen=rows.filter(x=>picks.includes(x.o.id));
 const tot={p50:chosen.reduce((a,x)=>a+x.r.p50,0),p10:chosen.reduce((a,x)=>a+x.r.p10,0),invest:chosen.reduce((a,x)=>a+x.o.invest,0),deliv:chosen.filter(x=>x.o.deliveries).reduce((a,x)=>a+x.r.perMonth3,0)};
 const core=rows.find(x=>x.o.group==="coeur");const coreDeliv=core?core.r.perMonth3:18;
 const top=rows.filter(x=>x.o.group!=="coeur"&&x.r.p50>0).slice(0,3);
 const setShare=(id:string,v:number)=>onChange({...state,shares:{...shares,[id]:v}});
 const togglePick=(id:string)=>onChange({...state,picks:picks.includes(id)?picks.filter(x=>x!==id):[...picks,id]});
 const shown=rows.filter(x=>filter==="all"||x.o.group===filter);

 return <section className={s.card}>
  <h2>🏁 Décider : toutes les opportunités, chiffrées depuis le marché</h2>
  <p className={s.tip}>Chaque ligne = <b>taille du marché en France</b> × <b>part que tu peux prendre</b> × <b>marge réelle</b>. L’outil joue 600 futurs (part de marché, croissance du marché, marge) et donne le profit sur 3 ans : <b>prudent</b> (1 chance sur 10 de faire pire) / <b>probable</b> / <b>optimiste</b>. Change la part visée et tout se recalcule. Badge 📊 = chiffre publié, 🧮 = estimation (calcul expliqué).</p>

  <h3>⚡ Les 3 meilleures décisions</h3>
  <div className={c.top3}>{top.map((x,i)=><div key={x.o.id}><small>#{i+1} · note {x.sc}/100</small><b>{x.o.name}</b><span>≈ {k(x.r.p50)} sur 3 ans (prudent {k(x.r.p10)}) · mise {eur(x.o.invest)} · remboursé en ≈ {x.r.payback>36?"> 36":x.r.payback} mois</span></div>)}</div>

  <div className={c.filters} style={{marginTop:10}}>{(["all","levier","produit","conteneur"] as const).map(g=><button key={g} className={filter===g?c.on:""} onClick={()=>setFilter(g)}>{g==="all"?"Tout":GROUP[g]}</button>)}</div>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:900}}><thead><tr><th>✓</th><th>Opportunité</th><th>Marché France / an</th><th>Part visée</th><th>Ventes / mois (an 3)</th><th>Profit 3 ans<br/>prudent · <b>probable</b> · optimiste</th><th>Mise</th><th>Retour</th><th>Barrière · concurrence · seul</th><th>Décision</th></tr></thead><tbody>
   {shown.map(({o,r,sc,v})=><Fragment key={o.id}><tr style={o.group==="coeur"?{background:"#f6f7f8"}:{}}>
    <td>{o.group==="coeur"?"—":<input type="checkbox" checked={picks.includes(o.id)} onChange={()=>togglePick(o.id)} style={{width:20,height:20}}/>}</td>
    <td style={{whiteSpace:"normal",minWidth:190,cursor:"pointer"}} onClick={()=>setOpen(open===o.id?"":o.id)}><b>{o.name}</b><small>{GROUP[o.group]} · {o.price} · {open===o.id?"▲":"▼ détails"}</small></td>
    <td style={{whiteSpace:"normal",minWidth:150}}>{o.marketEst?"🧮":"📊"} <b>{o.market.toLocaleString("fr-FR")}</b><small>{o.marketLabel}</small></td>
    <td><input type="number" step={0.05} min={0} value={Number(((shares[o.id]??o.share[1])*100).toFixed(2))} onChange={e=>setShare(o.id,(Number(e.target.value)||0)/100)} style={{width:72,padding:4}}/> %<small>{pct(o.share[0])}–{pct(o.share[2])}</small></td>
    <td><b>{r.perMonth3.toLocaleString("fr-FR",{maximumFractionDigits:1})}</b><small>{Math.round(r.units3)}/an</small></td>
    <td>{k(r.p10)} · <b>{k(r.p50)}</b> · {k(r.p90)}<small>{Math.round(r.pLoss*100)} % de risque de perte</small></td>
    <td>{eur(o.invest)}{o.fixed?<small>+ {eur(o.fixed)}/mois</small>:null}</td>
    <td>{o.invest?(r.payback>36?"> 36 mois":`${r.payback} mois`):"immédiat"}</td>
    <td>{o.barrier} · {o.competition} · {o.solo}<small>/5</small></td>
    <td style={{color:v[1],fontWeight:900}}>{o.group==="coeur"?"référence":v[0]}<small>note {sc}{o.unknown?` · manque : ${o.unknown}`:""}</small></td>
   </tr>
   {open===o.id?<tr><td colSpan={10} style={{whiteSpace:"normal",textAlign:"left",background:"#fcfcfd"}}><ul className={c.ul}>
    <li><b>Pourquoi</b> : {o.why}</li><li><b>Risque</b> : {o.risk}</li><li><b>Premier pas</b> : {o.next}</li>
    <li><b>Marché</b> : {o.marketSrc}{o.marketEst?" (estimation)":""}</li><li><b>Marge</b> : {eur(o.margin)} HT par unité, après frais</li>
    {o.evidence.map(e=><li key={e}><small>📎 {e}</small></li>)}
   </ul></td></tr>:null}</Fragment>)}
  </tbody></table></div>

  <h3>🧩 Ton plan combiné ({chosen.length} choix)</h3>
  {chosen.length?<div className={s.biz}>
   <div className={s.pos}><small>Profit en plus sur 3 ans (probable)</small><b>{k(tot.p50)}</b></div>
   <div><small>Prudent</small><b>{k(tot.p10)}</b></div>
   <div><small>Argent à avancer</small><b>{eur(tot.invest)}</b></div>
   <div className={coreDeliv+tot.deliv>24?s.neg:""}><small>Livraisons / mois à l’an 3</small><b>{Math.round(coreDeliv+tot.deliv)}</b><span style={{fontSize:12}}>{coreDeliv+tot.deliv>24?" → au-delà de 24 : il faut un chauffeur (≈ 2 900 €/mois)":" → faisable seul"}</span></div>
  </div>:<p className={s.muted}>Coche les lignes pour voir le total, l’argent à avancer et si tu peux livrer seul.</p>}
  <p className={s.muted}>Les profits s’additionnent de façon approximative (les leviers sur les VSP se recoupent un peu). Pour l’effet combiné précis avec stock, conteneurs et trésorerie, utilise l’onglet 🎲 Simulateur.</p>
 </section>;
}
