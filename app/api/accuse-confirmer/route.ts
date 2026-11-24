import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { checksFor, cleanPayment, defaultDue, driverDisplay, reserveClauses, type ReceiptData } from "../../../lib/delivery-receipt";
import { listJson } from "../../../lib/datastore";
import { PLAN_TOURS } from "../../../lib/fleet";
import type { PlanTour } from "../../../lib/planif";
import { finalizeDelivery, finalizeReserve } from "../../../lib/delivery-finalize";
import { cleanDecl, keptOf, needsVireCheck } from "../../../lib/reserve-text";

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
  // Paiement en attente : le client signe la remise avec réserve de propriété (puis l'accusé final après paiement).
  const reserve = pending && !r.reserve_token;
  const lieu = [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", ");
  const due = r.reserve_due || defaultDue();
  const montant = r.montant_du == null ? null : Number(r.montant_du);
  const reserveDone = pending && !!r.reserve_token;
  const kept = pending ? keptOf(r.remise_data) : null;
  // Lien reçu avec le SMS « j'arrive » : le bon n'est prêt qu'une fois le numéro de série et le paiement (ou la remise sans paiement) réglés par le livreur.
  const ready = !!r.vin && (!!r.paiement_confirme_at || !!r.paiement_en_attente);
  return NextResponse.json({
    ok: true, ready, kept, done: !!r.accuse_token || reserveDone, accuse_url: r.accuse_token ? `/api/accuse/${r.accuse_token}` : reserveDone ? `/api/accuse/${r.reserve_token}` : null,
    reserve, reserve_done: reserveDone, due, clauses: reserve ? reserveClauses({ modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin || "", date: new Date().toISOString(), lieu, montant_du: montant, due, kept }) : null,
    client: `${r.prenom || ""} ${r.nom || ""}`.replace(/\(.*?\)/g, "").trim(), modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin || "",
    date: new Date().toISOString(), pending, montant_du: pending && r.montant_du != null ? Number(r.montant_du) : null, checks: checksFor(pending, kept), driver: await tourDriver(r), total: r.total == null ? null : Number(r.total),
  });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const r = await find(String(b.token || ""));
    if (!r) return NextResponse.json({ ok: false, error: "Lien invalide ou expiré." }, { status: 404 });
    if (r.accuse_token) return NextResponse.json({ ok: true, done: true, accuse_url: `/api/accuse/${r.accuse_token}` });
    if (!r.paiement_confirme_at && r.reserve_token) return NextResponse.json({ ok: true, done: true, accuse_url: `/api/accuse/${r.reserve_token}` });
    if (!r.vin || (!r.paiement_confirme_at && !r.paiement_en_attente)) return NextResponse.json({ ok: false, error: "Cette livraison n'est pas prête à être confirmée. Contactez NeoDrive au 06 89 78 17 10." }, { status: 409 });
    const signer = clean(b.name, 120);
    if (!b.accept) return NextResponse.json({ ok: false, error: (!r.paiement_confirme_at && r.paiement_en_attente) ? "Cochez « J'ai lu et j'accepte les conditions de remise »." : "Cochez « J'ai bien reçu mon véhicule »." }, { status: 400 });
    if (signer.length < 3) return NextResponse.json({ ok: false, error: "Écrivez votre nom et prénom." }, { status: 400 });
    // Signature manuscrite tracée au doigt par le client (PNG en data URL).
    const sigRaw = String(b.signature || "");
    const sigM = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(sigRaw);
    const signature = sigM ? Buffer.from(sigM[1], "base64") : null;
    if (!signature || signature.length < 1500) return NextResponse.json({ ok: false, error: "Signez avec le doigt dans le cadre." }, { status: 400 });
    if (signature.length > 1_500_000) return NextResponse.json({ ok: false, error: "Signature trop lourde, effacez et recommencez." }, { status: 400 });
    const pending = !r.paiement_confirme_at && !!r.paiement_en_attente;
    const kept = pending ? keptOf(r.remise_data) : null;
    const montantDu = r.montant_du == null ? null : Number(r.montant_du);
    const declaration = pending ? cleanDecl(b.declaration, montantDu) : null;
    // La page a été ouverte avant que le livreur ne choisisse « paiement pas encore reçu » : elle doit être rechargée.
    if (pending && !b.reserve) return NextResponse.json({ ok: false, reload: true, error: "Le bon de livraison a changé : rechargez la page." }, { status: 409 });
    if (!pending && b.reserve) return NextResponse.json({ ok: false, reload: true, error: "Votre paiement est maintenant confirmé : rechargez la page." }, { status: 409 });
    if (pending && !declaration) return NextResponse.json({ ok: false, error: "Choisissez votre déclaration de paiement et la date." }, { status: 400 });
    const reglement = cleanPayment(b.payment);
    if (!reglement && !pending) return NextResponse.json({ ok: false, error: "Indiquez comment vous avez réglé (moyen et montant)." }, { status: 400 });
    const driverName = (await tourDriver(r)) || driverDisplay(clean(b.driver_name, 80));
    const checksIn = (b.checks || {}) as Record<string, unknown>;
    const vire = needsVireCheck(pending, reglement);
    if (vire && !checksIn.virement) return NextResponse.json({ ok: false, error: "Cochez l'engagement sur le virement." }, { status: 400 });
    const checks = Object.fromEntries(checksFor(pending, kept, vire).map(c => [c.id, !!checksIn[c.id]]));
    const at = new Date().toISOString();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const ua = clean(req.headers.get("user-agent"), 200);
    const data: ReceiptData = {
      numero: `LIV-${at.slice(0, 4)}-${String(r.id).padStart(6, "0")}`,
      client: `${r.prenom || ""} ${r.nom || ""}`.trim(), adresse: [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", "),
      telephone: r.telephone || "", email: r.email || "", modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin,
      checks, reserves: clean(b.remarks, 600), signer, signed_at: at, livreur: driverName || "NeoDrive", paiement_confirme_at: r.paiement_confirme_at,
      mode: "distance", remote: { at, ip, phone: r.telephone || "", ua },
      pending: pending ? { montant_du: montantDu } : null,
      reglement, driver_name: driverName || null, kept, declaration,
    };
    if (pending) {
      data.numero = `RES-${at.slice(0, 4)}-${String(r.id).padStart(6, "0")}`;
      data.reserve = { due: r.reserve_due || defaultDue(), montant_du: r.montant_du == null ? null : Number(r.montant_du), lieu: data.adresse };
      const out = await finalizeReserve(crmDatabase(), r, data, signature);
      return NextResponse.json({ ok: true, done: true, reserve: true, accuse_url: out.url.replace(/^https?:\/\/[^/]+/, ""), emailed: out.emailed });
    }
    await crmDatabase().from("reservations").update({ remote_confirm: { name: signer, at, ip, ua, phone: r.telephone || "", remarks: data.reserves, signed: true } }).eq("id", r.id);
    const out = await finalizeDelivery(crmDatabase(), r, data, signature);
    return NextResponse.json({ ok: true, done: true, accuse_url: out.url.replace(/^https?:\/\/[^/]+/, ""), emailed: out.emailed });
  } catch (e) {
    console.error("[ACCUSE-CONFIRMER]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
