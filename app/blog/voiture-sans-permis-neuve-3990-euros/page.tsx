import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-neuve-3990-euros`;

export const metadata: Metadata = {
  title: "Voiture sans permis neuve à partir de 3 990 € : que comprend réellement l’offre ? | NeoDrive",
  description:
    "NeoDrive affiche une voiture sans permis électrique neuve à partir de 3 990 € TTC. Voici ce qu’il faut vérifier dans l’offre, les équipements, la livraison et l’après-vente avant d’acheter.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Une voiture sans permis neuve à partir de 3 990 € : comment lire l’offre NeoDrive ?",
    description:
      "Un guide concret pour comprendre le prix d’entrée NeoDrive, comparer les versions et vérifier les conditions qui comptent vraiment avant l’achat.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Une voiture sans permis neuve à partir de 3 990 € : comment lire l’offre NeoDrive ?",
  description: metadata.description,
  datePublished: "2026-08-31",
  dateModified: "2026-08-31",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Peut-on réellement acheter une voiture sans permis NeoDrive neuve à 3 990 € TTC ?",
    a: "Au 31 août 2026, le site officiel NeoDrive affiche la version Essentiel à 3 990 € TTC. Comme toute information commerciale, ce tarif peut évoluer : il faut vérifier le prix et la disponibilité au moment de la commande.",
  },
  {
    q: "Que comprend la NeoDrive Essentiel à 3 990 € TTC ?",
    a: "La page produit NeoDrive indique notamment un véhicule électrique neuf, une batterie incluse, un chargeur 220 V inclus et deux places. Il faut toujours confirmer la configuration exacte du véhicule proposé avant achat.",
  },
  {
    q: "Pourquoi certaines versions NeoDrive coûtent-elles plus cher ?",
    a: "Les versions supérieures ajoutent des équipements et services. Le bon choix dépend donc de votre usage réel : il faut comparer la configuration, le délai, les équipements et les conditions commerciales plutôt que le prix seul.",
  },
  {
    q: "La livraison est-elle possible partout en France ?",
    a: "NeoDrive indique organiser des livraisons en France. Le prix, le délai et les modalités exactes dépendent du dossier et doivent être confirmés avant la commande.",
  },
  {
    q: "Que faut-il demander avant de réserver une voiture sans permis neuve ?",
    a: "Demandez le prix TTC de la version exacte, les équipements inclus, la disponibilité, le délai annoncé, les modalités de livraison, les conditions de garantie communiquées par écrit et le fonctionnement du SAV.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE PRIX & ACHAT</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Une voiture sans permis neuve à partir de 3 990 € : que comprend réellement l’offre ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Un prix d’appel n’a de valeur que s’il correspond à une offre réelle, lisible et comparable. Au 31 août 2026,
          NeoDrive affiche publiquement sa version Essentiel à 3 990 € TTC. Voici comment lire cette offre sans se limiter
          au chiffre affiché, et quels points vérifier avant de choisir votre voiture sans permis électrique.
        </p>

        <h2>1. Le prix de 3 990 € correspond à une version précise</h2>
        <p>
          Le site NeoDrive affiche actuellement la version Essentiel à 3 990 € TTC. Il ne s’agit donc pas d’un prix
          générique applicable à toutes les configurations : c’est le tarif public d’une version d’entrée de gamme à une
          date donnée.
        </p>
        <p>
          La première règle est simple : demandez toujours le nom exact de la version proposée et faites confirmer son prix
          au moment de l’achat. Les tarifs, disponibilités et délais peuvent évoluer avec le stock et les conditions
          commerciales.
        </p>
        <p><a href="/produit">Voir les versions NeoDrive actuellement affichées →</a></p>

        <h2>2. Que contient actuellement la version Essentiel ?</h2>
        <p>
          Sur la page produit NeoDrive consultée le 31 août 2026, la version Essentiel est présentée comme un véhicule
          électrique neuf avec batterie incluse, chargeur 220 V inclus et deux places. Ce sont les éléments publiquement
          affichés aujourd’hui.
        </p>
        <p>
          Avant toute commande, demandez néanmoins une confirmation écrite de la configuration exacte du véhicule qui vous
          sera livré. Une bonne comparaison ne doit jamais reposer sur une ancienne fiche, une photo d’une autre version ou
          un équipement supposé.
        </p>

        <h2>3. Ne comparez pas seulement « 3 990 € » à un autre prix</h2>
        <p>
          Deux voitures sans permis peuvent afficher des prix proches sans proposer le même niveau d’équipement ni le même
          accompagnement. Pour comparer correctement, mettez les offres sur une base identique : véhicule neuf ou occasion,
          version exacte, équipements réellement inclus, batterie, chargeur, disponibilité, livraison, SAV et pièces.
        </p>
        <p>
          Cette méthode évite une erreur fréquente : choisir une annonce parce qu’elle paraît moins chère puis découvrir que
          la configuration ou les services attendus ne sont pas inclus.
        </p>

        <h2>4. Quel intérêt à choisir une version plus équipée ?</h2>
        <p>
          Une version supérieure peut avoir du sens si vous utilisez réellement ses équipements au quotidien. Inversement,
          si votre besoin est simple et votre priorité est de réduire le budget d’achat, une version d’entrée de gamme peut
          être plus cohérente.
        </p>
        <p>
          NeoDrive affiche aussi une version Confort à un tarif supérieur, avec davantage d’équipements. Le bon choix n’est
          donc pas forcément « la moins chère » ou « la plus équipée » : c’est celle qui correspond le mieux à votre usage
          et à votre budget.
        </p>

        <h2>5. Vérifiez la disponibilité et le délai avant de décider</h2>
        <p>
          Le prix seul ne dit pas quand le véhicule pourra être livré. Selon la version, un véhicule peut être disponible,
          attendu ou nécessiter un délai plus long. Si vous avez une échéance précise — rentrée, reprise du travail,
          déplacement régulier — faites confirmer le délai avant de vous engager.
        </p>
        <p>
          Le site NeoDrive distingue justement les versions aussi par leur délai indicatif. Comme ces délais peuvent bouger,
          ils doivent être vérifiés au moment de la commande.
        </p>

        <h2>6. Livraison : demandez le coût et les modalités pour votre adresse</h2>
        <p>
          NeoDrive indique organiser la livraison en France. Pour savoir ce que cela représente dans votre budget réel,
          demandez un chiffrage ou une confirmation correspondant à votre destination et au planning envisagé.
        </p>
        <p>
          Vérifiez aussi ce qui se passe le jour de la livraison : prise de rendez-vous, contrôle du véhicule, documents et
          interlocuteur à contacter en cas de question.
        </p>
        <p><a href="/livraison">Comprendre la livraison NeoDrive →</a></p>

        <h2>7. Le SAV et les pièces doivent entrer dans votre comparaison</h2>
        <p>
          Une voiture sans permis reste un véhicule : le prix d’achat n’est donc qu’une partie de la décision. Avant de
          choisir, demandez comment joindre le SAV, comment une panne est diagnostiquée et comment les pièces nécessaires
          sont identifiées et expédiées.
        </p>
        <p>
          NeoDrive met en avant un SAV en France ainsi qu’un espace pièces. C’est un critère à comparer avec la même rigueur
          que le prix et l’équipement.
        </p>
        <p><a href="/sav">Voir le SAV NeoDrive →</a> · <a href="/pieces">Voir l’espace pièces →</a></p>

        <h2>8. Si vous financez, comparez le coût total</h2>
        <p>
          Un financement peut faciliter l’achat, mais une mensualité seule ne permet pas de comparer deux offres. Il faut
          regarder le montant financé, l’apport éventuel, la durée et le coût total indiqué dans la simulation avant tout
          engagement.
        </p>
        <p>
          NeoDrive propose une page dédiée aux simulations de financement et rappelle qu’une simulation n’est pas une
          acceptation de crédit.
        </p>
        <p><a href="/financement">Voir les informations de financement →</a></p>

        <h2>La checklist à utiliser avant l’achat</h2>
        <ul>
          <li>prix TTC de la version exacte ;</li>
          <li>équipements inclus dans cette version ;</li>
          <li>batterie et chargeur réellement fournis ;</li>
          <li>disponibilité et délai annoncés ;</li>
          <li>modalités et coût de livraison pour votre adresse ;</li>
          <li>conditions de garantie communiquées par écrit ;</li>
          <li>organisation du SAV et accès aux pièces ;</li>
          <li>coût total si vous choisissez un financement.</li>
        </ul>

        <h2>En résumé</h2>
        <p>
          Oui : au 31 août 2026, NeoDrive affiche bien une voiture sans permis électrique neuve à partir de 3 990 € TTC,
          via sa version Essentiel. Mais le bon réflexe est de considérer ce prix comme le début de la comparaison, pas sa
          conclusion. Confirmez toujours la version, l’équipement, le délai, la livraison et l’après-vente correspondant à
          votre dossier.
        </p>

        <h2>FAQ : voiture sans permis neuve à 3 990 €</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous voulez vérifier l’offre disponible aujourd’hui ?</h2>
          <p>
            Demandez à NeoDrive la version disponible, ses équipements exacts, son délai et les modalités de livraison pour
            votre adresse avant de décider.
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
