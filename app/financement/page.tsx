"use client";
import React,{useState}from"react";

const versions={essentiel:{label:"NeoDrive Essentielle",prix:3990},confort:{label:"NeoDrive Confort",prix:4990},confortPlus:{label:"NeoDrive Confort Plus",prix:5990}};
const docs=["Bulletin de salaire du mois dernier","Bulletin de salaire M-2","Bulletin de salaire M-3","Dernier avis d’imposition","Contrat de travail","Pièce d’identité recto-verso","Justificatif de domicile","RIB"];
const eur=(n:number)=>n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Financement(){
 const[version,setVersion]=useState<keyof typeof versions>("confort");
 const[cp,setCp]=useState("");
 const[apport,setApport]=useState(0);
 const[cg,setCg]=useState(true);
 const[delivery,setDelivery]=useState("790");
 const[customDelivery,setCustomDelivery]=useState(790);
 const[duree,setDuree]=useState(48);
 const[assurance,setAssurance]=useState(false);
 const livraison=delivery==="custom"?Math.max(0,customDelivery):Number(delivery);
 const total=versions[version].prix+livraison+(cg?150:0);
 const finance=Math.max(0,total-apport);
 const tauxDebiteur=6.27,taeg=6.45,r=tauxDebiteur/100/12;
 const mensualite=finance===0?0:(finance*r*Math.pow(1+r,duree))/(Math.pow(1+r,duree)-1);
 const totalDu=mensualite*duree;
 const assuranceMois=finance*0.00084;
 const coutAssurance=assuranceMois*duree;
 const mensualiteFinale=mensualite+(assurance?assuranceMois:0);
 const eligible=finance>=3000&&finance<=75000;
 return <main className="fin">
  <section className="hero"><span>FINANCEMENT NEODRIVE</span><h1>Votre voiture.<br/>Votre financement.<br/><em>Un seul dossier.</em></h1><p>Calculez le coût complet de votre NeoDrive, choisissez votre apport et simulez vos mensualités. Pour l’étude des demandes de financement, nous travaillons avec un partenaire Groupama.</p><div className="steps"><b>1. Votre projet</b><b>2. Simulation</b><b>3. Dossier</b></div></section>
  <section className="wrap">
   <div className="notice"><strong>Documents à préparer</strong><p><b>Les 3 derniers bulletins de salaire</b>, le dernier avis d’imposition, le contrat de travail, une pièce d’identité, un justificatif de domicile et un RIB.</p></div>
   <div className="columns">
    <section className="card"><span className="eye">01 — VOTRE PROJET</span><h2>Montant à financer</h2>
     <label>Modèle<select value={version} onChange={e=>setVersion(e.target.value as keyof typeof versions)}>{Object.entries(versions).map(([k,v])=><option value={k} key={k}>{v.label} — {v.prix.toLocaleString("fr-FR")} €</option>)}</select></label>
     <label>Livraison<select value={delivery} onChange={e=>setDelivery(e.target.value)}><option value="0">Retrait sur place — 0 €</option><option value="350">Livraison — 350 €</option><option value="490">Livraison — 490 €</option><option value="690">Livraison — 690 €</option><option value="790">Livraison — 790 €</option><option value="custom">Livraison personnalisée</option></select></label>
     {delivery==="custom"&&<label className="custom">Prix personnalisé de livraison (€)<input type="number" min="0" value={customDelivery||""} onChange={e=>setCustomDelivery(Number(e.target.value)||0)} placeholder="Ex. 790"/><small>Saisissez ici le tarif réel communiqué au client.</small></label>}
     <label>Code postal du client<input value={cp} onChange={e=>setCp(e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="31600"/></label>
     <label className="check"><input type="checkbox" checked={cg} onChange={e=>setCg(e.target.checked)}/> Mise en route / carte grise — 150 €</label>
     <label>Apport du client (€)<input type="number" min="0" value={apport||""} onChange={e=>setApport(Number(e.target.value)||0)} placeholder="Ex. 1 000"/></label>
     <div className="summary"><div><span>Véhicule</span><b>{versions[version].prix.toLocaleString("fr-FR")} €</b></div><div><span>Livraison</span><b>{livraison.toLocaleString("fr-FR")} €</b></div><div><span>Carte grise / mise en route</span><b>{cg?"150 €":"0 €"}</b></div><div><span>Total du projet</span><b>{total.toLocaleString("fr-FR")} €</b></div><div><span>Apport</span><b>- {apport.toLocaleString("fr-FR")} €</b></div><div className="big"><span>Montant à financer</span><b>{finance.toLocaleString("fr-FR")} €</b></div></div>
    </section>

    <section className="card"><span className="eye">02 — SIMULATION GROUPAMA</span><h2>Votre mensualité</h2>
     <div className="loan"><div><span>Crédit</span><b>Auto</b></div><div><span>Montant</span><b>{eur(finance)} €</b></div><div><span>Durée</span><b>{duree} mois</b></div><div><span>Code postal</span><b>{cp||"—"}</b></div></div>
     <label>Durée : <b>{duree} mois</b><input className="range" type="range" min="12" max="84" value={duree} onChange={e=>setDuree(Number(e.target.value))}/><div className="ticks"><span>12 mois</span><span>84 mois</span></div></label>
     <div className="presets">{[12,24,36,48,60,72,84].map(x=><button type="button" key={x} className={x===duree?"active":""} onClick={()=>setDuree(x)}>{x}</button>)}</div>
     <div className="monthly"><span>Mensualité estimée</span><strong>{eligible?`${eur(mensualiteFinale)} € / mois`:"—"}</strong></div>
     <div className="recap"><h3>Récapitulatif <small>(hors assurance facultative)</small></h3><div><span>Montant souhaité</span><b>{eur(finance)} €</b></div><div><span>Mensualités</span><b>{eligible?`${eur(mensualite)} €`:"—"}</b></div><div><span>Frais de dossier</span><b>0,00 €</b></div><div><span>TAEG fixe indicatif</span><b>6,45 %</b></div><div><span>Taux débiteur annuel fixe indicatif</span><b>6,27 %</b></div><div className="green"><span>Montant total dû</span><b>{eligible?`${eur(totalDu)} €`:"—"}</b></div></div>
     <label className="check insurance"><input type="checkbox" checked={assurance} onChange={e=>setAssurance(e.target.checked)}/> Ajouter une estimation d’assurance facultative</label>
     {assurance&&<div className="recap"><h3>Assurance facultative — exemple</h3><div><span>Coût par mois</span><b>{eur(assuranceMois)} €</b></div><div><span>Coût total</span><b>{eur(coutAssurance)} €</b></div><div className="green"><span>Total dû avec assurance</span><b>{eur(totalDu+coutAssurance)} €</b></div></div>}
     {!eligible&&<p className="warn">Le simulateur Auto Groupama communiqué prévoit actuellement un montant de 3 000 € à 75 000 €.</p>}
     <p className="source">Simulation non contractuelle. Paramètres reproduits d’après le simulateur Groupama communiqué : TAEG 6,45 %, taux débiteur fixe 6,27 %, frais de dossier 0 €. Les conditions réelles peuvent varier selon la date, le montant, la durée et l’acceptation du dossier.</p>
    </section>
   </div>

   <section className="form"><span className="eye">03 — DOSSIER DE FINANCEMENT</span><h2>Déposer les informations et justificatifs</h2><div className="fields"><input placeholder="Nom"/><input placeholder="Prénom"/><input type="email" placeholder="E-mail"/><input type="tel" placeholder="Téléphone"/><input placeholder="Adresse"/><input placeholder="Code postal / Ville"/><select defaultValue=""><option value="" disabled>Situation professionnelle</option><option>CDI</option><option>CDD</option><option>Intérimaire</option><option>Indépendant</option><option>Retraité</option><option>Autre</option></select><input type="number" placeholder="Revenu net mensuel (€)"/></div><h3>Justificatifs</h3><div className="uploads">{docs.map((d,i)=><label key={d}><span><b>{i+1}</b>{d}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png"/></label>)}</div><label className="check consent"><input type="checkbox"/> J’autorise NeoDrive à traiter ces informations et à transmettre le dossier au partenaire financier concerné pour étude.</label><button disabled type="button">Envoyer mon dossier de financement</button><p className="source">🔒 L’envoi sera activé après raccordement au stockage sécurisé NeoDrive.</p></section>
   <p className="legal">Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</p>
  </section>
  <style jsx>{`.fin{background:#f6f7f5;color:#132018}.hero{padding:65px max(20px,calc((100vw - 1120px)/2));background:linear-gradient(135deg,#0d1811,#173d23);color:#fff}.hero>span,.eye{font-size:12px;font-weight:950;letter-spacing:1.5px;color:#7bd36c}.hero h1{font-size:clamp(44px,7vw,74px);line-height:.96;letter-spacing:-3px;margin:13px 0}.hero h1 em{font-style:normal;color:#9ee57d}.hero p{max-width:720px;line-height:1.6;color:#d8e2da;font-size:18px}.steps{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.steps b{padding:10px 13px;border:1px solid #ffffff25;border-radius:999px}.wrap{max-width:1160px;margin:auto;padding:38px 18px 70px}.notice{background:#e9f5e5;padding:22px;border-radius:20px;margin-bottom:18px}.notice strong{font-size:22px}.notice p{margin-bottom:0;line-height:1.5;color:#536057}.columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card,.form{background:#fff;border:1px solid #e4e8e3;border-radius:25px;padding:28px;box-shadow:0 15px 40px #1b3b210d}.eye{color:#25733a}.card h2,.form h2{font-size:31px;margin:7px 0 22px;letter-spacing:-1.2px}.card>label{display:grid;gap:7px;margin:13px 0;font-weight:800}input,select{width:100%;padding:14px;border:1px solid #dce2dc;border-radius:12px;background:#fafbfa;font:inherit}.custom{padding:13px;background:#fff7e9;border-radius:14px}.custom small{font-weight:500;color:#786a55}.check{display:flex!important;align-items:flex-start;gap:9px;background:#f4f6f3;padding:12px;border-radius:12px;font-size:13px}.check input{width:auto;margin-top:2px}.summary{background:#111b14;color:#fff;padding:18px;border-radius:18px;margin-top:18px}.summary div,.recap div{display:flex;justify-content:space-between;gap:14px;padding:8px 0}.summary span{color:#b9c4bb}.summary .big{border-top:1px solid #ffffff25;margin-top:7px;padding-top:14px}.summary .big b{font-size:24px;color:#9ee57d}.loan{display:grid;grid-template-columns:1fr 1fr;background:#f6f4ef;border-radius:16px;padding:16px}.loan div:nth-child(even){border-left:1px solid #d7d4ce;padding-left:17px}.loan span,.loan b{display:block}.loan b{font-size:21px;margin-top:3px}.range{padding:0;accent-color:#ff8000}.ticks{display:flex;justify-content:space-between;color:#777;font-size:12px}.presets{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.presets button{padding:8px 2px;border:1px solid #dce1dc;border-radius:9px;background:#fff;font-weight:800}.presets .active{background:#08755f;color:#fff}.monthly{background:#08755f;color:#fff;border-radius:18px;padding:20px;margin:18px 0}.monthly span,.monthly strong{display:block}.monthly strong{font-size:32px;margin-top:4px}.recap h3{color:#ff7900}.recap h3 small{font-weight:500;color:#68726b}.recap div{border-bottom:1px solid #ddd}.recap .green{color:#08755f;font-size:18px;font-weight:900}.insurance{margin-top:16px!important}.warn{background:#fff2d5;padding:12px;border-radius:12px;color:#775817;font-size:12px}.source{font-size:11px;color:#768078;line-height:1.5}.form{margin-top:18px}.fields,.uploads{display:grid;grid-template-columns:1fr 1fr;gap:9px}.form h3{margin-top:26px}.uploads label{border:1px solid #e0e5df;border-radius:14px;padding:12px;background:#fafbfa}.uploads span{display:flex;gap:8px;align-items:center;font-weight:800;margin-bottom:8px}.uploads span b{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#173d23;color:#fff;font-size:11px}.uploads input{font-size:12px;padding:7px}.consent{margin:20px 0}.form button{width:100%;border:0;border-radius:14px;padding:16px;background:#173d23;color:#fff;font-weight:900;font-size:16px;opacity:.55}.legal{text-align:center;font-size:12px;color:#6f7971;margin-top:30px}@media(max-width:820px){.columns,.fields,.uploads{grid-template-columns:1fr}.hero{padding-top:45px}.hero h1{letter-spacing:-2px}.card,.form{padding:21px}.card h2,.form h2{font-size:27px}.presets{grid-template-columns:repeat(4,1fr)}.monthly strong{font-size:28px}}`}</style>
 </main>
}
