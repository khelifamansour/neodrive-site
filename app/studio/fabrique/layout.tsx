import type { Metadata } from "next";
export const metadata: Metadata = { title: "Fabrique TikTok — NeoDrive", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
