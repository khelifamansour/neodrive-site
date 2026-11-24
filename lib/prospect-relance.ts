/**
 * Relance WhatsApp des prospects qui ont discuté avec Hana sans réserver (au plus 2 relances par personne, pour toujours).
 *   1. Fenêtre de 24 h encore ouverte (20 h à 23 h 15 après le dernier message du client) : message libre, 10 par jour max.
 *   2. Sinon, environ J+7 : modèle Meta MARKETING « neodrive_relance_prospect », seulement s'il est APPROVED, 3 par jour max.
 * Du lundi au samedi, 10 h – 19 h (Paris), jamais le dimanche. Envoi seulement si WHATSAPP_SENDING=on (relais neodrive-wa-send).
 * Jamais : réservation (même numéro), statut Client / Perdu, liste noire, STOP ou refus, opted_out_at, 06 76 19 22 34,
 * clients déjà livrés ou SAV, candidats, partenaires logistiques, équipe. Les relances de l'ancienne file hana_relances comptent.
 * Chaque relance est notée dans la fiche du CRM (history, historique, crm_messages). Colonnes : supabase/sql/2026-11-24-relance-prospect-wa.sql
 */
import { crmDatabase } from "./crm-agent";
import { relay, templateStatus } from "./package-sender";
import { brevoReady, OWNER_EMAIL, sendEmail, SITE } from "./brevo";
import { prettyFirst } from "./client-followup";
import { dataClient, readJson, writeJson } from "./datastore";

type DB = ReturnType<typeof crmDatabase>;
export const RELANCE_TEMPLATE = "neodrive_relance_prospect";
export const RELANCE_MARK = "relance_prospect";
const STOP_PATH = "crm/relance-prospect-arret.json";
const LANG = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr";
const HOUR = 3600000, DAY = 24 * HOUR;
const FREE_MIN = 20 * HOUR, FREE_MAX = 23.25 * HOUR; // marge de sécurité avant la fin de la fenêtre de 24 h
const TEMPLATE_AFTER = 7 * DAY, TEMPLATE_GAP = 6 * DAY, MAX_AGE = 30 * DAY;
const FREE_PER_DAY = () => Math.min(10, Number(process.env.RELANCE_PROSPECT_FREE_PER_DAY ?? 10));
const TPL_PER_DAY = () => Math.min(3, Number(process.env.RELANCE_PROSPECT_TPL_PER_DAY ?? 3));
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);
const parisDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
// Numéros jamais relancés : 06 76 19 22 34 (exclu en permanence) et les numéros du fondateur.
const ALWAYS_EXCLUDED = new Set(["676192234", "628261446", "689781710"]);

const LINKS = [
  `🎬 Nos vidéos : ${SITE}/videos`,
  `📄 Notre catalogue : ${SITE}/catalogue`,
  "📱 Et si vous voulez voir nos vidéos de livraisons sur TikTok : https://www.tiktok.com/@neodrive72",
];
const ARGUMENT = "Chez NeoDrive, vous avez le meilleur rapport qualité-prix : une voiture neuve, garantie 2 ans, que vous payez seulement à la livraison, sans aucun acompte.";
const BOOKING = `Pour réserver ou recevoir votre devis : ${SITE}/reservation-devis`;
const CLOSING = ["Je reste à votre disposition.", "L'équipe NeoDrive"];

/** Relance 1, dans la fenêtre de 24 h (texte libre). */
export const freeRelanceText = (prenom: string) => [
  `Bonjour${prenom ? " " + prenom : ""} 🙂`,
  "",
  "Je me permets de revenir vers vous suite à votre échange avec nous sur WhatsApp au sujet de nos voitures sans permis électriques.",
  "",
  "Si vous ne les avez pas encore vus :",
  ...LINKS,
  "",
  ARGUMENT,
  "",
  BOOKING,
  "",
  ...CLOSING,
].join("\n");

/** Corps du modèle Meta (hors fenêtre de 24 h). {{1}} = prénom, ou « à vous » si inconnu (Meta refuse une variable vide ou en début de texte). */
export const RELANCE_BODY = [
  "Bonjour {{1}},",
  "",
  "Vous avez échangé avec nous sur WhatsApp au sujet des voitures sans permis électriques NeoDrive, et nous voulions simplement prendre de vos nouvelles.",
  "",
  "Si vous ne les avez pas encore vus :",
  ...LINKS,
  "",
  ARGUMENT,
  "",
  BOOKING,
  "",
  ...CLOSING,
].join("\n");
const TEMPLATE_FALLBACK = "à vous";

export async function relanceTemplateStatus(create = false) {
  return templateStatus(RELANCE_TEMPLATE, create, [
    { type: "BODY", text: RELANCE_BODY, example: { body_text: [["Marie"]] } },
    { type: "FOOTER", text: "Répondez STOP pour ne plus recevoir nos messages" },
  ], "MARKETING");
}

const STOP = /(^\s*stop\b|\bstop\s*[.!]*\s*$|ne (plus|pas) me (contacter|recontacter|[ée]crire|d[ée]ranger|relancer)|ne me (contactez|recontactez|[ée]crivez|relancez) plus|d[ée]sinscri|d[ée]sabonn|arr[êe]tez (de )?(m|me )|laissez.moi tranquille)/i;
const REFUS = /(pas int[ée]ress|non merci|plus besoin|pas pour moi|d[ée]j[àa] (achet|command|trouv|pris|une voiture)|j'ai (d[ée]j[àa] )?(achet|trouv|command)|j'ai pris (une|ailleurs)|c'est trop cher pour moi)/i;
// SAV : client qui a déjà sa voiture et signale un problème (pas un prospect qui pose une question sur le SAV).
const SAV_USER = /(en panne|ne d[ée]marre (plus|pas)|ne (se )?(re)?charge (plus|pas)|ma (voiture|neodrive) (ne |n'|est en panne|a un (probl|souci))|(probl[èe]me|souci) (avec|sur) (ma|notre) (voiture|neodrive|batterie)|depuis (la|ma) livraison|j'ai re[çc]u (ma|la) voiture|num[ée]ro de s[ée]rie)/i;
const SAV_BOT = /(easydrive-auto\.fr\/sav|ouvrir un ticket|ticket SAV sera ouvert pour vous|num[ée]ro de s[ée]rie)/i;
const JOB_USER = /(candidat|\bcv\b|curriculum|emploi|recrut|\bjob\b|\bstage\b|alternance|embauch|postuler|travailler (chez|pour|avec) vous)/i;
const JOB_BOT = /ne recrutons pas/i;

type Row = Record<string, unknown>;
type Hist = { type?: string; channel?: string; sent_at?: string; mode?: string };
type Lead = { id: number; nom: string | null; telephone: string | null; statut: string | null; phase: string | null; source: string | null; history: unknown; historique: string | null; opted_out_at: string | null; converted_at: string | null; whatsapp_opt_in: boolean | null; last_inbound_at: string | null; relance_wa_step: number | null; relance_wa_last_at: string | null };
type Conv = { phone: string; lastIn: number; users: string[]; bots: string[] };
export type Plan = { lead: Lead; phone: string; mode: "libre" | "modèle"; step: number; prenom: string; why: string; lastIn: number };

/** Tous les numéros (9 derniers chiffres) d'une colonne ; une table absente ou illisible est ignorée. */
async function phones(db: DB, table: string, col: string): Promise<Set<string>> {
  const { data, error } = await db.from(table).select(col).limit(10000);
  if (error) { console.warn("[RELANCE-PROSPECT]", table, error.message); return new Set(); }
  return new Set(((data || []) as unknown as Row[]).map(r => last9(r[col])).filter(k => k.length === 9));
}

function firstName(nom: string | null) {
  const f = String(nom || "").trim().split(/\s+/)[0] || "";
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,20}$/.test(f) || /^(contact|whatsapp|client|cliente|mr|mme|mlle|monsieur|madame|neodrive)$/i.test(f)) return "";
  return prettyFirst(f);
}

const hist = (h: unknown) => (Array.isArray(h) ? h : []) as Hist[];

/** Calcule la file : qui relancer maintenant (et pourquoi), qui est exclu (et pourquoi). N'envoie rien. */
export async function relanceQueue(db: DB = crmDatabase(), now = Date.now()) {
  const { data: rows, error } = await db.from("whatsapp_ai_processed").select("phone,created_at,user_text,assistant_text").order("created_at", { ascending: true }).limit(20000);
  if (error) throw new Error(error.message);
  const convs = new Map<string, Conv>();
  for (const r of (rows || []) as { phone: string; created_at: string; user_text: string | null; assistant_text: string | null }[]) {
    const k = last9(r.phone); if (k.length !== 9) continue;
    const c = convs.get(k) || { phone: String(r.phone || "").replace(/\D/g, ""), lastIn: 0, users: [], bots: [] };
    c.lastIn = Math.max(c.lastIn, new Date(r.created_at).getTime());
    c.users.push(String(r.user_text || "")); c.bots.push(String(r.assistant_text || ""));
    convs.set(k, c);
  }
  // Seules les conversations récentes (30 jours) peuvent être relancées.
  const recent = [...convs.entries()].filter(([, c]) => now - c.lastIn <= MAX_AGE + DAY);
  const intl = recent.map(([, c]) => c.phone);
  const leads: Lead[] = [];
  for (let i = 0; i < intl.length; i += 150) {
    const { data, error: e } = await db.from("leads").select("id,nom,telephone,statut,phase,source,history,historique,opted_out_at,converted_at,whatsapp_opt_in,last_inbound_at,relance_wa_step,relance_wa_last_at").in("telephone", intl.slice(i, i + 150));
    if (e) throw new Error(e.message);
    leads.push(...((data || []) as Lead[]));
  }
  const leadBy = new Map(leads.map(l => [last9(l.telephone), l]));

  const [booked, followup, customers, sav, black, optout, cand, jobs, invit, cvs, team, logiWa, logiP, fwd, dealers, partners, ambassadors, hanaRows] = await Promise.all([
    phones(db, "reservations", "telephone"), phones(db, "customers_followup", "phone"), phones(db, "customers", "phone"), phones(db, "sav_tickets", "customer_phone"),
    phones(db, "whatsapp_blacklist", "phone"),
    db.from("leads").select("telephone").or("opted_out_at.not.is.null,statut.in.(Client,Perdu)").limit(5000).then(r => new Set(((r.data || []) as Row[]).map(x => last9(x.telephone)))),
    phones(db, "candidates", "phone"), phones(db, "job_applications", "phone"), phones(db, "job_invitations", "phone"), phones(db, "cv_deep", "phone9"), phones(db, "team_members", "phone"),
    phones(db, "logistics_wa", "phone"), phones(db, "logistics_partners", "phone"), phones(db, "forwarders", "phone"), phones(db, "dealers", "phone"), phones(db, "partner_applications", "phone"), phones(db, "ambassadors", "phone"),
    db.from("hana_relances").select("phone,step,sent_at").lt("step", 9).limit(5000).then(r => (r.data || []) as { phone: string; step: number; sent_at: string }[]),
  ]);
  const hanaBy = new Map<string, { n: number; at: number }>();
  for (const h of hanaRows) { const k = last9(h.phone); const cur = hanaBy.get(k) || { n: 0, at: 0 }; hanaBy.set(k, { n: cur.n + 1, at: Math.max(cur.at, new Date(h.sent_at).getTime()) }); }

  const todo: Plan[] = []; const excluded: { tel: string; nom: string; why: string }[] = [];
  for (const [k, c] of recent) {
    const l = leadBy.get(k);
    const tel = "0" + k;
    const out = (why: string) => excluded.push({ tel, nom: l?.nom || "", why });
    const lastIn = Math.max(c.lastIn, l?.last_inbound_at ? new Date(l.last_inbound_at).getTime() : 0);
    const idle = now - lastIn;
    if (ALWAYS_EXCLUDED.has(k)) { out("numéro exclu en permanence"); continue; }
    if (!/^33[67]\d{8}$/.test(c.phone)) { out("pas un portable français"); continue; }
    if (!l) { out("pas de fiche dans le CRM"); continue; }
    if (black.has(k)) { out("liste noire WhatsApp"); continue; }
    if (l.opted_out_at || optout.has(k)) { out("ne veut plus être contacté (opted_out_at)"); continue; }
    if (c.users.some(u => STOP.test(u))) { out("a demandé STOP / à ne plus être contacté"); continue; }
    if (booked.has(k) || l.converted_at || l.statut === "Client" || l.source === "reservation") { out("a réservé ou est client"); continue; }
    if (l.statut === "Perdu") { out("statut Perdu"); continue; }
    if (followup.has(k) || customers.has(k) || sav.has(k) || c.users.some(u => SAV_USER.test(u)) || c.bots.some(b => SAV_BOT.test(b))) { out("client existant / SAV"); continue; }
    if (cand.has(k) || jobs.has(k) || invit.has(k) || cvs.has(k) || team.has(k) || c.users.some(u => JOB_USER.test(u)) || c.bots.some(b => JOB_BOT.test(b))) { out("candidat ou équipe"); continue; }
    if (logiWa.has(k) || logiP.has(k) || fwd.has(k) || dealers.has(k) || partners.has(k) || ambassadors.has(k)) { out("partenaire (logistique, transitaire, revendeur, ambassadeur)"); continue; }
    if (c.users.some(u => REFUS.test(u))) { out("a refusé ou a déjà acheté"); continue; }
    if (/rappel/i.test(String(l.phase || ""))) { out("rappel demandé : le conseiller rappelle"); continue; }
    const hana = hanaBy.get(k) || { n: 0, at: 0 };
    const done = (l.relance_wa_step || 0) + hana.n;
    const lastRel = Math.max(l.relance_wa_last_at ? new Date(l.relance_wa_last_at).getTime() : 0, hana.at);
    if (done >= 2) { out("2 relances déjà faites"); continue; }
    if (idle > MAX_AGE) { out("dernier message il y a plus de 30 jours"); continue; }
    // Autre message commercial WhatsApp (package, relance Leboncoin) dans les 3 derniers jours : on laisse respirer.
    const otherRecent = hist(l.history).some(h => (h?.type === "relance" || (h?.type === "package" && h?.channel !== "whatsapp_inbound")) && h?.sent_at && now - new Date(h.sent_at).getTime() < 3 * DAY);
    if (otherRecent) { out("autre message WhatsApp automatique il y a moins de 3 jours"); continue; }
    const prenom = firstName(l.nom);
    const h = Math.round(idle / HOUR);
    if (done === 0 && idle >= FREE_MIN && idle <= FREE_MAX) { todo.push({ lead: l, phone: c.phone, mode: "libre", step: 1, lastIn, prenom, why: `dernier message il y a ${h} h, pas de réservation : relance 1 en texte libre (fenêtre de 24 h ouverte)` }); continue; }
    if (idle >= TEMPLATE_AFTER && (!lastRel || now - lastRel >= TEMPLATE_GAP)) { todo.push({ lead: l, phone: c.phone, mode: "modèle", step: done + 1, lastIn, prenom, why: `dernier message il y a ${Math.round(idle / DAY)} j, ${done} relance(s) déjà faite(s) : relance ${done + 1} par modèle` }); continue; }
    out(idle < FREE_MIN ? `conversation récente (${h} h), relance possible à partir de 20 h` : done === 0 && idle < 24 * HOUR ? `fenêtre de 24 h presque fermée (${h} h) : modèle vers J+7` : lastRel && now - lastRel < TEMPLATE_GAP ? `relance récente (il y a ${Math.round((now - lastRel) / DAY)} j), suivante vers J+7` : `en attente du modèle vers J+7 (il y a ${Math.round(idle / DAY)} j)`);
  }
  // Fenêtre libre : les plus proches de la fin des 24 h d'abord. Modèles : les conversations les plus récentes d'abord.
  todo.sort((a, b) => a.mode !== b.mode ? (a.mode === "libre" ? -1 : 1) : a.mode === "libre" ? a.lastIn - b.lastIn : b.lastIn - a.lastIn);
  // Déjà envoyées aujourd'hui (heure de Paris), par type.
  const { data: recentLeads } = await db.from("leads").select("history").gte("relance_wa_last_at", new Date(now - 2 * DAY).toISOString()).limit(1000);
  let freeToday = 0, tplToday = 0;
  for (const r of (recentLeads || []) as Row[]) for (const h of hist(r.history)) {
    if (h?.type !== RELANCE_MARK || h?.channel !== "whatsapp" || !h?.sent_at || parisDay(h.sent_at) !== parisDay(new Date(now))) continue;
    if (h.mode === "libre") freeToday++; else tplToday++;
  }
  return { todo, excluded, freeToday, tplToday };
}

/** Note la relance dans la fiche du CRM. */
async function logRelance(db: DB, p: Plan, text: string, extra: { mode: string; template?: string; message_id?: string | null; channel: string; note?: string }) {
  const at = new Date().toISOString();
  const when = new Date(at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const label = extra.channel === "whatsapp" ? `Relance WhatsApp ${p.step} (${extra.mode === "libre" ? "texte libre" : `modèle ${extra.template}`}) envoyée automatiquement` : `Relance WhatsApp ${p.step} impossible : ${extra.note}`;
  const { data: cur } = await db.from("leads").select("history,historique").eq("id", p.lead.id).single();
  const history = [...(Array.isArray(cur?.history) ? cur!.history : []), { type: RELANCE_MARK, step: p.step, mode: extra.mode, template: extra.template || null, channel: extra.channel, sent_at: at, message_id: extra.message_id || null, ...(extra.channel === "whatsapp" ? { text } : { note: extra.note }) }].slice(-60);
  const historique = [String(cur?.historique || "").trim(), `[${when}] ${label}`].filter(Boolean).join("\n").slice(-4000);
  const patch: Record<string, unknown> = { history, historique, relance_wa_step: extra.channel === "whatsapp" ? p.step : 2, relance_wa_last_at: at, updated_at: at };
  if (extra.channel === "whatsapp") Object.assign(patch, { last_contact_at: at, derniere_relance: at });
  await db.from("leads").update(patch).eq("id", p.lead.id);
  if (extra.channel === "whatsapp") await db.from("crm_messages").insert({ lead_id: p.lead.id, direction: "outbound", channel: "whatsapp", body: text, provider_message_id: extra.message_id || null, status: "sent", ai_generated: false });
}

/** dry = liste seulement (qui, pourquoi, et ce qui serait envoyé). */
export async function sendProspectRelances(opts: { dry?: boolean } = {}) {
  const db = crmDatabase();
  const { todo, excluded, freeToday, tplToday } = await relanceQueue(db);
  const freeBudget = Math.max(0, FREE_PER_DAY() - freeToday), tplBudget = Math.max(0, TPL_PER_DAY() - tplToday);
  const needsTpl = todo.some(t => t.mode === "modèle");
  let tpl: { status: string; reason?: string | null } = { status: "non vérifié" };
  if (needsTpl || opts.dry) { try { tpl = await relanceTemplateStatus(false); } catch (e) { tpl = { status: "ERREUR", reason: (e as Error).message }; } }
  const free = todo.filter(t => t.mode === "libre"), tpls = todo.filter(t => t.mode === "modèle");
  const pick = [...free.slice(0, freeBudget), ...(tpl.status === "APPROVED" ? tpls.slice(0, tplBudget) : [])];
  const show = (t: Plan) => ({ tel: "0" + t.phone.slice(2), nom: t.lead.nom || "", prenom: t.prenom || null, mode: t.mode, relance: t.step, pourquoi: t.why, envoyé_maintenant: pick.includes(t) });
  if (opts.dry) {
    return {
      dry: true, template: { name: RELANCE_TEMPLATE, ...tpl }, whatsappSending: process.env.WHATSAPP_SENDING === "on",
      plafonds: { libre: `${freeToday}/${FREE_PER_DAY()} aujourd'hui`, modele: `${tplToday}/${TPL_PER_DAY()} aujourd'hui` },
      candidats: todo.map(show), exclus: excluded,
      apercu: { libre: freeRelanceText("Marie"), modele: RELANCE_BODY.replace("{{1}}", "Marie") },
    };
  }
  if (process.env.WHATSAPP_SENDING !== "on") return { sent: 0, skipped: "WHATSAPP_SENDING n'est pas activé" };
  // Après un refus de Meta, plus aucune relance jusqu'au lendemain (protection du numéro).
  const sb = dataClient();
  const today = parisDay(new Date());
  const halt = sb ? await readJson<{ day?: string; reason?: string }>(sb, STOP_PATH).catch(() => null) : null;
  if (halt?.day === today) return { sent: 0, skipped: `arrêté pour aujourd'hui après un refus de Meta : ${halt.reason || ""}` };
  if (!pick.length) return { sent: 0, template: tpl.status, waitingTemplate: tpl.status === "APPROVED" ? 0 : tpls.length, remaining: todo.length, skipped: todo.length ? "plafond du jour atteint ou modèle pas encore approuvé" : "personne à relancer" };
  const sent: string[] = []; let stopped = "";
  for (const t of pick) {
    const isFree = t.mode === "libre";
    const text = isFree ? freeRelanceText(t.prenom) : RELANCE_BODY.replace("{{1}}", t.prenom || TEMPLATE_FALLBACK);
    const r = await (isFree
      ? relay("send-text", { to: t.phone, text })
      : relay("send-template", { to: t.phone, name: RELANCE_TEMPLATE, language: LANG(), params: [t.prenom || TEMPLATE_FALLBACK] })
    ).catch(e => ({ ok: false, status: 0, j: { error: { message: (e as Error).message, code: 0 } } }));
    if (!r.ok) {
      const code = r.j?.error?.code;
      if (code === 131026) { await logRelance(db, t, text, { mode: t.mode, channel: "none", note: "pas de WhatsApp sur ce numéro" }); continue; }
      if (code === 131047) continue; // fenêtre de 24 h fermée entre-temps : le modèle prendra le relais vers J+7
      stopped = `${r.j?.error?.message || r.j?.error || "Erreur Meta"}${code ? ` (code ${code})` : ""}`;
      break;
    }
    await logRelance(db, t, text, { mode: t.mode, template: isFree ? undefined : RELANCE_TEMPLATE, channel: "whatsapp", message_id: r.j?.messages?.[0]?.id || null });
    sent.push(`${t.lead.nom || "0" + t.phone.slice(2)} (${t.mode})`);
  }
  if (stopped && sb) await writeJson(sb, STOP_PATH, { day: today, reason: stopped, at: new Date().toISOString() }).catch(e => console.error("[RELANCE-PROSPECT] arrêt", e));
  if (stopped && brevoReady()) {
    try { await sendEmail(OWNER_EMAIL, "Mansour", "WhatsApp : relances des prospects arrêtées pour aujourd'hui", `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>Meta a refusé une relance de prospect : <b>${stopped.replace(/</g, "&lt;")}</b>.</p><p>Les relances sont arrêtées pour aujourd'hui et reprendront demain (${sent.length} envoyée${sent.length > 1 ? "s" : ""} avant l'erreur). Pour les couper, mettez RELANCE_PROSPECT_FREE_PER_DAY et RELANCE_PROSPECT_TPL_PER_DAY à 0.</p><p>CRM : <a href="${SITE}/crm">${SITE}/crm</a></p></div>`); } catch (e) { console.error("[RELANCE-PROSPECT] e-mail", e); }
  }
  return { sent: sent.length, names: sent, stopped, template: tpl.status, waitingTemplate: tpl.status === "APPROVED" ? 0 : tpls.length, remaining: todo.length - sent.length };
}
