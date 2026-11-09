/** Programme ambassadeurs NeoDrive : commission fixe par vente, petite remise client via code promo. */
export const AMBASSADOR = {
  commission: 100, // € versés à l'ambassadeur par voiture livrée et payée
  discount: 20, // € de remise pour le client qui utilise le code
  payDelayDays: 30, // délai de paiement après la livraison
};

/** Code lisible : NEO + prénom (sans accents, 8 lettres max) + 2 chiffres. */
export function makeCode(firstName: string) {
  const base = firstName.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "AMI";
  return `NEO${base}${Math.floor(10 + Math.random() * 90)}`;
}

export const normalizeCode = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
