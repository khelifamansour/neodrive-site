import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../lib/brevo";
import { AMBASSADOR, makeCode, normalizeCode } from "../../../lib/ambassadors";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

/** Vérifie un code promo (utilisé par la page de réservation). */
export async function GET(req: Request) {
  const code = normalizeCode(new URL(req.url).searchParams.get("code"));
  if (code.length < 4) return NextResponse.json({ ok: true, valid: false });
  const { data } = await crmDatabase().from("ambassadors").select("code").eq("code", code).eq("status", "actif").maybeSingle();
  return NextResponse.json({ ok: true, valid: !!data, code, discount: data ? AMBASSADOR.discount : 0 });
}

/** Inscription ambassadeur : code promo créé tout de suite, fondateur prévenu par e-mail et SMS. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "Formulaire invalide." }, { status: 400 });
  if (clean(b.website)) return NextResponse.json({ ok: true }); // pot de miel anti-robots
  const row = {
    first_name: clean(b.first_name, 60), last_name: clean(b.last_name, 60), phone: clean(b.phone, 30), email: clean(b.email, 160),
    network: clean(b.network, 40), handle: clean(b.handle, 120), followers: clean(b.followers, 40),
    city: clean(b.city, 80), postal_code: clean(b.postal_code, 10), idea: clean(b.idea, 1500),
  };
  if (!row.first_name || row.phone.replace(/\D/g, "").length < 9) return NextResponse.json({ ok: false, error: "Indiquez au moins votre prénom et votre téléphone." }, { status: 400 });
  if (!b.consent) return NextResponse.json({ ok: false, error: "Merci d'accepter les règles du programme." }, { status: 400 });
  const db = crmDatabase();
  const { data: existing } = await db.from("ambassadors").select("code").eq("phone", row.phone).maybeSingle();
  if (existing?.code) return NextResponse.json({ ok: true, code: existing.code, already: true });
  let code = "";
  for (let i = 0; i < 5 && !code; i++) {
    const candidate = makeCode(row.first_name);
    const { error } = await db.from("ambassadors").insert({ ...row, code: candidate });
    if (!error) code = candidate;
    else if (!String(error.message).includes("duplicate")) return NextResponse.json({ ok: false, error: "Enregistrement impossible, réessayez." }, { status: 502 });
  }
  if (!code) return NextResponse.json({ ok: false, error: "Enregistrement impossible, réessayez." }, { status: 502 });
  if (brevoReady()) {
    const resume = `${row.first_name} ${row.last_name} (${row.network || "réseau ?"} ${row.handle}, ${row.followers || "? abonnés"}) — ${row.phone}${row.email ? ", " + row.email : ""}, ${row.city || "?"}. Code : ${code}.`;
    try { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `Nouvel ambassadeur NeoDrive : ${resume}`.slice(0, 300)); } catch (e) { console.error("[AMBASSADEUR] sms", e); }
    try { await sendEmail(OWNER_EMAIL, "Mansour", `Nouvel ambassadeur : ${row.first_name} ${row.last_name} (${code})`, `<p>${resume}</p><p>Idée de contenu : ${row.idea || "—"}</p><p>Pour suspendre un code : passer le statut à « suspendu » dans la table ambassadors.</p>`); } catch (e) { console.error("[AMBASSADEUR] email", e); }
    if (row.email) {
      try {
        await sendEmail(row.email, row.first_name, `Bienvenue chez les ambassadeurs NeoDrive – votre code ${code}`,
          `<p>Bonjour ${row.first_name},</p><p>Bienvenue dans le programme ambassadeurs NeoDrive !</p><p><b>Votre code promo personnel : ${code}</b><br>Votre lien à partager : <a href="https://www.easydrive-auto.fr/reservation-devis?code=${code}">easydrive-auto.fr/reservation-devis?code=${code}</a></p><p>Pour chaque voiture livrée et payée avec votre code, vous touchez <b>${AMBASSADOR.commission} €</b>, versés sous ${AMBASSADOR.payDelayDays} jours après la livraison.</p><p>Relisez les règles (mention « collaboration commerciale », pas de promesse de prix ou de crédit) : <a href="https://www.easydrive-auto.fr/devenir-ambassadeur">easydrive-auto.fr/devenir-ambassadeur</a></p><p>À très vite,<br>Mansour – NeoDrive</p>`);
      } catch (e) { console.error("[AMBASSADEUR] email bienvenue", e); }
    }
  }
  return NextResponse.json({ ok: true, code });
}
