/** SAV centralisé : accès base, historique, médias signés. Serveur uniquement (clé service). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readJson } from "./datastore";
import { SAV_BUCKET, timelinePath, type SavTimeline } from "./sav";
import { CLOSED_STATUSES, STAGE_TO_STATUS, statusOf, type SavAttachment, type SavMedia, type SavStatusKey } from "./sav-center";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
export const SITE_URL = "https://www.easydrive-auto.fr";

export function savDb(): SupabaseClient | null {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return sk ? createClient(SB, sk, { auth: { persistSession: false } }) : null;
}

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const clip = (v: unknown, n = 5000) => String(v ?? "").trim().slice(0, n);

/** Champs d'un ticket utiles au back-office. */
export const TICKET_FIELDS = "id,ticket_number,public_reference,status,sav_status,priority,customer_name,customer_email,customer_phone,vin,category,error_code,description,ai_diagnosis,ai_confidence,recommended_part_ids,requested_parts,assigned_garage,assigned_to,resolution,attachments,created_at,updated_at,closed_at,status_changed_at,last_customer_message_at,last_staff_message_at,legacy_imported_at,customer_id,vehicle_id";

/** URL signées (1 h) pour des fichiers du stockage privé. */
export async function signMedia(sb: SupabaseClient, list: SavAttachment[] | null | undefined, source?: string, ttl = 3600): Promise<SavMedia[]> {
  const out: SavMedia[] = [];
  for (const a of list || []) {
    if (!a?.path) continue;
    const { data } = await sb.storage.from(a.bucket || SAV_BUCKET).createSignedUrl(a.path, ttl);
    if (data?.signedUrl) out.push({ name: a.name, type: a.type || guessType(a.name), url: data.signedUrl, source });
  }
  return out;
}
const guessType = (n: string) => /\.(mp4|mov|webm|m4v|3gp)$/i.test(n) ? "video/mp4" : /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(n) ? "image/jpeg" : "";

/** Liste les fichiers réellement envoyés dans un dossier privé. */
export async function listUploaded(sb: SupabaseClient, bucket: string, folder: string): Promise<SavAttachment[]> {
  const { data } = await sb.storage.from(bucket).list(folder, { limit: 50 });
  return (data || []).filter(f => f.name && !f.name.startsWith(".")).map(f => ({ name: f.name, type: (f.metadata as { mimetype?: string } | null)?.mimetype || "", size: (f.metadata as { size?: number } | null)?.size || 0, path: `${folder}/${f.name}`, bucket }));
}

/** Patch de la table pour un nouveau statut (colonne ERP `status` gardée compatible). */
export function statusPatch(next: SavStatusKey, prevClosedAt: string | null) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { sav_status: next, status: statusOf(next).legacy, status_changed_at: now, updated_at: now };
  if (CLOSED_STATUSES.includes(next)) patch.closed_at = prevClosedAt || now; else patch.closed_at = null;
  return patch;
}

export async function addEvent(sb: SupabaseClient, ticketId: string, e: { kind: string; from?: string | null; to?: string | null; author: string; note?: string | null; at?: string }) {
  const { error } = await sb.from("sav_events").insert({ ticket_id: ticketId, kind: e.kind, from_value: e.from ?? null, to_value: e.to ?? null, author: e.author, note: e.note ?? null, ...(e.at ? { created_at: e.at } : {}) });
  if (error) console.error("[SAV] event", error.message);
}

/** Enregistre un message et met à jour les dates « dernier message client / NeoDrive ». */
export async function addMessage(sb: SupabaseClient, ticketId: string, m: { direction: "in" | "out" | "note"; channel: "email" | "whatsapp" | "plateforme" | "note"; author: string; body: string; attachments?: SavAttachment[]; at?: string }) {
  const { data, error } = await sb.from("sav_messages").insert({ ticket_id: ticketId, direction: m.direction, channel: m.channel, author: m.author, body: m.body, attachments: m.attachments || [], ...(m.at ? { created_at: m.at } : {}) }).select("*").single();
  if (error) throw new Error(error.message);
  const now = m.at || new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (m.direction === "in") patch.last_customer_message_at = now;
  if (m.direction === "out") patch.last_staff_message_at = now;
  await sb.from("sav_tickets").update(patch).eq("id", ticketId);
  return data;
}

/**
 * Reprise unique de l'ancien suivi JSON (sav-suivi/REF.json) : étapes → historique, messages → conversation.
 * Le fichier d'origine n'est jamais modifié.
 */
export async function importLegacy(sb: SupabaseClient, t: { id: string; public_reference: string; sav_status: string | null; closed_at: string | null; legacy_imported_at: string | null }) {
  if (t.legacy_imported_at) return false;
  const tl = await readJson<SavTimeline>(sb, timelinePath(t.public_reference)).catch(() => null);
  const events = tl?.events || [];
  let last: SavStatusKey | null = null, lastAt = "", prev = t.sav_status || "nouveau";
  for (const [i, ev] of events.entries()) {
    const st = STAGE_TO_STATUS[ev.stage] || "nouveau";
    if (i > 0 && st !== prev) { await addEvent(sb, t.id, { kind: "status", from: prev, to: st, author: "NeoDrive (ancien suivi)", at: ev.at }); prev = st; last = st; lastAt = ev.at; }
    if (i > 0 && ev.note) await addMessage(sb, t.id, { direction: "out", channel: "plateforme", author: "NeoDrive (ancien suivi)", body: ev.note, at: ev.at });
    if (ev.internal) await addMessage(sb, t.id, { direction: "note", channel: "note", author: "NeoDrive (ancien suivi)", body: ev.internal, at: ev.at });
  }
  const patch: Record<string, unknown> = { legacy_imported_at: new Date().toISOString() };
  if (last && last !== t.sav_status) Object.assign(patch, statusPatch(last, t.closed_at), { status_changed_at: lastAt });
  await sb.from("sav_tickets").update(patch).eq("id", t.id);
  return true;
}

/** Gabarit d'e-mail simple NeoDrive. */
export function emailHtml(title: string, body: string, ctaUrl?: string, ctaLabel?: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111;line-height:1.55">
<div style="font-weight:900;font-size:20px;margin-bottom:14px">NeoDrive · Assistance</div>
<div style="font-weight:800;font-size:16px;margin-bottom:10px">${esc(title)}</div>
<div style="white-space:pre-line;font-size:15px">${esc(body)}</div>
${ctaUrl ? `<p style="margin:22px 0"><a href="${esc(ctaUrl)}" style="background:#ff6a00;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:10px;display:inline-block">${esc(ctaLabel || "Ouvrir")}</a></p>` : ""}
<p style="color:#888;font-size:12px;margin-top:26px">NeoDrive · Service après-vente</p></div>`;
}

export const suiviUrl = (ref: string) => `${SITE_URL}/sav?ref=${encodeURIComponent(ref)}#suivi`;
export const adminUrl = (ref: string) => `${SITE_URL}/sav/admin#${encodeURIComponent(ref)}`;

/** Vérifie référence + e-mail et renvoie le ticket (champs serveur). */
export async function findCustomerTicket(reference: unknown, email: unknown) {
  const ref = String(reference || "").trim().toUpperCase(), mail = String(email || "").trim().toLowerCase();
  if (!ref || !mail) return { error: "Référence et e-mail requis.", status: 400 } as const;
  const sb = savDb();
  if (!sb) return { error: "Configuration manquante", status: 503 } as const;
  const { data, error } = await sb.from("sav_tickets").select("id,public_reference,status,sav_status,category,vin,ai_diagnosis,resolution,created_at,updated_at,closed_at,attachments,requested_parts,customer_name,customer_email,legacy_imported_at").eq("public_reference", ref).eq("customer_email", mail).maybeSingle();
  if (error) return { error: "Service momentanément indisponible.", status: 500 } as const;
  if (!data) return { error: "Aucune demande ne correspond à cette référence et cet e-mail.", status: 404 } as const;
  return { sb, ticket: data } as const;
}

