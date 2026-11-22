/**
 * Test en ligne de la candidature (/candidature) : banque de questions, tirage par candidat, état côté serveur.
 * SERVEUR UNIQUEMENT : contient les bonnes réponses. Ne jamais importer dans une page ou un composant client.
 *
 * Chaque candidat reçoit 10 questions de français et 8 de logique tirées au hasard (réponses mélangées),
 * 3 énigmes tirées au hasard et un sujet de rédaction tiré au hasard. Les questions sont révélées une à une
 * par le serveur, avec un temps limité par question, sans retour en arrière.
 *
 * Stockage de l'état : table recruit_test_sessions (supabase/sql/2026-11-22-recruit-test-sessions.sql).
 * Si la table n'existe pas encore, l'état est conservé dans un jeton chiffré (AES-256-GCM) que le navigateur
 * renvoie à chaque étape : le test fonctionne, mais la détection d'un nouveau départ depuis un autre appareil
 * (même numéro de téléphone) n'est alors pas possible.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "crypto";
import { crmDatabase } from "./crm-agent";

export const FRENCH_COUNT = 10; // test_french reste noté sur 10
export const LOGIC_COUNT = 8; // test_logic reste noté sur 8
export const RIDDLE_COUNT = 3; // answers.riddles_score reste au format « x/3 »
export const FRENCH_SEC = 45;
export const LOGIC_SEC = 60;
const GRACE_SEC = 5; // tolérance réseau côté serveur
const TABLE = "recruit_test_sessions";

/** Question à choix multiple : `ok` est l'unique bonne réponse, `no` les trois mauvaises. */
type Bank = { id: string; q: string; ok: string; no: [string, string, string] };

export const FRENCH_BANK: Bank[] = [
  { id: "f01", q: "Les voitures que nous avons ___ hier sont déjà vendues.", ok: "livrées", no: ["livré", "livrés", "livrer"] },
  { id: "f02", q: "Nous vous ___ de bien vouloir nous retourner le bon de commande signé.", ok: "prions", no: ["prient", "priont", "prie"] },
  { id: "f03", q: "Si le client ___ son acompte aujourd'hui, nous lancerions la commande.", ok: "versait", no: ["verserait", "versera", "verse"] },
  { id: "f04", q: "Quelle orthographe est correcte ?", ok: "acompte", no: ["accompte", "acompt", "aconte"] },
  { id: "f05", q: "Quelle orthographe est correcte ?", ok: "dédouanement", no: ["dédouannement", "dédouanemment", "dédounement"] },
  { id: "f06", q: "Les clients se sont ___ du retard de livraison.", ok: "plaints", no: ["plaint", "plaintes", "plains"] },
  { id: "f07", q: "Elles se sont ___ des e-mails toute la journée.", ok: "envoyé", no: ["envoyées", "envoyés", "envoyer"] },
  { id: "f08", q: "Il faut que vous ___ la carte grise avant vendredi.", ok: "receviez", no: ["recevez", "recevriez", "recevrez"] },
  { id: "f09", q: "___ que soient vos questions, notre équipe vous répond.", ok: "Quelles", no: ["Quelle", "Quelque", "Quels"] },
  { id: "f10", q: "Le jour ___ la voiture est arrivée, il pleuvait.", ok: "où", no: ["dont", "quand", "lequel"] },
  { id: "f11", q: "C'est la remise ___ je pensais pour votre commande.", ok: "à laquelle", no: ["que", "dont", "laquelle"] },
  { id: "f12", q: "Les deux voitures sont ___ ce matin vers Marseille.", ok: "parties", no: ["partis", "parti", "partie"] },
  { id: "f13", q: "La voiture que nous avons ___ réparer est prête.", ok: "fait", no: ["faite", "faits", "faites"] },
  { id: "f14", q: "Quelle phrase est correcte ?", ok: "Bien qu'il pleuve, la livraison est maintenue.", no: ["Malgré qu'il pleuve, la livraison est maintenue.", "Bien qu'il pleut, la livraison est maintenue.", "Malgré qu'il pleut, la livraison est maintenue."] },
  { id: "f15", q: "Vous trouverez les documents ci-___ à signer.", ok: "joints", no: ["joint", "jointes", "jointe"] },
  { id: "f16", q: "Quelle orthographe est correcte ?", ok: "immatriculation", no: ["imatriculation", "immatriculasion", "immatricullation"] },
  { id: "f17", q: "Quelle orthographe est correcte ?", ok: "accueil", no: ["acceuil", "accueuil", "acueil"] },
  { id: "f18", q: "Le client et sa femme sont ___ récupérer la voiture.", ok: "venus", no: ["venu", "venues", "venue"] },
  { id: "f19", q: "Chacun des clients ___ reçu sa facture par e-mail.", ok: "a", no: ["ont", "avons", "as"] },
  { id: "f20", q: "La plupart des clients ___ satisfaits de leur voiture.", ok: "sont", no: ["est", "es", "soit"] },
  { id: "f21", q: "Nous ___ la voiture demain si le transporteur est disponible.", ok: "livrerons", no: ["livrerions", "livrions", "livrâmes"] },
  { id: "f22", q: "Hier, le transporteur ___ à 8 h et a chargé trois voitures.", ok: "est arrivé", no: ["a arrivé", "est arrivée", "ai arrivé"] },
  { id: "f23", q: "Nous avons ___ le problème de livraison en une heure.", ok: "résolu", no: ["résolus", "résout", "résolvé"] },
  { id: "f24", q: "Il faut que le client ___ présent le jour de la livraison.", ok: "soit", no: ["est", "sois", "serait"] },
  { id: "f25", q: "Quelle phrase est correcte ?", ok: "Elle s'est permis de relancer le client.", no: ["Elle s'est permise de relancer le client.", "Elle s'est permit de relancer le client.", "Elle c'est permis de relancer le client."] },
  { id: "f26", q: "Nos voitures sont livrées ___ domicile, partout en France.", ok: "à", no: ["a", "chez", "en"] },
  { id: "f27", q: "Quel mot désigne la somme versée à l'avance au moment de la commande ?", ok: "un acompte", no: ["un solde", "un avoir", "une échéance"] },
  { id: "f28", q: "Quel est le pluriel correct ?", ok: "des pare-chocs", no: ["des pares-chocs", "des pares-choc", "des pare-choques"] },
  { id: "f29", q: "Les clients se sont ___ du problème trop tard.", ok: "aperçus", no: ["aperçu", "aperçut", "apperçus"] },
  { id: "f30", q: "Je vous saurais gré de ___ me rappeler avant midi.", ok: "bien vouloir", no: ["bien voulu", "biens vouloir", "bien veuillez"] },
  { id: "f31", q: "Veuillez ___, Madame, nos sincères salutations.", ok: "agréer", no: ["agréez", "agréé", "agrée"] },
  { id: "f32", q: "Le client nous a demandé ___ la voiture serait livrée.", ok: "quand", no: ["quant", "qu'en", "camp"] },
  { id: "f33", q: "___ à la remise, elle est valable jusqu'à vendredi.", ok: "Quant", no: ["Quand", "Qu'en", "Kant"] },
  { id: "f34", q: "Ce sont les voitures ___ je vous ai envoyé les photos.", ok: "dont", no: ["que", "où", "qu'"] },
  { id: "f35", q: "Les factures, je les ai ___ ce matin au client.", ok: "envoyées", no: ["envoyé", "envoyés", "envoyer"] },
  { id: "f36", q: "Quelle phrase est correcte ?", ok: "Nous vous prions de nous excuser pour ce retard.", no: ["Nous vous prions de nous excusez pour ce retard.", "Nous vous prions de nous excuser pour se retard.", "Nous vous prions de nous excuser pour ce retards."] },
  { id: "f37", q: "Le transporteur a ___ trois heures de retard.", ok: "eu", no: ["eut", "eus", "eût"] },
  { id: "f38", q: "Quelle formule convient pour conclure un e-mail à un client ?", ok: "Je reste à votre disposition pour toute question. Bien cordialement,", no: ["Bisous et à plus,", "Voilà, c'est tout.", "Répondez vite svp."] },
  { id: "f39", q: "Quel est le pluriel correct de « un rendez-vous » ?", ok: "des rendez-vous", no: ["des rendezs-vous", "des rendez-vouss", "des rendés-vous"] },
];

export const LOGIC_BANK: Bank[] = [
  { id: "l01", q: "Voiture à 4 990 €, livraison 450 €, carte grise 150 €. Combien le client paie-t-il au total ?", ok: "5 590 €", no: ["5 490 €", "5 690 €", "5 440 €"] },
  { id: "l02", q: "Remise de 10 % sur une voiture à 5 990 €. Quel est le nouveau prix ?", ok: "5 391 €", no: ["5 491 €", "5 890 €", "5 399 €"] },
  { id: "l03", q: "Un client achète 3 voitures à 3 990 € chacune. Quel est le total ?", ok: "11 970 €", no: ["11 870 €", "12 970 €", "11 997 €"] },
  { id: "l04", q: "Un conteneur transporte 6 voitures. Combien de conteneurs faut-il au minimum pour 45 voitures ?", ok: "8", no: ["7", "9", "7,5"] },
  { id: "l05", q: "Un camion fait 3 livraisons par jour, du lundi au vendredi. Combien de livraisons fait-il en 4 semaines ?", ok: "60", no: ["84", "48", "72"] },
  { id: "l06", q: "Voiture à 4 990 €, acompte de 20 %. Combien reste-t-il à payer ?", ok: "3 992 €", no: ["3 990 €", "998 €", "4 192 €"] },
  { id: "l07", q: "Une voiture est vendue 5 990 € TTC (TVA de 20 %). Quel est son prix hors taxes ?", ok: "4 992 € environ", no: ["4 792 €", "4 990 €", "5 192 €"] },
  { id: "l08", q: "Complétez la suite : 2, 6, 12, 20, 30, …", ok: "42", no: ["40", "44", "36"] },
  { id: "l09", q: "Complétez la suite : 1, 1, 2, 3, 5, 8, …", ok: "13", no: ["11", "12", "16"] },
  { id: "l10", q: "Complétez la suite : 81, 27, 9, 3, …", ok: "1", no: ["0", "2", "-3"] },
  { id: "l11", q: "Toutes les voitures livrées lundi sont rouges. La voiture de M. Benali n'est pas rouge. Donc :", ok: "Elle n'a pas été livrée lundi", no: ["Elle a été livrée mardi", "Elle est bleue", "On ne peut rien conclure"] },
  { id: "l12", q: "Certains clients de Lyon ont pris la climatisation. Tous les clients ayant pris la climatisation ont payé plus de 5 000 €. Donc :", ok: "Certains clients de Lyon ont payé plus de 5 000 €", no: ["Tous les clients de Lyon ont payé plus de 5 000 €", "Aucun client de Lyon n'a payé moins de 5 000 €", "Tous ceux qui ont payé plus de 5 000 € sont de Lyon"] },
  { id: "l13", q: "Les ventes passent de 40 à 50 voitures par mois. C'est une hausse de :", ok: "25 %", no: ["10 %", "20 %", "50 %"] },
  { id: "l14", q: "Les ventes passent de 50 à 40 voitures par mois. C'est une baisse de :", ok: "20 %", no: ["10 %", "25 %", "40 %"] },
  { id: "l15", q: "Un prix augmente de 25 %, puis baisse de 20 %. Par rapport au prix de départ, il est :", ok: "identique", no: ["5 % plus haut", "5 % plus bas", "2 % plus bas"] },
  { id: "l16", q: "2 préparateurs préparent 10 voitures en 5 h. Au même rythme, combien de temps faut-il à 5 préparateurs pour 20 voitures ?", ok: "4 h", no: ["2 h", "5 h", "8 h"] },
  { id: "l17", q: "Barème : livraison 450 € jusqu'à 300 km, puis 1 € par km au-delà, avec un plafond de 790 €. Combien coûte une livraison à 650 km ?", ok: "790 €", no: ["800 €", "650 €", "1 100 €"] },
  { id: "l18", q: "Un client paie 5 990 € en 3 mensualités égales sans frais. Combien vaut une mensualité ?", ok: "1 996,67 €", no: ["1 966,67 €", "1 997,33 €", "2 096,67 €"] },
  { id: "l19", q: "Un porte-voitures part à 6 h 40, roule 4 h 35 et fait une pause de 25 min. À quelle heure arrive-t-il ?", ok: "11 h 40", no: ["11 h 15", "11 h 50", "12 h 05"] },
  { id: "l20", q: "Nous sommes vendredi. Quel jour serons-nous dans 45 jours ?", ok: "Lundi", no: ["Dimanche", "Mardi", "Samedi"] },
  { id: "l21", q: "Un conteneur coûte 3 600 € de transport. Rempli avec 6 voitures, puis avec seulement 4 : de combien augmente le coût de transport par voiture ?", ok: "300 €", no: ["150 €", "600 €", "900 €"] },
  { id: "l22", q: "Voiture vendue 4 990 €, transport 350 € par voiture. Pour garder 1 500 € de marge, quel est le prix d'achat maximal ?", ok: "3 140 €", no: ["3 490 €", "2 790 €", "3 840 €"] },
  { id: "l23", q: "Un commercial vend 4, 7, 5 et 8 voitures en 4 semaines. Combien doit-il en vendre la 5e semaine pour une moyenne de 6 par semaine ?", ok: "6", no: ["5", "7", "8"] },
  { id: "l24", q: "Un modèle existe en 4 couleurs, 3 finitions, avec ou sans jantes alu. Combien de versions différentes ?", ok: "24", no: ["9", "12", "36"] },
  { id: "l25", q: "Ali, Bilal et Chérif livrent à Lyon, Nice et Lille (une ville chacun). Ali ne va pas à Lyon. Bilal va à Nice. Où va Chérif ?", ok: "Lyon", no: ["Nice", "Lille", "Impossible à savoir"] },
  { id: "l26", q: "Le modèle A coûte plus cher que B. C coûte moins cher que B. D coûte plus cher que A. Quel est le moins cher ?", ok: "C", no: ["A", "B", "D"] },
  { id: "l27", q: "Un client a payé 5 590 € au total : la voiture, la livraison (450 €) et la carte grise (150 €). Combien coûte la voiture ?", ok: "4 990 €", no: ["5 140 €", "5 040 €", "4 890 €"] },
  { id: "l28", q: "Sur 80 clients, 35 % ont choisi le modèle à 3 990 €. Combien de clients cela représente-t-il ?", ok: "28", no: ["24", "35", "32"] },
  { id: "l29", q: "Un closer conclut une vente pour 4 % de ses appels. Combien d'appels lui faut-il pour 12 ventes ?", ok: "300", no: ["48", "120", "480"] },
  { id: "l30", q: "Une batterie se recharge de 20 % à 80 % en 3 h. Au même rythme, combien de temps de 10 % à 100 % ?", ok: "4 h 30", no: ["4 h", "5 h", "3 h 30"] },
  { id: "l31", q: "Sur une voiture à 4 990 €, on fait une remise de 10 %, puis une remise supplémentaire de 5 % sur le nouveau prix. Prix final ?", ok: "4 266,45 €", no: ["4 241,50 €", "4 491,00 €", "4 316,35 €"] },
  { id: "l32", q: "Si un client a signé, alors il a versé un acompte. Karim a versé un acompte. Donc :", ok: "On ne peut pas savoir s'il a signé", no: ["Karim a signé", "Karim n'a pas signé", "Tous ceux qui ont versé un acompte ont signé"] },
];

/** Énigmes à réponse chiffrée (corrigées côté serveur sur les chiffres saisis). */
export const RIDDLE_BANK: { id: string; q: string; a: string }[] = [
  { id: "r01", q: "Un garage a 23 voitures. Toutes sont vendues sauf 8. Combien de voitures reste-t-il au garage ?", a: "8" },
  { id: "r02", q: "Un parking contient uniquement des voitures et des motos : 20 véhicules et 64 roues au total. Combien y a-t-il de voitures ?", a: "12" },
  { id: "r03", q: "Si 5 chauffeurs livrent 5 voitures en 5 heures, combien de minutes faut-il à 100 chauffeurs pour livrer 100 voitures ?", a: "300" },
  { id: "r04", q: "Une voiture et sa livraison coûtent 5 500 € au total. La voiture coûte 5 000 € de plus que la livraison. Combien coûte la livraison, en euros ?", a: "250" },
  { id: "r05", q: "Dans une file d'attente, la voiture de Sami est la 7e en partant de l'avant et la 9e en partant de l'arrière. Combien de voitures y a-t-il dans la file ?", a: "15" },
  { id: "r06", q: "Chaque jour, le nombre de voitures garées sur un parc double. Le parc est plein au bout de 12 jours. Au bout de combien de jours était-il à moitié plein ?", a: "11" },
  { id: "r07", q: "Il faut 3 minutes pour couper une barre de métal en 2 morceaux. Combien de minutes faut-il pour la couper en 5 morceaux ?", a: "12" },
  { id: "r08", q: "Un commercial a fait 3 ventes de plus que sa collègue. Ensemble, ils ont fait 21 ventes. Combien de ventes le commercial a-t-il faites ?", a: "12" },
  { id: "r09", q: "Dans une famille, chaque fille a autant de frères que de sœurs, et chaque garçon a deux fois plus de sœurs que de frères. Combien y a-t-il d'enfants ?", a: "7" },
  { id: "r10", q: "Un camion fait un trajet de 120 km à 60 km/h à l'aller et à 40 km/h au retour. Quelle est sa vitesse moyenne sur l'aller-retour, en km/h ?", a: "48" },
  { id: "r11", q: "Un vendeur achète une voiture 3 000 €, la vend 4 000 €, la rachète 3 500 € puis la revend 4 500 €. Quel est son gain total, en euros ?", a: "2000" },
  { id: "r12", q: "Une horloge sonne 6 coups à 6 h, en 5 secondes (coups régulièrement espacés). Combien de secondes lui faut-il pour sonner 12 coups à midi ?", a: "11" },
];

const W = "Rédaction (10 à 15 lignes, sans copier-coller ni outil de rédaction) : un client écrit";
export const WRITING_SCENARIOS: { id: string; prompt: string }[] = [
  { id: "w1", prompt: `${W} « J'ai versé un acompte il y a 3 semaines et je n'ai aucune nouvelle. C'est une arnaque ? Je veux être remboursé. ». Rédigez l'e-mail que vous lui envoyez : rassurer, expliquer où en est sa commande, proposer une solution concrète et une date, sans promettre ce que vous ne pouvez pas tenir.` },
  { id: "w2", prompt: `${W} « Ma voiture devait être livrée ce matin, le transporteur n'est jamais venu et personne ne répond au téléphone. J'ai posé un jour de congé pour rien ! ». Rédigez l'e-mail que vous lui envoyez : vous excuser sincèrement, expliquer ce qui s'est passé, proposer une nouvelle date et un geste concret, sans promettre ce que vous ne pouvez pas tenir.` },
  { id: "w3", prompt: `${W} « La voiture est arrivée avec une rayure sur la portière arrière et le chauffeur m'a fait signer sans me laisser vérifier. Qu'allez-vous faire ? ». Rédigez l'e-mail que vous lui envoyez : reconnaître le problème, demander les éléments utiles (photos, bon de livraison), expliquer la prise en charge et donner un délai réaliste.` },
  { id: "w4", prompt: `${W} « Cela fait un mois que j'ai payé et je n'ai toujours pas reçu ma carte grise. Je ne peux pas rouler avec ma voiture. Vous m'aviez dit 10 jours. ». Rédigez l'e-mail que vous lui envoyez : rassurer, expliquer où en est la démarche, proposer une solution en attendant et une date, sans promettre ce que vous ne pouvez pas tenir.` },
  { id: "w5", prompt: `${W} « J'ai vu la même voiture 600 € moins cher chez un concurrent. Si vous ne baissez pas votre prix, j'annule ma commande. ». Rédigez l'e-mail que vous lui envoyez : garder le client sans brader le prix, mettre en avant ce que comprend votre offre, proposer une solution concrète et une prochaine étape.` },
  { id: "w6", prompt: `${W} « Mon fils doit pouvoir aller au lycée avec la voiture dès la rentrée, dans 3 semaines. Vous m'aviez promis une livraison rapide : où en est ma commande ? ». Rédigez l'e-mail que vous lui envoyez : faire le point précis sur la commande, être honnête sur les délais, proposer une solution concrète et une date.` },
  { id: "w7", prompt: `${W} « La batterie de ma voiture achetée il y a 2 mois ne tient plus que 30 km au lieu des 75 km annoncés. Je veux une solution, sinon je laisse un avis négatif partout. ». Rédigez l'e-mail que vous lui envoyez : désamorcer la colère, poser les bonnes questions, expliquer la garantie et la marche à suivre avec une date.` },
  { id: "w8", prompt: `${W} « Le livreur me réclame 150 € de plus à la livraison alors que mon bon de commande indique livraison comprise. C'est inadmissible. ». Rédigez l'e-mail que vous lui envoyez : vérifier et clarifier la situation, vous excuser si l'erreur vient de NeoDrive, proposer une solution concrète et immédiate.` },
];

const FR = new Map(FRENCH_BANK.map(q => [q.id, q]));
const LO = new Map(LOGIC_BANK.map(q => [q.id, q]));
const RI = new Map(RIDDLE_BANK.map(q => [q.id, q]));
const bankOf = (id: string) => FR.get(id) || LO.get(id);
/** Options dans l'ordre d'affichage du candidat : index 0 = bonne réponse dans la banque. */
const optionsOf = (b: Bank) => [b.ok, ...b.no];

export type Item = { id: string; k: "fr" | "lo"; o: number[] };
export type Log = { id: string; pick: number | null; sec: number; timeout: boolean; hidden: number };
export type TestState = {
  v: 1; created: number; phone: string; name: string; poste: string;
  items: Item[]; i: number; shownAt: number | null; log: Log[];
  riddles: string[]; riddleShownAt: number | null; riddleAnswers: string[] | null; riddleSec: number | null;
  scenario: string; hidden: number; restarts: number; otherDevice: boolean;
};

function shuffle<T>(a: T[]): T[] { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }
export const phoneTail = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);

export function newState(phone: string, name: string, poste: string): TestState {
  const pick = (bank: Bank[], n: number, k: "fr" | "lo"): Item[] => shuffle(bank).slice(0, n).map(b => ({ id: b.id, k, o: shuffle([0, 1, 2, 3]) }));
  return {
    v: 1, created: Date.now(), phone: phoneTail(phone), name: name.slice(0, 120), poste: poste.slice(0, 20),
    items: [...pick(FRENCH_BANK, FRENCH_COUNT, "fr"), ...pick(LOGIC_BANK, LOGIC_COUNT, "lo")], i: 0, shownAt: null, log: [],
    riddles: shuffle(RIDDLE_BANK).slice(0, RIDDLE_COUNT).map(r => r.id), riddleShownAt: null, riddleAnswers: null, riddleSec: null,
    scenario: WRITING_SCENARIOS[randomInt(WRITING_SCENARIOS.length)].id, hidden: 0, restarts: 0, otherDevice: false,
  };
}

const limitOf = (it: Item) => it.k === "fr" ? FRENCH_SEC : LOGIC_SEC;
export const mcqDone = (s: TestState) => s.i >= s.items.length;
export const scenarioText = (s: TestState) => (WRITING_SCENARIOS.find(w => w.id === s.scenario) || WRITING_SCENARIOS[0]).prompt;

/** Passe les questions dont le temps est écoulé (rechargement de la page, coupure…) et révèle la suivante. */
export function advanceTimeouts(s: TestState, now = Date.now()) {
  while (!mcqDone(s) && s.shownAt != null) {
    const it = s.items[s.i]; const el = (now - s.shownAt) / 1000;
    if (el <= limitOf(it) + GRACE_SEC) break;
    s.log.push({ id: it.id, pick: null, sec: limitOf(it), timeout: true, hidden: 0 });
    s.i++; s.shownAt = null; // la question suivante n'a jamais été vue : elle est révélée maintenant
  }
  if (!mcqDone(s) && s.shownAt == null) s.shownAt = now;
}

/** Enregistre la réponse à la question courante (qid doit correspondre : renvoi idempotent). */
export function answer(s: TestState, qid: string, pick: number | null, hidden: number, now = Date.now()) {
  advanceTimeouts(s, now);
  if (mcqDone(s)) return;
  const it = s.items[s.i]; if (it.id !== qid) return; // réponse en double ou à une question déjà expirée
  const el = (now - (s.shownAt ?? now)) / 1000; const late = el > limitOf(it) + GRACE_SEC;
  const valid = pick != null && Number.isInteger(pick) && pick >= 0 && pick < 4 && !late;
  const h = Math.max(0, Math.min(99, Math.round(Number(hidden) || 0)));
  s.log.push({ id: it.id, pick: valid ? pick : null, sec: Math.min(limitOf(it), Math.round(el)), timeout: !valid, hidden: h });
  s.hidden = Math.min(999, s.hidden + h);
  s.i++; s.shownAt = mcqDone(s) ? null : now;
}

/** Question courante telle qu'envoyée au navigateur : texte et options mélangées, jamais la bonne réponse. */
export function publicView(s: TestState, now = Date.now()) {
  const base = { total: s.items.length, frTotal: FRENCH_COUNT, loTotal: LOGIC_COUNT, scenario: scenarioText(s), restarted: s.restarts > 0 };
  if (mcqDone(s)) {
    const riddles = s.riddleShownAt ? s.riddles.map((id, n) => ({ n, q: `Énigme ${n + 1} : ${RI.get(id)?.q || ""}` })) : null;
    return { ...base, done: true as const, riddles, riddlesStarted: !!s.riddleShownAt, riddlesDone: !!s.riddleAnswers, riddleElapsed: s.riddleShownAt ? Math.round(((s.riddleAnswers ? s.riddleShownAt + (s.riddleSec || 0) * 1000 : now) - s.riddleShownAt) / 1000) : 0 };
  }
  const it = s.items[s.i]; const b = bankOf(it.id)!; const opts = optionsOf(b); const lim = limitOf(it);
  const el = (now - (s.shownAt ?? now)) / 1000;
  const n = it.k === "fr" ? s.i + 1 : s.i - FRENCH_COUNT + 1;
  return { ...base, done: false as const, question: { qid: it.id, section: it.k === "fr" ? "Français" : "Logique", n, of: it.k === "fr" ? FRENCH_COUNT : LOGIC_COUNT, index: s.i + 1, q: b.q, options: it.o.map(x => opts[x]), seconds: lim, remaining: Math.max(0, Math.round(lim - el)) } };
}

export function startRiddles(s: TestState, now = Date.now()) { if (mcqDone(s) && !s.riddleShownAt) s.riddleShownAt = now; }
export function submitRiddles(s: TestState, values: unknown, now = Date.now()) {
  if (!s.riddleShownAt || s.riddleAnswers) return;
  const arr = Array.isArray(values) ? values : [];
  s.riddleAnswers = s.riddles.map((_, n) => String(arr[n] ?? "").replace(/[<>]/g, "").trim().slice(0, 40));
  s.riddleSec = Math.min(36000, Math.max(1, Math.round((now - s.riddleShownAt) / 1000)));
}

/** Correction finale (au dépôt de la candidature). */
export function grade(s: TestState) {
  const log = s.items.map(it => {
    const b = bankOf(it.id)!; const opts = optionsOf(b); const l = s.log.find(x => x.id === it.id);
    const chosen = l?.pick != null ? opts[it.o[l.pick]] : null;
    return { k: it.k, q: b.q, chosen, correct: b.ok, ok: chosen === b.ok, sec: l?.sec ?? null, timeout: l ? l.timeout : true, hidden: l?.hidden ?? 0 };
  });
  const french = log.filter(x => x.k === "fr" && x.ok).length; const logic = log.filter(x => x.k === "lo" && x.ok).length;
  const ra = s.riddleAnswers || [];
  const riddleLog = s.riddles.map((id, n) => { const r = RI.get(id)!; const given = ra[n] ?? ""; return { q: r.q, given, correct: r.a, ok: given.replace(/\D/g, "") === r.a }; });
  const riddlesOk = riddleLog.filter(r => r.ok).length;
  const secs = log.filter(x => x.sec != null && !x.timeout).map(x => x.sec as number);
  const signals = {
    hidden: s.hidden, restarts: s.restarts, other_device: s.otherDevice,
    timeouts: log.filter(x => x.timeout).length, fast: log.filter(x => !x.timeout && (x.sec ?? 99) <= 3).length,
    avg_sec: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : null,
    sec: log.map(x => x.sec), riddle_sec: s.riddleSec,
  };
  return { french, logic, log, riddleLog, riddlesOk, signals };
}

// ---------- Stockage : table Supabase, sinon jeton chiffré ----------
let devKey: Buffer | null = null;
function key() {
  const secret = process.env.RECRUIT_TEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret) return createHash("sha256").update(`recruit-test-v1:${secret}`).digest();
  if (!devKey) { devKey = randomBytes(32); console.warn("[TEST] aucun secret : clé de chiffrement temporaire"); }
  return devKey;
}
function seal(s: TestState) {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(s), "utf8"), c.final()]);
  return "t." + Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}
function unseal(t: string): TestState | null {
  try { const b = Buffer.from(t.slice(2), "base64url"); const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); const s = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")); return s?.v === 1 ? s : null; } catch { return null; }
}
function db() { try { return crmDatabase(); } catch { return null; } }

export type Loaded = { sid: string; state: TestState; applicationId: number | null };

export async function loadSession(sid: unknown): Promise<Loaded | null> {
  const t = String(sid ?? "");
  if (t.startsWith("t.")) { const state = unseal(t); return state ? { sid: t, state, applicationId: null } : null; }
  if (/^d\.[a-f0-9]{32}$/.test(t)) {
    const c = db(); if (!c) return null;
    const { data, error } = await c.from(TABLE).select("state,application_id").eq("token", t.slice(2)).maybeSingle();
    if (error || !data?.state) return null;
    return { sid: t, state: data.state as TestState, applicationId: data.application_id ?? null };
  }
  return null;
}

/** Premier test passé avec ce numéro (pour retrouver le tirage d'origine depuis un autre appareil). */
export async function findByPhone(phone: string): Promise<Loaded | null> {
  const tail = phoneTail(phone); const c = db(); if (!c || tail.length < 8) return null;
  const { data, error } = await c.from(TABLE).select("token,state,application_id").eq("phone_tail", tail).order("created_at", { ascending: true }).limit(1);
  if (error || !data?.length) return null;
  return { sid: `d.${data[0].token}`, state: data[0].state as TestState, applicationId: data[0].application_id ?? null };
}

/** Enregistre l'état ; renvoie le sid à donner au navigateur (inchangé en mode table, nouveau jeton sinon). */
export async function saveSession(sid: string | null, s: TestState): Promise<string> {
  const c = db();
  if (sid?.startsWith("d.") && c) {
    const { error } = await c.from(TABLE).update({ state: s, updated_at: new Date().toISOString() }).eq("token", sid.slice(2));
    if (!error) return sid;
    console.error("[TEST] mise à jour", error.message);
  }
  if (!sid && c) {
    const token = randomBytes(16).toString("hex");
    const { error } = await c.from(TABLE).insert({ token, phone_tail: s.phone, poste: s.poste, full_name: s.name, state: s });
    if (!error) return `d.${token}`;
    console.warn("[TEST] table recruit_test_sessions indisponible, jeton chiffré utilisé :", error.message);
  }
  return seal(s);
}

export async function linkApplication(sid: string, applicationId: number) {
  const c = db(); if (!c || !sid.startsWith("d.")) return;
  await c.from(TABLE).update({ application_id: applicationId }).eq("token", sid.slice(2)).is("application_id", null);
}
