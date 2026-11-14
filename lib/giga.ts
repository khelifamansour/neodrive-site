/**
 * Giga Analyse : un analyste IA qui, toutes les 2 semaines, lit les chiffres internes de NeoDrive
 * (agrégés, sans données personnelles), cherche les nouvelles du marché sur le web, puis rédige un rapport
 * (opportunités, menaces, produits à tester, scénarios de croissance) envoyé par e-mail au fondateur.
 * Serveur uniquement.
 *
 * Table Supabase (SQL additif, RLS activé sans politique : accès serveur uniquement) :
 *   giga_reports (id uuid, created_at, period, status 'running'|'done'|'error', internal jsonb, report jsonb,
 *                 sources jsonb, error text, cost_tokens int)
 */
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listJson } from "./datastore";
import { PLAN_CLIENTS, PLAN_TOURS, clientName } from "./fleet";
import type { PlanClient, PlanTour } from "./planif";
import { cleanSettings, compute, type RawData } from "./rentabilite";
import { OWNER_EMAIL, SITE, brevoReady, sendEmail } from "./brevo";
import { applyStoredSecrets } from "./integrations";

export const GIGA_TABLE = "giga_reports";
const RESEARCH_MODEL = process.env.GIGA_RESEARCH_MODEL || "gpt-4.1-mini";
const SYNTH_MODEL = process.env.GIGA_SYNTH_MODEL || "gpt-4.1";
const RUNNING_STALE_MS = 15 * 60 * 1000;

/* ───────────── Types du rapport ───────────── */

export type Opportunite = { titre: string; pourquoi: string; actions: string[]; impact_estime: string; effort: string; horizon: string; sources?: string[] };
export type Menace = { titre: string; pourquoi: string; parade?: string; sources?: string[] };
export type ProduitATester = { produit: string; prix_usine_estime: string; prix_vente_estime: string; marge_estimee: string; sources: string[]; note?: string };
export type Scenario = { nom: string; horizon_annees: number | string; ca_cible: string; etapes: string[]; hypotheses: string[]; risques: string[] };
export type GigaReport = {
  resume: string[];
  chiffres_cles: { libelle: string; valeur: string; commentaire?: string; source?: string }[];
  opportunites: Opportunite[];
  menaces: Menace[];
  produits_a_tester: ProduitATester[];
  marketing: { idee: string; canal?: string; pourquoi?: string; sources?: string[] }[];
  scenarios: Scenario[];
  priorites_2_semaines: string[];
  sources: string[];
  _meta?: { web_search: boolean; tool?: string; topics: { id: string; titre: string; ok: boolean; error?: string }[]; email?: string; models: { research: string; synthesis: string } };
};
export type ResearchNote = { id: string; titre: string; ok: boolean; text: string; sources: { url: string; title?: string }[]; tokens: number; tool: string | null; error?: string };

/* ───────────── Outils ───────────── */

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const dayMs = 86400e3;
const countBy = <T,>(rows: T[], key: (r: T) => unknown) => {
  const out: Record<string, number> = {};
  for (const r of rows) { const k = String(key(r) ?? "") || "inconnu"; out[k] = (out[k] || 0) + 1; }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};
const top = (o: Record<string, number>, n: number) => Object.fromEntries(Object.entries(o).slice(0, n));
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Retire e-mails, numéros (≥ 6 chiffres, même séparés par des espaces/points/tirets) et liens wa.me des messages. */
export function scrub(text: unknown, max = 300): string {
  return String(text ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?\d[\s.\-()/]*){6,}/g, "[numéro] ")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function periodLabel(d = new Date()) {
  return `${d.getDate() <= 15 ? "1re" : "2e"} quinzaine de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ───────────── 1. Photo interne (lecture seule, agrégats uniquement) ───────────── */

type Part<T> = { ok: true; data: T } | { ok: false; error: string };
async function safe<T>(fn: () => Promise<T>): Promise<Part<T>> {
  try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
const must = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return (r.data || []) as T; };

export async function buildSnapshot(db: SupabaseClient) {
  const now = Date.now();
  const iso90 = new Date(now - 90 * dayMs).toISOString(), t30 = now - 30 * dayMs, t60 = now - 60 * dayMs;

  const leads = await safe(async () => {
    // Pas de nom, téléphone ni e-mail : seulement des colonnes de comptage.
    const rows = must(await db.from("leads").select("statut,source,created_at,converted_at,modele_interesse,departement,lead_score").gte("created_at", iso90.slice(0, 19)).limit(10000)) as { statut: string | null; source: string | null; created_at: string; converted_at: string | null; modele_interesse: string | null; departement: string | null; lead_score: number | null }[];
    const total = await db.from("leads").select("id", { count: "exact", head: true });
    const d30 = rows.filter(r => new Date(r.created_at).getTime() >= t30);
    const prev30 = rows.filter(r => { const t = new Date(r.created_at).getTime(); return t >= t60 && t < t30; });
    const conv = (rs: typeof rows) => rs.filter(r => r.converted_at).length;
    return {
      total_depuis_toujours: total.count ?? null,
      jours_30: { nouveaux: d30.length, convertis: conv(d30), par_statut: countBy(d30, r => r.statut), par_source: countBy(d30, r => r.source), modeles: top(countBy(d30.filter(r => r.modele_interesse), r => r.modele_interesse), 8) },
      jours_30_precedents: { nouveaux: prev30.length, convertis: conv(prev30) },
      jours_90: { nouveaux: rows.length, convertis: conv(rows), par_statut: countBy(rows, r => r.statut), par_source: countBy(rows, r => r.source), top_departements: top(countBy(rows.filter(r => r.departement), r => r.departement), 12) },
    };
  });

  const whatsapp = await safe(async () => {
    const rows = must(await db.from("whatsapp_ai_processed").select("status,created_at,user_text").order("created_at", { ascending: false }).limit(3000)) as { status: string | null; created_at: string; user_text: string | null }[];
    const d30 = rows.filter(r => new Date(r.created_at).getTime() >= t30);
    const sample = rows.filter(r => (r.user_text || "").trim().length > 3).slice(0, 80).map(r => scrub(r.user_text, 280)).filter(t => t.replace(/\[(numéro|email)\]/g, "").trim().length > 3);
    return { messages_traites: rows.length, jours_30: d30.length, par_statut: countBy(rows, r => r.status), echantillon_messages_clients: sample };
  });

  const sav = await safe(async () => {
    const rows = must(await db.from("sav_tickets").select("category,sav_status,priority,created_at,closed_at").limit(5000)) as { category: string | null; sav_status: string | null; priority: string | null; created_at: string; closed_at: string | null }[];
    const open = rows.filter(r => !r.closed_at && !["resolu", "clos", "ferme", "annule"].includes(String(r.sav_status || "")));
    return { total: rows.length, ouverts: open.length, jours_30: rows.filter(r => new Date(r.created_at).getTime() >= t30).length, par_categorie: countBy(rows, r => r.category), par_statut: countBy(rows, r => r.sav_status), par_priorite: countBy(rows, r => r.priority) };
  });

  const parts = await safe(async () => {
    const rows = must(await db.from("parts_orders").select("created_at,status,total_ht,shipping_ht,lines").limit(5000)) as { created_at: string; status: string | null; total_ht: number | string | null; shipping_ht: number | string | null; lines: unknown }[];
    const agg: Record<string, { qte: number; ca_ht: number }> = {};
    for (const o of rows) for (const l of Array.isArray(o.lines) ? o.lines as { name?: string; sku?: string; qty?: number; unit_ht?: number }[] : []) {
      const k = String(l.name || l.sku || "?").slice(0, 80); const q = num(l.qty) || 1;
      agg[k] = agg[k] || { qte: 0, ca_ht: 0 }; agg[k].qte += q; agg[k].ca_ht += q * num(l.unit_ht);
    }
    const d30 = rows.filter(r => new Date(r.created_at).getTime() >= t30);
    return {
      commandes: rows.length, jours_30: d30.length, ca_ht_total: Math.round(rows.reduce((s, r) => s + num(r.total_ht), 0)), ca_ht_30j: Math.round(d30.reduce((s, r) => s + num(r.total_ht), 0)),
      par_statut: countBy(rows, r => r.status),
      top_pieces: Object.entries(agg).sort((a, b) => b[1].qte - a[1].qte).slice(0, 12).map(([piece, v]) => ({ piece, qte: v.qte, ca_ht: Math.round(v.ca_ht) })),
    };
  });

  const stock = await safe(async () => {
    const ships = must(await db.from("shipments").select("id,name,status,vehicles,eta,arrived_at,loaded_at,model").order("eta", { ascending: false, nullsFirst: false }).limit(200)) as { id: number; name: string; status: string | null; vehicles: number | null; eta: string | null; arrived_at: string | null; loaded_at: string | null; model: string | null }[];
    const vehicles = must(await db.from("shipment_vehicles").select("status,depot,delivered_at").limit(10000)) as { status: string | null; depot: string | null; delivered_at: string | null }[];
    const delivByMonth: Record<string, number> = {};
    for (const v of vehicles) if (v.delivered_at) { const m = v.delivered_at.slice(0, 7); delivByMonth[m] = (delivByMonth[m] || 0) + 1; }
    return {
      conteneurs_par_statut: countBy(ships, s => s.status),
      conteneurs_recents: ships.slice(0, 8).map(s => ({ nom: s.name, statut: s.status, voitures: s.vehicles, modele: s.model, depart: s.loaded_at, eta: s.eta, arrive: s.arrived_at })),
      voitures_par_statut: countBy(vehicles, v => v.status),
      voitures_par_depot: countBy(vehicles.filter(v => v.depot), v => v.depot),
      livraisons_par_mois: Object.fromEntries(Object.entries(delivByMonth).sort().slice(-12)),
    };
  });

  const logistique = await safe(async () => {
    const rows = must(await db.from("logistics_partners").select("status,category,zone").limit(5000)) as { status: string | null; category: string | null; zone: string | null }[];
    return { partenaires: rows.length, par_statut: countBy(rows, r => r.status), par_categorie: countBy(rows, r => r.category), par_zone: top(countBy(rows, r => r.zone), 10) };
  });

  const rentabilite = await safe(async () => {
    const [ships, docs, vehicles, settings, expenses, partsRows, orders, clients, tours] = await Promise.all([
      db.from("shipments").select("id,name,port,status,vehicles,unit_price,extra_lines,container_list,invoice_part,eta,arrived_at,loaded_at,depot,model").order("eta", { ascending: true, nullsFirst: false }),
      db.from("shipment_docs").select("shipment_id,doc_type,version,created_at,ai_note,file_name").eq("doc_type", "transport"),
      db.from("shipment_vehicles").select("id,shipment_id,vin,container,status,depot,client_id,client_name,depot_at,delivered_at,updated_at").order("vin"),
      db.from("finance_settings").select("value").eq("key", "rentabilite").maybeSingle(),
      db.from("finance_expenses").select("*").limit(2000),
      db.from("parts").select("sku,purchase_price").not("purchase_price", "is", null),
      db.from("parts_orders").select("created_at,updated_at,status,total_ht,shipping_ht,lines").limit(5000),
      listJson<PlanClient>(db, PLAN_CLIENTS), listJson<PlanTour>(db, PLAN_TOURS),
    ]);
    for (const r of [ships, docs, vehicles, settings, expenses, partsRows, orders]) if (r.error) throw new Error(r.error.message);
    const partsCost: Record<string, number> = {};
    for (const p of partsRows.data || []) if (p.sku && Number(p.purchase_price) > 0) partsCost[p.sku] = Number(p.purchase_price);
    const raw: RawData = {
      ships: (ships.data || []) as RawData["ships"], docs: (docs.data || []) as RawData["docs"], vehicles: (vehicles.data || []) as RawData["vehicles"],
      clients: clients.filter(c => !String(c.note || "").startsWith("TEST")).map(c => ({ id: c.id, modele: c.modele, code_postal: c.code_postal, total: c.total, status: c.status, tour_id: c.tour_id || null, name: clientName(c) })),
      tours: tours.map(t => ({ id: t.id, name: t.name, status: t.status, clients: (t.clientIds || []).length, cost: t.costs?.total ?? null })),
      partsOrders: (orders.data || []) as RawData["partsOrders"], partsCost, expenses: (expenses.data || []) as RawData["expenses"],
    };
    const r = compute(raw, cleanSettings(settings.data?.value));
    const rd = (n: number) => Math.round(n || 0);
    // Seulement des montants agrégés (aucun nom de client).
    return {
      avertissement: "Estimation de pilotage (page /rentabilite), pas une comptabilité officielle.",
      marge_moyenne_par_voiture_eur: rd(r.avgMarginPerCar), voitures_pour_couvrir_les_frais_fixes: r.breakEvenCars, frais_fixes_mensuels_ht: rd(r.recurringMonthlyHt),
      annee: { ...r.ytd, carsMargin: rd(r.ytd.carsMargin), partsMargin: rd(r.ytd.partsMargin), fixed: rd(r.ytd.fixed), net: rd(r.ytd.net) },
      stock: { ...r.stock, expectedMargin: rd(r.stock.expectedMargin) },
      derniers_mois: r.months.slice(-6).map(m => ({ mois: m.month, voitures_livrees: m.carsDelivered, ca_voitures_ht: rd(m.carsRevenueHt), marge_voitures: rd(m.carsMargin), marge_pieces: rd(m.partsMargin), frais: rd(m.recurringHt + m.expensesHt), resultat: rd(m.net) })),
    };
  });

  const pick = <T,>(p: Part<T>) => (p.ok ? p.data : { indisponible: p.error });
  return {
    genere_le: new Date(now).toISOString(),
    prospects: pick(leads), whatsapp_hana: pick(whatsapp), sav: pick(sav), pieces: pick(parts),
    stock_conteneurs: pick(stock), logistique: pick(logistique), rentabilite: pick(rentabilite),
  };
}
export type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;

/* ───────────── 2. Recherche externe (OpenAI + recherche web) ───────────── */

const CONTEXT = `NeoDrive (MK HOLDING, Muret, Haute-Garonne, France) importe de Chine des voitures sans permis électriques (catégorie L6e, 45 km/h) et les vend en direct aux particuliers partout en France (environ 7 à 8 voitures par mois, marge d'environ 1 500 € par voiture, frais fixes très faibles, gamme à partir de 3 990 € TTC). Projets de nouvelles gammes : dumpers / brouettes électriques, mini-chargeuses, débroussailleuses radiocommandées, chariots plateformes, tables élévatrices, gerbeurs électriques, utilitaire NeoDrive Pro Pick-Up, tricycles, scooter Caméléon. Ambition du fondateur : utiliser la trésorerie des voitures pour bâtir une entreprise bien plus grande (scénarios jusqu'à 100–200 M€ de chiffre d'affaires).`;

export const TOPICS: { id: string; titre: string; q: string }[] = [
  { id: "vsp_marche", titre: "Marché voiture sans permis et concurrents", q: "Actualité récente (3 derniers mois) du marché français de la voiture sans permis : immatriculations, tendances, nouveaux modèles. Prix publics actuels de Aixam, Ligier/Microcar, Citroën Ami, Fiat Topolino, Mobilize Duo, et des importateurs de modèles chinois en France. Donne des prix en € TTC quand tu les trouves." },
  { id: "reglementation", titre: "Réglementation", q: "Changements récents ou annoncés en France/UE concernant les quadricycles L6e/L7e, le permis AM / BSR, l'âge minimum, l'assurance des voitures sans permis, le bonus écologique / prime pour les véhicules électriques légers, l'homologation des véhicules importés de Chine, et les droits de douane UE sur les véhicules électriques chinois." },
  { id: "machines", titre: "Utilitaires électriques et petites machines", q: "Marché en France des petites machines électriques : dumpers / brouettes électriques, mini-chargeuses, débroussailleuses radiocommandées, chariots plateformes, tables élévatrices, gerbeurs électriques, petits utilitaires électriques type pick-up L7e. Taille de marché, clients (paysagistes, BTP, agriculteurs, collectivités), prix de vente en France, distributeurs et concurrents." },
  { id: "sourcing", titre: "Tendances Alibaba / AliExpress / Made-in-China", q: "D'après des articles et résultats de recherche (sans visiter les fiches produits), quels produits électriques de ces familles sont en tendance chez les fabricants chinois (Alibaba, Made-in-China, AliExpress) : mini dumpers électriques, débroussailleuses radiocommandées, gerbeurs électriques, tables élévatrices, mini voitures électriques basse vitesse, tricycles électriques cargo. Fourchettes de prix usine (FOB, en USD) quand elles sont citées." },
  { id: "macro", titre: "Conjoncture française", q: "Derniers chiffres pour la France : inflation (INSEE), taux des crédits à la consommation et des crédits auto, prix des carburants (gazole, SP95), chômage, moral des ménages. Que disent-ils de la demande pour un petit véhicule électrique économique ?" },
  { id: "social", titre: "Réseaux sociaux", q: "Tendances actuelles sur TikTok, Instagram Reels et YouTube Shorts autour des voitures sans permis, des mini véhicules électriques et des petites machines électriques (formats viraux, influenceurs, hashtags, angles qui marchent auprès des jeunes de 14-18 ans, des parents et des seniors) en France." },
];

function extractSources(resp: unknown): { url: string; title?: string }[] {
  const out = new Map<string, string | undefined>();
  const items = ((resp as { output?: unknown[] })?.output || []) as Record<string, unknown>[];
  for (const it of items) {
    if (it.type === "message") for (const c of (it.content as Record<string, unknown>[]) || []) for (const a of (c.annotations as Record<string, unknown>[]) || []) {
      if (a.type === "url_citation" && typeof a.url === "string") out.set(a.url, typeof a.title === "string" ? a.title : undefined);
    }
    if (it.type === "web_search_call") for (const s of (((it.action as Record<string, unknown>)?.sources) as Record<string, unknown>[]) || []) if (typeof s.url === "string" && !out.has(s.url)) out.set(s.url, undefined);
  }
  return [...out].map(([url, title]) => ({ url: url.replace(/[?&]utm_source=openai$/, ""), title })).slice(0, 25);
}

async function researchOne(client: OpenAI, t: (typeof TOPICS)[number], tools: string[]): Promise<ResearchNote> {
  const input = `${CONTEXT}\n\nTu es analyste marché pour NeoDrive. Fais une recherche web et réponds en français simple.\nSujet : ${t.titre}\nQuestion : ${t.q}\n\nRègles : 8 à 15 puces factuelles et datées, chiffres précis (prix, volumes, dates). Chaque puce doit citer sa source (lien). Distingue clairement les faits sourcés et tes estimations (écris « estimation »). Termine par 2 lignes « Ce que ça veut dire pour NeoDrive ». 450 mots maximum.`;
  let lastErr = "";
  for (const tool of [...tools, null]) {
    try {
      const resp = await client.responses.create({
        model: RESEARCH_MODEL, input, max_output_tokens: 1800,
        ...(tool ? { tools: [{ type: tool, search_context_size: "medium", user_location: { type: "approximate", country: "FR" } }] as never } : {}),
      }, { timeout: 150_000, maxRetries: 0 });
      return { id: t.id, titre: t.titre, ok: true, text: (resp.output_text || "").slice(0, 6000), sources: extractSources(resp), tokens: resp.usage?.total_tokens || 0, tool, error: tool ? undefined : `recherche web indisponible (${lastErr.slice(0, 160)})` };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      // Erreur liée à l'outil : on essaie l'outil suivant ; sinon (timeout, quota) on s'arrête.
      if (!/tool|web_search|unsupported|not supported|invalid/i.test(lastErr)) break;
    }
  }
  return { id: t.id, titre: t.titre, ok: false, text: "", sources: [], tokens: 0, tool: null, error: lastErr.slice(0, 300) };
}

export async function research(client: OpenAI) {
  const tools = ["web_search", "web_search_preview"];
  return Promise.all(TOPICS.map(t => researchOne(client, t, tools)));
}

/* ───────────── 3. Synthèse ───────────── */

const SHAPE = `{
 "resume": ["5 lignes maximum, phrases courtes"],
 "chiffres_cles": [{"libelle": "", "valeur": "", "commentaire": "", "source": "URL ou 'interne'"}],
 "opportunites": [{"titre": "", "pourquoi": "", "actions": [""], "impact_estime": "ex. +2 voitures/mois soit ~3 000 € de marge (estimation)", "effort": "faible|moyen|fort", "horizon": "2 semaines|3 mois|1 an|3 ans+", "sources": ["URL"]}],
 "menaces": [{"titre": "", "pourquoi": "", "parade": "", "sources": ["URL"]}],
 "produits_a_tester": [{"produit": "", "prix_usine_estime": "", "prix_vente_estime": "", "marge_estimee": "", "sources": ["URL"], "note": ""}],
 "marketing": [{"idee": "", "canal": "", "pourquoi": "", "sources": ["URL"]}],
 "scenarios": [{"nom": "", "horizon_annees": 3, "ca_cible": "", "etapes": [""], "hypotheses": [""], "risques": [""]}],
 "priorites_2_semaines": ["5 maximum, très concrètes"],
 "sources": ["toutes les URL citées"]
}`;

export async function synthesize(client: OpenAI, snapshot: Snapshot, notes: ResearchNote[]) {
  const web = notes.some(n => n.ok && n.tool);
  const research = notes.map(n => `### ${n.titre}${n.ok ? "" : " (ÉCHEC : " + (n.error || "") + ")"}\n${n.text || "(rien)"}\nSources : ${n.sources.map(s => s.url).join(" ; ") || "aucune"}`).join("\n\n");
  const input = `${CONTEXT}

Tu es « Giga Analyse », l'analyste stratégique du fondateur de NeoDrive. Il lit en français simple : phrases courtes, pas de jargon.
Tu reçois (1) la photo interne de l'entreprise (chiffres agrégés, aucune donnée personnelle) et (2) des notes de recherche web avec leurs sources.
${web ? "" : "ATTENTION : la recherche web n'a pas fonctionné pour cette analyse. Dis-le clairement dans le résumé et ne présente aucun fait externe comme vérifié."}

Règles :
- Chaque affirmation externe doit porter une URL de source tirée des notes. N'invente aucune URL.
- Toute estimation (prix, marge, impact, volume) est marquée « (estimation) ».
- Les chiffres internes viennent de la photo interne : cite-les précisément, signale les tendances (30 j vs 30 j précédents) et les anomalies (ex. beaucoup de prospects « Nouveau » jamais contactés).
- 4 à 7 opportunités, 3 à 6 menaces, 3 à 6 produits à tester (prix usine en USD FOB et prix de vente France en € TTC, marge par unité), 4 à 6 idées marketing.
- Scénarios : au moins 4 — « Consolider les voitures » (1–2 ans), « 10 M€ », « 50 M€ », « 100–200 M€ ». Sois honnête sur ce que chacun exige : produits, pays, réseau de distribution (concessionnaires, agents, B2B), financement (fonds propres, dette, levée), équipe, stocks, SAV. Donne des ordres de grandeur réalistes (ex. 10 M€ ≈ X voitures/an ou mix produits) marqués « estimation ».
- priorites_2_semaines : 5 actions maximum, concrètes, faisables par une très petite équipe.
- Réponds uniquement en json valide, exactement avec cette forme :
${SHAPE}

=== PHOTO INTERNE (json) ===
${JSON.stringify(snapshot).slice(0, 45000)}

=== NOTES DE RECHERCHE WEB ===
${research.slice(0, 40000)}`;
  const resp = await client.responses.create({ model: SYNTH_MODEL, input, max_output_tokens: 8000, text: { format: { type: "json_object" } } }, { timeout: 140_000, maxRetries: 0 });
  const raw = resp.output_text || "";
  let report: GigaReport;
  try { report = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("Réponse IA illisible"); report = JSON.parse(m[0]); }
  return { report: normalize(report), tokens: resp.usage?.total_tokens || 0 };
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : v ? [v as T] : []);
const strs = (v: unknown) => arr<unknown>(v).map(x => (typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean);
export function normalize(r: Partial<GigaReport> | null | undefined): GigaReport {
  const x = (r || {}) as Record<string, unknown>;
  return {
    resume: typeof x.resume === "string" ? x.resume.split(/\n+/).filter(Boolean) : strs(x.resume),
    chiffres_cles: arr<GigaReport["chiffres_cles"][number] | string>(x.chiffres_cles).map(c => typeof c === "string" ? { libelle: c, valeur: "" } : c),
    opportunites: arr<Opportunite>(x.opportunites).map(o => ({ ...o, actions: strs(o.actions), sources: strs(o.sources) })),
    menaces: arr<Menace | string>(x.menaces).map(m => typeof m === "string" ? { titre: m, pourquoi: "" } : { ...m, sources: strs(m.sources) }),
    produits_a_tester: arr<ProduitATester>(x.produits_a_tester).map(p => ({ ...p, sources: strs(p.sources) })),
    marketing: arr<GigaReport["marketing"][number] | string>(x.marketing).map(m => typeof m === "string" ? { idee: m } : { ...m, sources: strs(m.sources) }),
    scenarios: arr<Scenario>(x.scenarios).map(s => ({ ...s, etapes: strs(s.etapes), hypotheses: strs(s.hypotheses), risques: strs(s.risques) })),
    priorites_2_semaines: strs(x.priorites_2_semaines).slice(0, 5),
    sources: strs(x.sources),
    _meta: x._meta as GigaReport["_meta"],
  };
}

/* ───────────── 4. Exécution complète ───────────── */

/** Crée la ligne « en cours ». Refuse s'il y a déjà une analyse en cours depuis moins de 15 minutes. */
export async function startRun(db: SupabaseClient) {
  const { data: running } = await db.from(GIGA_TABLE).select("id,created_at").eq("status", "running").gte("created_at", new Date(Date.now() - RUNNING_STALE_MS).toISOString()).limit(1);
  if (running?.length) return { ok: false as const, error: "Une analyse est déjà en cours.", id: running[0].id as string };
  const { data, error } = await db.from(GIGA_TABLE).insert({ period: periodLabel(), status: "running" }).select("id").single();
  if (error) throw new Error(error.message);
  return { ok: true as const, id: data.id as string };
}

export async function executeRun(db: SupabaseClient, id: string, opts: { email?: boolean } = {}) {
  try {
    const internal = await buildSnapshot(db);
    await db.from(GIGA_TABLE).update({ internal }).eq("id", id);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Clé OpenAI absente (OPENAI_API_KEY)");
    const client = new OpenAI({ apiKey });
    const notes = await research(client);
    const { report, tokens } = await synthesize(client, internal, notes);
    const web = notes.some(n => n.ok && n.tool);
    const allSources = [...new Set([...report.sources, ...notes.flatMap(n => n.sources.map(s => s.url))])].slice(0, 120);
    report.sources = allSources;
    report._meta = { web_search: web, tool: notes.find(n => n.tool)?.tool || undefined, topics: notes.map(n => ({ id: n.id, titre: n.titre, ok: n.ok && !!n.tool, error: n.error })), models: { research: RESEARCH_MODEL, synthesis: SYNTH_MODEL } };
    const cost = tokens + notes.reduce((s, n) => s + n.tokens, 0);
    const sources = notes.map(n => ({ sujet: n.titre, sources: n.sources }));
    if (opts.email !== false) report._meta.email = await emailOwner(id, report).catch(e => `échec : ${(e as Error).message}`);
    const { error } = await db.from(GIGA_TABLE).update({ status: "done", report, sources, cost_tokens: cost, error: web ? null : "Recherche web indisponible : rapport basé surtout sur les chiffres internes." }).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GIGA]", id, msg);
    await db.from(GIGA_TABLE).update({ status: "error", error: msg.slice(0, 1000) }).eq("id", id);
    return { ok: false, id, error: msg };
  }
}

/** Statut affiché : une analyse « en cours » depuis trop longtemps est considérée comme interrompue. */
export const displayStatus = (status: string, createdAt: string) => status === "running" && Date.now() - new Date(createdAt).getTime() > RUNNING_STALE_MS ? "interrupted" : status;

/* ───────────── 5. E-mail au fondateur ───────────── */

export function emailHtml(id: string, r: GigaReport, period = periodLabel()) {
  const url = `${SITE}/giga/${id}`;
  const li = (xs: string[]) => xs.map(x => `<li style="margin:0 0 6px">${esc(x)}</li>`).join("");
  const opps = r.opportunites.slice(0, 4).map(o => `<div style="border:1px solid #eee;border-radius:12px;padding:12px 14px;margin:0 0 10px"><b>${esc(o.titre)}</b><div style="color:#555;font-size:14px;margin:4px 0">${esc(o.pourquoi)}</div><div style="font-size:13px;color:#0a7a3d">Impact : ${esc(o.impact_estime)} · Effort : ${esc(o.effort)} · ${esc(o.horizon)}</div></div>`).join("");
  const threats = r.menaces.slice(0, 3).map(m => `<li style="margin:0 0 6px"><b>${esc(m.titre)}</b> — ${esc(m.pourquoi)}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#141414;line-height:1.45">
<p style="color:#f05a28;font-weight:800;margin:0">🧠 GIGA ANALYSE · ${esc(period)}</p>
<h2 style="margin:6px 0 12px">Ce qu’il faut retenir</h2><ul style="padding-left:18px">${li(r.resume.slice(0, 5))}</ul>
${r.priorites_2_semaines.length ? `<h3 style="margin:18px 0 8px">✅ Priorités des 2 prochaines semaines</h3><ol style="padding-left:18px">${li(r.priorites_2_semaines)}</ol>` : ""}
${opps ? `<h3 style="margin:18px 0 8px">🚀 Opportunités</h3>${opps}` : ""}
${threats ? `<h3 style="margin:18px 0 8px">⚠️ Menaces</h3><ul style="padding-left:18px">${threats}</ul>` : ""}
${r._meta && !r._meta.web_search ? `<p style="color:#b42318">La recherche web n’a pas fonctionné cette fois : le rapport s’appuie surtout sur les chiffres internes.</p>` : ""}
<p style="margin:22px 0"><a href="${esc(url)}" style="background:#f05a28;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800">Lire le rapport complet</a></p>
<p style="color:#888;font-size:12px">Rapport généré par IA : les estimations sont indiquées comme telles, vérifiez les sources avant une décision importante.</p></div>`;
}

async function emailOwner(id: string, r: GigaReport) {
  await applyStoredSecrets();
  if (!brevoReady()) return "non envoyé : Brevo non connecté";
  await sendEmail(OWNER_EMAIL, "Mansour", `🧠 Giga Analyse — ${periodLabel()}`, emailHtml(id, r));
  return "envoyé";
}
