"use client";
import {useEffect,useMemo,useState} from "react";
import s from "./planif.module.css";
import {DEPOTS,TRAILERS,DEFAULT_PARAMS,planRoute,estimateKm,computeCosts,mapsUrl,type PlanClient,type PlanTour,type Stop,type CostParams} from "../../lib/planif";
import {waNumber} from "../../lib/sav";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const STATUS:Record<PlanClient["status"],string>={a_planifier:"À planifier",planifie:"Planifié",livre:"Livré"};
const PREP="https://www.easydrive-auto.fr/preparer-ma-livraison";

export default function Planificateur(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [clients,setClients]=useState<PlanClient[]>([]);const [tours,setTours]=useState<PlanTour[]>([]);
 const [sel,setSel]=useState<string[]>([]);
 const [depotId,setDepotId]=useState(DEPOTS[0].id);const [trailer,setTrailer]=useState(2);
 const [date,setDate]=useState(new Date(Date.now()+3*86400000).toISOString().slice(0,10));const [driver,setDriver]=useState("");
 const [params,setParams]=useState<CostParams>(DEFAULT_PARAMS);
 const [route,setRoute]=useState<{stops:Stop[];km:number;hours:number;precise:boolean}|null>(null);
 const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");
 const [showAdd,setShowAdd]=useState(false);
 const [form,setForm]=useState({prenom:"",nom:"",telephone:"",adresse:"",code_postal:"",ville:"",modele:"NeoDrive Confort",note:""});
 const [filter,setFilter]=useState<"a_planifier"|"tous">("a_planifier");

 const api=async(body:object,pc=code)=>{const r=await fetch("/api/planificateur",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setBusy("load");setMsg("");try{const j=await api({action:"list"},pc);setClients(j.clients);setTours(j.tours);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const visible=clients.filter(c=>filter==="tous"||c.status==="a_planifier");
 const toggle=(id:string)=>{setSel(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);setRoute(null);};
 const costs=useMemo(()=>route?computeCosts(route.km,route.hours,params):null,[route,params]);

 const calculate=async()=>{
  const chosen=clients.filter(c=>sel.includes(c.id));if(!chosen.length)return;
  setBusy("route");setMsg("");
  const depot=DEPOTS.find(d=>d.id===depotId)!;
  const stops=planRoute(depot,trailer,chosen);
  let km=estimateKm(stops),hours=km/72,precise=false;
  try{
   const coords=stops.map(p=>`${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
   const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`).then(x=>x.json());
   if(r?.routes?.[0]){km=r.routes[0].distance/1000;hours=(r.routes[0].duration/3600)*1.2;precise=true;} // +20 % : remorque, pauses
  }catch{/* estimation */}
  // temps de chargement/déchargement : 30 min par arrêt
  hours+=(stops.length-1)*0.5;
  setRoute({stops,km,hours,precise});setBusy("");
 };
 const saveTour=async()=>{if(!route||!costs)return;setBusy("save");
  const t:PlanTour={id:`T-${Date.now()}`,created_at:new Date().toISOString(),date,driver,depotId,trailer,stops:route.stops,km:Math.round(route.km),hours:Math.round(route.hours*10)/10,costs,params,status:"valide"};
  try{await api({action:"save_tour",tour:t});setMsg("✅ Tournée enregistrée.");setSel([]);setRoute(null);await load();}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const addClient=async(e:React.FormEvent)=>{e.preventDefault();setBusy("add");setMsg("");try{await api({action:"add",...form});setForm({prenom:"",nom:"",telephone:"",adresse:"",code_postal:"",ville:"",modele:"NeoDrive Confort",note:""});setShowAdd(false);await load();}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const setStatus=async(id:string,status:PlanClient["status"])=>{try{await api({action:"client_status",id,status});await load();}catch(e){setMsg((e as Error).message)}};
 const removeClient=async(id:string)=>{if(!confirm("Supprimer ce client du planificateur ?"))return;try{await api({action:"client_status",id,delete:true});setSel(v=>v.filter(x=>x!==id));await load();}catch(e){setMsg((e as Error).message)}};
 const removeTour=async(id:string)=>{if(!confirm("Supprimer cette tournée ? Ses clients repassent « à planifier ».")) return;try{await api({action:"delete_tour",id});await load();}catch(e){setMsg((e as Error).message)}};
 const roadmap=(t:{stops:Stop[];date:string})=>t.stops.map((p,i)=>`${i+1}. ${p.kind==="depot"?"📦":"🚗"} ${p.name} — ${p.action}${p.kind==="client"?`\n   ${p.label}${p.phone?` · ${p.phone}`:""}`:""}`).join("\n")+`\n\nItinéraire : ${mapsUrl(t.stops)}`;
 const P=(k:keyof CostParams,label:string,step=0.01)=><label className={s.param}><span>{label}</span><input type="number" step={step} value={params[k] as number} onChange={e=>setParams(p=>({...p,[k]:Number(e.target.value)||0}))}/></label>;

 if(!authed)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Tournées</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const waiting=clients.filter(c=>c.status==="a_planifier").length;
 return <main className={s.page}>
  <header className={s.top}><div><h1>Planificateur de tournées</h1><p>{waiting} client{waiting>1?"s":""} à livrer · {tours.length} tournée{tours.length>1?"s":""}</p></div><div className={s.topBtns}><button onClick={()=>setShowAdd(v=>!v)}>＋ Client</button><button onClick={()=>load()}>↻</button></div></header>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}

  {showAdd?<form className={s.card} onSubmit={addClient}><h2>Ajouter un client</h2><div className={s.grid2}>
   {(["prenom","nom","telephone","adresse","code_postal","ville"] as const).map(k=><input key={k} required={["nom","code_postal","ville"].includes(k)} placeholder={{prenom:"Prénom",nom:"Nom",telephone:"Téléphone",adresse:"Adresse",code_postal:"Code postal",ville:"Ville"}[k]} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>)}
   <select value={form.modele} onChange={e=>setForm(f=>({...f,modele:e.target.value}))}><option>NeoDrive Essentielle</option><option>NeoDrive Confort</option><option>NeoDrive Confort Plus</option></select>
   <input placeholder="Note (facultatif)" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
  </div><button className={s.primary} disabled={busy==="add"}>{busy==="add"?"Ajout…":"Ajouter"}</button></form>:null}

  <section className={s.card}>
   <div className={s.rowHead}><h2>1 · Clients</h2><div className={s.seg}><button className={filter==="a_planifier"?s.on:""} onClick={()=>setFilter("a_planifier")}>À planifier</button><button className={filter==="tous"?s.on:""} onClick={()=>setFilter("tous")}>Tous</button></div></div>
   {!visible.length?<p className={s.muted}>Aucun client {filter==="a_planifier"?"à planifier":""}. Les réservations du site arrivent ici automatiquement.</p>:null}
   <ul className={s.clients}>{visible.map(c=><li key={c.id} className={sel.includes(c.id)?s.selected:""}>
    {c.status==="a_planifier"?<input type="checkbox" checked={sel.includes(c.id)} onChange={()=>toggle(c.id)}/>:<span className={s.badge}>{STATUS[c.status]}</span>}
    <div className={s.cinfo} onClick={()=>c.status==="a_planifier"&&toggle(c.id)}><b>{c.prenom} {c.nom}</b><small>{c.code_postal} {c.ville} · {c.modele||"NeoDrive"}{c.total?` · ${eur(c.total)}`:""}</small>{c.note?<small>📝 {c.note}</small>:null}</div>
    <div className={s.cact}>{c.telephone?<a href={`https://wa.me/${waNumber(c.telephone)}?text=${encodeURIComponent(`Bonjour ${c.prenom}, votre NeoDrive arrive bientôt 🚗 Voici comment préparer la livraison (paiement, prise en main, carte grise) : ${PREP}`)}`} target="_blank" rel="noreferrer" title="Envoyer le lien de préparation">📲</a>:null}{c.status==="planifie"?<button onClick={()=>setStatus(c.id,"livre")} title="Marquer livré">✓</button>:null}<button onClick={()=>removeClient(c.id)} title="Supprimer">🗑</button></div>
   </li>)}</ul>
  </section>

  <section className={s.card}>
   <h2>2 · Tournée</h2>
   <div className={s.grid2}>
    <label className={s.field}><span>Départ</span><select value={depotId} onChange={e=>{setDepotId(e.target.value);setRoute(null);}}>{DEPOTS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
    <label className={s.field}><span>Remorque</span><select value={trailer} onChange={e=>{setTrailer(Number(e.target.value));setRoute(null);}}>{TRAILERS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <label className={s.field}><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className={s.field}><span>Livreur</span><input value={driver} onChange={e=>setDriver(e.target.value)} placeholder="Nom du livreur"/></label>
   </div>
   <button className={s.primary} disabled={!sel.length||busy==="route"} onClick={calculate}>{busy==="route"?"Calcul de l’itinéraire…":`Calculer la tournée (${sel.length} client${sel.length>1?"s":""})`}</button>
  </section>

  {route&&costs?<section className={s.card}>
   <h2>3 · Itinéraire proposé</h2>
   <div className={s.kpis}><div><small>Distance</small><b>{Math.round(route.km)} km</b></div><div><small>Durée estimée</small><b>{Math.floor(route.hours)} h {String(Math.round((route.hours%1)*60)).padStart(2,"0")}</b></div><div><small>Jours</small><b>{costs.days}</b></div><div><small>Coût total</small><b>{eur(costs.total)}</b></div></div>
   {!route.precise?<p className={s.muted}>Distances estimées (vol d’oiseau × 1,3) : le calcul routier précis n’a pas répondu.</p>:<p className={s.muted}>Distances routières réelles. Durée majorée de 20 % (remorque, pauses) + 30 min par arrêt.</p>}
   <ol className={s.stops}>{route.stops.map((p,i)=><li key={i} className={p.kind==="depot"?s.depot:""}><b>{i+1}</b><div><strong>{p.kind==="depot"?"📦 ":"🚗 "}{p.name}</strong><small>{p.action}{p.kind==="client"?` · ${p.label}`:""}</small><small>Voitures à bord après l’arrêt : {p.load}</small></div></li>)}</ol>
   <a className={s.ghost} href={mapsUrl(route.stops)} target="_blank" rel="noreferrer">🗺️ Ouvrir dans Google Maps</a>

   <h3>Coûts et paiement du livreur</h3>
   <div className={s.seg}><button className={params.mode==="carte"?s.on:""} onClick={()=>setParams(p=>({...p,mode:"carte"}))}>Carte NeoDrive (carburant + péages)</button><button className={params.mode==="remboursement"?s.on:""} onClick={()=>setParams(p=>({...p,mode:"remboursement"}))}>Remboursement sur tickets</button></div>
   <div className={s.params}>{P("consumption","Conso (L/100 km)",0.5)}{P("fuelPrice","Prix du litre (€)")}{P("tollPerKm","Péage moyen (€/km)")}{P("hourlyRate","Livreur (€/heure)",0.5)}{P("mealPerDay","Repas (€/jour)",1)}{P("hotelPerNight","Hôtel (€/nuit)",1)}</div>
   <table className={s.costs}><tbody>
    <tr><td>Carburant · {Math.round(costs.liters)} L</td><td>{eur(costs.fuel)}</td></tr>
    <tr><td>Péages (estimation)</td><td>{eur(costs.tolls)}</td></tr>
    <tr><td>Temps livreur · {route.hours.toFixed(1)} h</td><td>{eur(costs.driver)}</td></tr>
    <tr><td>Repas · {costs.days} jour{costs.days>1?"s":""}</td><td>{eur(costs.meals)}</td></tr>
    <tr><td>Hôtel · {costs.nights} nuit{costs.nights>1?"s":""}</td><td>{eur(costs.hotel)}</td></tr>
    <tr className={s.tot}><td>Coût total de la tournée</td><td>{eur(costs.total)}</td></tr>
    <tr className={s.pay}><td>À verser au livreur {params.mode==="carte"?"(hors carburant et péages payés par la carte)":"(tout, sur justificatifs)"}</td><td>{eur(costs.payDriver)}</td></tr>
   </tbody></table>
   <p className={s.tip}>🛡️ Contrôle anti-abus : le carburant attendu pour cette tournée est d’environ <b>{Math.round(costs.liters)} L</b>. Comparez avec les tickets ou le relevé de la carte : un écart de plus de 15 % mérite une explication.</p>
   <div className={s.btns}><button className={s.primary} disabled={busy==="save"} onClick={saveTour}>{busy==="save"?"Enregistrement…":"Valider et enregistrer la tournée"}</button><button className={s.ghost} onClick={()=>navigator.clipboard?.writeText(roadmap({stops:route.stops,date})).then(()=>setMsg("✅ Feuille de route copiée : collez-la dans WhatsApp pour le livreur."))}>📋 Copier la feuille de route</button></div>
  </section>:null}

  {tours.length?<section className={s.card}><h2>Tournées enregistrées</h2><ul className={s.tours}>{tours.map(t=><li key={t.id}><div><b>{new Date(t.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})} · {t.stops.filter(x=>x.kind==="client").length} livraison{t.stops.filter(x=>x.kind==="client").length>1?"s":""}</b><small>{t.driver||"Livreur à définir"} · {t.km} km · {eur(t.costs.total)} · livreur {eur(t.costs.payDriver)}</small><small>{t.stops.filter(x=>x.kind==="client").map(x=>x.name).join(", ")}</small></div><div className={s.cact}><a href={mapsUrl(t.stops)} target="_blank" rel="noreferrer">🗺️</a><button onClick={()=>navigator.clipboard?.writeText(roadmap(t)).then(()=>setMsg("✅ Feuille de route copiée."))}>📋</button><button onClick={()=>removeTour(t.id)}>🗑</button></div></li>)}</ul></section>:null}
 </main>;
}
