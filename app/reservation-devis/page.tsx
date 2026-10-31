"use client";
import {useMemo,useState} from "react";
import {VEHICLES,calculateQuote,type VehicleKey} from "../../lib/neodrive-pricing";
const euro=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
export default function ReservationDevis(){
 const [model,setModel]=useState<VehicleKey>("confort");
 const [postal,setPostal]=useState("");
 const [registration,setRegistration]=useState(false);
 const [customer,setCustomer]=useState({nom:"",prenom:"",email:"",telephone:"",adresse:"",ville:"",societe:""});
 const [accepted,setAccepted]=useState(false);
 const [signed,setSigned]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const quote=useMemo(()=>calculateQuote(model,postal,registration),[model,postal,registration]);
 const valid=quote.total!==null && accepted && signed.trim().length>=3 && customer.nom && customer.prenom && customer.email && customer.adresse && customer.ville;
 const field=(name:keyof typeof customer,label:string,required=true)=><label style={{display:"grid",gap:5}}>{label}<input required={required} value={customer[name]} onChange={e=>setCustomer(p=>({...p,[name]:e.target.value}))} style={input}/></label>;
 return <main style={{maxWidth:840,margin:"30px auto",padding:20,fontFamily:"Arial,sans-serif",color:"#20242a"}}>
 <h1>Réserver votre NeoDrive</h1><p style={{background:"#fff3d6",padding:14,borderRadius:8}}><strong>Version de démonstration :</strong> vérifiez les tarifs et la présentation. Aucune réservation réelle ni signature juridiquement validée ne sera enregistrée depuis cette page pour le moment.</p><p>Devis récapitulatif et réservation sans acompte. Paiement à la livraison.</p>
 <form action="https://formspree.io/f/xjgjrqqg" method="POST" onSubmit={e=>{if(!valid){e.preventDefault();return;}setConfirmed(true)}}>
 <section style={panel}><h2>1. Votre véhicule</h2><label>Modèle<select style={input} value={model} onChange={e=>setModel(e.target.value as VehicleKey)}>{Object.entries(VEHICLES).map(([key,v])=><option key={key} value={key}>{v.label} — {euro(v.price)}</option>)}</select></label>
 <label style={{display:"block",marginTop:14}}>Code postal de livraison<input style={input} inputMode="numeric" maxLength={5} pattern="[0-9]{5}" required value={postal} onChange={e=>setPostal(e.target.value.replace(/\\D/g,"").slice(0,5))} placeholder="Ex. 31000"/></label>
 <label style={{display:"block",marginTop:12}}><input type="checkbox" checked={registration} onChange={e=>setRegistration(e.target.checked)}/> Ajouter les formalités carte grise ({euro(150)})</label>
 {quote.delivery.status==="manual"&&postal.length===5?<p role="status" style={{color:"#a34b00"}}>{quote.delivery.reason}. Contactez NeoDrive pour confirmer les frais de livraison avant signature.</p>:null}
 </section>
 <section style={panel}><h2>2. Vos coordonnées</h2><div style={grid}>{field("nom","Nom")}{field("prenom","Prénom")}{field("email","E-mail")}{field("telephone","Téléphone")}{field("societe","Société (facultatif)",false)}{field("adresse","Adresse de livraison")}{field("ville","Ville")}</div></section>
 <section style={panel}><h2>3. Votre devis</h2><div id="devis-neodrive" style={{background:"#fff",border:"1px solid #ddd",padding:24}}>
 <h2>NEODRIVE — DEVIS DE RÉSERVATION</h2><p>Établi le {new Date().toLocaleDateString("fr-FR")}</p>
 <p>Client : {customer.prenom} {customer.nom} {customer.societe&&"— "+customer.societe}<br/>Adresse : {customer.adresse}, {postal} {customer.ville}</p>
 <hr/><p>{VEHICLES[model].label} : <strong>{euro(quote.vehiclePrice)}</strong></p>
 <p>Livraison ({postal||"code postal à saisir"}) : <strong>{quote.delivery.status==="estimated"?euro(quote.delivery.price):"À confirmer"}</strong></p>
 <p>Formalités carte grise : {euro(quote.registrationPrice)}</p><hr/>
 <h2>Total TTC : {quote.total===null?"À confirmer":euro(quote.total)}</h2>
 <p>Règlement à la livraison, sans acompte. Date de livraison à confirmer selon les tournées. Devis sous réserve de disponibilité du véhicule et de confirmation par NeoDrive.</p>
 <p>Signature du client : {signed||"_________________"}</p>
 </div>
 <p style={{fontSize:13}}>La saisie du nom ci-dessous constitue une demande de signature électronique simple ; un mécanisme de preuve et d'archivage devra être validé avant utilisation contractuelle en production.</p>
 <label>Nom et prénom pour signature<input style={input} value={signed} onChange={e=>setSigned(e.target.value)} required/></label>
 <label style={{display:"block",marginTop:14}}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/> J'accepte le devis et reconnais avoir pris connaissance des conditions de vente applicables.</label>
 <input type="hidden" name="type_dossier" value="reservation_devis"/><input type="hidden" name="modele" value={VEHICLES[model].label}/><input type="hidden" name="code_postal" value={postal}/><input type="hidden" name="livraison" value={quote.delivery.status==="estimated"?String(quote.delivery.price):"SUR DEVIS"}/><input type="hidden" name="total_ttc" value={quote.total===null?"SUR DEVIS":String(quote.total)}/><input type="hidden" name="carte_grise" value={String(quote.registrationPrice)}/><input type="hidden" name="signature_nom" value={signed}/><input type="hidden" name="signature_date" value={new Date().toISOString()}/>{Object.entries(customer).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}
 <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18}}><button type="button" onClick={()=>window.print()} style={button}>Imprimer / enregistrer en PDF</button><button type="submit" disabled={true} style={{...button,background:valid?"#ed5b2a":"#999"}}>Envoi désactivé pendant les tests</button></div>
 {confirmed&&<p>Transmission du formulaire en cours…</p>}
 </section></form>
 <style jsx global>{`@media print{header,footer,nav,button{display:none!important}body *{visibility:hidden}#devis-neodrive,#devis-neodrive *{visibility:visible}#devis-neodrive{position:absolute;left:0;top:0;width:100%;border:0}}`}</style>
 </main>;
}
const input:React.CSSProperties={display:"block",width:"100%",padding:11,border:"1px solid #bbb",borderRadius:8,marginTop:5};
const panel:React.CSSProperties={background:"#f8f9fa",padding:24,borderRadius:15,marginTop:20};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:15};
const button:React.CSSProperties={border:0,background:"#222",color:"white",padding:"13px 17px",borderRadius:9,cursor:"pointer"};
