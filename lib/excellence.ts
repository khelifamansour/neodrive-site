/** Test d'excellence NeoDrive v2 : un bloc commun difficile (16 questions) + un bloc métier (8 questions), une question à la fois, 40 secondes par question. Corrigé côté serveur uniquement. */
export type ExQ = { id: string; theme: string; q: string; options: string[] };
export const EXCELLENCE_SECONDS = 40;
export const GENERAL: ExQ[] = [
 {
  "id": "g1",
  "theme": "Suite logique",
  "q": "Complétez la suite : 2, 6, 12, 20, 30, 42, …",
  "options": [
   "52",
   "54",
   "56",
   "58"
  ]
 },
 {
  "id": "g2",
  "theme": "Suite logique",
  "q": "Complétez la suite : 4, 9, 19, 39, 79, …",
  "options": [
   "119",
   "149",
   "158",
   "159"
  ]
 },
 {
  "id": "g3",
  "theme": "Suite logique",
  "q": "Complétez la suite de lettres : A, C, F, J, O, …",
  "options": [
   "S",
   "T",
   "U",
   "V"
  ]
 },
 {
  "id": "g4",
  "theme": "Calcul mental",
  "q": "Combien font 15 % de 4 960 ?",
  "options": [
   "724",
   "744",
   "754",
   "764"
  ]
 },
 {
  "id": "g5",
  "theme": "Calcul",
  "q": "Une voiture est vendue 5 940 € TTC (TVA 20 %). Quel est son prix hors taxes ?",
  "options": [
   "4 752 €",
   "4 950 €",
   "4 970 €",
   "5 000 €"
  ]
 },
 {
  "id": "g6",
  "theme": "Raisonnement",
  "q": "Un prix augmente de 25 %. De combien doit-il baisser pour revenir au prix de départ ?",
  "options": [
   "15 %",
   "20 %",
   "25 %",
   "30 %"
  ]
 },
 {
  "id": "g7",
  "theme": "Calcul",
  "q": "Un camion roule 360 km à 80 km/h, puis 240 km à 60 km/h. Quelle est sa vitesse moyenne sur tout le trajet ?",
  "options": [
   "70 km/h",
   "environ 70,6 km/h",
   "72 km/h",
   "75 km/h"
  ]
 },
 {
  "id": "g8",
  "theme": "Logique",
  "q": "« Si le client signe, il paie à la livraison. » Or le client n'a pas payé à la livraison. Donc :",
  "options": [
   "le client a signé",
   "le client n'a pas signé",
   "on ne peut rien conclure",
   "le client paiera plus tard"
  ]
 },
 {
  "id": "g9",
  "theme": "Logique",
  "q": "Cinq personnes font la queue. A est derrière B, C est devant D, E est derrière A, et B est derrière D. Qui est en tête ?",
  "options": [
   "A",
   "B",
   "C",
   "D"
  ]
 },
 {
  "id": "g10",
  "theme": "Raisonnement",
  "q": "8 personnes se serrent toutes la main une seule fois deux à deux. Combien de poignées de main ?",
  "options": [
   "28",
   "36",
   "56",
   "64"
  ]
 },
 {
  "id": "g11",
  "theme": "Calcul",
  "q": "Sur 200 contacts, 15 % réservent, et 80 % des réservations sont livrées. Combien de voitures sont livrées ?",
  "options": [
   "16",
   "24",
   "30",
   "32"
  ]
 },
 {
  "id": "g12",
  "theme": "Raisonnement",
  "q": "Quel est l'angle entre les aiguilles d'une horloge à 9 h 45 ?",
  "options": [
   "15°",
   "22,5°",
   "30°",
   "37,5°"
  ]
 },
 {
  "id": "g13",
  "theme": "Français",
  "q": "Quelle phrase est correcte ?",
  "options": [
   "Quelle que soit votre décision, nous vous livrerons.",
   "Quelque soit votre décision, nous vous livrerons.",
   "Quel que soit votre décision, nous vous livrerons.",
   "Quelles que soit votre décision, nous vous livrerons."
  ]
 },
 {
  "id": "g14",
  "theme": "Français",
  "q": "Un partenariat « pérenne » est un partenariat :",
  "options": [
   "provisoire",
   "durable",
   "coûteux",
   "rapide"
  ]
 },
 {
  "id": "g15",
  "theme": "Calcul",
  "q": "Une remise de 20 %, suivie d'une seconde remise de 10 % sur le nouveau prix, équivaut à une remise totale de :",
  "options": [
   "25 %",
   "27 %",
   "28 %",
   "30 %"
  ]
 },
 {
  "id": "g16",
  "theme": "Raisonnement",
  "q": "Le double de mon âge il y a 5 ans est égal à mon âge dans 10 ans. Quel âge ai-je ?",
  "options": [
   "15 ans",
   "20 ans",
   "25 ans",
   "30 ans"
  ]
 }
];
export const ROLE: Record<"closer" | "coordinateur" | "social", ExQ[]> = {
 "closer": [
  {
   "id": "c1",
   "theme": "Vente",
   "q": "Un client dit : « C'est trop cher. » Quelle est la meilleure première réponse ?",
   "options": [
    "Proposer tout de suite une remise",
    "« Je comprends. Par rapport à quoi le trouvez-vous cher ? »",
    "Répéter les qualités de la voiture sans l'écouter",
    "Lui conseiller une voiture d'occasion"
   ]
  },
  {
   "id": "c2",
   "theme": "Chiffres",
   "q": "120 appels donnent 18 rendez-vous, puis 6 ventes. Quel est le taux de conversion des appels en ventes ?",
   "options": [
    "5 %",
    "6 %",
    "15 %",
    "33 %"
   ]
  },
  {
   "id": "c3",
   "theme": "Chiffres",
   "q": "Avec un taux de 5 % des appels en ventes, combien d'appels faut-il pour faire 20 ventes ?",
   "options": [
    "200",
    "300",
    "400",
    "500"
   ]
  },
  {
   "id": "c4",
   "theme": "Closing",
   "q": "Laquelle de ces phrases est une technique de conclusion (closing) ?",
   "options": [
    "« Avez-vous des questions ? »",
    "« Préférez-vous être livré mardi ou jeudi ? »",
    "« Que pensez-vous de nos voitures ? »",
    "« Je vous laisse réfléchir. »"
   ]
  },
  {
   "id": "c5",
   "theme": "Objections",
   "q": "Le client dit : « Je dois en parler à ma femme. » Que faites-vous ?",
   "options": [
    "Raccrocher et attendre qu'il rappelle",
    "Proposer un appel à trois ou envoyer le catalogue, et fixer un rappel à une heure précise",
    "Lui dire que l'offre expire ce soir",
    "Baisser le prix pour le décider"
   ]
  },
  {
   "id": "c6",
   "theme": "Chiffres",
   "q": "Fixe de 50 000 DA et commission de 2 500 DA par voiture livrée. Avec 12 voitures livrées, combien touchez-vous ?",
   "options": [
    "62 000 DA",
    "75 000 DA",
    "80 000 DA",
    "85 000 DA"
   ]
  },
  {
   "id": "c7",
   "theme": "Écoute",
   "q": "Dans un appel de découverte, qui doit parler le plus ?",
   "options": [
    "Le commercial",
    "Le client",
    "Les deux à égalité",
    "Peu importe"
   ]
  },
  {
   "id": "c8",
   "theme": "Conflit",
   "q": "Un client est en colère à cause d'un retard. Quel est le bon ordre ?",
   "options": [
    "Se justifier, puis proposer une remise",
    "Écouter sans interrompre, s'excuser, proposer une solution avec une date précise, puis faire le suivi",
    "Proposer une solution, puis écouter",
    "Transférer l'appel au patron"
   ]
  }
 ],
 "coordinateur": [
  {
   "id": "k1",
   "theme": "Import",
   "q": "Quel document prouve la conformité européenne d'un véhicule pour l'immatriculer ?",
   "options": [
    "La facture commerciale",
    "Le connaissement (B/L)",
    "Le certificat de conformité (COC)",
    "La liste de colisage"
   ]
  },
  {
   "id": "k2",
   "theme": "Import",
   "q": "À quoi sert principalement le connaissement (B/L) ?",
   "options": [
    "À payer la TVA",
    "À prouver la prise en charge de la marchandise par la compagnie maritime et à en réclamer la livraison",
    "À immatriculer les véhicules",
    "À fixer le prix de vente"
   ]
  },
  {
   "id": "k3",
   "theme": "Incoterms",
   "q": "En incoterm EXW (départ usine), qui paie le transport depuis l'usine ?",
   "options": [
    "Le vendeur",
    "L'acheteur",
    "Moitié-moitié",
    "La compagnie maritime"
   ]
  },
  {
   "id": "k4",
   "theme": "Calcul",
   "q": "Le fret coûte 4 800 $ pour un conteneur de 9 voitures, avec 1 $ = 0,92 €. Quel est le coût du fret par voiture ?",
   "options": [
    "445 €",
    "491 €",
    "533 €",
    "580 €"
   ]
  },
  {
   "id": "k5",
   "theme": "Douane",
   "q": "Marchandise 16 000 €, fret 4 000 €, droits de douane 10 % sur (marchandise + fret). La TVA de 20 % porte sur (marchandise + fret + droits). Combien de TVA ?",
   "options": [
    "3 200 €",
    "4 000 €",
    "4 400 €",
    "4 800 €"
   ]
  },
  {
   "id": "k6",
   "theme": "Anglais",
   "q": "« The vessel is delayed; the new ETA is Monday. » Cela veut dire :",
   "options": [
    "Le navire est parti lundi",
    "Le navire est retardé ; la nouvelle date d'arrivée prévue est lundi",
    "Le navire est annulé jusqu'à lundi",
    "Le conteneur sera dépoté lundi"
   ]
  },
  {
   "id": "k7",
   "theme": "Organisation",
   "q": "Un chauffeur avec une remorque de 2 voitures doit faire 6 livraisons. Combien d'allers au minimum depuis le dépôt ?",
   "options": [
    "2",
    "3",
    "4",
    "6"
   ]
  },
  {
   "id": "k8",
   "theme": "Priorités",
   "q": "Un conteneur est bloqué en douane : il manque un document. Quelle est la première action ?",
   "options": [
    "Attendre que la douane rappelle",
    "Identifier précisément le document manquant avec le transitaire et le demander tout de suite à l'usine",
    "Annuler les livraisons",
    "Payer une pénalité"
   ]
  }
 ],
 "social": [
  {
   "id": "s1",
   "theme": "Chiffres",
   "q": "Une vidéo fait 50 000 vues et 1 500 interactions. Quel est son taux d'engagement ?",
   "options": [
    "0,3 %",
    "1,5 %",
    "3 %",
    "30 %"
   ]
  },
  {
   "id": "s2",
   "theme": "Chiffres",
   "q": "200 € de publicité génèrent 40 contacts. Quel est le coût par contact ?",
   "options": [
    "4 €",
    "5 €",
    "8 €",
    "40 €"
   ]
  },
  {
   "id": "s3",
   "theme": "Vidéo",
   "q": "À quoi servent surtout les 2 premières secondes d'une vidéo courte ?",
   "options": [
    "À montrer le logo",
    "À capter l'attention (l'accroche)",
    "À donner le prix",
    "À remercier les abonnés"
   ]
  },
  {
   "id": "s4",
   "theme": "Acquisition",
   "q": "Une vidéo fait beaucoup de vues mais n'apporte aucun message client. Quelle est la cause la plus probable ?",
   "options": [
    "La vidéo est trop courte",
    "Il manque un appel à l'action clair (par exemple : « écrivez-nous sur WhatsApp »)",
    "Il faut plus de hashtags",
    "Il faut publier la nuit"
   ]
  },
  {
   "id": "s5",
   "theme": "Chiffres",
   "q": "Une vidéo de 30 secondes est regardée en moyenne 12 secondes. Quelle est sa rétention moyenne ?",
   "options": [
    "12 %",
    "25 %",
    "40 %",
    "60 %"
   ]
  },
  {
   "id": "s6",
   "theme": "Format",
   "q": "Quel est le format standard d'une vidéo TikTok ou Reels ?",
   "options": [
    "16:9",
    "1:1",
    "9:16",
    "4:3"
   ]
  },
  {
   "id": "s7",
   "theme": "Cible",
   "q": "Quelle est la cible principale des voitures sans permis NeoDrive ?",
   "options": [
    "Les étudiants de 20-25 ans en centre-ville",
    "Les parents d'adolescents et les seniors",
    "Les chefs d'entreprise",
    "Les touristes"
   ]
  },
  {
   "id": "s8",
   "theme": "Méthode",
   "q": "Pour tester ce qui marche (test A/B) entre deux vidéos, que faut-il changer ?",
   "options": [
    "Tout à la fois",
    "Un seul élément à la fois",
    "Rien, il faut publier plus",
    "Uniquement la musique"
   ]
  }
 ]
};
export const questionsFor = (poste: string): ExQ[] => [...GENERAL, ...(ROLE[poste as keyof typeof ROLE] || ROLE.closer)];
export const EXCELLENCE_MINUTES = Math.ceil(questionsFor("closer").length * EXCELLENCE_SECONDS / 60);

/** Indice de talent /100 à partir du formulaire (bac, tests, énigmes, rédaction) et, si disponible, du test d'excellence. */
export function talentIndex(a: Record<string, any> | null | undefined, excellence?: number | null) {
  if (!a) return null;
  const parts: [number | null, number][] = [];
  const bac = Number(a.bac_average); parts.push([bac > 0 ? Math.max(0, Math.min(100, (bac - 10) / 8 * 100)) : null, 20]);
  parts.push([a.test_logic != null ? a.test_logic / 8 * 100 : null, 20]);
  parts.push([a.test_french != null ? a.test_french / 10 * 100 : null, 15]);
  const rid = String(a.answers?.riddles_score || ""); const m = rid.match(/^(\d+)\/(\d+)$/);
  parts.push([m ? Number(m[1]) / Number(m[2]) * 100 * (a.riddle_sec && a.riddle_sec <= 90 ? 1 : 0.85) : null, 10]);
  parts.push([a.test_writing != null ? a.test_writing / 20 * 100 : null, 10]);
  parts.push([excellence ?? null, 25]);
  const ok = parts.filter(([v]) => v != null) as [number, number][]; if (!ok.length) return null;
  const base = ok.reduce((t, [v, w]) => t + v * w, 0) / ok.reduce((t, [, w]) => t + w, 0);
  return Math.max(0, Math.round(base - Math.min(20, 5 * (Number(a.paste_count) || 0))));
}
