import type { Metadata } from "next";
import ProSimulator from "./ProSimulator";
import s from "./pro.module.css";

export const metadata: Metadata = {
  title: "Espace professionnel NeoDrive | Devis et commande au prix réseau",
  description: "Garages et concessions : simulez votre devis NeoDrive Confort selon votre région, de 1 voiture de démonstration à des lots de 13, et commandez en ligne.",
  alternates: { canonical: "https://www.easydrive-auto.fr/espace-pro" },
  robots: { index: false, follow: true },
};

export default function EspacePro() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <span className={s.eyebrow}>ESPACE PROFESSIONNEL</span>
        <h1>Commandez vos NeoDrive Confort au prix réseau.</h1>
        <p>Devis immédiat selon votre région, de <b>1 voiture de démonstration</b> à des <b>lots de 13</b>. Commencez petit, sans risque, puis développez votre activité.</p>
        <div className={s.steps}>
          <article><b>1</b><div><h3>Partenaire</h3><p>Démarrez avec <b>une seule voiture de démonstration</b> à prix partenaire. Vous la présentez, faites essayer et vendez.</p></div></article>
          <article><b>2</b><div><h3>Distributeur</h3><p>Quand vous vendez régulièrement, passez aux <b>lots de 3, 9 ou 13</b> : plus vous commandez, meilleur est votre prix.</p></div></article>
        </div>
      </section>

      <section className={s.perks}>
        <article><b>🛡️ Même prix partout</b><span>Le prix clé en main est identique sur notre site et chez vous, dans votre région : aucun client ne peut vous mettre en concurrence avec nous.</span></article>
        <article><b>📞 Des clients pour vous</b><span>Des centaines de demandes chaque mois : les clients de votre secteur qui veulent voir et essayer sont orientés vers vous.</span></article>
        <article><b>🔧 SAV accompagné</b><span>Garantie 2 ans, pièces fournies sous garantie, forfait de main-d'œuvre, pièces hors garantie au tarif pro.</span></article>
        <article><b>📦 Livré chez vous</b><span>Transport, préparation, contrôle et documents compris dans un forfait réseau fixe par région.</span></article>
      </section>

      <section id="simulateur" className={s.simSection}>
        <ProSimulator />
      </section>

      <section className={s.faq}>
        <h2>Questions fréquentes</h2>
        <details><summary>Pourquoi le prix est-il le même sur le site et chez moi ?</summary><p>Le prix public clé en main (voiture + forfait réseau de la région + carte grise et mise en route) est le même partout. Un client de votre secteur n'a donc aucun intérêt à commander en ligne plutôt que chez vous, et vous avez l'avantage de la voiture à essayer sur place.</p></details>
        <details><summary>Qu'est-ce que le forfait réseau ?</summary><p>Un forfait fixe par région qui comprend le transport jusqu'à chez vous, la préparation, le contrôle avant livraison et les documents. Il est identique pour tous nos partenaires de la même région et vous le refacturez à votre client.</p></details>
        <details><summary>Comment se passe le paiement ?</summary><p>30 % d'acompte à la commande, le solde avant le départ du transport. Une facture avec TVA vous est remise.</p></details>
        <details><summary>Puis-je commencer avec une seule voiture ?</summary><p>Oui : la voiture de démonstration est proposée à prix partenaire, une seule fois, pour vous permettre de démarrer sans risque.</p></details>
      </section>
    </main>
  );
}
