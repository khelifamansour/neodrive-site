import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import OpenAI from "openai";
export const dynamic="force-dynamic";
export const maxDuration=45;
const keys=["dashboard","pack","b1","b2","b3","b4","b5","converter","controller","motor","fuses"];
const clean=(v:unknown,n=200)=>String(v??"").trim().slice(0,n);
export async function POST(req:Request){try{
const b=await req.json();const name=clean(b.name,120),phone=clean(b.phone,35),symptoms=clean(b.symptoms,2500);
if(!name||!phone||!symptoms||b.consent!==true)return NextResponse.json({error:"Informations obligatoires manquantes"},{status:400});
const measurements:Record<string,string>={};for(const k of keys){const v=clean(b.measurements?.[k],60);if(v)measurements[k]=v;}
let assessment="Pré-diagnostic indicatif : un ingénieur NeoDrive doit valider les mesures selon les spécifications constructeur. Aucune pièce ne peut être déclarée défectueuse sur ces seuls relevés. Si surchauffe, odeur de brûlé, défaut de freinage ou dommage batterie, cessez d'utiliser le véhicule et contactez le SAV. Ne démontez pas les circuits électriques.";
if(process.env.OPENAI_API_KEY){try{const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const r=await ai.responses.create({model:process.env.OPENAI_SUPPORT_MODEL||"gpt-5-mini",max_output_tokens:400,input:[{role:"system",content:"Tu es assistant de pré-triage SAV NeoDrive. En français, 130 mots maximum. Mesures non vérifiées, aucun seuil constructeur validé. Donne uniquement des hypothèses prudentes, des informations à demander et la suite avec ingénieur. Jamais de diagnostic certain ou de consignes de mesure électrique, démontage, manipulation de batteries, contrôleur, moteur ou fusibles. Si risque de sécurité, conseiller l'arrêt du véhicule."},{role:"user",content:JSON.stringify({model:clean(b.model,100),symptoms,measurements})}]});if(r.output_text?.trim())assessment=r.output_text.slice(0,2200);}catch{}}
const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)return NextResponse.json({error:"Service temporairement indisponible"},{status:503});
const sb=createClient("https://tzlsdjzcxdjaatcpwqwn.supabase.co",secret,{auth:{persistSession:false}});
const ticket="ND-"+new Date().getFullYear()+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
const {error}=await sb.from("neodiag_reports").insert({ticket_number:ticket,customer_name:name,customer_phone:phone,customer_email:clean(b.email,150)||null,vin:clean(b.vin,40)||null,model:clean(b.model,100),symptoms,measurements,assessment,status:"new"});
if(error){console.error("NeoDiag insert failed",error.code);return NextResponse.json({error:"Enregistrement impossible"},{status:500});}
return NextResponse.json({ticket,assessment});
}catch{return NextResponse.json({error:"Demande invalide"},{status:400});}}
