import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/sav-voiture-sans-permis`;

export const metadata: Metadata = {
  title: "SAV voiture sans permis : que se passe-t-il après l’achat ? | NeoDrive",
  description: "Contact, diagnostic, pièces, garage partenaire et garantie : découvrez comment fonctionne le SAV NeoDrive après l’achat d’une voiture sans permis.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "SAV voiture sans permis : le parcours après l’achat",
    description: "Les étapes concrètes du SAV NeoDrive : prise de contact, diagnostic, pièces détachées, garage partenaire et suivi de la réparation.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "SAV voiture sans permis : que se passe-t-il après l’achat ?",
  description: metadata.description,
  datePublished: "2026-08-17",
  dateModified: "2026-08-17",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Comment contacter le SAV NeoDrive ?",
    a: "NeoDrive indique un premier contact SAV via WhatsApp. L’équipe recueille les symptômes du véhicule afin d’identifier le problème et d’organiser la suite de la prise en charge.",
  },
  {
    q: "NeoDrive dispose-t-il de pièces détachées en France ?",
    a: "Oui. NeoDrive indique maintenir un stock de pièces en France et propose également un support technique pour accompagner les réparations.",
  },
  {
    q: "Qui effectue la réparation d’une NeoDrive ?",
    a: "Selon le cas, NeoDrive peut orienter le client vers un garage partenaire proche et organiser l’envoi des pièces nécessaires avant l’intervention.",
  },
  {
    q: "La garantie est-elle la même sur toutes les versions NeoDrive ?",
    a: "Non. Les conditions de garantie et d’assistance varient selon la version. Il faut vérifier la fiche de la version concernée et les conditions applicables au moment de l’achat.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE SAV</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          SAV voiture sans permis : que se passe-t-il après l’achat d’une NeoDrive ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Quand on achète une voiture sans permis, la question du service après-vente compte presque autant que le véhicule lui-même. Que faire si un voyant apparaît, si une pièce doit être remplacée ou si le véhicule nécessite une intervention ? Voici le parcours SAV NeoDrive, étape par étape.
        </p>

        <h2>1. Le SAV commence par un diagnostic clair du problème</h2>
        <p>
          NeoDrive indique que la première étape consiste à contacter l’équipe SAV, notamment via WhatsApp. L’objectif est de recueillir des informations précises : comportement du véhicule, message ou code erreur éventuel, circonstances d’apparition du problème et, si utile, photos ou vidéos.
        </p>
        <p>
          Plus le symptôme est décrit précisément, plus il est facile d’éviter les remplacements de pièces inutiles et d’orienter rapidement le dossier vers la bonne solution.
        </p>
        <p><a href="/sav">Accéder au service après-vente NeoDrive →</a></p>

        <h2>2. Le problème est identifié avant d’organiser l’intervention</h2>
        <p>
          Après le premier échange, le SAV cherche à identifier l’origine probable de la panne ou du dysfonctionnement. Pour une voiture sans permis électrique, certains symptômes peuvent être liés à la batterie, au chargeur, à l’électronique de commande, au freinage, à un équipement de bord ou simplement à une connexion à contrôler.
        </p>
        <p>
          Le diagnostic doit rester factuel : un code erreur ou un symptôme ne suffit pas toujours, à lui seul, à confirmer la pièce à remplacer. C’est pourquoi le contrôle du véhicule et les informations transmises au SAV restent importants.
        </p>

        <h2>3. NeoDrive peut orienter le client vers un garage partenaire</h2>
        <p>
          La page SAV NeoDrive décrit un parcours dans lequel l’équipe recherche un garage proche du client, envoie les pièces nécessaires puis organise le rendez-vous. Le garage effectue ensuite la réparation prévue.
        </p>
        <p>
          Cette organisation permet d’éviter qu’un propriétaire doive systématiquement ramener son véhicule à Toulouse pour une intervention. La solution exacte dépend toutefois du problème, de la localisation du véhicule et de la disponibilité d’un réparateur adapté.
        </p>

        <h2>4. Les pièces détachées font partie du dispositif SAV</h2>
        <p>
          Un SAV n’est réellement utile que si les pièces sont disponibles. NeoDrive indique disposer d’un stock de pièces en France et met en avant la disponibilité d’éléments de remplacement ainsi qu’un support technique pour accompagner les interventions.
        </p>
        <p>
          La page pièces détachées présente notamment des composants électroniques et équipements du véhicule, et renvoie vers une liste plus complète. Les références et tarifs peuvent évoluer : il faut donc vérifier la page au moment de la demande.
        </p>
        <p><a href="/pieces">Consulter les pièces détachées NeoDrive →</a></p>

        <h2>5. Garantie et assistance : vérifiez la version achetée</h2>
        <p>
          Les conditions de garantie ne sont pas identiques sur toutes les versions. Au 17 août 2026, le site NeoDrive affiche une garantie structure et châssis de 2 ans sur les trois versions actuellement présentées. La couverture des pièces et les services d’assistance varient selon la version.
        </p>
        <p>
          Le site indique actuellement 3 mois de garantie pièces pour la version Essentiel, 6 mois pour la version Confort et 2 ans pour la version Confort Plus+. La version Confort affiche également une assistance technique gratuite pendant 2 ans, tandis que la Confort Plus+ mentionne elle aussi 2 ans d’assistance technique gratuite.
        </p>
        <p>
          Ces conditions étant commerciales et susceptibles d’évoluer, vérifiez toujours la fiche de la version concernée ainsi que vos documents de vente avant de conclure qu’une intervention est couverte.
        </p>
        <p><a href="/produit">Voir les versions NeoDrive et leurs conditions actuelles →</a></p>

        <h2>6. Pendant la garantie, la prise en charge dépend des conditions applicables</h2>
        <p>
          La page SAV précise que, pendant la période de garantie, NeoDrive prend en charge les pièces et l’intervention selon les conditions prévues. Cela signifie qu’il faut vérifier la nature de la panne, la version du véhicule et les conditions associées à l’achat avant de confirmer une prise en charge.
        </p>
        <p>
          Hors garantie, NeoDrive indique continuer à proposer les pièces détachées et le support technique. Le propriétaire conserve donc un interlocuteur pour identifier une référence, préparer une intervention ou commander une pièce.
        </p>

        <h2>7. Les documents techniques peuvent accélérer la réparation</h2>
        <p>
          NeoDrive met à disposition un manuel technique ainsi qu’un guide SAV et diagnostic. Ces documents peuvent servir de support aux utilisateurs et aux garages lorsqu’un contrôle ou un remplacement de pièce est nécessaire.
        </p>
        <p>
          En pratique, gardez avec vous le VIN du véhicule, votre facture, les informations de la version achetée et, si le SAV vous en fournit une, la référence de votre dossier. Cela facilite le suivi lorsqu’une intervention comporte plusieurs étapes.
        </p>

        <h2>Que faut-il envoyer au SAV pour gagner du temps ?</h2>
        <p>
          Préparez quatre éléments : l’identification du véhicule, une description précise du symptôme, le code erreur s’il existe et des images ou vidéos lorsque le problème est visible. Évitez de démonter ou remplacer des composants au hasard avant d’avoir identifié la cause probable.
        </p>

        <h2>Pourquoi vérifier le SAV avant d’acheter une voiture sans permis ?</h2>
        <p>
          Le prix d’achat n’est qu’une partie du coût d’usage d’un véhicule. Avant de choisir une voiture sans permis, vérifiez également qui répond en cas de problème, où trouver les pièces, comment une réparation peut être organisée et quelles sont les conditions de garantie de la version envisagée.
        </p>
        <p>
          Pour NeoDrive, le dispositif annoncé repose sur un SAV en France, un stock de pièces, un support technique et l’orientation vers des garages partenaires. Ce sont des éléments à mettre en regard de votre lieu d’utilisation et de vos attentes avant l’achat.
        </p>

        <h2>FAQ sur le SAV d’une voiture sans permis NeoDrive</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous voulez vérifier l’accompagnement avant d’acheter ?</h2>
          <p>
            Consultez la page SAV, les pièces détachées et les conditions de la version NeoDrive qui vous intéresse. Si vous avez une question précise sur une prise en charge, demandez une confirmation avant votre achat.
          </p>
          <p>
            <a href="/sav"><strong>Découvrir le SAV NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
