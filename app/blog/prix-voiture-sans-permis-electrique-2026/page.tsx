import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/prix-voiture-sans-permis-electrique-2026`;

export const metadata: Metadata = {
  title: "Prix voiture sans permis électrique 2026 : quel budget prévoir ? | NeoDrive",
  description:
    "Achat, assurance, immatriculation, livraison, recharge et entretien : les postes à prévoir pour calculer le budget d’une voiture sans permis électrique en 2026.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Combien coûte une voiture sans permis électrique en 2026 ?",
    description:
      "Un guide concret pour distinguer prix d’achat et budget total, avec les tarifs NeoDrive vérifiés au 19 août 2026.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Combien coûte une voiture sans permis électrique en 2026 ?",
  description: metadata.description,
  datePublished: "2026-08-19",
  dateModified: "2026-08-19",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quel est le prix d’une voiture sans permis électrique NeoDrive en 2026 ?",
    a: "Au 19 août 2026, le site NeoDrive affiche trois versions : Essentiel à 3 990 € TTC, Confort à 4 990 € TTC et Confort Plus+ à 5 990 € TTC. Les tarifs pouvant évoluer, il faut toujours vérifier la page Véhicules au moment de l’achat.",
  },
  {
    q: "L’assurance est-elle obligatoire pour une voiture sans permis ?",
    a: "Oui. Une voiturette doit être assurée. Le montant dépend du conducteur, du véhicule, des garanties choisies et de l’assureur : il faut donc demander un devis personnalisé plutôt que retenir un prix générique.",
  },
  {
    q: "Quels frais faut-il ajouter au prix d’achat ?",
    a: "Selon la situation, il faut notamment prévoir l’assurance, l’immatriculation, la livraison éventuelle, la recharge électrique et l’entretien. Certains frais peuvent être inclus ou facturés séparément selon l’offre choisie.",
  },
  {
    q: "Comment comparer deux voitures sans permis électriques ?",
    a: "Comparez le prix réellement payé, mais aussi la batterie, les équipements, les conditions de garantie, le SAV, la disponibilité des pièces et les frais de livraison ou d’immatriculation applicables.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE PRIX 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Combien coûte une voiture sans permis électrique en 2026 ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Le prix affiché n’est qu’une partie du budget. Pour comparer correctement deux voitures sans permis électriques, il faut distinguer l’achat du véhicule des frais qui accompagnent son utilisation : assurance, immatriculation, livraison éventuelle, recharge, entretien et réparations.
        </p>

        <h2>1. Commencez par le prix réellement affiché du véhicule</h2>
        <p>
          Au 19 août 2026, NeoDrive affiche trois versions de sa voiture sans permis électrique : la version Essentiel à 3 990 € TTC, la version Confort à 4 990 € TTC et la version Confort Plus+ à 5 990 € TTC.
        </p>
        <p>
          Ces tarifs correspondent aux prix publics visibles sur le site à cette date. Ils peuvent évoluer : vérifiez toujours la page des véhicules avant de prendre une décision ou de comparer une offre avec une autre.
        </p>
        <p><a href="/produit">Voir les versions et tarifs NeoDrive actuels →</a></p>

        <h2>2. Comparez ce qui est inclus dans chaque version</h2>
        <p>
          Deux véhicules affichés à des prix différents ne proposent pas nécessairement le même niveau d’équipement, la même batterie, le même délai, ni les mêmes conditions de garantie et d’assistance. Un comparatif utile doit donc regarder le contenu de l’offre et pas seulement le chiffre écrit sur l’annonce.
        </p>
        <p>
          Chez NeoDrive, les trois versions actuellement affichées ont des niveaux d’équipement et des conditions commerciales différents. La page Véhicules reste la référence pour connaître ce qui est inclus dans chaque version au moment de l’achat.
        </p>

        <h2>3. L’assurance fait partie du budget obligatoire</h2>
        <p>
          Une voiture sans permis doit être assurée. En revanche, il n’existe pas un tarif unique valable pour tout le monde : le prix dépend notamment du profil du conducteur, du véhicule, du niveau de couverture et de l’assureur.
        </p>
        <p>
          Pour établir un budget sérieux, demandez donc un devis d’assurance avec les caractéristiques exactes du véhicule envisagé. Évitez les estimations génériques trouvées en ligne lorsqu’elles ne correspondent pas à votre situation.
        </p>
        <p><a href="/assurance-voiture-sans-permis">Lire le guide assurance voiture sans permis →</a></p>

        <h2>4. Immatriculation et documents : vérifiez ce qui est compris</h2>
        <p>
          Un véhicule neuf destiné à circuler doit être immatriculé. La démarche peut, selon le cas, être effectuée par le professionnel vendeur ou par l’acheteur via les services officiels. Le coût dépend de la situation administrative et ne doit pas être supposé à partir d’un montant standard non vérifié.
        </p>
        <p>
          Avant de signer, demandez clairement quels documents sont fournis, qui effectue la démarche et quels frais éventuels restent à votre charge.
        </p>
        <p><a href="/carte-grise">Voir le guide carte grise NeoDrive →</a></p>

        <h2>5. Ajoutez la livraison si vous ne retirez pas le véhicule sur place</h2>
        <p>
          NeoDrive indique proposer la livraison en France. Le prix et le délai exacts dépendent toutefois de la destination et des conditions du moment. Il faut donc demander un devis de livraison précis avant de calculer le budget final.
        </p>
        <p>
          Si vous comparez plusieurs vendeurs, vérifiez toujours si le prix annoncé correspond à un retrait sur place ou à un véhicule effectivement livré chez vous.
        </p>
        <p><a href="/livraison">Consulter les informations de livraison →</a></p>

        <h2>6. Pour la recharge, utilisez une formule plutôt qu’un chiffre approximatif</h2>
        <p>
          Le coût de recharge dépend de la quantité d’électricité réellement consommée et du tarif de votre contrat d’électricité. Un prix fixe annoncé sans connaître ces deux données peut donc être trompeur.
        </p>
        <p>
          La méthode la plus simple consiste à multiplier l’énergie consommée pour une recharge, en kWh, par votre prix du kWh. Pour un calcul réaliste, utilisez les caractéristiques de la batterie du véhicule concerné et votre facture d’électricité actuelle.
        </p>

        <h2>7. Entretien et batterie doivent être intégrés au coût de possession</h2>
        <p>
          Même électrique, une voiture sans permis reste un véhicule qui nécessite des contrôles, des pièces d’usure et parfois des réparations. Pneus, freinage, éléments de carrosserie, composants électriques et batterie peuvent influencer le coût à long terme.
        </p>
        <p>
          Avant d’acheter, vérifiez donc la disponibilité des pièces, le fonctionnement du SAV et les conditions de garantie. NeoDrive met actuellement en avant un SAV et des pièces disponibles en France.
        </p>
        <p><a href="/sav">Découvrir le SAV NeoDrive →</a> <a href="/pieces">Voir les pièces détachées →</a></p>

        <h2>8. Le bon calcul : prix d’achat + frais certains + marge de sécurité</h2>
        <p>
          Pour éviter les mauvaises surprises, construisez votre budget en trois colonnes : prix du véhicule, frais certains au moment de l’achat, puis dépenses d’usage. Les frais certains peuvent inclure l’assurance, l’immatriculation ou la livraison selon votre situation. Les dépenses d’usage regroupent notamment recharge et entretien.
        </p>
        <p>
          Cette méthode permet de comparer deux offres sur une base homogène, même lorsqu’un vendeur inclut certains services et qu’un autre les facture séparément.
        </p>

        <h2>9. Quel budget prévoir chez NeoDrive aujourd’hui ?</h2>
        <p>
          Le point de départ vérifié au 19 août 2026 est simple : 3 990 € TTC pour Essentiel, 4 990 € TTC pour Confort et 5 990 € TTC pour Confort Plus+. Le budget final dépend ensuite de votre choix de version et des frais applicables à votre situation.
        </p>
        <p>
          Si votre priorité est le prix d’entrée, commencez par comparer Essentiel avec vos besoins réels. Si vous recherchez davantage d’équipement, un délai différent ou des conditions de garantie spécifiques, comparez la fiche de la version Confort ou Confort Plus+ avant de décider.
        </p>
        <p><a href="/prix-voiture-sans-permis">Voir aussi notre guide général sur le prix d’une voiture sans permis →</a></p>

        <h2>FAQ sur le prix d’une voiture sans permis électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous voulez calculer votre budget NeoDrive exact ?</h2>
          <p>
            Consultez d’abord la version qui correspond à votre usage, puis demandez les frais réellement applicables à votre situation : disponibilité, livraison et démarches éventuelles. Vous pourrez ainsi comparer un coût complet, pas seulement un prix d’appel.
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
