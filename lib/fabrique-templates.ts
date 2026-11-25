/** Banque de modèles de la Fabrique (accroches + scripts types). Les données sont dans fabrique-templates.json :
 * on peut la remplacer ou la compléter sans toucher au code. Seuls les modèles qui passent le contrôle des chiffres
 * et des concurrents (checkText) sont montrés à l'IA. Serveur uniquement. */
import bank from "./fabrique-templates.json";

export type TemplateHook = { type: string; text: string };
export type TemplateScript = { id: string; title: string; type: string; hook: string; lines: { t: number | string; text: string }[]; onscreen?: string; footage?: string[]; caption?: string; hashtags?: string[] };
export type TemplateBank = { hooks: TemplateHook[]; scripts: TemplateScript[] };

export const TEMPLATES = bank as unknown as TemplateBank;

/** Sélection tournante (change chaque jour) pour varier les vidéos sans envoyer toute la banque à l'IA. */
export function pickTemplates(day: string, check: (...t: string[]) => string | null, nScripts = 10, nHooks = 24) {
  const seed = Number(day.replace(/-/g, "")) || 0;
  const rot = <T,>(xs: T[], n: number) => xs.length <= n ? xs : Array.from({ length: n }, (_, i) => xs[(seed * 7 + i) % xs.length]);
  /** Modèle avec un trou à remplir ([X], [à vérifier], [région réelle]…) : ignoré, l'IA inventerait la donnée. */
  const unsure = (...t: string[]) => /\[[^\]]*\]/.test(t.join(" "));
  const scripts = (TEMPLATES.scripts || []).filter(s => { const t = [s.hook, ...(s.lines || []).map(l => l.text), s.caption || "", s.onscreen || ""]; return !unsure(...t) && !check(...t); });
  const hooks = (TEMPLATES.hooks || []).filter(h => !unsure(h.text) && !check(h.text));
  return { scripts: rot(scripts, nScripts), hooks: rot(hooks, nHooks) };
}

export function templatesPrompt(t: ReturnType<typeof pickTemplates>) {
  if (!t.scripts.length && !t.hooks.length) return "";
  const sc = t.scripts.map(s => `- [${s.type}] « ${s.hook} » → ${(s.lines || []).map(l => l.text).join(" / ")}${s.footage?.length ? ` (images : ${s.footage.join(", ")})` : ""}`).join("\n");
  const hk = t.hooks.map(h => `- [${h.type}] ${h.text}`).join("\n");
  return `\nModèles éprouvés (inspire-toi de leur structure et de leur ton, adapte aux clips ; ne les recopie pas mot pour mot ; les règles et les faits restent prioritaires) :\n${sc}\nAccroches de la banque :\n${hk}\n`;
}
