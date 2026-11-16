/**
 * Prospection des lieux de stockage par WhatsApp, depuis le numéro de Hana.
 * WhatsApp impose un modèle validé par Meta pour écrire en premier : « neodrive_recherche_stockage ».
 * Les numéros mis en file (logistics_wa) partent dès que le modèle est approuvé, 10 par passage maximum.
 * Quand le professionnel répond, Hana lui répond en mode « logistique » (fonction neodrive-whatsapp-agent)
 * et le fondateur est prévenu.
 */
import { crmDatabase, normalizePhone } from "./crm-agent";
import { relay, templateStatus } from "./package-sender";

export const STORAGE_TEMPLATE = "neodrive_recherche_stockage";
const BODY = [
  "Bonjour 🙂",
  "",
  "Je suis Hana, l'assistante de NeoDrive, marque française de voitures sans permis électriques (www.easydrive-auto.fr).",
  "",
  "Nous cherchons un espace de stockage pour 20 à 30 petites voitures neuves (2,50 m × 1,30 m, environ 270 kg) pendant 3 à 6 mois, secteur {{1}}. Extérieur clôturé ou hangar, accès avec une remorque.",
  "",
  "Auriez-vous de la place, et à quel prix par mois ? Le dirigeant, Mansour, vous rappellera.",
].join("\n");

export async function storageTemplate(create = false) {
  return templateStatus(STORAGE_TEMPLATE, create, [
    { type: "BODY", text: BODY, example: { body_text: [["Gennevilliers"]] } },
    { type: "FOOTER", text: "Répondez STOP pour ne plus être contacté" },
    { type: "BUTTONS", buttons: [
      { type: "QUICK_REPLY", text: "Oui, j'ai de la place" },
      { type: "QUICK_REPLY", text: "Non, désolé" },
      { type: "QUICK_REPLY", text: "STOP" },
    ] },
  ]);
}

const isMobile = (p: string) => /^33[67]\d{8}$/.test(p);

/** Met en file les numéros de portable des prestataires (ids) pour un premier message WhatsApp. */
export async function queueStorageWhatsApp(ids: number[]) {
  const db = crmDatabase();
  const { data } = await db.from("logistics_partners").select("id,name,phone,whatsapp_at").in("id", ids);
  const rows = (data || []).map((p: any) => ({ phone: normalizePhone(p.phone), partner_id: p.id, name: p.name, whatsapp_at: p.whatsapp_at })).filter(r => isMobile(r.phone) && !r.whatsapp_at);
  if (rows.length) await db.from("logistics_wa").upsert(rows.map(({ whatsapp_at, ...r }) => r), { onConflict: "phone", ignoreDuplicates: true });
  return { queued: rows.length, skipped: ids.length - rows.length };
}

/** Envoie les messages en file si le modèle est approuvé (plafond par passage). */
export async function sendStorageWhatsApp(limit = Number(process.env.STORAGE_WA_PER_RUN || 10)) {
  const db = crmDatabase();
  const { data: queue } = await db.from("logistics_wa").select("*").is("sent_at", null).is("error", null).order("queued_at").limit(limit);
  if (!queue?.length) return { sent: 0, template: null, results: [] as any[] };
  let tpl: any; try { tpl = await storageTemplate(true); } catch (e: any) { return { sent: 0, template: "ERREUR", reason: e?.message, results: [] as any[] }; }
  if (tpl.status !== "APPROVED") return { sent: 0, template: tpl.status, waiting: queue.length, results: [] as any[] };
  const results: any[] = [];
  for (const q of queue as any[]) {
    const { data: p } = await db.from("logistics_partners").select("city,zone,log,status").eq("id", q.partner_id).maybeSingle();
    const secteur = String(p?.city || p?.zone || "Île-de-France").split(/[,(]/)[0].replace(/\d{5}/, "").trim().slice(0, 40) || "Île-de-France";
    const r = await relay("send-template", { to: q.phone, name: STORAGE_TEMPLATE, language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr", params: [secteur] });
    const now = new Date().toISOString();
    if (!r.ok) {
      const err = String(r.j?.error?.message || r.j?.error || "Envoi refusé").slice(0, 300);
      await db.from("logistics_wa").update({ error: err }).eq("phone", q.phone);
      results.push({ name: q.name, error: err });
      if (r.status === 401 || r.status === 403 || r.j?.error?.code === 131042) break;
      continue;
    }
    await db.from("logistics_wa").update({ sent_at: now, message_id: r.j?.messages?.[0]?.id || null }).eq("phone", q.phone);
    const log = [...(Array.isArray(p?.log) ? p.log : []), { at: now, type: "whatsapp", note: "Message WhatsApp automatique de Hana (recherche de stockage)" }].slice(-50);
    await db.from("logistics_partners").update({ whatsapp_at: now, status: p?.status === "à contacter" ? "contacté" : p?.status, log }).eq("id", q.partner_id);
    results.push({ name: q.name, tel: q.phone, sent: true });
  }
  return { sent: results.filter(r => r.sent).length, template: tpl.status, results };
}
