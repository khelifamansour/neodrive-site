import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FINANCE_DOCS, FINANCE_PARTNER_EMAILS } from "../../../../lib/neodrive-finance";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { brevoReady, OWNER_EMAIL, sendEmail } from "../../../../lib/brevo";
import { writeJson } from "../../../../lib/datastore";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const BUCKET = "erp-documents";
const LINK_TTL = 60 * 60 * 24 * 7; // liens de téléchargement valables 7 jours

/** Finalise le dossier : vérifie les fichiers reçus, enregistre la fiche et renvoie des liens de consultation sécurisés pour NeoDrive. */
export async function POST(req: Request) {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 503 });
  const body = await req.json().catch(() => null) as { folder?: string; applicant?: Record<string, string>; simulation?: Record<string, unknown>; consent?: boolean } | null;
  const folder = String(body?.folder || "");
  const m = folder.match(/^(FIN-\d{4}-\d{8})-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  if (!m) return NextResponse.json({ ok: false, error: "Référence invalide." }, { status: 400 });
  const ref = m[1];
  if (!body?.consent) return NextResponse.json({ ok: false, error: "Consentement requis." }, { status: 400 });
  const a = body.applicant || {};
  if (!a.nom || !a.prenom || !a.email || !a.telephone) return NextResponse.json({ ok: false, error: "Coordonnées incomplètes." }, { status: 400 });

  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const { data: listed, error } = await sb.storage.from(BUCKET).list(`financement/${folder}`, { limit: 50 });
  if (error) return NextResponse.json({ ok: false, error: "Stockage indisponible." }, { status: 502 });
  const files = (listed || []).filter(f => f.name !== "dossier.json");
  const missing = FINANCE_DOCS.filter(d => d.required && !files.some(f => f.name.startsWith(d.key + "-"))).map(d => d.label);
  if (missing.length) return NextResponse.json({ ok: false, error: `Documents manquants : ${missing.join(", ")}` }, { status: 400 });

  const links: { label: string; url: string }[] = [];
  for (const f of files) {
    const doc = FINANCE_DOCS.find(d => f.name.startsWith(d.key + "-"));
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(`financement/${folder}/${f.name}`, LINK_TTL);
    if (data?.signedUrl) links.push({ label: doc?.label || f.name, url: data.signedUrl });
  }
  const dossier = { ref, folder, created_at: new Date().toISOString(), applicant: a, simulation: body.simulation || {}, files: files.map(f => f.name), consent: true };
  await writeJson(sb, `financement/${folder}.json`, dossier).catch(e => console.error("[FIN] dossier", e));
  const notified = await notify(ref, a, body.simulation || {}, links).catch(e => { console.error("[FIN] e-mail", e); return false; });
  return NextResponse.json({ ok: true, ref, links, notified });
}

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const LABELS: Record<string, string> = { civilite: "Civilité", prenom: "Prénom", nom: "Nom", naissance: "Date de naissance", email: "E-mail", telephone: "Téléphone", adresse: "Adresse", ville: "Ville", code_postal: "Code postal", familiale: "Situation familiale", enfants: "Enfants à charge", logement: "Logement", loyer: "Loyer / crédit immobilier", situation: "Situation professionnelle", employeur: "Employeur", anciennete: "Ancienneté", revenus: "Revenus nets mensuels", autresRevenus: "Autres revenus", credits: "Crédits en cours", message: "Message" };

/** Envoie le dossier complet (fiche + liens privés vers les justificatifs, valables 7 jours) à NeoDrive et aux organismes de financement partenaires. */
async function notify(ref: string, a: Record<string, string>, sim: Record<string, unknown>, links: { label: string; url: string }[]) {
  await applyStoredSecrets();
  if (!brevoReady()) return false;
  const rows = (o: Record<string, unknown>, labels: Record<string, string> = {}) => Object.entries(o).filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(labels[k] || k.replace(/_/g, " "))}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join("");
  const partners = FINANCE_PARTNER_EMAILS.filter(Boolean);
  const intro = partners.length
    ? `<p>Bonjour Monsieur Etchemendigaray,</p><p>Nous avons un client qui souhaite financer l'achat d'un véhicule NeoDrive (voiture sans permis électrique neuve). Voici son dossier complet (référence <b>${esc(ref)}</b>) : sa fiche, son projet et ses justificatifs (liens sécurisés valables 7 jours). Vous pouvez le contacter directement avec les coordonnées ci-dessous.</p>`
    : `<p>Bonjour,</p><p>Nouvelle demande de financement <b>${esc(ref)}</b>. Le dossier est complet ; les justificatifs sont consultables ci-dessous (liens sécurisés valables 7 jours).</p>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${intro}<h3 style="margin:16px 0 6px">Client</h3><table>${rows(a, LABELS)}</table><h3 style="margin:16px 0 6px">Projet</h3><table>${rows(sim)}</table><h3 style="margin:16px 0 6px">Justificatifs</h3><ul>${links.map(l => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join("")}</ul><p>Merci de nous tenir informés de la suite donnée à sa demande.<br>Bien cordialement,<br>Mansour Khelifa – NeoDrive (MK HOLDING SAS)</p></div>`;
  const subject = `Dossier client ${ref} – ${a.prenom || ""} ${a.nom || ""} – financement véhicule NeoDrive`;
  if (partners.length) await sendEmail(partners[0], "", subject, html, undefined, { cc: [...partners.slice(1), OWNER_EMAIL], replyTo: OWNER_EMAIL });
  else await sendEmail(OWNER_EMAIL, "NeoDrive", subject, html, undefined, { replyTo: a.email || OWNER_EMAIL });
  return true;
}
