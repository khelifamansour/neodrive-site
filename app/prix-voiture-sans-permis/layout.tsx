import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/prix-voiture-sans-permis", "Prix d’une voiture sans permis en 2026 : neuve ou occasion", "Combien coûte une voiture sans permis ? Prix neuf et occasion, frais de livraison, carte grise et assurance. NeoDrive électrique neuve dès 3 990 € TTC.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Prix", "/prix-voiture-sans-permis"]]), faqLd([["Combien coûte une voiture sans permis ?", "Le prix dépend de la marque, de l’état, de la motorisation, des équipements et de la garantie. Une voiture neuve est souvent plus chère, mais plus rassurante sur la durée."], ["Une voiture sans permis électrique coûte-t-elle moins cher ?", "Elle peut coûter moins cher à l’usage grâce à la recharge électrique, à l’entretien réduit et à l’absence de carburant."], ["Pourquoi NeoDrive est-elle intéressante en prix ?", "NeoDrive vise un positionnement accessible : voiture neuve, électrique, bien équipée, avec un prix d’entrée très compétitif."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
