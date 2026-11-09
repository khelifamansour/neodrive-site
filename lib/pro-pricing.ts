/** Barème professionnel NeoDrive (Confort uniquement). Montants HT. Même prix public partout : le client paie le même prix clé en main sur le site ou chez un partenaire. */
import { VEHICLES, REGISTRATION_PRICE, departmentFromPostalCode, deliveryPriceForDepartment } from "./neodrive-pricing";

export const TVA = 0.2;
export const PUBLIC_TTC = VEHICLES.confort.price; // 4 990 € TTC
export const PUBLIC_HT = PUBLIC_TTC / (1 + TVA);
export const MISE_A_DISPOSITION_HT = REGISTRATION_PRICE / (1 + TVA); // carte grise + mise en route (150 € TTC)
export const DEPOSIT_RATE = 0.3; // acompte à la commande

export const PRO_OFFERS = [
  { key: "demo", label: "Voiture de démonstration", short: "1 voiture", qty: 1, priceHT: 2990, note: "Pour démarrer : une seule fois par partenaire" },
  { key: "lot3", label: "Lot de 3", short: "3 voitures", qty: 3, priceHT: 3700, note: "Premier niveau distributeur" },
  { key: "lot9", label: "Lot de 9", short: "9 voitures", qty: 9, priceHT: 3600, note: "Un camion complet" },
  { key: "lot13", label: "Lot de 13", short: "13 voitures", qty: 13, priceHT: 3500, note: "Meilleur prix" },
] as const;
export type ProOfferKey = typeof PRO_OFFERS[number]["key"];

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function proQuote(offerKey: string, postal: string) {
  const offer = PRO_OFFERS.find(o => o.key === offerKey);
  const department = departmentFromPostalCode(postal);
  const deliveryTTC = department ? deliveryPriceForDepartment(department) : null;
  if (!offer) return { ok: false as const, reason: "Offre inconnue" };
  if (!department) return { ok: false as const, reason: "Code postal à vérifier" };
  if (deliveryTTC == null) return { ok: false as const, department, reason: "Transport sur devis (Corse, outre-mer)" };
  const forfaitReseauHT = deliveryTTC / (1 + TVA);
  const perCarHT = offer.priceHT + forfaitReseauHT + MISE_A_DISPOSITION_HT;
  const totalHT = perCarHT * offer.qty;
  const totalTVA = totalHT * TVA;
  const totalTTC = totalHT + totalTVA;
  const publicCleEnMainTTC = PUBLIC_TTC + deliveryTTC + REGISTRATION_PRICE; // même prix que sur le site
  const resaleHT = publicCleEnMainTTC / (1 + TVA);
  const marginPerCarHT = resaleHT - perCarHT;
  return {
    ok: true as const, offer, department, deliveryTTC,
    perCar: { vehicleHT: offer.priceHT, forfaitReseauHT: round2(forfaitReseauHT), miseADispositionHT: round2(MISE_A_DISPOSITION_HT), totalHT: round2(perCarHT) },
    totalHT: round2(totalHT), totalTVA: round2(totalTVA), totalTTC: round2(totalTTC), depositTTC: round2(totalTTC * DEPOSIT_RATE),
    publicCleEnMainTTC, marginPerCarHT: round2(marginPerCarHT), marginTotalHT: round2(marginPerCarHT * offer.qty),
  };
}

/** Contrôle de clé d'un SIREN (algorithme de Luhn). */
export function validSiren(v: string) {
  const s = (v || "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) { let d = Number(s[8 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  return sum % 10 === 0;
}
