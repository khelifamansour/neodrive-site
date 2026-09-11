import { NextResponse } from "next/server";
import { buildSocialCaption, isVideoAsset, pickSocialTheme, type SocialTheme } from "@/lib/social-copy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Q = { id:string; caption:string; media_url:string; content_type:string; hook:string|null; retry_count:number|null; max_retries:number|null };
type A = { id:string; storage_path:string; public_url:string; media_type:string; title:string|null; context:string|null; times_used:number|null; last_used_at:string|null; created_at:string };

const H = (k:string) => ({ Authorization:`Bearer ${k}`, apikey:k });
const video = (t:string,u:string) => /video|reel/i.test(t||"") || /\.(mp4|mov|m4v)(\?|$)/i.test(u||"");
const real = (a:A) => /^\d{4}-\d{2}-\d{2}\//.test(a.storage_path||"") && !/^generated\//.test(a.storage_path||"");
const compatible = (a:A) => video(a.media_type,a.public_url) || /\.(jpe?g|png)(\?|$)/i.test(a.public_url);

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

async function recentTexts(k:string) {
  const u = new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.instagram");
  u.searchParams.set("status","eq.published");
  u.searchParams.set("select","hook,caption");
  u.searchParams.set("order","created_at.desc");
  u.searchParams.set("limit","24");
  const r = await fetch(u,{headers:H(k),cache:"no-store"});
  const j = await r.json().catch(()=>[]);
  if (!r.ok || !Array.isArray(j)) return [] as string[];
  return j.map((x:any)=>`${x.hook||""}\n${x.caption||""}`);
}

function leastUsed(list:A[]) {
  return [...list].sort((a,b)=>{
    const useDiff = Number(a.times_used||0) - Number(b.times_used||0);
    if (useDiff) return useDiff;
    const aLast = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
    const bLast = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
    if (aLast !== bLast) return aLast - bLast;
    return Math.random() - 0.5;
  })[0] || null;
}

async function asset(k:string) {
  const since = new Date(Date.now()-120*24*60*60*1000).toISOString();
  const u = new URL(`${SB}/rest/v1/social_media_assets`);
  u.searchParams.set("status","eq.ready");
  u.searchParams.set("created_at",`gte.${since}`);
  u.searchParams.set("select","id,storage_path,public_url,media_type,title,context,times_used,last_used_at,created_at");
  u.searchParams.set("order","created_at.desc");
  u.searchParams.set("limit","240");
  const r = await fetch(u,{headers:H(k),cache:"no-store"});
  const j = await r.json();
  if(!r.ok || !Array.isArray(j)) return null;
  const list = (j as A[]).filter(a=>real(a)&&compatible(a));
  if(!list.length) return null;
  const images = list.filter(a=>!isVideoAsset(a));
  const videos = list.filter(a=>isVideoAsset(a));
  const preferImage = Math.random() < 0.55;
  return leastUsed(preferImage ? images : videos) || leastUsed(preferImage ? videos : images) || leastUsed(list);
}

async function patch(k:string,id:string,data:any) {
  await fetch(`${SB}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(id)}`,{
    method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({...data,updated_at:new Date().toISOString()}),cache:"no-store"
  });
}

async function mark(k:string,id:string) {
  const r = await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}&select=times_used`,{headers:H(k),cache:"no-store"});
  const x = (await r.json().catch(()=>[]))?.[0];
  await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}`,{
    method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({times_used:Number(x?.times_used||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"
  });
}

async function markUrl(k:string,url:string) {
  const u = new URL(`${SB}/rest/v1/social_media_assets`);
  u.searchParams.set("public_url",`eq.${url}`);
  u.searchParams.set("select","id");u.searchParams.set("limit","1");
  const r = await fetch(u,{headers:H(k),cache:"no-store"});
  const j = await r.json().catch(()=>[]);
  if(r.ok&&j?.[0]?.id) await mark(k,j[0].id);
}

async function rememberFresh(k:string,a:A,theme:SocialTheme,msg:string,externalId:string) {
  await fetch(`${SB}/rest/v1/social_content_queue`,{
    method:"POST",
    headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({
      platform:"instagram",
      content_type:isVideoAsset(a)?"reel":"post",
      hook:theme.hook,
      caption:msg,
      hashtags:[],
      media_brief:`fresh-real-upload:${a.id}`,
      media_url:a.public_url,
      cta:"easydrive-auto.fr",
      publish_at:new Date().toISOString(),
      status:"published",
      requires_human_review:false,
      external_post_id:externalId,
      retry_count:0,
      max_retries:3,
    }),
    cache:"no-store"
  }).catch(()=>{});
}

async function acct(t:string) {
  const u = new URL("https://graph.instagram.com/me");
  u.searchParams.set("fields","id,username");u.searchParams.set("access_token",t);
  const r = await fetch(u);const j = await r.json();
  if(!r.ok||!j.id) throw new Error(j?.error?.message||"Instagram account error");
  return j;
}

async function wait(id:string,t:string) {
  let last="IN_PROGRESS";
  for(let i=0;i<96;i++){
    const u=new URL(`https://graph.instagram.com/${id}`);
    u.searchParams.set("fields","status_code,status");u.searchParams.set("access_token",t);
    const r=await fetch(u,{cache:"no-store"});const j=await r.json().catch(()=>({}));
    last=j.status_code||j.status||last;
    if(j.status_code==="FINISHED") return;
    if(["ERROR","EXPIRED"].includes(j.status_code)) throw new Error(j?.status||`Media processing ${j.status_code}`);
    await sleep(2500);
  }
  throw new Error(`Media processing timeout after 4 minutes (last status: ${last})`);
}

async function publish(aid:string,t:string,url:string,msg:string,isV:boolean) {
  const u=new URL(`https://graph.instagram.com/${aid}/media`);
  const p:Record<string,string>={caption:msg,access_token:t};
  if(isV){p.media_type="REELS";p.video_url=url;p.share_to_feed="true";} else p.image_url=url;
  const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(p),cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.id) throw new Error(j?.error?.message||"Container creation failed");
  await wait(j.id,t);
  let last="";
  for(let i=0;i<12;i++){
    const pu=new URL(`https://graph.instagram.com/${aid}/media_publish`);
    const pr=await fetch(pu,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({creation_id:j.id,access_token:t}),cache:"no-store"});
    const pj=await pr.json().catch(()=>({}));
    if(pr.ok&&pj.id) return pj.id;
    last=pj?.error?.message||last;
    await sleep(3000);
  }
  throw new Error(last||"Instagram publish failed after processing finished");
}

export async function GET(req:Request) {
  const s=process.env.CRON_SECRET,alt=process.env.INSTAGRAM_AUTOMATION_SECRET,auth=req.headers.get("authorization");
  if(!((s&&auth===`Bearer ${s}`)||(alt&&auth===`Bearer ${alt}`))) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const k=process.env.SUPABASE_SERVICE_ROLE_KEY,t=process.env.INSTAGRAM_ACCESS_TOKEN;
  if(!k||!t) return NextResponse.json({ok:false,error:"Configuration missing"},{status:503});

  const fresh=new URL(req.url).searchParams.get("fresh")==="1";
  let q=fresh?null:await queue(k),a:A|null=null,msg="",url="",typ="",theme:SocialTheme|null=null;

  if(q){
    msg=q.caption;url=q.media_url;typ=q.content_type;
    await patch(k,q.id,{status:"publishing",last_attempt_at:new Date().toISOString()});
  } else if(fresh){
    a=await asset(k);
    if(!a) return NextResponse.json({ok:true,skipped:true,reason:"Aucun média réel récent compatible"});
    theme=pickSocialTheme(a,await recentTexts(k),`instagram-${a.id}`);
    msg=buildSocialCaption(theme,a,"instagram");
    url=a.public_url;typ=a.media_type;
  } else {
    return NextResponse.json({ok:true,skipped:true,reason:"Aucune publication réelle planifiée à cette heure"});
  }

  try{
    const ac=await acct(t);
    const id=await publish(ac.id,t,url,msg,video(typ,url));
    if(q){await patch(k,q.id,{status:"published",external_post_id:id,error_message:null});await markUrl(k,url);}
    if(a){await mark(k,a.id);if(theme)await rememberFresh(k,a,theme,msg,id);}
    return NextResponse.json({ok:true,published:true,source:fresh?"fresh-upload":"planned-real-upload",mediaId:id,media:url,type:typ,theme:theme?.hook||q?.hook||null});
  } catch(e){
    if(q){
      const n=Number(q.retry_count||0)+1,max=Number(q.max_retries||3);
      await patch(k,q.id,{status:n>=max?"failed":"scheduled",retry_count:n,last_attempt_at:new Date().toISOString(),...(n>=max?{}:{publish_at:new Date(Date.now()+15*60*1000).toISOString()}),error_message:e instanceof Error?e.message:"Unknown"});
    }
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown"},{status:500});
  }
}
