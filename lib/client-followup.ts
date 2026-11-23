/**
 * Clients et avis : envoi direct depuis le serveur (SMS + e-mail via Brevo) et suivi automatique ~10 jours après livraison.
 * Serveur uniquement. Les réponses des clients arrivent sur WhatsApp (Hana) ou par e-mail (réponse au fondateur).
 */
import { crmDatabase } from "./crm-agent";
import { brevoReady, OWNER_EMAIL, sendEmail, sendSms, SITE } from "./brevo";
import { applyStoredSecrets } from "./integrations";
import { messageFor, normalizePhone, type Customer, type HistoryItem, type TemplateKey } from "./clients";

type DB = ReturnType<typeof crmDatabase>;
const TABLE = "customers_followup";
const DAY = 86_400_000;
export const HANA_WA = "wa.me/33676192234";
export const GUIDE_URL = `${SITE}/guide-batterie`;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const validEmail = (e: string | null | undefined) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);

/* ---------- Texte SMS : caractères GSM-7 uniquement ---------- */

const GSM_KEEP = new Set("éèàùÉ€£\n");
const GSM_MAP: Record<string, string> = { "\u2019": "'", "\u2018": "'", "`": "'", "\u201c": '"', "\u201d": '"', "\u00ab": '"', "\u00bb": '"', "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00a0": " ", "\u202f": " ", "\u0153": "oe", "\u0152": "OE", "\u00e7": "c", "\u00c7": "C" };
/** Convertit un texte en caractères GSM-7 (é è à ù gardés ; ê â î ô û ç et emojis remplacés ou retirés). */
export function toGsm(text: string): string {
  let out = "";
  const src = text.replace(/(^|[^\p{L}])([çÇ])a(?![\p{L}])/gu, (_, b, c) => b + (c === "Ç" ? "Cela" : "cela"));
  for (const ch of src) {
    if (GSM_KEEP.has(ch) || (ch >= " " && ch <= "~" && ch !== "`")) { out += ch; continue; }
    if (GSM_MAP[ch] !== undefined) { out += GSM_MAP[ch]; continue; }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (base && [...base].every(c => c >= " " && c <= "~")) out += base;
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/ +([.,!?])/g, (m, p) => (p === "!" || p === "?" ? " " + p : p)).trim();
}

/** Prénom propre : « thibaut » / « ROBERTO » → « Thibaut » / « Roberto ». */
export function prettyFirst(first: string | null | undefined): string {
  const f = String(first || "").trim();
  if (!f) return "";
  if (f === f.toLowerCase() || f === f.toUpperCase()) return f.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, s, l) => s + l.toUpperCase());
  return f;
}

/* ---------- Messages ---------- */

export type SendKind = TemplateKey | "suivi";

/**
 * Message « prendre des nouvelles » (suivi automatique ~10 jours après livraison ET bouton d'envoi direct de /clients et /avis).
 * Signé « L'équipe NeoDrive ». Réponse demandée sur WhatsApp : les réponses aux SMS « NeoDrive » ne sont pas reçues.
 * SMS en caractères GSM-7 (« cela » au lieu de « ça »).
 */
export function suiviText(first: string, channel: "sms" | "email"): string {
  const f = prettyFirst(first);
  const t = `Bonjour${f ? " " + f : ""}, c'est NeoDrive. Nous vous contactons pour savoir comment ${channel === "sms" ? "cela" : "ça"} se passe avec votre véhicule. Tout va bien ? Répondez-nous simplement sur WhatsApp (${HANA_WA}) : notre équipe vous répond rapidement.\nL'équipe NeoDrive`;
  return channel === "sms" ? toGsm(t) : t;
}

/** Texte d'un envoi manuel : modèle (ou texte modifié dans /clients), avec invitation à répondre sur WhatsApp pour « prendre des nouvelles ». */
export function manualText(kind: TemplateKey, c: Pick<Customer, "first_name" | "model">, custom?: string): string {
  const base = (custom && custom.trim()) || messageFor(kind, { ...c, first_name: prettyFirst(c.first_name) });
  if (kind === "nouvelles" && !/wa\.me\//.test(base)) return `${base} Répondez-nous simplement sur WhatsApp : ${HANA_WA}`;
  return base;
}

const linkify = (s: string) => esc(s).replace(/(https?:\/\/[^\s<)]+|wa\.me\/\d+)/g, u => { const href = u.startsWith("http") ? u : `https://${u}`; return `<a href="${href}" style="color:#f05a28;font-weight:700">${u}</a>`; });
const GUIDE_BOX = `<p style="background:#fff1ea;border:1px solid #f8c9b4;border-radius:10px;padding:10px 12px"><b>🔋 Rappel : le guide batterie.</b> Pour garder des batteries en pleine forme (recharge, temps de charge, stockage) : <a href="${GUIDE_URL}" style="color:#f05a28;font-weight:700">${GUIDE_URL}</a></p>`;
const SAV_LINE = `<p style="font-size:14px;color:#555">Un souci avec votre véhicule ? Décrivez-le ici, avec une photo ou une vidéo, un technicien vous répond : <a href="${SITE}/sav" style="color:#f05a28">${SITE}/sav</a></p>`;

export function emailHtml(kind: SendKind, text: string): string {
  const lines = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const sign = lines.length > 1 && /^L'équipe NeoDrive$/i.test(lines[lines.length - 1]) ? lines.pop() : "L'équipe NeoDrive";
  const extra = kind === "avis" ? "" : GUIDE_BOX + SAV_LINE;
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px">${lines.map(p => `<p>${linkify(p)}</p>`).join("")}${extra}<p>${esc(sign)}</p></div>`;
}
export const emailSubject = (kind: SendKind) => kind === "avis" ? "Votre avis compte beaucoup pour nous" : kind === "suivi" ? "Comment ça se passe avec votre NeoDrive ?" : "Des nouvelles de votre NeoDrive";

/* ---------- Envoi ---------- */

export async function optedOutPhones(db: DB): Promise<Set<string>> {
  const { data } = await db.from("leads").select("telephone").not("opted_out_at", "is", null).limit(5000);
  return new Set((data || []).map((l: { telephone: string | null }) => last9(l.telephone)).filter(k => k.length === 9));
}

/** Dernier envoi direct du même type dans les dernières 24 h (anti double envoi). */
export function recentSend(c: Customer, kind: SendKind, now = Date.now()): HistoryItem | null {
  const label = kind === "avis" ? "avis" : "nouvelles";
  return [...(c.history || [])].reverse().find(h => h.kind && (h.kind === kind || (label === "nouvelles" && h.kind === "suivi") || (kind === "suivi" && h.kind === "nouvelles")) && now - new Date(h.at).getTime() < DAY) || null;
}

export type SendResult = { ok: boolean; sms: boolean; email: boolean; error?: string; customer?: Customer };

/**
 * Envoie un message à un client (SMS si numéro valide, e-mail si adresse) et l'enregistre dans son historique.
 * Refuse : « ne pas contacter », client désinscrit (STOP), demande d'avis pendant un problème, même envoi dans les 24 h.
 */
export async function sendToCustomer(db: DB, c: Customer, kind: SendKind, opts: { by: string; text?: string; optedOut?: Set<string> }): Promise<SendResult> {
  const no = (error: string): SendResult => ({ ok: false, sms: false, email: false, error });
  if (c.status === "ne pas contacter") return no("Ce client est marqué « Ne pas contacter ».");
  if (kind === "avis" && c.status === "problème en cours") return no("Un problème est en cours : réglez-le d'abord, puis demandez l'avis.");
  const out = opts.optedOut || await optedOutPhones(db);
  if (c.phone && out.has(last9(c.phone))) return no("Ce client a demandé à ne plus recevoir de messages (STOP).");
  const recent = recentSend(c, kind);
  if (recent) return no(`Déjà envoyé le ${new Date(recent.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} : on attend 24 h avant de renvoyer le même message.`);
  const ph = normalizePhone(c.phone);
  const mail = validEmail(c.email) ? String(c.email).trim() : "";
  if (!ph.valid && !mail) return no("Ni numéro valide ni e-mail : corrigez la fiche.");
  await applyStoredSecrets();
  if (!brevoReady()) return no("L'envoi de SMS et d'e-mails (Brevo) n'est pas connecté : page /connexions.");

  const emailText = kind === "suivi" || (kind === "nouvelles" && !opts.text?.trim()) ? suiviText(c.first_name, "email") : manualText(kind, c, opts.text);
  const smsText = kind === "suivi" || (kind === "nouvelles" && !opts.text?.trim()) ? suiviText(c.first_name, "sms") : toGsm(emailText);
  let sms = false, email = false; const errors: string[] = [];
  if (ph.valid) { try { sms = !!(await sendSms("+" + ph.intl, smsText.slice(0, 600), "transactional")) || true; } catch (e) { errors.push("SMS : " + (e as Error).message); } }
  if (mail) { try { email = !!(await sendEmail(mail, `${prettyFirst(c.first_name)} ${c.last_name || ""}`.trim(), emailSubject(kind), emailHtml(kind, emailText), undefined, { replyTo: OWNER_EMAIL })) || true; } catch (e) { errors.push("E-mail : " + (e as Error).message); } }
  if (!sms && !email) return no(errors.join(" · ") || "Envoi impossible.");

  const now = new Date().toISOString();
  const channel = sms && email ? "sms+email" : sms ? "sms" : "email";
  const action = (kind === "suivi" ? "Suivi après livraison envoyé automatiquement" : kind === "avis" ? "Demande d'avis envoyée" : "Prise de nouvelles envoyée") + (errors.length ? ` (${errors.join(" · ")})` : "");
  const patch: Record<string, unknown> = { last_contact_at: now, last_sent_at: now, updated_at: now };
  if (kind === "avis") { if (c.status !== "avis laissé") patch.status = "avis demandé"; }
  else if (["à contacter", "nouvelles demandées"].includes(c.status)) patch.status = "nouvelles demandées";
  if (kind === "suivi") { patch.followup_auto = "envoyé"; patch.followup_auto_at = now; }
  else if (!c.followup_auto) { patch.followup_auto = "manuel"; patch.followup_auto_at = now; }
  const history = [...(c.history || []), { at: now, action, channel, kind, text: sms ? smsText : emailText, by: opts.by }];
  const { data, error } = await db.from(TABLE).update({ ...patch, history }).eq("id", c.id).select("*").single();
  if (error) return { ok: true, sms, email, error: "Envoyé, mais l'historique n'a pas pu être enregistré : " + error.message };
  return { ok: true, sms, email, customer: data as Customer };
}

/** Retrouve (9 derniers chiffres du téléphone, puis e-mail) ou crée la fiche /clients d'un client livré venu d'une autre liste (/avis). */
export async function ensureCustomer(db: DB, p: { name: string; phone?: string | null; email?: string | null; city?: string | null; delivered_at?: string | null; source: string; by: string }): Promise<Customer | null> {
  const k = last9(p.phone); const mail = validEmail(p.email) ? String(p.email).trim().toLowerCase() : null;
  const { data: rows } = await db.from(TABLE).select("*").limit(5000);
  const found = ((rows || []) as Customer[]).find(c => (k.length === 9 && last9(c.phone) === k) || (mail && String(c.email || "").toLowerCase() === mail));
  if (found) return found;
  const parts = String(p.name || "").trim().split(/\s+/).filter(Boolean);
  const now = new Date().toISOString();
  const day = p.delivered_at ? parisDay(p.delivered_at) : null;
  const { data } = await db.from(TABLE).insert({ first_name: prettyFirst(parts[0] || ""), last_name: parts.slice(1).join(" "), phone: p.phone || null, email: mail, city: p.city || null, delivered_at: day, source: p.source, status: "à contacter", followup_auto: "manuel", followup_auto_at: now, history: [{ at: now, action: "Client ajouté depuis l'espace NeoDrive (/avis)", by: p.by }] }).select("*").single();
  return (data as Customer) || null;
}

/* ---------- Suivi automatique ~10 jours après livraison ---------- */

const parisDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
const addDays = (iso: string, n: number) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);

type Reservation = { id: number; prenom: string | null; nom: string | null; telephone: string | null; email: string | null; ville: string | null; modele: string | null; vin: string | null; livre_at: string; statut: string | null };

/**
 * 1. Ajoute à /clients les clients livrés (reservations.livre_at) des 15 derniers jours, dédoublonnés par téléphone (9 derniers chiffres).
 * 2. Met de côté (« ancien ») les clients livrés il y a plus de 15 jours : le fondateur s'en occupe depuis /clients.
 * 3. Envoie le suivi (SMS + e-mail) aux clients livrés il y a 9 à 15 jours qui ne l'ont pas reçu. Récapitulatif au fondateur.
 */
export async function runSuivi(opts: { dryRun?: boolean } = {}) {
  const db = crmDatabase();
  const today = parisDay(new Date());
  const from = addDays(today, -15), to = addDays(today, -9);
  const now = new Date().toISOString();
  const added: string[] = [];

  // 1. Synchronisation depuis les réservations livrées
  const { data: res } = await db.from("reservations").select("id,prenom,nom,telephone,email,ville,modele,vin,livre_at,statut").not("livre_at", "is", null).gte("livre_at", new Date(new Date(from + "T00:00:00Z").getTime() - DAY).toISOString()).limit(500);
  const { data: rows } = await db.from(TABLE).select("*").limit(5000);
  const list = (rows || []) as (Customer & { reservation_id?: number | null })[];
  for (const r of (res || []) as Reservation[]) {
    if (String(r.statut || "").toLowerCase().startsWith("annul")) continue;
    const day = parisDay(r.livre_at);
    if (day < from) continue;
    const k = last9(r.telephone);
    const cur = list.find(c => c.reservation_id === r.id) || (k.length === 9 ? list.find(c => last9(c.phone) === k) : undefined);
    if (cur) {
      const patch: Record<string, unknown> = {};
      if (!cur.reservation_id) patch.reservation_id = r.id;
      if (!cur.delivered_at || cur.delivered_at < day) { patch.delivered_at = day; if (cur.followup_auto === "ancien") { patch.followup_auto = null; patch.followup_auto_at = null; } }
      if (!cur.email && validEmail(r.email)) patch.email = String(r.email).trim().toLowerCase();
      if (Object.keys(patch).length && !opts.dryRun) { await db.from(TABLE).update({ ...patch, updated_at: now }).eq("id", cur.id); Object.assign(cur, patch); }
      continue;
    }
    const row = { first_name: prettyFirst(r.prenom), last_name: String(r.nom || "").trim(), phone: r.telephone, email: validEmail(r.email) ? String(r.email).trim().toLowerCase() : null, city: r.ville, model: r.modele, vin: r.vin, delivered_at: day, source: "reservation", reservation_id: r.id, status: "à contacter", history: [{ at: now, action: `Client ajouté automatiquement (livré le ${new Date(day + "T12:00:00").toLocaleDateString("fr-FR")})`, by: "Automatique" }] };
    added.push(`${row.first_name} ${row.last_name}`.trim());
    if (!opts.dryRun) { const { data } = await db.from(TABLE).insert(row).select("*").single(); if (data) list.push(data as Customer); }
  }

  // 2. Livrés il y a plus de 15 jours : pas d'envoi automatique
  const old = list.filter(c => !c.followup_auto && c.delivered_at && c.delivered_at < from);
  if (old.length && !opts.dryRun) await db.from(TABLE).update({ followup_auto: "ancien", followup_auto_at: now }).in("id", old.map(c => c.id));

  // 3. Envoi du suivi
  const due = list.filter(c => !c.followup_auto && c.delivered_at && c.delivered_at >= from && c.delivered_at <= to);
  const optedOut = await optedOutPhones(db);
  const sent: string[] = [], skipped: string[] = [], failed: string[] = [];
  const mark = async (c: Customer, value: string, why: string) => {
    skipped.push(`${c.first_name} ${c.last_name}`.trim() + ` : ${why}`);
    if (!opts.dryRun) await db.from(TABLE).update({ followup_auto: value, followup_auto_at: now, history: [...(c.history || []), { at: now, action: `Suivi après livraison non envoyé : ${why}`, by: "Automatique" }], updated_at: now }).eq("id", c.id);
  };
  for (const c of due) {
    const name = `${c.first_name} ${c.last_name}`.trim();
    if (c.status === "ne pas contacter") { await mark(c, "ignoré", "« Ne pas contacter »"); continue; }
    if (c.phone && optedOut.has(last9(c.phone))) { await mark(c, "ignoré", "client désinscrit (STOP)"); continue; }
    if (c.status === "problème en cours") { await mark(c, "ignoré", "problème SAV en cours"); continue; }
    if (c.last_contact_at && Date.now() - new Date(c.last_contact_at).getTime() < 7 * DAY) { await mark(c, "manuel", "déjà contacté ces 7 derniers jours"); continue; }
    if (opts.dryRun) { sent.push(name + " (simulation)"); continue; }
    const r = await sendToCustomer(db, c, "suivi", { by: "Automatique", optedOut });
    if (r.ok) sent.push(`${name} (${[r.sms && "SMS", r.email && "e-mail"].filter(Boolean).join(" + ")})`);
    else { failed.push(`${name} : ${r.error}`); if (/Ni numéro/.test(r.error || "")) await mark(c, "impossible", "ni numéro valide ni e-mail"); }
  }

  if (!opts.dryRun && (sent.length || failed.length) && brevoReady()) {
    const li = (a: string[]) => a.map(x => `<li>${esc(x)}</li>`).join("");
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${sent.length ? `<p><b>Suivi après livraison envoyé (SMS + e-mail) à ${sent.length} client${sent.length > 1 ? "s" : ""} :</b></p><ul>${li(sent)}</ul>` : ""}${failed.length ? `<p><b>Pas pu envoyer :</b></p><ul>${li(failed)}</ul>` : ""}${skipped.length ? `<p style="color:#555">Non envoyé : </p><ul style="color:#555">${li(skipped)}</ul>` : ""}<p>Les réponses arrivent sur WhatsApp (Hana) ou dans votre boîte mail. Suivi : <a href="${SITE}/clients">${SITE}/clients</a></p></div>`;
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Suivi clients après livraison : ${sent.length} message${sent.length > 1 ? "s" : ""} envoyé${sent.length > 1 ? "s" : ""}`, html); } catch (e) { console.error("[CLIENTS-SUIVI] récap", e); }
  }
  return { today, window: { from, to }, added, old: old.length, sent, skipped, failed };
}
