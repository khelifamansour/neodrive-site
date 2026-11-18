import { LandingPage, landingMetadata } from "../../lib/seo-landing";
import { PILLARS } from "../../lib/seo-pillars";

const p = PILLARS["aides-voiture-sans-permis-electrique-2026"];
export const metadata = landingMetadata(p);
export default function Page() { return <LandingPage p={p} />; }
