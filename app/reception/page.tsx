"use client";
import {Suspense,useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import s from "./reception.module.css";

type Info={prenom:string;nom:string;modele:string;ville:string;received_at:string|null};
const CHECKS=["Le véhicule est arrivé en bon état, sans dégât visible","Les clés et le chargeur m’ont été remis","On m’a montré la prise en main (démarrage, marche avant / arrière, frein à main)"];

function Reception(){
 const q=useSearchParams();const id=q.get("id")||"",token=q.get("t")||"";
 const [info,setInfo]=useState<Info|null>(null);const [err,setErr]=useState("");const [done,setDone]=useState(false);
 const [checks,setChecks]=useState<boolean[]>(CHECKS.map(()=>false));const [sign,setSign]=useState("");const [note,setNote]=useState("");const [busy,setBusy]=useState(false);
 const call=(body:object)=>fetch("/api/planificateur",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,token,...body})}).then(r=>r.json());
 useEffect(()=>{if(!id||!token){setErr("Lien incomplet. Utilisez le lien envoyé par NeoDrive.");return;}
  call({action:"reception_get"}).then(j=>{if(j.ok){setInfo(j.client);if(j.client.received_at)setDone(true);}else setErr(j.error||"Lien invalide.");}).catch(()=>setErr("Connexion impossible, réessayez."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setErr("");
  try{const j=await call({action:"reception_confirm",signature:sign,accept:checks.every(Boolean),note});if(j.ok)setDone(true);else setErr(j.error||"Erreur");}catch{setErr("Connexion impossible, réessayez.");}finally{setBusy(false);}};

 return <main className={s.page}><div className={s.card}>
  <span className={s.logo}>N</span>
  {err&&!info?<><h1>Accusé de réception</h1><p className={s.err}>{err}</p></>:!info?<p className={s.muted}>Chargement…</p>:done?<>
   <h1>Merci {info.prenom} ! 🎉</h1>
   <p className={s.lead}>La réception de votre <b>{info.modele||"NeoDrive"}</b> est confirmée. Bonne route !</p>
   <div className={s.next}><h2>Dernière étape : la carte grise</h2><p>Remplissez le formulaire carte grise / contrat. Gardez à portée de main le <b>certificat de conformité (COC)</b> remis avec le véhicule : c’est sa carte d’identité, avec le numéro de châssis.</p><a className={s.btn} href="/reservation">Remplir le formulaire carte grise →</a></div>
   <p className={s.muted}>Une question ? Le SAV NeoDrive est là : <a href="/sav">ouvrir une demande</a>.</p>
  </>:<form onSubmit={submit}>
   <h1>Bonjour {info.prenom}, votre NeoDrive est arrivée ?</h1>
   <p className={s.lead}>Confirmez la livraison de votre <b>{info.modele||"NeoDrive"}</b> à {info.ville}. Cela prend 1 minute.</p>
   <ul className={s.checks}>{CHECKS.map((c,i)=><li key={i}><label><input type="checkbox" checked={checks[i]} onChange={()=>setChecks(v=>v.map((x,k)=>k===i?!x:x))}/><span>{c}</span></label></li>)}</ul>
   <label className={s.field}><span>Une remarque ? (facultatif)</span><textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex. : petite rayure sur le pare-choc arrière"/></label>
   <label className={s.field}><span>Signature : tapez votre prénom et nom</span><input value={sign} onChange={e=>setSign(e.target.value)} placeholder={`${info.prenom} ${info.nom}`} autoComplete="name"/></label>
   {err?<p className={s.err}>{err}</p>:null}
   <button className={s.btn} disabled={busy||!checks.every(Boolean)||sign.trim().length<3}>{busy?"Envoi…":"Je confirme la réception"}</button>
   <p className={s.muted}>Un souci avec le véhicule ? Ne cochez pas, écrivez-le en remarque ou contactez le <a href="/sav">SAV</a>.</p>
  </form>}
 </div></main>;
}
export default function Page(){return <Suspense fallback={null}><Reception/></Suspense>;}
