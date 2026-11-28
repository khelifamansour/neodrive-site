import { NextResponse } from "next/server";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { relay, templateStatus } from "../../../../lib/package-sender";
import { RELANCE_BODY, RELANCE_TEMPLATE } from "../../../../lib/prospect-relance";
import { prettyFirst } from "../../../../lib/client-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Envoi WhatsApp par PETITS lots aux contacts du CRM (leads), bridé pour protéger le numéro auprès de Meta.
 * Jeton à usage unique admin_once_tokens.purpose « wa-batch », payload :
 *   { lead_ids: number[]            — contacts visés (ou statut: "Nouveau" | "Contacté" | … pour prendre les plus récents de ce statut)
 *     template?: string             — modèle Meta (défaut neodrive_relance_prospect) ; doit être APPROVED, sinon rien n'est envoyé
 *     limit?: number                — au plus N envois dans cet appel (défaut et maximum : ce qui reste du plafond du jour)
 *     spacing?: number }            — secondes entre deux messages (5 à 45, défaut 8)
 * ?dry=1 : aperçu complet (qui recevrait quoi, qui est exclu et pourquoi) SANS rien envoyer et SANS consommer le jeton.
 * Plafond strict : WA_BATCH_PER_DAY envois par jour (heure de Paris, défaut 30, 100 maximum), tous appels confondus.
 * Envoi réel seulement si WHATSAPP_SENDING=on, du lundi au samedi de 9 h à 20 h (Paris).
 * Jamais : contacts désinscrits (opted_out_at, liste noire WhatsApp), numéros invalides ou non mobiles, doublons (même numéro
 * dans le lot, lot déjà reçu depuis 7 jours, ou message WhatsApp sortant depuis 48 h), 06 76 19 22 34 et numéros du fondateur.
 * Arrêt immédiat au premier refus de Meta qui touche le numéro (limite, qualité, compte) : le reste passe en « deferred ».
 * Chaque envoi est noté dans la fiche (leads.history type « wa_batch ») et dans crm_messages.
 */
const SITE = "https://www.easydrive-auto.fr";
const LANG = () => process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr";
const PER_DAY = () => Math.max(0, Math.min(100, Number(process.env.WA_BATCH_PER_DAY ?? 30) || 0));
const GAP_DAYS = 7;
const RECENT_WA_MS = 48 * 3600000;
const BUDGET_MS = 240000;
const EXCLUDED = new Set(["676192234", "628261446", "689781710"]);
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);
const parisDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
/** Codes Meta qui protègent le numéro (limite d'envoi, qualité, spam, compte bloqué, jeton) : on arrête tout de suite. */
const FATAL = new Set([4, 190, 368, 130429, 131031, 131048, 131049, 131056, 132000, 132001, 133010]);

/** Modèle proposé à soumettre à Meta (non soumis) : sans prix ni « 0 € d'acompte » (les modèles avec prix ont été refusés « SCAM »). */
const NOUVELLES_TEMPLATE = "neodrive_nouvelles_prospect";
const NOUVELLES_BODY = [
  "Bonjour {{1}},",
  "",
  "Vous vous étiez intéressé(e) aux voitures sans permis électriques NeoDrive. Nous avons des véhicules disponibles, livrés chez vous partout en France, avec paiement à la livraison et garantie 2 ans.",
  "",
  `🎬 Nos vidéos de livraisons : ${SITE}/videos`,
  `📄 Le catalogue : ${SITE}/catalogue`,
  "",
  "Répondez simplement avec votre code postal : nous vous donnons le prix livré chez vous.",
  "",
  "L'équipe NeoDrive",
].join("\n");

/** Modèles utilisables (corps connu pour la trace dans le CRM, un seul paramètre : le prénom ou « à vous »). */
const TEMPLATES: Record<string, { body: string; fallback: string }> = {
  [RELANCE_TEMPLATE]: { body: RELANCE_BODY, fallback: "à vous" },
  [NOUVELLES_TEMPLATE]: { body: NOUVELLES_BODY, fallback: "à vous" },
};

type Lead = { id: number; nom: string | null; telephone: string | null; statut: string | null; opted_out_at: string | null; history: unknown };
type Hist = { type?: string; sent_at?: string; channel?: string };
type Payload = { lead_ids?: unknown[]; statut?: string; template?: string; limit?: number; spacing?: number };
type Detail = { id: number; nom: string; tel: string; result: "sent" | "would_send" | "skipped" | "deferred" | "error"; why?: string; message_id?: string | null };

const hist = (h: unknown) => (Array.isArray(h) ? h : []) as Hist[];
const mask = (k: string) => k ? `0${k.slice(0, 1)} ** ** ${k.slice(5, 7)} ${k.slice(7)}` : "";
function firstName(nom: string | null) {
  const f = String(nom || "").trim().split(/\s+/)[0] || "";
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,20}$/.test(f) || /^(contact|whatsapp|client|cliente|mr|mme|mlle|monsieur|madame|neodrive|leboncoin|appel|manqu[ée]|inconnu|mm|mr|m|prospect|lead|test)$/i.test(f)) return "";
  return prettyFirst(f);
}

async function readToken(token: string, consume: boolean) {
  const db = crmDatabase();
  const base = () => db.from("admin_once_tokens");
  const now = new Date().toISOString();
  const { data } = consume
    ? await base().update({ used_at: now }).eq("token", token).eq("purpose", "wa-batch").is("used_at", null).gt("expires_at", now).select("payload")
    : await base().select("payload").eq("token", token).eq("purpose", "wa-batch").is("used_at", null).gt("expires_at", now);
  const row = (data || [])[0] as { payload?: Payload } | undefined;
  return row ? row.payload || {} : null;
}

/** Envois du lot déjà faits aujourd'hui (heure de Paris), tous appels confondus. */
async function sentToday(db: ReturnType<typeof crmDatabase>) {
  const today = parisDay(new Date());
  const { data } = await db.from("leads").select("history").gte("updated_at", new Date(Date.now() - 2 * 86400000).toISOString()).limit(5000);
  let n = 0;
  for (const l of (data || []) as { history: unknown }[]) for (const h of hist(l.history)) if (h.type === "wa_batch" && h.channel === "whatsapp" && h.sent_at && parisDay(h.sent_at) === today) n++;
  return n;
}

function sendingHours(d = new Date()) {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", hour: "2-digit", hour12: false }).formatToParts(d);
  const wd = p.find(x => x.type === "weekday")?.value || ""; const h = Number(p.find(x => x.type === "hour")?.value || 0);
  if (wd === "dimanche") return "pas d'envoi le dimanche";
  if (h < 9 || h >= 20) return "envoi seulement de 9 h à 20 h (Paris)";
  return "";
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("token") || "";
  const dry = sp.get("dry") === "1";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return NextResponse.json({ ok: false, error: "Jeton manquant" }, { status: 401 });
  const p = await readToken(token, !dry);
  if (!p) return NextResponse.json({ ok: false, error: "Jeton invalide, expiré ou déjà utilisé" }, { status: 401 });
  await applyStoredSecrets();
  const db = crmDatabase();
  const t0 = Date.now();

  // 1. Modèle : connu et APPROVED chez Meta, sinon on refuse tout.
  const name = String(p.template || RELANCE_TEMPLATE);
  const def = TEMPLATES[name];
  if (!def) return NextResponse.json({ ok: false, error: `Modèle « ${name} » non pris en charge`, allowed: Object.keys(TEMPLATES) }, { status: 400 });
  const tpl = await templateStatus(name, false, []).catch(e => ({ name, status: "ERREUR", reason: (e as Error).message }));
  const whatsappSending = process.env.WHATSAPP_SENDING === "on";
  const perDay = PER_DAY();
  const already = await sentToday(db);
  const room = Math.max(0, perDay - already);
  const limit = Math.max(0, Math.min(room, Number(p.limit) || room));
  const spacing = Math.min(45, Math.max(5, Number(p.spacing) || 8)) * 1000;
  const head = { ok: true, dry, template: tpl, whatsappSending, cap: { perDay, sentToday: already, remainingToday: room, thisCall: limit }, spacingSeconds: spacing / 1000 };
  if (tpl.status !== "APPROVED") return NextResponse.json({ ...head, ok: false, error: `Modèle ${name} : ${tpl.status} — rien n'est envoyé tant qu'il n'est pas APPROVED par Meta.`, summary: { sent: 0, skipped: 0, deferred: 0, errors: 0 } });

  // 2. Contacts visés.
  let leads: Lead[] = [];
  const cols = "id,nom,telephone,statut,opted_out_at,history";
  const ids = [...new Set((Array.isArray(p.lead_ids) ? p.lead_ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 300);
  if (ids.length) {
    const { data, error } = await db.from("leads").select(cols).in("id", ids);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const by = new Map(((data || []) as Lead[]).map(l => [l.id, l]));
    leads = ids.map(i => by.get(i)).filter((l): l is Lead => !!l);
  } else if (p.statut) {
    const { data, error } = await db.from("leads").select(cols).eq("statut", String(p.statut)).is("opted_out_at", null).not("telephone", "is", null).order("id", { ascending: false }).limit(300);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    leads = (data || []) as Lead[];
  } else return NextResponse.json({ ok: false, error: "payload.lead_ids (ou payload.statut) manquant" }, { status: 400 });

  // 3. Exclusions : liste noire, WhatsApp sortant récent, lot déjà reçu, doublons, numéros invalides.
  const { data: bl } = await db.from("whatsapp_blacklist").select("phone").limit(10000);
  const black = new Set(((bl || []) as { phone: string }[]).map(r => last9(r.phone)));
  const { data: recentMsgs } = await db.from("crm_messages").select("lead_id").eq("channel", "whatsapp").eq("direction", "outbound").gte("created_at", new Date(Date.now() - RECENT_WA_MS).toISOString()).in("lead_id", leads.map(l => l.id).slice(0, 300));
  const recent = new Set(((recentMsgs || []) as { lead_id: number }[]).map(r => r.lead_id));
  const seen = new Set<string>();
  const details: Detail[] = []; const todo: { lead: Lead; k: string; prenom: string }[] = [];
  for (const l of leads) {
    const k = last9(l.telephone); const d = { id: l.id, nom: String(l.nom || ""), tel: mask(k) };
    const intl = normalizePhone(l.telephone);
    const why = l.opted_out_at ? "désinscrit (STOP)"
      : !intl || k.length !== 9 || !/^33[67]\d{8}$/.test(intl) ? "numéro invalide ou pas un mobile français"
      : EXCLUDED.has(k) ? "numéro exclu"
      : black.has(k) ? "liste noire WhatsApp"
      : seen.has(k) ? "doublon (même numéro dans le lot)"
      : hist(l.history).some(h => h.type === "wa_batch" && h.channel === "whatsapp" && h.sent_at && Date.now() - new Date(h.sent_at).getTime() < GAP_DAYS * 86400000) ? `déjà reçu un message groupé depuis moins de ${GAP_DAYS} jours`
      : recent.has(l.id) ? "message WhatsApp déjà envoyé depuis moins de 48 h"
      : "";
    if (why) { details.push({ ...d, result: "skipped", why }); continue; }
    seen.add(k);
    todo.push({ lead: l, k, prenom: firstName(l.nom) });
  }
  const pick = todo.slice(0, limit);
  for (const t of todo.slice(limit)) details.push({ id: t.lead.id, nom: String(t.lead.nom || ""), tel: mask(t.k), result: "deferred", why: room ? "plafond de cet appel atteint" : "plafond du jour atteint" });

  const preview = { sample: def.body.replace("{{1}}", pick[0]?.prenom || def.fallback) };
  if (dry) {
    for (const t of pick) details.push({ id: t.lead.id, nom: String(t.lead.nom || ""), tel: mask(t.k), result: "would_send", why: `paramètre {{1}} = « ${t.prenom || def.fallback} »` });
    const blocked = !whatsappSending ? "WHATSAPP_SENDING n'est pas « on » : l'envoi réel serait refusé" : sendingHours();
    return NextResponse.json({ ...head, ...preview, realSendBlockedNow: blocked || null, summary: { sent: 0, wouldSend: pick.length, skipped: details.filter(d => d.result === "skipped").length, deferred: details.filter(d => d.result === "deferred").length, errors: 0 }, details });
  }

  // 4. Envoi réel, espacé, avec arrêt au premier refus grave de Meta.
  const blocked = !whatsappSending ? "Envois WhatsApp en pause (WHATSAPP_SENDING n'est pas « on »)" : sendingHours();
  let stopped = blocked;
  for (const [i, t] of pick.entries()) {
    const d = { id: t.lead.id, nom: String(t.lead.nom || ""), tel: mask(t.k) };
    if (stopped || Date.now() - t0 > BUDGET_MS) { details.push({ ...d, result: "deferred", why: stopped || "temps de l'appel écoulé" }); continue; }
    if (i) await new Promise(r => setTimeout(r, spacing));
    const param = t.prenom || def.fallback;
    const r = await relay("send-template", { to: normalizePhone("0" + t.k), name, language: LANG(), params: [param] })
      .catch(e => ({ ok: false, status: 0, j: { error: { message: (e as Error).message, code: 0 } } } as { ok: boolean; status: number; j: { error?: { message?: string; code?: number }; messages?: { id?: string }[] } }));
    const at = new Date().toISOString();
    const h = hist(t.lead.history);
    if (!r.ok) {
      const code = Number(r.j?.error?.code || 0); const msg = `${r.j?.error?.message || "refusé"}${code ? ` (code ${code})` : ""}`;
      if (code === 131026) {
        await db.from("leads").update({ history: [...h, { type: "wa_batch", channel: "none", template: name, reason: "pas de WhatsApp sur ce numéro", sent_at: at }].slice(-60), updated_at: at }).eq("id", t.lead.id);
        details.push({ ...d, result: "skipped", why: "pas de WhatsApp sur ce numéro" }); continue;
      }
      details.push({ ...d, result: "error", why: msg });
      if (FATAL.has(code) || r.status === 401 || r.status === 403 || r.status === 0) stopped = `Arrêt : Meta a refusé un envoi — ${msg}`;
      continue;
    }
    const id = r.j?.messages?.[0]?.id || null;
    const body = def.body.replace("{{1}}", param);
    await db.from("crm_messages").insert({ lead_id: t.lead.id, direction: "outbound", channel: "whatsapp", body, provider_message_id: id, status: "sent", ai_generated: false });
    await db.from("leads").update({ history: [...h, { type: "wa_batch", channel: "whatsapp", template: name, message_id: id, sent_at: at }].slice(-60), last_contact_at: at, derniere_relance: at, updated_at: at }).eq("id", t.lead.id);
    details.push({ ...d, result: "sent", message_id: id });
  }
  const count = (k: Detail["result"]) => details.filter(x => x.result === k).length;
  return NextResponse.json({ ...head, ...preview, stopped: stopped || null, summary: { sent: count("sent"), skipped: count("skipped"), deferred: count("deferred"), errors: count("error") }, details });
}
