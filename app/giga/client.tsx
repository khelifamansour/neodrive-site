"use client";
import { useState } from "react";
import c from "./giga.module.css";

export class Unauthorized extends Error {}

export const storedCode = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
export const rememberCode = (pc: string) => { try { if (pc) sessionStorage.setItem("nd_pc", pc); } catch { /* navigation privée */ } };

/** Appel à /api/giga avec le code (sessionStorage « nd_pc ») ou le cookie d'équipe. */
export async function gigaApi<T = Record<string, unknown>>(body: object, pc = storedCode()): Promise<T> {
  const r = await fetch("/api/giga", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw Object.assign(new Error(j.error || "Erreur"), { status: r.status, body: j });
  return j as T;
}

export const STATUS: Record<string, string> = { done: "Terminé", running: "En cours…", error: "Erreur", interrupted: "Interrompu" };
export const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u.slice(0, 40); } };

export function Login({ onOk }: { onOk: (pc: string) => Promise<void> }) {
  const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  return <main className={c.page}>
    <form className={c.login} onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMsg("");
      try { await onOk(code.trim()); rememberCode(code.trim()); } catch (er) { setMsg((er as Error).message); } finally { setBusy(false); }
    }}>
      <h1>🧠 Giga Analyse</h1>
      <p className={c.muted}>Code d’accès NeoDrive. Membre de l’équipe : connectez-vous d’abord sur <a href="/organisation">la page Organisation</a> (la section « Giga Analyse » doit être ouverte pour vous).</p>
      <input className={c.input} type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus />
      <button className={`${c.btn} ${c.btnBrand}`} disabled={busy}>{busy ? "…" : "Entrer"}</button>
      {msg ? <p className={c.err}>{msg}</p> : null}
      <a href="/organisation" className={c.back}>← Organisation</a>
    </form>
  </main>;
}

export function Sources({ urls }: { urls?: string[] }) {
  const list = (urls || []).filter(u => /^https?:\/\//.test(u));
  if (!list.length) return null;
  return <div className={c.src}>{list.slice(0, 6).map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" title={u}>↗ {host(u)}</a>)}</div>;
}
