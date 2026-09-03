import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vidéos voiture sans permis NeoDrive | Essais et livraisons réels",
  description: "Découvrez les dernières vidéos réelles NeoDrive : présentations, véhicules, essais, préparations et livraisons de voitures sans permis électriques.",
  alternates: { canonical: "https://www.easydrive-auto.fr/videos" },
};

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function displayTitle(video: any, index: number) {
  const context = String(video.context || "").trim();
  const title = String(video.title || "").trim();
  if (context && context.length > 8) return context.slice(0, 100);
  if (title && !/^\d+\.(mp4|mov)$/i.test(title)) return title.replace(/\.(mp4|mov)$/i, "");
  return `Vidéo réelle NeoDrive – présentation ${index + 1}`;
}

export default async function VideosPage() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(SB, key || "", { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = key
    ? await sb.from("social_media_assets")
        .select("id,public_url,title,context,created_at")
        .eq("status", "ready")
        .eq("media_type", "video")
        .not("storage_path", "like", "generated/%")
        .order("created_at", { ascending: false })
        .limit(24)
    : { data: [] as any[] };
  const videos = data || [];

  return (
    <main style={{maxWidth:1180,margin:"0 auto",padding:"50px 18px 76px",fontFamily:"Arial,sans-serif",color:"#111"}}>
      <section style={{maxWidth:850,margin:"0 auto 38px",textAlign:"center"}}>
        <span style={{fontSize:12,fontWeight:950,letterSpacing:1.2,color:"#ef5b2a"}}>VÉHICULES RÉELS · CONTENU RÉCENT</span>
        <h1 style={{fontSize:"clamp(38px,6vw,66px)",lineHeight:1,letterSpacing:-2.5,margin:"13px 0 18px"}}>NeoDrive en vidéo</h1>
        <p style={{fontSize:18,lineHeight:1.65,color:"#5d5d64"}}>Nous publions ici les vraies vidéos ajoutées à notre bibliothèque : véhicules, détails, préparations et livraisons. Les nouveaux uploads apparaissent automatiquement sur cette page.</p>
        <div style={{display:"flex",justifyContent:"center",gap:9,flexWrap:"wrap",marginTop:20}}>
          <span style={{padding:"9px 12px",border:"1px solid #e5e5e5",borderRadius:999,fontWeight:800}}>✓ Vidéos réelles</span>
          <span style={{padding:"9px 12px",border:"1px solid #e5e5e5",borderRadius:999,fontWeight:800}}>✓ Mises à jour automatiquement</span>
          <a href="/voiture-sans-permis" style={{padding:"9px 12px",border:"1px solid #e5e5e5",borderRadius:999,fontWeight:800,color:"#111",textDecoration:"none"}}>Voiture sans permis par ville →</a>
        </div>
      </section>

      {videos.length ? (
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:20}}>
          {videos.map((video: any, index: number) => {
            const title = displayTitle(video, index);
            return (
              <article key={video.id} style={{background:"#fff",border:"1px solid #e7e7e7",borderRadius:22,overflow:"hidden",boxShadow:"0 14px 38px rgba(0,0,0,.06)"}}>
                <div style={{background:"#000",aspectRatio:"9/16",maxHeight:480,display:"grid",placeItems:"center"}}>
                  <video controls preload="none" playsInline style={{display:"block",width:"100%",height:"100%",objectFit:"contain",background:"#000"}}>
                    <source src={video.public_url} type="video/mp4" />
                  </video>
                </div>
                <div style={{padding:18}}>
                  <h2 style={{fontSize:20,lineHeight:1.25,margin:"0 0 8px"}}>{title}</h2>
                  <p style={{color:"#777",fontSize:13,margin:"0 0 14px"}}>Ajoutée le {new Date(video.created_at).toLocaleDateString("fr-FR")}</p>
                  <a href={`/videos/${video.id}`} style={{fontWeight:900,color:"#111",textDecoration:"none"}}>Ouvrir la page vidéo →</a>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <p style={{padding:28,borderRadius:18,background:"#f5f5f5"}}>Les dernières vidéos sont en cours de chargement. Vous pouvez aussi nous demander une vidéo personnalisée sur WhatsApp.</p>
      )}

      <section style={{marginTop:40,padding:28,borderRadius:22,background:"#111",color:"#fff",display:"flex",gap:20,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div><strong style={{fontSize:24}}>Vous voulez voir un détail précis ?</strong><p style={{margin:"8px 0 0",color:"#ddd"}}>Demandez une vidéo du véhicule avant de prendre votre décision.</p></div>
        <a href="https://wa.me/33628261446" style={{background:"#25d366",color:"#fff",padding:"14px 18px",borderRadius:13,textDecoration:"none",fontWeight:950}}>Demander sur WhatsApp</a>
      </section>
    </main>
  );
}
