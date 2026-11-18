import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/quelle-voiture-sans-permis-choisir", "Quelle voiture sans permis choisir ? Le guide 2026", "Budget, usage, équipements, autonomie et SAV : nos critères pour bien choisir sa voiture sans permis électrique, neuve ou d’occasion.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Quelle voiture choisir", "/quelle-voiture-sans-permis-choisir"]]), faqLd([["Quelle est la meilleure voiture sans permis ?", "Il n’y a pas une seule réponse. Le bon choix dépend de votre budget, de votre usage, du niveau d’équipement souhaité et du service après-vente."], ["Faut-il choisir une voiture sans permis neuve ou d’occasion ?", "L’occasion peut coûter moins cher au départ, mais le neuf permet souvent d’éviter les mauvaises surprises : usure, batterie fatiguée, réparations et absence de garantie."], ["Une voiture sans permis électrique est-elle économique ?", "Oui, elle peut être économique sur la durée grâce à la recharge électrique, à l’entretien réduit et à l’absence de carburant."], ["NeoDrive est-elle adaptée aux trajets quotidiens ?", "Oui, NeoDrive est pensée pour les trajets du quotidien : travail, courses, déplacements locaux et recherche d’autonomie."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
