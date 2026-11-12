import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { brevoReady, sendEmail, sendSms, OWNER_EMAIL } from "../../../lib/brevo";
import { isPoste } from "../../../lib/hiring";
import { TEMPLATES, contract, posteTitle, type OfferParams } from "../../../lib/offers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clean = (v: unknown, max = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const SITE = "https://www.easydrive-auto.fr";

/** Ne garde que des paramètres connus, avec des bornes raisonnables. */
function sanitize(poste: string, raw: Record<string, unknown>): OfferParams {
  const t = TEMPLATES[isPoste(poste) ? poste : "closer"]; const num = (k: keyof OfferParams, max: number) => { const n = Number(raw[k]); return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : (t[k] as number); };
  return { fixe: num("fixe", 500000), charges: num("charges", 50000), assiduite: num("assiduite", 50000), commission: num("commission", 50000), palierVentes: num("palierVentes", 500), palierBonus: num("palierBonus", 200000), objectifLabel: clean(raw.objectifLabel ?? t.objectifLabel, 200), objectifMontant: num("objectifMontant", 200000), reposJours: num("reposJours", 60), essaiJours: num("essaiJours", 90), debut: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.debut)) ? String(raw.debut) : "", horaires: clean(raw.horaires ?? t.horaires, 250), tauxEur: num("tauxEur", 1000) || 277, ventesType: num("ventesType", 500), devise: raw.devise === "DA" ? "DA" : "EUR" };
}

/** Lien public : lecture de l'offre (GET ?t=) — sans les informations internes. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[a-f0-9]{32}$/.test(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const db = crmDatabase(); const { data: o } = await db.from("job_offers").select("*").eq("token", t).maybeSingle();
  if (!o || o.status === "annulée") return NextResponse.json({ ok: false, error: "Cette offre n'est plus disponible." }, { status: 404 });
  if (!o.viewed_at) await db.from("job_offers").update({ viewed_at: new Date().toISOString() }).eq("id", o.id);
  const doc = o.contract_snapshot ? JSON.parse(o.contract_snapshot) : contract(o.poste, o.params, o.full_name);
  return NextResponse.json({ ok: true, doc, name: o.full_name, status: o.status, signed_at: o.signed_at, signature_name: o.signature_name });
}

/** Lien public : signature ou refus (POST { t, action: "sign" | "refuse", name, reason }). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const t = String(b.t || ""); if (!/^[a-f0-9]{32}$/.test(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const db = crmDatabase(); const { data: o } = await db.from("job_offers").select("*").eq("token", t).maybeSingle();
  if (!o || o.status === "annulée") return NextResponse.json({ ok: false, error: "Cette offre n'est plus disponible." }, { status: 404 });
  if (o.status === "signée") return NextResponse.json({ ok: false, error: "Offre déjà signée." }, { status: 409 });
  await applyStoredSecrets();
  const now = new Date().toISOString(); const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60); const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  let note = "";
  if (b.action === "refuse") {
    await db.from("job_offers").update({ status: "refusée", refused_at: now, refuse_reason: clean(b.reason, 500), signer_ip: ip }).eq("id", o.id);
    note = `❌ ${o.full_name} a refusé l'offre (${posteTitle(o.poste)})${b.reason ? ` : « ${clean(b.reason, 300)} »` : ""}.`;
  } else {
    const name = clean(b.name, 120); if (name.length < 4 || !b.accept) return NextResponse.json({ ok: false, error: "Écrivez votre nom complet et cochez la case d'acceptation." }, { status: 400 });
    const doc = contract(o.poste, o.params, o.full_name);
    await db.from("job_offers").update({ status: "signée", signed_at: now, signature_name: name, signer_ip: ip, signer_ua: ua, contract_snapshot: JSON.stringify(doc) }).eq("id", o.id);
    note = `✅ ${o.full_name} a signé l'offre (${posteTitle(o.poste)}), signature : « ${name} », le ${new Date(now).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.`;
  }
  try { if (brevoReady()) { await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `NeoDrive recrutement : ${note}`.slice(0, 300)); await sendEmail(OWNER_EMAIL, "Mansour", `Recrutement : ${note.slice(0, 90)}`, `<p>${esc(note)}</p><p><a href="${SITE}/recrutement-admin">Ouvrir le recrutement</a></p>`); } } catch (e) { console.error("[offres] alerte", e); }
  return NextResponse.json({ ok: true });
}

/** Espace recrutement (code d'accès) : list, create, send, cancel. */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  await applyStoredSecrets();
  const db = crmDatabase();
  if (b.action === "list") { const { data } = await db.from("job_offers").select("*").order("created_at", { ascending: false }); return NextResponse.json({ ok: true, offers: data || [] }); }
  if (b.action === "create") {
    if (!isPoste(b.poste) || !clean(b.full_name)) return NextResponse.json({ ok: false, error: "Poste ou nom manquant" }, { status: 400 });
    const row = { poste: b.poste, invitation_id: Number(b.invitation_id) || null, application_id: Number(b.application_id) || null, full_name: clean(b.full_name, 120), phone: clean(b.phone, 30) || null, email: clean(b.email, 160) || null, params: sanitize(b.poste, b.params || {}), token: randomBytes(16).toString("hex"), status: "brouillon" };
    const { data, error } = await db.from("job_offers").insert(row).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, offer: data, link: `${SITE}/offre/${data.token}` });
  }
  if (b.action === "cancel" && b.id) { await db.from("job_offers").update({ status: "annulée" }).eq("id", b.id).neq("status", "signée"); return NextResponse.json({ ok: true }); }
  if (b.action === "mark_whatsapp" && b.id) { await db.from("job_offers").update({ status: "envoyée", sent_at: new Date().toISOString(), sent_via: "whatsapp" }).eq("id", b.id).eq("status", "brouillon"); return NextResponse.json({ ok: true }); }
  if (b.action === "send" && b.id) {
    if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
    const { data: o } = await db.from("job_offers").select("*").eq("id", b.id).single();
    if (!o || ["signée", "annulée"].includes(o.status)) return NextResponse.json({ ok: false, error: "Offre non envoyable" }, { status: 400 });
    const link = `${SITE}/offre/${o.token}`; const first = String(o.full_name).split(" ")[0]; const via: string[] = []; const errors: string[] = [];
    if (o.phone) { try { await sendSms("+" + String(o.phone).replace(/\D/g, "").replace(/^0/, "213"), `Bonjour ${first}, NeoDrive vous propose une mission (${posteTitle(o.poste).split(" (")[0]}). Consultez et signez votre offre : ${link.replace("https://www.", "")} Mansour - NeoDrive`); via.push("sms"); } catch (e) { errors.push("SMS : " + (e as Error).message); } }
    if (o.email) { try { await sendEmail(o.email, o.full_name, `NeoDrive – votre proposition de mission : ${posteTitle(o.poste)}`, `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><p>Bonjour ${esc(first)},</p><p>Suite à votre candidature et à nos échanges, NeoDrive a le plaisir de vous proposer une mission de <b>${esc(posteTitle(o.poste))}</b> (prestataire freelance, présentiel à Alger).</p><p>Vous trouverez le détail (missions, rémunération, conditions) et pourrez l'accepter en ligne ici :</p><p><a href="${link}" style="display:inline-block;background:#f05a28;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Voir et signer mon offre</a></p><p>N'hésitez pas à me contacter pour toute question.</p><p>Cordialement,<br>Mansour Khelifa – NeoDrive</p></div>`); via.push("e-mail"); } catch (e) { errors.push("E-mail : " + (e as Error).message); } }
    if (via.length) await db.from("job_offers").update({ status: o.status === "brouillon" ? "envoyée" : o.status, sent_at: new Date().toISOString(), sent_via: via.join(" + ") }).eq("id", o.id);
    return NextResponse.json({ ok: !!via.length, via, errors, link });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
