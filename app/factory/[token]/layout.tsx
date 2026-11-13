import type { Metadata } from "next";
export const metadata: Metadata = { title: "MK HOLDING – Factory documents", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
