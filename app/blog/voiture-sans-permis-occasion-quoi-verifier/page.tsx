import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-occasion-quoi-verifier`;

export const metadata: Metadata = {
  title: "Voiture sans permis d’occasion : quoi vérifier avant d’acheter ? | NeoDrive",
  description:
    "Checklist 2026 pour acheter une voiture sans permis d’occasion : historique, batterie, contrôle technique, carte grise, assurance, garantie, pièces et essai.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Voiture sans permis d’occasion : les vérifications avant achat",
    description:
      "Les points à contrôler avant d’acheter une voiture sans permis d’occasion, avec les démarches administratives et les pièges à éviter.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Voiture sans permis d’occasion : quoi vérifier avant d’acheter ?",
  description: metadata.description,
  datePublished: "2026-09-05",
  dateModified: "2026-09-05",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une voiture sans permis d’occasion doit-elle avoir un contrôle technique ?",
    a: "Pour une vente à un particulier, les quadricycles à moteur de plus de 5 ans sont concernés par le contrôle technique. Le procès-verbal remis pour la vente doit respecter les règles de validité applicables au jour de la cession.",
  },
  {
    q: "Peut-on vérifier l’historique d’une voiture sans permis d’occasion ?",
    a: "Pour un véhicule immatriculé en France, demandez au vendeur le certificat de situation administrative et, lorsqu’il est disponible pour le véhicule, le rapport HistoVec. Vérifiez aussi les factures d’entretien, réparations et changements de batterie.",
  },
  {
    q: "Quelle garantie pour une voiture sans permis d’occasion achetée à un professionnel ?",
    a: "La garantie légale de conformité s’applique aux biens d’occasion vendus par un professionnel à un consommateur. Elle est distincte d’une éventuelle garantie commerciale. Les ventes entre particuliers ne bénéficient pas de cette garantie légale de conformité.",
  },
  {
    q: "Comment vérifier la batterie d’une voiture sans permis électrique d’occasion ?",
    a: "Ne vous contentez pas d’une autonomie annoncée oralement. Demandez le type de batterie, son âge si connu, son historique de remplacement et, si possible, un diagnostic ou un essai suffisamment représentatif. Une estimation non mesurée ne doit pas être considérée comme une garantie d’autonomie.",
  },
  {
    q: "Faut-il assurer une voiture sans permis d’occasion ?",
    a: "Oui. Une voiture sans permis est un véhicule à moteur et doit au minimum être couverte par une assurance responsabilité civile selon les règles applicables en France.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE ACHAT 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Voiture sans permis d’occasion : quoi vérifier avant d’acheter ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une voiture sans permis d’occasion peut être intéressante si son état, son historique et son prix sont cohérents. Mais sur une voiturette électrique, une carrosserie propre ne suffit pas : batterie, freinage, pièces, documents et conditions de garantie peuvent faire toute la différence après l’achat.
        </p>

        <h2>1. Commencez par l’identité exacte du véhicule</h2>
        <p>
          Avant de parler prix, vérifiez que le vendeur peut identifier clairement le véhicule : certificat d’immatriculation, numéro de série ou VIN lorsqu’il existe sur le modèle, marque, version et année de première mise en circulation. Les informations du véhicule doivent correspondre aux documents remis.
        </p>
        <p>
          Pour un véhicule immatriculé en France, demandez également le certificat de situation administrative. Il permet notamment de savoir si une opposition empêche le changement de propriétaire. Le vendeur peut transmettre le rapport officiel via HistoVec lorsqu’il est disponible pour le véhicule.
        </p>

        <h2>2. Reconstituez l’historique, même s’il n’y a pas de carnet parfait</h2>
        <p>
          Une voiturette d’occasion n’a pas toujours un dossier d’entretien aussi complet qu’une automobile récente. Cherchez donc des preuves simples : factures, contrôles, interventions, changement de batterie, réparation après choc, remplacement du chargeur, des pneus ou des freins.
        </p>
        <p>
          Une absence de facture ne signifie pas automatiquement que le véhicule est mauvais, mais elle augmente l’incertitude. Plus l’historique est incomplet, plus l’inspection et l’essai doivent être rigoureux.
        </p>

        <h2>3. Sur une électrique, ne confondez jamais autonomie annoncée et état de batterie</h2>
        <p>
          C’est souvent le point le plus important. Une annonce peut promettre une distance élevée sans qu’aucune mesure récente ne la confirme. Demandez le type de batterie, son âge lorsqu’il est connu, si elle a déjà été remplacée et dans quelles conditions le véhicule a été stocké et rechargé.
        </p>
        <p>
          Si le vendeur dispose d’un diagnostic de batterie fiable, demandez à le voir. Sinon, privilégiez un essai représentatif et observez le comportement de l’indicateur de charge. Ne considérez jamais un chiffre oral d’autonomie comme une garantie technique.
        </p>
        <p><a href="/batterie-lithium-ou-plomb-voiture-sans-permis">Comprendre les différences entre batteries →</a></p>

        <h2>4. Testez la recharge, pas seulement la conduite</h2>
        <p>
          Un essai routier satisfaisant ne prouve pas que le système de charge fonctionne correctement. Lorsque c’est possible, vérifiez le chargeur fourni, les connecteurs, le câble et le démarrage d’une recharge. Cherchez des traces d’échauffement, des prises abîmées, des câbles bricolés ou des faux contacts visibles.
        </p>
        <p>
          Demandez aussi si le chargeur est celui prévu pour la batterie installée. En cas de doute, faites contrôler l’ensemble par un professionnel compétent avant achat.
        </p>

        <h2>5. Inspectez les éléments qui coûtent du temps après l’achat</h2>
        <p>
          Regardez les pneus, le freinage, les feux, les essuie-glaces, les vitres, les rétroviseurs, les poignées, les ceintures, les sièges, les ouvrants et l’état des soubassements accessibles. Vérifiez aussi que les commandes fonctionnent sans jeu inhabituel et qu’aucun voyant anormal ne reste affiché.
        </p>
        <p>
          Pour la carrosserie, recherchez les écarts d’alignement, fissures, réparations grossières ou traces de choc. Sur une petite voiture, un élément apparemment secondaire peut devenir gênant si la pièce est difficile à obtenir.
        </p>

        <h2>6. Vérifiez la disponibilité des pièces avant de signer</h2>
        <p>
          Le prix d’achat n’est qu’une partie du coût réel. Une voiture très bon marché peut devenir coûteuse si un contrôleur, un chargeur, un élément de freinage, une vitre ou une pièce de carrosserie est introuvable.
        </p>
        <p>
          Avant l’achat, demandez qui fournit les pièces, sous quel délai indicatif et qui peut intervenir sur le véhicule. NeoDrive met de son côté en avant un SAV et des pièces en France pour ses véhicules ; pour une occasion d’une autre marque, vérifiez le réseau et les références réellement disponibles.
        </p>
        <p><a href="/pieces">Voir la page pièces NeoDrive →</a> · <a href="/sav">Comprendre le SAV NeoDrive →</a></p>

        <h2>7. Contrôle technique : regardez l’âge du quadricycle</h2>
        <p>
          La réglementation française inclut désormais les quadricycles à moteur dans le contrôle technique. Lors d’une vente à un particulier, Service-Public indique qu’un quadricycle à moteur de plus de 5 ans doit être accompagné d’un procès-verbal de contrôle technique conforme aux règles de validité applicables à la cession.
        </p>
        <p>
          Ne vous contentez pas de la mention « contrôle technique OK » dans l’annonce : demandez le procès-verbal et lisez les défaillances ou observations relevées.
        </p>

        <h2>8. Professionnel ou particulier : les protections ne sont pas identiques</h2>
        <p>
          Un achat auprès d’un professionnel et un achat entre particuliers ne donnent pas les mêmes protections. Pour un bien d’occasion vendu par un professionnel à un consommateur, la garantie légale de conformité s’applique pendant deux ans. Pour l’occasion, la présomption que le défaut existait au moment de la délivrance est de 12 mois ; au-delà, la preuve peut revenir à l’acheteur.
        </p>
        <p>
          Une garantie commerciale éventuelle est différente : son contenu, sa durée et ses exclusions sont définis par le contrat. Demandez donc le document écrit au lieu de vous fier à une formule comme « garantie moteur-batterie » sans détail. La garantie légale de conformité ne s’applique pas de la même façon à une vente entre particuliers.
        </p>

        <h2>9. Assurez le véhicule avant de le mettre en circulation</h2>
        <p>
          Une voiture sans permis reste un véhicule à moteur. En France, elle doit être assurée au minimum en responsabilité civile. Demandez un devis avant l’achat si le profil du conducteur est particulier — par exemple un jeune conducteur — afin d’intégrer l’assurance au budget réel.
        </p>
        <p><a href="/assurance-voiture-sans-permis">Guide assurance voiture sans permis →</a></p>

        <h2>10. Calculez le coût de remise en état avant de négocier</h2>
        <p>
          Faites une liste des défauts constatés et séparez-les en trois catégories : sécurité et conformité, fonctionnement, confort ou esthétique. Demandez le prix des pièces et de la main-d’œuvre lorsque l’intervention est prévisible. Le bon prix d’une occasion n’est pas simplement le prix le plus bas : c’est le prix d’achat plus ce qu’il faudra réellement dépenser pour obtenir un véhicule fiable et adapté à votre usage.
        </p>

        <h2>Checklist express avant de payer</h2>
        <ul>
          <li>Identité du vendeur et certificat d’immatriculation cohérents.</li>
          <li>Certificat de situation administrative récent et absence d’opposition bloquante.</li>
          <li>Historique, factures et réparations connus autant que possible.</li>
          <li>Type, âge et historique de la batterie vérifiés sans promesse d’autonomie non mesurée.</li>
          <li>Chargeur, câble et démarrage de recharge contrôlés.</li>
          <li>Essai du freinage, direction, éclairage, commandes et équipements.</li>
          <li>Carrosserie et traces de choc inspectées.</li>
          <li>Disponibilité des pièces et solution SAV identifiées.</li>
          <li>Contrôle technique vérifié lorsque le véhicule y est soumis.</li>
          <li>Conditions de garantie écrites si achat professionnel.</li>
          <li>Assurance prévue avant circulation.</li>
          <li>Coût des réparations prévisibles intégré au prix total.</li>
        </ul>

        <h2>Occasion ou neuf : comparez surtout le risque total</h2>
        <p>
          Une bonne occasion, documentée et correctement entretenue, peut être un choix rationnel. À l’inverse, une occasion très attractive mais sans historique de batterie, sans pièces identifiées ou avec plusieurs réparations à prévoir peut perdre rapidement son avantage de prix.
        </p>
        <p>
          Si vous hésitez entre occasion et neuf, comparez à périmètre égal : état réel, batterie, équipements, garantie applicable, disponibilité des pièces, SAV et frais de remise en état. NeoDrive propose des voitures sans permis électriques neuves avec accompagnement, SAV et pièces en France ; vérifiez les offres et disponibilités actuelles au moment de votre comparaison.
        </p>
        <p><a href="/voiture-sans-permis-occasion">Comparer neuf et occasion →</a> · <a href="/produit">Voir les offres NeoDrive →</a></p>

        <h2>FAQ : voiture sans permis d’occasion</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous comparez une occasion avec une NeoDrive neuve ?</h2>
          <p>
            Demandez les disponibilités actuelles, les informations sur la version proposée, les conditions de livraison et le SAV afin de comparer le coût total plutôt que le seul prix affiché.
          </p>
          <p>
            <a href="/produit"><strong>Voir les modèles NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
