import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { passcode } = await request.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok:false,error:"Code d’accès incorrect" },{status:401});
  const origin = new URL(request.url).origin;
  const r = await fetch(`${origin}/api/facebook/auto-publish?force=1`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
  const data = await r.json().catch(()=>({}));
  return NextResponse.json(data,{status:r.status});
}
