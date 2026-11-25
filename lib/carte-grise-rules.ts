/**
 * Règles déterministes du contrôle des pièces carte grise (appliquées après la lecture automatique, pour limiter les fausses alertes).
 * Fonctions pures, sans dépendance : validité d'une carte d'identité, rapprochement tolérant des noms, comparaison de VIN.
 */

/** Tolérance sur une pièce d'identité expirée : en deçà, simple remarque « à vérifier » (non bloquante). */
export const ID_EXPIRED_TOLERANCE_YEARS = 5;

/** Date « JJ/MM/AAAA » (ou « JJ.MM.AAAA », « JJ-MM-AAAA », « AAAA-MM-JJ ») → Date UTC, sinon null. */
export function parseFrDate(s: unknown): Date | null {
  const t = String(s ?? "").trim();
  let m = t.match(/^(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{4})$/);
  let dd: number, mm: number, yy: number;
  if (m) { dd = +m[1]; mm = +m[2]; yy = +m[3]; }
  else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { yy = +m[1]; mm = +m[2]; dd = +m[3]; }
  else return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 1900 || yy > 2100) return null;
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  return d.getUTCMonth() === mm - 1 ? d : null;
}
export const fmtFr = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const addYears = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate()));

const EXT_FROM = Date.UTC(2004, 0, 2), EXT_TO = Date.UTC(2013, 11, 31);

export type IdKind = "cni" | "passeport" | "titre_sejour" | "permis" | "autre" | "";
export type IdValidity = {
  /** Date de fin de validité réelle (après prolongation éventuelle), null si illisible. */
  expiry: Date | null;
  /** Prolongation automatique de 5 ans appliquée (CNI délivrée à un majeur entre le 02/01/2004 et le 31/12/2013). */
  extended: boolean;
  state: "valide" | "expirée_tolérée" | "expirée" | "inconnue";
  /** Années écoulées depuis l'expiration (0 si valide). */
  yearsExpired: number;
};

/**
 * Validité d'une pièce d'identité. Les CNI françaises délivrées à un majeur entre le 2 janvier 2004 et le 31 décembre 2013
 * sont valables 15 ans (la date imprimée, 10 ans, est prolongée de 5 ans). Date de délivrance absente : déduite de la date
 * imprimée (−10 ans) pour une ancienne CNI. Date de naissance absente : titulaire supposé majeur.
 */
export function idValidity(o: { kind?: IdKind | string; issued?: unknown; printedExpiry?: unknown; birth?: unknown }, now = new Date()): IdValidity {
  const kind = String(o.kind || "").toLowerCase();
  let issued = parseFrDate(o.issued);
  let expiry = parseFrDate(o.printedExpiry);
  const birth = parseFrDate(o.birth);
  const isCni = kind === "cni";
  // Sans date imprimée, seule une CNI délivrée avant 2014 a une durée certaine (10 ans, puis prolongation ci-dessous).
  if (isCni && !expiry && issued && issued.getTime() <= EXT_TO) expiry = addYears(issued, 10);
  if (isCni && !issued && expiry) { const guess = addYears(expiry, -10); if (guess.getTime() >= EXT_FROM && guess.getTime() <= EXT_TO) issued = guess; }
  let extended = false;
  if (isCni && expiry && issued && issued.getTime() >= EXT_FROM && issued.getTime() <= EXT_TO) {
    const adult = !birth || addYears(birth, 18).getTime() <= issued.getTime();
    // Prolongation seulement si la date imprimée est bien l'ancienne validité de 10 ans (pas une date déjà prolongée).
    if (adult && expiry.getTime() < addYears(issued, 11).getTime()) { expiry = addYears(expiry, 5); extended = true; }
  }
  if (!expiry) return { expiry: null, extended, state: "inconnue", yearsExpired: 0 };
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (expiry.getTime() >= today) return { expiry, extended, state: "valide", yearsExpired: 0 };
  const yearsExpired = (today - expiry.getTime()) / (365.25 * 86400_000);
  return { expiry, extended, state: yearsExpired <= ID_EXPIRED_TOLERANCE_YEARS ? "expirée_tolérée" : "expirée", yearsExpired };
}

/* ───────────── Noms ───────────── */

const NOISE = new Set(["EPOUSE", "EP", "EPSE", "VEUVE", "VVE", "NEE", "NE", "DIVORCEE", "MME", "MADAME", "MR", "M", "MONSIEUR", "MLLE", "MADEMOISELLE", "MELLE", "ET", "OU", "NOM", "USAGE", "PRENOM", "PRENOMS", "DIT", "DITE"]);
/** Mots d'un nom, sans accents, majuscules, sans civilités ni « épouse » ; les noms composés sont découpés. */
export const nameTokens = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
  .replace(/[^A-Z]+/g, " ").split(" ").filter(w => w.length > 1 && !NOISE.has(w));

export type NameMatch = "identique" | "prenom_seul" | "different" | "inconnu";
/**
 * Rapproche le nom lu sur une pièce du titulaire du dossier, sans tenir compte de l'ordre, des accents, des tirets,
 * de « épouse X » ni des prénoms supplémentaires. prenom_seul : prénom retrouvé mais nom de famille différent
 * (nom d'épouse / de jeune fille probable).
 */
export function matchName(read: unknown, prenom: unknown, nom: unknown): NameMatch {
  const got = new Set(nameTokens(read));
  const p = nameTokens(prenom), n = nameTokens(nom);
  if (!got.size || (!p.length && !n.length)) return "inconnu";
  const hasP = !p.length || p.some(w => got.has(w));
  const hasN = !n.length || n.some(w => got.has(w));
  if (hasP && hasN) return "identique";
  if (hasP && p.length) return "prenom_seul";
  return "different";
}

/* ───────────── VIN ───────────── */

/** Caractères souvent confondus à la lecture d'un scan (photocopie de COC). */
const CONFUSABLE = ["0D", "0Q", "8B", "5S", "1L", "17", "2Z", "6G", "4A", "UV", "MN", "3B", "9G"];
const confusable = (a: string, b: string) => CONFUSABLE.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

/**
 * Compare un VIN lu (éventuellement partiel) au VIN attendu.
 * identique ; confusion : seuls des caractères proches diffèrent (lecture) ; proche : 1 ou 2 caractères différents ;
 * different : 3 caractères ou plus ; partiel : moins de 17 caractères, tous présents dans le VIN attendu ; incompatible : partiel mais non retrouvé.
 */
export function compareVin(read: string, expected: string): { kind: "identique" | "confusion" | "proche" | "different" | "partiel" | "incompatible"; diff: number } {
  const a = read.toUpperCase(), b = expected.toUpperCase();
  if (a.length !== b.length) {
    if (a.length >= 17 || b.length !== 17) return { kind: "incompatible", diff: Infinity };
    // Lecture partielle : une suite d'au moins 6 caractères retrouvée telle quelle dans le VIN attendu suffit.
    return { kind: a.length >= 6 && b.includes(a) ? "partiel" : a.length < 6 ? "partiel" : "incompatible", diff: Infinity };
  }
  let diff = 0, hard = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { diff++; if (!confusable(a[i], b[i])) hard++; }
  if (!diff) return { kind: "identique", diff };
  if (!hard) return { kind: "confusion", diff };
  return { kind: hard <= 2 ? "proche" : "different", diff };
}
