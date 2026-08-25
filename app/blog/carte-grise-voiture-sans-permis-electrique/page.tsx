import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/carte-grise-voiture-sans-permis-electrique`;

export const metadata: Metadata = {
  title: "Carte grise d’une voiture sans permis électrique : démarches 2026 | NeoDrive",
  description: "Certificat d’immatriculation, documents, titulaire, démarche France Titres et points à vérifier pour une voiture sans permis électrique en 2026.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Carte grise d’une voiture sans permis électrique : démarches 2026",
    description: "Un guide pratique pour préparer l’immatriculation d’une voiturette électrique sans inventer les frais ni les délais.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Carte grise d’une voiture sans permis électrique : démarches 2026",
  description: metadata.description,
  datePublished: "2026-08-25",
  dateModified: "2026-08-25",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une voiture sans permis électrique doit-elle avoir une carte grise ?",
    a: "Oui. Le certificat d’immatriculation est obligatoire pour la mise en circulation d’un véhicule sur la voie publique en France. Une voiturette électrique immatriculable doit donc disposer de ce document.",
  },
  {
    q: "Où faire la demande d’immatriculation ?",
    a: "La démarche se fait en ligne via France Titres, anciennement ANTS, ou peut être confiée à un professionnel habilité. La procédure exacte dépend notamment du fait que le véhicule est neuf, d’occasion ou importé.",
  },
  {
    q: "Quels documents sont généralement demandés pour une première immatriculation ?",
    a: "France Titres mentionne notamment une demande d’immatriculation, une pièce d’identité, un justificatif de domicile et un certificat de conformité ou document équivalent. Des pièces supplémentaires peuvent être exigées selon l’origine et la situation du véhicule.",
  },
  {
    q: "Un mineur peut-il être propriétaire d’une voiture sans permis ?",
    a: "Le propriétaire et le titulaire principal du certificat d’immatriculation ne sont pas toujours la même personne. France Titres précise que si le propriétaire ne possède pas le titre de conduite requis, un titulaire principal répondant aux conditions doit être désigné ; pour un mineur, son représentant légal intervient dans la démarche.",
  },
  {
    q: "Combien coûte la carte grise d’une voiture sans permis électrique ?",
    a: "Le montant dépend des règles fiscales applicables et de la situation du véhicule. Il ne faut pas appliquer un tarif générique : vérifiez le montant calculé au moment de la démarche officielle ou par le professionnel habilité.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>IMMATRICULATION</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Carte grise d’une voiture sans permis électrique : démarches 2026
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Acheter une voiture sans permis électrique ne dispense pas des démarches d’immatriculation. Voici les points à vérifier pour préparer un dossier propre, éviter les confusions et savoir quels documents demander au vendeur.
        </p>

        <h2>Une voiture sans permis électrique doit-elle être immatriculée ?</h2>
        <p>
          Oui. France Titres rappelle que le certificat d’immatriculation, couramment appelé carte grise, est obligatoire pour la mise en circulation d’un véhicule sur la voie publique en France. Il identifie notamment le véhicule, son titulaire et certaines de ses caractéristiques administratives.
        </p>
        <p>
          Le terme « sans permis » concerne les conditions de conduite de certaines catégories de voiturettes ; il ne signifie pas « sans immatriculation ». Il faut donc bien distinguer le titre de conduite du conducteur et les documents administratifs du véhicule.
        </p>

        <h2>Quels documents préparer pour une première immatriculation ?</h2>
        <p>
          Pour une première immatriculation en France, France Titres indique notamment qu’une demande d’immatriculation, une pièce d’identité, un justificatif de domicile et un certificat de conformité délivré par le constructeur ou un document équivalent peuvent être nécessaires.
        </p>
        <p>
          La liste exacte dépend toutefois du dossier. Un véhicule importé, déjà immatriculé à l’étranger, acquis dans l’Union européenne ou acheté d’occasion peut nécessiter d’autres justificatifs. Il est donc important de suivre la procédure correspondant précisément au véhicule concerné.
        </p>

        <h2>Pourquoi le certificat de conformité est-il important ?</h2>
        <p>
          Le certificat de conformité, ou le document reconnu comme équivalent selon la situation, permet de relier le véhicule à ses caractéristiques d’homologation. Pour une voiturette, il est particulièrement important de vérifier la catégorie administrative réelle du véhicule plutôt que de se fier uniquement à sa présentation commerciale.
        </p>
        <p>
          Si le véhicule est destiné à un jeune conducteur, cette vérification est essentielle : les règles de conduite ne sont pas les mêmes pour un quadricycle léger et un quadricycle lourd. Vous pouvez consulter notre guide <a href="/blog/voiture-sans-permis-14-ans">sur la voiture sans permis à 14 ans</a> pour comprendre cette différence.
        </p>

        <h2>Qui doit être titulaire de la carte grise ?</h2>
        <p>
          France Titres précise que le titulaire principal d’un certificat d’immatriculation doit disposer du titre de conduite correspondant au véhicule lorsque celui-ci est requis. Il est néanmoins possible d’être propriétaire du véhicule sans être soi-même titulaire principal du certificat d’immatriculation.
        </p>
        <p>
          Si le propriétaire ne remplit pas les conditions de conduite, une autre personne répondant aux conditions peut être désignée comme titulaire principal. Pour un propriétaire mineur, le représentant légal intervient dans cette organisation administrative. Les situations particulières doivent être vérifiées directement lors de la démarche.
        </p>

        <h2>Comment faire la démarche ?</h2>
        <p>
          Les démarches d’immatriculation sont réalisées en ligne via France Titres, anciennement ANTS. Selon le cas, il est également possible de passer par un professionnel habilité. Pour une première immatriculation, France Titres propose une démarche dédiée dans laquelle les justificatifs sont transmis au format numérique.
        </p>
        <p>
          Un certificat provisoire d’immatriculation peut être délivré lorsque la procédure le permet. Il faut alors respecter les conditions et la durée de validité indiquées sur le document officiel avant de circuler.
        </p>

        <h2>Combien coûte la carte grise d’une voiturette électrique ?</h2>
        <p>
          Il n’est pas prudent d’annoncer un montant unique. Le coût dépend du véhicule, de la réglementation fiscale applicable au moment de l’immatriculation et de la situation du dossier. Les règles régionales ou nationales peuvent évoluer.
        </p>
        <p>
          Avant de finaliser l’achat, demandez donc soit une estimation issue de la démarche officielle, soit un calcul détaillé par un professionnel habilité. Évitez les annonces qui présentent un montant de carte grise comme universel sans préciser le contexte.
        </p>

        <h2>Et le contrôle technique ?</h2>
        <p>
          Depuis le 15 avril 2024, France Titres indique que les quadricycles motorisés, légers comme lourds, sont concernés par le contrôle technique selon le calendrier réglementaire applicable. Pour un véhicule neuf, un véhicule ancien ou une revente, les obligations ne sont donc pas les mêmes au même moment.
        </p>
        <p>
          Si vous achetez une voiturette d’occasion, vérifiez la situation du contrôle technique avant de signer. Pour un véhicule neuf, demandez au vendeur quels documents seront remis et à quelle date les premières obligations de contrôle s’appliqueront.
        </p>

        <h2>La checklist avant de lancer l’immatriculation</h2>
        <ul>
          <li>Vérifier le numéro d’identification du véhicule et sa catégorie administrative.</li>
          <li>Demander le certificat de conformité ou le document équivalent applicable.</li>
          <li>Préparer une pièce d’identité et un justificatif de domicile valides.</li>
          <li>Identifier correctement le propriétaire, le titulaire principal et les éventuels co-titulaires.</li>
          <li>Choisir la démarche France Titres correspondant exactement au véhicule : neuf, occasion ou importation.</li>
          <li>Vérifier le coût réellement calculé au moment de la demande, sans se fier à un montant générique.</li>
          <li>Contrôler l’éventuelle obligation de contrôle technique selon l’âge et la situation du véhicule.</li>
        </ul>

        <h2>Que fournit NeoDrive ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques qui met en avant des véhicules neufs, un accompagnement en France, un SAV et des pièces détachées. Avant commande, demandez la liste exacte des documents remis avec la version envisagée et la manière dont l’immatriculation sera organisée dans votre dossier.
        </p>
        <p><a href="/carte-grise">Voir la page NeoDrive dédiée à la carte grise →</a></p>
        <p><a href="/produit">Découvrir les modèles NeoDrive →</a></p>
        <p><a href="/contact">Contacter NeoDrive →</a></p>

        <h2>Sources officielles à vérifier</h2>
        <p>
          Les démarches et règles administratives peuvent évoluer. Pour un dossier réel, vérifiez toujours les informations sur France Titres / ANTS et, lorsque votre situation l’exige, sur Service-Public.fr. Les informations de cet article sont un guide pratique et ne remplacent pas la décision de l’administration sur un dossier individuel.
        </p>

        <h2>FAQ : carte grise d’une voiture sans permis électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous préparez l’achat d’une voiturette électrique ?</h2>
          <p>
            Demandez à NeoDrive les informations sur le véhicule, les documents disponibles et l’accompagnement prévu pour votre dossier. Vous pourrez ensuite finaliser l’immatriculation avec les justificatifs adaptés à votre situation.
          </p>
          <p>
            <a href="/produit"><strong>Découvrir NeoDrive →</strong></a>{" "}
            <a href="/contact"><strong>Poser une question →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
