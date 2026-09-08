import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/citroen-ami-occasion-ou-neodrive-neuve`;

export const metadata: Metadata = {
  title: "Citroën Ami d’occasion ou NeoDrive neuve : que comparer ? | NeoDrive",
  description:
    "Citroën Ami d’occasion ou NeoDrive neuve : comparez prix réel, état, batterie, garanties légales, contrôle technique, SAV et livraison avant d’acheter.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Citroën Ami d’occasion ou NeoDrive neuve : que comparer avant d’acheter ?",
    description:
      "Un comparatif pratique pour arbitrer entre une Ami d’occasion et une NeoDrive neuve sans inventer de prix d’occasion ni de promesse technique.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Citroën Ami d’occasion ou NeoDrive neuve : que comparer avant d’acheter ?",
  description: metadata.description,
  datePublished: "2026-09-08",
  dateModified: "2026-09-08",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une Citroën Ami d’occasion est-elle forcément moins chère qu’une NeoDrive neuve ?",
    a: "Non. Le prix d’une Ami d’occasion dépend de l’annonce, de son âge, de son état et de son historique. NeoDrive affiche au 8 septembre 2026 une version Essentielle neuve à 3 990 € TTC. Il faut donc comparer deux offres réelles, au même moment, avec les frais et services associés.",
  },
  {
    q: "Quelle autonomie annonce Citroën pour l’Ami ?",
    a: "Citroën annonce actuellement jusqu’à 75 km d’autonomie en cycle WMTC pour l’Ami neuve. Sur un véhicule d’occasion, ce chiffre constructeur ne permet pas à lui seul de connaître l’état réel de la batterie du véhicule examiné.",
  },
  {
    q: "Quelle garantie s’applique à une voiture sans permis d’occasion achetée à un professionnel ?",
    a: "La garantie légale de conformité s’applique aux biens d’occasion achetés par un consommateur auprès d’un vendeur professionnel. L’action se prescrit par deux ans à compter de la délivrance et la présomption d’antériorité du défaut est d’un an pour un bien d’occasion.",
  },
  {
    q: "Faut-il un contrôle technique pour vendre une Ami d’occasion ?",
    a: "Pour un quadricycle à moteur de plus de 5 ans vendu à un particulier, Service-Public indique que le vendeur doit remettre un procès-verbal de contrôle technique valide. Les règles exactes dépendent de l’âge du véhicule et de la situation de la vente.",
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
    <main style={{ maxWidth: 920, margin: "50px auto", padding: "0 22px", fontFamily: "Arial", lineHeight: 1.75, color: "#151515" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <a href="/blog">← Guides NeoDrive</a>

      <article>
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE D’ACHAT 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Citroën Ami d’occasion ou NeoDrive neuve : que comparer avant d’acheter ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une Ami d’occasion peut sembler rassurante parce que le modèle est connu. Une NeoDrive neuve peut être intéressante si vous cherchez un véhicule neuf à budget contenu. Mais la bonne comparaison ne se résume ni au logo ni au prix de l’annonce : il faut comparer l’état réel, les garanties applicables, la batterie, les documents, le SAV et le coût final.
        </p>

        <h2>1. Comparez deux offres réelles, pas deux prix théoriques</h2>
        <p>
          Le marché de l’occasion varie en permanence. Il serait donc trompeur d’attribuer un « prix moyen » à une Citroën Ami d’occasion sans base de données suffisamment récente et représentative. Prenez le prix de l’annonce que vous examinez et ajoutez les éventuels frais nécessaires pour disposer d’un véhicule prêt à rouler.
        </p>
        <p>
          Au <strong>8 septembre 2026</strong>, NeoDrive affiche sur son site une <strong>version Essentielle neuve à 3 990 € TTC</strong>, batterie et chargeur 220 V inclus. Le site précise que le prix dépend de la version, de l’équipement et de la disponibilité. C’est cette offre réelle qu’il faut comparer à l’Ami d’occasion précise qui vous intéresse.
        </p>

        <h2>2. Sur une occasion, l’état compte autant que la fiche technique</h2>
        <p>
          Citroën annonce actuellement pour l’Ami neuve une vitesse maximale de <strong>45 km/h</strong>, jusqu’à <strong>75 km d’autonomie WMTC</strong> et une charge complète en <strong>4 heures</strong> sur prise domestique 220 V. Ces valeurs décrivent la fiche constructeur actuelle ; elles ne prouvent pas à elles seules l’état d’une Ami déjà utilisée.
        </p>
        <p>
          Sur l’occasion, vérifiez donc le véhicule lui-même : état général, fonctionnement de la recharge, comportement lors d’un essai, pneus, freinage, éclairage, ouvrants et présence des accessoires annoncés. Pour la batterie, demandez les informations disponibles sur l’usage et l’entretien du véhicule, puis confrontez-les à un essai réel si possible.
        </p>

        <h2>3. Professionnel ou particulier : la protection juridique n’est pas la même</h2>
        <p>
          La DGCCRF rappelle que la <strong>garantie légale de conformité</strong> s’applique aux biens d’occasion achetés par un particulier auprès d’un vendeur professionnel. L’action en garantie se prescrit par deux ans à compter de la délivrance du bien et, pour l’occasion, la présomption d’antériorité du défaut dure un an.
        </p>
        <p>
          Cette garantie légale de conformité ne s’applique pas de la même manière à une vente entre particuliers. Avant de comparer deux annonces, identifiez donc clairement qui vend le véhicule et quelles garanties écrites accompagnent réellement la vente. Une éventuelle garantie commerciale est distincte et ses conditions doivent être lues dans le contrat.
        </p>

        <h2>4. Contrôle technique et documents : vérifiez avant de payer</h2>
        <p>
          Depuis l’extension du contrôle technique aux véhicules de catégorie L, les quadricycles à moteur sont concernés selon leur âge. Service-Public indique notamment que, lors d’une vente à un particulier, un quadricycle à moteur de plus de 5 ans doit être accompagné d’un procès-verbal de contrôle technique datant de moins de 6 mois, sous réserve des règles liées à une éventuelle contre-visite.
        </p>
        <p>
          Vérifiez aussi le certificat d’immatriculation et la situation administrative du véhicule. Pour une occasion, l’historique documentaire est un élément de décision aussi important que l’aspect extérieur.
        </p>

        <h2>5. Ne comparez pas seulement « occasion contre neuf » : comparez le risque total</h2>
        <p>
          Une occasion peut être une excellente affaire si son prix, son état et son historique sont cohérents. Elle peut aussi nécessiter rapidement des dépenses que le prix affiché ne montre pas. À l’inverse, un véhicule neuf offre davantage de prévisibilité sur son état initial, mais il faut toujours vérifier ce qui est inclus, les conditions de vente et le SAV réellement proposé.
        </p>
        <p>
          Pour NeoDrive, la marque met en avant des véhicules neufs, une préparation avant livraison, la livraison en France, un SAV et des pièces en France. Les modalités précises doivent être confirmées pour la version et la commande concernées.
        </p>

        <h2>6. La bonne méthode : une fiche de comparaison en 8 lignes</h2>
        <ul>
          <li><strong>prix final :</strong> véhicule, livraison et frais effectivement applicables ;</li>
          <li><strong>état :</strong> neuf ou occasion, défauts visibles et essai ;</li>
          <li><strong>batterie :</strong> données documentées et comportement réel du véhicule ;</li>
          <li><strong>documents :</strong> carte grise, historique et contrôle technique si nécessaire ;</li>
          <li><strong>garanties :</strong> garanties légales et éventuelle garantie commerciale écrite ;</li>
          <li><strong>SAV :</strong> interlocuteur, pièces et procédure en cas de panne ;</li>
          <li><strong>disponibilité :</strong> véhicule réellement disponible et délai confirmé ;</li>
          <li><strong>usage :</strong> distance quotidienne, recharge et équipements dont vous avez réellement besoin.</li>
        </ul>

        <h2>7. Quand l’Ami d’occasion peut être le bon choix</h2>
        <p>
          Elle peut être pertinente si vous trouvez un exemplaire bien documenté, en bon état, proposé à un prix cohérent avec son âge et vendu dans des conditions qui vous conviennent. L’intérêt vient alors de <strong>l’exemplaire précis</strong>, pas du simple fait qu’il s’agit d’une occasion.
        </p>

        <h2>8. Quand une NeoDrive neuve mérite d’être comparée</h2>
        <p>
          Elle mérite d’entrer dans votre comparaison si vous cherchez surtout un véhicule neuf et souhaitez connaître dès le départ sa configuration, son prix public et l’organisation de la livraison. À 3 990 € TTC pour l’Essentielle affichée au 8 septembre 2026, le prix neuf peut rendre la comparaison avec certaines occasions particulièrement utile — sans préjuger du prix de l’Ami que vous avez trouvée.
        </p>

        <p>
          <a href="/voiture-sans-permis-occasion">Guide voiture sans permis d’occasion →</a> ·{" "}
          <a href="/citroen-ami-ou-neodrive">Comparer Citroën Ami et NeoDrive →</a> ·{" "}
          <a href="/produit">Voir la NeoDrive actuelle →</a> ·{" "}
          <a href="/sav">Découvrir le SAV NeoDrive →</a>
        </p>

        <h2>Sources vérifiées le 8 septembre 2026</h2>
        <p>
          Les informations susceptibles d’évoluer ont été contrôlées sur les pages officielles de Citroën France, NeoDrive, Service-Public et de la DGCCRF. Les prix d’occasion ne sont volontairement pas estimés dans cet article : ils doivent être vérifiés annonce par annonce.
        </p>
        <p>
          <a href="https://www.citroen.fr/vehicules/nouvelle-ami.html" rel="noreferrer">Citroën France : Ami →</a>{" "}
          · <a href="https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/les-garanties-legales-de-conformite-et-contre-les-vices-caches" rel="noreferrer">DGCCRF : garanties légales →</a>{" "}
          · <a href="https://www.service-public.fr/particuliers/vosdroits/F34300/2_0_0_0_1" rel="noreferrer">Service-Public : vente d’un véhicule →</a>{" "}
          · <a href="/produit">NeoDrive : véhicule et prix actuels →</a>
        </p>

        <h2>FAQ : Ami d’occasion ou NeoDrive neuve</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous avez une Ami d’occasion en vue ? Comparez-la à une offre NeoDrive réelle.</h2>
          <p>
            Envoyez-nous votre besoin et regardez en parallèle le véhicule NeoDrive actuellement proposé, ses photos réelles et sa disponibilité. Vous pourrez alors décider sur des éléments concrets plutôt que sur une comparaison abstraite.
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
