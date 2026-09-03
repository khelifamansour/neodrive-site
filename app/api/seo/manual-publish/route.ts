import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { passcode, topic } = await req.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok:false, error:"Code d’accès incorrect" }, { status:401 });

  const selectedTopic = String(topic || "").trim().slice(0,240);
  const endpoint = new URL("/api/seo/auto-publish", req.url);
  endpoint.searchParams.set("source", "manual");
  if (selectedTopic) endpoint.searchParams.set("topic", selectedTopic);

  const response = await fetch(endpoint, { headers:{ Authorization:`Bearer ${secret}` }, cache:"no-store" });
  const result = await response.json().catch(() => ({ ok:false, error:"Réponse du moteur SEO illisible" }));
  return NextResponse.json(result, { status:response.status });
}
