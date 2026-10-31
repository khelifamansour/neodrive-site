import { applyStoredSecrets, readIntegrations, serviceClient } from "./integrations";

export type Check = { key: string; label: string; ok: boolean | null; detail: string; action?: string };
const G = "https://graph.facebook.com/v22.0";

async function graph(path: string, token: string) {
  const r = await fetch(`${G}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.error) throw new Error(j?.error?.message || `Erreur ${r.status}`);
  return j;
}

const short = (m: string) => m.replace(/\. The current time is.*$/, "").slice(0, 160);

/** Contrôle complet de l'écosystème (aucun jeton n'est renvoyé). */
export async function runHealthChecks(): Promise<Check[]> {
  await applyStoredSecrets(true);
  const { meta } = await readIntegrations();
  const checks: Check[] = [];

  // Facebook (Page)
  const pageId = process.env.FACEBOOK_PAGE_ID, pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  let igFromPage: { id?: string; username?: string } | null = null;
  if (!pageId || !pageToken) checks.push({ key: "facebook", label: "Facebook", ok: false, detail: "Non connecté", action: "Coller l’accès Meta" });
  else {
    try {
      const p = await graph(`${pageId}?fields=name,instagram_business_account{id,username}`, pageToken);
      igFromPage = p.instagram_business_account || null;
      checks.push({ key: "facebook", label: "Facebook", ok: true, detail: `Page « ${p.name} » connectée` });
    } catch (e) { checks.push({ key: "facebook", label: "Facebook", ok: false, detail: short((e as Error).message), action: "Coller un nouvel accès Meta" }); }
  }

  // Instagram (via la Page, ou jeton direct)
  if (igFromPage?.id) checks.push({ key: "instagram", label: "Instagram", ok: true, detail: `@${igFromPage.username || igFromPage.id} relié à la Page` });
  else {
    const ig = process.env.INSTAGRAM_ACCESS_TOKEN;
    let ok = false, detail = "Aucun compte Instagram professionnel relié à la Page Facebook";
    if (ig) { try { const me = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${encodeURIComponent(ig)}`).then(r => r.json()); if (me?.username) { ok = true; detail = `@${me.username} (accès direct)`; } else if (me?.error) detail = short(me.error.message); } catch { /* ignore */ } }
    checks.push({ key: "instagram", label: "Instagram", ok, detail, action: ok ? undefined : "Relier Instagram à la Page puis recoller l’accès Meta" });
  }

  // WhatsApp
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN, waPhone = process.env.WHATSAPP_PHONE_NUMBER_ID || "421337944404719";
  if (!waToken) checks.push({ key: "whatsapp", label: "WhatsApp (relances)", ok: false, detail: "Non connecté", action: "Coller l’accès WhatsApp" });
  else {
    try { const w = await graph(`${waPhone}?fields=display_phone_number,verified_name`, waToken); checks.push({ key: "whatsapp", label: "WhatsApp (relances)", ok: true, detail: `${w.verified_name || ""} ${w.display_phone_number || ""}`.trim() }); }
    catch (e) { checks.push({ key: "whatsapp", label: "WhatsApp (relances)", ok: false, detail: short((e as Error).message), action: "Coller un nouvel accès WhatsApp" }); }
  }

  // TikTok
  const sb = serviceClient();
  if (!process.env.TIKTOK_CLIENT_KEY) checks.push({ key: "tiktok", label: "TikTok", ok: false, detail: "Application TikTok non configurée" });
  else if (sb) {
    const { data } = await sb.from("tiktok_connection").select("open_id,access_expires_at,refresh_expires_at,updated_at").eq("id", 1).maybeSingle();
    if (!data?.open_id) checks.push({ key: "tiktok", label: "TikTok", ok: false, detail: "Compte TikTok pas encore connecté", action: "Connecter TikTok" });
    else {
      const refreshOk = !data.refresh_expires_at || new Date(data.refresh_expires_at).getTime() > Date.now();
      checks.push({ key: "tiktok", label: "TikTok", ok: refreshOk, detail: refreshOk ? `Connecté (renouvellement jusqu’au ${new Date(data.refresh_expires_at || Date.now()).toLocaleDateString("fr-FR")})` : "Connexion expirée", action: refreshOk ? undefined : "Reconnecter TikTok" });
    }
  }

  // Briques internes
  checks.push({ key: "supabase", label: "Base de données", ok: !!sb, detail: sb ? "Supabase connecté" : "Clé Supabase absente" });
  checks.push({ key: "openai", label: "IA (textes, SEO, relances)", ok: !!process.env.OPENAI_API_KEY, detail: process.env.OPENAI_API_KEY ? "Clé présente" : "Clé OpenAI absente" });
  checks.push({ key: "email", label: "Relances par e-mail", ok: !!(process.env.RESEND_API_KEY && process.env.CRM_FROM_EMAIL) ? true : null, detail: process.env.RESEND_API_KEY && process.env.CRM_FROM_EMAIL ? "Configurées" : "Pas encore configurées (optionnel, étape suivante)" });
  if (meta?.meta_saved_at) checks.push({ key: "info", label: "Dernière connexion Meta", ok: null, detail: new Date(String(meta.meta_saved_at)).toLocaleString("fr-FR") });
  return checks;
}

/** Découvre Page, Instagram et WhatsApp à partir d'un seul accès Meta. */
export async function discoverMeta(token: string) {
  const me = await graph("me?fields=id,name", token);
  const pages = await graph("me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50", token).then(r => r.data || []).catch(() => []);
  return { me, pages: pages as { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] };
}

export async function checkWhatsApp(token: string, phoneId: string) {
  return graph(`${phoneId}?fields=display_phone_number,verified_name`, token);
}
