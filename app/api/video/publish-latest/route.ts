import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export async function POST(req:Request){
 const {passcode}=await req.json().catch(()=>({}));
 const secret=process.env.CRON_SECRET;
 if(!secret||passcode!==secret)return NextResponse.json({ok:false,error:"Code d’accès incorrect"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 const sb=createClient(SB,sk,{auth:{persistSession:false}});

 const {data:job,error}=await sb.from("video_generation_jobs")
  .select("id,theme,hook,output_url,completed_at,status")
  .eq("status","succeeded")
  .not("output_url","is",null)
  .order("completed_at",{ascending:false})
  .limit(1)
  .maybeSingle();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 if(!job?.output_url)return NextResponse.json({ok:false,error:"Aucune vidéo générée terminée pour le moment"},{status:404});

 // Important: remove stale manual-video rows that could otherwise be published before the new reel.
 const {error:cleanupError}=await sb.from("social_content_queue")
  .delete()
  .eq("status","scheduled")
  .eq("media_brief","generated-video-manual-test")
  .in("platform",["instagram","facebook"]);
 if(cleanupError)return NextResponse.json({ok:false,error:cleanupError.message},{status:500});

 const angle=String(job.theme||"");
 const facts=angle==="prix accessible"
  ?"Voiture sans permis électrique à partir de 3 990 € TTC."
  :angle==="recharge 220 V"
   ?"Recharge simplement sur une prise 220 V."
   :angle==="livraison France"
    ?"NeoDrive est livrée partout en France."
    :angle==="2 places"
     ?"Deux places et une motorisation 100% électrique."
     :"Découvrez NeoDrive en situation réelle.";
 const caption=`${job.hook||"NeoDrive dans la vraie vie"}\n\n${facts}\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;

 // Use a unique, immediately-due timestamp so the two rows inserted below are the next ones consumed.
 const due=new Date(Date.now()-1000).toISOString();
 const rows=["instagram","facebook"].map(platform=>({
  platform,
  content_type:"reel",
  hook:job.hook||job.theme||"video",
  caption,
  hashtags:[],
  media_brief:"generated-video-manual-test",
  media_url:job.output_url,
  cta:"easydrive-auto.fr",
  publish_at:due,
  status:"scheduled",
  requires_human_review:false,
  retry_count:0,
  max_retries:3
 }));
 const {error:qe}=await sb.from("social_content_queue").insert(rows);if(qe)return NextResponse.json({ok:false,error:qe.message},{status:500});

 const origin=new URL(req.url).origin;
 const [ir,fr]=await Promise.all([
  fetch(`${origin}/api/instagram/publish-next`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})}),
  fetch(`${origin}/api/facebook/publish-next`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})})
 ]);
 const [ij,fj]=await Promise.all([ir.json().catch(()=>({})),fr.json().catch(()=>({}))]);
 return NextResponse.json({
  ok:ir.ok&&fr.ok,
  jobId:job.id,
  theme:job.theme,
  video:job.output_url,
  instagram:ij,
  facebook:fj
 },{status:ir.ok&&fr.ok?200:207});
}
