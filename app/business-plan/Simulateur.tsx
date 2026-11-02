"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import type {Params} from "../../lib/gestion";
import {DEFAULT_SIM,LEVERS,contributions,optimizeLevers,simulate,type Lever,type SimCfg,type SimResult,type Tri} from "../../lib/simulator";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const k=(n:number)=>`${Math.round(n/1000)} k€`;
const GROUPS:[Lever["group"],string][]=[["ventes","📈 Vendre plus"],["marge","💶 Gagner plus par vente"],["capacite","🚚 Livrer plus"],["argent","🏦 Financer la croissance"],["produit","🧩 Nouvelles activités"]];
export type Slot={name:string;levers:string[]};

/** Graphique en bande : zone entre le scénario prudent (P10) et optimiste (P90), ligne = médiane. */
function Band({data,fmt,color}:{data:{p10:number;p50:number;p90:number}[];fmt:(n:number)=>string;color:string}){
 const W=640,H=170,pad=34,n=data.length;
 const lo=Math.min(0,...data.map(d=>d.p10)),hi=Math.max(1,...data.map(d=>d.p90));
 const x=(i:number)=>pad+i*(W-pad-8)/(n-1),y=(v:number)=>H-18-(v-lo)/(hi-lo||1)*(H-30);
 const area=data.map((d,i)=>`${x(i)},${y(d.p90)}`).join(" ")+" "+[...data].reverse().map((d,i)=>`${x(n-1-i)},${y(d.p10)}`).join(" ");
 return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}} role="img">
  <polygon points={area} fill={color} opacity={0.18}/>
  <polyline points={data.map((d,i)=>`${x(i)},${y(d.p50)}`).join(" ")} fill="none" stroke={color} strokeWidth={2.5}/>
  {lo<0?<line x1={pad} x2={W-8} y1={y(0)} y2={y(0)} stroke="#b42318" strokeDasharray="4 4"/>:null}
  {[lo,(lo+hi)/2,hi].map(v=><text key={v} x={2} y={y(v)+4} fontSize={10} fill="#7a8594">{fmt(v)}</text>)}
  {[0,12,24,35].map(i=><text key={i} x={x(i)} y={H-3} fontSize={10} fill="#7a8594" textAnchor="middle">{i===0?"auj.":`${i+1} mois`}</text>)}
 </svg>;
}
const triTxt=(t?:Tri,f=(n:number)=>`${Math.round(n*100)} %`)=>t?`${f(t[0])} à ${f(t[2])} (probable ${f(t[1])})`:"";

export default function Simulateur({P,sim,slots,onChange}:{P:Params;sim:Partial<SimCfg>;slots:Slot[];onChange:(sim:SimCfg,slots:Slot[])=>void}){
 const cfg:SimCfg=useMemo(()=>({...DEFAULT_SIM,...sim}),[sim]);
 const set=(v:Partial<SimCfg>)=>onChange({...cfg,...v},slots);
 const [res,setRes]=useState<SimResult|null>(null);const [contrib,setContrib]=useState<{id:string;gain:number}[]>([]);
 const [opt,setOpt]=useState<string>("");const [risk,setRisk]=useState(0.1);const [diff,setDiff]=useState(3);
 useEffect(()=>{const t=setTimeout(()=>{setRes(simulate(P,cfg));setContrib(cfg.levers.length?contributions(P,cfg):[]);},30);return()=>clearTimeout(t);},[P,cfg]);
 const slotRes=useMemo(()=>slots.map(sl=>({sl,r:simulate(P,{...cfg,runs:200,levers:sl.levers})})),[P,cfg,slots]);
 const toggle=(id:string)=>set({levers:cfg.levers.includes(id)?cfg.levers.filter(x=>x!==id):[...cfg.levers,id]});
 const runOpt=()=>{setOpt("…");setTimeout(()=>{const o=optimizeLevers(P,cfg,LEVERS,risk,diff);set({levers:o.levers});setOpt(`✅ Meilleure combinaison trouvée : ${o.levers.length} levier(s), profit médian ${k(o.result.profit.p50)}, risque ${Math.round(o.result.pBroke*100)} %.`);},30);};
 const name=(id:string)=>LEVERS.find(l=>l.id===id)?.name||id;

 return <section className={s.card}>
  <h2>🎲 Simulateur de décision</h2>
  <p className={s.tip}>Choisis des <b>leviers</b>. L’outil joue <b>{cfg.runs} futurs possibles</b> sur 36 mois : la demande, le marché et l’effet réel de chaque levier changent à chaque fois (entre le minimum et le maximum trouvés dans la recherche). Il gère le stock, les commandes de conteneurs (4 mois), la trésorerie et ta capacité de livraison. Résultat : le <b>prudent</b> (1 chance sur 10 de faire pire), le <b>probable</b> et l’<b>optimiste</b>.</p>

  {res?<>
   <div className={c.top3}>
    <div><small>PROFIT NET SUR 3 ANS (probable)</small><b>{k(res.profit.p50)}</b><span>prudent {k(res.profit.p10)} · optimiste {k(res.profit.p90)}</span></div>
    <div><small>VENTES DANS 3 ANS</small><b>{Math.round(res.sales36)} / mois</b><span>{Math.round(res.salesTot)} voitures en 3 ans · {Math.round(res.lostPct*100)} % de ventes perdues ({res.lostWhy})</span></div>
    <div style={{background:res.pBroke>0.1?"#b42318":res.pBroke>0.02?"#b54708":"#067647"}}><small>RISQUE DE MANQUER D’ARGENT</small><b>{Math.round(res.pBroke*100)} %</b><span>trésorerie la plus basse (probable) {k(res.cashMin.p50)} · prudent {k(res.cashMin.p10)}</span></div>
   </div>
   <h3>📈 Ventes par mois</h3><Band data={res.salesBand} fmt={n=>`${Math.round(n)}`} color="#ff7a00"/>
   <h3>🏦 Trésorerie</h3><Band data={res.cashBand} fmt={k} color="#1e3a8a"/>
   {contrib.length?<><h3>🏆 Ce que rapporte chaque levier choisi (profit 3 ans)</h3><div className={c.bars}>{contrib.map(x=>{const mx=Math.max(1,...contrib.map(y=>Math.abs(y.gain)));return <div key={x.id} className={c.bar}><span>{name(x.id)}</span><i><span style={{width:`${Math.max(0,x.gain)/mx*100}%`,background:x.gain<0?"#b42318":undefined}}/></i><b>{k(x.gain)}</b></div>;})}</div></>:null}
  </>:<p className={s.muted}>Calcul…</p>}

  <h3>🤖 Trouver la meilleure combinaison</h3>
  <div className={c.edit}>
   <label><span>Risque maximum accepté</span><select value={risk} onChange={e=>setRisk(Number(e.target.value))}>{[0.02,0.05,0.1,0.2].map(v=><option key={v} value={v}>{Math.round(v*100)} %</option>)}</select></label>
   <label><span>Difficulté maximum (seul)</span><select value={diff} onChange={e=>setDiff(Number(e.target.value))}>{[2,3,4,5].map(v=><option key={v} value={v}>{v} / 5</option>)}</select></label>
   <label><span>&nbsp;</span><button className={s.small} onClick={runOpt}>Chercher</button></label>
  </div>
  {opt?<p className={opt.startsWith("✅")?s.ok:s.muted}>{opt}</p>:null}

  <h3>🧮 Comparer des scénarios</h3>
  <div className={c.links}><button className={s.small} onClick={()=>{const nm=prompt("Nom du scénario ?",`Scénario ${slots.length+1}`);if(nm)onChange(cfg,[...slots.filter(x=>x.name!==nm),{name:nm,levers:cfg.levers}].slice(-4));}}>💾 Garder ce scénario</button></div>
  {slotRes.length?<div className={s.tableWrap}><table className={s.dtable}><thead><tr><th>Scénario</th><th>Profit probable</th><th>Prudent</th><th>Ventes/mois à 3 ans</th><th>Risque</th><th>Mise</th><th></th></tr></thead><tbody>
   {slotRes.map(({sl,r})=><tr key={sl.name}><td style={{whiteSpace:"normal"}}><b>{sl.name}</b><small>{sl.levers.map(name).join(", ")||"rien de nouveau"}</small></td><td><b>{k(r.profit.p50)}</b></td><td>{k(r.profit.p10)}</td><td>{Math.round(r.sales36)}</td><td className={r.pBroke>0.1?s.negT:""}>{Math.round(r.pBroke*100)} %</td><td>{eur(r.invest)}</td><td><button className={s.danger} onClick={()=>set({levers:sl.levers})}>charger</button><button className={s.danger} onClick={()=>onChange(cfg,slots.filter(x=>x.name!==sl.name))}>✕</button></td></tr>)}
  </tbody></table></div>:<p className={s.muted}>Garde 2 ou 3 scénarios pour les comparer côte à côte.</p>}

  <h3>🎛️ Les leviers</h3>
  {GROUPS.map(([g,label])=>{const ls=LEVERS.filter(l=>l.group===g);return ls.length?<div key={g}><h3 style={{fontSize:15}}>{label}</h3><div className={c.list}>{ls.map(l=>{const on=cfg.levers.includes(l.id);return <div key={l.id} className={c.sup} style={on?{borderColor:"#ff7a00",background:"#fff8f2"}:{}}>
   <div className={c.supTop}><div><b>{l.name}</b><small>Difficulté seul : {"●".repeat(l.difficulty)}{"○".repeat(5-l.difficulty)} · effet après {l.delay} mois{l.invest?` · mise ${eur(l.invest)}`:""}{l.fixed?` · ${eur(l.fixed)}/mois`:""}</small></div><button className={s.small} style={on?{}:{background:"#fff",color:"#16202e",border:"1px solid #ddd"}} onClick={()=>toggle(l.id)}>{on?"✓ Choisi":"+ Choisir"}</button></div>
   <p className={s.muted} style={{color:"#16202e"}}>{l.what}</p>
   <small className={s.muted}>{[l.demandPct?`Demande ${triTxt(l.demandPct)}`:"",l.demandAbs?`+${triTxt(l.demandAbs,n=>n.toFixed(1))} voitures/mois`:"",l.marginDelta?`${l.marginDelta>0?"+":""}${eur(l.marginDelta)} par voiture`:"",l.feePct?`frais ${l.feePct} % du prix`:"",l.perExtraCar?`${eur(l.perExtraCar)} par voiture apportée`:"",l.line?`${l.line.label} : ${triTxt(l.line.units,n=>n.toFixed(1))} /mois × ${eur(l.line.margin)}`:"",l.credit?`ligne de ${eur(l.credit)} à ${l.ratePct} %`:"",l.capacity?`+${l.capacity} livraisons/mois`:""].filter(Boolean).join(" · ")}</small>
   {l.evidence.length?<details><summary style={{cursor:"pointer",fontWeight:700,fontSize:13}}>Preuves ({l.evidence.length})</summary><ul className={c.ul}>{l.evidence.map(e=><li key={e}><small>{e}</small></li>)}</ul></details>:null}
  </div>;})}</div></div>:null;})}

  <h3>⚙️ Hypothèses de base</h3>
  <div className={c.edit}>
   <label><span>Ventes / mois aujourd’hui</span><input type="number" value={cfg.baseDemand} onChange={e=>set({baseDemand:Number(e.target.value)||0})}/></label>
   <label><span>Marché / an : pire (%)</span><input type="number" value={Math.round(cfg.trend[0]*100)} onChange={e=>set({trend:[(Number(e.target.value)||0)/100,cfg.trend[1],cfg.trend[2]]})}/></label>
   <label><span>Marché / an : probable (%)</span><input type="number" value={Math.round(cfg.trend[1]*100)} onChange={e=>set({trend:[cfg.trend[0],(Number(e.target.value)||0)/100,cfg.trend[2]]})}/></label>
   <label><span>Marché / an : meilleur (%)</span><input type="number" value={Math.round(cfg.trend[2]*100)} onChange={e=>set({trend:[cfg.trend[0],cfg.trend[1],(Number(e.target.value)||0)/100]})}/></label>
   <label><span>Stock aujourd’hui</span><input type="number" value={cfg.stock} onChange={e=>set({stock:Number(e.target.value)||0})}/></label>
   <label><span>Livraisons / mois possibles seul</span><input type="number" value={cfg.soloCapacity} onChange={e=>set({soloCapacity:Number(e.target.value)||0})}/></label>
   <label><span>Trésorerie minimum à garder</span><input type="number" value={cfg.minCash} onChange={e=>set({minCash:Number(e.target.value)||0})}/></label>
  </div>
  <p className={s.muted}>Marge par voiture, coût d’arrivée, charges fixes et salaire : repris du Pilotage. Si ton salaire est à 0, le profit est avant ta rémunération.</p>
 </section>;
}
