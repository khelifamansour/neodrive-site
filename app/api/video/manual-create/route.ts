import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export const maxDuration=300;
export async function POST(req:Request){
 const {passcode}=await req.json().catch(()=>({}));
 const secret=process.env.CRON_SECRET;
 if(!secret||passcode!==secret)return NextResponse.json({ok:false,error:"Code d’accès incorrect"},{status:401});
 const origin=new URL(req.url).origin;
 const r=await fetch(`${origin}/api/video/local-create`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
 const j=await r.json().catch(()=>({}));
 return NextResponse.json(j,{status:r.status});
}
