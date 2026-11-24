/**
 * Paiements clients automatiques : chaque encaissement Revolut (montant > 0) pas encore relié est comparé aux réservations
 * (montant = total, solde, montant dû ou acompte ; nom du payeur ; référence RES-… ou n° de facture FA-…).
 * Une seule correspondance forte → paiement relié et confirmé automatiquement, e-mail au fondateur.
 * Sinon → « à vérifier » (le fondateur choisit la bonne réservation ou rejette). Serveur uniquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { OWNER_EMAIL, SITE, brevoReady, sendEmail } from "./brevo";
import { applyStoredSecrets } from "./integrations";
import { eurFr } from "./stock-shared";

type DB = SupabaseClient;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export type PayTx = { id: number; date: string; label: string | null; amount: number; counterparty: string | null; reference: string | null; reservation_id: number | null; match_kind: string | null; category: string | null; parts_order: string | null; invoice_id: number | null };
export type PayRes = { id: number; prenom: string | null; nom: string | null; telephone?: string | null; total: number | null; acompte: number | null; montant_du: number | null; statut: string | null; paiement_confirme_at: string | null; paiement_en_attente: boolean | null; created_at: string; livre_at: string | null; date_promise?: string | null; modele?: string | null };
export type PayKind = "paiement" | "acompte" | "solde";
export type PayCandidate = { reservation_id: number; score: number; why: string; kind: PayKind; client: string; total: number | null };

/** Colonnes ajoutées par supabase/sql/2026-11-24-paiements-auto.sql. */
export const PAY_TX = "id,date,label,amount,counterparty,reference,reservation_id,match_kind,category,parts_order,invoice_id";
const RES_COLS = "id,prenom,nom,telephone,total,acompte,montant_du,statut,paiement_confirme_at,paiement_en_attente,created_at,livre_at,date_promise,modele";
/** Encaissements plus anciens ignorés : pas de confirmation (ni d'e-mail) sur l'historique. */
export const LOOKBACK_DAYS = 60;
const STRONG = 80, REVIEW = 35, GAP = 25, MIN_AMOUNT = 50;

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["madame", "monsieur", "mme", "mr", "mlle", "mademoiselle", "money", "added", "from", "to", "de", "du", "des", "la", "le", "les", "et", "vir", "virement", "sepa", "inst", "instantane", "recu", "paiement", "payment", "transfer", "facture", "vehicule", "voiture", "neodrive", "reservation", "res", "pour", "solde", "acompte", "achat", "card", "carte", "ref", "reference", "mk", "holding", "sas", "sarl"]);
const tokens = (s: unknown) => norm(s).split(" ").filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
/** Distance d'édition ≤ 1 (une lettre en plus, en moins ou différente). */
function near1(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}
export const clientName = (r: { prenom?: string | null; nom?: string | null }) => `${r.prenom || ""} ${r.nom || ""}`.trim() || "Client";

/** Nom du payeur lu dans le libellé : « Money added from MADAME HELENE BENOIST-ROUX • Benoist vehicule », « From … », « Virement de … ». */
export function payerOf(t: { label: string | null; counterparty: string | null }) {
  if (t.counterparty) return t.counterparty;
  const m = String(t.label || "").match(/(?:money added from|payment from|transfer from|virement de|vir(?:ement)?\s+(?:sepa\s+)?(?:inst\s+)?(?:recu\s+)?de|from|to)\s+(.+?)(?:\s*[•|·]\s*|\s+-\s+|$)/i);
  return m ? m[1].trim() : "";
}

/** Candidats pour un encaissement, du plus probable au moins probable. paid = somme déjà reliée par réservation. */
export function scoreCredit(t: PayTx, res: PayRes[], paid: Map<number, number>, invoiceRes: Map<string, number>): PayCandidate[] {
  const text = `${t.label || ""} ${t.reference || ""} ${t.counterparty || ""}`;
  const hayTok = new Set(tokens(text));
  const payerTok = new Set(tokens(payerOf(t)));
  const compact = norm(text).replace(/ /g, "");
  const amt = Number(t.amount);
  // Références : RES-2026-000123, RES-123, « réservation n° 123 », facture FA-2026-0012.
  const refIds = new Set<number>();
  for (const m of text.matchAll(/\bRES[-\s]?(?:\d{4}[-\s])?0*(\d{1,6})\b/gi)) refIds.add(Number(m[1]));
  for (const m of text.matchAll(/r[ée]servation\s*(?:n°|no|#)?\s*(\d{1,6})/gi)) refIds.add(Number(m[1]));
  for (const m of text.toUpperCase().matchAll(/FA-\d{4}-\d{4}/g)) { const r = invoiceRes.get(m[0]); if (r) refIds.add(r); }
  // « FACTURE 2026 1123 02 » : année + MMJJ (jour de la réservation / du devis) + numéro.
  const dayRef = text.match(/\b(20\d{2})[\s-]?(\d{2})(\d{2})[\s-]?\d{1,3}\b/);
  const refDay = dayRef ? `${dayRef[1]}-${dayRef[2]}-${dayRef[3]}` : "";
  const tol = (v: number) => Math.max(2, v * 0.003);
  const close = (v: unknown) => v != null && Number(v) > 0 && Math.abs(Number(v) - amt) <= tol(Number(v));
  const sameAmountCount = res.filter(r => close(r.total) || close(r.montant_du) || close(r.acompte)).length;
  const out: PayCandidate[] = [];
  for (const r of res) {
    if (r.statut === "Annulée") continue;
    let score = 0; const why: string[] = []; let kind: PayKind = "paiement";
    if (refIds.has(r.id)) { score += 60; why.push(`référence réservation n° ${r.id}`); }
    if (refDay && String(r.created_at || "").slice(0, 10) === refDay) { score += 10; why.push("date de la référence"); }
    // Nom : nom de famille (tous ses morceaux), prénom, ou nom à une lettre près.
    const nomTok = tokens(r.nom), preTok = tokens(r.prenom);
    const has = (x: string) => hayTok.has(x) || payerTok.has(x);
    const fuzzy = (x: string) => x.length >= 5 && [...hayTok].some(h => h.length >= 5 && near1(h, x));
    const nomCompact = norm(r.nom).replace(/ /g, "");
    if (nomTok.length && (nomTok.every(has) || (nomCompact.length >= 5 && compact.includes(nomCompact)))) { score += 40; why.push("nom"); }
    else if (nomTok.some(x => x.length >= 4 && has(x))) { score += 25; why.push("nom (en partie)"); }
    else if (nomTok.some(fuzzy)) { score += 15; why.push("nom proche"); }
    if (preTok.some(has)) { score += 15; why.push("prénom"); }
    // Montant : total, solde après acompte, montant dû, acompte ; ou complète les paiements déjà reliés.
    const total = Number(r.total) || 0, ac = Number(r.acompte) || 0, already = paid.get(r.id) || 0;
    if (close(total) && !already) { score += 35; why.push("montant = total"); }
    else if (close(r.montant_du)) { score += 35; why.push("montant = reste dû"); kind = "solde"; }
    else if (already && total && close(total - already)) { score += 35; why.push("montant = solde (après paiement déjà reçu)"); kind = "solde"; }
    else if (ac && total > ac && close(total - ac)) { score += 30; why.push("montant = total − acompte"); kind = "solde"; }
    else if (close(ac)) { score += 30; why.push("montant = acompte"); kind = "acompte"; }
    else if (total && amt < total && amt >= Math.min(300, total * 0.1) && score >= 40) { score += 5; why.push("acompte possible"); kind = "acompte"; }
    if (why.some(w => w.startsWith("montant")) && sameAmountCount === 1) { score += 10; why.push("seul dossier à ce montant"); }
    // Déjà relié par le rapprochement comptable (n° de facture / nom).
    if (t.reservation_id === r.id) { score += 10; why.push("déjà rapproché en comptabilité"); }
    // Date : réservation créée après l'encaissement (+ 3 jours) = peu probable ; déjà payée = doute.
    if (r.created_at && new Date(r.created_at).getTime() > new Date(t.date).getTime() + 3 * 86400000) score -= 30;
    if (r.paiement_confirme_at && kind !== "solde") { score -= 30; why.push("déjà marquée payée"); }
    if (score >= REVIEW - 10) out.push({ reservation_id: r.id, score, why: why.join(" + "), kind, client: clientName(r), total: r.total });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

/** Décision : relier seulement s'il y a un seul candidat fort, nettement devant les autres, avec montant ET (nom OU référence). */
export function decide(c: PayCandidate[]): { link: PayCandidate | null; review: PayCandidate[] } {
  const top = c[0];
  if (!top || top.score < REVIEW) return { link: null, review: [] };
  const amountOk = /montant/.test(top.why), idOk = /nom|référence/.test(top.why);
  const alone = !c[1] || c[1].score <= top.score - GAP;
  if (top.score >= STRONG && amountOk && idOk && alone && !/déjà marquée payée/.test(top.why)) return { link: top, review: [] };
  return { link: null, review: c.filter(x => x.score >= REVIEW - 10).slice(0, 3) };
}

const appendNote = (old: string | null | undefined, line: string) => [old, line].filter(Boolean).join("\n");
const dayFr = () => new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

/**
 * Relie l'encaissement à la réservation. Paiement complet (total atteint, solde ou montant dû) → paiement confirmé,
 * plus de « paiement en attente ». Acompte → simple note. Rejouable : ne confirme pas deux fois.
 */
export async function linkPayment(db: DB, txId: number, resId: number, o: { by: "auto" | "manuel"; why?: string; kind?: PayKind; email?: boolean }) {
  const at = new Date().toISOString();
  const [{ data: t }, { data: r }] = await Promise.all([
    db.from("bank_transactions").select(PAY_TX).eq("id", txId).maybeSingle(),
    db.from("reservations").select(`${RES_COLS},notes`).eq("id", resId).maybeSingle(),
  ]);
  if (!t || Number(t.amount) <= 0) throw new Error("Encaissement introuvable");
  if (!r) throw new Error("Réservation introuvable");
  const amount = Number(t.amount);
  const { data: others } = await db.from("bank_transactions").select("id,amount").eq("reservation_id", resId).eq("pay_match_status", "lié").neq("id", txId);
  const paidBefore = (others || []).reduce((s, x) => s + Number(x.amount), 0);
  const total = Number(r.total) || 0;
  // Payé en entier : solde reconnu, total atteint, ou réservation sans total (sauf acompte reconnu).
  const full = o.kind === "solde" || (total > 0 ? paidBefore + amount >= total - Math.max(2, total * 0.003) : o.kind !== "acompte");
  const kind: PayKind = full ? (paidBefore ? "solde" : "paiement") : "acompte";
  const how = o.by === "auto" ? `rapproché automatiquement${o.why ? ` (${o.why})` : ""}` : "confirmé à la main par le fondateur";
  const label = `${t.date} · ${eurFr(amount)} · ${String(t.label || t.counterparty || "").slice(0, 80)}`;
  const { error: e1 } = await db.from("bank_transactions").update({
    reservation_id: resId, category: "vente voiture", match_kind: t.match_kind === "manuel" || o.by === "manuel" ? "manuel" : "auto",
    pay_match_status: "lié", pay_candidates: null, pay_linked_at: at, pay_checked_at: o.by === "manuel" ? at : null,
    note: `${kind === "acompte" ? "Acompte" : "Paiement"} de ${clientName(r)} (réservation n° ${resId}) ${how}`.slice(0, 1000), updated_at: at,
  }).eq("id", txId);
  if (e1) throw new Error(e1.message);
  const line = `[${dayFr()}] ${kind === "acompte" ? "Acompte reçu" : kind === "solde" ? "Solde reçu" : "Paiement reçu"} sur Revolut : ${label} – ${how}.${kind === "acompte" ? ` Reste à payer : ${eurFr(Math.max(0, total - paidBefore - amount))}.` : ""}`;
  const patch: Row = { notes: appendNote(r.notes, line), updated_at: at, bank_transaction_id: txId };
  const wasPaid = !!r.paiement_confirme_at;
  if (full) {
    if (!r.paiement_confirme_at) patch.paiement_confirme_at = at;
    patch.paiement_en_attente = false;
    if (r.livre_at && r.paiement_en_attente) patch.statut = "Livrée";
  }
  let { error: e2 } = await db.from("reservations").update(patch).eq("id", resId);
  if (e2 && /bank_transaction_id/.test(e2.message)) { delete patch.bank_transaction_id; ({ error: e2 } = await db.from("reservations").update(patch).eq("id", resId)); }
  if (e2) throw new Error(e2.message);
  let emailed = false;
  if (o.email !== false) {
    try {
      await applyStoredSecrets();
      if (brevoReady()) {
        const client = clientName(r);
        const subject = `✅ ${kind === "acompte" ? "Acompte reçu" : "Paiement reçu"} : ${client} – ${eurFr(amount)}`;
        const html = `<p><b>${esc(client)}</b> (réservation n° ${resId}${r.modele ? `, ${esc(r.modele)}` : ""}) : ${kind === "acompte" ? "acompte" : kind === "solde" ? "solde" : "paiement"} de <b>${eurFr(amount)}</b> reçu sur Revolut le ${esc(t.date)}.</p>
<p>Libellé : ${esc(t.label || t.counterparty || "—")}</p><p>${esc(how)}.</p>
${full ? `<p>${wasPaid ? "La réservation était déjà marquée payée." : "✅ La réservation est maintenant marquée <b>payée</b> : le livreur peut remettre la voiture."}${r.livre_at && r.paiement_en_attente ? " Voiture déjà livrée : clés et papiers à remettre ou envoyer, accusé final à faire signer." : ""}</p>` : `<p>Reste à payer : <b>${eurFr(Math.max(0, total - paidBefore - amount))}</b>.</p>`}
<p>Une erreur ? <a href="${SITE}/tableau-de-bord">Tableau de bord</a> · <a href="${SITE}/reservations-admin">Réservations</a></p>`;
        await sendEmail(OWNER_EMAIL, "Mansour", subject, html);
        emailed = true;
      }
    } catch (e) { console.error("[PAIEMENTS] e-mail", e); }
  }
  return { kind, full, emailed };
}

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Encaissement écarté par le fondateur (pas un paiement client, ou aucune réservation). */
export async function rejectPayment(db: DB, txId: number) {
  const at = new Date().toISOString();
  const { error } = await db.from("bank_transactions").update({ pay_match_status: "rejeté", pay_checked_at: at, updated_at: at }).eq("id", txId);
  if (error) throw new Error(error.message);
}

/** Le script SQL des paiements automatiques a-t-il été passé ? */
export async function payMatchReady(db: DB) {
  const { error } = await db.from("bank_transactions").select("id,pay_match_status").limit(1);
  return !error;
}

/**
 * Passe sur les encaissements récents non traités. Jamais ceux réglés à la main en comptabilité (sauf « vente voiture »),
 * ni les commandes de pièces, ni les virements ignorés. maxEmails : garde-fou si beaucoup de paiements arrivent d'un coup.
 */
export async function runPaymentMatch(db: DB, o: { maxEmails?: number; days?: number } = {}) {
  if (!await payMatchReady(db)) return { ok: false as const, error: "Script SQL 2026-11-24-paiements-auto.sql à passer dans Supabase", scanned: 0, linked: [] as Row[], review: 0 };
  const since = new Date(Date.now() - (o.days ?? LOOKBACK_DAYS) * 86400000).toISOString().slice(0, 10);
  const [{ data: txs, error }, { data: res }, { data: inv }, { data: linked }] = await Promise.all([
    db.from("bank_transactions").select(PAY_TX).gt("amount", MIN_AMOUNT).eq("ignored", false).is("pay_match_status", null).is("parts_order", null).gte("date", since).order("date").limit(500),
    db.from("reservations").select(RES_COLS).neq("statut", "Annulée").order("id", { ascending: false }).limit(3000),
    db.from("sales_invoices").select("number,reservation_id").not("number", "is", null).not("reservation_id", "is", null).limit(5000),
    db.from("bank_transactions").select("reservation_id,amount").eq("pay_match_status", "lié").not("reservation_id", "is", null).limit(5000),
  ]);
  if (error) throw new Error(error.message);
  const invoiceRes = new Map<string, number>(((inv || []) as Row[]).map(i => [String(i.number), Number(i.reservation_id)]));
  const paid = new Map<number, number>();
  for (const l of (linked || []) as Row[]) paid.set(Number(l.reservation_id), (paid.get(Number(l.reservation_id)) || 0) + Number(l.amount));
  const out: Row[] = []; let review = 0; let emails = 0; const maxEmails = o.maxEmails ?? 10;
  const todo = ((txs || []) as PayTx[]).filter(t => !t.match_kind || (t.category === "vente voiture" && !t.parts_order));
  for (const t of todo) {
    const cands = scoreCredit(t, (res || []) as PayRes[], paid, invoiceRes);
    const { link, review: rv } = decide(cands);
    if (link) {
      try {
        const r = await linkPayment(db, t.id, link.reservation_id, { by: "auto", why: link.why, kind: link.kind, email: emails < maxEmails });
        if (r.emailed) emails++;
        paid.set(link.reservation_id, (paid.get(link.reservation_id) || 0) + Number(t.amount));
        out.push({ tx_id: t.id, reservation_id: link.reservation_id, client: link.client, amount: Number(t.amount), kind: r.kind });
      } catch (e) { console.error("[PAIEMENTS] lien", t.id, e); }
    } else if (rv.length) {
      await db.from("bank_transactions").update({ pay_match_status: "à vérifier", pay_candidates: rv, updated_at: new Date().toISOString() }).eq("id", t.id);
      review++;
    }
    // Aucun candidat : laissé tel quel, revu au prochain passage (une réservation peut être saisie plus tard).
  }
  return { ok: true as const, scanned: todo.length, linked: out, review };
}

/** Encaissements « à vérifier », avec les réservations proposées. */
export async function reviewList(db: DB) {
  const { data, error } = await db.from("bank_transactions").select(`${PAY_TX},pay_candidates`).eq("pay_match_status", "à vérifier").order("date", { ascending: false }).limit(50);
  if (error) return [];
  const ids = [...new Set(((data || []) as Row[]).flatMap(t => ((t.pay_candidates || []) as PayCandidate[]).map(c => c.reservation_id)))];
  const { data: res } = ids.length ? await db.from("reservations").select(RES_COLS).in("id", ids) : { data: [] };
  const byId = new Map(((res || []) as PayRes[]).map(r => [r.id, r]));
  return ((data || []) as Row[]).map(t => ({
    id: t.id, date: t.date, amount: Number(t.amount), label: t.label, counterparty: t.counterparty, reference: t.reference, payer: payerOf(t as PayTx),
    candidates: ((t.pay_candidates || []) as PayCandidate[]).map(c => { const r = byId.get(c.reservation_id); return { ...c, client: r ? clientName(r) : c.client, total: r?.total ?? c.total, statut: r?.statut || null, paid: !!r?.paiement_confirme_at, modele: r?.modele || null, date_promise: r?.date_promise || null }; }),
  }));
}
