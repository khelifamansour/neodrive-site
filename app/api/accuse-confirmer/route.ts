import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { checksFor, cleanPayment, driverDisplay, type ReceiptData } from "../../../lib/delivery-receipt";
import { listJson } from "../../../lib/datastore";
import { PLAN_TOURS } from "../../../lib/fleet";
import type { PlanTour } from "../../../lib/planif";
import { finalizeDelivery } from "../../../lib/delivery-finalize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const TOKEN = /^[a-f0-9]{48}$/;

/** Confirmation à distance de la réception du véhicule, par le client, via son lien personnel (sans compte). */
async function find(token: string) {
  if (!TOKEN.test(token)) return null;
  const { data } = await crmDatabase().from("reservations").select("*").eq("confirm_token", token).maybeSingle();
  return data;
}

/** Chauffeur de la tournée qui contient ce client (pour les espèces déclarées). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tourDriver(r: any): Promise<string> {
  if (!r?.plan_client_id) return "";
  try {
    const tours = await listJson<PlanTour>(crmDatabase(), PLAN_TOURS);
    const t = tours.filter(x => x.clientIds?.includes(r.plan_client_id)).sort((a, z) => String(z.date).localeCompare(String(a.date)))[0];
    return driverDisplay((t as { driver?: string } | undefined)?.driver || "");
  } catch { return ""; }
}

export async function GET(req: Request) {
  const r = await find(new URL(req.url).searchParams.get("token") || "");
  if (!r) return NextResponse.json({ ok: false, error: "Lien invalide ou expiré." }, { status: 404 });
  const pending = !r.paiement_confirme_at && !!r.paiement_en_attente;
  return NextResponse.json({
    ok: true, done: !!r.accuse_token, accuse_url: r.accuse_token ? `/api/accuse/${r.accuse_token}` : null,
    client: `${r.prenom || ""} ${r.nom || ""}`.replace(/\(.*?\)/g, "").trim(), modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin || "",
    date: new Date().toISOString(), pending, montant_du: pending && r.montant_du != null ? Number(r.montant_du) : null, checks: checksFor(pending), driver: await tourDriver(r), total: r.total == null ? null : Number(r.total),
  });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const r = await find(String(b.token || ""));
    if (!r) return NextResponse.json({ ok: false, error: "Lien invalide ou expiré." }, { status: 404 });
    if (r.accuse_token) return NextResponse.json({ ok: true, done: true, accuse_url: `/api/accuse/${r.accuse_token}` });
    if (!r.vin || (!r.paiement_confirme_at && !r.paiement_en_attente)) return NextResponse.json({ ok: false, error: "Cette livraison n'est pas prête à être confirmée. Contactez NeoDrive au 06 89 78 17 10." }, { status: 409 });
    const signer = clean(b.name, 120);
    if (!b.accept) return NextResponse.json({ ok: false, error: "Cochez « J'ai bien reçu mon véhicule »." }, { status: 400 });
    if (signer.length < 3) return NextResponse.json({ ok: false, error: "Écrivez votre nom et prénom." }, { status: 400 });
    const reglement = cleanPayment(b.payment);
    if (!reglement) return NextResponse.json({ ok: false, error: "Indiquez comment vous avez réglé (moyen et montant)." }, { status: 400 });
    const driverName = (await tourDriver(r)) || driverDisplay(clean(b.driver_name, 80));
    const pending = !r.paiement_confirme_at && !!r.paiement_en_attente;
    const checksIn = (b.checks || {}) as Record<string, unknown>;
    const checks = Object.fromEntries(checksFor(pending).map(c => [c.id, !!checksIn[c.id]]));
    const at = new Date().toISOString();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const ua = clean(req.headers.get("user-agent"), 200);
    const data: ReceiptData = {
      numero: `LIV-${at.slice(0, 4)}-${String(r.id).padStart(6, "0")}`,
      client: `${r.prenom || ""} ${r.nom || ""}`.trim(), adresse: [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", "),
      telephone: r.telephone || "", email: r.email || "", modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin,
      checks, reserves: clean(b.remarks, 600), signer, signed_at: at, livreur: "NeoDrive", paiement_confirme_at: r.paiement_confirme_at,
      mode: "distance", remote: { at, ip, phone: r.telephone || "", ua },
      pending: pending ? { montant_du: r.montant_du == null ? null : Number(r.montant_du) } : null,
      reglement, driver_name: driverName || null,
    };
    await crmDatabase().from("reservations").update({ remote_confirm: { name: signer, at, ip, ua, phone: r.telephone || "", remarks: data.reserves } }).eq("id", r.id);
    const out = await finalizeDelivery(crmDatabase(), r, data, null);
    return NextResponse.json({ ok: true, done: true, accuse_url: out.url.replace(/^https?:\/\/[^/]+/, ""), emailed: out.emailed });
  } catch (e) {
    console.error("[ACCUSE-CONFIRMER]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
