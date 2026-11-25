import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../lib/integrations";
import { brevoReady, sendEmail, sendSms, SITE } from "../../../lib/brevo";
import {
  APP_COOKIE, APP_FOUNDER_COOKIE, AppError, EMAIL_RE, MIGRATION_MSG, ROLE_FR, appDb, appViewer, clean, cookieOpts, createLoginCode, endUserSessions,
  findUserByContact, founderCodeOk, founderCookieValue, isRole, missingTable, parseContact, verifyLoginCode, type AppUser, type AppViewer,
} from "../../../lib/app-auth";
import { assignDriver, missionsFor, sameCompany } from "../../../lib/app-missions";
import { normalizePhone } from "../../../lib/crm-agent";
import { sha } from "../../../lib/team";

/**
 * API de l'application NeoDrive (/app). Une seule route, une « action » par appel (comme /api/equipe).
 * Ne renvoie jamais de prix ni de montant.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ok = (o: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...o });
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const gsm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const publicUser = (u: AppUser) => ({ id: u.id, role: u.role, name: u.name, company: u.company || "" });
const APP_URL = `${SITE}/app`;

/** Fiche complète (admin) : le téléphone est affiché au format 06…. */
const adminUser = (u: AppUser) => ({ ...publicUser(u), phone: u.phone ? u.phone.replace(/^33/, "0") : "", email: u.email || "", active: u.active, created_at: u.created_at, last_login_at: u.last_login_at || null });

async function sendInstallLink(u: AppUser, via: "sms" | "email") {
  await applyStoredSecrets().catch(() => null);
  if (!brevoReady()) throw new AppError("Envoi indisponible (Brevo non connecté) : copiez le lien.", 503);
  const who = u.role === "chauffeur" ? `chauffeur ${u.company || ""}`.trim() : u.role === "transporteur" ? (u.company || "transporteur") : ROLE_FR[u.role];
  if (via === "sms") {
    if (!u.phone) throw new AppError("Pas de téléphone pour ce compte.");
    await sendSms(u.phone, gsm(`NeoDrive : votre acces a l'application NeoDrive (${who}). Ouvrez ${APP_URL} , entrez votre numero, puis le code recu par SMS. Pour l'installer : menu du navigateur > Ajouter a l'ecran d'accueil.`), "transactional");
  } else {
    if (!u.email) throw new AppError("Pas d'e-mail pour ce compte.");
    const html = `<p>Bonjour ${esc(u.name)},</p><p>Votre accès à <b>l'application NeoDrive</b> (${esc(who)}) est prêt.</p><p><a href="${APP_URL}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Ouvrir l'application</a></p><p>Entrez votre ${u.phone ? "numéro de téléphone ou " : ""}adresse e-mail : vous recevez un code à 6 chiffres.</p><p><b>Installer sur le téléphone</b><br>Android (Chrome) : bouton « Installer l'application » ou menu ⋮ → « Installer l'application ».<br>iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».</p><p>Merci,<br>NeoDrive</p>`;
    await sendEmail(u.email, u.name, "Votre accès à l'application NeoDrive", html);
  }
}

/** Fondateur : tout. Transporteur : seulement les chauffeurs de sa société. */
function canManage(v: AppViewer, target: { role: string; company: string | null }) {
  if (v.user.role === "fondateur") return true;
  return v.user.role === "transporteur" && target.role === "chauffeur" && sameCompany(target.company, v.user.company);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60), ua = (req.headers.get("user-agent") || "").slice(0, 200);
  try {
    await applyStoredSecrets().catch(() => null);

    // ── Connexion
    if (b.action === "founder_login") {
      if (!founderCodeOk(req, b.code)) return fail("Code incorrect.", 401);
      const v = founderCookieValue(); if (!v) return fail("Secret serveur manquant.", 503);
      const r = ok({ user: { id: 0, role: "fondateur", name: "Mansour", company: "NeoDrive" } });
      r.cookies.set(APP_FOUNDER_COOKIE, v, cookieOpts);
      return r;
    }
    if (b.action === "request_code") {
      const c = parseContact(b.contact); if (!c) return fail("Entrez un numéro de portable ou une adresse e-mail valide.");
      const db = appDb();
      const u = await findUserByContact(db, c);
      if (!u || !u.active) return fail("Aucun compte actif pour ce contact. Demandez votre accès à NeoDrive (06 89 78 17 10).", 404);
      if (!brevoReady()) return fail("Envoi des codes indisponible pour le moment (Brevo non connecté).", 503);
      const channel = "phone" in c ? "sms" : "email";
      const code = await createLoginCode(db, u, channel);
      if ("phone" in c) await sendSms(c.phone, `NeoDrive : votre code de connexion est ${code} (valable 10 minutes). Ne le communiquez a personne.`, "transactional");
      else await sendEmail(c.email, u.name, `Code NeoDrive : ${code}`, `<p>Bonjour ${esc(u.name)},</p><p>Votre code de connexion à l'application NeoDrive :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Il est valable 10 minutes. Si vous n'avez rien demandé, ignorez ce message.</p>`);
      return ok({ channel });
    }
    if (b.action === "verify") {
      const c = parseContact(b.contact); const code = String(b.code || "").replace(/\D/g, "");
      if (!c || code.length !== 6) return fail("Code à 6 chiffres.");
      const db = appDb();
      const u = await findUserByContact(db, c);
      if (!u || !u.active) return fail("Compte introuvable ou désactivé.", 403);
      const token = await verifyLoginCode(db, u, code, { ip, ua });
      const r = ok({ user: publicUser(u) });
      r.cookies.set(APP_COOKIE, token, cookieOpts);
      return r;
    }

    const v = await appViewer(req);
    if (b.action === "me") return ok({ user: v ? publicUser(v.user) : null, kind: v?.kind || null });
    if (b.action === "logout") {
      if (v?.kind === "account") await appDb().from("app_sessions").update({ ended_at: new Date().toISOString() }).eq("id", v.sessionId);
      const r = ok();
      r.cookies.set(APP_COOKIE, "", { path: "/", maxAge: 0 }); r.cookies.set(APP_FOUNDER_COOKIE, "", { path: "/", maxAge: 0 });
      return r;
    }
    if (!v) return NextResponse.json({ ok: false, error: "Session expirée : reconnectez-vous.", logout: true }, { status: 401 });
    const db = appDb();

    // ── Missions (sans aucun montant)
    if (b.action === "missions") {
      const missions = await missionsFor(db, v.user);
      let drivers: { id: number; name: string }[] = [];
      if (v.user.role === "fondateur" || v.user.role === "transporteur") {
        const { data, error } = await db.from("app_users").select("id,name,company,role,active").eq("role", "chauffeur").eq("active", true).order("name");
        if (!error) drivers = (data || []).filter(d => v.user.role === "fondateur" || sameCompany(d.company, v.user.company)).map(d => ({ id: d.id, name: d.name, company: d.company || "" }));
      }
      return ok({ missions, drivers });
    }
    if (b.action === "assign") {
      let driver: AppUser | null = null;
      if (b.driverId) {
        const { data, error } = await db.from("app_users").select("*").eq("id", Number(b.driverId)).maybeSingle();
        if (missingTable(error)) return fail(MIGRATION_MSG, 503);
        if (!data) return fail("Chauffeur introuvable.", 404);
        driver = data as AppUser;
      }
      await assignDriver(db, v.user, clean(b.tourId, 80), driver);
      return ok();
    }

    // ── Comptes (fondateur ; un transporteur gère ses propres chauffeurs)
    if (b.action === "admin_list") {
      if (v.user.role !== "fondateur" && v.user.role !== "transporteur") return fail("Réservé au fondateur.", 403);
      const { data, error } = await db.from("app_users").select("*").order("role").order("company").order("name");
      if (missingTable(error)) return ok({ users: [], migration: MIGRATION_MSG });
      if (error) throw new Error(error.message);
      const users = (data as AppUser[]).filter(u => canManage(v, u)).map(adminUser);
      return ok({ users, brevo: brevoReady() });
    }
    if (b.action === "admin_save") {
      const id = Number(b.id) || 0;
      const role = v.user.role === "transporteur" ? "chauffeur" : b.role;
      if (!isRole(role)) return fail("Choisissez le rôle.");
      const name = clean(b.name, 80); if (!name) return fail("Entrez le nom.");
      const rawPhone = clean(b.phone, 30), phone = rawPhone ? normalizePhone(rawPhone) : "";
      if (rawPhone && !phone) return fail("Téléphone invalide.");
      const email = clean(b.email, 120).toLowerCase(); if (email && !EMAIL_RE.test(email)) return fail("E-mail invalide.");
      if (!phone && !email) return fail("Entrez au moins un téléphone ou un e-mail (pour recevoir le code).");
      const company = v.user.role === "transporteur" ? v.user.company : clean(b.company, 80) || null;
      if ((role === "transporteur" || role === "chauffeur") && !company) return fail("Entrez la société (ex. Transports Rabouin).");
      const row = { role, name, phone: phone || null, email: email || null, company: role === "fondateur" || role === "equipe" ? company || "NeoDrive" : company, active: b.active !== false };
      if (!canManage(v, row)) return fail("Réservé au fondateur.", 403);
      if (id) {
        const { data: cur } = await db.from("app_users").select("*").eq("id", id).maybeSingle();
        if (!cur || !canManage(v, cur as AppUser)) return fail("Compte introuvable.", 404);
      }
      const q = id ? db.from("app_users").update(row).eq("id", id).select("*").single() : db.from("app_users").insert(row).select("*").single();
      const { data, error } = await q;
      if (missingTable(error)) return fail(MIGRATION_MSG, 503);
      if (error) return fail(/duplicate|unique/i.test(error.message) ? "Ce téléphone ou cet e-mail est déjà utilisé par un autre compte." : error.message);
      if (!row.active) await endUserSessions(db, (data as AppUser).id);
      return ok({ user: adminUser(data as AppUser) });
    }
    if (b.action === "admin_send_link") {
      const { data, error } = await db.from("app_users").select("*").eq("id", Number(b.id)).maybeSingle();
      if (missingTable(error)) return fail(MIGRATION_MSG, 503);
      if (!data || !canManage(v, data as AppUser)) return fail("Compte introuvable.", 404);
      await sendInstallLink(data as AppUser, b.via === "email" ? "email" : "sms");
      return ok({ link: APP_URL });
    }

    // ── Notifications (dormant tant que VAPID_PUBLIC_KEY n'est pas configurée)
    if (b.action === "push_config") return ok({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
    if (b.action === "push_subscribe") {
      if (!process.env.VAPID_PUBLIC_KEY) return fail("Notifications pas encore configurées.", 503);
      const sub = b.subscription as { endpoint?: unknown } | null;
      const endpoint = clean(sub?.endpoint, 1000);
      if (!/^https:\/\//.test(endpoint)) return fail("Abonnement invalide.");
      const { error } = await db.from("app_push_subscriptions").upsert({ endpoint, subscription: sub, user_id: v.kind === "account" ? v.user.id : null, role: v.user.role }, { onConflict: "endpoint" });
      if (missingTable(error)) return fail(MIGRATION_MSG, 503);
      if (error) throw new Error(error.message);
      return ok({ id: sha(endpoint).slice(0, 8) });
    }
    return fail("Action inconnue.");
  } catch (e) {
    if (e instanceof AppError) return fail(e.message, e.status);
    console.error("[APP]", b.action, e);
    return fail("Erreur serveur : " + (e as Error).message, 500);
  }
}
