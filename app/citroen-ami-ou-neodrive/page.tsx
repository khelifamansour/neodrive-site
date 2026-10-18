import type { Metadata } from "next";

const SITE = "https://www.easydrive-auto.fr";
const URL = `${SITE}/citroen-ami-ou-neodrive`;

export const metadata: Metadata = {
  title: "Citroën Ami ou NeoDrive : comment choisir en 2026 ?",
  description:
    "Citroën Ami ou NeoDrive ? Comparez prix, recharge, équipements, SAV et usage quotidien avec des données vérifiées au 21 août 2026.",
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: URL,
    siteName: "NeoDrive",
    title: "Citroën Ami ou NeoDrive : le comparatif utile en 2026",
    description:
      "Un comparatif factuel pour choisir selon votre budget, vos équipements, votre recharge et l’accompagnement après l’achat.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Citroën Ami ou NeoDrive : comment choisir en 2026 ?",
  description: metadata.description,
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "NeoDrive", url: SITE },
  publisher: { "@type": "Organization", name: "NeoDrive", url: SITE },
};

const faq = [
  {
    q: "Quelle est la moins chère entre Citroën Ami et NeoDrive ?",
    a: "Au 21 août 2026, NeoDrive affiche une gamme à partir de 3 990 € TTC. Le store officiel Citroën affiche plusieurs configurations Ami autour de 7 990 € à 8 190 € TTC selon la version, hors coût de carte grise. Les tarifs peuvent évoluer : vérifiez toujours les offres au moment de l’achat.",
  },
  {
    q: "La Citroën Ami se recharge-t-elle sur une prise domestique ?",
    a: "Oui. Citroën indique une recharge sur prise domestique 220 V et un temps annoncé de 4 heures pour une charge complète dans ses caractéristiques actuelles.",
  },
  {
    q: "NeoDrive propose-t-elle plusieurs niveaux d’équipement ?",
    a: "Oui. NeoDrive affiche actuellement trois versions : Essentiel, Confort et Confort Plus+. Les équipements et conditions commerciales varient selon la version.",
  },
  {
    q: "Quel véhicule choisir pour le SAV ?",
    a: "Le bon choix dépend surtout du niveau d’accompagnement attendu près de chez vous. NeoDrive met en avant un SAV et des pièces disponibles en France. Pour Citroën, vérifiez le réseau et les conditions applicables dans votre zone avant l’achat.",
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

export default function CitroenAmiOuNeoDrivePage() {
  return (
    <main style={{ maxWidth: 920, margin: "50px auto", padding: "0 22px", fontFamily: "Arial", lineHeight: 1.75, color: "#151515" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <a href="/guide-voiture-sans-permis">← Guide voiture sans permis</a>

      <article>
        <p style={{ fontWeight: 800, color: "#ff5a1f", marginTop: 32 }}>COMPARATIF 2026</p>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", lineHeight: 1.02, letterSpacing: "-2px" }}>
          Citroën Ami ou NeoDrive : comment choisir ?
        </h1>
        <p style={{ fontSize: 21, color: "#555" }}>
          La Citroën Ami est devenue une référence de la mobilité électrique sans permis. NeoDrive se positionne sur le même besoin avec une approche différente : une gamme neuve, électrique, accessible et accompagnée en France. Le bon choix dépend moins du logo que de votre budget, de vos trajets, des équipements que vous attendez et du niveau de SAV dont vous avez besoin.
        </p>
        <p>
          Les prix et caractéristiques concurrentes ci-dessous ont été vérifiés sur le store officiel Citroën le 21 août 2026. Les informations NeoDrive sont issues du site officiel NeoDrive et de sa base produit interne vérifiée. Les offres commerciales peuvent évoluer.
        </p>

        <h2>Citroën Ami ou NeoDrive : les différences essentielles</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "24px 0" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: 12 }}>Critère</th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: 12 }}>Citroën Ami</th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: 12 }}>NeoDrive</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}><strong>Prix affiché</strong></td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Plusieurs configurations officielles autour de 7 990 € à 8 190 € TTC au 21/08/2026, hors carte grise</td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Essentiel 3 990 €, Confort 4 990 €, Confort Plus+ 5 990 € TTC au 21/08/2026</td>
              </tr>
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}><strong>Vitesse maximale annoncée</strong></td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>45 km/h</td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Vérifiez la fiche du véhicule livré et son homologation avant achat</td>
              </tr>
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}><strong>Recharge</strong></td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Prise domestique 220 V, 4 h annoncées</td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Recharge électrique ; les caractéristiques exactes dépendent de la version et doivent être vérifiées avant commande</td>
              </tr>
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}><strong>Équipements</strong></td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>Équipement variable selon la configuration Ami choisie</td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>La version Confort affiche notamment caméra de recul, chauffage, ventilation, Bluetooth/USB et alarme antivol</td>
              </tr>
              <tr>
                <td style={{ padding: 12 }}><strong>Après-vente</strong></td>
                <td style={{ padding: 12 }}>Réseau Citroën à vérifier selon votre localisation et l’offre choisie</td>
                <td style={{ padding: 12 }}>NeoDrive met en avant un SAV en France, une assistance et des pièces détachées disponibles</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>1. Le budget d’achat : l’écart est important</h2>
        <p>
          Le premier écart visible est le prix. Au 21 août 2026, le site NeoDrive affiche la version Essentiel à 3 990 € TTC, la Confort à 4 990 € TTC et la Confort Plus+ à 5 990 € TTC. Le store officiel Citroën affiche de son côté plusieurs configurations Ami autour de 7 990 € à 8 190 € TTC selon la version consultée, avec la carte grise en supplément.
        </p>
        <p>
          Cela ne signifie pas qu’un véhicule est automatiquement « meilleur » parce qu’il coûte moins cher. Il faut comparer ce que vous recevez réellement : équipements, disponibilité, délai, service après-vente, pièces, conditions de garantie et coût total de possession.
        </p>
        <p><a href="/prix-voiture-sans-permis">Comprendre le prix d’une voiture sans permis →</a></p>

        <h2>2. Citroën Ami : une fiche technique claire et standardisée</h2>
        <p>
          Citroën publie une fiche technique très détaillée pour l’Ami. Le constructeur annonce actuellement 45 km/h de vitesse maximale, une batterie lithium-ion de 5,4 kWh, une autonomie de 75 km selon la norme WMTC et une recharge complète annoncée en 4 heures sur prise domestique 220 V.
        </p>
        <p>
          Ces données sont utiles pour comparer, mais l’autonomie réelle de n’importe quel véhicule électrique dépend notamment de la température, du relief, de la charge, du style de conduite et du vieillissement de la batterie.
        </p>

        <h2>3. NeoDrive : choisir surtout par niveau d’équipement et budget</h2>
        <p>
          NeoDrive organise sa gamme en trois versions. La version Essentiel vise le prix d’accès le plus bas. La version Confort ajoute des équipements du quotidien comme la caméra de recul, le chauffage, la ventilation, le Bluetooth/USB et l’alarme antivol. La Confort Plus+ ajoute encore des prestations supplémentaires selon la configuration disponible.
        </p>
        <p>
          Pour éviter toute mauvaise surprise, demandez toujours la fiche exacte du véhicule qui vous est proposé : batterie, équipements présents, documents d’homologation, conditions de garantie, délai et modalités de livraison.
        </p>
        <p><a href="/produit">Voir les versions NeoDrive actuellement proposées →</a></p>

        <h2>4. La recharge : comparez votre usage réel, pas seulement un chiffre</h2>
        <p>
          La Citroën Ami a l’avantage d’une donnée constructeur publique simple : prise domestique 220 V et 4 heures annoncées pour une charge complète. Pour NeoDrive, les caractéristiques de recharge peuvent varier selon la version et la batterie ; elles doivent donc être confirmées sur la fiche du véhicule concerné avant achat.
        </p>
        <p>
          Dans la pratique, posez trois questions : où allez-vous recharger, combien de kilomètres faites-vous par jour et pouvez-vous laisser le véhicule branché plusieurs heures ? Pour beaucoup d’usages urbains et périurbains, la simplicité de recharge à domicile compte davantage qu’une puissance maximale de charge élevée.
        </p>

        <h2>5. Le SAV et les pièces peuvent faire la différence après l’achat</h2>
        <p>
          Un comparatif ne doit pas s’arrêter au jour de la livraison. Vérifiez qui répond en cas de panne, où trouver les pièces et comment une réparation est organisée. NeoDrive met en avant un SAV en France, une assistance et la disponibilité de pièces détachées. Citroën bénéficie de sa propre organisation de marque et de réseau ; la prise en charge concrète dépend de votre localisation et des conditions de l’offre achetée.
        </p>
        <p><a href="/sav">Découvrir le fonctionnement du SAV NeoDrive →</a> · <a href="/pieces">Voir les pièces détachées →</a></p>

        <h2>6. Pour quel profil la Citroën Ami est-elle pertinente ?</h2>
        <p>
          L’Ami peut être intéressante si vous recherchez un modèle très identifié, une fiche technique constructeur standardisée et l’écosystème d’une grande marque. Son format compact et ses caractéristiques officielles rendent aussi la comparaison simple avant achat.
        </p>

        <h2>7. Pour quel profil NeoDrive est-elle pertinente ?</h2>
        <p>
          NeoDrive vise surtout les acheteurs qui veulent réduire fortement le budget d’entrée tout en restant sur un véhicule électrique neuf et qui accordent de l’importance aux équipements de confort ainsi qu’à l’accompagnement après-vente. L’intérêt économique est particulièrement visible sur les versions Essentiel et Confort au regard des prix publics affichés actuellement.
        </p>

        <h2>Comment choisir sans se tromper ?</h2>
        <p>
          Avant de signer, comparez les deux véhicules sur votre propre situation : prix final réellement payé, carte grise, assurance, délai de livraison, autonomie adaptée à vos trajets, temps de recharge, équipements indispensables, garantie, disponibilité des pièces et solution de réparation près de chez vous.
        </p>
        <p>
          Ne choisissez pas uniquement sur une publicité ou un prix d’appel. Demandez une offre écrite et vérifiez les caractéristiques du véhicule exact qui vous sera livré.
        </p>
        <p><a href="/quelle-voiture-sans-permis-choisir">Voir notre guide pour choisir une voiture sans permis →</a></p>

        <h2>FAQ : Citroën Ami ou NeoDrive</h2>
        {faq.map(({ q, a }) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <section style={{ marginTop: 45, padding: 28, borderRadius: 22, background: "#f4f4f4" }}>
          <h2 style={{ marginTop: 0 }}>Vous hésitez encore entre Ami et NeoDrive ?</h2>
          <p>
            Demandez les photos, vidéos, disponibilités et caractéristiques de la NeoDrive réellement proposée, puis comparez-les avec l’offre Citroën Ami disponible aujourd’hui. Vous pourrez décider sur des éléments concrets plutôt que sur une impression.
          </p>
          <p>
            <a href="/contact"><strong>Contacter NeoDrive →</strong></a>{" "}
            <a href="/reservation"><strong>Voir les possibilités de réservation →</strong></a>
          </p>
        </section>
      </article>
    </main>
  );
}
