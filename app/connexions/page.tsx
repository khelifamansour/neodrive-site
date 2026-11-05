"use client";
import {useEffect,useState} from "react";

type Check={key:string;label:string;ok:boolean|null;detail:string;action?:string};

export default function Connexions(){
 const [code,setCode]=useState("");
 const [authed,setAuthed]=useState(false);
 const [checks,setChecks]=useState<Check[]>([]);
 const [busy,setBusy]=useState("");
 const [msg,setMsg]=useState<{t:"ok"|"err";m:string}|null>(null);
 const [metaToken,setMetaToken]=useState("");
 const [waToken,setWaToken]=useState("");
 const [waPhone,setWaPhone]=useState("");const [waWaba,setWaWaba]=useState("");
 const [open,setOpen]=useState<string|null>(null);

 const api=async(body:object)=>{const r=await fetch("/api/connexions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,...body})});const j=await r.json().catch(()=>({ok:false,error:"Réponse invalide"}));if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");return j;};
 const refresh=async(pc=code)=>{setBusy("status");setMsg(null);try{const r=await fetch("/api/connexions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,action:"status"})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");setChecks(j.checks);setAuthed(true);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setMsg({t:"err",m:(e as Error).message});setAuthed(false)}finally{setBusy("")}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);refresh(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const saveMeta=async()=>{setBusy("meta");setMsg(null);try{const j=await api({action:"save_meta",token:metaToken});setChecks(j.checks);setMetaToken("");setMsg({t:"ok",m:`✅ Page « ${j.page} » connectée${j.instagram?` · Instagram @${j.instagram}`:" · Instagram pas encore relié à la Page"}${j.whatsapp?" · WhatsApp connecté":""}.`});}catch(e){setMsg({t:"err",m:(e as Error).message})}finally{setBusy("")}};
 const saveWa=async()=>{setBusy("wa");setMsg(null);try{const j=await api({action:"save_whatsapp",token:waToken,phoneId:waPhone||undefined,wabaId:waWaba||undefined});setChecks(j.checks);setWaToken("");setMsg({t:"ok",m:`✅ WhatsApp connecté (${j.number}). Les relances repartent dans l’heure.`});}catch(e){setMsg({t:"err",m:(e as Error).message})}finally{setBusy("")}};
 const tiktok=async()=>{setBusy("tt");setMsg(null);try{const r=await fetch("/api/tiktok/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");window.location.href=j.authorizationUrl;}catch(e){setMsg({t:"err",m:(e as Error).message});setBusy("")}};
 const report=async()=>{setBusy("report");setMsg(null);try{const r=await fetch("/api/health",{headers:{Authorization:"Bearer "+code}});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");setChecks(j.checks);setMsg(j.sent?{t:"ok",m:"📧 Rapport envoyé sur votre e-mail."}:{t:"err",m:"Le rapport n’a pas pu partir (Formspree)."});}catch(e){setMsg({t:"err",m:(e as Error).message})}finally{setBusy("")}};

 if(!authed)return <main className="c"><form className="login" onSubmit={e=>{e.preventDefault();refresh();}}><span className="logo">N</span><h1>Connexions</h1><p>Espace privé NeoDrive. Code d’accès (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={busy==="status"}>{busy==="status"?"…":"Entrer"}</button>{msg?<p className="err">{msg.m}</p>:null}</form><style jsx>{css}</style></main>;

 const bad=checks.filter(c=>c.ok===false&&c.key!=="email").length;
 return <main className="c">
  <header><div><h1>Connexions</h1><p>{bad?`${bad} accès à reconnecter`:"Tout est connecté ✅"}</p></div><div className="hb"><button onClick={()=>refresh()} disabled={!!busy}>{busy==="status"?"…":"↻ Vérifier"}</button><button onClick={report} disabled={!!busy}>{busy==="report"?"…":"📧 Rapport"}</button></div></header>
  {msg?<p className={msg.t==="ok"?"ok":"err"}>{msg.m}</p>:null}
  <ul className="list">{checks.map(c=><li key={c.key}><i className={c.ok===true?"g":c.ok===false?"r":"n"}/><div><b>{c.label}</b><small>{c.detail}</small>{c.action?<em>→ {c.action}</em>:null}</div></li>)}</ul>

  <section className="card">
   <button className="toggle" onClick={()=>setOpen(open==="meta"?null:"meta")}><b>1 · Facebook + Instagram (+ WhatsApp)</b><span>{open==="meta"?"−":"+"}</span></button>
   {open==="meta"?<div className="body">
    <p className="lead">Un seul accès Meta <b>permanent</b> fait tout fonctionner. À faire une fois, sur ordinateur de préférence (10 min).</p>
    <ol>
     <li><b>Reliez Instagram à la Page Facebook</b> : dans <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer">Meta Business → Paramètres</a>, menu <b>Comptes → Comptes Instagram</b> → <b>Ajouter</b>, puis reliez-le à la Page NeoDrive (le compte Instagram doit être « professionnel »).</li>
     <li>Ouvrez <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer">Meta Business → Utilisateurs système</a> → <b>Ajouter</b> → nom « NeoDrive Site », rôle <b>Admin</b>.</li>
     <li>Cliquez <b>Attribuer des actifs</b> : votre <b>Page</b> NeoDrive (contrôle total), votre <b>compte Instagram</b> et votre <b>compte WhatsApp</b> (contrôle total).</li>
     <li>Cliquez <b>Générer un token</b> → choisissez l’application de votre site → expiration <b>« Jamais »</b> → cochez : <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>business_management</code>, <code>whatsapp_business_messaging</code>, <code>whatsapp_business_management</code>.</li>
     <li>Copiez le token et collez-le ci-dessous. <b>Ne l’envoyez jamais par message.</b></li>
    </ol>
    <textarea value={metaToken} onChange={e=>setMetaToken(e.target.value)} rows={4} placeholder="Collez ici l’accès Meta (commence souvent par EAA…)" autoComplete="off" spellCheck={false}/>
    <button className="go" onClick={saveMeta} disabled={!!busy||metaToken.trim().length<30}>{busy==="meta"?"Vérification auprès de Meta…":"Vérifier et enregistrer"}</button>
   </div>:null}
  </section>

  <section className="card">
   <button className="toggle" onClick={()=>setOpen(open==="wa"?null:"wa")}><b>2 · WhatsApp (seulement si pas connecté à l’étape 1)</b><span>{open==="wa"?"−":"+"}</span></button>
   {open==="wa"?<div className="body">
    <p className="lead">Si l’étape 1 a affiché « WhatsApp connecté », il n’y a rien à faire ici.</p>
    <ol><li>Dans <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer">Utilisateurs système</a>, générez un token avec <code>whatsapp_business_messaging</code> et <code>whatsapp_business_management</code>, expiration « Jamais ».</li><li>L’identifiant du numéro se trouve dans <a href="https://business.facebook.com/wa/manage/phone-numbers/" target="_blank" rel="noreferrer">WhatsApp Manager → Numéros de téléphone</a> (laissez vide pour garder l’actuel).</li></ol>
    <textarea value={waToken} onChange={e=>setWaToken(e.target.value)} rows={3} placeholder="Collez ici l’accès WhatsApp" autoComplete="off" spellCheck={false}/>
    <input value={waPhone} onChange={e=>setWaPhone(e.target.value.replace(/\D/g,""))} placeholder="Identifiant du numéro (nouveau numéro de Hana)"/>
    <input value={waWaba} onChange={e=>setWaWaba(e.target.value.replace(/\D/g,""))} placeholder="Identifiant du compte WhatsApp Business (WABA)"/>
    <button className="go" onClick={saveWa} disabled={!!busy||waToken.trim().length<30}>{busy==="wa"?"Vérification…":"Vérifier et enregistrer"}</button>
   </div>:null}
  </section>

  <section className="card">
   <button className="toggle" onClick={()=>setOpen(open==="tt"?null:"tt")}><b>3 · TikTok</b><span>{open==="tt"?"−":"+"}</span></button>
   {open==="tt"?<div className="body">
    <p className="lead">Connectez votre compte TikTok en un clic (connectez-vous avec le compte TikTok de NeoDrive).</p>
    <p className="note">Pour publier automatiquement, TikTok doit aussi valider l’application dans votre <a href="https://developers.tiktok.com/apps" target="_blank" rel="noreferrer">espace développeur TikTok</a> (produit « Content Posting API »). Tant que ce n’est pas validé, les vidéos arrivent dans vos brouillons TikTok.</p>
    <button className="go tt" onClick={tiktok} disabled={!!busy}>{busy==="tt"?"Ouverture de TikTok…":"Connecter TikTok"}</button>
   </div>:null}
  </section>

  <p className="foot">🔒 Les accès sont vérifiés auprès de Meta / TikTok puis stockés dans votre espace privé Supabase. Ils ne sont jamais affichés ni renvoyés au navigateur. Un rapport arrive chaque matin vers 7 h sur votre e-mail.</p>
  <style jsx>{css}</style>
 </main>;
}

const css=`.c{max-width:760px;margin:0 auto;padding:26px 14px 80px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111}.login{max-width:360px;margin:50px auto;display:grid;gap:12px;text-align:center}.logo{justify-self:center;display:grid;place-items:center;width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:30px}.login h1{margin:0;font-size:32px;letter-spacing:-1px}.login p{margin:0;color:#666}input,textarea{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}textarea{font-family:ui-monospace,monospace;font-size:13px}button{font:inherit;cursor:pointer}.login button,.go{padding:14px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:900;font-size:16px;width:100%}.go:disabled,.login button:disabled{opacity:.5;cursor:not-allowed}.tt{background:#000}header{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}header h1{margin:0;font-size:32px;letter-spacing:-1px}header p{margin:4px 0 0;color:#666;font-weight:700}.hb{display:flex;gap:6px}.hb button{padding:10px 14px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800}.ok{background:#ecfdf3;color:#067647;padding:12px 14px;border-radius:12px;font-weight:700}.err{background:#fef3f2;color:#b42318;padding:12px 14px;border-radius:12px;font-weight:700}.list{list-style:none;padding:0;margin:0 0 18px;display:grid;gap:8px}.list li{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid #eee;border-radius:16px;background:#fff}.list i{flex:0 0 12px;height:12px;border-radius:50%;margin-top:5px}.g{background:#22c55e;box-shadow:0 0 0 4px #dcfce7}.r{background:#ef4444;box-shadow:0 0 0 4px #fee2e2}.n{background:#d1d5db}.list b{display:block}.list small{display:block;color:#666;margin-top:2px;line-height:1.4}.list em{display:block;font-style:normal;color:#ff5a1f;font-weight:800;font-size:13px;margin-top:4px}.card{border:1px solid #e5e7eb;border-radius:18px;margin-top:10px;overflow:hidden;background:#fff}.toggle{width:100%;display:flex;justify-content:space-between;align-items:center;padding:16px;border:0;background:#fafafa;text-align:left;font-size:16px}.toggle span{font-size:22px;color:#ff5a1f}.body{padding:4px 16px 18px;display:grid;gap:10px}.lead{margin:8px 0 0;line-height:1.55}ol{margin:0;padding-left:20px;display:grid;gap:9px;line-height:1.55;font-size:15px}a{color:#ff5a1f;font-weight:800}code{background:#f3f4f6;padding:1px 5px;border-radius:5px;font-size:12.5px}.note{margin:0;font-size:14px;color:#666;background:#fff7ed;padding:12px;border-radius:12px;line-height:1.5}.foot{margin-top:22px;font-size:13px;color:#777;line-height:1.5}`;
