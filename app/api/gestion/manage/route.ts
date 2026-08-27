import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

function supabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Configuration Supabase manquante");
  return createClient(SB, key, { auth: { persistSession: false } });
}

function authorized(passcode: unknown) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && typeof passcode === "string" && passcode === secret);
}

async function addEvent(sb: any, vehicleId: string, eventType: string, fromStatus: string | null, toStatus: string | null, location: string | null, metadata: any = {}) {
  await sb.from("vehicle_events").insert({ vehicle_id: vehicleId, event_type: eventType, from_status: fromStatus, to_status: toStatus, location, metadata, occurred_at: new Date().toISOString(), created_by: "gestion" });
}

async function dashboard(sb: any) {
  const [vehiclesR, warehousesR, containersR, ordersR, missionsR, linksR, costsR, docsR, customersR] = await Promise.all([
    sb.from("vehicles").select("id,internal_ref,vin,chassis_number,model,version,color,battery_type,status,location_label,warehouse_id,container_id,factory_cost,freight_cost,import_cost,landed_cost,current_customer_id,received_at,reserved_at,sold_at,delivered_at,last_movement_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
    sb.from("warehouses").select("id,name,city,address,type,active,created_at").eq("active", true).order("name"),
    sb.from("containers").select("id,container_number,bl_number,vessel,status,etd,eta,port_arrival,customs_status,warehouse_id,received_at,closed_at,total_landed_cost,cost_status,notes,created_at,updated_at").order("created_at", { ascending: false }).limit(200),
    sb.from("customer_orders").select("id,order_number,customer_id,vehicle_id,version,total_ttc,amount_paid,balance_due,payment_status,order_status,registration_status,registration_requested,sold_at,created_at").order("created_at", { ascending: false }).limit(300),
    sb.from("transport_missions").select("id,mission_number,carrier_name,driver_name,driver_phone,pickup_warehouse_id,destination_type,destination_warehouse_id,destination_label,customer_id,order_id,status,payment_required,payment_confirmed,scheduled_at,started_at,completed_at,notes,created_at,updated_at").order("created_at", { ascending: false }).limit(300),
    sb.from("transport_mission_vehicles").select("id,mission_id,vehicle_id,loaded_at,delivered_at,pickup_photo_path,vin_photo_path,delivery_proof_path,notes,created_at").order("created_at", { ascending: false }).limit(1000),
    sb.from("container_cost_items").select("id,container_id,document_id,category,label,amount,allocation_method,include_in_landed_cost,created_at,updated_at").order("created_at", { ascending: false }).limit(1000),
    sb.from("import_documents").select("id,container_id,vehicle_id,document_type,filename,storage_path,supplier_name,invoice_number,invoice_date,net_amount,vat_amount,total_amount,currency,verified,created_at").order("created_at", { ascending: false }).limit(1000),
    sb.from("customers").select("id,first_name,last_name,email,phone,city,address").limit(1000),
  ]);
  const errors = [vehiclesR, warehousesR, containersR, ordersR, missionsR, linksR, costsR, docsR, customersR].map((x:any)=>x.error).filter(Boolean);
  if (errors.length) throw new Error(errors[0].message);

  const vehicles = vehiclesR.data || [];
  const orders = ordersR.data || [];
  const missions = missionsR.data || [];
  const byStatus: Record<string, number> = {};
  for (const v of vehicles) byStatus[v.status] = (byStatus[v.status] || 0) + 1;
  const stockVehicles = vehicles.filter((v:any) => !["sold","delivered","scrapped"].includes(v.status));
  const available = vehicles.filter((v:any) => ["available","stock","ready","in_stock"].includes(v.status)).length;
  const inTransit = vehicles.filter((v:any) => ["in_transit","transport"].includes(v.status)).length;
  const reserved = vehicles.filter((v:any) => ["reserved","sale_pending","assigned_transport"].includes(v.status)).length;
  const receivable = orders.reduce((s:number,o:any)=>s+Number(o.balance_due||0),0);
  const stockValue = stockVehicles.reduce((s:number,v:any)=>s+Number(v.landed_cost||v.factory_cost||0),0);
  const activeMissions = missions.filter((m:any)=>!["completed","cancelled"].includes(m.status)).length;
  const pendingDocs = (docsR.data||[]).filter((d:any)=>!d.verified).length;

  return {
    ok: true,
    summary: { vehicles: vehicles.length, available, reserved, inTransit, stockValue, receivable, activeMissions, containers: (containersR.data||[]).length, pendingDocs, byStatus },
    vehicles,
    warehouses: warehousesR.data || [],
    containers: containersR.data || [],
    orders,
    missions,
    missionVehicles: linksR.data || [],
    costs: costsR.data || [],
    documents: docsR.data || [],
    customers: customersR.data || [],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!authorized(body.passcode)) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
    const sb = supabase();
    const action = String(body.action || "dashboard");

    if (action === "dashboard") return NextResponse.json(await dashboard(sb));

    if (action === "create_location") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ ok: false, error: "Nom de localisation requis" }, { status: 400 });
      const { data, error } = await sb.from("warehouses").insert({ name, city: body.city || null, address: body.address || null, type: body.type || "depot", active: true }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, location: data });
    }

    if (action === "create_container") {
      const number = String(body.container_number || "").trim();
      if (!number) return NextResponse.json({ ok: false, error: "Numéro de conteneur requis" }, { status: 400 });
      const { data: existing } = await sb.from("containers").select("id").eq("container_number", number).maybeSingle();
      if (existing) return NextResponse.json({ ok: true, container: existing, existing: true });
      const { data, error } = await sb.from("containers").insert({ container_number: number, bl_number: body.bl_number || null, status: body.status || "planned", eta: body.eta || null, port_arrival: body.port_arrival || "Le Havre", warehouse_id: body.warehouse_id || null }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, container: data });
    }

    if (action === "create_vehicle") {
      const vin = String(body.vin || "").replace(/\s+/g, "").toUpperCase();
      if (!vin) return NextResponse.json({ ok: false, error: "VIN requis" }, { status: 400 });
      const { data: existing } = await sb.from("vehicles").select("id").or(`vin.eq.${vin},chassis_number.eq.${vin}`).maybeSingle();
      if (existing) return NextResponse.json({ ok: false, error: "Ce VIN existe déjà" }, { status: 409 });
      const ref = body.internal_ref || `ND-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;
      const warehouse = body.warehouse_id ? (await sb.from("warehouses").select("name").eq("id", body.warehouse_id).maybeSingle()).data : null;
      const status = body.status || (body.warehouse_id ? "available" : "ordered");
      const { data, error } = await sb.from("vehicles").insert({ internal_ref: ref, vin, chassis_number: vin, model: body.model || null, version: body.version || null, color: body.color || null, battery_type: body.battery_type || null, container_id: body.container_id || null, warehouse_id: body.warehouse_id || null, location_label: warehouse?.name || null, status, factory_cost: Number(body.factory_cost) || null, landed_cost: Number(body.factory_cost) || null, received_at: body.warehouse_id ? new Date().toISOString() : null, last_movement_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      await addEvent(sb, data.id, "created", null, status, warehouse?.name || null);
      if (body.container_id) await sb.rpc("recalculate_container_costs", { p_container_id: body.container_id });
      return NextResponse.json({ ok: true, vehicle: data });
    }

    if (action === "move_vehicle" || action === "receive_vehicle") {
      const vehicleId = String(body.vehicle_id || "");
      const warehouseId = String(body.warehouse_id || "");
      if (!vehicleId || !warehouseId) return NextResponse.json({ ok: false, error: "Véhicule et localisation requis" }, { status: 400 });
      const [{ data: vehicle }, { data: warehouse }] = await Promise.all([
        sb.from("vehicles").select("id,status").eq("id", vehicleId).single(),
        sb.from("warehouses").select("id,name").eq("id", warehouseId).single(),
      ]);
      if (!vehicle || !warehouse) return NextResponse.json({ ok: false, error: "Véhicule ou localisation introuvable" }, { status: 404 });
      const toStatus = body.status || "available";
      const patch:any = { warehouse_id: warehouseId, location_label: warehouse.name, status: toStatus, last_movement_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (action === "receive_vehicle") patch.received_at = new Date().toISOString();
      const { error } = await sb.from("vehicles").update(patch).eq("id", vehicleId);
      if (error) throw error;
      await addEvent(sb, vehicleId, action === "receive_vehicle" ? "received" : "moved", vehicle.status, toStatus, warehouse.name, { warehouse_id: warehouseId });
      return NextResponse.json({ ok: true });
    }

    if (action === "add_cost") {
      const containerId = String(body.container_id || "");
      const amount = Number(body.amount || 0);
      if (!containerId || !(amount >= 0)) return NextResponse.json({ ok: false, error: "Conteneur et montant requis" }, { status: 400 });
      const { data, error } = await sb.from("container_cost_items").insert({ container_id: containerId, category: body.category || "other", label: body.label || "Frais divers", amount, allocation_method: body.allocation_method || "equal", include_in_landed_cost: body.include_in_landed_cost !== false }).select().single();
      if (error) throw error;
      await sb.rpc("recalculate_container_costs", { p_container_id: containerId });
      return NextResponse.json({ ok: true, cost: data });
    }

    if (action === "recalculate_container") {
      const containerId = String(body.container_id || "");
      const { data, error } = await sb.rpc("recalculate_container_costs", { p_container_id: containerId });
      if (error) throw error;
      return NextResponse.json({ ok: true, result: data });
    }

    if (action === "create_mission") {
      const vehicleIds = Array.isArray(body.vehicle_ids) ? body.vehicle_ids.filter(Boolean) : [];
      const driverName = String(body.driver_name || "").trim();
      if (!vehicleIds.length || !driverName) return NextResponse.json({ ok: false, error: "Chauffeur et véhicule(s) requis" }, { status: 400 });
      const missionNumber = `TR-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
      const { data: mission, error } = await sb.from("transport_missions").insert({ mission_number: missionNumber, carrier_name: body.carrier_name || null, driver_name: driverName, driver_phone: body.driver_phone || null, pickup_warehouse_id: body.pickup_warehouse_id || null, destination_type: body.destination_type || "customer", destination_warehouse_id: body.destination_warehouse_id || null, destination_label: body.destination_label || null, customer_id: body.customer_id || null, order_id: body.order_id || null, status: "planned", payment_required: Boolean(body.payment_required), payment_confirmed: Boolean(body.payment_confirmed), scheduled_at: body.scheduled_at || null, notes: body.notes || null }).select().single();
      if (error) throw error;
      const { error: linkError } = await sb.from("transport_mission_vehicles").insert(vehicleIds.map((vehicle_id:string)=>({ mission_id: mission.id, vehicle_id })));
      if (linkError) throw linkError;
      await sb.from("vehicles").update({ status: "assigned_transport", updated_at: new Date().toISOString() }).in("id", vehicleIds);
      for (const id of vehicleIds) await addEvent(sb, id, "transport_assigned", null, "assigned_transport", null, { mission_id: mission.id, mission_number: missionNumber, driver_name: driverName });
      return NextResponse.json({ ok: true, mission });
    }

    if (action === "mission_load_vehicle") {
      const missionId = String(body.mission_id || "");
      const vehicleId = String(body.vehicle_id || "");
      const { data: mission } = await sb.from("transport_missions").select("id,driver_name,status").eq("id", missionId).single();
      const { data: vehicle } = await sb.from("vehicles").select("id,status").eq("id", vehicleId).single();
      if (!mission || !vehicle) return NextResponse.json({ ok: false, error: "Mission ou véhicule introuvable" }, { status: 404 });
      const now = new Date().toISOString();
      await sb.from("transport_mission_vehicles").update({ loaded_at: now }).eq("mission_id", missionId).eq("vehicle_id", vehicleId);
      await sb.from("transport_missions").update({ status: "in_transit", started_at: mission.status === "planned" ? now : undefined, updated_at: now }).eq("id", missionId);
      await sb.from("vehicles").update({ status: "in_transit", warehouse_id: null, location_label: `Transporteur · ${mission.driver_name}`, last_movement_at: now, updated_at: now }).eq("id", vehicleId);
      await addEvent(sb, vehicleId, "loaded", vehicle.status, "in_transit", `Transporteur · ${mission.driver_name}`, { mission_id: missionId });
      return NextResponse.json({ ok: true });
    }

    if (action === "mission_complete_vehicle") {
      const missionId = String(body.mission_id || "");
      const vehicleId = String(body.vehicle_id || "");
      const { data: mission } = await sb.from("transport_missions").select("id,driver_name,destination_type,destination_warehouse_id,destination_label,payment_required,payment_confirmed").eq("id", missionId).single();
      const { data: vehicle } = await sb.from("vehicles").select("id,status").eq("id", vehicleId).single();
      if (!mission || !vehicle) return NextResponse.json({ ok: false, error: "Mission ou véhicule introuvable" }, { status: 404 });
      if (mission.payment_required && !mission.payment_confirmed) return NextResponse.json({ ok: false, error: "Paiement non confirmé : livraison bloquée" }, { status: 409 });
      const now = new Date().toISOString();
      let warehouseId:any = null;
      let location = mission.destination_label || "Client final";
      let status = mission.destination_type === "warehouse" ? "available" : "delivered";
      if (mission.destination_warehouse_id) {
        const { data: wh } = await sb.from("warehouses").select("name").eq("id", mission.destination_warehouse_id).maybeSingle();
        warehouseId = mission.destination_warehouse_id;
        location = wh?.name || location;
        status = "available";
      }
      await sb.from("transport_mission_vehicles").update({ delivered_at: now, notes: body.notes || null }).eq("mission_id", missionId).eq("vehicle_id", vehicleId);
      await sb.from("vehicles").update({ status, warehouse_id: warehouseId, location_label: location, delivered_at: status === "delivered" ? now : null, last_movement_at: now, updated_at: now }).eq("id", vehicleId);
      await addEvent(sb, vehicleId, "delivered", vehicle.status, status, location, { mission_id: missionId });
      const { data: remaining } = await sb.from("transport_mission_vehicles").select("id,delivered_at").eq("mission_id", missionId).is("delivered_at", null);
      if (!remaining?.length) await sb.from("transport_missions").update({ status: "completed", completed_at: now, updated_at: now }).eq("id", missionId);
      return NextResponse.json({ ok: true });
    }

    if (action === "confirm_mission_payment") {
      const missionId = String(body.mission_id || "");
      const { error } = await sb.from("transport_missions").update({ payment_confirmed: true, updated_at: new Date().toISOString() }).eq("id", missionId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
