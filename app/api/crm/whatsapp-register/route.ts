import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function registerPhone(pin?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";

  if (!token || !phoneId) {
    return NextResponse.json(
      { ok: false, error: "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant" },
      { status: 503 },
    );
  }

  const body: Record<string, string> = { messaging_product: "whatsapp" };
  if (pin) body.pin = pin;

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  console.log("[WA-REGISTER] Meta response", { status: response.status, ok: response.ok, result });

  return NextResponse.json(
    { ok: response.ok, status: response.status, result },
    { status: response.ok ? 200 : 400 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "yes") {
    return NextResponse.json({ ok: false, error: "Confirmation required" }, { status: 400 });
  }
  const pin = url.searchParams.get("pin")?.trim();
  return registerPhone(pin || undefined);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "yes") {
    return NextResponse.json({ ok: false, error: "Confirmation required" }, { status: 400 });
  }
  const payload = await request.json().catch(() => ({}));
  const pin = typeof payload?.pin === "string" ? payload.pin.trim() : undefined;
  return registerPhone(pin);
}
