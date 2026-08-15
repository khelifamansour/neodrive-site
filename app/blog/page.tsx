import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Conseils voiture sans permis électrique | NeoDrive",
  description: "Guides NeoDrive sur les prix, l'autonomie, la recharge, l'assurance et le choix d'une voiture sans permis électrique.",
  alternates: { canonical: "https://www.easydrive-auto.fr/blog" },
};

const supabase = createClient("https://tzlsdjzcxdjaatcpwqwn.supabase.co","sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd",{auth:{persistSession:false,autoRefreshToken:false}});

export default async function BlogPage(){
  const {data}=await supabase.from("seo_articles").select("slug,title,meta_description,published_at,created_at").eq("status","published").order("published_at",{ascending:false}).limit(60);
  return <main style={{maxWidth:1100,margin:"0 auto",padding:"70px 22px 100px",color:"#111"}}>
    <span style={{fontSize:12,fontWeight:900,letterSpacing:2,color:"#ff5a1f"}}>GUIDES NEODRIVE</span>
    <h1 style={{fontSize:"clamp(42px,7vw,72px)",letterSpacing:-3,margin:"12px 0 15px"}}>Comprendre la voiture sans permis.</h1>
    <p style={{fontSize:20,color:"#666",lineHeight:1.6,maxWidth:760}}>Prix, autonomie, recharge, assurance et comparatifs : des réponses pratiques pour choisir votre véhicule sans permis.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginTop:45}}>
      {(data||[]).map(a=><a key={a.slug} href={`/blog/${a.slug}`} style={{textDecoration:"none",color:"inherit",padding:25,border:"1px solid #e5e7eb",borderRadius:22,background:"#fff"}}><small style={{color:"#777"}}>{new Date(a.published_at||a.created_at||Date.now()).toLocaleDateString("fr-FR")}</small><h2 style={{fontSize:22,lineHeight:1.2,margin:"10px 0"}}>{a.title}</h2><p style={{color:"#666",lineHeight:1.55}}>{a.meta_description||"Lire le guide NeoDrive."}</p><b>Lire l’article →</b></a>)}
    </div>
    <section style={{marginTop:60,padding:35,borderRadius:24,background:"#f3f4f6"}}><h2>Vous cherchez directement un véhicule ?</h2><p style={{color:"#666"}}>Découvrez la NeoDrive SWITCH, ses caractéristiques et les offres actuellement proposées.</p><a href="/produit" style={{display:"inline-block",marginTop:10,padding:"14px 20px",borderRadius:12,background:"#111",color:"#fff",fontWeight:900,textDecoration:"none"}}>Voir la NeoDrive SWITCH</a></section>
  </main>;
}
