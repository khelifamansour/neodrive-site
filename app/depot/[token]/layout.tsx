import type { Metadata } from "next";
export const metadata: Metadata = { title: "MK HOLDING – Documents / 文件上传", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
