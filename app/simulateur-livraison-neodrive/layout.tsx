import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur de livraison NeoDrive",
  description: "Simulateur NeoDrive pour comprendre le coût d'une livraison individualisée à domicile.",
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
