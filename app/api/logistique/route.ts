import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase, normalizePhone } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms } from "../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isMobile = (p: string) => /^33[67]\d{8}$/.test(normalizePhone(p) || "");

/** Onglet Logistique : prestataires de dépotage / stockage, suivi et envoi groupé (e-mail + SMS). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "list") {
      const { data, error } = await db.from("logistics_partners").select("*").order("zone").order("name");
      if (error) throw error;
      return NextResponse.json({ ok: true, partners: data });
    }
    if (b.action === "update" && b.id) {
      const patch: Record<string, unknown> = {};
      for (const k of ["status", "note", "price_note", "phone", "email", "zone", "city", "services"]) if (k in b.patch) patch[k] = String(b.patch[k] ?? "").slice(0, 1500);
      const { error } = await db.from("logistics_partners").update(patch).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (b.action === "add") {
      const row = { zone: String(b.row?.zone || "Nord"), name: String(b.row?.name || "").trim().slice(0, 200), city: String(b.row?.city || ""), services: String(b.row?.services || ""), phone: String(b.row?.phone || ""), email: String(b.row?.email || ""), website: String(b.row?.website || ""), note: String(b.row?.note || "") };
      if (!row.name) return NextResponse.json({ ok: false, error: "Nom obligatoire" }, { status: 400 });
      const { error } = await db.from("logistics_partners").insert(row);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (b.action === "send") {
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo n'est pas connecté" }, { status: 503 });
      const ids: number[] = Array.isArray(b.ids) ? b.ids.map(Number).slice(0, 60) : [];
      const subject = String(b.subject || "").trim(); const body = String(b.emailBody || "").trim(); const sms = String(b.smsBody || "").trim();
      if (!ids.length || (!body && !sms)) return NextResponse.json({ ok: false, error: "Rien à envoyer" }, { status: 400 });
      const { data: rows } = await db.from("logistics_partners").select("*").in("id", ids);
      const out: { name: string; email?: string; sms?: string }[] = [];
      for (const p of rows || []) {
        const r: { name: string; email?: string; sms?: string } = { name: p.name };
        const now = new Date().toISOString(); const patch: Record<string, unknown> = {};
        if (body && subject && p.email && !p.email_sent_at) {
          try { await sendEmail(p.email, p.name, subject, `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55">${esc(body).replace(/\n/g, "<br>")}</div>`); r.email = "envoyé"; patch.email_sent_at = now; }
          catch (e) { r.email = "erreur : " + (e as Error).message; }
        } else if (p.email_sent_at) r.email = "déjà envoyé";
        if (sms && p.phone && isMobile(p.phone) && !p.sms_sent_at) {
          try { await sendSms(p.phone, sms); r.sms = "envoyé"; patch.sms_sent_at = now; }
          catch (e) { r.sms = "erreur : " + (e as Error).message; }
        } else if (p.sms_sent_at) r.sms = "déjà envoyé";
        if (Object.keys(patch).length) { if (p.status === "à contacter") patch.status = "contacté"; await db.from("logistics_partners").update(patch).eq("id", p.id); }
        out.push(r);
      }
      return NextResponse.json({ ok: true, results: out });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[LOGISTIQUE]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
