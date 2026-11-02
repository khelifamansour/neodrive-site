"use client";
/* eslint-disable @next/next/no-img-element */
import s from "../planificateur/planif.module.css";
import c from "./sourcing.module.css";
import {CATS,THEMES,type Cat,type Product} from "../../lib/sourcing";
import {ANALYSIS,MODELS,ROADMAP,SALONS,type Go} from "../../lib/sourcing-analysis";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const GO:Record<Go,[string,string]>={go:["🟢 À lancer","#067647"],test:["🟡 À tester (petit lot)","#b54708"],later:["⏳ Plus tard","#435063"],no:["❌ Non","#b42318"]};
type Row={x:Product;score:number;bp:{known:boolean;margin:number;yearMargin:number;cash:number}};

/** Synthèse : quelles familles de produits ajouter à NeoDrive, dans quel ordre, avec quel business plan. */
export default function Synthese({ranked,onCat}:{ranked:Row[];onCat:(k:Cat)=>void}){
 const catName=(k:Cat)=>CATS.find(x=>x[0]===k)?.[1]||k;
 const best=(k:Cat)=>ranked.filter(r=>r.x.cat===k&&r.x.supplierId!=="actuel"&&r.bp.known&&r.bp.margin>0)[0];
 const sorted=[...ANALYSIS].sort((a,b)=>a.rank-b.rank);
 return <section className={s.card}>
  <h2>🧭 Synthèse : où grandir</h2>
  <p className={s.tip}>Ta méthode : <b>acheter en Chine ce qui coûte cher neuf en France, livrer avec ta remorque, vendre sur Leboncoin</b>. Chaque famille est notée sur ces 3 points + les risques (homologation, SAV, trésorerie).</p>

  <h3>🧭 Les 3 métiers possibles</h3>
  <div className={c.list}>{MODELS.map(m=><div key={m.name} className={c.sup}><b>{m.name}</b><ul className={c.ul}><li>{m.what}</li><li><b>Argent</b> : {m.money}</li><li>{m.you}</li></ul></div>)}</div>

  <h3>🗺️ Le plan</h3>
  <div className={c.list}>{ROADMAP.map(r=><div key={r.when} className={c.sup}><div className={c.supTop}><div><b>{r.when}</b><small>{r.title}</small></div></div><ul className={c.ul}>{r.steps.map(x=><li key={x}>{x}</li>)}</ul></div>)}</div>

  <h3>🏆 Classement des familles</h3>
  <div className={c.list}>{sorted.map(a=>{const b=best(a.cat);const [gl,gc]=GO[a.go];return <div key={a.cat} className={c.sup}>
   <div className={c.supTop}><div><b>#{a.rank} · {catName(a.cat)}</b><small style={{color:gc,fontWeight:800}}>{gl}</small></div><button className={s.small} onClick={()=>onCat(a.cat)}>Voir les produits</button></div>
   {(()=>{const ph=ranked.filter(r=>r.x.cat===a.cat&&r.x.photo).slice(0,3);return ph.length?<div className={c.gallery}>{ph.map(r=><figure key={r.x.id}><img src={r.x.photo} alt={r.x.name} referrerPolicy="no-referrer" loading="lazy"/><figcaption>{r.x.name}</figcaption></figure>)}</div>:null;})()}
   <p style={{margin:0,fontWeight:700}}>{a.verdict}</p>
   <div className={s.biz}>
    <div><small>Prix neuf en France</small><b style={{fontSize:14}}>{a.priceFr}</b></div>
    <div><small>Prix usine Chine</small><b style={{fontSize:14}}>{a.fobRange}</b></div>
    <div><small>Marge visée / unité</small><b style={{fontSize:14}}>{a.plan.marginUnit}</b></div>
    <div><small>Ventes possibles</small><b style={{fontSize:14}}>{a.plan.unitsMonth}</b></div>
    <div><small>Mise de départ</small><b style={{fontSize:14}}>{a.plan.invest}</b></div>
    <div><small>Meilleur produit de la base</small><b style={{fontSize:14}}>{b?`${b.x.name} · ${eur(b.bp.margin)}`:"prix usine à obtenir"}</b></div>
   </div>
   <details><summary style={{cursor:"pointer",fontWeight:800}}>Analyse détaillée</summary><ul className={c.ul}>
    <li><b>Marché</b> : {a.market}</li><li><b>Clients</b> : {a.buyers}</li>{a.competition?<li><b>Concurrence</b> : {a.competition}</li>:null}
    <li><b>Risques</b> : {a.risks}</li>{a.season?<li><b>Saison</b> : {a.season}</li>:null}<li><b>Premier pas</b> : {a.plan.first}</li>
    {a.sources?<li><small>Sources : {a.sources}</small></li>:null}
   </ul></details>
  </div>;})}</div>

  <h3>🎪 Salons à suivre</h3>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:560}}><thead><tr><th>Salon</th><th>Quand</th><th>Quoi</th><th>Pour toi</th></tr></thead><tbody>{SALONS.map(x=><tr key={x.name}><td><b>{x.name}</b><small>{x.where}</small></td><td style={{whiteSpace:"normal"}}>{x.when}</td><td style={{whiteSpace:"normal"}}>{x.what}</td><td style={{whiteSpace:"normal"}}>{x.for}</td></tr>)}</tbody></table></div>

  <h3>🧩 Thématiques</h3>
  <div className={c.list}>{THEMES.map(t=><div key={t.id} className={c.sup}><b>{t.name}</b><small className={s.muted}>{t.idea}</small><div>{t.cats.map(k=><button key={k} className={c.chip} style={{border:0,cursor:"pointer"}} onClick={()=>onCat(k)}>{catName(k)} ({ranked.filter(r=>r.x.cat===k).length})</button>)}</div></div>)}</div>
 </section>;
}
