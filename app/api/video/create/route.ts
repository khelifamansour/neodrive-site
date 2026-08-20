import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic="force-dynamic";
export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});

function isVideo(a:any){return /video|reel/i.test(a.media_type||"")||/\.(mp4|mov|m4v)(\?|$)/i.test(a.public_url||"");}

function transition(i:number){
 const dirs=["180°","0°","90°","270°"];
 return {duration:.28,easing:"cubic-in-out",transition:true,type:i%3===0?"fade":"slide",fade:i%3===0,direction:dirs[i%dirs.length]};
}

function mediaElement(a:any,i:number,time:number,duration:number){
 const base:any={track:1,time,duration,source:a.public_url,width:"100%",height:"100%",x:"50%",y:"50%",x_anchor:"50%",y_anchor:"50%",fit:"cover",clip:true};
 const animations:any[]=[];
 if(i>0)animations.push(transition(i));
 if(isVideo(a)){
  return {...base,type:"video",trim_start:0,trim_duration:duration,volume:"8%",animations};
 }
 animations.push({type:"scale",scope:"element",easing:"linear",start_scale:i%2?"112%":"118%",end_scale:"100%",fade:false});
 return {...base,type:"image",animations};
}

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY,ck=process.env.CREATOMATE_API_KEY;if(!sk)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 if(!ck)return NextResponse.json({ok:true,skipped:true,reason:"CREATOMATE_API_KEY missing",setupNeeded:true});

 const ar=await fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&select=id,public_url,media_type,title,context,ai_summary,ai_tags,ai_quality_score,times_used&order=ai_quality_score.desc.nullslast,times_used.asc.nullsfirst,last_used_at.asc.nullsfirst&limit=40`,{headers:H(sk),cache:"no-store"});
 const all=await ar.json();if(!Array.isArray(all)||all.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Need at least 3 ready assets"});
 const vids=all.filter(isVideo),imgs=all.filter((x:any)=>!isVideo(x));
 const chosen:any[]=[];
 for(const v of vids.slice(0,8))chosen.push(v);
 for(const x of imgs){if(chosen.length>=10)break;chosen.push(x);}
 if(chosen.length<3)return NextResponse.json({ok:true,skipped:true,reason:"Not enough usable assets"});

 const angles=["prix accessible","look compact","coulisses préparation","recharge 220 V","usage quotidien","livraison France","intérieur","2 places"];
 const theme=angles[Math.floor(Date.now()/86400000)%angles.length];
 let hook=theme==="prix accessible"?"Une voiture sans permis neuve à partir de 3 990 €":theme==="recharge 220 V"?"Une prise 220 V. Et c'est parti.":theme==="look compact"?"Petite dehors. Vraie présence sur la route.":theme==="intérieur"?"À bord d'une NeoDrive":"NeoDrive dans la vraie vie";
 if(process.env.OPENAI_API_KEY)try{
  const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await c.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Écris un hook de Reel automobile très court, 4 à 8 mots, naturel et percutant pour NeoDrive. Angle: ${theme}. Faits sûrs: voiture sans permis électrique 2 places, gamme à partir de 3 990 € TTC, recharge prise 220 V. Pas de promesse de sécurité, autonomie, stock, garantie ou droit de conduire. Retourne uniquement le hook.`,max_output_tokens:50});
  hook=r.output_text.trim()||hook;
 }catch{}

 const beat=[1.6,1.9,1.45,2.15,1.7,1.55,2.05,1.5,1.8,1.6];
 let cursor=0;const elements:any[]=[];
 chosen.forEach((a:any,i:number)=>{const d=beat[i%beat.length];elements.push(mediaElement(a,i,cursor,d));cursor+=d;});
 const duration=Math.max(12,Number(cursor.toFixed(2)));

 const music=process.env.CREATOMATE_MUSIC_URL?.trim();
 if(music)elements.push({type:"audio",track:3,time:0,duration,source:music,loop:true,volume:"28%",audio_fade_in:.35,audio_fade_out:1});

 const mid=Math.max(4,Math.min(duration-8,Math.round(duration*.48)));
 elements.push(
  {type:"text",track:4,time:.15,duration:2.6,x:"50%",y:"12%",width:"90%",height:"14%",x_anchor:"50%",y_anchor:"50%",text:hook,fill_color:"#ffffff",stroke_color:"#000000",stroke_width:"0.75 vmin",font_family:"Montserrat",font_weight:"800",font_size:"7.2 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.4,type:"text-slide",split:"word",direction:"up"}]},
  {type:"text",track:4,time:mid,duration:3.2,x:"50%",y:"84%",width:"92%",height:"8%",x_anchor:"50%",y_anchor:"50%",text:"100% électrique • 2 places • Recharge 220 V",fill_color:"#ffffff",background_color:"rgba(0,0,0,0.64)",background_border_radius:"1.4 vmin",font_family:"Montserrat",font_weight:"700",font_size:"4.2 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.3,type:"fade"}]},
  {type:"text",track:4,time:duration-4.6,duration:4.6,x:"50%",y:"76%",width:"92%",height:"10%",x_anchor:"50%",y_anchor:"50%",text:"À partir de 3 990 € TTC",fill_color:"#ffffff",background_color:"rgba(0,0,0,0.82)",background_border_radius:"1.8 vmin",font_family:"Montserrat",font_weight:"800",font_size:"6.2 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.35,type:"text-slide",split:"word",direction:"up"}]},
  {type:"text",track:4,time:duration-2.6,duration:2.6,x:"50%",y:"90%",width:"90%",height:"7%",x_anchor:"50%",y_anchor:"50%",text:"easydrive-auto.fr",fill_color:"#ffffff",font_family:"Montserrat",font_weight:"700",font_size:"4.5 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{time:0,duration:.3,type:"fade"}]}
 );

 const {data:job,error}=await (await import("@supabase/supabase-js")).createClient(SB,sk,{auth:{persistSession:false}}).from("video_generation_jobs").insert({status:"rendering",theme,hook,source_asset_ids:chosen.map(x=>x.id),render_provider:"creatomate"}).select().single();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 const site=process.env.NEXT_PUBLIC_SITE_URL||"https://www.easydrive-auto.fr";
 const rr=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",headers:{Authorization:`Bearer ${ck}`,"Content-Type":"application/json"},body:JSON.stringify({output_format:"mp4",width:1080,height:1920,frame_rate:30,duration,elements,webhook_url:`${site}/api/video/webhook`,metadata:job.id})});
 const rj=await rr.json().catch(()=>null);
 if(!rr.ok){await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:JSON.stringify(rj),updated_at:new Date().toISOString()})});return NextResponse.json({ok:false,error:rj},{status:500});}
 const render=Array.isArray(rj)?rj[0]:rj;
 await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({render_id:render?.id||null,updated_at:new Date().toISOString()})});
 return NextResponse.json({ok:true,jobId:job.id,renderId:render?.id||null,theme,hook,assets:chosen.length,videos:vids.slice(0,8).length,photos:Math.max(0,chosen.length-Math.min(8,vids.length)),duration,music:!!music,style:"dynamic-reel"});
}
