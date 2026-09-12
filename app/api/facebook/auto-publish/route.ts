import { NextResponse } from "next/server";
import { buildSocialCaption, isVideoAsset, pickSocialTheme, type SocialTheme } from "@/lib/social-copy";

export const dynamic="force-dynamic";
export const maxDuration=90;

const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type Asset={id:string;storage_path:string;public_url:string;media_type:string;title:string|null;context:string|null;times_used:number|null;last_used_at:string|null;created_at:string};
type Q={id:string;caption:string;media_url:string;content_type:string;hook?:string|null;retry_count:number|null;max_retries:number|null};
type Kind="image"|"video";

const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k});
const video=(t:string,u:string)=>/video|reel/i.test(t||"")||/\.(mp4|mov|m4v)(\?|$)/i.test(u||"");
const eligible=(a:Asset)=>!/^generated\//.test(a.storage_path||"")&&!!a.public_url&&(video(a.media_type,a.public_url)||/\.(jpe?g|png|webp)(\?|$)/i.test(a.public_url));
const kindOf=(a:Asset):Kind=>isVideoAsset(a)?"video":"image";

async function getQueue(k:string){
  const u=new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.facebook");u.searchParams.set("status","eq.scheduled");u.searchParams.set("publish_at",`lte.${new Date().toISOString()}`);
  u.searchParams.set("select","id,caption,media_url,content_type,hook,retry_count,max_retries");u.searchParams.set("order","publish_at.asc");u.searchParams.set("limit","1");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json();return r.ok&&j?.[0]?j[0] as Q:null;
}

async function recentTexts(k:string){
  const u=new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.facebook");u.searchParams.set("status","eq.published");u.searchParams.set("select","hook,caption");u.searchParams.set("order","updated_at.desc");u.searchParams.set("limit","30");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json().catch(()=>[]);
  if(!r.ok||!Array.isArray(j))return [] as string[];
  return j.map((x:any)=>`${x.hook||""}\n${x.caption||""}`);
}

async function lastPublishedKind(k:string):Promise<Kind|null>{
  const u=new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.facebook");u.searchParams.set("status","eq.published");u.searchParams.set("select","content_type,media_url");u.searchParams.set("order","updated_at.desc");u.searchParams.set("limit","1");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json().catch(()=>[]);
  if(!r.ok||!Array.isArray(j)||!j[0])return null;
  return video(j[0].content_type||"",j[0].media_url||"")?"video":"image";
}

function randomFrom(list:Asset[]){if(!list.length)return null;return list[Math.floor(Math.random()*list.length)]||null;}

function pickFromPool(list:Asset[],preferred:Kind|null){
  const images=list.filter(a=>kindOf(a)==="image"),videos=list.filter(a=>kindOf(a)==="video");
  const target=preferred==="image"?images:preferred==="video"?videos:(Math.random()<0.5?images:videos);
  const fallback=preferred==="image"?videos:preferred==="video"?images:(target===images?videos:images);
  const pool=target.length?target:fallback.length?fallback:list;
  const cutoff=Date.now()-36*60*60*1000;
  const cooled=pool.filter(a=>!a.last_used_at||new Date(a.last_used_at).getTime()<cutoff);
  return randomFrom(cooled.length?cooled:pool);
}

async function getAsset(k:string,preferred:Kind|null=null){
  const u=new URL(`${SB}/rest/v1/social_media_assets`);
  u.searchParams.set("status","eq.ready");
  u.searchParams.set("select","id,storage_path,public_url,media_type,title,context,times_used,last_used_at,created_at");
  u.searchParams.set("order","created_at.asc");u.searchParams.set("limit","1000");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json();if(!r.ok||!Array.isArray(j))return null;
  const list=(j as Asset[]).filter(eligible);if(!list.length)return null;
  return pickFromPool(list,preferred);
}

async function patch(k:string,id:string,data:any){
  await fetch(`${SB}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...data,updated_at:new Date().toISOString()}),cache:"no-store"});
}

async function mark(k:string,id:string){
  const r=await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}&select=times_used`,{headers:H(k),cache:"no-store"});const x=(await r.json().catch(()=>[]))?.[0];
  await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({times_used:Number(x?.times_used||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"});
}

async function rememberFresh(k:string,a:Asset,theme:SocialTheme,msg:string,externalId:string){
  await fetch(`${SB}/rest/v1/social_content_queue`,{method:"POST",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({platform:"facebook",content_type:isVideoAsset(a)?"reel":"post",hook:theme.hook,caption:msg,hashtags:[],media_brief:`fresh-library:${a.id}`,media_url:a.public_url,cta:"easydrive-auto.fr",publish_at:new Date().toISOString(),status:"published",requires_human_review:false,external_post_id:externalId,retry_count:0,max_retries:3}),cache:"no-store"}).catch(()=>{});
}

async function pageToken(t:string,p:string){
  const me=new URL("https://graph.facebook.com/v26.0/me");me.searchParams.set("fields","id");me.searchParams.set("access_token",t);const mr=await fetch(me);const mj=await mr.json();if(mr.ok&&String(mj.id)===p)return t;
  const a=new URL("https://graph.facebook.com/v26.0/me/accounts");a.searchParams.set("fields","id,access_token");a.searchParams.set("access_token",t);const ar=await fetch(a);const aj=await ar.json();const row=aj?.data?.find((x:any)=>String(x.id)===p);if(row?.access_token)return row.access_token;
  const e=aj?.error||mj?.error||{};if(Number(e.code)===190)throw new Error("Connexion Facebook expirée. Reconnecte Meta puis remplace FACEBOOK_PAGE_ACCESS_TOKEN dans Vercel.");throw new Error(e.message||"Facebook Page token invalide");
}

async function publish(p:string,t:string,u:string,msg:string,v:boolean){
  const ep=`https://graph.facebook.com/v26.0/${p}/${v?"videos":"photos"}`;const b=v?new URLSearchParams({file_url:u,description:msg,access_token:t}):new URLSearchParams({url:u,caption:msg,published:"true",access_token:t});
  const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:b});const j=await r.json();if(!r.ok||(!j.id&&!j.post_id)){const e=j?.error||{};throw new Error(`${e.message||"Facebook publish failed"}${e.code?` (code ${e.code})`:""}`);}return j.post_id||j.id;
}

export async function GET(req:Request){
  const s=process.env.CRON_SECRET;if(!s||req.headers.get("authorization")!==`Bearer ${s}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const k=process.env.SUPABASE_SERVICE_ROLE_KEY,t=process.env.FACEBOOK_PAGE_ACCESS_TOKEN,p=process.env.FACEBOOK_PAGE_ID;if(!k||!t||!p)return NextResponse.json({ok:false,error:"Configuration missing"},{status:503});

  const fresh=new URL(req.url).searchParams.get("fresh")==="1";
  const q=fresh?null:await getQueue(k);
  const recent=await recentTexts(k);
  const previousKind=await lastPublishedKind(k);
  const preferred:Kind|null=previousKind==="video"?"image":previousKind==="image"?"video":null;
  const a=await getAsset(k,preferred);
  if(!a)return NextResponse.json({ok:true,skipped:true,reason:"Aucun média réel compatible dans la bibliothèque"});

  const theme=pickSocialTheme(a,recent,`facebook-${q?.id||"fresh"}-${a.id}-${Date.now()}`);
  const msg=buildSocialCaption(theme,a,`facebook-${q?.id||"fresh"}-${Date.now()}`);
  const url=a.public_url;
  const typ=a.media_type;

  if(q){
    await patch(k,q.id,{status:"publishing",hook:theme.hook,caption:msg,media_url:url,content_type:isVideoAsset(a)?"reel":"post",last_attempt_at:new Date().toISOString()});
  }

  try{
    const pt=await pageToken(t,p);const id=await publish(p,pt,url,msg,video(typ,url));
    if(q){await patch(k,q.id,{status:"published",external_post_id:id,error_message:null});await mark(k,a.id);}
    else{await mark(k,a.id);await rememberFresh(k,a,theme,msg,id);}
    return NextResponse.json({ok:true,published:true,source:q?"planned-slot-mixed-library":"fresh-mixed-library",postId:id,media:url,type:kindOf(a),theme:theme.hook,caption:msg});
  }catch(e){
    if(q){const n=Number(q.retry_count||0)+1,max=Number(q.max_retries||3);await patch(k,q.id,{status:n>=max?"failed":"scheduled",retry_count:n,last_attempt_at:new Date().toISOString(),...(n>=max?{}:{publish_at:new Date(Date.now()+60*60*1000).toISOString()}),error_message:e instanceof Error?e.message:"Unknown"});}
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown"},{status:500});
  }
}
