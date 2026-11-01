import type { Metadata } from "next";
export const metadata: Metadata = { title: "Accusé de réception — NeoDrive", description: "Confirmez la bonne réception de votre NeoDrive.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
