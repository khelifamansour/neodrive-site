import type { Metadata } from "next";
import { graph, organizationLd, productLd, breadcrumbLd, ldJson, pageMeta } from "../../lib/seo-meta";
import { CONFORT_STOCK, NOEL_ACTIVE } from "../../lib/seo-local";
import GoogleReviews from "../_components/GoogleReviews";
export const metadata: Metadata = pageMeta(
  "/produit",
  `NeoDrive Confort 4 990 € : voiture sans permis neuve ${CONFORT_STOCK}`,
  `NeoDrive Confort 4 990 € TTC : voiture sans permis électrique neuve 2 places, en stock, livrée chez vous en 2 à 3 semaines${NOEL_ACTIVE ? " (avant Noël)" : ""}. Photos réelles, 0 € d'acompte, paiement à la livraison, garantie 2 ans.`,
);
const ld = graph(organizationLd, productLd, breadcrumbLd([["Accueil", "/"], ["NeoDrive Confort", "/produit"]]));
const Ld = () => <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />;

export default function Layout({children}:{children:React.ReactNode}){return <><Ld />{children}<GoogleReviews/></>}
