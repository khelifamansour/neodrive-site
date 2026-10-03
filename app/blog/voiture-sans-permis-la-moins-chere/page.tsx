import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-la-moins-chere`;

export const metadata: Metadata = {
  title: "Voiture sans permis la moins chère : prix vérifiés en 2026 | NeoDrive",
  description: "Quelle est la voiture sans permis la moins chère ? Comparez des prix publics vérifiés en septembre 2026 et surtout le coût réel de l’offre avant d’acheter.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Quelle est la voiture sans permis la moins chère ?",
    description: "Prix publics vérifiés, conditions des offres et méthode simple pour comparer une voiture sans permis sans se fier uniquement au prix d’appel.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Quelle est la voiture sans permis la moins chère ?",
  description: metadata.description,
  datePublished: "2026-09-07",
  dateModified: "2026-09-07",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quelle est la voiture sans permis neuve la moins chère ?",
    a: "Il n’existe pas de classement universel valable en permanence : les prix, primes et conditions changent. Au 7 septembre 2026, parmi les offres neuves électriques publiques vérifiées pour ce guide, NeoDrive affiche une version Essentiel à 3 990 € TTC, Citroën une Ami à partir de 8 490 € et Fiat une Topolino à partir de 7 750 € sous condition de reprise et prime CertiNergy déduite.",
  },
  {
    q: "Faut-il acheter uniquement selon le prix affiché ?",
    a: "Non. Vérifiez le prix TTC final, la version exacte, les équipements inclus, les frais éventuels, les conditions de l’offre, la disponibilité, la livraison, le SAV et les pièces.",
  },
  {
    q: "Une voiture sans permis d’occasion est-elle forcément moins chère ?",
    a: "Pas forcément au coût total. Le prix d’achat peut être plus bas, mais l’état du véhicule, de la batterie, les réparations à prévoir et l’historique peuvent changer fortement l’intérêt de l’offre.",
  },
  {
    q: "Quel est le prix d’entrée de NeoDrive ?",
    a: "Au 7 septembre 2026, le site NeoDrive affiche la version Essentiel à 3 990 € TTC. Le prix dépend de la version, de l’équipement et de la disponibilité, et doit être revérifié au moment de l’achat.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>PRIX & COMPARATIF 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Quelle est la voiture sans permis la moins chère ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Chercher « la voiture sans permis la moins chère » paraît simple. En réalité, un prix d’appel peut dépendre d’une prime, d’une reprise, d’un financement ou d’une version précise. Le bon réflexe est donc de comparer des prix publics datés et les conditions qui les accompagnent.
        </p>

        <h2>Prix publics vérifiés au 7 septembre 2026</h2>
        <p>
          Pour donner un repère concret, nous avons vérifié plusieurs offres neuves électriques directement sur les sites des marques. Ce relevé n’est pas un classement exhaustif de tout le marché et les prix peuvent évoluer.
        </p>
        <ul>
          <li><strong>NeoDrive Essentiel : 3 990 € TTC</strong>, prix affiché sur le site NeoDrive.</li>
          <li><strong>Fiat Topolino : à partir de 7 750 €</strong>, offre affichée sous condition de reprise et prime CertiNergy déduite.</li>
          <li><strong>Citroën Ami : à partir de 8 490 €</strong>, prix affiché par Citroën France.</li>
        </ul>
        <p>
          Sur cet échantillon précis et à cette date, NeoDrive affiche donc le prix d’entrée le plus bas. Cela ne signifie pas qu’il s’agit de la voiture sans permis la moins chère de façon absolue en France : promotions locales, stocks, occasions et conditions commerciales peuvent modifier la comparaison.
        </p>
        <p><a href="/produit">Voir les tarifs NeoDrive actuellement affichés →</a></p>

        <h2>Pourquoi le prix affiché ne suffit pas</h2>
        <p>
          Avant de comparer deux offres, vérifiez qu’elles couvrent réellement la même chose. Une offre peut intégrer une prime, exiger une reprise, concerner une location ou correspondre à un niveau d’équipement différent. Demandez donc toujours le prix TTC final de la version exacte que vous souhaitez acheter.
        </p>
        <p>
          Chez NeoDrive, la page produit précise que le prix dépend de la version, de l’équipement et de la disponibilité. La version Essentiel affichée à 3 990 € TTC comprend notamment le véhicule électrique neuf, la batterie et le chargeur 220 V.
        </p>

        <h2>Neuf ou occasion : où trouve-t-on le prix le plus bas ?</h2>
        <p>
          Une occasion peut coûter moins cher à l’achat, mais ce n’est pas automatiquement l’option la moins chère au total. Il faut regarder l’âge du véhicule, l’état de la batterie, les réparations prévisibles, les pneus, les freins, les documents et l’historique d’entretien.
        </p>
        <p>
          Un véhicule neuf coûte généralement plus cher qu’une occasion comparable, mais il offre une situation plus simple à évaluer : état initial connu, configuration claire et interlocuteur professionnel identifié. Le choix dépend donc de votre budget et de votre tolérance au risque de remise en état.
        </p>
        <p><a href="/blog/voiture-sans-permis-neuve-ou-occasion">Comparer voiture sans permis neuve et occasion →</a></p>

        <h2>Les 6 points à comparer avant de choisir la moins chère</h2>
        <ol>
          <li><strong>Le prix TTC final</strong> et les conditions nécessaires pour l’obtenir.</li>
          <li><strong>La version et les équipements inclus</strong>, afin de comparer des véhicules réellement équivalents.</li>
          <li><strong>La batterie et la recharge</strong>, uniquement à partir d’informations écrites et vérifiables.</li>
          <li><strong>Les frais supplémentaires</strong> éventuels : préparation, immatriculation, livraison ou options.</li>
          <li><strong>Le SAV et les pièces</strong>, importants après l’achat.</li>
          <li><strong>La disponibilité réelle</strong> et le délai correspondant à votre besoin.</li>
        </ol>

        <h2>Pourquoi une offre à bas prix peut rester intéressante</h2>
        <p>
          Un prix bas n’est pas en soi un défaut. Il devient intéressant lorsque le contenu de l’offre est clair, que le véhicule correspond à l’usage prévu et que l’après-vente est identifiable. NeoDrive se positionne précisément sur une mobilité électrique sans permis accessible, avec véhicules neufs, livraison en France, SAV et pièces.
        </p>
        <p>
          Le meilleur moyen de comparer est de demander, pour chaque offre, un récapitulatif écrit du prix, de la version, des équipements et des éventuels frais annexes. Vous évitez ainsi de comparer un prix comptant avec une mensualité, ou un tarif standard avec une offre soumise à prime ou reprise.
        </p>
        <p><a href="/prix-voiture-sans-permis">Consulter le guide prix NeoDrive →</a> · <a href="/livraison">Voir la livraison →</a> · <a href="/sav">Découvrir le SAV →</a></p>

        <h2>FAQ : voiture sans permis la moins chère</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous cherchez une voiture sans permis neuve à petit prix ?</h2>
          <p>
            Vérifiez les versions NeoDrive actuellement disponibles, demandez des photos ou une vidéo réelle et faites confirmer le prix et les conditions correspondant à votre dossier avant de décider.
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
