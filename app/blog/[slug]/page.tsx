import { notFound } from "next/navigation";
import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const U = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Article = { slug:string; title:string; content:string; excerpt?:string; meta_description?:string; description?:string; published_at?:string; updated_at?:string; target_keyword?:string };
type Media = { id:string; public_url:string; media_type:string; title?:string; context?:string };
async function supabaseGet(path:string) {
  if (!K) return [];
  const r = await fetch(`${U}/rest/v1/${path}`, { headers:{ apikey:K, Authorization:`Bearer ${K}` }, next:{revalidate:3600} });
  if (!r.ok) return [];
  return r.json();
}
async function article(slug:string):Promise<Article|null> {
  const a = await supabaseGet(`seo_articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*`);
  return a?.[0] || null;
}
function stableIndex(slug:string, length:number) {
  let hash=0; for(const ch of slug) hash=(Math.imul(hash,31)+ch.charCodeAt(0))|0;
  return length ? (hash>>>0)%length : 0;
}
async function gallery(slug:string, html:string):Promise<Media[]> {
  const assets:Media[]=await supabaseGet("social_media_assets?status=eq.ready&media_type=eq.image&select=id,public_url,media_type,title,context&order=created_at.desc&limit=200");
  const filtered=assets.filter(a=>a.public_url?.startsWith(U+"/storage/v1/object/public/") && !html.includes(a.public_url));
  if(filtered.length<2) return filtered;
  const start=stableIndex(slug,filtered.length);
  return [filtered[start],filtered[(start+1+Math.floor(filtered.length/2))%filtered.length]].filter((x,i,arr)=>arr.findIndex(y=>y.id===x.id)===i);
}
async function relatedArticles(slug:string):Promise<Article[]> {
  const rows:Article[]=await supabaseGet("seo_articles?status=eq.published&select=slug,title,target_keyword&order=published_at.desc&limit=80");
  const current=rows.find(r=>r.slug===slug);
  const terms=(current?.target_keyword||current?.title||"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>4);
  return rows.filter(r=>r.slug!==slug).map(r=>({row:r, score:terms.filter(t=>(r.title+" "+(r.target_keyword||"")).toLowerCase().includes(t)).length}))
    .sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.row);
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const a=await article(slug);
  return a?{title:`${a.title} | NeoDrive`,description:a.meta_description||a.excerpt||a.description,alternates:{canonical:`${SITE}/blog/${slug}`}}:{};
}
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const a=await article(slug);if(!a)notFound();
  const [photos, related]=await Promise.all([gallery(slug,a.content||""),relatedArticles(slug)]);
  const structured={"@context":"https://schema.org","@type":"Article",headline:a.title,description:a.meta_description||a.excerpt||a.description,datePublished:a.published_at,dateModified:a.updated_at||a.published_at,mainEntityOfPage:`${SITE}/blog/${slug}`,author:{"@type":"Organization",name:"NeoDrive"},publisher:{"@type":"Organization",name:"NeoDrive",url:SITE}};
  return <main style={{maxWidth:900,margin:"50px auto",padding:"0 22px",fontFamily:"Arial",lineHeight:1.7}}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>
    <a href="/blog">← Tous les guides NeoDrive</a>
    <article><h1>{a.title}</h1><p style={{color:"#555"}}>{a.excerpt||a.meta_description||a.description||""}</p><div dangerouslySetInnerHTML={{__html:a.content}} /></article>
    {photos.length>0 && <section style={{marginTop:32}}><h2>Découvrez les véhicules NeoDrive en images</h2><p>Photos issues de la médiathèque NeoDrive. Les couleurs et équipements peuvent varier selon la version.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {photos.map((photo,i)=><figure key={photo.id} style={{margin:0}}><img src={photo.public_url} alt={`Photo NeoDrive — voiture sans permis électrique, vue ${i+1}`} loading="lazy" style={{width:"100%",height:230,objectFit:"contain",borderRadius:12,background:"#f5f5f5"}}/></figure>)}
      </div></section>}
    {related.length>0 && <section style={{marginTop:36}}><h2>Autres guides pour choisir votre voiture sans permis</h2><ul>{related.map(r=><li key={r.slug}><a href={`/blog/${r.slug}`}>{r.title}</a></li>)}</ul></section>}
    <section style={{marginTop:32,padding:22,borderRadius:16,background:"#f5f5f5"}}><h2>Découvrez NeoDrive</h2><p>Voiture sans permis électrique deux places, gamme à partir de 3 990 € TTC.</p><p><a href="/produit">Voir les véhicules NeoDrive</a> · <a href="/offres/voiture-sans-permis-3990-euros">Comparer les prix</a> · <a href="/citroen-ami-ou-neodrive">Alternative à la Citroën Ami</a> · <a href="https://wa.me/33628261446">Nous contacter sur WhatsApp</a></p></section>
  </main>;
}
