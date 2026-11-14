import { NextResponse } from "next/server";
import { partImage } from "../../../../lib/sav-center";
import { savDb } from "../../../../lib/sav-server";

export const dynamic = "force-dynamic";

/**
 * Catalogue des pièces pour le formulaire SAV (lecture seule, sans prix d'achat ni stock).
 * ?q=texte (nom, référence, catégorie) · ?ids=uuid,uuid · ?skus=REF1,REF2
 */
export async function GET(req: Request) {
  const sb = savDb();
  if (!sb) return NextResponse.json({ ok: false, parts: [], error: "Configuration manquante" }, { status: 503 });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 60).replace(/[%_,()*\\]/g, " ").trim();
  const ids = (u.searchParams.get("ids") || "").split(",").filter(x => /^[0-9a-f-]{36}$/.test(x)).slice(0, 20);
  const skus = (u.searchParams.get("skus") || "").split(",").map(s => s.trim()).filter(s => /^[\w.\-/]{1,40}$/.test(s)).slice(0, 20);
  let query = sb.from("parts").select("id,sku,name,category,sale_price,image_url").order("name", { ascending: true }).limit(40);
  if (ids.length) query = query.in("id", ids);
  else if (skus.length) query = query.in("sku", skus);
  else if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, parts: [], error: "Catalogue indisponible" }, { status: 500 });
  const parts = (data || []).map(p => ({ id: p.id, sku: p.sku, name: p.name, category: p.category, sale_price: p.sale_price, image_url: partImage(p.image_url) }));
  return NextResponse.json({ ok: true, parts }, { headers: { "Cache-Control": "public, max-age=60" } });
}
