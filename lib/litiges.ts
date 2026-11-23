/** Litiges : constantes partagées entre la page /litiges et les routes serveur. */
export const LITIGE_STATUTS = ["en cours", "mise en demeure", "amiable", "procédure", "clos gagné", "clos perdu", "clos accord"] as const;
export const PIECE_CATEGORIES = ["courrier avocat", "facture", "bon de livraison", "e-mail", "photo", "plainte-médical", "autre"] as const;
/** 25 Mo par fichier. */
export const LITIGE_MAX_FILE = 25 * 1024 * 1024;
/** Extensions acceptées pour les pièces. */
export const LITIGE_EXT = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp", "docx", "eml", "txt"] as const;
/** Sans « .heic » explicite : l'iPhone convertit alors ses photos en JPEG, lisibles par l'IA. */
export const LITIGE_ACCEPT = "application/pdf,image/*,.docx,.eml,.txt,message/rfc822,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const fileExt = (name: string) => (name.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || "").toLowerCase();
