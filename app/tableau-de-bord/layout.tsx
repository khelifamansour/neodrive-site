import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tableau de bord — NeoDrive", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
