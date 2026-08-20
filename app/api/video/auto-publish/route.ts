import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 const sb=createClient(SB,sk,{auth:{persistSession:false}});
 const since=new Date(Date.now()-36*60*60*1000).toISOString();
 const {data:job,error}=await sb.from("video_generation_jobs").select("id,theme,hook,output_url,completed_at,status").eq("status","succeeded").not("output_url","is",null).gte("completed_at",since).order("completed_at",{ascending:false}).limit(1).maybeSingle();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 if(!job?.output_url)return NextResponse.json({ok:true,skipped:true,reason:"No completed generated video in the last 36h"});
 const {data:existing}=await sb.from("social_content_queue").select("platform,status").eq("media_url",job.output_url).in("platform",["instagram","facebook"]);
 const done=new Set((existing||[]).filter((x:any)=>["scheduled","publishing","published"].includes(x.status)).map((x:any)=>x.platform));
 if(done.has("instagram")&&done.has("facebook"))return NextResponse.json({ok:true,skipped:true,reason:"Latest generated video already queued or published",jobId:job.id});
 let caption=`${job.hook||"NeoDrive dans la vraie vie"}\n\nUne voiture sans permis électrique 2 places, pensée pour les déplacements du quotidien. À partir de 3 990 € TTC, recharge sur prise 220 V.\n\nDécouvre NeoDrive sur easydrive-auto.fr\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique #VoitureElectrique`;
 if(process.env.OPENAI_API_KEY)try{
  const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await c.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Rédige une légende courte et naturelle pour un Reel NeoDrive. Thème: ${job.theme||"marque"}. Hook: ${job.hook||"NeoDrive dans la vraie vie"}. Faits sûrs uniquement: voiture sans permis électrique 2 places, à partir de 3 990 € TTC, recharge sur prise 220 V, site easydrive-auto.fr. 3 à 5 phrases maximum, une phrase d'appel à l'action, puis 5 hashtags pertinents. N'invente ni autonomie, ni sécurité, ni stock, ni garantie, ni droit de conduire. Retourne uniquement la légende.`,max_output_tokens:220});
  caption=r.output_text.trim()||caption;
 }catch{}
 const due="2000-01-01T00:00:00.000Z";
 const rows=["instagram","facebook"].filter(p=>!done.has(p)).map(platform=>({platform,content_type:"reel",hook:job.hook||job.theme||"video",caption,hashtags:[],media_brief:`generated-video-daily:${job.id}`,media_url:job.output_url,cta:"easydrive-auto.fr",publish_at:due,status:"scheduled",requires_human_review:false,retry_count:0,max_retries:3}));
 if(rows.length){const {error:qe}=await sb.from("social_content_queue").insert(rows);if(qe)return NextResponse.json({ok:false,error:qe.message},{status:500});}
 const origin=new URL(req.url).origin;
 const results:any={};
 if(!done.has("instagram")){
  const r=await fetch(`${origin}/api/instagram/auto-publish?force=1`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});results.instagram=await r.json().catch(()=>({}));results.instagramOk=r.ok;
 }
 if(!done.has("facebook")){
  const r=await fetch(`${origin}/api/facebook/auto-publish?force=1`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});results.facebook=await r.json().catch(()=>({}));results.facebookOk=r.ok;
 }
 const ok=(results.instagramOk??true)&&(results.facebookOk??true);
 return NextResponse.json({ok,jobId:job.id,video:job.output_url,caption,results},{status:ok?200:207});
}
