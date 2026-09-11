import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const CAMPAIGN_DAYS = 90;
const CAMPAIGN_END = new Date("2026-12-10T23:59:59Z");
const MEDIA_LOOKBACK_DAYS = 120;

type Asset = { id:string; storage_path:string; public_url:string; media_type:string; context:string|null; title:string|null; times_used:number; created_at:string };

function isRealUpload(a:Asset){
  return /^\d{4}-\d{2}-\d{2}\//.test(a.storage_path||"") && !/^generated\//.test(a.storage_path||"");
}
function isVideo(a:Asset){return a.media_type==="video"||/\.(mp4|mov|m4v)(\?|$)/i.test(a.public_url||"");}
function safeContext(v:string|null){return String(v||"").replace(/\s+/g," ").trim().slice(0,280);}
function captionFor(a:Asset){
  const ctx=safeContext(a.context);
  const lead=ctx || (isVideo(a)?"NeoDrive en situation réelle.":"Un aperçu réel de NeoDrive.");
  const second=isVideo(a)
    ? "Une vraie vidéo issue de notre activité, pour voir la voiture telle qu’elle est au quotidien."
    : "Une vraie photo issue de notre activité, sans visuel générique.";
  return `${lead}\n\n${second}\n\nDécouvrez NeoDrive sur easydrive-auto.fr\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;
}

export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!sk) return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
  const now=new Date();
  if(now>CAMPAIGN_END) return NextResponse.json({ok:true,skipped:true,reason:"Campagne intensive de 3 mois terminée",campaignEnd:CAMPAIGN_END.toISOString()});

  const sb=createClient(SB,sk,{auth:{persistSession:false,autoRefreshToken:false}});
  const since=new Date(Date.now()-MEDIA_LOOKBACK_DAYS*24*60*60*1000).toISOString();
  const {data,error}=await sb.from("social_media_assets")
    .select("id,storage_path,public_url,media_type,context,title,times_used,created_at")
    .eq("status","ready")
    .gte("created_at",since)
    .order("times_used",{ascending:true})
    .order("created_at",{ascending:false})
    .limit(300);
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});

  const assets=(data||[]).filter((x:any)=>isRealUpload(x as Asset)) as Asset[];
  if(!assets.length) return NextResponse.json({ok:true,skipped:true,reason:"Aucun média réel récent dans la bibliothèque"});

  // Rebuild the remaining campaign through 10 December. Published history is preserved.
  await sb.from("social_content_queue").delete().eq("status","scheduled").in("platform",["instagram","facebook"]);

  const videos=assets.filter(isVideo);
  const images=assets.filter(a=>!isVideo(a));
  let vi=0,ii=0;
  const used=new Set<string>();
  function take(prefer:"video"|"image"){
    const first=prefer==="video"?videos:images, second=prefer==="video"?images:videos;
    const firstIndex=prefer==="video"?()=>vi++:()=>ii++;
    const secondIndex=prefer==="video"?()=>ii++:()=>vi++;
    while(true){const n=firstIndex();const a=first[n];if(!a)break;if(!used.has(a.id)){used.add(a.id);return a;}}
    while(true){const n=secondIndex();const a=second[n];if(!a)break;if(!used.has(a.id)){used.add(a.id);return a;}}
    return null;
  }

  const rows:any[]=[];
  for(let d=0;d<CAMPAIGN_DAYS;d++){
    for(const slot of [{h:7,m:30,prefer:"video" as const},{h:16,m:30,prefer:"image" as const}]){
      const when=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+d,slot.h,slot.m,0));
      if(when>CAMPAIGN_END) continue;
      const a=take(slot.prefer);if(!a)continue;
      const caption=captionFor(a);
      for(const platform of ["instagram","facebook"]){
        rows.push({
          platform,
          content_type:isVideo(a)?"reel":"post",
          hook:safeContext(a.context)||"NeoDrive en situation réelle",
          caption,
          hashtags:[],
          media_brief:`real-upload:${a.id}`,
          media_url:a.public_url,
          cta:"easydrive-auto.fr",
          publish_at:when.toISOString(),
          status:"scheduled",
          requires_human_review:false,
          retry_count:0,
          max_retries:3
        });
      }
    }
  }
  if(!rows.length) return NextResponse.json({ok:true,skipped:true,reason:"Pas assez de médias compatibles ou campagne terminée"});
  const {error:insertError}=await sb.from("social_content_queue").insert(rows);
  if(insertError) return NextResponse.json({ok:false,error:insertError.message},{status:500});
  return NextResponse.json({ok:true,scheduled:rows.length,uniqueMedia:used.size,campaignEnd:CAMPAIGN_END.toISOString(),postsPerDayPerPlatform:2,videos:videos.length,images:images.length,mode:"real-uploads-only"});
}
