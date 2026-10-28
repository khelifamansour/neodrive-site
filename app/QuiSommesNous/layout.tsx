import type { Metadata } from "next";
export const metadata: Metadata = {
  title:"Qui sommes-nous ? | NeoDrive, voitures sans permis électriques",
  description:"Découvrez NeoDrive, marque française basée près de Toulouse : modèle de distribution, préparation des véhicules, livraisons, pièces et accompagnement après achat.",
  alternates:{canonical:"https://www.easydrive-auto.fr/QuiSommesNous"},
  openGraph:{title:"NeoDrive : notre entreprise et nos engagements",description:"Découvrez qui nous sommes et comment nous préparons et livrons les voitures sans permis électriques.",url:"https://www.easydrive-auto.fr/QuiSommesNous",type:"website"}
};
export default function Layout({children}:{children:React.ReactNode}){return children;}
