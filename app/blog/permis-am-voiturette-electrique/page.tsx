import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/permis-am-voiturette-electrique`;

export const metadata: Metadata = {
  title: "Permis AM et voiturette électrique : guide pratique 2026 | NeoDrive",
  description:
    "À quel âge peut-on conduire une voiturette électrique ? Qui doit avoir le permis AM ? ASSR, ASR, formation : le guide pratique pour comprendre les règles en France en 2026.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Permis AM et voiturette électrique : ce qu’il faut savoir en 2026",
    description:
      "Âge minimum, personnes concernées, ASSR ou ASR, formation et vérifications avant de prendre le volant d’une voiturette électrique.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Permis AM et voiturette électrique : guide pratique 2026",
  description: metadata.description,
  datePublished: "2026-09-01",
  dateModified: "2026-09-01",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Peut-on conduire une voiture sans permis électrique à 14 ans ?",
    a: "Oui, un quadricycle léger à moteur peut être conduit dès 14 ans en France. Pour les personnes nées après le 1er janvier 1988, il faut disposer au minimum du permis AM ou d’un titre qui autorise cette catégorie de véhicule.",
  },
  {
    q: "Le permis B est-il obligatoire pour conduire une voiturette ?",
    a: "Non. Le permis B n’est pas obligatoire pour conduire un quadricycle léger à moteur. Les règles dépendent notamment de l’âge du conducteur, de sa date de naissance et des titres de conduite qu’il possède déjà.",
  },
  {
    q: "Faut-il l’ASSR pour passer le permis AM ?",
    a: "La Sécurité routière indique que le permis AM est accessible avec l’ASSR1, l’ASSR2 ou l’ASR, puis après la formation pratique prévue pour cette catégorie.",
  },
  {
    q: "Combien de temps dure la formation pratique du permis AM ?",
    a: "La documentation officielle de la Sécurité routière indique une formation pratique de 8 heures pour le permis AM. Les modalités précises doivent être confirmées auprès de l’établissement de formation au moment de l’inscription.",
  },
  {
    q: "Une personne née avant 1988 a-t-elle besoin du permis AM ?",
    a: "Service-Public indique qu’une personne née avant 1988 n’a pas besoin de titre de conduite pour conduire un véhicule relevant de la catégorie AM, sous réserve que le véhicule soit bien un quadricycle léger à moteur.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <a href="/blog">← Guides NeoDrive</a>

      <article>
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>RÉGLEMENTATION 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Permis AM et voiturette électrique : le guide pratique
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          « Voiture sans permis » ne signifie pas toujours « sans aucun titre de conduite ». Pour une voiturette électrique
          relevant de la catégorie des quadricycles légers à moteur, les règles dépendent notamment de votre âge et de votre
          date de naissance. Voici l’essentiel à vérifier avant de prendre le volant en France en 2026.
        </p>

        <h2>1. Une voiturette peut être conduite dès 14 ans</h2>
        <p>
          La Sécurité routière indique qu’un quadricycle léger à moteur, couramment appelé voiturette ou voiture sans permis,
          peut être conduit dès 14 ans. Pour un jeune conducteur, le permis AM est donc la catégorie de référence.
        </p>
        <p>
          Il faut toutefois vérifier que le véhicule concerné relève bien de la catégorie réglementaire des quadricycles
          légers à moteur. Les règles ne sont pas les mêmes pour un quadricycle lourd.
        </p>
        <p><a href="/blog/voiture-sans-permis-14-ans">Lire aussi : voiture sans permis à 14 ans, quelles conditions ? →</a></p>

        <h2>2. Qui doit avoir le permis AM ?</h2>
        <p>
          Pour les personnes nées après le 1er janvier 1988, la documentation officielle indique qu’il faut au minimum le
          permis AM pour conduire un quadricycle léger à moteur lorsqu’on ne possède pas déjà un autre titre de conduite qui
          autorise cette catégorie.
        </p>
        <p>
          À l’inverse, Service-Public précise que les personnes nées avant 1988 n’ont pas besoin de titre de conduite pour
          les véhicules relevant de la catégorie AM. Cette différence de date de naissance explique beaucoup de confusions
          autour de l’expression « sans permis ».
        </p>

        <h2>3. ASSR1, ASSR2 ou ASR : à quoi servent-elles ?</h2>
        <p>
          La Sécurité routière indique que le permis AM est accessible avec l’ASSR1, l’ASSR2 ou l’ASR, selon la situation du
          candidat. Ces attestations servent de préalable à la formation pratique du permis AM.
        </p>
        <p>
          Si vous préparez l’achat pour un adolescent, le plus simple est de vérifier d’abord quelle attestation il possède
          déjà, puis de contacter une école de conduite proposant la formation AM option quadricycle léger.
        </p>

        <h2>4. La formation pratique du permis AM dure 8 heures</h2>
        <p>
          La documentation officielle de la Sécurité routière mentionne une formation pratique de 8 heures pour obtenir le
          permis AM. Les modalités d’organisation peuvent évoluer ; il est donc utile de confirmer le calendrier, les pièces
          à fournir et les conditions exactes auprès de l’établissement choisi avant l’inscription.
        </p>
        <p>
          Pour conduire une voiturette, vérifiez que la formation choisie correspond bien à l’option quadricycle léger à
          moteur et pas uniquement à l’option cyclomoteur.
        </p>

        <h2>5. Le permis B n’est pas nécessaire pour un quadricycle léger</h2>
        <p>
          C’est le principe même de la voiturette : lorsqu’elle relève bien de la catégorie réglementaire des quadricycles
          légers à moteur, le permis B n’est pas exigé. Une personne qui possède déjà un permis autorisant la catégorie AM
          n’a pas à repasser le permis AM.
        </p>
        <p>
          Avant l’achat, ne vous fiez donc pas seulement au nom commercial du véhicule. Vérifiez sa catégorie administrative
          sur ses documents et, en cas de doute, demandez une confirmation écrite au vendeur ou à l’administration compétente.
        </p>

        <h2>6. Électrique ou thermique : le permis dépend de la catégorie, pas de l’énergie</h2>
        <p>
          Le fait qu’une voiturette soit électrique ne dispense pas des règles de conduite applicables à sa catégorie. Pour
          savoir quel titre est nécessaire, le point déterminant est sa classification réglementaire, pas simplement son type
          de motorisation.
        </p>
        <p>
          C’est pourquoi NeoDrive recommande de raisonner à partir des documents du véhicule et de la situation personnelle du
          conducteur plutôt que d’utiliser une règle générale approximative.
        </p>

        <h2>7. Les vérifications à faire avant de confier la voiturette à un jeune conducteur</h2>
        <ul>
          <li>confirmer que le véhicule est bien un quadricycle léger à moteur ;</li>
          <li>vérifier l’âge et la date de naissance du conducteur ;</li>
          <li>identifier le titre de conduite déjà détenu, le cas échéant ;</li>
          <li>pour le permis AM, vérifier l’ASSR1, l’ASSR2 ou l’ASR selon la situation ;</li>
          <li>choisir une formation AM adaptée au quadricycle léger ;</li>
          <li>vérifier séparément l’assurance et l’immatriculation avant circulation.</li>
        </ul>

        <h2>8. Et pour une NeoDrive ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques et met en avant des véhicules neufs, un SAV
          en France et l’accès aux pièces détachées. Avant toute commande, demandez la version exacte du véhicule et ses
          documents afin de vérifier qu’elle correspond bien à l’usage et à la situation du futur conducteur.
        </p>
        <p>
          Les prix, disponibilités, délais et caractéristiques doivent toujours être confirmés au moment de l’achat : ils ne
          sont volontairement pas extrapolés dans ce guide réglementaire.
        </p>
        <p><a href="/produit">Voir la gamme NeoDrive →</a> · <a href="/contact">Poser une question à NeoDrive →</a></p>

        <h2>Sources officielles à consulter</h2>
        <p>
          Pour les règles de conduite, privilégiez toujours les sources publiques : la Sécurité routière et Service-Public.fr.
          Les règles peuvent évoluer ; une vérification à la date de votre démarche reste le meilleur réflexe.
        </p>
        <p>
          <a href="https://www.onisr.securite-routiere.gouv.fr/politique-de-securite-routiere/code-de-la-route" rel="noreferrer">
            Sécurité routière : code de la route et catégories de permis →
          </a>
        </p>
        <p>
          <a href="https://www.service-public.fr/particuliers/vosdroits/F1464" rel="noreferrer">
            Service-Public.fr : véhicules pouvant être conduits sans permis B →
          </a>
        </p>

        <h2>FAQ : permis AM et voiturette électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous cherchez une voiturette électrique pour un conducteur éligible ?</h2>
          <p>
            Consultez la gamme NeoDrive et demandez-nous la version disponible ainsi que les documents nécessaires pour
            vérifier que le véhicule correspond bien à votre situation.
          </p>
          <p>
            <a href="/produit"><strong>Voir la gamme NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
