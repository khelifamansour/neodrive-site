"use client";
import {useEffect,useState} from "react";
import s from "./planif.module.css";
import TourMap from "./TourMap";
import {departmentFromPostalCode,deliveryPriceForDepartment} from "../../lib/neodrive-pricing";
import {TRAILERS,DEFAULT_PARAMS,FUELS,splitTrips,type Stop,planRoute,estimateKm,computeCosts,mapsUrl,type Hub,type PlanClient,type PlanTour,type CostParams} from "../../lib/planif";
import {waNumber} from "../../lib/sav";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const STATUS:Record<PlanClient["status"],string>={a_planifier:"À planifier",planifie:"Planifié",livre:"Livré"};
const SITE="https://www.easydrive-auto.fr";const PREP=SITE+"/preparer-ma-livraison";
const recLink=(c:PlanClient)=>`${SITE}/reception?id=${encodeURIComponent(c.id)}&t=${c.token||""}`;
const nav=(p:Stop)=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
const waze=(p:Stop)=>`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;
const billed=(c:PlanClient)=>{const d=departmentFromPostalCode(c.code_postal);return d?deliveryPriceForDepartment(d)||0:0;};
const hm=(h:number)=>`${Math.floor(h)} h ${String(Math.round((h%1)*60)).padStart(2,"0")}`;

export default function Planificateur(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [clients,setClients]=useState<PlanClient[]>([]);const [tours,setTours]=useState<PlanTour[]>([]);const [hubs,setHubs]=useState<Hub[]>([]);
 const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");
 const [showAdd,setShowAdd]=useState(false);const [newHub,setNewHub]=useState({name:"",stock:0});
 const [form,setForm]=useState({prenom:"",nom:"",telephone:"",adresse:"",code_postal:"",ville:"",modele:"NeoDrive Confort",note:""});
 const [filter,setFilter]=useState<"a_planifier"|"tous">("a_planifier");
 const [sel,setSel]=useState<string[]>([]);const [target,setTarget]=useState("");
 const [params,setParams]=useState<CostParams>(DEFAULT_PARAMS);
 const [open,setOpen]=useState<string|null>(null);
 const [live,setLive]=useState<Record<string,number>|null>(null);

 const api=async(body:object,pc=code)=>{const r=await fetch("/api/planificateur",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const loadFuel=async(pc=code)=>{try{const j=await api({action:"fuel"},pc);if(j.prices){setLive(j.prices);setParams(p=>({...p,fuelPrice:Math.round((j.prices[p.fuel]||p.fuelPrice)*1000)/1000}));}}catch{/* prix par défaut */}};
 const load=async(pc=code)=>{setBusy("load");try{const j=await api({action:"list"},pc);setClients(j.clients);setTours(j.tours.sort((a:PlanTour,b:PlanTour)=>a.created_at.localeCompare(b.created_at)));setHubs(j.hubs);setAuthed(true);if(!live)loadFuel(pc);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const run=async(label:string,fn:()=>Promise<void>)=>{setBusy(label);setMsg("");try{await fn();}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};

 // HUBS
 const saveHubs=(next:Hub[])=>run("hubs",async()=>{const j=await api({action:"save_hubs",hubs:next});setHubs(j.hubs);setMsg("✅ Stocks enregistrés.");});
 const addHub=(e:React.FormEvent)=>{e.preventDefault();run("hub",async()=>{const j=await api({action:"add_hub",...newHub});setHubs(j.hubs);setNewHub({name:"",stock:0});});};

 // CLIENTS
 const addClient=(e:React.FormEvent)=>{e.preventDefault();run("add",async()=>{await api({action:"add",...form});setForm({prenom:"",nom:"",telephone:"",adresse:"",code_postal:"",ville:"",modele:"NeoDrive Confort",note:""});setShowAdd(false);await load();});};
 const setStatus=(id:string,status:PlanClient["status"])=>run("st",async()=>{await api({action:"client_status",id,status});await load();});
 const removeClient=(id:string)=>{if(confirm("Supprimer ce client du planificateur ?"))run("rm",async()=>{await api({action:"client_status",id,delete:true});await load();});};

 // TOURS
 const saveTour=(t:PlanTour,ok="")=>run("tour",async()=>{const j=await api({action:"save_tour",tour:t});if(j.hubs)setHubs(j.hubs);await load();if(ok)setMsg(ok);});
 const newTour=()=>{const n=tours.length+1;const t:PlanTour={id:`T-${Date.now()}`,name:`Tournée ${n}`,created_at:new Date().toISOString(),date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),driver:"",hubId:hubs[0]?.id||"",trailer:2,clientIds:[],status:"brouillon"};saveTour(t);setTarget(t.id);setOpen(t.id);};
 const assign=()=>{const t=tours.find(x=>x.id===target);if(!t||!sel.length)return;saveTour({...t,clientIds:[...new Set([...t.clientIds,...sel])],stops:undefined,costs:undefined},`✅ ${sel.length} client${sel.length>1?"s":""} ajouté${sel.length>1?"s":""} à ${t.name}.`);setSel([]);setOpen(t.id);};
 const patch=(t:PlanTour,p:Partial<PlanTour>)=>setTours(v=>v.map(x=>x.id===t.id?{...x,...p}:x));
 const unassign=(t:PlanTour,cid:string)=>saveTour({...t,clientIds:t.clientIds.filter(x=>x!==cid),stops:undefined,costs:undefined});
 const compute=async(t:PlanTour):Promise<Partial<PlanTour>>=>{
  const chosen=clients.filter(c=>t.clientIds.includes(c.id)&&c.status!=="livre");if(!chosen.length)throw new Error("Ajoutez des clients à la tournée.");
  // stock disponible = stock actuel (les tournées déjà validées l'ont déjà déduit)
  const {stops,unserved}=planRoute(hubs,t.hubId,t.trailer,chosen);
  let km=estimateKm(stops),hours=km/72,precise=false;let path:[number,number][]|undefined;
  try{const coords=stops.map(p=>`${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson`).then(x=>x.json());const rt=r?.routes?.[0];if(rt){km=rt.distance/1000;hours=(rt.duration/3600)*1.2;precise=true;
   rt.legs?.forEach((l:{distance:number;duration:number},i:number)=>{stops[i+1].legKm=Math.round(l.distance/1000);stops[i+1].legH=Math.round(l.duration/360*1.2)/10;});
   const g:[number,number][]=(rt.geometry?.coordinates||[]).map((c:number[])=>[+c[1].toFixed(4),+c[0].toFixed(4)]);const step=Math.max(1,Math.ceil(g.length/400));path=g.filter((_,k)=>k%step===0||k===g.length-1);}}catch{/* estimation */}
  hours+=(stops.length-1)*0.5;
  const costs=computeCosts(km,hours,params);
  const warning=unserved.length?`Stock insuffisant : ${unserved.length} client${unserved.length>1?"s":""} non livrable${unserved.length>1?"s":""} (${unserved.map(c=>c.nom).join(", ")}). Ajoutez du stock dans un hub.`:"";
  return {stops,path,km:Math.round(km),hours:Math.round(hours*10)/10,precise,costs,params,warning};
 };
 const calculate=(t:PlanTour)=>run("calc-"+t.id,async()=>{patch(t,await compute(t));});
 /** Proposition automatique : tous les clients à planifier, une remorque de 2, départ Lamasquère, recharges au hub le plus avantageux. */
 const propose=()=>run("auto",async()=>{
  const ids=clients.filter(c=>c.status==="a_planifier").map(c=>c.id);if(!ids.length)throw new Error("Aucun client à planifier.");
  const start=hubs.find(h=>h.id==="lamasquere")||hubs[0];
  const base:PlanTour={id:`T-${Date.now()}`,name:`Proposition auto ${new Date().toLocaleDateString("fr-FR")}`,created_at:new Date().toISOString(),date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),driver:"",hubId:start.id,trailer:2,clientIds:ids,status:"brouillon"};
  const t={...base,...await compute(base)};
  const j=await api({action:"save_tour",tour:t});if(j.hubs)setHubs(j.hubs);await load();setOpen(t.id);
  setMsg(`✅ Tournée proposée : ${ids.length} clients, ${t.km} km, ${eur(t.costs?.total||0)}. Vérifiez puis validez.`);
 });
 const validate=(t:PlanTour)=>{if(!t.stops)return;saveTour({...t,status:"valide"},`✅ ${t.name} validée : le stock des hubs est mis à jour.`);};
 const removeTour=(t:PlanTour)=>{if(confirm(`Supprimer ${t.name} ? Ses clients repassent « à planifier »${t.status==="valide"?" et le stock est restitué":""}.`))run("del",async()=>{await api({action:"delete_tour",id:t.id});await load();});};
 const roadmap=(t:PlanTour)=>`${t.name} — ${new Date(t.date).toLocaleDateString("fr-FR")}${t.driver?` · ${t.driver}`:""}\n\n`+splitTrips(t.stops||[]).map(v=>`━━ VOYAGE ${v.n} ━━\n📦 ${v.hub.name} : ${v.hub.action}\n   ${nav(v.hub)}\n`+v.clients.map(p=>`🚗 ${p.name}\n   📞 ${p.phone||"—"}\n   📍 ${p.label}\n   ${nav(p)}`).join("\n")+(v.next?`\n➡️ Ensuite : ${v.next.name}${v.next.legKm?` (${v.next.legKm} km)`:""}`:"")).join("\n\n")+`\n\nItinéraire : ${mapsUrl(t.stops||[])}`;
 const copy=(t:PlanTour)=>navigator.clipboard?.writeText(roadmap(t)).then(()=>setMsg("✅ Feuille de route copiée : collez-la dans WhatsApp pour le livreur."));
 const demo=()=>run("demo",async()=>{const j=await api({action:"demo"});await load();setMsg(`✅ Simulation chargée : ${j.created} client${j.created>1?"s":""} test ajouté${j.created>1?"s":""}, 20 voitures dans chaque hub. Cliquez sur « 🤖 Proposer automatiquement ».`);});
 const demoClear=()=>{if(confirm("Supprimer tous les clients TEST ?"))run("demo",async()=>{const j=await api({action:"demo_clear"});await load();setMsg(`✅ ${j.deleted} client${j.deleted>1?"s":""} test supprimé${j.deleted>1?"s":""}.`);});};
 const setFuel=(f:CostParams["fuel"])=>{const d=FUELS.find(x=>x.id===f)!;setParams(p=>({...p,fuel:f,consumption:d.conso,fuelPrice:Math.round((live?.[f]||d.price)*1000)/1000}));};
 const P=(k:keyof CostParams,label:string,step=0.01)=><label className={s.param}><span>{label}</span><input type="number" step={step} value={params[k] as number} onChange={e=>setParams(p=>({...p,[k]:Number(e.target.value)||0}))}/></label>;

 if(!authed)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Tournées</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const visible=clients.filter(c=>filter==="tous"||c.status==="a_planifier");
 const waiting=clients.filter(c=>c.status==="a_planifier").length;
 const drafts=tours.filter(t=>t.status==="brouillon");
 return <main className={s.page}>
  <header className={s.top}><div><h1>Planificateur de tournées <small className={s.ver}>v3 · carte</small></h1><p>{waiting} client{waiting>1?"s":""} à livrer · stock total {hubs.reduce((a,h)=>a+h.stock,0)} voitures</p></div><div className={s.topBtns}><button onClick={demo} disabled={!!busy}>{busy==="demo"?"…":"🧪 Simulation"}</button>{clients.some(c=>c.note?.startsWith("TEST")||c.prenom==="TEST")?<button onClick={demoClear} disabled={!!busy}>🧹 Test</button>:null}<button onClick={()=>setShowAdd(v=>!v)}>＋ Client</button><button onClick={()=>load()}>↻</button></div></header>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}

  {/* HUBS */}
  <section className={s.card}>
   <h2>📦 Hubs et stock</h2>
   <ul className={s.hubs}>{hubs.map(h=><li key={h.id}><b>{h.name}</b><div className={s.stock}><button onClick={()=>setHubs(v=>v.map(x=>x.id===h.id?{...x,stock:Math.max(0,x.stock-1)}:x))}>−</button><input type="number" min={0} value={h.stock} onChange={e=>setHubs(v=>v.map(x=>x.id===h.id?{...x,stock:Math.max(0,Number(e.target.value)||0)}:x))}/><button onClick={()=>setHubs(v=>v.map(x=>x.id===h.id?{...x,stock:x.stock+1}:x))}>＋</button></div><button className={s.x} onClick={()=>{if(hubs.length>1&&confirm(`Retirer le hub ${h.name} ?`))setHubs(v=>v.filter(x=>x.id!==h.id));}}>🗑</button></li>)}</ul>
   <form className={s.inline} onSubmit={addHub}><input placeholder="Nouveau hub (ville)" value={newHub.name} onChange={e=>setNewHub(v=>({...v,name:e.target.value}))}/><input type="number" min={0} placeholder="Stock" value={newHub.stock||""} onChange={e=>setNewHub(v=>({...v,stock:Number(e.target.value)||0}))}/><button disabled={busy==="hub"||newHub.name.length<2}>Ajouter</button></form>
   <button className={s.ghost} disabled={busy==="hubs"} onClick={()=>saveHubs(hubs)}>Enregistrer les stocks</button>
  </section>

  {showAdd?<form className={s.card} onSubmit={addClient}><h2>Ajouter un client</h2><div className={s.grid2}>
   {(["prenom","nom","telephone","adresse","code_postal","ville"] as const).map(k=><input key={k} required={["nom","code_postal","ville"].includes(k)} placeholder={{prenom:"Prénom",nom:"Nom",telephone:"Téléphone",adresse:"Adresse",code_postal:"Code postal",ville:"Ville"}[k]} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>)}
   <select value={form.modele} onChange={e=>setForm(f=>({...f,modele:e.target.value}))}><option>NeoDrive Essentielle</option><option>NeoDrive Confort</option><option>NeoDrive Confort Plus</option></select>
   <input placeholder="Note (facultatif)" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
  </div><button className={s.primary} disabled={busy==="add"}>{busy==="add"?"Ajout…":"Ajouter"}</button></form>:null}

  {/* CLIENTS */}
  <section className={s.card}>
   <div className={s.rowHead}><h2>👥 Clients</h2><div className={s.seg}><button className={filter==="a_planifier"?s.on:""} onClick={()=>setFilter("a_planifier")}>À planifier</button><button className={filter==="tous"?s.on:""} onClick={()=>setFilter("tous")}>Tous</button></div></div>
   {!visible.length?<p className={s.muted}>Aucun client {filter==="a_planifier"?"à planifier":""}. Les réservations du site arrivent ici automatiquement.</p>:null}
   <ul className={s.clients}>{visible.map(c=>{const t=tours.find(x=>x.id===c.tour_id);return <li key={c.id} className={sel.includes(c.id)?s.selected:""}>
    {c.status==="a_planifier"?<input type="checkbox" checked={sel.includes(c.id)} onChange={()=>setSel(v=>v.includes(c.id)?v.filter(x=>x!==c.id):[...v,c.id])}/>:<span className={s.badge}>{t?t.name:STATUS[c.status]}</span>}
    <div className={s.cinfo}><b>{c.prenom} {c.nom}</b><small>{c.code_postal} {c.ville} · {c.modele||"NeoDrive"}{c.total?` · ${eur(c.total)}`:""}{c.telephone?` · ${c.telephone}`:""}</small>{c.note?<small>📝 {c.note}</small>:null}{c.received_at?<small className={s.okTxt}>✅ Réception signée par {c.received_by} le {new Date(c.received_at).toLocaleDateString("fr-FR")}{c.reception_note?` · « ${c.reception_note} »`:""}</small>:null}</div>
    <div className={s.cact}>{c.telephone?<a href={`https://wa.me/${waNumber(c.telephone)}?text=${encodeURIComponent(`Bonjour ${c.prenom}, votre NeoDrive arrive bientôt 🚗 Voici comment préparer la livraison (paiement, prise en main, carte grise) : ${PREP}`)}`} target="_blank" rel="noreferrer" title="Envoyer le lien de préparation">📲</a>:null}{c.telephone&&c.status!=="a_planifier"&&!c.received_at?<a href={`https://wa.me/${waNumber(c.telephone)}?text=${encodeURIComponent(`Bonjour ${c.prenom}, merci d’avoir reçu votre NeoDrive ! Pouvez-vous confirmer la réception ici (1 minute) : ${recLink(c)}`)}`} target="_blank" rel="noreferrer" title="Envoyer l’accusé de réception">🧾</a>:null}<button onClick={()=>navigator.clipboard?.writeText(recLink(c)).then(()=>setMsg("✅ Lien d’accusé de réception copié."))} title="Copier le lien d’accusé de réception">🔗</button>{c.status==="planifie"?<button onClick={()=>setStatus(c.id,"livre")} title="Marquer livré">✓</button>:null}<button onClick={()=>removeClient(c.id)} title="Supprimer">🗑</button></div>
   </li>})}</ul>
   {sel.length?<div className={s.assign}><span>{sel.length} sélectionné{sel.length>1?"s":""} →</span><select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choisir une tournée…</option>{drafts.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button disabled={!target||!!busy} onClick={assign}>Ajouter</button><button onClick={newTour} disabled={!!busy}>＋ Nouvelle tournée</button></div>:null}
  </section>

  {/* TOURNÉES */}
  <section className={s.card}>
   <div className={s.rowHead}><h2>🚚 Tournées</h2><div className={s.topBtns}><button className={s.small} onClick={propose} disabled={!!busy||!waiting}>{busy==="auto"?"Calcul…":"🤖 Proposer automatiquement"}</button><button className={s.small} onClick={newTour} disabled={!!busy}>＋ Manuelle</button></div></div>
   <p className={s.muted}>Automatique : le logiciel prend tous les clients à planifier, part de Lamasquère avec la remorque 2 voitures et choisit à chaque fois le hub de recharge le plus avantageux (retour Lamasquère ou montée vers Boran-sur-Oise). Vous vérifiez, modifiez si besoin, puis validez.</p>
   {!tours.length?<p className={s.muted}>Créez une tournée, puis cochez des clients et ajoutez-les.</p>:null}
   {tours.map(t=>{const tc=clients.filter(c=>t.clientIds.includes(c.id));const isOpen=open===t.id;const locked=t.status!=="brouillon";return <article key={t.id} className={`${s.tour} ${locked?s.locked:""}`}>
    <button className={s.tourHead} onClick={()=>setOpen(isOpen?null:t.id)}><b>{t.name}</b><span className={s.badge}>{t.status==="brouillon"?"Brouillon":"Validée"}</span><small>{new Date(t.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})} · {tc.length} client{tc.length>1?"s":""}{t.km?` · ${t.km} km · ${eur(t.costs?.total||0)}`:""}</small></button>
    {isOpen?<div className={s.tourBody}>
     <div className={s.grid2}>
      <label className={s.field}><span>Nom</span><input disabled={locked} value={t.name} onChange={e=>patch(t,{name:e.target.value})}/></label>
      <label className={s.field}><span>Date</span><input disabled={locked} type="date" value={t.date} onChange={e=>patch(t,{date:e.target.value})}/></label>
      <label className={s.field}><span>Départ (hub)</span><select disabled={locked} value={t.hubId} onChange={e=>patch(t,{hubId:e.target.value,stops:undefined,costs:undefined})}>{hubs.map(h=><option key={h.id} value={h.id}>{h.name} · {h.stock} en stock</option>)}</select></label>
      <label className={s.field}><span>Remorque</span><select disabled={locked} value={t.trailer} onChange={e=>patch(t,{trailer:Number(e.target.value),stops:undefined,costs:undefined})}>{TRAILERS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className={s.field}><span>Livreur</span><input disabled={locked} value={t.driver} onChange={e=>patch(t,{driver:e.target.value})} placeholder="Nom du livreur"/></label>
     </div>
     <ul className={s.mini}>{tc.map(c=><li key={c.id}><span>{c.prenom} {c.nom} · {c.code_postal} {c.ville}</span>{!locked?<button onClick={()=>unassign(t,c.id)}>✕</button>:null}</li>)}</ul>
     {!locked?<div className={s.btns}><button className={s.ghost} disabled={!!busy} onClick={()=>saveTour(t,"✅ Tournée enregistrée.")}>Enregistrer</button><button className={s.primary} disabled={!tc.length||busy===("calc-"+t.id)} onClick={()=>calculate(t)}>{busy===("calc-"+t.id)?"Calcul…":"Calculer l’itinéraire"}</button></div>:null}
     {t.warning?<p className={s.err}>{t.warning}</p>:null}
     {t.stops&&t.costs?<>
      <div className={s.kpis}><div><small>Distance</small><b>{t.km} km</b></div><div><small>Durée</small><b>{hm(t.hours||0)}</b></div><div><small>Jours</small><b>{t.costs.days}</b></div><div><small>Coût total</small><b>{eur(t.costs.total)}</b></div></div>
      <p className={s.muted}>{t.precise?"Distances routières réelles, durée majorée de 20 % (remorque, pauses) + 30 min par arrêt.":"Distances estimées : le calcul routier n’a pas répondu."}</p>
      <TourMap stops={t.stops} path={t.path}/>
      <p className={s.muted}>Trait plein : livraisons avec voitures à bord · pointillés : trajet remorque vide vers le hub suivant · chiffres : ordre des clients.</p>
      {(()=>{let n=0;const trips=splitTrips(t.stops);return <div className={s.trips}>{trips.map(v=><section key={v.n} className={s.trip} style={{borderColor:v.color}}>
       <header style={{background:v.color}}><b>Voyage {v.n}</b><span>{Math.round(v.km)} km</span></header>
       <div className={s.hubStop}><span>📦</span><div><strong>{v.hub.name}</strong><small>{v.hub.action}</small></div><a href={nav(v.hub)} target="_blank" rel="noreferrer">🧭 Y aller</a></div>
       {v.clients.map(p=>{n++;const c=clients.find(x=>x.id===p.id);return <div key={p.id} className={s.stopCard}>
        <div className={s.stopTop}><b className={s.num} style={{background:v.color}}>{n}</b><div><h3>{p.name}</h3>{p.legKm?<small>{p.legKm} km depuis l’arrêt précédent{p.legH?` · ${hm(p.legH)}`:""}</small>:null}</div></div>
        {p.phone?<a className={s.phone} href={`tel:${p.phone.replace(/\s/g,"")}`}>📞 {p.phone}</a>:<p className={s.muted}>Pas de téléphone</p>}
        <p className={s.addr}>📍 {p.label}</p>
        <p className={s.muted}>{p.action}{c?.note?` · 📝 ${c.note}`:""}</p>
        <div className={s.navBtns}><a href={nav(p)} target="_blank" rel="noreferrer">🧭 Google Maps</a><a href={waze(p)} target="_blank" rel="noreferrer">🚙 Waze</a>{c?.telephone&&!c.received_at?<a href={`https://wa.me/${waNumber(c.telephone)}?text=${encodeURIComponent(`Bonjour ${c.prenom}, merci d’avoir reçu votre NeoDrive ! Pouvez-vous confirmer la réception ici (1 minute) : ${recLink(c)}`)}`} target="_blank" rel="noreferrer">🧾 Accusé</a>:null}</div>
        {c?.received_at?<p className={s.okTxt}>✅ Réception signée</p>:null}
       </div>})}
       {v.next?<p className={s.after}>➡️ Ensuite : <b>{v.next.id===v.hub.id?"retour à ":""}{v.next.name}</b>{v.next.legKm?` · ${v.next.legKm} km remorque vide`:""}{v.next.action==="Retour au hub"?" (fin de tournée)":` pour ${v.next.action.toLowerCase()}`}</p>:null}
      </section>)}</div>;})()}
      {!locked?<><div className={s.seg}><button className={params.mode==="carte"?s.on:""} onClick={()=>setParams(p=>({...p,mode:"carte"}))}>Carte NeoDrive</button><button className={params.mode==="remboursement"?s.on:""} onClick={()=>setParams(p=>({...p,mode:"remboursement"}))}>Remboursement sur tickets</button></div>
      <label className={s.field}><span>Véhicule tracteur : Dacia Duster — carburant</span><select value={params.fuel} onChange={e=>setFuel(e.target.value as CostParams["fuel"])}>{FUELS.map(f=><option key={f.id} value={f.id}>{f.label}{live?.[f.id]?` · ${live[f.id].toFixed(3)} €/L aujourd’hui`:""}</option>)}</select></label>
      <p className={s.muted}>{live?"Prix moyen national du jour (données officielles prix-carburants.gouv.fr). ":"Prix du jour indisponible : prix par défaut. "}Consommation majorée pour la remorque chargée.</p>
      <div className={s.params}>{P("consumption","Conso (L/100 km)",0.5)}{P("fuelPrice","Prix du litre (€)")}{P("tollPerKm","Péage moyen (€/km)")}{P("hourlyRate","Livreur (€/heure)",0.5)}{P("mealPerDay","Repas (€/jour)",1)}{P("hotelPerNight","Hôtel (€/nuit)",1)}</div>
      <p className={s.muted}>Après avoir changé un tarif, recliquez sur « Calculer ».</p></>:null}
      <table className={s.costs}><tbody>
       <tr><td>Carburant · {Math.round(t.costs.liters)} L</td><td>{eur(t.costs.fuel)}</td></tr>
       <tr><td>Péages (estimation)</td><td>{eur(t.costs.tolls)}</td></tr>
       <tr><td>Temps livreur · {(t.hours||0).toFixed(1)} h</td><td>{eur(t.costs.driver)}</td></tr>
       <tr><td>Repas · {t.costs.days} j</td><td>{eur(t.costs.meals)}</td></tr>
       <tr><td>Hôtel · {t.costs.nights} nuit{t.costs.nights>1?"s":""}</td><td>{eur(t.costs.hotel)}</td></tr>
       <tr className={s.tot}><td>Coût total</td><td>{eur(t.costs.total)}</td></tr>
       <tr className={s.pay}><td>À verser au livreur {t.params?.mode==="remboursement"?"(tout, sur justificatifs)":"(carburant et péages payés par la carte)"}</td><td>{eur(t.costs.payDriver)}</td></tr>
      </tbody></table>
      {(()=>{const tc2=clients.filter(c=>t.clientIds.includes(c.id));const fac=tc2.reduce((a,c)=>a+billed(c),0);const trips=splitTrips(t.stops);const empty=trips.reduce((a,v)=>a+v.emptyKm,0);const cars=t.stops.filter(x=>x.kind==="client").length;const res=fac-(t.costs?.total||0);return <div className={s.biz}>
       <div><small>Livraison facturée aux clients</small><b>{eur(fac)}</b></div>
       <div><small>Coût de la tournée</small><b>{eur(t.costs?.total||0)}</b></div>
       <div className={res>=0?s.pos:s.neg}><small>Résultat transport</small><b>{res>=0?"+":""}{eur(res)}</b></div>
       <div><small>Coût par voiture livrée</small><b>{eur((t.costs?.total||0)/Math.max(1,cars))}</b></div>
       <div><small>Km remorque vide</small><b>{Math.round(empty)} km · {Math.round(100*empty/Math.max(1,t.km||1))} %</b></div>
       <div><small>Voyages (chargements)</small><b>{trips.length}</b></div>
      </div>;})()}
      <p className={s.tip}>🛡️ Carburant attendu : environ <b>{Math.round(t.costs.liters)} L</b>. Un écart de plus de 15 % avec les tickets ou la carte mérite une explication.</p>
      <div className={s.btns}><a className={s.ghost} href={mapsUrl(t.stops)} target="_blank" rel="noreferrer">🗺️ Google Maps</a><button className={s.ghost} onClick={()=>copy(t)}>📋 Feuille de route</button></div>
      {!locked?<button className={s.primary} disabled={!!busy||!!t.warning} onClick={()=>validate(t)}>Valider la tournée (déduit le stock)</button>:null}
     </>:null}
     <button className={s.danger} onClick={()=>removeTour(t)}>Supprimer la tournée</button>
    </div>:null}
   </article>})}
  </section>
 </main>;
}
