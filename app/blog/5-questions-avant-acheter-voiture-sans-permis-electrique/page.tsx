import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/5-questions-avant-acheter-voiture-sans-permis-electrique`;

export const metadata: Metadata = {
  title: "5 questions avant d’acheter une voiture sans permis électrique | NeoDrive",
  description: "Batterie, autonomie, SAV, garantie, livraison et prix final : les 5 questions à poser avant d’acheter une voiture sans permis électrique.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "5 questions avant d’acheter une voiture sans permis électrique",
    description: "Une checklist concrète pour comparer une VSP électrique sans se limiter au prix affiché.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "5 questions à poser avant d’acheter une voiture sans permis électrique",
  description: metadata.description,
  datePublished: "2026-08-22",
  dateModified: "2026-08-22",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quel est le premier point à vérifier avant d’acheter une voiture sans permis électrique ?",
    a: "Demandez le prix final réellement payable, ce qu’il inclut et les éventuels frais de préparation, de livraison ou d’immatriculation. Comparez ensuite ce prix avec les équipements, le SAV et les conditions de garantie.",
  },
  {
    q: "Pourquoi faut-il demander des précisions sur la batterie et l’autonomie ?",
    a: "Parce que l’autonomie réelle dépend de nombreux facteurs. Demandez la technologie de batterie, les conditions de recharge et les données d’autonomie communiquées par le vendeur, puis vérifiez qu’elles correspondent à votre usage quotidien.",
  },
  {
    q: "Que faut-il vérifier concernant le SAV ?",
    a: "Demandez qui répond en cas de panne, où sont stockées les pièces, comment une réparation est organisée et si un garage proche de chez vous peut intervenir.",
  },
  {
    q: "Faut-il demander les conditions de garantie par écrit ?",
    a: "Oui. Les garanties peuvent varier selon le modèle ou la version. Demandez la durée, les éléments couverts, les exclusions éventuelles et la procédure à suivre en cas de problème.",
  },
  {
    q: "Pourquoi vérifier la livraison avant de commander ?",
    a: "Parce que le délai, le lieu de livraison et le coût peuvent changer selon la disponibilité et votre adresse. Demandez une confirmation avant de vous engager.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE D’ACHAT</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          5 questions à poser avant d’acheter une voiture sans permis électrique
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une voiture sans permis électrique ne se choisit pas uniquement sur une photo ou un prix d’appel. Avant de commander, vérifiez cinq points simples : le prix final, la batterie, le SAV, la garantie et la livraison. Cette checklist permet de comparer des offres sur des bases concrètes.
        </p>

        <h2>1. Quel est le prix final, et que comprend-il exactement ?</h2>
        <p>
          Commencez par demander un prix TTC clair et la liste de ce qui est inclus. Le bon comparatif n’est pas seulement « véhicule A contre véhicule B » : il faut regarder la préparation, les équipements, la livraison éventuelle, les documents fournis et les services associés.
        </p>
        <p>
          Au 22 août 2026, NeoDrive affiche publiquement trois versions à 3 990 € TTC, 4 990 € TTC et 5 990 € TTC. Ces tarifs pouvant évoluer, vérifiez toujours la page produit au moment de votre achat.
        </p>
        <p><a href="/produit">Voir les versions et tarifs NeoDrive actuels →</a></p>

        <h2>2. Quelle batterie équipe le véhicule et quelle autonomie puis-je réellement attendre ?</h2>
        <p>
          Ne vous contentez pas d’un chiffre d’autonomie isolé. Demandez la technologie de batterie, les conditions de recharge, le temps de charge annoncé et surtout dans quelles conditions l’autonomie a été mesurée ou estimée.
        </p>
        <p>
          L’autonomie réelle peut varier selon la température, le relief, la charge transportée, le style de conduite et l’usage du chauffage ou d’autres équipements. L’important est donc de vérifier que la marge disponible convient à vos trajets habituels.
        </p>
        <p><a href="/batterie-lithium-ou-plomb-voiture-sans-permis">Comparer batterie lithium et batterie plomb →</a></p>

        <h2>3. Que se passe-t-il concrètement si le véhicule tombe en panne ?</h2>
        <p>
          Un SAV crédible doit pouvoir expliquer le parcours avant même votre achat : qui contacter, comment le diagnostic est réalisé, où trouver les pièces et comment une réparation peut être organisée près de chez vous.
        </p>
        <p>
          NeoDrive indique proposer un SAV en France, des pièces détachées en stock, une assistance via WhatsApp et un réseau de garages partenaires. Le parcours annoncé consiste à identifier le problème, trouver un garage adapté, envoyer les pièces nécessaires puis organiser l’intervention.
        </p>
        <p><a href="/sav">Découvrir le fonctionnement du SAV NeoDrive →</a></p>

        <h2>4. Que couvre exactement la garantie de la version choisie ?</h2>
        <p>
          Demandez toujours les conditions de garantie correspondant à la version que vous achetez. Vérifiez séparément la structure, les pièces, l’assistance et les éventuelles exclusions ou conditions de prise en charge.
        </p>
        <p>
          Au 22 août 2026, NeoDrive affiche une garantie structure et châssis de 2 ans sur ses trois versions. La garantie pièces varie selon la version : 3 mois sur Essentiel, 6 mois sur Confort et 2 ans sur Confort Plus+. Les versions Confort et Confort Plus+ affichent également 2 ans d’assistance technique gratuite. Ces conditions étant commerciales, confirmez-les avant commande.
        </p>

        <h2>5. Quel est le délai réel de livraison et comment le véhicule arrive-t-il chez moi ?</h2>
        <p>
          Un délai annoncé n’a de valeur que s’il correspond à la version et à la disponibilité du moment. Demandez si le véhicule est en stock, en production ou déjà en transport, puis faites confirmer le lieu de livraison et son coût.
        </p>
        <p>
          NeoDrive indique proposer la livraison en France, à domicile ou en point relais selon les cas. Au 22 août 2026, la page d’accueil affiche environ 6 à 8 mois pour la version Essentiel et environ 2 à 8 semaines pour la version Confort, tandis que la disponibilité de la Confort Plus+ dépend du stock. Vérifiez ces délais juste avant de commander.
        </p>
        <p><a href="/livraison">Voir les informations de livraison NeoDrive →</a></p>

        <h2>La checklist à garder avant de signer</h2>
        <ul>
          <li>Prix TTC final et services inclus.</li>
          <li>Technologie de batterie, recharge et autonomie adaptée à votre usage.</li>
          <li>Organisation du SAV et disponibilité des pièces.</li>
          <li>Garantie exacte de la version choisie.</li>
          <li>Délai, lieu et coût de livraison confirmés.</li>
        </ul>
        <p>
          Ajoutez enfin une vérification simple : demandez des photos ou vidéos récentes du véhicule et conservez les informations importantes par écrit. NeoDrive indique pouvoir envoyer des photos et vidéos avant déplacement et fournir les documents nécessaires à l’immatriculation.
        </p>

        <h2>FAQ : acheter une voiture sans permis électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous comparez actuellement plusieurs voitures sans permis ?</h2>
          <p>
            Demandez à NeoDrive les photos, vidéos, disponibilités et conditions de la version qui vous intéresse, puis utilisez cette checklist pour comparer chaque offre point par point.
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
