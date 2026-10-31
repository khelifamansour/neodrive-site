"use client";

import Link from "next/link";
import GoogleReviews from "./_components/GoogleReviews";
import { HomeHero, TrustStrip, WhyUs, Compare, HowItWorks, HomeFootnotes, MobileCta } from "./_components/HomeConversion";
import { VEHICLES } from "../lib/neodrive-pricing";
import h from "./home.module.css";

const WHATSAPP = "https://wa.me/33628261446?text=" + encodeURIComponent("Bonjour, je souhaite des informations sur la NeoDrive.");
const eur = (n: number) => n.toLocaleString("fr-FR") + " €";

const DELIVERIES = [
  { src: "/home/livraison-02.webp", alt: "Remise d’une NeoDrive rouge à ses nouveaux propriétaires" },
  { src: "/home/livraison-06.webp", alt: "Cliente devant sa NeoDrive livrée sur plateau" },
  { src: "/home/livraison-10.webp", alt: "Clients NeoDrive le jour de la livraison", tall: true },
  { src: "/home/livraison-05.webp", alt: "Client découvrant sa NeoDrive grise" },
  { src: "/home/livraison-09.webp", alt: "Livraison d’une NeoDrive en bord de mer" },
  { src: "/home/livraison-08.webp", alt: "Déchargement d’une NeoDrive depuis le camion" },
  { src: "/home/livraison-01.webp", alt: "NeoDrive grise prête à être livrée" },
  { src: "/home/livraison-04.webp", alt: "Camion transporteur chargé de NeoDrive" },
];

const GALLERY = [
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-10-28/137e8afd-9c45-425c-83bf-f68f5f9ef1eb-1000126021.jpg", alt: "Nos véhicules à l’arrivée" },
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-10-28/1842f1c0-2f85-449d-8183-93065c31f252-1000130728.jpg", alt: "L’habitacle NeoDrive" },
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-10-28/9784a94e-fb2c-42ba-b4f3-dcb0fcea11c8-1000126029.jpg", alt: "Notre parc de véhicules" },
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-09-01/18862335-61bc-4a0c-b60a-b456b94d9c13-1000160283.jpg", alt: "Transport des véhicules" },
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-10-28/0b4e7023-6f6a-4f46-95d5-90e13965e311-1000127389.jpg", alt: "Préparation des livraisons" },
  { src: "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/2026-10-28/b1c44b3d-265b-428f-ad91-10f2acabcc9a-1000127412.jpg", alt: "Chargement et livraison" },
];

const MODELS = [
  {
    key: "essentielle", name: "Essentielle", price: VEHICLES.essentielle.price, tag: "Le prix le plus doux", tone: "",
    pitch: "Une voiture électrique neuve au prix le plus accessible de notre gamme.",
    status: "⏳ Sur commande · délai 6 à 8 mois environ",
    items: ["Voiture neuve, 2 places", "100 % électrique", "Grand coffre", "Batterie incluse"],
  },
  {
    key: "confort", name: "Confort", price: VEHICLES.confort.price, tag: "La plus choisie", tone: "featured",
    pitch: "Le meilleur équilibre : équipée, disponible tout de suite, livrée chez vous.",
    status: "✅ En stock · disponible immédiatement",
    items: ["Caméra de recul", "Chauffage & ventilation", "Bluetooth / USB", "Alarme antivol"],
  },
  {
    key: "confortPlus", name: "Confort Plus+", price: VEHICLES.confortPlus.price, tag: "Plus d’autonomie", tone: "",
    pitch: "Tout le Confort, avec batterie lithium et charge rapide.",
    status: "⚡ Batterie lithium · charge rapide",
    items: ["Pack Confort inclus", "Batterie lithium", "Charge rapide", "Autonomie renforcée"],
  },
];

const FAQ = [
  ["La voiture est-elle fiable ?", "La NeoDrive bénéficie de la garantie légale de conformité de 2 ans à compter de la livraison. Notre SAV vous accompagne ensuite : diagnostic en ligne NeoDiag, pièces détachées disponibles et un interlocuteur joignable sur WhatsApp."],
  ["Dois-je payer avant de recevoir la voiture ?", "Non. Aucun acompte n’est demandé à la réservation. Vous découvrez la voiture à la livraison et vous réglez le montant convenu à ce moment-là."],
  ["Qui peut la conduire ?", "Une voiture sans permis se conduit dès 14 ans avec le permis AM (ou sans permis si vous êtes né avant 1988). Elle est limitée à 45 km/h."],
  ["Quelle autonomie et comment la recharger ?", "L’autonomie indicative est de 50 à 70 km selon le relief, la température, la charge et le style de conduite. Elle se recharge sur une prise domestique 220 V."],
  ["Combien coûte la livraison ?", "Le prix dépend de votre code postal et s’affiche instantanément sur la page de réservation. La voiture arrive sur camion, devant chez vous, partout en France métropolitaine."],
  ["Et la carte grise ?", "Nous nous occupons des formalités d’immatriculation pour 150 €, inclus dans votre devis."],
];

export default function Home() {
  return (
    <main className={h.page}>
      <HomeHero />
      <TrustStrip />

      {/* PREUVE : LIVRAISONS CLIENTS */}
      <section className={h.section}>
        <header className={h.head}>
          <span className={h.eyebrow}>Ils roulent en NeoDrive</span>
          <h2>De vrais clients. De vraies livraisons. Partout en France.</h2>
          <p>Ces photos ne sortent pas d’une banque d’images : ce sont nos livraisons, prises sur place, le jour où nos clients ont découvert leur voiture.</p>
        </header>
        <div className={h.proofGrid}>
          {DELIVERIES.map((d) => (
            <figure key={d.src} className={d.tall ? h.tall : ""}>
              <img src={d.src} alt={d.alt} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
        <div className={h.videoRow}>
          <figure>
            <video controls preload="none" playsInline poster="/home/livraison-05.webp"><source src="/client1.mp4" type="video/mp4" /></video>
            <figcaption><b>Livraison client</b><span>Région de Strasbourg</span></figcaption>
          </figure>
          <figure>
            <video controls preload="none" playsInline poster="/home/livraison-09.webp"><source src="/client2.mp4" type="video/mp4" /></video>
            <figcaption><b>Livraison & prise en main</b><span>Brest</span></figcaption>
          </figure>
        </div>
      </section>

      {/* FONDATEUR */}
      <section className={h.founder}>
        <div className={h.founderVideo}>
          <video controls preload="none" playsInline poster="/videos-reelles/1000170267.jpg"><source src="/videos-reelles/1000170267.mp4" type="video/mp4" /></video>
        </div>
        <div className={h.founderText}>
          <span className={h.eyebrow}>Qui sommes-nous</span>
          <h2>Une entreprise française, un visage, un numéro qui répond.</h2>
          <p>NeoDrive est une marque de MK HOLDING SAS, installée à Muret, près de Toulouse. Depuis 6 ans, nous vendons et livrons des voitures sans permis. Nous filmons nous-mêmes nos voitures, nos arrivages et nos livraisons : vous voyez exactement ce que vous achetez.</p>
          <ul>
            <li>📍 31 rue Jean Nougaro, 31600 Muret</li>
            <li>🏢 SIREN 908 645 393</li>
            <li>💬 Réponse directe sur WhatsApp : 06 28 26 14 46</li>
          </ul>
          <div className={h.actions}>
            <a className={h.btnWhatsapp} href={WHATSAPP} target="_blank" rel="noreferrer">Nous écrire sur WhatsApp</a>
            <Link className={h.btnGhost} href="/videos">Voir toutes nos vidéos</Link>
          </div>
        </div>
      </section>

      <WhyUs />

      {/* MODÈLES */}
      <section className={h.section} id="versions">
        <header className={h.head}>
          <span className={h.eyebrow}>La gamme</span>
          <h2>Trois versions. Une seule carrosserie en acier.</h2>
          <p>45 km/h · 2 places · autonomie indicative 50 à 70 km · recharge sur prise 220 V.</p>
        </header>
        <div className={h.models}>
          {MODELS.map((m) => (
            <article key={m.key} className={`${h.model} ${m.tone === "featured" ? h.featured : ""}`}>
              <span className={h.tag}>{m.tag}</span>
              <img src={`/reservation/${m.key === "confortPlus" ? "confort-plus" : m.key}.svg`} alt="" />
              <h3>NeoDrive {m.name}</h3>
              <p className={h.price}>{eur(m.price)} <small>TTC</small></p>
              <p className={h.pitch}>{m.pitch}</p>
              <p className={h.status}>{m.status}</p>
              <ul>{m.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <Link className={m.tone === "featured" ? h.btnPrimary : h.btnDark} href={`/reservation-devis?modele=${m.key}`}>Réserver la {m.name}</Link>
              <Link className={h.finance} href="/financement">ou en financement →</Link>
            </article>
          ))}
        </div>
        <p className={h.note}>0 € d’acompte · paiement à la livraison · garantie 2 ans · carte grise 150 €</p>
      </section>

      <Compare />

      {/* DANS LES COULISSES */}
      <section className={h.section}>
        <header className={h.head}>
          <span className={h.eyebrow}>En coulisses</span>
          <h2>Nos arrivages, notre parc, nos camions.</h2>
        </header>
        <div className={h.track} role="region" aria-label="Photos NeoDrive à faire défiler" tabIndex={0}>
          {GALLERY.map((g) => (
            <figure key={g.src}><img src={g.src} alt={g.alt} loading="lazy" decoding="async" /><figcaption>{g.alt}</figcaption></figure>
          ))}
        </div>
      </section>

      <HowItWorks />

      <GoogleReviews />

      {/* FAQ */}
      <section className={h.section}>
        <header className={h.head}>
          <span className={h.eyebrow}>Vos questions</span>
          <h2>Ce qu’on nous demande avant d’acheter.</h2>
        </header>
        <div className={h.faq}>
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
        <p className={h.center}><Link className={h.link} href="/faq">Toutes les questions →</Link></p>
      </section>

      {/* CTA FINAL */}
      <section className={h.final}>
        <h2>Votre NeoDrive, livrée chez vous.<br /><span>Sans rien payer avant de la voir.</span></h2>
        <p>Calculez votre prix livré en 1 minute, ou posez-nous vos questions : on vous répond vite.</p>
        <div className={h.actions}>
          <Link className={h.btnPrimary} href="/reservation-devis">Calculer mon prix livré</Link>
          <a className={h.btnWhatsapp} href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </section>

      <HomeFootnotes />
      <MobileCta />
    </main>
  );
}
