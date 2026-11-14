/** Pièces détachées NeoDrive : types et calculs partagés (client + serveur). */

export const TVA_RATE = 0.2;

export const ORDER_STATUSES = ["nouvelle", "proforma envoyée", "payée", "préparée", "expédiée", "livrée", "annulée"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const isOrderStatus = (s: unknown): s is OrderStatus => typeof s === "string" && (ORDER_STATUSES as readonly string[]).includes(s);

/** Texte simple affiché au client pour chaque statut. */
export const STATUS_TEXT: Record<OrderStatus, string> = {
  "nouvelle": "Commande reçue. Nous vérifions la disponibilité des pièces.",
  "proforma envoyée": "La facture pro forma vous a été envoyée. Elle sera traitée dès réception du virement.",
  "payée": "Paiement reçu, merci. Nous préparons votre commande.",
  "préparée": "Votre commande est prête.",
  "expédiée": "Votre colis est parti.",
  "livrée": "Commande livrée ou retirée. Merci !",
  "annulée": "Commande annulée.",
};

export type ShippingMode = "retrait" | "envoi";
export const SHIPPING_LABEL: Record<ShippingMode, string> = { retrait: "Retrait", envoi: "Envoi en colis" };
export const SHIPPING_NOTE = "Envoi en colis : 15 € TTC pour les petites pièces, 50 € TTC pour les pièces lourdes ou encombrantes";
/** Forfaits d'envoi TTC : petites pièces 15 €, pièces lourdes ou encombrantes 50 € (un seul forfait par commande, le plus élevé). */
export const SHIP_SMALL_TTC = 15, SHIP_HEAVY_TTC = 50;
const HEAVY = /essieu|pont|diff[ée]rentiel|moteur|batterie|pare.?choc|porte|capot|hayon|si[èe]ge|pare.?brise|vitre|lunette|jante|roue|pneu|amortisseur|ch[âa]ssis|carrosserie|aile|toit|tableau de bord|planche de bord|direction|cr[ée]maill[èe]re|suspension|ressort|bras/i;
export const isHeavyPart = (name: string, category?: string | null) => HEAVY.test(`${name} ${category || ""}`);
/** Frais d'envoi HT d'une commande. */
export function shippingHtFor(lines: { name: string; category?: string | null }[]) {
  if (!lines.length) return 0;
  const t = lines.some(l => isHeavyPart(l.name, l.category)) ? SHIP_HEAVY_TTC : SHIP_SMALL_TTC;
  return Math.round((t / (1 + TVA_RATE)) * 100) / 100;
}

export type Part = { id?: string; sku: string; name: string; category: string | null; sale_price: number | null; image_url: string | null };
export type OrderLine = { sku: string; name: string; qty: number; unit_ht: number; image_url: string | null };
export type HistoryEntry = { at: string; by: string; action: string; from?: string; to?: string; note?: string };

export type PartsOrder = {
  id: string; created_at: string; updated_at?: string; order_number: string; public_token: string;
  customer_first_name: string; customer_last_name: string; customer_phone: string; customer_email: string;
  shipping_address: string | null; vin: string | null; lines: OrderLine[];
  total_ht: number; tva: number; total_ttc: number; shipping_mode: ShippingMode; shipping_ht: number | null;
  status: OrderStatus; customer_message: string | null; notes: string | null; history: HistoryEntry[];
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const ttc = (ht: number) => round2(ht * (1 + TVA_RATE));

/** Totaux d'une commande : lignes + frais d'envoi HT éventuels. */
export function orderTotals(lines: OrderLine[], shippingHt: number | null) {
  const linesHt = round2(lines.reduce((s, l) => s + l.qty * l.unit_ht, 0));
  const total_ht = round2(linesHt + (shippingHt || 0));
  const tva = round2(total_ht * TVA_RATE);
  return { linesHt, total_ht, tva, total_ttc: round2(total_ht + tva) };
}

/** 1234.5 -> "1 234,50 €" (espaces simples, compatibles PDF). */
export function eur(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const [i, d] = Math.abs(Number(n)).toFixed(2).split(".");
  return `${Number(n) < 0 ? "-" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${d} €`;
}

export const CART_KEY = "nd_pieces_cart";
export const PART_CATEGORIES = ["Électricité", "Éclairage", "Carrosserie", "Vitrage & essuie-glace", "Intérieur", "Freinage", "Suspension & direction", "Transmission", "Roues & pneus", "Batterie & charge"];
