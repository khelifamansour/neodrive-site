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

/** Parcours ambassadeur : le niveau dépend du nombre total de voitures vendues (livrées et payées). */
export const LEVELS = [
  { name: "Bronze", from: 0, commission: 100, perks: ["Votre code promo et votre lien personnel", "Le kit vidéos NeoDrive à republier librement"] },
  { name: "Argent", from: 5, commission: 100, perks: ["Tournage sur place avec une voiture, sur rendez-vous", "Vos vidéos mises en avant sur les réseaux NeoDrive"] },
  { name: "Or", from: 15, commission: 100, perks: ["Accès en avant-première aux nouveaux modèles", "Vidéos exclusives fournies avant leur sortie"] },
  { name: "Platine", from: 30, commission: 100, perks: ["Une NeoDrive pour vous au prix ambassadeur", "Partenaire officiel NeoDrive, mis en avant sur le site"] },
] as const;

/** Objectifs du mois : bonus unique (non cumulable) versé en plus des commissions. La commission reste 100 € par vente. */
export const MONTHLY_BONUS = [
  { sales: 3, bonus: 50 },
  { sales: 5, bonus: 150 },
] as const;
