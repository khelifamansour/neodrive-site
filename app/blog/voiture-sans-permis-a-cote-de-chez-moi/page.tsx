import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/voiture-sans-permis-a-cote-de-chez-moi`;

export const metadata: Metadata = {
  title: "Voiture sans permis à côté de chez moi : comment acheter sans concession locale ? | NeoDrive",
  description:
    "Comment acheter une voiture sans permis près de chez vous sans concession locale : vidéos réelles, choix du modèle, préparation, livraison, SAV et points à vérifier.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Voiture sans permis à côté de chez moi : acheter sans concession locale",
    description:
      "Un guide concret pour voir, comparer et recevoir une voiture sans permis lorsque le vendeur n’a pas de concession dans votre ville.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Voiture sans permis à côté de chez moi : comment acheter sans concession locale ?",
  description: metadata.description,
  datePublished: "2026-09-04",
  dateModified: "2026-09-04",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Faut-il obligatoirement une concession NeoDrive dans ma ville pour acheter ?",
    a: "Non. NeoDrive peut présenter le véhicule à distance avec des photos et vidéos réelles, expliquer les versions disponibles puis organiser une livraison en France selon les disponibilités et le planning logistique.",
  },
  {
    q: "Peut-on voir la voiture avant de décider ?",
    a: "Oui. Vous pouvez demander des photos et vidéos du véhicule ainsi qu’une présentation à distance. L’objectif est de vérifier l’état, l’équipement et les points qui comptent pour vous avant la livraison.",
  },
  {
    q: "NeoDrive possède-t-elle une concession dans chaque ville ?",
    a: "Non. Les pages locales NeoDrive n’indiquent pas l’existence d’une concession dans chaque ville. Elles expliquent comment découvrir le véhicule à distance et organiser une livraison dans la région concernée.",
  },
  {
    q: "La livraison d’une voiture sans permis est-elle possible partout en France ?",
    a: "NeoDrive propose la livraison en France. Le délai, le coût éventuel et les conditions précises sont confirmés avant la livraison en fonction du véhicule, de la destination et du planning.",
  },
  {
    q: "Que faut-il vérifier avant un achat à distance ?",
    a: "Demandez le prix final, la version exacte, les équipements, les conditions de livraison, les documents prévus, les conditions de SAV et toute information technique importante pour votre usage. N’acceptez pas une promesse d’autonomie, de délai ou de garantie qui n’est pas clairement confirmée.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>GUIDE LOCAL</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Voiture sans permis à côté de chez moi : comment acheter sans concession locale ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Vous cherchez une voiture sans permis près de chez vous, mais aucune concession de la marque que vous regardez n’est installée dans votre ville ? Ce n’est plus forcément un obstacle. Le plus important est de pouvoir voir le véhicule réel, obtenir des informations vérifiables et connaître précisément l’organisation de la livraison et du SAV.
        </p>

        <h2>« À côté de chez moi » ne veut pas forcément dire « concession dans ma ville »</h2>
        <p>
          Lorsqu’un acheteur recherche une voiture sans permis à proximité, il cherche généralement trois choses : pouvoir voir ce qu’il achète, éviter un déplacement inutile et savoir qui l’aidera en cas de problème. Une concession locale peut répondre à ces besoins, mais ce n’est pas la seule organisation possible.
        </p>
        <p>
          NeoDrive est une marque toulousaine et ne prétend pas disposer d’une concession dans chaque ville. Le fonctionnement présenté actuellement sur le site repose sur des véhicules réels visibles en photos et vidéos, une présentation à distance et une livraison organisée en France selon le planning disponible.
        </p>
        <p><a href="/voiture-sans-permis">Voir les pages NeoDrive par ville →</a></p>

        <h2>1. Commencez par voir le véhicule réel</h2>
        <p>
          Pour un achat à distance, une fiche commerciale ne suffit pas. Demandez à voir des photos récentes du véhicule, l’intérieur, l’extérieur et les équipements importants pour vous. Une vidéo personnalisée permet aussi de poser des questions pendant la présentation et de vérifier qu’il s’agit bien du véhicule ou de la configuration annoncée.
        </p>
        <p>
          NeoDrive met actuellement en avant des photos et vidéos réelles de ses véhicules et permet de demander une présentation avant la décision d’achat.
        </p>
        <p><a href="/videos">Voir les vidéos NeoDrive →</a></p>

        <h2>2. Faites confirmer la version et le prix au moment de votre décision</h2>
        <p>
          Une voiture sans permis peut exister en plusieurs versions avec des équipements, batteries, délais ou conditions commerciales différents. Demandez donc une confirmation claire de la version proposée et de ce qui est inclus.
        </p>
        <p>
          Au 4 septembre 2026, le site NeoDrive affiche une gamme de voitures sans permis électriques neuves à partir de 3 990 € TTC. Comme les prix, disponibilités et délais peuvent évoluer, vérifiez toujours les conditions correspondant au véhicule disponible au moment de votre achat.
        </p>
        <p><a href="/produit">Voir l’offre NeoDrive actuellement affichée →</a></p>

        <h2>3. Demandez comment la voiture sera préparée</h2>
        <p>
          La distance ne doit pas supprimer les vérifications avant remise. Demandez ce qui est contrôlé avant livraison, comment les documents seront préparés et à quel moment vous recevrez les informations nécessaires pour prendre possession du véhicule.
        </p>
        <p>
          Le site NeoDrive indique que ses véhicules sont préparés et contrôlés avant livraison. Les conditions exactes liées à votre véhicule doivent néanmoins être confirmées lors de l’organisation du rendez-vous.
        </p>

        <h2>4. Clarifiez la livraison avant de vous engager</h2>
        <p>
          Pour une livraison à plusieurs centaines de kilomètres, demandez l’adresse de remise, le créneau prévu, le coût éventuel, la procédure en cas de report et ce qui se passe au moment de la réception. Une réponse précise vaut mieux qu’une promesse de livraison « rapide » sans date ni conditions.
        </p>
        <p>
          NeoDrive propose actuellement la livraison en France et organise le rendez-vous directement avec le client. Le délai et les conditions exactes dépendent notamment du véhicule disponible, de la destination et du planning logistique.
        </p>
        <p><a href="/livraison">Comprendre la livraison NeoDrive →</a></p>

        <h2>5. Vérifiez le SAV comme si le vendeur était loin de chez vous</h2>
        <p>
          Avant d’acheter, posez une question simple : « Si j’ai un problème après la livraison, comment cela se passe-t-il concrètement ? » Demandez l’interlocuteur à contacter, la procédure de diagnostic, la disponibilité des pièces et les conditions applicables à votre version.
        </p>
        <p>
          NeoDrive met en avant un SAV en France, un accompagnement et la disponibilité de pièces détachées. Les garanties et niveaux de prise en charge pouvant varier selon la version et la période d’achat, demandez toujours les conditions écrites à jour.
        </p>
        <p><a href="/sav">Voir le fonctionnement du SAV →</a> · <a href="/pieces">Voir la page pièces →</a></p>

        <h2>6. Utilisez les pages locales sans confondre présence commerciale et agence physique</h2>
        <p>
          Une page « voiture sans permis Paris », « Lyon », « Lille » ou « Strasbourg » peut être utile pour expliquer comment la livraison fonctionne dans cette zone. Elle ne doit toutefois pas vous faire croire qu’une agence physique existe si ce n’est pas le cas.
        </p>
        <p>
          Les pages locales NeoDrive indiquent explicitement qu’elles servent à présenter le véhicule à distance et à expliquer l’organisation d’une livraison dans la région. C’est une information importante lorsque vous comparez plusieurs vendeurs.
        </p>

        <h2>La checklist avant d’acheter une voiture sans permis loin de chez vous</h2>
        <ul>
          <li>Photos et vidéos réelles du véhicule ou de la configuration proposée.</li>
          <li>Version exacte et équipements confirmés.</li>
          <li>Prix TTC final et éventuels frais annexes.</li>
          <li>Disponibilité réelle et délai confirmé.</li>
          <li>Organisation de la préparation et des documents.</li>
          <li>Adresse, conditions et coût éventuel de livraison.</li>
          <li>Conditions de garantie applicables au véhicule précis.</li>
          <li>Procédure SAV et disponibilité des pièces.</li>
          <li>Coordonnées claires de l’entreprise et interlocuteur identifié.</li>
        </ul>

        <h2>Le bon critère : proximité physique ou qualité du service ?</h2>
        <p>
          Pour certains acheteurs, une concession à quelques kilomètres reste la solution la plus confortable. Pour d’autres, une présentation vidéo sérieuse, un véhicule documenté, une livraison organisée et un SAV clair peuvent compenser l’absence d’agence locale.
        </p>
        <p>
          Le bon choix n’est donc pas simplement le vendeur le plus proche sur une carte. Comparez surtout la qualité des informations avant achat, la transparence sur les conditions commerciales et la manière dont l’entreprise gère réellement la livraison et l’après-vente.
        </p>

        <h2>FAQ : acheter une voiture sans permis près de chez soi</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous cherchez une NeoDrive dans votre région ?</h2>
          <p>
            Demandez les photos, une vidéo du véhicule, les disponibilités actuelles et les conditions de livraison pour votre département. Vous pourrez comparer avant de vous déplacer ou de réserver un véhicule.
          </p>
          <p>
            <a href="/voiture-sans-permis"><strong>Trouver votre ville →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
