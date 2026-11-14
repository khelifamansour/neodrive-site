/** Accès par section : le fondateur (code principal) voit tout ; un membre de l'équipe ne voit que les sections cochées pour lui. Serveur uniquement. */
import { isAuthorized } from "./integrations";
import { logActivity, teamSession, type Member } from "./team";

export const SECTIONS = {
  sav: "Service après-vente (tickets)",
  pieces: "Commandes de pièces",
  tournees: "Tournées et livraisons",
  vehicules: "Suivi des voitures et du stock",
  conteneurs: "Conteneurs et documents d'import",
  logistique: "Logistique (prestataires)",
  contenu: "Contenu (photos, vidéos, catalogue)",
  recrutement: "Recrutement",
  stock: "Ancien stock",
  academy: "NeoDrive Academy",
  crm: "Prospects (espace équipe)",
} as const;
export type SectionKey = keyof typeof SECTIONS;
export const isSection = (s: unknown): s is SectionKey => typeof s === "string" && s in SECTIONS;

export type Access = { who: "owner"; name: "Mansour" } | { who: "member"; name: string; member: Member & { sections: string[] } };

/** Autorise le fondateur (code ou cron) ou un membre connecté (cookie d'équipe) qui a la section. */
export async function authorizeSection(req: Request, passcode: unknown, section: SectionKey): Promise<Access | null> {
  if (isAuthorized(req, typeof passcode === "string" ? passcode : "")) return { who: "owner", name: "Mansour" };
  const ctx = await teamSession(req); if (!ctx) return null;
  const m = ctx.member as Member & { sections?: string[] };
  const sections = Array.isArray(m.sections) ? m.sections : [];
  if (!sections.includes(section)) return null;
  return { who: "member", name: m.name, member: { ...m, sections } };
}

/** Trace une action d'un membre (ne fait rien pour le fondateur). */
export async function logSection(a: Access, action: string, detail: Record<string, unknown> | null = null) {
  if (a.who === "member") await logActivity(a.member.id, action, null, detail);
}
