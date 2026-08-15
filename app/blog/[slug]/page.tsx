import { notFound } from "next/navigation";
import type { Metadata } from "next";

const U="https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const K=process.env.SUPABASE_SERVICE_ROLE_KEY!;
async function article(slug:string){const r=await fetch(`${U}/rest/v1/seo_articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*`,{headers:{apikey:K,Authorization:`Bearer ${K}`},next:{revalidate:3600}}); const a=await r.json(); return a?.[0]||null}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const a=await article(slug);return a?{title:`${a.title} | NeoDrive`,description:a.description,alternates:{canonical:`https://www.easydrive-auto.fr/blog/${slug}`}}:{};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=await article(slug);if(!a)notFound();return <main style={{maxWidth:900,margin:"50px auto",padding:"0 22px",fontFamily:"Arial",lineHeight:1.7}}><a href="/">← NeoDrive</a><article><h1>{a.title}</h1><p style={{color:"#555"}}>{a.description}</p><div dangerouslySetInnerHTML={{__html:a.content}} /></article><p><a href="/produit">Découvrir les voitures sans permis NeoDrive</a></p></main>}
