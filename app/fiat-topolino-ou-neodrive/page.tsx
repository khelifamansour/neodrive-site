import { LandingPage, landingMetadata } from "../../lib/seo-landing";
import { GUIDES } from "../../lib/seo-guides";

const p = GUIDES["fiat-topolino-ou-neodrive"];
export const metadata = landingMetadata(p);
export default function Page() { return <LandingPage p={p} />; }
