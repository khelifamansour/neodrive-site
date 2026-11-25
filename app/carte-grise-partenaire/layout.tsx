import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Carte grise client partenaire | NeoDrive",
  description: "Dossier carte grise pour le client d’un partenaire NeoDrive : carte grise prise en charge par NeoDrive, documents et signatures en ligne.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
