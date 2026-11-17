/** Réservations clients : enregistrement en base + lien avec la fiche prospect. Serveur uniquement. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "./crm-agent";

export const RES_STATUTS = ["Nouvelle", "Confirmée", "Planifiée", "Livrée", "Annulée"] as const;
export const RES_PRIORITES = ["Urgente", "Haute", "Normale", "Basse"] as const;

export type Reservation = {
  id: number; created_at: string; updated_at: string; source: string;
  nom: string; prenom: string; telephone: string; email: string;
  adresse: string; code_postal: string; ville: string; departement: string;
  modele: string; couleur: string; quantite: number; options: string;
  delivery_price: number | null; total: number | null; message: string;
  statut: string; date_promise: string | null; acompte: number | null; priorite: string; notes: string;
  lead_id: number | null; plan_client_id: string | null;
};

const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", ".")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null; };
const dept = (cp: string) => (/^\d{5}$/.test(cp) ? (cp.startsWith("97") ? cp.slice(0, 3) : cp.slice(0, 2)) : "");

/** Nettoie les champs envoyés par un formulaire ou par la saisie manuelle. */
export function cleanReservation(b: Record<string, unknown>) {
  const code_postal = s(b.code_postal, 5).replace(/\D/g, "");
  const known = new Set(["nom", "prenom", "telephone", "email", "adresse", "code_postal", "ville", "modele", "couleur", "quantite", "options", "delivery_price", "total", "message", "statut", "date_promise", "acompte", "priorite", "notes", "source", "action", "passcode", "website"]);
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(b)) if (!known.has(k) && typeof v !== "object") raw[k.slice(0, 40)] = s(v, 300);
  const statut = RES_STATUTS.includes(s(b.statut) as never) ? s(b.statut) : "Nouvelle";
  const priorite = RES_PRIORITES.includes(s(b.priorite) as never) ? s(b.priorite) : "Normale";
  const date = s(b.date_promise, 10);
  return {
    nom: s(b.nom, 80), prenom: s(b.prenom, 80), telephone: s(b.telephone, 30), email: s(b.email, 120),
    adresse: s(b.adresse), code_postal, ville: s(b.ville, 80), departement: dept(code_postal),
    modele: s(b.modele, 80), couleur: s(b.couleur, 40), quantite: Math.max(1, Math.min(50, Math.round(num(b.quantite) || 1))),
    options: s(b.options, 300), delivery_price: num(b.delivery_price), total: num(b.total), message: s(b.message, 2000),
    statut, priorite, date_promise: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, acompte: num(b.acompte), notes: s(b.notes, 2000),
    raw,
  };
}

/** Retrouve (ou crée) la fiche prospect par téléphone et la passe « Chaud » (sans rétrograder un client). */
async function linkLead(sb: SupabaseClient, r: ReturnType<typeof cleanReservation>, source: string): Promise<number | null> {
  const p = normalizePhone(r.telephone); if (!p) return null;
  const variants = [p, `+${p}`, p.startsWith("33") ? `0${p.slice(2)}` : p];
  const { data } = await sb.from("leads").select("id,statut,history").in("telephone", variants).order("id", { ascending: false }).limit(1);
  const ev = { type: "reservation", at: new Date().toISOString(), source, modele: r.modele, total: r.total };
  const lead = data?.[0];
  if (lead) {
    const statut = lead.statut === "Client" ? "Client" : "Chaud";
    await sb.from("leads").update({ statut, updated_at: new Date().toISOString(), history: [...(Array.isArray(lead.history) ? lead.history : []), ev] }).eq("id", lead.id);
    return lead.id;
  }
  const { data: ins } = await sb.from("leads").insert({ nom: `${r.prenom} ${r.nom}`.trim() || "Réservation", telephone: p, email: r.email || null, source: "reservation", statut: "Chaud", phase: "Réservation", ville: r.ville || null, departement: r.departement || null, modele_interesse: r.modele || null, history: [ev], lead_score: 90 }).select("id").single();
  return ins?.id ?? null;
}

/** Enregistre une réservation et la relie au prospect. */
export async function saveReservation(sb: SupabaseClient, b: Record<string, unknown>, source: string, extra: { plan_client_id?: string | null } = {}) {
  const r = cleanReservation(b);
  let lead_id: number | null = null;
  try { lead_id = await linkLead(sb, r, source); } catch (e) { console.error("[RESERVATIONS] lead", e); }
  const { data, error } = await sb.from("reservations").insert({ ...r, source, lead_id, plan_client_id: extra.plan_client_id ?? null }).select().single();
  if (error) throw new Error(error.message);
  return data as Reservation;
}
