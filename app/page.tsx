import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { pageMeta, graph, organizationLd, productLd, ldJson, SITE } from "../lib/seo-meta";

export const metadata: Metadata = pageMeta(
  "/",
  "NeoDrive : voiture sans permis électrique neuve dès 3 990 €",
  "Voiture sans permis électrique neuve NeoDrive dès 3 990 € TTC, Confort en stock. Livraison partout en France, paiement à la livraison, garantie 2 ans.",
);

const websiteLd = { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "NeoDrive", inLanguage: "fr-FR", publisher: { "@id": `${SITE}/#organization` } };

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(graph(organizationLd, websiteLd, productLd)) }} />
    <HomeClient />
  </>;
}
