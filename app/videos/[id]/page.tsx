import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

async function getVideo(id: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const sb = createClient(SB, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("social_media_assets")
    .select("id,public_url,title,context,created_at,storage_path")
    .eq("id", id)
    .eq("status", "ready")
    .eq("media_type", "video")
    .not("storage_path", "like", "generated/%")
    .maybeSingle();
  return data || null;
}

function videoTitle(video: any) {
  const context = String(video?.context || "").trim();
  const title = String(video?.title || "").trim();
  if (context && context.length > 8) return context.slice(0, 100);
  if (title && !/^\d+\.(mp4|mov)$/i.test(title)) return title.replace(/\.(mp4|mov)$/i, "");
  return "Vidéo réelle d’une voiture sans permis électrique NeoDrive";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return {};
  const title = videoTitle(video);
  return {
    title: `${title} | NeoDrive`,
    description: "Vidéo réelle NeoDrive : découvrez une voiture sans permis électrique en situation réelle avant achat ou livraison.",
    alternates: { canonical: `https://www.easydrive-auto.fr/videos/${id}` },
  };
}

export default async function VideoWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();
  const title = videoTitle(video);

  return (
    <main style={{maxWidth:980,margin:"0 auto",padding:"40px 18px 76px",fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#111"}}>
      <a href="/videos" style={{color:"#555",textDecoration:"none"}}>← Toutes les vidéos NeoDrive</a>
      <article style={{marginTop:24}}>
        <span style={{fontSize:12,fontWeight:950,letterSpacing:1.1,color:"#ef5b2a"}}>VIDÉO RÉELLE NEODRIVE</span>
        <h1 style={{fontSize:"clamp(34px,5vw,54px)",lineHeight:1.05,letterSpacing:-1.7,margin:"10px 0 18px"}}>{title}</h1>
        <p style={{color:"#666"}}>Ajoutée le {new Date(video.created_at).toLocaleDateString("fr-FR")}. Cette vidéo provient directement de notre bibliothèque de médias NeoDrive.</p>
        <div style={{background:"#000",borderRadius:22,overflow:"hidden",margin:"24px 0 30px",maxHeight:720,display:"grid",placeItems:"center"}}>
          <video controls preload="metadata" playsInline style={{display:"block",width:"100%",maxHeight:720,objectFit:"contain",background:"#000"}}>
            <source src={video.public_url} type="video/mp4" />
          </video>
        </div>

        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
          <a href="/produit" style={{padding:20,border:"1px solid #ddd",borderRadius:17,textDecoration:"none",color:"#111"}}><strong>Voir la voiture NeoDrive</strong><br/><span style={{color:"#666"}}>Versions, équipements et informations produit →</span></a>
          <a href="/voiture-sans-permis" style={{padding:20,border:"1px solid #ddd",borderRadius:17,textDecoration:"none",color:"#111"}}><strong>Voiture sans permis par ville</strong><br/><span style={{color:"#666"}}>Livraison et pages locales →</span></a>
          <a href="https://wa.me/33628261446" style={{padding:20,border:"1px solid #bdeaca",borderRadius:17,textDecoration:"none",color:"#111",background:"#f2fff6"}}><strong>Demander une vidéo précise</strong><br/><span style={{color:"#39734a"}}>Contact direct sur WhatsApp →</span></a>
        </section>

        <section style={{marginTop:36,padding:26,borderRadius:20,background:"#f5f5f5"}}>
          <h2 style={{marginTop:0}}>Pourquoi publier nos vraies vidéos ?</h2>
          <p>Une photo commerciale ne montre pas tout. Les vidéos réelles permettent de voir le gabarit, l’intérieur, les détails et les véhicules que nous préparons ou livrons. Elles complètent nos guides sur le <a href="/prix-voiture-sans-permis">prix</a>, l’<a href="/voiture-sans-permis-occasion">occasion</a> et la <a href="/voiture-sans-permis-electrique">voiture sans permis électrique</a>.</p>
        </section>
      </article>
    </main>
  );
}
