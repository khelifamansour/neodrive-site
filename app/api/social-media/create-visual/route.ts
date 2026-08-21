import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const H = (key: string) => ({ Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" });

const concepts = [
  { theme: "prix", eyebrow: "NEODRIVE ÉLECTRIQUE", title: "UNE VOITURE NEUVE\nÀ PRIX ACCESSIBLE", fact: "À PARTIR DE", value: "3 990 €", note: "TTC • 2 places", accent: "#ff5a1f", dark: "#111111" },
  { theme: "jeunes", eyebrow: "PREMIÈRE MOBILITÉ", title: "LA VOITURETTE\nDÈS 14 ANS", fact: "AVEC LE", value: "PERMIS AM", note: "Selon votre situation • Vérifiez sur Service-Public.fr", accent: "#7c3aed", dark: "#151024" },
  { theme: "permis-am", eyebrow: "LE POINT RÉGLEMENTATION", title: "PERMIS AM :\nCE QU'IL FAUT SAVOIR", fact: "FORMATION", value: "8 HEURES", note: "Âge minimum : 14 ans • Conditions officielles à vérifier", accent: "#1473e6", dark: "#071a35" },
  { theme: "suspension", eyebrow: "QUESTION FRÉQUENTE", title: "PERMIS SUSPENDU :\nPEUT-ON ROULER EN VSP ?", fact: "RÉPONSE", value: "ÇA DÉPEND", note: "Vérifiez la décision et l'éventuelle interdiction de conduire", accent: "#ef4444", dark: "#220b0b" },
  { theme: "recharge", eyebrow: "100 % ÉLECTRIQUE", title: "LA RECHARGE\nSANS COMPLICATION", fact: "PRISE", value: "220 V", note: "Une solution pensée pour les trajets du quotidien", accent: "#16a34a", dark: "#071d0e" },
  { theme: "comparatif", eyebrow: "AVANT D'ACHETER", title: "COMMENT COMPARER\nDEUX VOITURES SANS PERMIS ?", fact: "4 CRITÈRES", value: "PRIX • ÉQUIPEMENT", note: "Recharge • entretien • livraison • usage réel", accent: "#f59e0b", dark: "#211403" },
  { theme: "design", eyebrow: "DESIGN NEODRIVE", title: "COMPACTE DEHORS.\nAGRÉABLE AU QUOTIDIEN.", fact: "FORMAT", value: "2 PLACES", note: "Découvrez la voiture sous tous ses angles", accent: "#ec4899", dark: "#200819" },
  { theme: "parents", eyebrow: "POUR LES PARENTS", title: "UNE PREMIÈRE VOITURE\nPOUR GAGNER EN AUTONOMIE", fact: "À VÉRIFIER", value: "AM • ASSURANCE", note: "Formation, équipement et accompagnement", accent: "#06b6d4", dark: "#062027" },
];

function text(text:string, x:string, y:string, width:string, height:string, size:string, weight:string, fill="#ffffff", align="0%") {
  return { type:"text", track:3, x, y, width, height, x_anchor:"50%", y_anchor:"50%", text, fill_color:fill, font_family:"Montserrat", font_weight:weight, font_size:size, x_alignment:align, y_alignment:"50%", line_height:"92%" };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const creatomate = process.env.CREATOMATE_API_KEY;
  if (!sk || !creatomate) return NextResponse.json({ ok:true, skipped:true, reason:"Visual generator configuration missing" });

  const today = new Date().toISOString().slice(0,10);
  const existing = await fetch(`${SB}/rest/v1/video_generation_jobs?render_provider=eq.creatomate-social-visual&created_at=gte.${today}T00%3A00%3A00.000Z&select=id&limit=1`, { headers:H(sk), cache:"no-store" });
  const existingRows = await existing.json().catch(()=>[]);
  if (Array.isArray(existingRows) && existingRows.length) return NextResponse.json({ ok:true, skipped:true, reason:"Today's visual already generated" });

  const mediaResponse = await fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&media_type=eq.image&storage_path=not.like.generated%2F%25&select=id,public_url,title,context,times_used&order=times_used.asc,last_used_at.asc.nullsfirst,ai_quality_score.desc.nullslast&limit=25`, { headers:H(sk), cache:"no-store" });
  const media = await mediaResponse.json().catch(()=>[]);
  if (!Array.isArray(media) || !media.length) return NextResponse.json({ ok:true, skipped:true, reason:"Add at least one real NeoDrive photo" });

  const dayNumber = Math.floor(Date.now()/86400000);
  const concept = concepts[dayNumber % concepts.length];
  const asset = media[dayNumber % media.length];
  const jobResponse = await fetch(`${SB}/rest/v1/video_generation_jobs`, { method:"POST", headers:{...H(sk), Prefer:"return=representation"}, body:JSON.stringify({ status:"rendering", theme:`visual:${concept.theme}`, hook:concept.title.replace(/\n/g," "), source_asset_ids:[asset.id], render_provider:"creatomate-social-visual" }) });
  const jobs = await jobResponse.json().catch(()=>[]);
  const job = Array.isArray(jobs) ? jobs[0] : jobs;
  if (!jobResponse.ok || !job?.id) return NextResponse.json({ ok:false, error:jobs }, { status:500 });

  const elements:any[] = [
    { type:"shape", track:1, x:"50%", y:"50%", width:"100%", height:"100%", x_anchor:"50%", y_anchor:"50%", fill_color:concept.dark },
    { type:"image", track:2, x:"50%", y:"27%", width:"100%", height:"54%", x_anchor:"50%", y_anchor:"50%", source:asset.public_url, fit:"cover", clip:true, color_overlay:"rgba(0,0,0,0.10)" },
    { type:"shape", track:2, x:"50%", y:"54%", width:"100%", height:"12%", x_anchor:"50%", y_anchor:"50%", fill_color:concept.dark },
    { type:"shape", track:2, x:"10%", y:"58%", width:"12%", height:"1%", x_anchor:"50%", y_anchor:"50%", fill_color:concept.accent },
    text(concept.eyebrow,"50%","7%","88%","6%","3.1 vmin","800",concept.accent,"50%"),
    text(concept.title,"50%","65%","86%","17%","5.5 vmin","900","#ffffff","0%"),
    text(concept.fact,"17%","80%","20%","5%","2.6 vmin","800",concept.accent,"0%"),
    text(concept.value,"59%","85%","72%","9%","5.6 vmin","900","#ffffff","0%"),
    text(concept.note,"50%","93%","86%","6%","2.45 vmin","600","#d7d7d7","0%"),
    text("NeoDrive  •  easydrive-auto.fr","50%","98%","86%","3%","2.2 vmin","700","#ffffff","50%"),
  ];
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.easydrive-auto.fr";
  const renderResponse = await fetch("https://api.creatomate.com/v2/renders", { method:"POST", headers:{ Authorization:`Bearer ${creatomate}`, "Content-Type":"application/json" }, body:JSON.stringify({ output_format:"jpg", width:1080, height:1350, render_scale:1, jpeg_quality:95, elements, webhook_url:`${site}/api/video/webhook`, metadata:job.id }) });
  const renderJson = await renderResponse.json().catch(()=>null);
  if (!renderResponse.ok) {
    await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`, { method:"PATCH", headers:{...H(sk),Prefer:"return=minimal"}, body:JSON.stringify({ status:"failed", error_message:JSON.stringify(renderJson), updated_at:new Date().toISOString() }) });
    return NextResponse.json({ ok:false, error:renderJson }, { status:500 });
  }
  const render = Array.isArray(renderJson) ? renderJson[0] : renderJson;
  await fetch(`${SB}/rest/v1/video_generation_jobs?id=eq.${job.id}`, { method:"PATCH", headers:{...H(sk),Prefer:"return=minimal"}, body:JSON.stringify({ render_id:render?.id||null, updated_at:new Date().toISOString() }) });
  await fetch(`${SB}/rest/v1/social_media_assets?id=eq.${asset.id}`, { method:"PATCH", headers:{...H(sk),Prefer:"return=minimal"}, body:JSON.stringify({ times_used:Number(asset.times_used||0)+1, last_used_at:new Date().toISOString(), updated_at:new Date().toISOString() }) });
  return NextResponse.json({ ok:true, jobId:job.id, renderId:render?.id||null, theme:concept.theme, source:asset.id, format:"1080x1350" });
}
