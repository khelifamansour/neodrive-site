import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../../lib/crm-agent";
import { clientChangeDate, clientConfirm, publicView, reservationByToken } from "../../../../../lib/delivery-pack";

export const dynamic = "force-dynamic";

/** Page client /livraison/<jeton> : lecture des informations, confirmation de présence, demande de changement de date. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await reservationByToken(crmDatabase(), token);
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, pack: publicView(r) }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = crmDatabase();
  const r = await reservationByToken(sb, token);
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });
  if (r.statut === "Annulée" || r.livre_at || r.statut === "Livrée") return NextResponse.json({ ok: false, error: "Cette livraison n'est plus modifiable." }, { status: 400 });
  const b = await req.json().catch(() => ({})) as { action?: string; message?: string };
  try {
    if (b.action === "confirm") await clientConfirm(sb, r);
    else if (b.action === "change") await clientChangeDate(sb, r, String(b.message || ""));
    else return NextResponse.json({ ok: false }, { status: 400 });
    const fresh = await reservationByToken(sb, token);
    return NextResponse.json({ ok: true, pack: fresh ? publicView(fresh) : null });
  } catch (e) { console.error("[PACK-CLIENT]", e); return NextResponse.json({ ok: false, error: "Une erreur est survenue, réessayez ou appelez-nous." }, { status: 500 }); }
}
