import type { Metadata } from "next";
import GoogleReviews from "../_components/GoogleReviews";
export const metadata: Metadata = {
  title: "NeoDrive Confort 4 990 € | Voiture sans permis électrique neuve",
  description: "Découvrez NeoDrive Confort : voiture sans permis électrique neuve, deux places, photos réelles, équipements et informations de livraison. Demandez votre devis.",
  alternates: { canonical:"https://www.easydrive-auto.fr/produit" },
  openGraph: {title:"NeoDrive Confort | Voiture sans permis électrique",description:"Photos réelles, équipements et prix de la NeoDrive Confort.",url:"https://www.easydrive-auto.fr/produit",type:"website"}
};
export default function Layout({children}:{children:React.ReactNode}){return <>{children}<GoogleReviews/></>}
