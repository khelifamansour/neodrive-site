"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import Decision from "./Decision";
import Strategie from "./Strategie";
import Nonante from "./Nonante";
import p from "./pilotage.module.css";
import {recommend,MARKET,containerCosts,containerDates,distributionOptions,fr,iso,project,situationContainers,situationLots,type Container,type Gestion,type Hub,type Lot,type Params,type Payment,type Port,type Quarter} from "../../lib/gestion";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
type Tab="nonante"|"strategie"|"decision"|"reco"|"bord"|"stock"|"conteneurs"|"paiements"|"treso"|"plan"|"distrib"|"reglages";
const TABS:[Tab,string][]=[["nonante","🗓️ 90 jours"],["decision","🧠 Décision"],["strategie","📈 Stratégie"],["reco","🎯 Calendrier & conseils"],["bord","📊 Tableau de bord"],["stock","🚗 Stock"],["conteneurs","🚢 Conteneurs"],["paiements","💳 Paiements"],["treso","🏦 Trésorerie"],["plan","🗓️ Plan trimestriel"],["distrib","🗺️ Hubs & distribution"],["reglages","⚙️ Réglages"]];
const LOT:Record<Lot["status"],string>={dispo:"Disponible",vendu:"Vendue, à livrer",ancien:"Ancien stock (à déstocker)"};
const SCEN0:[string,string][]=[["défavorable","🌧️ Défavorable"],["probable","⛅ Probable"],["favorable","☀️ Favorable"]];
const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

export default function PilotagePage(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [d,setD]=useState<Gestion|null>(null);const [tab,setTab]=useState<Tab>("nonante");
 const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");const [dirty,setDirty]=useState(false);
 const today=iso(new Date());
 const api=async(body:object,pc=code)=>{const r=await fetch("/api/pilotage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setBusy("load");setMsg("");try{const j=await api({action:"load"},pc);setD(j.data);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const save=async()=>{if(!d)return;setBusy("save");try{const j=await api({action:"save",data:d});setD(j.data);setDirty(false);setMsg("✅ Enregistré.");}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const upd=(f:(x:Gestion)=>Gestion)=>{setD(x=>x?f(x):x);setDirty(true);setMsg("");};
 const setP=(k:keyof Params,v:unknown)=>upd(x=>({...x,params:{...x.params,[k]:v}}));
 const [scen,setScen]=useState(1);
 const SCEN:[string,string,number][]=SCEN0.map((x,i)=>[x[0],x[1],d?[d.params.scenLow??0.7,1,d.params.scenHigh??1.3][i]:1]);
 const projs=useMemo(()=>d?[d.params.scenLow??0.7,1,d.params.scenHigh??1.3].map(f=>project(d,today,true,f)):null,[d,today]);
 const [adsSim,setAdsSim]=useState(325);
 const reco=useMemo(()=>d?recommend(d,today,adsSim):null,[d,today,adsSim]);
 const proj=projs?projs[scen]:null;

 if(!authed||!d||!proj||!projs||!reco)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Pilotage</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const P=d.params;
 const N=(k:keyof Params,label:string,step=1)=><label className={s.param}><span>{label}</span><input type="number" step={step} value={P[k] as number} onChange={e=>setP(k,Number(e.target.value)||0)}/></label>;
 const lotsOf=(st:Lot["status"])=>d.lots.filter(l=>l.status===st).reduce((a,l)=>a+l.qty,0);
 const patchL=(id:string,v:Partial<Lot>)=>upd(x=>({...x,lots:x.lots.map(l=>l.id===id?{...l,...v}:l)}));
 const patchC=(id:string,v:Partial<Container>)=>upd(x=>({...x,containers:x.containers.map(c=>c.id===id?{...c,...v}:c)}));
 const patchPay=(id:string,v:Partial<Payment>)=>upd(x=>({...x,payments:x.payments.map(c=>c.id===id?{...c,...v}:c)}));
 const patchH=(id:string,v:Partial<Hub>)=>upd(x=>({...x,hubs:x.hubs.map(c=>c.id===id?{...c,...v}:c)}));
 const addC=(c?:Partial<Container>)=>upd(x=>({...x,containers:[...x.containers,{id:uid(),label:c?.label?.replace("suggérée","")||`Conteneur ${x.containers.length+1}`,cars:c?.cars||9,port:c?.port||"havre",hubId:c?.hubId||"boran",orderDate:c?.orderDate||today,depositPaid:false,balancePaid:false,freightPaid:false,arrivalPaid:false}]}));
 const inTransit=d.containers.filter(c=>containerDates(P,c).hub>=today).reduce((a,c)=>a+c.cars,0);
 const next30=proj.rows.slice(0,5).flatMap(r=>Object.entries(r.lines).filter(([,v])=>v<0).map(([k,v])=>({w:r.start,k,v}))).filter(x=>!/Livraisons|Stockage|Publicité|Charges/.test(x.k));
 const urgent=proj.suggestions.filter(x=>x.orderDate<=iso(new Date(Date.now()+14*864e5)));
 const dist=distributionOptions(P,d.hubs);
 const Box=({t,v,sub,cls}:{t:string;v:string;sub?:string;cls?:string})=><div className={cls||""}><small>{t}</small><b>{v}</b>{sub?<span>{sub}</span>:null}</div>;

 return <main className={s.page}>
  <header className={s.top}><div><h1>Pilotage NeoDrive</h1><p>Stock · conteneurs · trésorerie · plan · distribution</p></div><div className={s.topBtns}><button onClick={save} disabled={!dirty||!!busy} className={dirty?p.saveOn:""}>{busy==="save"?"…":dirty?"💾 Enregistrer":"✓ Enregistré"}</button></div></header>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}
  {tab!=="reco"&&tab!=="decision"&&tab!=="strategie"&&tab!=="nonante"?<><div className={p.summary}>
   <Box t="Trésorerie aujourd’hui" v={eur(P.bank+P.cashOnHand)} sub={`compte ${eur(P.bank)} · espèces ${eur(P.cashOnHand)}`}/>
   <Box t="Point le plus bas (12 mois)" v={eur(proj.min.cash)} sub={`semaine du ${fr(proj.min.start)}`} cls={proj.min.cash<0?p.bad:proj.min.cash<10000?p.warn:p.good}/>
   <Box t="Stock" v={`${lotsOf("dispo")} dispo`} sub={`${lotsOf("vendu")} à livrer · ${lotsOf("ancien")} ancien · ${inTransit} en route`}/>
   <Box t="À commander sous 15 jours" v={urgent.length?`${urgent.length} conteneur${urgent.length>1?"s":""}`:"Rien"} cls={urgent.length?p.warn:p.good} sub={urgent.map(u=>u.port==="fos"?"Fos":"Le Havre").join(", ")||"stock suffisant"}/>
  </div>
  <div className={s.seg} style={{marginTop:12}}>{SCEN.map((x,i)=><button key={x[0]} className={scen===i?s.on:""} onClick={()=>setScen(i)}>{x[1]} ({Math.round(x[2]*100)} %)</button>)}</div></>:null}
  {!d.containers.length?<p className={s.tip}>Ton outil est vide. <button className={s.small} onClick={()=>upd(x=>({...x,containers:situationContainers(),lots:situationLots()}))}>Charger ma situation du 1er novembre</button> (conteneurs en route, ancien stock) puis complète et enregistre.</p>:null}
  <nav className={p.tabs}>{TABS.map(([k,l])=><button key={k} className={tab===k?p.on:""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="nonante"?<Nonante d={d} today={today}/>:null}
  {tab==="strategie"?<Strategie d={d} upd={upd} today={today}/>:null}
  {tab==="decision"?<Decision d={d} upd={upd} today={today} addC={c=>{addC(c);setMsg("✅ Ajouté à tes conteneurs. Pense à enregistrer.");}}/>:null}
  {tab==="reco"?<section className={s.card}>
   <h2>🎯 Simulateur</h2>
   <div className={p.simIn}>
    <label><span>Budget pub par mois</span><input type="number" value={adsSim} onChange={e=>setAdsSim(Number(e.target.value)||0)}/><em>{[325,650,1300,2000].map(v=><button key={v} className={adsSim===v?p.on:""} onClick={()=>setAdsSim(v)}>{v} €</button>)}</em></label>
    <label><span>Si les ventes sont…</span><em>{SCEN0.map((x,i)=><button key={x[0]} className={scen===i?p.on:""} onClick={()=>setScen(i)}>{x[1]}</button>)}</em></label>
   </div>
   {(()=>{const r=[reco.defav,reco.probable,reco.fav][scen];const f=[P.scenLow??0.7,1,P.scenHigh??1.3][scen];const sm=reco.salesMonth*f;const lost=r.quarters.reduce((a,q)=>a+q.lost,0);const fin=r.rows[r.rows.length-1].cash;
    return <div className={p.big6}>
     <div><small>Ventes par mois</small><b>{Math.round(sm)}</b><span>avec {eur(adsSim)} de pub · entre {Math.round(reco.salesMonth*(P.scenLow??0.7))} et {Math.round(reco.salesMonth*(P.scenHigh??1.3))}</span></div>
     <div><small>Coût de la pub par vente</small><b>{eur(adsSim/Math.max(1,sm))}</b><span>{adsSim/Math.max(1,sm)<150?"✅ rentable":"⚠️ à surveiller"}</span></div>
     <div className={p.good}><small>Gain net par mois</small><b>{eur(sm*reco.unit-adsSim-P.fixedMonthly-P.salaryMonthly)}</b><span>{eur(reco.unit)} par voiture, moins pub et charges</span></div>
     <div className={r.min.cash<0?p.bad:r.min.cash<P.minCash?p.warn:p.good}><small>Trésorerie la plus basse</small><b>{eur(r.min.cash)}</b><span>semaine du {fr(r.min.start)}</span></div>
     <div><small>Trésorerie dans 12 mois</small><b>{eur(fin)}</b><span>avant impôts</span></div>
     <div className={lost?p.warn:""}><small>Conteneurs à commander (12 mois)</small><b>{reco.k} <i>= {reco.k*9} voitures</i></b><span>{lost?`${lost} ventes perdues faute de stock`:"pas de rupture"}</span></div>
    </div>;})()}

   <h3>📅 Calendrier des arrivages</h3>
   <p className={s.muted}><i className={p.lgP}/>production {P.prodDays} j <i className={p.lgW}/>jusqu’au port {P.toPortDays} j <i className={p.lgS}/>bateau {P.seaDays} j <i className={p.lgD}/>douane + transfert {P.customsDays+P.transferDays} j · ▲ aujourd’hui</p>
   {(()=>{const all=[...d.containers.filter(c=>containerDates(P,c).hub>=today),...reco.plan.map(c=>({...c,label:"À commander",suggested:true}))].sort((a,b)=>containerDates(P,a).hub.localeCompare(containerDates(P,b).hub));
    if(!all.length)return <p className={s.muted}>Aucun conteneur en route.</p>;
    const t0=Math.min(...all.map(c=>+new Date(c.orderDate))),t1=Math.max(...all.map(c=>+new Date(containerDates(P,c).hub)))+5*864e5,W=(x:string)=>Math.max(0,Math.min(100,(+new Date(x)-t0)/(t1-t0)*100));
    return <div className={p.tl}>{all.map(c=>{const dd=containerDates(P,c);return <div key={c.id} className={p.tlRow}>
     <div className={p.tlLab}><b>{c.suggested?"🛒 ":""}{c.label}</b><small>{c.cars} voit. · {c.port==="fos"?"Fos → Sud":"Le Havre → Nord"} · au hub <b>{fr(dd.hub)}</b></small></div>
     <div className={p.tlBar}><i className={p.lgP} style={{left:`${W(c.orderDate)}%`,width:`${W(dd.prodEnd)-W(c.orderDate)}%`}}/><i className={p.lgW} style={{left:`${W(dd.prodEnd)}%`,width:`${W(dd.departure)-W(dd.prodEnd)}%`}}/><i className={p.lgS} style={{left:`${W(dd.departure)}%`,width:`${W(dd.portArrival)-W(dd.departure)}%`}}/><i className={p.lgD} style={{left:`${W(dd.portArrival)}%`,width:`${W(dd.hub)-W(dd.portArrival)}%`}}/><span className={p.tlNow} style={{left:`${W(today)}%`}}>▲</span></div>
    </div>;})}</div>;})()}

   <h3>🧭 Ce que je te conseille</h3>
   <ul className={p.sugs}>{reco.recos.map((r,i)=><li key={i} className={r.level==="bad"?p.sugNow:p.sug} style={r.level==="ok"?{borderColor:"#bbf7d0",background:"#f0fdf4"}:r.level==="warn"?{borderColor:"#fde68a",background:"#fffbeb"}:undefined}><div>{r.level==="ok"?"✅ ":r.level==="warn"?"⚠️ ":"🔴 "}{r.text}</div></li>)}</ul>
   {reco.plan.length?<><h3>🛒 Commandes à passer</h3><ul className={s.mini}>{reco.plan.map(o=><li key={o.id}><span><b>{fr(o.orderDate)}</b> · 9 voitures · {o.port==="fos"?"Fos → Sud":"Le Havre → Nord"} · au hub ≈ {fr(containerDates(P,o).hub)}</span><button title="Ajouter à mes conteneurs" onClick={()=>{addC(o);setMsg("✅ Ajouté à tes conteneurs. Pense à enregistrer.");}}>＋</button></li>)}</ul></>:null}
   <details className={p.month}><summary><b>⚙️ Hypothèses du simulateur</b></summary>
    <p className={s.muted}>Aujourd’hui : {eur(P.adsBase)} de pub par mois → {P.salesBase} ventes par mois. Rendement décroissant : avec 4 fois plus de pub, les ventes sont multipliées par {Math.pow(4,P.adsElasticity??0.5).toFixed(1)}. Marché national : {MARKET.newPerYear.toLocaleString("fr-FR")} voitures sans permis neuves / an ; tu en ferais {reco.share.toFixed(1)} %.</p>
    <div className={s.params}>{N("adsBase","Pub actuelle / mois (€)",25)}{N("salesBase","Ventes actuelles / mois")}{N("adsElasticity","Effet de la pub (0,3 faible – 0,7 fort)",0.05)}{N("scenLow","Défavorable (× ventes)",0.05)}{N("scenHigh","Favorable (× ventes)",0.05)}{N("minCash","Trésorerie minimum à garder",500)}</div>
   </details>
  </section>:null}
  {tab==="bord"?<section className={s.card}>
   <h2>📊 Tableau de bord</h2>
   {proj.min.cash<0?<p className={s.err}>⚠️ La trésorerie passe sous zéro la semaine du {fr(proj.min.start)} ({eur(proj.min.cash)}). Pistes : déstocker l’ancien stock, livrer les voitures vendues, décaler un solde usine.</p>:null}
   <h3>Les 3 scénarios de vente</h3>
   <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Scénario</th><th>Ventes / mois</th><th>Livrées 12 mois</th><th>Perdues</th><th>Commandes proposées</th><th>Tréso la plus basse</th><th>Tréso dans 12 mois</th></tr></thead><tbody>
    {SCEN.map((x,i)=>{const r=projs[i];return <tr key={x[0]} style={i===scen?{background:"#fff8f2"}:undefined}><td><b>{x[1]}</b></td><td>≈ {Math.round(P.forecast[0]*x[2])}</td><td>{r.quarters.reduce((a,q)=>a+q.sold,0)}</td><td className={r.quarters.some(q=>q.lost)?p.red:""}>{r.quarters.reduce((a,q)=>a+q.lost,0)||"—"}</td><td>{r.suggestions.length} conteneurs</td><td className={r.min.cash<0?p.red:""}>{eur(r.min.cash)} <small>({fr(r.min.start)})</small></td><td><b>{eur(r.rows[r.rows.length-1].cash)}</b></td></tr>;})}
   </tbody></table></div>
   <h3>Par période de 3 mois — scénario {SCEN[scen][1]}</h3>
   <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Trimestre</th><th>Arrivées</th><th>Livrées</th><th>Perdues</th><th>Entrées</th><th>Sorties</th><th>Tréso fin</th><th>Tréso mini</th></tr></thead><tbody>
    {proj.quarters.map(q=><tr key={q.id}><td><b>{q.id}</b></td><td>{q.arrivals}</td><td>{q.sold}</td><td className={q.lost?p.red:""}>{q.lost||"—"}</td><td>{eur(q.inflow)}</td><td>{eur(q.outflow)}</td><td><b>{eur(q.endCash)}</b></td><td className={q.minCash<0?p.red:""}>{eur(q.minCash)}</td></tr>)}
   </tbody></table></div>
   <h3>Gros paiements des 5 prochaines semaines</h3>
   {next30.length?<ul className={p.sugs}>{next30.map((x,i)=><li key={i} className={p.sug}><div><b>{x.k}</b><small>semaine du {fr(x.w)}</small></div><b className={p.red}>{eur(x.v)}</b></li>)}</ul>:<p className={s.muted}>Aucun gros paiement prévu.</p>}
   <h3>Commandes à passer</h3>
   {proj.suggestions.length?<div className={p.sugs}>{proj.suggestions.slice(0,6).map(x=>{const dd=containerDates(P,x);return <div key={x.id} className={x.orderDate<=today?p.sugNow:p.sug}><div><b>{x.orderDate<=today?"🔴 À commander maintenant":`Commander le ${fr(x.orderDate)}`}</b><small>9 voitures · {x.port==="fos"?"Fos → Sud":"Le Havre → Nord"} · au hub vers le {fr(dd.hub)}</small></div><button className={s.small} onClick={()=>{addC(x);setMsg("✅ Ajouté à tes conteneurs. Pense à enregistrer.");}}>＋ Je commande</button></div>;})}</div>:<p className={s.ok}>✅ Pas de commande nécessaire sur 12 mois.</p>}
  </section>:null}

  {tab==="stock"?<section className={s.card}>
   <p className={s.tip}>Situation du 1er novembre : 7 voitures à livrer (≈ 5 500 € TTC), 10 d’ancien stock, 12 conteneurs (fret déjà payé pour novembre, à payer pour décembre), 18 000 € sur le compte + 27 000 € à l’extérieur. <button className={s.small} onClick={()=>{if(confirm("Remplacer le stock, les conteneurs et la trésorerie par la situation du 1er novembre ?"))upd(x=>({...x,containers:situationContainers(),lots:situationLots(),params:{...x.params,bank:18000,cashOnHand:27000}}));}}>Recharger cette situation</button></p>
   <div className={s.rowHead}><h2>🚗 Stock</h2><button className={s.small} onClick={()=>upd(x=>({...x,lots:[...x.lots,{id:uid(),label:"NeoDrive Confort",qty:1,hubId:x.hubs[0]?.id||"",status:"dispo",priceTtc:P.priceTtc}]}))}>＋ Ajouter</button></div>
   <p className={s.muted}>Une ligne = un lot de voitures identiques au même endroit. « Vendue, à livrer » : l’argent rentre à la date de livraison (sauf si déjà encaissé). « Ancien stock » : vendu au rythme de {P.oldPerWeek}/semaine au prix indiqué.</p>
   {d.lots.map(l=><article key={l.id} className={p.route}>
    <div className={s.grid2}>
     <label className={s.field}><span>Modèle / description</span><input value={l.label} onChange={e=>patchL(l.id,{label:e.target.value})}/></label>
     <label className={s.field}><span>Statut</span><select value={l.status} onChange={e=>patchL(l.id,{status:e.target.value as Lot["status"]})}>{Object.entries(LOT).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     <label className={s.field}><span>Quantité</span><input type="number" value={l.qty} onChange={e=>patchL(l.id,{qty:Number(e.target.value)||0})}/></label>
     <label className={s.field}><span>Où</span><select value={l.hubId} onChange={e=>patchL(l.id,{hubId:e.target.value})}>{d.hubs.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
     <label className={s.field}><span>Prix de vente TTC / voiture</span><input type="number" value={l.priceTtc} onChange={e=>patchL(l.id,{priceTtc:Number(e.target.value)||0})}/></label>
     {l.status==="vendu"?<><label className={s.field}><span>Client(s)</span><input value={l.client||""} onChange={e=>patchL(l.id,{client:e.target.value})}/></label>
      <label className={s.field}><span>Date de livraison prévue</span><input type="date" value={l.deliveryDate||""} onChange={e=>patchL(l.id,{deliveryDate:e.target.value})}/></label>
      <label className={s.field}><span>Déjà encaissé ?</span><select value={l.paid?"1":"0"} onChange={e=>patchL(l.id,{paid:e.target.value==="1"})}><option value="0">Non, à la livraison</option><option value="1">Oui</option></select></label></>:null}
    </div>
    <button className={s.danger} onClick={()=>{if(confirm("Supprimer cette ligne ?"))upd(x=>({...x,lots:x.lots.filter(y=>y.id!==l.id)}));}}>Supprimer</button>
   </article>)}
   {lotsOf("ancien")?<p className={s.tip}>💡 Ancien stock : {lotsOf("ancien")} voitures. Prix conseillé pour vendre en 3-4 semaines : 4 290–4 490 € TTC si elles valent une Confort récente, 3 490–3 990 € sinon. Annonces Leboncoin avec remontée + proposer aux clients qui attendent une Essentielle.</p>:null}
  </section>:null}

  {tab==="conteneurs"?<section className={s.card}>
   <div className={s.rowHead}><h2>🚢 Conteneurs</h2><button className={s.small} onClick={()=>addC()}>＋ Ajouter</button></div>
   <p className={s.muted}>Calendrier auto : production {P.prodDays} j → port {P.toPortDays} j → mer {P.seaDays} j → douane {P.customsDays} j → transfert {P.transferDays} j. Si tu connais la date d’arrivée au hub, mets-la : elle remplace le calcul. Coche ce qui est déjà payé.</p>
   {d.containers.map(c=>{const dd=containerDates(P,c),k=containerCosts(P,d.hubs,c);return <article key={c.id} className={p.route}>
    <div className={s.grid2}>
     <label className={s.field}><span>Nom</span><input value={c.label} onChange={e=>patchC(c.id,{label:e.target.value})}/></label>
     <label className={s.field}><span>Voitures</span><input type="number" value={c.cars} onChange={e=>patchC(c.id,{cars:Number(e.target.value)||0})}/></label>
     <label className={s.field}><span>Port</span><select value={c.port} onChange={e=>patchC(c.id,{port:e.target.value as Port,hubId:e.target.value==="fos"?"lamasquere":c.hubId})}><option value="havre">Le Havre</option><option value="fos">Fos-sur-Mer</option></select></label>
     <label className={s.field}><span>Hub de destination</span><select value={c.hubId} onChange={e=>patchC(c.id,{hubId:e.target.value})}>{d.hubs.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
     <label className={s.field}><span>Date de commande</span><input type="date" value={c.orderDate} onChange={e=>patchC(c.id,{orderDate:e.target.value})}/></label>
     <label className={s.field}><span>Arrivée au hub (si connue)</span><input type="date" value={c.etaHub||""} onChange={e=>patchC(c.id,{etaHub:e.target.value||undefined})}/></label>
    </div>
    <div className={p.costLine}>
     {([["depositPaid",`Acompte ${eur(k.deposit)} · ${fr(c.orderDate)}`],["balancePaid",`Solde ${eur(k.balance)} · ${fr(dd.prodEnd)}`],["freightPaid",`Fret ${eur(k.freight)} · ${fr(dd.freightDue)}`],["arrivalPaid",`Arrivée ${eur(k.arrival)} · ${fr(dd.arrivalPay)}`]] as [keyof Container,string][]).map(([f,l])=><label key={f} className={p.chk}><input type="checkbox" checked={!!c[f]} onChange={e=>patchC(c.id,{[f]:e.target.checked})}/> {l}</label>)}
    </div>
    <small className={s.muted}>Départ {fr(dd.departure)} · port {fr(dd.portArrival)} · <b>au hub {fr(dd.hub)}</b> · {eur(k.landedPerCar)} par voiture rendue (TVA import autoliquidée, rien à avancer)</small>
    <button className={s.danger} onClick={()=>{if(confirm(`Supprimer ${c.label} ?`))upd(x=>({...x,containers:x.containers.filter(y=>y.id!==c.id)}));}}>Supprimer</button>
   </article>;})}
  </section>:null}

  {tab==="paiements"?<section className={s.card}>
   <div className={s.rowHead}><h2>💳 Autres paiements et rentrées</h2><button className={s.small} onClick={()=>upd(x=>({...x,payments:[...x.payments,{id:uid(),label:"Solde petits camions",date:today,amount:-1000,done:false}]}))}>＋ Ajouter</button></div>
   <p className={s.muted}>Tout ce qui n’est pas un conteneur de voitures : petits camions, tricycles, scooters, remorque, terrain, rentrée exceptionnelle… Montant négatif = dépense, positif = rentrée.</p>
   {d.payments.map(x=><div key={x.id} className={s.inline} style={{gridTemplateColumns:"1fr 130px 110px auto auto"}}>
    <input value={x.label} onChange={e=>patchPay(x.id,{label:e.target.value})}/><input type="date" value={x.date} onChange={e=>patchPay(x.id,{date:e.target.value})}/><input type="number" value={x.amount} onChange={e=>patchPay(x.id,{amount:Number(e.target.value)||0})}/>
    <label className={p.chk}><input type="checkbox" checked={x.done} onChange={e=>patchPay(x.id,{done:e.target.checked})}/> fait</label>
    <button onClick={()=>upd(y=>({...y,payments:y.payments.filter(z=>z.id!==x.id)}))}>🗑</button>
   </div>)}
  </section>:null}

  {tab==="treso"?<section className={s.card}>
   <h2>🏦 Trésorerie semaine par semaine</h2>
   <div className={p.bars} style={{gridTemplateColumns:"repeat(26,1fr)"}}>{(()=>{const rr=proj.rows.slice(0,26),max=Math.max(1,...rr.map(r=>Math.abs(r.cash)));return rr.map(r=><div key={r.start} className={p.barCol} title={`${fr(r.start)} : ${eur(r.cash)}`}><div className={p.barBox}><i style={{height:`${Math.max(2,Math.abs(r.cash)/max*100)}%`,background:r.cash<0?"#dc2626":r.cash<10000?"#f59e0b":"#16a34a"}}/></div></div>);})()}</div>
   <div className={p.months}>{proj.rows.slice(0,26).map(r=><details key={r.start} className={p.month}>
    <summary><b>{fr(r.start)}</b><span className={s.okTxt}>+{eur(r.inflow)}</span><span className={p.red}>{eur(r.outflow)}</span><strong className={r.cash<0?p.red:""}>{eur(r.cash)}</strong></summary>
    <ul>{Object.entries(r.lines).filter(([,v])=>Math.round(v)!==0).sort((a,b)=>b[1]-a[1]).map(([k,v])=><li key={k}><span>{k}</span><span className={v<0?p.red:s.okTxt}>{eur(v)}</span></li>)}</ul>
    <small className={s.muted}>{r.arrivals?`${r.arrivals} voitures arrivent · `:""}{r.delivered} livrées{r.lost?` · ${r.lost} ventes perdues (pas de stock)`:""} · stock fin {r.stock}</small>
   </details>)}</div>
  </section>:null}

  {tab==="plan"?<section className={s.card}>
   <h2>🗓️ Planning par période de 3 mois</h2>
   <p className={s.muted}>Au début de chaque période : passe les commandes listées et fixe le budget pub. À la fin : note les ventes réelles. Marge estimée ≈ {eur((P.priceTtc+P.deliveryTtc)/1.2-P.landedEstimate-P.deliveryCost)} par voiture (prix HT − voiture rendue au hub {eur(P.landedEstimate)} − livraison), avant pub et charges.</p>
   {proj.quarters.map((pq,qi)=>{const q:Quarter=d.quarters.find(x=>x.id===pq.id)||{id:pq.id,label:pq.id,salesTarget:pq.sold,adsMonthly:P.adsDefault,actualSales:0};
    const setQ=(v:Partial<Quarter>)=>upd(x=>({...x,quarters:x.quarters.some(y=>y.id===q.id)?x.quarters.map(y=>y.id===q.id?{...y,...v}:y):[...x.quarters,{...q,...v}]}));
    const unit=(P.priceTtc+P.deliveryTtc)/1.2-P.landedEstimate-P.deliveryCost;
    return <article key={pq.id} className={p.route}>
    <div className={s.rowHead}><b>{pq.id}</b><span className={p.tag}>Tréso fin : {SCEN.map((x,i)=>`${x[0]} ${eur(projs[i].quarters[qi]?.endCash||0)}`).join(" · ")}</span></div>
    <div className={s.kpis}>
     <div><small>Conteneurs à commander</small><b>{pq.orders}</b></div>
     <div><small>Voitures qui arrivent</small><b>{pq.arrivals}</b></div>
     <div><small>Ventes prévues (défav. / probable / fav.)</small><b>{SCEN.map((_,i)=>projs[i].quarters[qi]?.sold||0).join(" / ")}</b></div>
     <div><small>Marge estimée ({SCEN[scen][0]})</small><b>{eur(pq.sold*unit-q.adsMonthly*3)}</b></div>
    </div>
    {pq.orderList.length?<ul className={s.mini}>{pq.orderList.map(o=><li key={o.id}><span>{fr(o.orderDate)} · {o.cars} voitures · {o.port==="fos"?"Fos → Sud":"Le Havre → Nord"} · au hub ≈ {fr(containerDates(P,o).hub)}</span>{o.suggested?<button title="Ajouter à mes conteneurs" onClick={()=>{addC(o);setMsg("✅ Ajouté à tes conteneurs. Pense à enregistrer.");}}>＋</button>:<span>✔︎</span>}</li>)}</ul>:<p className={s.muted}>Pas de commande à passer sur cette période.</p>}
    <div className={s.params}>
     <label className={s.param}><span>Budget pub / mois (€)</span><input type="number" value={q.adsMonthly} onChange={e=>setQ({adsMonthly:Number(e.target.value)||0})}/></label>
     <label className={s.param}><span>Objectif ventes</span><input type="number" value={q.salesTarget} onChange={e=>setQ({salesTarget:Number(e.target.value)||0})}/></label>
     <label className={s.param}><span>Ventes réelles</span><input type="number" value={q.actualSales} onChange={e=>setQ({actualSales:Number(e.target.value)||0})}/></label>
    </div>
    <small className={s.muted}>📣 {Math.floor(q.adsMonthly*3/120)} annonces Leboncoin avec remontée (≈ 120 € / 2 mois) ou {Math.floor(q.adsMonthly*3/60)} sans remontée · pub par vente ≈ {eur(q.adsMonthly*3/Math.max(1,q.actualSales||pq.sold))}{q.actualSales?` · réel ${q.actualSales} / prévu ${pq.sold} (${Math.round(100*q.actualSales/Math.max(1,pq.sold))} %)`:""}</small>
   </article>;})}
   <h3>Ventes prévues par mois (scénario intermédiaire)</h3>
   <div className={s.params}>{P.forecast.map((v,i)=>{const dt=new Date();dt.setMonth(dt.getMonth()+i);return <label key={i} className={s.param}><span>{dt.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})}</span><input type="number" value={v} onChange={e=>setP("forecast",P.forecast.map((x,k)=>k===i?Number(e.target.value)||0:x))}/></label>;})}</div>
   <p className={s.muted}>Lente = 70 % de ces chiffres, rapide = 130 %. Commandes limitées à {P.maxPerMonth} conteneurs par mois (modifiable dans Réglages).</p>
  </section>:null}

  {tab==="distrib"?<section className={s.card}>
   <h2>🗺️ Hubs & distribution</h2>
   <p className={s.muted}>Coût par voiture : logistique d’import (fret, douane, agent, dépotage, transferts — sans le prix usine) + livraison client depuis le hub ({P.carsPerTrip} voitures par trajet) + stockage d’un mois.</p>
   {[...dist].sort((a,b)=>a.total-b.total).map((o,i)=><article key={o.id} className={`${p.route} ${i===0?p.best:""}`}>
    <div className={s.rowHead}><b>{o.label}</b>{i===0?<span className={p.tag}>✅ Le moins cher</span>:null}</div>
    <div className={p.costLine}><span>Import + transfert {eur(o.perCar)}</span><span>Livraison client {eur(o.delivery)}</span><span>Stockage {eur(o.storage)}</span></div>
    <div className={p.bigLine}><span>Total par voiture</span><b>{eur(o.total)}</b></div>
   </article>)}
   <div className={s.params}>{N("carsPerTrip","Voitures par trajet (remorque)")}{N("costPerKm","Coût du km (carburant+péage+chauffeur)",0.05)}{N("truckCost","Camion porte-voitures complet (€)",50)}{N("truckCars","Voitures par camion")}{N("havreSiteRent","Terrain Havre : loyer / mois",50)}{N("havreSiteUnload","Terrain Havre : dépotage / conteneur",50)}</div>
   <h3>Hubs</h3>
   {d.hubs.map(h=><div key={h.id} className={p.route}><b>{h.name}</b><div className={s.params}>
    <label className={s.param}><span>Loyer fixe / mois</span><input type="number" value={h.rentMonthly} onChange={e=>patchH(h.id,{rentMonthly:Number(e.target.value)||0})}/></label>
    <label className={s.param}><span>Par voiture / mois</span><input type="number" value={h.perCarMonthly} onChange={e=>patchH(h.id,{perCarMonthly:Number(e.target.value)||0})}/></label>
    <label className={s.param}><span>Capacité</span><input type="number" value={h.capacity} onChange={e=>patchH(h.id,{capacity:Number(e.target.value)||0})}/></label>
    <label className={s.param}><span>Transfert depuis Le Havre / voiture</span><input type="number" value={h.transferPerCar} onChange={e=>patchH(h.id,{transferPerCar:Number(e.target.value)||0})}/></label>
    <label className={s.param}><span>Distance moyenne client (km)</span><input type="number" value={h.avgDeliveryKm} onChange={e=>patchH(h.id,{avgDeliveryKm:Number(e.target.value)||0})}/></label>
   </div></div>)}
   <button className={s.ghost} onClick={()=>upd(x=>({...x,hubs:[...x.hubs,{id:uid(),name:"Nouveau hub",rentMonthly:0,perCarMonthly:25,capacity:10,transferPerCar:200,avgDeliveryKm:250}]}))}>＋ Ajouter un hub</button>
  </section>:null}

  {tab==="reglages"?<section className={s.card}>
   <h2>⚙️ Réglages</h2>
   <h3>Trésorerie</h3><div className={s.params}>{N("bank","Sur le compte (€)",100)}{N("cashOnHand","Espèces (€)",100)}{N("fixedMonthly","Charges fixes / mois",50)}{N("salaryMonthly","Ton salaire / mois",50)}</div>
   <h3>Achat et import</h3><div className={s.params}>{N("factory","Prix usine / voiture (€)")}{N("deposit","Acompte / voiture (€)")}{N("usd","Dollar en €",0.01)}<label className={s.param}><span>Fret Le Havre (USD)</span><input type="number" value={P.freightUsd.havre} onChange={e=>setP("freightUsd",{...P.freightUsd,havre:Number(e.target.value)||0})}/></label><label className={s.param}><span>Fret Fos (USD)</span><input type="number" value={P.freightUsd.fos} onChange={e=>setP("freightUsd",{...P.freightUsd,fos:Number(e.target.value)||0})}/></label><label className={s.param}><span>Dont usine → port Chine (USD)</span><input type="number" value={P.freightInlandUsd??800} onChange={e=>setP("freightInlandUsd",Number(e.target.value)||0)}/></label>{N("dutyPct","Douane (%)")}{N("agent","Agent en douane (€)")}{N("warehouseTransfer","Transfert vers entrepôt (€)")}{N("unload","Dépotage (€ / conteneur)")}{N("fosToMuret","Fos → Muret (€ / conteneur)")}</div>
   <h3>Délais (jours)</h3><div className={s.params}>{N("prodDays","Production")}{N("toPortDays","Jusqu’au port")}{N("seaDays","Traversée")}{N("customsDays","Douane")}{N("transferDays","Transfert au hub")}</div>
   <h3>Ventes</h3><div className={s.params}>{N("priceTtc","Prix moyen voiture TTC")}{N("deliveryTtc","Livraison facturée TTC moyenne")}{N("deliveryCost","Coût d’une livraison (€)")}{N("safety","Stock de sécurité")}{N("maxPerMonth","Conteneurs max / mois")}{N("landedEstimate","Coût voiture rendue au hub (€)")}{N("oldPerWeek","Ancien stock vendu / semaine")}</div>
   <p className={s.muted}>Pense à cliquer sur « 💾 Enregistrer » en haut.</p>
  </section>:null}
 </main>;
}
