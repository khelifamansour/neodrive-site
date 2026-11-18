/**
 * Simulation des ventes et du plan logistique sur 12 mois (page /giga/simulation, fondateur seulement).
 * Tout le calcul est fait ici, sans base de données : la page charge l'historique réel (réservations par mois,
 * part du sud) par l'action "sim_history" de /api/giga et applique les hypothèses réglables.
 */

export const SIM_MONTHS = ["Déc. 26", "Janv. 27", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov. 27"];

/** Saisonnalité estimée du marché des voitures sans permis (1 = mois moyen). À corriger avec les vrais chiffres. */
export const SEASON = [0.85, 0.85, 0.95, 1.15, 1.2, 1.2, 1.1, 0.85, 0.7, 1.2, 1.1, 1.0];

export type SimHyp = {
  base: number;            // réservations par mois au rythme actuel (mois moyen)
  croissance: number;      // % par mois (pub, avis, automatisation)
  conversion: number;      // % des réservations qui deviennent une vente
  hausse: number;          // hausse de prix en € TTC
  mois_hausse: number;     // index du mois où la hausse s'applique (0 = décembre)
  elasticite: number;      // 1 = +10 % de prix fait perdre 10 % de demande
  equipe_mois: number;     // mois d'arrivée de l'équipe commerciale (Algérie)
  equipe_gain: number;     // % de ventes en plus grâce aux rappels systématiques
  reseau_mois: number;     // mois des premiers revendeurs
  reseau_par_mois: number; // ventes revendeurs ajoutées chaque mois après le démarrage
  reseau_max: number;      // plafond de ventes revendeurs par mois sur l'année
  part_sud: number;        // % des ventes directes au sud
  prix_ttc: number;        // prix moyen TTC actuel (sert à mesurer l'effet de la hausse)
  net_direct: number;      // ce qui te reste HT par voiture vendue en direct, avant usine et arrivée (prévisionnel)
  usine: number;           // prix usine par voiture (€)
  arrivee: number;         // fret + douane + dépotage par voiture (€)
  livraison: number;       // coût moyen de livraison client par voiture (€)
  net_revendeur: number;   // ce que tu touches HT par voiture vendue par un revendeur
  cap_livreur: number;     // livraisons par mois et par livreur
  par_conteneur: number;   // voitures par conteneur 40 pieds
  fixes: number;           // frais fixes par mois (pub, équipe Algérie, assurance, dépôts, outils)
  livreur_nord: number;    // coût mensuel du livreur de Gennevilliers une fois embauché
};

export const DEFAULT_SIM: SimHyp = {
  base: 22, croissance: 3, conversion: 80,
  hausse: 500, mois_hausse: 1, elasticite: 1,
  equipe_mois: 1, equipe_gain: 20,
  reseau_mois: 4, reseau_par_mois: 2, reseau_max: 16,
  part_sud: 55, prix_ttc: 5860, net_direct: 4230, usine: 1570, arrivee: 850, livraison: 250, net_revendeur: 3550,
  cap_livreur: 14, par_conteneur: 9, fixes: 4000, livreur_nord: 2800,
};

export type SimRow = {
  mois: string; reservations: number; direct: number; reseau: number; total: number;
  sud: number; nord: number; conteneurs: number; livreurs_nord: number; livreurs_sud: number;
  ca_ht: number; marge: number; marge_voiture: number; fixes: number; resultat: number;
};

export function simulate(h: SimHyp): SimRow[] {
  let livreurNord = false;
  return SIM_MONTHS.map((mois, i) => {
    const effetPrix = i >= h.mois_hausse ? Math.max(0, 1 - (h.elasticite * h.hausse) / h.prix_ttc) : 1;
    const effetEquipe = i >= h.equipe_mois ? 1 + h.equipe_gain / 100 : 1;
    const reservations = h.base * SEASON[i] * Math.pow(1 + h.croissance / 100, i) * effetPrix * effetEquipe;
    const direct = Math.round(reservations * h.conversion / 100);
    const reseau = i >= h.reseau_mois ? Math.min(h.reseau_max, h.reseau_par_mois * (i - h.reseau_mois + 1)) : 0;
    const sud = Math.round(direct * h.part_sud / 100); const nord = direct - sud;
    const htDirect = h.net_direct + (i >= h.mois_hausse ? h.hausse / 1.2 : 0);
    const coutVoiture = h.usine + h.arrivee;
    const mDirect = htDirect - coutVoiture - h.livraison;
    const mReseau = h.net_revendeur - coutVoiture;
    if (nord > 10) livreurNord = true;
    const marge = direct * mDirect + reseau * mReseau;
    const fixes = h.fixes + (livreurNord ? h.livreur_nord : 0);
    return {
      mois, reservations: Math.round(reservations), direct, reseau, total: direct + reseau, sud, nord,
      conteneurs: Math.ceil((direct + reseau) / h.par_conteneur),
      livreurs_nord: Math.max(1, Math.ceil(nord / h.cap_livreur)), livreurs_sud: Math.max(1, Math.ceil(sud / h.cap_livreur)),
      ca_ht: direct * htDirect + reseau * h.net_revendeur,
      marge, marge_voiture: mDirect, fixes, resultat: marge - fixes,
    };
  });
}

/** Coût mensuel du dépotage + stockage d'un dépôt : sous-traité (type Ansquer) ou fait soi-même (terrain + gars). */
export type HubHyp = { voitures: number; stock: number; terrain: number; materiel: number; assurance: number; heures_conteneur: number; taux: number };
export const DEFAULT_HUB: HubHyp = { voitures: 15, stock: 20, terrain: 1200, materiel: 3000, assurance: 250, heures_conteneur: 4, taux: 25 };

export function hubCost(x: HubHyp, parConteneur = 9) {
  const conteneurs = x.voitures / parConteneur;
  const soustraite = conteneurs * 400 + x.voitures * 25 + x.stock * 15; // dépotage 400 € + 25 €/voiture + 15 €/voiture/mois
  const interne = x.terrain + x.materiel / 24 + x.assurance + conteneurs * x.heures_conteneur * x.taux;
  // Volume à partir duquel le dépôt à soi devient moins cher (stock ≈ 1,3 mois de ventes).
  let seuil = 0;
  for (let v = 1; v <= 200; v++) {
    const c = v / parConteneur, s = v * 1.3;
    if (c * 400 + v * 25 + s * 15 >= x.terrain + x.materiel / 24 + x.assurance + c * x.heures_conteneur * x.taux) { seuil = v; break; }
  }
  return { soustraite, interne, seuil };
}

/** Jalons du plan, calculés à partir de la simulation. */
export function milestones(rows: SimRow[], h: SimHyp) {
  const first = (f: (r: SimRow) => boolean) => { const i = rows.findIndex(f); return i < 0 ? null : rows[i].mois; };
  return [
    { quand: SIM_MONTHS[h.equipe_mois] ?? "—", quoi: "Équipe commerciale Algérie (1 commercial + le directeur commercial)", pourquoi: "Rappeler chaque contact en moins d'une heure : c'est là que tu perds le plus de ventes aujourd'hui." },
    { quand: SIM_MONTHS[h.mois_hausse] ?? "—", quoi: `Hausse de prix de ${h.hausse} €`, pourquoi: "Tu restes parmi les moins chers ; la marge par voiture monte bien plus que la demande ne baisse." },
    { quand: "Janv. 27", quoi: "Véhicule tracteur + remorque 3 voitures pour Serge", pourquoi: "Chaque retour de Serge rapporte 3 voitures au sud au lieu de 2." },
    { quand: first(r => r.nord > 10) ?? "Pas sur l'année", quoi: "Livreur basé à Gennevilliers (avec le testeur et la grande remorque)", pourquoi: "Plus de 10 livraisons par mois au nord : Serge ne remonte plus, il garde tout le sud." },
    { quand: SIM_MONTHS[h.reseau_mois] ?? "—", quoi: "Premiers revendeurs (le directeur commercial les cherche)", pourquoi: "Ventes sans coût de livraison client ; le revendeur vient chercher au dépôt." },
    { quand: first(r => r.sud >= 15) ?? "Pas sur l'année", quoi: "Dépôt à Fos + un gars sur place (dépotage + livraisons Sud-Est)", pourquoi: "Environ 15 ventes par mois au sud : les conteneurs du sud arrivent directement à Fos." },
    { quand: first(r => r.total >= 40) ?? "Pas sur l'année", quoi: "2e commercial en Algérie + marketing", pourquoi: "Environ 40 ventes par mois au total." },
  ];
}
