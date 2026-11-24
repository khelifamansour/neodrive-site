import { NextResponse, after } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { checkInboundKey, processInbound, recordInbound, type InboundItem } from "../../../../lib/compta-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Boîte de réception des factures fournisseurs : webhook Brevo Inbound Parsing (événement « inboundEmailProcessed »).
 * Brevo envoie { items: [{ From, To, Subject, SentAtDate, MessageId, Attachments: [{ Name, ContentType, ContentLength, DownloadToken }], RawTextBody, RawHtmlBody, … }] }.
 * Protégé par la clé secrète ?k=… (voir inboundKey). Réponse immédiate, traitement ensuite (after) : pièces jointes
 * téléchargées par l'API Brevo, rangées comme justificatifs, lues, dédoublonnées et rapprochées des débits Revolut.
 */
export async function POST(req: Request) {
  if (!checkInboundKey(new URL(req.url).searchParams.get("k") || "")) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => null) as { items?: unknown } | unknown[] | null;
  const items = (Array.isArray(body) ? body : Array.isArray((body as { items?: unknown })?.items) ? (body as { items: unknown[] }).items : body && typeof body === "object" ? [body] : [])
    .filter((x): x is InboundItem => !!x && typeof x === "object").slice(0, 20);
  if (!items.length) return NextResponse.json({ ok: true, received: 0 });
  const db = crmDatabase();
  const todo: { id: number; item: InboundItem }[] = [];
  for (const item of items) {
    try { const id = await recordInbound(db, item); if (id) todo.push({ id, item }); }
    catch (e) { console.error("[COMPTA INBOUND] enregistrement", e); return NextResponse.json({ ok: false, error: "base indisponible" }, { status: 503 }); }
  }
  after(async () => {
    await applyStoredSecrets();
    for (const t of todo) { try { await processInbound(db, t.id, t.item); } catch (e) { console.error("[COMPTA INBOUND]", t.id, e); } }
  });
  return NextResponse.json({ ok: true, received: items.length, new: todo.length });
}
