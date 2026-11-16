import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prévisionnel de trésorerie et de croissance (page /giga/previsionnel, fondateur seulement).
 * Table : forecast_plans (id serial, year int unique, data jsonb, updated_at).
 * Le calcul se fait côté page (computeForecast) à partir des hypothèses, des recrutements et des chiffres réels saisis.
 */
export const FORECAST_TABLE = "forecast_plans";
export const FORECAST_YEAR = 2027;

export const MONTHS = ["Déc. 2026", "Janv. 2027", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc. 2027"];
export const N = MONTHS.length;

export type Scenario = "moyen" | "agressif";
export type RoleStatus = "a_faire" | "en_cours" | "fait" | "annule";
export const ROLE_STATUS: Record<RoleStatus, string> = { a_faire: "À faire", en_cours: "En cours", fait: "Fait", annule: "Annulé" };

export type Assumptions = {
  prix_usine: number; acompte_pct: number; landing: number;
  net_direct_avant: number; net_direct_apres: number; mois_hausse: number; net_partenaire: number;
  caisse_depart: number; reserve: number; base_fixe: number; seuil_alerte: number;
};
export type Role = { id: string; mois: number; role: string; mission: string; cout: number; declencheur: string; statut: RoleStatus };
export type StepItem = { id: string; texte: string; fait: boolean };
export type Step = { mois: string; items: StepItem[]; notes: string };
export type Actual = { direct?: number | null; partenaires?: number | null; caisse?: number | null };
export type ForecastData = {
  scenario: Scenario;
  hyp: Assumptions;
  demande: Record<Scenario, { direct: number[]; partenaires: number[] }>;
  reels: Actual[];
  roles: Role[];
  etapes: Step[];
  notes: string;
};

export const DEFAULT_FORECAST: ForecastData = {
  scenario: "moyen",
  hyp: {
    prix_usine: 1570, acompte_pct: 30, landing: 850,
    net_direct_avant: 4230, net_direct_apres: 4645, mois_hausse: 2, net_partenaire: 3550,
    caisse_depart: 4000, reserve: 50000, base_fixe: 900, seuil_alerte: 10000,
  },
  demande: {
    moyen: { direct: [20, 15, 20, 22, 28, 32, 35, 38, 40, 45, 45, 48, 50], partenaires: [0, 0, 0, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45] },
    agressif: { direct: [20, 15, 20, 25, 35, 40, 45, 50, 50, 60, 60, 65, 70], partenaires: [0, 0, 0, 5, 10, 20, 30, 45, 50, 70, 80, 95, 110] },
  },
  reels: Array.from({ length: N }, () => ({})),
  roles: [
    { id: "closer1", mois: 1, role: "Closer en Algérie", mission: "Rappelle tous les contacts vite, vend, relance les hésitants, note chaque vente dans le CRM.", cout: 800, declencheur: "Dès 15 ventes par mois, ou trop de contacts non rappelés", statut: "a_faire" },
    { id: "chauffeur1", mois: 2, role: "Chauffeur-logisticien (France)", mission: "Livre les clients avec le camion plateau, récupère les voitures aux dépôts, fait l'inventaire et les photos à l'arrivée.", cout: 2800, declencheur: "Plus de 16 à 18 livraisons par mois (ta limite seul)", statut: "a_faire" },
    { id: "camion", mois: 2, role: "Camion plateau 3,5 t (crédit ou location)", mission: "Porte 3 voitures sans remorque (permis B), 5 à 6 avec remorque.", cout: 600, declencheur: "En même temps que le chauffeur", statut: "a_faire" },
    { id: "reseau", mois: 3, role: "Responsable développement réseau", mission: "Trouve, signe et anime les revendeurs et exposants (garages, motos, scooters) ; pub de recrutement ; suivi des ventes partenaires.", cout: 2000, declencheur: "Prix à 5 490 € en place et 2 dépôts qui tournent", statut: "a_faire" },
    { id: "closer2", mois: 4, role: "2e closer (Algérie)", mission: "Même mission que le 1er closer, sur les nouveaux contacts.", cout: 800, declencheur: "Plus de 35 ventes directes par mois", statut: "a_faire" },
    { id: "coord", mois: 4, role: "Coordinateur logistique et administratif (Algérie)", mission: "Commandes usine, conteneurs, douane, dépôts, cartes grises, factures.", cout: 1200, declencheur: "Plus de 4 conteneurs par mois", statut: "a_faire" },
    { id: "chauffeur2", mois: 6, role: "2e chauffeur", mission: "2e tournée par semaine, et camions des partenaires.", cout: 2800, declencheur: "Plus de 35 livraisons directes par mois", statut: "a_faire" },
    { id: "depot", mois: 7, role: "Responsable dépôt", mission: "Réception, dépotage, stockage, préparation : seulement si tu prends ton propre terrain.", cout: 2500, declencheur: "Stock permanent de plus de 80 à 100 véhicules", statut: "a_faire" },
    { id: "closer3", mois: 9, role: "3e closer (Algérie)", mission: "Pic de la rentrée et réseau en croissance.", cout: 800, declencheur: "Plus de 50 ventes directes par mois", statut: "a_faire" },
    { id: "sav", mois: 9, role: "Assistant SAV", mission: "Tickets SAV, envoi des pièces, aide aux partenaires.", cout: 1000, declencheur: "Plus de 150 voitures en circulation de l'année", statut: "a_faire" },
  ],
  etapes: [
    ["Déc. 2026", ["Vendre et livrer les 45 voitures de l'arrivage (2 tournées)", "Demander à l'usine sa capacité : 100 puis 200 véhicules par mois ?", "Négocier les paiements usine (ex. 20 % à la commande, 80 % au départ) et l'étalement des départs", "Entretiens de recrutement (embauche en janvier)"]],
    ["Janv. 2027", ["Commander les véhicules recommandés (tableau)", "Camion plateau 3,5 t et permis BE", "Signer le dépôt de Gennevilliers pour 2027 (DLS)", "Contacter 5 partenaires pilotes près de Paris et de Toulouse", "Lancer le programme clients ambassadeurs"]],
    ["Févr.", ["Prix à 5 490 € sur les nouveaux arrivages", "Kit partenaire : voiture de démo, photos, vidéos, contrat", "Pub pour recruter des revendeurs (Leboncoin pro, groupes Facebook garagistes, motos et scooters, LinkedIn, salons) : 500 à 1 000 € par mois"]],
    ["Mars", ["Embaucher le chauffeur-logisticien", "Demander une ligne de crédit de stock (banque ou Bpifrance)", "5 partenaires actifs"]],
    ["Avr.", ["10 partenaires actifs", "Devis du matériel de dépotage et recherche d'un terrain"]],
    ["Mai", ["20 partenaires actifs", "Commander le matériel de dépotage si plus de 40 ventes par mois (4 mois de délai)"]],
    ["Juin", ["30 partenaires actifs", "2e chauffeur", "Préparer le pic de la rentrée : commandes de juillet à septembre"]],
    ["Juil.", ["Pic de la rentrée : 3 à 4 conteneurs par semaine", "Ouvrir ton propre dépôt si le stock dépasse 80 à 100 véhicules"]],
    ["Août", ["2e dépôt (Lyon ou Sud)", "Suivre le stock chaque semaine"]],
    ["Sept.", ["Diversification (petits engins, levage : méta-analyse) si la caisse dépasse 300 000 € hors besoins des voitures", "3e closer et assistant SAV"]],
    ["Oct.", ["150 véhicules par mois", "Bilan des partenaires : garder les meilleurs, remplacer les inactifs"]],
    ["Nov.", ["Préparer le budget 2028", "Commandes de Noël"]],
    ["Déc. 2027", ["150 à 200 véhicules par mois", "Bilan de l'année et plan 2028"]],
  ].map(([mois, items], i) => ({ mois: mois as string, notes: "", items: (items as string[]).map((t, j) => ({ id: `e${i}_${j}`, texte: t, fait: false })) })),
  notes: "",
};

const num = (v: unknown, d: number, min = -1e9, max = 1e9) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; };
const opt = (v: unknown) => v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
const arr = (v: unknown, d: number[]) => Array.from({ length: N }, (_, i) => num(Array.isArray(v) ? v[i] : undefined, d[i], 0, 5000));
const S = (v: unknown, max = 400) => String(v ?? "").slice(0, max);

export function normalizeForecast(raw: unknown): ForecastData {
  const x = (raw || {}) as Record<string, any>;
  const D = DEFAULT_FORECAST; const h = (x.hyp || {}) as Record<string, unknown>;
  const hyp = Object.fromEntries(Object.entries(D.hyp).map(([k, d]) => [k, num(h[k], d as number, 0, 1e7)])) as Assumptions;
  hyp.mois_hausse = Math.min(N, Math.round(hyp.mois_hausse));
  const dem = (x.demande || {}) as Record<string, any>;
  return {
    scenario: x.scenario === "agressif" ? "agressif" : "moyen",
    hyp,
    demande: {
      moyen: { direct: arr(dem.moyen?.direct, D.demande.moyen.direct), partenaires: arr(dem.moyen?.partenaires, D.demande.moyen.partenaires) },
      agressif: { direct: arr(dem.agressif?.direct, D.demande.agressif.direct), partenaires: arr(dem.agressif?.partenaires, D.demande.agressif.partenaires) },
    },
    reels: Array.from({ length: N }, (_, i) => { const r = (Array.isArray(x.reels) ? x.reels[i] : null) || {}; return { direct: opt(r.direct), partenaires: opt(r.partenaires), caisse: opt(r.caisse) }; }),
    roles: (Array.isArray(x.roles) ? x.roles : D.roles).slice(0, 40).map((r: Record<string, unknown>, i: number) => ({
      id: S(r.id || `r${i}`, 40), mois: Math.round(num(r.mois, 1, 0, N - 1)), role: S(r.role, 120), mission: S(r.mission, 600), cout: num(r.cout, 0, 0, 100000),
      declencheur: S(r.declencheur, 300), statut: (ROLE_STATUS[r.statut as RoleStatus] ? r.statut : "a_faire") as RoleStatus,
    })),
    etapes: (Array.isArray(x.etapes) ? x.etapes : D.etapes).slice(0, N).map((s: Record<string, any>, i: number) => ({
      mois: S(s.mois || MONTHS[i], 40), notes: S(s.notes, 2000),
      items: (Array.isArray(s.items) ? s.items : []).slice(0, 20).map((it: Record<string, unknown>, j: number) => ({ id: S(it.id || `e${i}_${j}`, 40), texte: S(it.texte, 400), fait: !!it.fait })),
    })),
    notes: S(x.notes, 4000),
  };
}

export type MonthRow = {
  mois: string; demande: number; vendus: number; direct: number; partenaires: number; reel: boolean;
  commande: number; arrivees: number; stock: number; encaisse: number; sorties: number; fixes: number; caisse: number; caisseReelle: boolean;
};

/** Frais fixes du mois : base + rôles actifs (non annulés) à partir de leur mois de démarrage. */
export function fixedCost(d: ForecastData, m: number) {
  return d.hyp.base_fixe + d.roles.filter(r => r.statut !== "annule" && r.mois <= m).reduce((t, r) => t + r.cout, 0);
}

/**
 * Calcul mois par mois.
 * Commande en m = demande(m+3) − stock projeté, arrondie au conteneur (9) ; acompte en m, solde au départ (m+1),
 * fret + douane + logistique et arrivée en m+3. Au-delà de décembre 2027, la demande reste celle du dernier mois.
 * Les ventes et la caisse réelles saisies remplacent la prévision, et les mois suivants repartent de ces chiffres.
 */
export function computeForecast(d: ForecastData, scenario: Scenario = d.scenario): MonthRow[] {
  const h = d.hyp; const dem = d.demande[scenario];
  const D = (k: number) => dem.direct[Math.min(k, N - 1)]; const P = (k: number) => dem.partenaires[Math.min(k, N - 1)];
  const H = N + 4;
  const arv = new Array(H).fill(0); const out = new Array(H).fill(0);
  // Stock déjà commandé (hypothèses de novembre 2026)
  arv[0] += 45;
  out[0] += 24 * 1178; arv[2] += 24; out[2] += 24 * h.landing;
  out[1] += 27 * 1178 + 9960; arv[3] += 36; out[3] += 36 * h.landing;
  const acompte = h.acompte_pct / 100;
  let stock = 0; let cash = h.caisse_depart; const rows: MonthRow[] = [];
  const sold: number[] = [];
  for (let m = 0; m < N; m++) {
    stock += arv[m];
    const r = d.reels[m] || {};
    const reel = r.direct != null || r.partenaires != null;
    let sd: number, sp: number;
    if (reel) { sd = Math.max(0, r.direct ?? 0); sp = Math.max(0, r.partenaires ?? 0); }
    else { const tot = Math.min(stock, D(m) + P(m)); sd = Math.min(tot, D(m)); sp = tot - sd; }
    const vendus = sd + sp; stock = Math.max(0, stock - vendus); sold.push(vendus);
    const net = m >= h.mois_hausse ? h.net_direct_apres : h.net_direct_avant;
    const enc = sd * net + sp * h.net_partenaire;
    // Commande pour couvrir la demande de m+3
    const t = m + 3;
    let projected = stock;
    for (let k = m + 1; k <= t; k++) projected += arv[k];
    for (let k = m + 1; k < t; k++) projected -= D(k) + P(k);
    const q = Math.max(0, Math.ceil(Math.max(0, D(t) + P(t) - projected) / 9) * 9);
    out[m] += q * h.prix_usine * acompte; out[m + 1] += q * h.prix_usine * (1 - acompte); arv[t] += q; out[t] += q * h.landing;
    const fx = fixedCost(d, m);
    cash += enc - out[m] - fx;
    const caisseReelle = r.caisse != null;
    if (caisseReelle) cash = r.caisse as number;
    rows.push({ mois: MONTHS[m], demande: D(m) + P(m), vendus, direct: sd, partenaires: sp, reel, commande: q, arrivees: arv[m], stock, encaisse: Math.round(enc), sorties: Math.round(out[m]), fixes: fx, caisse: Math.round(cash), caisseReelle });
  }
  return rows;
}

/* ───────────── Lecture / écriture ───────────── */

export async function getForecast(db: SupabaseClient, year = FORECAST_YEAR) {
  const { data, error } = await db.from(FORECAST_TABLE).select("year,updated_at,data").eq("year", year).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { year, updated_at: null as string | null, data: normalizeForecast(DEFAULT_FORECAST) };
  return { year, updated_at: data.updated_at as string, data: normalizeForecast(data.data) };
}

export async function saveForecast(db: SupabaseClient, raw: unknown, year = FORECAST_YEAR) {
  const clean = normalizeForecast(raw);
  const { error } = await db.from(FORECAST_TABLE).upsert({ year, data: clean, updated_at: new Date().toISOString() }, { onConflict: "year" });
  if (error) throw new Error(error.message);
  return clean;
}
