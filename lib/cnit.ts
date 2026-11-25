/**
 * CNIT des modèles connus, déduit du COC (numéro de réception par type, sinon type / variante).
 * Pour ajouter un modèle : une ligne de plus. Partagé client / serveur.
 */
export const KNOWN_CNIT: { marque: string; type: string; reception: string; cnit: string }[] = [
  { marque: "HAI BAO", type: "HB15W01A", reception: "e13*168/2013*02123*01", cnit: "L6EUVA4M000R002" },
  { marque: "BAOTONG", type: "BT-A010000", reception: "e13*168/2013*02604*00", cnit: "L6EWWV4M000R002" },
];

const norm = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** CNIT du modèle reconnu (réception par type en priorité, puis type), sinon "". */
export function cnitFor(x: { reception?: string | null; type?: string | null }): string {
  const r = norm(x.reception), t = norm(x.type);
  if (r) { const hit = KNOWN_CNIT.find(m => norm(m.reception) === r); if (hit) return hit.cnit; }
  if (t) { const hit = KNOWN_CNIT.find(m => norm(m.type) === t || t.includes(norm(m.type))); if (hit) return hit.cnit; }
  return "";
}
