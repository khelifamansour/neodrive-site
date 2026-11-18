import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { checksFor, type ReceiptData } from "../../../lib/delivery-receipt";
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

export async function GET(req: Request) {
  const r = await find(new URL(req.url).searchParams.get("token") || "");
  if (!r) return NextResponse.json({ ok: false, error: "Lien invalide ou expiré." }, { status: 404 });
  const pending = !r.paiement_confirme_at && !!r.paiement_en_attente;
  return NextResponse.json({
    ok: true, done: !!r.accuse_token, accuse_url: r.accuse_token ? `/api/accuse/${r.accuse_token}` : null,
    client: `${r.prenom || ""} ${r.nom || ""}`.replace(/\(.*?\)/g, "").trim(), modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin || "",
    date: new Date().toISOString(), pending, montant_du: pending && r.montant_du != null ? Number(r.montant_du) : null, checks: checksFor(pending),
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
    };
    await crmDatabase().from("reservations").update({ remote_confirm: { name: signer, at, ip, ua, phone: r.telephone || "", remarks: data.reserves } }).eq("id", r.id);
    const out = await finalizeDelivery(crmDatabase(), r, data, null);
    return NextResponse.json({ ok: true, done: true, accuse_url: out.url.replace(/^https?:\/\/[^/]+/, ""), emailed: out.emailed });
  } catch (e) {
    console.error("[ACCUSE-CONFIRMER]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
