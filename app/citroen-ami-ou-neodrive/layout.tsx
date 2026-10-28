import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Citroën Ami ou NeoDrive ? Comparatif voiture sans permis",
  description: "Citroën Ami ou NeoDrive : comparez les équipements, les prix, la recharge et les modalités de livraison avant de choisir votre voiture sans permis électrique.",
  alternates: { canonical: "https://www.easydrive-auto.fr/citroen-ami-ou-neodrive" },
  openGraph: { title: "Alternative Citroën Ami : comparatif NeoDrive", description: "Comparez les voitures sans permis électriques selon vos besoins et votre budget.",url:"https://www.easydrive-auto.fr/citroen-ami-ou-neodrive",type:"website" },
};
export default function Layout({children}:{children:React.ReactNode}) {return children;}
