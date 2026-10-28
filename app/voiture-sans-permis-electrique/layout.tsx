import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Voiture sans permis électrique neuve dès 3 990 € | NeoDrive",
  description: "Découvrez les voitures sans permis électriques NeoDrive : versions dès 3 990 € TTC, équipements, photos réelles et livraison possible partout en France. Demandez un devis.",
  alternates: { canonical: "https://www.easydrive-auto.fr/voiture-sans-permis-electrique" },
  openGraph: { title: "Voiture sans permis électrique | NeoDrive", description: "Découvrez les versions, les équipements et les photos réelles de nos voitures sans permis électriques.", url: "https://www.easydrive-auto.fr/voiture-sans-permis-electrique", type: "website" },
};
export default function Layout({children}:{children:React.ReactNode}) {return children;}
