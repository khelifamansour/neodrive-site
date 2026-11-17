/** Espace Conformité : listes partagées entre le serveur et les pages. */
export const BUCKET = "compliance-docs";
export const ORGANISMES = ["Revolut", "Banque", "Douane", "URSSAF", "Impôts", "Autre"] as const;
export const STATUTS: Record<string, string> = { a_faire: "À faire", envoye: "Envoyé", valide: "Validé", refuse: "Refusé" };
export const CATEGORIES: Record<string, string> = {
  kbis: "Kbis / statuts", identite: "Identité", business_plan: "Business plan", previsionnel: "Prévisionnel",
  factures_fournisseurs: "Factures fournisseurs", factures_clients: "Factures clients", releves: "Relevés bancaires",
  douane: "B/L et douane", coc: "COC", contrats: "Contrats", autre: "Autre",
};
export type HistoryEntry = { date: string; sens: "recu" | "envoye"; texte: string };
export type ComplianceRequest = { id: number; organisme: string; objet: string; demande: string; date_demande: string | null; date_limite: string | null; statut: string; reponse: string; notes: string; history: HistoryEntry[]; created_at: string; updated_at: string };
export type ComplianceDoc = { id: number; categorie: string; titre: string; description: string; path: string; mime: string | null; size: number | null; date_doc: string | null; request_id: number | null; created_at: string };
