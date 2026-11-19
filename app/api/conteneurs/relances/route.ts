import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL, SITE } from "../../../../lib/brevo";
import { DOC_TYPES, factoryChecks, mailList, pipelineIndex } from "../../../../lib/shipments";
import { notifyOwner } from "../../../../lib/import-notify";
import { genDocs } from "../gen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EVERY_DAYS = 2;

/**
 * Tâche planifiée (CRON_SECRET) : relance l'usine (en anglais) pour les dossiers incomplets,
 * au plus tous les 2 jours, et prévient le fondateur des dossiers proches de l'arrivée pas encore envoyés au transitaire.
 * ?dry=1 : calcule sans envoyer d'e-mail.
 */
export async function GET(req: Request) {
  await applyStoredSecrets();
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = crmDatabase();
  const { data: ships } = await db.from("shipments").select("*").in("status", ["en production", "en mer"]);
  const reminded: string[] = [], soon: string[] = [];
  for (const s of ships || []) {
    const { data: docs } = await db.from("shipment_docs").select("doc_type,version,created_at,extracted,uploaded_by").eq("shipment_id", s.id);
    const c = factoryChecks(s, (docs || []).filter(d => d.uploaded_by !== "plateforme"));
    if (c.complete) {
      if (!s.factory_complete_at && !dry) {
        const now = new Date().toISOString();
        const up: Record<string, unknown> = { factory_complete_at: now };
        if (pipelineIndex(s.pipeline) < pipelineIndex("documents complets")) { up.pipeline = "documents complets"; up.pipeline_history = [...(Array.isArray(s.pipeline_history) ? s.pipeline_history : []), { at: now, stage: "documents complets", from: s.pipeline, by: "automatique" }]; }
        await db.from("shipments").update(up).eq("id", s.id);
        const g = await genDocs(db, s.id).catch(e => ({ ok: false, error: (e as Error).message }));
        await notifyOwner(`📦 ${s.name} : documents usine complets. ${g.ok ? "Facture, colisage avec VIN et COC regroupés générés : prévisualisez puis envoyez au transitaire." : `Génération à faire : ${"error" in g ? g.error : ""}`}`).catch(() => null);
      }
    }
    else if (s.factory_email && s.factory_token && (!s.factory_reminded_at || Date.now() - new Date(s.factory_reminded_at).getTime() > EVERY_DAYS * 86400000 - 3600000)) {
      const link = `${SITE}/factory/${s.factory_token}`;
      const errors = c.issues.filter(i => i.level === "error");
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Hello,</p><p>For our order <b>${esc(s.name)}</b>${s.vehicles ? ` (${s.vehicles} vehicles)` : ""}, the following documents are still needed:</p>
<ul>${c.missing.map(k => `<li>${esc(DOC_TYPES.find(t => t.key === k)?.en || k)}</li>`).join("")}</ul>
${errors.length ? `<p><b>To correct:</b></p><ul>${errors.map(i => `<li style="color:#b91c1c">${esc(i.en)}</li>`).join("")}</ul>` : ""}
<p>Please upload them here (no login needed): <a href="${link}">${link}</a></p><p>Thank you,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive (France)</p></div>`;
      if (!dry && brevoReady()) {
        for (const to of mailList(s.factory_email)) await sendEmail(to, "", `Documents needed – order ${s.name} – MK HOLDING`, html, [], { replyTo: "khelifamansour@hotmail.fr" }).catch(() => null);
        await db.from("shipments").update({ factory_reminded_at: new Date().toISOString() }).eq("id", s.id);
      }
      reminded.push(`${s.name} (${c.missing.length} missing, ${errors.length} to correct)`);
    }
    const days = s.eta ? (new Date(s.eta).getTime() - Date.now()) / 86400000 : null;
    if (days != null && days <= 10 && !s.sent_at) soon.push(`${s.name} : arrivée le ${new Date(s.eta).toLocaleDateString("fr-FR")}, dossier pas encore envoyé au transitaire${c.complete ? "" : ` (usine : ${c.missing.length} pièce(s) manquante(s))`}`);
  }
  if (!dry && brevoReady() && (reminded.length || soon.length)) {
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${reminded.length ? `<p><b>Relances envoyées à l'usine :</b></p><ul>${reminded.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${soon.length ? `<p><b>⚠️ Arrivées proches :</b></p><ul>${soon.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p><a href="${SITE}/conteneurs">${SITE}/conteneurs</a></p></div>`;
    await sendEmail(OWNER_EMAIL, "Mansour", `📦 Conteneurs : ${reminded.length} relance(s) usine${soon.length ? `, ${soon.length} arrivée(s) proche(s)` : ""}`, html).catch(() => null);
  }
  return NextResponse.json({ ok: true, dry, reminded, soon });
}
