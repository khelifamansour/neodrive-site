import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const sleep = (ms:number) => new Promise(r=>setTimeout(r,ms));

const slots:Record<string,string> = {
  "1":"2026-08-20T18:01:00.000Z",
  "2":"2026-08-20T18:06:00.000Z",
  "3":"2026-08-20T18:11:00.000Z",
};

export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret || req.headers.get("authorization")!==`Bearer ${secret}`){
    return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  }
  const url=new URL(req.url);
  const action=url.searchParams.get("action")||"";
  const slot=url.searchParams.get("slot")||"";
  const start=slots[slot];
  if(!start)return NextResponse.json({ok:false,error:"Invalid slot"},{status:400});

  // One-day production test only. Future daily cron invocations become harmless skips.
  const parisDay=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(parisDay!=="2026-08-20")return NextResponse.json({ok:true,skipped:true,reason:"Scheduled test window ended",slot,action});

  const origin=url.origin;
  if(action==="create"){
    const r=await fetch(`${origin}/api/video/create`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
    const j=await r.json().catch(()=>({}));
    return NextResponse.json({test:true,slot,action,...j},{status:r.status});
  }

  if(action==="publish"){
    const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
    const sb=createClient(SB,sk,{auth:{persistSession:false}});
    let job:any=null;
    for(let i=0;i<10;i++){
      const {data}=await sb.from("video_generation_jobs")
        .select("id,status,output_url,theme,created_at,completed_at,error_message")
        .gte("created_at",start)
        .order("created_at",{ascending:false})
        .limit(1)
        .maybeSingle();
      job=data;
      if(job?.status==="succeeded"&&job?.output_url)break;
      if(job?.status==="failed")return NextResponse.json({ok:false,test:true,slot,action,error:`Render failed: ${job.error_message||"unknown"}`},{status:500});
      await sleep(5000);
    }
    if(!job?.id || job.status!=="succeeded" || !job.output_url){
      return NextResponse.json({ok:false,test:true,slot,action,error:"Reel not ready after scheduled wait",job},{status:409});
    }
    const r=await fetch(`${origin}/api/video/publish-latest`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({passcode:secret,jobId:job.id,platform:"instagram"}),cache:"no-store"
    });
    const j=await r.json().catch(()=>({}));
    return NextResponse.json({test:true,slot,action,selectedJob:job.id,theme:job.theme,result:j},{status:r.status});
  }
  return NextResponse.json({ok:false,error:"Invalid action"},{status:400});
}
