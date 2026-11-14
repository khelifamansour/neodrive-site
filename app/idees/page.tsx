"use client";
import { useEffect, useState } from "react";

type Idea = { id: number; created_at: string; updated_at: string; title: string; body: string | null; area: string | null; status: string; author: string | null };
const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "9px 14px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 14 });
const input: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", boxSizing: "border-box" };
const STATUSES = ["idée", "à faire", "en cours", "fait"];
const ICON: Record<string, string> = { "idée": "💡", "à faire": "📝", "en cours": "⚙️", "fait": "✅" };
const AREAS = ["Ventes", "Service après-vente", "Livraisons", "Site internet", "Réseaux sociaux", "Recrutement", "Organisation", "Autre"];

export default function Idees() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null); const [canStatus, setCanStatus] = useState(false); const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState(""); const [form, setForm] = useState({ title: "", body: "", area: "Organisation" }); const [busy, setBusy] = useState(false);
  const pc = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
  const api = async (body: object) => { const r = await fetch("/api/organisation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc(), ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (r.status === 401) setIdeas(null); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async () => { try { const j = await api({ action: "ideas" }); setIdeas(j.ideas); setCanStatus(!!j.canStatus); } catch (e) { setMsg((e as Error).message); } finally { setReady(true); } };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setMsg(""); try { await api({ action: "idea_add", ...form }); setForm({ ...form, title: "", body: "" }); setMsg("✅ Merci ! Votre idée est enregistrée."); await load(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  const setStatus = async (id: number, status: string) => { try { await api({ action: "idea_status", id, status }); await load(); } catch (e) { setMsg((e as Error).message); } };

  const page = (children: React.ReactNode) => <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}><div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 80px" }}>
    <p style={{ margin: "0 0 6px" }}><a href="/organisation" style={{ color: C.brand, fontWeight: 700, textDecoration: "none" }}>← Organisation</a></p>{children}</div></main>;
  if (!ready) return page(<p>Chargement…</p>);
  if (!ideas) return page(<><h1 style={{ fontSize: 24 }}>💡 Idées et développement</h1><p>{msg && msg !== "Non connecté" ? msg : "Connectez-vous d’abord avec votre code sur la page Organisation."}</p><a href="/organisation" style={btn(C.brand)}>Aller à l’organisation</a></>);

  return page(<>
    <h1 style={{ fontSize: 26, margin: "4px 0" }}>💡 Idées et développement</h1>
    <p style={{ color: C.mute, margin: "0 0 12px" }}>Une idée pour vendre plus, mieux livrer ou gagner du temps ? Écrivez-la ici. Mansour la lit et indique où elle en est.</p>
    <form onSubmit={add} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, display: "grid", gap: 8 }}>
      <b>Proposer une idée</b>
      <input required minLength={3} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titre (ex. : envoyer une vidéo au client avant la livraison)" style={input} />
      <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3} placeholder="Expliquez en quelques mots : le problème, votre solution, ce que ça change." style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} style={{ ...input, width: "auto", flex: "1 1 180px" }}>{AREAS.map(a => <option key={a}>{a}</option>)}</select>
        <button disabled={busy} style={btn(C.brand)}>{busy ? "…" : "Envoyer l’idée"}</button>
      </div>
      {msg ? <p style={{ margin: 0, fontWeight: 600 }}>{msg}</p> : null}
    </form>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 16 }}>
      {STATUSES.map(st => { const col = ideas.filter(i => i.status === st); return <section key={st} style={{ background: "#efebe4", borderRadius: 16, padding: 10 }}>
        <h2 style={{ fontSize: 16, margin: "4px 4px 8px" }}>{ICON[st]} {st[0].toUpperCase() + st.slice(1)} <span style={{ color: C.mute, fontWeight: 500 }}>({col.length})</span></h2>
        {col.length ? col.map(i => <article key={i.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, margin: "0 0 8px" }}>
          <b style={{ display: "block" }}>{i.title}</b>
          {i.body ? <p style={{ margin: "6px 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{i.body}</p> : null}
          <div style={{ fontSize: 12, color: C.mute }}>{[i.area, i.author, new Date(i.created_at).toLocaleDateString("fr-FR")].filter(Boolean).join(" · ")}</div>
          {canStatus ? <select value={i.status} onChange={e => setStatus(i.id, e.target.value)} style={{ ...input, marginTop: 8, padding: 6, fontSize: 13 }}>{STATUSES.map(s => <option key={s} value={s}>{ICON[s]} {s}</option>)}</select> : null}
        </article>) : <p style={{ fontSize: 13, color: C.mute, margin: 4 }}>Rien pour l’instant.</p>}
      </section>; })}
    </div>
  </>);
}
