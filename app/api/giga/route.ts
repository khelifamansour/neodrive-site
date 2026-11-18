import { NextResponse, after } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { isAuthorized } from "../../../lib/integrations";
import { GIGA_TABLE, buildSnapshot, displayStatus, executeRun, generateNextPlan, normalize, startRun } from "../../../lib/giga";
import { getPlan, listPlans, normalizePlan, savePlan } from "../../../lib/giga-plan";
import { getForecast, saveForecast } from "../../../lib/forecast";
import { runMeta } from "../../../lib/meta-realiste";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Giga Analyse.
 * GET (tâche planifiée, CRON_SECRET) : lance une analyse complète et envoie l'e-mail au fondateur.
 *   ?dry=1 : renvoie seulement la photo interne (aucun appel IA, aucun e-mail, rien d'enregistré).
 * POST { passcode, action: "list" | "get" | "run" } : "list"/"get" pour la section « giga », "run" fondateur seulement.
 * Prévisionnel : "forecast_get" | "forecast_save" {data} (fondateur seulement).
 * Méta-analyse réaliste : "meta_get" (fondateur seulement ; calcul fait côté serveur).
 * Plans annuels : "plan_list" | "plan_get" {year} | "plan_save" {year, plan} (section « giga ») | "plan_next" {from} (fondateur).
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const db = crmDatabase();
  if (new URL(req.url).searchParams.get("dry") === "1") return NextResponse.json({ ok: true, dry: true, internal: await buildSnapshot(db) });
  const s = await startRun(db);
  if (!s.ok) return NextResponse.json({ ok: false, error: s.error, id: s.id }, { status: 409 });
  const r = await executeRun(db, s.id);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}

/** Départements livrés depuis Toulouse / le sud (Serge, Fos). */
const SUD_DEPTS = new Set(["04","05","06","07","09","11","12","13","15","16","17","19","24","26","30","31","32","33","34","40","43","46","47","48","63","64","65","66","81","82","83","84","87","2A","2B"]);

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const acc = await authorizeSection(req, b.passcode, "giga");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "list") {
      const { data, error } = await db.from(GIGA_TABLE).select("id,created_at,period,status,error,cost_tokens,resume:report->resume,meta:report->_meta").order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      const reports = (data || []).map(r => ({ ...r, status: displayStatus(r.status, r.created_at), resume: Array.isArray(r.resume) ? r.resume.slice(0, 2) : [] }));
      return NextResponse.json({ ok: true, reports, who: acc.who, name: acc.name });
    }
    if (b.action === "get") {
      const id = String(b.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false, error: "Rapport introuvable" }, { status: 404 });
      const { data, error } = await db.from(GIGA_TABLE).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ ok: false, error: "Rapport introuvable" }, { status: 404 });
      await logSection(acc, "giga_lecture", { id });
      return NextResponse.json({ ok: true, report: { ...data, status: displayStatus(data.status, data.created_at), report: data.report ? normalize(data.report) : null }, who: acc.who });
    }
    if (b.action === "run") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Seul le fondateur peut lancer une analyse." }, { status: 403 });
      const s = await startRun(db);
      if (!s.ok) return NextResponse.json({ ok: false, error: s.error, id: s.id }, { status: 409 });
      // L'analyse (2 à 4 minutes) continue après la réponse ; la page se met à jour toute seule.
      after(() => executeRun(db, s.id).then(() => undefined));
      return NextResponse.json({ ok: true, id: s.id, started: true });
    }
    if (b.action === "meta_get") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "La méta-analyse réaliste est réservée au fondateur." }, { status: 403 });
      return NextResponse.json({ ok: true, ...runMeta() });
    }
    if (b.action === "sim_history") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "La simulation est réservée au fondateur." }, { status: 403 });
      const { data, error } = await db.from("reservations").select("created_at,statut,code_postal").neq("statut", "Annulée").limit(5000);
      if (error) throw new Error(error.message);
      const parMois: Record<string, number> = {}; let sud = 0, total = 0;
      for (const r of data || []) {
        const m = String(r.created_at).slice(0, 7); parMois[m] = (parMois[m] || 0) + 1;
        const cp = String(r.code_postal || "").trim();
        if (cp.length >= 2) { total++; if (SUD_DEPTS.has(cp.slice(0, 2))) sud++; }
      }
      return NextResponse.json({ ok: true, mois: Object.entries(parMois).sort(([a], [b]) => a.localeCompare(b)).map(([m, n]) => ({ m, n })), part_sud: total ? Math.round(sud / total * 100) : null });
    }
    if (b.action === "forecast_get" || b.action === "forecast_save") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Le prévisionnel est réservé au fondateur." }, { status: 403 });
      if (b.action === "forecast_get") return NextResponse.json({ ok: true, ...(await getForecast(db)), who: acc.who });
      if (!b.data) return NextResponse.json({ ok: false, error: "Données manquantes" }, { status: 400 });
      const data = await saveForecast(db, b.data);
      await logSection(acc, "giga_previsionnel_modifie", {});
      return NextResponse.json({ ok: true, data });
    }
    if (b.action === "plan_list") return NextResponse.json({ ok: true, plans: await listPlans(db), who: acc.who });
    if (b.action === "plan_get") {
      const p = await getPlan(db, Number(b.year));
      if (!p) return NextResponse.json({ ok: false, error: "Plan introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true, ...p, who: acc.who });
    }
    if (b.action === "plan_save") {
      const year = Number(b.year);
      if (!(year >= 2026 && year <= 2100) || !b.plan) return NextResponse.json({ ok: false, error: "Plan invalide" }, { status: 400 });
      const plan = await savePlan(db, year, normalizePlan(b.plan));
      await logSection(acc, "giga_plan_modifie", { year });
      return NextResponse.json({ ok: true, plan });
    }
    if (b.action === "plan_next") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Seul le fondateur peut créer le plan de l'année suivante." }, { status: 403 });
      const from = await getPlan(db, Number(b.from));
      if (!from) return NextResponse.json({ ok: false, error: "Plan de départ introuvable" }, { status: 404 });
      const year = from.year + 1;
      if (await getPlan(db, year)) return NextResponse.json({ ok: false, error: `Le plan ${year} existe déjà.` }, { status: 409 });
      let plan, ai = true;
      try { plan = await generateNextPlan(db, from.plan, year); }
      catch (e) { ai = false; console.error("[GIGA plan_next]", e); plan = { ...from.plan, annee: year, titre: `Plan ${year} (copie du plan ${from.year}, à mettre à jour)`, source: `Copie du plan ${from.year} : la proposition IA a échoué.` }; }
      const saved = await savePlan(db, year, normalizePlan(plan));
      return NextResponse.json({ ok: true, year, ai, plan: saved });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[GIGA]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
