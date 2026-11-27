import { LandingPage, landingMetadata } from "../../lib/seo-landing";
import { GUIDES } from "../../lib/seo-guides";

const p = GUIDES["budget-voiture-sans-permis-2026"];
export const metadata = landingMetadata(p);
export default function Page() { return <LandingPage p={p} />; }
