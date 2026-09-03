import { NextResponse } from "next/server";
import OpenAI from "openai";
export const dynamic="force-dynamic";export const maxDuration=60;
const SB="https://tzlsdjzcxdjaatcpwqwn.supabase.co";const H=(k:string)=>({Authorization:`Bearer ${k}`,apikey:k,"Content-Type":"application/json"});
const slots=[{h:9,m:30},{h:13,m:30},{h:18,m:30}];
function parisIso(day:number,h:number,m:number){const d=new Date(Date.now()+day*86400000);const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d).map(x=>[x.type,x.value]));const utc=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),h,m);const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Paris",hour:"2-digit",hour12:false}).format(new Date(utc)));const offset=((hour-h+24)%24);return new Date(utc-offset*3600000).toISOString();}
const editorialTopics=[
 ["Voiture sans permis à 14 ans : quelles conditions ?","Rappeler permis AM et vérifier la réglementation officielle","reglementation"],
 ["Peut-on conduire une voiture sans permis avant 14 ans ?","Expliquer clairement que non pour un quadricycle léger sur route","reglementation"],
 ["Permis AM et voiturette électrique : guide pratique","Formation, âge minimum et documents officiels","reglementation"],
 ["Né avant 1988 : quel permis pour une voiture sans permis ?","Présenter la règle avec prudence et renvoi vers Service-Public","reglementation"],
 ["Assurance voiture sans permis : ce qu’il faut vérifier","Responsabilité civile et devis selon conducteur","assurance"],
 ["Carte grise d’une voiture sans permis électrique","Documents et démarches d’immatriculation","reglementation"],
 ["Combien coûte réellement une voiture sans permis neuve ?","Prix d’achat, préparation et frais éventuels","budget"],
 ["Une voiture sans permis neuve à partir de 3 990 €","Présenter l’offre NeoDrive sans promesse de disponibilité","budget"],
 ["Quel est le meilleur rapport qualité-prix en voiturette électrique ?","Comparer les critères sans classement non vérifié","comparatif"],
 ["NeoDrive ou Citroën Ami : comment choisir ?","Comparer usages et critères factuels sans inventer les données concurrentes","comparatif"],
 ["Citroën Ami : limites à vérifier avant d’acheter","Comparer besoins et caractéristiques vérifiables sans dénigrement","comparatif"],
 ["NeoDrive ou Fiat Topolino : deux approches de la mobilité","Comparaison prudente des usages et du budget","comparatif"],
 ["Voiture sans permis neuve ou occasion : les bonnes questions","Budget, historique, batterie et entretien","guide-achat"],
 ["Pourquoi choisir une voiturette avec carrosserie en acier ?","Ne mentionner l’acier que si documenté sur le modèle concerné","produit"],
 ["Carrosserie acier, ABS ou composite : quelles différences ?","Présenter les matériaux sans promettre de sécurité non certifiée","produit"],
 ["Recharge sur une prise 220 V : comment ça fonctionne ?","Expliquer la recharge domestique sans inventer durée ou consommation","recharge"],
 ["Voiture sans permis électrique pour aller au travail","Scénario quotidien et mobilité de proximité","usage"],
 ["Une voiture sans permis pour un adolescent : conseils aux parents","Âge légal, permis AM, assurance et accompagnement parental","famille"],
 ["Voiture sans permis pour les seniors : critères de choix","Accessibilité, stationnement et besoins personnels","usage"],
 ["Mobilité en zone rurale : la voiturette électrique est-elle adaptée ?","Analyser trajets, recharge et usages","usage"],
 ["Stationner une petite voiture électrique en ville","Format compact et mobilité urbaine","usage"],
 ["Deux places en voiture sans permis : usages du quotidien","Trajets locaux et habitudes de vie","produit"],
 ["Livraison d’une voiture sans permis partout en France","Présenter le processus sans promettre délais ni disponibilité","livraison"],
 ["Préparation d’une NeoDrive avant livraison","Montrer les coulisses à partir des vraies photos et vidéos","coulisses"],
 ["Quelles questions poser avant d’acheter une voiture sans permis ?","Checklist prix, assurance, batterie, entretien et livraison","guide-achat"],
 ["Batterie plomb ou lithium : comment choisir ?","Comparer principes et usages sans autonomie inventée","batterie"],
 ["Entretien d’une voiture sans permis électrique","Points de contrôle généraux et recommandations constructeur","entretien"],
 ["Voiture sans permis électrique ou scooter : les différences","Comparer les usages sans allégation de sécurité","comparatif"],
 ["Pourquoi NeoDrive propose une voiture neuve accessible","Prix annoncé et positionnement commercial factuel","marque"],
 ["Quelle voiture sans permis choisir en 2026 ?","Guide d’achat fondé sur les besoins et le budget","guide-achat"],
 ["Peut-on conduire après une suspension de permis ?","Refuser les affirmations générales et recommander vérification officielle","reglementation"],
 ["À quelle vitesse roule une voiture sans permis ?","Expliquer la catégorie légale sans extrapoler les modèles","reglementation"],
 ["Voiture sans permis et contrôle technique : quelles obligations ?","Vérifier les règles en vigueur sans inventer d’échéance","reglementation"],
 ["Comment choisir une voiture sans permis pour un premier véhicule ?","Âge, permis, assurance, budget et usage","guide-achat"],
 ["NeoDrive en images : intérieur, dimensions et vie à bord","Utiliser uniquement les médias réels de la bibliothèque","produit"],
 ["Les idées reçues sur les voitures sans permis électriques","Distinguer règles officielles, usages et promesses commerciales","pedagogie"]
];
function isVideo(a:any){return /video|reel/i.test(a.media_type)||/\.(mp4|mov|m4v)(\?|$)/i.test(a.public_url||"");}
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});const k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!k)return NextResponse.json({ok:false,error:"Supabase missing"},{status:503});
 const countR=await fetch(`${SB}/rest/v1/social_content_queue?status=eq.scheduled&publish_at=gte.${encodeURIComponent(new Date().toISOString())}&select=id`,{headers:{...H(k),Prefer:"count=exact"},cache:"no-store"});const existing=Number(countR.headers.get("content-range")?.split("/")[1]||0);if(existing>=18)return NextResponse.json({ok:true,skipped:true,reason:"Queue already stocked",scheduled:existing});
 const [ar,tr]=await Promise.all([fetch(`${SB}/rest/v1/social_media_assets?status=eq.ready&select=id,public_url,media_type,title,context,storage_path,times_used,priority,ai_quality_score,created_at&order=priority.desc,created_at.desc,times_used.asc.nullsfirst,last_used_at.asc.nullsfirst,ai_quality_score.desc.nullslast&limit=100`,{headers:H(k),cache:"no-store"}),fetch(`${SB}/rest/v1/marketing_topics?status=eq.idea&select=id,topic,angle,pillar,target_audience,business_priority,times_used&order=times_used.asc,business_priority.desc&limit=100`,{headers:H(k),cache:"no-store"})]);
 const assets=await ar.json();let topics=await tr.json();if(!Array.isArray(assets)||!assets.length)return NextResponse.json({ok:true,skipped:true,reason:"No media"});
 if(Array.isArray(topics)&&topics.length<editorialTopics.length){const known=new Set(topics.map((x:any)=>String(x.topic).toLowerCase()));const missing=editorialTopics.filter(x=>!known.has(x[0].toLowerCase())).map(([topic,angle,pillar],i)=>({topic,angle,pillar,target_audience:"Acheteurs de voitures sans permis en France",primary_keyword:topic.toLowerCase(),secondary_keywords:["voiture sans permis","NeoDrive","voiturette électrique"],business_priority:Math.max(1,100-i),times_used:0,status:"idea"}));if(missing.length){const seeded=await fetch(`${SB}/rest/v1/marketing_topics`,{method:"POST",headers:{...H(k),Prefer:"return=representation"},body:JSON.stringify(missing)});if(seeded.ok){const added=await seeded.json().catch(()=>[]);if(Array.isArray(added))topics=[...topics,...added];}else console.error("[social-plan] topic seed failed",await seeded.text());}}
 const vids=assets.filter(isVideo),posters=assets.filter((a:any)=>!isVideo(a)&&String(a.storage_path||"").startsWith("generated/visual-")),photos=assets.filter((a:any)=>!isVideo(a)&&!String(a.storage_path||"").startsWith("generated/visual-"));const imgs=[...photos,...posters];const c=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;const rows:any[]=[];
 for(let day=0;day<4;day++)for(let s=0;s<3;s++){
  const pool=s===0&&vids.length?vids:s===1&&posters.length?posters:s===2&&photos.length?photos:imgs.length?imgs:assets;const asset=pool[(day*3+s)%pool.length];const topic=Array.isArray(topics)&&topics.length?topics[(day*3+s)%topics.length]:null;const type=isVideo(asset)?"reel":"post";let hook=topic?.topic||["À partir de 3 990 € : une autre façon de penser la voiture sans permis","Petite dehors. Utile au quotidien.","Les coulisses d'une NeoDrive avant livraison"][s];let caption=`${hook}\n\nNeoDrive : voiture sans permis électrique 2 places, à partir de 3 990 € TTC. Recharge sur prise 220 V.\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;
  if(c)try{const format=["question-réponse pédagogique","mini-guide en trois points","comparatif factuel et nuancé","coulisses racontées comme une mini-histoire","conseil budget concret","vrai ou faux expliqué","scénario parent-adolescent","FAQ suspension ou annulation du permis","focus design et équipement","portrait d'un usage quotidien"][(day*3+s)%10];const r=await c.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:`Légende sociale française originale pour un média NeoDrive. Format:${format}. Sujet:${hook}. Angle:${topic?.angle||"usage réel"}. Pilier:${topic?.pillar||"mobilité"}. Média:${asset.title||asset.media_type}. Contexte:${asset.context||"aucun"}. Faits sûrs: VSP électrique 2 places, gamme à partir de 3 990 € TTC, recharge 220 V, livraison France. Réglementation: quadricycle léger accessible à partir de 14 ans avec permis AM lorsque requis; personnes nées avant 1988: cas particulier. Suspension, annulation ou invalidation du permis B: ne jamais affirmer automatiquement que la VSP est autorisée; demander de vérifier la décision judiciaire ou préfectorale, car une interdiction de conduire certains véhicules peut exister. Comparatifs Citroën Ami, Fiat Topolino, Aixam: rester factuel, jamais dénigrant, ne jamais inventer prix ou défauts. Acier: ne l’affirmer que si le média ou contexte le confirme. Évite les phrases publicitaires génériques et les répétitions. 3-7 phrases naturelles, 3-6 hashtags, CTA discret. Ne jamais inventer autonomie, sécurité, stock, garantie ou avis. Retourne seulement la légende.`,max_output_tokens:420});caption=r.output_text.trim()||caption;}catch{}
  for(const platform of ["instagram","facebook"])rows.push({topic_id:topic?.id||null,platform,content_type:type,hook,caption,hashtags:[],media_brief:`${type}; ${topic?.pillar||"brand"}; real-media`,media_url:asset.public_url,cta:"easydrive-auto.fr",publish_at:parisIso(day,slots[s].h,slots[s].m),status:"scheduled",requires_human_review:false,retry_count:0,max_retries:3});
 }
 const ins=await fetch(`${SB}/rest/v1/social_content_queue`,{method:"POST",headers:{...H(k),Prefer:"return=minimal"},body:JSON.stringify(rows)});if(!ins.ok)return NextResponse.json({ok:false,error:await ins.text()},{status:500});return NextResponse.json({ok:true,planned:rows.length,existing,generatedReelsAvailable:vids.filter((a:any)=>String(a.context||"").includes("générée automatiquement")).length});
}
