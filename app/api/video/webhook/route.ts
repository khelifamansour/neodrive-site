import { NextResponse } from "next/server";

export const dynamic="force-dynamic";
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});

export async function POST(req:Request){
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!sk)return NextResponse.json({ok:false},{status:503});
 const body=await req.json().catch(()=>null);const r=Array.isArray(body)?body[0]:body;if(!r)return NextResponse.json({ok:false},{status:400});
 const jobId=String(r.metadata||"");const status=String(r.status||"");const url=String(r.url||r.output_url||"");const id=String(r.id||"");
 if(!jobId)return NextResponse.json({ok:true,ignored:true});
 if(status==="succeeded"&&url){
  await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${encodeURIComponent(jobId)}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({status:"succeeded",render_id:id||null,output_url:url,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),error_message:null})});
  const jr=await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=theme,hook,render_provider`,{headers:H(sk)});const j=(await jr.json().catch(()=>[]))?.[0]||{};
  const visual=j.render_provider==="creatomate-social-visual";
  await fetch(`${SB}/rest/v1/social_media_assets`,{method:"POST",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify(visual?{storage_path:`generated/visual-${jobId}.jpg`,public_url:url,media_type:"image",title:`Création éditoriale - ${String(j.theme||"NeoDrive").replace("visual:","")}`,context:`Visuel éditorial NeoDrive généré automatiquement en 1080 × 1350. Thème: ${j.theme||"marque"}.`,status:"ready",priority:92,ai_summary:`Poster éditorial NeoDrive associant une vraie photo de la voiture et un message pédagogique.`,ai_tags:["generated","poster","editorial",String(j.theme||"neodrive").replace("visual:","")],best_for:["instagram-photo","facebook-photo","carousel"],ai_quality_score:92}:{storage_path:`generated/${jobId}.mp4`,public_url:url,media_type:"reel",title:`Reel auto - ${j.theme||"NeoDrive"}`,context:`Vidéo verticale générée automatiquement. Hook: ${j.hook||"NeoDrive"}. Prix à partir de 3 990 € TTC.`,status:"ready",priority:90,ai_summary:`Reel vertical NeoDrive généré automatiquement sur le thème ${j.theme||"marque"}.`,ai_tags:["generated","reel","vertical",j.theme||"neodrive"],best_for:["instagram-reel","facebook-video","tiktok-future"],ai_quality_score:80})});
  return NextResponse.json({ok:true,registered:true});
 }
 if(status==="failed")await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${encodeURIComponent(jobId)}`,{method:"PATCH",headers:{...H(sk),Prefer:"return=minimal"},body:JSON.stringify({status:"failed",render_id:id||null,error_message:JSON.stringify(r),updated_at:new Date().toISOString()})});
 return NextResponse.json({ok:true,status});
}
