/** Documents privés de l'entreprise (cachet, signature…) : bucket privé erp-documents, dossier entreprise/. Serveur uniquement, jamais dans /public ni dans git. */
import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_BUCKET = "erp-documents";
export const COMPANY_FOLDER = "entreprise";
/** Cachet et signature de MK HOLDING, apposé sur les mandats d'immatriculation. */
export const CACHET_FILE = "cachet-et-signature.png";

/** Nom de fichier sûr (lettres, chiffres, . _ -), sans chemin. "" si invalide. */
export const safeCompanyName = (name: unknown) => {
  const n = String(name ?? "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(n) && !n.includes("..") ? n : "";
};

/** Contenu d'un document de l'entreprise, ou null s'il n'existe pas. */
export async function getCompanyDoc(sb: SupabaseClient, name: string): Promise<Uint8Array | null> {
  const n = safeCompanyName(name); if (!n) return null;
  const { data, error } = await sb.storage.from(COMPANY_BUCKET).download(`${COMPANY_FOLDER}/${n}`);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
