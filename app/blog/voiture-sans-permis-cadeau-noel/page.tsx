import { LandingPage, landingMetadata } from "../../../lib/seo-landing";
import { ARTICLE_NOEL } from "../../../lib/seo-articles-noel";

export const metadata = landingMetadata(ARTICLE_NOEL);
export default function Page() { return <LandingPage p={ARTICLE_NOEL} />; }
