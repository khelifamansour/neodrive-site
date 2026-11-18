import { crmDatabase } from "../../../../lib/crm-agent";
import { DRIVER_BUCKET } from "../../../../lib/driver-docs";

export const dynamic = "force-dynamic";

/** Accusé de réception du véhicule (PDF), lisible par le client via son lien secret. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response("Lien invalide", { status: 404 });
  try {
    const db = crmDatabase();
    const { data: r } = await db.from("reservations").select("id,accuse_path").eq("accuse_token", token).maybeSingle();
    if (!r?.accuse_path) return new Response("Accusé introuvable", { status: 404 });
    const { data, error } = await db.storage.from(DRIVER_BUCKET).download(r.accuse_path);
    if (error || !data) return new Response("Document indisponible", { status: 503 });
    return new Response(new Uint8Array(await data.arrayBuffer()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Accuse-reception-NeoDrive-${r.id}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
  } catch { return new Response("Service indisponible", { status: 503 }); }
}
