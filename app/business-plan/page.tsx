"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import type {Params} from "../../lib/gestion";
import {CATS,businessPlan,type Product,type Sourcing} from "../../lib/sourcing";
import Simulateur,{type Slot} from "./Simulateur";
import Marches from "./Marches";
import Explorer from "./Explorer";
import Decisions,{type OppState} from "./Decisions";
import type {SimCfg} from "../../lib/simulator";
import {DEFAULT_PLAN,FILLERS,FILLER_RULES,MOATS,fillerMargin,fillerTotals,moatScore,runPlan,type PlanCfg} from "../../lib/businessplan";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
type Tab="explorer"|"decider"|"simu"|"marches"|"plan"|"pourquoi"|"remplir"|"produits";
const TOOLS:[string,string][]=[["/pilotage","🧠 Pilotage (trésorerie, conteneurs)"],["/tournee","🚚 Tournées"],["/sourcing","🔎 Sourcing"]];
function Dots({n}:{n:number}){return <span style={{letterSpacing:2}}>{"●".repeat(n)}<span style={{opacity:.2}}>{"●".repeat(5-n)}</span></span>;}

export default function BusinessPlanPage(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [d,setD]=useState<Sourcing|null>(null);const [P,setP]=useState<Params|null>(null);
 const [tab,setTab]=useState<Tab>("decider");const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");const [dirty,setDirty]=useState(false);
 const api=async(body:object,pc=code)=>{const r=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setBusy("load");setMsg("");try{const j=await api({action:"load"},pc);setD(j.data);setP(j.params);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const save=async()=>{if(!d)return;setBusy("save");try{const j=await api({action:"save",data:d});setD(j.data);setDirty(false);setMsg("✅ Enregistré.");}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const cfg:PlanCfg=useMemo(()=>({...DEFAULT_PLAN,...((d?.plan as Partial<PlanCfg>)||{})}),[d]);
 const setCfg=(v:Partial<PlanCfg>)=>{setD(x=>x?{...x,plan:{...((x.plan as object)||{}),...cfg,...v}}:x);setDirty(true);setMsg("");};
 const cashNow=P?P.bank+P.cashOnHand:45000;
 const res=useMemo(()=>d&&P?runPlan(P,d.hyp,d.products,cfg,cashNow):null,[d,P,cfg,cashNow]);

 if(!authed||!d||!P||!res)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Business plan</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const fill=fillerTotals(P,cfg);
 const candidates=d.products.filter(x=>x.supplierId!=="actuel"&&x.fobUsd>0).map(x=>({x,bp:businessPlan(P,d.hyp,x,cashNow)})).filter(r=>r.bp.margin>0).sort((a,b)=>b.bp.yearMargin-a.bp.yearMargin);
 const picked=(id:string)=>cfg.picks.find(p=>p.productId===id);
 const togglePick=(x:Product)=>setCfg({picks:picked(x.id)?cfg.picks.filter(p=>p.productId!==x.id):[...cfg.picks,{productId:x.id,start:4}]});
 const setPick=(id:string,v:{start?:number;salesMonth?:number})=>setCfg({picks:cfg.picks.map(p=>p.productId===id?{...p,...v}:p)});
 const qty=(id:string)=>cfg.fillers.find(f=>f.id===id)?.qty||0;
 const setQty=(id:string,q:number)=>setCfg({fillers:[...cfg.fillers.filter(f=>f.id!==id),...(q>0?[{id,qty:q}]:[])]});
 const Y=res.years;const maxR=Math.max(1,...Y.map(y=>Math.abs(y.net)));
 const lineKeys=[...new Set(Y.flatMap(y=>Object.keys(y.lines)))];

 return <main className={s.page}>
  <header className={s.top}><div><h1>Business plan NeoDrive</h1><p>Stratégie sur 3 ans · relie Pilotage, Tournées et Sourcing</p></div><div className={s.topBtns}><button onClick={save} disabled={!dirty||!!busy}>{busy==="save"?"…":dirty?"💾 Enregistrer":"✓ Enregistré"}</button></div></header>
  <div className={c.filters} style={{marginTop:10}}>{TOOLS.map(([h,l])=><a key={h} href={h} className={c.chip} style={{textDecoration:"none",padding:"8px 12px"}}>{l}</a>)}</div>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}
  <nav className={c.tabs}>{([["explorer","🔭 Explorer"],["decider","🏁 Décider"],["simu","🎲 Simulateur"],["marches","🌍 Marchés"],["plan","📘 Business plan"],["pourquoi","🧱 Pourquoi ça marche"],["remplir","📦 Remplir les conteneurs"],["produits","➕ Produits du plan"]] as [Tab,string][]).map(([k,l])=><button key={k} className={tab===k?c.on:""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="explorer"?<Explorer/>:null}
  {tab==="decider"?<Decisions state={((d.plan as {opp?:OppState})?.opp)||{}} onChange={opp=>{setD(x=>x?{...x,plan:{...((x.plan as object)||{}),opp}}:x);setDirty(true);setMsg("");}}/>:null}
  {tab==="simu"?<Simulateur P={P} sim={((d.plan as {sim?:Partial<SimCfg>})?.sim)||{}} slots={((d.plan as {slots?:Slot[]})?.slots)||[]} onChange={(sim,slots)=>{setD(x=>x?{...x,plan:{...cfg,...((x.plan as object)||{}),sim,slots}}:x);setDirty(true);setMsg("");}}/>:null}
  {tab==="marches"?<Marches/>:null}
  {tab==="plan"?<section className={s.card}>
   <h2>📘 3 ans en un coup d’œil</h2>
   <div className={c.top3}>{Y.map(y=><div key={y.y}><small>ANNÉE {y.y}</small><b>{Math.round(y.cars)} voitures · {eur(y.ca)} CA</b><span>Résultat net ≈ {eur(y.net)} · trésorerie fin {eur(y.cashEnd)}</span></div>)}</div>
   <div className={s.tableWrap}><table className={s.dtable}><thead><tr><th>(HT)</th>{Y.map(y=><th key={y.y}>Année {y.y}</th>)}</tr></thead><tbody>
    <tr><td>Chiffre d’affaires</td>{Y.map(y=><td key={y.y}>{eur(y.ca)}</td>)}</tr>
    {lineKeys.map(k=><tr key={k}><td>Marge · {k}</td>{Y.map(y=><td key={y.y}>{eur(y.lines[k]||0)}</td>)}</tr>)}
    <tr><td><b>= Marge totale</b></td>{Y.map(y=><td key={y.y}><b>{eur(y.margin)}</b></td>)}</tr>
    <tr><td>− Charges fixes + ton salaire</td>{Y.map(y=><td key={y.y} className={s.negT}>{eur(-y.fixed)}</td>)}</tr>
    <tr><td>− Embauches</td>{Y.map(y=><td key={y.y} className={s.negT}>{eur(-y.hires)}<small>{y.staff.join(", ")||"—"}</small></td>)}</tr>
    <tr><td>= Résultat avant impôt</td>{Y.map(y=><td key={y.y}>{eur(y.result)}</td>)}</tr>
    <tr><td>− Impôt sur les sociétés (estimé)</td>{Y.map(y=><td key={y.y}>{eur(-y.tax)}</td>)}</tr>
    <tr><td><b>= Résultat net</b></td>{Y.map(y=><td key={y.y} className={y.net>=0?s.posT:s.negT}><b>{eur(y.net)}</b></td>)}</tr>
    <tr><td>− Stock à financer (croissance + nouveaux produits)</td>{Y.map(y=><td key={y.y} className={s.negT}>{eur(-y.wc)}</td>)}</tr>
    <tr><td>Trésorerie la plus basse</td>{Y.map(y=><td key={y.y} className={y.cashMin<10000?s.negT:""}>{eur(y.cashMin)}</td>)}</tr>
   </tbody></table></div>
   <div className={c.bars}>{Y.map(y=><div key={y.y} className={c.bar}><span>Résultat net année {y.y}</span><i><span style={{width:`${Math.max(0,y.net)/maxR*100}%`}}/></i><b>{Math.round(y.net/1000)}k</b></div>)}</div>
   <h3>🎯 Objectifs</h3>
   <div className={c.edit}>
    {[0,1,2].map(i=><label key={i}><span>Voitures / mois fin année {i+1}</span><input type="number" value={cfg.vspPerMonth[i]} onChange={e=>{const v=[...cfg.vspPerMonth] as PlanCfg["vspPerMonth"];v[i]=Number(e.target.value)||0;setCfg({vspPerMonth:v});}}/></label>)}
    <label><span>% clients pack accessoires</span><input type="number" value={Math.round(cfg.accAttach*100)} onChange={e=>setCfg({accAttach:(Number(e.target.value)||0)/100})}/></label>
    <label><span>Prix du pack TTC</span><input type="number" value={cfg.accPrice} onChange={e=>setCfg({accPrice:Number(e.target.value)||0})}/></label>
    <label><span>Marge HT du pack</span><input type="number" value={cfg.accMargin} onChange={e=>setCfg({accMargin:Number(e.target.value)||0})}/></label>
    <label><span>Chauffeur au-delà de (livraisons/mois)</span><input type="number" value={cfg.driverAt} onChange={e=>setCfg({driverAt:Number(e.target.value)||0})}/></label>
    <label><span>Coût chauffeur chargé / mois</span><input type="number" value={cfg.driverCost} onChange={e=>setCfg({driverCost:Number(e.target.value)||0})}/></label>
    <label><span>Coût commercial pro / mois</span><input type="number" value={cfg.salesHireCost} onChange={e=>setCfg({salesHireCost:Number(e.target.value)||0})}/></label>
   </div>
   {!P.salaryMonthly?<p className={s.err}>⚠️ Ton salaire est à 0 € dans le Pilotage : le résultat est donc AVANT ta rémunération. Mets-le dans Pilotage → Réglages.</p>:null}
   <p className={s.tip}>💡 <b>La croissance mange la trésorerie</b> : chaque voiture de plus par mois immobilise ≈ {eur(res.wcPerCar)} (3 mois d’achats avant d’être payé). C’est la ligne « stock à financer ».</p>
   <p className={s.tip}>D’où viennent les chiffres : <b>marge par voiture {eur(res.carMargin)} HT</b> = prix et coût d’arrivée du <a href="/pilotage">Pilotage</a> − livraison {eur(P.deliveryCost)} (calée sur les <a href="/tournee">Tournées</a>) − pub {eur(d.hyp.marketingPerSale)} − stockage {eur(d.hyp.storagePerUnit)} − SAV 100 € − équipement 50 €. Charges fixes {eur(P.fixedMonthly)}/mois, ton salaire {eur(P.salaryMonthly)}/mois (à mettre dans Pilotage → Réglages). Nouveaux produits : onglet ➕. Trésorerie de départ {eur(cashNow)}. Vue simplifiée : le calendrier exact des paiements reste dans le Pilotage.</p>
  </section>:null}

  {tab==="pourquoi"?<section className={s.card}>
   <h2>🧱 Pourquoi la voiture sans permis marche</h2>
   <p className={s.tip}>Une bonne affaire pour NeoDrive a <b>4 conditions</b> : 1) un <b>marché assez gros</b>, 2) une <b>barrière</b> qui décourage les autres (homologation, carte grise, SAV), 3) <b>peu de concurrents</b> déjà installés, 4) <b>faisable seul</b> avec ta remorque. La mini-pelle a un gros marché mais <b>aucune barrière</b> → tout le monde importe → prix écrasés à 4 000 €. La voiture sans permis a une barrière (COC, carte grise) que tu sais déjà franchir : c’est ton avantage.</p>
   <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:620}}><thead><tr><th>Famille</th><th>Marché</th><th>Barrière</th><th>Peu de concurrents</th><th>Faisable seul</th><th>Note</th></tr></thead><tbody>
    {[...MOATS].sort((a,b)=>moatScore(b)-moatScore(a)).map(x=><tr key={x.cat}><td style={{whiteSpace:"normal"}}><b>{x.name}</b><small>{x.why}</small></td><td><Dots n={x.market}/></td><td><Dots n={x.barrier}/></td><td><Dots n={x.free}/></td><td><Dots n={x.solo}/></td><td><b>{moatScore(x)}</b></td></tr>)}
   </tbody></table></div>
   <p className={s.muted}>Notes de 1 à 5 = mon appréciation à partir des recherches (sources dans le Sourcing). Ta vraie protection : savoir obtenir un COC, faire une carte grise, livrer et réparer. Choisis des produits où <b>cette compétence compte</b>.</p>
  </section>:null}

  {tab==="remplir"?<section className={s.card}>
   <h2>📦 Remplir l’espace vide des conteneurs</h2>
   <p className={s.tip}>Le fret est déjà payé par les voitures : chaque m³ vide est gratuit. Mais <b>tout doit être déclaré</b> à la douane (liste de colisage), <b>pas de batteries lithium cachées</b> (marchandise dangereuse), et chaque produit doit être conforme (CE, sécurité des produits).</p>
   <div className={s.biz}>
    <div><small>Espace libre estimé / conteneur</small><b><input type="number" value={cfg.freeM3} onChange={e=>setCfg({freeM3:Number(e.target.value)||0})} style={{width:70,padding:4}}/> m³</b></div>
    <div className={fill.full?s.neg:""}><small>Volume chargé</small><b>{fill.vol.toFixed(1)} m³</b></div>
    <div className={s.pos}><small>Marge en plus / conteneur</small><b>{eur(fill.margin)}</b></div>
    <div><small>Achat à avancer / conteneur</small><b>{eur(fill.invest)}</b></div>
    <div><small>Par an ({Math.round(res.years[0].cars/9)} conteneurs)</small><b>{eur(fill.margin*res.years[0].cars/9)}</b></div>
   </div>
   <details open><summary style={{cursor:"pointer",fontWeight:800}}>📜 Les règles à respecter</summary><ul className={c.ul}>{FILLER_RULES.map(r=><li key={r}>{r}</li>)}</ul></details>
   <p className={s.muted}>Les produits A servent aussi au <b>pack accessoires</b> (déjà compté dans le business plan avec le % de clients). Indique ici seulement ce que tu charges <b>en plus</b>, par conteneur, pour le revendre.</p>
   {FILLERS.length?<div className={c.list}>{(["A","B","C"] as const).map(g=><div key={g}><h3>{g==="A"?"🧰 A · Accessoires pour tes clients":g==="B"?"🛒 B · À vendre sur Leboncoin":"🏪 C · Gros (bazars, solderies)"}</h3>
    {FILLERS.filter(f=>f.group===g).map(f=><div key={f.id} className={c.w}><div><b>{f.name}</b><small>{eur(f.fobUsd*P.usd)} achat · {eur(f.priceTtc)} vente · marge {eur(fillerMargin(P,f))} · {f.volM3} m³ · ≈ {f.perCar}/voiture</small><small>{f.note}{f.risk?` ⚠️ ${f.risk}`:""}</small></div><input type="number" min={0} value={qty(f.id)} onChange={e=>setQty(f.id,Number(e.target.value)||0)}/></div>)}</div>)}</div>:<p className={s.muted}>Recherche des produits en cours…</p>}
  </section>:null}

  {tab==="produits"?<section className={s.card}>
   <h2>➕ Produits à ajouter au plan</h2>
   <p className={s.muted}>Produits du Sourcing avec un prix usine connu et une marge positive. Coche pour l’ajouter, choisis le mois de départ (1 = ce mois-ci). Les produits pros ou robots déclenchent l’embauche d’un commercial.</p>
   <div className={c.list}>{candidates.map(({x,bp})=>{const pk=picked(x.id);return <div key={x.id} className={c.w} style={{gridTemplateColumns:"1fr auto"}}><div><b>{CATS.find(k=>k[0]===x.cat)?.[1].split(" ")[0]} {x.name}</b><small>{eur(bp.margin)} / unité · {x.salesMonth}/mois · {eur(bp.yearMargin)} / an · stock à avancer {eur(bp.cash)}{x.verified?"":" · chiffres à vérifier"}</small>
    {pk?<div className={c.edit} style={{marginTop:6}}><label><span>Mois de départ</span><input type="number" min={1} max={36} value={pk.start} onChange={e=>setPick(x.id,{start:Number(e.target.value)||1})}/></label><label><span>Ventes / mois</span><input type="number" step={0.5} value={pk.salesMonth??x.salesMonth} onChange={e=>setPick(x.id,{salesMonth:Number(e.target.value)||0})}/></label></div>:null}</div>
    <button className={s.small} style={pk?{}:{background:"#fff",color:"#16202e",border:"1px solid #ddd"}} onClick={()=>togglePick(x)}>{pk?"✓ Dans le plan":"+ Ajouter"}</button></div>;})}</div>
  </section>:null}
 </main>;
}
