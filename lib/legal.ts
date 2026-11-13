/**
 * Informations légales de MK HOLDING (marque NeoDrive), utilisées par /cgv et /mentions-legales.
 * Une valeur `null` est affichée « [à compléter] » sur le site : la renseigner ici suffit.
 * Ne jamais inventer un numéro d'immatriculation : reprendre l'extrait Kbis / la facture du médiateur.
 */
export const COMPANY = {
  name: "MK HOLDING",
  brand: "NeoDrive",
  /** Forme juridique affichée sur les devis et contrats du site (« MK HOLDING SAS »). À confirmer avec le Kbis. */
  legalForm: "SAS" as string | null,
  shareCapital: null as string | null, // ex. "1 000 €"
  siren: "908 645 393",
  rcsCity: null as string | null, // ex. "Toulouse"
  vatNumber: null as string | null, // n° TVA intracommunautaire, ex. "FR.. 908645393"
  address: "31 rue Jean Nougaro, 31600 Muret, France",
  president: "Mansour Khelifa",
  phone: "06 89 78 17 10",
  phoneHref: "tel:+33689781710",
  email: "contact.neodrivefrance@gmail.com",
  website: "www.easydrive-auto.fr",
  websiteUrl: "https://www.easydrive-auto.fr",
} as const;

export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
  phone: null as string | null,
} as const;

/** Médiateur de la consommation auquel MK HOLDING a adhéré (obligatoire, art. L612-1 du Code de la consommation). */
export const MEDIATOR = {
  name: null as string | null,
  address: null as string | null,
  website: null as string | null,
};

export const LEGAL_UPDATED = "13 novembre 2026";
