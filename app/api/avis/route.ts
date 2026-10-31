import { NextResponse } from "next/server";
import { isAuthorized, serviceClient } from "../../../lib/integrations";
import { ALERT_ENDPOINT, waNumber } from "../../../lib/sav";
import { reviewMessage } from "../../../lib/reviews";

export const dynamic = "force-dynamic";
const SITE = "https://www.easydrive-auto.fr";
const BUCKET = "erp-documents", PATH = "avis/demandes.json";

type Row = { vehicle_id: string; name: string; phone: string; email: string; delivered_at: string; city: string; requested: boolean; wa: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function load(sb: any, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: vehicles } = await sb.from("vehicles").select("id,delivered_at,location_label,current_customer_id").eq("status", "delivered").gte("delivered_at", since).order("delivered_at", { ascending: false }).limit(50);
  const ids = [...new Set((vehicles || []).map((v: { current_customer_id: string | null }) => v.current_customer_id).filter(Boolean))];
  const { data: customers } = ids.length ? await sb.from("customers").select("id,first_name,last_name,phone,email,city").in("id", ids) : { data: [] };
  let sent: Record<string, string> = {};
  const { data: f } = await sb.storage.from(BUCKET).download(PATH);
  if (f) { try { sent = JSON.parse(await f.text()); } catch { /* ignore */ } }
  const rows: Row[] = (vehicles || []).map((v: { id: string; delivered_at: string; location_label: string | null; current_customer_id: string | null }) => {
    const c = (customers || []).find((x: { id: string }) => x.id === v.current_customer_id) || {};
    const first = String(c.first_name || "").trim();
    return { vehicle_id: v.id, name: `${first} ${c.last_name || ""}`.trim() || "Client", phone: c.phone || "", email: c.email || "", delivered_at: v.delivered_at, city: c.city || v.location_label || "", requested: !!sent[v.id], wa: c.phone ? `https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(reviewMessage(first))}` : "" };
  });
  return { rows, sent };
}

/** Espace NeoDrive (/avis) : livraisons récentes + demande d'avis en un clic. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!isAuthorized(req, b.passcode)) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  if (b.action === "mark" && b.vehicleId) {
    const { sent } = await load(sb, 1);
    sent[String(b.vehicleId)] = new Date().toISOString();
    await sb.storage.from(BUCKET).upload(PATH, Buffer.from(JSON.stringify(sent)), { contentType: "application/json", upsert: true });
    return NextResponse.json({ ok: true });
  }
  const { rows } = await load(sb, 30);
  return NextResponse.json({ ok: true, rows, message: reviewMessage("Prénom") });
}

/** Cron quotidien : e-mail avec les clients livrés récemment à qui demander un avis. */
export async function GET(req: Request) {
  if (!isAuthorized(req, new URL(req.url).searchParams.get("passcode") || undefined)) return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  const { rows } = await load(sb, 3);
  const todo = rows.filter(r => !r.requested);
  if (!todo.length) return NextResponse.json({ ok: true, todo: 0, sent: false });
  const lines = todo.map(r => `• ${r.name}${r.city ? ` (${r.city})` : ""} — livré le ${new Date(r.delivered_at).toLocaleDateString("fr-FR")}\n  ${r.wa ? "Demander l’avis sur WhatsApp : " + r.wa : "Pas de téléphone enregistré"}`);
  const res = await fetch(ALERT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Referer: SITE + "/avis", Origin: SITE }, body: JSON.stringify({ _subject: `⭐ ${todo.length} client${todo.length > 1 ? "s" : ""} à qui demander un avis Google`, clients: lines.join("\n\n"), astuce: "Touchez le lien WhatsApp : le message est déjà écrit, il suffit d’envoyer.", suivi: `${SITE}/avis` }) }).catch(() => null);
  return NextResponse.json({ ok: true, todo: todo.length, sent: !!res?.ok });
}
