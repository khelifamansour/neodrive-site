import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../lib/brevo";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

/** Candidature « Devenir partenaire » : enregistrée, puis le fondateur est prévenu par e-mail et SMS. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "Formulaire invalide." }, { status: 400 });
  if (clean(b.website)) return NextResponse.json({ ok: true }); // pot de miel anti-robots
  const row = {
    company: clean(b.company, 120), contact_name: clean(b.contact_name, 120), phone: clean(b.phone, 30), email: clean(b.email, 160),
    city: clean(b.city, 80), postal_code: clean(b.postal_code, 10), activity: clean(b.activity, 80),
    formula: ["exposant", "revendeur", "les deux"].includes(clean(b.formula)) ? clean(b.formula) : "à définir",
    has_showroom: b.has_showroom === true, message: clean(b.message, 1500),
  };
  if (!row.company || !row.contact_name || row.phone.replace(/\D/g, "").length < 9) return NextResponse.json({ ok: false, error: "Indiquez au moins la société, votre nom et votre téléphone." }, { status: 400 });
  if (!b.consent) return NextResponse.json({ ok: false, error: "Merci d'accepter d'être recontacté." }, { status: 400 });
  const { data, error } = await crmDatabase().from("partner_applications").insert(row).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "Enregistrement impossible, réessayez." }, { status: 502 });
  if (brevoReady()) {
    const resume = `${row.company} (${row.activity || "activité ?"}) à ${row.city || "?"} ${row.postal_code} — ${row.contact_name}, ${row.phone}${row.email ? ", " + row.email : ""}. Formule : ${row.formula}. Showroom : ${row.has_showroom ? "oui" : "non"}.`;
    try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `Nouvelle candidature partenaire NeoDrive : ${resume}`.slice(0, 300)); } catch (e) { console.error("[PARTENAIRE] sms", e); }
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Candidature partenaire : ${row.company} (${row.city || "?"})`, `<p>${resume}</p><p>Message : ${row.message || "—"}</p><p>Candidature n°${data?.id}</p>`); } catch (e) { console.error("[PARTENAIRE] email", e); }
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
