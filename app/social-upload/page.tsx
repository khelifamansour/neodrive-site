"use client";

import { useMemo, useState } from "react";

const STORAGE_HOST = "https://tzlsdjzcxdjaatcpwqwn.storage.supabase.co";
const TUS_ENDPOINT = `${STORAGE_HOST}/storage/v1/upload/resumable`;
const CHUNK = 6 * 1024 * 1024;

type S = { name: string; size: number; state: "waiting" | "uploading" | "done" | "error"; error?: string; pct?: number };
type UploadInfo = { index: number; path?: string; token?: string; type?: string; name?: string; size?: number; error?: string };
function mb(n: number) { return `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} Mo`; }
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
function b64(v:string){return btoa(unescape(encodeURIComponent(v)));}

async function optimiseImage(f: File) {
  if (!f.type.startsWith("image/")) return f;
  if (f.type === "image/jpeg" && f.size < 2 * 1024 * 1024) return f;
  try {
    const b = await createImageBitmap(f);
    const s = Math.min(1, 1920 / Math.max(b.width, b.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b.width * s)); c.height = Math.max(1, Math.round(b.height * s));
    const x = c.getContext("2d"); if (!x) return f;
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(b, 0, 0, c.width, c.height); b.close();
    const z = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return z ? new File([z], `${f.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }) : f;
  } catch { return f; }
}

async function serverOffset(url:string, token:string){
  const r=await fetch(url,{method:"HEAD",headers:{"Tus-Resumable":"1.0.0","x-signature":token},cache:"no-store"});
  if(!r.ok) throw new Error(`Reprise impossible (${r.status})`);
  return Number(r.headers.get("Upload-Offset")||0);
}

async function tusUpload(file:File, info:UploadInfo, onProgress:(pct:number)=>void){
  if(!info.path||!info.token) throw new Error(info.error||"Upload non préparé");
  const create=await fetch(TUS_ENDPOINT,{
    method:"POST",
    headers:{
      "Tus-Resumable":"1.0.0",
      "Upload-Length":String(file.size),
      "Upload-Metadata":[
        `bucketName ${b64("social-media")}`,
        `objectName ${b64(info.path)}`,
        `contentType ${b64(file.type||"application/octet-stream")}`,
        `cacheControl ${b64("3600")}`
      ].join(","),
      "x-signature":info.token
    },
    cache:"no-store"
  });
  if(!create.ok) throw new Error((await create.text().catch(()=>""))||`Initialisation upload impossible (${create.status})`);
  const loc=create.headers.get("Location");
  if(!loc) throw new Error("Adresse de reprise manquante");
  const uploadUrl=new URL(loc,TUS_ENDPOINT).href;
  let offset=0;
  let failures=0;
  while(offset<file.size){
    const end=Math.min(offset+CHUNK,file.size);
    const chunk=file.slice(offset,end);
    try{
      const r=await fetch(uploadUrl,{
        method:"PATCH",
        headers:{
          "Tus-Resumable":"1.0.0",
          "Upload-Offset":String(offset),
          "Content-Type":"application/offset+octet-stream",
          "x-signature":info.token
        },
        body:chunk,
        cache:"no-store"
      });
      if(!r.ok) throw new Error((await r.text().catch(()=>""))||`Envoi interrompu (${r.status})`);
      offset=Number(r.headers.get("Upload-Offset")||end);
      failures=0;
      onProgress(Math.min(100,Math.round(offset/file.size*100)));
    }catch(e){
      failures++;
      if(failures>5) throw e;
      await sleep(Math.min(8000,1000*Math.pow(2,failures-1)));
      try{offset=await serverOffset(uploadUrl,info.token);onProgress(Math.min(99,Math.round(offset/file.size*100)));}catch{}
    }
  }
  return info;
}

export default function Page() {
 const [passcode,setPasscode]=useState(""); const [ctx,setCtx]=useState(""); const [files,setFiles]=useState<File[]>([]); const [progress,setProgress]=useState<S[]>([]); const [status,setStatus]=useState(""); const [loading,setLoading]=useState(false); const [publishing,setPublishing]=useState<string|null>(null); const [videoAction,setVideoAction]=useState<"create"|"instagram"|"facebook"|"tiktok"|"tiktok-connect"|null>(null); const [latestJobId,setLatestJobId]=useState<string|null>(null); const [latestTheme,setLatestTheme]=useState<string|null>(null); const [tiktokConnected,setTiktokConnected]=useState<boolean|null>(null); const [seoTopic,setSeoTopic]=useState(""); const [seoLoading,setSeoLoading]=useState(false); const [seoArticle,setSeoArticle]=useState<{title:string;url:string}|null>(null); const total=useMemo(()=>files.reduce((s,f)=>s+f.size,0),[files]);

 async function uploadOne(f:File,info:UploadInfo,n:number){
  if(info.error||!info.path||!info.token){setProgress(p=>p.map((x,k)=>k===n?{...x,state:"error",error:info.error||"Upload non préparé"}:x));return null;}
  setProgress(p=>p.map((x,k)=>k===n?{...x,state:"uploading",pct:0,error:undefined}:x));
  try{
    const result=await tusUpload(f,info,(pct)=>setProgress(p=>p.map((x,k)=>k===n?{...x,pct}:x)));
    setProgress(p=>p.map((x,k)=>k===n?{...x,state:"done",pct:100}:x));
    return result;
  }catch(e){
    const message=e instanceof Error?e.message:"Erreur d'envoi";
    setProgress(p=>p.map((x,k)=>k===n?{...x,state:"error",error:message}:x));return null;
  }
 }

 async function submit(e:React.FormEvent){
  e.preventDefault();if(!files.length)return;setLoading(true);setStatus("Préparation des médias…");setProgress(files.map(f=>({name:f.name,size:f.size,state:"waiting"})));
  try{
    const fs=await Promise.all(files.map(optimiseImage));setProgress(fs.map(f=>({name:f.name,size:f.size,state:"waiting"})));
    const r=await fetch("/api/social-media/upload-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,files:fs.map(f=>({name:f.name,type:f.type,size:f.size}))})});
    const j=await r.json();if(!r.ok||!Array.isArray(j.uploads))throw new Error(j.error||"Préparation impossible");
    const done:UploadInfo[]=[];
    // Sequential resumable uploads are deliberately used here: much more reliable on a phone/4G than 3 large simultaneous PUTs.
    for(let n=0;n<fs.length;n++){
      setStatus(`Envoi ${n+1}/${fs.length}…`);
      const result=await uploadOne(fs[n],j.uploads[n]||{index:n,error:"Réponse manquante"},n);
      if(result)done.push(result);
    }
    if(done.length){
      const rr=await fetch("/api/social-media/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,batchContext:ctx,items:done})});
      const jj=await rr.json();if(!rr.ok||!jj.ok)throw new Error(jj.error||"Enregistrement incomplet");
    }
    const failed=fs.length-done.length;
    setStatus(`✅ ${done.length} média(s) ajouté(s) à la bibliothèque${failed?` · ❌ ${failed} refusé(s)/interrompu(s)`:""}. Les prochaines publications utilisent en priorité ces nouveaux médias.`);
    if(!failed){setFiles([]);setCtx("");}
  }catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur"}`);}finally{setLoading(false);}
 }

 async function publishNow(platform:"instagram"|"facebook"){
  if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}
  setPublishing(platform);setStatus(`Publication du média réel le plus récent sur ${platform==="instagram"?"Instagram":"Facebook"}…`);
  try{const r=await fetch(`/api/${platform}/publish-next`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Publication impossible");setStatus(j.published?`✅ Nouveau média publié sur ${platform==="instagram"?"Instagram":"Facebook"} — ${j.mediaId||j.postId||"OK"}`:`ℹ️ ${j.reason||"Aucun média récent à publier"}`);}catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur"}`);}finally{setPublishing(null);}
 }

 async function createVideoNow(){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}setVideoAction("create");setLatestJobId(null);setLatestTheme(null);setStatus("🎬 Création d’un nouveau Reel à partir de tes vraies vidéos récentes…");try{const r=await fetch("/api/video/manual-create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||j.reason||"Création impossible");setLatestJobId(j.jobId||null);setLatestTheme(j.theme||null);setStatus(`✅ Reel prêt${j.theme?` — ${j.theme}`:""}. Tu peux maintenant le publier.`);}catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur vidéo"}`);}finally{setVideoAction(null);}}
 async function publishReel(platform:"instagram"|"facebook"){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}if(!latestJobId){setStatus("❌ Crée d’abord un nouveau Reel avec le bouton violet.");return;}setVideoAction(platform);setStatus(`⏳ Envoi de CE Reel vers ${platform==="instagram"?"Instagram":"Facebook"}…`);try{const r=await fetch("/api/video/publish-latest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,jobId:latestJobId,platform})});const j=await r.json();const p=platform==="instagram"?j.instagram:j.facebook;if(!r.ok&&r.status!==207)throw new Error(j.error||"Publication vidéo impossible");if(!p?.published)throw new Error(p?.error||p?.reason||`Échec ${platform}`);setStatus(`✅ Reel publié sur ${platform==="instagram"?"Instagram":"Facebook"} — ${p.mediaId||p.postId||"OK"}`);}catch(e){setStatus(`❌ ${platform==="instagram"?"Instagram":"Facebook"} : ${e instanceof Error?e.message:"Erreur publication vidéo"}`);}finally{setVideoAction(null);}}
 async function connectTikTok(){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}setVideoAction("tiktok-connect");setStatus("Connexion TikTok…");try{const r=await fetch("/api/tiktok/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const j=await r.json();if(!r.ok||!j.authorizationUrl)throw new Error(j.error||"Connexion TikTok impossible");window.location.href=j.authorizationUrl;}catch(e){setStatus(`❌ TikTok : ${e instanceof Error?e.message:"Erreur"}`);setVideoAction(null);}}
 async function checkTikTok(){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}try{const r=await fetch("/api/tiktok/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Statut TikTok impossible");setTiktokConnected(!!j.connected);setStatus(j.connected?"✅ TikTok est connecté à NeoDrive.":"ℹ️ TikTok n’est pas encore connecté.");}catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur TikTok"}`);}}
 async function publishTikTok(){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}if(!latestJobId){setStatus("❌ Crée d’abord un nouveau Reel.");return;}setVideoAction("tiktok");setStatus("⏳ Envoi de CE Reel vers TikTok…");try{const r=await fetch("/api/tiktok/publish-reel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,jobId:latestJobId})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Upload TikTok impossible");setTiktokConnected(true);setStatus(`✅ ${j.note||"Reel envoyé à TikTok."}`);}catch(e){setStatus(`❌ TikTok : ${e instanceof Error?e.message:"Erreur upload"}`);}finally{setVideoAction(null);}}
 async function createSeoArticle(){if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;}setSeoLoading(true);setSeoArticle(null);setStatus("📝 Rédaction et publication de l’article SEO en cours…");try{const r=await fetch("/api/seo/manual-publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,topic:seoTopic})});const j=await r.json();if(!r.ok||!j.ok||!j.article?.slug)throw new Error(typeof j.error==="string"?j.error:"Impossible de créer l’article SEO");const url=j.url||`https://www.easydrive-auto.fr/blog/${j.article.slug}`;setSeoArticle({title:j.article.title||"Article NeoDrive",url});setStatus(`✅ Article publié : ${j.article.title||seoTopic||"NeoDrive"}`);}catch(e){setStatus(`❌ SEO : ${e instanceof Error?e.message:"Erreur de génération"}`);}finally{setSeoLoading(false);}}

 return <main style={{maxWidth:760,margin:"0 auto",padding:"28px 18px 60px",fontFamily:"Arial,sans-serif"}}>
  <h1>Bibliothèque sociale NeoDrive</h1>
  <p>Ajoute tes vraies photos et vidéos. Elles deviennent la source prioritaire des publications Facebook et Instagram.</p>
  <div style={{padding:13,borderRadius:10,background:"#fff7df",border:"1px solid #f0d484",fontSize:14,lineHeight:1.45}}><strong>Vidéos volumineuses :</strong> l’envoi est maintenant repris par morceaux en cas de coupure réseau. La limite actuelle du compte Supabase Free reste toutefois de 50 Mo par fichier ; une vidéo au-dessus doit être compressée ou nécessite l’offre Supabase Pro.</div>
  <form onSubmit={submit} style={{display:"grid",gap:16,marginTop:22}}>
   <label>Code d’accès<input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} required style={input}/></label>
   <label>Photos et vidéos<input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={e=>setFiles(Array.from(e.target.files||[]))} style={input}/></label>
   {files.length>0&&<div><strong>{files.length} fichier(s)</strong> — {mb(total)}</div>}
   <label>Note globale facultative<textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={3} placeholder="Ex. livraison client à Toulouse, essai sur route, détails intérieur…" style={input}/></label>
   <button disabled={loading||!files.length} style={button}>{loading?"Envoi fiable en cours…":`Envoyer ${files.length||"les"} média(s)`}</button>
  </form>
  {progress.length>0&&<div style={{marginTop:18,display:"grid",gap:7}}>{progress.map((p,i)=><div key={i} style={{fontSize:14}}>{p.state==="done"?"✅":p.state==="uploading"?"⏳":p.state==="error"?"❌":"•"} {p.name} <span style={{color:"#777"}}>({mb(p.size)})</span>{p.state==="uploading"&&typeof p.pct==="number"&&<strong> — {p.pct}%</strong>}{p.error&&<span style={{color:"#b00020"}}> — {p.error}</span>}</div>)}</div>}

  <section style={panel}><h2 style={{marginTop:0}}>🎬 Reel manuel</h2><p>Crée volontairement un montage à partir de tes vraies vidéos récentes. Ce système est séparé des publications automatiques normales.</p><button onClick={createVideoNow} disabled={!!videoAction} style={{...button,background:"#7c3aed",width:"100%"}}>{videoAction==="create"?"Création…":"Créer un nouveau Reel"}</button><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}><button onClick={()=>publishReel("instagram")} disabled={!!videoAction||!latestJobId} style={{...button,background:latestJobId?"#d62976":"#777"}}>{videoAction==="instagram"?"Instagram traite…":"Publier CE Reel sur Instagram"}</button><button onClick={()=>publishReel("facebook")} disabled={!!videoAction||!latestJobId} style={{...button,background:latestJobId?"#1877f2":"#777"}}>{videoAction==="facebook"?"Publication…":"Publier CE Reel sur Facebook"}</button></div>
   <div style={{marginTop:18,padding:16,borderRadius:14,background:"#fff",border:"1px solid #ddd"}}><h3 style={{marginTop:0}}>TikTok</h3><p style={{fontSize:14,color:"#555"}}>Connexion OAuth officielle + upload en brouillon TikTok.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button onClick={connectTikTok} disabled={!!videoAction} style={{...button,background:"#111"}}>{videoAction==="tiktok-connect"?"Connexion…":"Connecter TikTok"}</button><button onClick={checkTikTok} disabled={!!videoAction} style={{...button,background:"#444"}}>Vérifier la connexion</button></div><button onClick={publishTikTok} disabled={!!videoAction||!latestJobId} style={{...button,background:latestJobId?"#fe2c55":"#777",width:"100%",marginTop:10}}>{videoAction==="tiktok"?"Envoi TikTok…":"Envoyer CE Reel à TikTok"}</button>{tiktokConnected!==null&&<p style={{fontSize:13,fontWeight:700,marginBottom:0}}>{tiktokConnected?"✅ TikTok connecté":"⚠️ TikTok non connecté"}</p>}</div>
  </section>

  <section style={{...panel,background:"#eff8ff",border:"1px solid #cfe5ff"}}><h2 style={{marginTop:0}}>📝 Article SEO supplémentaire</h2><p>Cette partie est indépendante de tes publications photo/vidéo.</p><label>Thématique de l’article<input value={seoTopic} onChange={e=>setSeoTopic(e.target.value)} maxLength={240} placeholder="Ex. voiture sans permis à 14 ans…" style={input}/></label><button onClick={createSeoArticle} disabled={seoLoading} style={{...button,background:"#1473e6",width:"100%",marginTop:15}}>{seoLoading?"Rédaction en cours…":"Écrire et publier un article SEO"}</button>{seoArticle&&<div style={{marginTop:15,padding:14,borderRadius:12,background:"#fff"}}><strong>✅ {seoArticle.title}</strong><br/><a href={seoArticle.url} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:9,color:"#1473e6",fontWeight:800}}>Ouvrir l’article publié →</a></div>}</section>

  <hr style={{margin:"32px 0"}}/><h2>Publier un média récent maintenant</h2><p>Ces boutons ignorent l’ancienne file d’attente et prennent directement un vrai média récent de ta bibliothèque.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><button onClick={()=>publishNow("instagram")} disabled={!!publishing} style={button}>{publishing==="instagram"?"Publication…":"Publier récent sur Instagram"}</button><button onClick={()=>publishNow("facebook")} disabled={!!publishing} style={button}>{publishing==="facebook"?"Publication…":"Publier récent sur Facebook"}</button></div>
  {status&&<p style={{fontWeight:700,marginTop:18,padding:14,background:"#f5f5f5",borderRadius:10}}>{status}</p>}
 </main>;
}

const input:React.CSSProperties={padding:13,border:"1px solid #ccc",borderRadius:10,fontSize:16,width:"100%",boxSizing:"border-box",display:"block",marginTop:7};
const button:React.CSSProperties={padding:"15px 18px",border:0,borderRadius:12,background:"#111",color:"white",fontSize:16,fontWeight:800,cursor:"pointer"};
const panel:React.CSSProperties={marginTop:32,padding:22,borderRadius:18,background:"#f4f0ff",border:"1px solid #e6dcff"};
