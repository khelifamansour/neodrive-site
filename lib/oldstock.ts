/** Ancien stock : statuts, étapes et texte d'annonce par défaut. */
export const STOCK_STATUS = ["à inventorier", "à réparer", "à photographier", "prêt à vendre", "en vente", "réservé", "vendu"] as const;
export const CG_STATUS = ["à vérifier", "disponible", "manquante", "demandée"] as const;
export const STARTS = ["?", "oui", "non"] as const;
export type StockRow = Record<string, any>;

/** Prochaine action concrète pour un véhicule. */
export function nextStep(v: StockRow, mediaCount: number): { text: string; level: "red" | "orange" | "green" | "grey" } {
  if (v.status === "vendu") return { text: "Vendu", level: "grey" };
  if (v.status === "réservé") return { text: "Organiser la livraison et encaisser", level: "green" };
  if (v.cg_status === "manquante") return { text: "CARTE GRISE MANQUANTE : retrouver les papiers ou demander un duplicata", level: "red" };
  if (v.cg_status === "à vérifier" || v.cg_status === "demandée") return { text: v.cg_status === "demandée" ? "Carte grise demandée : suivre la demande" : "Vérifier la carte grise", level: "orange" };
  if (v.starts === "non" || (v.repairs && v.status === "à réparer")) return { text: "Réparer (ou vendre en l'état, prix réduit)", level: "orange" };
  if (!v.km && v.km !== 0) return { text: "Relever le kilométrage", level: "orange" };
  if (mediaCount < 4) return { text: `Prendre les photos (${mediaCount}/6 minimum : avant, arrière, 2 côtés, intérieur, compteur)`, level: "orange" };
  if (!v.price_ad) return { text: "Fixer le prix de l'annonce", level: "orange" };
  if (!v.ad_text) return { text: "Générer l'annonce", level: "orange" };
  if (v.status !== "en vente") return { text: "Publier l'annonce (Leboncoin + site) et passer en « en vente »", level: "green" };
  return { text: "En vente : relancer les contacts, baisser le prix si aucun appel sous 7 jours", level: "green" };
}

export function defaultAd(v: StockRow) {
  const name = [v.model || "Voiture sans permis", v.version].filter(Boolean).join(" ");
  const title = `${name}${v.year ? ` ${v.year}` : ""}${v.km != null ? ` – ${Number(v.km).toLocaleString("fr-FR")} km` : ""} – voiture sans permis`;
  const lines = [
    `${name}${v.color ? `, couleur ${v.color}` : ""}${v.year ? `, année ${v.year}` : ""}.`,
    v.km != null ? `Kilométrage : ${Number(v.km).toLocaleString("fr-FR")} km.` : "",
    v.starts === "oui" ? "Démarre et roule." : v.starts === "non" ? "Ne démarre pas : vendue en l'état, idéale pour bricoleur ou pièces." : "",
    v.condition ? `État : ${v.condition}.` : "",
    v.repairs ? `À prévoir : ${v.repairs}.` : "",
    v.cg_status === "disponible" ? "Carte grise disponible, cession immédiate." : "",
    "Voiture sans permis, accessible dès 14 ans avec le permis AM.",
    "Visible près de Muret (31), livraison possible partout en France.",
    v.price_ad ? `Prix : ${Number(v.price_ad).toLocaleString("fr-FR")} €.` : "",
    "NeoDrive – 06 89 78 17 10",
  ].filter(Boolean);
  return { title: title.slice(0, 100), text: lines.join("\n") };
}
