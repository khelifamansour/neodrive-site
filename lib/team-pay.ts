/**
 * Rémunération mensuelle des prestataires de l'équipe (closers) : calcul pur, partagé page / serveur.
 * Facturation par mois civil. Pendant la période garantie (du début du contrat à guarantee_until), le membre reçoit
 * le plus élevé de : minimum garanti au prorata des jours, ou fixe au prorata + primes de ces jours-là.
 * Ensuite : fixe au prorata des jours du mois + primes (vente / confirmation).
 */

/** Confirmation ferme d'une réservation (art. 7.3 du contrat closer) : les 3 réponses doivent être « oui ». */
export const CONFIRM_QUESTIONS = [
  { key: "modele_prix", q: "Le client confirme le modèle et le prix total ?", short: "modèle ou prix" },
  { key: "present_payeur", q: "Le client sera présent à la livraison et c'est bien lui qui paie ?", short: "présence ou payeur" },
  { key: "paiement_pret", q: "Le paiement est prêt (banque prévenue pour le virement) ?", short: "paiement" },
] as const;

export type PayTerms = { start_date: string; guarantee_eur: number; guarantee_until: string | null; fixed_eur: number; prime_vente_eur: number; prime_confirmation_eur: number };
export type PayItem = { reservation_id: number; kind: "vente" | "confirmation"; client: string; city: string; date: string; qty: number; carried?: boolean };
export type Adjustment = { label: string; amount: number; at?: string };
export type Line = { label: string; amount: number | null; kind: "base" | "prime" | "info" | "adjust" };
export type Statement = { month: string; from: string; to: string; days_in_month: number; lines: Line[]; items: PayItem[]; total: number; explain: string[]; guarantee: "applied" | "exceeded" | null };
export type InvoiceStatus = "brouillon" | "envoyee" | "payee";

export const STATUS_FR: Record<InvoiceStatus, string> = { brouillon: "Brouillon", envoyee: "Envoyée par la prestataire", payee: "Payée" };
export const INVOICE_DESCRIPTION = "Prestation de services – conseil commercial et service client à distance (contrat du 23/11/2026)";
export const VAT_MENTION = "TVA non applicable par le prestataire – prestation de services fournie à un preneur assujetti établi en France : TVA autoliquidée par le preneur (article 283-2 du CGI)";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const eur = (n: number) => `${r2(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const d = (s: string) => new Date(s + "T12:00:00Z");
const iso = (x: Date) => x.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(d(s).getTime() + n * 86400e3));
const daysBetween = (a: string, b: string) => Math.round((d(b).getTime() - d(a).getTime()) / 86400e3) + 1;
export const frDate = (s: string) => d(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const frShort = (s: string) => d(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
export const monthLabel = (m: string) => d(m + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
export const monthEnd = (m: string) => { const [y, mo] = m.split("-").map(Number); return iso(new Date(Date.UTC(y, mo, 0, 12))); };
export const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };
/** Paiement le 10 du mois qui suit la période. */
export const dueDate = (m: string) => `${nextMonth(m)}-10`;
export const parisDay = (t: string | Date = new Date()) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

export function cleanTerms(t: unknown): PayTerms | null {
  const x = (t && typeof t === "object" ? t : null) as Record<string, unknown> | null;
  if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.start_date || ""))) return null;
  const n = (v: unknown) => Math.max(0, Number(v) || 0);
  return { start_date: String(x.start_date), guarantee_eur: n(x.guarantee_eur), guarantee_until: /^\d{4}-\d{2}-\d{2}$/.test(String(x.guarantee_until || "")) ? String(x.guarantee_until) : null, fixed_eur: n(x.fixed_eur), prime_vente_eur: n(x.prime_vente_eur), prime_confirmation_eur: n(x.prime_confirmation_eur) };
}

/** Mois civils depuis le début du contrat jusqu'au mois `upTo` inclus (« YYYY-MM »). */
export function monthsSince(t: PayTerms, upTo: string) {
  const out: string[] = []; let m = t.start_date.slice(0, 7);
  while (m <= upTo && out.length < 120) { out.push(m); m = nextMonth(m); }
  return out;
}

const primeOf = (t: PayTerms, it: PayItem) => (it.kind === "vente" ? t.prime_vente_eur : t.prime_confirmation_eur) * Math.max(1, it.qty || 1);
const itemLabel = (it: PayItem) => `${it.kind === "vente" ? "Vente" : "Confirmation"} – ${it.client || "Client"}${it.city ? `, ${it.city}` : ""}, livrée le ${frDate(it.date)}${it.qty > 1 ? ` (${it.qty} véhicules)` : ""}${it.carried ? " (rattrapage : livrée et payée après la facture du mois)" : ""}`;

/** Relevé d'un mois civil. `items` = ventes et confirmations déjà attribuées à ce mois. */
export function computeMonth(t: PayTerms, month: string, items: PayItem[], adjustments: Adjustment[] = []): Statement | null {
  const first = `${month}-01`, last = monthEnd(month);
  const from = t.start_date > first ? t.start_date : first;
  if (from > last) return null;
  const N = daysBetween(first, last);
  const gu = t.guarantee_until;
  const gTo = gu && gu < last ? gu : last;
  const gDays = gu && gu >= from ? daysBetween(from, gTo) : 0;
  const rFrom = gu && gu >= from ? addDays(gu, 1) : from;
  const rDays = rFrom <= last ? daysBetween(rFrom, last) : 0;
  const eff = (it: PayItem) => (it.date >= first && it.date <= last ? it.date : first);
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.reservation_id - b.reservation_id);
  const gItems = gDays ? sorted.filter(it => gu && eff(it) <= gu) : [];
  const rItems = sorted.filter(it => !gItems.includes(it));
  const lines: Line[] = []; const explain: string[] = [];
  let guarantee: Statement["guarantee"] = null;
  const fixeTxt = (a: string, b: string, n: number) => `Fixe du ${frShort(a)} au ${frShort(b)} : ${eur(t.fixed_eur)} × ${n}/${N} jours`;

  if (gDays) {
    const guar = r2(t.guarantee_eur * gDays / N);
    const fixe = r2(t.fixed_eur * gDays / N);
    const primes = r2(gItems.reduce((a, it) => a + primeOf(t, it), 0));
    explain.push(`Période garantie du ${frDate(from)} au ${frDate(gTo)} (${gDays} jour${gDays > 1 ? "s" : ""} sur ${N}) : minimum garanti ${eur(t.guarantee_eur)} × ${gDays}/${N} = ${eur(guar)} ; calcul normal : fixe ${eur(t.fixed_eur)} × ${gDays}/${N} = ${eur(fixe)} + primes ${eur(primes)} = ${eur(fixe + primes)}.`);
    if (r2(fixe + primes) > guar) {
      guarantee = "exceeded";
      explain.push(`Le calcul normal (${eur(fixe + primes)}) dépasse le minimum garanti : c'est lui qui s'applique.`);
      lines.push({ label: fixeTxt(from, gTo, gDays), amount: fixe, kind: "base" });
      for (const it of gItems) lines.push({ label: itemLabel(it), amount: r2(primeOf(t, it)), kind: "prime" });
    } else {
      guarantee = "applied";
      explain.push(`Le minimum garanti (${eur(guar)}) est plus élevé : c'est lui qui s'applique${gItems.length ? ", les primes de cette période y sont comprises" : ""}.`);
      lines.push({ label: `Minimum garanti du ${frShort(from)} au ${frShort(gTo)} : ${eur(t.guarantee_eur)} × ${gDays}/${N} jours`, amount: guar, kind: "base" });
      for (const it of gItems) lines.push({ label: `${itemLabel(it)} – comprise dans le minimum garanti`, amount: null, kind: "info" });
    }
  }
  if (rDays) {
    const fixe = r2(t.fixed_eur * rDays / N);
    explain.push(`Du ${frDate(rFrom)} au ${frDate(last)} (${rDays} jour${rDays > 1 ? "s" : ""} sur ${N}) : fixe ${eur(t.fixed_eur)} × ${rDays}/${N} = ${eur(fixe)}, + ${eur(t.prime_vente_eur)} par vente et ${eur(t.prime_confirmation_eur)} par confirmation.`);
    lines.push({ label: rDays === N ? `Fixe mensuel` : fixeTxt(rFrom, last, rDays), amount: fixe, kind: "base" });
    for (const it of rItems) lines.push({ label: itemLabel(it), amount: r2(primeOf(t, it)), kind: "prime" });
  }
  for (const a of adjustments) lines.push({ label: `Ajustement : ${a.label}`, amount: r2(Number(a.amount) || 0), kind: "adjust" });
  const total = r2(lines.reduce((a, l) => a + (l.amount || 0), 0));
  return { month, from, to: last, days_in_month: N, lines, items: sorted, total, explain, guarantee };
}

/**
 * Attribue chaque vente / confirmation à un mois : celui de la livraison, sauf si ce mois est déjà envoyé ou payé
 * sans la contenir (livrée ou payée après coup) : elle passe alors au premier mois encore ouvert.
 */
export function assignItems(t: PayTerms, months: string[], items: PayItem[], frozen: Record<string, number[]>) {
  const inFrozen = new Set(Object.values(frozen).flat());
  const out: Record<string, PayItem[]> = Object.fromEntries(months.map(m => [m, []]));
  for (const it of items) {
    if (it.date < t.start_date) continue;
    let m = it.date.slice(0, 7);
    if (frozen[m]) {
      if (frozen[m].includes(it.reservation_id)) continue; // déjà dans le relevé figé de ce mois
      if (inFrozen.has(it.reservation_id)) continue;
      while (frozen[m]) m = nextMonth(m);
      it.carried = true;
    } else if (inFrozen.has(it.reservation_id)) continue;
    if (!out[m]) out[m] = [];
    out[m].push(it);
  }
  return out;
}

/** Dossier : champs obligatoires pour envoyer une facture. */
export type Profile = { full_name?: string | null; address?: string | null; ae_number?: string | null; email?: string | null; bank_holder?: string | null; bank_name?: string | null; iban?: string | null; rib?: string | null; bic?: string | null; docs?: Record<string, { path: string; filename?: string | null; uploaded_at: string }> | null };
export const DOSSIER_DOCS = [
  { id: "identite", label: "Carte d'identité ou passeport", hint: "Photo lisible (recto et verso) ou PDF." },
  { id: "domicile", label: "Justificatif de domicile", hint: "Facture, attestation de résidence… de moins de 3 mois." },
  { id: "rib", label: "RIB (relevé d'identité bancaire)", hint: "Du compte qui recevra vos virements en euros." },
] as const;
export function invoiceBlockers(p: Profile | null) {
  const out: string[] = [];
  if (!p?.full_name?.trim()) out.push("votre nom complet");
  if (!p?.address?.trim()) out.push("votre adresse postale");
  if (!p?.iban?.trim() && !(p?.rib?.trim() && p?.bic?.trim())) out.push("votre IBAN (ou votre RIB avec le code SWIFT/BIC)");
  return out;
}
