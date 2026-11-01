"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import p from "./pilotage.module.css";
import {HUB_LABEL,addMonths,bestRoute,monthKey,monthLabel,project,routeCost,type Container,type HubKey,type Params,type Pilotage,type Route} from "../../lib/pilotage";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
type Tab="couts"|"conteneurs"|"commandes"|"tresorerie"|"reglages";
const TABS:[Tab,string][]=[["couts","💶 Coûts"],["commandes","📅 Commandes"],["tresorerie","🏦 Trésorerie"],["conteneurs","🚢 Conteneurs"],["reglages","⚙️ Réglages"]];
const STATUS:Record<Container["status"],string>={commande:"Commandé",en_mer:"En mer",arrive:"Arrivé"};

export default function PilotagePage(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [d,setD]=useState<Pilotage|null>(null);const [tab,setTab]=useState<Tab>("couts");
 const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");const [dirty,setDirty]=useState(false);
 const start=monthKey(new Date());
 const api=async(body:object,pc=code)=>{const r=await fetch("/api/pilotage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setBusy("load");setMsg("");try{const j=await api({action:"load"},pc);setD(j.data);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const save=async()=>{if(!d)return;setBusy("save");try{const j=await api({action:"save",data:d});setD(j.data);setDirty(false);setMsg("✅ Enregistré.");}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const upd=(f:(x:Pilotage)=>Pilotage)=>{setD(x=>x?f(x):x);setDirty(true);setMsg("");};
 const setP=(k:keyof Params,v:unknown)=>upd(x=>({...x,params:{...x.params,[k]:v}}));
 const proj=useMemo(()=>d?project(d,start):null,[d,start]);

 if(!authed||!d||!proj)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Pilotage</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const P=d.params;
 const N=(k:keyof Params,label:string,step=1)=><label className={s.param}><span>{label}</span><input type="number" step={step} value={P[k] as number} onChange={e=>setP(k,Number(e.target.value)||0)}/></label>;
 const costs=d.routes.map(r=>routeCost(P,r));
 const best:Record<HubKey,ReturnType<typeof bestRoute>>={lamasquere:bestRoute(P,d.routes,"lamasquere"),boran:bestRoute(P,d.routes,"boran")};
 const worstSud=Math.max(...costs.filter(c=>c.route.hub==="lamasquere").map(c=>c.perCar.landed));
 const sales12=proj.rows.reduce((a,r)=>a+r.sold.lamasquere+r.sold.boran,0);
 const lost12=proj.rows.reduce((a,r)=>a+r.lost,0);
 const urgent=proj.suggestions.filter(x=>x.orderMonth===start);
 const addContainer=(c?:Partial<Container>)=>upd(x=>({...x,containers:[...x.containers,{id:`C-${Date.now()}`,label:`Conteneur ${x.containers.length+1}`,routeId:c?.routeId||x.routes[0].id,cars:c?.cars||x.params.perContainer,orderMonth:c?.orderMonth||start,arrivalMonth:c?.arrivalMonth||addMonths(start,x.params.leadMonths),status:"commande"}]}));
 const patchC=(id:string,v:Partial<Container>)=>upd(x=>({...x,containers:x.containers.map(c=>c.id===id?{...c,...v}:c)}));
 const patchR=(id:string,v:Partial<Route>)=>upd(x=>({...x,routes:x.routes.map(r=>r.id===id?{...r,...v}:r)}));
 const monthOpts=Array.from({length:18},(_,i)=>addMonths(start,i-4));

 return <main className={s.page}>
  <header className={s.top}><div><h1>Pilotage NeoDrive</h1><p>Coûts · commandes · trésorerie</p></div><div className={s.topBtns}><button onClick={save} disabled={!dirty||!!busy} className={dirty?p.saveOn:""}>{busy==="save"?"…":dirty?"💾 Enregistrer":"✓ Enregistré"}</button></div></header>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}

  {/* Résumé toujours visible */}
  <div className={p.summary}>
   <div className={proj.minCash<0?p.bad:proj.minCash<10000?p.warn:p.good}><small>Trésorerie la plus basse (12 mois)</small><b>{eur(proj.minCash)}</b><span>en {monthLabel(proj.minMonth)}</span></div>
   <div className={urgent.length?p.warn:p.good}><small>À commander ce mois-ci</small><b>{urgent.length?`${urgent.length} conteneur${urgent.length>1?"s":""}`:"Rien"}</b><span>{urgent.length?urgent.map(u=>HUB_LABEL[u.hub].split(" ")[0]).join(", "):"stock suffisant"}</span></div>
   <div><small>Argent dans les conteneurs en route</small><b>{eur(proj.immobilise)}</b><span>{d.containers.filter(c=>c.status!=="arrive").length} conteneur(s)</span></div>
   <div className={lost12?p.warn:""}><small>Ventes possibles sur 12 mois</small><b>{sales12} voitures</b><span>{lost12?`${lost12} perdues faute de stock`:"aucune rupture"}</span></div>
  </div>

  <nav className={p.tabs}>{TABS.map(([k,l])=><button key={k} className={tab===k?p.on:""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="couts"?<section className={s.card}>
   <h2>💶 Coût d’une voiture rendue au hub, par route</h2>
   <p className={s.muted}>Conteneur de {P.perContainer} voitures · dollar à {P.usd} € · douane {P.dutyPct} % (sur voitures + fret). Modifiez les montants : tout se recalcule.</p>
   {costs.map(c=>{const isBest=best[c.route.hub]?.route.id===c.route.id;return <article key={c.route.id} className={`${p.route} ${isBest?p.best:""}`}>
    <div className={s.rowHead}><b>{c.route.label}</b>{isBest?<span className={p.tag}>✅ Le moins cher pour {HUB_LABEL[c.route.hub].split(" ")[0]}</span>:null}</div>
    <div className={p.costLine}><span>Usine {eur(c.perCar.factory)}</span><span>Fret {eur(c.perCar.freight)}</span><span>Douane {eur(c.perCar.duty)}</span><span>Dédouan. {eur(c.perCar.customs)}</span><span>Dépotage {eur(c.perCar.unload)}</span><span>Transfert {eur(c.perCar.transfer)}</span></div>
    <div className={p.bigLine}><span>Coût rendu au hub</span><b>{eur(c.perCar.landed)}</b><span>Marge nette / voiture</span><b className={c.marginPerCar>=0?s.okTxt:p.red}>{eur(c.marginPerCar)}</b></div>
    <div className={s.grid2}>
     <label className={s.param}><span>Dépotage (€ / conteneur)</span><input type="number" value={c.route.unload} onChange={e=>patchR(c.route.id,{unload:Number(e.target.value)||0})}/></label>
     <label className={s.param}><span>Transfert vers hub (€ / conteneur)</span><input type="number" value={c.route.transfer} onChange={e=>patchR(c.route.id,{transfer:Number(e.target.value)||0})}/></label>
    </div>
    {c.route.note?<small className={s.muted}>{c.route.note}</small>:null}
   </article>})}
   {best.lamasquere?<p className={s.tip}>💡 Pour le Sud, la meilleure route coûte <b>{eur(best.lamasquere.perCar.landed)}</b> par voiture, soit <b>{eur(worstSud-best.lamasquere.perCar.landed)}</b> de moins que la plus chère ({eur((worstSud-best.lamasquere.perCar.landed)*P.perContainer)} par conteneur).</p>:null}
   <h3>Marge nette par voiture (meilleure route)</h3>
   {best.lamasquere?(()=>{const b=best.lamasquere!;const ht=(P.priceTtc+P.deliveryTtc)/1.2;const L:[string,number][]=[["Vente + livraison HT",ht],["Voiture rendue au hub",-b.perCar.landed],["Livraison client",-P.delivery],["Stockage",-P.storage],["Publicité",-P.ads],["Duster + matériel",-P.gear],["Réserve SAV",-P.sav]];return <div className={p.water}>{L.map(([l,v])=><div key={l}><span>{l}</span><span className={v<0?p.red:""}>{eur(v)}</span></div>)}<div className={p.total}><span>Marge nette avant impôts</span><span>{eur(b.marginPerCar)}</span></div></div>;})():null}
  </section>:null}

  {tab==="commandes"?<section className={s.card}>
   <h2>📅 Programme de commandes</h2>
   <p className={s.muted}>Délai commande → arrivée : {P.leadMonths} mois · stock de sécurité {P.safety} voitures par hub · ventes prévues modifiables dans ⚙️ Réglages.</p>
   {proj.unavoidable?<p className={s.err}>⚠️ {proj.unavoidable} vente{proj.unavoidable>1?"s":""} manquée{proj.unavoidable>1?"s":""} dans les {P.leadMonths} prochains mois : trop tard pour commander (délai {P.leadMonths} mois). Ajoutez vos conteneurs déjà en route dans 🚢 Conteneurs, ou proposez une date de livraison plus tardive (avec acompte).</p>:null}
   {proj.suggestions.length?<div className={p.sugs}>{proj.suggestions.map(x=>{const r=d.routes.find(y=>y.id===x.routeId);return <div key={x.id} className={x.orderMonth===start?p.sugNow:p.sug}>
    <div><b>{x.orderMonth===start?"🔴 À commander maintenant":`Commander en ${monthLabel(x.orderMonth)}`}</b><small>{x.cars} voitures · {r?.label} · arrivée {monthLabel(x.arrivalMonth)}</small><small>{x.reason}</small></div>
    <button className={s.small} onClick={()=>{addContainer(x);setMsg("✅ Ajouté à vos conteneurs. Pensez à enregistrer.");}}>＋ Je commande</button>
   </div>})}</div>:<p className={s.ok}>✅ Aucune commande nécessaire sur 12 mois avec ces prévisions.</p>}
   <div className={s.tableWrap}><table className={p.table}><thead><tr><th>Mois</th><th>Ventes prévues</th><th>Arrivées Sud</th><th>Arrivées Nord</th><th>Stock Sud</th><th>Stock Nord</th><th>Perdues</th></tr></thead><tbody>
    {proj.rows.map((r,i)=><tr key={r.m}><td><b>{monthLabel(r.m)}</b></td><td><input className={p.mini} type="number" value={P.forecast[i]||0} onChange={e=>setP("forecast",P.forecast.map((v,k)=>k===i?Number(e.target.value)||0:v))}/></td><td>{r.arrivals.lamasquere||"—"}</td><td>{r.arrivals.boran||"—"}</td><td className={r.stockEnd.lamasquere<P.safety?p.red:""}>{r.stockEnd.lamasquere}</td><td className={r.stockEnd.boran<P.safety?p.red:""}>{r.stockEnd.boran}</td><td className={r.lost?p.red:""}>{r.lost||"—"}</td></tr>)}
   </tbody></table></div>
   <p className={s.muted}>Les commandes suggérées (pas encore passées) sont déjà comptées dans les stocks et la trésorerie, pour montrer le plan complet.</p>
  </section>:null}

  {tab==="tresorerie"?<section className={s.card}>
   <h2>🏦 Trésorerie disponible, mois par mois</h2>
   <p className={s.muted}>Départ : {eur(P.cash)} · acompte usine {P.supplierDepositPct} % à la commande, solde + fret {P.shipAfterMonths} mois après · douane et TVA import à l’arrivée (TVA récupérée le mois suivant) · ventes encaissées à la livraison, TVA reversée le mois suivant.</p>
   <div className={p.bars}>{(()=>{const max=Math.max(1,...proj.rows.map(r=>Math.abs(r.cashEnd)));return proj.rows.map(r=><div key={r.m} className={p.barCol} title={eur(r.cashEnd)}><div className={p.barBox}><i style={{height:`${Math.max(2,Math.abs(r.cashEnd)/max*100)}%`,background:r.cashEnd<0?"#dc2626":r.cashEnd<10000?"#f59e0b":"#16a34a"}}/></div><small>{monthLabel(r.m)}</small></div>);})()}</div>
   <div className={p.months}>{proj.rows.map(r=><details key={r.m} className={p.month}>
    <summary><b>{monthLabel(r.m)}</b><span className={s.okTxt}>+{eur(r.cashIn)}</span><span className={p.red}>{eur(r.cashOut)}</span><strong className={r.cashEnd<0?p.red:""}>{eur(r.cashEnd)}</strong></summary>
    <ul>{Object.entries(r.detail).filter(([,v])=>Math.round(v)!==0).sort((a,b)=>b[1]-a[1]).map(([k,v])=><li key={k}><span>{k}</span><span className={v<0?p.red:s.okTxt}>{eur(v)}</span></li>)}</ul>
    <small className={s.muted}>{r.sold.lamasquere+r.sold.boran} voitures livrées · stock fin : Sud {r.stockEnd.lamasquere}, Nord {r.stockEnd.boran}</small>
   </details>)}</div>
   {proj.minCash<0?<p className={s.err}>⚠️ La trésorerie passe sous zéro en {monthLabel(proj.minMonth)}. Pistes : acompte client sur les arrivages, négocier l’acompte usine, étaler les commandes, financement de stock.</p>:null}
  </section>:null}

  {tab==="conteneurs"?<section className={s.card}>
   <div className={s.rowHead}><h2>🚢 Mes conteneurs</h2><button className={s.small} onClick={()=>addContainer()}>＋ Ajouter</button></div>
   {!d.containers.length?<p className={s.muted}>Ajoutez vos conteneurs commandés ou en mer : ils sont comptés dans le stock et la trésorerie.</p>:null}
   {d.containers.map(c=>{const r=d.routes.find(x=>x.id===c.routeId);const rc=r?routeCost(P,r,c.cars):null;return <article key={c.id} className={p.route}>
    <div className={s.grid2}>
     <label className={s.field}><span>Nom</span><input value={c.label} onChange={e=>patchC(c.id,{label:e.target.value})}/></label>
     <label className={s.field}><span>Statut</span><select value={c.status} onChange={e=>patchC(c.id,{status:e.target.value as Container["status"]})}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     <label className={s.field}><span>Route</span><select value={c.routeId} onChange={e=>patchC(c.id,{routeId:e.target.value})}>{d.routes.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
     <label className={s.field}><span>Voitures</span><input type="number" value={c.cars} onChange={e=>patchC(c.id,{cars:Number(e.target.value)||0})}/></label>
     <label className={s.field}><span>Mois de commande</span><select value={c.orderMonth} onChange={e=>patchC(c.id,{orderMonth:e.target.value,arrivalMonth:addMonths(e.target.value,P.leadMonths)})}>{monthOpts.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
     <label className={s.field}><span>Mois d’arrivée</span><select value={c.arrivalMonth} onChange={e=>patchC(c.id,{arrivalMonth:e.target.value})}>{monthOpts.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
    </div>
    {rc?<p className={s.muted}>Coût total {eur(rc.containerCash-rc.importVat)} (+ TVA import avancée {eur(rc.importVat)}) · {eur(rc.perCar.landed)} par voiture rendue</p>:null}
    <button className={s.danger} onClick={()=>{if(confirm(`Supprimer ${c.label} ?`))upd(x=>({...x,containers:x.containers.filter(y=>y.id!==c.id)}));}}>Supprimer</button>
   </article>})}
  </section>:null}

  {tab==="reglages"?<section className={s.card}>
   <h2>⚙️ Réglages</h2>
   <h3>Trésorerie et stock aujourd’hui</h3>
   <div className={s.params}>{N("cash","Trésorerie actuelle (€)",100)}<label className={s.param}><span>Stock Sud</span><input type="number" value={P.stock.lamasquere} onChange={e=>setP("stock",{...P.stock,lamasquere:Number(e.target.value)||0})}/></label><label className={s.param}><span>Stock Nord</span><input type="number" value={P.stock.boran} onChange={e=>setP("stock",{...P.stock,boran:Number(e.target.value)||0})}/></label>{N("sudPct","Part des ventes au Sud (%)")}{N("safety","Stock de sécurité / hub")}{N("fixedMonthly","Charges fixes / mois (€)",50)}</div>
   <h3>Achat et import</h3>
   <div className={s.params}>{N("factory","Prix usine / voiture (€)")}{N("perContainer","Voitures / conteneur")}{N("usd","Dollar en € (ex. 0,86)",0.01)}<label className={s.param}><span>Fret Le Havre (USD)</span><input type="number" value={P.freightUsd.havre} onChange={e=>setP("freightUsd",{...P.freightUsd,havre:Number(e.target.value)||0})}/></label><label className={s.param}><span>Fret Fos (USD)</span><input type="number" value={P.freightUsd.fos} onChange={e=>setP("freightUsd",{...P.freightUsd,fos:Number(e.target.value)||0})}/></label>{N("dutyPct","Douane (%)")}{N("customs","Dédouanement (€ / conteneur)")}{N("leadMonths","Délai commande → arrivée (mois)")}{N("shipAfterMonths","Expédition après commande (mois)")}{N("supplierDepositPct","Acompte usine à la commande (%)")}</div>
   <h3>Vente et frais par voiture</h3>
   <div className={s.params}>{N("priceTtc","Prix voiture TTC (€)")}{N("deliveryTtc","Livraison facturée TTC moyenne (€)")}{N("delivery","Coût livraison client (€)")}{N("storage","Stockage (€)")}{N("ads","Publicité (€)")}{N("gear","Duster + matériel (€)")}{N("sav","Réserve SAV (€)")}</div>
   <p className={s.muted}>Pensez à cliquer sur « 💾 Enregistrer » en haut.</p>
  </section>:null}
 </main>;
}
