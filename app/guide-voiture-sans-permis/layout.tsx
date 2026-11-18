import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, ldJson } from "../../lib/seo-meta";

export const metadata: Metadata = pageMeta("/guide-voiture-sans-permis", "Guide complet de la voiture sans permis électrique", "Tout savoir sur la voiture sans permis électrique : permis AM, âge, autonomie, recharge, prix, assurance, entretien et livraison en France.");

const ld = graph(breadcrumbLd([["Accueil", "/"], ["Guide complet", "/guide-voiture-sans-permis"]]));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
