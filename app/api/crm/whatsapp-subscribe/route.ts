import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "364388790101381";
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "subscribe-neodrive") {
    return NextResponse.json({ ok: false, error: "Confirmation required" }, { status: 400 });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.error("[WA-SUBSCRIBE] WHATSAPP_ACCESS_TOKEN missing");
    return NextResponse.json({ ok: false, error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 503 });
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
