"use client";

import { useState } from "react";
import styles from "./AccueilBis.module.css";

const whatsapp =
  "https://wa.me/33628261446?text=Bonjour%20NeoDrive%2C%20je%20souhaite%20des%20informations%20sur%20vos%20voitures%20sans%20permis%20%C3%A9lectriques.";

type IconName =
  | "bolt" | "speed" | "truck" | "shield" | "camera" | "bluetooth"
  | "heat" | "fan" | "lock" | "roof" | "arrow" | "menu" | "close"
  | "play" | "check" | "message";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = {
    bolt: <path d="M13 2 4.5 13H11l-1 9L19.5 11H13V2Z"/>,
    speed: <><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/></>,
    truck: <><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z"/><path d="m9.2 12 1.9 1.9 3.8-4"/></>,
    camera: <><path d="M4 8h4l1.5-2h5L16 8h4v10H4z"/><circle cx="12" cy="13" r="3.2"/></>,
    bluetooth: <><path d="m12 3 4 4-4 4V3Zm0 8 4 4-4 4v-8ZM7 7l9 8M7 17l5-5"/></>,
    heat: <><path d="M7 4c-2 2 2 3 0 6s-2 4 0 6M12 4c-2 2 2 3 0 6s-2 4 0 6M17 4c-2 2 2 3 0 6s-2 4 0 6"/></>,
    fan: <><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4-1 2-4 3-6 3ZM14 12c4 0 7 1 7 4 0 2-2 3-4 2-2-1-3-4-3-6ZM12 14c0 4-1 7-4 7-2 0-3-2-2-4 1-2 4-3 6-3ZM10 12c-4 0-7-1-7-4 0-2 2-3 4-2 2 1 3 4 3 6Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    roof: <><path d="M4 15 7 9h10l3 6"/><path d="M7 9c2 2 8 2 10 0"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    play: <path d="m9 7 8 5-8 5V7Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 2 1.6-4A7.6 7.6 0 0 1 3 12c0-4 3.8-7 9-7s9 3 9 7c0 1.1-.3 2.1-.8 3Z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name]}
    </svg>
  );
}

const versions = [
  {
    name: "Essentielle",
    price: "3 990 €",
    note: "Sur commande",
    image: "/neodrive-switch/photos/front-landscape.webp",
    features: ["100% électrique", "Format compact", "Équipement essentiel"],
  },
  {
    name: "Confort",
    price: "4 990 €",
    note: "La plus choisie",
    image: "/neodrive-switch/photos/front-close.webp",
    features: ["Chauffage & ventilation", "Caméra de recul", "Bluetooth / USB", "Alarme"],
    featured: true,
  },
  {
    name: "Confort Plus+",
    price: "5 990 €",
    note: "Plus d’autonomie",
    image: "/neodrive-switch/photos/front-burgerking-a.webp",
    features: ["Pack Confort inclus", "Autonomie renforcée", "Accompagnement NeoDrive"],
  },
];

export default function AccueilBisClient() {
  const [open, setOpen] = useState(false);

  return (
    <main className={styles.page}>
      <style>{".header,.seoFooter{display:none!important}html{scroll-behavior:smooth}body{background:#fff!important}"}</style>

      <header className={styles.header}>
        <a href="/accueil-bis" className={styles.logo}>
          <span>Neo</span><b>Drive</b>
          <small>MICROCARS ÉLECTRIQUES</small>
        </a>

        <nav className={styles.navDesktop}>
          <a href="#modeles">Nos modèles</a>
          <a href="#pourquoi">Pourquoi NeoDrive</a>
          <a href="#equipements">Équipements</a>
          <a href="#quotidien">Au quotidien</a>
          <a href="#videos">Vidéos</a>
        </nav>

        <div className={styles.headerActions}>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.whatsappHeader}>
            <Icon name="message" size={18}/><span>Parler sur WhatsApp</span>
          </a>
          <button onClick={() => setOpen(!open)} className={styles.menuButton} aria-label="Ouvrir le menu">
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>

        {open && (
          <div className={styles.mobileMenu}>
            <a href="#modeles" onClick={() => setOpen(false)}>Nos modèles</a>
            <a href="#pourquoi" onClick={() => setOpen(false)}>Pourquoi NeoDrive</a>
            <a href="#equipements" onClick={() => setOpen(false)}>Équipements</a>
            <a href="#quotidien" onClick={() => setOpen(false)}>Au quotidien</a>
            <a href="#videos" onClick={() => setOpen(false)}>Vidéos</a>
          </div>
        )}
      </header>

      <section className={styles.hero}>
        <img className={styles.heroPhoto} src="/neodrive-switch/photos/front-close.webp" alt="Voiture sans permis électrique NeoDrive" />
        <div className={styles.heroShade}/>
        <div className={styles.heroContent}>
          <span className={styles.kicker}>LIBERTÉ · SIMPLICITÉ · AU QUOTIDIEN</span>
          <h1>La voiture sans permis électrique qui donne <em>envie de rouler.</em></h1>
          <p>
            NeoDrive, des voitures sans permis 100% électriques, modernes,
            confortables et accessibles. Une nouvelle façon de se déplacer, simplement.
          </p>
          <div className={styles.heroButtons}>
            <a href="#modeles" className={styles.orangeButton}>
              Découvrir NeoDrive <Icon name="arrow" size={18}/>
            </a>
            <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.greenButton}>
              <Icon name="message" size={19}/> Parler sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className={styles.quickProof}>
        <div><Icon name="bolt"/><span><strong>100% électrique</strong><small>Plus propre, plus silencieuse</small></span></div>
        <div><Icon name="speed"/><span><strong>45 km/h · L6e</strong><small>Voiture sans permis</small></span></div>
        <div><Icon name="truck"/><span><strong>Livraison partout en France</strong><small>Jusqu’à votre porte</small></span></div>
        <div><Icon name="shield"/><span><strong>Paiement à la livraison</strong><small>Après contrôle du véhicule</small></span></div>
      </section>

      <section id="pourquoi" className={styles.freedom}>
        <div className={styles.freedomCopy}>
          <span className={styles.eyebrow}>PLUS QU’UNE VOITURE SANS PERMIS</span>
          <h2>Une nouvelle <em>liberté au quotidien</em></h2>
          <p>
            Aller au travail, faire ses courses, voir ses proches… NeoDrive vous accompagne
            avec une voiture compacte, silencieuse et facile à vivre.
          </p>
          <a href="#quotidien" className={styles.outlineButton}>Découvrir le quotidien <Icon name="arrow" size={17}/></a>
        </div>

        <div className={styles.freedomGallery}>
          <figure className={styles.galleryWide}>
            <img src="/neodrive-switch/photos/front-intermarche-angle.webp" alt="NeoDrive en ville" loading="lazy"/>
            <figcaption>Un format compact qui s’intègre partout</figcaption>
          </figure>
          <figure>
            <img src="/neodrive-switch/photos/rear-burgerking.webp" alt="NeoDrive vue arrière" loading="lazy"/>
            <figcaption>Profitez de chaque trajet en toute sérénité</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.featured}>
        <div className={styles.featuredCopy}>
          <span className={styles.eyebrow}>MODÈLE PHARE</span>
          <h2>NeoDrive Confort</h2>
          <div className={styles.bigPrice}>4 990 € <small>TTC</small></div>
          <p>
            Le bon équilibre entre prix, confort et équipements utiles au quotidien.
            Une voiture simple, rassurante et agréable à utiliser.
          </p>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.orangeButton}>
            Vérifier une disponibilité <Icon name="arrow" size={18}/>
          </a>
        </div>

        <div className={styles.featuredPhoto}>
          <img src="/neodrive-switch/photos/front-burgerking-b.webp" alt="NeoDrive Confort" loading="lazy"/>
          <span>Véhicule réel</span>
        </div>

        <div id="equipements" className={styles.featuredEquipment}>
          <h3>Les équipements inclus</h3>
          <div className={styles.equipmentMiniGrid}>
            <div><Icon name="heat"/><span><strong>Chauffage</strong><small>Confort toute l’année</small></span></div>
            <div><Icon name="camera"/><span><strong>Caméra de recul</strong><small>Manœuvres facilitées</small></span></div>
            <div><Icon name="bluetooth"/><span><strong>Bluetooth / USB</strong><small>Votre musique avec vous</small></span></div>
            <div><Icon name="lock"/><span><strong>Alarme</strong><small>Plus de tranquillité</small></span></div>
          </div>
        </div>
      </section>

      <section id="modeles" className={styles.versionsSection}>
        <div className={styles.versionsIntro}>
          <span className={styles.eyebrow}>NOS VERSIONS</span>
          <h2>Trois finitions,<br/><em>une même liberté.</em></h2>
          <p>Choisissez selon votre budget et votre besoin d’équipement.</p>
        </div>

        <div className={styles.versionGrid}>
          {versions.map((v) => (
            <article key={v.name} className={v.featured ? styles.versionFeatured : styles.versionCard}>
              <div className={styles.versionImage}>
                <img src={v.image} alt={"NeoDrive " + v.name} loading="lazy"/>
                <span>{v.note}</span>
              </div>
              <div className={styles.versionContent}>
                <div className={styles.versionHead}>
                  <h3>{v.name}</h3>
                  <strong>{v.price}<small>TTC</small></strong>
                </div>
                <ul>
                  {v.features.map((feature) => <li key={feature}><Icon name="check" size={15}/>{feature}</li>)}
                </ul>
                <a href={whatsapp} target="_blank" rel="noreferrer">Voir les disponibilités <Icon name="arrow" size={16}/></a>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.fees}>
          <span><strong>150 €</strong> carte grise + mise en route</span>
          <span>Livraison selon votre zone</span>
        </div>
      </section>

      <section className={styles.interiorSection}>
        <div className={styles.interiorCopy}>
          <span className={styles.eyebrow}>DESIGN & ÉQUIPEMENTS</span>
          <h2>Un habitacle pensé pour votre <em>confort.</em></h2>
          <p>Des équipements utiles, sans surcharge : tout est pensé pour une utilisation simple au quotidien.</p>
        </div>

        <div className={styles.interiorPhoto}>
          <img src="/neodrive-switch/photos/interior-wide.webp" alt="Habitacle NeoDrive" loading="lazy"/>
        </div>

        <div className={styles.iconFeatures}>
          <div><Icon name="camera"/><span>Caméra de recul</span></div>
          <div><Icon name="bluetooth"/><span>Bluetooth / USB</span></div>
          <div><Icon name="heat"/><span>Chauffage</span></div>
          <div><Icon name="fan"/><span>Ventilation</span></div>
          <div><Icon name="lock"/><span>Alarme</span></div>
          <div><Icon name="roof"/><span>Toit ouvrant</span></div>
        </div>
      </section>

      <section id="quotidien" className={styles.daily}>
        <div className={styles.dailyIntro}>
          <span className={styles.eyebrow}>NEODRIVE AU QUOTIDIEN</span>
          <h2>Une voiture pour tous <em>vos moments de vie.</em></h2>
          <p>Une mobilité pensée pour les petits trajets, le travail, les courses et les loisirs.</p>
        </div>

        <div className={styles.dailyGrid}>
          <figure>
            <img src="/neodrive-switch/photos/front-intermarche.webp" alt="NeoDrive pour les courses" loading="lazy"/>
            <figcaption><strong>Courses</strong><span>Pratique et compacte</span></figcaption>
          </figure>
          <figure>
            <img src="/neodrive-switch/photos/front-burgerking-a.webp" alt="NeoDrive pour les trajets travail" loading="lazy"/>
            <figcaption><strong>Travail</strong><span>Simple pour les trajets quotidiens</span></figcaption>
          </figure>
          <figure>
            <img src="/neodrive-switch/photos/front-landscape.webp" alt="NeoDrive pour les déplacements locaux" loading="lazy"/>
            <figcaption><strong>Déplacements locaux</strong><span>Facile à utiliser et à garer</span></figcaption>
          </figure>
          <figure>
            <img src="/neodrive-switch/photos/rear-burgerking.webp" alt="NeoDrive pour les loisirs" loading="lazy"/>
            <figcaption><strong>Loisirs</strong><span>Profitez de vos week-ends</span></figcaption>
          </figure>
        </div>
      </section>

      <section id="videos" className={styles.videoSection}>
        <div className={styles.videoText}>
          <span className={styles.eyebrow}>VOIR AVANT D’ACHETER</span>
          <h2>Découvrez la voiture <em>en vrai.</em></h2>
          <p>Présentation, intérieur et essai : regardez la NeoDrive telle qu’elle est réellement.</p>
          <a href="/videos" className={styles.outlineButton}>Voir toutes les vidéos <Icon name="arrow" size={17}/></a>
        </div>

        <div className={styles.videoCards}>
          <article>
            <video controls playsInline preload="metadata" poster="/neodrive-switch/photos/front-close.webp">
              <source src="/presentation1.mp4" type="video/mp4"/>
            </video>
            <div><Icon name="play" size={16}/><span><strong>Présentation NeoDrive</strong><small>Le véhicule sous tous les angles</small></span></div>
          </article>
          <article>
            <video controls playsInline preload="metadata" poster="/neodrive-switch/photos/interior-wide.webp">
              <source src="/interieur.mp4" type="video/mp4"/>
            </video>
            <div><Icon name="play" size={16}/><span><strong>À l’intérieur</strong><small>Habitacle et commandes</small></span></div>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <img src="/neodrive-switch/photos/front-landscape.webp" alt="" aria-hidden="true"/>
        <div className={styles.finalShade}/>
        <div className={styles.finalText}>
          <span>NEODRIVE</span>
          <h2>Prêt à prendre la route ?</h2>
          <p>Envoyez-nous votre code postal et la version qui vous intéresse. Nous vous indiquons la disponibilité et la livraison.</p>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.greenButton}>
            <Icon name="message" size={19}/> Parler sur WhatsApp
          </a>
        </div>
      </section>

      <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.floatingWhatsapp} aria-label="Contacter NeoDrive sur WhatsApp">
        <Icon name="message" size={23}/>
      </a>
    </main>
  );
}
