import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage, landingMetadata } from "../../../lib/seo-landing";
import { COMPARATIFS, COMPARATIF_SLUGS } from "../../../lib/seo-pillars";

export const dynamicParams = false;
export function generateStaticParams() { return COMPARATIF_SLUGS.map(slug => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const p = COMPARATIFS[slug]; return p ? landingMetadata(p) : {}; }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const p = COMPARATIFS[slug]; if (!p) notFound(); return <LandingPage p={p} />; }
