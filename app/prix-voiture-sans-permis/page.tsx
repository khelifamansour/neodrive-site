import { LandingPage, landingMetadata } from "../../lib/seo-landing";
import { GUIDES } from "../../lib/seo-guides";

const p = GUIDES["prix-voiture-sans-permis"];
export const metadata = landingMetadata(p);
export default function Page() { return <LandingPage p={p} />; }
