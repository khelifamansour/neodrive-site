import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { INBOUND_DOMAIN, inboundAddress, inboundKey, inboundWebhookUrl } from "../../../../lib/compta-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const masked = (u: string) => u.replace(/([?&]k=)[^&]+/, "$1••••");

/**
 * Branche la boîte de réception des factures sur Brevo : crée le webhook « inbound » (POST /v3/webhooks) pour le domaine
 * de réception, vers /api/compta/inbound?k=…. Jeton à usage unique : admin_once_tokens.purpose « compta-inbound-setup »,
 * payload facultatif { domain: "factures.easydrive-auto.fr", replace: true }. Un webhook existant pour la même adresse est réutilisé
 * (ou remplacé si replace). La clé secrète n'est jamais renvoyée.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "compta-inbound-setup").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  if (!data?.length) return NextResponse.json({ ok: false }, { status: 401 });
  const p = ((data[0] as { payload?: { domain?: string; replace?: boolean } }).payload) || {};
  await applyStoredSecrets(true);
  const key = process.env.BREVO_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Brevo n'est pas connecté (page /connexions)" }, { status: 503 });
  if (!inboundKey()) return NextResponse.json({ ok: false, error: "CRON_SECRET absent : clé du webhook impossible" }, { status: 503 });
  const domain = typeof p.domain === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(p.domain) ? p.domain.toLowerCase() : INBOUND_DOMAIN();
  const url = inboundWebhookUrl();
  const h = { "api-key": key, "content-type": "application/json", accept: "application/json" };
  try {
    const list = await fetch("https://api.brevo.com/v3/webhooks?type=inbound", { headers: h, cache: "no-store" });
    const lj = await list.json().catch(() => ({})) as { webhooks?: { id: number; url: string; domain?: string; events?: string[] }[] };
    const mine = (lj.webhooks || []).filter(w => String(w.url || "").split("?")[0] === url.split("?")[0]);
    const exact = mine.find(w => w.url === url && (!w.domain || w.domain === domain));
    if (exact && !p.replace) return NextResponse.json({ ok: true, existing: true, id: exact.id, domain, url: masked(url), address: `compta@${domain}`, others: (lj.webhooks || []).filter(w => w.id !== exact.id).map(w => ({ id: w.id, url: masked(w.url), domain: w.domain })) });
    const removed: number[] = [];
    for (const w of mine) { const r = await fetch(`https://api.brevo.com/v3/webhooks/${w.id}`, { method: "DELETE", headers: h, cache: "no-store" }); if (r.ok) removed.push(w.id); }
    const r = await fetch("https://api.brevo.com/v3/webhooks", { method: "POST", headers: h, cache: "no-store", body: JSON.stringify({ type: "inbound", events: ["inboundEmailProcessed"], url, domain, description: "NeoDrive : factures fournisseurs vers la comptabilité" }) });
    const j = await r.json().catch(() => ({})) as { id?: number; message?: string; code?: string };
    if (!r.ok) return NextResponse.json({ ok: false, status: r.status, error: j.message || j.code || `Brevo ${r.status}`, domain, removed }, { status: 502 });
    return NextResponse.json({ ok: true, id: j.id, domain, url: masked(url), address: domain === INBOUND_DOMAIN() ? inboundAddress() : `compta@${domain}`, removed, dns: { type: "MX", host: domain, values: [{ priority: 10, value: "inbound1.sendinblue.com" }, { priority: 20, value: "inbound2.sendinblue.com" }] } });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erreur" }, { status: 500 }); }
}
