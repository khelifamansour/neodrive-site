import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic="force-dynamic";export const maxDuration=60;
const URL="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
function slugify(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const sk=process.env.SUPABASE_SERVICE_ROLE_KEY,oa=process.env.OPENAI_API_KEY;if(!sk||!oa)return NextResponse.json({ok:false,error:"Configuration incomplete"},{status:503});
 const sb=createClient(URL,sk,{auth:{persistSession:false}});
 const {data:topics}=await sb.from("marketing_topics").select("id,topic,angle,target_audience,primary_keyword,secondary_keywords,business_priority").eq("status","idea").order("business_priority",{ascending:false}).order("times_used",{ascending:true}).limit(12);
 const chosen=topics?.[Math.floor(Date.now()/86400000)%(topics?.length||1)];
 const topic=chosen?.topic||"Combien coûte une voiture sans permis électrique en 2026 ?";
 const prompt=`Rédige un excellent article SEO français de 1100 à 1600 mots pour un acheteur réel de voiture sans permis. Sujet: ${topic}. Angle: ${chosen?.angle||"guide d'achat concret"}. Public: ${chosen?.target_audience||"acheteurs en France"}. Mot-clé principal: ${chosen?.primary_keyword||"voiture sans permis électrique"}. NeoDrive: VSP électrique 2 places, gamme à partir de 3 990 € TTC, recharge prise 220 V, livraison en France. Exigences: répondre précisément à l'intention; titre utile; introduction courte; H2/H3; exemples/scénarios pratiques; checklist si pertinente; FAQ 4 questions; conclusion et CTA vers /produit et /contact. Comparaisons Citroën Ami, Aixam, Ligier uniquement si utiles et sans inventer prix/caractéristiques concurrentes. Pour droit de conduire, assurance, suspension/retrait de permis ou réglementation: rester prudent, expliquer que la situation dépend de la catégorie et de la décision administrative/judiciaire, recommander de vérifier les documents officiels; ne jamais promettre qu'une personne peut conduire. Aucun faux avis, fausse ville, faux stock, fausse autonomie ou garantie. Pas de bourrage de mots-clés. Retour JSON strict {title,description,content,keywords}; content HTML simple sans H1.`;
 const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${oa}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_SEO_MODEL||"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"user",content:prompt}],temperature:.55})});
 const j=await r.json();if(!r.ok)return NextResponse.json({ok:false,error:j},{status:500});const out=JSON.parse(j.choices?.[0]?.message?.content||"{}");
 const slug=slugify(out.title||topic)+"-"+new Date().toISOString().slice(0,10);const now=new Date().toISOString();
 const {data,error}=await sb.from("seo_articles").insert({slug,title:out.title,description:out.description,content:out.content,keywords:out.keywords,topic,status:"published",published_at:now}).select().single();if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 if(chosen?.id){const {data:t}=await sb.from("marketing_topics").select("times_used").eq("id",chosen.id).single();await sb.from("marketing_topics").update({times_used:Number(t?.times_used||0)+1,last_used_at:now,updated_at:now}).eq("id",chosen.id);}
 return NextResponse.json({ok:true,article:data,topicSource:chosen?"marketing_topics":"fallback"});
}
