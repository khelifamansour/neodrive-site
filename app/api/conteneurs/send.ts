import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "../../../lib/brevo";
import { DOC_TYPES, docLabel, portKey } from "../../../lib/shipments";

const BUCKET = "shipment-docs";
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Envoie le dossier d'un conteneur au transitaire du port (Brevo) : liens signés 14 jours vers les documents,
 * pièces manquantes signalées. Utilisé par le bouton « Envoyer au transitaire » et par l'envoi automatique du portail usine.
 */
export async function sendDossier(db: SupabaseClient, id: number, toOverride?: unknown) {
  const { data: s } = await db.from("shipments").select("*").eq("id", id).single();
  const { data: fw } = s ? await db.from("forwarders").select("*").eq("port", portKey(s.port)).maybeSingle() : { data: null };
  const to = clean(toOverride || fw?.email || s?.forwarder_email, 160);
  if (!s || !to) throw new Error("E-mail du transitaire manquant");
  const { data: docs } = await db.from("shipment_docs").select("*").eq("shipment_id", id);
  // Pour chaque type : la version corrigée si elle existe, sinon l'originale ; les versions avec VIN générées par la plateforme sont toujours jointes en plus de l'original usine.
  // Les pièces internes (proforma, photos de chargement) ne sont pas envoyées au transitaire.
  const pick = DOC_TYPES.filter(t => t.send).flatMap(t => { const all = (docs || []).filter(d => d.doc_type === t.key); const gen = all.filter(d => d.uploaded_by === "plateforme"); const rest = all.filter(d => d.uploaded_by !== "plateforme"); const cor = rest.filter(d => d.version === "corrigée"); return [...gen, ...(cor.length ? cor : rest)]; });
  const links = await Promise.all(pick.map(async d => ({ d, url: (await db.storage.from(BUCKET).createSignedUrl(d.file_path, 14 * 86400)).data?.signedUrl })));
  const missing: string[] = DOC_TYPES.filter(t => t.required && !(docs || []).some(d => d.doc_type === t.key)).map(t => t.fr);
  const vins = (await db.from("shipment_vehicles").select("vin").eq("shipment_id", id)).data || [];
  if (!vins.length) missing.push("Liste des VIN par conteneur");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Bonjour${fw?.contact && to === fw.email ? " " + esc(fw.contact) : ""},</p><p>Veuillez trouver ci-dessous les documents du dossier <b>${esc(s.name)}</b> pour le dédouanement.</p>
<table style="border-collapse:collapse;font-size:14px">${[["Port d'arrivée", s.port], ["Navire / voyage", s.vessel], ["Connaissement (B/L)", s.bl_number], ["Conteneur(s)", s.containers], ["Véhicules", s.vehicles], ["Chargement", s.loaded_at], ["Arrivée prévue", s.eta]].map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#666">${k}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>
<p><b>Documents</b> (liens valables 14 jours) :</p><ul>${links.map(({ d, url }) => `<li>${esc(docLabel(d.doc_type))}${d.uploaded_by === "plateforme" ? " (détail par VIN)" : d.version === "corrigée" ? " (version corrigée)" : " (original usine)"} : <a href="${url}">${esc(d.file_name)}</a></li>`).join("")}</ul>
${missing.length ? `<p style="color:#b91c1c">Documents à venir : ${esc(missing.join(", "))}.</p>` : ""}<p>Merci de nous confirmer la bonne réception et de nous indiquer s'il manque un élément.</p><p>Cordialement,<br>Mansour Khelifa<br>MK HOLDING – NeoDrive – 06 89 78 17 10</p></div>`;
  const subject = `Dossier import ${s.name} – B/L ${s.bl_number || "?"} – MK HOLDING`;
  await sendEmail(to, fw?.contact || "", subject, html);
  for (const cc of String(fw?.cc || "").split(/[,; ]+/).filter(x => /@/.test(x) && x !== to)) await sendEmail(cc, "", subject, html).catch(() => null);
  await db.from("shipments").update({ sent_at: new Date().toISOString(), forwarder_email: to }).eq("id", id);
  return { sent: links.length, missing, to };
}
