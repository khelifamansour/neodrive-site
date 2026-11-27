/**
 * Brevo (ex-Sendinblue) : envoi d'e-mails et de SMS pour NeoDrive.
 * Clé et expéditeur enregistrés sur /connexions (BREVO_API_KEY, BREVO_SENDER_EMAIL).
 */
import { createHmac } from "crypto";
import { normalizePhone } from "./crm-agent";
import { dataClient, readJson, writeJson } from "./datastore";

export const SITE = "https://www.easydrive-auto.fr";
export const OWNER_EMAIL = "khelifamansour@hotmail.fr";
export const brevoReady = () => Boolean(process.env.BREVO_API_KEY);
let senderOverride = "";
export const setSenderOverride = (e: string) => { senderOverride = e; };
const senderEmail = () => senderOverride || process.env.BREVO_SENDER_EMAIL || "contact.neodrivefrance@gmail.com";

async function brevo(path: string, body: unknown) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw Object.assign(new Error("Brevo n'est pas encore connecté (page /connexions)"), { fatal: true });
  const r = await fetch(`https://api.brevo.com/v3/${path}`, { method: "POST", headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.message || `Brevo ${r.status}`), { fatal: r.status === 401 || r.status === 403 });
  return j;
}

/** Pièce jointe Brevo : nom du fichier + contenu encodé en base64. */
export type EmailAttachment = { name: string; content: string };

export async function sendEmail(to: string, toName: string, subject: string, html: string, attachments?: EmailAttachment[], opts?: { cc?: string[]; replyTo?: string }) {
  const cc = (opts?.cc || []).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.toLowerCase() !== to.toLowerCase());
  const j = await brevo("smtp/email", { sender: { name: "NeoDrive", email: senderEmail() }, replyTo: { email: opts?.replyTo || process.env.BREVO_REPLY_TO || "contact.neodrivefrance@gmail.com", name: "NeoDrive" }, to: [{ email: to, ...(toName ? { name: toName } : {}) }], ...(cc.length ? { cc: cc.map(email => ({ email })) } : {}), subject, htmlContent: html, ...(attachments?.length ? { attachment: attachments } : {}) });
  return j?.messageId || null;
}

/** type « transactional » pour les codes d'accès et confirmations (envoyés à toute heure) ; « marketing » pour la prospection (bloquée le soir). */
export async function sendSms(phone: string, content: string, type: "marketing" | "transactional" = "marketing") {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Numéro invalide");
  if (to.replace(/\D/g, "").endsWith("676192234")) throw new Error("Numéro de Hana (NeoDrive) : pas de SMS");
  const j = await brevo("transactionalSMS/sms", { sender: "NeoDrive", recipient: to, content, type });
  return j?.messageId ? String(j.messageId) : null;
}

/** Lien de désinscription signé (sans compte client). */
export function unsubscribeUrl(leadId: number) {
  const sig = createHmac("sha256", process.env.CRON_SECRET || "neodrive").update(String(leadId)).digest("hex").slice(0, 20);
  return `${SITE}/api/crm/unsubscribe?id=${leadId}&s=${sig}`;
}
export function checkUnsubscribe(id: string, sig: string) {
  const good = createHmac("sha256", process.env.CRON_SECRET || "neodrive").update(String(Number(id))).digest("hex").slice(0, 20);
  return Boolean(id) && sig === good;
}

/** État des domaines d'envoi dans Brevo (lecture seule). */
export async function brevoDomains() {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch("https://api.brevo.com/v3/senders/domains", { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.domains || []).map((d: any) => ({ domain: d.domain_name, authenticated: d.authenticated, verified: d.verified }));
}

/** Plan et crédits restants (e-mails, SMS) du compte Brevo. */
export async function brevoAccount() {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.plan || []).map((p: any) => ({ type: p.type, credits: p.credits, creditsType: p.creditsType }));
}

/** Derniers événements d'envoi Brevo vers une adresse (livré, bloqué, rejeté…). */
export async function brevoEvents(email: string) {
  const key = process.env.BREVO_API_KEY; if (!key) return null;
  const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=15&sort=desc&email=${encodeURIComponent(email)}`, { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return (j?.events || []).map((e: any) => ({ date: e.date, event: e.event, reason: e.reason || null, from: e.from, subject: e.subject }));
}

/* ---------- Budget des e-mails marketing / en masse (quota Brevo) ----------
 * Règle du fondateur : les envois marketing ou en masse ne doivent JAMAIS épuiser le quota Brevo.
 * On garde toujours EMAIL_RESERVE e-mails (20 par défaut, variable BREVO_EMAIL_RESERVE) pour le travail :
 * bons de livraison, cartes grises (NK Services), copies, alertes internes. Ces e-mails unitaires ne passent PAS par ce budget.
 *
 * - Formule gratuite (type « free », creditsType « sendLimit ») : credits = e-mails restants aujourd'hui (300/jour)
 *   → budget marketing = max(0, credits − réserve), plafonné à MARKETING_DAILY_MAX (280 par défaut) moins le marketing déjà
 *   envoyé aujourd'hui (compteur interne, heure de Paris).
 * - Formule payante (tout autre type) : pas de limite quotidienne côté Brevo. Choix : on n'épuise jamais les crédits restants
 *   (credits − réserve) et on garde un plafond quotidien raisonnable pour la délivrabilité, MARKETING_DAILY_MAX
 *   (BREVO_MARKETING_DAILY_MAX, 280 par défaut ; 0 ou « illimité » = pas de plafond), compté par un compteur interne journalier
 *   (heure de Paris) enregistré dans le stockage privé (brevo/marketing-AAAA-MM-JJ.json).
 * - Lecture du crédit impossible (Brevo injoignable, clé absente, réponse inattendue) : prudence, budget 0 et erreur signalée.
 */
const envInt = (v: string | undefined, d: number) => { const n = Number(v); return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };
/** Nombre d'e-mails toujours gardés en réserve pour le transactionnel. */
export const EMAIL_RESERVE = envInt(process.env.BREVO_EMAIL_RESERVE, 20);
/** Plafond quotidien des e-mails marketing (null = illimité). */
export const MARKETING_DAILY_MAX: number | null = /^(0|illimit[ée]|unlimited)$/i.test(String(process.env.BREVO_MARKETING_DAILY_MAX || "").trim()) ? null : envInt(process.env.BREVO_MARKETING_DAILY_MAX, 280);
/** Seuil d'alerte au fondateur (crédit du jour restant). */
export const LOW_CREDIT_ALERT = envInt(process.env.BREVO_LOW_CREDIT_ALERT, 30);

export type MarketingBudget = {
  /** E-mails marketing encore autorisés maintenant. */
  allowed: number;
  /** Crédits e-mail restants chez Brevo (null si inconnu). */
  remaining: number | null;
  reserve: number;
  plan: string;
  mode: "gratuit-quotidien" | "payant" | "inconnu";
  /** Marketing déjà envoyé aujourd'hui (compteur interne, heure de Paris). */
  sentToday: number;
  dailyMax: number | null;
  error?: string;
};

const parisDay = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const counterPath = (day = parisDay()) => `brevo/marketing-${day}.json`;

async function readMarketingCounter(): Promise<number> {
  const sb = dataClient(); if (!sb) return 0;
  const j = await readJson<{ sent?: number }>(sb, counterPath()).catch(() => null);
  return Number(j?.sent) || 0;
}
async function addMarketingCounter(n: number, label: string) {
  if (n <= 0) return;
  const sb = dataClient(); if (!sb) return;
  const path = counterPath();
  const cur = await readJson<{ sent?: number; by?: Record<string, number> }>(sb, path).catch(() => null);
  const by = { ...(cur?.by || {}) }; by[label] = (by[label] || 0) + n;
  await writeJson(sb, path, { sent: (Number(cur?.sent) || 0) + n, by, updated_at: new Date().toISOString() }).catch(e => console.error("[BREVO-BUDGET] compteur", e));
}

/** Plan e-mail du compte (lève une erreur si la lecture échoue : à traiter avec prudence). */
async function readEmailPlan() {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("Brevo non connecté");
  const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`lecture du compte Brevo impossible (${r.status})`);
  const j = await r.json().catch(() => null);
  const plans = Array.isArray(j?.plan) ? j.plan : [];
  const p = plans.find((x: { type?: string }) => x?.type && x.type !== "sms");
  if (!p) throw new Error("plan e-mail Brevo introuvable");
  return { type: String(p.type), credits: typeof p.credits === "number" ? p.credits : Number.isFinite(Number(p.credits)) ? Number(p.credits) : null, creditsType: String(p.creditsType || "") };
}

/** Nombre d'e-mails marketing encore autorisés : max(0, crédits restants − réserve), voir les règles ci-dessus. */
export async function marketingEmailBudget(): Promise<MarketingBudget> {
  const base = { reserve: EMAIL_RESERVE, dailyMax: MARKETING_DAILY_MAX };
  let plan: Awaited<ReturnType<typeof readEmailPlan>>;
  try { plan = await readEmailPlan(); }
  catch (e) { const error = `Budget marketing à 0 par prudence : ${(e as Error).message}`; console.error("[BREVO-BUDGET]", error); return { ...base, allowed: 0, remaining: null, plan: "?", mode: "inconnu", sentToday: 0, error }; }
  const sentToday = await readMarketingCounter().catch(() => 0);
  const cap = MARKETING_DAILY_MAX === null ? Infinity : Math.max(0, MARKETING_DAILY_MAX - sentToday);
  const free = plan.type === "free" && plan.creditsType === "sendLimit";
  if (free && plan.credits === null) return { ...base, allowed: 0, remaining: null, plan: plan.type, mode: "inconnu", sentToday, error: "Budget marketing à 0 par prudence : crédit du jour illisible" };
  const fromCredits = plan.credits === null ? Infinity : Math.max(0, Math.floor(plan.credits) - EMAIL_RESERVE);
  const allowed = Math.min(fromCredits, cap);
  return { ...base, allowed: Number.isFinite(allowed) ? allowed : Number.MAX_SAFE_INTEGER, remaining: plan.credits, plan: plan.type, mode: free ? "gratuit-quotidien" : "payant", sentToday };
}

/** Alerte unitaire au fondateur (une fois par jour) quand le crédit du jour passe sous LOW_CREDIT_ALERT. Prise sur la réserve. */
export async function alertLowCredit(remaining: number | null, context = "") {
  if (remaining === null || remaining >= LOW_CREDIT_ALERT || !brevoReady()) return false;
  const sb = dataClient(); const day = parisDay(); const path = "brevo/low-credit-alert.json";
  if (sb) {
    const last = await readJson<{ day?: string }>(sb, path).catch(() => null);
    if (last?.day === day) return false;
    await writeJson(sb, path, { day, remaining, at: new Date().toISOString() }).catch(() => null);
  }
  console.warn("[BREVO-BUDGET] crédit bas", remaining, context);
  try {
    await sendEmail(OWNER_EMAIL, "Mansour", `Brevo : plus que ${remaining} e-mails disponibles aujourd'hui`, `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>Il ne reste que <b>${remaining}</b> e-mails sur le quota Brevo du jour.</p><p>Les envois marketing et groupés sont arrêtés automatiquement : ${EMAIL_RESERVE} e-mails restent réservés au travail (bons de livraison, cartes grises, copies, alertes). Les envois reportés repartiront demain, sans doublon.</p>${context ? `<p style="color:#555">${context.replace(/</g, "&lt;")}</p>` : ""}</div>`);
    return true;
  } catch (e) { console.error("[BREVO-BUDGET] alerte", e); return false; }
}

/**
 * Garde-fou à utiliser dans toute boucle d'envoi marketing : `if (!(await gate.take())) { reporté; continue; }` avant chaque e-mail.
 * Le crédit est lu au premier take() (aucun appel si rien à envoyer) puis relu tous les 20 envois (ne peut que baisser).
 * finish() enregistre le compteur du jour, alerte le fondateur si besoin et renvoie le résumé à mettre dans la réponse JSON.
 */
export function marketingEmailGate(label: string) {
  let budget: MarketingBudget | null = null; let initial = 0; let left = 0; let sent = 0; let refused = 0; let finished = false; let after: number | null = null;
  const refresh = async () => { const b = await marketingEmailBudget(); if (!budget) { budget = b; initial = left = b.allowed; } else { budget = b; left = Math.min(left, b.allowed); } };
  return {
    async take(): Promise<boolean> {
      if (!budget) await refresh();
      if (left <= 0) { refused++; return false; }
      left--; sent++;
      if (sent % 20 === 0) await refresh();
      return true;
    },
    /** Rend une place prise par take() quand l'envoi a échoué avant d'atteindre Brevo (ne consomme pas le quota). */
    giveBack() { if (sent > 0) { sent--; left++; } },
    get budget() { return budget; },
    async finish(deferred = refused) {
      if (!finished) {
        finished = true;
        await addMarketingCounter(sent, label);
        if (budget && budget.remaining !== null && (sent || refused)) {
          after = await readEmailPlan().then(p => p.credits).catch(() => null);
          await alertLowCredit(after ?? Math.max(0, budget.remaining - sent), `Dernier envoi : ${label} (${sent} envoyé${sent > 1 ? "s" : ""}, ${deferred} reporté${deferred > 1 ? "s" : ""}).`);
        }
      }
      const b = budget as MarketingBudget | null;
      return { sent, deferred, budget: b ? initial : null, remainingBefore: b ? b.remaining : null, remainingAfter: after, reserve: EMAIL_RESERVE, plan: b ? b.plan : null, mode: b ? b.mode : null, ...(b?.error ? { error: b.error } : {}) };
    },
  };
}
export type MarketingGate = ReturnType<typeof marketingEmailGate>;
