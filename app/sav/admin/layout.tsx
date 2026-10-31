import type { Metadata } from "next";
export const metadata: Metadata = { title: "Suivi SAV — NeoDrive", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
