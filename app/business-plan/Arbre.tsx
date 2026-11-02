"use client";
import {useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {TREE_OPPS,evaluate,type Node,type TreeOpp} from "../../lib/decision-tree";

const k=(n:number)=>`${n<0?"−":""}${Math.abs(Math.round(n/1000)).toLocaleString("fr-FR")} k€`;
const pc=(x:number)=>`${Math.round(x*100)} %`;
export type TreeState={over?:Record<string,Partial<TreeOpp>>;budget?:number;risk?:number};

/** Affiche un nœud de l'arbre et ses branches. */
function Branch({n,depth=0}:{n:Node;depth?:number}){
 const [open,setOpen]=useState(depth<1);
 const kids=n.children||[];
 return <li style={{listStyle:"none",margin:"4px 0"}}>
  <button onClick={()=>setOpen(!open)} style={{border:0,background:"none",padding:0,textAlign:"left",cursor:kids.length?"pointer":"default",font:"inherit"}}>
   {kids.length?(open?"▾ ":"▸ "):"• "}{n.p!==undefined?<b style={{color:"#1e3a8a"}}>{pc(n.p)} </b>:null}{n.label} → <b style={{color:n.value>=0?"#067647":"#b42318"}}>{k(n.value)}</b>
  </button>
  {open&&kids.length?<ul style={{paddingLeft:18,margin:0,borderLeft:"2px solid #eee"}}>{kids.map((x,i)=><Branch key={i} n={x} depth={depth+1}/>)}</ul>:null}
 </li>;
}

export default function Arbre({state,onChange}:{state:TreeState;onChange:(s:TreeState)=>void}){
 const budget=state.budget??30000,R=state.risk??45000;
 const opps=useMemo(()=>TREE_OPPS.map(o=>({...o,...(state.over?.[o.id]||{}),demand:{...o.demand,...(state.over?.[o.id]?.demand||{})}})),[state.over]);
 const evals=useMemo(()=>opps.map(o=>{const e=evaluate(o);const opts=[{d:"A",n:e.A,inv:0},{d:"B",n:e.B,inv:o.fullInvest},{d:"C",n:e.C,inv:o.testInvest}].map(x=>({...x,ce:e.ce(x.n,R),pl:e.pLoss(x.n)}));const best=[...opts].sort((a,b)=>b.ce-a.ce)[0];return {o,e,opts,best};}).sort((a,b)=>b.best.ce-a.best.ce),[opps,R]);
 // Portefeuille : meilleure combinaison de décisions sous le budget (toutes les combinaisons)
 const plan=useMemo(()=>{let best={ce:0,ev:0,inv:0,pick:[] as string[]};const n=evals.length;const total=Math.pow(3,n);
  for(let m=0;m<total;m++){let x=m,ce=0,ev=0,inv=0;const pick:string[]=[];for(let i=0;i<n;i++){const d=x%3;x=Math.floor(x/3);const opt=evals[i].opts[d];inv+=opt.inv;ce+=opt.ce;ev+=opt.n.value;if(d)pick.push(`${evals[i].o.name} → ${opt.d==="B"?"lancer en grand":"tester petit"}`);}
   if(inv<=budget&&ce>best.ce)best={ce,ev,inv,pick};}
  return best;},[evals,budget]);
 const [open,setOpen]=useState("");
 const set=(id:string,v:Partial<TreeOpp>)=>onChange({...state,over:{...(state.over||{}),[id]:{...(state.over?.[id]||{}),...v}}});
 const D:Record<string,string>={A:"Ne rien faire",B:"Lancer en grand",C:"Tester petit puis décider"};

 return <section className={s.card}>
  <h2>🌳 Arbre de décision</h2>
  <p className={s.tip}>Pour chaque opportunité, 3 choix : <b>A. ne rien faire</b>, <b>B. lancer en grand</b>, <b>C. tester un petit lot puis décider</b>. Les hasards : le produit est-il conforme/homologué ? la demande est-elle faible, moyenne ou forte ? les leaders baissent-ils leurs prix ? Chaque branche a une probabilité et un résultat sur 3 ans. L’outil calcule la <b>valeur moyenne</b> et la <b>valeur « prudente »</b> (une perte qui menace ta trésorerie compte plus qu’un gain du même montant), puis la meilleure combinaison dans ton budget.</p>
  <div className={c.edit}>
   <label><span>Budget disponible à investir</span><input type="number" step={5000} value={budget} onChange={e=>onChange({...state,budget:Number(e.target.value)||0})}/></label>
   <label><span>Prudence (perte que tu peux encaisser)</span><input type="number" step={5000} value={R} onChange={e=>onChange({...state,risk:Number(e.target.value)||1000})}/></label>
  </div>
  <div className={c.top3}><div style={{gridColumn:"1/-1"}}><small>MEILLEUR PLAN POUR {k(budget)} D’INVESTISSEMENT</small><b>{plan.pick.length?plan.pick.join(" · "):"Ne rien lancer"}</b><span>valeur prudente {k(plan.ce)} · valeur moyenne {k(plan.ev)} · mise {k(plan.inv)}</span></div></div>

  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:860}}><thead><tr><th>Opportunité</th><th>Lancer en grand<br/>moyenne · prudente · risque de perte</th><th>Tester petit<br/>moyenne · prudente · risque de perte</th><th>Pire cas</th><th>Décision conseillée</th></tr></thead><tbody>
   {evals.map(({o,e,opts,best})=><tr key={o.id} onClick={()=>setOpen(open===o.id?"":o.id)} style={{cursor:"pointer"}}>
    <td style={{whiteSpace:"normal",minWidth:180}}><b>{o.name}</b><small>{o.marketSrc}</small></td>
    <td>{k(opts[1].n.value)} · <b>{k(opts[1].ce)}</b> · {pc(opts[1].pl)}<small>mise {k(o.fullInvest)}</small></td>
    <td>{k(opts[2].n.value)} · <b>{k(opts[2].ce)}</b> · {pc(opts[2].pl)}<small>mise {k(o.testInvest)}</small></td>
    <td>{k(Math.min(e.worstB,e.worstC))}</td>
    <td style={{fontWeight:900,color:best.d==="A"?"#7a8594":best.d==="B"?"#067647":"#b54708"}}>{D[best.d]}<small>{open===o.id?"▲":"▼ voir l’arbre"}</small></td>
   </tr>)}
  </tbody></table></div>

  {evals.filter(x=>x.o.id===open).map(({o,e})=><div key={o.id} className={c.sup}>
   <b>{o.name}</b>
   <ul style={{paddingLeft:0,margin:0,fontSize:14}}><Branch n={e.A}/><Branch n={e.B}/><Branch n={e.C}/></ul>
   <h3 style={{fontSize:15}}>✏️ Les hypothèses (modifiables)</h3>
   <div className={c.edit}>
    <label><span>Prix de vente HT</span><input type="number" value={o.price} onChange={x=>set(o.id,{price:Number(x.target.value)||0})}/></label>
    <label><span>Coût complet / unité</span><input type="number" value={o.cost} onChange={x=>set(o.id,{cost:Number(x.target.value)||0})}/></label>
    <label><span>Marché / an (unités)</span><input type="number" value={o.marketUnits} onChange={x=>set(o.id,{marketUnits:Number(x.target.value)||0})}/></label>
    <label><span>Mise « en grand »</span><input type="number" value={o.fullInvest} onChange={x=>set(o.id,{fullInvest:Number(x.target.value)||0})}/></label>
    <label><span>Mise « test »</span><input type="number" value={o.testInvest} onChange={x=>set(o.id,{testInvest:Number(x.target.value)||0})}/></label>
    <label><span>Chance que ce soit conforme (%)</span><input type="number" value={Math.round(o.pOk*100)} onChange={x=>set(o.id,{pOk:(Number(x.target.value)||0)/100})}/></label>
    {(["low","mid","high"] as const).map(l=><label key={l}><span>Demande {l==="low"?"faible":l==="mid"?"moyenne":"forte"} : chance % / part %</span><span style={{display:"flex",gap:4}}><input type="number" value={Math.round(o.demand[l].p*100)} onChange={x=>set(o.id,{demand:{...o.demand,[l]:{...o.demand[l],p:(Number(x.target.value)||0)/100}}})}/><input type="number" step={0.01} value={Number((o.demand[l].share*100).toFixed(3))} onChange={x=>set(o.id,{demand:{...o.demand,[l]:{...o.demand[l],share:(Number(x.target.value)||0)/100}}})}/></span></label>)}
    <label><span>Chance de guerre des prix (%)</span><input type="number" value={Math.round(o.pWar*100)} onChange={x=>set(o.id,{pWar:(Number(x.target.value)||0)/100})}/></label>
   </div>
   <ul className={c.ul}>{o.evidence.map(x=><li key={x}><small>📎 {x}</small></li>)}</ul>
   <p className={s.muted}>Valeur de l’information du test : {k(e.voi)} {e.voi>0?"(le test vaut le coup)":"(tester coûte plus que ce qu’il apprend : il retarde les ventes)"}.</p>
  </div>)}
  <p className={s.muted}>Lecture : « moyenne » = ce que tu gagnes en moyenne si tu refaisais le pari 100 fois. « Prudente » = la valeur sûre équivalente compte tenu du risque : c’est elle qui décide. Clique sur une ligne pour voir l’arbre et changer les chiffres.</p>
 </section>;
}
