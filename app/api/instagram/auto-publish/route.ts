import { NextResponse } from "next/server";
import { claimSlot, consumeDryToken, planAutoPost, recordAutoPost } from "@/lib/social-autopost";
import { resolveInstagramPublishingAuth, type InstagramPublishingAuth } from "@/lib/instagram-publishing-auth";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Q = { id:string; caption:string; media_url:string; content_type:string; hook:string|null; retry_count:number|null; max_retries:number|null };

const H = (k:string) => ({ Authorization:`Bearer ${k}`, apikey:k });
const video = (t:string,u:string) => /video|reel/i.test(t||"") || /\.(mp4|mov|m4v)(\?|$)/i.test(u||"");

async function queue(k:string) {
  const u = new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.instagram");
  u.searchParams.set("status","eq.scheduled");
  u.searchParams.set("publish_at",`lte.${new Date().toISOString()}`);
  u.searchParams.set("select","id,caption,media_url,content_type,hook,retry_count,max_retries");
  u.searchParams.set("order","publish_at.asc");
  u.searchParams.set("limit","1");
  const r = await fetch(u,{headers:H(k),cache:"no-store"});
  const j = await r.json();
  return r.ok && j?.[0] ? j[0] as Q : null;
}

async function patch(k:string,id:string,data:Record<string,unknown>) {
  await fetch(`${SB}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(id)}`,{
    method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({...data,updated_at:new Date().toISOString()}),cache:"no-store"
  });
}

async function wait(id:string,auth:InstagramPublishingAuth) {
  let last="IN_PROGRESS";
  for(let i=0;i<96;i++){
    const u=new URL(`${auth.graphBase}/${id}`);
    u.searchParams.set("fields","status_code,status");u.searchParams.set("access_token",auth.token);
    const r=await fetch(u,{cache:"no-store"});const j=await r.json().catch(()=>({}));
    last=j.status_code||j.status||last;
    if(j.status_code==="FINISHED") return;
    if(["ERROR","EXPIRED"].includes(j.status_code)) throw new Error(j?.status||`Media processing ${j.status_code}`);
    await sleep(2500);
  }
  throw new Error(`Media processing timeout after 4 minutes (last status: ${last})`);
}

async function publish(auth:InstagramPublishingAuth,url:string,msg:string,isV:boolean) {
  const u=new URL(`${auth.graphBase}/${auth.accountId}/media`);
  const p:Record<string,string>={caption:msg,access_token:auth.token};
  if(isV){p.media_type="REELS";p.video_url=url;p.share_to_feed="true";} else p.image_url=url;
  const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(p),cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.id) throw new Error(j?.error?.message||"Container creation failed");
  await wait(j.id,auth);
  let last="";
  for(let i=0;i<12;i++){
    const pu=new URL(`${auth.graphBase}/${auth.accountId}/media_publish`);
    const pr=await fetch(pu,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({creation_id:j.id,access_token:auth.token}),cache:"no-store"});
    const pj=await pr.json().catch(()=>({}));
    if(pr.ok&&pj.id) return pj.id;
    last=pj?.error?.message||last;
    await sleep(3000);
  }
  throw new Error(last||"Instagram publish failed after processing finished");
}

/** Jusqu'à 3 publications par jour (créneaux du cron ~8 h 30, 12 h 30, 18 h 30) à partir d'un vrai média (lib/social-autopost : rotation des sujets, pas de répétition sur 14 jours).
 * ?manual=1 : bouton « publier maintenant » (ignore la limite du jour) · ?dry=1&once=<jeton social-dry> : aperçu sans le secret du cron · ?queue=1 : publie l'élément préparé à la main dans la file
 * · ?dry=1 : montre ce qui serait publié, sans rien publier. */
export async function GET(req:Request) {
  await applyStoredSecrets();
  const sp=new URL(req.url).searchParams;
  const s=process.env.CRON_SECRET,alt=process.env.INSTAGRAM_AUTOMATION_SECRET,auth=req.headers.get("authorization");
  const dryOnly=sp.get("dry")==="1"&&await consumeDryToken(sp.get("once"));
  if(!dryOnly&&!((s&&auth===`Bearer ${s}`)||(alt&&auth===`Bearer ${alt}`))) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const k=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!k) return NextResponse.json({ok:false,error:"Supabase configuration missing"},{status:503});

  // File manuelle (Reel préparé depuis /social-upload) : légende et média déjà choisis.
  if(sp.get("queue")==="1"&&!dryOnly){
    const q=await queue(k);
    if(!q) return NextResponse.json({ok:true,skipped:true,reason:"Rien dans la file"});
    await patch(k,q.id,{status:"publishing",last_attempt_at:new Date().toISOString()});
    try{
      const ia=await resolveInstagramPublishingAuth();
      const id=await publish(ia,q.media_url,q.caption,video(q.content_type,q.media_url));
      await patch(k,q.id,{status:"published",external_post_id:id,error_message:null});
      return NextResponse.json({ok:true,published:true,source:"queue",mediaId:id,media:q.media_url,caption:q.caption});
    }catch(e){
      const n=Number(q.retry_count||0)+1,max=Number(q.max_retries||3);
      await patch(k,q.id,{status:n>=max?"failed":"scheduled",retry_count:n,last_attempt_at:new Date().toISOString(),...(n>=max?{}:{publish_at:new Date(Date.now()+15*60*1000).toISOString()}),error_message:e instanceof Error?e.message:"Unknown"});
      return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown"},{status:500});
    }
  }

  const plan=await planAutoPost("instagram",{manual:sp.get("manual")==="1"||sp.get("dry")==="1"});
  if("skip" in plan) return NextResponse.json({ok:true,skipped:true,reason:plan.skip});
  const m=plan.choice.media;
  const info={pillar:plan.choice.pillar.id,source:m.source,media:m.source==="fabrique"?m.key:m.url,type:m.kind,hook:plan.hook,caption:plan.caption,ai:plan.ai,rejected:plan.rejected};
  if(sp.get("dry")==="1") return NextResponse.json({ok:true,dryRun:true,...info});
  if(sp.get("manual")!=="1"&&!(await claimSlot("instagram")))return NextResponse.json({ok:true,skipped:true,reason:"Créneau déjà pris (tâche lancée deux fois)"});
  try{
    const ia=await resolveInstagramPublishingAuth();
    const id=await publish(ia,m.url,plan.caption,m.kind==="video");
    await recordAutoPost("instagram",plan,id);
    return NextResponse.json({ok:true,published:true,authSource:ia.source,mediaId:id,...info});
  } catch(e){
    console.error("[INSTAGRAM] publication failed", { error:e instanceof Error?e.message:"Unknown", media:m.key });
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown",...info},{status:500});
  }
}
