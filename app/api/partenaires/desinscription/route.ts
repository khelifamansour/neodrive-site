import { crmDatabase } from "../../../../lib/crm-agent";
import { checkPartnerUnsubscribe } from "../../../../lib/partner-followup";

export const dynamic = "force-dynamic";

/** Désinscription en un clic depuis un e-mail partenaire NeoDrive : plus aucune relance. */
export async function GET(req: Request) {
  const u = new URL(req.url); const id = u.searchParams.get("id") || ""; const s = u.searchParams.get("s") || "";
  const page = (msg: string) => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NeoDrive</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#0f172a"><h1 style="color:#f97316">NeoDrive</h1><p>${msg}</p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (!checkPartnerUnsubscribe(id, s)) return page("Ce lien n'est pas valide.");
  const db = crmDatabase();
  const { data } = await db.from("partner_applications").select("followup").eq("id", Number(id)).maybeSingle();
  if (data) await db.from("partner_applications").update({ followup: { ...(data.followup || {}), unsubscribed_at: new Date().toISOString() } }).eq("id", Number(id));
  return page("C'est noté : vous ne recevrez plus de messages de NeoDrive au sujet du réseau partenaires. Merci et bonne journée !");
}
