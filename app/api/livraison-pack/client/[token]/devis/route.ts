import { crmDatabase } from "../../../../../../lib/crm-agent";
import { devisPdf, reference, reservationByToken } from "../../../../../../lib/delivery-pack";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Devis PDF de la réservation (lien depuis la page client). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await reservationByToken(crmDatabase(), token);
  if (!r) return new Response("Lien invalide", { status: 404 });
  const pdf = await devisPdf(r);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="devis-neodrive-${reference(r)}.pdf"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
