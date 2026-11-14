/** Espace équipe : accès personnels temporaires, sessions, journal d'activité. Serveur uniquement. */
import { createHash, randomBytes } from "crypto";
import { crmDatabase } from "./crm-agent";

export const TEAM_COOKIE = "nd_team";
export const ROLES: Record<string, string> = { closer: "Closer / conseiller", logistique: "Coordination logistique", social: "Réseaux sociaux", livreur: "Livreur / chauffeur", autre: "Autre" };
export const CALL_RESULTS = ["Injoignable", "Messagerie", "À rappeler", "Intéressé", "Devis envoyé", "Réservation", "Pas intéressé", "Mauvais numéro"] as const;

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** Code lisible (sans 0/O/1/I), 10 caractères. */
export function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = randomBytes(10);
  return Array.from(b, x => A[x % A.length]).join("").replace(/^(.{5})/, "$1-");
}
export const newToken = () => randomBytes(32).toString("hex");
export const maskPhone = (p: string | null) => { const d = String(p || "").replace(/\D/g, ""); return d.length >= 4 ? `•• •• •• ${d.slice(-4, -2)} ${d.slice(-2)}` : "—"; };
export const maskEmail = (e: string | null) => { const s = String(e || ""); const [u, d] = s.split("@"); return d ? `${u.slice(0, 1)}•••@${d}` : "—"; };
export const firstName = (n: string | null) => { const parts = String(n || "").trim().split(/\s+/); return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || "Client"; };

export type Member = { id: number; name: string; role: string; active: boolean; expires_at: string | null; can_see_numbers: boolean; ringover_number: string | null; max_views_per_hour: number; revoked_at: string | null };

export function cookieToken(req: Request) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${TEAM_COOKIE}=([a-f0-9]{64})`));
  return m?.[1] || "";
}

/** Session valide : membre actif, non expiré, non révoqué, session ouverte depuis moins de 14 h. */
export async function teamSession(req: Request) {
  const token = cookieToken(req); if (!token) return null;
  const db = crmDatabase();
  const { data: s } = await db.from("team_sessions").select("*").eq("token_hash", sha(token)).is("ended_at", null).maybeSingle();
  if (!s) return null;
  if (Date.now() - new Date(s.started_at).getTime() > 14 * 3600e3) { await db.from("team_sessions").update({ ended_at: new Date().toISOString() }).eq("id", s.id); return null; }
  const { data: m } = await db.from("team_members").select("*").eq("id", s.member_id).maybeSingle();
  if (!m || !m.active || m.revoked_at || (m.expires_at && new Date(m.expires_at).getTime() < Date.now())) { await db.from("team_sessions").update({ ended_at: new Date().toISOString() }).eq("id", s.id); return null; }
  return { session: s as { id: number; last_seen_at: string; active_seconds: number }, member: m as Member, db };
}

export async function logActivity(memberId: number, action: string, leadId: number | null = null, detail: Record<string, unknown> | null = null) {
  await crmDatabase().from("team_activity").insert({ member_id: memberId, action, lead_id: leadId, detail });
}

/** Ferme toutes les sessions d'un membre (coupure immédiate). */
export async function endSessions(memberId: number) {
  await crmDatabase().from("team_sessions").update({ ended_at: new Date().toISOString() }).eq("member_id", memberId).is("ended_at", null);
}

export const ACTION_FR: Record<string, string> = { login: "Connexion", logout: "Déconnexion", view_lead: "Fiche ouverte", call: "Appel", call_result: "Compte-rendu d'appel", whatsapp: "Message WhatsApp", report: "Rapport du jour", blocked: "Blocage (trop de fiches)", login_failed: "Code refusé", idea_add: "Idée proposée", content_download: "Contenu téléchargé" };
