import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type Asset={id:string;public_url:string;media_type:string;title:string|null;context:string|null;times_used:number|null;last_used_at:string|null};
function headers(key:string){return {Authorization:`Bearer ${key}`,apikey:key};}
function parisSlot(){const p=Object.fromEntries(new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));const h=Number(p.hour),m=Number(p.minute);if(h===9&&m>=20&&m<=55)return true;if(h===18&&m>=20&&m<=55)return true;return false;}

const THEMES=[
  "prix et accessibilité : voiture sans permis électrique neuve à partir de 3 990 €",
  "look et design : vraie présence malgré un format compact",
  "conception : acier et impression de robustesse sans promesse de sécurité non démontrée",
  "usage quotidien : courses, travail, trajets de proximité et stationnement",
  "100 % électrique : simplicité d'utilisation et mobilité locale",
  "recharge sur prise 220 V",
  "2 places et format compact",
  "fiabilité : conception simple, préparation, contrôles et suivi SAV sans promesse absolue",
  "coulisses : préparation, stockage, livraison et essais réels",
  "mobilité accessible : voiture sans permis B selon catégorie, limitée à 45 km/h",
];
function theme(){return THEMES[Math.floor(Date.now()/43200000)%THEMES.length];}

async function selectAsset():Promise<Asset|null>{const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return null;const u=new URL(`${SUPABASE_URL}/rest/v1/social_media_assets`);u.searchParams.set("status","eq.ready");u.searchParams.set("select","id,public_url,media_type,title,context,times_used,last_used_at");u.searchParams.set("order","times_used.asc.nullsfirst,last_used_at.asc.nullsfirst,priority.desc,created_at.asc");u.searchParams.set("limit","1");const r=await fetch(u,{headers:headers(key),cache:"no-store"});const j=await r.json();return r.ok&&Array.isArray(j)&&j[0]?j[0]:null;}

async function caption(asset:Asset){const fallback=`NeoDrive au quotidien : un format compact, 100 % électrique et pensé pour les déplacements de proximité.\n\nVoiture sans permis électrique à partir de 3 990 €.\n\n#NeoDrive #VoitureSansPermis #MobiliteElectrique #VSP`;
const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return fallback;try{const client=new OpenAI({apiKey});const prompt=`Rédige une publication Facebook NeoDrive en français à partir d'un vrai média de l'entreprise. Angle du jour : ${theme()}. Faits autorisés : voiture sans permis électrique 2 places, 45 km/h selon catégorie, recharge prise 220 V, gamme à partir de 3 990 €, conception faisant largement appel à l'acier. Contexte média : ${asset.context||"aucun"}. Nom du fichier : ${asset.title||"non renseigné"}. Règles : 3 à 6 phrases courtes, naturel et crédible, mots-clés voiture sans permis / voiture sans permis électrique si pertinents, 2 à 5 hashtags maximum, aucun faux avis, aucune autonomie ou garantie inventée, pas de 'Découvrez', pas de superlatifs vides. Retourne uniquement le texte.`;const content:any[]=[{type:"input_text",text:prompt}];if(asset.media_type!=="reel")content.push({type:"input_image",image_url:asset.public_url});const r=await client.responses.create({model:process.env.OPENAI_SOCIAL_MODEL||"gpt-4.1-mini",input:[{role:"user",content}] as any,max_output_tokens:350});return (r.output_text||"").trim()||fallback;}catch{return fallback;}}

async function mark(id:string){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return;const r=await fetch(`${SUPABASE_URL}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}&select=times_used`,{headers:headers(key),cache:"no-store"});const rows=await r.json().catch(()=>[]);const used=Array.isArray(rows)&&rows[0]?.times_used?Number(rows[0].times_used):0;await fetch(`${SUPABASE_URL}/rest/v1/social_media_assets?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{...headers(key),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({times_used:used+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"});}

async function resolvePageToken(configuredToken:string,pageId:string){
  const meUrl=new URL("https://graph.facebook.com/v26.0/me");
  meUrl.searchParams.set("fields","id,name");
  meUrl.searchParams.set("access_token",configuredToken);
  const meRes=await fetch(meUrl,{cache:"no-store"});
  const me=await meRes.json().catch(()=>({}));
  if(meRes.ok&&String(me.id)===String(pageId)) return configuredToken;

  const accountsUrl=new URL("https://graph.facebook.com/v26.0/me/accounts");
  accountsUrl.searchParams.set("fields","id,name,access_token");
  accountsUrl.searchParams.set("access_token",configuredToken);
  const accountsRes=await fetch(accountsUrl,{cache:"no-store"});
  const accounts=await accountsRes.json().catch(()=>({}));
  const row=Array.isArray(accounts?.data)?accounts.data.find((x:any)=>String(x?.id)===String(pageId)):null;
  if(accountsRes.ok&&row?.access_token) return String(row.access_token);
  const detail=accounts?.error?.message||me?.error?.message||"Le token configuré ne donne pas accès à la Page NeoDrive";
  throw new Error(`Facebook Page token invalide: ${detail}. Dans Graph API Explorer, exécute me/accounts?fields=id,name,access_token puis mets le access_token de la ligne NeoDrive dans FACEBOOK_PAGE_ACCESS_TOKEN.`);
}

async function publish(pageId:string,token:string,asset:Asset,message:string){const isVideo=asset.media_type==="reel";const endpoint=`https://graph.facebook.com/v26.0/${pageId}/${isVideo?"videos":"photos"}`;const body=isVideo?new URLSearchParams({file_url:asset.public_url,description:message,access_token:token}):new URLSearchParams({url:asset.public_url,caption:message,published:"true",access_token:token});const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok||(!j.id&&!j.post_id))throw new Error(j?.error?.message||"Facebook publish failed");return j.post_id||j.id;}

export async function GET(request:Request){const force=new URL(request.url).searchParams.get("force")==="1";const secret=process.env.CRON_SECRET;const auth=request.headers.get("authorization");if(!secret||auth!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});if(!force&&!parisSlot())return NextResponse.json({ok:true,skipped:true,reason:"Outside Paris publishing window"});const configuredToken=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;const pageId=process.env.FACEBOOK_PAGE_ID;if(!configuredToken||!pageId)return NextResponse.json({ok:false,error:"FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ID missing"},{status:503});const asset=await selectAsset();if(!asset)return NextResponse.json({ok:true,skipped:true,reason:"No ready media asset"});try{const pageToken=await resolvePageToken(configuredToken,pageId);const message=await caption(asset);const postId=await publish(pageId,pageToken,asset,message);await mark(asset.id);return NextResponse.json({ok:true,published:true,postId,media:asset.public_url,mediaType:asset.media_type,forced:force});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unknown error"},{status:500});}}
