import { db, normOrder, ORDER_COLUMNS, proformaPdf } from "../../../../../../lib/parts-server";

export const dynamic = "force-dynamic";

/** Facture pro forma téléchargeable par le client (lien secret de suivi). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24,64}$/.test(token)) return new Response("Lien invalide", { status: 404 });
  let row;
  try { ({ data: row } = await db().from("parts_orders").select(ORDER_COLUMNS).eq("public_token", token).maybeSingle()); } catch { return new Response("Service indisponible", { status: 503 }); }
  if (!row) return new Response("Commande introuvable", { status: 404 });
  const o = normOrder(row);
  if (o.status === "annulée") return new Response("Commande annulée", { status: 410 });
  const pdf = await proformaPdf(o);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Pro-forma-${o.order_number}.pdf"`, "Cache-Control": "private, no-store" } });
}
