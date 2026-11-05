/** Package de bienvenue envoyé à chaque nouveau contact Leboncoin : présentation courte,
 *  2 vidéos réelles, une réponse à sa question, et 3 questions sur son besoin. */
const SITE = "https://www.easydrive-auto.fr";
export const PACKAGE_VIDEOS = [
  { label: "🎬 La voiture en 1 minute", url: `${SITE}/presentation1.mp4` },
  { label: "🚚 Une vraie livraison client", url: `${SITE}/client1.mp4` },
];

type LeadLike = { nom?: string | null; ville?: string | null; commentaire?: string | null; annonce?: string | null; telephone?: string | null };

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Demandes hors sujet (candidatures, emploi…) : pas de package commercial. */
export function isOffTopic(lead: LeadLike) {
  return /\b(poste de|emploi|candidature|recrut|mon cv|cherche (un )?(travail|job)|chauffeur pl|spl)\b/.test(norm(String(lead.commentaire || "")));
}

/** Une phrase qui répond à ce que la personne a écrit ou coché sur Leboncoin. */
export function personalLine(lead: LeadLike) {
  const t = norm(String(lead.commentaire || ""));
  const lines: string[] = [];
  if (/reprise/.test(t)) lines.push("Nous ne faisons pas de reprise (nous vendons uniquement nos véhicules neufs, en direct) : le plus simple est de vendre votre voiture actuelle sur Leboncoin.");
  if (/essai|essayer|voir la voiture|visible|visite/.test(t)) lines.push("Vous voyez et essayez la voiture le jour de la livraison, avant de payer (0 € d'acompte).");
  if (/financ|credit|mensualit|par mois/.test(t)) lines.push(`Le financement est possible : simulation en 30 secondes sur ${SITE}/financement`);
  if (/autonomie|combien de km/.test(t)) lines.push("Autonomie : 50 à 70 km selon la conduite, recharge sur une simple prise 220 V (environ 6 h).");
  if (/marque/.test(t)) lines.push("C'est la NeoDrive SWITCH : nous sommes le fabricant et nous vendons en direct, sans intermédiaire.");
  if (/professionn/.test(t)) lines.push("Nous sommes le fabricant, une entreprise basée à Toulouse (SIREN 908 645 393).");
  if (!lines.length || /disponible|confort|interess/.test(t)) lines.unshift("La Confort (4 990 € TTC) est en stock ✅ et l'Essentielle (3 990 €) se commande avec 6 à 8 mois de délai.");
  return lines.slice(0, 2).join("\n");
}

export function welcomePackage(lead: LeadLike, signature = "Hana") {
  const first = cap(String(lead.nom || "").trim().split(/\s+/)[0] || "");
  const ville = String(lead.ville || "").trim();
  return [
    `Bonjour${first ? ` ${first}` : ""} 👋`,
    "",
    `Merci pour votre message sur Leboncoin ! Je suis ${signature}, de NeoDrive : des voitures sans permis 100 % électriques, neuves, en acier, livrées chez vous partout en France${ville ? ` (y compris à ${ville})` : ""}. Rien à payer avant la livraison.`,
    "",
    personalLine(lead),
    "",
    ...PACKAGE_VIDEOS.map(v => `${v.label} : ${v.url}`),
    "",
    "Pour bien vous conseiller, 3 petites questions :",
    "1️⃣ Votre code postal (pour le prix livré exact) ?",
    "2️⃣ La voiture est pour qui : vous, un ado, un proche ?",
    "3️⃣ Pour quand en avez-vous besoin ?",
    "",
    "(Répondez STOP si vous ne souhaitez plus être contacté.)",
  ].join("\n");
}
