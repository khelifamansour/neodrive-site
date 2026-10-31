import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SAV_BUCKET, SAV_STAGES, stageOf, timelinePath, type SavStageKey, type SavTimeline } from "../../../../lib/sav";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

type Attachment = { name: string; type?: string; size?: number; path: string; bucket?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readTimeline(sb: any, ref: string): Promise<SavTimeline | null> {
  const { data } = await sb.storage.from(SAV_BUCKET).download(timelinePath(ref));
  if (!data) return null;
  try { return JSON.parse(await data.text()) as SavTimeline; } catch { return null; }
}

/** Espace NeoDrive : liste des demandes, médias, mise à jour du suivi. Protégé par le code CRON_SECRET (le même que /erp). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || b.passcode !== secret) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const sb = createClient(SB, sk, { auth: { persistSession: false } });

  if (b.action === "list") {
    const { data, error } = await sb.from("sav_tickets").select("public_reference,status,customer_name,customer_email,customer_phone,vin,category,error_code,description,ai_diagnosis,resolution,attachments,created_at,updated_at").order("created_at", { ascending: false }).limit(80);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const tickets = await Promise.all((data || []).map(async t => {
      const tl = await readTimeline(sb, t.public_reference);
      const events = tl?.events || [{ at: t.created_at, stage: (t.status === "resolved" || t.status === "closed" ? "resolved" : "received") as SavStageKey }];
      const stage = events[events.length - 1].stage;
      return { ...t, stage, stageLabel: stageOf(stage).label, events };
    }));
    return NextResponse.json({ ok: true, stages: SAV_STAGES.map(s => ({ key: s.key, label: s.label })), tickets });
  }

  if (b.action === "media") {
    const ref = String(b.ref || "");
    const { data } = await sb.from("sav_tickets").select("attachments").eq("public_reference", ref).maybeSingle();
    const att = (data?.attachments || []) as Attachment[];
    const media = [];
    for (const a of att) { const { data: s } = await sb.storage.from(a.bucket || SAV_BUCKET).createSignedUrl(a.path, 3600); if (s?.signedUrl) media.push({ name: a.name, type: a.type || "", url: s.signedUrl }); }
    return NextResponse.json({ ok: true, media });
  }

  if (b.action === "update") {
    const ref = String(b.ref || "");
    const stage = SAV_STAGES.find(s => s.key === b.stage);
    if (!ref || !stage) return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
    const { data: t } = await sb.from("sav_tickets").select("public_reference,created_at,status").eq("public_reference", ref).maybeSingle();
    if (!t) return NextResponse.json({ ok: false, error: "Demande introuvable" }, { status: 404 });
    const tl = (await readTimeline(sb, ref)) || { ref, folder: "", events: [{ at: t.created_at, stage: "received" as SavStageKey }] };
    const note = String(b.note || "").trim().slice(0, 2000), internal = String(b.internal || "").trim().slice(0, 2000);
    tl.events.push({ at: new Date().toISOString(), stage: stage.key, note: note || undefined, internal: internal || undefined });
    const { error: upErr } = await sb.storage.from(SAV_BUCKET).upload(timelinePath(ref), Buffer.from(JSON.stringify(tl, null, 2)), { contentType: "application/json", upsert: true });
    if (upErr) return NextResponse.json({ ok: false, error: "Enregistrement impossible : " + upErr.message }, { status: 500 });
    // Statut de la table (compatibilité ERP). Si la base refuse la valeur fine, on garde « open ».
    const patch: Record<string, unknown> = { status: stage.status, updated_at: new Date().toISOString() };
    if (note) patch.resolution = note;
    if (stage.key === "resolved") patch.closed_at = new Date().toISOString();
    let { error } = await sb.from("sav_tickets").update(patch).eq("public_reference", ref);
    if (error && stage.status === "in_progress") ({ error } = await sb.from("sav_tickets").update({ ...patch, status: "open" }).eq("public_reference", ref));
    return NextResponse.json({ ok: true, stage: stage.key, tableUpdated: !error, warning: error ? error.message : null });
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
