import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendPack, type PackReservation } from "../../../../lib/delivery-pack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Envoi immédiat du pack avant livraison, par jeton à usage unique (admin_once_tokens, purpose « delivery-pack »).
 * payload = { reservation_id, force?, creneau?, date_promise?, livraison_mode?, verrouillage? } : force renvoie même si le pack est déjà parti ;
 * creneau / date_promise (AAAA-MM-JJ) / livraison_mode ('neodrive' | 'transporteur') / verrouillage (booléen)
 * sont enregistrés sur la réservation avant l'envoi.
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = crmDatabase();
  const { data } = await sb.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "delivery-pack").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { reservation_id?: number; force?: boolean; creneau?: string; date_promise?: string; livraison_mode?: string; verrouillage?: boolean } } | undefined)?.payload;
  const id = Number(p?.reservation_id);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets().catch(() => {});
  const patch: Record<string, string | boolean> = {};
  if (typeof p?.creneau === "string") patch.creneau = p.creneau.slice(0, 60);
  if (typeof p?.date_promise === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date_promise)) patch.date_promise = p.date_promise;
  if (p?.livraison_mode === "neodrive" || p?.livraison_mode === "transporteur") patch.livraison_mode = p.livraison_mode;
  if (typeof p?.verrouillage === "boolean") patch.verrouillage = p.verrouillage;
  if (Object.keys(patch).length) {
    const { error } = await sb.from("reservations").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: `mise à jour de la réservation : ${error.message}` }, { status: 500 });
  }
  const { data: r } = await sb.from("reservations").select("*").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ ok: false, error: "réservation introuvable" }, { status: 404 });
  if (r.pack_sent_at && !p?.force) return NextResponse.json({ ok: false, error: "pack déjà envoyé (ajoutez force: true pour renvoyer)", pack_sent_at: r.pack_sent_at });
  if (["Livrée", "Annulée"].includes(r.statut) && !p?.force) return NextResponse.json({ ok: false, error: `réservation ${r.statut}` });
  try { return NextResponse.json(await sendPack(sb, r as PackReservation, { by: "envoi manuel" })); }
  catch (e) { console.error("[PACK-SEND]", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
