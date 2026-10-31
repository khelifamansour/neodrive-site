"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type Out={hook:string;tiktok:string;facebook:string;instagram:string;idea:string};
const TYPES=[["livraison","🚚 Livraison"],["question","❓ Question client"],["face","🎙️ Face caméra"],["essai","🚗 Prise en main"],["arrivage","📦 Arrivage"],["avis","⭐ Avis client"]] as const;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export default function Studio(){
 const [code,setCode]=useState("");const [authed,setAuthed]=useState(false);
 const [type,setType]=useState<string>("livraison");
 const [desc,setDesc]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState("");const [err,setErr]=useState("");
 const [out,setOut]=useState<Out|null>(null);
 const [videoUrl,setVideoUrl]=useState("");
 const [tt,setTt]=useState("");
 const [copied,setCopied]=useState("");
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);setAuthed(true);}}catch{}},[]);
 const enter=(e:React.FormEvent)=>{e.preventDefault();if(code.length<3)return;try{sessionStorage.setItem("nd_pc",code)}catch{};setAuthed(true);};

 const run=async()=>{setErr("");setOut(null);setTt("");setVideoUrl("");
  try{
   let url="";
   if(file){
    setBusy("Envoi de la vidéo…");
    const init=await fetch("/api/social-media/upload-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,files:[{name:file.name,type:file.type||"video/mp4",size:file.size}]})}).then(r=>r.json());
    if(init.error)throw new Error(init.error);
    const u=(init.uploads||[])[0];if(!u||u.error)throw new Error(u?.error||"Envoi impossible");
    const {error}=await supabase.storage.from("social-media").uploadToSignedUrl(u.path,u.token,file,{contentType:file.type||"video/mp4"});
    if(error)throw new Error("L’envoi de la vidéo a échoué, vérifiez votre connexion.");
    const reg=await fetch("/api/social-media/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,items:[{path:u.path,type:file.type||"video/mp4",name:file.name,context:desc}]})}).then(r=>r.json());
    if(!reg.ok)throw new Error(reg.error||"Enregistrement impossible");
    url=`${SB}/storage/v1/object/public/social-media/${u.path.split("/").map(encodeURIComponent).join("/")}`;setVideoUrl(url);
   }
   setBusy("L’IA écrit vos textes…");
   const r=await fetch("/api/studio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,type,description:desc})});
   const j=await r.json();if(r.status===401){setAuthed(false);throw new Error("Code incorrect");}
   if(!j.ok)throw new Error(j.error||"Erreur");setOut(j);
  }catch(e){setErr((e as Error).message)}finally{setBusy("")}
 };
 const sendTikTok=async()=>{if(!out||!videoUrl)return;setBusy("Envoi vers TikTok… (jusqu’à 1 min)");setTt("");
  try{const r=await fetch("/api/studio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,action:"tiktok",videoUrl,caption:out.tiktok})});const j=await r.json();
   setTt(j.ok?(j.mode==="direct"?"✅ Publiée sur TikTok !":"✅ Envoyée dans vos brouillons TikTok : ouvrez TikTok et touchez « Publier »."):"❌ "+(j.error||"Envoi TikTok impossible"));}
  catch{setTt("❌ Envoi TikTok impossible")}finally{setBusy("")}};
 const copy=async(k:string,t:string)=>{try{await navigator.clipboard.writeText(t);setCopied(k);setTimeout(()=>setCopied(""),1500)}catch{}};

 if(!authed)return <main className="s"><form className="login" onSubmit={enter}><span className="logo">N</span><h1>Studio</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button>Entrer</button></form><style jsx>{css}</style></main>;

 return <main className="s">
  <h1>Studio</h1><p className="sub">Vous filmez, l’IA écrit, ça se publie.</p>
  <div className="chips">{TYPES.map(([k,l])=><button key={k} type="button" className={type===k?"on":""} onClick={()=>setType(k)}>{l}</button>)}</div>
  <label className="file"><input type="file" accept="video/mp4,video/quicktime,video/*,image/jpeg,image/png" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file?<><b>🎬 {file.name}</b><small>{(file.size/1024/1024).toFixed(0)} Mo · toucher pour changer</small></>:<><b>＋ Choisir la vidéo</b><small>Facultatif : sans vidéo, l’IA écrit seulement les textes</small></>}</label>
  <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="En quelques mots : ex. « Livraison à Brest, Martine, Confort grise, très contente »"/>
  <button className="go" disabled={!!busy||desc.trim().length<3} onClick={run}>{busy||"✨ Préparer la publication"}</button>
  {err?<p className="err">{err}</p>:null}
  {out?<div className="res">
   {videoUrl?<p className="ok">✅ Vidéo ajoutée à votre bibliothèque : elle partira aussi automatiquement sur Facebook{` `}(et Instagram une fois reconnecté).</p>:null}
   <div className="card hook"><small>Accroche à écrire sur la vidéo (1ʳᵉ seconde)</small><b>{out.hook}</b></div>
   {([["tiktok","TikTok",out.tiktok],["facebook","Facebook",out.facebook],["instagram","Instagram",out.instagram]] as const).map(([k,l,t])=><div className="card" key={k}><div className="ch"><b>{l}</b><button onClick={()=>copy(k,t)}>{copied===k?"✓ Copié":"Copier"}</button></div><p>{t}</p></div>)}
   {videoUrl?<button className="tt" disabled={!!busy} onClick={sendTikTok}>Envoyer sur TikTok</button>:<p className="muted">Ajoutez une vidéo pour l’envoyer directement sur TikTok.</p>}
   {tt?<p className={tt.startsWith("✅")?"ok":"err"}>{tt}</p>:null}
   <div className="card idea"><small>💡 Idée pour la prochaine vidéo</small><p>{out.idea}</p></div>
  </div>:null}
  <style jsx>{css}</style>
 </main>;
}
const css=`.s{max-width:560px;margin:0 auto;padding:22px 14px 80px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111}.login{display:grid;gap:12px;text-align:center;margin-top:40px}.logo{justify-self:center;display:grid;place-items:center;width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:30px}h1{font-size:34px;letter-spacing:-1.2px;margin:0}.sub{color:#666;margin:4px 0 16px}.login p{color:#666;margin:0}input,textarea{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}button{font:inherit;cursor:pointer}.login button,.go,.tt{padding:15px;border:0;border-radius:14px;background:#111;color:#fff;font-weight:900;font-size:16px;width:100%}.go{background:linear-gradient(135deg,#ff8a00,#f05a28);margin-top:10px}.go:disabled,.tt:disabled{opacity:.55}.tt{background:#000;margin-top:4px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.chips button{padding:9px 12px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800;font-size:14px}.chips button.on{background:#111;color:#fff;border-color:#111}.file{position:relative;display:grid;gap:4px;padding:18px;border:2px dashed #c9ccd1;border-radius:16px;text-align:center;margin-bottom:10px;background:#fafafa}.file input{position:absolute;inset:0;opacity:0}.file small{color:#777}.err{color:#b42318;font-weight:700}.ok{color:#067647;font-weight:700;background:#ecfdf3;padding:10px 12px;border-radius:12px}.muted{color:#888;font-size:14px}.res{display:grid;gap:10px;margin-top:16px}.card{border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#fff}.card p{margin:6px 0 0;white-space:pre-line;line-height:1.5}.card small{color:#777;font-weight:700}.hook b{display:block;font-size:22px;margin-top:4px}.ch{display:flex;justify-content:space-between;align-items:center}.ch button{padding:7px 12px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800;font-size:13px}.idea{background:#fff7ed;border-color:#fde3c8}`;
