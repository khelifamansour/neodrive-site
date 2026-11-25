/**
 * L'application NeoDrive (/app) : comptes par rôle et sessions. Serveur uniquement.
 * - Comptes (table app_users) : connexion par téléphone ou e-mail + code à usage unique (SMS ou e-mail Brevo), cookie de session 60 jours.
 * - Fondateur : en plus, le code fondateur habituel (CRON_SECRET) ouvre une session signée qui ne dépend pas de la base.
 * - Équipe : un membre déjà connecté à l'espace équipe (cookie nd_team) est reconnu.
 * Si la migration 20261126120000_app_neodrive.sql n'est pas encore passée, seuls le fondateur et l'équipe peuvent entrer.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataClient } from "./datastore";
import { isAuthorized } from "./integrations";
import { normalizePhone } from "./crm-agent";
import { newToken, sha, teamSession } from "./team";

export const APP_COOKIE = "nd_app";
export const APP_FOUNDER_COOKIE = "nd_app_f";
export const SESSION_DAYS = 60;
export const ROLES = ["fondateur", "transporteur", "chauffeur", "equipe"] as const;
export type AppRole = (typeof ROLES)[number];
export const ROLE_FR: Record<AppRole, string> = { fondateur: "Fondateur", transporteur: "Transporteur", chauffeur: "Chauffeur", equipe: "Équipe" };
export const isRole = (r: unknown): r is AppRole => typeof r === "string" && (ROLES as readonly string[]).includes(r);

export type AppUser = { id: number; role: AppRole; name: string; phone: string | null; email: string | null; company: string | null; active: boolean; created_at: string; last_login_at?: string | null };
/** Qui utilise l'application : un compte, le fondateur par son code, ou un membre de l'équipe. */
export type AppViewer = { kind: "account"; user: AppUser; sessionId: number } | { kind: "founder_code"; user: AppUser } | { kind: "team"; user: AppUser };

export class AppError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
export const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
/** Table absente (migration pas encore passée). */
export const missingTable = (e: { message?: string; code?: string } | null | undefined) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message || ""));
export const MIGRATION_MSG = "Comptes de l'application pas encore activés : la migration « app_neodrive » doit être passée sur Supabase.";

export function appDb(): SupabaseClient {
  const db = dataClient();
  if (!db) throw new AppError("Configuration Supabase manquante.", 503);
  return db;
}

const readCookie = (req: Request, name: string) => {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
};

// ── Session fondateur signée (code fondateur) : « <expiration>.<signature> »
const founderSig = (exp: string) => createHmac("sha256", process.env.CRON_SECRET || "").update("app-founder:" + exp).digest("base64url");
export function founderCookieValue() {
  if (!process.env.CRON_SECRET) return null;
  const exp = String(Date.now() + SESSION_DAYS * 86400e3);
  return `${exp}.${founderSig(exp)}`;
}
function founderCookieOk(v: string) {
  const m = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(v);
  if (!m || !process.env.CRON_SECRET || Number(m[1]) < Date.now()) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(founderSig(m[1]));
  return a.length === b.length && timingSafeEqual(a, b);
}
export const founderCodeOk = (req: Request, code: unknown) => isAuthorized(req, typeof code === "string" ? code.trim() : "");
const FOUNDER: AppUser = { id: 0, role: "fondateur", name: "Mansour", phone: null, email: null, company: "NeoDrive", active: true, created_at: "" };

/** Retrouve l'utilisateur de la requête (compte, code fondateur, ou équipe), sinon null. */
export async function appViewer(req: Request): Promise<AppViewer | null> {
  if (founderCookieOk(readCookie(req, APP_FOUNDER_COOKIE))) return { kind: "founder_code", user: FOUNDER };
  const token = readCookie(req, APP_COOKIE);
  if (/^[a-f0-9]{64}$/.test(token)) {
    const db = appDb();
    const { data: s, error } = await db.from("app_sessions").select("id,user_id,created_at,last_seen_at").eq("token_hash", sha(token)).is("ended_at", null).maybeSingle();
    if (!error && s && Date.now() - Date.parse(s.created_at) < SESSION_DAYS * 86400e3) {
      const { data: u } = await db.from("app_users").select("*").eq("id", s.user_id).maybeSingle();
      if (u && u.active) {
        if (Date.now() - Date.parse(s.last_seen_at) > 3600e3) await db.from("app_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id);
        return { kind: "account", user: u as AppUser, sessionId: s.id };
      }
      await db.from("app_sessions").update({ ended_at: new Date().toISOString() }).eq("id", s.id);
    }
  }
  const team = await teamSession(req).catch(() => null);
  if (team) return { kind: "team", user: { id: -team.member.id, role: "equipe", name: team.member.name, phone: null, email: null, company: "NeoDrive", active: true, created_at: "" } };
  return null;
}

export const isFounder = (v: AppViewer | null, req?: Request, code?: unknown) => v?.user.role === "fondateur" || (!!req && founderCodeOk(req, code));

// ── Connexion par code à usage unique
const CODE_MIN = 10;
/** Contact saisi → téléphone normalisé (33…) ou e-mail en minuscules. */
export function parseContact(v: unknown): { phone: string } | { email: string } | null {
  const s = clean(v, 120);
  if (s.includes("@")) return EMAIL_RE.test(s) ? { email: s.toLowerCase() } : null;
  const p = normalizePhone(s);
  return p ? { phone: p } : null;
}

export async function findUserByContact(db: SupabaseClient, c: { phone: string } | { email: string }) {
  const q = "phone" in c ? db.from("app_users").select("*").eq("phone", c.phone) : db.from("app_users").select("*").ilike("email", c.email);
  const { data, error } = await q.limit(1).maybeSingle();
  if (missingTable(error)) throw new AppError(MIGRATION_MSG, 503);
  if (error) throw new Error(error.message);
  return data as AppUser | null;
}

/** Crée un code (6 chiffres, 10 minutes). Limite : 5 codes par heure et par compte. */
export async function createLoginCode(db: SupabaseClient, user: AppUser, channel: "sms" | "email") {
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("app_login_codes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count || 0) >= 5) throw new AppError("Trop de codes demandés : réessayez dans une heure.", 429);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await db.from("app_login_codes").insert({ user_id: user.id, code_hash: sha(`${user.id}:${code}`), channel, expires_at: new Date(Date.now() + CODE_MIN * 60e3).toISOString() });
  if (error) throw new Error(error.message);
  return code;
}

/** Vérifie le code (5 essais), ouvre une session et renvoie son jeton. */
export async function verifyLoginCode(db: SupabaseClient, user: AppUser, code: string, meta: { ip: string; ua: string }) {
  const { data: row } = await db.from("app_login_codes").select("*").eq("user_id", user.id).is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) throw new AppError("Code expiré : demandez-en un nouveau.", 401);
  if (row.attempts >= 5) throw new AppError("Trop d'essais : demandez un nouveau code.", 429);
  const a = Buffer.from(row.code_hash), b = Buffer.from(sha(`${user.id}:${code}`));
  if (!(a.length === b.length && timingSafeEqual(a, b))) {
    await db.from("app_login_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new AppError("Code incorrect.", 401);
  }
  await db.from("app_login_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  const token = newToken();
  const { error } = await db.from("app_sessions").insert({ user_id: user.id, token_hash: sha(token), ip: meta.ip, ua: meta.ua });
  if (error) throw new Error(error.message);
  await db.from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  return token;
}

export async function endUserSessions(db: SupabaseClient, userId: number) {
  await db.from("app_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", userId).is("ended_at", null);
}

export const cookieOpts = { path: "/", httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: SESSION_DAYS * 86400 };
