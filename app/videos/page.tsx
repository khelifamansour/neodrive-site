import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import styles from "./videos.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Vidéos réelles NeoDrive | Essais, habitacle et livraisons",
  description: "Regardez nos vidéos originales de voitures sans permis électriques NeoDrive : démonstrations, habitacle, préparation et arrivages.",
  alternates: { canonical: "https://www.easydrive-auto.fr/videos" },
};
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
type Video = { id:string; title:string|null; context:string|null; public_url:string; created_at:string };
async function getVideos():Promise<Video[]> {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) return [];
  const sb=createClient(SB,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await sb.from("social_media_assets")
    .select("id,title,context,public_url,created_at,storage_path")
    .eq("status","ready").eq("media_type","video")
    .not("storage_path","like","generated/%")
    .order("created_at",{ascending:false}).limit(80);
  if(error) { console.error("Video gallery:",error.message);return []; }
  return (data||[]).filter(v=>/^https:\/\//.test(v.public_url) && /\.mp4(?:\?|$)/i.test(v.public_url));
}
function titleOf(v:Video) {
  if(v.context?.trim() && v.context.length>10) return v.context.slice(0,85);
  if(v.title && !/^\d+\.mp4$/i.test(v.title)) return v.title.replace(/\.mp4$/i,"");
  return "Vidéo originale NeoDrive";
}
export default async function VideosPage() {
  const videos=await getVideos();
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>VIDÉOS ORIGINALES · NEODRIVE</span>
        <h1>NeoDrive,<br/><em>en vrai.</em></h1>
        <p>Découvrez nos vraies vidéos directement depuis notre médiathèque : véhicules, habitacle, équipements, essais et préparations.</p>
        <div className={styles.pills}><span>Véhicules réels</span><span>Lecture complète</span><span>Contenus actualisés</span></div>
      </div>
      <div className={styles.heroCard}><strong>{videos.length}</strong><span>vidéos disponibles</span><small>Galerie actualisée depuis NeoDrive.</small></div>
    </section>
    <section className={styles.intro}><span className={styles.eyebrow}>NOS VIDÉOS</span><h2>Découvrez les véhicules tels qu'ils sont.</h2><p>Sélectionnez une vidéo pour la lire ou ouvrez-la sur sa page dédiée.</p></section>
    {videos.length===0 ? <section className={styles.intro}><p>Les vidéos sont momentanément indisponibles. Contactez-nous pour recevoir les vidéos originales.</p></section> :
      <section className={styles.grid} aria-label="Vidéos NeoDrive">
        {videos.map((v,index)=><article className={styles.card} key={v.id}>
          <div className={styles.media}>
            <video controls playsInline preload="metadata" aria-label={titleOf(v)} src={v.public_url} style={{width:"100%",height:"100%",objectFit:"contain",background:"#000"}}>Votre navigateur ne prend pas en charge cette vidéo.</video>
            <span className={styles.number}>{String(index+1).padStart(2,"0")}</span>
          </div>
          <div className={styles.cardCopy}>
            <span className={styles.category}>Vidéo réelle</span>
            <h2>{titleOf(v)}</h2>
            <p>Vidéo originale issue de la médiathèque NeoDrive.</p>
            <p><a href={`/videos/${v.id}`} style={{fontWeight:700,textDecoration:"underline"}}>Ouvrir la vidéo en grand</a></p>
          </div>
        </article>)}
      </section>}
    <section className={styles.cta}><div><span className={styles.eyebrow}>UNE QUESTION ?</span><h2>Demandez une vidéo personnalisée.</h2><p>Nous pouvons vous montrer un véhicule, ses équipements et sa couleur.</p></div><a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20voir%20une%20NeoDrive%20en%20vid%C3%A9o">Demander sur WhatsApp</a></section>
  </main>;
}
