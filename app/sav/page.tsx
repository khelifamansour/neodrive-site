"use client";
import {useRef,useState} from "react";
import GoogleReviews from "../_components/GoogleReviews";
import {supabase} from "../../lib/supabase";
import {SAV_MAX_FILES,SAV_MAX_PHOTO,SAV_MAX_VIDEO,ALERT_ENDPOINT,SAV_STAGES} from "../../lib/sav";

type Created={ticket:{public_reference:string;ai_diagnosis?:string};mediaCount:number};
type Status={ticket:{reference:string;category:string;vin:string|null;created_at:string;advice?:string};stage:{key:string;label:string;message:string};events:{at:string;stage:string;label:string;note:string}[]};
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
 const formRef=useRef<HTMLFormElement>(null);

 const addFiles=(list:FileList|null)=>{
  if(!list)return;setFileErr("");
  const next=[...files];
  for(const f of Array.from(list)){
   const isVideo=f.type.startsWith("video/");const max=isVideo?SAV_MAX_VIDEO:SAV_MAX_PHOTO;
   if(!isVideo&&!f.type.startsWith("image/")&&!/\.(heic|heif)$/i.test(f.name)){setFileErr(`${f.name} : seules les photos et vidéos sont acceptées.`);continue;}
   if(f.size>max){setFileErr(`${f.name} est trop lourd (${mb(f.size)}). Maximum ${isVideo?"50":"15"} Mo${isVideo?" (filmez environ 30 secondes)":""}.`);continue;}
   if(next.length>=SAV_MAX_FILES){setFileErr(`${SAV_MAX_FILES} fichiers maximum.`);break;}
   next.push(f);
  }
  setFiles(next);
 };

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(sending)return;setSending(true);setError("");
  const fd=new FormData(e.currentTarget);const data=Object.fromEntries(fd.entries()) as Record<string,string>;
  try{
   setProgress("Préparation de votre demande…");
   const init=await fetch("/api/sav/upload-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({files:files.map(f=>({name:f.name,type:f.type||(/\.(heic|heif)$/i.test(f.name)?"image/heic":""),size:f.size}))})}).then(r=>r.json());
   if(!init.ok)throw new Error(init.error||"Envoi impossible");
   for(const u of init.uploads as {index:number;path:string;token:string}[]){
    const f=files[u.index];setProgress(`Envoi de ${f.type.startsWith("video/")?"la vidéo":"la photo"} ${u.index+1}/${files.length}…`);
    const {error:upErr}=await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path,u.token,f,{contentType:f.type||"application/octet-stream"});
    if(upErr)throw new Error(`L’envoi de « ${f.name} » a échoué. Vérifiez votre connexion et réessayez.`);
   }
   setProgress("Enregistrement de votre demande…");
   const r=await fetch("/api/sav/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,ref:init.ref,folder:init.folder})});
   const j=await r.json();
   if(!r.ok||!j.ok)throw new Error(j.error||"Envoi impossible");
   if(!j.alertSent&&j.alertFields){const m=new FormData();Object.entries(j.alertFields as Record<string,string>).forEach(([k,v])=>m.append(k,v));await fetch(ALERT_ENDPOINT,{method:"POST",body:m,headers:{Accept:"application/json"}}).catch(()=>null);}
   setDone(j);setDoneEmail(data.email||"");setFiles([]);formRef.current?.reset();
   document.getElementById("demande")?.scrollIntoView({behavior:"smooth"});
  }catch(err){setError(err instanceof Error?err.message:"Erreur d’envoi");}
  finally{setSending(false);setProgress("");}
 }

 async function lookup(e:React.FormEvent){
  e.preventDefault();setStatus(null);setStatusErr("");
  try{const r=await fetch("/api/sav/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference,email})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Demande introuvable");setStatus(j);}
  catch(err){setStatusErr(err instanceof Error?err.message:"Erreur");}
 }

 const stageIndex=status?SAV_STAGES.findIndex(s=>s.key===status.stage.key):-1;

 return <main className="sav">
  <section className="hero"><div><span>ASSISTANCE NEODRIVE</span><h1>Une assistance technique qui vous répond.</h1><p>Décrivez-nous la situation, ajoutez une photo ou une vidéo : un technicien NeoDrive étudie votre demande et revient vers vous directement. Vous suivez l’avancement en ligne, à chaque étape.</p><div className="actions"><a href="#demande">Contacter un technicien</a><a className="alt" href="#suivi">Suivre ma demande</a></div></div>
   <div className="visual"><div className="card"><b>1</b><strong>Décrivez la situation</strong><p>Quelques lignes suffisent. Le numéro de châssis (VIN) nous aide si vous l’avez.</p></div><div className="card"><b>2</b><strong>Ajoutez une vidéo</strong><p>Une courte vidéo vaut mieux qu’un long message. Une vidéo de 30 secondes suffit.</p></div><div className="card"><b>3</b><strong>Suivez votre demande</strong><p>Un technicien vous répond et chaque étape s’affiche dans votre suivi.</p></div></div></section>

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
   <form ref={formRef} onSubmit={submit} className="form">
    <div className="two"><label>Nom et prénom<input name="name" autoComplete="name" required/></label><label>Téléphone<input name="phone" type="tel" autoComplete="tel" required/></label><label>E-mail<input name="email" type="email" autoComplete="email" required/></label><label>Numéro de châssis (VIN) <em>· facultatif</em><input name="vin"/></label></div>
    <div className="two"><label>Sujet<select name="category"><option>Démarrage / écran</option><option>Charge / batterie</option><option>Freinage</option><option>Direction / roues</option><option>Éclairage / accessoires</option><option>Carrosserie</option><option>Question d’utilisation</option><option>Autre</option></select></label><label>Code affiché à l’écran <em>· facultatif</em><input name="error_code" placeholder="Ex. A01"/></label></div>
    <label>Décrivez la situation<textarea name="description" required rows={5} placeholder="Ce que fait le véhicule, depuis quand, ce qui s’affiche à l’écran…"/></label>
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
   <form onSubmit={lookup}><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="SAV-2026-…" required/><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre e-mail" type="email" required/><button>Voir ma demande</button>
    {statusErr?<p className="errDark">{statusErr}</p>:null}
    {status?<div className="status">
     <b>{status.ticket.reference}</b><span className="now">{status.stage.label}</span><p>{status.stage.message}</p>
     <ol className="steps">{SAV_STAGES.map((s,i)=><li key={s.key} className={i<=stageIndex?"on":""}>{s.label}</li>)}</ol>
     <ul className="events">{[...status.events].reverse().map((ev,i)=><li key={i}><small>{fmt(ev.at)} · {ev.label}</small>{ev.note?<p>{ev.note}</p>:null}</li>)}</ul>
    </div>:null}
   </form></section>

  <section className="docs"><div><span>DOCUMENTATION</span><h2>Vos guides, toujours accessibles.</h2><p>Manuel, guide de prise en main et pièces détachées NeoDrive.</p></div><div className="doclinks"><a href="/Manuel-technique.pdf" target="_blank">Manuel technique →</a><a href="/Guide-SAV-et-diagnostic-rapide.pdf" target="_blank">Guide de prise en main →</a><a href="/pieces">Pièces détachées →</a></div></section><GoogleReviews/>
  <style jsx>{`.sav{background:#fff;color:#111}.hero{max-width:1180px;margin:auto;padding:75px 24px 55px;display:grid;grid-template-columns:1fr 1fr;gap:55px;align-items:center}.hero span,.heading span,.follow span,.docs span{font-size:12px;font-weight:950;letter-spacing:1.8px;color:#ff5a1f}.hero h1{font-size:clamp(44px,6vw,72px);line-height:.98;letter-spacing:-3px;margin:16px 0}.hero p,.heading p,.follow p,.docs p{font-size:18px;line-height:1.65;color:#5f6670}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.actions a,.form>button,.follow button,.success button,.wa{padding:15px 20px;border-radius:14px;background:#111;color:#fff;text-decoration:none;font-weight:900;border:0;font-size:16px;cursor:pointer;text-align:center}.actions .alt{background:#fff;color:#111;border:1px solid #ddd}.visual{display:grid;gap:12px}.card{padding:25px;border-radius:22px;background:#f5f5f5}.card b{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#111;color:#fff}.card strong{display:block;font-size:22px;margin:14px 0 7px}.card p{font-size:15px;margin:0;color:#5f6670;line-height:1.55}.trust{max-width:1180px;margin:auto;padding:10px 24px 75px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.trust article{border:1px solid #e5e7eb;border-radius:22px;padding:24px}.trust b{font-size:19px}.trust p{color:#666;line-height:1.6}.ticket{background:#f6f7f8;padding:80px max(20px,calc((100vw - 1000px)/2));scroll-margin-top:90px}.heading{max-width:720px}.heading h2,.follow h2,.docs h2{font-size:clamp(34px,5vw,55px);letter-spacing:-2px;line-height:1.05;margin:10px 0}.form,.success{background:#fff;border-radius:26px;padding:30px;margin-top:30px;box-shadow:0 15px 50px #0000000d;display:grid;gap:17px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form label{font-weight:800;display:grid;gap:7px}.form label em{font-style:normal;font-weight:500;color:#888}.form input,.form select,.form textarea,.follow input{padding:13px;border:1px solid #d4d7db;border-radius:10px;font:inherit;font-size:16px;width:100%;box-sizing:border-box}.drop{display:grid;gap:10px}.dropZone{position:relative;display:grid!important;gap:6px;padding:22px;border:2px dashed #c9ccd1;border-radius:16px;text-align:center;cursor:pointer;background:#fafafa}.dropZone:hover{border-color:#ff6a00}.dropZone input{position:absolute;inset:0;opacity:0;cursor:pointer}.dropZone b{font-size:17px}.dropZone small{font-weight:500;color:#777}.files{list-style:none;margin:0;padding:0;display:grid;gap:8px}.files li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#f3f4f6;font-size:14px}.files li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.files li small{color:#777}.files li button{border:0;background:#111;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1}.form>button{background:linear-gradient(135deg,#ff8a00,#f05a28);font-size:17px;padding:17px}.form>button:disabled{opacity:.7;cursor:wait}.err{color:#b42318;font-weight:700;margin:0}.small{font-size:14px;color:#666;margin:0}.small a{color:#111;font-weight:800}.success{text-align:center}.okIcon{width:64px;height:64px;margin:0 auto;border-radius:50%;background:#16a34a;color:#fff;display:grid;place-items:center;font-size:32px;font-weight:900}.success h2{margin:0;font-size:28px;letter-spacing:-1px}.success p{color:#5f6670;line-height:1.6;margin:0}.refBox{display:grid;gap:4px;background:#f6f7f8;border-radius:16px;padding:18px}.refBox strong{font-size:28px;letter-spacing:.5px}.refBox small{color:#777}.diagnosis{background:#fff7ed;border-radius:16px;padding:16px 18px;text-align:left}.diagnosis summary{font-weight:800;cursor:pointer}.diagnosis p{margin-top:10px!important;white-space:pre-line}.row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.wa{background:#25d366}.success .ghost{background:#fff;color:#111;border:1px solid #ddd}.follow{max-width:1132px;margin:80px auto;padding:45px;border-radius:28px;background:#111;color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:45px;scroll-margin-top:90px}.follow p{color:#ccc}.follow form{display:grid;gap:11px;align-content:start}.follow input{background:#fff;color:#111}.follow button{background:#ff6a00}.errDark{color:#ffb4a8;margin:0;font-weight:700}.status{display:grid;gap:8px;background:#1d1d1d;padding:20px;border-radius:16px}.status b{font-size:18px}.follow .now{letter-spacing:0;justify-self:start;background:#ff6a00;color:#fff;font-weight:900;padding:6px 12px;border-radius:999px;font-size:14px}.status p{font-size:15px;margin:0;color:#ddd}.steps{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.steps li{position:relative;padding-left:26px;color:#777;font-size:14px;font-weight:700}.steps li:before{content:"";position:absolute;left:4px;top:4px;width:10px;height:10px;border-radius:50%;background:#444}.steps li.on{color:#fff}.steps li.on:before{background:#22c55e}.events{list-style:none;margin:10px 0 0;padding:12px 0 0;border-top:1px solid #333;display:grid;gap:10px}.events small{color:#999;font-size:12.5px}.events p{margin:3px 0 0;color:#eee}.docs{max-width:1132px;margin:80px auto;padding:0 20px;display:grid;grid-template-columns:1fr 1fr;gap:50px}.doclinks{display:grid;gap:10px;align-content:center}.doclinks a{padding:17px 19px;border:1px solid #ddd;border-radius:14px;color:#111;text-decoration:none;font-weight:900}@media(max-width:800px){.hero,.follow,.docs{grid-template-columns:1fr}.hero{padding-top:50px}.trust{grid-template-columns:1fr}.two{grid-template-columns:1fr}.ticket{padding-top:60px}.follow{margin:50px 15px;padding:28px}.hero h1{letter-spacing:-2px}.form,.success{padding:20px}.row>*{width:100%}}`}</style></main>;
}
