import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur de livraison NeoDrive",
  description: "Prototype du simulateur de livraison individualisée NeoDrive.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SimulateurLivraisonLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
