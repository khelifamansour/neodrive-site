import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/ne-avant-1988-permis-voiture-sans-permis`;

export const metadata: Metadata = {
  title: "Né avant 1988 : quel permis pour une voiture sans permis ? | NeoDrive",
  description:
    "Vous êtes né avant 1988 ? Voici la règle à connaître pour conduire un quadricycle léger à moteur en France, avec les points à vérifier avant de rouler.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Né avant 1988 : quel permis pour une voiture sans permis ?",
    description:
      "Un guide simple sur la règle applicable aux personnes nées avant 1988 et les vérifications à faire avant de conduire une voiturette.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Né avant 1988 : quel permis pour une voiture sans permis ?",
  description: metadata.description,
  datePublished: "2026-08-27",
  dateModified: "2026-08-27",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une personne née avant 1988 doit-elle passer le permis AM pour conduire une voiture sans permis ?",
    a: "Pour un quadricycle léger à moteur, la Sécurité routière indique que les personnes nées avant le 1er janvier 1988 ne sont pas soumises à l'obligation du permis AM prévue pour les personnes nées après cette date.",
  },
  {
    q: "Cette règle concerne-t-elle toutes les voitures dites sans permis ?",
    a: "Non. Il faut vérifier la catégorie administrative du véhicule. La règle vise le quadricycle léger à moteur. Un quadricycle lourd relève d'autres règles de permis.",
  },
  {
    q: "Faut-il quand même assurer la voiturette ?",
    a: "Oui. L'absence d'obligation de permis AM dans ce cas ne supprime pas l'obligation d'assurance du véhicule lorsqu'il circule sur la voie publique.",
  },
  {
    q: "Faut-il une carte grise ?",
    a: "Oui. Une voiturette mise en circulation doit être immatriculée. Il faut donc vérifier les documents du véhicule et effectuer les démarches d'immatriculation applicables.",
  },
  {
    q: "Une personne née en 1988 bénéficie-t-elle de cette exception ?",
    a: "Non. La règle officielle distingue les personnes nées avant le 1er janvier 1988 de celles nées après cette date. Une personne née en 1988 doit donc vérifier le titre de conduite requis pour le quadricycle léger concerné.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "50px auto",
        padding: "0 22px",
        fontFamily: "Arial",
        lineHeight: 1.75,
        color: "#151515",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <a href="/blog">← Guides NeoDrive</a>

      <article>
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>RÉGLEMENTATION</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Né avant 1988 : quel permis pour une voiture sans permis ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Si vous êtes né avant le 1er janvier 1988, la règle applicable au permis AM est différente de celle des conducteurs plus jeunes. Mais il faut tout de même vérifier la catégorie du véhicule, son assurance et ses documents avant de prendre la route.
        </p>

        <h2>La règle essentielle pour les personnes nées avant 1988</h2>
        <p>
          La Sécurité routière précise que le permis B n'est pas nécessaire pour conduire un quadricycle léger à moteur. Elle indique aussi que les personnes nées après le 1er janvier 1988 doivent disposer au minimum du permis AM, anciennement BSR.
        </p>
        <p>
          En pratique, une personne née avant le 1er janvier 1988 n'est donc pas soumise à cette obligation de permis AM pour conduire un quadricycle léger à moteur. Cette exception est liée à la date de naissance du conducteur, pas à la marque du véhicule.
        </p>

        <h2>Attention : « voiture sans permis » ne suffit pas pour connaître la règle</h2>
        <p>
          L'expression « voiture sans permis » est courante, mais la règle dépend de la catégorie administrative réelle du véhicule. La voiturette classique concernée par cette exception est le <strong>quadricycle léger à moteur</strong>.
        </p>
        <p>
          Avant achat ou avant de reprendre la route avec un véhicule ancien, vérifiez donc les documents d'homologation et le certificat d'immatriculation. Un quadricycle lourd ne relève pas du même régime.
        </p>

        <h2>Né en 1987 ou en 1988 : ce n'est pas la même situation</h2>
        <p>
          La date charnière mérite d'être lue précisément. Le document de la Sécurité routière vise les personnes nées <strong>avant le 1er janvier 1988</strong>. Une personne née en décembre 1987 entre donc dans cette catégorie, tandis qu'une personne née en 1988 doit vérifier le permis requis, notamment le permis AM pour un quadricycle léger si elle ne possède pas une autre catégorie de permis valable.
        </p>

        <h2>L'assurance reste obligatoire</h2>
        <p>
          Ne pas avoir à passer le permis AM ne signifie pas pouvoir circuler sans assurance. Une voiturette utilisée sur la voie publique doit être assurée. Les garanties et le tarif dépendent du contrat et du profil du conducteur : demandez un devis nominatif plutôt que de vous fier à un montant générique.
        </p>
        <p>
          <a href="/blog/assurance-voiture-sans-permis-ce-quil-faut-verifier">
            Lire notre guide sur l'assurance d'une voiture sans permis →
          </a>
        </p>

        <h2>L'immatriculation et les documents restent nécessaires</h2>
        <p>
          Une voiturette doit également être immatriculée pour circuler. Avant la remise du véhicule, vérifiez notamment que les documents permettant d'identifier sa catégorie et d'effectuer les démarches d'immatriculation sont disponibles.
        </p>
        <p>
          <a href="/blog/carte-grise-voiture-sans-permis-electrique">
            Voir notre guide sur la carte grise d'une voiture sans permis →
          </a>
        </p>

        <h2>Et si vous avez déjà un autre permis ?</h2>
        <p>
          Si vous possédez déjà une catégorie de permis de conduire valable, votre situation peut être encore plus simple. Le point important reste d'identifier précisément le véhicule et de vérifier que votre titre permet de le conduire. En cas de situation particulière — permis étranger, mesure de suspension, annulation ou interdiction de conduire — ne vous fiez pas à une règle générale : vérifiez votre cas auprès de l'administration ou d'un professionnel du droit routier.
        </p>

        <h2>Checklist avant de conduire une voiturette quand on est né avant 1988</h2>
        <ul>
          <li>Confirmer que votre date de naissance est antérieure au 1er janvier 1988.</li>
          <li>Vérifier que le véhicule est bien un quadricycle léger à moteur.</li>
          <li>Contrôler le certificat d'immatriculation et les documents d'homologation.</li>
          <li>Souscrire une assurance adaptée avant toute circulation.</li>
          <li>Vérifier séparément toute situation administrative particulière liée à votre droit de conduire.</li>
        </ul>

        <h2>Et pour une NeoDrive ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques, avec véhicules neufs, SAV, pièces et livraison en France. Avant commande, demandez la confirmation de la catégorie administrative exacte du modèle envisagé et des documents fournis avec le véhicule.
        </p>
        <p>
          <a href="/produit">Découvrir les modèles NeoDrive →</a>
        </p>
        <p>
          <a href="/contact">Poser une question à NeoDrive →</a>
        </p>

        <h2>Source officielle</h2>
        <p>
          La règle de date de naissance et de permis AM a été vérifiée sur le document officiel « La voiturette en 4 questions » publié par la Sécurité routière. Les règles pouvant évoluer, vérifiez toujours votre situation avant de conduire.
        </p>
        <p>
          <a href="https://www.securite-routiere.gouv.fr/sites/default/files/2024-09/depliant_voiturette.pdf">
            Consulter le document de la Sécurité routière →
          </a>
        </p>
        <p>
          Pour les conducteurs plus jeunes, consultez aussi notre guide :{" "}
          <a href="/blog/voiture-sans-permis-14-ans">voiture sans permis à 14 ans : quelles conditions ? →</a>
        </p>

        <h2>FAQ : permis et voiture sans permis pour les personnes nées avant 1988</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous cherchez une voiture sans permis électrique ?</h2>
          <p>
            NeoDrive peut vous présenter ses modèles et les documents associés. Vérifiez ensuite votre situation de conduite, votre assurance et l'immatriculation avant toute mise en circulation.
          </p>
          <p>
            <a href="/produit"><strong>Découvrir NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
