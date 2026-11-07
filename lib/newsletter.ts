/**
 * Newsletter mensuelle NeoDrive (e-mail) à toute la base Leboncoin.
 * - Une édition par mois (AAAA-MM), rédigée par l'IA à partir des articles du blog, enregistrée dans newsletter_editions.
 * - Envoi à partir du 5 du mois, par lots (plan gratuit Brevo : 300 e-mails/jour au total), pas le dimanche.
 * - Jamais aux désinscrits, ni aux contacts écrits dans les 14 derniers jours (ils sont déjà dans la séquence de bienvenue).
 * - Désinscription en un clic dans chaque e-mail ; copie au fondateur.
 */
import OpenAI from "openai";
import { crmDatabase } from "./crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL, SITE } from "./brevo";
import { btn, layout } from "./multichannel";

const hist = (l: any) => (Array.isArray(l?.history) ? l.history : []);
const validEmail = (e: string | null) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim()) && !/leboncoin/i.test(String(e));
const esc = (t: string) => String(t || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
export const editionOf = (d = new Date()) => d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }).slice(0, 7);

async function getOrCreateEdition(edition: string, store = true) {
  const db = crmDatabase();
  const found = store ? await db.from("newsletter_editions").select("*").eq("edition", edition).maybeSingle() : { data: null };
  if (found.data) return found.data as { edition: string; subject: string; html: string };
  const { data: arts } = await db.from("seo_articles").select("slug,title,excerpt,meta_description").eq("status", "published").order("published_at", { ascending: false }).limit(4);
  const articles = (arts || []).map((a: any) => ({ titre: a.title, resume: a.excerpt || a.meta_description || "", lien: `${SITE}/blog/${a.slug}` }));
  const mois = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
  let subject = `Les nouvelles NeoDrive de ${mois}`;
  let intro = "Voici nos conseils du mois pour bien choisir et bien utiliser une voiture sans permis électrique.";
  let blocs: { titre: string; texte: string; lien?: string }[] = articles.slice(0, 3).map(a => ({ titre: a.titre, texte: a.resume, lien: a.lien }));
  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const r = await ai.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-4.1-mini", max_output_tokens: 900, input: [
        { role: "system", content: "Tu rédiges la newsletter mensuelle de NeoDrive (fabricant de voitures sans permis électriques, vente directe, NeoDrive SWITCH : Essentielle 3 990 €, Confort 4 990 € en stock, Confort Plus+ 5 990 €, carrosserie en acier, jusqu'à 70 km d'autonomie, recharge sur prise classique, livraison partout en France). Ton chaleureux, utile, pas agressif. Ne parle jamais de batterie ni de technique, n'invente aucun chiffre, aucune promotion, aucun avis client. Réponds UNIQUEMENT en JSON : {\"subject\": \"objet court et accrocheur (max 60 caractères, sans emoji au début)\", \"intro\": \"2 phrases\", \"blocs\": [{\"titre\": \"...\", \"texte\": \"3 phrases utiles\", \"lien\": \"un des liens fournis ou vide\"}] } avec exactement 3 blocs : 2 conseils pratiques basés sur les articles fournis, 1 bloc sur la gamme NeoDrive." },
        { role: "user", content: JSON.stringify({ mois, articles }) },
      ] });
      const j = JSON.parse((r.output_text || "").replace(/^```(json)?|```$/g, "").trim());
      if (j?.subject && Array.isArray(j?.blocs) && j.blocs.length) { subject = String(j.subject).slice(0, 80); intro = String(j.intro || intro); blocs = j.blocs.slice(0, 3); }
    } catch (e) { console.error("[NEWSLETTER] IA", e); }
  }
  const body = `<p>Bonjour {{PRENOM}},</p><p>${esc(intro)}</p>
${blocs.map(b => `<h3 style="color:#0b1b33;margin:20px 0 6px">${esc(b.titre)}</h3><p style="margin:0">${esc(b.texte)}${b.lien && b.lien.startsWith(SITE) ? ` <a href="${b.lien}">Lire la suite</a>` : ""}</p>`).join("")}
<p style="margin-top:22px">🎬 <a href="${SITE}/videos"><b>Nos vidéos</b></a> · 📄 <a href="${SITE}/catalogue-neodrive-2026.pdf"><b>Catalogue 2026</b></a></p>
${btn(`${SITE}/reservation-devis`, "Voir mon prix livré")}
<p>Une question ? Répondez simplement à cet e-mail.</p><p>À bientôt,<br><b>L'équipe NeoDrive</b></p>`;
  if (store) await db.from("newsletter_editions").insert({ edition, subject, html: body, topic: blocs.map(b => b.titre).join(" | ") });
  return { edition, subject, html: body };
}

/** Envoie le lot du jour de la newsletter du mois (et une copie au fondateur au premier lot). */
export async function sendNewsletterBatch(limit = Number(process.env.NEWSLETTER_PER_DAY || 150)) {
  if (!brevoReady()) return { skipped: "Brevo pas connecté", sent: 0 };
  const now = new Date();
  const day = Number(now.toLocaleDateString("fr-FR", { day: "numeric", timeZone: "Europe/Paris" }));
  if (now.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }) === "dimanche") return { skipped: "dimanche", sent: 0 };
  if (day < Number(process.env.NEWSLETTER_START_DAY || 5) || limit <= 0) return { skipped: "pas encore la date d'envoi", sent: 0 };
  const edition = editionOf(now);
  if (edition < (process.env.NEWSLETTER_FIRST_EDITION || "2026-12")) return { skipped: "première newsletter en décembre", sent: 0 };
  const ed = await getOrCreateEdition(edition);
  const db = crmDatabase();
  const { data, error } = await db.from("leads").select("id,nom,email,history,last_contact_at").is("opted_out_at", null).not("email", "is", null).order("id", { ascending: true }).limit(10000);
  if (error) throw new Error(error.message);
  const recent = Date.now() - 14 * 86400000;
  const todo = (data || []).filter((l: any) => validEmail(l.email) && !hist(l).some((h: any) => h?.type === "newsletter" && h?.edition === edition) && !(l.last_contact_at && new Date(l.last_contact_at).getTime() > recent)).slice(0, limit);
  const firstBatch = !(data || []).some((l: any) => hist(l).some((h: any) => h?.type === "newsletter" && h?.edition === edition));
  if (firstBatch) { try { await sendEmail(OWNER_EMAIL, "Mansour", `[Copie newsletter ${edition}] ${ed.subject}`, layout(ed.html.replace("{{PRENOM}}", "Mansour"), 0)); } catch (e) { console.error("[NEWSLETTER] copie", e); } }
  let sent = 0, failed = 0;
  for (const l of todo) {
    const p = String(l.nom || "").trim().split(/\s+/)[0] || "";
    const prenom = p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
    try {
      await sendEmail(String(l.email).trim(), String(l.nom || ""), ed.subject, layout(ed.html.replace("Bonjour {{PRENOM}},", prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,"), l.id));
      await db.from("leads").update({ history: [...hist(l), { type: "newsletter", edition, sent_at: new Date().toISOString() }].slice(-60) }).eq("id", l.id);
      sent++;
    } catch (e: any) { failed++; if (e?.fatal) break; }
  }
  return { edition, subject: ed.subject, sent, failed, remainingToday: Math.max(0, todo.length - sent) };
}

/** Aperçu : rédige une newsletter (sans l'enregistrer) et l'envoie au fondateur uniquement. */
export async function sendNewsletterPreview() {
  const ed = await getOrCreateEdition(`apercu-${Date.now()}`, false);
  await sendEmail(OWNER_EMAIL, "Mansour", `[Aperçu newsletter] ${ed.subject}`, layout(ed.html.replace("{{PRENOM}}", "Mansour"), 0));
  return { subject: ed.subject };
}
