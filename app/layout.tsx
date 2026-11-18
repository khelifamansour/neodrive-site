import type { Metadata, Viewport } from "next";
import SiteShell from "./SiteShell";
import { SITE, OG_IMAGE } from "../lib/seo-meta";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "NeoDrive : voiture sans permis électrique neuve dès 3 990 €",
  description: "Voiture sans permis électrique neuve NeoDrive dès 3 990 € TTC. Livraison partout en France, paiement à la livraison, garantie 2 ans, SAV et pièces en France.",
  applicationName: "NeoDrive",
  openGraph: { siteName: "NeoDrive", locale: "fr_FR", type: "website", images: [{ url: OG_IMAGE }] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><SiteShell>{children}</SiteShell></body></html>;
}
