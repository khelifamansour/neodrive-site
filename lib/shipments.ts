/** Dossiers conteneurs : types de documents (FR / EN / 中文) et pièces obligatoires pour le transitaire. */
export const DOC_TYPES = [
  { key: "facture", fr: "Facture commerciale", en: "Commercial invoice", zh: "商业发票", required: true },
  { key: "colisage", fr: "Liste de colisage (avec n° de série / VIN)", en: "Packing list (with serial / VIN numbers)", zh: "装箱单（含车架号）", required: true },
  { key: "coc", fr: "Certificats de conformité (COC)", en: "Certificates of conformity (COC)", zh: "车辆一致性证书 (COC)", required: true },
  { key: "bl", fr: "Connaissement (B/L)", en: "Bill of lading (B/L)", zh: "提单", required: true },
  { key: "transport", fr: "Facture de transport", en: "Freight invoice", zh: "运费发票", required: true },
  { key: "assurance", fr: "Assurance transport", en: "Cargo insurance", zh: "货物保险", required: false },
  { key: "douane", fr: "Douane (DAU, avis d'arrivée…)", en: "Customs (declaration, arrival notice…)", zh: "海关文件", required: false },
  { key: "autre", fr: "Autre", en: "Other", zh: "其他", required: false },
] as const;
export type DocType = typeof DOC_TYPES[number]["key"];
export const isDocType = (v: unknown): v is DocType => DOC_TYPES.some(d => d.key === v);
export const VERSIONS = ["originale", "corrigée"] as const;
export const docLabel = (k: string) => DOC_TYPES.find(d => d.key === k)?.fr || k;

/** Classement automatique par le nom du fichier (repli si l'IA n'est pas disponible). */
export function guessType(name: string): DocType {
  const n = name.toLowerCase();
  if (/(^|[^a-z])(obl|bl|b-l|bill|lading)([^a-z]|$)|^\d{12}/.test(n)) return "bl";
  if (/coc|conform/.test(n)) return "coc";
  if (/pl\d|packing|colisage/.test(n)) return "colisage";
  if (/freight|fret|transport|usdfp|yhf/.test(n)) return "transport";
  if (/ci\d|invoice|facture|inv/.test(n)) return "facture";
  if (/insur|assur/.test(n)) return "assurance";
  return "autre";
}

/** Clé de contrôle d'un VIN (9e caractère, norme ISO 3779) : true si le numéro est cohérent. */
export function vinValid(vin: string): boolean {
  const v = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.length !== 17 || /[IOQ]/.test(v)) return false;
  const L: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const t = [...v].reduce((s, c, i) => s + (/\d/.test(c) ? Number(c) : L[c] || 0) * W[i], 0) % 11;
  return (t === 10 ? "X" : String(t)) === v[8];
}

/** Transitaire selon le port : Fos-sur-Mer ou Le Havre. */
export const portKey = (port: unknown) => /fos/i.test(String(port || "")) ? "Fos-sur-Mer" : "Le Havre";

export type ContainerInfo = { no: string; seal?: string; net?: number; gross?: number; cbm?: number };
export type ExtraLine = { desc: string; qty: number; price: number; container?: string; net?: number; gross?: number; cbm?: number };
