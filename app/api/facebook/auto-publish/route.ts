import { NextResponse } from "next/server";
import { claimSlot, consumeDryToken, planAutoPost, recordAutoPost } from "@/lib/social-autopost";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic="force-dynamic";
export const maxDuration=180;

const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type Q={id:string;caption:string;media_url:string;content_type:string;hook?:string|null;retry_count:number|null;max_retries:number|null};

const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k});
const video=(t:string,u:string)=>/video|reel/i.test(t||"")||/\.(mp4|mov|m4v)(\?|$)/i.test(u||"");

async function getQueue(k:string){
  const u=new URL(`${SB}/rest/v1/social_content_queue`);
  u.searchParams.set("platform","eq.facebook");u.searchParams.set("status","eq.scheduled");u.searchParams.set("publish_at",`lte.${new Date().toISOString()}`);
  u.searchParams.set("select","id,caption,media_url,content_type,hook,retry_count,max_retries");u.searchParams.set("order","publish_at.asc");u.searchParams.set("limit","1");
  const r=await fetch(u,{headers:H(k),cache:"no-store"});const j=await r.json();return r.ok&&j?.[0]?j[0] as Q:null;
}

async function patch(k:string,id:string,data:Record<string,unknown>){
  await fetch(`${SB}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...H(k),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...data,updated_at:new Date().toISOString()}),cache:"no-store"});
}

async function pageToken(t:string,p:string){
  const me=new URL("https://graph.facebook.com/v26.0/me");me.searchParams.set("fields","id");me.searchParams.set("access_token",t);const mr=await fetch(me);const mj=await mr.json();if(mr.ok&&String(mj.id)===p)return t;
  const a=new URL("https://graph.facebook.com/v26.0/me/accounts");a.searchParams.set("fields","id,access_token");a.searchParams.set("access_token",t);const ar=await fetch(a);const aj=await ar.json();const row=aj?.data?.find((x:{id?:string|number;access_token?:string})=>String(x.id)===p);if(row?.access_token)return row.access_token;
  const e=aj?.error||mj?.error||{};if(Number(e.code)===190)throw new Error("Connexion Facebook expirée. Reconnecte Meta puis remplace FACEBOOK_PAGE_ACCESS_TOKEN dans Vercel.");throw new Error(e.message||"Facebook Page token invalide");
}

async function publish(p:string,t:string,u:string,msg:string,v:boolean){
  const ep=`https://graph.facebook.com/v26.0/${p}/${v?"videos":"photos"}`;const b=v?new URLSearchParams({file_url:u,description:msg,access_token:t}):new URLSearchParams({url:u,caption:msg,published:"true",access_token:t});
  const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:b});const j=await r.json();if(!r.ok||(!j.id&&!j.post_id)){const e=j?.error||{};throw new Error(`${e.message||"Facebook publish failed"}${e.code?` (code ${e.code})`:""}`);}return j.post_id||j.id;
}

/** Jusqu'à 3 publications par jour (créneaux du cron ~8 h 30, 12 h 30, 18 h 30) à partir d'un vrai média (lib/social-autopost : rotation des sujets, pas de répétition sur 14 jours).
 * ?manual=1 : bouton « publier maintenant » (ignore la limite du jour) · ?dry=1&once=<jeton social-dry> : aperçu sans le secret du cron · ?queue=1 : publie l'élément préparé à la main dans la file
 * · ?dry=1 : montre ce qui serait publié, sans rien publier. */
export async function GET(req:Request){
  await applyStoredSecrets();
  const sp=new URL(req.url).searchParams;
  const s=process.env.CRON_SECRET;
  const dryOnly=sp.get("dry")==="1"&&await consumeDryToken(sp.get("once"));
  if(!dryOnly&&(!s||req.headers.get("authorization")!==`Bearer ${s}`))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const k=process.env.SUPABASE_SERVICE_ROLE_KEY,t=process.env.FACEBOOK_PAGE_ACCESS_TOKEN,p=process.env.FACEBOOK_PAGE_ID;if(!k||!t||!p)return NextResponse.json({ok:false,error:"Configuration missing"},{status:503});

  if(sp.get("queue")==="1"&&!dryOnly){
    const q=await getQueue(k);
    if(!q)return NextResponse.json({ok:true,skipped:true,reason:"Rien dans la file"});
    await patch(k,q.id,{status:"publishing",last_attempt_at:new Date().toISOString()});
    try{
      const pt=await pageToken(t,p);const id=await publish(p,pt,q.media_url,q.caption,video(q.content_type,q.media_url));
      await patch(k,q.id,{status:"published",external_post_id:id,error_message:null});
      return NextResponse.json({ok:true,published:true,source:"queue",postId:id,media:q.media_url,caption:q.caption});
    }catch(e){
      const n=Number(q.retry_count||0)+1,max=Number(q.max_retries||3);await patch(k,q.id,{status:n>=max?"failed":"scheduled",retry_count:n,last_attempt_at:new Date().toISOString(),...(n>=max?{}:{publish_at:new Date(Date.now()+60*60*1000).toISOString()}),error_message:e instanceof Error?e.message:"Unknown"});
      return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown"},{status:500});
    }
  }

  const plan=await planAutoPost("facebook",{manual:sp.get("manual")==="1"||sp.get("dry")==="1"});
  if("skip" in plan)return NextResponse.json({ok:true,skipped:true,reason:plan.skip});
  const m=plan.choice.media;
  const info={pillar:plan.choice.pillar.id,source:m.source,media:m.source==="fabrique"?m.key:m.url,type:m.kind,hook:plan.hook,caption:plan.caption,ai:plan.ai,rejected:plan.rejected};
  if(sp.get("dry")==="1")return NextResponse.json({ok:true,dryRun:true,...info});
  if(sp.get("manual")!=="1"&&!(await claimSlot("facebook")))return NextResponse.json({ok:true,skipped:true,reason:"Créneau déjà pris (tâche lancée deux fois)"});
  try{
    const pt=await pageToken(t,p);const id=await publish(p,pt,m.url,plan.caption,m.kind==="video");
    await recordAutoPost("facebook",plan,id);
    return NextResponse.json({ok:true,published:true,postId:id,...info});
  }catch(e){
    console.error("[FACEBOOK] publication failed",{error:e instanceof Error?e.message:"Unknown",media:m.key});
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown",...info},{status:500});
  }
}
