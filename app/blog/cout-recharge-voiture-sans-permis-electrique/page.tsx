import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/blog/cout-recharge-voiture-sans-permis-electrique`;

export const metadata: Metadata = {
  title: "Combien coûte la recharge d’une voiture sans permis électrique ? | NeoDrive",
  description:
    "Méthode simple pour calculer le coût réel d’une recharge de voiture sans permis électrique à domicile, avec exemples 2026 basés sur des tarifs publics vérifiés.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Coût de recharge d’une voiture sans permis électrique : calcul 2026",
    description:
      "Prix du kWh, quantité réellement tirée au compteur, heures creuses : voici comment calculer votre coût de recharge sans inventer la consommation du véhicule.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Combien coûte la recharge d’une petite voiture électrique sans permis ?",
  description: metadata.description,
  datePublished: "2026-09-02",
  dateModified: "2026-09-02",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Comment calculer le prix d’une recharge de voiture sans permis électrique ?",
    a: "Multipliez le nombre de kilowattheures réellement consommés pendant la recharge par le prix TTC du kWh de votre contrat d’électricité. Pour un calcul précis, utilisez la consommation mesurée à la prise ou au compteur plutôt qu’une estimation de capacité de batterie.",
  },
  {
    q: "Le coût est-il le même pour toutes les voitures sans permis électriques ?",
    a: "Non. Il dépend de l’énergie réellement tirée du réseau, du niveau de batterie au départ, du rendement de la recharge, du véhicule et du tarif d’électricité du foyer.",
  },
  {
    q: "Les heures creuses peuvent-elles réduire le coût de recharge ?",
    a: "Oui, si votre contrat comporte une option heures pleines/heures creuses et si la recharge a lieu pendant une plage d’heures creuses. Il faut comparer avec les conditions et prix de votre propre contrat.",
  },
  {
    q: "Peut-on donner un prix fixe par recharge pour une NeoDrive ?",
    a: "Non sans connaître la version exacte, le niveau de charge initial et l’énergie réellement consommée au compteur. NeoDrive recommande de calculer le coût à partir de vos propres mesures et du prix du kWh de votre contrat.",
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
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>BUDGET & RECHARGE 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Combien coûte la recharge d’une voiture sans permis électrique ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          Le bon calcul n’est pas « prix de la batterie × quelque chose ». Il faut regarder deux données concrètes : le nombre
          de kWh réellement tirés du réseau pendant la recharge et le prix TTC du kWh de votre contrat d’électricité.
        </p>

        <h2>1. La formule la plus fiable</h2>
        <p>
          Le calcul de base est simple : <strong>coût de recharge = énergie consommée à la prise (kWh) × prix du kWh (€ TTC)</strong>.
          Cette méthode évite d’inventer une consommation ou une capacité de batterie qui ne correspondrait pas à votre version
          de véhicule.
        </p>
        <p>
          Pour obtenir l’énergie réellement consommée, vous pouvez utiliser un compteur de prise adapté ou suivre la consommation
          mesurée par votre installation électrique. Cette valeur inclut ce que le réseau a réellement fourni pendant la recharge.
        </p>

        <h2>2. Quel prix du kWh utiliser en France en septembre 2026 ?</h2>
        <p>
          Le prix dépend de votre contrat. À titre de repère vérifié, EDF affiche au 1er août 2026, pour le Tarif Bleu résidentiel,
          un prix de <strong>20,01 centimes d’euro TTC par kWh</strong> en option Base pour certaines puissances usuelles. En option
          Heures Pleines / Heures Creuses, EDF affiche <strong>21,42 c€/kWh en heures pleines</strong> et <strong>15,89 c€/kWh en
          heures creuses</strong> pour les puissances concernées.
        </p>
        <p>
          Ces valeurs sont seulement des repères publics : votre facture peut utiliser un autre fournisseur, une autre offre ou
          une autre option tarifaire. La Commission de régulation de l’énergie a par ailleurs annoncé une hausse moyenne de 2,5 %
          TTC des tarifs réglementés au 1er août 2026.
        </p>

        <h2>3. Exemples de calcul, sans attribuer de consommation à un modèle</h2>
        <p>
          Prenons uniquement des scénarios mathématiques. Si votre compteur indique qu’une session de recharge a consommé
          <strong>5 kWh</strong>, avec un prix de 0,2001 € TTC/kWh, le coût variable de cette recharge est d’environ
          <strong>1,00 €</strong>. Avec <strong>10 kWh</strong> mesurés au même tarif, il serait d’environ <strong>2,00 €</strong>.
        </p>
        <p>
          En heures creuses à 0,1589 € TTC/kWh, les mêmes consommations mesurées donneraient environ <strong>0,79 € pour 5 kWh</strong>
          et <strong>1,59 € pour 10 kWh</strong>. Ces exemples ne sont pas des autonomies ni des capacités de batterie NeoDrive : ils
          servent uniquement à montrer comment appliquer la formule.
        </p>

        <h2>4. Pourquoi le prix d’une recharge complète n’est pas un chiffre fixe</h2>
        <p>
          Une recharge ne commence pas toujours avec une batterie au même niveau. Une session après un petit trajet consommera
          généralement moins d’énergie qu’une session après une utilisation plus importante. Le rendement de la recharge et les
          conditions d’utilisation peuvent aussi créer un écart entre l’énergie stockée dans la batterie et l’énergie facturée au compteur.
        </p>
        <p>
          C’est pour cette raison qu’un vendeur sérieux ne devrait pas annoncer un coût universel par recharge sans préciser le
          véhicule, la version, le niveau de batterie initial et le tarif électrique retenu.
        </p>

        <h2>5. Heures creuses : intéressant si votre contrat s’y prête</h2>
        <p>
          Avec une offre heures pleines / heures creuses, programmer la recharge pendant une plage creuse peut réduire le coût
          variable du kWh. Mais l’intérêt réel dépend de l’ensemble du contrat : prix de l’abonnement, prix des heures pleines,
          quantité d’électricité consommée et habitudes du foyer.
        </p>
        <p>
          Ne changez donc pas d’option tarifaire uniquement à partir d’un exemple de recharge. Comparez la facture globale de votre
          logement sur une période représentative.
        </p>

        <h2>6. Comment mesurer votre coût réel en trois recharges</h2>
        <ol>
          <li>notez l’énergie consommée au compteur ou à la prise pour chaque recharge ;</li>
          <li>relevez le prix TTC du kWh sur votre contrat ou votre facture ;</li>
          <li>multipliez les deux valeurs pour chaque session ;</li>
          <li>faites la moyenne de plusieurs recharges correspondant à votre usage habituel.</li>
        </ol>
        <p>
          Cette petite méthode donne une estimation beaucoup plus personnelle qu’un chiffre générique lu sur Internet.
        </p>

        <h2>7. Et pour une NeoDrive ?</h2>
        <p>
          NeoDrive est une marque toulousaine de voitures sans permis électriques, avec véhicules neufs, SAV et pièces en France.
          Le coût précis d’une recharge dépend de la version du véhicule et de vos conditions réelles d’utilisation ; il doit donc
          être calculé avec les données du véhicule concerné et votre propre tarif d’électricité.
        </p>
        <p>
          Avant achat, demandez les caractéristiques de la version réellement disponible et évitez de déduire une autonomie ou une
          consommation à partir d’un autre modèle.
        </p>
        <p>
          <a href="/produit">Voir la gamme NeoDrive →</a> ·{" "}
          <a href="/batterie-lithium-ou-plomb-voiture-sans-permis">Comprendre les technologies de batterie →</a> ·{" "}
          <a href="/blog/5-questions-avant-acheter-voiture-sans-permis-electrique">5 questions avant d’acheter →</a>
        </p>

        <h2>Sources tarifaires consultées</h2>
        <p>
          Les prix d’électricité changent. Les chiffres cités dans ce guide ont été vérifiés pour le 1er août 2026 et doivent être
          recontrôlés si vous lisez cet article plus tard.
        </p>
        <p>
          <a href="https://particulier.edf.fr/fr/accueil/guide-energie/electricite/prix-kwh-electricite.html" rel="noreferrer">
            EDF Particulier : prix du kWh et Tarif Bleu 2026 →
          </a>
        </p>
        <p>
          <a href="https://www.cre.fr/actualites/toute-lactualite/la-cre-propose-une-evolution-du-niveau-moyen-des-tarifs-reglementes-de-vente-de-lelectricite-de-25-ttc-au-1er-aout-2026.html" rel="noreferrer">
            CRE : évolution des tarifs réglementés au 1er août 2026 →
          </a>
        </p>

        <h2>FAQ : coût de recharge d’une voiture sans permis électrique</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous comparez le budget d’une voiturette électrique ?</h2>
          <p>
            Consultez la gamme NeoDrive puis demandez-nous la version disponible et ses caractéristiques exactes. Vous pourrez ensuite
            calculer votre coût de recharge avec votre propre prix du kWh, sans approximation trompeuse.
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
