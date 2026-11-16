/**
 * Méta-analyse réaliste 2027 (page /giga/meta-realiste, fondateur seulement).
 * Modèle multi-produits mois par mois (déc. 2026 → déc. 2027) : situation réelle de novembre 2026
 * (caisse, stock VSP, commandes en production) + produits de la méta-analyse.
 * Cycle d'achat : 30 % à la commande (m), solde au départ (m+1), fret + douane + logistique et arrivée en m+3.
 * Tous les prix « est. » sont des estimations à confirmer par devis ; ce fichier n'a aucune dépendance
 * (calcul côté serveur uniquement : il n'est pas importé dans une page client).
 */

export const MR_MONTHS = ["Déc. 2026", "Janv. 2027", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc. 2027"];
const N = MR_MONTHS.length;

export type LineId = "vsp" | "pickup" | "pieces" | "scooter" | "transpalette" | "brouette" | "dumper" | "gerbeur" | "tricycle" | "chargeuse";

export type Line = {
  id: LineId; nom: string; usine: number; landing: number; net: number; prixTTC: number;
  /** Ventes par mois en croisière, scénario moyen (hors VSP). */
  croisiere: number; croissance: number; test: number; lot: number; risque: 1 | 2 | 3 | 4;
  saison?: number[]; canal: string; place: string; sav: "faible" | "moyen" | "fort";
  reglementaire: string; verdict: string; sources: string;
};

/** Économie unitaire (€, par unité ; « net » = encaissé après TVA, livraison, pub et réserve SAV). */
export const LINES: Line[] = [
  { id: "vsp", nom: "Voiture sans permis (cœur)", usine: 1570, landing: 850, net: 4230, prixTTC: 4990, croisiere: 0, croissance: 0, test: 0, lot: 9, risque: 1,
    canal: "Direct (Leboncoin, site, closers) + partenaires revendeurs", place: "9 par 40'HC sur racks", sav: "moyen",
    reglementaire: "L6e avec COC : déjà maîtrisé.", verdict: "Cœur du modèle : tout le reste se greffe dessus.",
    sources: "Tes chiffres réels : usine 1 771 $ (≈ 1 570 €), fret Lillian 3 300–3 450 $/40', douane 10 %, DLS/Ansquer ; net 4 230 € à 4 990 € et 4 645 € à 5 490 €." },
  { id: "pickup", nom: "Pick-up électrique L6e", usine: 1775, landing: 1150, net: 5380, prixTTC: 6490, croisiere: 6, croissance: 0.06, test: 9, lot: 6, risque: 2,
    canal: "Direct + artisans, campings, communes, partenaires", place: "≈ 6 par 40'HC (est.)", sav: "moyen",
    reglementaire: "L6e : n'acheter qu'avec COC européen ; charge utile limitée.", verdict: "Lancer : les 9 déjà commandés servent de test.",
    sources: "Usine 2 000 $/u (ton fournisseur). Prix de vente 6 490 € TTC = estimation (les utilitaires L6e importés se vendent ≈ 7 000–12 000 €, à vérifier)." },
  { id: "pieces", nom: "Pièces & accessoires voiturettes (lots de 100)", usine: 800, landing: 100, net: 1900, prixTTC: 3000, croisiere: 3, croissance: 0.08, test: 1, lot: 1, risque: 1,
    canal: "Boutique pièces du site, Hana, garages, partenaires", place: "Habitacles des VSP (≈ 1,6–2,5 m³/conteneur)", sav: "faible",
    reglementaire: "Plaquettes ECE R90 ; éco-organisme batteries ; pas de pneus (antidumping).", verdict: "Lancer en janvier : presque pas de cash, voyage gratuit dans les voitures.",
    sources: "Méta-analyse « Produits rotation conteneur » : marges 4–40 €/pièce, 5–15 k€/mois en croisière (estimation)." },
  { id: "scooter", nom: "Scooter électrique L1e (type Caméléon 1500)", usine: 400, landing: 135, net: 1264, prixTTC: 1790, croisiere: 12, croissance: 0.08, test: 50, lot: 50, risque: 3,
    saison: [0.6, 0.6, 0.8, 1, 1.2, 1.3, 1.3, 1.1, 1, 1.1, 0.9, 0.7, 0.6], canal: "Direct + revendeurs motos/scooters", place: "≈ 50 par 40'HC dédié (trop haut pour passer sous les racks)", sav: "moyen",
    reglementaire: "COC L1e obligatoire pour l'immatriculation ; droit ≈ 6 % (8711.60, à vérifier) ; batterie lithium = transport ADR.", verdict: "Tester avec 1 conteneur au printemps, seulement avec COC.",
    sources: "Usine 150–500 $ selon modèle (toi) ; on prend 450 $ pour un 72 V lithium sérieux. Prix 1 790 € TTC = estimation (marché ≈ 1 500–2 500 €). Marché FR ≈ 17 000 deux-roues électriques/an (Cleanrider)." },
  { id: "transpalette", nom: "Transpalette électrique lithium 1,5 t", usine: 400, landing: 60, net: 1260, prixTTC: 1788, croisiere: 6, croissance: 0.07, test: 6, lot: 6, risque: 2,
    canal: "B2B : artisans, commerces, entrepôts ; Leboncoin pro", place: "≈ 6 sous les racks d'un conteneur VSP (est.)", sav: "faible",
    reglementaire: "CE machines ; vérifier l'antidumping (il vise les transpalettes manuels chinois) et le code douanier.", verdict: "Lancer en test dès février, sous les voitures.",
    sources: "Prix usine ≈ 450 $ et prix 1 490 € HT = estimations (marché ≈ 1 200–2 500 € HT)." },
  { id: "brouette", nom: "Brouette électrique", usine: 310, landing: 50, net: 635, prixTTC: 990, croisiere: 8, croissance: 0.06, test: 6, lot: 6, risque: 2,
    saison: [0.5, 0.5, 0.7, 1.1, 1.3, 1.3, 1.2, 1, 1, 1, 0.9, 0.7, 0.5], canal: "Particuliers avec terrain, maçons, paysagistes", place: "≈ 6 sous les racks (est.)", sav: "faible",
    reglementaire: "CE machines, batterie lithium.", verdict: "Lancer en test au printemps avec les dumpers.",
    sources: "Plan produits 2027 : usine 200–500 $, vente 800–1 500 €." },
  { id: "dumper", nom: "Mini-dumper électrique 500 kg (chenilles)", usine: 1600, landing: 330, net: 3890, prixTTC: 5388, croisiere: 3, croissance: 0.05, test: 2, lot: 2, risque: 3,
    saison: [0.5, 0.5, 0.7, 1.1, 1.3, 1.3, 1.2, 1, 1, 1, 0.9, 0.7, 0.5], canal: "Maçons, paysagistes, agriculteurs, loueurs", place: "≈ 2 par conteneur VSP, à l'avant (est.)", sav: "moyen",
    reglementaire: "CE machines + règlement Machines 2023/1230 au 20/01/2027 ; batterie.", verdict: "Tester 2 unités, vendre avant de commander plus.",
    sources: "Plan produits 2027 : usine 1 200–3 000 $, vente 3 500–6 500 € HT ; concurrents thermiques 2 082–3 950 € HT." },
  { id: "gerbeur", nom: "Gerbeur électrique 1–1,5 t", usine: 1780, landing: 440, net: 4390, prixTTC: 5988, croisiere: 2, croissance: 0.05, test: 2, lot: 2, risque: 3,
    canal: "B2B entrepôts, commerces", place: "Trop haut pour les racks : place d'une voiture ou conteneur dédié", sav: "moyen",
    reglementaire: "CE machines ; enquête antidumping de l'UE sur les chariots chinois à vérifier avant tout achat.", verdict: "Plus tard, si les transpalettes se vendent.",
    sources: "Usine ≈ 2 000 $ et prix 4 990 € HT = estimations (marché ≈ 4 000–8 000 € HT)." },
  { id: "tricycle", nom: "Tricycle électrique", usine: 800, landing: 250, net: 1685, prixTTC: 2490, croisiere: 2, croissance: 0.04, test: 0, lot: 3, risque: 3,
    canal: "Seniors, livraisons de proximité", place: "Place d'une voiture pour 3", sav: "moyen",
    reglementaire: "Selon la puissance : vélo (antidumping chinois !) ou L2e/L5e avec COC.", verdict: "Vendre les 3 déjà payés, puis décider.",
    sources: "3 tricycles déjà payés (4 500 €) ; prix de vente 2 490 € = estimation." },
  { id: "chargeuse", nom: "Mini-chargeuse électrique", usine: 7100, landing: 1500, net: 18200, prixTTC: 23880, croisiere: 0.6, croissance: 0.05, test: 1, lot: 1, risque: 4,
    canal: "Fermes, haras, paysagistes, collectivités (démonstrations)", place: "Place d'une voiture", sav: "fort",
    reglementaire: "CE + règlement Machines 2027 ; hydraulique : stock de pièces obligatoire.", verdict: "2e semestre, 1 machine de démonstration avec prévente.",
    sources: "Plan produits 2027 : usine 6 000–10 000 $, vente 18 000–30 000 € HT (estimations)." },
];

export type Decision = { start: number; scale: number; reassort?: boolean };
export type Params = {
  nom: string;
  vspDirect: number[]; vspPart: number[]; prixHausse: number | null;
  decisions: Partial<Record<LineId, Decision>>;
  stress?: { demande?: number; partenaires?: number; couts?: number; sav?: number };
};
export type MonthOut = { mois: string; ventes: Record<string, number>; ca: number; marge: number; fixes: number; achats: number; encaisse: number; caisse: number; commandes: Record<string, number>; actions: string[] };
export type SimOut = { rows: MonthOut[]; ventes2027: number; ventesParLigne: Record<string, number>; ca2027: number; marge2027: number; fixes2027: number; benefice2027: number; caisseMin: number; caisseFin: number; risque: number; stockFin: number };

/** Recrutements (coût mensuel à partir du mois). */
const ROLES = [
  { m: 1, cout: 800, nom: "Closer Algérie" }, { m: 2, cout: 3400, nom: "Chauffeur-logisticien + camion plateau" },
  { m: 3, cout: 2000, nom: "Responsable réseau partenaires" }, { m: 4, cout: 2000, nom: "2e closer + coordinateur logistique" },
  { m: 6, cout: 2800, nom: "2e chauffeur" }, { m: 9, cout: 1800, nom: "3e closer + assistant SAV" },
];
const SALES_PER_DRIVER = 30;

export function simulate(p: Params): SimOut {
  const st = { demande: 1, partenaires: 1, couts: 1, sav: 1, ...(p.stress || {}) };
  const H = N + 5; const out = new Array(H).fill(0);
  const arr: Record<string, number[]> = {}; const stock: Record<string, number> = {}; const sold: Record<string, number> = {}; const totSold: Record<string, number> = {};
  for (const l of LINES) { arr[l.id] = new Array(H).fill(0); stock[l.id] = 0; sold[l.id] = 0; totSold[l.id] = 0; }
  const L = Object.fromEntries(LINES.map(l => [l.id, l])) as Record<LineId, Line>;
  const landingOf = (l: Line) => l.landing * st.couts;
  // Situation réelle de novembre 2026
  // 45 VSP arrivent (déjà financés) ; 24 VSP : solde 32 830 $ ≈ 29 120 € au départ (déc.), arrivée févr. ;
  // 9 + 27 VSP : soldes 11 939 $ + 42 569 $ ≈ 48 350 € au départ (janv.), arrivée mars
  arr.vsp[0] += 45; out[0] += 29120; arr.vsp[2] += 24; out[2] += 24 * 850 * st.couts;
  out[1] += 48350; arr.vsp[3] += 36; out[3] += 36 * 850 * st.couts;
  // 9 pick-up (autre fournisseur) : solde ≈ 9 960 € en janv., arrivée mars
  out[1] += 9960; arr.pickup[3] += 9; out[3] += 9 * L.pickup.landing * st.couts;
  arr.tricycle[0] += 3; // déjà payés
  let cash = 4000; let caisseMin = Infinity; const rows: MonthOut[] = [];
  let ventes2027 = 0, ca2027 = 0, marge2027 = 0, fixes2027 = 0, risque = 0;
  const vD = (k: number) => Math.round(p.vspDirect[Math.min(k, N - 1)] * st.demande);
  const vP = (k: number) => Math.round(p.vspPart[Math.min(k, N - 1)] * st.partenaires);
  const started = (id: LineId, m: number) => { const d = p.decisions[id]; return !!d && d.scale > 0 && m >= d.start; };
  const demandOf = (l: Line, m: number) => {
    const d = p.decisions[l.id]; if (!d || d.scale <= 0) return 0;
    const first = d.start + 3; if (m < first) return 0;
    const k = m - first; const ramp = k === 0 ? 0.4 : k === 1 ? 0.7 : 1;
    const s = l.saison ? l.saison[Math.min(m, N - 1)] : 1;
    return l.croisiere * d.scale * ramp * s * Math.pow(1 + l.croissance, k) * st.demande;
  };
  const frac: Record<string, number> = {};
  for (let m = 0; m < N; m++) {
    const ventes: Record<string, number> = {}; const commandes: Record<string, number> = {}; const actions: string[] = [];
    let enc = 0, marge = 0, ca = 0;
    for (const l of LINES) stock[l.id] += arr[l.id][m];
    // VSP : directes plafonnées par la capacité de livraison
    const drivers = 1 + (m >= 2 ? 1 : 0) + (m >= 6 ? 1 : 0);
    const cap = m < 2 ? 18 : drivers * SALES_PER_DRIVER - 12;
    const net = p.prixHausse != null && m >= p.prixHausse ? 4645 : 4230;
    const dDir = Math.min(vD(m), cap); const tot = Math.min(stock.vsp, dDir + vP(m)); const sd = Math.min(tot, dDir); const sp = tot - sd;
    stock.vsp -= tot; ventes.vsp = tot; totSold.vsp += tot;
    const savX = (st.sav - 1) * 200;
    enc += sd * (net - savX) + sp * (3550 - savX * 0.5);
    marge += sd * (net - savX - 1570 - 850 * st.couts) + sp * (3550 - savX * 0.5 - 1570 - 850 * st.couts);
    ca += sd * (net === 4645 ? 5490 : 4990) / 1.2 + sp * 3650;
    // Autres lignes
    for (const l of LINES) {
      if (l.id === "vsp") continue;
      const dem = demandOf(l, m) + (l.id === "tricycle" && m >= 1 ? 1 : 0);
      frac[l.id] = (frac[l.id] || 0) + dem; const want = Math.floor(frac[l.id]); frac[l.id] -= want;
      const s = Math.min(stock[l.id], want); stock[l.id] -= s; ventes[l.id] = s; totSold[l.id] += s;
      const savPen = l.sav === "fort" ? 0.06 : l.sav === "moyen" ? 0.03 : 0.01;
      const netU = l.net - l.net * savPen * (st.sav - 1) * 3;
      enc += s * netU; marge += s * (netU - l.usine - landingOf(l)); ca += s * l.prixTTC / 1.2;
      risque += s * (netU - l.usine - landingOf(l)) * [0, 0, 0.1, 0.25, 0.45][l.risque];
    }
    // Commandes VSP (couvrir la demande de m+3)
    const t = m + 3; let proj = stock.vsp;
    for (let k = m + 1; k <= t; k++) proj += arr.vsp[k];
    for (let k = m + 1; k < t; k++) proj -= Math.min(vD(k), k < 2 ? 18 : (1 + (k >= 2 ? 1 : 0) + (k >= 6 ? 1 : 0)) * SALES_PER_DRIVER - 12) + vP(k);
    const needT = Math.min(vD(t), (1 + (t >= 2 ? 1 : 0) + (t >= 6 ? 1 : 0)) * SALES_PER_DRIVER - 12) + vP(t);
    const q = Math.max(0, Math.ceil(Math.max(0, needT - proj) / 9) * 9);
    if (q) { out[m] += q * 1570 * 0.3; out[m + 1] += q * 1570 * 0.7; arr.vsp[t] += q; out[t] += q * 850 * st.couts; commandes.vsp = q; }
    // Commandes des autres lignes : test d'abord, réassort seulement si 50 % du test est vendu
    const roles = ROLES.filter(r => m >= r.m).reduce((a, r) => a + r.cout, 0);
    const extraRoles = (started("scooter", m - 3) ? 1000 : 0) + ((["transpalette", "dumper", "gerbeur", "chargeuse"] as LineId[]).some(id => started(id, m - 3)) ? 2200 : 0);
    // Chaque nouvelle ligne coûte du temps, des échantillons et de la pub de lancement (≈ 600 €/mois)
    const lignes = (Object.keys(p.decisions) as LineId[]).filter(id => id !== "pickup" && started(id, m)).length;
    const fixes = 900 + roles + extraRoles + lignes * 600;
    for (const l of LINES) {
      if (l.id === "vsp" || l.id === "tricycle") continue;
      const d = p.decisions[l.id]; if (!d || d.scale <= 0 || m < d.start || d.reassort === false) continue;
      let qty = 0;
      if (l.id === "pickup") { // les 9 déjà commandés = test
        if (totSold.pickup >= 5) { let pr = stock.pickup; for (let k = m + 1; k <= t; k++) pr += arr.pickup[k]; for (let k = m + 1; k < t; k++) pr -= demandOf(l, k); qty = Math.max(0, Math.ceil(Math.max(0, demandOf(l, t) - pr) / l.lot) * l.lot); }
      } else if (m === d.start) qty = l.test;
      else if (totSold[l.id] >= l.test * 0.5 && m >= d.start + 3) {
        let pr = stock[l.id]; for (let k = m + 1; k <= t; k++) pr += arr[l.id][k]; for (let k = m + 1; k < t; k++) pr -= demandOf(l, k);
        qty = Math.max(0, Math.ceil(Math.max(0, demandOf(l, t) - pr) / l.lot) * l.lot);
      }
      if (!qty) continue;
      const cost = qty * l.usine;
      if (cash + enc - out[m] - fixes - cost * 0.3 - cost * 0.7 < 10000 && m > 0) { actions.push(`${l.nom} : commande reportée (trésorerie)`); continue; }
      out[m] += cost * 0.3; out[m + 1] += cost * 0.7; arr[l.id][t] += qty; out[t] += qty * landingOf(l); commandes[l.id] = qty;
      if (m === d.start) actions.push(`Lancer ${l.nom} : test de ${qty}`);
    }
    cash += enc - out[m] - fixes;
    if (m >= 1) { caisseMin = Math.min(caisseMin, cash); ventes2027 += Object.values(ventes).reduce((a, b) => a + b, 0); ca2027 += ca; marge2027 += marge; fixes2027 += fixes; }
    rows.push({ mois: MR_MONTHS[m], ventes, ca: Math.round(ca), marge: Math.round(marge), fixes, achats: Math.round(out[m]), encaisse: Math.round(enc), caisse: Math.round(cash), commandes, actions });
  }
  const stockFin = LINES.reduce((a, l) => a + stock[l.id] * (l.usine + l.landing), 0);
  return { rows, ventes2027, ventesParLigne: totSold, ca2027: Math.round(ca2027), marge2027: Math.round(marge2027), fixes2027, benefice2027: Math.round(marge2027 - fixes2027), caisseMin: Math.round(caisseMin), caisseFin: Math.round(cash), risque: Math.round(risque), stockFin: Math.round(stockFin) };
}

/** Demande VSP (moyen / agressif identiques au prévisionnel ; prudent = moyen − 25 % et partenaires plus lents). */
export const VSP_DEMAND = {
  prudent: { direct: [18, 12, 15, 17, 21, 24, 26, 28, 30, 34, 34, 36, 38], part: [0, 0, 0, 1, 3, 6, 9, 12, 15, 18, 21, 24, 27] },
  moyen: { direct: [20, 15, 20, 22, 28, 32, 35, 38, 40, 45, 45, 48, 50], part: [0, 0, 0, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45] },
  agressif: { direct: [20, 15, 20, 25, 35, 40, 45, 50, 50, 60, 60, 65, 70], part: [0, 0, 0, 5, 10, 20, 30, 45, 50, 70, 80, 95, 110] },
};

/* ───────────── Scénarios retenus (issus de l'optimisation) ───────────── */

export type ScenarioId = "vsp_seule" | "prudent" | "recommande" | "agressif";
export const STRESS = { demande: 0.7, partenaires: 0.7, couts: 1.3, sav: 1.3 };

export const SCENARIOS: { id: ScenarioId; nom: string; resume: string; demande: keyof typeof VSP_DEMAND; decisions: Partial<Record<LineId, Decision>> }[] = [
  { id: "vsp_seule", nom: "VSP seule (comparaison)", resume: "Uniquement les voitures (plan moyen) ; les 9 pick-up et 3 tricycles déjà achetés sont vendus, sans réassort.", demande: "moyen",
    decisions: { pickup: { start: 0, scale: 1, reassort: false } } },
  { id: "prudent", nom: "Prudent", resume: "Voitures à −25 %, partenaires lents ; seulement les lignes à faible risque : pick-up, pièces, brouettes, transpalettes.", demande: "prudent",
    decisions: { pickup: { start: 0, scale: 1 }, pieces: { start: 0, scale: 1 }, brouette: { start: 1, scale: 1 }, transpalette: { start: 2, scale: 1 } } },
  { id: "recommande", nom: "Réaliste recommandé", resume: "Voitures plan moyen + 5 lignes lancées une par mois, chacune par un petit test : pièces (déc.), transpalettes (janv.), scooters (févr.), gerbeurs (mars), dumpers (avr.), et réassort des pick-up.", demande: "moyen",
    decisions: { pickup: { start: 0, scale: 1 }, pieces: { start: 0, scale: 1 }, transpalette: { start: 1, scale: 1 }, scooter: { start: 2, scale: 1 }, gerbeur: { start: 3, scale: 1 }, dumper: { start: 4, scale: 1 } } },
  { id: "agressif", nom: "Agressif", resume: "Voitures plan agressif (réseau rapide) + toutes les lignes du recommandé, plus brouettes (mai) et une mini-chargeuse de démonstration (juil.).", demande: "agressif",
    decisions: { pickup: { start: 0, scale: 1 }, pieces: { start: 0, scale: 1 }, transpalette: { start: 1, scale: 1 }, scooter: { start: 2, scale: 1 }, gerbeur: { start: 3, scale: 1 }, dumper: { start: 4, scale: 1 }, brouette: { start: 5, scale: 1 }, chargeuse: { start: 7, scale: 1 } } },
];

export const paramsOf = (s: (typeof SCENARIOS)[number], stress?: Params["stress"], prixHausse: number | null = 2): Params =>
  ({ nom: s.nom, vspDirect: VSP_DEMAND[s.demande].direct, vspPart: VSP_DEMAND[s.demande].part, prixHausse, decisions: s.decisions, stress });

export const SYNTHESE = [
  "La voiture sans permis reste le moteur : ≈ 70 % des ventes et ≈ 80 % du bénéfice dans tous les scénarios. On ne la ralentit jamais pour une autre ligne.",
  "Les autres produits se greffent sur ce qui existe déjà : la place libre dans les conteneurs, les clients, le site, Hana et les partenaires. Une nouvelle ligne par mois au maximum, toujours par un petit test.",
  "À lancer tout de suite : les pièces et accessoires de voiturettes (presque sans argent, ils voyagent dans les voitures) et le réassort des pick-up dès que 5 des 9 sont vendus.",
  "Janvier : 6 transpalettes électriques sous les voitures. Février : 1 conteneur de 50 scooters L1e, seulement avec COC. Mars-avril : 2 gerbeurs et 2 mini-dumpers en test.",
  "Règle de réassort : on ne recommande une ligne que quand la moitié du test est vendue. Sinon on arrête, sans regret.",
  "Le prix à 5 490 € en février reste le levier le plus simple : + ≈ 170 000 € de bénéfice sur l'année.",
  "La caisse ne descend jamais sous 10 000 € dans le plan, et ta réserve de 50 000 € n'est jamais utilisée. Si les ventes sont 30 % plus faibles, le plan reste rentable, à condition de commander au rythme des ventes.",
  "Pas de mini-chargeuse, de poêles ni de vélos électriques avant le 2e semestre : trop de SAV, de normes ou d'antidumping pour une petite équipe.",
];

export const REGLES = [
  "Caisse ≥ 10 000 € en permanence ; la réserve de 50 000 € ne sert qu'aux vrais coups durs.",
  "Chaque mois : commander selon les ventes réelles du mois précédent, jamais selon le plan.",
  "Une seule nouvelle ligne par mois, avec un test (1 lot), une page, une vidéo et un prix affiché.",
  "Réassort seulement si 50 % du test est vendu en 2 mois ; sinon on solde et on arrête.",
  "Rien sans papiers : COC pour tout véhicule, CE pour les machines, code douanier et antidumping vérifiés par le transitaire avant de payer l'acompte.",
  "Le temps du fondateur va d'abord à la voiture sans permis et au réseau ; les nouvelles lignes sont confiées à un commercial B2B dès qu'elles dépassent 10 ventes par mois.",
];

export const RISQUES = [
  "La demande des nouvelles lignes est estimée (pas encore testée) : c'est la plus grosse incertitude, d'où les tests et la règle des 50 %.",
  "Homologation : un scooter ou un pick-up sans COC européen ne s'immatricule pas ; ne jamais commander sans COC.",
  "Antidumping : vérifier les transpalettes et chariots (gerbeurs) et éviter vélos et tricycles assimilés vélos.",
  "SAV : chaque nouvelle ligne ajoute des pannes ; stock de pièces commandé avec le premier lot.",
  "Dispersion du fondateur : c'est le risque n°1 ; d'où une ligne par mois et le recrutement d'un commercial B2B.",
  "Fatigue et capacité de livraison : sans chauffeur en février, les ventes de voitures plafonnent vers 18 par mois.",
];

export function runMeta() {
  const scen = SCENARIOS.map(s => {
    const r = simulate(paramsOf(s)); const st = simulate(paramsOf(s, STRESS, null));
    return { id: s.id, nom: s.nom, resume: s.resume, decisions: s.decisions, res: r, stress: { ventes: st.ventes2027, benefice: st.benefice2027, caisseMin: st.caisseMin, caisseFin: st.caisseFin } };
  });
  const rec = SCENARIOS.find(s => s.id === "recommande")!;
  const sens = [
    ["Base (plan réaliste recommandé)", undefined, 2], ["Ventes −30 %", { demande: 0.7 }, 2], ["Partenaires −30 %", { partenaires: 0.7 }, 2], ["Pas de hausse à 5 490 €", undefined, null],
    ["Fret, douane et logistique +30 %", { couts: 1.3 }, 2], ["SAV ×1,3", { sav: 1.3 }, 2], ["Tout à la fois (−30 %, +30 %, pas de hausse)", STRESS, null],
  ].map(([label, st, h]) => { const x = simulate(paramsOf(rec, st as Params["stress"], h as number | null)); return { label: label as string, benefice: x.benefice2027, caisseMin: x.caisseMin, ventes: x.ventes2027 }; });
  return { lines: LINES, scenarios: scen, sensibilite: sens, synthese: SYNTHESE, regles: REGLES, risques: RISQUES };
}
