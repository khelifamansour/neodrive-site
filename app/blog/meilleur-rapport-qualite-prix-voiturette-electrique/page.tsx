import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/meilleur-rapport-qualite-prix-voiturette-electrique`;

export const metadata: Metadata = {
  title: "Meilleur rapport qualité-prix en voiturette électrique : comment comparer ? | NeoDrive",
  description: "Prix, équipement, batterie, SAV, pièces, livraison : les critères concrets pour comparer le rapport qualité-prix d’une voiturette électrique sans classement trompeur.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Quel est le meilleur rapport qualité-prix en voiturette électrique ?",
    description: "Une méthode simple pour comparer les voiturettes électriques sur des critères vérifiables, pas uniquement sur le prix affiché.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Quel est le meilleur rapport qualité-prix en voiturette électrique ?",
  description: metadata.description,
  datePublished: "2026-08-30",
  dateModified: "2026-08-30",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quelle est la meilleure voiturette électrique en rapport qualité-prix ?",
    a: "Il n’existe pas de meilleur choix universel. Le bon rapport qualité-prix dépend du prix final, des équipements réellement inclus, de la batterie, du SAV, de la disponibilité des pièces, de la livraison et de votre usage quotidien.",
  },
  {
    q: "Faut-il choisir la voiture sans permis la moins chère ?",
    a: "Pas forcément. Un prix d’achat bas doit être comparé à ce qui est inclus, aux conditions d’après-vente, à la disponibilité des pièces et aux éventuels frais supplémentaires. Le prix final et le service réel comptent davantage qu’un prix d’appel isolé.",
  },
  {
    q: "Comment comparer deux voiturettes électriques ?",
    a: "Demandez pour chaque véhicule le prix TTC final, la version exacte, les équipements inclus, les informations de batterie et de recharge, les conditions de garantie, l’organisation du SAV, la disponibilité des pièces et les modalités de livraison.",
  },
  {
    q: "Quel est le prix d’entrée d’une NeoDrive neuve ?",
    a: "Au 30 août 2026, le site NeoDrive affiche la version Essentiel à 3 990 € TTC. Les prix, équipements et disponibilités pouvant évoluer, il faut vérifier l’offre en vigueur au moment de l’achat.",
  },
  {
    q: "Pourquoi le SAV compte-t-il dans le rapport qualité-prix ?",
    a: "Parce qu’un véhicule ne se résume pas au jour de l’achat. Savoir qui contacter, comment obtenir un diagnostic et comment commander une pièce peut avoir une valeur importante pendant toute la durée d’utilisation.",
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
          Quel est le meilleur rapport qualité-prix en voiturette électrique ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Chercher la voiturette électrique « la moins chère » ne suffit pas. Le vrai rapport qualité-prix se juge sur ce que vous obtenez pour votre budget : véhicule neuf ou occasion, équipements réellement inclus, batterie, accompagnement après l’achat, pièces et livraison. Voici une méthode simple pour comparer sans classement artificiel.
        </p>

        <h2>1. Commencez par le prix final, pas par le prix d’appel</h2>
        <p>
          Deux annonces peuvent sembler proches alors qu’elles ne couvrent pas la même chose. Demandez toujours un prix TTC correspondant à une version précise et vérifiez ce qui est inclus : équipements, préparation, documents, livraison éventuelle et services associés.
        </p>
        <p>
          Au 30 août 2026, NeoDrive affiche publiquement une gamme neuve à partir de 3 990 € TTC pour la version Essentiel. Les autres versions affichées sont Confort à 4 990 € TTC et Confort Plus+ à 5 990 € TTC. Ces informations commerciales peuvent évoluer : vérifiez la page produit avant toute décision.
        </p>
        <p><a href="/produit">Voir les versions et tarifs NeoDrive actuellement affichés →</a></p>

        <h2>2. Comparez ce qui est réellement inclus</h2>
        <p>
          Un bon rapport qualité-prix ne signifie pas nécessairement accumuler les options. Il signifie obtenir les équipements utiles à votre usage sans payer pour des éléments dont vous n’avez pas besoin. Faites une liste courte : chauffage, caméra de recul, connectivité, type de batterie ou autres équipements qui comptent réellement pour vos trajets.
        </p>
        <p>
          Comparez ensuite les véhicules à version équivalente. Une voiture moins chère mais très dépouillée n’est pas directement comparable à une version plus équipée. À l’inverse, un équipement supplémentaire n’a de valeur que s’il vous est utile.
        </p>

        <h2>3. Batterie et recharge : demandez des informations vérifiables</h2>
        <p>
          La batterie est un point central sur une voiturette électrique. Demandez sa technologie, les conditions de recharge, les indications d’autonomie communiquées par le vendeur et les conditions dans lesquelles elles s’appliquent. Évitez de choisir uniquement sur un chiffre isolé.
        </p>
        <p>
          Pour NeoDrive, la page produit indique une recharge sur prise 220 V. Pour l’autonomie et les caractéristiques de chaque version, vérifiez toujours la fiche et l’offre du véhicule concerné au moment de l’achat.
        </p>
        <p><a href="/batterie-lithium-ou-plomb-voiture-sans-permis">Comprendre les différences entre batterie lithium et plomb →</a></p>

        <h2>4. Le SAV et les pièces font partie de la valeur du véhicule</h2>
        <p>
          Le rapport qualité-prix continue après la livraison. Avant d’acheter, posez des questions concrètes : qui répond en cas de panne ? Comment transmettre un diagnostic ? Les pièces sont-elles identifiées à partir du véhicule ? Comment une réparation est-elle organisée ?
        </p>
        <p>
          NeoDrive met en avant un SAV en France, un suivi par VIN et un catalogue de pièces. Le portail NeoDrive Care permet notamment d’ouvrir un dossier SAV avec le VIN, un symptôme, un code erreur éventuel et des photos ou vidéos.
        </p>
        <p><a href="/sav">Voir le fonctionnement de NeoDrive Care →</a> · <a href="/pieces">Consulter l’espace pièces →</a></p>

        <h2>5. La disponibilité et la livraison peuvent changer votre choix</h2>
        <p>
          Un véhicule peut être intéressant sur le papier mais mal adapté si son délai ne correspond pas à votre besoin. Demandez si la version choisie est disponible, en production ou attendue, et faites confirmer les modalités de livraison avant de vous engager.
        </p>
        <p>
          NeoDrive indique organiser des livraisons en France selon la destination, le planning et les possibilités de groupage. Les délais et conditions exacts doivent donc être vérifiés pour votre dossier.
        </p>
        <p><a href="/livraison">Voir les informations de livraison →</a></p>

        <h2>6. Utilisez une grille de comparaison très simple</h2>
        <p>Pour chaque voiturette que vous envisagez, notez les mêmes éléments :</p>
        <ul>
          <li>prix TTC final de la version réellement proposée ;</li>
          <li>équipements inclus et options éventuelles ;</li>
          <li>technologie de batterie et conditions de recharge ;</li>
          <li>conditions de garantie communiquées par écrit ;</li>
          <li>organisation du SAV et disponibilité des pièces ;</li>
          <li>délai et modalités de livraison ;</li>
          <li>adéquation avec vos trajets et votre budget.</li>
        </ul>
        <p>
          Cette méthode évite de transformer le « meilleur rapport qualité-prix » en slogan. Le meilleur choix est celui qui couvre correctement votre besoin avec un coût et un niveau de service que vous avez pu vérifier.
        </p>

        <h2>Pourquoi regarder NeoDrive dans ce comparatif ?</h2>
        <p>
          NeoDrive se positionne comme une marque toulousaine de voitures sans permis électriques neuves, avec une gamme accessible, une livraison organisée en France, un SAV et des pièces. Son intérêt dans une comparaison vient donc de l’ensemble « prix d’entrée + véhicule neuf + accompagnement », et non d’une promesse de supériorité absolue sur toutes les autres marques.
        </p>
        <p>
          Le plus utile est de demander la version disponible, ses équipements exacts et les conditions commerciales du moment, puis de la comparer point par point avec les alternatives que vous envisagez.
        </p>

        <h2>FAQ : rapport qualité-prix d’une voiturette électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous comparez plusieurs voitures sans permis ?</h2>
          <p>
            Demandez à NeoDrive les photos, la version disponible et les informations commerciales à jour. Vous pourrez ensuite utiliser la grille de ce guide pour comparer sur les mêmes critères.
          </p>
          <p>
            <a href="/produit"><strong>Découvrir la gamme NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
