"use client";
import {useMemo,useState,useEffect} from "react";
import {VEHICLES,REGISTRATION_PRICE,calculateQuote,type VehicleKey} from "../../lib/neodrive-pricing";
import s from "./reservation.module.css";

const euro=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const WHATSAPP="https://wa.me/33628261446?text="+encodeURIComponent("Bonjour, j'ai une question sur la réservation de ma NeoDrive.");

const MODELS:Record<VehicleKey,{img:string;tagline:string;badge?:string}>={
 essentielle:{img:"/reservation/essentielle.svg",tagline:"L’essentiel au meilleur prix"},
 confort:{img:"/reservation/confort.svg",tagline:"Le meilleur équilibre",badge:"Le plus équilibré"},
 confortPlus:{img:"/reservation/confort-plus.svg",tagline:"Tout le confort"},
};

const Icon={
 truck:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>,
 shield:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"/></svg>,
 wallet:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/></svg>,
 doc:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/></svg>,
 pin:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>,
 user:<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>,
 pen:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>,
 check:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>,
 chat:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l1.3-3.6A7.8 7.8 0 1112 20a8 8 0 01-3.9-1z"/></svg>,
 download:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>,
 lock:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>,
};

export default function ReservationDevis(){
 const [model,setModel]=useState<VehicleKey>("confort");
 const [postal,setPostal]=useState("");
 const registration=true;
 const [customer,setCustomer]=useState({nom:"",prenom:"",email:"",telephone:"",adresse:"",ville:"",societe:""});
 const [accepted,setAccepted]=useState(false);
 const [signed,setSigned]=useState("");
 const [sending,setSending]=useState(false);
 const [sent,setSent]=useState(false);
 const [sendError,setSendError]=useState("");
 const [postalVerified,setPostalVerified]=useState(false);
 const [postalCities,setPostalCities]=useState<string[]>([]);
 const [postalLoading,setPostalLoading]=useState(false);
 useEffect(()=>{
  setPostalVerified(false);setPostalCities([]);
  if(!/^[0-9]{5}$/.test(postal))return;
  const controller=new AbortController();setPostalLoading(true);
  fetch("https://geo.api.gouv.fr/communes?codePostal="+postal+"&fields=nom&format=json",{signal:controller.signal})
   .then(r=>r.ok?r.json():[])
   .then(d=>{if(controller.signal.aborted)return;const cities=Array.isArray(d)?d.map((c:{nom:string})=>c.nom):[];setPostalVerified(cities.length>0);setPostalCities(cities);if(cities.length===1)setCustomer(p=>p.ville?p:{...p,ville:cities[0]});})
   .catch(()=>{})
   .finally(()=>{if(!controller.signal.aborted)setPostalLoading(false)});
  return ()=>controller.abort();
 },[postal]);
 useEffect(()=>{try{const m=new URLSearchParams(window.location.search).get("modele");if(m&&m in VEHICLES)setModel(m as VehicleKey);}catch{}},[]);
 const quote=useMemo(()=>calculateQuote(model,postal,registration),[model,postal,registration]);
 const normalizeCity=(v:string)=>v.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
 const cityMatches=postalCities.some(city=>normalizeCity(city)===normalizeCity(customer.ville));
 const contactDone=!!(customer.nom&&customer.prenom&&customer.email&&customer.adresse&&customer.ville);
 const valid=postalVerified&&cityMatches&&quote.total!==null&&accepted&&signed.trim().length>=3&&customer.nom&&customer.prenom&&customer.email&&customer.adresse&&customer.ville;

 const missing:string[]=[];
 if(!postalVerified)missing.push("un code postal de livraison valide");
 else if(quote.total===null)missing.push("un tarif de livraison (zone sur devis : contactez-nous)");
 if(!contactDone)missing.push("vos coordonnées complètes");
 else if(postalVerified&&!cityMatches)missing.push("une ville correspondant au code postal");
 if(signed.trim().length<3)missing.push("votre nom de signataire");
 if(!accepted)missing.push("la case de confirmation");

 const deliveryLabel=quote.delivery.status==="estimated"?euro(quote.delivery.price):postal.length===5?"Sur devis":"—";
 const stepState=[true,postalVerified&&contactDone,!!valid];

 const makePdf=async()=>{
  const {jsPDF}=await import("jspdf");
  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const W=210, margin=17, right=193;
  const text=(value:string,x:number,y:number,max=176)=>pdf.text(value,x,y,{maxWidth:max});
  pdf.setFillColor(248,250,253);pdf.rect(0,0,W,297,"F");
  pdf.setFillColor(255,255,255);pdf.roundedRect(11,12,188,272,5,5,"F");
  pdf.setFillColor(232,89,42);pdf.roundedRect(17,18,17,17,4,4,"F");
  pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.setFontSize(19);text("N",22,30);
  pdf.setTextColor(30,40,59);pdf.setFontSize(20);text("NeoDrive",40,29);
  pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.setTextColor(100,112,128);text("Mobilité électrique accessible",40,35);
  pdf.setDrawColor(234,236,242);pdf.line(margin,43,right,43);
  pdf.setFont("helvetica","bold");pdf.setFontSize(17);pdf.setTextColor(25,36,53);text("DEVIS DE RÉSERVATION",margin,55);
  pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor(92,102,115);text("Date : "+new Date().toLocaleDateString("fr-FR"),margin,64);
  pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(38,48,64);text("VENDEUR",margin,78);text("CLIENT",111,78);
  pdf.setFont("helvetica","normal");pdf.setFontSize(10);
  text("MK HOLDING SAS - NeoDrive",margin,85,87);text("SIREN 908 645 393",margin,91,87);
  text(customer.prenom+" "+customer.nom,111,85,78);
  const addressLines=pdf.splitTextToSize(customer.adresse+", "+postal+" "+customer.ville,78);
  pdf.text(addressLines,111,91);
  pdf.text([customer.email,customer.telephone].filter(Boolean).join(" · "),111,91+addressLines.length*5,{maxWidth:78});
  pdf.setFillColor(246,248,252);pdf.roundedRect(margin,114,176,61,3,3,"F");
  pdf.setFont("helvetica","bold");pdf.setTextColor(33,45,62);pdf.setFontSize(11);text("DÉTAIL DE VOTRE RÉSERVATION",22,123);
  const row=(label:string,amount:string,y:number)=>{pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor(58,68,82);text(label,22,y,115);pdf.setFont("helvetica","bold");pdf.setTextColor(28,40,58);pdf.text(amount,187,y,{align:"right"});};
  const amount=(n:number)=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(n).replace(/[\u202f\u00a0]/g," ")+" €";
  row(VEHICLES[model].label,amount(quote.vehiclePrice),136);
  row("Livraison à votre porte ("+postal+")",quote.delivery.status==="estimated"?amount(quote.delivery.price):"Sur devis",148);
  row("Formalités carte grise",amount(quote.registrationPrice),160);
  pdf.setFillColor(22,32,46);pdf.roundedRect(margin,183,176,22,3,3,"F");
  pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.setTextColor(255,255,255);text("TOTAL TTC",22,197);
  pdf.setFontSize(18);pdf.text(quote.total===null?"Sur devis":amount(quote.total),187,197,{align:"right"});
  pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(45,55,72);text("MODALITÉS",margin,219);
  pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.setTextColor(88,97,109);
  pdf.text(pdf.splitTextToSize("Paiement à la livraison, sans acompte. Livraison à domicile par transport sécurisé. Date de livraison selon les tournées et la disponibilité du véhicule. Toute modification du prix exige l'accord du client.",170),margin,226);
  pdf.setDrawColor(226,229,234);pdf.line(margin,247,right,247);
  pdf.setFont("helvetica","bold");pdf.setTextColor(35,45,60);pdf.setFontSize(10);text("ACCORD DU CLIENT",margin,256);
  pdf.setFont("helvetica","normal");pdf.setFontSize(11);text(signed||"Signature non renseignée",margin,264);
  pdf.setFontSize(8);pdf.setTextColor(112,119,128);text("Acceptation électronique simple - "+new Date().toLocaleString("fr-FR"),margin,271);
  return pdf;
 };
 const downloadPdf=async()=>{(await makePdf()).save("devis-neodrive.pdf")};
 const sendReservation=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!valid||sending)return;setSending(true);setSendError("");
  try{
   const pdf=await makePdf();const data=new FormData();
   Object.entries(customer).forEach(([k,v])=>data.append(k,v));
   data.append("_subject","Reservation NeoDrive "+customer.nom+" "+postal);
   data.append("modele",VEHICLES[model].label);
   data.append("code_postal",postal);
   data.append("prix_vehicule",String(quote.vehiclePrice));
   data.append("livraison",quote.delivery.status==="estimated"?String(quote.delivery.price):"sur devis");
   data.append("carte_grise",String(quote.registrationPrice));
   data.append("total_ttc",String(quote.total));
   data.append("signature",signed);
   data.append("signature_date",new Date().toISOString());
   data.append("acceptation","oui");
   data.append("devis_pdf",new File([pdf.output("blob")],"devis-neodrive.pdf",{type:"application/pdf"}));
   const response=await fetch("https://formspree.io/f/xjgjrqqg",{method:"POST",body:data,headers:{Accept:"application/json"}});
   if(!response.ok)throw new Error("La transmission a échoué. Réessayez ou contactez NeoDrive.");
   setSent(true);
   if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){setSendError(e instanceof Error?e.message:"Erreur d'envoi");}
  finally{setSending(false)}
 };

 type FieldName=keyof typeof customer;
 const field=(name:FieldName,label:string,opts:{required?:boolean;type?:string;autoComplete?:string;wide?:boolean;placeholder?:string;list?:string;inputMode?:"text"|"tel"|"email"}={})=>{
  const {required=true,type="text",autoComplete,wide,placeholder,list,inputMode}=opts;
  const filled=!!customer[name].trim();
  return <label className={`${s.field} ${wide?s.wide:""}`}>
   <span>{label}{!required?<em> · facultatif</em>:null}</span>
   <span className={s.inputWrap}>
    <input required={required} type={type} autoComplete={autoComplete} placeholder={placeholder} list={list} inputMode={inputMode} value={customer[name]} onChange={e=>setCustomer(p=>({...p,[name]:e.target.value}))}/>
    {filled&&required?<i className={s.ok}>{Icon.check}</i>:null}
   </span>
  </label>;
 };

 const summary=<div className={s.summary}>
  <div className={s.summaryHead}><img src={MODELS[model].img} alt=""/><div><small>Votre sélection</small><strong>{VEHICLES[model].label}</strong></div></div>
  <dl>
   <div><dt>Véhicule</dt><dd>{euro(quote.vehiclePrice)}</dd></div>
   <div><dt>Livraison à domicile{quote.delivery.status==="estimated"?<small> · {postal}</small>:null}</dt><dd className={quote.delivery.status==="estimated"?"":s.muted}>{deliveryLabel}</dd></div>
   <div><dt>Carte grise (formalités)</dt><dd>{euro(REGISTRATION_PRICE)}</dd></div>
  </dl>
  <div className={s.summaryTotal}><span>Total TTC</span>{quote.total===null?<em>{postal.length===5?"Sur devis":"Saisissez votre code postal pour voir le prix livré"}</em>:<strong>{euro(quote.total)}</strong>}</div>
  <ul className={s.summaryPerks}>
   <li>{Icon.check} 0 € à payer aujourd’hui</li>
   <li>{Icon.check} Paiement à la livraison</li>
   <li>{Icon.check} Garantie 2 ans selon conditions</li>
  </ul>
 </div>;

 if(sent){
  return <main className={s.page}><section className={s.successCard}>
   <div className={s.successIcon}>{Icon.check}</div>
   <h1>Merci {customer.prenom}, votre demande est bien envoyée&nbsp;!</h1>
   <p>Nous avons reçu votre devis signé pour une <b>{VEHICLES[model].label}</b> livrée à <b>{customer.ville} ({postal})</b>. Un conseiller NeoDrive vous recontacte pour confirmer la disponibilité et la date de livraison.</p>
   <div className={s.successTotal}><span>Total TTC de votre devis</span><strong>{quote.total===null?"Sur devis":euro(quote.total)}</strong><small>Aucun acompte · paiement à la livraison</small></div>
   <div className={s.successActions}>
    <button type="button" className={s.btnGhost} onClick={downloadPdf}>{Icon.download} Télécharger mon devis PDF</button>
    <a className={s.btnWhatsapp} href={WHATSAPP} target="_blank" rel="noreferrer">{Icon.chat} Une question ? WhatsApp</a>
   </div>
  </section></main>;
 }

 return <main className={s.page}>
  {/* HERO */}
  <section className={s.hero}>
   <div className={s.heroCopy}>
    <span className={s.kicker}><i/> Réservation en ligne · 100 % électrique</span>
    <h1>Votre NeoDrive,<br/><span>livrée devant chez vous.</span></h1>
    <p>Choisissez votre version, obtenez votre prix livré en direct et réservez en 3 minutes. <b>Aucun acompte&nbsp;:</b> vous payez tout le jour de la livraison.</p>
    <div className={s.heroPrice}><small>À partir de</small><strong>{euro(VEHICLES.essentielle.price)}</strong><span>TTC</span></div>
    <div className={s.heroCtas}>
     <a href="#configurer" className={s.btnPrimary}>Calculer mon prix livré</a>
     <a href={WHATSAPP} target="_blank" rel="noreferrer" className={s.btnLink}>{Icon.chat} Parler à un conseiller</a>
    </div>
   </div>
   <figure className={s.heroMedia}>
    <picture>
     <img src="/reservation/neodrive-jardin-mobile.webp" alt="NeoDrive Confort grise garée dans un jardin ensoleillé" fetchPriority="high"/>
    </picture>
    <figcaption><i/> NeoDrive Confort · véhicule réel</figcaption>
    <div className={s.heroFloat}><span className={s.heroFloatIcon}>{Icon.wallet}</span><div><strong>0 € aujourd’hui</strong><small>Paiement à la livraison</small></div></div>
   </figure>
  </section>

  <ul className={s.trust}>
   <li><span>{Icon.truck}</span><div><b>Livraison à domicile</b><small>Transport sécurisé en France</small></div></li>
   <li><span>{Icon.wallet}</span><div><b>Sans acompte</b><small>Vous payez à la livraison</small></div></li>
   <li><span>{Icon.shield}</span><div><b>Garantie 2 ans</b><small>Selon conditions de garantie</small></div></li>
   <li><span>{Icon.doc}</span><div><b>Carte grise gérée</b><small>Formalités {euro(REGISTRATION_PRICE)}</small></div></li>
  </ul>

  <div className={s.layout} id="configurer">
   <form onSubmit={sendReservation} className={s.form}>
    <ol className={s.progress} aria-label="Étapes de réservation">
     {["Votre NeoDrive","Livraison & coordonnées","Devis & signature"].map((t,i)=><li key={t} className={stepState[i]?s.done:""}><b>{stepState[i]&&i<2?Icon.check:i+1}</b><span>{t}</span></li>)}
    </ol>

    {/* STEP 1 */}
    <section className={s.card}>
     <header className={s.cardHead}><span className={s.stepNum}>1</span><div><h2>Choisissez votre version</h2><p>Même carrosserie, trois niveaux d’équipement.</p></div></header>
     <div className={s.models} role="radiogroup" aria-label="Version du véhicule">
      {(Object.keys(VEHICLES) as VehicleKey[]).map(key=>{const v=VEHICLES[key];const m=MODELS[key];const on=model===key;return <button type="button" role="radio" aria-checked={on} key={key} onClick={()=>setModel(key)} className={`${s.model} ${on?s.modelOn:""}`}>
       {m.badge?<span className={s.badge}>{m.badge}</span>:null}
       <span className={s.radio}>{on?Icon.check:null}</span>
       <img src={m.img} alt=""/>
       <strong>{v.label.replace("NeoDrive ","")}</strong>
       <small>{m.tagline}</small>
       <b>{euro(v.price)}<em> TTC</em></b>
      </button>})}
     </div>
     <a className={s.seeCar} href="/produit">Voir les photos et équipements du véhicule →</a>
    </section>

    {/* STEP 2 */}
    <section className={s.card}>
     <header className={s.cardHead}><span className={s.stepNum}>2</span><div><h2>Où livrons-nous votre NeoDrive&nbsp;?</h2><p>Le prix de livraison s’affiche instantanément.</p></div></header>
     <div className={s.postalRow}>
      <label className={s.field}><span>Code postal de livraison</span>
       <span className={s.inputWrap}><i className={s.inputIcon}>{Icon.pin}</i><input className={s.withIcon} inputMode="numeric" autoComplete="postal-code" maxLength={5} pattern="[0-9]{5}" required value={postal} onChange={e=>setPostal(e.target.value.replace(/[^0-9]/g,"").slice(0,5))} placeholder="Ex. 31600"/>{postalVerified?<i className={s.ok}>{Icon.check}</i>:null}</span>
      </label>
      <div className={`${s.deliveryBox} ${quote.delivery.status==="estimated"?s.deliveryOk:""}`} aria-live="polite">
       <small>Livraison à votre porte</small>
       <strong>{postal.length<5?"—":postalLoading?"Calcul…":quote.delivery.status==="estimated"?euro(quote.delivery.price):"Sur devis"}</strong>
       <span>{postal.length<5?"Saisissez vos 5 chiffres":quote.delivery.status==="estimated"?(postalVerified?postalCities.slice(0,2).join(", ")+(postalCities.length>2?"…":""):"Tarif forfaitaire de la zone"):"Tarif personnalisé avant confirmation"}</span>
      </div>
     </div>
     {quote.delivery.status==="manual"&&postal.length===5?<p className={s.note}>{quote.delivery.reason}. Nous vous communiquerons un tarif personnalisé avant toute confirmation — ou <a href={WHATSAPP} target="_blank" rel="noreferrer">demandez-le sur WhatsApp</a>.</p>:null}
     {postal.length===5&&!postalLoading&&!postalVerified&&quote.delivery.status==="estimated"?<p className={s.note}>Nous ne trouvons pas ce code postal. Vérifiez-le pour continuer.</p>:null}

     <div className={s.subHead}><i>{Icon.user}</i><div><h3>Vos coordonnées</h3><p>Pour établir votre devis nominatif.</p></div></div>
     <div className={s.fields}>
      {field("prenom","Prénom",{autoComplete:"given-name"})}
      {field("nom","Nom",{autoComplete:"family-name"})}
      {field("email","E-mail",{type:"email",autoComplete:"email",inputMode:"email",placeholder:"vous@exemple.fr"})}
      {field("telephone","Téléphone",{type:"tel",autoComplete:"tel",inputMode:"tel",placeholder:"06 12 34 56 78"})}
      {field("adresse","Adresse de livraison",{autoComplete:"street-address",wide:true,placeholder:"N° et rue"})}
      {field("ville","Ville",{autoComplete:"address-level2",list:"rd-cities"})}
      {field("societe","Entreprise",{required:false,autoComplete:"organization"})}
     </div>
     <datalist id="rd-cities">{postalCities.map(c=><option key={c} value={c}/>)}</datalist>
     {postalVerified&&customer.ville&&!cityMatches?<p className={s.note}>La ville ne correspond pas au code postal {postal}. Communes possibles&nbsp;: {postalCities.slice(0,6).join(", ")}.</p>:null}
    </section>

    {/* STEP 3 */}
    <section className={s.card} id="devis">
     <header className={s.cardHead}><span className={s.stepNum}>3</span><div><h2>Votre devis de réservation</h2><p>Vérifiez, signez, c’est réservé.</p></div></header>
     <article className={s.quote}>
      <div className={s.quoteHeader}>
       <div className={s.quoteBrand}><span>N</span><div><strong>NeoDrive</strong><small>MK HOLDING SAS · SIREN 908 645 393</small></div></div>
       <div className={s.quoteTitle}>Devis de réservation<small>Établi le {new Date().toLocaleDateString("fr-FR")}</small></div>
      </div>
      <div className={s.quoteClient}><small>Client</small><strong>{(customer.prenom||customer.nom)?`${customer.prenom} ${customer.nom}`:"Prénom Nom"}</strong>{customer.societe?<span>{customer.societe}</span>:null}<span>{customer.adresse||"Adresse de livraison"}</span><span>{postal||"Code postal"} {customer.ville||"Ville"}</span></div>
      <div className={s.quoteRows}>
       <div><span>{VEHICLES[model].label}</span><strong>{euro(quote.vehiclePrice)}</strong></div>
       <div><span>Livraison à domicile{postal?` · ${postal}`:""}</span><strong>{quote.delivery.status==="estimated"?euro(quote.delivery.price):"À confirmer"}</strong></div>
       <div><span>Formalités carte grise {registration?"incluses":"non demandées"}</span><strong>{euro(quote.registrationPrice)}</strong></div>
      </div>
      <div className={s.quoteTotal}><span>Total TTC{quote.total===null?" à confirmer":""}<small>Aucun acompte · payable à la livraison</small></span><strong>{quote.total===null?"Sur devis":euro(quote.total)}</strong></div>
      <details className={s.terms}><summary>Conditions essentielles</summary><p>Aucun acompte demandé. Paiement à la livraison selon les modalités convenues. Délai et disponibilité à confirmer par NeoDrive. Le tarif de livraison est calculé pour le code postal renseigné selon notre barème ; tout changement du montant nécessitera votre accord. Les conditions générales de vente et les informations légales applicables doivent être remises au client avant conclusion du contrat.</p></details>
      <div className={s.quoteSign}><small>Accord du client</small><strong className={signed?s.signature:""}>{signed||"Votre signature apparaîtra ici"}</strong></div>
     </article>

     <label className={`${s.field} ${s.signField}`}><span>{Icon.pen} Signez en tapant votre nom et prénom</span><span className={s.inputWrap}><input value={signed} onChange={e=>setSigned(e.target.value)} placeholder="Ex. Marie Dupont" autoComplete="name" required/></span></label>
     <label className={s.check}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>J’ai vérifié les informations du devis et je souhaite réserver ce véhicule. Je ne paie rien aujourd’hui.</span></label>

     <div className={s.actions}>
      <button type="submit" disabled={!valid||sending} className={s.btnPrimary}>{sending?"Envoi en cours…":<>{Icon.lock} Réserver ma NeoDrive</>}</button>
      <button type="button" onClick={downloadPdf} className={s.btnGhost}>{Icon.download} Télécharger le devis PDF</button>
     </div>
     {!valid&&missing.length?<p className={s.missing}>Pour réserver, il manque&nbsp;: {missing.join(", ")}.</p>:null}
     {sendError?<p role="alert" className={s.error}>{sendError}</p>:null}
     <p className={s.legal}>Signature électronique simple par saisie du nom et acceptation. NeoDrive vous recontacte ensuite pour confirmer la disponibilité et la date de livraison.</p>
    </section>
   </form>

   <aside className={s.aside}>
    {summary}
    <a className={s.help} href={WHATSAPP} target="_blank" rel="noreferrer"><span>{Icon.chat}</span><div><b>Une question avant de réserver&nbsp;?</b><small>Un conseiller vous répond sur WhatsApp</small></div></a>
   </aside>
  </div>

  {/* PREUVE LOGISTIQUE */}
  <section className={s.story}>
   <div className={s.storyPhotos}>
    <img src="/neodrive-switch/photos/confort-transport-dechargement.jpg" alt="Véhicules NeoDrive sur le camion de transport" loading="lazy"/>
    <img src="/neodrive-switch/photos/confort-interieur-large.jpg" alt="Intérieur réel de la NeoDrive Confort" loading="lazy"/>
   </div>
   <div className={s.storyCopy}>
    <span className={s.eyebrow}>Comment se passe la livraison</span>
    <h2>De notre stock jusqu’à votre porte</h2>
    <ol>
     <li><b>Vous réservez en ligne</b><span>Devis signé en quelques minutes, sans rien payer.</span></li>
     <li><b>Nous vous appelons</b><span>Confirmation de la disponibilité et de la date de livraison.</span></li>
     <li><b>Livraison par transporteur</b><span>Votre NeoDrive arrive chez vous sur camion sécurisé.</span></li>
     <li><b>Vous payez à la livraison</b><span>Le règlement se fait le jour de la livraison, selon le montant convenu.</span></li>
    </ol>
   </div>
  </section>

  <section className={s.faq}>
   <h2>Questions fréquentes</h2>
   <details><summary>Dois-je payer quelque chose pour réserver&nbsp;?</summary><p>Non. Aucun acompte n’est demandé. Vous réglez le montant convenu au moment de la livraison.</p></details>
   <details><summary>Comment est calculé le prix de livraison&nbsp;?</summary><p>Il dépend de votre code postal, selon notre barème par zone. Il s’ajoute automatiquement à votre devis ; pour certaines destinations (Corse, outre-mer…), un tarif personnalisé vous est communiqué avant toute confirmation.</p></details>
   <details><summary>Que comprennent les 150 € de carte grise&nbsp;?</summary><p>Les formalités d’immatriculation de votre véhicule, gérées par NeoDrive et incluses dans votre devis.</p></details>
   <details><summary>Ma réservation m’engage-t-elle immédiatement&nbsp;?</summary><p>NeoDrive vous recontacte d’abord pour confirmer la disponibilité et le délai. Tout changement de montant nécessite votre accord.</p></details>
  </section>

  {/* BARRE MOBILE */}
  <div className={s.mobileBar}>
   <div><small>{VEHICLES[model].label.replace("NeoDrive ","")} · total TTC</small><strong>{quote.total===null?(postal.length===5?"Sur devis":euro(quote.vehiclePrice+REGISTRATION_PRICE)+" + livr."):euro(quote.total)}</strong></div>
   <a href={valid?"#devis":postalVerified&&contactDone?"#devis":"#configurer"} className={s.btnPrimary}>{valid?"Réserver":"Continuer"}</a>
  </div>
 </main>;
}
