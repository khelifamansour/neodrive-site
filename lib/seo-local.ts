/** Données SEO locales (villes et départements) : prix réels, zone de livraison, délai, FAQ. Aucune donnée inventée. */
import { DEPARTEMENTS } from "./departements";
import { VEHICLES, REGISTRATION_PRICE, deliveryPriceForDepartment } from "./neodrive-pricing";
import { seoCities, type SeoCity } from "./seo-cities";

/**
 * Message « livrée avant Noël » : la Confort est en stock et livrée en 2 à 3 semaines.
 * Calculé à la génération des pages : après le 12 décembre, le message Noël disparaît au prochain déploiement.
 */
export const NOEL_ACTIVE = Date.now() < new Date("2026-12-12T23:59:59+01:00").getTime();
export const CONFORT_PRICE = VEHICLES.confort.price;
export const CONFORT_STOCK = NOEL_ACTIVE ? "en stock, livrée avant Noël" : "en stock, livrée en 2 à 3 semaines";
export const NOEL_NOTE = NOEL_ACTIVE
  ? "La Confort est en stock et livrée en 2 à 3 semaines : réservée maintenant, elle peut arriver avant Noël. La date exacte est confirmée à la réservation, selon la tournée."
  : "La Confort est en stock et livrée en 2 à 3 semaines environ ; la date exacte est confirmée à la réservation, selon la tournée.";

export const eur = (n: number) => `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} €`;

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const LES = ["Bouches-du-Rhône", "Alpes-de-Haute-Provence", "Hautes-Alpes", "Alpes-Maritimes", "Ardennes", "Côtes-d'Armor", "Deux-Sèvres", "Hautes-Pyrénées", "Pyrénées-Atlantiques", "Pyrénées-Orientales", "Landes", "Vosges", "Yvelines", "Hauts-de-Seine"];
const LE = ["Calvados", "Cantal", "Cher", "Doubs", "Finistère", "Gard", "Gers", "Jura", "Loir-et-Cher", "Loiret", "Lot", "Lot-et-Garonne", "Morbihan", "Nord", "Pas-de-Calais", "Puy-de-Dôme", "Rhône", "Tarn", "Tarn-et-Garonne", "Var", "Vaucluse", "Val-d'Oise", "Val-de-Marne", "Territoire de Belfort", "Haut-Rhin", "Bas-Rhin"];
const L = ["Ain", "Allier", "Aisne", "Aube", "Aude", "Eure", "Eure-et-Loir", "Hérault", "Indre", "Indre-et-Loire", "Oise", "Orne", "Yonne"];
/** « en Gironde », « dans le Nord », « dans l'Hérault », « dans les Landes », « à Paris ». */
export function inDep(name: string) {
  const n = name.replace(/’/g, "'");
  if (n === "Paris") return "à Paris";
  if (LES.includes(n)) return `dans les ${name}`;
  if (LE.includes(n)) return `dans le ${name}`;
  if (L.includes(n)) return `dans l'${name}`;
  return `en ${name}`;
}

/** « à Lyon », « au Havre », « au Mans », « aux Sables-d'Olonne ». */
export function atCity(city: string) {
  if (city.startsWith("Le ")) return `au ${city.slice(3)}`;
  if (city.startsWith("Les ")) return `aux ${city.slice(4)}`;
  return `à ${city}`;
}

export type SeoDepartment = { code: string; name: string; slug: string; delivery: number; zone: number; cities: SeoCity[] };

const ZONE_OF: Record<number, number> = { 450: 1, 590: 2, 690: 3, 790: 4 };

/** Départements de métropole continentale (la Corse et l'outre-mer sont sur devis). */
export const seoDepartments: SeoDepartment[] = Object.entries(DEPARTEMENTS)
  .filter(([code]) => code !== "2A" && code !== "2B")
  .map(([code, [name]]) => {
    const delivery = deliveryPriceForDepartment(code) as number;
    return { code, name, slug: `${slugify(name)}-${code.toLowerCase()}`, delivery, zone: ZONE_OF[delivery], cities: seoCities.filter(c => c.departmentCode === code) };
  });

export const getSeoDepartment = (slug: string) => seoDepartments.find(d => d.slug === slug);
export const departmentByCode = (code: string) => seoDepartments.find(d => d.code === code);
export const departmentPath = (d: SeoDepartment) => `/voiture-sans-permis/departement/${d.slug}`;

/** Prix total estimé livré (véhicule + livraison + carte grise optionnelle). */
export function totals(delivery: number) {
  return (["confort", "essentielle", "confortPlus"] as const).map(k => ({
    key: k,
    label: VEHICLES[k].label,
    price: VEHICLES[k].price,
    delivered: VEHICLES[k].price + delivery,
    withRegistration: VEHICLES[k].price + delivery + REGISTRATION_PRICE,
    availability: k === "confort" ? "En stock : livrée en 2 à 3 semaines" : k === "essentielle" ? "Sur commande : 6 à 8 mois" : "Sur commande : délai confirmé par un conseiller",
  }));
}

export const ZONE_LABEL: Record<number, string> = {
  1: "zone 1 (Haute-Garonne et départements voisins, au plus près de notre base de Muret)",
  2: "zone 2 (grand Sud-Ouest et Occitanie élargie)",
  3: "zone 3 (Île-de-France, Lyon, Marseille, Clermont-Ferrand et Centre-Ouest)",
  4: "zone 4 (reste de la France métropolitaine)",
};

/** FAQ locale factuelle (sert à la fois au contenu visible et au JSON-LD FAQPage). */
export function localFaq(inPlace: string, delivery: number): [string, string][] {
  return [
    [`Combien coûte une voiture sans permis livrée ${inPlace} ?`, `La NeoDrive Confort coûte ${eur(CONFORT_PRICE)} TTC. La livraison ${inPlace} est facturée ${eur(delivery)}, soit ${eur(CONFORT_PRICE + delivery)} livrée, ou ${eur(CONFORT_PRICE + delivery + REGISTRATION_PRICE)} avec la carte grise faite par nos soins (${eur(REGISTRATION_PRICE)}).`],
    [`Quel est le délai de livraison ${inPlace} ?`, `${NOEL_NOTE} L'Essentielle (${eur(VEHICLES.essentielle.price)}) est fabriquée sur commande, avec un délai de 6 à 8 mois.`],
    [`Faut-il payer un acompte ?`, `Non : 0 € d'acompte. Vous réservez en ligne et vous payez à la livraison, après avoir vu la voiture devant chez vous.`],
    [`Qui peut conduire une voiture sans permis ${inPlace} ?`, `Une voiture sans permis (quadricycle léger L6e, 45 km/h, 2 places) se conduit dès 14 ans avec le permis AM, ou sans formation pour les personnes nées avant 1988.`],
    [`Y a-t-il un magasin NeoDrive ${inPlace} ?`, `Non. NeoDrive vend en direct depuis la région toulousaine : photos et vidéos réelles, échange par téléphone ou WhatsApp, puis livraison à votre adresse. C'est ce qui permet un prix de ${eur(VEHICLES.essentielle.price)} à ${eur(VEHICLES.confortPlus.price)}.`],
    [`Quelle autonomie et comment la recharger ?`, `L'autonomie indicative est de 50 à 70 km selon l'usage, la température et le relief. La recharge se fait sur une prise domestique 220 V, sans borne.`],
  ];
}
