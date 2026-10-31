"use client";
import {useEffect,useMemo,useState} from "react";
import {waNumber} from "../../../lib/sav";

type Ev={at:string;stage:string;note?:string;internal?:string};
type T={public_reference:string;status:string;customer_name:string;customer_email:string;customer_phone:string;vin:string|null;category:string;error_code:string|null;description:string;ai_diagnosis:string|null;attachments:{name:string}[]|null;created_at:string;stage:string;stageLabel:string;events:Ev[]};
type Stage={key:string;label:string};
const fmt=(d:string)=>new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const COLORS:Record<string,string>={received:"#ff6a00",analysing:"#2563eb",waiting_parts:"#a855f7",scheduled:"#0891b2",resolved:"#16a34a"};

export default function SavAdmin(){
 const [code,setCode]=useState("");
 const [authed,setAuthed]=useState(false);
 const [tickets,setTickets]=useState<T[]>([]);
 const [stages,setStages]=useState<Stage[]>([]);
 const [filter,setFilter]=useState<"open"|"all">("open");
 const [open,setOpen]=useState<string|null>(null);
 const [media,setMedia]=useState<Record<string,{name:string;type:string;url:string}[]>>({});
 const [err,setErr]=useState("");
 const [loading,setLoading]=useState(false);

 const call=async(body:object)=>{const r=await fetch("/api/sav/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,...body})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");return j;};
 const load=async(pc=code)=>{setLoading(true);setErr("");try{const r=await fetch("/api/sav/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc,action:"list"})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");setTickets(j.tickets);setStages(j.stages);setAuthed(true);try{sessionStorage.setItem("sav_pc",pc)}catch{}}catch(e){setErr(e instanceof Error?e.message:"Erreur");setAuthed(false)}finally{setLoading(false)}};
 useEffect(()=>{try{const pc=sessionStorage.getItem("sav_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const list=useMemo(()=>tickets.filter(t=>filter==="all"||t.stage!=="resolved"),[tickets,filter]);
 const openCount=tickets.filter(t=>t.stage!=="resolved").length;

 const toggle=async(ref:string)=>{setOpen(open===ref?null:ref);if(!media[ref]){try{const j=await call({action:"media",ref});setMedia(m=>({...m,[ref]:j.media}));}catch{}}};

 if(!authed)return <main className="a"><form className="login" onSubmit={e=>{e.preventDefault();load();}}><h1>Suivi SAV</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code" autoFocus/><button disabled={loading}>{loading?"…":"Entrer"}</button>{err?<p className="e">{err}</p>:null}</form><style jsx>{css}</style></main>;

 return <main className="a">
  <header className="top"><div><h1>Suivi SAV</h1><p>{openCount} demande{openCount>1?"s":""} en cours · {tickets.length} au total</p></div><div className="f"><button className={filter==="open"?"on":""} onClick={()=>setFilter("open")}>En cours</button><button className={filter==="all"?"on":""} onClick={()=>setFilter("all")}>Toutes</button><button onClick={()=>load()}>↻</button></div></header>
  {err?<p className="e">{err}</p>:null}
  {!list.length?<p className="empty">Aucune demande {filter==="open"?"en cours":""}.</p>:null}
  <div className="list">{list.map(t=><article key={t.public_reference} className="t">
   <button className="head" onClick={()=>toggle(t.public_reference)}>
    <span className="badge" style={{background:COLORS[t.stage]||"#666"}}>{t.stageLabel}</span>
    <strong>{t.customer_name}</strong><small>{t.public_reference} · {t.category} · {fmt(t.created_at)}{t.attachments?.length?` · 📎 ${t.attachments.length}`:""}</small>
   </button>
   {open===t.public_reference?<Detail t={t} stages={stages} media={media[t.public_reference]} onSaved={()=>load()} call={call}/>:null}
  </article>)}</div>
  <style jsx>{css}</style>
 </main>;
}

function Detail({t,stages,media,onSaved,call}:{t:T;stages:Stage[];media?:{name:string;type:string;url:string}[];onSaved:()=>void;call:(b:object)=>Promise<{warning?:string|null}>}){
 const [stage,setStage]=useState(t.stage);
 const [note,setNote]=useState("");
 const [internal,setInternal]=useState("");
 const [saving,setSaving]=useState(false);
 const [msg,setMsg]=useState("");
 const first=t.customer_name.split(" ")[0];
 const wa=`https://wa.me/${waNumber(t.customer_phone)}?text=${encodeURIComponent(`Bonjour ${first}, c’est NeoDrive au sujet de votre demande ${t.public_reference}. `)}`;
 const save=async()=>{setSaving(true);setMsg("");try{const j=await call({action:"update",ref:t.public_reference,stage,note,internal});setMsg(j.warning?"Enregistré (statut ERP non modifié : "+j.warning+")":"✅ Enregistré. Le client le voit dans son suivi.");setNote("");setInternal("");onSaved();}catch(e){setMsg(e instanceof Error?e.message:"Erreur")}finally{setSaving(false)}};
 return <div className="d">
  <div className="grid">
   <div><h3>Client</h3><p><b>{t.customer_name}</b><br/>{t.customer_phone}<br/>{t.customer_email}</p><div className="btns"><a className="wa" href={wa} target="_blank" rel="noreferrer">WhatsApp</a><a className="ghost" href={`tel:${t.customer_phone}`}>Appeler</a></div></div>
   <div><h3>Véhicule</h3><p>VIN : {t.vin||"non renseigné"}<br/>Sujet : {t.category}<br/>Code : {t.error_code||"—"}</p></div>
  </div>
  <h3>Description</h3><p className="desc">{t.description}</p>
  {media?.length?<><h3>Photos / vidéos</h3><div className="media">{media.map(m=>m.type.startsWith("video/")?<video key={m.url} src={m.url} controls preload="metadata"/>:<a key={m.url} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={m.name}/></a>)}</div></>:t.attachments?.length?<p className="muted">Chargement des médias…</p>:null}
  {t.ai_diagnosis?<details><summary>Pré-diagnostic automatique</summary><p className="desc">{t.ai_diagnosis}</p></details>:null}
  <h3>Historique</h3><ul className="ev">{[...t.events].reverse().map((e,i)=><li key={i}><small>{fmt(e.at)} · {stages.find(s=>s.key===e.stage)?.label||e.stage}</small>{e.note?<p>💬 {e.note}</p>:null}{e.internal?<p className="int">🔒 {e.internal}</p>:null}</li>)}</ul>
  <h3>Mettre à jour</h3>
  <div className="stg">{stages.map(s=><button key={s.key} type="button" className={stage===s.key?"on":""} onClick={()=>setStage(s.key)}>{s.label}</button>)}</div>
  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Message visible par le client dans son suivi (facultatif)"/>
  <textarea value={internal} onChange={e=>setInternal(e.target.value)} rows={2} placeholder="Note interne, non visible par le client (facultatif)"/>
  <button className="save" disabled={saving} onClick={save}>{saving?"Enregistrement…":"Enregistrer"}</button>{msg?<p className="m">{msg}</p>:null}
 </div>;
}

const css=`.a{max-width:900px;margin:0 auto;padding:24px 14px 80px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111}.login{max-width:360px;margin:60px auto;display:grid;gap:12px;text-align:center}.login h1{margin:0;font-size:32px}.login p{color:#666;margin:0}input,textarea{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}button{font:inherit;cursor:pointer}.login button,.save{padding:14px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:900;font-size:16px}.e{color:#b42318;font-weight:700}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}.top h1{margin:0;font-size:30px;letter-spacing:-1px}.top p{margin:4px 0 0;color:#666}.f{display:flex;gap:6px}.f button{padding:9px 14px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800}.f button.on{background:#111;color:#fff;border-color:#111}.empty{color:#666;text-align:center;padding:40px 0}.list{display:grid;gap:10px}.t{border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;background:#fff}.head{width:100%;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;text-align:left;padding:14px 16px;border:0;background:#fff}.head small{grid-column:2;color:#777;font-size:13px}.badge{grid-row:1/3;color:#fff;font-size:12px;font-weight:900;padding:6px 10px;border-radius:999px;white-space:nowrap}.d{padding:4px 16px 18px;border-top:1px solid #f0f0f0}.d h3{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:18px 0 6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid p{margin:0;line-height:1.6}.btns{display:flex;gap:8px;margin-top:10px}.btns a{padding:10px 14px;border-radius:10px;font-weight:800;text-decoration:none}.wa{background:#25d366;color:#fff}.ghost{border:1px solid #ddd;color:#111}.desc{white-space:pre-line;line-height:1.55;margin:0}.media{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.media img,.media video{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#000}.muted{color:#888}details{margin-top:14px;background:#fff7ed;border-radius:12px;padding:12px}summary{font-weight:800;cursor:pointer}.ev{list-style:none;margin:0;padding:0;display:grid;gap:8px}.ev li{background:#f6f7f8;border-radius:12px;padding:10px 12px}.ev small{color:#777}.ev p{margin:4px 0 0}.int{color:#7a4a12}.stg{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.stg button{padding:9px 12px;border:1px solid #ddd;border-radius:999px;background:#fff;font-weight:800;font-size:14px}.stg button.on{background:#111;color:#fff;border-color:#111}.d textarea{margin-bottom:8px}.save{width:100%}.m{font-weight:700;margin:8px 0 0}@media(max-width:600px){.grid{grid-template-columns:1fr}}`;
