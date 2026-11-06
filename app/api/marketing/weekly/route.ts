import { NextResponse } from "next/server";
import OpenAI from "openai";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { whatsappOwner } from "../../../../lib/package-sender";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Agent marketing : bilan de la semaine + plan d'action, chaque lundi matin (WhatsApp + e-mail). */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const daily = new URL(req.url).searchParams.get("period") === "day";
  const db = crmDatabase();
  const since = new Date(Date.now() - (daily ? 1 : 7) * 86400000).toISOString();
  const [leadsNew, leadsAll, replies, seo, social] = await Promise.all([
    db.from("leads").select("id,source", { count: "exact" }).gte("created_at", since),
    db.from("leads").select("statut,history").limit(5000),
    db.from("whatsapp_ai_processed").select("phone").gte("created_at", since).limit(5000),
    db.from("seo_articles").select("title,slug").gte("published_at", since).limit(20),
    db.from("social_content_queue").select("platform,status").gte("updated_at", since).limit(2000),
  ]);
  const hist = (l: any) => (Array.isArray(l?.history) ? l.history : []);
  const sentWeek = (type: string) => (leadsAll.data || []).filter((l: any) => hist(l).some((h: any) => h?.type === type && h?.sent_at >= since)).length;
  const byStatus: Record<string, number> = {}; for (const l of leadsAll.data || []) byStatus[(l as any).statut || "?"] = (byStatus[(l as any).statut || "?"] || 0) + 1;
  const soc: Record<string, number> = {}; for (const r of social.data || []) { const k = `${(r as any).platform} ${(r as any).status}`; soc[k] = (soc[k] || 0) + 1; }
  const m = {
    nouveauxContacts: leadsNew.count || 0, packages: sentWeek("package"), relances: sentWeek("relance"), emails: sentWeek("email"), sms: sentWeek("sms"),
    clientsAyantRepondu: new Set((replies.data || []).map((r: any) => r.phone)).size, chauds: byStatus["Chaud"] || 0, clients: (byStatus["Client"] || 0) + (byStatus["Livré"] || 0),
    pagesSeoPubliees: (seo.data || []).map((a: any) => a.title), reseaux: soc,
  };
  let plan = "";
  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const r = await ai.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-4.1-mini", max_output_tokens: daily ? 700 : 500, input: [{ role: "system", content: (daily ? "MODE QUOTIDIEN : à partir des chiffres des dernières 24 h, donne 3 actions concrètes pour AUJOURD'HUI (chacune en 1 ligne, faisable en moins de 30 min), puis un texte d'annonce Leboncoin prêt à copier (titre + 5 lignes, honnête, sans superlatif invérifiable), puis une idée de vidéo TikTok/Reel de 15 secondes (accroche + plans). " : "") + "Tu es le responsable marketing de NeoDrive (voitures sans permis électriques, fabricant en vente directe, 3 990 à 5 990 €, 0 € d'acompte, carrosserie acier, livraison partout en France, concurrents : VoltandGo, Citroën Ami, Aixam, Ligier, Fiat Topolino). À partir des chiffres de la semaine, donne 5 actions concrètes et chiffrées pour la semaine qui vient (Leboncoin, Facebook/Instagram/TikTok, SEO, WhatsApp, publicité Meta), en français simple, une ligne chacune, sans inventer de chiffres absents." }, { role: "user", content: JSON.stringify(m) }] });
      plan = (r.output_text || "").trim();
    } catch (e) { console.error("[MARKETING] IA", e); }
  }
  const text = `${daily ? "☀️ Brief marketing du jour (dernières 24 h)" : "📈 Bilan marketing NeoDrive (7 derniers jours)"}\n\n• Nouveaux contacts : ${m.nouveauxContacts}\n• Packages WhatsApp : ${m.packages} · relances : ${m.relances} · e-mails : ${m.emails} · SMS : ${m.sms}\n• Clients qui ont répondu à Hana : ${m.clientsAyantRepondu}\n• Clients chauds : ${m.chauds} · clients : ${m.clients}\n• Pages SEO publiées : ${m.pagesSeoPubliees.length}\n• Réseaux sociaux : ${Object.entries(m.reseaux).map(([k, v]) => `${k} ${v}`).join(", ") || "rien"}\n\n${plan ? (daily ? "🎯 Aujourd'hui :\n" : "🎯 Plan de la semaine :\n") + plan : ""}`;
  const wa = await whatsappOwner(text, daily ? "Brief du jour" : "Bilan marketing").catch(() => false);
  let mail = false;
  if (brevoReady() && !daily) { try { await sendEmail(OWNER_EMAIL, "Mansour", "NeoDrive — bilan marketing de la semaine", `<pre style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`); mail = true; } catch (e) { console.error("[MARKETING] mail", e); } }
  console.log("[MARKETING] weekly", { wa, mail });
  return NextResponse.json({ ok: true, whatsapp: wa, email: mail, metrics: m });
}
