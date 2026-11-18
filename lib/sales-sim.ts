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
  fixes: number;           // frais fixes par mois hors pub (équipe Algérie, assurance, comptable, logiciels, SAV)
  pub_actuelle: number;    // budget pub par mois déjà compris dans le rythme actuel (€)
  pub: number;             // budget pub par mois visé (€)
  mois_pub: number;        // mois où le nouveau budget pub démarre
  cout_resa: number;       // coût d'une réservation en plus avec la pub supplémentaire (€)
  livreur_nord: number;    // coût mensuel du livreur de Gennevilliers une fois embauché
};

export const DEFAULT_SIM: SimHyp = {
  base: 22, croissance: 3, conversion: 80,
  hausse: 500, mois_hausse: 1, elasticite: 1,
  equipe_mois: 1, equipe_gain: 20,
  reseau_mois: 4, reseau_par_mois: 2, reseau_max: 16,
  // Coûts réels (nov. 2026) : usine 1 771 $ à 1 € = 1,10 $ ; fret ≈ 530 $, droits 10 %, transitaire, dépotage, stockage ≈ 1 030 €.
  // Net HT : Confort 4 990 € TTC + livraison moyenne 550 € TTC + 50 € gagnés sur la carte grise.
  // Livraison : Serge (≈ 5 000 €) + déplacements (≈ 5 000 €) pour ≈ 24 voitures, soit ≈ 420 € par voiture.
  part_sud: 55, prix_ttc: 5690, net_direct: 4666, usine: 1611, arrivee: 1030, livraison: 420, net_revendeur: 3800,
  cap_livreur: 14, par_conteneur: 9, fixes: 4500, livreur_nord: 1500,
  pub_actuelle: 1500, pub: 5000, mois_pub: 1, cout_resa: 400,
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
    const pubEnPlus = i >= h.mois_pub ? Math.max(0, h.pub - h.pub_actuelle) : 0;
    const montee = i - h.mois_pub === 0 ? 0.5 : 1; // la pub met environ un mois à donner son plein effet
    const resaPub = h.cout_resa > 0 ? montee * pubEnPlus / h.cout_resa : 0;
    const reservations = (h.base * Math.pow(1 + h.croissance / 100, i) * effetEquipe + resaPub) * SEASON[i] * effetPrix;
    const direct = Math.round(reservations * h.conversion / 100);
    const reseau = i >= h.reseau_mois ? Math.min(h.reseau_max, h.reseau_par_mois * (i - h.reseau_mois + 1)) : 0;
    const sud = Math.round(direct * h.part_sud / 100); const nord = direct - sud;
    const htDirect = h.net_direct + (i >= h.mois_hausse ? h.hausse / 1.2 : 0);
    const coutVoiture = h.usine + h.arrivee;
    const mDirect = htDirect - coutVoiture - h.livraison;
    const mReseau = h.net_revendeur - coutVoiture;
    if (nord > 10) livreurNord = true;
    const marge = direct * mDirect + reseau * mReseau;
    const fixes = h.fixes + (i >= h.mois_pub ? h.pub : h.pub_actuelle) + (livreurNord ? h.livreur_nord : 0);
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
    { quand: first((r, ) => r.sud >= 15 && rows.filter(x => x.sud >= 15).length >= 3) ?? "Pas sur l'année", quoi: "Dépôt à Fos + un gars sur place (dépotage + livraisons Sud-Est)", pourquoi: "Environ 15 ventes par mois au sud : les conteneurs du sud arrivent directement à Fos." },
    { quand: first(r => r.total >= 40) ?? "Pas sur l'année", quoi: "2e commercial en Algérie + marketing", pourquoi: "Environ 40 ventes par mois au total." },
  ];
}

/* ───────────── Trésorerie : l'argent gagné chaque mois est réinvesti dans les commandes ───────────── */

export type CashHyp = {
  caisse: number;          // argent sur le compte au départ (hors réserve de 50 000 €, jamais utilisée)
  stock: number;           // voitures vendables en décembre : en stock + celles qui arrivent (usine et fret payés)
  stock_reste: number;     // reste à payer par voiture arrivante (douane, transitaire, transport, dépotage)
  stock_a_payer: number;   // nombre de voitures arrivantes dont ce reste est encore dû
  prod: number;            // voitures en production (acompte déjà versé)
  prod_usine: number;      // reste usine par voiture en production (€)
  prod_fret: number;       // fret par voiture, payé au départ (€)
  prod_mois: number;       // mois d'arrivée des voitures en production (0 = décembre)
  acompte: number;         // nouvelles commandes : payé à la commande (€/voiture)
  solde: number;           // payé environ 45 jours après (reste usine)
  fret: number;            // payé au départ du bateau (€/voiture)
  douane: number;          // douane + transitaire + transport + dépotage, payé à l'arrivée (€/voiture)
  delai: number;           // mois entre la commande et la voiture vendable
  seuil: number;           // argent minimum à garder sur le compte
  prelevement: number;     // ce que tu te verses chaque mois
  securite: number;        // stock de sécurité, en mois de ventes
};
export const DEFAULT_CASH: CashHyp = {
  caisse: 10000, stock: 51, stock_reste: 550, stock_a_payer: 45,
  prod: 60, prod_usine: 611, prod_fret: 490, prod_mois: 2,
  acompte: 500, solde: 1111, fret: 490, douane: 540, delai: 4,
  seuil: 5000, prelevement: 0, securite: 0.5,
};

export type CashRow = {
  mois: string; demande: number; ventes: number; perdues: number; stock_fin: number; commande: number; arrivees: number;
  encaisse: number; usine: number; arrivee: number; frais: number; caisse_fin: number; en_route: number;
};

/** Mois par mois : ventes limitées par le stock, commandes limitées par l'argent disponible. */
export function cashPlan(h: SimHyp, c: CashHyp): CashRow[] {
  const rows = simulate(h);
  const n = rows.length, D = Math.max(2, Math.round(c.delai));
  const dem = (i: number) => rows[Math.min(i, n - 1)].total;
  const orders: number[] = Array(n).fill(0);
  const arrivals = (i: number) => (i - D >= 0 ? orders[i - D] : 0) + (i === c.prod_mois ? c.prod : 0);
  let caisse = c.caisse, stock = c.stock;
  const out: CashRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const arr = arrivals(i);
    stock += arr;
    const demande = r.total;
    const ventes = Math.min(demande, stock);
    stock -= ventes;
    const parVoiture = r.total ? r.ca_ht / r.total : 0;
    const encaisse = ventes * parVoiture;
    const livraison = Math.min(ventes, r.direct) * h.livraison;
    // Usine et fret : production en cours (mois 0) + soldes et frets des nouvelles commandes.
    const usine = (i === 0 ? c.prod * (c.prod_usine + c.prod_fret) : 0)
      + (i >= 1 ? orders[i - 1] * c.solde : 0) + (i >= 2 ? orders[i - 2] * c.fret : 0);
    const arrivee = (i === 0 ? c.stock_a_payer * c.stock_reste : 0) + (i === c.prod_mois ? c.prod * c.douane : 0)
      + (i - D >= 0 ? orders[i - D] * c.douane : 0);
    const frais = r.fixes + livraison + c.prelevement;
    caisse += encaisse - usine - arrivee - frais;
    // Commande : couvrir les ventes du mois où elle sera vendable + le stock de sécurité, sans passer sous le seuil.
    let stockPrevu = stock;
    for (let k = 1; k < D; k++) stockPrevu += arrivals(i + k) - dem(i + k);
    const voulu = Math.max(0, Math.ceil(dem(i + D) * (1 + c.securite) - Math.max(0, stockPrevu)));
    const margeProchaine = Math.max(0, rows[Math.min(i + 1, n - 1)].resultat);
    const dispo = caisse - c.seuil + margeProchaine * 0.5;
    const possible = Math.max(0, Math.floor(dispo / (c.acompte + c.solde)));
    const commande = Math.min(voulu, possible);
    orders[i] = commande;
    caisse -= commande * c.acompte;
    let enRoute = 0; for (let k = Math.max(0, i - D + 1); k <= i; k++) enRoute += orders[k];
    if (i < c.prod_mois) enRoute += c.prod;
    out.push({ mois: r.mois, demande, ventes, perdues: demande - ventes, stock_fin: stock, commande, arrivees: arr, encaisse, usine: usine + commande * c.acompte, arrivee, frais, caisse_fin: caisse, en_route: enRoute });
  }
  return out;
}
