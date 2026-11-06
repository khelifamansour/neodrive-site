import { NextResponse } from "next/server";
import OpenAI from "openai";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chaque semaine : transforme les vraies questions des clients (WhatsApp/Hana + messages CRM)
 * en sujets d'articles SEO prioritaires (marketing_topics), anonymisés, sans doublon.
 * L'auto-publication quotidienne les rédige ensuite en priorité.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY absente" }, { status: 503 });
  const db = crmDatabase();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [wa, crm, existing] = await Promise.all([
    db.from("whatsapp_ai_processed").select("user_text").gte("created_at", since).not("user_text", "is", null).limit(600),
    db.from("crm_messages").select("body").eq("direction", "inbound").gte("created_at", since).limit(400),
    db.from("marketing_topics").select("topic,primary_keyword").limit(2000),
  ]);
  const questions = [...(wa.data || []).map((r: any) => r.user_text), ...(crm.data || []).map((r: any) => r.body)]
    .map(t => String(t || "").replace(/\+?\d[\d\s.-]{7,}/g, "[tel]").replace(/\S+@\S+/g, "[email]").trim())
    .filter(t => t.length > 12).slice(0, 500);
  if (questions.length < 5) return NextResponse.json({ ok: true, added: 0, reason: "pas assez de questions cette semaine" });
  const known = (existing.data || []).map((t: any) => String(t.topic || "")).slice(0, 300);
  const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await ai.responses.create({ model: process.env.OPENAI_SOCIAL_MODEL || "gpt-4.1-mini", max_output_tokens: 1500, input: [
    { role: "system", content: "Tu es responsable SEO de NeoDrive (voitures sans permis électriques, vente directe, livraison partout en France). À partir de vraies questions de clients (anonymisées), identifie les 6 à 8 questions qui reviennent le plus et que les gens tapent aussi sur Google. Pour chacune, propose un sujet d'article utile et honnête (guide, comparatif factuel, réponse à une question), jamais de superlatif invérifiable ni de dénigrement d'une marque. N'inclus aucune donnée personnelle. Évite les sujets déjà traités fournis. Réponds UNIQUEMENT en JSON : {\"topics\":[{\"topic\":\"titre de l'article\",\"angle\":\"...\",\"target_audience\":\"...\",\"primary_keyword\":\"requête Google principale\",\"secondary_keywords\":[\"...\"],\"search_intent\":\"informationnelle|commerciale|transactionnelle\",\"frequence\":nombre_de_questions_similaires}]}" },
    { role: "user", content: JSON.stringify({ questions, deja_traites: known }) },
  ] });
  let topics: any[] = [];
  try { topics = JSON.parse((r.output_text || "").replace(/^```(json)?|```$/g, "").trim()).topics || []; } catch { return NextResponse.json({ ok: false, error: "Réponse IA illisible" }, { status: 502 }); }
  const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();
  const knownKeys = new Set((existing.data || []).flatMap((t: any) => [key(String(t.topic || "")), key(String(t.primary_keyword || ""))]));
  const rows = topics.filter(t => t?.topic && !knownKeys.has(key(t.topic)) && !knownKeys.has(key(String(t.primary_keyword || "")))).slice(0, 8).map(t => ({
    topic: String(t.topic).slice(0, 200), angle: String(t.angle || "réponse aux questions réelles des clients").slice(0, 300), target_audience: String(t.target_audience || "acheteurs en France").slice(0, 200),
    primary_keyword: String(t.primary_keyword || t.topic).slice(0, 120), secondary_keywords: Array.isArray(t.secondary_keywords) ? t.secondary_keywords.slice(0, 8).map(String) : [],
    search_intent: String(t.search_intent || "informationnelle").slice(0, 40), business_priority: Math.min(100, 80 + Number(t.frequence || 0)), status: "idea", created_by: "questions-clients", times_used: 0,
  }));
  if (rows.length) { const ins = await db.from("marketing_topics").insert(rows); if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 }); }
  console.log("[SEO-QUESTIONS]", { questions: questions.length, added: rows.length });
  return NextResponse.json({ ok: true, questions: questions.length, added: rows.length, topics: rows.map(r => r.topic) });
}
