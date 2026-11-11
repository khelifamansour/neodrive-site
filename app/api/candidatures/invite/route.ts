import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms } from "../../../../lib/brevo";
import { POSTES, isPoste } from "../../../../lib/hiring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Envoie l'invitation (e-mail + SMS) aux candidats présélectionnés de job_invitations qui ne l'ont pas encore reçue. */
async function send(ids: number[]) {
  await applyStoredSecrets();
  if (!brevoReady()) return { ok: false, error: "Brevo non connecté" };
  const db = crmDatabase();
  const { data } = await db.from("job_invitations").select("*").in("id", ids);
  const results: { name: string; email?: string; sms?: string }[] = [];
  for (const c of data || []) {
    if (!isPoste(c.poste)) continue;
    const first = String(c.full_name).split(" ")[0];
    const link = `https://www.easydrive-auto.fr/candidature?poste=${c.poste}`;
    const r: { name: string; email?: string; sms?: string } = { name: c.full_name }; const now = new Date().toISOString(); const patch: Record<string, string> = {};
    if (c.email && !c.email_sent_at) {
      try {
        await sendEmail(c.email, c.full_name, `NeoDrive – votre candidature : ${POSTES[c.poste].short}`, `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><p>Bonjour ${esc(first)},</p><p>Merci pour votre candidature. Votre CV a retenu notre attention pour le poste de <b>${esc(POSTES[c.poste].title)}</b> (freelance, présentiel à Alger).</p><p>Prochaine étape : remplir notre formulaire avec quelques tests (français, logique, énigmes, rédaction et mises en situation). Comptez 30 à 40 minutes, en une seule fois.</p><p style="font-size:17px;font-weight:bold;color:#b91c1c">⚠️ À faire seul(e), sans aucune aide ni outil d'intelligence artificielle.</p><p><a href="${link}" style="display:inline-block;background:#f05a28;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Remplir le formulaire</a></p><p>Les meilleurs profils seront appelés pour un entretien.</p><p>Cordialement,<br>Mansour Khelifa – NeoDrive</p></div>`);
        r.email = "envoyé"; patch.email_sent_at = now;
      } catch (e) { r.email = "erreur : " + (e as Error).message; }
    }
    if (c.phone && !c.sms_sent_at) {
      try {
        await sendSms("+" + String(c.phone).replace(/\D/g, ""), `Bonjour ${first}, NeoDrive a retenu votre CV (${POSTES[c.poste].short}, Alger). Étape suivante : formulaire et tests, 30-40 min, à faire seul sans IA : ${link.replace("https://www.", "")} Mansour - NeoDrive`);
        r.sms = "envoyé"; patch.sms_sent_at = now;
      } catch (e) { r.sms = "erreur : " + (e as Error).message; }
    }
    if (Object.keys(patch).length) await db.from("job_invitations").update(patch).eq("id", c.id);
    results.push(r);
  }
  return { ok: true, results };
}

/** Déclenchement par jeton à usage unique (admin_once_tokens, purpose « hiring-invite », payload = { ids }). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const { data } = await crmDatabase().from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "hiring-invite").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const ids = (data?.[0] as { payload?: { ids?: number[] } } | undefined)?.payload?.ids;
  if (!ids?.length) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json(await send(ids));
}

/** Espace de tri : liste des invitations, ou envoi (code d'accès NeoDrive). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  if (b.action === "send") return NextResponse.json(await send((b.ids || []).map(Number).slice(0, 60)));
  const db = crmDatabase();
  const [{ data: inv }, { data: apps }] = await Promise.all([db.from("job_invitations").select("*").order("cv_score", { ascending: false }), db.from("job_applications").select("phone,full_name")]);
  const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "").slice(-9);
  const applied = new Set((apps || []).map(a => digits(a.phone)));
  return NextResponse.json({ ok: true, rows: (inv || []).map(i => ({ ...i, applied: applied.has(digits(i.phone)) })) });
}
