import { NextResponse } from "next/server";
import { crmDatabase, normalizePhone } from "../../../../lib/crm-agent";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { brevoReady, sendSms } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Textes GSM-7 (sans ê â ç î ô) : un seul SMS de bienvenue par prospect. */
const TEXT_LEBONCOIN = "Bonjour, merci pour votre message sur Leboncoin ! C'est NeoDrive : voitures sans permis electriques neuves a partir de 3990 €, livrees chez vous, paiement a la livraison. Catalogue et videos : www.easydrive-auto.fr Une question ? WhatsApp : wa.me/33676192234 , on vous repond tout de suite. L'equipe NeoDrive";
const TEXT_DEFAULT = "Bonjour, merci d'avoir contacte NeoDrive ! Nous sommes actuellement en livraison. Voitures sans permis electriques neuves a partir de 3990 €, livrees chez vous : www.easydrive-auto.fr Ecrivez-nous sur WhatsApp : wa.me/33676192234 , on vous repond tout de suite. L'equipe NeoDrive";
const MAX_PER_RUN = 60;
/** Seuls les prospects arrivés depuis la mise en service (les anciens « Nouveau » ne sont pas relancés en masse). */
const DEFAULT_SINCE = "2026-11-24T00:00:00+01:00";
const MAX_AGE_DAYS = 3;
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);
const isFrMobile = (p: string) => /^33[67]\d{8}$/.test(p);
const BLOCKED = new Set(["676192234", "689781710"]);

/**
 * SMS de bienvenue automatique aux nouveaux prospects (importés ou saisis à la main, même sans nom) qui n'ont pas reçu de message.
 * Cron toutes les 15 min ; envoi seulement de 8 h à 20 h (Paris), 60 SMS au plus par passage. ?dry=1 : simulation sans envoi.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAuthorized(req, url.searchParams.get("passcode") || "")) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const dry = url.searchParams.get("dry") === "1";
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
  if (!dry && (hour < 8 || hour >= 20)) return NextResponse.json({ ok: true, skipped: "hors horaires (8 h – 20 h, Paris)" });
  const sinceParam = url.searchParams.get("since");
  const floor = new Date(sinceParam && /^\d{4}-\d{2}-\d{2}/.test(sinceParam) ? sinceParam : process.env.WELCOME_SMS_SINCE || DEFAULT_SINCE);
  const since = new Date(Math.max(floor.getTime(), Date.now() - MAX_AGE_DAYS * 86400000));
  const db = crmDatabase();
  await applyStoredSecrets();
  if (!dry && !brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non configuré" }, { status: 503 });

  // created_at est sans fuseau (heure UTC du serveur de base).
  const { data: leads, error } = await db.from("leads").select("id,nom,telephone,statut,source,followup_step,opted_out_at,history,notes")
    .eq("statut", "Nouveau").is("opted_out_at", null).or("followup_step.is.null,followup_step.eq.0")
    .gte("created_at", since.toISOString().replace("Z", "")).order("id").limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const [{ data: res }, { data: cust }, { data: sms }] = await Promise.all([
    db.from("reservations").select("telephone").limit(5000),
    db.from("customers").select("phone").limit(5000),
    db.from("crm_messages").select("lead_id").eq("channel", "sms").eq("direction", "outbound").in("lead_id", (leads || []).map(l => l.id).concat(0)),
  ]);
  const known = new Set([...(res || []).map(r => last9(r.telephone)), ...(cust || []).map(c => last9(c.phone))].filter(x => x.length === 9));
  const owner = last9(process.env.OWNER_SMS_PHONE || "");
  if (owner) BLOCKED.add(owner);
  const smsDone = new Set((sms || []).map(m => m.lead_id));
  const seen = new Set<string>();

  const results: { id: number; tel?: string; source?: string | null; sent?: boolean; dry?: boolean; skipped?: string; error?: string }[] = [];
  let sent = 0;
  for (const l of leads || []) {
    if (sent >= MAX_PER_RUN) break;
    const tel = normalizePhone(l.telephone); const k = last9(tel);
    const skip = (why: string) => results.push({ id: l.id, tel, skipped: why });
    if (!isFrMobile(tel)) { skip("pas de mobile français"); continue; }
    if (BLOCKED.has(k)) { skip("numéro NeoDrive"); continue; }
    if (known.has(k)) { skip("déjà réservation / client"); continue; }
    if (smsDone.has(l.id) || (Array.isArray(l.history) && l.history.some((h: { type?: string }) => /sms/i.test(String(h?.type || ""))))) { skip("SMS déjà envoyé"); continue; }
    if (seen.has(k)) { skip("numéro en double"); continue; }
    seen.add(k);
    const text = /leboncoin/i.test(String(l.source || "")) ? TEXT_LEBONCOIN : TEXT_DEFAULT;
    if (dry) { results.push({ id: l.id, tel, source: l.source, dry: true }); sent++; continue; }
    // Verrou : on passe d'abord le prospect à l'étape 1 (un autre passage ne le reprendra pas), puis on envoie.
    const at = new Date().toISOString();
    const { data: lock } = await db.from("leads").update({ followup_step: 1, updated_at: at }).eq("id", l.id).eq("statut", "Nouveau").or("followup_step.is.null,followup_step.eq.0").select("id");
    if (!lock?.length) { skip("déjà pris en charge"); continue; }
    try {
      const id = await sendSms(tel, text, "transactional");
      const day = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
      await db.from("crm_messages").insert({ lead_id: l.id, direction: "outbound", channel: "sms", body: text, provider_message_id: id, status: "sent", ai_generated: false });
      await db.from("leads").update({
        statut: "Contacté", phase: "Attente réponse", followup_step: 1, last_contact_at: at, derniere_relance: at, next_followup_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        notes: [l.notes, `[${day}] SMS de bienvenue automatique envoyé (${/leboncoin/i.test(String(l.source || "")) ? "Leboncoin" : "contact"})`].filter(Boolean).join("\n"),
        history: [...(Array.isArray(l.history) ? l.history : []), { type: "sms_welcome", channel: "sms", sent_at: at, provider_id: id }].slice(-60), updated_at: at,
      }).eq("id", l.id);
      results.push({ id: l.id, tel, source: l.source, sent: true }); sent++;
    } catch (e) {
      await db.from("leads").update({ followup_step: 0 }).eq("id", l.id).eq("followup_step", 1).eq("statut", "Nouveau");
      results.push({ id: l.id, tel, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: true, dry, since: since.toISOString(), candidates: (leads || []).length, [dry ? "would_send" : "sent"]: sent, results });
}
