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
type Video = { id:string; title:string|null; public_url:string };
const featured = [
{file:"1000160287.mp4",title:"Déchargement d'une NeoDrive",description:"Un véhicule lors des opérations de transport.",image:"/neodrive-switch/photos/confort-transport-dechargement.jpg",category:"Logistique"},
{file:"1000160305.mp4",title:"Véhicules NeoDrive en arrivage",description:"Images de notre flotte à l'arrivée.",image:"/neodrive-switch/photos/confort-arrivage-transport.jpg",category:"Arrivages"},
{file:"1000160306.mp4",title:"Les voitures NeoDrive en stock",description:"Découvrez plusieurs véhicules de notre gamme.",image:"/neodrive-switch/photos/confort-arrivage-transport.jpg",category:"Véhicules"},
{file:"1000160307.mp4",title:"Les véhicules avant préparation",description:"Images de nos opérations logistiques.",image:"/neodrive-switch/photos/confort-arrivage-transport.jpg",category:"Préparation"},
{file:"1000160308.mp4",title:"Arrivage de voitures électriques",description:"Découvrez les coulisses de notre activité.",image:"/neodrive-switch/photos/confort-arrivage-transport.jpg",category:"Arrivages"},
{file:"1000160288.mp4",title:"Transport de la NeoDrive",description:"Présentation de nos opérations de livraison.",image:"/neodrive-switch/photos/confort-transport-dechargement.jpg",category:"Transport"},
{file:"1000160265.mp4",title:"Coulisses de nos livraisons",description:"Une séquence filmée pendant nos opérations.",image:"/neodrive-switch/photos/confort-transport-dechargement.jpg",category:"Livraison"},

{file:"1000170267.mp4",title:"Découvrez la NeoDrive rouge",description:"Présentation extérieure de notre voiture sans permis électrique.",image:"/neodrive-switch/photos/confort-exterieur-avant.jpg",category:"Présentation"},
{file:"1000170275.mp4",title:"Tour du véhicule NeoDrive",description:"Découvrez son gabarit, sa silhouette et ses détails.",image:"/neodrive-switch/photos/confort-exterieur-arriere.jpg",category:"Extérieur"},
{file:"1000170235.mp4",title:"À bord de la NeoDrive",description:"Visite de l'habitacle et de l'espace conducteur.",image:"/neodrive-switch/photos/confort-interieur-large.jpg",category:"Habitacle"},
{file:"1000170241.mp4",title:"Équipements et tableau de bord",description:"Présentation des commandes et des éléments intérieurs.",image:"/neodrive-switch/photos/confort-tableau-de-bord.jpg",category:"Équipements"},
{file:"1000160304.mp4",title:"Découvrez nos arrivages",description:"Plusieurs véhicules NeoDrive réunis avant leur préparation.",image:"/neodrive-switch/photos/confort-arrivage-transport.jpg",category:"Arrivages"},
{file:"1000160267.mp4",title:"Transport de voitures NeoDrive",description:"Découvrez les coulisses de notre logistique.",image:"/neodrive-switch/photos/confort-transport-dechargement.jpg",category:"Transport"},
{file:"1000157437.mp4",title:"Recharge de la NeoDrive",description:"Présentation de la recharge électrique du véhicule.",image:"/neodrive-switch/photos/confort-interieur-large.jpg",category:"Recharge"}
];
async function getVideos() {
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key) return [];
 const sb=createClient(SB,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await sb.from("social_media_assets").select("id,title,public_url").eq("status","ready").eq("media_type","video").not("storage_path","like","generated/%").limit(500);
 if(error){console.error("Video gallery:",error.message);return [];}
 return featured.flatMap(item=>{
   const media=(data||[]).find(v=>v.title===item.file && /^https:\/\//.test(v.public_url));
   return media?[{...item,id:media.id,public_url:media.public_url}]:[];
 });
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
    <section className={styles.intro}><span className={styles.eyebrow}>NOS VIDÉOS</span><h2>Découvrez les véhicules tels qu'ils sont.</h2><p>Choisissez un sujet et appuyez sur « Lire la vidéo » pour regarder la séquence en grand.</p></section>
    {videos.length===0 ? <section className={styles.intro}><p>Contactez-nous pour recevoir nos vidéos de présentation.</p></section> :
      <section className={styles.grid} aria-label="Vidéos NeoDrive">
        {videos.map(v=><article className={styles.card} key={v.id}>
          <div className={styles.media}>
            <a href={`/videos/${v.id}`} className={styles.videoCover} aria-label={`Lire : ${v.title}`}>
              <img src={v.image} loading="lazy" alt={`Photo NeoDrive : ${v.category.toLowerCase()}`} />
              <span className={styles.playButton}><span aria-hidden="true">▶</span> Lire la vidéo</span>
            </a>
          </div>
          <div className={styles.cardCopy}>
            <span className={styles.category}>{v.category}</span>
            <h2>{v.title}</h2><p>{v.description}</p>
            <p><a href={`/videos/${v.id}`} className={styles.watchLink}>Regarder la vidéo →</a></p>
          </div>
        </article>)}
      </section>}
    <section className={styles.cta}><div><span className={styles.eyebrow}>UNE QUESTION ?</span><h2>Demandez une vidéo personnalisée.</h2><p>Nous pouvons vous montrer un véhicule, ses équipements et sa couleur.</p></div><a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20voir%20une%20NeoDrive%20en%20vid%C3%A9o">Demander sur WhatsApp</a></section>
  </main>;
}
