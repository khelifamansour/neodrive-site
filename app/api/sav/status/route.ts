import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SAV_BUCKET, stageOf, timelinePath, type SavTimeline } from "../../../../lib/sav";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

/** Suivi client : référence + e-mail → statut et historique (sans les notes internes). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const ref = String(b.reference || "").trim().toUpperCase(), email = String(b.email || "").trim().toLowerCase();
  if (!ref || !email) return NextResponse.json({ ok: false, error: "Référence et e-mail requis." }, { status: 400 });
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const sb = createClient(SB, sk, { auth: { persistSession: false } });
  const { data, error } = await sb.from("sav_tickets").select("public_reference,status,category,vin,ai_diagnosis,resolution,created_at,updated_at").eq("public_reference", ref).eq("customer_email", email).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "Service momentanément indisponible." }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Aucune demande ne correspond à cette référence et cet e-mail." }, { status: 404 });
  let events: SavTimeline["events"] = [];
  const { data: file } = await sb.storage.from(SAV_BUCKET).download(timelinePath(ref));
  if (file) { try { events = (JSON.parse(await file.text()) as SavTimeline).events || []; } catch { /* ignore */ } }
  if (!events.length) events = [{ at: data.created_at, stage: data.status === "resolved" || data.status === "closed" ? "resolved" : "received", note: data.resolution || undefined }];
  const current = stageOf(events[events.length - 1].stage);
  return NextResponse.json({
    ok: true,
    ticket: { reference: data.public_reference, category: data.category, vin: data.vin, created_at: data.created_at, advice: data.ai_diagnosis },
    stage: { key: current.key, label: current.label, message: current.client },
    events: events.map(e => ({ at: e.at, stage: e.stage, label: stageOf(e.stage).label, note: e.note || "" })),
  });
}
