import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "Studio — NeoDrive", robots: { index: false, follow: false },
  manifest: "/studio.webmanifest",
  icons: { apple: "/studio-icon-192.png" },
  appleWebApp: { capable: true, title: "NeoDrive Studio" },
};
export const viewport: Viewport = { themeColor: "#f05a28" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
