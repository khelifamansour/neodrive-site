import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ALERT_ENDPOINT, SAV_BUCKET, timelinePath, waNumber, type SavTimeline } from "../../../../lib/sav";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const SITE="https://www.easydrive-auto.fr";
const LINK_TTL=60*60*24*14; // liens médias valables 14 jours dans l'alerte

const clean=(v:unknown)=>String(v??"").trim();

async function triage(input:{category:string;description:string;errorCode:string;vin:string}){
 if(!process.env.OPENAI_API_KEY)return {diagnosis:"Votre demande a été enregistrée. Un technicien NeoDrive vérifiera le dossier.",confidence:0};
 try{
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await client.responses.create({model:process.env.OPENAI_SUPPORT_MODEL||"gpt-5-mini",input:`Tu es l'assistant de pré-diagnostic SAV NeoDrive. Véhicule électrique sans permis. Catégorie: ${input.category}. Code erreur: ${input.errorCode||"aucun"}. VIN: ${input.vin||"non fourni"}. Symptôme client: ${input.description}. Donne un pré-diagnostic prudent en français en 5 à 9 lignes maximum. Propose uniquement des vérifications utilisateur sans démontage dangereux: état de charge, interrupteurs, connecteurs accessibles sans outil, position du sélecteur, voyant/écran, photos utiles. Ne jamais demander d'ouvrir la batterie, le contrôleur ou de manipuler des câbles de puissance. Si freinage, fumée, odeur anormale, échauffement, choc ou batterie endommagée: recommander de ne plus utiliser le véhicule avant contrôle. N'invente aucune pièce ni garantie. Termine par les informations utiles à envoyer au technicien. Retour JSON strict {diagnosis,confidence}.`,max_output_tokens:450});
  const txt=r.output_text.trim().replace(/^```json\s*/i,"").replace(/```$/," ").trim();
  const j=JSON.parse(txt);return {diagnosis:String(j.diagnosis||"Dossier transmis au SAV."),confidence:Math.max(0,Math.min(1,Number(j.confidence||0)))};
 }catch{return {diagnosis:"Votre demande a été enregistrée. Un technicien NeoDrive vérifiera le dossier.",confidence:0};}
}

/** Envoie l'alerte e-mail à NeoDrive. Renvoie true si Formspree a accepté. */
async function sendAlert(fields:Record<string,string>){
 try{
  const r=await fetch(ALERT_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Referer:SITE+"/sav",Origin:SITE},body:JSON.stringify(fields)});
  return r.ok;
 }catch{return false;}
}

export async function POST(req:Request){
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!sk)return NextResponse.json({ok:false,error:"Configuration serveur incomplète"},{status:503});
 const sb=createClient(SB,sk,{auth:{persistSession:false}});
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!b)return NextResponse.json({ok:false,error:"Requête invalide."},{status:400});
 const name=clean(b.name),email=clean(b.email).toLowerCase(),phone=clean(b.phone),vin=clean(b.vin).replace(/\s+/g,"").toUpperCase(),category=clean(b.category),description=clean(b.description),errorCode=clean(b.error_code);
 const ref=clean(b.ref),folder=clean(b.folder);
 if(!name||!email||!phone||!description)return NextResponse.json({ok:false,error:"Nom, e-mail, téléphone et description sont obligatoires."},{status:400});
 if(!/^SAV-\d{4}-\d{7}$/.test(ref)||!folder.startsWith(`sav/${ref}-`)||!/^sav\/SAV-\d{4}-\d{7}-[0-9a-f-]{36}$/.test(folder))return NextResponse.json({ok:false,error:"Référence invalide, rechargez la page."},{status:400});
 const {data:exists}=await sb.from("sav_tickets").select("id").eq("public_reference",ref).maybeSingle();
 if(exists)return NextResponse.json({ok:false,error:"Cette demande a déjà été envoyée."},{status:409});

 // Médias réellement reçus dans le dossier privé
 const {data:listed}=await sb.storage.from(SAV_BUCKET).list(folder,{limit:50});
 const attachments=(listed||[]).filter(f=>f.name&&!f.name.startsWith(".")).map(f=>({name:f.name,type:(f.metadata as {mimetype?:string}|null)?.mimetype||"",size:(f.metadata as {size?:number}|null)?.size||0,path:`${folder}/${f.name}`}));

 let vehicle:{id:string;vin:string;internal_ref:string;model:string;version:string}|null=null;
 if(vin){const {data}=await sb.from("vehicles").select("id,vin,internal_ref,model,version,current_customer_id").or(`vin.eq.${vin},chassis_number.eq.${vin}`).maybeSingle();vehicle=data||null;}
 const {data:customer}=await sb.from("customers").select("id").eq("email",email).maybeSingle();
 const ai=await triage({category,description,errorCode,vin});
 const {data:ticket,error}=await sb.from("sav_tickets").insert({ticket_number:ref,public_reference:ref,customer_id:customer?.id||null,vehicle_id:vehicle?.id||null,customer_name:name,customer_email:email,customer_phone:phone,vin:vin||vehicle?.vin||null,category:category||"autre",description,symptom:description,error_code:errorCode||null,status:"open",priority:"normal",ai_diagnosis:ai.diagnosis,ai_confidence:ai.confidence,attachments}).select("id,ticket_number,public_reference,status,ai_diagnosis,vin,created_at").single();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});

 // Historique de suivi
 const timeline:SavTimeline={ref,folder,events:[{at:new Date().toISOString(),stage:"received",note:"Votre demande est bien enregistrée. Un technicien NeoDrive revient vers vous."}]};
 await sb.storage.from(SAV_BUCKET).upload(timelinePath(ref),Buffer.from(JSON.stringify(timeline,null,2)),{contentType:"application/json",upsert:true});

 // Alerte NeoDrive
 const links:string[]=[];
 for(const a of attachments){const {data}=await sb.storage.from(SAV_BUCKET).createSignedUrl(a.path,LINK_TTL);if(data?.signedUrl)links.push(`${a.name} : ${data.signedUrl}`);}
 const fields:Record<string,string>={
  _subject:`🔧 Nouvelle demande SAV ${ref} — ${name}`,
  reference:ref,client:name,telephone:phone,email,
  whatsapp_client:phone?`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(`Bonjour ${name.split(" ")[0]}, NeoDrive au sujet de votre demande ${ref}.`)}`:"",
  vin:vin||"non renseigné",vehicule_reconnu:vehicle?`${vehicle.model||""} ${vehicle.version||""} (${vehicle.internal_ref||vehicle.vin})`:"non",
  categorie:category||"autre",code_erreur:errorCode||"aucun",description,
  pre_diagnostic:ai.diagnosis,
  medias:links.length?links.join("\n"):"aucun",
  suivi_admin:`${SITE}/sav/admin`,
 };
 const alertSent=await sendAlert(fields);
 return NextResponse.json({ok:true,ticket,alertSent,alertFields:alertSent?null:fields,vehicleMatched:!!vehicle,mediaCount:attachments.length});
}
