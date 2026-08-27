import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
function safe(s:string){return s.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(0,120)}

export async function POST(req:Request){
  try{
    const fd=await req.formData();
    const secret=process.env.CRON_SECRET;
    if(!secret||String(fd.get("passcode")||"")!==secret)return NextResponse.json({ok:false,error:"Code incorrect"},{status:401});
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return NextResponse.json({ok:false,error:"Configuration manquante"},{status:503});
    const missionId=String(fd.get("mission_id")||""),vehicleId=String(fd.get("vehicle_id")||""),kind=String(fd.get("kind")||"");
    const file=fd.get("file");
    if(!missionId||!vehicleId||!(file instanceof File)||!file.size)return NextResponse.json({ok:false,error:"Mission, véhicule et fichier requis"},{status:400});
    if(!["pickup","vin","delivery"].includes(kind))return NextResponse.json({ok:false,error:"Type de preuve invalide"},{status:400});
    const sb=createClient(SB,key,{auth:{persistSession:false}});
    const path=`transport/${missionId}/${vehicleId}/${kind}-${Date.now()}-${safe(file.name)}`;
    const {error:up}=await sb.storage.from("erp-documents").upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type||"application/octet-stream",upsert:false});if(up)throw up;
    const patch:any={};if(kind==="pickup")patch.pickup_photo_path=path;if(kind==="vin")patch.vin_photo_path=path;if(kind==="delivery")patch.delivery_proof_path=path;
    const {error}=await sb.from("transport_mission_vehicles").update(patch).eq("mission_id",missionId).eq("vehicle_id",vehicleId);if(error)throw error;
    return NextResponse.json({ok:true,path});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Envoi impossible"},{status:500});}
}
