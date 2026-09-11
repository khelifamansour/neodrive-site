import { NextResponse } from "next/server";
import { buildSocialCaption, isVideoAsset, pickSocialTheme, type SocialTheme } from "@/lib/social-copy";

export const dynamic="force-dynamic";
export const maxDuration=90;

const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type Asset={id:string;storage_path:string;public_url:string;media_type:string;title:string|null;context:string|null;times_used:number|null;last_used_at:string|null;created_at:string};
type Q={id:string;caption:string;media_url:string;content_type:string;hook?:string|null;retry_count:number|null;max_retries:number|null};

const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k});
const video=(t:string,u:string)=>/video|reel/i.test(t||"")||/\.(mp4|mov|m4v)(\?|$)/i.test(u||"");
const real=(a:Asset)=>/^\d{4}-\d{2}-\d{2}\//.test(a.storage_path||"")&&!/^generated\//.test(a.storage_path||"");

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

function leastUsed(list:Asset[]){
  return [...list].sort((a,b)=>{
    const d=Number(a.times_used||0)-Number(b.times_used||0);if(d)return d;
    const al=a.last_used_at?new Date(a.last_used_at).getTime():0,bl=b.last_used_at?new Date(b.last_used_at).getTime():0;
    if(al!==bl)return al-bl;
    return Math.random()-0.5;
  })[0]||null;
}

async function getAsset(k:string){
  const since=new Date(Date.now()-120*24*60*60*1000).toISOString();
  const u=new URL(`${SB}/rest/v1/social_media_assets`);
  u.searchParams.set("status","eq.ready");u.searchParams.set("created_at",`gte.${since}`);
  u.searchParams.set("select","id,storage_path,public_url,media_type,title,context,times_used,last_used_at,created_at");u.searchParams.set("order","created_at.desc");u.searchParams.set("limit","240");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json();if(!r.ok||!Array.isArray(j))return null;
  const list=(j as Asset[]).filter(a=>real(a)&&(video(a.media_type,a.public_url)||/\.(jpe?g|png|webp)(\?|$)/i.test(a.public_url)));
  if(!list.length)return null;
  const images=list.filter(a=>!isVideoAsset(a)),videos=list.filter(a=>isVideoAsset(a));
  const preferImage=Math.random()<0.55;
  return leastUsed(preferImage?images:videos)||leastUsed(preferImage?videos:images)||leastUsed(list);
}

async function assetByUrl(k:string,url:string){
  const u=new URL(`${SB}/rest/v1/social_media_assets`);u.searchParams.set("public_url",`eq.${url}`);
  u.searchParams.set("select","id,storage_path,public_url,media_type,title,context,times_used,last_used_at,created_at");u.searchParams.set("limit","1");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json().catch(()=>[]);
  return r.ok&&Array.isArray(j)&&j[0]?j[0] as Asset:null;
}

async function patch(k:string,id:string,data:any){
  await fetch(`${SB}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...data,updated_at:new Date().toISOString()}),cache:"no-store"});
}

async function mark(k:string,id:string){
  const r=await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}&select=times_used`,{headers:H(k),cache:"no-store"});const x=(await r.json().catch(()=>[]))?.[0];
  await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({times_used:Number(x?.times_used||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"});
}

async function markUrl(k:string,url:string){const a=await assetByUrl(k,url);if(a?.id)await mark(k,a.id);}

async function rememberFresh(k:string,a:Asset,theme:SocialTheme,msg:string,externalId:string){
  await fetch(`${SB}/rest/v1/social_content_queue`,{method:"POST",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({platform:"facebook",content_type:isVideoAsset(a)?"reel":"post",hook:theme.hook,caption:msg,hashtags:[],media_brief:`fresh-real-upload:${a.id}`,media_url:a.public_url,cta:"easydrive-auto.fr",publish_at:new Date().toISOString(),status:"published",requires_human_review:false,external_post_id:externalId,retry_count:0,max_retries:3}),cache:"no-store"}).catch(()=>{});
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
  let q=fresh?null:await getQueue(k);let a:Asset|null=null;let msg="",url="",typ="",theme:SocialTheme|null=null;
  const recent=await recentTexts(k);

  if(q){
    url=q.media_url;typ=q.content_type;a=await assetByUrl(k,q.media_url);
    if(a){theme=pickSocialTheme(a,recent,`facebook-queued-${q.id}-${Date.now()}`);msg=buildSocialCaption(theme,a,`facebook-${q.id}-${Date.now()}`);await patch(k,q.id,{status:"publishing",hook:theme.hook,caption:msg,last_attempt_at:new Date().toISOString()});}
    else{msg=q.caption;await patch(k,q.id,{status:"publishing",last_attempt_at:new Date().toISOString()});}
  }else{
    a=await getAsset(k);if(!a)return NextResponse.json({ok:true,skipped:true,reason:"Aucun média réel récent"});
    theme=pickSocialTheme(a,recent,`facebook-fresh-${a.id}-${Date.now()}`);msg=buildSocialCaption(theme,a,`facebook-fresh-${Date.now()}`);url=a.public_url;typ=a.media_type;
  }

  try{
    const pt=await pageToken(t,p);const id=await publish(p,pt,url,msg,video(typ,url));
    if(q){await patch(k,q.id,{status:"published",external_post_id:id,error_message:null});if(a)await mark(k,a.id);else await markUrl(k,url);}
    else if(a){await mark(k,a.id);if(theme)await rememberFresh(k,a,theme,msg,id);}
    return NextResponse.json({ok:true,published:true,source:q?"planned-real-upload":"fresh-upload",postId:id,media:url,type:typ,theme:theme?.hook||q?.hook||null,caption:msg});
  }catch(e){
    if(q){const n=Number(q.retry_count||0)+1,max=Number(q.max_retries||3);await patch(k,q.id,{status:n>=max?"failed":"scheduled",retry_count:n,last_attempt_at:new Date().toISOString(),...(n>=max?{}:{publish_at:new Date(Date.now()+60*60*1000).toISOString()}),error_message:e instanceof Error?e.message:"Unknown"});}
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown"},{status:500});
  }
}
