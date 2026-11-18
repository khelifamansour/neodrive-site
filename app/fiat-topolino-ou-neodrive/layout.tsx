import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/fiat-topolino-ou-neodrive", "Fiat Topolino ou NeoDrive : quel sans permis choisir ?", "Fiat Topolino ou NeoDrive : prix, équipements, portes, chauffage, livraison et SAV comparés pour choisir votre voiture sans permis électrique.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Fiat Topolino ou NeoDrive", "/fiat-topolino-ou-neodrive"]]), faqLd([["NeoDrive est-elle une alternative à la Fiat Topolino ?", "Oui. NeoDrive s’adresse aux clients qui cherchent une voiture sans permis électrique neuve, accessible, pratique et bien équipée."], ["Pourquoi comparer les équipements ?", "Parce que deux voitures sans permis peuvent avoir un prix proche, mais un niveau de confort très différent : coffre, chauffage, caméra, Bluetooth, alarme ou SAV."], ["NeoDrive propose-t-elle un financement ?", "Oui, une solution de financement peut être étudiée selon votre situation, votre apport et le modèle choisi."], ["Quel véhicule choisir pour un usage quotidien ?", "Pour un usage quotidien, il faut regarder le confort, la facilité de stationnement, le coffre, l’entretien, l’assurance et la disponibilité des pièces."]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
