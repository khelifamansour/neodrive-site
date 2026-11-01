import type { Metadata } from "next";
export const metadata: Metadata = { title: "Préparer ma livraison — NeoDrive", description: "Comment se passe la livraison de votre NeoDrive : paiement, prise en main et carte grise.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
