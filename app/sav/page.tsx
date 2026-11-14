"use client";
import {useEffect,useRef,useState} from "react";
import GoogleReviews from "../_components/GoogleReviews";
import {supabase} from "../../lib/supabase";
import {SAV_MAX_FILES,SAV_MAX_PHOTO,SAV_MAX_VIDEO,ALERT_ENDPOINT} from "../../lib/sav";
import {SAV_CATEGORIES,matchCategory} from "../../lib/sav-center";
import MediaGallery from "./MediaGallery";
import PartsPicker,{type PickedPart} from "./PartsPicker";

type Created={ticket:{public_reference:string;ai_diagnosis?:string};mediaCount:number};
type Media={name:string;type:string;url:string};
type Msg={id:string;at:string;from:"client"|"neodrive";channel:string;author:string;body:string;media:Media[]};
type Status={ticket:{reference:string;category:string;vin:string|null;created_at:string;closed_at:string|null;advice?:string;resolution?:string|null;parts:PickedPart[]};stage:{key:string;label:string;message:string};events:{at:string;label:string}[];messages:Msg[];media:Media[]};
type Prefill={name:string;phone:string;email:string;vin:string;category:string;description:string;error_code:string;source:string};
const NO_PREFILL:Prefill={name:"",phone:"",email:"",vin:"",category:"",description:"",error_code:"",source:""};
/** Étapes simples affichées au client. */
const CLIENT_STEPS=[{label:"Demande reçue",keys:["nouveau"]},{label:"En cours de traitement",keys:["en_cours","attente_pieces","attente_ingenieur","attente_client"]},{label:"Résolu",keys:["resolu","cloture"]}];
const isVid=(f:File)=>f.type.startsWith("video/");
const fileType=(f:File)=>f.type||(/\.(heic|heif)$/i.test(f.name)?"image/heic":"");
const WHATSAPP="https://wa.me/33628261446?text="+encodeURIComponent("Bonjour, j’ai besoin d’une assistance technique pour ma NeoDrive.");
const mb=(n:number)=>(n/1024/1024).toFixed(n<1024*1024*10?1:0)+" Mo";
const fmt=(d:string)=>new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"long",hour:"2-digit",minute:"2-digit"});

export default function SAV(){
 const [files,setFiles]=useState<File[]>([]);
 const [fileErr,setFileErr]=useState("");
 const [sending,setSending]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [done,setDone]=useState<Created|null>(null);
 const [doneEmail,setDoneEmail]=useState("");
 const [reference,setReference]=useState("");
 const [email,setEmail]=useState("");
 const [status,setStatus]=useState<Status|null>(null);
 const [statusErr,setStatusErr]=useState("");
 const [looking,setLooking]=useState(false);
 const [parts,setParts]=useState<PickedPart[]>([]);
 const [prefill,setPrefill]=useState<Prefill>(NO_PREFILL);
 const [formKey,setFormKey]=useState(0);
 const formRef=useRef<HTMLFormElement>(null);

 const addFiles=(list:FileList|null)=>setFiles(checkFiles(files,list,setFileErr));

 // Lien pré-rempli : /sav?nom=…&tel=…&email=…&vin=…&categorie=…&desc=…&code=…&pieces=REF1,REF2 · suivi : /sav?ref=SAV-…&email=…
 useEffect(()=>{
  const q=new URLSearchParams(window.location.search);
  const g=(...k:string[])=>{for(const x of k){const v=q.get(x);if(v)return v.trim().slice(0,4000);}return "";};
  const ref=g("ref","reference").toUpperCase();
  const p:Prefill={name:g("nom","name"),phone:g("tel","telephone","phone"),email:g("email","mail"),vin:g("vin").replace(/\s+/g,"").toUpperCase(),category:matchCategory(g("categorie","category","sujet")),description:g("desc","description","message"),error_code:g("code","error_code"),source:g("source")||(q.toString()&&!ref?"lien":"")};
  const any=!!(p.name||p.phone||p.vin||p.category||p.description||p.error_code||(p.email&&!ref));
  if(any){setPrefill(p);setFormKey(k=>k+1);}
  const skus=g("pieces","parts");
  if(skus)fetch(`/api/sav/parts?skus=${encodeURIComponent(skus)}`).then(r=>r.json()).then(j=>{if(j.parts?.length)setParts(j.parts);}).catch(()=>null);
  if(ref){setReference(ref);if(p.email){setEmail(p.email);void doLookup(ref,p.email);}setTimeout(()=>document.getElementById("suivi")?.scrollIntoView({behavior:"smooth"}),300);}
  else if(any)setTimeout(()=>document.getElementById("demande")?.scrollIntoView({behavior:"smooth"}),300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(sending)return;setSending(true);setError("");
  const fd=new FormData(e.currentTarget);const data=Object.fromEntries(fd.entries()) as Record<string,string>;
  try{
   setProgress("Préparation de votre demande…");
   const init=await uploadFiles(files,{},setProgress);
   setProgress("Enregistrement de votre demande…");
   const r=await fetch("/api/sav/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,ref:init.ref,folder:init.folder,part_ids:parts.map(p=>p.id),source:prefill.source})});
   const j=await r.json();
   if(!r.ok||!j.ok)throw new Error(j.error||"Envoi impossible");
   if(!j.alertSent&&j.alertFields){const m=new FormData();Object.entries(j.alertFields as Record<string,string>).forEach(([k,v])=>m.append(k,v));await fetch(ALERT_ENDPOINT,{method:"POST",body:m,headers:{Accept:"application/json"}}).catch(()=>null);}
   setDone(j);setDoneEmail(data.email||"");setFiles([]);setParts([]);setPrefill(NO_PREFILL);formRef.current?.reset();
   try{history.replaceState(null,"",window.location.pathname+"#demande");}catch{}
   document.getElementById("demande")?.scrollIntoView({behavior:"smooth"});
  }catch(err){setError(err instanceof Error?err.message:"Erreur d’envoi");}
  finally{setSending(false);setProgress("");}
 }

 async function doLookup(ref:string,mail:string,quiet=false){
  if(!quiet){setStatus(null);setLooking(true);}setStatusErr("");
  try{const r=await fetch("/api/sav/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:ref,email:mail})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Demande introuvable");setStatus(j);}
  catch(err){setStatusErr(err instanceof Error?err.message:"Erreur");}
  finally{setLooking(false);}
 }
 const lookup=(e:React.FormEvent)=>{e.preventDefault();void doLookup(reference,email);};

 const stageIndex=status?CLIENT_STEPS.findIndex(s=>s.keys.includes(status.stage.key)):-1;

 return <main className="sav">
  <section className="hero"><div><span>ASSISTANCE NEODRIVE</span><h1>Une assistance technique qui vous répond.</h1><p>Décrivez-nous la situation, ajoutez une photo ou une vidéo : un technicien NeoDrive étudie votre demande et revient vers vous directement. Vous suivez l’avancement en ligne, à chaque étape.</p><div className="actions"><a href="#demande">Contacter un technicien</a><a className="alt" href="#suivi">Suivre ma demande</a></div></div>
   <div className="visual" aria-hidden="true"><div className="glow"/><div className="phone"><div className="notch"/>
    <div className="chatTop"><span className="avatar">N</span><div><b>Assistance NeoDrive</b><small><i/> Technicien en ligne</small></div></div>
    <div className="chat">
     <div className="bubble me vid"><img src="/sav/tableau-de-bord.webp" alt=""/><span className="play">▶</span><small>0:24</small></div>
     <div className="bubble me">Le voyant batterie clignote au démarrage 🙏</div>
     <div className="bubble them">Bonjour ! Bien reçu, on regarde votre vidéo et on vous rappelle dans la journée 👍</div>
     <div className="pill">● En analyse</div>
    </div></div>
   <div className="float f1"><b>⚡ Pièces sous 48 h</b><small>Expédiées partout en France</small></div>
   <div className="float f2"><b>✓ Suivi en ligne</b><small>Chaque étape, en temps réel</small></div>
  </div></section>

  <section className="stepsRow"><div className="card"><b>1</b><strong>Décrivez la situation</strong><p>Quelques lignes suffisent. Le numéro de châssis (VIN) nous aide si vous l’avez.</p></div><div className="card"><b>2</b><strong>Ajoutez une vidéo</strong><p>Une courte vidéo vaut mieux qu’un long message. Une vidéo de 30 secondes suffit.</p></div><div className="card"><b>3</b><strong>Suivez votre demande</strong><p>Un technicien vous répond et chaque étape s’affiche dans votre suivi.</p></div></section>

  <section className="trust"><article><b>Un interlocuteur direct</b><p>Un technicien NeoDrive échange avec vous par téléphone ou WhatsApp.</p></article><article><b>Pièces sous 48 h</b><p>Pièces détachées disponibles et expédiées rapidement partout en France.</p></article><article><b>Suivi en ligne</b><p>Votre référence vous permet de voir où en est votre demande, à tout moment.</p></article></section>

  <section id="demande" className="ticket"><div className="heading"><span>VOTRE DEMANDE</span><h2>Décrivez-nous la situation.</h2><p>Plus votre description est précise, plus notre réponse est rapide.</p></div>
   {done?<div className="success">
    <div className="okIcon">✓</div>
    <h2>Demande bien reçue</h2>
    <p>Merci ! Un technicien NeoDrive étudie votre demande{done.mediaCount?(done.mediaCount>1?` et vos ${done.mediaCount} fichiers`:" et votre fichier"):""}, puis revient vers vous directement.</p>
    <div className="refBox"><small>Votre référence de suivi</small><strong>{done.ticket.public_reference}</strong><small>Conservez-la : avec votre e-mail, elle vous permet de suivre votre demande ci-dessous.</small></div>
    {done.ticket.ai_diagnosis?<details className="diagnosis"><summary>Premiers conseils en attendant notre retour</summary><p>{done.ticket.ai_diagnosis}</p></details>:null}
    <div className="row"><button type="button" onClick={()=>{setReference(done.ticket.public_reference);setEmail(doneEmail);document.getElementById("suivi")?.scrollIntoView({behavior:"smooth"});}}>Suivre ma demande</button><a className="wa" href={WHATSAPP} target="_blank" rel="noreferrer">Écrire sur WhatsApp</a><button type="button" className="ghost" onClick={()=>setDone(null)}>Nouvelle demande</button></div>
   </div>:
   <form key={formKey} ref={formRef} onSubmit={submit} className="form">
    {prefill.name||prefill.description?<p className="prefilled">✓ Nous avons pré-rempli votre demande. Vérifiez les informations, ajoutez une photo ou une vidéo, puis envoyez.</p>:null}
    <div className="two"><label>Nom et prénom<input name="name" autoComplete="name" required defaultValue={prefill.name}/></label><label>Téléphone<input name="phone" type="tel" autoComplete="tel" required defaultValue={prefill.phone}/></label><label>E-mail<input name="email" type="email" autoComplete="email" required defaultValue={prefill.email}/></label><label>Numéro de châssis (VIN) <em>· facultatif</em><input name="vin" defaultValue={prefill.vin}/></label></div>
    <div className="two"><label>Sujet<select name="category" defaultValue={prefill.category||SAV_CATEGORIES[0]}>{SAV_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Code affiché à l’écran <em>· facultatif</em><input name="error_code" placeholder="Ex. A01" defaultValue={prefill.error_code}/></label></div>
    <label>Décrivez la situation<textarea name="description" required rows={5} placeholder="Ce que fait le véhicule, depuis quand, ce qui s’affiche à l’écran…" defaultValue={prefill.description}/></label>
    <div className="partsField"><b>Pièces concernées <em>· facultatif</em></b><small>Si vous savez quelle pièce est en cause, choisissez-la dans la liste.</small><PartsPicker value={parts} onChange={setParts}/></div>
    <div className="drop"><label className="dropZone"><input type="file" multiple accept="image/*,video/*,.heic,.heif" onChange={e=>{addFiles(e.target.files);e.target.value="";}}/><b>＋ Ajouter une photo ou une vidéo</b><small>Filmez directement avec votre téléphone · vidéo courte (≈ 30 s, 50 Mo max), photos 15 Mo max · {SAV_MAX_FILES} fichiers max</small></label>
     {files.length?<ul className="files">{files.map((f,i)=><li key={i}><span>{f.type.startsWith("video/")?"🎬":"📷"} {f.name}</span><small>{mb(f.size)}</small><button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))} aria-label="Retirer">×</button></li>)}</ul>:null}
     {fileErr?<p className="err">{fileErr}</p>:null}
    </div>
    <button disabled={sending}>{sending?progress||"Envoi…":"Envoyer ma demande"}</button>
    {error?<p className="err" role="alert">{error}</p>:null}
    <p className="small">Besoin d’une réponse immédiate ? <a href={WHATSAPP} target="_blank" rel="noreferrer">Écrivez-nous sur WhatsApp</a>.</p>
   </form>}
  </section>

  <section id="suivi" className="follow"><div><span>SUIVI EN LIGNE</span><h2>Où en est ma demande ?</h2><p>Saisissez la référence reçue (SAV-…) et votre adresse e-mail.</p></div>
   <form onSubmit={lookup}><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="SAV-2026-…" required/><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre e-mail" type="email" required/><button disabled={looking}>{looking?"Recherche…":"Voir ma demande"}</button>
    {statusErr?<p className="errDark">{statusErr}</p>:null}
   </form>
   {status?<div className="status">
    <div className="stHead"><b>{status.ticket.reference}</b><span className="now">{status.stage.label}</span></div>
    <p>{status.stage.message}</p>
    <ol className="steps">{CLIENT_STEPS.map((s,i)=><li key={s.label} className={i<=stageIndex?"on":""}>{s.label}</li>)}</ol>
    {status.ticket.parts?.length?<div className="stParts"><small>Pièces indiquées</small>{status.ticket.parts.map(p=><span key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:"🔧"} {p.name}</span>)}</div>:null}
    {status.media.length?<div className="stMedia"><small>Vos photos et vidéos</small><MediaGallery items={status.media} compact/></div>:null}
    <h3 className="convTitle">Échanges avec NeoDrive</h3>
    {status.messages.length?<ul className="conv">{status.messages.map(m=><li key={m.id} className={m.from==="client"?"me":"nd"}>
     <small>{m.from==="client"?"Vous":`${m.author} · NeoDrive`} · {fmt(m.at)} · {m.channel}</small>
     {m.body?<p>{m.body}</p>:null}
     {m.media.length?<MediaGallery items={m.media} compact/>:null}
    </li>)}</ul>:<p className="muted">Pas encore de message. Un technicien NeoDrive vous répond ici, par e-mail ou par WhatsApp.</p>}
    <ReplyBox reference={status.ticket.reference} email={email} onSent={()=>doLookup(status.ticket.reference,email,true)}/>
    <ul className="events">{[...status.events].reverse().map((ev,i)=><li key={i}><small>{fmt(ev.at)} · {ev.label}</small></li>)}</ul>
   </div>:null}
  </section>

  <section className="docs"><div><span>DOCUMENTATION</span><h2>Vos guides, toujours accessibles.</h2><p>Manuel, guide de prise en main et pièces détachées NeoDrive.</p></div><div className="doclinks"><a href="/Manuel-technique.pdf" target="_blank">Manuel technique →</a><a href="/Guide-SAV-et-diagnostic-rapide.pdf" target="_blank">Guide de prise en main →</a><a href="/pieces">Pièces détachées →</a></div></section><GoogleReviews/>
  <style jsx>{`.sav{background:#fff;color:#111}.hero{max-width:1180px;margin:auto;padding:75px 24px 55px;display:grid;grid-template-columns:1fr 1fr;gap:55px;align-items:center}.hero span,.heading span,.follow span,.docs span{font-size:12px;font-weight:950;letter-spacing:1.8px;color:#ff5a1f}.hero h1{font-size:clamp(44px,6vw,72px);line-height:.98;letter-spacing:-3px;margin:16px 0}.hero p,.heading p,.follow p,.docs p{font-size:18px;line-height:1.65;color:#5f6670}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.actions a,.form>button,.follow button,.success button,.wa{padding:15px 20px;border-radius:14px;background:#111;color:#fff;text-decoration:none;font-weight:900;border:0;font-size:16px;cursor:pointer;text-align:center}.actions .alt{background:#fff;color:#111;border:1px solid #ddd}.visual{display:grid;gap:12px}.card{padding:25px;border-radius:22px;background:#f5f5f5}.card b{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#111;color:#fff}.card strong{display:block;font-size:22px;margin:14px 0 7px}.card p{font-size:15px;margin:0;color:#5f6670;line-height:1.55}.trust{max-width:1180px;margin:auto;padding:10px 24px 75px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.trust article{border:1px solid #e5e7eb;border-radius:22px;padding:24px}.trust b{font-size:19px}.trust p{color:#666;line-height:1.6}.ticket{background:#f6f7f8;padding:80px max(20px,calc((100vw - 1000px)/2));scroll-margin-top:90px}.heading{max-width:720px}.heading h2,.follow h2,.docs h2{font-size:clamp(34px,5vw,55px);letter-spacing:-2px;line-height:1.05;margin:10px 0}.form,.success{background:#fff;border-radius:26px;padding:30px;margin-top:30px;box-shadow:0 15px 50px #0000000d;display:grid;gap:17px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form label{font-weight:800;display:grid;gap:7px}.form label em{font-style:normal;font-weight:500;color:#888}.form input,.form select,.form textarea,.follow input{padding:13px;border:1px solid #d4d7db;border-radius:10px;font:inherit;font-size:16px;width:100%;box-sizing:border-box}.drop{display:grid;gap:10px}.dropZone{position:relative;display:grid!important;gap:6px;padding:22px;border:2px dashed #c9ccd1;border-radius:16px;text-align:center;cursor:pointer;background:#fafafa}.dropZone:hover{border-color:#ff6a00}.dropZone input{position:absolute;inset:0;opacity:0;cursor:pointer}.dropZone b{font-size:17px}.dropZone small{font-weight:500;color:#777}.files{list-style:none;margin:0;padding:0;display:grid;gap:8px}.files li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#f3f4f6;font-size:14px}.files li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.files li small{color:#777}.files li button{border:0;background:#111;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1}.form>button{background:linear-gradient(135deg,#ff8a00,#f05a28);font-size:17px;padding:17px}.form>button:disabled{opacity:.7;cursor:wait}.err{color:#b42318;font-weight:700;margin:0}.small{font-size:14px;color:#666;margin:0}.small a{color:#111;font-weight:800}.success{text-align:center}.okIcon{width:64px;height:64px;margin:0 auto;border-radius:50%;background:#16a34a;color:#fff;display:grid;place-items:center;font-size:32px;font-weight:900}.success h2{margin:0;font-size:28px;letter-spacing:-1px}.success p{color:#5f6670;line-height:1.6;margin:0}.refBox{display:grid;gap:4px;background:#f6f7f8;border-radius:16px;padding:18px}.refBox strong{font-size:28px;letter-spacing:.5px}.refBox small{color:#777}.diagnosis{background:#fff7ed;border-radius:16px;padding:16px 18px;text-align:left}.diagnosis summary{font-weight:800;cursor:pointer}.diagnosis p{margin-top:10px!important;white-space:pre-line}.row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.wa{background:#25d366}.success .ghost{background:#fff;color:#111;border:1px solid #ddd}.follow{max-width:1132px;margin:80px auto;padding:45px;border-radius:28px;background:#111;color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:45px;scroll-margin-top:90px}.follow p{color:#ccc}.follow form{display:grid;gap:11px;align-content:start}.follow input{background:#fff;color:#111}.follow button{background:#ff6a00}.errDark{color:#ffb4a8;margin:0;font-weight:700}.status{display:grid;gap:8px;background:#1d1d1d;padding:20px;border-radius:16px}.status b{font-size:18px}.follow .now{letter-spacing:0;justify-self:start;background:#ff6a00;color:#fff;font-weight:900;padding:6px 12px;border-radius:999px;font-size:14px}.status p{font-size:15px;margin:0;color:#ddd}.steps{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.steps li{position:relative;padding-left:26px;color:#777;font-size:14px;font-weight:700}.steps li:before{content:"";position:absolute;left:4px;top:4px;width:10px;height:10px;border-radius:50%;background:#444}.steps li.on{color:#fff}.steps li.on:before{background:#22c55e}.events{list-style:none;margin:10px 0 0;padding:12px 0 0;border-top:1px solid #333;display:grid;gap:10px}.events small{color:#999;font-size:12.5px}.events p{margin:3px 0 0;color:#eee}.docs{max-width:1132px;margin:80px auto;padding:0 20px;display:grid;grid-template-columns:1fr 1fr;gap:50px}.doclinks{display:grid;gap:10px;align-content:center}.doclinks a{padding:17px 19px;border:1px solid #ddd;border-radius:14px;color:#111;text-decoration:none;font-weight:900}@media(max-width:800px){.hero,.follow,.docs{grid-template-columns:1fr}.hero{padding-top:50px}.trust{grid-template-columns:1fr}.two{grid-template-columns:1fr}.ticket{padding-top:60px}.follow{margin:50px 15px;padding:28px}.hero h1{letter-spacing:-2px}.form,.success{padding:20px}.row>*{width:100%}}.visual{position:relative;display:grid;place-items:center;min-height:560px}.glow{position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(255,106,0,.28),rgba(255,106,0,0) 65%);filter:blur(10px)}.phone{position:relative;width:300px;border-radius:44px;background:#0d0d0d;padding:14px;box-shadow:0 40px 80px rgba(0,0,0,.28),inset 0 0 0 2px #2a2a2a;transform:rotate(-3deg)}.notch{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:90px;height:22px;background:#0d0d0d;border-radius:0 0 14px 14px;z-index:2}.chatTop{display:flex;align-items:center;gap:10px;background:#fff;border-radius:32px 32px 0 0;padding:34px 16px 12px;border-bottom:1px solid #eee}.avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:20px}.chatTop b{display:block;font-size:14px}.chatTop small{display:flex;align-items:center;gap:5px;font-size:12px;color:#16a34a;font-weight:700}.chatTop small i{width:7px;height:7px;border-radius:50%;background:#22c55e}.chat{background:#f3f4f6;border-radius:0 0 32px 32px;padding:14px 12px 20px;display:grid;gap:9px}.bubble{max-width:82%;padding:10px 12px;border-radius:16px;font-size:13px;line-height:1.4}.me{justify-self:end;background:#111;color:#fff;border-bottom-right-radius:5px}.them{justify-self:start;background:#fff;color:#111;border-bottom-left-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,.05)}.vid{position:relative;padding:4px;overflow:hidden}.vid img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px}.play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);color:#111;display:grid;place-items:center;font-size:16px;padding-left:3px}.vid small{position:absolute;right:12px;bottom:10px;color:#fff;font-size:11px;font-weight:800;text-shadow:0 1px 4px #000}.pill{justify-self:center;margin-top:4px;background:#fff1e6;color:#ff6a00;font-weight:900;font-size:12px;padding:6px 12px;border-radius:999px}.float{position:absolute;background:#fff;border-radius:18px;padding:12px 16px;box-shadow:0 18px 40px rgba(0,0,0,.14);display:grid;gap:2px}.float b{font-size:14px}.float small{font-size:12px;color:#6b7280}.f1{left:0;top:52%}.f2{right:0;bottom:24px}.stepsRow{max-width:1180px;margin:auto;padding:0 24px 30px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}@media(max-width:800px){.visual{min-height:500px;margin-top:10px}.phone{width:270px}.f1{left:-4px;top:56%}.f2{right:-4px;bottom:0}.stepsRow{grid-template-columns:1fr}}.prefilled{margin:0;padding:12px 14px;border-radius:12px;background:#ecfdf5;color:#065f46;font-weight:700;font-size:15px}.partsField{display:grid;gap:6px}.partsField b{font-weight:800}.partsField em{font-style:normal;font-weight:500;color:#888}.partsField small{color:#6b7280;font-size:14px}.follow .status{grid-column:1/-1}.stHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.stParts,.stMedia{display:grid;gap:6px}.stParts small,.stMedia small{color:#999;font-size:12.5px;letter-spacing:0;font-weight:700}.stParts span{display:flex;align-items:center;gap:8px;font-size:14px;color:#eee;letter-spacing:0;font-weight:700}.stParts img{width:36px;height:36px;border-radius:8px;object-fit:cover}.convTitle{margin:10px 0 0;font-size:18px}.conv{list-style:none;margin:0;padding:0;display:grid;gap:8px}.conv li{max-width:88%;padding:10px 12px;border-radius:14px;display:grid;gap:6px}.conv li.nd{justify-self:start;background:#fff;color:#111;border-bottom-left-radius:4px}.conv li.me{justify-self:end;background:#ff6a00;color:#fff;border-bottom-right-radius:4px}.conv small{font-size:12px;opacity:.8;letter-spacing:0;font-weight:700;color:inherit}.conv p{margin:0!important;color:inherit!important;white-space:pre-line;line-height:1.5}.muted{color:#aaa!important}@media(max-width:800px){.conv li{max-width:100%}}`}</style></main>;
}

/** Contrôle des fichiers choisis (photos 15 Mo, vidéos 50 Mo, 8 max). */
function checkFiles(current:File[],list:FileList|null,setErr:(s:string)=>void){
 if(!list)return current;setErr("");
 const next=[...current];
 for(const f of Array.from(list)){
  const isVideo=isVid(f);const max=isVideo?SAV_MAX_VIDEO:SAV_MAX_PHOTO;
  if(!isVideo&&!f.type.startsWith("image/")&&!/\.(heic|heif)$/i.test(f.name)){setErr(`${f.name} : seules les photos et vidéos sont acceptées.`);continue;}
  if(f.size>max){setErr(`${f.name} est trop lourd (${mb(f.size)}). Maximum ${isVideo?"50":"15"} Mo${isVideo?" (filmez environ 30 secondes)":""}.`);continue;}
  if(next.length>=SAV_MAX_FILES){setErr(`${SAV_MAX_FILES} fichiers maximum.`);break;}
  next.push(f);
 }
 return next;
}

/** Envoi direct vers le stockage privé via des URL signées. extra = { reference, email } pour une réponse. */
async function uploadFiles(list:File[],extra:Record<string,string>,onStep:(s:string)=>void){
 const init=await fetch("/api/sav/upload-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...extra,files:list.map(f=>({name:f.name,type:fileType(f),size:f.size}))})}).then(r=>r.json());
 if(!init.ok)throw new Error(init.error||"Envoi impossible");
 for(const u of init.uploads as {index:number;path:string;token:string}[]){
  const f=list[u.index];onStep(`Envoi de ${isVid(f)?"la vidéo":"la photo"} ${u.index+1}/${list.length}…`);
  const {error:upErr}=await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path,u.token,f,{contentType:f.type||"application/octet-stream"});
  if(upErr)throw new Error(`L’envoi de « ${f.name} » a échoué. Vérifiez votre connexion et réessayez.`);
 }
 return {ref:init.ref as string,folder:init.folder as string};
}

/** Réponse du client : texte + photos / vidéos, enregistrée dans la conversation du ticket. */
function ReplyBox({reference,email,onSent}:{reference:string;email:string;onSent:()=>void}){
 const [text,setText]=useState("");
 const [list,setList]=useState<File[]>([]);
 const [err,setErr]=useState("");
 const [busy,setBusy]=useState("");
 const [ok,setOk]=useState(false);
 async function send(){
  if(busy)return;if(!text.trim()&&!list.length){setErr("Écrivez un message ou ajoutez une photo / vidéo.");return;}
  setErr("");setOk(false);setBusy("Envoi…");
  try{
   let folder="";
   if(list.length){const up=await uploadFiles(list,{reference,email},setBusy);folder=up.folder;}
   setBusy("Enregistrement…");
   const r=await fetch("/api/sav/reply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference,email,body:text,folder})});const j=await r.json();
   if(!r.ok||!j.ok)throw new Error(j.error||"Envoi impossible");
   setText("");setList([]);setOk(true);onSent();
  }catch(e){setErr(e instanceof Error?e.message:"Envoi impossible");}
  finally{setBusy("");}
 }
 return <div className="reply">
  <label htmlFor="sav-reply">Répondre à NeoDrive</label>
  <textarea id="sav-reply" value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Votre message…"/>
  <div className="rRow"><label className="rFile"><input type="file" multiple accept="image/*,video/*,.heic,.heif" onChange={e=>{setList(checkFiles(list,e.target.files,setErr));e.target.value="";}}/>＋ Photo / vidéo</label><button type="button" onClick={send} disabled={!!busy}>{busy||"Envoyer"}</button></div>
  {list.length?<ul className="rFiles">{list.map((f,i)=><li key={i}><span>{isVid(f)?"🎬":"📷"} {f.name}</span><small>{mb(f.size)}</small><button type="button" onClick={()=>setList(list.filter((_,j)=>j!==i))} aria-label="Retirer">×</button></li>)}</ul>:null}
  {err?<p className="rErr" role="alert">{err}</p>:null}
  {ok?<p className="rOk">✓ Message envoyé. Un technicien NeoDrive vous répond rapidement.</p>:null}
  <style jsx>{`.reply{display:grid;gap:8px;margin-top:6px;padding-top:12px;border-top:1px solid #333}.reply>label{font-weight:800;font-size:15px}textarea{padding:12px;border:1px solid #444;border-radius:12px;font:inherit;font-size:16px;width:100%;box-sizing:border-box;background:#fff;color:#111}.rRow{display:flex;gap:8px;flex-wrap:wrap}.rFile{position:relative;flex:1;min-width:140px;padding:13px;border:1px dashed #666;border-radius:12px;text-align:center;font-weight:800;cursor:pointer;color:#fff}.rFile input{position:absolute;inset:0;opacity:0;cursor:pointer}.rRow button{flex:1;min-width:140px;padding:13px;border:0;border-radius:12px;background:#ff6a00;color:#fff;font-weight:900;font-size:16px;cursor:pointer}.rRow button:disabled{opacity:.7;cursor:wait}.rFiles{list-style:none;margin:0;padding:0;display:grid;gap:6px}.rFiles li{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#2a2a2a;font-size:14px}.rFiles span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rFiles small{color:#aaa}.rFiles button{border:0;background:#fff;color:#111;width:24px;height:24px;border-radius:50%;cursor:pointer}.rErr{color:#ffb4a8;font-weight:700;margin:0}.rOk{color:#86efac;font-weight:700;margin:0}`}</style>
 </div>;
}
