"use client";

import { useState } from "react";
import styles from "./AccueilBis.module.css";

const whatsapp =
  "https://wa.me/33628261446?text=Bonjour%20NeoDrive%2C%20je%20souhaite%20des%20informations%20sur%20vos%20voitures%20sans%20permis%20%C3%A9lectriques.";

type IconName =
  | "bolt" | "speed" | "plug" | "truck" | "shield" | "camera"
  | "bluetooth" | "heat" | "fan" | "lock" | "seat" | "arrow"
  | "menu" | "close" | "play" | "check" | "message";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    bolt: <><path d="M13 2 4.5 13H11l-1 9L19.5 11H13l0-9Z"/></>,
    speed: <><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/><path d="M6.5 14H5M19 14h-1.5M8 9.5 7 8.5M16 9.5l1-1"/></>,
    plug: <><path d="M8 3v5M16 3v5M7 8h10v3a5 5 0 0 1-10 0V8Z"/><path d="M12 16v5"/></>,
    truck: <><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z"/><path d="m9.2 12 1.9 1.9 3.8-4"/></>,
    camera: <><path d="M4 8h4l1.5-2h5L16 8h4v10H4z"/><circle cx="12" cy="13" r="3.2"/></>,
    bluetooth: <><path d="m12 3 4 4-4 4V3Zm0 8 4 4-4 4v-8ZM7 7l9 8M7 17l5-5"/></>,
    heat: <><path d="M7 4c-2 2 2 3 0 6s-2 4 0 6M12 4c-2 2 2 3 0 6s-2 4 0 6M17 4c-2 2 2 3 0 6s-2 4 0 6"/></>,
    fan: <><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4-1 2-4 3-6 3ZM14 12c4 0 7 1 7 4 0 2-2 3-4 2-2-1-3-4-3-6ZM12 14c0 4-1 7-4 7-2 0-3-2-2-4 1-2 4-3 6-3ZM10 12c-4 0-7-1-7-4 0-2 2-3 4-2 2 1 3 4 3 6Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    seat: <><path d="M7 5v7c0 2 1 3 3 3h7"/><path d="M10 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 15l-1 5M17 15l2 5"/><path d="M11 8h5l2 5H9"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    play: <><path d="m9 7 8 5-8 5V7Z"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 2 1.6-4A7.6 7.6 0 0 1 3 12c0-4 3.8-7 9-7s9 3 9 7c0 1.1-.3 2.1-.8 3Z"/></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const versions = [
  {
    name: "Essentielle",
    price: "3 990 €",
    tag: "Sur commande",
    image: "/neodrive-switch/real/exterieur-avant.webp",
    text: "L’essentiel d’une microcar électrique neuve, simple et accessible.",
    features: ["100% électrique", "Format compact", "Équipement essentiel"],
  },
  {
    name: "Confort",
    price: "4 990 €",
    tag: "La plus choisie",
    image: "/neodrive-switch/photos/front-intermarche-angle.webp",
    text: "L’équilibre idéal entre confort, équipements utiles et disponibilité.",
    features: ["Chauffage & ventilation", "Caméra de recul", "Bluetooth / USB", "Alarme"],
    featured: true,
  },
  {
    name: "Confort Plus+",
    price: "5 990 €",
    tag: "Plus d’autonomie",
    image: "/neodrive-switch/photos/front-burgerking-a.webp",
    text: "Le pack Confort avec une réserve d’autonomie supérieure.",
    features: ["Pack Confort inclus", "Autonomie renforcée", "Accompagnement NeoDrive"],
  },
];

const lifestyle = [
  {
    label: "Courses",
    text: "Compacte et facile à garer.",
    image: "/neodrive-switch/photos/front-intermarche.webp",
  },
  {
    label: "Travail",
    text: "Une solution simple pour vos trajets.",
    image: "/neodrive-switch/photos/front-burgerking-b.webp",
  },
  {
    label: "Déplacements locaux",
    text: "Pensée pour le quotidien.",
    image: "/neodrive-switch/photos/front-landscape.webp",
  },
  {
    label: "Loisirs",
    text: "Profiter de chaque trajet.",
    image: "/neodrive-switch/real/exterieur-arriere.webp",
  },
];

export default function AccueilBisClient() {
  const [open, setOpen] = useState(false);

  return (
    <main className={styles.page}>
      <style>{".header,.seoFooter{display:none!important} html{scroll-behavior:smooth} body{background:#fff!important}"}</style>

      <nav className={styles.nav}>
        <a href="/accueil-bis" className={styles.logo} aria-label="NeoDrive">
          <span className={styles.logoNeo}>Neo</span><span className={styles.logoDrive}>Drive</span>
          <small>MICROCARS ÉLECTRIQUES</small>
        </a>

        <div className={styles.desktopLinks}>
          <a href="#modeles">Nos modèles</a>
          <a href="#pourquoi">Pourquoi NeoDrive</a>
          <a href="#equipements">Équipements</a>
          <a href="#quotidien">Au quotidien</a>
          <a href="#videos">Vidéos</a>
        </div>

        <div className={styles.navActions}>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.whatsappTop}>
            <Icon name="message" size={18}/> <span>WhatsApp</span>
          </a>
          <button className={styles.menuButton} onClick={() => setOpen(!open)} aria-label="Menu">
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
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>LIBERTÉ · SIMPLICITÉ · AU QUOTIDIEN</span>
          <h1>La voiture sans permis électrique qui donne <em>envie de rouler.</em></h1>
          <p>
            Une vraie microcar électrique, moderne et facile à vivre.
            Pour les trajets du quotidien, les courses, le travail et les moments de liberté.
          </p>
          <div className={styles.heroPrice}>
            <span>À partir de</span>
            <strong>3 990 €</strong>
            <small>TTC</small>
          </div>
          <div className={styles.heroButtons}>
            <a href="#modeles" className={styles.primary}>
              Découvrir les versions <Icon name="arrow" size={18}/>
            </a>
            <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.whatsappHero}>
              <Icon name="message" size={19}/> Parler sur WhatsApp
            </a>
          </div>
          <p className={styles.heroNote}>Photos et vidéos réelles disponibles sur demande.</p>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroImageMain}>
            <img src="/neodrive-switch/real/exterieur-avant.webp" alt="NeoDrive grise, véhicule électrique sans permis" />
            <span className={styles.realBadge}><i/> PHOTO RÉELLE</span>
          </div>
          <div className={styles.heroMiniOne}>
            <img src="/neodrive-switch/real/exterieur-arriere.webp" alt="NeoDrive vue arrière" />
          </div>
          <div className={styles.heroMiniTwo}>
            <img src="/neodrive-switch/real/interieur-tableau-de-bord.webp" alt="Habitacle NeoDrive" />
          </div>
        </div>
      </section>

      <section className={styles.reassurance} aria-label="Points forts">
        <div><span className={styles.iconCircle}><Icon name="bolt"/></span><strong>100% électrique</strong><small>Silencieuse au quotidien</small></div>
        <div><span className={styles.iconCircle}><Icon name="speed"/></span><strong>45 km/h · L6e</strong><small>Voiture sans permis</small></div>
        <div><span className={styles.iconCircle}><Icon name="plug"/></span><strong>Recharge simple</strong><small>Sur prise domestique</small></div>
        <div><span className={styles.iconCircle}><Icon name="truck"/></span><strong>Livraison France</strong><small>Jusqu’à votre adresse</small></div>
        <div><span className={styles.iconCircle}><Icon name="shield"/></span><strong>Paiement à la livraison</strong><small>Après contrôle du véhicule</small></div>
      </section>

      <section id="pourquoi" className={styles.promise}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>POURQUOI NEODRIVE ?</span>
          <h2>Une mobilité <em>simple, pratique et rassurante.</em></h2>
          <p>
            De vrais véhicules, de vrais équipements et une équipe joignable avant comme après la livraison.
            Vous pouvez demander des photos ou une vidéo du véhicule avant l’achat.
          </p>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.textLink}>
            Poser une question <Icon name="arrow" size={17}/>
          </a>
        </div>

        <div className={styles.promiseGallery}>
          <article className={styles.promiseBig}>
            <img src="/neodrive-switch/photos/front-close.webp" alt="NeoDrive en extérieur" loading="lazy"/>
            <div className={styles.photoCaption}>
              <strong>Compacte au quotidien</strong>
              <span>Simple à garer, agréable à utiliser.</span>
            </div>
          </article>
          <article>
            <img src="/neodrive-switch/photos/interior-wide.webp" alt="Intérieur NeoDrive" loading="lazy"/>
            <div className={styles.photoCaption}>
              <strong>Un habitacle rassurant</strong>
              <span>Fermé, lumineux et pratique.</span>
            </div>
          </article>
          <article>
            <img src="/neodrive-switch/real/devant-atelier.webp" alt="NeoDrive en point de présentation" loading="lazy"/>
            <div className={styles.photoCaption}>
              <strong>Des véhicules réels</strong>
              <span>À voir en photo ou vidéo avant achat.</span>
            </div>
          </article>
        </div>
      </section>

      <section id="modeles" className={styles.models}>
        <div className={styles.modelsHeading}>
          <div>
            <span className={styles.eyebrowLight}>NOS VERSIONS</span>
            <h2>Trois finitions.<br/><em>Une même liberté.</em></h2>
          </div>
          <p>
            Choisissez selon votre budget, votre besoin d’équipement et votre autonomie.
            Les prix sont présentés clairement.
          </p>
        </div>

        <div className={styles.modelGrid}>
          {versions.map((version) => (
            <article key={version.name} className={version.featured ? styles.modelFeatured : styles.modelCard}>
              <div className={styles.modelPhoto}>
                <img src={version.image} alt={"NeoDrive " + version.name} loading="lazy"/>
                <span>{version.tag}</span>
              </div>
              <div className={styles.modelBody}>
                <div className={styles.modelTitleRow}>
                  <h3>{version.name}</h3>
                  <div><strong>{version.price}</strong><small>TTC</small></div>
                </div>
                <p>{version.text}</p>
                <ul>
                  {version.features.map((feature) => (
                    <li key={feature}><Icon name="check" size={16}/>{feature}</li>
                  ))}
                </ul>
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  Demander les disponibilités <Icon name="arrow" size={17}/>
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.modelFinePrint}>
          <span><strong>150 €</strong> carte grise + mise en route</span>
          <span>Livraison facturée selon votre zone</span>
        </div>
      </section>

      <section id="equipements" className={styles.equipment}>
        <div className={styles.equipmentPhoto}>
          <img src="/neodrive-switch/photos/interior-wide.webp" alt="Habitacle et tableau de bord NeoDrive" loading="lazy"/>
          <div className={styles.equipmentPhotoTag}>
            <span>À BORD DE NEODRIVE</span>
            <strong>Un intérieur pensé pour le quotidien.</strong>
          </div>
        </div>

        <div className={styles.equipmentCopy}>
          <span className={styles.eyebrow}>DESIGN & ÉQUIPEMENTS</span>
          <h2>Le confort utile.<br/><em>Sans complication.</em></h2>
          <p>
            L’essentiel est là : visibilité, chauffage, connectivité et simplicité d’utilisation.
          </p>

          <div className={styles.equipmentGrid}>
            <div><Icon name="camera"/><span><strong>Caméra de recul</strong><small>Manœuvres facilitées</small></span></div>
            <div><Icon name="bluetooth"/><span><strong>Bluetooth / USB</strong><small>Musique et recharge</small></span></div>
            <div><Icon name="heat"/><span><strong>Chauffage</strong><small>Pour l’hiver</small></span></div>
            <div><Icon name="fan"/><span><strong>Ventilation</strong><small>Pour le quotidien</small></span></div>
            <div><Icon name="lock"/><span><strong>Alarme</strong><small>Plus de tranquillité</small></span></div>
            <div><Icon name="seat"/><span><strong>Banquette arrière</strong><small>Espace pratique</small></span></div>
          </div>
        </div>
      </section>

      <section id="quotidien" className={styles.lifestyle}>
        <div className={styles.lifestyleHeader}>
          <div>
            <span className={styles.eyebrow}>NEODRIVE AU QUOTIDIEN</span>
            <h2>Une voiture pour <em>tous vos moments de vie.</em></h2>
          </div>
          <p>
            Ville, périphérie, petites routes ou bord de mer : une voiture compacte
            qui trouve naturellement sa place dans votre quotidien.
          </p>
        </div>

        <div className={styles.lifestyleGrid}>
          {lifestyle.map((item, index) => (
            <article key={item.label} className={index === 0 ? styles.lifeFeatured : styles.lifeCard}>
              <img src={item.image} alt={"NeoDrive - " + item.label} loading="lazy"/>
              <div>
                <span>0{index + 1}</span>
                <strong>{item.label}</strong>
                <small>{item.text}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="videos" className={styles.videoSection}>
        <div className={styles.videoIntro}>
          <span className={styles.eyebrowLight}>VOIR LA VOITURE POUR DE VRAI</span>
          <h2>Pas seulement des promesses.<br/><em>Des images réelles.</em></h2>
          <p>
            Présentation du véhicule, intérieur et essai routier :
            regardez la NeoDrive telle qu’elle est.
          </p>
          <a href="/videos" className={styles.videoAll}>Voir toutes les vidéos <Icon name="arrow" size={17}/></a>
        </div>

        <div className={styles.videoGrid}>
          <article className={styles.videoMain}>
            <video controls preload="metadata" playsInline poster="/neodrive-switch/real/exterieur-ville.webp">
              <source src="/presentation1.mp4" type="video/mp4"/>
            </video>
            <div><span><Icon name="play" size={16}/></span><strong>Présentation NeoDrive</strong><small>Découvrez la voiture sous tous les angles.</small></div>
          </article>
          <article>
            <video controls preload="metadata" playsInline poster="/neodrive-switch/real/interieur-tableau-de-bord.webp">
              <source src="/interieur.mp4" type="video/mp4"/>
            </video>
            <div><span><Icon name="play" size={16}/></span><strong>L’intérieur</strong><small>Habitacle, commandes et espace.</small></div>
          </article>
          <article>
            <video controls preload="metadata" playsInline poster="/neodrive-switch/photos/front-landscape.webp">
              <source src="/essai-route.mp4" type="video/mp4"/>
            </video>
            <div><span><Icon name="play" size={16}/></span><strong>Sur la route</strong><small>La NeoDrive en mouvement.</small></div>
          </article>
        </div>
      </section>

      <section className={styles.contactBand}>
        <div className={styles.contactImage}>
          <img src="/neodrive-switch/real/exterieur-arriere.webp" alt="NeoDrive en extérieur" loading="lazy"/>
        </div>
        <div className={styles.contactCopy}>
          <span className={styles.eyebrowLight}>NEODRIVE</span>
          <h2>La mobilité <em>plus simple, plus libre.</em></h2>
          <p>
            Dites-nous simplement la version qui vous intéresse et votre code postal.
            Nous vous indiquons la disponibilité et le prix de livraison.
          </p>
          <div className={styles.contactProofs}>
            <span><Icon name="camera" size={18}/> Photos & vidéos sur demande</span>
            <span><Icon name="truck" size={18}/> Livraison partout en France</span>
            <span><Icon name="shield" size={18}/> Paiement à la livraison</span>
          </div>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.bigWhatsapp}>
            <Icon name="message" size={20}/> Parlez-nous de votre projet
          </a>
        </div>
      </section>

      <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.floatingWhatsapp} aria-label="Contacter NeoDrive sur WhatsApp">
        <Icon name="message" size={23}/>
      </a>
    </main>
  );
}
