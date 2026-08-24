import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/assurance-voiture-sans-permis-ce-quil-faut-verifier`;

export const metadata: Metadata = {
  title: "Assurance voiture sans permis : ce qu’il faut vérifier en 2026 | NeoDrive",
  description: "Responsabilité civile, garanties facultatives, conducteur, exclusions et devis : les points à vérifier avant d’assurer une voiture sans permis en France.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Assurance voiture sans permis : ce qu’il faut vérifier en 2026",
    description: "Un guide concret pour comparer une assurance de voiturette sans inventer de tarif et sans négliger les exclusions du contrat.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Assurance voiture sans permis : ce qu’il faut vérifier en 2026",
  description: metadata.description,
  datePublished: "2026-08-24",
  dateModified: "2026-08-24",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Une voiture sans permis doit-elle être assurée ?",
    a: "Oui. En France, une voiture sans permis est un véhicule terrestre à moteur et doit au minimum être couverte par la responsabilité civile.",
  },
  {
    q: "L’assurance au tiers suffit-elle légalement ?",
    a: "La responsabilité civile constitue la garantie obligatoire. Des garanties supplémentaires peuvent être ajoutées selon la valeur du véhicule, son usage et le niveau de protection recherché.",
  },
  {
    q: "Combien coûte une assurance voiture sans permis ?",
    a: "Il n’existe pas de tarif unique fiable. Le montant dépend notamment du conducteur, du véhicule, du lieu, de l’usage, des garanties, des franchises et des conditions propres à l’assureur. Un devis nominatif est indispensable.",
  },
  {
    q: "Faut-il encore afficher une vignette verte ?",
    a: "Pour les véhicules immatriculés, la vignette et la carte verte ne sont plus exigées depuis le 1er avril 2024. Le contrôle s’effectue via le Fichier des véhicules assurés.",
  },
  {
    q: "Que vérifier dans un devis d’assurance VSP ?",
    a: "Vérifiez au minimum le conducteur déclaré, les garanties, les franchises, les exclusions, l’assistance, les conditions de vol et d’incendie, ainsi que le montant total de la cotisation.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>ASSURANCE</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Assurance voiture sans permis : ce qu’il faut vérifier en 2026
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Une voiture sans permis reste un véhicule motorisé : elle doit être assurée. Le vrai sujet n’est donc pas de trouver un « prix moyen » approximatif, mais de vérifier que le contrat correspond au conducteur, au véhicule et à l’usage réel.
        </p>

        <h2>Quelle assurance est obligatoire pour une voiture sans permis ?</h2>
        <p>
          Le ministère de l’Économie rappelle que les voitures sans permis font partie des véhicules soumis à l’obligation d’assurance. La garantie minimale est la responsabilité civile, aussi appelée assurance au tiers : elle sert à indemniser les dommages causés à d’autres personnes lorsque la responsabilité du conducteur est engagée.
        </p>
        <p>
          Cette couverture minimale ne signifie pas que votre propre véhicule ou vos propres blessures seront automatiquement indemnisés. C’est pourquoi il faut lire les garanties du contrat, et pas seulement comparer le montant de la cotisation.
        </p>
        <p>
          <a href="https://www.economie.gouv.fr/particuliers/gerer-mon-argent/emprunter-et-sassurer/assurance-auto-moto-velo-trottinette-comment-ca-marche" target="_blank" rel="noreferrer">Source officielle : ministère de l’Économie →</a>
        </p>

        <h2>Quelles garanties facultatives faut-il comparer ?</h2>
        <p>
          Au-delà de la responsabilité civile, les assureurs peuvent proposer différentes protections : dommages au véhicule, vol, incendie, bris de glace, assistance ou protection du conducteur. Leur intérêt dépend de la valeur du véhicule, de son stationnement et de votre tolérance au risque.
        </p>
        <p>
          Pour une voiturette neuve, comparez notamment le coût d’une couverture plus large avec la franchise qui resterait à votre charge en cas de sinistre. Une formule plus chère n’est pas forcément plus protectrice si les franchises ou exclusions sont importantes.
        </p>

        <h2>Pourquoi NeoDrive ne donne pas un « prix d’assurance » unique</h2>
        <p>
          Un tarif générique serait peu fiable. Le prix peut varier selon le conducteur déclaré, le lieu de résidence, l’usage du véhicule, les garanties choisies, les franchises et les règles de souscription de l’assureur. Le bon réflexe est donc de demander un devis nominatif avant de finaliser l’achat.
        </p>
        <p>
          Si le véhicule est destiné à un jeune conducteur, indiquez clairement son âge et sa situation de conduite à l’assureur. Ne partez jamais du principe qu’un contrat souscrit pour un adulte couvrira automatiquement n’importe quel conducteur dans les mêmes conditions.
        </p>

        <h2>Les 7 points à contrôler sur le devis</h2>
        <ul>
          <li><strong>Le conducteur :</strong> qui est autorisé à conduire le véhicule et sous quelles conditions ?</li>
          <li><strong>La responsabilité civile :</strong> elle doit bien être incluse.</li>
          <li><strong>Les dommages au véhicule :</strong> collision, tous accidents, vol, incendie ou bris de glace selon la formule.</li>
          <li><strong>La protection du conducteur :</strong> vérifiez les plafonds et conditions d’indemnisation.</li>
          <li><strong>Les franchises :</strong> regardez ce qui restera réellement à votre charge après un sinistre.</li>
          <li><strong>Les exclusions :</strong> lisez les situations dans lesquelles l’assureur peut refuser ou limiter l’indemnisation.</li>
          <li><strong>L’assistance :</strong> vérifiez le dépannage, le remorquage et les éventuelles limites kilométriques.</li>
        </ul>

        <h2>Faut-il encore une vignette verte en 2026 ?</h2>
        <p>
          Pour les véhicules immatriculés, la vignette d’assurance et la carte verte ne sont plus obligatoires depuis le 1er avril 2024. Le contrôle de l’assurance s’effectue désormais via le Fichier des véhicules assurés. Cela ne supprime évidemment pas l’obligation d’être assuré.
        </p>
        <p>
          Après la souscription, vérifiez avec votre assureur que le véhicule est correctement enregistré et conservez les documents contractuels qui précisent vos garanties.
        </p>

        <h2>Que faire si aucun assureur ne veut couvrir le véhicule ?</h2>
        <p>
          Le ministère de l’Économie rappelle qu’en cas de refus d’assurance pour la garantie obligatoire de responsabilité civile, il existe une procédure auprès du Bureau central de tarification. Cette démarche est spécifique et ne remplace pas la comparaison normale de plusieurs assureurs.
        </p>

        <h2>Assurance et achat d’une NeoDrive : dans quel ordre procéder ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques, avec livraison en France, SAV et pièces. Avant la mise en circulation, demandez les informations d’identification du véhicule nécessaires à l’assureur et obtenez un devis correspondant au conducteur réel.
        </p>
        <p><a href="/assurance-voiture-sans-permis">Voir aussi notre page assurance voiture sans permis →</a></p>
        <p><a href="/produit">Découvrir les modèles NeoDrive →</a></p>
        <p><a href="/contact">Contacter NeoDrive →</a></p>

        <h2>FAQ : assurance voiture sans permis</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous préparez l’achat d’une voiturette électrique ?</h2>
          <p>
            Demandez d’abord les informations du véhicule, puis faites établir un devis d’assurance adapté au conducteur. NeoDrive peut vous présenter ses modèles et les documents disponibles pour préparer cette démarche.
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
