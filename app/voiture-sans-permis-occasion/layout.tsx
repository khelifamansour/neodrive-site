import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/voiture-sans-permis-occasion", "Voiture sans permis d’occasion ou neuve : que choisir ?", "Voiture sans permis d’occasion ou neuve : prix réel, batterie, garantie et pièges à éviter. Comparez avec une NeoDrive électrique neuve dès 3 990 €.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Occasion ou neuve", "/voiture-sans-permis-occasion"]]), faqLd([["Une voiture sans permis d’occasion est-elle toujours moins chère ?", "Pas forcément. Elle peut coûter moins cher à l’achat, mais les frais de réparation, de batterie ou d’entretien peuvent augmenter le coût total."], ["Pourquoi acheter une voiture sans permis neuve ?", "Une voiture neuve permet de partir sur une base claire, avec une batterie récente, des équipements modernes et un meilleur suivi."], ["NeoDrive est-elle une alternative à l’occasion ?", "Oui. NeoDrive vise les personnes qui cherchent un prix accessible, mais qui veulent éviter les risques d’un véhicule ancien."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
