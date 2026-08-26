import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/cout-reel-voiture-sans-permis-neuve`;

export const metadata: Metadata = {
  title: "Combien coûte réellement une voiture sans permis neuve en 2026 ? | NeoDrive",
  description:
    "Prix d’achat, assurance, immatriculation, livraison et financement : les postes à vérifier pour calculer le vrai budget d’une voiture sans permis neuve en 2026.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Combien coûte réellement une voiture sans permis neuve en 2026 ?",
    description:
      "Un guide concret pour distinguer le prix affiché du budget total, sans inventer de frais ni de tarifs.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Combien coûte réellement une voiture sans permis neuve en 2026 ?",
  description: metadata.description,
  datePublished: "2026-08-26",
  dateModified: "2026-08-26",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quel est le prix d’une voiture sans permis neuve NeoDrive en 2026 ?",
    a: "Au 26 août 2026, le site NeoDrive affiche trois versions à 3 990 € TTC, 4 990 € TTC et 5 990 € TTC. Les prix et disponibilités pouvant évoluer, il faut vérifier l’offre en ligne au moment de la commande.",
  },
  {
    q: "Le prix affiché est-il le budget final ?",
    a: "Pas forcément. Selon votre situation, il faut aussi vérifier l’assurance, l’immatriculation, la livraison, les éventuelles options et, si vous financez le véhicule, le coût total du crédit.",
  },
  {
    q: "L’assurance est-elle obligatoire pour une voiture sans permis ?",
    a: "Oui. En France, une voiture sans permis est un véhicule à moteur soumis à l’obligation d’assurance. La responsabilité civile, dite assurance au tiers, constitue la couverture obligatoire minimale.",
  },
  {
    q: "Combien coûte la carte grise d’une voiture sans permis ?",
    a: "Il n’existe pas un montant universel à appliquer à tous les dossiers. Le coût dépend de la situation du véhicule et des règles applicables au moment de l’immatriculation. Il faut vérifier le calcul réel lors de la démarche officielle ou auprès d’un professionnel habilité.",
  },
  {
    q: "Comment comparer deux offres de voiture sans permis ?",
    a: "Comparez le montant total à payer, pas seulement le prix d’appel : véhicule, équipement réellement inclus, batterie, livraison, documents, garanties, SAV, assurance et coût éventuel du financement.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>BUDGET D’ACHAT</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Combien coûte réellement une voiture sans permis neuve en 2026 ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Le prix affiché sur une annonce ne suffit pas toujours pour connaître le budget réel. Pour comparer correctement deux voitures sans permis neuves, il faut regarder ce qui est inclus et ajouter uniquement les frais qui concernent réellement votre dossier.
        </p>

        <h2>Le point de départ : le prix TTC réellement affiché</h2>
        <p>
          Au 26 août 2026, le site NeoDrive affiche trois versions neuves : <strong>Essentiel à 3 990 € TTC</strong>, <strong>Confort à 4 990 € TTC</strong> et <strong>Confort Plus+ à 5 990 € TTC</strong>. Ces montants sont les prix publics affichés au moment de la rédaction ; ils doivent être revérifiés au moment de commander, comme toute information commerciale susceptible d’évoluer.
        </p>
        <p>
          Ce premier chiffre est essentiel, mais il faut immédiatement poser une deuxième question : <strong>qu’est-ce qui est réellement compris dans ce prix ?</strong> Une offre moins chère en apparence peut devenir moins intéressante si des équipements, la batterie, des documents, la livraison ou certains services sont facturés séparément.
        </p>
        <p>
          Pour consulter les tarifs et équipements à jour, rendez-vous directement sur la <a href="/produit">page des modèles NeoDrive</a> ou sur notre guide consacré au <a href="/prix-voiture-sans-permis">prix d’une voiture sans permis</a>.
        </p>

        <h2>1. Vérifier ce que le prix du véhicule comprend</h2>
        <p>
          Avant de comparer deux offres, demandez une liste écrite de ce qui est inclus. Pour une voiture sans permis électrique, les différences de prix peuvent venir de l’équipement, du type de batterie, du niveau d’accompagnement, de la disponibilité ou des services associés.
        </p>
        <p>Une comparaison sérieuse doit au minimum vérifier :</p>
        <ul>
          <li>le prix TTC du véhicule correspondant exactement à la version choisie ;</li>
          <li>la présence de la batterie dans l’offre ;</li>
          <li>les équipements réellement montés sur le véhicule livré ;</li>
          <li>les documents remis pour l’immatriculation ;</li>
          <li>les conditions de garantie de la version concernée ;</li>
          <li>l’organisation du SAV et l’accès aux pièces ;</li>
          <li>le délai ou la disponibilité annoncée au moment de la commande.</li>
        </ul>
        <p>
          Évitez donc de comparer uniquement deux chiffres placés en gros sur une publicité. Le bon indicateur est le <strong>coût de l’offre réellement équivalente</strong> pour votre usage.
        </p>

        <h2>2. Ajouter l’assurance, obligatoire avant de circuler</h2>
        <p>
          En France, une voiture sans permis fait partie des véhicules à moteur soumis à l’obligation d’assurance. Le ministère de l’Économie rappelle que la responsabilité civile, souvent appelée assurance « au tiers », est la couverture minimale obligatoire pour circuler.
        </p>
        <p>
          En revanche, il serait trompeur d’annoncer ici un tarif d’assurance unique. Le prix dépend notamment du conducteur, de son profil, du lieu de résidence, de l’usage, du niveau de garanties et de l’assureur. Pour calculer votre budget réel, demandez donc un devis correspondant au conducteur qui utilisera effectivement la voiturette.
        </p>
        <p>
          Notre guide <a href="/blog/assurance-voiture-sans-permis-ce-quil-faut-verifier">Assurance voiture sans permis : ce qu’il faut vérifier</a> détaille les points à comparer avant de signer un contrat.
        </p>

        <h2>3. Ne pas inventer un montant de carte grise</h2>
        <p>
          Une voiture sans permis destinée à circuler sur la voie publique doit être immatriculée. Mais le coût de la démarche ne doit pas être traité comme un forfait identique pour tous les véhicules et tous les dossiers.
        </p>
        <p>
          La situation du véhicule, la nature de la démarche et les règles fiscales applicables au moment de l’immatriculation peuvent modifier le montant. Le bon réflexe consiste donc à vérifier le calcul réel pendant la procédure France Titres ou auprès d’un professionnel habilité, plutôt que de reprendre un chiffre trouvé sur une ancienne annonce.
        </p>
        <p>
          Pour préparer les justificatifs, consultez notre guide <a href="/blog/carte-grise-voiture-sans-permis-electrique">Carte grise d’une voiture sans permis électrique</a>.
        </p>

        <h2>4. La livraison : demander le prix correspondant à votre adresse</h2>
        <p>
          Le coût de livraison dépend de l’organisation commerciale proposée, de la destination et du mode de transport. Il ne faut donc pas ajouter arbitrairement un montant générique au prix du véhicule.
        </p>
        <p>
          NeoDrive indique proposer une livraison en France. Avant de commander, demandez si votre offre comprend la livraison, si elle est facturée séparément et quel mode de remise est prévu pour votre adresse. Vous pourrez alors intégrer un montant réel, écrit, à votre budget.
        </p>
        <p>
          Les différentes étapes sont expliquées dans notre guide <a href="/blog/livraison-voiture-sans-permis">Comment se passe la livraison d’une NeoDrive ?</a>.
        </p>

        <h2>5. En cas de financement, regarder le coût total et pas seulement la mensualité</h2>
        <p>
          Une mensualité faible peut sembler rassurante, mais elle ne permet pas à elle seule de comparer deux financements. Si vous utilisez un crédit ou une autre solution de financement, regardez le montant total dû, la durée, le taux applicable, les frais éventuels et les conditions du contrat.
        </p>
        <p>
          Le coût d’un financement dépend du dossier et de l’offre disponible au moment de la demande. Nous ne donnons donc pas ici de mensualité ou de taux générique. Si vous envisagez cette solution, consultez la page <a href="/financement">financement voiture sans permis</a> et demandez une simulation correspondant à votre situation.
        </p>

        <h2>6. Les options et accessoires : les compter seulement s’ils vous sont utiles</h2>
        <p>
          Certains acheteurs ont besoin d’équipements particuliers, d’accessoires ou de services supplémentaires ; d’autres non. Pour éviter de gonfler artificiellement le budget, séparez bien ce qui est indispensable de ce qui est optionnel.
        </p>
        <p>
          Faites établir un devis final qui distingue clairement le véhicule, les éventuelles options, la livraison et tout autre service payant. Vous pourrez ainsi comparer des offres sur une base identique.
        </p>

        <h2>Exemple de calcul : la bonne méthode, sans montant inventé</h2>
        <p>
          Au lieu d’utiliser une estimation générale, construisez votre budget avec les montants qui correspondent réellement à votre dossier :
        </p>
        <ol>
          <li><strong>Prix TTC de la version choisie</strong> : reprendre le tarif actuel du vendeur.</li>
          <li><strong>Assurance</strong> : utiliser un devis au nom du conducteur.</li>
          <li><strong>Immatriculation</strong> : utiliser le montant calculé pour le véhicule concerné.</li>
          <li><strong>Livraison</strong> : reprendre le devis correspondant à l’adresse de remise.</li>
          <li><strong>Options</strong> : ajouter uniquement celles effectivement commandées.</li>
          <li><strong>Financement</strong> : si nécessaire, comparer le coût total du crédit et pas seulement la mensualité.</li>
        </ol>
        <p>
          Le résultat est beaucoup plus fiable qu’un « prix moyen tout compris » qui ne correspond peut-être ni à votre conducteur, ni à votre région, ni au véhicule que vous achetez.
        </p>

        <h2>Comment comparer NeoDrive à une autre voiture sans permis neuve ?</h2>
        <p>
          Utilisez une fiche de comparaison identique pour chaque véhicule. Notez le prix TTC actuel, les équipements inclus, la batterie, les garanties de la version, les modalités de livraison, le SAV, les pièces, puis les frais propres à votre dossier.
        </p>
        <p>
          Cette méthode évite deux erreurs fréquentes : comparer une version d’entrée de gamme avec une version mieux équipée, ou comparer un prix « véhicule seul » avec une offre qui inclut déjà davantage de services.
        </p>

        <h2>Le budget NeoDrive au moment de la rédaction</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques. Au 26 août 2026, les prix publics affichés sur le site sont de 3 990 € TTC pour l’Essentiel, 4 990 € TTC pour la Confort et 5 990 € TTC pour la Confort Plus+.
        </p>
        <p>
          Le site met également en avant des véhicules neufs, un SAV en France, des pièces et une livraison possible en France. Les caractéristiques commerciales, garanties, disponibilités et délais peuvent varier selon la version et évoluer : vérifiez toujours la fiche de l’offre au moment de votre commande.
        </p>

        <h2>La checklist avant de signer</h2>
        <ul>
          <li>Demander le prix TTC de la version exacte.</li>
          <li>Vérifier par écrit ce qui est inclus dans le véhicule.</li>
          <li>Demander un devis d’assurance correspondant au conducteur.</li>
          <li>Vérifier le coût réel de l’immatriculation pour le dossier concerné.</li>
          <li>Obtenir le prix de livraison pour l’adresse choisie.</li>
          <li>Contrôler les conditions de garantie et de SAV de la version.</li>
          <li>Si vous financez, regarder le coût total du contrat.</li>
          <li>Comparer les offres sur un périmètre identique.</li>
        </ul>

        <h2>FAQ : coût réel d’une voiture sans permis neuve</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous voulez connaître votre budget réel ?</h2>
          <p>
            Choisissez la version NeoDrive qui vous intéresse, puis demandez les informations correspondant à votre situation : disponibilité, livraison, documents et services inclus. Vous pourrez alors comparer sur des montants concrets plutôt que sur une estimation générale.
          </p>
          <p>
            <a href="/produit"><strong>Voir les modèles et prix actuels →</strong></a>{" "}
            <a href="/contact"><strong>Demander des informations →</strong></a>
          </p>
        </section>

        <p style={{ marginTop: 36, fontSize: 14, color: "#666" }}>
          Sources vérifiées pour les informations susceptibles d’évoluer : tarifs affichés sur easydrive-auto.fr au 26 août 2026 ; obligation d’assurance automobile et responsabilité civile minimale vérifiées auprès du ministère de l’Économie. Les frais individuels d’assurance, d’immatriculation, de livraison et de financement ne sont volontairement pas chiffrés sans devis ou calcul propre au dossier.
        </p>
      </article>
    </main>
  );
}
