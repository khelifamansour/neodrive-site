import type { Metadata } from "next";
import PackClient from "./PackClient";

export const metadata: Metadata = { title: "Votre livraison NeoDrive", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PackClient token={token} />;
}
