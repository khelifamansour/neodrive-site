import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { DEPOTS, STAGES, isDepot, type ContainerInfo } from "../../../lib/shipments";
import { INVOICE_BUCKET, ensureAllDrafts, ensureDraftInvoice, linkReservationVin, storeInvoicePdf, validateInvoice, type SalesInvoice } from "../../../lib/stock";
import { DEBOURS_KEY, STOCK_STATES, parseImport, payState, stockState, totals, type InvoiceLine } from "../../../lib/stock-shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const RES = "id,created_at,nom,prenom,telephone,email,adresse,code_postal,ville,departement,modele,couleur,total,delivery_price,statut,livre_at,vin,updated_at,plan_client_id,paiement_confirme_at,paiement_en_attente,montant_du,reserve_path,reserve_token,date_promise";
const STATUSES = ["commandée", ...STAGES] as string[];
const isTestShip = (s?: { name?: string | null } | null) => /^TEST/i.test(String(s?.name || ""));

/** Stock par VIN, liens (client, conteneur, carte grise, facture) et factures de vente. Fondateur seulement (code principal). */
export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "load") {
      const drafted = await ensureAllDrafts(db).catch(e => { console.error("[STOCK] brouillons", e); return 0; });
      const [ships, veh, res, inv, cg] = await Promise.all([
        db.from("shipments").select("id,name,status,eta,arrived_at,depot,model,container_list"),
        db.from("shipment_vehicles").select("id,shipment_id,vin,container,status,depot,client_id,client_name,reservation_id,model,color,defect,defect_note,delivered_at,depot_at,source,note,updated_at").order("vin").limit(5000),
        db.from("reservations").select(RES).neq("statut", "Annulée").order("id", { ascending: false }).limit(3000),
        db.from("sales_invoices").select("*").order("id", { ascending: false }).limit(5000),
        db.from("carte_grise_dossiers").select("id,ref,status,vin,reservation_id,vehicle_id,sent_to_provider_at,created_at").limit(3000),
      ]);
      for (const r of [ships, veh, res, inv, cg]) if (r.error) throw new Error(r.error.message);
      const shipById = new Map((ships.data || []).map(s => [s.id, s]));
      const resById = new Map((res.data || []).map(r => [r.id, r]));
      const resByVin = new Map((res.data || []).filter(r => r.vin).map(r => [r.vin, r]));
      const resByPlan = new Map((res.data || []).filter(r => r.plan_client_id).map(r => [r.plan_client_id, r]));
      const invByRes = new Map((inv.data || []).map(i => [i.reservation_id, i]));
      const cgByVin = new Map((cg.data || []).filter(d => d.vin).map(d => [d.vin, d]));
      const cgByRes = new Map((cg.data || []).filter(d => d.reservation_id).map(d => [d.reservation_id, d]));
      const resView = (r: NonNullable<ReturnType<typeof resById.get>>) => ({ id: r.id, name: `${r.prenom || ""} ${r.nom || ""}`.trim(), ville: r.ville, statut: r.statut, livre_at: r.livre_at, total: r.total, modele: r.modele, pay: payState(r) });
      const cars = (veh.data || []).filter(v => !isTestShip(v.shipment_id ? shipById.get(v.shipment_id) : null)).map(v => {
        const sh = v.shipment_id ? shipById.get(v.shipment_id) || null : null;
        const r = (v.reservation_id && resById.get(v.reservation_id)) || resByVin.get(v.vin) || (v.client_id ? resByPlan.get(v.client_id) : null) || null;
        const i = r ? invByRes.get(r.id) : null;
        const d = cgByVin.get(v.vin) || (r ? cgByRes.get(r.id) : null) || null;
        return {
          id: v.id, vin: v.vin, model: v.model || r?.modele || sh?.model || "", color: v.color || "", container: v.container || "", shipment: sh?.name || "", shipment_id: v.shipment_id, eta: sh?.eta || null,
          hub: v.depot || sh?.depot || "", status: v.status, state: stockState(v, sh, r), defect: !!v.defect, defect_note: v.defect_note || "", client_name: v.client_name || "", delivered_at: v.delivered_at || r?.livre_at || null,
          reservation: r ? resView(r) : null, linked: !!v.reservation_id, dossier: d ? { id: d.id, ref: d.ref, status: d.status, sent: !!d.sent_to_provider_at } : null,
          invoice: i ? { id: i.id, status: i.status, number: i.number, total_ttc: i.total_ttc } : null, source: v.source || "",
        };
      });
      const stockVins = new Set(cars.map(c => c.vin));
      const reservedNoVin = (res.data || []).filter(r => !r.vin && !r.livre_at && (r.statut === "Confirmée" || r.statut === "Planifiée")).map(r => ({ ...resView(r), date_promise: r.date_promise, telephone: r.telephone }));
      const soldNotInStock = (res.data || []).filter(r => r.vin && !stockVins.has(r.vin) && !/^LTEST/.test(r.vin)).map(r => ({ ...resView(r), vin: r.vin }));
      const invoices = (inv.data || []).map(i => { const r = i.reservation_id ? resById.get(i.reservation_id) : null; return { ...i, pay: payState(r), reservation_statut: r?.statut || null }; });
      const openRes = (res.data || []).filter(r => r.statut !== "Livrée" && !r.livre_at).map(r => ({ id: r.id, name: `${r.prenom || ""} ${r.nom || ""}`.trim(), statut: r.statut, vin: r.vin, ville: r.ville }));
      return NextResponse.json({ ok: true, cars, reservedNoVin, soldNotInStock, invoices, openRes, drafted, hubs: DEPOTS.map(d => ({ id: d.id, name: d.name })), states: STOCK_STATES, statuses: STATUSES });
    }

    if (b.action === "import") {
      const { rows, errors } = parseImport(String(b.text || "").slice(0, 200_000));
      if (!rows.length) return NextResponse.json({ ok: false, error: errors[0] || "Aucun VIN dans la liste.", errors }, { status: 400 });
      const status = ["commandée", "en mer", "au dépôt"].includes(b.status) ? b.status : "en mer";
      const depot = isDepot(b.depot) ? b.depot : null;
      const [{ data: ships }, { data: existing }] = await Promise.all([
        db.from("shipments").select("id,name,containers,container_list"),
        db.from("shipment_vehicles").select("id,vin,container,shipment_id,model,color,history").in("vin", rows.map(r => r.vin)),
      ]);
      const { data: sameCont } = await db.from("shipment_vehicles").select("container,shipment_id").not("container", "is", null).not("shipment_id", "is", null).limit(5000);
      const shipOf = (c: string) => {
        if (!c) return null;
        const s = (ships || []).find(x => ((x.container_list || []) as ContainerInfo[]).some(k => String(k.no || "").toUpperCase().replace(/\s/g, "") === c) || String(x.containers || "").toUpperCase().replace(/\s/g, "").split(/[,;/]+/).includes(c));
        return s?.id ?? (sameCont || []).find(x => x.container === c)?.shipment_id ?? null;
      };
      const at = new Date().toISOString(); const out = { created: 0, updated: 0, unchanged: 0, noContainer: 0, notes: [] as string[] };
      for (const r of rows) {
        const cur = (existing || []).filter(x => x.vin === r.vin);
        const shipment_id = shipOf(r.container);
        if (!cur.length) {
          const { error } = await db.from("shipment_vehicles").insert({ vin: r.vin, model: r.model || null, color: r.color || null, container: r.container || null, shipment_id, status, depot: status === "au dépôt" ? depot : null, ...(status === "au dépôt" ? { depot_at: at } : {}), source: "import", history: [{ at, by: "Mansour", stage: status, note: `import${r.container ? ` · conteneur ${r.container}` : " · conteneur à préciser"}` }] });
          if (error) out.notes.push(`${r.vin} : ${error.message}`); else { out.created++; if (!shipment_id) out.noContainer++; }
          continue;
        }
        for (const v of cur) {
          const patch: Record<string, unknown> = {}; const changes: string[] = [];
          if (r.model && r.model !== v.model) { patch.model = r.model; changes.push(`modèle ${r.model}`); }
          if (r.color && r.color !== v.color) { patch.color = r.color; changes.push(`couleur ${r.color}`); }
          if (r.container && r.container !== v.container) {
            patch.container = r.container; changes.push(`conteneur ${v.container || "—"} → ${r.container}`);
            if (shipment_id && shipment_id !== v.shipment_id && !(existing || []).some(x => x.vin === r.vin && x.shipment_id === shipment_id)) patch.shipment_id = shipment_id;
            if (!shipment_id) out.notes.push(`${r.vin} : conteneur ${r.container} inconnu dans les dossiers conteneurs (gardé tel quel)`);
          }
          if (!changes.length) { out.unchanged++; continue; }
          const hist = [...(Array.isArray(v.history) ? v.history : []), { at, by: "Mansour", note: `import : ${changes.join(", ")}` }].slice(-50);
          const { error } = await db.from("shipment_vehicles").update({ ...patch, history: hist, updated_at: at }).eq("id", v.id);
          if (error) out.notes.push(`${r.vin} : ${error.message}`); else out.updated++;
        }
      }
      return NextResponse.json({ ok: true, ...out, errors });
    }

    if (b.action === "set_vehicle") {
      const id = Number(b.id);
      const { data: v } = await db.from("shipment_vehicles").select("id,vin,status,reservation_id,history,shipment_id").eq("id", id).maybeSingle();
      if (!v) return NextResponse.json({ ok: false, error: "Véhicule introuvable" }, { status: 404 });
      const at = new Date().toISOString(); const patch: Record<string, unknown> = { updated_at: at }; const notes: string[] = [];
      if ("depot" in b) { patch.depot = isDepot(b.depot) ? b.depot : null; notes.push(`hub ${b.depot || "—"}`); }
      if ("status" in b && STATUSES.includes(b.status)) { patch.status = b.status; if (b.status === "au dépôt") patch.depot_at = at; if (b.status === "livrée") patch.delivered_at = at; notes.push(`statut ${b.status}`); }
      if ("defect" in b) { patch.defect = !!b.defect; notes.push(b.defect ? "défaut signalé" : "défaut levé"); }
      if ("defect_note" in b) patch.defect_note = clean(b.defect_note, 500) || null;
      if ("model" in b) patch.model = clean(b.model, 80) || null;
      if ("color" in b) patch.color = clean(b.color, 40) || null;
      if ("container" in b) { patch.container = clean(b.container, 20).toUpperCase().replace(/\s/g, "") || null; notes.push(`conteneur ${patch.container || "—"}`); }
      if ("reservation_id" in b && !b.reservation_id) { patch.reservation_id = null; patch.client_name = null; patch.client_id = null; notes.push("client retiré"); }
      patch.history = [...(Array.isArray(v.history) ? v.history : []), { at, by: "Mansour", note: notes.join(" · ") }].slice(-50);
      const { error } = await db.from("shipment_vehicles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      // Lier à une réservation : le VIN est aussi écrit sur la réservation (si elle n'en a pas d'autre).
      if (b.reservation_id) {
        const { data: r } = await db.from("reservations").select(RES).eq("id", Number(b.reservation_id)).maybeSingle();
        if (!r) return NextResponse.json({ ok: false, error: "Réservation introuvable" }, { status: 404 });
        if (r.vin && r.vin !== v.vin) return NextResponse.json({ ok: false, error: `Cette réservation porte déjà le VIN ${r.vin}.` }, { status: 409 });
        const { data: dup } = await db.from("reservations").select("id,prenom,nom").eq("vin", v.vin).neq("id", r.id).neq("statut", "Annulée").limit(1);
        if (dup?.length) return NextResponse.json({ ok: false, error: `Ce VIN est déjà sur la réservation de ${dup[0].prenom} ${dup[0].nom}.` }, { status: 409 });
        if (!r.vin) await db.from("reservations").update({ vin: v.vin, updated_at: at }).eq("id", r.id);
        await linkReservationVin(db, { ...r, vin: v.vin }, { by: "Mansour", delivered: !!r.livre_at || r.statut === "Livrée" });
        if (r.livre_at || r.statut === "Livrée") await ensureDraftInvoice(db, r.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (b.action === "invoice_draft") {
      const id = await ensureDraftInvoice(db, Number(b.reservation_id));
      if (!id) return NextResponse.json({ ok: false, error: "Réservation introuvable ou annulée" }, { status: 404 });
      return NextResponse.json({ ok: true, id });
    }

    if (b.action === "invoice_save" || b.action === "invoice_validate") {
      const id = Number(b.id);
      const { data: inv } = await db.from("sales_invoices").select("*").eq("id", id).maybeSingle();
      if (!inv) return NextResponse.json({ ok: false, error: "Facture introuvable" }, { status: 404 });
      if (inv.status === "validée") {
        if (b.action === "invoice_validate") return NextResponse.json({ ok: true, number: inv.number, already: true });
        return NextResponse.json({ ok: false, error: `Facture ${inv.number} validée : elle ne peut plus être modifiée.` }, { status: 409 });
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Array.isArray(b.lines)) {
        const lines: InvoiceLine[] = (b.lines as InvoiceLine[]).slice(0, 10).map(l => ({ key: clean(l.key, 30) || "autre", label: clean(l.label, 200), ttc: Math.round((Number(l.ttc) || 0) * 100) / 100, ...(l.key === DEBOURS_KEY ? { debours: true } : {}) })).filter(l => l.label);
        if (lines.some(l => l.ttc < 0)) return NextResponse.json({ ok: false, error: "Montant négatif refusé" }, { status: 400 });
        Object.assign(patch, { lines, ...totals(lines), retained_ttc: totals(lines).total_ttc });
      }
      if ("adjust_reason" in b) patch.adjust_reason = clean(b.adjust_reason, 500) || null;
      for (const k of ["client_name", "client_address", "client_email", "client_phone"]) if (k in b) patch[k] = clean(b[k], 300) || null;
      // VIN saisi sur un brouillon (anciennes livraisons) : facture, stock et réservation reliés.
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(String(b.vin || "")) && b.vin !== inv.vin) {
        patch.vin = b.vin;
        const { data: r } = inv.reservation_id ? await db.from("reservations").select(RES).eq("id", inv.reservation_id).maybeSingle() : { data: null };
        if (r?.vin && r.vin !== b.vin) return NextResponse.json({ ok: false, error: `La réservation porte le VIN ${r.vin}.` }, { status: 409 });
        const { data: dup } = await db.from("reservations").select("id,prenom,nom").eq("vin", b.vin).neq("id", inv.reservation_id || 0).neq("statut", "Annulée").limit(1);
        if (dup?.length) return NextResponse.json({ ok: false, error: `Ce VIN est déjà sur la réservation de ${dup[0].prenom} ${dup[0].nom}.` }, { status: 409 });
        if (r) { if (!r.vin) await db.from("reservations").update({ vin: b.vin, updated_at: new Date().toISOString() }).eq("id", r.id); patch.vehicle_id = await linkReservationVin(db, { ...r, vin: b.vin }, { by: "Mansour", delivered: true }); }
      }
      const next = { ...inv, ...patch };
      if (Math.abs(Number(next.retained_ttc) - Number(next.suggested_ttc)) >= 0.01 && !next.adjust_reason) return NextResponse.json({ ok: false, error: "Montant retenu différent du montant suggéré : indiquez la raison (ex. défaut, geste commercial)." }, { status: 400 });
      const { error } = await db.from("sales_invoices").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      if (b.action === "invoice_save") return NextResponse.json({ ok: true });
      if (!next.vin) return NextResponse.json({ ok: false, error: "VIN manquant : reliez d'abord la voiture à la vente." }, { status: 400 });
      const done = await validateInvoice(db, id);
      return NextResponse.json({ ok: true, number: done.number });
    }

    if (b.action === "invoice_pdf") {
      const { data: inv } = await db.from("sales_invoices").select("*").eq("id", Number(b.id)).maybeSingle();
      if (!inv || inv.status !== "validée") return NextResponse.json({ ok: false, error: "Le PDF existe seulement pour une facture validée." }, { status: 400 });
      const path = inv.pdf_path || await storeInvoicePdf(db, inv as SalesInvoice);
      const { data } = await db.storage.from(INVOICE_BUCKET).createSignedUrl(path, 900, { download: `${inv.number}.pdf` });
      return NextResponse.json({ ok: !!data, url: data?.signedUrl });
    }

    if (b.action === "csv") {
      const { data: inv, error } = await db.from("sales_invoices").select("id,number,issued_at,client_name,vin,total_ht,tva,total_ttc,reservation_id").eq("status", "validée").order("seq");
      if (error) throw new Error(error.message);
      const ids = (inv || []).map(i => i.reservation_id).filter(Boolean);
      const { data: res } = ids.length ? await db.from("reservations").select("id,paiement_confirme_at,paiement_en_attente,reserve_path,reserve_token,statut,montant_du").in("id", ids) : { data: [] };
      const byId = new Map((res || []).map(r => [r.id, r]));
      const cell = (v: unknown) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const num = (v: unknown) => Number(v || 0).toFixed(2).replace(".", ",");
      const lines = [["Date", "Numéro", "Client", "VIN", "HT", "TVA", "TTC", "Payé"].join(";"),
        ...(inv || []).map(i => { const ps = payState(i.reservation_id ? byId.get(i.reservation_id) : null); return [i.issued_at ? new Date(`${i.issued_at}T12:00:00`).toLocaleDateString("fr-FR") : "", i.number, i.client_name, i.vin, num(i.total_ht), num(i.tva), num(i.total_ttc), ps === "payé" ? "oui" : ps === "réserve de propriété" ? "non (réserve de propriété)" : "non"].map(cell).join(";"); })];
      return NextResponse.json({ ok: true, csv: "﻿" + lines.join("\r\n"), count: (inv || []).length });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[STOCK-FACTURATION]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
