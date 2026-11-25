import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PREP_TOKEN } from "../../../../lib/carte-grise";
import Prep from "./Prep";

export const metadata: Metadata = { title: "Préparer ma carte grise - NeoDrive", robots: { index: false, follow: false } };

/** Lien personnel « préparer ma carte grise » : pièces avant la livraison, puis plaque VIN et mandat signé après la livraison. */
export default async function PreparerCarteGrise({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!PREP_TOKEN.test(token)) notFound();
  return <Prep token={token} />;
}
