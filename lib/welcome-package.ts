/** Package de bienvenue envoyé à chaque nouveau contact Leboncoin : présentation courte,
 *  2 vidéos réelles, une réponse à sa question, et 3 questions sur son besoin. */
const SITE = "https://www.easydrive-auto.fr";
/** Médiathèque NeoDrive (Supabase → pages /videos/<id> du site). */
export const VIDEO_CATALOG = [
  { id: "37404e2a-7889-4e52-a67c-16b8df8e88a6", theme: "presentation", label: "🎬 La voiture en 1 minute" },
  { id: "02ba2a4b-95aa-4b5f-be08-cd737bb4977b", theme: "interieur", label: "🪑 L'intérieur" },
  { id: "63d806e4-e98d-498b-8e2a-2ec3030d0496", theme: "essai", label: "🛣️ La NeoDrive sur la route" },
  { id: "e1442e3f-c79b-494e-aff7-000c6691b997", theme: "livraison", label: "🚚 Une vraie livraison client" },
  { id: "a3744039-030c-4485-bf3e-393226f2f4a0", theme: "livraison", label: "🚚 Livraison et prise en main" },
  { id: "a092b141-9ba4-49a1-bc1f-3c67bf856d5b", theme: "presentation", label: "🎬 La voiture sous un autre angle" },
  { id: "b5491cdb-ae45-4755-a9f7-58ecca20f6bb", theme: "arrivage", label: "🚢 Un arrivage de NeoDrive" },
  { id: "1b57c3a8-ad8b-4644-9d8c-949039674e0b", theme: "arrivage", label: "📦 Déchargement des voitures" },
] as const;
export const videoUrl = (id: string) => `${SITE}/videos/${id}`;
/** Les 4 vidéos du package : présentation, intérieur, route, livraison. */
export const PACKAGE_VIDEOS = ["37404e2a-7889-4e52-a67c-16b8df8e88a6", "02ba2a4b-95aa-4b5f-be08-cd737bb4977b", "63d806e4-e98d-498b-8e2a-2ec3030d0496", "e1442e3f-c79b-494e-aff7-000c6691b997"]
  .map(id => { const v = VIDEO_CATALOG.find(x => x.id === id)!; return { label: v.label, url: videoUrl(id) }; });

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
  if (/autonomie|combien de km/.test(t)) lines.push("Autonomie : jusqu'à 70 km, recharge en environ 6 h sur une simple prise 220 V.");
  if (/marque/.test(t)) lines.push("C'est la NeoDrive SWITCH : nous sommes le fabricant et nous vendons en direct, sans intermédiaire.");
  if (/professionn/.test(t)) lines.push("Nous sommes le fabricant, une entreprise basée à Toulouse (SIREN 908 645 393).");
  if (/disponible|toujours|actualit/.test(t)) lines.unshift("Oui, elle est disponible : la Confort est en stock et livrable rapidement ✅");
  return lines.slice(0, 2).join("\n");
}

export function welcomePackage(lead: LeadLike, signature = "Hana") {
  const first = cap(String(lead.nom || "").trim().split(/\s+/)[0] || "");
  const ville = String(lead.ville || "").trim();
  return [
    `Bonjour${first ? ` ${first}` : ""} 👋`,
    "",
    `Merci pour votre message sur Leboncoin ! Je suis ${signature}, de NeoDrive : le fabricant français de voitures sans permis 100 % électriques, neuves, en acier, livrées chez vous partout en France${ville ? ` (y compris à ${ville})` : ""}.`,
    "",
    ...(personalLine(lead) ? [personalLine(lead), ""] : []),
    "Nos 3 versions : Essentielle 3 990 € · Confort 4 990 € (en stock) · Confort Plus+ 5 990 €. 0 € d'acompte, vous payez à la livraison.",
    "",
    "Découvrez-la en vidéo :",
    ...PACKAGE_VIDEOS.map(v => `${v.label} : ${v.url}`),
    "",
    `👉 Votre prix livré et la réservation en ligne (sans rien payer) : ${SITE}/reservation-devis`,
    "",
    "Pour bien vous conseiller, dites-moi :",
    "1️⃣ C'est pour qui ? (un ado de 14-16 ans, vous-même, une personne âgée…)",
    "2️⃣ Votre code postal ?",
    "3️⃣ Pour quand en avez-vous besoin ?",
    "",
    "(Répondez STOP si vous ne souhaitez plus être contacté.)",
  ].join("\n");
}
