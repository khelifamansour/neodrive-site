import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../../lib/access";
import { normalizePhone } from "../../../../lib/crm-agent";
import { isOrderStatus, ORDER_STATUSES, orderTotals, round2, type HistoryEntry, type PartsOrder } from "../../../../lib/parts";
import { db, normOrder, ORDER_COLUMNS, proformaPdf, sendProforma, statusUrl, whatsappText } from "../../../../lib/parts-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const withLinks = (o: PartsOrder) => {
  const wa = normalizePhone(o.customer_phone);
  return { ...o, status_url: statusUrl(o.public_token), whatsapp_url: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(whatsappText(o))}` : null };
};

/** Back-office des commandes de pièces : fondateur (code) ou membre de l'équipe ayant la section « pieces ». */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const access = await authorizeSection(req, b.passcode, "pieces").catch(() => null);
  if (!access) return bad("Accès refusé", 401);
  let sb;
  try { sb = db(); } catch { return bad("Configuration Supabase manquante", 503); }
  const who = access.name;

  const getOrder = async (id: unknown) => {
    const { data } = await sb.from("parts_orders").select(ORDER_COLUMNS).eq("id", String(id || "")).maybeSingle();
    return data ? normOrder(data) : null;
  };
  const save = async (o: PartsOrder, patch: Record<string, unknown>, entry: Omit<HistoryEntry, "at" | "by">) => {
    const history = [...o.history, { at: new Date().toISOString(), by: who, ...entry }];
    const { data, error } = await sb.from("parts_orders").update({ ...patch, history, updated_at: new Date().toISOString() }).eq("id", o.id).select(ORDER_COLUMNS).single();
    if (error || !data) throw new Error(error?.message || "Mise à jour impossible");
    return normOrder(data);
  };

  try {
    switch (b.action) {
      case "list": {
        const { data, error } = await sb.from("parts_orders").select(ORDER_COLUMNS).order("created_at", { ascending: false }).limit(500);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true, who, role: access.who, statuses: ORDER_STATUSES, orders: (data || []).map(r => withLinks(normOrder(r))) });
      }

      case "status": {
        const o = await getOrder(b.id); if (!o) return bad("Commande introuvable", 404);
        if (!isOrderStatus(b.status)) return bad("Statut invalide");
        if (b.status === o.status) return NextResponse.json({ ok: true, order: withLinks(o) });
        const note = String(b.note || "").trim().slice(0, 1000);
        const u = await save(o, { status: b.status }, { action: "Changement de statut", from: o.status, to: b.status, ...(note ? { note } : {}) });
        await logSection(access, "pieces_status", { order: o.order_number, from: o.status, to: b.status });
        return NextResponse.json({ ok: true, order: withLinks(u) });
      }

      case "notes": {
        const o = await getOrder(b.id); if (!o) return bad("Commande introuvable", 404);
        const u = await save(o, { notes: String(b.notes || "").slice(0, 5000) || null }, { action: "Notes internes modifiées" });
        await logSection(access, "pieces_notes", { order: o.order_number });
        return NextResponse.json({ ok: true, order: withLinks(u) });
      }

      case "shipping": {
        const o = await getOrder(b.id); if (!o) return bad("Commande introuvable", 404);
        const raw = b.shipping_ht; const v = raw === null || raw === "" || raw === undefined ? null : round2(Number(String(raw).replace(",", ".")));
        if (v !== null && (!Number.isFinite(v) || v < 0 || v > 10000)) return bad("Montant invalide");
        const t = orderTotals(o.lines, v);
        const u = await save(o, { shipping_ht: v, total_ht: t.total_ht, tva: t.tva, total_ttc: t.total_ttc }, { action: `Frais d'envoi HT : ${v === null ? "à confirmer" : v.toFixed(2).replace(".", ",") + " €"}` });
        await logSection(access, "pieces_shipping", { order: o.order_number, shipping_ht: v });
        return NextResponse.json({ ok: true, order: withLinks(u) });
      }

      case "send": {
        const o = await getOrder(b.id); if (!o) return bad("Commande introuvable", 404);
        const r = await sendProforma(o, { customer: true, owner: false });
        if (!r.customer) return bad(r.error || "Envoi impossible", 502);
        const patch = o.status === "nouvelle" ? { status: "proforma envoyée" } : {};
        const u = await save(o, patch, { action: "Pro forma envoyée par e-mail au client", ...(o.status === "nouvelle" ? { from: o.status, to: "proforma envoyée" } : {}) });
        await logSection(access, "pieces_proforma", { order: o.order_number });
        return NextResponse.json({ ok: true, order: withLinks(u) });
      }

      case "pdf": {
        const o = await getOrder(b.id); if (!o) return bad("Commande introuvable", 404);
        const pdf = await proformaPdf(o);
        return NextResponse.json({ ok: true, name: `Pro-forma-${o.order_number}.pdf`, base64: pdf.toString("base64") });
      }

      case "parts": {
        const { data, error } = await sb.from("parts").select("id,sku,name,category,sale_price,purchase_price,stock_qty,image_url,active,notes").order("category").order("name").limit(2000);
        if (error) return bad(error.message, 500);
        return NextResponse.json({ ok: true, parts: data });
      }

      case "part_update": {
        const id = String(b.id || ""); const p = (b.part || {}) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        if ("sale_price" in p) { const v = p.sale_price === "" || p.sale_price === null ? null : Number(String(p.sale_price).replace(",", ".")); if (v !== null && (!Number.isFinite(v) || v < 0)) return bad("Prix invalide"); patch.sale_price = v === null ? null : round2(v); }
        if ("stock_qty" in p) { const v = Math.floor(Number(p.stock_qty)); if (!Number.isFinite(v) || v < 0) return bad("Stock invalide"); patch.stock_qty = v; }
        if ("image_url" in p) { const v = String(p.image_url || "").trim(); if (v && !/^(\/|https:\/\/)/.test(v)) return bad("Photo : adresse commençant par / ou https://"); patch.image_url = v || null; }
        if ("active" in p) patch.active = Boolean(p.active);
        if ("name" in p) { const v = String(p.name || "").trim(); if (!v) return bad("Nom obligatoire"); patch.name = v.slice(0, 200); }
        if ("category" in p) patch.category = String(p.category || "").trim().slice(0, 80) || null;
        if (!Object.keys(patch).length) return bad("Rien à modifier");
        const { data, error } = await sb.from("parts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("id,sku,name,category,sale_price,purchase_price,stock_qty,image_url,active,notes").single();
        if (error) return bad(error.message, 500);
        await logSection(access, "pieces_part_update", { sku: data.sku, ...patch });
        return NextResponse.json({ ok: true, part: data });
      }
    }
  } catch (e) { return bad((e as Error).message, 500); }
  return bad("Action inconnue");
}
