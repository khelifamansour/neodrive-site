import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Relais d'envoi WhatsApp pour le site NeoDrive (packages, relances, modèles).
// Utilise le jeton META_ACCESS_TOKEN déjà utilisé par Hana. Réservé au serveur du site (clé service).
const WABA = "29898117843112108";
const PHONE_ID = "1468000813053875";
const V = "v23.0";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const allowed: string[] = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""];
  try { const m = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); for (const v of Object.values(m)) allowed.push(String(v)); } catch { /* ignore */ }
  if (!auth || !allowed.filter(Boolean).includes(auth)) return json({ error: "Forbidden" }, 403);
  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!token) return json({ error: "META_ACCESS_TOKEN manquant" }, 503);
  let body: any; try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
  const H = { authorization: "Bearer " + token, "content-type": "application/json" };
  if (body.action === "send-template") {
    const to = String(body.to || "").replace(/\D/g, "");
    if (!/^\d{9,15}$/.test(to) || !body.name) return json({ error: "Paramètres invalides" }, 400);
    const r = await fetch(`https://graph.facebook.com/${V}/${PHONE_ID}/messages`, { method: "POST", headers: H, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: body.name, language: { code: body.language || "fr" }, components: [...(body.headerVideo ? [{ type: "header", parameters: [{ type: "video", video: { link: String(body.headerVideo) } }] }] : []), ...(body.headerDocument ? [{ type: "header", parameters: [{ type: "document", document: { link: String(body.headerDocument.link), filename: String(body.headerDocument.filename || "Document.pdf") } }] }] : []), { type: "body", parameters: (body.params || []).map((text: string) => ({ type: "text", text: String(text) })) }] } }) });
    const j = await r.json().catch(() => ({}));
    return json(j, r.status);
  }
  if (body.action === "send-text") {
    const to = String(body.to || "").replace(/\D/g, "");
    if (!/^\d{9,15}$/.test(to) || !body.text) return json({ error: "Paramètres invalides" }, 400);
    const r = await fetch(`https://graph.facebook.com/${V}/${PHONE_ID}/messages`, { method: "POST", headers: H, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: String(body.text).slice(0, 4000) } }) });
    return json(await r.json().catch(() => ({})), r.status);
  }
  if (body.action === "template-status") {
    const r = await fetch(`https://graph.facebook.com/${V}/${WABA}/message_templates?name=${encodeURIComponent(body.name)}&fields=name,status,rejected_reason`, { headers: H });
    return json(await r.json().catch(() => ({})), r.status);
  }
  if (body.action === "template-create") {
    const r = await fetch(`https://graph.facebook.com/${V}/${WABA}/message_templates`, { method: "POST", headers: H, body: JSON.stringify(body.template) });
    return json(await r.json().catch(() => ({})), r.status);
  }
  if (body.action === "upload-handle") {
    // Téléverse un média (mp4/pdf/jpg du site) chez Meta pour l'exemple d'en-tête d'un modèle ; renvoie le « handle ».
    const src = String(body.url || "");
    if (!/^https:\/\/www\.easydrive-auto\.fr\//.test(src)) return json({ error: "URL non autorisée" }, 400);
    const f = await fetch(src); if (!f.ok) return json({ error: "Média introuvable" }, 400);
    const bytes = new Uint8Array(await f.arrayBuffer()); const type = f.headers.get("content-type") || body.type || "video/mp4";
    const s1 = await fetch(`https://graph.facebook.com/${V}/1047762618139423/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(type)}&access_token=${token}`, { method: "POST" });
    const j1 = await s1.json().catch(() => ({})); if (!s1.ok || !j1.id) return json(j1, s1.status || 500);
    const s2 = await fetch(`https://graph.facebook.com/${V}/${j1.id}`, { method: "POST", headers: { authorization: "OAuth " + token, file_offset: "0" }, body: bytes });
    return json(await s2.json().catch(() => ({})), s2.status);
  }
  if (body.action === "health") {
    // État du numéro (qualité, limite d'envoi, statut) et de l'abonnement webhook de l'app (nécessaire pour Hana).
    const ph = await fetch(`https://graph.facebook.com/${V}/${PHONE_ID}?fields=display_phone_number,verified_name,status,quality_rating,messaging_limit_tier,name_status,code_verification_status,platform_type,throughput`, { headers: H });
    const sa = await fetch(`https://graph.facebook.com/${V}/${WABA}/subscribed_apps`, { headers: H });
    return json({ phone: await ph.json().catch(() => ({})), subscribed_apps: await sa.json().catch(() => ({})) });
  }
  if (body.action === "subscribe") {
    // Ré-abonne l'app aux webhooks du compte WhatsApp (sans effet si déjà abonnée).
    const r = await fetch(`https://graph.facebook.com/${V}/${WABA}/subscribed_apps`, { method: "POST", headers: H });
    return json(await r.json().catch(() => ({})), r.status);
  }
  return json({ error: "Action inconnue" }, 400);
});
