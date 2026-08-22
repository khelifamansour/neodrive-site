import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "364388790101381";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "421337944404719";
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

async function graphGet(path: string, token: string) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, result };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.error("[WA-SUBSCRIBE] WHATSAPP_ACCESS_TOKEN missing");
    return NextResponse.json({ ok: false, error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 503 });
  }

  // Simple one-time registration page. The PIN is posted directly to the server and is never logged or stored.
  if (url.searchParams.get("register") === "1") {
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Activer WhatsApp Cloud API</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:48px auto;padding:20px;color:#111}input,button{font-size:18px;padding:12px;margin-top:10px}input{width:180px}button{cursor:pointer}pre{white-space:pre-wrap;background:#f4f4f4;padding:16px;border-radius:8px}</style></head><body><h1>Activer le numéro WhatsApp Cloud API</h1><p>Entre ton code PIN à 6 chiffres puis clique sur <b>Enregistrer le numéro</b>.</p><form id="f"><input id="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" required autocomplete="off"><br><button type="submit">Enregistrer le numéro</button></form><pre id="out"></pre><script>document.getElementById('f').addEventListener('submit',async(e)=>{e.preventDefault();const out=document.getElementById('out');out.textContent='Enregistrement en cours...';const pin=document.getElementById('pin').value;try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:'register-cloud-api',pin})});const j=await r.json();out.textContent=JSON.stringify(j,null,2);if(r.ok)document.getElementById('pin').value='';}catch(err){out.textContent=String(err)}})</script></body></html>`;
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }

  // Safe diagnostics: returns IDs/status only, never the access token.
  if (url.searchParams.get("diagnose") === "1") {
    const [apps, phones] = await Promise.all([
      graphGet(`${WABA_ID}/subscribed_apps`, token),
      graphGet(`${WABA_ID}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput`, token),
    ]);

    console.log("[WA-DIAG]", {
      wabaId: WABA_ID,
      appsStatus: apps.status,
      phonesStatus: phones.status,
      appCount: Array.isArray((apps.result as any)?.data) ? (apps.result as any).data.length : null,
      phoneCount: Array.isArray((phones.result as any)?.data) ? (phones.result as any).data.length : null,
    });

    return NextResponse.json({
      ok: apps.ok && phones.ok,
      wabaId: WABA_ID,
      graphVersion: GRAPH_VERSION,
      subscribedApps: apps,
      phoneNumbers: phones,
    });
  }

  if (url.searchParams.get("confirm") !== "subscribe-neodrive") {
    return NextResponse.json({ ok: false, error: "Confirmation required" }, { status: 400 });
  }

  console.log("[WA-SUBSCRIBE] subscribing app to WABA", { wabaId: WABA_ID, graphVersion: GRAPH_VERSION });

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  console.log("[WA-SUBSCRIBE] Meta response", { status: response.status, ok: response.ok, result });

  if (!response.ok) {
    return NextResponse.json({ ok: false, metaStatus: response.status, meta: result }, { status: 502 });
  }

  return NextResponse.json({ ok: true, wabaId: WABA_ID, meta: result });
}

export async function POST(request: Request) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 503 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 }); }
  const pin = String(body?.pin || "");
  if (body?.confirm !== "register-cloud-api" || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: "Confirmation ou PIN invalide" }, { status: 400 });
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  console.log("[WA-REGISTER] Meta response", { status: response.status, ok: response.ok, phoneNumberId: PHONE_NUMBER_ID });

  if (!response.ok) return NextResponse.json({ ok: false, metaStatus: response.status, meta: result }, { status: 502 });

  const phoneStatus = await graphGet(`${PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput`, token);
  return NextResponse.json({ ok: true, registered: result, phoneStatus });
}
