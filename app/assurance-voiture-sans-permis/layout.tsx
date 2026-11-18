import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/assurance-voiture-sans-permis", "Assurance voiture sans permis : prix et garanties", "Assurance voiture sans permis : obligations, garanties utiles, prix moyens et conseils pour bien assurer votre voiturette électrique.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Assurance", "/assurance-voiture-sans-permis"]]), faqLd([["Une voiture sans permis doit-elle être assurée ?", "Oui, une assurance est obligatoire pour circuler sur la voie publique, au minimum avec une responsabilité civile."], ["Combien coûte une assurance voiture sans permis ?", "Le prix dépend du conducteur, du lieu, de la formule choisie, des garanties et du véhicule. Il faut demander une simulation adaptée à votre situation."], ["Quelle assurance choisir pour une voiture neuve ?", "Pour une voiture neuve, il peut être intéressant de comparer une formule plus protectrice, notamment contre le vol, l’incendie ou les dommages."], ["NeoDrive peut-elle aider pour l’assurance ?", "Oui, nous pouvons vous orienter pour obtenir une simulation et mieux estimer le budget total de votre voiture sans permis."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
