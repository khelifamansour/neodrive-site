/** Stock par VIN et factures de vente : règles partagées navigateur / serveur (page « Stock et facturation »). */
import { deliveryPriceForDepartment, REGISTRATION_PRICE, VEHICLES } from "./neodrive-pricing";
import { modelFromLabel } from "./rentabilite";
import { vehicleStage } from "./shipments";

/** Vie d'une voiture, de l'usine au client. */
export const STOCK_STATES = ["commandée", "en mer", "au hub", "réservée", "livrée"] as const;
export type StockState = typeof STOCK_STATES[number];
export const STOCK_ICON: Record<StockState, string> = { "commandée": "🏭", "en mer": "🚢", "au hub": "🏠", "réservée": "🔖", "livrée": "✅" };
export const STOCK_LABEL: Record<StockState, string> = { "commandée": "Commandée", "en mer": "En mer", "au hub": "Arrivée / au hub", "réservée": "Réservée", "livrée": "Livrée" };

/** Statuts du dossier conteneur qui veulent dire « pas encore embarqué ». */
const NOT_SHIPPED = new Set(["commandé", "en production", "prêt usine", "documents complets"]);

type V = { status?: string | null; depot?: string | null; client_id?: string | null; client_name?: string | null; reservation_id?: number | null; shipment_id?: number | null };
type S = { status?: string | null; eta?: string | null; arrived_at?: string | null; depot?: string | null } | null | undefined;
type R = { statut?: string | null; livre_at?: string | null } | null | undefined;

/** État de la voiture : livrée > réservée (client lié) > au hub > en mer > commandée. */
export function stockState(v: V, ship: S, res: R): StockState {
  if (v.status === "livrée" || res?.livre_at || res?.statut === "Livrée") return "livrée";
  if (res || v.reservation_id || v.client_id || v.client_name) return "réservée";
  if (v.status === "commandée") return "commandée";
  if (!ship && v.status === "en mer" && !v.shipment_id) return "en mer";
  const st = vehicleStage(v, ship);
  if (st === "au port" || st === "au dépôt" || st === "chargée") return "au hub";
  if (ship && NOT_SHIPPED.has(String(ship.status || ""))) return "commandée";
  return "en mer";
}

/** Paiement d'une vente, d'après la réservation. */
export type PayState = "payé" | "réserve de propriété" | "non payé" | "inconnu";
type RP = { paiement_confirme_at?: string | null; paiement_en_attente?: boolean | null; reserve_path?: string | null; reserve_token?: string | null; statut?: string | null; montant_du?: number | string | null } | null | undefined;
export function payState(r: RP): PayState {
  if (!r) return "inconnu";
  if (r.paiement_confirme_at) return "payé";
  if (r.reserve_path || r.reserve_token) return "réserve de propriété";
  // Anciennes livraisons passées « Livrée » à la main, sans paiement en attente : considérées payées.
  if (r.statut === "Livrée" && !r.paiement_en_attente && !Number(r.montant_du)) return "payé";
  return "non payé";
}
export const PAY_STYLE: Record<PayState, { bg: string; color: string; icon: string }> = {
  "payé": { bg: "#e7f6ec", color: "#166534", icon: "✅" },
  "réserve de propriété": { bg: "#fff4d6", color: "#92400e", icon: "⚠️" },
  "non payé": { bg: "#fde8e8", color: "#b91c1c", icon: "⛔" },
  "inconnu": { bg: "#fde8e8", color: "#b91c1c", icon: "❓" },
};

/* ───────────── Factures de vente ───────────── */

export const SELLER_INVOICE = {
  name: "MK HOLDING SAS",
  brand: "NeoDrive",
  address: ["31 rue Jean Nougaro", "31600 Muret, France"],
  siren: "908 645 393",
  contact: ["Tél. 06 89 78 17 10", "contact.neodrivefrance@gmail.com"],
};
export const TVA = 0.2;
export type InvoiceLine = { key: string; label: string; ttc: number };
const r2 = (n: number) => Math.round(n * 100) / 100;
export const htOf = (ttc: number) => r2(ttc / (1 + TVA));
/** Totaux depuis des lignes TTC (prix du barème NeoDrive, TVA 20 % incluse). */
export function totals(lines: InvoiceLine[]) {
  const ttc = r2(lines.reduce((a, l) => a + (Number(l.ttc) || 0), 0));
  const ht = htOf(ttc);
  return { total_ttc: ttc, total_ht: ht, tva: r2(ttc - ht) };
}

type ResForInvoice = { modele?: string | null; total?: number | string | null; delivery_price?: number | string | null; departement?: string | null; code_postal?: string | null };
/** Lignes suggérées : véhicule / livraison / carte grise, d'après le total de la réservation ou, à défaut, le barème. */
export function suggestLines(r: ResForInvoice): { lines: InvoiceLine[]; suggested: number; fromGrid: boolean } {
  const key = modelFromLabel(r.modele) || "confort";
  const dept = String(r.departement || "").trim() || String(r.code_postal || "").slice(0, 2);
  const liv = r.delivery_price != null && r.delivery_price !== "" ? Number(r.delivery_price) : deliveryPriceForDepartment(dept) ?? 0;
  const cg = REGISTRATION_PRICE;
  const total = r.total != null && r.total !== "" ? Number(r.total) : null;
  const veh = total != null && total - liv - cg > 0 ? total - liv - cg : VEHICLES[key].price;
  const lines: InvoiceLine[] = [
    { key: "vehicule", label: `Véhicule ${String(r.modele || "").trim() || VEHICLES[key].label}`, ttc: veh },
    { key: "livraison", label: "Livraison à domicile", ttc: liv },
    { key: "carte_grise", label: "Carte grise (démarches d'immatriculation)", ttc: cg },
  ];
  return { lines, suggested: veh + liv + cg, fromGrid: total == null };
}

export const eurFr = (n: unknown) => n === null || n === undefined || n === "" ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/* ───────────── Import en masse ───────────── */

export type ImportRow = { vin: string; model: string; color: string; container: string; line: number };
/** Lit une liste collée ou un CSV : VIN, modèle, couleur, conteneur (facultatifs sauf le VIN). Séparateurs ; , tabulation. */
export function parseImport(text: string): { rows: ImportRow[]; errors: string[] } {
  const rows: ImportRow[] = []; const errors: string[] = []; const seen = new Set<string>();
  String(text || "").split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(); if (!line) return;
    const cells = (line.includes(";") ? line.split(";") : line.includes("\t") ? line.split("\t") : line.split(",")).map(c => c.trim().replace(/^"|"$/g, ""));
    const vin = cells[0].toUpperCase().replace(/[\s-]/g, "");
    if (i === 0 && /^vin$/i.test(cells[0])) return; // en-tête
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) { errors.push(`Ligne ${i + 1} : « ${cells[0]} » n'est pas un VIN (17 caractères, sans I, O, Q).`); return; }
    if (seen.has(vin)) { errors.push(`Ligne ${i + 1} : ${vin} en double dans la liste.`); return; }
    seen.add(vin);
    rows.push({ vin, model: (cells[1] || "").slice(0, 80), color: (cells[2] || "").slice(0, 40), container: (cells[3] || "").toUpperCase().replace(/\s/g, "").slice(0, 20), line: i + 1 });
  });
  return { rows, errors };
}
