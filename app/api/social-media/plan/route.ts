import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const CAMPAIGN_DAYS = 90;
const CAMPAIGN_END = new Date("2026-12-10T23:59:59Z");
const MEDIA_LOOKBACK_DAYS = 120;

type Asset = { id:string; storage_path:string; public_url:string; media_type:string; context:string|null; title:string|null; times_used:number; created_at:string };
type Theme = { hook:string; body:string };

const THEMES:Theme[] = [
  {hook:"Pourquoi NeoDrive peut être moins chère ?",body:"Notre modèle est volontairement direct : approvisionnement fabricant, organisation centralisée à Toulouse et vente sans réseau de concessions ou de showrooms à financer. L’objectif est simple : réduire les coûts de distribution plutôt que multiplier les intermédiaires."},
  {hook:"Acheter à distance sans avancer le prix du véhicule",body:"NeoDrive mise sur un parcours rassurant : le tarif et la livraison sont annoncés, un agent amène le véhicule chez vous, vous présente son fonctionnement et le paiement s’effectue à la livraison selon les modalités prévues à la commande."},
  {hook:"Pas de showroom à payer dans le prix de la voiture",body:"Un réseau physique coûte cher : locaux, exposition, intermédiaires et charges commerciales. NeoDrive centralise sa préparation et organise la livraison à domicile pour concentrer les coûts sur le véhicule, sa préparation et son transport."},
  {hook:"Une conception volontairement simple",body:"Notre philosophie produit est de conserver l’essentiel du confort tout en évitant la complexité inutile. Une architecture plus simple peut rendre le diagnostic, l’entretien et le remplacement de certaines pièces plus lisibles. Cela ne veut pas dire qu’une voiture ne peut jamais tomber en panne."},
  {hook:"Pourquoi le châssis acier nous intéresse",body:"NeoDrive utilise un châssis acier. Pour la réparabilité, c’est un matériau bien connu des professionnels : selon le dommage, il peut être redressé, soudé ou réparé avec des méthodes de carrosserie classiques. La sécurité d’un véhicule dépend toutefois de sa conception globale et de son homologation, pas d’un matériau seul."},
  {hook:"Réparer plutôt que remplacer",body:"Après un petit choc, le vrai sujet est souvent la réparabilité : accès aux pièces, possibilité de redressage et coût de main-d’œuvre. C’est l’une des raisons pour lesquelles nous privilégions une architecture simple et des éléments réparables par des professionnels."},
  {hook:"NeoDrive ou Citroën Ami : comparez le coût total",body:"Ne regardez pas seulement un prix d’appel. Comparez le prix réellement payé, les équipements inclus, la recharge, la livraison, le SAV et les éventuels frais annexes. Nous voulons proposer une alternative très agressive en prix avec un niveau d’équipement compétitif. Les caractéristiques concurrentes doivent toujours être vérifiées sur les fiches officielles en vigueur."},
  {hook:"Prix bas ne veut pas dire offre cachée",body:"Quand un tarif paraît très bas, la bonne question est : pourquoi ? Chez NeoDrive, la réponse tient surtout au modèle de distribution directe, à la centralisation et à une voiture conçue sans superflu. Nous préférons expliquer la structure du prix plutôt que demander au client de nous croire sur parole."},
  {hook:"Une vraie livraison, chez vous",body:"Notre activité ne s’arrête pas à une commande en ligne. Les véhicules sont préparés, transportés puis remis au client. À la livraison, l’agent peut expliquer la recharge, les commandes et les points essentiels de prise en main."},
  {hook:"Le leasing : regardez plus loin que la mensualité",body:"Une mensualité basse ne suffit pas pour comparer. En LOA ou LLD, lisez les conditions d’assurance, de kilométrage et de restitution : des frais de remise en état peuvent exister selon le contrat et l’état du véhicule. Ils ne sont pas automatiques et leur montant varie. En achat, vous conservez le véhicule."},
  {hook:"Acheter une voiture sur internet : quoi vérifier ?",body:"Avant de payer, vérifiez l’identité de l’entreprise, les documents, l’homologation, les conditions de vente, le prix de livraison et demandez des photos ou vidéos réelles. Chez NeoDrive, nous voulons que le client puisse voir le produit et comprendre le parcours avant la remise du véhicule."},
  {hook:"Pourquoi nous sommes centralisés à Toulouse",body:"Centraliser la préparation permet de standardiser les contrôles, organiser les stocks et planifier les tournées de livraison sans multiplier les coûts fixes. La vente reste nationale : le véhicule est amené directement chez le client."}
];

function isRealUpload(a:Asset){return /^\d{4}-\d{2}-\d{2}\//.test(a.storage_path||"")&&!/^generated\//.test(a.storage_path||"");}
function isVideo(a:Asset){return a.media_type==="video"||/\.(mp4|mov|m4v)(\?|$)/i.test(a.public_url||"");}
function safeContext(v:string|null){return String(v||"").replace(/\s+/g," ").trim().slice(0,280);}
function captionFor(a:Asset,index:number){
  const t=THEMES[index%THEMES.length];
  const ctx=safeContext(a.context);
  const proof=isVideo(a)?"🎥 Vidéo réelle NeoDrive.":"📸 Photo réelle NeoDrive.";
  return `${t.hook}\n\n${t.body}${ctx?`\n\nSur cette publication : ${ctx}`:""}\n\n${proof}\n\nPlus d’informations : easydrive-auto.fr\n\n#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique`;
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
    .eq("status","ready").gte("created_at",since)
    .order("times_used",{ascending:true}).order("created_at",{ascending:false}).limit(300);
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});

  const assets=(data||[]).filter((x:any)=>isRealUpload(x as Asset)) as Asset[];
  if(!assets.length) return NextResponse.json({ok:true,skipped:true,reason:"Aucun média réel récent dans la bibliothèque"});

  await sb.from("social_content_queue").delete().eq("status","scheduled").in("platform",["instagram","facebook"]);

  const videos=assets.filter(isVideo),images=assets.filter(a=>!isVideo(a));
  let vi=0,ii=0;
  const used=new Set<string>();
  function take(prefer:"video"|"image"){
    const first=prefer==="video"?videos:images,second=prefer==="video"?images:videos;
    const firstIndex=prefer==="video"?()=>vi++:()=>ii++,secondIndex=prefer==="video"?()=>ii++:()=>vi++;
    while(true){const n=firstIndex(),a=first[n];if(!a)break;if(!used.has(a.id)){used.add(a.id);return a;}}
    while(true){const n=secondIndex(),a=second[n];if(!a)break;if(!used.has(a.id)){used.add(a.id);return a;}}
    return null;
  }

  const rows:any[]=[];
  let themeIndex=0;
  for(let d=0;d<CAMPAIGN_DAYS;d++){
    for(const slot of [{h:7,m:30,prefer:"video" as const},{h:16,m:30,prefer:"image" as const}]){
      const when=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+d,slot.h,slot.m,0));
      if(when>CAMPAIGN_END) continue;
      const a=take(slot.prefer);if(!a)continue;
      const t=THEMES[themeIndex%THEMES.length],caption=captionFor(a,themeIndex++);
      for(const platform of ["instagram","facebook"]){
        rows.push({platform,content_type:isVideo(a)?"reel":"post",hook:t.hook,caption,hashtags:[],media_brief:`real-upload:${a.id}`,media_url:a.public_url,cta:"easydrive-auto.fr",publish_at:when.toISOString(),status:"scheduled",requires_human_review:false,retry_count:0,max_retries:3});
      }
    }
  }
  if(!rows.length) return NextResponse.json({ok:true,skipped:true,reason:"Pas assez de médias compatibles ou campagne terminée"});
  const {error:insertError}=await sb.from("social_content_queue").insert(rows);
  if(insertError) return NextResponse.json({ok:false,error:insertError.message},{status:500});
  return NextResponse.json({ok:true,scheduled:rows.length,uniqueMedia:used.size,campaignEnd:CAMPAIGN_END.toISOString(),postsPerDayPerPlatform:2,themeCount:THEMES.length,videos:videos.length,images:images.length,mode:"commercial-trust-real-uploads"});
}
