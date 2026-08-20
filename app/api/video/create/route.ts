import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});

function isVideo(a:any){return /video|reel/i.test(a.media_type||"")||/\.(mp4|mov|m4v)(\?|$)/i.test(a.public_url||"");}
function mediaElement(a:any,i:number){
 const base:any={track:1,time:i*3,duration:3,source:a.public_url,width:"100%",height:"100%",x:"50%",y:"50%",x_anchor:"50%",y_anchor:"50%",fit:"cover"};
 return {...base,type:isVideo(a)?"video":"image",...(isVideo(a)?{volume:"12%"}:{}),animations:i?[{time:0,duration:.35,transition:true,type:"fade"}]:[]};
}

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY,ck=process.env.CREATOMATE_API_KEY;if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 if(!ck)return NextResponse.json({ok:true,skipped:true,reason:"CREATOMATE_API_KEY missing",setupNeeded:true});
 const ar=await fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&select=id,public_url,media_type,title,context,ai_summary,ai_tags,ai_quality_score,times_used&order=ai_quality_score.desc.nullslast,times_used.asc.nullsfirst,last_used_at.asc.nullsfirst&limit=24`,{headers:H(sk),cache:"no-store"});
 const all=await ar.json();if(!Array.isArray(all)||all.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Need at least 3 ready assets"});
 const vids=all.filter(isVideo),imgs=all.filter((x:any)=>!isVideo(x));const chosen:any[]=[];if(vids[0])chosen.push(vids[0]);for(const x of imgs){if(chosen.length>=5)break;chosen.push(x);}if(chosen.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Not enough usable assets"});
 const angles=["prix accessible","look compact","coulisses préparation","recharge 220 V","usage quotidien","livraison France","acier et conception","2 places"];
 const theme=angles[Math.floor(Date.now()/86400000)%angles.length];
 let hook=theme==="prix accessible"?"Une voiture sans permis neuve à partir de 3 990 €":theme==="recharge 220 V"?"Une prise 220 V. Et c'est parti.":theme==="look compact"?"Petite dehors. Vraie présence sur la route.":"NeoDrive dans la vraie vie";
 if(process.env.OPENAI_API_KEY)try{
  const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await c.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Écris un hook vidéo vertical très court (max 9 mots), naturel et crédible pour NeoDrive. Angle: ${theme}. Faits sûrs: voiture sans permis électrique 2 places, gamme à partir de 3 990 € TTC, recharge prise 220 V. Pas de promesse de sécurité, autonomie, stock, garantie ou droit de conduire. Retourne uniquement le hook.`,max_output_tokens:50});
  hook=r.output_text.trim()||hook;
 }catch{}
 const duration=chosen.length*3;
 const elements:any[]=[...chosen.map(mediaElement)];
 const music=process.env.CREATOMATE_MUSIC_URL?.trim();
 if(music)elements.push({type:"audio",track:3,time:0,duration,source:music,loop:true,volume:"24%",audio_fade_in:.5,audio_fade_out:1.2});
 elements.push(
  {type:"text",track:2,time:0,duration:3,x:"50%",y:"12%",width:"88%",height:"15%",x_anchor:"50%",y_anchor:"50%",text:hook,fill_color:"#ffffff",stroke_color:"#000000",stroke_width:"0.8 vmin",font_family:"Montserrat",font_weight:"800",font_size:"7 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.45,type:"text-slide",split:"word",direction:"up"}]},
  {type:"text",track:2,time:3,duration:Math.max(3,duration-6),x:"50%",y:"85%",width:"90%",height:"8%",x_anchor:"50%",y_anchor:"50%",text:"100% électrique • 2 places • Recharge 220 V",fill_color:"#ffffff",background_color:"rgba(0,0,0,0.62)",font_family:"Montserrat",font_weight:"700",font_size:"4.2 vmin",x_alignment:"50%",y_alignment:"50%"},
  {type:"text",track:2,time:duration-4,duration:4,x:"50%",y:"78%",width:"90%",height:"9%",x_anchor:"50%",y_anchor:"50%",text:"À partir de 3 990 € TTC",fill_color:"#ffffff",background_color:"rgba(0,0,0,0.78)",font_family:"Montserrat",font_weight:"800",font_size:"6 vmin",x_alignment:"50%",y_alignment:"50%"},
  {type:"text",track:2,time:duration-2.5,duration:2.5,x:"50%",y:"90%",width:"88%",height:"7%",x_anchor:"50%",y_anchor:"50%",text:"easydrive-auto.fr",fill_color:"#ffffff",font_family:"Montserrat",font_weight:"700",font_size:"4.4 vmin",x_alignment:"50%",y_alignment:"50%"}
 );
 const {data:job,error}=await (await import("@supabase/supabase-js")).createClient(SB,sk,{auth:{persistSession:false}}).from("video_generation_jobs").insert({status:"rendering",theme,hook,source_asset_ids:chosen.map(x=>x.id),render_provider:"creatomate"}).select().single();if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 const site=process.env.NEXT_PUBLIC_SITE_URL||"https://www.easydrive-auto.fr";
 const rr=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",headers:{Authorization:`Bearer ${ck}`,"Content-Type":"application/json"},body:JSON.stringify({output_format:"mp4",width:1080,height:1920,duration,elements,webhook_url:`${site}/api/video/webhook`,metadata:job.id})});
 const rj=await rr.json().catch(()=>null);if(!rr.ok){await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:JSON.stringify(rj),updated_at:new Date().toISOString()})});return NextResponse.json({ok:false,error:rj},{status:500});}
 const render=Array.isArray(rj)?rj[0]:rj;await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({render_id:render?.id||null,updated_at:new Date().toISOString()})});
 return NextResponse.json({ok:true,jobId:job.id,renderId:render?.id||null,theme,hook,assets:chosen.length,music:!!music});
}
