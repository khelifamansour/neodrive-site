import type { Metadata } from "next";
import styles from "../_components/seo-article.module.css";

const url = "https://www.easydrive-auto.fr/batterie-lithium-ou-plomb-voiture-sans-permis";

export const metadata: Metadata = {
  title: "Batterie lithium ou plomb pour voiture sans permis ? | NeoDrive",
  description:
    "Lithium ou plomb pour une voiture sans permis électrique : différences, recharge, poids, durée d’usage et critères pour choisir selon vos besoins.",
  alternates: { canonical: url },
  openGraph: {
    title: "Batterie lithium ou plomb pour voiture sans permis ?",
    description:
      "Un guide simple pour comprendre les différences entre batteries lithium et plomb sur une voiture sans permis électrique.",
    url,
    type: "article",
    siteName: "NeoDrive",
    locale: "fr_FR",
  },
};

const faq = [
  {
    q: "Quelle batterie choisir pour une voiture sans permis électrique ?",
    a: "Le bon choix dépend surtout de l’usage, du budget, de la fréquence de recharge et de l’autonomie recherchée. Une batterie lithium est généralement plus légère et plus adaptée aux usages réguliers, tandis qu’une batterie plomb peut répondre à un besoin plus économique et à des trajets limités.",
  },
  {
    q: "Une batterie lithium est-elle toujours meilleure qu’une batterie plomb ?",
    a: "Pas dans tous les cas. Le lithium présente plusieurs avantages techniques, mais son intérêt dépend du véhicule, de son système de charge, du budget et de l’utilisation réelle. Il faut comparer l’ensemble du véhicule et pas seulement la technologie de batterie.",
  },
  {
    q: "Peut-on remplacer une batterie plomb par une batterie lithium ?",
    a: "Une conversion ne doit pas être improvisée. La tension, le chargeur, le contrôleur, le BMS et les caractéristiques électriques doivent être compatibles. Demandez une validation technique avant toute modification.",
  },
  {
    q: "Comment préserver la batterie d’une voiture sans permis électrique ?",
    a: "Suivez les consignes du constructeur, utilisez le chargeur prévu pour le véhicule, évitez les conditions de stockage extrêmes et rechargez selon les recommandations correspondant à la technologie installée.",
  },
];

export default function BatterieLithiumOuPlombPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Batterie lithium ou plomb pour voiture sans permis : que choisir ?",
    description:
      "Guide NeoDrive sur les différences entre batteries lithium et plomb pour voiture sans permis électrique.",
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "NeoDrive" },
    publisher: { "@type": "Organization", name: "NeoDrive", url: "https://www.easydrive-auto.fr" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />

      <section className={styles.hero}>
        <span className={styles.badge}>Guide batterie VSP</span>
        <h1>Batterie lithium ou plomb pour une voiture sans permis : que choisir ?</h1>
        <p>
          La batterie influence le poids, la recharge, l’autonomie d’usage et le coût d’une voiture sans permis électrique. Voici les différences essentielles à comprendre avant de choisir.
        </p>
        <a className={styles.cta} href="/produit">Voir les véhicules NeoDrive</a>
      </section>

      <section className={styles.section}>
        <h2>La différence en quelques mots</h2>
        <p>
          Les batteries au plomb sont une technologie éprouvée et généralement plus accessible à l’achat. Les batteries lithium offrent habituellement une meilleure densité énergétique : à capacité utile comparable, elles peuvent être plus légères et mieux adaptées à des usages fréquents. Le choix doit toutefois rester cohérent avec le véhicule et son système électrique.
        </p>
        <div className={styles.grid}>
          <article className={styles.card}>
            <h3>Batterie plomb</h3>
            <p>Solution connue et économique, intéressante lorsque le budget initial est prioritaire et que les besoins de déplacement restent maîtrisés.</p>
          </article>
          <article className={styles.card}>
            <h3>Batterie lithium</h3>
            <p>Solution plus légère et généralement plus performante pour un usage régulier, avec une gestion électronique de batterie adaptée.</p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark}`}>
        <h2>Lithium vs plomb : les critères à comparer</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Critère</th><th>Plomb</th><th>Lithium</th></tr></thead>
            <tbody>
              <tr><td>Budget initial</td><td>Généralement plus accessible</td><td>Généralement plus élevé</td></tr>
              <tr><td>Poids</td><td>Plus important à capacité comparable</td><td>Généralement plus faible</td></tr>
              <tr><td>Usage régulier</td><td>Possible avec une recharge et un entretien adaptés</td><td>Souvent mieux adaptée aux cycles réguliers</td></tr>
              <tr><td>Gestion électronique</td><td>Dépend du système installé</td><td>BMS indispensable pour gérer et protéger le pack</td></tr>
              <tr><td>Choix final</td><td colSpan={2}>À décider selon le véhicule, les trajets, le budget et les préconisations du constructeur</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Ne choisissez pas uniquement sur l’autonomie annoncée</h2>
        <p>
          L’autonomie réelle dépend de nombreux facteurs : température, relief, charge transportée, pression des pneus, vitesse, fréquence des accélérations, état de la batterie et utilisation du chauffage ou d’autres équipements. Deux conducteurs peuvent donc obtenir des résultats différents avec le même véhicule.
        </p>
        <p>
          Pour comparer correctement deux versions, regardez aussi la garantie, le SAV, la disponibilité des pièces et la compatibilité du chargeur. Ce sont ces éléments qui déterminent l’expérience sur plusieurs années.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Quel choix pour votre usage ?</h2>
        <div className={styles.grid}>
          <article className={styles.card}>
            <h3>Petits trajets et budget serré</h3>
            <p>Une version au plomb peut être cohérente lorsque les trajets quotidiens sont courts et prévisibles et que le prix d’achat est le premier critère.</p>
          </article>
          <article className={styles.card}>
            <h3>Utilisation fréquente</h3>
            <p>Le lithium devient particulièrement intéressant lorsque le véhicule est utilisé régulièrement et que le poids, la recharge et le confort d’utilisation prennent davantage d’importance.</p>
          </article>
        </div>
        <p className={styles.note}>Les caractéristiques exactes varient selon le modèle et la version. Vérifiez toujours la fiche du véhicule proposé au moment de la commande.</p>
      </section>

      <section className={styles.faq}>
        <h2>Questions fréquentes</h2>
        {faq.map((item) => (
          <article className={styles.faqItem} key={item.q}>
            <h3>{item.q}</h3><p>{item.a}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <h2>Continuer votre recherche</h2>
        <p>Ces guides peuvent vous aider à comparer votre budget et votre futur véhicule.</p>
        <div className={styles.links}>
          <a href="/guide-voiture-sans-permis">Guide voiture sans permis</a>
          <a href="/prix-voiture-sans-permis">Prix d’une voiture sans permis</a>
          <a href="/assurance-voiture-sans-permis">Assurance VSP</a>
          <a href="/sav">SAV NeoDrive</a>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2>Vous hésitez entre plusieurs versions ?</h2>
        <p>Expliquez-nous vos trajets et votre usage. NeoDrive peut vous orienter vers la configuration la plus cohérente parmi les véhicules actuellement proposés.</p>
        <a className={styles.cta} href="https://wa.me/33628261446" target="_blank" rel="noopener noreferrer">Parler avec NeoDrive</a>
      </section>
    </main>
  );
}
