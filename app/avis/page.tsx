"use client";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
import {GOOGLE_WRITE_REVIEW_URL,reviewMessage} from "../../lib/reviews";
import {waNumber} from "../../lib/sav";

type Row={vehicle_id:string;name:string;phone:string;delivered_at:string;city:string;requested:boolean;wa:string};

export default function Avis(){
 const [qr,setQr]=useState("");
 const [code,setCode]=useState("");
 const [rows,setRows]=useState<Row[]|null>(null);
 const [err,setErr]=useState("");
 const [first,setFirst]=useState("");
 const [phone,setPhone]=useState("");
 useEffect(()=>{QRCode.toDataURL(GOOGLE_WRITE_REVIEW_URL,{width:560,margin:1,color:{dark:"#111111",light:"#ffffff"}}).then(setQr).catch(()=>{});
  try{const pc=sessionStorage.getItem("nd_pc");if(pc){setCode(pc);load(pc);}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const load=async(pc=code)=>{setErr("");try{const r=await fetch("/api/avis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:pc})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Erreur");setRows(j.rows);try{sessionStorage.setItem("nd_pc",pc)}catch{}}catch(e){setErr((e as Error).message)}};
 const mark=async(id:string)=>{await fetch("/api/avis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:code,action:"mark",vehicleId:id})}).catch(()=>null);setRows(r=>r?r.map(x=>x.vehicle_id===id?{...x,requested:true}:x):r);};
 const manual=phone.replace(/\D/g,"").length>=9?`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(reviewMessage(first))}`:"";

 return <main className="a">
  <section className="qrCard">
   <span className="logo">N</span>
   <h1>Votre avis compte !</h1>
   <p>Scannez avec l’appareil photo de votre téléphone pour laisser un avis Google sur NeoDrive.</p>
   {qr?<img src={qr} alt="QR code vers la page d’avis Google NeoDrive"/>:<div className="ph"/>}
   <div className="stars">★★★★★</div>
   <a className="go" href={GOOGLE_WRITE_REVIEW_URL} target="_blank" rel="noreferrer">Laisser un avis sur Google</a>
   <small>Merci, ça aide énormément une jeune marque française 🙏</small>
  </section>

  <section className="owner">
   <h2>Espace NeoDrive</h2>
   <div className="box"><b>Envoyer la demande d’avis par WhatsApp</b><p>Message déjà écrit, il suffit d’envoyer.</p>
    <div className="row"><input value={first} onChange={e=>setFirst(e.target.value)} placeholder="Prénom du client"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone" inputMode="tel"/></div>
    <a className={manual?"wa":"wa off"} href={manual||undefined} target="_blank" rel="noreferrer">Ouvrir WhatsApp</a></div>
   {rows===null?<form className="box" onSubmit={e=>{e.preventDefault();load();}}><b>Mes livraisons récentes</b><p>Code ERP pour voir les clients livrés ces 30 derniers jours.</p><div className="row"><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code"/><button>Voir</button></div>{err?<p className="e">{err}</p>:null}</form>
   :<div className="box"><b>Livraisons des 30 derniers jours</b>{!rows.length?<p>Aucune livraison marquée « livrée » dans le stock ce mois-ci. Utilisez l’envoi manuel ci-dessus.</p>:null}
    <ul>{rows.map(r=><li key={r.vehicle_id}><div><b>{r.name}</b><small>{new Date(r.delivered_at).toLocaleDateString("fr-FR")}{r.city?` · ${r.city}`:""}</small></div>{r.requested?<span className="done">✓ Demandé</span>:r.wa?<a className="wa sm" href={r.wa} target="_blank" rel="noreferrer" onClick={()=>mark(r.vehicle_id)}>Demander l’avis</a>:<span className="muted">Pas de téléphone</span>}</li>)}</ul></div>}
   <p className="note">Chaque jour à 18 h, vous recevez aussi par e-mail la liste des clients livrés récemment, avec le message prêt.</p>
  </section>
  <style jsx>{`
   .a{max-width:560px;margin:0 auto;padding:22px 14px 70px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111}
   .qrCard{text-align:center;background:#fff;border:1px solid #eee;border-radius:28px;padding:28px 20px;box-shadow:0 20px 50px rgba(0,0,0,.08)}
   .logo{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;font-weight:950;font-size:28px}
   h1{font-size:34px;letter-spacing:-1.2px;margin:12px 0 6px}
   .qrCard p{color:#555;line-height:1.5;margin:0 auto 16px;max-width:380px}
   .qrCard img,.ph{width:min(280px,80vw);aspect-ratio:1;border-radius:18px;border:1px solid #eee;padding:10px;background:#fff}
   .stars{color:#fbbc04;font-size:30px;letter-spacing:4px;margin:10px 0}
   .go{display:block;background:#111;color:#fff;text-decoration:none;font-weight:900;padding:16px;border-radius:14px;font-size:17px}
   .qrCard small{display:block;margin-top:12px;color:#777}
   .owner{margin-top:34px}.owner h2{font-size:20px;margin:0 0 10px}
   .box{border:1px solid #e5e7eb;border-radius:18px;padding:16px;margin-bottom:12px;background:#fff}
   .box p{margin:4px 0 10px;color:#666;font-size:14px}
   .row{display:flex;gap:8px}
   input{flex:1;min-width:0;padding:12px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px}
   button{padding:12px 16px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:900;font:inherit}
   .wa{display:block;margin-top:10px;text-align:center;background:#25d366;color:#fff;text-decoration:none;font-weight:900;padding:13px;border-radius:12px}
   .wa.off{opacity:.4;pointer-events:none}
   .wa.sm{display:inline-block;margin:0;padding:9px 12px;font-size:14px}
   ul{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:8px}
   li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#f6f7f8}
   li small{display:block;color:#777;font-size:12.5px}
   .done{color:#16a34a;font-weight:800;font-size:14px}.muted{color:#999;font-size:13px}
   .e{color:#b42318;font-weight:700}.note{font-size:13px;color:#777;line-height:1.5}
  `}</style>
 </main>;
}
