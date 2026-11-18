/** Plan de sujets SEO par cluster, avec la page pilier vers laquelle chaque article doit pointer. */
export type PlannedTopic = { topic: string; keyword: string; cluster: string; pillar: string; pillarLabel: string };

const C = {
  prix: { pillar: "/voiture-sans-permis-la-moins-chere", pillarLabel: "la voiture sans permis électrique la moins chère" },
  chinoise: { pillar: "/voiture-sans-permis-chinoise", pillarLabel: "voiture sans permis électrique chinoise : ce qu'il faut vérifier" },
  am: { pillar: "/offres/voiture-sans-permis-permis-am", pillarLabel: "permis AM et voiture sans permis" },
  senior: { pillar: "/offres/voiture-sans-permis-senior", pillarLabel: "voiture sans permis pour senior" },
  suspension: { pillar: "/offres/voiture-sans-permis-suspension-permis", pillarLabel: "suspension de permis et voiture sans permis" },
  aides: { pillar: "/aides-voiture-sans-permis-electrique-2026", pillarLabel: "aides 2026 pour une voiture sans permis électrique" },
  batterie: { pillar: "/voiture-sans-permis-electrique", pillarLabel: "la voiture sans permis électrique" },
  loa: { pillar: "/offres/voiture-sans-permis-leasing-ou-achat", pillarLabel: "leasing ou achat d'une voiture sans permis" },
  occasion: { pillar: "/voiture-sans-permis-occasion", pillarLabel: "voiture sans permis d'occasion ou neuve" },
  comparatif: { pillar: "/comparatif", pillarLabel: "les comparatifs NeoDrive" },
};

const T = (cluster: keyof typeof C, topic: string, keyword: string): PlannedTopic => ({ topic, keyword, cluster, ...C[cluster] });

export const TOPIC_PLAN: PlannedTopic[] = [
  T("prix", "Voiture sans permis neuve à moins de 5 000 € : est-ce possible en 2026 ?", "voiture sans permis neuve moins de 5000 euros"),
  T("prix", "Prix total d'une voiture sans permis livrée : véhicule, livraison, carte grise", "prix total voiture sans permis"),
  T("prix", "Voiture sans permis pas chère : les pièges à éviter", "voiture sans permis pas chère"),
  T("chinoise", "Voiture sans permis électrique chinoise : comment reconnaître un vendeur sérieux", "voiture sans permis chinoise vendeur"),
  T("chinoise", "Acheter une voiture sans permis sur une marketplace : les risques à connaître", "voiture sans permis marketplace"),
  T("am", "Permis AM à 14 ans : étapes, prix de la formation et délais", "permis AM 14 ans"),
  T("am", "Assurance d'une voiture sans permis pour un ado : ce que les parents doivent savoir", "assurance voiture sans permis ado"),
  T("senior", "Voiture sans permis pour les personnes nées avant 1988 : qui peut conduire sans permis AM ?", "voiture sans permis né avant 1988"),
  T("senior", "Voiture sans permis électrique pour senior : confort, sécurité et budget", "voiture sans permis senior électrique"),
  T("suspension", "Suspension de permis : quelles questions poser avant d'envisager une voiture sans permis ?", "suspension permis voiture sans permis"),
  T("aides", "Prime CEE et voiture sans permis électrique : comment ça marche ?", "prime CEE voiture sans permis"),
  T("aides", "Aides locales à l'achat d'un véhicule électrique léger : où se renseigner ?", "aide achat voiture sans permis électrique"),
  T("batterie", "Autonomie d'une voiture sans permis électrique en hiver : ce qui change", "autonomie voiture sans permis hiver"),
  T("batterie", "Recharger une voiture sans permis électrique sur une prise 220 V : coût et durée", "recharge voiture sans permis 220V"),
  T("batterie", "Durée de vie d'une batterie de voiture sans permis : bien l'entretenir", "batterie voiture sans permis durée de vie"),
  T("loa", "Payer une voiture sans permis en plusieurs fois : les solutions possibles", "voiture sans permis paiement plusieurs fois"),
  T("loa", "LOA voiture sans permis sans apport : calculer le vrai coût total", "LOA voiture sans permis sans apport"),
  T("occasion", "Voiture sans permis d'occasion à 5 000 € ou neuve : le comparatif chiffré", "voiture sans permis occasion ou neuve"),
  T("occasion", "Les 10 points à vérifier sur une voiture sans permis d'occasion", "voiture sans permis occasion vérifier"),
  T("comparatif", "Citroën Ami, Fiat Topolino, Mobilize Duo ou NeoDrive : quel budget pour quel usage ?", "comparatif voiture sans permis électrique"),
  T("comparatif", "Aixam ou voiture sans permis électrique : que choisir en 2026 ?", "aixam électrique ou neodrive"),
];

/** Mots vides ignorés dans la comparaison de sujets. */
const STOP = new Set(["voiture", "voitures", "sans", "permis", "electrique", "neodrive", "les", "des", "une", "pour", "est", "que", "qui", "quoi", "comment", "avec", "dans", "sur", "aux", "vos", "votre", "faut", "savoir", "2026", "2025", "guide", "tout", "plus", "moins", "quel", "quelle", "quels", "quelles", "bien", "vrai"]);
export function topicTokens(s: string): Set<string> {
  const k = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return new Set(k.split(" ").filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/s$/, "")));
}
/** Similarité de Jaccard entre deux sujets (0 à 1). */
export function topicSimilarity(a: string, b: string) {
  const A = topicTokens(a), B = topicTokens(b); if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
export const DUPLICATE_THRESHOLD = 0.5;
export const isDuplicateTopic = (candidate: string, existing: string[]) => existing.some(e => topicSimilarity(candidate, e) >= DUPLICATE_THRESHOLD);

/** Page pilier la plus proche d'un sujet libre (pour le lien obligatoire). */
export function pillarFor(topic: string): { pillar: string; pillarLabel: string } {
  let best = TOPIC_PLAN[0], score = -1;
  for (const t of TOPIC_PLAN) { const s = topicSimilarity(topic, t.topic + " " + t.keyword); if (s > score) { score = s; best = t; } }
  return { pillar: best.pillar, pillarLabel: best.pillarLabel };
}
