import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});

function shuffle<T>(items:T[]){
 const a=[...items];
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a;
}

function transition(i:number){
 const dirs=["180°","0°","90°","270°"];
 return {duration:.24,easing:"cubic-in-out",transition:true,type:i%3===0?"fade":"slide",fade:i%3===0,direction:dirs[i%dirs.length]};
}

function mediaElement(a:any,i:number,time:number,duration:number){
 const base:any={track:1,time,duration,source:a.public_url,width:"100%",height:"100%",x:"50%",y:"50%",x_anchor:"50%",y_anchor:"50%",fit:"cover",clip:true};
 const animations:any[]=[];
 if(i>0)animations.push(transition(i));
 if(a.media_type==="video"){
  return {...base,type:"video",trim_start:i%3===0?0:i%3===1?.35:.7,trim_duration:duration,volume:"8%",animations};
 }
 animations.push({type:"scale",scope:"element",easing:"linear",start_scale:i%2?"110%":"115%",end_scale:"100%",fade:false});
 return {...base,type:"image",animations};
}

export async function GET(req:Request){
 const scheduledTest=new URL(req.url).searchParams.get("scheduled_test")==="1";
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY,ck=process.env.CREATOMATE_API_KEY;
 if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 if(!ck)return NextResponse.json({ok:true,skipped:true,reason:"CREATOMATE_API_KEY missing",setupNeeded:true});

 // IMPORTANT: use only original uploaded videos here. Generated reels are deliberately excluded
 // so a new reel can never recycle an old generated reel.
 const [vr,ir,jr]=await Promise.all([
  fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&media_type=eq.video&select=id,public_url,media_type,title,context,ai_summary,ai_tags,ai_quality_score,times_used,last_used_at&order=times_used.asc,last_used_at.asc.nullsfirst,ai_quality_score.desc.nullslast&limit=30`,{headers:H(sk),cache:"no-store"}),
  fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&media_type=eq.image&select=id,public_url,media_type,title,context,ai_summary,ai_tags,ai_quality_score,times_used,last_used_at&order=times_used.asc,last_used_at.asc.nullsfirst,ai_quality_score.desc.nullslast&limit=30`,{headers:H(sk),cache:"no-store"}),
  fetch(`${SB}/rest/v1/video_generation_jobs?select=theme&order=created_at.desc&limit=1`,{headers:H(sk),cache:"no-store"})
 ]);
 const videos=await vr.json().catch(()=>[]);
 const images=await ir.json().catch(()=>[]);
 const recent=await jr.json().catch(()=>[]);
 if(!Array.isArray(videos)||!Array.isArray(images))return NextResponse.json({ok:false,error:"Media library unavailable"},{status:500});
 if(videos.length<1&&images.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Need more usable media"});

 const shuffledVideos=shuffle(videos);
 const shuffledImages=shuffle(images);
 const chosen:any[]=[];
 // Prefer a real-video reel. If we have 4+ real videos, use no photos at all.
 if(shuffledVideos.length>=4){
  chosen.push(...shuffledVideos.slice(0,Math.min(7,shuffledVideos.length)));
 }else{
  chosen.push(...shuffledVideos.slice(0,Math.min(3,shuffledVideos.length)));
  for(const img of shuffledImages){if(chosen.length>=6)break;chosen.push(img);}
 }
 if(chosen.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Not enough usable assets"});

 const angles=["prix accessible","look compact","recharge 220 V","usage quotidien","livraison France","intérieur","2 places","découverte NeoDrive"];
 const previous=Array.isArray(recent)&&recent[0]?.theme?String(recent[0].theme):"";
 const available=angles.filter(x=>x!==previous);
 const theme=available[Math.floor(Math.random()*available.length)]||angles[0];

 let hook=theme==="prix accessible"?"Une voiture sans permis neuve accessible":theme==="recharge 220 V"?"Une prise 220 V. Et c'est parti.":theme==="look compact"?"Compacte dehors. Agréable au quotidien.":theme==="intérieur"?"À bord d'une NeoDrive":theme==="2 places"?"Deux places. 100% électrique.":theme==="livraison France"?"NeoDrive livrée partout en France":theme==="usage quotidien"?"Pensée pour les trajets du quotidien":"Découvrez NeoDrive autrement";

 if(process.env.OPENAI_API_KEY)try{
  const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await c.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Écris un hook de Reel automobile très court, 4 à 7 mots, naturel et différent des formulations publicitaires génériques. Marque: NeoDrive. Angle: ${theme}. Faits sûrs: voiture sans permis électrique 2 places, gamme à partir de 3 990 € TTC, recharge prise 220 V, livraison en France. Ne mentionne le prix que si l'angle est "prix accessible". Pas de promesse de sécurité, autonomie, stock, garantie ou droit de conduire. Retourne uniquement le hook.`,max_output_tokens:40});
  hook=r.output_text.trim()||hook;
 }catch{}

 const beat=[1.35,1.6,1.25,1.8,1.45,1.55,1.3];
 let cursor=0;const elements:any[]=[];
 chosen.forEach((a:any,i:number)=>{const d=beat[i%beat.length];elements.push(mediaElement(a,i,cursor,d));cursor+=d;});
 const duration=Math.max(9.5,Number(cursor.toFixed(2)));

 const music=process.env.CREATOMATE_MUSIC_URL?.trim();
 if(music)elements.push({type:"audio",track:3,time:0,duration,source:music,loop:true,volume:"26%",audio_fade_in:.25,audio_fade_out:.8});

 const infoText=theme==="recharge 220 V"?"Recharge sur prise 220 V":theme==="2 places"?"2 places • 100% électrique":theme==="livraison France"?"Livraison partout en France":theme==="prix accessible"?"À partir de 3 990 € TTC":theme==="intérieur"?"Découvrez l'intérieur NeoDrive":"100% électrique • 2 places";
 const finalText=theme==="prix accessible"?"À partir de 3 990 € TTC":theme==="recharge 220 V"?"Recharge sur prise 220 V":theme==="livraison France"?"Livraison partout en France":theme==="2 places"?"2 places • 100% électrique":"Découvrez NeoDrive";
 const mid=Math.max(3.2,Math.min(duration-5.5,Math.round(duration*.48)));
 elements.push(
  {type:"text",track:4,time:.1,duration:2.3,x:"50%",y:"12%",width:"90%",height:"14%",x_anchor:"50%",y_anchor:"50%",text:hook,fill_color:"#ffffff",stroke_color:"#000000",stroke_width:"0.65 vmin",font_family:"Montserrat",font_weight:"800",font_size:"7 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.35,type:"text-slide",split:"word",direction:"up"}]},
  {type:"text",track:4,time:mid,duration:2.4,x:"50%",y:"84%",width:"92%",height:"8%",x_anchor:"50%",y_anchor:"50%",text:infoText,fill_color:"#ffffff",background_color:"rgba(0,0,0,0.64)",background_border_radius:"1.4%",font_family:"Montserrat",font_weight:"700",font_size:"4.2 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.25,type:"fade"}]},
  {type:"text",track:4,time:duration-3.4,duration:3.4,x:"50%",y:"77%",width:"92%",height:"10%",x_anchor:"50%",y_anchor:"50%",text:finalText,fill_color:"#ffffff",background_color:"rgba(0,0,0,0.82)",background_border_radius:"1.8%",font_family:"Montserrat",font_weight:"800",font_size:"6 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.3,type:"text-slide",split:"word",direction:"up"}]},
  {type:"text",track:4,time:duration-1.9,duration:1.9,x:"50%",y:"90%",width:"90%",height:"7%",x_anchor:"50%",y_anchor:"50%",text:"easydrive-auto.fr",fill_color:"#ffffff",font_family:"Montserrat",font_weight:"700",font_size:"4.3 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.25,type:"fade"}]}
 );

 const {data:job,error}=await (await import("@supabase/supabase-js")).createClient(SB,sk,{auth:{persistSession:false}}).from("video_generation_jobs").insert({status:"rendering",theme,hook,source_asset_ids:chosen.map(x=>x.id),render_provider:scheduledTest?"creatomate-scheduled-test":"creatomate"}).select().single();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});

 const site=process.env.NEXT_PUBLIC_SITE_URL||"https://www.easydrive-auto.fr";
 const rr=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",headers:{Authorization:`Bearer ${ck}`,"Content-Type":"application/json"},body:JSON.stringify({output_format:"mp4",width:1080,height:1920,frame_rate:30,duration,elements,webhook_url:`${site}/api/video/webhook`,metadata:job.id})});
 const rj=await rr.json().catch(()=>null);
 if(!rr.ok){await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:JSON.stringify(rj),updated_at:new Date().toISOString()})});return NextResponse.json({ok:false,error:rj},{status:500});}
 const render=Array.isArray(rj)?rj[0]:rj;
 await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({render_id:render?.id||null,updated_at:new Date().toISOString()})});

 // Mark original sources as used so the next generation naturally rotates to other clips.
 const ids=chosen.map(x=>x.id).filter(Boolean);
 if(ids.length){
  for(const a of chosen){
   await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(a.id)}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({times_used:Number(a.times_used||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
  }
 }

 return NextResponse.json({ok:true,jobId:job.id,renderId:render?.id||null,theme,hook,assets:chosen.length,videos:chosen.filter(x=>x.media_type==="video").length,photos:chosen.filter(x=>x.media_type==="image").length,duration,music:!!music,style:"real-video-reel-v3"});
}
