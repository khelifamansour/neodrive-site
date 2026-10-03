"use client";

import { useState } from "react";
import styles from "./AccueilBis.module.css";

const whatsapp =
  "https://wa.me/33628261446?text=Bonjour%20NeoDrive%2C%20je%20souhaite%20des%20informations%20sur%20vos%20voitures%20sans%20permis%20%C3%A9lectriques.";

type IconName =
  | "wheel" | "plug" | "truck" | "shield" | "speed" | "home"
  | "bag" | "briefcase" | "pin" | "trees" | "camera" | "bluetooth"
  | "heat" | "fan" | "lock" | "roof" | "seat" | "sun"
  | "message" | "arrow" | "menu" | "close" | "check";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, any> = {
    wheel: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4"/><path d="M12 9.6V4M9.9 13.2 5.2 17M14.1 13.2l4.7 3.8"/></>,
    plug: <><path d="M8 3v6M16 3v6M6 9h12v2a6 6 0 0 1-12 0V9ZM12 17v4"/></>,
    truck: <><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.7 7.8 7 10 4.3-2.2 7-5.4 7-10V6l-7-3Z"/><path d="m8.8 12 2 2 4.2-4.2"/></>,
    speed: <><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/></>,
    home: <><path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10M9 20v-6h6v6"/></>,
    bag: <><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/></>,
    pin: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    trees: <><path d="m7 3-4 7h3l-3 6h8l-3-6h3L7 3ZM17 5l-3 6h2l-2 5h7l-2-5h2l-4-6Z"/></>,
    camera: <><path d="M4 8h4l1.4-2h5.2L16 8h4v10H4z"/><circle cx="12" cy="13" r="3"/></>,
    bluetooth: <><path d="m12 3 4 4-4 4V3Zm0 8 4 4-4 4v-8ZM7 7l9 8M7 17l5-5"/></>,
    heat: <><path d="M7 4c-2 2 2 3 0 6s-2 4 0 6M12 4c-2 2 2 3 0 6s-2 4 0 6M17 4c-2 2 2 3 0 6s-2 4 0 6"/></>,
    fan: <><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4-1 2-4 3-6 3ZM14 12c4 0 7 1 7 4 0 2-2 3-4 2-2-1-3-4-3-6ZM12 14c0 4-1 7-4 7-2 0-3-2-2-4 1-2 4-3 6-3ZM10 12c-4 0-7-1-7-4 0-2 2-3 4-2 2 1 3 4 3 6Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    roof: <><path d="M4 15 7 9h10l3 6"/><path d="M7 9c2 2 8 2 10 0"/></>,
    seat: <><path d="M8 6v7c0 2 1 3 3 3h6M8 10H5v7h11l2 4M8 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 2 1.6-4A7.6 7.6 0 0 1 3 12c0-4 3.8-7 9-7s9 3 9 7c0 1.1-.3 2.1-.8 3Z"/>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const models = [
  {
    name: "Essentielle",
    price: "3 990 €",
    label: "Sur commande",
    image: "/neodrive-switch/photos/front-landscape.webp",
    text: "L’essentiel d’une microcar électrique neuve.",
    features: ["Format compact", "Équipements essentiels", "Idéale pour les trajets quotidiens"],
  },
  {
    name: "Confort",
    price: "4 990 €",
    label: "La plus choisie",
    image: "/neodrive-switch/photos/front-burgerking-a.webp",
    text: "La version la plus choisie, avec les équipements utiles au quotidien.",
    features: ["Plus de confort", "Équipements pratiques", "Parfaite pour un usage quotidien"],
    featured: true,
  },
  {
    name: "Confort Plus",
    price: "5 990 €",
    label: "Plus d’autonomie",
    image: "/neodrive-switch/photos/front-close.webp",
    text: "Le pack Confort avec autonomie renforcée et davantage de polyvalence.",
    features: ["Équipements premium", "Confort maximal", "Idéale pour tous vos trajets"],
  },
];

export default function AccueilBisClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page}>
      <style>{".header,.seoFooter{display:none!important}html{scroll-behavior:smooth}body{background:#fff!important}"}</style>

      <header className={styles.header}>
        <a className={styles.brand} href="/accueil-bis">
          <span className={styles.brandNeo}>Neo</span><span className={styles.brandDrive}>Drive</span>
          <small>MICROCARS ÉLECTRIQUES</small>
        </a>

        <nav className={styles.desktopNav}>
          <a href="#modeles">Nos modèles</a>
          <a href="#pourquoi">Pourquoi NeoDrive</a>
          <a href="#equipements">Équipements</a>
          <a href="#quotidien">Au quotidien</a>
          <a href="#livraison">Livraison</a>
          <a href="/contact">Contact</a>
        </nav>

        <a className={styles.topWhatsapp} href={whatsapp} target="_blank" rel="noreferrer">
          <Icon name="message" size={17}/> <span>Parler sur WhatsApp</span>
        </a>

        <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <Icon name={menuOpen ? "close" : "menu"} size={21}/>
        </button>

        {menuOpen && (
          <div className={styles.mobileMenu}>
            <a href="#modeles" onClick={() => setMenuOpen(false)}>Nos modèles</a>
            <a href="#pourquoi" onClick={() => setMenuOpen(false)}>Pourquoi NeoDrive</a>
            <a href="#equipements" onClick={() => setMenuOpen(false)}>Équipements</a>
            <a href="#quotidien" onClick={() => setMenuOpen(false)}>Au quotidien</a>
            <a href="#livraison" onClick={() => setMenuOpen(false)}>Livraison</a>
          </div>
        )}
      </header>

      <section className={styles.hero}>
        <img src="/neodrive-switch/photos/front-landscape.webp" alt="NeoDrive électrique au bord de mer" className={styles.heroImg}/>
        <div className={styles.heroWarm}/>
        <div className={styles.heroOverlay}/>
        <div className={styles.heroInner}>
          <h1>La microcar<br/>électrique qui<br/><em>simplifie le quotidien.</em></h1>
          <p>Compacte, accessible et 100% électrique, pensée pour la ville, les trajets de tous les jours et les moments de liberté.</p>
          <div className={styles.heroButtons}>
            <a className={styles.orangeBtn} href="#modeles">Découvrir les versions <Icon name="arrow" size={17}/></a>
            <a className={styles.greenBtn} href={whatsapp} target="_blank" rel="noreferrer"><Icon name="message" size={18}/> Parler sur WhatsApp</a>
          </div>

          <div className={styles.heroProofs}>
            <div><span><Icon name="wheel" size={23}/></span><p><strong>Sans permis</strong><small>dès 14 ans*</small></p></div>
            <div><span><Icon name="plug" size={23}/></span><p><strong>Recharge sur</strong><small>prise 220 V</small></p></div>
            <div><span><Icon name="truck" size={23}/></span><p><strong>Livraison partout</strong><small>en France</small></p></div>
            <div><span><Icon name="shield" size={23}/></span><p><strong>Paiement</strong><small>à la livraison</small></p></div>
          </div>
        </div>
      </section>

      <section id="pourquoi" className={styles.why}>
        <div className={styles.whyText}>
          <span className={styles.eyebrow}>POURQUOI CHOISIR NEODRIVE ?</span>
          <h2>Une mobilité <em>simple,<br/>pratique et rassurante.</em></h2>
          <p>NeoDrive vous accompagne dans les trajets du quotidien, avec une voiture électrique accessible, compacte et pensée pour être simple à vivre.</p>
          <a href="#equipements" className={styles.textLink}>Découvrir tous les avantages <Icon name="arrow" size={16}/></a>
        </div>

        <div className={styles.whyGrid}>
          <article className={styles.photoTile}><img src="/neodrive-switch/photos/front-close.webp" alt="NeoDrive réelle"/><span>Véhicule réel</span></article>
          <article><Icon name="wheel"/><strong>Sans permis<br/>dès 14 ans</strong><p>Accessible avec le permis AM selon réglementation.</p></article>
          <article className={styles.photoTile}><img src="/neodrive-switch/photos/front-intermarche-angle.webp" alt="NeoDrive en ville"/><span>En ville</span></article>
          <article><Icon name="speed"/><strong>45 km/h</strong><p>Le format idéal pour les trajets locaux.</p></article>
          <article className={styles.photoTile}><img src="/neodrive-switch/photos/interior-wide.webp" alt="Habitacle fermé NeoDrive"/><span>Habitacle fermé</span></article>
          <article><Icon name="home"/><strong>Format compact</strong><p>Facile à garer en ville comme en périphérie.</p></article>
          <article className={styles.photoTile}><img src="/neodrive-switch/photos/front-burgerking-b.webp" alt="NeoDrive au quotidien"/><span>Usage quotidien</span></article>
          <article><Icon name="pin"/><strong>Une liberté<br/>au quotidien</strong><p>Courses, travail, loisirs et proximité.</p></article>
        </div>
      </section>

      <section id="modeles" className={styles.modelsSection}>
        <div className={styles.modelsHead}>
          <div>
            <span className={styles.eyebrowLight}>CHOISISSEZ VOTRE NEODRIVE</span>
            <h2>Trois versions pour<br/><em>vous accompagner.</em></h2>
          </div>
          <p>Quel que soit votre besoin, il y a une NeoDrive pour vous. Des équipements utiles, un format compact et tout le confort nécessaire pour une mobilité simple et sereine.</p>
          <div className={styles.priceNotes}>
            <div><Icon name="shield" size={22}/><span>Carte grise + mise en route :<strong>150 €</strong></span></div>
            <div><Icon name="truck" size={22}/><span>Livraison<br/>selon zone</span></div>
          </div>
        </div>

        <div className={styles.modelGrid}>
          {models.map((m) => (
            <article className={m.featured ? styles.modelFeatured : styles.modelCard} key={m.name}>
              <div className={styles.modelPhoto}>
                <img src={m.image} alt={"NeoDrive " + m.name}/>
                <span>{m.label}</span>
              </div>
              <div className={styles.modelBody}>
                <div className={styles.modelTitle}>
                  <h3>{m.name}</h3><strong>{m.price}</strong>
                </div>
                <p>{m.text}</p>
                <ul>
                  {m.features.map((f) => <li key={f}><Icon name="check" size={14}/>{f}</li>)}
                </ul>
                <a href={whatsapp} target="_blank" rel="noreferrer">Voir la version <Icon name="arrow" size={15}/></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="equipements" className={styles.equipment}>
        <div className={styles.equipmentText}>
          <span className={styles.eyebrow}>DESIGN & ÉQUIPEMENTS</span>
          <h2>Un habitacle pensé<br/>pour votre <em>confort.</em></h2>
          <p>Des équipements utiles et modernes pour une expérience de conduite agréable au quotidien.</p>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.orangeBtn}>Demander des photos <Icon name="arrow" size={16}/></a>
        </div>

        <div className={styles.interiorVisual}>
          <img src="/neodrive-switch/photos/interior-driver.webp" alt="Intérieur NeoDrive"/>
        </div>

        <div className={styles.equipmentGrid}>
          <div><Icon name="camera"/><span>Caméra de recul</span></div>
          <div><Icon name="bluetooth"/><span>Bluetooth / USB</span></div>
          <div><Icon name="heat"/><span>Chauffage</span></div>
          <div><Icon name="fan"/><span>Ventilation</span></div>
          <div><Icon name="lock"/><span>Alarme</span></div>
          <div><Icon name="roof"/><span>Toit ouvrant</span></div>
          <div><Icon name="seat"/><span>Banquette arrière</span></div>
          <div><Icon name="sun"/><span>Habitacle lumineux</span></div>
        </div>
      </section>

      <section id="quotidien" className={styles.daily}>
        <div className={styles.dailyIntro}>
          <span className={styles.eyebrow}>NEODRIVE AU QUOTIDIEN</span>
          <h2>Une voiture pour tous<br/><em>vos moments de vie.</em></h2>
          <p>Pratique pour les trajets de tous les jours, agréable pour les moments de liberté.</p>
        </div>

        <div className={styles.dailyCards}>
          <article><img src="/neodrive-switch/photos/front-intermarche.webp" alt="NeoDrive pour les courses"/><div><Icon name="bag" size={19}/><span><strong>Courses</strong><small>Pratique et compacte</small></span></div></article>
          <article><img src="/neodrive-switch/photos/front-burgerking-a.webp" alt="NeoDrive pour le travail"/><div><Icon name="briefcase" size={19}/><span><strong>Travail</strong><small>Simple au quotidien</small></span></div></article>
          <article><img src="/neodrive-switch/photos/front-landscape.webp" alt="NeoDrive pour les déplacements locaux"/><div><Icon name="pin" size={19}/><span><strong>Déplacements locaux</strong><small>Proximité en toute liberté</small></span></div></article>
          <article><img src="/neodrive-switch/photos/rear-burgerking.webp" alt="NeoDrive pour les loisirs"/><div><Icon name="trees" size={19}/><span><strong>Loisirs</strong><small>Profitez de vos week-ends</small></span></div></article>
          <aside><span>“</span><strong>Compacte,<br/><em>rassurante</em> et<br/>facile à adopter.</strong></aside>
        </div>
      </section>

      <section id="livraison" className={styles.delivery}>
        <div className={styles.deliveryPhoto}>
          <img src="/neodrive-switch/real/livraison-transporteur.webp" alt="Livraison d'une NeoDrive par transporteur"/>
          <span>PHOTO RÉELLE</span>
        </div>
        <div className={styles.deliveryText}>
          <span className={styles.eyebrowLight}>LIVRAISON NATIONALE</span>
          <h2>Votre NeoDrive,<br/><em>jusqu’à votre porte.</em></h2>
          <p>Nous organisons le transport partout en France avec des partenaires spécialisés. Vous contrôlez votre véhicule à la remise, puis vous effectuez le règlement.</p>
          <div className={styles.deliveryPoints}>
            <span><Icon name="truck" size={18}/> Transport organisé</span>
            <span><Icon name="shield" size={18}/> Paiement à la livraison</span>
            <span><Icon name="message" size={18}/> Suivi personnalisé</span>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <img src="/neodrive-switch/photos/front-landscape.webp" alt="NeoDrive au bord de mer"/>
        <div className={styles.finalOverlay}/>
        <div className={styles.finalInner}>
          <div>
            <span className={styles.eyebrowLight}>NEODRIVE</span>
            <h2>La mobilité <em>plus simple, plus libre.</em></h2>
            <p>Demandez des photos, une disponibilité ou un devis personnalisé. Notre équipe vous accompagne avant, pendant et après la livraison.</p>
          </div>
          <a className={styles.orangeBtn} href={whatsapp} target="_blank" rel="noreferrer"><Icon name="message" size={18}/> Parlez-nous de votre projet <Icon name="arrow" size={17}/></a>
        </div>
      </section>

      <p className={styles.legal}>* Selon la réglementation en vigueur et les conditions du permis AM.</p>

      <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.floatingWhatsapp} aria-label="Parler sur WhatsApp">
        <Icon name="message" size={23}/>
      </a>
    </main>
  );
}
