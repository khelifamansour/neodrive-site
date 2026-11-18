import { LandingPage, landingMetadata } from "../../lib/seo-landing";
import { PILLARS } from "../../lib/seo-pillars";

const p = PILLARS["voiture-sans-permis-la-moins-chere"];
export const metadata = landingMetadata(p);
export default function Page() { return <LandingPage p={p} />; }
