import { applyStoredSecrets } from "../../../../lib/integrations";
import { checkUnsubscribe } from "../../../../lib/brevo";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";

/** Désinscription en un clic depuis un e-mail NeoDrive : plus aucun e-mail, SMS ni relance WhatsApp. */
export async function GET(req: Request) {
  await applyStoredSecrets();
  const u = new URL(req.url); const id = u.searchParams.get("id") || ""; const s = u.searchParams.get("s") || "";
  const page = (msg: string) => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NeoDrive</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#0f172a"><h1 style="color:#f97316">NeoDrive</h1><p>${msg}</p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (!checkUnsubscribe(id, s)) return page("Ce lien n'est pas valide.");
  const now = new Date().toISOString();
  await crmDatabase().from("leads").update({ opted_out_at: now, whatsapp_opt_in: false, statut: "Perdu", phase: "Terminé", updated_at: now }).eq("id", Number(id));
  return page("C'est noté : vous ne recevrez plus de messages de NeoDrive. Merci et bonne journée !");
}
