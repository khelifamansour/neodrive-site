import type { Metadata } from "next";
import GoogleReviews from "../_components/GoogleReviews";
import { pageMeta } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta(
  "/financement",
  "Financement voiture sans permis : simulation et dossier",
  "Financez votre voiture sans permis électrique NeoDrive : simulation de mensualités, dossier en ligne et réponse rapide. Vous êtes propriétaire.",
);

export default function Layout({children}:{children:React.ReactNode}){return <>{children}<GoogleReviews/></>}
