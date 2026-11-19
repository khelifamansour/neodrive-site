import { crmDatabase } from "../../../../lib/crm-agent";
import { DRIVER_BUCKET } from "../../../../lib/driver-docs";

export const dynamic = "force-dynamic";

/** Accusé de réception du véhicule (PDF), lisible par le client via son lien secret. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response("Lien invalide", { status: 404 });
  try {
    const db = crmDatabase();
    const { data: a } = await db.from("reservations").select("id,accuse_path").eq("accuse_token", token).maybeSingle();
    // Même lien pour la remise avec réserve de propriété (paiement en attente).
    const { data: rs } = a ? { data: null } : await db.from("reservations").select("id,reserve_path").eq("reserve_token", token).maybeSingle();
    const r = a ? { id: a.id, path: a.accuse_path as string | null, reserve: false } : rs ? { id: rs.id, path: rs.reserve_path as string | null, reserve: true } : null;
    if (!r?.path) return new Response("Accusé introuvable", { status: 404 });
    const { data, error } = await db.storage.from(DRIVER_BUCKET).download(r.path);
    if (error || !data) return new Response("Document indisponible", { status: 503 });
    return new Response(new Uint8Array(await data.arrayBuffer()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${r.reserve ? "Remise-reserve-propriete" : "Accuse-reception"}-NeoDrive-${r.id}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
  } catch { return new Response("Service indisponible", { status: 503 }); }
}
