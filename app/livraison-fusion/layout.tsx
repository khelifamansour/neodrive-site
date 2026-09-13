import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Livraison NeoDrive — page test",
  description: "Page de test de la nouvelle expérience de livraison NeoDrive.",
  robots: { index: false, follow: false },
};

export default function LivraisonFusionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
