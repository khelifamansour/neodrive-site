import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../../lib/brevo";
import { proQuote, validSiren } from "../../../../lib/pro-pricing";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** Demande de commande professionnelle : le devis est recalculé côté serveur, enregistré, et le fondateur est prévenu. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "Demande invalide." }, { status: 400 });
  if (clean(b.website)) return NextResponse.json({ ok: true });
  const company = clean(b.company, 120), contact = clean(b.contact_name, 120), phone = clean(b.phone, 30), email = clean(b.email, 160), siren = clean(b.siren, 20).replace(/\s/g, ""), postal = clean(b.postal_code, 5);
  if (!company || !contact || phone.replace(/\D/g, "").length < 9) return NextResponse.json({ ok: false, error: "Indiquez la société, votre nom et votre téléphone." }, { status: 400 });
  if (!validSiren(siren)) return NextResponse.json({ ok: false, error: "Numéro SIREN invalide (9 chiffres)." }, { status: 400 });
  const q = proQuote(clean(b.offer, 20), postal);
  if (!q.ok) return NextResponse.json({ ok: false, error: q.reason }, { status: 400 });
  const row = { company, siren, contact_name: contact, phone, email, postal_code: postal, department: q.department, zone: null, offer: q.offer.key, quantity: q.offer.qty, total_ht: q.totalHT, total_ttc: q.totalTTC, details: q, message: clean(b.message, 1500) };
  const { data, error } = await crmDatabase().from("pro_quotes").insert(row).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "Enregistrement impossible, réessayez." }, { status: 502 });
  if (brevoReady()) {
    const resume = `${company} (SIREN ${siren}), ${contact}, ${phone}${email ? ", " + email : ""}, dept ${q.department}. ${q.offer.label} : ${eur(q.totalHT)} HT / ${eur(q.totalTTC)} TTC.`;
    try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `Demande de commande PRO NeoDrive : ${resume}`.slice(0, 300)); } catch (e) { console.error("[PRO] sms", e); }
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Commande pro : ${company} – ${q.offer.label} (${eur(q.totalHT)} HT)`, `<p>${resume}</p><p>Par voiture : ${eur(q.perCar.totalHT)} HT (véhicule ${eur(q.perCar.vehicleHT)} + forfait réseau ${eur(q.perCar.forfaitReseauHT)} + mise à disposition ${eur(q.perCar.miseADispositionHT)}).<br>Acompte 30 % : ${eur(q.depositTTC)} TTC.</p><p>Message : ${row.message || "—"}</p><p>Demande n°${data?.id}</p>`); } catch (e) { console.error("[PRO] email", e); }
    if (email) { try { await sendEmail(email, contact, `Votre devis NeoDrive Pro – ${q.offer.label}`, `<p>Bonjour ${contact},</p><p>Merci pour votre demande. Voici le récapitulatif de votre devis :</p><p><b>${q.offer.label} – NeoDrive Confort</b><br>Total : <b>${eur(q.totalHT)} HT</b> (${eur(q.totalTTC)} TTC)<br>Acompte de 30 % à la commande : ${eur(q.depositTTC)} TTC, solde avant le départ du transport.</p><p>Prix public conseillé clé en main dans votre secteur : <b>${eur(q.publicCleEnMainTTC)} TTC</b>, le même que sur notre site.</p><p>Notre équipe vous rappelle sous 48 h pour confirmer la commande.</p><p>L'équipe NeoDrive</p>`); } catch (e) { console.error("[PRO] email client", e); } }
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
