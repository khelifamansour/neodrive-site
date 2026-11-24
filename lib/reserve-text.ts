/** Remise sans paiement : textes de la réserve de propriété et de la déclaration du client (navigateur + serveur + PDF). */
/** Engagement sur le virement : case du client, toujours présente s'il a payé ou déclare payer par virement, et dans la remise sans paiement. */
export const VIRE_CHECK = { id: "virement", label: "Je certifie avoir effectué (ou ordonné) le virement du prix à la livraison et je m'engage à ne pas l'annuler ni le rappeler. Si j'annule ce virement ou si ma déclaration est fausse, je reconnais avoir trompé le vendeur : ces faits constituent une escroquerie (article 313-1 du Code pénal), pour laquelle MK HOLDING portera plainte, et le vendeur pourra reprendre le véhicule." } as const;
export const needsVireCheck = (pending: boolean, lines?: { mode: string }[] | null) => pending || !!lines?.some(l => l.mode === "virement");
export type Kept = { cles: boolean; documents: boolean };
export type Declaration = { kind: "virement" | "engagement"; montant: number | null; date: string };
const eur = (n: number | null | undefined) => n == null ? "… €" : `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const dFr = (d: string | null | undefined) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "…";

export const propertyText = (vin: string, montant: number | null) =>
  `RÉSERVE DE PROPRIÉTÉ – Le véhicule (VIN ${vin || "…"}) reste la propriété de MK HOLDING jusqu'au paiement intégral du prix de ${eur(montant)} TTC, conformément aux articles 2367 et suivants du Code civil.`;
export const declText = (d: Pick<Declaration, "kind" | "date">, montant: number | null) => d.kind === "virement"
  ? `Je certifie avoir ordonné le virement de ${eur(montant)} le ${dFr(d.date)} vers le compte de MK HOLDING.`
  : `Je m'engage à payer ${eur(montant)} au plus tard le ${dFr(d.date)}.`;
/** Déroulé, en phrases courtes et factuelles. */
export const PROCESS_TEXT = "Le paiement du prix est exigible à la livraison. Le véhicule m'est remis sur la foi de ma déclaration de paiement ci-dessus. La propriété ne m'est transférée qu'au paiement intégral.";
export const PENAL_TEXT = "Je reconnais que toute fausse déclaration concernant ce paiement, ainsi que l'annulation ou le rappel du virement après la remise du véhicule, peuvent constituer une infraction pénale (notamment escroquerie, article 313-1 du Code pénal), pour laquelle MK HOLDING déposera plainte, en plus de récupérer le véhicule au titre de la réserve de propriété.";

/** Ce que NeoDrive garde : par défaut (ancienne remise) les clés et les documents. */
export function keptOf(remise: unknown): Kept {
  const k = (remise && typeof remise === "object" ? (remise as { kept?: Partial<Kept> }).kept : null) || null;
  return k ? { cles: !!k.cles, documents: !!k.documents } : { cles: true, documents: true };
}
export const keptLabel = (k: Kept) => k.cles && k.documents ? "les clés et les documents" : k.cles ? "les clés" : k.documents ? "les documents" : "";

/** Déclaration envoyée par le navigateur → valeur propre, ou null. */
export function cleanDecl(raw: unknown, montant: number | null): Declaration | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = o.kind === "virement" || o.kind === "engagement" ? o.kind : null;
  const date = String(o.date || "");
  if (!kind || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { kind, montant, date };
}
