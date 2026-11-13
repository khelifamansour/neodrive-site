import type { Metadata } from "next";
import { SOCIAL, SOCIAL_LINKS } from "@/lib/social";
import { getGalleryVideos } from "./data";
import { SECTIONS } from "./selection";
import VideoGallery from "./VideoGallery";
import styles from "./videos.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vidéos réelles NeoDrive | Livraisons, essais et arrivages",
  description: "Nos vraies vidéos de voitures sans permis électriques NeoDrive : livraisons chez nos clients, essais, habitacle, arrivages de conteneurs et stock.",
  alternates: { canonical: "https://www.easydrive-auto.fr/videos" },
};

const WHATSAPP_TEXT = "Bonjour, j'ai vu vos vidéos NeoDrive et je souhaite plus d'informations.";

export default async function VideosPage() {
  const videos = await getGalleryVideos();
  const sections = SECTIONS.filter(s => videos.some(v => v.section === s.key));
  const whatsapp = `${SOCIAL.whatsapp}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>VIDÉOS RÉELLES · NEODRIVE</span>
        <h1>Nos voitures, <em>en vrai.</em></h1>
        <p>Pas de photos de catalogue : des vidéos filmées par notre équipe. Livraisons chez nos clients, essais, intérieur et arrivages.</p>
        {sections.length > 0 && (
          <nav className={styles.chips} aria-label="Catégories de vidéos">
            {sections.map(s => {
              const count = videos.filter(v => v.section === s.key).length;
              return <a key={s.key} href={`#${s.key}`}>{s.title} <span>{count}</span></a>;
            })}
          </nav>
        )}
        <p className={styles.hint}>Appuyez sur une vidéo pour la lire ici, sans quitter la page.</p>
      </section>

      {videos.length === 0 ? (
        <section className={styles.empty}>
          <p>Les vidéos sont momentanément indisponibles. Écrivez-nous sur WhatsApp : nous vous les envoyons directement.</p>
        </section>
      ) : (
        <VideoGallery videos={videos} sections={sections} />
      )}

      <section className={styles.follow} aria-labelledby="retrouvez-nous">
        <div className={styles.followCopy}>
          <span className={styles.eyebrow}>RETROUVEZ-NOUS</span>
          <h2 id="retrouvez-nous">Suivez NeoDrive</h2>
          <p>Retrouvez nos livraisons et nos arrivages sur nos réseaux, ou demandez-nous une vidéo du véhicule qui vous intéresse.</p>
          {SOCIAL_LINKS.length > 0 && (
            <ul className={styles.socials}>
              {SOCIAL_LINKS.map(l => (
                <li key={l.key}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={styles[`social_${l.key}`]}>{l.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.ctaBox}>
          <strong>Envie de la vôtre ?</strong>
          <a className={styles.ctaPrimary} href="/reservation-devis">Réserver ma NeoDrive</a>
          <a className={styles.ctaWhatsapp} href={whatsapp} target="_blank" rel="noopener noreferrer">Poser une question sur WhatsApp</a>
        </div>
      </section>
    </main>
  );
}
