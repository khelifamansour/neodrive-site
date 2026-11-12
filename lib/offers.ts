/** Offres de mission freelance (Algérie) : variables, modèles par poste et calculs (revenu du prestataire, coût NeoDrive, coût si salarié). */
import { POSTES, type PosteKey } from "./hiring";

export type OfferParams = {
  fixe: number;                 // fixe mensuel en DA
  charges: number;              // remboursement forfaitaire des charges d'auto-entrepreneur (DA / mois)
  assiduite: number;            // prime d'assiduité (DA / mois)
  commission: number;           // DA par voiture livrée et payée (0 = pas de commission)
  palierVentes: number;         // nombre de ventes pour le bonus de palier (0 = aucun)
  palierBonus: number;          // bonus de palier (DA)
  objectifLabel: string;        // prime d'objectif hors ventes (ex. conteneurs sans retard)
  objectifMontant: number;      // DA / mois (0 = aucune)
  reposJours: number;           // jours de repos payés par an
  essaiJours: number;           // période d'essai (jours)
  debut: string;                // date de début (AAAA-MM-JJ)
  horaires: string;
  tauxEur: number;              // DA pour 1 € : taux de conversion (fixé dans le contrat si paiement en euros)
  devise: "DA" | "EUR";         // devise du contrat et du paiement
  ventesType: number;           // ventes d'un mois « normal », pour l'exemple
};

/** Repères de marché à Alger (net mensuel, DA), sources : annonces Emploitic/Ouedkniss, Glassdoor, Paylab (novembre 2026). */
export const MARKET: Record<PosteKey, { low: number; high: number; label: string }> = {
  closer: { low: 50000, high: 60000, label: "téléconseiller / commercial sédentaire à Alger (fixe + primes)" },
  coordinateur: { low: 50000, high: 70000, label: "assistant(e) logistique / ADV / transit à Alger" },
  social: { low: 40000, high: 60000, label: "community manager / monteur vidéo junior à Alger" },
};

const base = { charges: 3000, assiduite: 3000, reposJours: 15, essaiJours: 30, debut: "", horaires: "Du lundi au samedi, aux horaires de bureau français (9 h – 18 h heure de Paris), ponctuellement le dimanche selon les besoins", tauxEur: 270, devise: "EUR" as const };
export const TEMPLATES: Record<PosteKey, OfferParams> = {
  closer: { ...base, fixe: 50000, commission: 2500, palierVentes: 20, palierBonus: 10000, objectifLabel: "", objectifMontant: 0, ventesType: 10 },
  coordinateur: { ...base, fixe: 55000, commission: 0, palierVentes: 0, palierBonus: 0, objectifLabel: "Conteneurs du mois dédouanés et livrés sans retard ni erreur de document", objectifMontant: 7000, ventesType: 0 },
  social: { ...base, fixe: 45000, commission: 0, palierVentes: 0, palierBonus: 0, objectifLabel: "Objectif mensuel de vidéos publiées et de contacts générés atteint", objectifMontant: 7000, ventesType: 0 },
};

export const MISSIONS: Record<PosteKey, string[]> = {
  closer: ["Rappeler les clients français (prospects Leboncoin, WhatsApp, publicité) dans la journée", "Conseiller, traiter les objections et conclure les réservations", "Gérer l'administratif client : devis, dossier de carte grise, planification des livraisons", "Assurer le premier niveau du service après-vente et le suivi dans le CRM"],
  coordinateur: ["Suivre les commandes usine et les conteneurs jusqu'à l'arrivée", "Préparer et vérifier les documents d'import (factures, listes de colisage, COC, B/L) avec le transitaire", "Organiser le stockage, le dépotage et le planning des livraisons", "Suivre le chauffeur à distance et tenir les tableaux de bord à jour"],
  social: ["Construire la stratégie vidéo et écrire les scénarios", "Monter et publier des vidéos courtes (TikTok, Reels) selon le planning", "Gérer les commentaires et les messages", "Analyser les statistiques et proposer des améliorations pour générer des contacts"],
};

/** Charges d'auto-entrepreneur algérien sur un revenu mensuel : IFU 0,5 % (minimum 10 000 DA/an) + CASNOS forfaitaire 24 000 DA/an. */
export function freelanceCharges(monthly: number) {
  return Math.round(Math.max(monthly * 12 * 0.005, 10000) / 12 + 2000);
}

/** Revenu mensuel du prestataire pour un nombre de ventes donné. */
export function monthly(p: OfferParams, ventes: number, opts: { assidu?: boolean; objectif?: boolean } = {}) {
  const assidu = opts.assidu !== false, objectif = opts.objectif !== false;
  const com = p.commission * ventes; const palier = p.palierVentes > 0 && ventes >= p.palierVentes ? p.palierBonus : 0;
  const brut = p.fixe + p.charges + (assidu ? p.assiduite : 0) + com + palier + (objectif ? p.objectifMontant : 0);
  const ch = freelanceCharges(brut);
  return { brut, charges: ch, net: brut - ch, variable: com + palier + (assidu ? p.assiduite : 0) + (objectif ? p.objectifMontant : 0) };
}

/** Barème IRG (estimation) et charges CNAS : brut nécessaire pour un net donné, et coût employeur. */
function irg(t: number) {
  const b: [number, number][] = [[20000, 0], [40000, 0.23], [80000, 0.27], [160000, 0.30], [320000, 0.33], [Infinity, 0.35]];
  let prev = 0, r = 0; for (const [lim, rate] of b) { if (t > prev) r += (Math.min(t, lim) - prev) * rate; prev = lim; }
  const ab = Math.min(Math.max(r * 0.4, 1000), 1500); return Math.max(r - ab, 0);
}
export function salariedCost(net: number) {
  const netOf = (g: number) => { const t = g * 0.91; return t - irg(t); };
  let lo = net, hi = net * 3; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (netOf(m) < net) lo = m; else hi = m; }
  return { brut: Math.round(hi), cout: Math.round(hi * 1.26) };
}

export function warnings(poste: PosteKey, p: OfferParams) {
  const w: string[] = []; const m = MARKET[poste]; const n = monthly(p, p.ventesType).net;
  if (p.fixe > m.high) w.push(`Fixe au-dessus du marché (${m.low.toLocaleString("fr-FR")} – ${m.high.toLocaleString("fr-FR")} DA) : difficile à maintenir en cas de passage en salarié.`);
  if (p.fixe < m.low - 5000) w.push("Fixe sous le marché : risque de refus des bons profils.");
  if (n > m.high * 1.6) w.push("Revenu d'un mois normal très élevé par rapport au marché local.");
  if (p.commission > 4000) w.push("Commission élevée : au-delà de 4 000 DA par voiture, le coût monte vite si le volume augmente.");
  return w;
}

export const posteTitle = (k: PosteKey) => POSTES[k]?.title || k;
export const fmtDA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DA`;

/** Texte de la proposition de mission (affiché au candidat et figé au moment de la signature). */
/** Montant affiché au candidat, dans la devise du contrat (euros arrondis à l'euro, au taux fixé). */
export const money = (p: OfferParams, da: number) => p.devise === "EUR" ? `${Math.round(da / (p.tauxEur || 270)).toLocaleString("fr-FR")} €` : fmtDA(da);

export function contract(poste: PosteKey, p: OfferParams, name: string) {
  const fmtDA = (n: number) => money(p, n);
  const ex = [5, 10, 20].map(v => ({ v, ...monthly(p, v) }));
  const debut = p.debut ? new Date(p.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "à convenir";
  const remu = [`Rémunération fixe : ${fmtDA(p.fixe)} par mois.`,
    p.charges ? `Prise en charge forfaitaire de vos charges d'auto-entrepreneur (impôt forfaitaire et CASNOS) : ${fmtDA(p.charges)} par mois.` : "",
    p.assiduite ? `Prime d'assiduité : ${fmtDA(p.assiduite)} par mois, versée en l'absence de toute absence non prévenue et de tout retard dans le mois.` : "",
    p.commission ? `Commission : ${fmtDA(p.commission)} par véhicule livré et entièrement payé par le client, à condition que le suivi des clients soit à jour dans le CRM.` : "",
    p.palierVentes && p.palierBonus ? `Bonus de palier : ${fmtDA(p.palierBonus)} dès ${p.palierVentes} véhicules livrés dans le mois.` : "",
    p.objectifMontant ? `Prime d'objectif : ${fmtDA(p.objectifMontant)} par mois si l'objectif suivant est atteint : ${p.objectifLabel}.` : "",
    p.reposJours ? `${p.reposJours} jours de repos rémunérés par an (au prorata du temps de mission), à poser en accord avec NeoDrive.` : ""].filter(Boolean);
  return {
    title: `Proposition de mission freelance – ${posteTitle(poste)}`,
    intro: `Bonjour ${name.split(" ")[0]}, suite à votre candidature et à nos échanges, NeoDrive (MK HOLDING, SIREN 908 645 393, 31 rue Jean Nougaro, 31600 Muret, France), marque française de voitures sans permis électriques, a le plaisir de vous proposer la mission suivante.`,
    sections: [
      { title: "Votre mission", items: MISSIONS[poste] },
      { title: "Organisation", items: [`Statut : prestataire indépendant (auto-entrepreneur en Algérie). Il ne s'agit pas d'un contrat de travail salarié.`, `Lieu : présentiel à Alger.`, `Horaires : ${p.horaires}.`, `Début : ${debut}.`, `Période d'essai : ${p.essaiJours} jours, pendant lesquels chacune des parties peut arrêter la mission sans préavis. Ensuite, préavis de 15 jours.`] },
      { title: "Votre rémunération", items: remu },
      { title: "Exemples de revenu mensuel (avant vos charges d'auto-entrepreneur)", items: p.commission ? ex.map(e => `${e.v} véhicules livrés : ${fmtDA(e.brut)}`) : [`Mois avec objectif atteint et assiduité complète : ${fmtDA(monthly(p, 0).brut)}`, `Mois sans prime : ${fmtDA(p.fixe + p.charges)}`] },
      { title: "Paiement et conditions", items: ["Facturation mensuelle par le prestataire ; paiement au plus tard le 10 du mois suivant.", p.devise === "EUR" ? "Les montants sont fixés et payés en euros, par virement bancaire. Ils sont fermes et définitifs : aucune variation du taux de change, quelle qu'elle soit, ne peut donner lieu à réclamation ni à ajustement." : "Les montants sont fixés et payés en dinars algériens (DA).", "Le prestataire est responsable de son immatriculation et de ses déclarations d'auto-entrepreneur.", "Confidentialité : les informations sur les clients, les prix et les fournisseurs de NeoDrive restent strictement confidentielles, pendant et après la mission.", "Après une période concluante, NeoDrive pourra proposer une évolution de la rémunération ou du statut."] },
    ],
  };
}
