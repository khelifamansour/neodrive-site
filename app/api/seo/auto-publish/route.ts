import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const topics = [
  "voiture sans permis pas cher moins de 5000 euros",
  "voiture sans permis occasion ou neuve",
  "Citroen Ami pas cher alternative",
  "Aixam occasion alternative moins chere",
  "prix voiture sans permis electrique",
  "concession voiture sans permis a cote de moi",
  "voiture sans permis Toulouse prix et livraison",
  "voiture sans permis Bordeaux prix et livraison",
  "voiture sans permis Montpellier prix et livraison",
  "voiture sans permis Marseille prix et livraison",
  "voiture sans permis Lyon prix et livraison",
  "voiture sans permis Paris prix et livraison",
  "Ligier occasion ou voiture sans permis electrique neuve",
  "voiture sans permis 2 places electrique",
  "voiture sans permis rechargeable prise 220V",
  "meilleure voiture sans permis rapport qualite prix",
  "voiture sans permis neuve accessible",
  "voiture sans permis livraison partout en France",
  "batterie voiture sans permis electrique plomb ou lithium",
  "cout entretien voiture sans permis electrique",
];

function slugify(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY, openai=process.env.OPENAI_API_KEY;
  if(!serviceKey||!openai) return NextResponse.json({ok:false,error:"Configuration incomplete"},{status:503});
  const supabase=createClient(SUPABASE_URL,serviceKey,{auth:{persistSession:false}});
  await supabase.from("seo_articles").select("id").limit(1);
  const day=Math.floor(Date.now()/86400000); const topic=topics[day%topics.length];
  const prompt=`Rédige un article SEO français utile de 900 à 1300 mots pour NeoDrive sur: ${topic}. Cible acheteurs réels de voiture sans permis. NeoDrive: VSP électrique 2 places, à partir de 3990 EUR TTC, recharge sur prise 220V, livraison France. Comparaisons Citroën Ami, Aixam, Ligier seulement factuelles et loyales. Intègre naturellement variantes: voiture sans permis pas cher, moins de 5000 euros, voiture sans permis occasion, concession voiture sans permis, voiture sans permis électrique. Pas de bourrage de mots-clés, pas de fausse adresse locale, pas de faux avis, pas de caractéristiques inventées. Structure H1/H2, paragraphes courts, FAQ 4 questions, CTA vers easydrive-auto.fr. Retourne JSON strict {title,description,content,keywords}. content en HTML simple.`;
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"user",content:prompt}],temperature:.7})});
  const j=await r.json(); if(!r.ok) return NextResponse.json({ok:false,error:j},{status:500});
  const out=JSON.parse(j.choices?.[0]?.message?.content||"{}"); const slug=slugify(out.title||topic)+"-"+new Date().toISOString().slice(0,10);
  const {data,error}=await supabase.from("seo_articles").insert({slug,title:out.title,description:out.description,content:out.content,keywords:out.keywords,topic,status:"published",published_at:new Date().toISOString()}).select().single();
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,article:data});
}
