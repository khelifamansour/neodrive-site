import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { sendPack, type PackReservation } from "../../../../lib/delivery-pack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Envoi immédiat du pack avant livraison, par jeton à usage unique (admin_once_tokens, purpose « delivery-pack »).
 * payload = { reservation_id, force?, creneau?, date_promise? } : force renvoie même si le pack est déjà parti ;
 * creneau / date_promise (AAAA-MM-JJ) sont enregistrés sur la réservation avant l'envoi.
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = crmDatabase();
  const { data } = await sb.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "delivery-pack").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { reservation_id?: number; force?: boolean; creneau?: string; date_promise?: string } } | undefined)?.payload;
  const id = Number(p?.reservation_id);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets().catch(() => {});
  const patch: Record<string, string> = {};
  if (typeof p?.creneau === "string") patch.creneau = p.creneau.slice(0, 60);
  if (typeof p?.date_promise === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date_promise)) patch.date_promise = p.date_promise;
  if (Object.keys(patch).length) await sb.from("reservations").update(patch).eq("id", id);
  const { data: r } = await sb.from("reservations").select("*").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ ok: false, error: "réservation introuvable" }, { status: 404 });
  if (r.pack_sent_at && !p?.force) return NextResponse.json({ ok: false, error: "pack déjà envoyé (ajoutez force: true pour renvoyer)", pack_sent_at: r.pack_sent_at });
  if (["Livrée", "Annulée"].includes(r.statut) && !p?.force) return NextResponse.json({ ok: false, error: `réservation ${r.statut}` });
  try { return NextResponse.json(await sendPack(sb, r as PackReservation, { by: "envoi manuel" })); }
  catch (e) { console.error("[PACK-SEND]", e); return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
