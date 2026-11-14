import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { listJson } from "../../../lib/datastore";
import { PLAN_CLIENTS, PLAN_TOURS, clientName } from "../../../lib/fleet";
import type { PlanClient, PlanTour } from "../../../lib/planif";
import { cleanSettings, type RawData } from "../../../lib/rentabilite";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const KEY = "rentabilite";
const CATEGORIES = ["loyer", "publicite", "equipe", "transport", "banque", "assurance", "materiel", "autre"];
const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);

/** Rentabilité (estimation) : lecture des données existantes + réglages et dépenses de l'équipe. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const acc = await authorizeSection(req, b.passcode, "rentabilite");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "load") {
      const [ships, docs, vehicles, settings, expenses, parts, orders, clients, tours] = await Promise.all([
        db.from("shipments").select("id,name,port,status,vehicles,unit_price,extra_lines,container_list,invoice_part,eta,arrived_at,loaded_at,depot,model").order("eta", { ascending: true, nullsFirst: false }),
        db.from("shipment_docs").select("shipment_id,doc_type,version,created_at,ai_note,file_name").eq("doc_type", "transport"),
        db.from("shipment_vehicles").select("id,shipment_id,vin,container,status,depot,client_id,client_name,depot_at,delivered_at,updated_at").order("vin"),
        db.from("finance_settings").select("value,updated_at,updated_by").eq("key", KEY).maybeSingle(),
        db.from("finance_expenses").select("*").order("month", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
        db.from("parts").select("sku,purchase_price").not("purchase_price", "is", null),
        db.from("parts_orders").select("created_at,updated_at,status,total_ht,shipping_ht,lines").limit(5000),
        listJson<PlanClient>(db, PLAN_CLIENTS), listJson<PlanTour>(db, PLAN_TOURS),
      ]);
      for (const r of [ships, docs, vehicles, settings, expenses, parts, orders]) if (r.error) throw new Error(r.error.message);
      const partsCost: Record<string, number> = {};
      for (const p of parts.data || []) if (p.sku && Number(p.purchase_price) > 0) partsCost[p.sku] = Number(p.purchase_price);
      const raw: RawData = {
        ships: (ships.data || []) as RawData["ships"], docs: (docs.data || []) as RawData["docs"], vehicles: (vehicles.data || []) as RawData["vehicles"],
        // Seulement ce qui sert au calcul (pas de téléphone, e-mail ni adresse)
        clients: clients.filter(c => !String(c.note || "").startsWith("TEST")).map(c => ({ id: c.id, modele: c.modele, code_postal: c.code_postal, total: c.total, status: c.status, tour_id: c.tour_id || null, name: clientName(c) })),
        tours: tours.map(t => ({ id: t.id, name: t.name, status: t.status, clients: (t.clientIds || []).length, cost: t.costs?.total ?? null })),
        partsOrders: (orders.data || []) as RawData["partsOrders"], partsCost, expenses: (expenses.data || []) as RawData["expenses"],
      };
      return NextResponse.json({ ok: true, raw, settings: cleanSettings(settings.data?.value), settingsMeta: settings.data ? { updated_at: settings.data.updated_at, updated_by: settings.data.updated_by } : null, who: acc.who, name: acc.name, categories: CATEGORIES });
    }
    if (b.action === "save_settings") {
      const value = cleanSettings(b.settings);
      const { error } = await db.from("finance_settings").upsert({ key: KEY, value, updated_at: new Date().toISOString(), updated_by: acc.name }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      await logSection(acc, "rentabilite_reglages");
      return NextResponse.json({ ok: true, settings: value });
    }
    if (b.action === "expense_add") {
      const month = clean(b.month, 7), label = clean(b.label, 120);
      const category = CATEGORIES.includes(String(b.category)) ? String(b.category) : "autre";
      const amount = Number(b.amount), tva = Math.min(100, Math.max(0, Number(b.tva) || 0));
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ ok: false, error: "Mois invalide (AAAA-MM)." }, { status: 400 });
      if (!label) return NextResponse.json({ ok: false, error: "Indiquez un libellé." }, { status: 400 });
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e7) return NextResponse.json({ ok: false, error: "Montant invalide." }, { status: 400 });
      const isTtc = !!b.ttc;
      const amount_ht = Math.round((isTtc ? amount / (1 + tva / 100) : amount) * 100) / 100;
      const amount_ttc = Math.round((isTtc ? amount : amount * (1 + tva / 100)) * 100) / 100;
      const { data, error } = await db.from("finance_expenses").insert({ month, label, category, amount_ht, amount_ttc, note: clean(b.note, 300) || null, created_by: acc.name }).select("*").single();
      if (error) throw new Error(error.message);
      await logSection(acc, "rentabilite_depense", { month, label, amount_ht });
      return NextResponse.json({ ok: true, expense: data });
    }
    if (b.action === "expense_delete" && b.id) {
      const { data: row } = await db.from("finance_expenses").select("id,created_by").eq("id", Number(b.id)).maybeSingle();
      if (!row) return NextResponse.json({ ok: false, error: "Dépense introuvable" }, { status: 404 });
      if (acc.who !== "owner" && row.created_by !== acc.name) return NextResponse.json({ ok: false, error: "Seul le fondateur ou l'auteur peut supprimer cette ligne." }, { status: 403 });
      const { error } = await db.from("finance_expenses").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      await logSection(acc, "rentabilite_depense_suppr", { id: row.id });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[RENTABILITE]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
