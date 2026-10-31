"use client";
import {useEffect,useMemo,useState} from "react";
import {VEHICLES,REGISTRATION_PRICE,quoteDelivery,type VehicleKey} from "../../lib/neodrive-pricing";
import {FINANCE,FINANCE_DOCS,FINANCE_MAX_FILE,monthlyPayment,type FinanceDocKey} from "../../lib/neodrive-finance";
import {supabase} from "../../lib/supabase";
import r from "../reservation-devis/reservation.module.css";
import s from "./financement.module.css";

const eur0=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const eur2=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const pct=(n:number)=>n.toLocaleString("fr-FR",{minimumFractionDigits:2})+" %";
const WHATSAPP="https://wa.me/33628261446?text="+encodeURIComponent("Bonjour, j'ai une question sur le financement d'une NeoDrive.");
const MODEL_IMG:Record<VehicleKey,string>={essentielle:"/reservation/essentielle.svg",confort:"/reservation/confort.svg",confortPlus:"/reservation/confort-plus.svg"};

const lowest=Math.ceil(monthlyPayment(VEHICLES.essentielle.price+REGISTRATION_PRICE,84));

export default function Financement(){
 const [model,setModel]=useState<VehicleKey>("confort");
 const [postal,setPostal]=useState("");
 const [pickup,setPickup]=useState(false);
 const [apport,setApport]=useState(0);
 const [months,setMonths]=useState<number>(60);

 const delivery=quoteDelivery(postal);
 const deliveryPrice=pickup?0:delivery.status==="estimated"?delivery.price:0;
 const deliveryKnown=pickup||delivery.status==="estimated";
 const total=VEHICLES[model].price+REGISTRATION_PRICE+deliveryPrice;
 const financed=Math.max(0,total-Math.max(0,apport));
 const eligible=financed>=FINANCE.minAmount&&financed<=FINANCE.maxAmount;
 const monthly=monthlyPayment(financed,months);
 const totalDue=monthly*months;
 const cost=totalDue-financed;
 const table=useMemo(()=>FINANCE.durations.map(m=>({m,v:monthlyPayment(financed,m)})),[financed]);

 // Dossier
 const [p,setP]=useState({civilite:"",prenom:"",nom:"",naissance:"",email:"",telephone:"",adresse:"",ville:"",familiale:"",enfants:"0",logement:"",loyer:"",situation:"",employeur:"",anciennete:"",revenus:"",autresRevenus:"",credits:"",message:""});
 const [files,setFiles]=useState<Partial<Record<FinanceDocKey,File>>>({});
 const [consent,setConsent]=useState(false);
 const [sending,setSending]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [doneRef,setDoneRef]=useState("");
 useEffect(()=>{if(doneRef)window.scrollTo({top:0,behavior:"smooth"})},[doneRef]);

 const set=(k:keyof typeof p)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setP(v=>({...v,[k]:e.target.value}));
 const requiredFields:(keyof typeof p)[]=["prenom","nom","naissance","email","telephone","adresse","ville","situation","revenus"];
 const missingFields=requiredFields.filter(k=>!String(p[k]).trim());
 const missingDocs=FINANCE_DOCS.filter(d=>d.required&&!files[d.key]);
 const canSend=!missingFields.length&&!missingDocs.length&&consent&&eligible&&/^[0-9]{5}$/.test(postal)&&!sending;

 const pickFile=(key:FinanceDocKey)=>(e:React.ChangeEvent<HTMLInputElement>)=>{
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>FINANCE_MAX_FILE){setError(`${f.name} dépasse 10 Mo. Prenez une photo plus légère ou un PDF.`);return;}
  setError("");setFiles(v=>({...v,[key]:f}));
 };

 const submit=async(ev:React.FormEvent)=>{
  ev.preventDefault();if(!canSend)return;setSending(true);setError("");
  try{
   const list=(Object.entries(files) as [FinanceDocKey,File][]).filter(([,f])=>!!f);
   setProgress("Préparation du dossier sécurisé…");
   const init=await fetch("/api/financement/init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({files:list.map(([key,f])=>({key,name:f.name,type:f.type,size:f.size}))})}).then(x=>x.json());
   if(!init.ok)throw new Error(init.error||"Envoi impossible");
   let i=0;
   for(const u of init.uploads as {key:FinanceDocKey;path:string;token:string}[]){
    i++;setProgress(`Envoi des justificatifs (${i}/${init.uploads.length})…`);
    const f=files[u.key]!;
    const {error:upErr}=await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path,u.token,f,{contentType:f.type||"application/octet-stream"});
    if(upErr)throw new Error(`Échec de l’envoi de « ${f.name} ». Réessayez.`);
   }
   setProgress("Finalisation…");
   const simulation={modele:VEHICLES[model].label,prix_vehicule:VEHICLES[model].price,carte_grise:REGISTRATION_PRICE,livraison:pickup?"retrait sur place":deliveryKnown?deliveryPrice:"sur devis",code_postal:postal,total_projet:total,apport,montant_finance:financed,duree_mois:months,mensualite_estimee:Number(monthly.toFixed(2)),taeg_indicatif:FINANCE.taeg};
   const done=await fetch("/api/financement/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folder:init.folder,applicant:{...p,code_postal:postal},simulation,consent})}).then(x=>x.json());
   if(!done.ok)throw new Error(done.error||"Envoi impossible");
   // Notification e-mail NeoDrive (liens privés valables 7 jours)
   const mail=new FormData();
   mail.append("_subject",`Dossier financement ${done.ref} — ${p.prenom} ${p.nom}`);
   mail.append("reference",done.ref);
   Object.entries(p).forEach(([k,v])=>mail.append(k,v));
   mail.append("code_postal",postal);
   Object.entries(simulation).forEach(([k,v])=>mail.append(k,String(v)));
   (done.links as {label:string;url:string}[]).forEach(l=>mail.append(`document · ${l.label}`,l.url));
   await fetch("https://formspree.io/f/xjgjrqqg",{method:"POST",body:mail,headers:{Accept:"application/json"}}).catch(()=>null);
   setDoneRef(done.ref);
  }catch(e){setError(e instanceof Error?e.message:"Erreur d’envoi");}
  finally{setSending(false);setProgress("");}
 };

 if(doneRef){
  return <main className={r.page}><section className={r.successCard}>
   <div className={r.successIcon}><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></div>
   <h1>Dossier reçu, merci {p.prenom}&nbsp;!</h1>
   <p>Votre demande de financement <b>{doneRef}</b> pour une <b>{VEHICLES[model].label}</b> a bien été transmise avec vos justificatifs. Un conseiller NeoDrive vérifie votre dossier puis le présente à notre partenaire financier. Vous serez recontacté rapidement.</p>
   <div className={r.successTotal}><span>Votre simulation</span><strong>{eur2(monthly)} / mois</strong><small>{months} mois · montant financé {eur0(financed)}</small></div>
   <div className={r.successActions}><a className={r.btnWhatsapp} href={WHATSAPP} target="_blank" rel="noreferrer">Une question ? WhatsApp</a><a className={r.btnGhost} href="/reservation-devis">Voir la réservation</a></div>
  </section></main>;
 }

 return <main className={`${r.page} ${s.page}`}>
  {/* HERO */}
  <section className={r.hero}>
   <div className={r.heroCopy}>
    <span className={r.kicker}><i/> Financement · réponse personnalisée</span>
    <h1>Votre NeoDrive<br/><span>dès {lowest} €/mois<sup>*</sup></span></h1>
    <p>Simulez vos mensualités en 30 secondes, puis déposez votre dossier en ligne&nbsp;: pièce d’identité, justificatifs, c’est tout. <b>Nous nous occupons du reste</b> avec notre partenaire financier.</p>
    <div className={r.heroCtas}>
     <a href="#simulateur" className={r.btnPrimary}>Simuler mes mensualités</a>
     <a href="#dossier" className={r.btnLink}>Déposer mon dossier →</a>
    </div>
    <p className={s.heroLegal}>* Exemple pour une NeoDrive Essentielle ({eur0(VEHICLES.essentielle.price+REGISTRATION_PRICE)} carte grise incluse, hors livraison), sans apport, sur 84 mois, TAEG fixe indicatif {pct(FINANCE.taeg)}. Sous réserve d’acceptation du dossier par l’organisme prêteur.</p>
   </div>
   <figure className={r.heroMedia}>
    <picture><img src="/reservation/neodrive-jardin-mobile.webp" alt="NeoDrive Confort grise dans un jardin ensoleillé" fetchPriority="high"/></picture>
    <figcaption><i/> NeoDrive Confort · véhicule réel</figcaption>
   </figure>
  </section>

  <ol className={s.howto}>
   <li><b>1</b><div><strong>Simulez</strong><small>Modèle, apport, durée</small></div></li>
   <li><b>2</b><div><strong>Déposez votre dossier</strong><small>Formulaire + justificatifs</small></div></li>
   <li><b>3</b><div><strong>Réponse du partenaire</strong><small>Nous vous recontactons</small></div></li>
  </ol>

  {/* SIMULATEUR */}
  <div className={s.simGrid} id="simulateur">
   <section className={r.card}>
    <header className={r.cardHead}><span className={r.stepNum}>1</span><div><h2>Votre projet</h2><p>Le même barème que la réservation en ligne.</p></div></header>
    <div className={s.models}>
     {(Object.keys(VEHICLES) as VehicleKey[]).map(k=><button type="button" key={k} onClick={()=>setModel(k)} className={`${s.model} ${model===k?s.modelOn:""}`} aria-pressed={model===k}>
      <img src={MODEL_IMG[k]} alt=""/><strong>{VEHICLES[k].label.replace("NeoDrive ","")}</strong><span>{eur0(VEHICLES[k].price)}</span>
     </button>)}
    </div>
    <div className={s.row2}>
     <label className={r.field}><span>Code postal de livraison</span><span className={r.inputWrap}><input inputMode="numeric" maxLength={5} value={postal} onChange={e=>setPostal(e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="Ex. 31600" autoComplete="postal-code"/></span></label>
     <label className={r.field}><span>Apport (facultatif)</span><span className={r.inputWrap}><input inputMode="numeric" value={apport||""} onChange={e=>setApport(Math.max(0,Number(e.target.value.replace(/\D/g,""))||0))} placeholder="0 €"/></span></label>
    </div>
    <label className={s.pickup}><input type="checkbox" checked={pickup} onChange={e=>setPickup(e.target.checked)}/> Retrait sur place à Muret (31) — pas de livraison</label>
    <dl className={s.costs}>
     <div><dt>{VEHICLES[model].label}</dt><dd>{eur0(VEHICLES[model].price)}</dd></div>
     <div><dt>Carte grise (formalités)</dt><dd>{eur0(REGISTRATION_PRICE)}</dd></div>
     <div><dt>Livraison{!pickup&&delivery.status==="estimated"?` · zone ${delivery.zone}`:""}</dt><dd>{pickup?"0 €":delivery.status==="estimated"?eur0(delivery.price):postal.length===5?"Sur devis":"—"}</dd></div>
     {apport>0?<div><dt>Apport</dt><dd>− {eur0(apport)}</dd></div>:null}
     <div className={s.costsTotal}><dt>Montant à financer</dt><dd>{eur0(financed)}</dd></div>
    </dl>
    {!pickup&&delivery.status==="manual"&&postal.length===5?<p className={r.note}>{delivery.reason}&nbsp;: la livraison sera ajoutée après devis.</p>:null}
   </section>

   <section className={`${r.card} ${s.result}`}>
    <header className={r.cardHead}><span className={r.stepNum}>2</span><div><h2>Vos mensualités</h2><p>Choisissez la durée qui vous convient.</p></div></header>
    <div className={s.durations} role="radiogroup" aria-label="Durée du crédit">
     {table.map(({m,v})=><button type="button" role="radio" aria-checked={months===m} key={m} onClick={()=>setMonths(m)} className={`${s.duration} ${months===m?s.durationOn:""}`}><strong>{m}</strong><small>mois</small><span>{eligible?`${Math.round(v)} €`:"—"}</span></button>)}
    </div>
    <div className={s.monthly}>
     <small>Mensualité estimée</small>
     <strong>{eligible?eur2(monthly):"—"}<em>/mois</em></strong>
     <span>pendant {months} mois · hors assurance facultative</span>
    </div>
    <dl className={s.costs}>
     <div><dt>Montant financé</dt><dd>{eur2(financed)}</dd></div>
     <div><dt>TAEG fixe indicatif</dt><dd>{pct(FINANCE.taeg)}</dd></div>
     <div><dt>Taux débiteur fixe indicatif</dt><dd>{pct(FINANCE.tauxDebiteur)}</dd></div>
     <div><dt>Frais de dossier</dt><dd>{eur2(FINANCE.fraisDossier)}</dd></div>
     <div><dt>Coût total du crédit</dt><dd>{eligible?eur2(cost):"—"}</dd></div>
     <div className={s.costsTotal}><dt>Montant total dû</dt><dd>{eligible?eur2(totalDue):"—"}</dd></div>
    </dl>
    {!eligible?<p className={r.note}>Simulation possible entre {eur0(FINANCE.minAmount)} et {eur0(FINANCE.maxAmount)} financés.</p>:null}
    <a href="#dossier" className={`${r.btnPrimary} ${s.full}`}>Déposer mon dossier avec cette simulation</a>
    <p className={s.legal}><b>Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</b> Simulation indicative et non contractuelle. Les conditions définitives (taux, durée, assurance) sont fixées par l’organisme prêteur après étude et acceptation de votre dossier. Vous disposez d’un délai de rétractation de 14 jours.</p>
   </section>
  </div>

  {/* DOSSIER */}
  <form className={r.card} id="dossier" onSubmit={submit}>
   <header className={r.cardHead}><span className={r.stepNum}>3</span><div><h2>Votre dossier de financement</h2><p>Données transmises de façon sécurisée, uniquement pour l’étude de votre demande.</p></div></header>

   <div className={s.recapBar}><span>{VEHICLES[model].label}</span><span>{eur0(financed)} financés</span><span>{months} mois</span><b>{eligible?`${eur2(monthly)}/mois`:"—"}</b></div>

   <h3 className={s.h3}>Vous</h3>
   <div className={r.fields}>
    <label className={r.field}><span>Civilité</span><span className={r.inputWrap}><select className={s.select} value={p.civilite} onChange={set("civilite")}><option value="">—</option><option>Madame</option><option>Monsieur</option></select></span></label>
    <label className={r.field}><span>Date de naissance</span><span className={r.inputWrap}><input type="date" value={p.naissance} onChange={set("naissance")} required/></span></label>
    <label className={r.field}><span>Prénom</span><span className={r.inputWrap}><input value={p.prenom} onChange={set("prenom")} autoComplete="given-name" required/></span></label>
    <label className={r.field}><span>Nom</span><span className={r.inputWrap}><input value={p.nom} onChange={set("nom")} autoComplete="family-name" required/></span></label>
    <label className={r.field}><span>E-mail</span><span className={r.inputWrap}><input type="email" value={p.email} onChange={set("email")} autoComplete="email" required/></span></label>
    <label className={r.field}><span>Téléphone</span><span className={r.inputWrap}><input type="tel" value={p.telephone} onChange={set("telephone")} autoComplete="tel" required/></span></label>
    <label className={`${r.field} ${r.wide}`}><span>Adresse</span><span className={r.inputWrap}><input value={p.adresse} onChange={set("adresse")} autoComplete="street-address" required/></span></label>
    <label className={r.field}><span>Code postal</span><span className={r.inputWrap}><input value={postal} inputMode="numeric" maxLength={5} onChange={e=>setPostal(e.target.value.replace(/\D/g,"").slice(0,5))} autoComplete="postal-code" required/></span></label>
    <label className={r.field}><span>Ville</span><span className={r.inputWrap}><input value={p.ville} onChange={set("ville")} autoComplete="address-level2" required/></span></label>
    <label className={r.field}><span>Situation familiale</span><span className={r.inputWrap}><select className={s.select} value={p.familiale} onChange={set("familiale")}><option value="">—</option><option>Célibataire</option><option>Marié(e) / Pacsé(e)</option><option>Concubinage</option><option>Divorcé(e) / Séparé(e)</option><option>Veuf(ve)</option></select></span></label>
    <label className={r.field}><span>Enfants à charge</span><span className={r.inputWrap}><input inputMode="numeric" value={p.enfants} onChange={set("enfants")}/></span></label>
    <label className={r.field}><span>Logement</span><span className={r.inputWrap}><select className={s.select} value={p.logement} onChange={set("logement")}><option value="">—</option><option>Locataire</option><option>Propriétaire</option><option>Propriétaire avec crédit</option><option>Hébergé(e) gratuitement</option></select></span></label>
    <label className={r.field}><span>Loyer ou crédit immobilier (€/mois)</span><span className={r.inputWrap}><input inputMode="numeric" value={p.loyer} onChange={set("loyer")}/></span></label>
   </div>

   <h3 className={s.h3}>Vos revenus</h3>
   <div className={r.fields}>
    <label className={r.field}><span>Situation professionnelle</span><span className={r.inputWrap}><select className={s.select} value={p.situation} onChange={set("situation")} required><option value="">—</option><option>CDI</option><option>CDD</option><option>Intérim</option><option>Fonctionnaire</option><option>Indépendant / Artisan</option><option>Retraité(e)</option><option>Étudiant(e) / Apprenti(e)</option><option>Sans activité</option></select></span></label>
    <label className={r.field}><span>Employeur</span><span className={r.inputWrap}><input value={p.employeur} onChange={set("employeur")} autoComplete="organization"/></span></label>
    <label className={r.field}><span>Ancienneté</span><span className={r.inputWrap}><input value={p.anciennete} onChange={set("anciennete")} placeholder="Ex. 3 ans"/></span></label>
    <label className={r.field}><span>Revenus nets mensuels (€)</span><span className={r.inputWrap}><input inputMode="numeric" value={p.revenus} onChange={set("revenus")} required/></span></label>
    <label className={r.field}><span>Autres revenus (€/mois)</span><span className={r.inputWrap}><input inputMode="numeric" value={p.autresRevenus} onChange={set("autresRevenus")} placeholder="Allocations, pensions…"/></span></label>
    <label className={r.field}><span>Autres crédits en cours (€/mois)</span><span className={r.inputWrap}><input inputMode="numeric" value={p.credits} onChange={set("credits")}/></span></label>
   </div>

   <h3 className={s.h3}>Vos justificatifs <small>PDF, JPG ou PNG · 10 Mo max · une photo nette suffit</small></h3>
   <div className={s.docs}>
    {FINANCE_DOCS.map(d=>{const f=files[d.key];return <label key={d.key} className={`${s.doc} ${f?s.docOk:""}`}>
     <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,image/*" onChange={pickFile(d.key)}/>
     <i>{f?"✓":"+"}</i>
     <div><strong>{d.label}{!d.required?<em> · facultatif</em>:null}</strong><small>{f?f.name:"Toucher pour ajouter (photo ou fichier)"}</small></div>
    </label>})}
   </div>

   <label className={`${r.field} ${s.msg}`}><span>Un message pour nous ? <em>· facultatif</em></span><textarea value={p.message} onChange={set("message")} rows={3}/></label>

   <label className={r.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>J’accepte que NeoDrive (MK HOLDING SAS) traite ces informations et transmette mon dossier à son partenaire financier pour l’étude de ma demande de crédit. Mes documents sont conservés de façon sécurisée et supprimés s’ils ne sont plus nécessaires.</span></label>

   <div className={s.submitRow}>
    <button type="submit" className={r.btnPrimary} disabled={!canSend}>{sending?progress||"Envoi…":"Envoyer mon dossier de financement"}</button>
   </div>
   {!canSend&&!sending?<p className={r.missing}>Pour envoyer, il manque : {[...(!/^[0-9]{5}$/.test(postal)?["le code postal"]:[]),...(missingFields.length?["vos informations obligatoires"]:[]),...missingDocs.map(d=>d.label.split(" (")[0].toLowerCase()),...(!eligible?["un montant finançable"]:[]),...(!consent?["votre accord"]:[])].join(", ")}.</p>:null}
   {error?<p role="alert" className={r.error}>{error}</p>:null}
   <p className={s.legal}>🔒 Vos justificatifs sont envoyés directement vers un espace de stockage privé, accessible uniquement par NeoDrive. Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</p>
  </form>
 </main>;
}
