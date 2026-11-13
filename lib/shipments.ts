/** Dossiers conteneurs : types de documents (FR / EN / 中文) et pièces obligatoires pour le transitaire. */
export const DOC_TYPES = [
  { key: "pi", fr: "Facture proforma (PI)", en: "Proforma invoice (PI)", zh: "形式发票", required: false, factory: true, send: false },
  { key: "facture", fr: "Facture commerciale", en: "Commercial invoice", zh: "商业发票", required: true, factory: true, send: true },
  { key: "colisage", fr: "Liste de colisage (avec n° de série / VIN)", en: "Packing list (with serial / VIN numbers)", zh: "装箱单（含车架号）", required: true, factory: true, send: true },
  { key: "coc", fr: "Certificats de conformité (COC)", en: "Certificates of conformity (COC)", zh: "车辆一致性证书 (COC)", required: true, factory: true, send: true },
  { key: "bl", fr: "Connaissement (B/L)", en: "Bill of lading (B/L)", zh: "提单", required: true, factory: true, send: true },
  { key: "photos", fr: "Photos du chargement", en: "Loading photos", zh: "装柜照片", required: false, factory: true, send: false },
  { key: "pieces", fr: "Liste détaillée des pièces détachées", en: "Detailed spare-parts list", zh: "配件明细清单", required: false, factory: true, send: true },
  { key: "transport", fr: "Facture de transport", en: "Freight invoice", zh: "运费发票", required: true, factory: false, send: true },
  { key: "assurance", fr: "Assurance transport", en: "Cargo insurance", zh: "货物保险", required: false, factory: false, send: true },
  { key: "douane", fr: "Douane (DAU, avis d'arrivée…)", en: "Customs (declaration, arrival notice…)", zh: "海关文件", required: false, factory: false, send: true },
  { key: "autre", fr: "Autre", en: "Other", zh: "其他", required: false, factory: false, send: true },
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
  if (/proforma|(^|[^a-z])pi([^a-z]|\d|$)/.test(n)) return "pi";
  if (/spare|parts|pieces|pièces|配件/.test(n)) return "pieces";
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

/* ───────────── Suivi véhicule par véhicule (VIN) ───────────── */

/** Étapes de la vie d'un véhicule, dans l'ordre. */
export const STAGES = ["en mer", "au port", "au dépôt", "chargée", "livrée"] as const;
export type Stage = typeof STAGES[number];
export const isStage = (v: unknown): v is Stage => STAGES.includes(v as Stage);
export const STAGE_ICON: Record<Stage, string> = { "en mer": "🚢", "au port": "⚓", "au dépôt": "🏠", "chargée": "🚚", "livrée": "✅" };

/** Dépôts NeoDrive (l'id correspond au hub du planificateur quand il existe). */
export const DEPOTS = [
  { id: "lamasquere", name: "Toulouse / Lamasquère", lat: 43.4836, lng: 1.2483 },
  { id: "gennevilliers", name: "Asnières / Gennevilliers", lat: 48.9258, lng: 2.2933 },
  { id: "le-havre", name: "Le Havre", lat: 49.4944, lng: 0.1079 },
] as const;
export const isDepot = (v: unknown) => DEPOTS.some(d => d.id === v);
export const depotName = (id: unknown) => DEPOTS.find(d => d.id === id)?.name || (id ? String(id) : "Dépôt à définir");

/** Délai estimé entre l'arrivée du navire et la disponibilité au dépôt (dédouanement + transport + dépotage). */
export const PORT_TO_DEPOT_DAYS = 7;

type ShipLite = { status?: string | null; eta?: string | null; arrived_at?: string | null; depot?: string | null };
type VehLite = { status?: string | null; depot?: string | null; client_id?: string | null };

/** Étape réelle : celle du véhicule si elle a été saisie, sinon déduite du statut du dossier conteneur. */
export function vehicleStage(v: VehLite, ship?: ShipLite | null): Stage {
  const own = isStage(v.status) ? v.status : "en mer";
  if (own !== "en mer") return own;
  const st = String(ship?.status || "");
  if (st === "dépoté" || st === "terminé") return "au dépôt";
  if (st === "arrivé au port" || st === "dédouané" || ship?.arrived_at) return "au port";
  return "en mer";
}

/** Dépôt d'un véhicule : le sien, sinon le dépôt de destination du conteneur. */
export const vehicleDepot = (v: VehLite, ship?: ShipLite | null) => v.depot || ship?.depot || null;

/** Date estimée de disponibilité au dépôt (null = déjà au dépôt, chargé ou livré, ou date d'arrivée inconnue). */
export function availableOn(v: VehLite, ship?: ShipLite | null): Date | null {
  const st = vehicleStage(v, ship);
  if (st !== "en mer" && st !== "au port") return null;
  const base = ship?.arrived_at || ship?.eta; if (!base) return null;
  const d = new Date(base); d.setDate(d.getDate() + PORT_TO_DEPOT_DAYS);
  return d;
}

export const HORIZONS = ["maintenant", "sous 1 semaine", "sous 1 mois", "plus tard"] as const;
export type Horizon = typeof HORIZONS[number];
/** Classe un véhicule en stock : disponible maintenant, sous 1 semaine, sous 1 mois, plus tard (null = chargé ou livré). */
export function horizonOf(v: VehLite, ship?: ShipLite | null, now = Date.now()): Horizon | null {
  const st = vehicleStage(v, ship);
  if (st === "chargée" || st === "livrée") return null;
  if (st === "au dépôt") return "maintenant";
  const d = availableOn(v, ship); if (!d) return "plus tard";
  const days = (d.getTime() - now) / 86400000;
  return days <= 7 ? "sous 1 semaine" : days <= 31 ? "sous 1 mois" : "plus tard";
}

/** Normalise un VIN lu sur une photo (les lettres I, O, Q n'existent pas dans un VIN). */
export const normVin = (s: unknown) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/I/g, "1").replace(/Q/g, "0");
/** Nombre de caractères différents entre deux VIN de même longueur. */
export const vinDistance = (a: string, b: string) => a.length !== b.length ? 99 : [...a].reduce((n, c, i) => n + (c === b[i] ? 0 : 1), 0);

/* ───────────── Portail usine : contrôles automatiques ───────────── */

export const FACTORY_DOCS = DOC_TYPES.filter(d => d.factory);
/** Données lues dans un document (shipment_docs.extracted). */
export type Extracted = {
  vins?: string[]; containers?: { no: string; vins?: string[] }[];
  quantity?: number | null; unit_price?: number | null; total?: number | null; currency?: string | null;
  lines?: { desc?: string; qty?: number | null; price?: number | null; amount?: number | null }[]; invoice_no?: string | null; error?: string;
};
export type DocLite = { doc_type: string; version?: string | null; created_at?: string | null; extracted?: Extracted | null; file_name?: string | null };
export type Issue = { level: "error" | "warn"; en: string; fr: string };

/** Document de référence d'un type : la dernière version corrigée, sinon le dernier original. */
export function latestDoc<T extends DocLite>(docs: T[], type: string): T | undefined {
  const all = docs.filter(d => d.doc_type === type).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return all.find(d => d.version === "corrigée") || all[0];
}

const num = (v: unknown) => v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

/**
 * Contrôles du dossier usine : pièces manquantes, VIN invalides, même liste de VIN sur facture / colisage / COC,
 * nombre de véhicules et total de la facture cohérents. Les messages existent en anglais (usine) et en français.
 */
export function factoryChecks(ship: { vehicles?: number | null; container_list?: unknown }, docs: DocLite[]) {
  const missing = FACTORY_DOCS.filter(t => !docs.some(d => d.doc_type === t.key));
  const issues: Issue[] = [];
  const sets: { key: string; en: string; fr: string; vins: string[] }[] = [];
  for (const key of ["pi", "facture", "colisage", "coc"]) {
    const d = latestDoc(docs, key); if (!d) continue;
    const t = DOC_TYPES.find(x => x.key === key)!; const fr = t.fr.split(" (")[0];
    if (d.extracted?.error) { issues.push({ level: "warn", en: `${t.en}: could not be read automatically (${d.extracted.error}). NeoDrive will check it manually.`, fr: `${fr} : lecture automatique impossible (${d.extracted.error}), à vérifier à la main.` }); continue; }
    const vins = [...new Set((d.extracted?.vins || []).map(v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, "")))].filter(Boolean);
    const bad = vins.filter(v => !vinValid(v));
    if (bad.length) issues.push({ level: "error", en: `${t.en}: invalid VIN (wrong check digit or format): ${bad.join(", ")}`, fr: `${fr} : VIN invalide(s) (clé de contrôle ou format) : ${bad.join(", ")}` });
    // les VIN invalides sont déjà signalés : la comparaison entre documents se fait sur les VIN valides
    if (vins.length && key !== "pi") sets.push({ key, en: t.en, fr, vins: vins.filter(v => vinValid(v)) });
  }
  if (sets.length >= 2) {
    const all = [...new Set(sets.flatMap(s => s.vins))];
    for (const s of sets) { const miss = all.filter(v => !s.vins.includes(v)); if (miss.length) issues.push({ level: "error", en: `${s.en}: these VIN are in the other documents but missing here: ${miss.join(", ")}`, fr: `${s.fr} : VIN présents dans les autres documents mais absents ici : ${miss.join(", ")}` }); }
  }
  const pack = latestDoc(docs, "colisage");
  const packVins = sets.find(s => s.key === "colisage")?.vins.length || 0;
  if (pack?.extracted && !pack.extracted.error && !(pack.extracted.vins || []).length) issues.push({ level: "error", en: "Packing list: no VIN found. Please list the VIN of every vehicle, container by container.", fr: "Colisage : aucun VIN trouvé (VIN par conteneur demandés)." });
  if (ship.vehicles && packVins && packVins !== ship.vehicles) issues.push({ level: "error", en: `Packing list: ${packVins} VIN listed but the order is for ${ship.vehicles} vehicles.`, fr: `Le colisage liste ${packVins} VIN pour ${ship.vehicles} véhicules commandés.` });
  const inv = latestDoc(docs, "facture")?.extracted;
  if (inv && !inv.error) {
    const lines = (inv.lines || []).filter(l => num(l.amount) != null);
    const sum = lines.reduce((t, l) => t + Number(l.amount), 0); const total = num(inv.total);
    if (total != null && lines.length && Math.abs(sum - total) > 1) issues.push({ level: "error", en: `Commercial invoice: the lines add up to ${sum.toFixed(2)} but the total is ${total.toFixed(2)}.`, fr: `Facture : la somme des lignes (${sum.toFixed(2)}) ne correspond pas au total (${total.toFixed(2)}).` });
    for (const l of lines) { const q = num(l.qty), p = num(l.price); if (q != null && p != null && Math.abs(q * p - Number(l.amount)) > 1) issues.push({ level: "error", en: `Commercial invoice: line "${l.desc || "?"}": ${q} × ${p} ≠ ${l.amount}.`, fr: `Facture : ligne « ${l.desc || "?"} » : ${q} × ${p} ≠ ${l.amount}.` }); }
    const qty = num(inv.quantity);
    if (ship.vehicles && qty && qty !== ship.vehicles) issues.push({ level: "warn", en: `Commercial invoice: ${qty} vehicles invoiced, ${ship.vehicles} ordered.`, fr: `Facture : ${qty} véhicules facturés pour ${ship.vehicles} commandés.` });
    const pi = latestDoc(docs, "pi")?.extracted; const piTotal = num(pi?.total);
    if (pi && !pi.error && piTotal != null && total != null && Math.abs(piTotal - total) > 1) issues.push({ level: "warn", en: `Commercial invoice total (${total}) differs from the proforma invoice (${piTotal}). Please explain the difference.`, fr: `Total de la facture (${total}) différent de la proforma (${piTotal}).` });
  }
  const conts = Array.isArray(ship.container_list) ? ship.container_list.length : 0;
  const packConts = (pack?.extracted?.containers || []).filter(c => c?.no).length;
  if (conts && packConts && conts !== packConts) issues.push({ level: "warn", en: `Packing list shows ${packConts} container(s), we expect ${conts}.`, fr: `Le colisage indique ${packConts} conteneur(s), ${conts} attendu(s).` });
  const complete = !missing.length && !issues.some(i => i.level === "error");
  return { missing: missing.map(m => m.key as string), issues, complete };
}
