import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  await applyStoredSecrets();
  const { passcode } = await request.json().catch(() => ({}));
  const secret = process.env.CRON_SECRET;
  if (!secret || passcode !== secret) return NextResponse.json({ ok:false,error:"Code d’accès incorrect" },{status:401});
  const origin = new URL(request.url).origin;
  // Bouton « publier maintenant » : choisit un vrai média non publié depuis 14 jours, sans limite du jour.
  const r = await fetch(`${origin}/api/facebook/auto-publish?manual=1`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
  const data = await r.json().catch(()=>({}));
  return NextResponse.json(data,{status:r.status});
}
