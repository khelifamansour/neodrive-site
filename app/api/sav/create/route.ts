import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function clean(v:FormDataEntryValue|null){return String(v||"").trim();}
function safeName(s:string){return s.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(0,100);}
function ticketRef(){return `SAV-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;}

async function upload(sb:any,file:File,ref:string){
 const path=`sav/${ref}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name||"media")}`;
 const {error}=await sb.storage.from("erp-documents").upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type||"application/octet-stream",upsert:false});
 if(error)throw error;
 return {name:file.name,type:file.type,size:file.size,path};
}

async function triage(input:{category:string;description:string;errorCode:string;vin:string}){
 if(!process.env.OPENAI_API_KEY)return {diagnosis:"Votre demande a été enregistrée. Un technicien NeoDrive vérifiera le dossier.",confidence:0};
 try{
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await client.responses.create({model:process.env.OPENAI_SUPPORT_MODEL||"gpt-5-mini",input:`Tu es l'assistant de pré-diagnostic SAV NeoDrive. Véhicule électrique sans permis. Catégorie: ${input.category}. Code erreur: ${input.errorCode||"aucun"}. VIN: ${input.vin||"non fourni"}. Symptôme client: ${input.description}. Donne un pré-diagnostic prudent en français en 5 à 9 lignes maximum. Propose uniquement des vérifications utilisateur sans démontage dangereux: état de charge, interrupteurs, connecteurs accessibles sans outil, position du sélecteur, voyant/écran, photos utiles. Ne jamais demander d'ouvrir la batterie, le contrôleur ou de manipuler des câbles de puissance. Si freinage, fumée, odeur anormale, échauffement, choc ou batterie endommagée: recommander de ne plus utiliser le véhicule avant contrôle. N'invente aucune pièce ni garantie. Termine par les informations utiles à envoyer au technicien. Retour JSON strict {diagnosis,confidence}.`,max_output_tokens:450});
  const txt=r.output_text.trim().replace(/^```json\s*/i,"").replace(/```$/," ").trim();
  const j=JSON.parse(txt);return {diagnosis:String(j.diagnosis||"Dossier transmis au SAV."),confidence:Math.max(0,Math.min(1,Number(j.confidence||0)))};
 }catch{return {diagnosis:"Votre demande a été enregistrée. Un technicien NeoDrive vérifiera le dossier.",confidence:0};}
}

export async function POST(req:Request){
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!sk)return NextResponse.json({ok:false,error:"Configuration serveur incomplète"},{status:503});
 const sb=createClient(SB,sk,{auth:{persistSession:false}});const fd=await req.formData();
 const name=clean(fd.get("name")),email=clean(fd.get("email")).toLowerCase(),phone=clean(fd.get("phone")),vin=clean(fd.get("vin")).replace(/\s+/g,"").toUpperCase(),category=clean(fd.get("category")),description=clean(fd.get("description")),errorCode=clean(fd.get("error_code"));
 if(!name||!email||!phone||!description)return NextResponse.json({ok:false,error:"Nom, e-mail, téléphone et description sont obligatoires."},{status:400});
 const ref=ticketRef();let vehicle:any=null,customer:any=null;
 if(vin){const {data}=await sb.from("vehicles").select("id,vin,internal_ref,model,version,current_customer_id").or(`vin.eq.${vin},chassis_number.eq.${vin}`).maybeSingle();vehicle=data||null;}
 const {data:existingCustomer}=await sb.from("customers").select("id,first_name,last_name,email,phone").eq("email",email).maybeSingle();customer=existingCustomer||null;
 const attachments:any[]=[];for(const [k,v] of fd.entries()){if(k==="media"&&v instanceof File&&v.size){if(v.size>50*1024*1024)return NextResponse.json({ok:false,error:`${v.name} dépasse 50 Mo.`},{status:400});attachments.push(await upload(sb,v,ref));}}
 const ai=await triage({category,description,errorCode,vin});
 const {data:ticket,error}=await sb.from("sav_tickets").insert({ticket_number:ref,public_reference:ref,customer_id:customer?.id||null,vehicle_id:vehicle?.id||null,customer_name:name,customer_email:email,customer_phone:phone,vin:vin||vehicle?.vin||null,category:category||"autre",description,symptom:description,error_code:errorCode||null,status:"open",priority:"normal",ai_diagnosis:ai.diagnosis,ai_confidence:ai.confidence,attachments}).select("id,ticket_number,public_reference,status,ai_diagnosis,vin,created_at").single();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 return NextResponse.json({ok:true,ticket,vehicleMatched:!!vehicle,vehicle:vehicle?{vin:vehicle.vin,internal_ref:vehicle.internal_ref,model:vehicle.model,version:vehicle.version}:null});
}
