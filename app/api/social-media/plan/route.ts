import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});

const slots=[{h:9,m:30},{h:13,m:30},{h:18,m:30}];
function isoParis(days:number,h:number,m:number){const d=new Date(Date.now()+days*86400000);const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return new Date(`${o.year}-${o.month}-${o.day}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00+02:00`).toISOString();}

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 const [ar,tr]=await Promise.all([
  fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&select=id,public_url,media_type,title,context,times_used&order=times_used.asc.nullsfirst,last_used_at.asc.nullsfirst&limit=40`,{headers:H(key),cache:"no-store"}),
  fetch(`${SB}/rest/v1/marketing_topics?status=eq.idea&select=id,topic,angle,pillar,target_audience,primary_keyword,business_priority,times_used&order=business_priority.desc,times_used.asc&limit=30`,{headers:H(key),cache:"no-store"})]);
 const assets=await ar.json(),topics=await tr.json();if(!Array.isArray(assets)||!assets.length)return NextResponse.json({ok:true,skipped:true,reason:"No media"});
 const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
 const rows:any[]=[];
 for(let day=0;day<4;day++)for(let s=0;s<slots.length;s++){
  const asset=assets[(day*3+s)%assets.length];const topic=(Array.isArray(topics)&&topics.length)?topics[(day*3+s)%topics.length]:null;
  const type=/video|reel/i.test(asset.media_type)||/\.(mp4|mov|m4v)(\?|$)/i.test(asset.public_url)?"reel":"post";
  let hook=topic?.topic||["À partir de 3 990 € : une autre façon de penser la voiture sans permis","Petite dehors. Utile au quotidien.","Les coulisses d'une NeoDrive avant livraison"][s];
  let caption=`${hook}\n\nNeoDrive : voiture sans permis électrique 2 places, à partir de 3 990 € TTC. Recharge sur prise 220 V.\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;
  if(client)try{const r=await client.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Écris une légende française naturelle pour un vrai média NeoDrive. Sujet: ${hook}. Angle: ${topic?.angle||"usage réel"}. Média: ${asset.title||asset.media_type}. Contexte: ${asset.context||"aucun"}. Faits sûrs: VSP électrique 2 places, gamme à partir de 3 990 € TTC, recharge 220 V. 2-5 phrases, hook fort, 3-6 hashtags, CTA discret. Ne jamais inventer autonomie, sécurité, stock, garantie, droit de conduire ou avis. Retourne seulement la légende.`,max_output_tokens:260});caption=r.output_text.trim()||caption;}catch{}
  for(const platform of ["instagram","facebook"])rows.push({topic_id:topic?.id||null,platform,content_type:type,hook,caption,hashtags:[],media_brief:`${type}; ${topic?.pillar||"brand"}; real-media`,media_url:asset.public_url,cta:"Voir NeoDrive sur easydrive-auto.fr",publish_at:isoParis(day,slots[s].h,slots[s].m),status:"scheduled",requires_human_review:false,retry_count:0,max_retries:3});
 }
 const r=await fetch(`${SB}/rest/v1/social_content_queue`,{method:"POST",headers:{...H(key),Prefer:"return=minimal"},body:JSON.stringify(rows)});
 if(!r.ok)return NextResponse.json({ok:false,error:await r.text()},{status:500});
 return NextResponse.json({ok:true,planned:rows.length,days:4,postsPerPlatformPerDay:3});
}
