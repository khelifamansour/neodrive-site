import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NeoDrive", description: "L'application NeoDrive : missions, chauffeurs et outils de l'équipe.",
  robots: { index: false, follow: false },
  manifest: "/app.webmanifest",
  icons: { icon: "/app-icon-192.png", apple: "/app-apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "NeoDrive", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#e8592a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
