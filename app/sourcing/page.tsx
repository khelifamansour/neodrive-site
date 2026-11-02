"use client";
import {useEffect,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "./sourcing.module.css";
import type {Params} from "../../lib/gestion";
import Synthese from "./Synthese";
import {CATS,CRITS,HOMOLOG,STATUS,businessPlan,scoreOf,verdict,type Cat,type Hyp,type Product,type Sourcing,type Supplier,type Weights} from "../../lib/sourcing";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const uid=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
const catIcon=(k:Cat)=>(CATS.find(x=>x[0]===k)?.[1]||"📦").split(" ")[0];
const catName=(k:Cat)=>(CATS.find(x=>x[0]===k)?.[1]||"").replace(/^\S+\s/,"");
type Tab="synthese"|"classement"|"fournisseurs"|"criteres";
type BP=ReturnType<typeof businessPlan>;

function Num({label,v,on,step=1}:{label:string;v:number;on:(n:number)=>void;step?:number}){return <label><span>{label}</span><input type="number" step={step} value={v} onChange={e=>on(Number(e.target.value)||0)}/></label>;}
function Txt({label,v,on,wide}:{label:string;v:string;on:(t:string)=>void;wide?:boolean}){return <label className={wide?c.wide:""}><span>{label}</span><input value={v} onChange={e=>on(e.target.value)}/></label>;}

function ProductCard({x,sup,bp,score,open,toggle,patch,remove}:{x:Product;sup?:Supplier;bp:BP;score:number;open:boolean;toggle:()=>void;patch:(v:Partial<Product>)=>void;remove:()=>void}){
 const [label,color]=verdict(score,bp.known,bp.margin);
 return <div className={c.prod}>
  <button className={c.pHead} onClick={toggle}>
   <span className={c.photo}>{x.photo?<img src={x.photo} alt="" referrerPolicy="no-referrer" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>:catIcon(x.cat)}</span>
   <span><b>{x.name}</b><small>{sup?.name||"?"} · {catName(x.cat)}</small><span className={c.verdict} style={{color}}>{label}</span>{!x.verified?<> <span className={c.warn}>chiffres à vérifier</span></>:null}</span>
   <span className={c.score} style={{background:color}}>{bp.known?score:"?"}</span>
  </button>
  <div className={c.nums}>
   <div><small>Ton prix / neuf en France</small><b>{eur(x.priceTtc)}</b> <small>vs {eur(x.frPriceTtc)} (×{bp.arbitrage.toFixed(1)})</small></div>
   <div><small>Arrivé au hub</small><b>{bp.known?eur(bp.landed):"?"}</b><small>par unité</small></div>
   <div><small>Marge HT / unité</small><b style={{color:bp.margin>0?"#067647":"#b42318"}}>{bp.known?eur(bp.margin):"?"}</b><small>{bp.known?`${Math.round(bp.marginPct*100)} %`:""}</small></div>
   <div><small>Par conteneur ({bp.n})</small><b>{bp.known?eur(bp.containerMargin):"?"}</b><small>bloque {bp.known?eur(bp.cash):"?"}</small></div>
  </div>
  {open?<div className={c.body}>
   <h3>📊 Business plan</h3>
   <table className={s.costs}><tbody>
    <tr><td>Prix de vente HT ({eur(x.priceTtc)} TTC)</td><td>{eur(bp.ht)}</td></tr>
    {bp.lines.map(([k,v])=><tr key={k}><td>− {k}</td><td className={s.minus}>{eur(v)}</td></tr>)}
    <tr className={s.tot}><td>= Marge HT par unité</td><td>{eur(bp.margin)}</td></tr>
   </tbody></table>
   <div className={s.biz}>
    <div><small>Ventes / mois (estimation)</small><b>{x.salesMonth}</b></div>
    <div><small>Un conteneur se vend en</small><b>{bp.months.toFixed(1)} mois</b></div>
    <div className={bp.yearMargin>0?s.pos:s.neg}><small>Marge sur 1 an</small><b>{eur(bp.yearMargin)}</b></div>
    <div><small>Argent bloqué / conteneur</small><b>{eur(bp.cash)}</b></div>
    <div><small>Rendement de l’argent / an</small><b>{Math.round(bp.roi*100)} %</b></div>
    <div><small>Unités vendues / an</small><b>{Math.round(bp.yearUnits)}</b></div>
   </div>
   {bp.service?<p className={s.tip}>🔄 <b>Contrat de service</b> : {eur(bp.service)} / mois par machine → ≈ {eur(bp.serviceYear1)} la 1re année, puis ≈ {eur(bp.serviceYear2)} / an (si tu gardes {Math.round(bp.yearUnits)} clients par an).</p>:null}
   <h3>🎯 Score par critère</h3>
   <div className={c.bars}>{CRITS.map(([k,l])=><div key={k} className={c.bar}><span>{l}</span><i><span style={{width:`${bp.crit[k]*100}%`}}/></i><b>{Math.round(bp.crit[k]*10)}</b></div>)}</div>
   <h3>✏️ Modifier</h3>
   <div className={c.edit}>
    <Txt label="Nom du produit" v={x.name} on={t=>patch({name:t})}/>
    <label><span>Catégorie</span><select value={x.cat} onChange={e=>patch({cat:e.target.value as Cat})}>{CATS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
    <Num label="Prix usine ($ FOB)" v={x.fobUsd} on={n=>patch({fobUsd:n})}/>
    <Num label="Unités par conteneur" v={x.perContainer} on={n=>patch({perContainer:n})}/>
    <Num label="Douane (%)" v={x.dutyPct} on={n=>patch({dutyPct:n})}/>
    <Num label="Transfert vers hub / unité (€)" v={x.transferUnit} on={n=>patch({transferUnit:n})}/>
    <Num label="Ton prix de vente TTC" v={x.priceTtc} on={n=>patch({priceTtc:n})}/>
    <Num label="Prix du neuf en France TTC" v={x.frPriceTtc} on={n=>patch({frPriceTtc:n})}/>
    <Num label="Ventes / mois estimées" v={x.salesMonth} on={n=>patch({salesMonth:n})} step={0.5}/>
    <Num label="Unités par remorque (0 = non)" v={x.trailerFit} on={n=>patch({trailerFit:n})}/>
    <Num label="Sinon, transporteur / unité" v={x.otherDelivery} on={n=>patch({otherDelivery:n})}/>
    <Num label="Provision SAV / unité" v={x.savCost} on={n=>patch({savCost:n})}/>
    <Num label="Contrat service HT / mois" v={x.serviceMonth||0} on={n=>patch({serviceMonth:n})}/>
    <label><span>Homologation</span><select value={x.homolog} onChange={e=>patch({homolog:e.target.value as Product["homolog"]})}>{HOMOLOG.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
    <label><span>Permis</span><select value={x.permis} onChange={e=>patch({permis:e.target.value as Product["permis"]})}>{["aucun","AM","B","B96","CACES"].map(k=><option key={k} value={k}>{k==="aucun"?"Sans permis":k}</option>)}</select></label>
    <label><span>Demande Leboncoin (1–5)</span><input type="number" min={0} max={5} value={x.lbc} onChange={e=>patch({lbc:Number(e.target.value)||0})}/></label>
    <label><span>SAV / fiabilité (1–5)</span><input type="number" min={0} max={5} value={x.sav} onChange={e=>patch({sav:Number(e.target.value)||0})}/></label>
    <label><span>Chiffres vérifiés ?</span><select value={x.verified?"1":"0"} onChange={e=>patch({verified:e.target.value==="1"})}><option value="0">Non, estimations</option><option value="1">Oui, devis / vrais prix</option></select></label>
    <Txt wide label="Caractéristiques" v={x.specs} on={t=>patch({specs:t})}/>
    <Txt wide label="Lien photo (adresse de l’image)" v={x.photo} on={t=>patch({photo:t})}/>
    <Txt wide label="Lien page produit" v={x.link} on={t=>patch({link:t})}/>
    <Txt wide label="D’où vient le prix France" v={x.frSource} on={t=>patch({frSource:t})}/>
    <label className={c.wide}><span>Notes</span><textarea value={x.notes} onChange={e=>patch({notes:e.target.value})}/></label>
   </div>
   <div className={c.links}>{x.link?<a href={x.link} target="_blank" rel="noreferrer">🔗 Page produit</a>:null}<button className={s.danger} onClick={()=>{if(confirm("Supprimer ce produit ?"))remove();}}>Supprimer</button></div>
  </div>:null}
 </div>;
}

function SupplierCard({x,n,patch,remove,addProduct}:{x:Supplier;n:number;patch:(v:Partial<Supplier>)=>void;remove:()=>void;addProduct:()=>void}){
 const [open,setOpen]=useState(false);
 const wa=x.whatsapp.replace(/[^\d]/g,"");
 return <div className={c.sup}>
  <div className={c.supTop}><div><b>{x.name}</b><small>{x.city} · {x.fair}{x.stand&&x.stand!=="—"?` · ${x.stand}`:""}</small><div>{x.cats.map(k=><span key={k} className={c.chip}>{catIcon(k)} {catName(k)}</span>)}{!x.verified?<span className={c.warn}>contact à vérifier</span>:null}</div></div>
   <select value={x.status} onChange={e=>patch({status:e.target.value as Supplier["status"]})} style={{width:"auto"}}>{STATUS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
  {x.notes?<p className={s.muted}>{x.notes}</p>:null}
  {x.contact?<p className={s.muted}>👤 {x.contact}</p>:null}
  <div className={c.links}>
   {x.website?<a href={x.website} target="_blank" rel="noreferrer">🌐 Site</a>:null}
   {x.email?<a href={`mailto:${x.email}`}>✉️ {x.email}</a>:null}
   {wa?<a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>:null}
   {x.phone?<a href={`tel:${x.phone.replace(/\s/g,"")}`}>📞 Appeler</a>:null}
  </div>
  <p className={s.muted}>{n} produit{n>1?"s":""} · {x.nextDate?`relance le ${new Date(x.nextDate+"T12:00").toLocaleDateString("fr-FR")}`:"pas de relance prévue"}</p>
  <div className={c.links}><button className={s.small} onClick={addProduct}>+ Produit</button><button className={s.small} style={{background:"#fff",color:"#16202e",border:"1px solid #ddd"}} onClick={()=>setOpen(!open)}>{open?"Fermer":"✏️ Modifier"}</button></div>
  {open?<div className={c.edit}>
   <Txt label="Nom" v={x.name} on={t=>patch({name:t})}/><Txt label="Ville" v={x.city} on={t=>patch({city:t})}/><Txt label="Salon" v={x.fair} on={t=>patch({fair:t})}/>
   <Txt label="Stand" v={x.stand} on={t=>patch({stand:t})}/><Txt label="Site" v={x.website} on={t=>patch({website:t})}/><Txt label="Mail" v={x.email} on={t=>patch({email:t})}/>
   <Txt label="WhatsApp" v={x.whatsapp} on={t=>patch({whatsapp:t})}/><Txt label="Téléphone" v={x.phone} on={t=>patch({phone:t})}/><Txt label="Contact" v={x.contact} on={t=>patch({contact:t})}/>
   <label><span>Prochaine relance</span><input type="date" value={x.nextDate} onChange={e=>patch({nextDate:e.target.value})}/></label>
   <label><span>Contact vérifié ?</span><select value={x.verified?"1":"0"} onChange={e=>patch({verified:e.target.value==="1"})}><option value="0">Non</option><option value="1">Oui</option></select></label>
   <Txt label="Sources" v={x.sources} on={t=>patch({sources:t})}/>
   <div className={c.wide}><span style={{fontSize:12,fontWeight:700,color:"#435063"}}>Catégories</span><div className={c.filters}>{CATS.map(([k,l])=><button key={k} className={x.cats.includes(k)?c.on:""} onClick={()=>patch({cats:x.cats.includes(k)?x.cats.filter(y=>y!==k):[...x.cats,k]})}>{l}</button>)}</div></div>
   <label className={c.wide}><span>Notes</span><textarea value={x.notes} onChange={e=>patch({notes:e.target.value})}/></label>
   <button className={s.danger} onClick={()=>{if(confirm("Supprimer ce fournisseur et ses produits ?"))remove();}}>Supprimer le fournisseur</button>
  </div>:null}
 </div>;
}

export default function SourcingPage(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [d,setD]=useState<Sourcing|null>(null);const [P,setP]=useState<Params|null>(null);
 const [tab,setTab]=useState<Tab>("synthese");const [cat,setCat]=useState<Cat|"all">("all");const [open,setOpen]=useState("");
 const [busy,setBusy]=useState("");const [msg,setMsg]=useState("");const [dirty,setDirty]=useState(false);
 const api=async(body:object,pc=code)=>{const r=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,...body})});const j=await r.json().catch(()=>({ok:false,error:"Erreur"}));if(r.status===401)setAuthed(false);if(!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setBusy("load");setMsg("");try{const j=await api({action:"load"},pc);setD(j.data);setP(j.params);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 const save=async()=>{if(!d)return;setBusy("save");try{const j=await api({action:"save",data:d});setD(j.data);setDirty(false);setMsg("✅ Enregistré.");}catch(e){setMsg((e as Error).message)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const upd=(f:(x:Sourcing)=>Sourcing)=>{setD(x=>x?f(x):x);setDirty(true);setMsg("");};
 const cashNow=P?P.bank+P.cashOnHand:45000;
 const ranked=useMemo(()=>!d||!P?[]:d.products.map(x=>{const bp=businessPlan(P,d.hyp,x,cashNow);return {x,bp,score:scoreOf(d.weights,bp.crit)};}).sort((a,b)=>(Number(b.bp.known)-Number(a.bp.known))||b.score-a.score),[d,P,cashNow]);

 if(!authed||!d||!P)return <main className={s.page}><form className={s.login} onSubmit={e=>{e.preventDefault();load();}}><span className={s.logo}>N</span><h1>Sourcing</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="load"}>{busy==="load"?"…":"Entrer"}</button>{msg?<p className={s.err}>{msg}</p>:null}</form></main>;

 const patchP=(id:string,v:Partial<Product>)=>upd(x=>({...x,products:x.products.map(p=>p.id===id?{...p,...v,touched:true}:p)}));
 const patchS=(id:string,v:Partial<Supplier>)=>upd(x=>({...x,suppliers:x.suppliers.map(p=>p.id===id?{...p,...v,touched:true}:p)}));
 const rmP=(id:string)=>upd(x=>({...x,products:x.products.filter(p=>p.id!==id),removed:[...x.removed,id]}));
 const rmS=(id:string)=>upd(x=>({...x,suppliers:x.suppliers.filter(p=>p.id!==id),products:x.products.filter(p=>p.supplierId!==id),removed:[...x.removed,id,...x.products.filter(p=>p.supplierId===id).map(p=>p.id)]}));
 const addP=(sup:Supplier)=>{const id=uid();const k=sup.cats[0]||"vsp";upd(x=>({...x,products:[...x.products,{id,supplierId:sup.id,name:"Nouveau produit",cat:k,specs:"",photo:"",link:"",fobUsd:0,perContainer:k==="scooter"?80:k==="tricycle"?18:9,dutyPct:10,transferUnit:150,priceTtc:5990,frPriceTtc:12000,frSource:"",salesMonth:3,trailerFit:2,otherDelivery:350,homolog:"eec",permis:"aucun",lbc:3,sav:3,savCost:100,verified:false,notes:""}]}));setTab("classement");setCat("all");setOpen(id);};
 const addS=()=>upd(x=>({...x,suppliers:[{id:uid(),name:"Nouveau fournisseur",city:"",fair:"EICMA 2026 (Milan)",stand:"",website:"",email:"",whatsapp:"",phone:"",contact:"",cats:["vsp"],status:"etudier",notes:"",nextDate:"",sources:"",verified:false},...x.suppliers]}));
 const setH=(v:Partial<Hyp>)=>upd(x=>({...x,hyp:{...x.hyp,...v}}));
 const setW=(k:keyof Weights,n:number)=>upd(x=>({...x,weights:{...x.weights,[k]:n}}));
 const shown=ranked.filter(r=>cat==="all"||r.x.cat===cat);
 const top=ranked.filter(r=>r.bp.known&&r.bp.margin>0&&r.x.supplierId!=="actuel").slice(0,3);
 const sup=(id:string)=>d.suppliers.find(x=>x.id===id);
 const todo=d.suppliers.filter(x=>x.status==="contacter"||(x.nextDate&&x.nextDate<=new Date().toISOString().slice(0,10)));

 return <main className={s.page}>
  <header className={s.top}><div><h1>Sourcing NeoDrive</h1><p>Fournisseurs · produits · opportunités</p></div><div className={s.topBtns}><button onClick={save} disabled={!dirty||!!busy}>{busy==="save"?"…":dirty?"💾 Enregistrer":"✓ Enregistré"}</button></div></header>
  {msg?<p className={msg.startsWith("✅")?s.ok:s.err}>{msg}</p>:null}
  <nav className={c.tabs}>{([["synthese","🧭 Synthèse"],["classement","🏆 Classement"],["fournisseurs",`🏭 Fournisseurs (${d.suppliers.length})`],["criteres","⚖️ Critères & coûts"]] as [Tab,string][]).map(([k,l])=><button key={k} className={tab===k?c.on:""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="synthese"?<Synthese ranked={ranked} onCat={k=>{setCat(k);setTab("classement");}}/>:null}
  {tab==="classement"?<section className={s.card}>
   <h2>🏆 Meilleures opportunités</h2>
   {top.length?<div className={c.top3}>{top.map((r,i)=><div key={r.x.id}><small>#{i+1} · score {r.score}</small><b>{r.x.name}</b><span>{eur(r.bp.margin)} / unité · {eur(r.bp.yearMargin)} / an</span></div>)}</div>:<p className={s.muted}>Pas encore assez de prix usine connus.</p>}
   <p className={s.tip}>Les coûts (fret, douane, agent, dépotage, transferts, livraison remorque) viennent de ton <b>Pilotage</b>. « ? » = prix usine inconnu : demande-le au fournisseur et tape-le dans la fiche, le calcul se fait tout seul.</p>
   <div className={c.filters}><button className={cat==="all"?c.on:""} onClick={()=>setCat("all")}>Tout</button>{CATS.filter(([k])=>d.products.some(p=>p.cat===k)).map(([k,l])=><button key={k} className={cat===k?c.on:""} onClick={()=>setCat(k)}>{l}</button>)}</div>
   <div className={c.list}>{shown.map(r=><ProductCard key={r.x.id} x={r.x} sup={sup(r.x.supplierId)} bp={r.bp} score={r.score} open={open===r.x.id} toggle={()=>setOpen(open===r.x.id?"":r.x.id)} patch={v=>patchP(r.x.id,v)} remove={()=>rmP(r.x.id)}/>)}</div>
  </section>:null}

  {tab==="fournisseurs"?<section className={s.card}>
   <div className={s.rowHead}><h2>🏭 Fournisseurs</h2><button className={s.small} onClick={addS}>+ Fournisseur</button></div>
   {todo.length?<p className={s.tip}>📨 <b>À faire</b> : {todo.map(x=>x.name.split(" ").slice(0,2).join(" ")).join(", ")}. Avant de parler prix, demande le <b>numéro d’homologation (e…*168/2013*…)</b> et un <b>COC</b> du modèle exact.</p>:null}
   <div className={c.list}>{STATUS.flatMap(([st])=>d.suppliers.filter(x=>x.status===st)).map(x=><SupplierCard key={x.id} x={x} n={d.products.filter(p=>p.supplierId===x.id).length} patch={v=>patchS(x.id,v)} remove={()=>rmS(x.id)} addProduct={()=>addP(x)}/>)}</div>
  </section>:null}

  {tab==="criteres"?<section className={s.card}>
   <h2>⚖️ Importance des critères</h2>
   <p className={s.muted}>0 = ne compte pas · 5 = très important. Le classement change tout seul.</p>
   {CRITS.map(([k,l,h])=><div key={k} className={c.w}><div><b>{l}</b><small>{h}</small></div><input type="range" min={0} max={5} value={d.weights[k]} onChange={e=>setW(k,Number(e.target.value))}/></div>)}
   <h2>🚢 Hypothèses de coûts</h2>
   <div className={s.seg}>{(["havre","fos"] as const).map(k=><button key={k} className={d.hyp.port===k?s.on:""} onClick={()=>setH({port:k})}>{k==="havre"?"Port du Havre":"Port de Fos"}</button>)}</div>
   <div className={c.edit}>
    <Num label="Pub par vente (€)" v={d.hyp.marketingPerSale} on={n=>setH({marketingPerSale:n})}/>
    <Num label="Stockage par unité (€)" v={d.hyp.storagePerUnit} on={n=>setH({storagePerUnit:n})}/>
    <Num label="Transporteur si pas remorque (€)" v={d.hyp.transporteur} on={n=>setH({transporteur:n})}/>
   </div>
   <p className={s.tip}>Repris du Pilotage : dollar à {P.usd} € · fret {P.freightUsd.havre} $ (Havre) / {P.freightUsd.fos} $ (Fos) · agent {eur(P.agent)} · dépotage {eur(P.unload)} · transfert entrepôt {eur(P.warehouseTransfer)} · livraison {eur(P.deliveryCost)} pour {P.carsPerTrip} voitures · trésorerie {eur(cashNow)}. Pour les changer, va dans Pilotage → Réglages.</p>
  </section>:null}
 </main>;
}
