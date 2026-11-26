import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { pageMeta, graph, organizationLd, productLd, ldJson, SITE } from "../lib/seo-meta";
import { CONFORT_STOCK, NOEL_ACTIVE } from "../lib/seo-local";

export const metadata: Metadata = pageMeta(
  "/",
  `Voiture sans permis neuve 4 990 €, ${CONFORT_STOCK} | NeoDrive`,
  `Voiture sans permis électrique neuve NeoDrive : Confort 4 990 € TTC en stock, livrée chez vous en 2 à 3 semaines${NOEL_ACTIVE ? " (avant Noël)" : ""}. Essentielle 3 990 € sur commande. 0 € d'acompte, paiement à la livraison, garantie 2 ans.`,
);

const websiteLd = { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "NeoDrive", inLanguage: "fr-FR", publisher: { "@id": `${SITE}/#organization` } };

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(graph(organizationLd, websiteLd, productLd)) }} />
    <HomeClient />
  </>;
}
