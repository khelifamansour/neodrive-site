import type { Metadata } from "next";
import { pageMeta, graph, breadcrumbLd, faqLd, ldJson } from "../../lib/seo-meta";
import { faqItems } from "../../lib/faq-items";

export const metadata: Metadata = pageMeta(
  "/faq",
  "FAQ voiture sans permis électrique NeoDrive",
  "Prix, recharge, autonomie, livraison, carte grise, SAV et pièces : toutes les réponses sur les voitures sans permis électriques NeoDrive.",
);

const ld = graph(breadcrumbLd([["Accueil", "/"], ["FAQ", "/faq"]]), faqLd(faqItems));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />{children}</>;
}
