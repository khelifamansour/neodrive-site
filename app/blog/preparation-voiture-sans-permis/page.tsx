import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/preparation-voiture-sans-permis`;

export const metadata: Metadata = {
  title: "Préparation d’une voiture sans permis avant livraison | NeoDrive",
  description: "Découvrez les coulisses de la préparation d’une NeoDrive avant livraison : vérification du véhicule, équipements, documents, présentation et organisation de la remise.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Comment une NeoDrive est préparée avant sa livraison",
    description: "Les points clés à vérifier avant la remise d’une voiture sans permis électrique neuve, de l’identification du véhicule à la livraison au client.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Les coulisses de la préparation d’une NeoDrive avant livraison",
  description: metadata.description,
  datePublished: "2026-08-20",
  dateModified: "2026-08-20",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une NeoDrive est-elle vérifiée avant livraison ?",
    a: "Oui. NeoDrive indique publiquement que ses véhicules sont préparés et vérifiés avant livraison. Le détail des contrôles peut varier selon la version et le véhicule.",
  },
  {
    q: "Peut-on voir le véhicule avant qu’il soit livré ?",
    a: "Oui. NeoDrive indique pouvoir transmettre des photos et vidéos réelles du véhicule et propose aussi une présentation à distance selon le besoin du client.",
  },
  {
    q: "Quels documents sont fournis avec une NeoDrive ?",
    a: "NeoDrive indique fournir la facture ainsi que les documents nécessaires à l’immatriculation. Les documents exacts dépendent du dossier et doivent être vérifiés avant la remise.",
  },
  {
    q: "NeoDrive livre-t-elle partout en France ?",
    a: "NeoDrive indique proposer la livraison en France, à domicile ou en point relais selon l’organisation retenue. Les délais et tarifs exacts doivent être confirmés au moment de la commande.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>COULISSES NEODRIVE</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Les coulisses de la préparation d’une NeoDrive avant livraison
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une voiture sans permis neuve ne devrait pas simplement passer du stock au camion. Avant la remise au client, il faut s’assurer que le bon véhicule est identifié, que sa présentation est correcte, que les équipements attendus sont cohérents avec la version commandée et que le dossier de livraison est prêt. NeoDrive indique préparer et vérifier ses véhicules en France avant livraison.
        </p>

        <h2>1. Identifier précisément le véhicule et la version commandée</h2>
        <p>
          La première étape est administrative autant que pratique : rapprocher le véhicule du dossier client. Version, couleur, identification du véhicule et équipements commandés doivent correspondre à ce qui a été convenu.
        </p>
        <p>
          Cette étape évite une grande partie des erreurs simples : mauvais véhicule préparé, équipement attendu absent ou dossier incomplet au moment du départ.
        </p>
        <p><a href="/produit">Voir les versions NeoDrive actuellement proposées →</a></p>

        <h2>2. Faire une vérification générale avant la remise</h2>
        <p>
          NeoDrive indique publiquement que ses véhicules sont préparés et vérifiés avant livraison. Le détail exact des contrôles peut varier selon la version et le véhicule, mais l’objectif reste le même : détecter un défaut visible ou un problème fonctionnel avant que la voiture parte chez le client.
        </p>
        <p>
          Pour un acheteur, c’est un bon critère de comparaison entre vendeurs : demandez toujours ce qui est contrôlé avant livraison, qui réalise la préparation et comment un problème détecté est traité avant la remise.
        </p>

        <h2>3. Vérifier les équipements réellement présents</h2>
        <p>
          Les équipements dépendent de la version choisie. Sur les versions qui les incluent, il est utile de contrôler le fonctionnement des éléments de confort et d’usage quotidien annoncés : chauffage, ventilation, Bluetooth, USB, caméra de recul, alarme ou aides de conduite.
        </p>
        <p>
          Cette vérification doit toujours être faite par rapport à la fiche commerciale de la version concernée. Il ne faut pas supposer qu’un équipement présent sur une version l’est automatiquement sur toutes les autres.
        </p>

        <h2>4. Contrôler la présentation du véhicule</h2>
        <p>
          Un véhicule neuf doit aussi être présenté correctement au client. Une inspection visuelle permet de repérer avant livraison une trace liée au transport, un élément intérieur mal repositionné ou un accessoire à remettre en place.
        </p>
        <p>
          Ce contrôle de présentation est différent d’un diagnostic mécanique : il sert surtout à éviter qu’un détail visible découvert à la réception crée un doute inutile sur l’état du véhicule.
        </p>

        <h2>5. Envoyer des photos ou une vidéo réelle du véhicule</h2>
        <p>
          NeoDrive met en avant la possibilité d’envoyer des photos et vidéos du véhicule avant le déplacement du client. Pour une vente à distance, c’est particulièrement utile : le client peut voir le véhicule réel plutôt qu’une simple photo de catalogue.
        </p>
        <p>
          Une présentation vidéo peut aussi permettre de montrer l’habitacle, le coffre, les commandes et les principaux équipements avant d’organiser la livraison.
        </p>
        <p><a href="/contact">Demander des photos ou une présentation NeoDrive →</a></p>

        <h2>6. Préparer les documents nécessaires</h2>
        <p>
          La préparation ne concerne pas uniquement la voiture. NeoDrive indique fournir la facture et les documents nécessaires à l’immatriculation. Avant la remise, il faut donc s’assurer que le dossier correspondant au véhicule est prêt et que les informations utiles au client sont disponibles.
        </p>
        <p>
          Les formalités peuvent varier selon la situation du client. Pour les questions de carte grise, il est préférable de vérifier les documents demandés au moment du dossier plutôt que de se fier à une liste ancienne.
        </p>
        <p><a href="/carte-grise">Consulter le guide carte grise NeoDrive →</a></p>

        <h2>7. Organiser le départ ou la livraison</h2>
        <p>
          Une fois le véhicule prêt, il reste à organiser sa remise. NeoDrive indique proposer la livraison en France, à domicile ou en point relais selon l’organisation retenue. Le client peut également se renseigner sur les autres possibilités de remise disponibles au moment de sa commande.
        </p>
        <p>
          Les délais et tarifs de livraison étant susceptibles d’évoluer, ils doivent toujours être confirmés avant de planifier la remise du véhicule.
        </p>
        <p><a href="/livraison">Voir les informations de livraison actuelles →</a></p>

        <h2>Pourquoi cette préparation compte autant que le prix</h2>
        <p>
          Sur une voiture sans permis neuve, le prix est important, mais l’expérience d’achat ne s’arrête pas au tarif affiché. Une préparation claire, des documents prêts, la possibilité de voir le véhicule réel et un interlocuteur après l’achat réduisent les incertitudes pour le client.
        </p>
        <p>
          NeoDrive se positionne précisément sur cette logique d’accompagnement : véhicule neuf, préparation en France, livraison possible, SAV et pièces détachées disponibles.
        </p>
        <p><a href="/sav">Découvrir le SAV NeoDrive →</a> <a href="/pieces">Voir les pièces détachées →</a></p>

        <h2>La checklist utile avant de recevoir une voiture sans permis</h2>
        <p>
          Avant la livraison, confirmez la version et la couleur, demandez si possible des images du véhicule réel, vérifiez les équipements prévus, préparez les documents d’immatriculation et faites confirmer les conditions pratiques de remise. Cette méthode simple permet d’arriver à la livraison avec beaucoup moins de questions ouvertes.
        </p>

        <h2>FAQ sur la préparation d’une NeoDrive</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous voulez voir une NeoDrive avant de vous décider ?</h2>
          <p>
            Demandez les photos, vidéos et disponibilités actuelles du véhicule qui vous intéresse. Vous pouvez aussi vérifier la version, l’organisation de la livraison et les services après-vente avant de commander.
          </p>
          <p>
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>{" "}
            <a href="/produit"><strong>Comparer les versions →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
