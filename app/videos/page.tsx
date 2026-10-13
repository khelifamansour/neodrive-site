import type { Metadata } from "next";
import styles from "./videos.module.css";

export const metadata: Metadata = {
  title: "Vidéos réelles NeoDrive | Présentations, essais et arrivages",
  description:
    "Découvrez NeoDrive en vidéos réelles : présentation des voitures sans permis électriques, habitacle, conduite, recharge et arrivages.",
  alternates: { canonical: "https://www.easydrive-auto.fr/videos" },
};

const videos = [
  { file: "1000170267", title: "Présentation de la NeoDrive rouge", description: "Découvrez la voiture de près, son gabarit compact et ses lignes extérieures.", category: "Présentation" },
  { file: "1000170275", title: "Le tour complet du véhicule", description: "Une visite réelle autour de la NeoDrive pour mieux apprécier ses proportions et ses finitions.", category: "Extérieur" },
  { file: "1000170235", title: "À bord de la NeoDrive", description: "Position de conduite, visibilité et prise en main : découvrez l’habitacle en conditions réelles.", category: "Conduite" },
  { file: "1000170241", title: "Les équipements intérieurs", description: "Présentation du tableau de bord, des commandes et des équipements utiles au quotidien.", category: "Habitacle" },
  { file: "1000170272", title: "Poste de conduite et détails pratiques", description: "Un aperçu concret des commandes et de l’environnement du conducteur.", category: "Détails" },
  { file: "1000160304", title: "Nos véhicules à leur arrivée", description: "Les NeoDrive arrivent en plusieurs couleurs avant leur préparation et leur contrôle.", category: "Arrivage" },
  { file: "1000160267", title: "Arrivée du transporteur NeoDrive", description: "Un nouvel arrivage de voitures électriques rejoint notre stock.", category: "Transport" },
  { file: "1000160287", title: "Déchargement d’une NeoDrive grise", description: "Le véhicule descend du transporteur avant de passer entre les mains de notre équipe.", category: "Préparation" },
  { file: "1000160322", title: "Déchargement d’une NeoDrive rouge", description: "Une voiture tout juste arrivée, prête à être contrôlée et préparée.", category: "Préparation" },
  { file: "1000157437", title: "Recharge sur une prise 220 V", description: "La NeoDrive se recharge simplement sur une prise domestique classique.", category: "Recharge" },
];

export default function VideosPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>FILMÉ PAR NEODRIVE · SANS IMAGES DE SYNTHÈSE</span>
          <h1>NeoDrive,<br /><em>en vrai.</em></h1>
          <p>Découvrez nos voitures sans permis électriques à travers nos propres vidéos : présentation, habitacle, conduite, recharge et arrivages.</p>
          <div className={styles.pills}><span>Véhicules réels</span><span>Vidéos récentes</span><span>Son original</span></div>
        </div>
        <div className={styles.heroCard}>
          <strong>{videos.length}</strong>
          <span>premières vidéos<br />déjà disponibles</span>
          <small>D’autres contenus seront ajoutés prochainement.</small>
        </div>
      </section>

      <section className={styles.intro}>
        <span className={styles.eyebrow}>LA VOITURE SOUS TOUS LES ANGLES</span>
        <h2>Regardez. Écoutez. Faites-vous votre propre avis.</h2>
        <p>Toutes les vidéos ci-dessous ont été tournées avec nos véhicules. Lancez celle qui vous intéresse pour voir la NeoDrive telle qu’elle est réellement.</p>
      </section>

      <section className={styles.grid} aria-label="Vidéos réelles NeoDrive">
        {videos.map((video, index) => (
          <article className={styles.card} key={video.file}>
            <div className={styles.media}>
              <video controls playsInline preload="metadata" poster={`/videos-reelles/${video.file}.jpg`} aria-label={video.title}>
                <source src={`/videos-reelles/${video.file}.mp4`} type="video/mp4" />
                Votre navigateur ne prend pas en charge cette vidéo.
              </video>
              <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.cardCopy}>
              <span className={styles.category}>{video.category}</span>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.cta}>
        <div>
          <span className={styles.eyebrow}>UNE QUESTION AVANT DE CHOISIR ?</span>
          <h2>Demandez-nous une vidéo personnalisée.</h2>
          <p>Nous pouvons vous montrer en visio le véhicule, sa couleur et les détails qui comptent pour vous.</p>
        </div>
        <a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20voir%20une%20NeoDrive%20en%20vid%C3%A9o" target="_blank" rel="noreferrer">Demander sur WhatsApp</a>
      </section>
    </main>
  );
}
