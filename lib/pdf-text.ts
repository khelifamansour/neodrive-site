/**
 * Les polices standard des PDF (Helvetica…) n'ont pas les espaces insécables que produit toLocaleString("fr-FR")
 * (U+202F, U+00A0) : elles s'affichent en « / » (« 1 /000 € »). On les remplace par une espace normale
 * avant chaque texte écrit dans un PDF pdfkit.
 */
export const pdfSafe = (s: string) => s.replace(/[    ]/g, " ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeText<T extends Record<string, any>>(doc: T): T {
  for (const m of ["text", "heightOfString", "widthOfString"]) {
    const orig = doc[m]; if (typeof orig !== "function") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any)[m] = (t: unknown, ...a: unknown[]) => orig.call(doc, typeof t === "string" ? pdfSafe(t) : t, ...a);
  }
  return doc;
}
