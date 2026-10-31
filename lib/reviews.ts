export const GOOGLE_PROFILE_URL = "https://g.page/r/CY-pd6eO0lLtEBM";
export const GOOGLE_WRITE_REVIEW_URL = "https://g.page/r/CY-pd6eO0lLtEBM/review";
export const reviewMessage = (first: string) =>
  `Bonjour ${first || ""} 👋 C’est NeoDrive. Merci encore pour votre confiance ! Si votre NeoDrive vous plaît, un petit avis Google nous aiderait énormément (30 secondes) : ${GOOGLE_WRITE_REVIEW_URL} Merci beaucoup et bonne route ! 🚗⚡`.replace(/\s+/g, " ").trim();
