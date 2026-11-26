import { LandingPage, landingMetadata } from "../../../lib/seo-landing";
import { ARTICLE_PRIX_LIVRE } from "../../../lib/seo-articles-noel";

export const metadata = landingMetadata(ARTICLE_PRIX_LIVRE);
export default function Page() { return <LandingPage p={ARTICLE_PRIX_LIVRE} />; }
