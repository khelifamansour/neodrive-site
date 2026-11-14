import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { OWNER_EMAIL, brevoReady, sendEmail } from "../../../../lib/brevo";
import { SAV_MEDIA_BUCKET } from "../../../../lib/sav";
import { CLOSED_STATUSES } from "../../../../lib/sav-center";
import { addEvent, addMessage, adminUrl, clip, emailHtml, findCustomerTicket, listUploaded, statusPatch } from "../../../../lib/sav-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Réponse du client depuis sa page de suivi (texte + photos/vidéos déjà envoyées dans le stockage privé). Prévient le fondateur par e-mail. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const found = await findCustomerTicket(b.reference, b.email);
  if ("error" in found) return NextResponse.json({ ok: false, error: found.error }, { status: found.status });
  const { sb, ticket: t } = found;
  const body = clip(b.body, 5000);
  const folder = String(b.folder || "");
  let attachments: Awaited<ReturnType<typeof listUploaded>> = [];
  if (folder) {
    if (!new RegExp(`^sav/${t.public_reference}-reponse-[0-9a-f-]{36}$`).test(folder)) return NextResponse.json({ ok: false, error: "Envoi invalide, rechargez la page." }, { status: 400 });
    attachments = await listUploaded(sb, SAV_MEDIA_BUCKET, folder);
  }
  if (!body && !attachments.length) return NextResponse.json({ ok: false, error: "Écrivez un message ou ajoutez une photo / vidéo." }, { status: 400 });
  try {
    await addMessage(sb, t.id, { direction: "in", channel: "plateforme", author: t.customer_name || "Client", body, attachments });
  } catch (e) { return NextResponse.json({ ok: false, error: "Message non enregistré : " + (e as Error).message }, { status: 500 }); }

  // La réponse du client relance le dossier
  const { data: cur } = await sb.from("sav_tickets").select("sav_status,closed_at").eq("id", t.id).maybeSingle();
  const st = cur?.sav_status || "nouveau";
  if (st === "attente_client" || CLOSED_STATUSES.includes(st)) {
    await sb.from("sav_tickets").update(statusPatch("en_cours", cur?.closed_at || null)).eq("id", t.id);
    await addEvent(sb, t.id, { kind: "status", from: st, to: "en_cours", author: "Client", note: CLOSED_STATUSES.includes(st) ? "Dossier rouvert par une réponse du client" : "Réponse du client reçue" });
  }

  let notified = false;
  try {
    await applyStoredSecrets();
    if (brevoReady()) {
      const txt = `${t.customer_name || "Le client"} a répondu sur la demande ${t.public_reference}.\n\n${body || "(sans texte)"}${attachments.length ? `\n\n📎 ${attachments.length} fichier(s) joint(s)` : ""}`;
      await sendEmail(OWNER_EMAIL, "NeoDrive", `💬 SAV ${t.public_reference} : réponse de ${t.customer_name || "client"}`, emailHtml("Nouvelle réponse d’un client", txt, adminUrl(t.public_reference), "Ouvrir le ticket"));
      notified = true;
    }
  } catch (e) { console.error("[SAV] notification", (e as Error).message); }
  return NextResponse.json({ ok: true, notified, mediaCount: attachments.length });
}
