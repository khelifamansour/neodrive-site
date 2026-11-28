import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { CHECKS, driverDisplay, receiptVehicle, type ReceiptData } from "../../../lib/delivery-receipt";
import { listJson } from "../../../lib/datastore";
import { PLAN_TOURS } from "../../../lib/fleet";
import type { PlanTour } from "../../../lib/planif";
import { finalizeDelivery } from "../../../lib/delivery-finalize";
import { VIN_TODO, bonClauses, vehicleNoVin } from "../../../lib/reserve-text";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const TOKEN = /^[a-f0-9]{48}$/;

/** Bon de livraison signé par le client via son lien personnel (sans compte), sur son téléphone ou celui du chauffeur. */
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

type Step = "done" | "no_vin" | "sign";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;

/**
 * Numéro de série (VIN) facultatif : sans VIN, le bon désigne le véhicule (HAIBAO, modèle) et le VIN est « à compléter ».
 * Bon de livraison unique : le client signe une seule fois, que le paiement soit déjà arrivé ou non
 * (le bon contient toujours la réserve de propriété). Le lien ne périme jamais : une fois signé, il affiche
 * « Bon de livraison déjà signé » et le PDF. Les anciennes remises avec réserve (reserve_token) comptent aussi comme signées :
 * aucune nouvelle signature n'est demandée, même après le paiement.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stepOf(r: any): Step {
  if (r.accuse_token || r.reserve_token) return "done";
  return "sign";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const montantOf = (r: any) => r.montant_du != null ? Number(r.montant_du) : r.total != null ? Number(r.total) : null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signedAt = (d: any, fallback: string | null) => (d && typeof d === "object" && typeof d.signed_at === "string" ? d.signed_at : null) || fallback;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lieuOf = (r: any) => [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", ");

/** Aucun montant ni statut de paiement dans la réponse : la page peut être ouverte sur le téléphone du chauffeur ou du transporteur. */
export async function GET(req: Request) {
  const r = await find(new URL(req.url).searchParams.get("token") || "");
  if (!r) return NextResponse.json({ ok: false, error: "Ce lien n'existe pas." }, { status: 404 });
  const step = stepOf(r);
  const tok = r.accuse_token || r.reserve_token || null;
  return NextResponse.json({
    ok: true, step, done: step === "done",
    pdf_url: tok ? `/api/accuse/${tok}` : null,
    signed_at: r.accuse_token ? signedAt(r.accuse_data, r.livre_at) : r.reserve_token ? signedAt(r.reserve_data, r.livre_at) : null,
    has_email: !!r.email, clauses: bonClauses(r.vin || ""),
    client: `${r.prenom || ""} ${r.nom || ""}`.replace(/\(.*?\)/g, "").trim(), ...receiptVehicle(r),
    designation: r.vin ? null : vehicleNoVin(r.modele), vin_todo: VIN_TODO,
    lieu: lieuOf(r), date: new Date().toISOString(), checks: CHECKS.map(c => ({ id: c.id, label: c.label })),
  });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const r = await find(String(b.token || ""));
    if (!r) return NextResponse.json({ ok: false, error: "Ce lien n'existe pas." }, { status: 404 });
    const step = stepOf(r);
    if (step === "done") return NextResponse.json({ ok: true, done: true, already: true, pdf_url: `/api/accuse/${r.accuse_token || r.reserve_token}` });
    const signer = clean(b.name, 120);
    if (!b.accept) return NextResponse.json({ ok: false, error: "Cochez « J'ai bien reçu mon véhicule et j'accepte la réserve de propriété »." }, { status: 400 });
    if (signer.length < 3) return NextResponse.json({ ok: false, error: "Écrivez votre nom et prénom." }, { status: 400 });
    // Signature manuscrite tracée au doigt par le client (PNG en data URL).
    const sigRaw = String(b.signature || "");
    const sigM = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(sigRaw);
    const signature = sigM ? Buffer.from(sigM[1], "base64") : null;
    if (!signature || signature.length < 1500) return NextResponse.json({ ok: false, error: "Signez avec le doigt dans le cadre." }, { status: 400 });
    if (signature.length > 1_500_000) return NextResponse.json({ ok: false, error: "Signature trop lourde, effacez et recommencez." }, { status: 400 });
    const paid = !!r.paiement_confirme_at;
    const driverName = (await tourDriver(r)) || driverDisplay(clean(b.driver_name, 80));
    const checksIn = (b.checks || {}) as Record<string, unknown>;
    const checks = Object.fromEntries(CHECKS.map(c => [c.id, !!checksIn[c.id]]));
    const at = new Date().toISOString();
    // E-mail facultatif donné par le client pour recevoir son PDF : enregistré sur la réservation.
    const email = clean(b.email, 160).toLowerCase();
    if (!r.email && email && EMAIL.test(email)) { await crmDatabase().from("reservations").update({ email, updated_at: at }).eq("id", r.id); r.email = email; }
    // Paiement pas encore confirmé : suivi interne uniquement (montant dû pour l'administration), rien ne change pour le client.
    const montantDu = paid ? null : montantOf(r);
    if (!paid) {
      const fill: Record<string, unknown> = { paiement_en_attente: true };
      if (r.montant_du == null && montantDu != null) fill.montant_du = montantDu;
      await crmDatabase().from("reservations").update(fill).eq("id", r.id);
      Object.assign(r, fill);
    }
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const ua = clean(req.headers.get("user-agent"), 200);
    const data: ReceiptData = {
      numero: `LIV-${at.slice(0, 4)}-${String(r.id).padStart(6, "0")}`,
      client: `${r.prenom || ""} ${r.nom || ""}`.trim(), adresse: lieuOf(r),
      telephone: r.telephone || "", email: r.email || "", ...receiptVehicle(r),
      checks, reserves: clean(b.remarks, 600), signer, signed_at: at, livreur: driverName || "NeoDrive", paiement_confirme_at: r.paiement_confirme_at,
      mode: "distance", remote: { at, ip, phone: r.telephone || "", ua },
      pending: paid ? null : { montant_du: montantDu },
      reglement: null, driver_name: driverName || null, kept: null, declaration: null,
    };
    await crmDatabase().from("reservations").update({ remote_confirm: { name: signer, at, ip, ua, phone: r.telephone || "", remarks: data.reserves, signed: true } }).eq("id", r.id);
    const out = await finalizeDelivery(crmDatabase(), r, data, signature);
    return NextResponse.json({ ok: true, done: true, pdf_url: out.url.replace(/^https?:\/\/[^/]+/, ""), emailed: out.emailed });
  } catch (e) {
    console.error("[ACCUSE-CONFIRMER]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
