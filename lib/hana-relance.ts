/**
 * Relance des conversations WhatsApp de Hana restées sans réponse du client.
 * Étape 1 (≥ 20 h sans réponse) : proposition d'un appel par un conseiller + vidéo + catalogue.
 *   - Fenêtre de 24 h encore ouverte : message libre (gratuit, sans modèle).
 *   - Fenêtre fermée : modèle Meta « neodrive_relance_conseiller » (créé automatiquement, doit être approuvé).
 * Étape 2 (3 jours après l'étape 1, toujours sans réponse) : modèle catalogue, puis plus rien.
 * Jamais : liste noire, STOP, clients ayant déjà réservé ou refusé, dimanche. Plafond quotidien.
 * Quand le client répond « oui / rappelez-moi », le fondateur est prévenu (WhatsApp) et le contact passe en « Chaud ».
 *
 * Table (SQL additif) : hana_relances (id, phone, step, kind, template, message_id, sent_at)
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { RELANCES, relay, templateStatus, whatsappOwner } from "./package-sender";

const SITE = "https://www.easydrive-auto.fr";
const T = "hana_relances";
export const CONSEILLER_TEMPLATE = "neodrive_relance_conseiller";
const VIDEO = `${SITE}/presentation.mp4`;
const OWNER = "33628261446";
const DAY = 86400000, HOUR = 3600000;

const CONSEILLER_BODY = [
  "Bonjour {{1}} 🙂",
  "",
  "Vous avez échangé avec Hana, l'assistante NeoDrive, au sujet de nos voitures sans permis électriques. Voici la NeoDrive en vidéo 🎬",
  "",
  "Avez-vous encore des questions ? Un conseiller peut vous appeler pour tout vous expliquer : livraison chez vous, paiement à la livraison, garantie.",
  "",
  "Souhaitez-vous être rappelé ?",
].join("\n");

const freeText = (prenom: string) => [
  `Bonjour${prenom ? " " + prenom : ""} 🙂 C'est Hana, de NeoDrive.`,
  "",
  "Je reviens vers vous suite à notre échange. Avez-vous encore des questions ?",
  "",
  "Si vous le souhaitez, un conseiller peut vous appeler pour tout vous expliquer : livraison chez vous, paiement à la livraison, garantie. Répondez simplement OUI avec le meilleur moment pour vous appeler 📞",
  "",
  `🎬 Nos vidéos : ${SITE}/videos`,
  `📄 Le catalogue : ${SITE}/catalogue`,
].join("\n");

/** Le client a refusé, réservé ou acheté : on ne relance pas. */
const CLOSED = /(r[ée]serv|trop cher|pas int[ée]ress|non merci|plus besoin|d[ée]j[aà] (achet|command|une voiture)|arr[êe]te|stop|ne plus|laissez.moi|pas pour moi)/i;
const YES = /\b(oui|ok|d'?accord|rappel|appel|appelez|volontiers|go)\b/i;

export async function conseillerTemplate(create = false) {
  return templateStatus(CONSEILLER_TEMPLATE, create, async () => {
    const up = await relay("upload-handle", { url: VIDEO, type: "video/mp4" });
    if (!up.ok || !up.j?.h) throw new Error(up.j?.error?.message || up.j?.error || "Téléversement de la vidéo refusé");
    return [
      { type: "HEADER", format: "VIDEO", example: { header_handle: [up.j.h] } },
      { type: "BODY", text: CONSEILLER_BODY, example: { body_text: [["Marie"]] } },
      { type: "FOOTER", text: "Répondez STOP pour ne plus être contacté" },
      { type: "BUTTONS", buttons: [
        { type: "QUICK_REPLY", text: "Oui, rappelez-moi" },
        { type: "URL", text: "Voir le catalogue", url: `${SITE}/catalogue` },
        { type: "QUICK_REPLY", text: "STOP" },
      ] },
    ];
  });
}

type Conv = { phone: string; last: string; lastUser: string; lastBot: string; msgs: number };

/** Dernier échange de chaque conversation Hana (30 derniers jours). */
async function conversations(): Promise<Conv[]> {
  const db = crmDatabase();
  const { data, error } = await db.from("whatsapp_ai_processed").select("phone,created_at,user_text,assistant_text").gte("created_at", new Date(Date.now() - 30 * DAY).toISOString()).order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  const map = new Map<string, Conv>();
  for (const r of data || []) {
    const p = normalizePhone((r as any).phone); if (!p) continue;
    const c = map.get(p);
    if (!c) map.set(p, { phone: p, last: (r as any).created_at, lastUser: String((r as any).user_text || ""), lastBot: String((r as any).assistant_text || ""), msgs: 1 });
    else c.msgs++;
  }
  return [...map.values()];
}

/** Calcule qui relancer (et qui a répondu « oui » après une relance). dry = rien n'est envoyé. */
export async function hanaRelances(opts: { limit?: number; dry?: boolean } = {}) {
  const db = crmDatabase();
  // Plafond sur 24 h glissantes, pour protéger le numéro WhatsApp.
  const { count: doneToday } = await db.from(T).select("id", { count: "exact", head: true }).lt("step", 9).gte("sent_at", new Date(Date.now() - DAY).toISOString());
  const daily = Number(process.env.HANA_RELANCE_DAILY || 12);
  const limit = Math.max(0, Math.min(opts.limit ?? Number(process.env.HANA_RELANCE_PER_RUN || 6), daily - (doneToday || 0)));
  const paris = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
  const [convs, { data: sent }, { data: black }, { data: optout }] = await Promise.all([
    conversations(),
    db.from(T).select("phone,step,sent_at,kind").order("sent_at", { ascending: true }).limit(5000),
    db.from("whatsapp_blacklist").select("phone"),
    db.from("leads").select("telephone,statut,nom,opted_out_at").or("opted_out_at.not.is.null,statut.in.(Client,Perdu,Livré,Vendu)").limit(5000),
  ]);
  const blocked = new Set([...(black || []).map((b: any) => normalizePhone(b.phone)), ...(optout || []).map((l: any) => normalizePhone(l.telephone)), OWNER, "33676192234", "33689781710"]);
  const byPhone = new Map<string, { step: number; at: string }[]>();
  for (const s of sent || []) { const p = normalizePhone((s as any).phone); byPhone.set(p, [...(byPhone.get(p) || []), { step: (s as any).step, at: (s as any).sent_at }]); }

  const now = Date.now();
  const todo: { c: Conv; step: 1 | 2; free: boolean }[] = []; const callbacks: Conv[] = []; const skipped: { tel: string; why: string }[] = [];
  for (const c of convs) {
    if (blocked.has(c.phone)) continue;
    const done = byPhone.get(c.phone) || [];
    const lastRel = done[done.length - 1];
    // Le client a répondu après une relance : on s'arrête ; s'il dit oui, on prévient le fondateur.
    if (lastRel && new Date(c.last).getTime() > new Date(lastRel.at).getTime()) {
      if (YES.test(c.lastUser) && !done.some(d => d.step === 9)) callbacks.push(c);
      continue;
    }
    const idle = now - new Date(c.last).getTime();
    if (idle > 14 * DAY) continue;
    if (CLOSED.test(c.lastUser) || /r[ée]servation|r[ée]serv[ée]/i.test(c.lastBot)) { skipped.push({ tel: c.phone, why: "réservé ou refus" }); continue; }
    if (!done.length) { if (idle >= 20 * HOUR) todo.push({ c, step: 1, free: idle < 23.5 * HOUR }); }
    else if (done.length === 1 && lastRel.step === 1 && now - new Date(lastRel.at).getTime() >= 3 * DAY) todo.push({ c, step: 2, free: false });
  }
  todo.sort((a, b) => a.step - b.step || new Date(b.c.last).getTime() - new Date(a.c.last).getTime());

  if (opts.dry) return { dry: true, candidates: todo.map(t => ({ tel: t.c.phone, step: t.step, libre: t.free, msgs: t.c.msgs, dernier: t.c.lastUser.slice(0, 80) })), callbacks: callbacks.map(c => c.phone), skipped };
  if (paris(new Date()) === "dimanche") return { sent: 0, skipped: "dimanche", results: [] as any[] };

  // Rappels demandés : on prévient le fondateur une seule fois.
  for (const c of callbacks) {
    const tel = "0" + c.phone.slice(2);
    await whatsappOwner(`📞 Rappel demandé par ${tel} après la relance de Hana : « ${c.lastUser.slice(0, 160)} »`, "Rappel demandé").catch(() => false);
    await db.from(T).insert({ phone: c.phone, step: 9, kind: "rappel_demandé" });
    await db.from("leads").update({ statut: "Chaud", phase: "Rappel demandé", updated_at: new Date().toISOString() }).eq("telephone", c.phone);
  }

  let tpl: any = null;
  try { tpl = await conseillerTemplate(true); } catch (e: any) { tpl = { status: "ERREUR", reason: e?.message }; }
  const catalogue = RELANCES.find(r => r.step === 2)!;
  const results: any[] = []; let stopped = "";
  for (const t of todo) {
    if (results.filter(r => r.sent).length >= limit) break;
    const { data: lead } = await db.from("leads").select("nom").eq("telephone", t.c.phone).maybeSingle();
    const prenom = (() => { const f = String(lead?.nom || "").trim().split(/\s+/)[0] || ""; return f ? f[0].toUpperCase() + f.slice(1).toLowerCase() : ""; })();
    try {
      let r: any, kind: string, template: string | null = null;
      if (t.step === 1 && t.free) { r = await relay("send-text", { to: t.c.phone, text: freeText(prenom) }); kind = "texte libre"; }
      else if (t.step === 1) {
        if (tpl?.status !== "APPROVED") { results.push({ tel: t.c.phone, skipped: `modèle ${CONSEILLER_TEMPLATE} : ${tpl?.status}` }); continue; }
        template = CONSEILLER_TEMPLATE; kind = "modèle conseiller";
        r = await relay("send-template", { to: t.c.phone, name: template, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [prenom || "et merci"], headerVideo: VIDEO });
      } else {
        template = catalogue.name; kind = "modèle catalogue";
        r = await relay("send-template", { to: t.c.phone, name: template, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [prenom || "et merci"], headerDocument: { link: `${SITE}/catalogue-neodrive-2026.pdf`, filename: "Catalogue NeoDrive 2026.pdf" } });
      }
      if (!r.ok) { const code = r.j?.error?.code; const err: any = new Error(r.j?.error?.message || r.j?.error || "Envoi refusé"); err.fatal = r.status === 401 || r.status === 403 || code === 190 || code === 131042; throw err; }
      await db.from(T).insert({ phone: t.c.phone, step: t.step, kind, template, message_id: r.j?.messages?.[0]?.id || null });
      results.push({ tel: t.c.phone, nom: lead?.nom || "", step: t.step, kind, sent: true, type: "hana_relance" });
    } catch (e: any) {
      results.push({ tel: t.c.phone, error: e?.message || "erreur" });
      if (e?.fatal) { stopped = e.message; break; }
    }
  }
  return { sent: results.filter(r => r.sent).length, callbacks: callbacks.length, template: tpl?.status, stopped, results };
}
