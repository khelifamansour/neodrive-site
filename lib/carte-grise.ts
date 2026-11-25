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
  { key: "facture_partenaire", label: "Facture / certificat de vente du partenaire (signé par le vendeur)" },
] as const;
export type CarteGriseFileKey = (typeof CARTE_GRISE_FILES)[number]["key"];
export const CARTE_GRISE_FILE_LABEL: Record<string, string> = Object.fromEntries(CARTE_GRISE_FILES.map(f => [f.key, f.label]));

/** Taille maximale d'une pièce (le contrat signé fait ~1,3 Mo, une photo de téléphone 3 à 8 Mo). */
export const CARTE_GRISE_MAX_FILE = 25 * 1024 * 1024;

/** Champs texte du formulaire conservés dans la fiche (colonnes dédiées + tout le reste dans « fields »). */
export const CARTE_GRISE_COLUMNS = ["type_demande", "nom", "prenom", "telephone", "email", "adresse", "code_postal", "ville", "version", "service_carte_grise"] as const;

/** added_at : pièce complémentaire déposée par le client ; superseded : remplacée par une pièce plus récente (non envoyée, non analysée). */
export type CarteGriseFile = { key: string; label: string; path: string; name: string; size: number; type?: string; added_at?: string; superseded?: boolean };

/* ───────────── Contrôle des pièces ───────────── */

export type DocStatus = "ok" | "manquant" | "à refaire" | "à vérifier";
export type DocPiece = { status: DocStatus; reason: string; detail?: string; files: number; checked_at: string };
export type DocCheck = { at: string; overall: "complet" | "incomplet" | "à vérifier"; pieces: Record<string, DocPiece> };
/** Demande de pièces au client (lien /carte-grise/pieces/<missing_token>). received : pièces déposées depuis la demande. */
export type MissingRequest = { keys: string[]; note?: string; at: string; by?: string; received?: string[]; done_at?: string; sms?: boolean; email?: boolean };

/** Pièces obligatoires pour un dossier complet (le CNIT est facultatif quand le COC est fourni). */
export const CARTE_GRISE_REQUIRED = ["cni", "justificatif_domicile", "mandat_carte_grise_signe", "coc", "devis_signe"];

/** Dossier d'un client de partenaire revendeur (/carte-grise-partenaire) : NeoDrive n'a pas vendu au titulaire. */
export const isPartnerDossier = (d: { fields?: Record<string, string> | null; files?: { key: string }[] | null }) =>
  !!d.fields?.partenaire?.trim() || !!d.files?.some(f => f.key === "facture_partenaire");

/** Pièces obligatoires du dossier : pour un client partenaire, la facture du partenaire remplace le contrat de vente NeoDrive. */
export const requiredKeys = (d: Parameters<typeof isPartnerDossier>[0]) =>
  isPartnerDossier(d) ? CARTE_GRISE_REQUIRED.map(k => k === "devis_signe" ? "facture_partenaire" : k) : CARTE_GRISE_REQUIRED;

/** Explication simple de chaque pièce, pour le client. */
export const CARTE_GRISE_CLIENT_TEXT: Record<string, string> = {
  cni: "Pièce d’identité en cours de validité (carte d’identité recto et verso, ou passeport), bien lisible, à votre nom",
  justificatif_domicile: "Justificatif de domicile de moins de 6 mois : facture d’électricité, de gaz, d’eau, de téléphone ou d’internet, ou attestation d’assurance habitation, à votre nom et à votre adresse",
  mandat_carte_grise_signe: "Mandat d’immatriculation signé par vous (toutes les pages, avec votre signature)",
  coc: "Certificat de conformité européen (COC) du véhicule, en entier et bien lisible",
  cnit: "Document d’homologation (CNIT) du véhicule",
  devis_signe: "Contrat de vente, facture ou certificat de cession signé",
  facture_partenaire: "Facture ou certificat de vente établi par le partenaire vendeur à votre nom, signé par le vendeur",
};

/** Pièces encore attendues du client : demandées et pas encore reçues, ou reçues mais à refaire. */
export function pendingKeys(req: MissingRequest | null | undefined, check: DocCheck | null | undefined): string[] {
  const bad = (k: string) => { const s = check?.pieces?.[k]?.status; return s === "manquant" || s === "à refaire"; };
  if (!req?.keys?.length) return Object.keys(check?.pieces || {}).filter(bad);
  return req.keys.filter(k => !(req.received || []).includes(k) || bad(k));
}

const gsm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\n]/g, "");
/** SMS (texte GSM, sans accents) et message WhatsApp de demande de pièces. */
export const missingSmsText = (prenom: string | null, url: string) => gsm(`Bonjour${prenom ? " " + prenom.trim() : ""}, pour finaliser votre carte grise il nous manque un ou plusieurs documents. Envoyez-les en photo ici : ${url}\nL'equipe NeoDrive`);
export const missingWaText = (prenom: string | null, url: string, labels: string[]) => `Bonjour${prenom ? " " + prenom.trim() : ""}, pour finaliser votre carte grise il nous manque :\n${labels.map(l => `• ${l}`).join("\n")}\n\nVous pouvez les envoyer en photo ou en PDF ici : ${url}\n\nMerci, l’équipe NeoDrive`;
