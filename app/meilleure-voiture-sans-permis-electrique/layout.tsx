import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/meilleure-voiture-sans-permis-electrique", "Meilleure voiture sans permis électrique : comparatif", "Quelle est la meilleure voiture sans permis électrique ? Prix, autonomie, confort, équipements et SAV comparés pour bien choisir en 2026.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Meilleure électrique", "/meilleure-voiture-sans-permis-electrique"]]), faqLd([["Quelle est la meilleure voiture sans permis électrique ?", "La meilleure dépend de votre usage. Pour beaucoup de clients, le bon choix combine prix, confort, équipements, SAV et coût d’utilisation."], ["Faut-il choisir une voiture connue ou mieux équipée ?", "Une marque connue rassure, mais il faut aussi comparer les équipements, le coffre, le SAV, le prix final et la disponibilité des pièces."], ["NeoDrive est-elle adaptée au quotidien ?", "Oui, NeoDrive est pensée pour les déplacements quotidiens : travail, courses, trajets locaux et recherche d’autonomie."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
