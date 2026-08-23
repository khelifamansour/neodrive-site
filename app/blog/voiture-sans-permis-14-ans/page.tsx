import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-14-ans`;

export const metadata: Metadata = {
  title: "Voiture sans permis à 14 ans : quelles conditions en 2026 ? | NeoDrive",
  description: "Âge minimum, permis AM, ASSR/ASR et type de véhicule : les règles à connaître pour conduire une voiture sans permis dès 14 ans en France.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Voiture sans permis à 14 ans : quelles conditions en 2026 ?",
    description: "Un guide clair pour comprendre qui peut conduire une voiturette dès 14 ans et quelles démarches sont nécessaires.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Voiture sans permis à 14 ans : quelles conditions en 2026 ?",
  description: metadata.description,
  datePublished: "2026-08-23",
  dateModified: "2026-08-23",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Peut-on conduire une voiture sans permis à 14 ans ?",
    a: "Oui, en France, une voiturette homologuée comme quadricycle léger à moteur peut être conduite à partir de 14 ans, sous réserve de disposer du titre de conduite requis, notamment la catégorie AM pour les personnes nées en 1988 ou après.",
  },
  {
    q: "Le permis B est-il nécessaire pour conduire une voiturette à 14 ans ?",
    a: "Non. Le permis B n’est pas nécessaire pour un quadricycle léger à moteur. En revanche, le permis AM est normalement requis pour les conducteurs nés en 1988 ou après.",
  },
  {
    q: "Faut-il l’ASSR pour passer le permis AM ?",
    a: "Pour accéder à la formation pratique du BSR, qui correspond à la catégorie AM, il faut en principe disposer de l’ASSR1, de l’ASSR2 ou de l’ASR selon la situation du candidat.",
  },
  {
    q: "Toutes les voitures sans permis peuvent-elles être conduites à 14 ans ?",
    a: "Non. Il faut vérifier la catégorie administrative du véhicule. La règle des 14 ans concerne le quadricycle léger à moteur, généralement associé à la catégorie L6e, et non un quadricycle lourd nécessitant un autre permis.",
  },
  {
    q: "Une voiture sans permis doit-elle être assurée ?",
    a: "Oui. Une voiturette utilisée sur la voie publique doit être assurée. Le niveau de couverture et le tarif dépendent ensuite de l’assureur, du conducteur et du contrat choisi.",
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
    <main style={{ maxWidth: 900, margin: "50px auto", padding: "0 22px", fontFamily: "Arial", lineHeight: 1.75, color: "#151515" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <a href="/blog">← Guides NeoDrive</a>

      <article>
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>RÉGLEMENTATION</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Voiture sans permis à 14 ans : quelles conditions en 2026 ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Oui, il est possible en France de conduire certaines voitures sans permis dès 14 ans. Mais « sans permis » ne signifie pas « sans règle » : l’âge, la catégorie du véhicule et le permis AM doivent être vérifiés avant de prendre la route.
        </p>

        <h2>À partir de quel âge peut-on conduire une voiture sans permis ?</h2>
        <p>
          La Sécurité routière indique qu’un quadricycle léger à moteur, c’est-à-dire la catégorie administrative correspondant aux voiturettes légères, peut être conduit dès 14 ans. Service-Public précise également que le BSR, qui correspond à la catégorie AM du permis de conduire, permet de conduire un quadricycle léger à moteur.
        </p>
        <p>
          Le point essentiel est donc de ne pas se fier uniquement à l’expression commerciale « voiture sans permis ». Vérifiez que le véhicule est bien homologué dans la catégorie autorisée avec le permis AM.
        </p>

        <h2>Le permis AM est-il obligatoire à 14 ans ?</h2>
        <p>
          Pour les personnes nées en 1988 ou après, Service-Public indique qu’il faut disposer du BSR, correspondant à la catégorie AM, ou d’une autre catégorie de permis permettant de conduire ce type de véhicule. À 14 ans, c’est donc généralement la catégorie AM qui est pertinente.
        </p>
        <p>
          Les personnes nées au plus tard le 31 décembre 1987 bénéficient d’une règle différente et peuvent conduire un quadricycle léger sans permis. Cette exception ne concerne évidemment pas un conducteur de 14 ans aujourd’hui.
        </p>

        <h2>Quelles attestations faut-il avant la formation AM ?</h2>
        <p>
          Service-Public rappelle que l’ASSR1 ou l’ASSR2 est nécessaire pour accéder à la formation pratique du BSR. Selon la situation, l’ASR peut remplacer ces attestations. Le parcours exact dépend notamment de l’âge et de la scolarité du candidat.
        </p>
        <p>
          Pour éviter une mauvaise surprise, le plus simple est de vérifier les pièces demandées directement auprès de l’auto-école avant l’inscription à la formation AM.
        </p>

        <h2>Toutes les voiturettes sont-elles accessibles dès 14 ans ?</h2>
        <p>
          Non. Il existe une différence importante entre quadricycle léger et quadricycle lourd. Le permis B1 concerne notamment les quadricycles lourds et il est accessible à partir de 16 ans. Une voiturette destinée à un jeune de 14 ans doit donc être vérifiée comme quadricycle léger à moteur.
        </p>
        <p>
          Avant achat, demandez au vendeur la catégorie d’homologation figurant sur les documents du véhicule. C’est ce document, et non l’apparence de la voiture, qui permet de savoir quelle règle de conduite s’applique.
        </p>

        <h2>Faut-il assurer une voiture sans permis conduite par un jeune ?</h2>
        <p>
          Oui. Service-Public précise qu’une voiturette doit être assurée. Le tarif ne doit pas être deviné : il varie selon l’assureur, le profil du conducteur, les garanties choisies et d’autres critères. Demandez donc un devis nominatif avant l’achat du véhicule.
        </p>
        <p><a href="/assurance-voiture-sans-permis">Lire notre guide sur l’assurance d’une voiture sans permis →</a></p>

        <h2>La checklist avant d’acheter pour un conducteur de 14 ans</h2>
        <ul>
          <li>Vérifier que le véhicule est bien un quadricycle léger à moteur.</li>
          <li>Confirmer que le conducteur a atteint l’âge minimum requis.</li>
          <li>Préparer l’ASSR1, l’ASSR2 ou l’ASR selon sa situation.</li>
          <li>Obtenir la catégorie AM avant de circuler, lorsque celle-ci est requise.</li>
          <li>Demander un devis d’assurance adapté au jeune conducteur.</li>
          <li>Contrôler les documents d’immatriculation et d’homologation du véhicule.</li>
        </ul>

        <h2>Et pour une NeoDrive ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques, avec livraison en France, SAV et pièces. Si vous cherchez un véhicule pour un conducteur de 14 ans, demandez à NeoDrive de confirmer la catégorie administrative exacte de la version envisagée ainsi que les documents fournis avant commande.
        </p>
        <p><a href="/produit">Voir les modèles NeoDrive →</a></p>
        <p><a href="/contact">Poser votre question à NeoDrive →</a></p>

        <h2>Sources officielles à vérifier avant de conduire</h2>
        <p>
          Les règles peuvent évoluer. Avant de prendre la route, vérifiez toujours la situation sur Service-Public.fr et sur le site de la Sécurité routière, notamment si le conducteur possède un titre étranger, si sa situation administrative est particulière ou si le véhicule n’est pas clairement identifié comme quadricycle léger.
        </p>

        <h2>FAQ : voiture sans permis à 14 ans</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous cherchez une voiturette électrique pour un jeune conducteur ?</h2>
          <p>
            NeoDrive peut vous présenter ses modèles, leurs documents et les solutions de livraison disponibles en France. Vérifiez ensuite le permis AM et l’assurance correspondant au conducteur avant toute mise en circulation.
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
