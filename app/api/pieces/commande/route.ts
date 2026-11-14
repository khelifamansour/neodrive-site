import { NextResponse } from "next/server";
import { orderTotals, shippingHtFor, type HistoryEntry, type OrderLine, type ShippingMode } from "../../../../lib/parts";
import { db, normOrder, ORDER_COLUMNS, sendProforma } from "../../../../lib/parts-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** Commande publique de pièces : prix relus en base, pro forma envoyée par e-mail. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  if (clean(b.website)) return NextResponse.json({ ok: false, error: "Requête refusée." }, { status: 400 }); // pot de miel anti-robot

  const first = clean(b.first_name, 80), last = clean(b.last_name, 80), phone = clean(b.phone, 40), email = clean(b.email, 160).toLowerCase();
  const address = clean(b.address, 400), vin = clean(b.vin, 40).replace(/\s+/g, "").toUpperCase(), message = clean(b.message, 2000);
  const mode: ShippingMode = "envoi"; // envoi uniquement (pas de retrait sur place)
  if (!first || !last) return NextResponse.json({ ok: false, error: "Indiquez votre nom et votre prénom." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 9) return NextResponse.json({ ok: false, error: "Numéro de téléphone invalide." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Adresse e-mail invalide." }, { status: 400 });
  if (mode === "envoi" && address.length < 8) return NextResponse.json({ ok: false, error: "Indiquez l'adresse de livraison complète." }, { status: 400 });

  const wanted = new Map<string, number>();
  for (const l of Array.isArray(b.lines) ? b.lines.slice(0, 60) : []) {
    const sku = clean((l as { sku?: unknown })?.sku, 60); const qty = Math.floor(Number((l as { qty?: unknown })?.qty));
    if (sku && qty > 0) wanted.set(sku, Math.min(99, (wanted.get(sku) || 0) + qty));
  }
  if (!wanted.size) return NextResponse.json({ ok: false, error: "Votre panier est vide." }, { status: 400 });

  let sb;
  try { sb = db(); } catch { return NextResponse.json({ ok: false, error: "Service momentanément indisponible. Appelez-nous au 06 89 78 17 10." }, { status: 503 }); }
  const { data: parts, error: pe } = await sb.from("parts").select("sku,name,category,sale_price,image_url,active").in("sku", [...wanted.keys()]);
  if (pe) return NextResponse.json({ ok: false, error: "Catalogue indisponible, réessayez." }, { status: 500 });
  const lines: OrderLine[] = []; const missing: string[] = [];
  for (const [sku, qty] of wanted) {
    const p = parts?.find(x => x.sku === sku);
    if (!p || p.active === false || p.sale_price === null) { missing.push(sku); continue; }
    lines.push({ sku, name: p.name, qty, unit_ht: Number(p.sale_price), image_url: p.image_url || null });
  }
  if (missing.length) return NextResponse.json({ ok: false, error: `Pièce(s) plus disponible(s) en ligne : ${missing.join(", ")}. Retirez-les du panier.`, missing }, { status: 409 });

  const shipHt = shippingHtFor(lines.map(l => ({ name: l.name, category: parts?.find(x => x.sku === l.sku)?.category })));
  const t = orderTotals(lines, shipHt);
  const now = new Date().toISOString();
  const history: HistoryEntry[] = [{ at: now, by: "Client (site)", action: "Commande créée", to: "nouvelle" }];
  const { data: row, error } = await sb.from("parts_orders").insert({
    customer_first_name: first, customer_last_name: last, customer_phone: phone, customer_email: email,
    shipping_address: address || null, vin: vin || null, lines, total_ht: t.total_ht, tva: t.tva, total_ttc: t.total_ttc,
    shipping_mode: mode, shipping_ht: shipHt, status: "nouvelle", customer_message: message || null, history,
  }).select(ORDER_COLUMNS).single();
  if (error || !row) return NextResponse.json({ ok: false, error: "La commande n'a pas pu être enregistrée. Réessayez ou appelez-nous." }, { status: 500 });
  const order = normOrder(row);

  const sent = await sendProforma(order);
  order.history.push({ at: new Date().toISOString(), by: "Système", action: sent.customer ? "Pro forma envoyée par e-mail au client" : `Pro forma non envoyée automatiquement${sent.error ? ` (${sent.error})` : ""}` });
  await sb.from("parts_orders").update({ history: order.history, updated_at: new Date().toISOString() }).eq("id", order.id);

  return NextResponse.json({ ok: true, order_number: order.order_number, token: order.public_token, total_ttc: order.total_ttc, emailSent: sent.customer });
}
