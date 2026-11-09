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
            <a className={s.primary} href="/espace-pro">Simuler mon devis pro</a>
            <a className={s.secondary} href="#candidature">Devenir partenaire</a>
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
        <div className={s.heading}><span className={s.eyebrow}>DEUX ÉTAPES</span><h2>Commencez avec une seule voiture, grandissez à votre rythme.</h2></div>
        <div className={s.grid}>
          <article>
            <span className={s.tag}>ÉTAPE 1 · SANS RISQUE</span>
            <h3>Partenaire</h3>
            <p>Vous démarrez avec <b>une seule NeoDrive Confort de démonstration</b>, à prix partenaire. Vous la présentez, faites essayer et vendez.</p>
            <ul>
              <li><b>Voiture de démonstration à prix partenaire</b> (une seule fois)</li>
              <li>Commission fixe sur chaque commande passée par vous</li>
              <li>Des clients de votre secteur vous sont transmis</li>
              <li>Catalogue, photos et vidéos fournis</li>
            </ul>
          </article>
          <article className={s.featured}>
            <span className={s.tag}>ÉTAPE 2 · MEILLEURE MARGE</span>
            <h3>Distributeur</h3>
            <p>Quand vous vendez régulièrement, vous commandez vos NeoDrive par lots et les revendez au prix public conseillé.</p>
            <ul>
              <li><b>Prix dégressif par lot de 3, 9 ou 13 voitures</b></li>
              <li>Forfait réseau fixe par région, refacturé au client</li>
              <li>Même prix clé en main que sur notre site : aucune concurrence</li>
              <li>Prime annuelle selon vos volumes</li>
            </ul>
          </article>
        </div>
        <div className={s.actions}><a className={s.primary} href="/espace-pro">Simuler mon devis selon ma région</a></div>
        <p className={s.note}>Le simulateur affiche vos prix réseau, votre prix de revente clé en main et votre marge, de 1 à 13 voitures.</p>
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
