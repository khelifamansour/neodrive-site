/** Dossiers carte grise (/reservation-carte-grise) : constantes partagées client / serveur. */

/** Prestataire carte grise de NeoDrive (NK Services). Surcharge possible par la variable CARTE_GRISE_PROVIDER_EMAIL. */
export const CARTE_GRISE_PROVIDER_NAME = "NK SERVICES";
export const CARTE_GRISE_PROVIDER_EMAIL = (typeof process !== "undefined" && process.env.CARTE_GRISE_PROVIDER_EMAIL) || "nkservices.cartegrise@gmail.com";

/** Pièces jointes du formulaire (nom du champ fichier → libellé). */
export const CARTE_GRISE_FILES = [
  { key: "cni", label: "Carte nationale d’identité" },
  { key: "justificatif_domicile", label: "Justificatif de domicile" },
  { key: "mandat_carte_grise_signe", label: "Mandat d’immatriculation signé" },
  { key: "coc", label: "Certificat de conformité européen (COC)" },
  { key: "cnit", label: "CNIT / document d’homologation" },
  { key: "devis_signe", label: "Contrat de vente / devis signé" },
] as const;
export type CarteGriseFileKey = (typeof CARTE_GRISE_FILES)[number]["key"];
export const CARTE_GRISE_FILE_LABEL: Record<string, string> = Object.fromEntries(CARTE_GRISE_FILES.map(f => [f.key, f.label]));

/** Taille maximale d'une pièce (le contrat signé fait ~1,3 Mo, une photo de téléphone 3 à 8 Mo). */
export const CARTE_GRISE_MAX_FILE = 25 * 1024 * 1024;

/** Champs texte du formulaire conservés dans la fiche (colonnes dédiées + tout le reste dans « fields »). */
export const CARTE_GRISE_COLUMNS = ["type_demande", "nom", "prenom", "telephone", "email", "adresse", "code_postal", "ville", "version", "service_carte_grise"] as const;

export type CarteGriseFile = { key: string; label: string; path: string; name: string; size: number; type?: string };
