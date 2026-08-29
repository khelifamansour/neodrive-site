import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-neuve-ou-occasion`;

export const metadata: Metadata = {
  title: "Voiture sans permis neuve ou occasion : laquelle choisir ? | NeoDrive",
  description:
    "Neuf ou occasion en voiture sans permis : comparez budget, batterie, historique, garanties, SAV et risque d’imprévu avant d’acheter.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Voiture sans permis neuve ou occasion : laquelle choisir ?",
    description:
      "Un guide concret pour comparer une voiture sans permis neuve et une occasion sans se limiter au prix affiché.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Voiture sans permis neuve ou occasion : laquelle choisir ?",
  description: metadata.description,
  datePublished: "2026-08-29",
  dateModified: "2026-08-29",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une voiture sans permis d’occasion est-elle toujours moins chère qu’une neuve ?",
    a: "Le prix d’achat peut être plus bas, mais il faut comparer le coût global : état de la batterie, pneus, freins, entretien, réparations éventuelles, garantie et frais annexes. Une occasion bon marché peut devenir moins intéressante si plusieurs dépenses arrivent rapidement.",
  },
  {
    q: "Que faut-il vérifier en priorité sur une voiture sans permis électrique d’occasion ?",
    a: "Demandez l’historique du véhicule, les factures disponibles, les réparations déjà réalisées et les informations disponibles sur la batterie. Faites aussi un essai et vérifiez les équipements, le freinage, les pneus, les ouvrants et la recharge.",
  },
  {
    q: "Une voiture sans permis d’occasion achetée à un professionnel bénéficie-t-elle d’une garantie légale ?",
    a: "Oui, lorsque les conditions légales sont réunies, la garantie légale de conformité s’applique aussi aux biens d’occasion vendus par un professionnel à un consommateur. Elle ne s’applique pas de la même façon à une vente entre particuliers.",
  },
  {
    q: "Pourquoi choisir une voiture sans permis neuve ?",
    a: "Le neuf apporte surtout davantage de prévisibilité : historique connu dès le départ, état du véhicule plus simple à apprécier, conditions commerciales identifiées et interlocuteur clairement défini pour le SAV.",
  },
  {
    q: "Comment comparer correctement neuf et occasion ?",
    a: "Comparez le prix final, l’état de la batterie, l’historique, les dépenses probables à court terme, les garanties applicables, la disponibilité des pièces et la qualité du SAV. Le meilleur choix dépend de votre budget et de votre tolérance au risque d’imprévu.",
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
          Voiture sans permis neuve ou occasion : laquelle choisir ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une voiture sans permis d’occasion peut sembler plus économique au premier regard. Une neuve peut sembler plus simple et plus prévisible. Le bon choix dépend surtout de ce que vous achetez réellement : état de la batterie, historique, dépenses à venir, garanties, pièces et SAV.
        </p>

        <h2>Ne comparez pas seulement le prix affiché</h2>
        <p>
          Le prix d’achat est important, mais il ne raconte qu’une partie de l’histoire. Sur une occasion, il faut aussi regarder les dépenses qui peuvent arriver rapidement : batterie, pneus, freins, éléments de carrosserie, recharge, entretien ou réparation d’un équipement déjà usé.
        </p>
        <p>
          Pour une voiture neuve, le prix est généralement plus facile à lire : vous partez d’un véhicule sans historique d’usage antérieur et vous pouvez demander précisément ce qui est inclus, les conditions de livraison et les garanties applicables.
        </p>
        <p>
          Au 29 août 2026, NeoDrive affiche publiquement ses voitures sans permis électriques neuves à partir de 3 990 € TTC, avec plusieurs versions proposées. Les prix commerciaux pouvant évoluer, vérifiez toujours la page produit au moment de votre décision.
        </p>
        <p><a href="/produit">Voir les tarifs NeoDrive actuellement affichés →</a></p>

        <h2>Occasion : l’historique devient une donnée essentielle</h2>
        <p>
          Sur un véhicule d’occasion, demandez les informations qui permettent de comprendre sa vie précédente : date de première mise en circulation, nombre de propriétaires si l’information est disponible, réparations effectuées, factures d’entretien et éventuels sinistres ou remplacements importants signalés par le vendeur.
        </p>
        <p>
          La DGCCRF recommande notamment de vérifier les informations obligatoires de l’annonce ou du lieu de vente, d’examiner le véhicule, de consulter les factures disponibles et de réaliser un essai avant l’achat. L’absence d’historique ne signifie pas automatiquement qu’un véhicule est mauvais, mais elle augmente l’incertitude.
        </p>
        <p><a href="/voiture-sans-permis-occasion">Voir le guide NeoDrive sur la voiture sans permis d’occasion →</a></p>

        <h2>Sur une VSP électrique, la batterie mérite une vérification spécifique</h2>
        <p>
          La batterie est un élément central du budget et de l’usage quotidien. Sur une occasion, ne partez pas du principe qu’elle est « bonne » simplement parce que le véhicule roule. Demandez son type, son âge si connu, les éventuels remplacements déjà réalisés et les informations de diagnostic que le vendeur peut fournir.
        </p>
        <p>
          Il est également utile de vérifier la recharge et de faire un essai suffisamment représentatif de votre usage. Évitez les promesses d’autonomie non documentées : l’autonomie réelle dépend de nombreux facteurs et doit être appréciée à partir des données du modèle concerné et de l’état réel du véhicule.
        </p>
        <p><a href="/batterie-lithium-ou-plomb-voiture-sans-permis">Comprendre les différences entre batterie lithium et plomb →</a></p>

        <h2>Garantie : distinguez garantie légale et garantie commerciale</h2>
        <p>
          En France, la garantie légale de conformité peut s’appliquer à un bien neuf comme à un bien d’occasion lorsqu’un consommateur achète auprès d’un vendeur professionnel. Le ministère de l’Économie rappelle que l’action en garantie de conformité se prescrit par deux ans à compter de la délivrance du bien.
        </p>
        <p>
          En revanche, la garantie légale de conformité ne s’applique pas à une vente entre particuliers. Il faut aussi distinguer cette protection légale d’une éventuelle garantie commerciale, dont le contenu, la durée et les exclusions sont définis par le professionnel. Avant d’acheter, demandez toujours les conditions écrites correspondant au véhicule précis.
        </p>

        <h2>Neuf : le principal avantage est la prévisibilité</h2>
        <p>
          Acheter neuf ne veut pas dire qu’aucun problème ne peut survenir. L’avantage est plutôt de réduire les inconnues : pas d’usure liée à un ancien propriétaire, historique connu dès la livraison, interlocuteur identifié et conditions commerciales pouvant être vérifiées avant la commande.
        </p>
        <p>
          Chez NeoDrive, le positionnement mis en avant est celui d’une voiture sans permis électrique neuve avec accompagnement, SAV en France et disponibilité de pièces. Avant achat, vérifiez toujours les conditions de la version choisie, car les garanties, délais et équipements peuvent évoluer.
        </p>
        <p><a href="/sav">Découvrir le fonctionnement du SAV NeoDrive →</a></p>

        <h2>Quand l’occasion peut être le meilleur choix</h2>
        <p>
          Une occasion peut être pertinente si votre budget est serré et si le véhicule est bien documenté, correctement entretenu et proposé à un prix cohérent avec son état. Elle peut aussi permettre de trouver rapidement un véhicule déjà disponible.
        </p>
        <p>
          Le point décisif est la qualité de l’information. Une occasion avec un historique clair, un vendeur transparent et un état vérifiable est très différente d’un véhicule peu documenté dont le faible prix est le seul argument.
        </p>

        <h2>Quand le neuf est généralement plus rassurant</h2>
        <p>
          Le neuf est souvent plus adapté si vous voulez limiter le risque de dépenses imprévues à court terme, connaître précisément l’origine du véhicule et bénéficier d’un cadre commercial clair dès le départ. C’est aussi plus simple si vous ne souhaitez pas évaluer vous-même l’état d’une batterie ou reconstituer l’historique d’une voiturette d’occasion.
        </p>

        <h2>La comparaison à faire avant de décider</h2>
        <ul>
          <li>Prix TTC final et frais annexes clairement détaillés.</li>
          <li>État et historique de la batterie.</li>
          <li>Factures, réparations et entretien connus.</li>
          <li>Dépenses probables à court terme.</li>
          <li>Garantie légale applicable selon le vendeur.</li>
          <li>Garantie commerciale éventuelle et ses conditions.</li>
          <li>Disponibilité des pièces et organisation du SAV.</li>
          <li>Délai ou disponibilité réelle du véhicule.</li>
        </ul>
        <p>
          Si deux véhicules semblent proches en prix, cette grille permet souvent de comprendre lequel est réellement le plus intéressant. Un prix inférieur n’est avantageux que si l’état du véhicule et les dépenses prévisibles restent cohérents.
        </p>

        <h2>FAQ : voiture sans permis neuve ou occasion</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous hésitez entre une occasion et une NeoDrive neuve ?</h2>
          <p>
            Comparez le coût global, l’état de la batterie, les garanties et le SAV. NeoDrive peut aussi vous communiquer les informations actuelles sur les versions neuves, les disponibilités et la livraison afin que vous compariez sur des bases concrètes.
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
