import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authorizeSection, logSection } from "../../../../lib/access";
import { crmDatabase } from "../../../../lib/crm-agent";
import { ANGLES, getProposal, listDays, listProposals, parisDay, planDay, redoProposal, renderNext, renderProposal, saveProposal, usable, type Proposal } from "../../../../lib/fabrique";
import { BUCKET } from "../../../../lib/studio-video";
import { listItems } from "../../../../lib/video-library";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = Record<string, unknown>;
type Db = ReturnType<typeof crmDatabase>;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const dayOf = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : parisDay();
const ai = () => { const k = process.env.OPENAI_API_KEY; return k ? new OpenAI({ apiKey: k }) : null; };

async function withUrls(db: Db, ps: Proposal[]) {
  return Promise.all(ps.map(async p => {
    if (!p.render_path) return { ...p, url: null, downloadUrl: null };
    const name = `neodrive-${p.day}-${p.angle}-${p.id.slice(-4)}.mp4`;
    const [a, b] = await Promise.all([
      db.storage.from(BUCKET).createSignedUrl(p.render_path, 60 * 60 * 12),
      db.storage.from(BUCKET).createSignedUrl(p.render_path, 60 * 60 * 12, { download: name }),
    ]);
    return { ...p, url: a.data?.signedUrl || null, downloadUrl: b.data?.signedUrl || null };
  }));
}

/** Fabrique TikTok (section « contenu ») : propositions du jour, rendus un par un, « refaire », « publiée ». */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Body;
  const acc = await authorizeSection(req, b.passcode, "contenu");
  if (!acc) return fail("Code incorrect", 401);
  const db = crmDatabase(); const action = String(b.action || ""); const day = dayOf(b.day);
  try {
    if (action === "list") {
      const [ps, days, lib] = await Promise.all([listProposals(db, day), listDays(db), listItems(db, { limit: 400 })]);
      return NextResponse.json({
        ok: true, day, today: parisDay(), days: Array.from(new Set([parisDay(), ...days])), angles: ANGLES, proposals: await withUrls(db, ps),
        library: { total: lib.length, usable: lib.filter(usable).length, pending: lib.filter(i => i.status === "uploaded" || i.status === "analysing").length, needConsent: lib.filter(i => i.status === "analysed" && i.has_client && !i.consent).length },
      });
    }
    const client = ai(); if (!client) return fail("Clé IA absente", 503);
    if (action === "plan") {
      const r = await planDay(db, client, day, Math.min(12, Math.max(1, Number(b.count) || 10)));
      await logSection(acc, "fabrique_plan", { day, created: r.created });
      return NextResponse.json({ ok: true, created: r.created, rejected: r.rejected, proposals: await withUrls(db, r.proposals) });
    }
    if (action === "render_next") {
      const r = await renderNext(db, client, day);
      return NextResponse.json({ ok: true, remaining: r.remaining, proposal: r.rendered ? (await withUrls(db, [r.rendered]))[0] : null });
    }
    const id = String(b.id || "");
    if (!/^[a-z0-9]{6,30}$/.test(id)) return fail("Proposition manquante");
    const p = await getProposal(db, id, day);
    if (!p) return fail("Proposition introuvable", 404);
    if (action === "render") {
      await saveProposal(db, { ...p, status: "rendering", attempts: (p.attempts || 0) + 1 });
      try { const r = await renderProposal(db, client, p); return NextResponse.json({ ok: true, proposal: (await withUrls(db, [r]))[0] }); }
      catch (e) { const m = (e as Error).message.slice(0, 300); await saveProposal(db, { ...p, status: "error", error: m }); return fail("Rendu impossible : " + m, 500); }
    }
    if (action === "redo") {
      const feedback = String(b.feedback || "").trim().slice(0, 600);
      if (feedback.length < 3) return fail("Écrivez ce qu’il faut changer.");
      const n = await redoProposal(db, client, p, feedback);
      await logSection(acc, "fabrique_redo", { id });
      return NextResponse.json({ ok: true, proposal: (await withUrls(db, [n]))[0] });
    }
    if (action === "tiktok") {
      // Brouillon TikTok : la vidéo arrive dans la boîte de réception TikTok, le fondateur colle la légende et publie lui-même.
      if (p.status !== "rendered") return fail("La vidéo n’est pas encore fabriquée.");
      const secret = process.env.CRON_SECRET; if (!secret) return fail("Configuration manquante", 503);
      const r = await fetch(`${new URL(req.url).origin}/api/tiktok/publish-reel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: secret, proposalId: p.id, day: p.day, draft: true }), cache: "no-store" });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; note?: string };
      await logSection(acc, "fabrique_tiktok_draft", { id, ok: !!j.ok });
      if (!j.ok) return fail(j.error || "Envoi TikTok impossible", 502);
      return NextResponse.json({ ok: true, note: j.note || "Envoyée dans vos brouillons TikTok." });
    }
    if (action === "update") {
      const n = await saveProposal(db, { ...p, published: b.published === true });
      return NextResponse.json({ ok: true, proposal: (await withUrls(db, [n]))[0] });
    }
    return fail("Action inconnue");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fabrique]", action, msg.slice(0, 400));
    return fail(/timed out|killed|SIGTERM/i.test(msg) ? "Le rendu a pris trop de temps : réessayez." : "Erreur : " + msg.slice(0, 250), 500);
  }
}

/** Tâche planifiée (Vercel Cron) tôt le matin : prépare les propositions du jour, puis rend une vidéo par appel. */
export async function GET(req: Request) {
  const acc = await authorizeSection(req, null, "contenu");
  if (!acc) return fail("Non autorisé", 401);
  const client = ai(); if (!client) return fail("Clé IA absente", 503);
  const db = crmDatabase(); const day = parisDay();
  try {
    const ps = await listProposals(db, day);
    if (!ps.length) { const r = await planDay(db, client, day); return NextResponse.json({ ok: true, step: "plan", created: r.created, rejected: r.rejected }); }
    const r = await renderNext(db, client, day);
    return NextResponse.json({ ok: true, step: "render", rendered: r.rendered?.id || null, remaining: r.remaining });
  } catch (e) { return fail("Erreur : " + (e as Error).message.slice(0, 250), 500); }
}
