import type { Metadata } from "next";
import GoogleReviews from "../_components/GoogleReviews";
import { pageMeta } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta(
  "/livraison",
  "Livraison de voiture sans permis à domicile en France",
  "Votre voiture sans permis électrique NeoDrive livrée jusqu’à votre porte partout en France. Prix selon votre département, paiement à la livraison.",
);

export default function Layout({children}:{children:React.ReactNode}){return <>{children}<GoogleReviews/></>}
