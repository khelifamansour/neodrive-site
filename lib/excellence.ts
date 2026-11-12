/** Test d'excellence NeoDrive : 16 questions difficiles en 12 minutes (raisonnement, calcul, logique, français, jugement). Corrigé côté serveur uniquement. */
export const EXCELLENCE_MINUTES = 12;
export const EXCELLENCE: { id: string; theme: string; q: string; options: string[] }[] = [
  { id: "e1", theme: "Suite logique", q: "Complétez la suite : 3, 6, 11, 18, 27, …", options: ["36", "38", "40", "42"] },
  { id: "e2", theme: "Suite logique", q: "Complétez la suite : 2, 3, 5, 9, 17, …", options: ["31", "33", "34", "35"] },
  { id: "e3", theme: "Calcul", q: "Une voiture coûte 4 990 €. On applique une remise de 10 %, puis une hausse de 10 % sur le nouveau prix. Quel est le prix final ?", options: ["4 990 €", "4 940,10 €", "5 039,90 €", "4 891 €"] },
  { id: "e4", theme: "Proportionnalité", q: "3 commerciaux vendent 9 voitures en 3 jours. Au même rythme, combien de voitures vendent 6 commerciaux en 6 jours ?", options: ["18", "27", "36", "54"] },
  { id: "e5", theme: "Logique", q: "Aucun client pressé ne lit le catalogue. Certains clients de Lyon lisent le catalogue. Donc :", options: ["Tous les clients de Lyon sont pressés", "Certains clients de Lyon ne sont pas pressés", "Aucun client de Lyon n'est pressé", "On ne peut rien conclure"] },
  { id: "e6", theme: "Logique", q: "Pierre est plus grand que Paul. Paul est plus grand que Jacques. Marc est plus petit que Jacques. Qui est le deuxième plus petit ?", options: ["Pierre", "Paul", "Jacques", "Marc"] },
  { id: "e7", theme: "Business", q: "Une voiture achetée 1 800 € HT est vendue 4 990 € TTC (TVA 20 %). Quelle est la marge hors taxes, environ ?", options: ["3 190 €", "2 358 €", "2 592 €", "1 990 €"] },
  { id: "e8", theme: "Raisonnement", q: "Quel est l'angle entre les deux aiguilles d'une horloge à 3 h 30 ?", options: ["60°", "75°", "90°", "105°"] },
  { id: "e9", theme: "Français", q: "Un client « réticent » est un client :", options: ["enthousiaste", "qui hésite et a des réserves", "pressé", "en colère"] },
  { id: "e10", theme: "Français", q: "Quelle phrase est correcte ?", options: ["Les documents que je vous ai envoyés sont arrivés.", "Les documents que je vous ai envoyé sont arrivés.", "Les documents que je vous ai envoyées sont arrivé.", "Les documents que je vous ai envoyés sont arrivées."] },
  { id: "e11", theme: "Logique", q: "Tous les A sont des B, et certains B sont des C. Que peut-on affirmer ?", options: ["Tous les A sont des C", "Certains A sont des C", "Aucun A n'est un C", "On ne peut pas savoir si des A sont des C"] },
  { id: "e12", theme: "Organisation", q: "Un conteneur part le 28 février (année non bissextile) et voyage 40 jours. Quand arrive-t-il ?", options: ["7 avril", "8 avril", "9 avril", "10 avril"] },
  { id: "e13", theme: "Probabilités", q: "Un sac contient 3 billes rouges et 2 bleues. On tire 2 billes sans remise. Quelle est la probabilité d'obtenir 2 billes rouges ?", options: ["3/10", "9/25", "2/5", "1/2"] },
  { id: "e14", theme: "Calcul", q: "Anis fait un travail seul en 6 heures, Sara seule en 3 heures. Ensemble, en combien de temps le font-ils ?", options: ["1 h 30", "2 h", "2 h 30", "4 h 30"] },
  { id: "e15", theme: "Français", q: "Quel mot n'appartient pas à la série ?", options: ["délai", "échéance", "date limite", "remise"] },
  { id: "e16", theme: "Jugement", q: "Un client furieux appelle : sa livraison a 3 jours de retard. Quelle est la meilleure première réaction ?", options: ["Lui expliquer que ce n'est pas de votre faute", "Reconnaître le problème, vous excuser et lui donner une nouvelle date précise avec une solution", "Lui proposer tout de suite une remise de 500 €", "Lui demander de rappeler plus tard"] },
];

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
