import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, type EmailAttachment } from "../../../../lib/brevo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envoi ponctuel d'un e-mail professionnel avec pièces jointes (dossiers transitaires…), préparé par le fondateur et déclenché par un jeton à usage unique (admin_once_tokens.purpose « email-docs », payload = { to, toName, cc, replyTo, subject, html, files: [{ name, content(base64) }] }). */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!brevoReady()) return NextResponse.json({ ok: false, error: "Brevo non connecté" }, { status: 503 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "email-docs").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as any)?.payload as { to?: string; toName?: string; cc?: string[]; replyTo?: string; subject?: string; html?: string; files?: EmailAttachment[]; storage?: { bucket: string; path: string; name: string }[] } | undefined;
  if (!p?.to || !p.subject || !p.html) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    // Pièces stockées sur la plateforme (ex. télex release du transitaire), jointes à leur place dans la liste.
    const stored: EmailAttachment[] = [];
    for (const f of p.storage || []) {
      if (!["shipment-docs"].includes(f.bucket)) continue;
      const { data: blob, error } = await db.storage.from(f.bucket).download(f.path);
      if (error || !blob) throw new Error(`Pièce introuvable : ${f.path}`);
      stored.push({ name: f.name, content: Buffer.from(await blob.arrayBuffer()).toString("base64") });
    }
    const all = [...(p.files || []), ...stored].sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
    const id = await sendEmail(p.to, p.toName || "", p.subject, p.html, all, { cc: p.cc, replyTo: p.replyTo });
    return NextResponse.json({ ok: true, id, files: all.map(f => f.name), cc: p.cc || [] });
  } catch (e: any) { return NextResponse.json({ ok: false, error: e?.message || "erreur" }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
