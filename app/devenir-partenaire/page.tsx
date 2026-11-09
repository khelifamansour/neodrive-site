import type { Metadata } from "next";
import PartnerForm from "./PartnerForm";
import s from "./partenaire.module.css";

export const metadata: Metadata = {
  title: "Devenir partenaire NeoDrive | Exposant ou revendeur de voitures sans permis",
  description: "Garages, concessions, vendeurs de motos et scooters : devenez partenaire NeoDrive. Exposez ou revendez la Confort, voiture sans permis électrique neuve, et gagnez sur chaque vente.",
  alternates: { canonical: "https://www.easydrive-auto.fr/devenir-partenaire" },
  openGraph: { title: "Devenir partenaire NeoDrive", description: "Exposant-vendeur ou revendeur : deux formules simples pour vendre la NeoDrive Confort dans votre région.", url: "https://www.easydrive-auto.fr/devenir-partenaire", type: "website", images: ["/catalogue/page-4.jpg"] },
};

export default function PartnerPage() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <div>
          <span className={s.eyebrow}>RÉSEAU NEODRIVE · PROFESSIONNELS</span>
          <h1>Vendez la voiture sans permis neuve que vos clients peuvent s’offrir.</h1>
          <p>Garage, concession, magasin de motos et scooters, centre auto : proposez la <b>NeoDrive Confort</b> dans votre région. Un produit simple, très demandé par les parents d’ados et les seniors, avec un prix public parmi les plus bas du marché.</p>
          <div className={s.actions}>
            <a className={s.primary} href="#candidature">Devenir partenaire</a>
            <a className={s.secondary} href="/catalogue">📖 Feuilleter le catalogue</a>
          </div>
        </div>
        <img src="/catalogue/page-4.jpg" alt="NeoDrive Confort : design et équipements" />
      </section>

      <section className={s.facts}>
        <article><b>4 990 € TTC</b><span>prix public de la Confort, le même partout en France</span></article>
        <article><b>Dès 14 ans</b><span>avec le permis AM, une clientèle de parents d’ados</span></article>
        <article><b>Prise 220 V</b><span>100 % électrique, rien à installer</span></article>
        <article><b>Garantie 2 ans</b><span>et service après-vente national</span></article>
      </section>

      <section className={s.formulas}>
        <div className={s.heading}><span className={s.eyebrow}>DEUX FORMULES</span><h2>Choisissez votre façon de travailler avec nous.</h2></div>
        <div className={s.grid}>
          <article>
            <span className={s.tag}>SANS ACHAT DE STOCK</span>
            <h3>Exposant-vendeur</h3>
            <p>Nous déposons une NeoDrive Confort chez vous. Vous la présentez, faites essayer et vendez : nous facturons le client et livrons.</p>
            <ul>
              <li>Aucun achat de véhicule</li>
              <li><b>Commission fixe sur chaque voiture vendue</b></li>
              <li>Prime dès la 3e vente du trimestre</li>
              <li>Les contacts de votre secteur vous sont envoyés</li>
            </ul>
          </article>
          <article className={s.featured}>
            <span className={s.tag}>MEILLEURE MARGE</span>
            <h3>Revendeur</h3>
            <p>Vous achetez vos NeoDrive Confort à prix revendeur et les revendez au prix public conseillé, livrées par lots dans votre région.</p>
            <ul>
              <li><b>Prix dégressif par lot de 3, 9 ou 13 voitures</b></li>
              <li>Frais de transfert fixes par région, refacturés au client</li>
              <li>Même prix public partout : pas de concurrence avec notre site</li>
              <li>Catalogue, photos et vidéos fournis pour vos annonces</li>
            </ul>
          </article>
        </div>
        <p className={s.note}>Conditions détaillées (commissions, prix revendeur, contrat) envoyées sous 48 h après votre candidature.</p>
      </section>

      <section className={s.why}>
        <div className={s.heading}><span className={s.eyebrow}>POURQUOI NEODRIVE</span><h2>Un produit facile à vendre.</h2></div>
        <div className={s.whyGrid}>
          <article><b>Un prix qui fait venir les clients</b><p>À 4 990 € TTC, la Confort coûte deux fois moins cher que la plupart des voitures sans permis neuves.</p></article>
          <article><b>Des clients déjà convaincus</b><p>Des centaines de demandes chaque mois partout en France : nous orientons vers vous les contacts de votre secteur.</p></article>
          <article><b>Un vrai service après-vente</b><p>Garantie 2 ans, pièces disponibles et accompagnement de notre équipe pour vous et vos clients.</p></article>
        </div>
      </section>

      <section id="candidature" className={s.formSection}>
        <div className={s.heading}><span className={s.eyebrow}>CANDIDATURE</span><h2>Parlons de votre projet.</h2><p>Remplissez ce formulaire : nous vous rappelons sous 48 h avec les conditions détaillées.</p></div>
        <PartnerForm />
      </section>
    </main>
  );
}
