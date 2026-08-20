import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic="force-dynamic";
export const maxDuration=120;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
export async function POST(req:Request){
 const {passcode,jobId}=await req.json().catch(()=>({}));
 const secret=process.env.CRON_SECRET;
 if(!secret||passcode!==secret)return NextResponse.json({ok:false,error:"Code d’accès incorrect"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 const sb=createClient(SB,sk,{auth:{persistSession:false}});
 let query=sb.from("video_generation_jobs").select("id,theme,hook,output_url,completed_at,status,error_message");
 if(jobId) query=query.eq("id",String(jobId)); else query=query.eq("status","succeeded").not("output_url","is",null).order("completed_at",{ascending:false}).limit(1);
 const {data:job,error}=await query.maybeSingle();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 if(!job)return NextResponse.json({ok:false,error:"Vidéo introuvable"},{status:404});
 if(job.status==="rendering")return NextResponse.json({ok:false,rendering:true,error:"La nouvelle vidéo est encore en cours de rendu. Attends 10 à 20 secondes puis reclique."},{status:409});
 if(job.status==="failed")return NextResponse.json({ok:false,error:`Le rendu de cette vidéo a échoué${job.error_message?`: ${job.error_message}`:""}`},{status:500});
 if(job.status!=="succeeded"||!job.output_url)return NextResponse.json({ok:false,error:"Cette vidéo n’est pas encore prête"},{status:409});

 const priceTheme=String(job.theme||"").toLowerCase().includes("prix");
 const caption=priceTheme
  ? `${job.hook||"Découvrez NeoDrive"}\n\nVoiture sans permis électrique à partir de 3 990 € TTC.\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`
  : `${job.hook||"Découvrez NeoDrive"}\n\nDécouvrez NeoDrive en situation réelle.\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;

 // Remove only stale MANUAL reel requests. Never touch the normal scheduled editorial queue.
 await sb.from("social_content_queue").delete().eq("media_brief","generated-video-manual-test").in("status",["scheduled","publishing","failed"]);
 const due="2000-01-01T00:00:00.000Z";
 const rows=["instagram","facebook"].map(platform=>({platform,content_type:"reel",hook:job.hook||job.theme||"video",caption,hashtags:[],media_brief:"generated-video-manual-test",media_url:job.output_url,cta:"easydrive-auto.fr",publish_at:due,status:"scheduled",requires_human_review:false,retry_count:0,max_retries:3}));
 const {error:qe}=await sb.from("social_content_queue").insert(rows);if(qe)return NextResponse.json({ok:false,error:qe.message},{status:500});
 const origin=new URL(req.url).origin;
 const [ir,fr]=await Promise.all([
  fetch(`${origin}/api/instagram/publish-next`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})}),
  fetch(`${origin}/api/facebook/publish-next`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})})
 ]);
 const [ij,fj]=await Promise.all([ir.json().catch(()=>({})),fr.json().catch(()=>({}))]);
 return NextResponse.json({ok:ir.ok&&fr.ok,video:job.output_url,jobId:job.id,theme:job.theme,instagram:ij,facebook:fj},{status:ir.ok&&fr.ok?200:207});
}
