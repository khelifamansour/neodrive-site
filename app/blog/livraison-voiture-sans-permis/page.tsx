import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/livraison-voiture-sans-permis`;

export const metadata: Metadata = {
  title: "Livraison voiture sans permis : comment ça se passe ? | NeoDrive",
  description: "Préparation, transport, réception et contrôle : découvrez comment organiser la livraison d’une voiture sans permis NeoDrive en France.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Livraison voiture sans permis : comment ça se passe ?",
    description: "Les étapes concrètes pour préparer, transporter et réceptionner une voiture sans permis NeoDrive en France.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Livraison voiture sans permis : comment ça se passe ?",
  description: metadata.description,
  datePublished: "2026-08-16",
  dateModified: "2026-08-16",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  { q: "NeoDrive livre-t-il les voitures sans permis en France ?", a: "Oui. NeoDrive propose la livraison en France. Le tarif dépend notamment du département et doit être vérifié au moment de la réservation." },
  { q: "Peut-on inspecter le véhicule à la réception ?", a: "La page livraison NeoDrive prévoit une inspection du véhicule avant paiement dans le cadre de sa livraison personnalisée." },
  { q: "Puis-je organiser moi-même le transport ?", a: "Oui. NeoDrive indique que le client peut organiser lui-même le transport ou faire appel à un transporteur spécialisé." },
  { q: "Comment connaître le prix exact de la livraison ?", a: "Le tarif est calculé selon le département. Consultez la page Livraison ou demandez une confirmation à NeoDrive avant de finaliser votre commande." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export default function Page() {
  return <main style={{maxWidth:900,margin:"50px auto",padding:"0 22px",fontFamily:"Arial",lineHeight:1.75,color:"#151515"}}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleJsonLd)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJsonLd)}} />
    <a href="/blog">← Guides NeoDrive</a>
    <article>
      <p style={{fontWeight:800,color:"#ff5a1f",marginTop:32}}>GUIDE LIVRAISON</p>
      <h1 style={{fontSize:"clamp(38px,6vw,64px)",lineHeight:1.02,letterSpacing:"-2px"}}>Livraison d’une voiture sans permis : comment ça se passe chez NeoDrive ?</h1>
      <p style={{fontSize:21,color:"#555"}}>Acheter une voiture sans permis à distance soulève une question très concrète : comment le véhicule arrive-t-il jusqu’à chez vous ? Voici le parcours à connaître pour préparer la réception d’une NeoDrive, sans mauvaise surprise.</p>

      <h2>1. La livraison se prépare dès la commande</h2>
      <p>La première étape consiste à définir le lieu de réception. NeoDrive propose la livraison en France et affiche une tarification par zones géographiques sur sa page dédiée. Comme un tarif ou une organisation logistique peuvent évoluer, vérifiez toujours le montant applicable à votre département au moment de la réservation.</p>
      <p><a href="/livraison">Consulter les modalités et tarifs de livraison NeoDrive →</a></p>

      <h2>2. Le véhicule est préparé avant son départ</h2>
      <p>Une livraison automobile ne se résume pas à déplacer un véhicule d’un point A à un point B. Avant le transport, il faut s’assurer que le véhicule destiné au client est identifié et prêt pour sa remise. Pour toute question sur le véhicule, ses équipements ou les documents attendus, le plus sûr est de demander confirmation à l’équipe avant le départ.</p>
      <p><a href="/produit">Découvrir la gamme NeoDrive →</a></p>

      <h2>3. NeoDrive peut assurer une livraison personnalisée</h2>
      <p>La page Livraison de NeoDrive indique une livraison depuis Muret, près de Toulouse, avec transport du véhicule et organisation logistique. Elle précise également que l’assurance transport est comprise dans cette formule. Pour les destinations éloignées, le site présente aussi la possibilité de recourir à des transporteurs spécialisés.</p>

      <h2>4. Vous pouvez aussi choisir votre propre transporteur</h2>
      <p>Certains acheteurs préfèrent organiser eux-mêmes l’enlèvement. Cette possibilité est prévue : vous pouvez choisir un transporteur et coordonner l’enlèvement du véhicule. Les conditions de paiement ne sont pas nécessairement identiques à celles d’une livraison assurée directement par NeoDrive ; elles doivent donc être confirmées avant l’enlèvement.</p>

      <h2>5. À la réception, prenez quelques minutes pour contrôler le véhicule</h2>
      <p>La réception est le bon moment pour faire un contrôle visuel calme : carrosserie, vitrages, roues, accessoires remis avec le véhicule et état général. La page Livraison NeoDrive prévoit une inspection avant paiement dans le cadre de la livraison personnalisée. Si quelque chose vous semble anormal, signalez-le immédiatement plutôt que d’attendre.</p>

      <h2>6. Conservez les documents et les coordonnées du SAV</h2>
      <p>Après la remise, gardez ensemble les documents du véhicule et les informations utiles à son suivi. NeoDrive met en avant un SAV en France et la disponibilité de pièces détachées. En cas de question après réception, utilisez le portail SAV afin de centraliser votre demande.</p>
      <p><a href="/sav">Accéder au SAV NeoDrive →</a> · <a href="/pieces">Voir les pièces détachées →</a></p>

      <h2>Livraison à domicile ou transporteur : que choisir ?</h2>
      <p>Il n’existe pas une solution idéale pour tout le monde. Une livraison organisée par NeoDrive simplifie la coordination. Un transporteur choisi par le client peut être pertinent lorsque celui-ci souhaite gérer lui-même le transport. Comparez surtout le coût total, le délai annoncé, les conditions d’assurance et les modalités de remise avant de décider.</p>

      <h2>FAQ sur la livraison d’une voiture sans permis</h2>
      {faq.map(({q,a})=><section key={q}><h3>{q}</h3><p>{a}</p></section>)}

      <section style={{marginTop:45,padding:28,borderRadius:22,background:"#f4f4f4"}}>
        <h2 style={{marginTop:0}}>Vous préparez l’achat de votre NeoDrive ?</h2>
        <p>Consultez la gamme, vérifiez les modalités de livraison correspondant à votre département et contactez NeoDrive si vous souhaitez confirmer l’organisation avant de réserver.</p>
        <p><a href="/produit"><strong>Voir les véhicules NeoDrive →</strong></a> &nbsp; <a href="/contact"><strong>Contacter NeoDrive →</strong></a></p>
      </section>
    </article>
  </main>;
}
