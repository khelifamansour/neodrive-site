"use client";
export class Unauthorized extends Error {}
export const storedCode = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
export const rememberCode = (pc: string) => { try { if (pc) sessionStorage.setItem("nd_pc", pc); } catch { /* navigation privée */ } };
/** Appel à /api/conformite avec le code (sessionStorage « nd_pc ») ou le cookie d'équipe. */
export async function api<T = Record<string, any>>(body: object, pc = storedCode()): Promise<T> {
  const r = await fetch("/api/conformite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw Object.assign(new Error(j.error || "Erreur"), { status: r.status });
  return j as T;
}
