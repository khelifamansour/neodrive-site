import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, sendSms } from "../../../../lib/brevo";
import { normalizePhone, type Customer } from "../../../../lib/clients";
import { optedOutPhones, prettyFirst, toGsm } from "../../../../lib/client-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Payload = { sms?: string; subject?: string; html?: string; key?: string };
const last9 = (p: unknown) => String(p || "").replace(/\D/g, "").slice(-9);
const validEmail = (e: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

/**
 * Envoi groupé ponctuel à tous les clients livrés (/clients), validé par le fondateur.
 * Jeton à usage unique : admin_once_tokens (purpose « clients-broadcast », payload { sms, subject, html, key? }).
 * Exclus : « ne pas contacter », désinscrits (STOP), sans numéro ni e-mail, doublons (même téléphone / même e-mail),
 * et clients ayant déjà reçu ce message (historique, même « key »). Chaque envoi est noté dans l'historique du client.
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "clients-broadcast").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: Payload } | undefined)?.payload;
  if (!p?.sms || !p.subject || !p.html) return NextResponse.json({ ok: false }, { status: 401 });
  if (toGsm(p.sms) !== p.sms.trim()) return NextResponse.json({ ok: false, error: "Le SMS contient des caractères hors GSM-7." }, { status: 400 });
  if (p.sms.length > 459) return NextResponse.json({ ok: false, error: "SMS trop long (plus de 3 SMS)." }, { status: 400 });
  await applyStoredSecrets();
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });

  const key = `broadcast:${p.key || p.subject}`;
  const { data: rows } = await db.from("customers_followup").select("*").order("id").limit(5000);
  const optedOut = await optedOutPhones(db);
  const seenPhones = new Set<string>(), seenEmails = new Set<string>();
  const skipped: Record<string, number> = { "ne pas contacter": 0, "désinscrit (STOP)": 0, "sans contact": 0, "doublon": 0, "déjà reçu": 0 };
  const todo: { c: Customer; phone: string | null; email: string | null }[] = [];
  for (const c of (rows || []) as Customer[]) {
    if (c.status === "ne pas contacter") { skipped["ne pas contacter"]++; continue; }
    if ((c.history || []).some(h => h.kind === key)) { skipped["déjà reçu"]++; continue; }
    const ph = normalizePhone(c.phone); const k = last9(c.phone);
    if (ph.valid && optedOut.has(k)) { skipped["désinscrit (STOP)"]++; continue; }
    const phone = ph.valid && !seenPhones.has(k) ? ph.intl : null;
    const mail = validEmail(c.email) ? String(c.email).trim().toLowerCase() : "";
    const email = mail && !seenEmails.has(mail) ? mail : null;
    if (!phone && !email) { skipped[ph.valid || mail ? "doublon" : "sans contact"]++; continue; }
    if (phone) seenPhones.add(k); if (email) seenEmails.add(email);
    todo.push({ c, phone, email });
  }

  let sms = 0, emails = 0; const errors: string[] = [];
  const work = async ({ c, phone, email }: typeof todo[number]) => {
    const name = `${prettyFirst(c.first_name)} ${c.last_name || ""}`.trim();
    let s = false, e = false;
    if (phone) { try { await sendSms("+" + phone, p.sms!.trim(), "transactional"); s = true; sms++; } catch (er) { errors.push(`${name} (SMS) : ${(er as Error).message}`); } }
    if (email) { try { await sendEmail(email, name, p.subject!, p.html!, undefined, { replyTo: OWNER_EMAIL }); e = true; emails++; } catch (er) { errors.push(`${name} (e-mail) : ${(er as Error).message}`); } }
    if (!s && !e) return;
    const now = new Date().toISOString();
    const history = [...(c.history || []), { at: now, action: `Message groupé envoyé : ${p.subject}`, channel: s && e ? "sms+email" : s ? "sms" : "email", kind: key, text: s ? p.sms : p.subject, by: "Envoi groupé" }];
    await db.from("customers_followup").update({ history, last_contact_at: now, updated_at: now }).eq("id", c.id);
  };
  for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map(work));

  const result = { clients: todo.length, sms, emails, skipped, errors };
  console.log("[CLIENTS-BROADCAST]", JSON.stringify(result));
  try { await sendEmail(OWNER_EMAIL, "Mansour", `Envoi groupé clients : ${sms} SMS, ${emails} e-mails`, `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p><b>${p.subject}</b></p><p>${todo.length} clients contactés : ${sms} SMS, ${emails} e-mails.</p><p>Non envoyé : ${Object.entries(skipped).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "aucun"}.</p>${errors.length ? `<p>Erreurs :<br>${errors.map(x => x.replace(/</g, "&lt;")).join("<br>")}</p>` : ""}</div>`); } catch (e) { console.error("[CLIENTS-BROADCAST] récap", e); }
  return NextResponse.json({ ok: true, ...result });
}
export const GET = run;
export const POST = run;
