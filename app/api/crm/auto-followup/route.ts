import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const SITE = "https://www.easydrive-auto.fr";

type Lead = {
  id:number; nom:string|null; email:string|null; telephone:string|null; statut:string|null; phase:string|null;
  history:any; created_at:string|null; last_contact_at:string|null; next_followup_at:string|null; documentation_sent_at:string|null;
  modele_interesse:string|null; ville:string|null; annonce:string|null;
};

function dbHeaders(key:string){return {Authorization:`Bearer ${key}`,apikey:key};}
function firstName(name:string|null){const s=String(name||"").trim(); return s ? s.split(/\s+/)[0] : "";}
function historyOf(v:any){return Array.isArray(v)?v:[];}
function lastStep(lead:Lead){const h=historyOf(lead.history).filter((x:any)=>x?.type==="auto_followup");return h.length?Number(h[h.length-1]?.step||0):0;}
function addDays(days:number){return new Date(Date.now()+days*86400000).toISOString();}

function content(step:number, lead:Lead){
  const prenom=firstName(lead.nom); const hello=prenom?`Bonjour ${prenom},`:"Bonjour,";
  if(step===1) return {
    subject:"NeoDrive — présentation et informations",
    html:`<p>${hello}</p><p>Merci pour votre intérêt pour NeoDrive.</p><p>Voici les informations principales pour découvrir tranquillement nos voitures sans permis électriques :</p><ul><li><a href="${SITE}/produit">Voir les modèles NeoDrive</a></li><li><a href="${SITE}/presentation.mp4">Voir une vidéo de présentation</a></li><li><a href="${SITE}">Site NeoDrive</a></li></ul><p>Si vous me précisez votre ville et votre usage, je peux aussi vous orienter vers la version la plus adaptée.</p><p>Cordialement,<br/>NeoDrive</p><p style="font-size:12px;color:#666">Si vous ne souhaitez plus recevoir de relance à propos de votre demande, répondez simplement STOP.</p>`,
    next:addDays(1), phase:"Attente réponse"
  };
  if(step===2) return {
    subject:"NeoDrive — documentation, prix et livraison",
    html:`<p>${hello}</p><p>Je vous envoie quelques informations complémentaires suite à votre demande :</p><ul><li><a href="${SITE}/prix-voiture-sans-permis">Prix et gamme</a></li><li><a href="${SITE}/financement">Solutions de financement</a></li><li><a href="${SITE}/livraison">Livraison</a></li><li><a href="${SITE}/manuel-utilisateur-neodrive.pdf">Documentation utilisateur PDF</a></li></ul><p>La gamme NeoDrive est électrique, 2 places, rechargeable sur prise 220 V, avec des modèles proposés à partir de 3 990 € TTC.</p><p>Je reste disponible si vous souhaitez vérifier la disponibilité d'un modèle ou obtenir un tarif de livraison.</p><p>Cordialement,<br/>NeoDrive</p><p style="font-size:12px;color:#666">Si vous ne souhaitez plus recevoir de relance à propos de votre demande, répondez simplement STOP.</p>`,
    next:addDays(2), phase:"Réfléchit"
  };
  if(step===3) return {
    subject:"Toujours intéressé par une voiture sans permis NeoDrive ?",
    html:`<p>${hello}</p><p>Je reviens simplement vers vous pour savoir si votre projet de voiture sans permis est toujours d'actualité.</p><p>Si vous hésitez entre une NeoDrive, une Citroën Ami ou une voiture sans permis d'occasion, dites-moi surtout votre budget et vos trajets habituels : cela permet de voir rapidement ce qui est cohérent.</p><p><a href="${SITE}/voiture-sans-permis-occasion">Neuf ou occasion : points à comparer</a></p><p>Cordialement,<br/>NeoDrive</p><p style="font-size:12px;color:#666">Si vous ne souhaitez plus recevoir de relance à propos de votre demande, répondez simplement STOP.</p>`,
    next:addDays(4), phase:"Réfléchit"
  };
  return {
    subject:"NeoDrive — dernière relance concernant votre demande",
    html:`<p>${hello}</p><p>Dernier message concernant votre demande NeoDrive.</p><p>Si votre projet est toujours en cours, vous pouvez simplement répondre à cet email ou nous contacter avec votre ville, votre budget et le modèle qui vous intéresse.</p><p><a href="${SITE}">Voir NeoDrive</a></p><p>Cordialement,<br/>NeoDrive</p><p style="font-size:12px;color:#666">Sans retour de votre part, nous arrêterons les relances automatiques.</p>`,
    next:null, phase:"Attente réponse"
  };
}

async function sendEmail(to:string,subject:string,html:string){
  const key=process.env.RESEND_API_KEY; const from=process.env.CRM_FROM_EMAIL;
  if(!key||!from) return {sent:false,reason:"Email provider not configured"};
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject,html})});
  const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j?.message||"Email send failed"); return {sent:true,id:j.id||null};
}

async function patchLead(key:string,id:number,patch:Record<string,unknown>){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`,{method:"PATCH",headers:{...dbHeaders(key),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
  if(!r.ok) throw new Error(await r.text());
}

export async function GET(req:Request){
  const secret=process.env.CRON_SECRET; const auth=req.headers.get("authorization");
  if(!secret||auth!==`Bearer ${secret}`) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!key) return NextResponse.json({ok:false,error:"SUPABASE_SERVICE_ROLE_KEY missing"},{status:503});

  const now=new Date().toISOString();
  const url=new URL(`${SUPABASE_URL}/rest/v1/leads`);
  url.searchParams.set("select","id,nom,email,telephone,statut,phase,history,created_at,last_contact_at,next_followup_at,documentation_sent_at,modele_interesse,ville,annonce");
  url.searchParams.set("or",`next_followup_at.lte.${now},and(next_followup_at.is.null,statut.eq.Nouveau)`);
  url.searchParams.set("limit","25");
  const rr=await fetch(url,{headers:dbHeaders(key),cache:"no-store"}); const rows=await rr.json().catch(()=>[]);
  if(!rr.ok) return NextResponse.json({ok:false,error:rows},{status:500});

  const results:any[]=[];
  for(const lead of rows as Lead[]){
    if(["Client","Perdu"].includes(String(lead.statut||""))) continue;
    if(!lead.email){results.push({id:lead.id,skipped:true,reason:"no email"});continue;}
    const previous=lastStep(lead); if(previous>=4){results.push({id:lead.id,skipped:true,reason:"sequence complete"});continue;}
    const step=previous+1; const msg=content(step,lead);
    try{
      const sent=await sendEmail(lead.email,msg.subject,msg.html);
      if(!sent.sent){results.push({id:lead.id,step,skipped:true,reason:sent.reason});continue;}
      const history=[...historyOf(lead.history),{type:"auto_followup",step,channel:"email",sent_at:new Date().toISOString(),provider_id:sent.id}].slice(-50);
      await patchLead(key,lead.id,{history,statut:lead.statut==="Nouveau"?"Contacté":lead.statut,phase:msg.phase,last_contact_at:new Date().toISOString(),derniere_relance:new Date().toISOString(),next_followup_at:msg.next,documentation_sent_at:step>=2?(lead.documentation_sent_at||new Date().toISOString()):lead.documentation_sent_at});
      results.push({id:lead.id,step,sent:true,next:msg.next});
    }catch(e){results.push({id:lead.id,step,error:e instanceof Error?e.message:"unknown"});}
  }
  return NextResponse.json({ok:true,processed:results.length,results,emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.CRM_FROM_EMAIL)});
}
