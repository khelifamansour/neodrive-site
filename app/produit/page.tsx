"use client";

import { useState, type SyntheticEvent } from "react";
import styles from "./produit.module.css";

const BASE = "/neodrive-switch";
const RAW = "https://raw.githubusercontent.com/khelifamansour/neodrive-site/main/public/neodrive-switch";

type Photo = {
  path: string;
  label: string;
  alt: string;
};

const photos: Photo[] = [
  { path: "/photos/front-close.webp", label: "Extérieur", alt: "Vue trois-quarts avant réelle de la NeoDrive SWITCH" },
  { path: "/photos/front-intermarche-angle.webp", label: "Extérieur", alt: "NeoDrive SWITCH photographiée de trois-quarts avant" },
  { path: "/photos/front-intermarche.webp", label: "Face avant", alt: "Vue de face réelle de la NeoDrive SWITCH" },
  { path: "/photos/front-landscape.webp", label: "En situation", alt: "NeoDrive SWITCH stationnée en extérieur" },
  { path: "/photos/rear-burgerking.webp", label: "Vue arrière", alt: "Vue arrière réelle de la NeoDrive SWITCH" },
  { path: "/photos/interior-wide.webp", label: "Intérieur", alt: "Habitacle deux places réel de la NeoDrive SWITCH" },
  { path: "/photos/interior-driver.webp", label: "Poste de conduite", alt: "Poste de conduite et sièges de la NeoDrive SWITCH" },
  { path: "/photos/dashboard-detail.webp", label: "Commandes", alt: "Détail réel des commandes de la NeoDrive SWITCH" },
  { path: "/real/stock-couleurs.webp", label: "Stock réel", alt: "Plusieurs NeoDrive SWITCH de notre stock" },
  { path: "/real/devant-atelier.webp", label: "Préparation", alt: "NeoDrive SWITCH devant notre atelier" },
  { path: "/real/livraison-transporteur.webp", label: "Livraison", alt: "NeoDrive SWITCH pendant une livraison réelle" },
];

const specs = [
  ["Moteur", "3 kW électrique"],
  ["Vitesse", "45 km/h"],
  ["Autonomie indicative", "50 à 70 km"],
  ["Recharge", "220 V · env. 6 h"],
  ["Places", "2"],
  ["Dimensions", "2,50 × 1,30 × 1,65 m"],
];

function source(path: string) {
  return `${BASE}${path}`;
}

function fallback(path: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const rawSource = `${RAW}${path}`;
    if (image.src !== rawSource) image.src = rawSource;
  };
}

export default function Produit() {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = photos[index];
  const move = (delta: number) => setIndex((index + delta + photos.length) % photos.length);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>VOITURE SANS PERMIS · 100 % ÉLECTRIQUE</span>
          <h1>NeoDrive<br /><em>SWITCH</em></h1>
          <p>
            Une voiture électrique deux places, compacte et simple à utiliser. Ici, vous voyez nos
            vrais véhicules : extérieur, intérieur, préparation, stock et livraison.
          </p>
          <div className={styles.price}>
            <span>À partir de</span>
            <strong>3 990 € TTC</strong>
          </div>
          <div className={styles.actions}>
            <a
              href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20recevoir%20une%20vid%C3%A9o%20de%20la%20NeoDrive%20SWITCH"
              target="_blank"
              rel="noreferrer"
            >
              Recevoir une vidéo
            </a>
            <a className={styles.secondary} href="#galerie">Voir les photos réelles</a>
          </div>
          <small>Prix selon version, équipement et disponibilité.</small>
        </div>

        <div className={styles.heroPhoto}>
          <img
            src={source(photos[0].path)}
            alt={photos[0].alt}
            onError={fallback(photos[0].path)}
            fetchPriority="high"
          />
          <div className={styles.heroBadge}>PHOTO RÉELLE · VÉHICULE NEODRIVE</div>
          <div className={styles.heroFacts}>
            <b>2 places</b>
            <b>45 km/h</b>
            <b>Recharge 220 V</b>
          </div>
        </div>
      </section>

      <section className={styles.reassurance}>
        <article><span>01</span><b>Véhicule neuf</b><small>Préparé et contrôlé avant livraison</small></article>
        <article><span>02</span><b>Photos réelles</b><small>Nos voitures, photographiées par nous</small></article>
        <article><span>03</span><b>Paiement à la livraison</b><small>Après réception et contrôle</small></article>
        <article><span>04</span><b>Livraison en France</b><small>Organisation directement par NeoDrive</small></article>
      </section>

      <section id="galerie" className={styles.gallerySection}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>NOS PHOTOS RÉELLES</span>
          <h2>La voiture, telle qu’elle est vraiment.</h2>
          <p>
            Pas d’image catalogue générique : extérieur, habitacle, stock, préparation et transport.
            Touchez une miniature pour changer de photo.
          </p>
        </div>

        <div className={styles.viewer}>
          <div className={styles.stage}>
            <img
              key={current.path}
              src={source(current.path)}
              alt={current.alt}
              onError={fallback(current.path)}
              onClick={() => setZoom(true)}
              decoding="async"
            />
            <div className={styles.caption}>
              <span>{current.label}</span>
              <b>{current.alt}</b>
            </div>
            <button aria-label="Photo précédente" className={styles.prev} onClick={() => move(-1)}>‹</button>
            <button aria-label="Photo suivante" className={styles.next} onClick={() => move(1)}>›</button>
            <span className={styles.counter}>{index + 1} / {photos.length}</span>
          </div>

          <div className={styles.thumbs} aria-label="Miniatures des photos réelles">
            {photos.map((photo, photoIndex) => (
              <button
                key={photo.path}
                type="button"
                className={photoIndex === index ? styles.active : ""}
                onClick={() => setIndex(photoIndex)}
                aria-label={`Afficher : ${photo.alt}`}
              >
                <img
                  src={source(photo.path)}
                  alt=""
                  onError={fallback(photo.path)}
                  loading="lazy"
                />
                <span>{photo.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.proofStrip}>
        <div><strong>Stock réel</strong><span>Des véhicules réellement disponibles et photographiés.</span></div>
        <div><strong>Préparation réelle</strong><span>Chaque voiture est contrôlée avant son départ.</span></div>
        <div><strong>Livraison réelle</strong><span>Nous organisons le transport jusqu’au client.</span></div>
      </section>

      <section className={styles.interior}>
        <div className={styles.interiorPhoto}>
          <img
            src={source("/photos/interior-wide.webp")}
            alt="Intérieur réel de la NeoDrive SWITCH"
            onError={fallback("/photos/interior-wide.webp")}
            loading="lazy"
          />
        </div>
        <div>
          <span className={styles.eyebrow}>À L’INTÉRIEUR</span>
          <h2>Deux vraies places. Un habitacle simple et pratique.</h2>
          <p>
            Une position de conduite dégagée, des commandes accessibles et les équipements utiles
            pour les déplacements du quotidien.
          </p>
          <div className={styles.featureGrid}>
            <span>✓ Autoradio</span><span>✓ Bluetooth & USB</span><span>✓ Chauffage</span>
            <span>✓ Caméra de recul</span><span>✓ Aide au stationnement</span><span>✓ Ventilation</span>
          </div>
        </div>
      </section>

      <section className={styles.steel}>
        <div>
          <span className={styles.eyebrow}>STRUCTURE ET CARROSSERIE EN ACIER</span>
          <h2>Compacte dehors. Rassurante au quotidien.</h2>
          <p>
            La NeoDrive SWITCH privilégie une conception simple et une carrosserie acier. Son petit
            gabarit facilite le stationnement tout en conservant un véritable habitacle deux places.
          </p>
        </div>
        <div className={styles.steelFacts}>
          <article><b>2,50 m</b><span>de longueur</span></article>
          <article><b>100 % électrique</b><span>recharge sur prise 220 V</span></article>
          <article><b>45 km/h</b><span>format voiture sans permis</span></article>
        </div>
      </section>

      <section className={styles.versions}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>CHOISISSEZ VOTRE VERSION</span>
          <h2>Un prix clair. Des équipements selon vos besoins.</h2>
        </div>
        <div className={styles.versionGrid}>
          <article>
            <span>VERSION ESSENTIELLE</span><h3>3 990 € TTC</h3>
            <p>Pour aller à l’essentiel avec une voiture électrique neuve.</p>
            <ul><li>Véhicule électrique neuf</li><li>Batterie incluse</li><li>Chargeur 220 V inclus</li><li>Deux places</li></ul>
          </article>
          <article className={styles.comfort}>
            <span>VERSION CONFORT</span><h3>4 990 € TTC</h3>
            <p>Davantage d’équipements pour une utilisation quotidienne plus agréable.</p>
            <ul><li>Caméra et aide au stationnement</li><li>Chauffage et ventilation de toit</li><li>Autoradio, Bluetooth et USB</li><li>Alarme antivol et assistance en côte</li></ul>
          </article>
        </div>
      </section>

      <section className={styles.specSection}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>CARACTÉRISTIQUES</span>
          <h2>L’essentiel, clairement.</h2>
        </div>
        <div className={styles.specs}>
          {specs.map(([name, value]) => <article key={name}><span>{name}</span><b>{value}</b></article>)}
        </div>
        <p className={styles.note}>L’autonomie réelle varie selon la température, le relief, la charge, la vitesse et le style de conduite.</p>
      </section>

      <section className={styles.delivery}>
        <img
          src={source("/real/livraison-transporteur.webp")}
          alt="Livraison réelle d’une voiture NeoDrive"
          onError={fallback("/real/livraison-transporteur.webp")}
          loading="lazy"
        />
        <div>
          <span className={styles.eyebrow}>DE NOTRE STOCK JUSQU’À CHEZ VOUS</span>
          <h2>Une livraison organisée par NeoDrive.</h2>
          <p>Nous restons votre interlocuteur pour la préparation, le transport et la livraison de votre voiture.</p>
          <a
            href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20conna%C3%AEtre%20les%20NeoDrive%20disponibles"
            target="_blank"
            rel="noreferrer"
          >
            Voir les disponibilités
          </a>
        </div>
      </section>

      {zoom && (
        <div className={styles.overlay} onClick={() => setZoom(false)}>
          <img src={source(current.path)} alt={current.alt} onError={fallback(current.path)} />
          <button aria-label="Fermer">×</button>
        </div>
      )}
    </main>
  );
}
