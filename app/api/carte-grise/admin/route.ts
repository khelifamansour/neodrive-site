import { NextResponse } from "next/server";
import { isAuthorized } from "../../../../lib/integrations";
import { dataClient } from "../../../../lib/datastore";
import { dossierLinks, findDossier, sendDossierToProvider } from "../../../../lib/carte-grise-server";
import { CARTE_GRISE_PROVIDER_EMAIL, CARTE_GRISE_PROVIDER_NAME } from "../../../../lib/carte-grise";
import { analyseDossier, linkReservationVin } from "../../../../lib/stock";
import { checkDocuments, requestMissing } from "../../../../lib/carte-grise-check";
import { payState } from "../../../../lib/stock-shared";

const RES = "id,prenom,nom,telephone,statut,livre_at,vin,total,paiement_confirme_at,paiement_en_attente,montant_du,reserve_path,reserve_token,modele,couleur";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const STATUSES = ["envoi en cours", "reçu", "envoyé", "traité", "annulé"];

/** Dossiers carte grise : liste et envoi au prestataire, réservés au fondateur (code principal). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "list") {
      const { data, error } = await sb.from("carte_grise_dossiers").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw new Error(error.message);
      const ids = [...new Set((data || []).map(d => d.reservation_id).filter(Boolean))];
      const { data: res } = ids.length ? await sb.from("reservations").select(RES).in("id", ids) : { data: [] };
      const byId = new Map((res || []).map(r => [r.id, r]));
      const dossiers = (data || []).map(d => { const r = d.reservation_id ? byId.get(d.reservation_id) : null;
        return { ...d, reservation: r ? { id: r.id, name: `${r.prenom || ""} ${r.nom || ""}`.trim(), statut: r.statut, livre_at: r.livre_at, vin: r.vin, total: r.total, montant_du: r.montant_du } : null, pay: payState(r) }; });
      return NextResponse.json({ ok: true, dossiers, provider: { name: CARTE_GRISE_PROVIDER_NAME, email: CARTE_GRISE_PROVIDER_EMAIL } });
    }
    const d = await findDossier(sb, { id: b.id });
    if (!d) return NextResponse.json({ ok: false, error: "Dossier introuvable" }, { status: 404 });
    if (b.action === "links") return NextResponse.json({ ok: true, links: await dossierLinks(sb, d, 3600) });
    if (b.action === "send") {
      // Envoi manuel uniquement : un dossier dont le paiement n'est pas confirmé demande une confirmation explicite.
      const rid = (d as { reservation_id?: number | null }).reservation_id;
      const { data: r } = rid ? await sb.from("reservations").select(RES).eq("id", rid).maybeSingle() : { data: null };
      const ps = payState(r);
      if (ps !== "payé" && !b.unpaid_ok) return NextResponse.json({ ok: false, unpaid: ps, error: `Paiement : ${ps}. Confirmez l'envoi malgré tout.` }, { status: 409 });
      return NextResponse.json({ ok: true, ...(await sendDossierToProvider(sb, d, { force: Boolean(b.force) })) });
    }
    // Contrôle des pièces (lecture de chaque document) : toutes les pièces, ou seulement keys.
    if (b.action === "check") return NextResponse.json({ ok: true, check: await checkDocuments(sb, d.id, { keys: Array.isArray(b.keys) ? b.keys.map(String) : undefined }) });
    // Demande des pièces manquantes au client (SMS + e-mail + lien WhatsApp à envoyer soi-même).
    if (b.action === "request_missing") return NextResponse.json({ ok: true, ...(await requestMissing(sb, d, { keys: Array.isArray(b.keys) ? b.keys.map(String) : undefined, note: typeof b.note === "string" ? b.note : "", sms: b.sms !== false, email: b.email !== false })) });
    if (b.action === "auto_resend") {
      const { error } = await sb.from("carte_grise_dossiers").update({ auto_resend: Boolean(b.value), updated_at: new Date().toISOString() }).eq("id", d.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "analyse") {
      if (b.reset) await sb.from("carte_grise_dossiers").update({ vin: null, reservation_id: null, vehicle_id: null }).eq("id", d.id);
      return NextResponse.json({ ok: true, ...(await analyseDossier(sb, d.id)) });
    }
    // Correction à la main : VIN et/ou réservation du dossier, puis nouveau rapprochement.
    if (b.action === "link") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof b.vin === "string") { const v = b.vin.toUpperCase().replace(/[\s-]/g, ""); if (v && !/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return NextResponse.json({ ok: false, error: "VIN invalide (17 caractères, sans I, O, Q)" }, { status: 400 }); patch.vin = v || null; patch.vin_source = v ? "saisie manuelle" : null; }
      if ("reservation_id" in b) patch.reservation_id = Number(b.reservation_id) || null;
      await sb.from("carte_grise_dossiers").update(patch).eq("id", d.id);
      const out = await analyseDossier(sb, d.id);
      if (out.reservation_id && out.vin) { const { data: r } = await sb.from("reservations").select(RES).eq("id", out.reservation_id).maybeSingle(); if (r && r.vin === out.vin) await linkReservationVin(sb, r, { by: "Mansour", delivered: !!r.livre_at || r.statut === "Livrée" }); }
      return NextResponse.json({ ok: true, ...out });
    }
    if (b.action === "update") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof b.status === "string" && STATUSES.includes(b.status)) patch.status = b.status;
      if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 4000);
      const { error } = await sb.from("carte_grise_dossiers").update(patch).eq("id", d.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ ok: false, error: err.message || "Erreur" }, { status: err.status || 500 });
  }
}
