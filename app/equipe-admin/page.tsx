"use client";
import { useEffect, useState } from "react";

type Today = { active: number; first: string | null; last: string | null; views: number; calls: number; results: number; byResult: Record<string, number>; messages: number; blocked: number };
type M = { id: number; name: string; role: string; phone: string | null; email: string | null; active: boolean; expires_at: string | null; revoked_at: string | null; last_seen_at: string | null; can_see_numbers: boolean; ringover_number: string | null; max_views_per_hour: number; assigned: number; online: boolean; today: Today };
type Detail = { sessions: { started_at: string; last_seen_at: string; ended_at: string | null; active_seconds: number; ip: string; ua: string }[]; activity: { at: string; label: string; lead_id: number | null; detail: Record<string, unknown> | null }[]; reports: { created_at: string; body: string; ai_summary: string | null; ai_score: number | null }[] };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e0d8", borderRadius: 14, padding: 14, margin: "10px 0" };
const btn = (bg = "#141414"): React.CSSProperties => ({ padding: "8px 12px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 14 });
const input: React.CSSProperties = { padding: 9, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", boxSizing: "border-box" };
const hm = (s: number) => `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")}`;
const dt = (s: string | null) => s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const t = (s: string | null) => s ? new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function EquipeAdmin() {
  const [code, setCode] = useState(""); const [authed, setAuthed] = useState(false); const [msg, setMsg] = useState("");
  const [members, setMembers] = useState<M[]>([]); const [roles, setRoles] = useState<Record<string, string>>({}); const [free, setFree] = useState(0);
  const [form, setForm] = useState({ name: "", role: "closer", phone: "", email: "", days: 7, ringover_number: "", can_see_numbers: false, max_views: 60 });
  const [newCode, setNewCode] = useState<{ name: string; code: string } | null>(null);
  const [open, setOpen] = useState<number | null>(null); const [detail, setDetail] = useState<Detail | null>(null); const [evalr, setEvalr] = useState<Record<string, any> | null>(null);
  const [assign, setAssign] = useState({ n: 20, statut: "Nouveau" });

  const call = async (body: object, pc = code) => { const r = await fetch("/api/equipe-admin", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (r.status === 401) setAuthed(false); if (!j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await call({ action: "list" }, pc); setMembers(j.members); setRoles(j.roles); setFree(j.freeLeads); setAuthed(true); try { sessionStorage.setItem("nd_pc", pc); } catch { /* privé */ } } catch (e) { setMsg((e as Error).message); } };
  const run = async (body: object, ok = "") => { setMsg(""); try { const j = await call(body); if (ok) setMsg(ok); await load(); return j; } catch (e) { setMsg((e as Error).message); } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { /* privé */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!authed) return; const it = setInterval(() => load(), 60000); return () => clearInterval(it); }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e: React.FormEvent) => { e.preventDefault(); const j = await run({ action: "create", ...form }); if (j?.code) { setNewCode({ name: form.name, code: j.code }); setForm({ ...form, name: "", phone: "", email: "" }); } };
  const showDetail = async (id: number) => { if (open === id) { setOpen(null); return; } setOpen(id); setDetail(null); setEvalr(null); try { setDetail(await call({ action: "detail", id })); } catch (e) { setMsg((e as Error).message); } };
  const evaluate = async (id: number) => { setEvalr({ loading: true }); try { const j = await call({ action: "evaluate", id }); setEvalr(j.evaluation || { resume: "Pas assez d'échanges aujourd'hui pour évaluer." }); } catch (e) { setMsg((e as Error).message); setEvalr(null); } };
  const access = typeof window !== "undefined" ? `${window.location.origin}/equipe` : "/equipe";

  if (!authed) return <main style={{ background: "#f6f4f0", minHeight: "100vh", fontFamily: "system-ui, Arial, sans-serif" }}><form onSubmit={e => { e.preventDefault(); load(); }} style={{ maxWidth: 380, margin: "0 auto", padding: "80px 16px" }}>
    <h1 style={{ fontSize: 22 }}>Pilotage de l'équipe</h1>
    <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code d'accès" style={{ ...input, width: "100%" }} />
    <button style={{ ...btn("#f05a28"), width: "100%", marginTop: 10, padding: 12 }}>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}
  </form></main>;

  return <main style={{ background: "#f6f4f0", minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#141414" }}><div style={{ maxWidth: 1050, margin: "0 auto", padding: "16px 16px 80px" }}>
    <h1 style={{ fontSize: 24, margin: "4px 0" }}>Pilotage de l'équipe</h1>
    <p style={{ color: "#666", margin: 0 }}>Lien de connexion à donner : <b>{access}</b> · {free} prospects non attribués · rapport automatique par e-mail chaque soir à 19 h 40.</p>
    {msg ? <p style={{ fontWeight: 600 }}>{msg}</p> : null}
    {newCode ? <div style={{ ...box, borderColor: "#f05a28", background: "#fff7f3" }}>
      <b>Code de {newCode.name} : <span style={{ fontSize: 22, letterSpacing: 2 }}>{newCode.code}</span></b>
      <p style={{ margin: "6px 0" }}>Il ne sera plus affiché : transmettez-le maintenant, en main propre ou par message privé, avec le lien {access}. Si vous le perdez, générez un nouveau code.</p>
      <button onClick={() => setNewCode(null)} style={btn("#777")}>J'ai noté le code</button>
    </div> : null}

    {members.map(m => {
      const expired = m.expires_at && new Date(m.expires_at).getTime() < Date.now(); const on = m.active && !expired;
      return <section key={m.id} style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{m.online ? "🟢" : on ? "⚪" : "🔴"} {m.name} <span style={{ fontWeight: 500, color: "#666", fontSize: 14 }}>· {roles[m.role] || m.role}</span></div>
            <div style={{ color: "#666", fontSize: 13 }}>{m.online ? "En ligne" : `Vu ${dt(m.last_seen_at)}`} · {on ? `accès jusqu'au ${dt(m.expires_at)}` : m.revoked_at ? `coupé le ${dt(m.revoked_at)}` : "accès expiré"} · {m.assigned} clients attribués</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
            {on ? <button onClick={() => { if (confirm(`Couper immédiatement l'accès de ${m.name} ?`)) run({ action: "revoke", id: m.id }, `🔴 Accès de ${m.name} coupé.`); }} style={btn("#b91c1c")}>⛔ Couper l'accès</button>
              : <button onClick={() => { const d = Number(prompt("Réactiver pour combien de jours ?", "7")); if (d) run({ action: "reactivate", id: m.id, days: d }, `✅ ${m.name} réactivé.`); }} style={btn("#15803d")}>Réactiver</button>}
            <button onClick={() => { const d = Number(prompt("Prolonger : nombre de jours à partir d'aujourd'hui", "30")); if (d) run({ action: "reactivate", id: m.id, days: d }, "✅ Accès prolongé."); }} style={btn("#555")}>Prolonger</button>
            <button onClick={async () => { if (!confirm("Générer un nouveau code ? L'ancien ne marchera plus et la personne est déconnectée.")) return; const j = await run({ action: "new_code", id: m.id }); if (j?.code) setNewCode({ name: m.name, code: j.code }); }} style={btn("#555")}>Nouveau code</button>
            <button onClick={() => showDetail(m.id)} style={btn()}>{open === m.id ? "Fermer" : "Activité"}</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 10 }}>
          {[["Temps actif", hm(m.today.active)], ["Connexion", `${t(m.today.first)} → ${t(m.today.last)}`], ["Fiches ouvertes", m.today.views], ["Appels", m.today.calls], ["Comptes-rendus", m.today.results], ["WhatsApp", m.today.messages]].map(([k, v]) => <div key={String(k)} style={{ background: "#f6f4f0", borderRadius: 10, padding: 8 }}><div style={{ fontSize: 12, color: "#666" }}>{k} (aujourd'hui)</div><div style={{ fontWeight: 800 }}>{v}</div></div>)}
        </div>
        {Object.keys(m.today.byResult).length ? <p style={{ fontSize: 13, color: "#444" }}>Résultats : {Object.entries(m.today.byResult).map(([k, v]) => `${k} ${v}`).join(" · ")}</p> : null}
        {m.today.blocked ? <p style={{ color: "#b91c1c", fontWeight: 600 }}>⚠️ Bloqué {m.today.blocked} fois aujourd'hui pour trop de fiches ouvertes.</p> : null}

        {open === m.id ? <div style={{ borderTop: "1px solid #eee", marginTop: 10, paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <b>Attribuer</b>
            <input type="number" value={assign.n} onChange={e => setAssign({ ...assign, n: Number(e.target.value) })} style={{ ...input, width: 80 }} />
            <span>prospects</span>
            <select value={assign.statut} onChange={e => setAssign({ ...assign, statut: e.target.value })} style={input}>{["Nouveau", "Contacté", "Chaud", "Réfléchit", ""].map(s => <option key={s} value={s}>{s || "tous statuts"}</option>)}</select>
            <button onClick={() => run({ action: "assign", id: m.id, ...assign }, "✅ Prospects attribués.")} style={btn("#f05a28")}>Attribuer</button>
            <button onClick={() => { if (confirm("Retirer tous ses prospects ?")) run({ action: "unassign", id: m.id }, "Prospects retirés."); }} style={btn("#777")}>Tout retirer</button>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 10, fontSize: 14 }}>
            <label><input type="checkbox" checked={m.can_see_numbers} onChange={e => run({ action: "settings", id: m.id, can_see_numbers: e.target.checked })} /> Voir les numéros en clair</label>
            <label>Ligne Ringover : <input defaultValue={m.ringover_number || ""} onBlur={e => e.target.value !== (m.ringover_number || "") && run({ action: "settings", id: m.id, ringover_number: e.target.value }, "✅ Ligne enregistrée.")} placeholder="+33…" style={{ ...input, width: 150 }} /></label>
            <label>Fiches max / heure : <input type="number" defaultValue={m.max_views_per_hour} onBlur={e => Number(e.target.value) !== m.max_views_per_hour && run({ action: "settings", id: m.id, max_views: Number(e.target.value) })} style={{ ...input, width: 70 }} /></label>
          </div>
          <div style={{ marginTop: 10 }}><button onClick={() => evaluate(m.id)} style={btn("#2563eb")}>✨ Évaluer la qualité du jour (IA)</button></div>
          {evalr ? <div style={{ ...box, background: "#f5f8ff" }}>{evalr.loading ? "Analyse en cours…" : <>{evalr.score != null ? <b>Note : {evalr.score}/100. </b> : null}{evalr.resume}{evalr.points_forts?.length ? <p>👍 {evalr.points_forts.join(" · ")}</p> : null}{evalr.a_ameliorer?.length ? <p>🛠 {evalr.a_ameliorer.join(" · ")}</p> : null}{evalr.alertes?.length ? <p style={{ color: "#b91c1c" }}>⚠️ {evalr.alertes.join(" · ")}</p> : null}</>}</div> : null}
          {!detail ? <p>Chargement…</p> : <>
            <h3 style={{ fontSize: 16 }}>Connexions (7 jours)</h3>
            {detail.sessions.length ? <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}><tbody>{detail.sessions.map((s, i) => <tr key={i} style={{ borderBottom: "1px solid #eee" }}><td>{dt(s.started_at)}</td><td>→ {t(s.ended_at || s.last_seen_at)}</td><td><b>{hm(s.active_seconds)}</b> actif</td><td style={{ color: "#888" }}>{s.ip}</td></tr>)}</tbody></table> : <p style={{ color: "#888" }}>Aucune connexion.</p>}
            <h3 style={{ fontSize: 16 }}>Rapports de fin de journée</h3>
            {detail.reports.length ? detail.reports.map((r, i) => <div key={i} style={{ fontSize: 14, margin: "6px 0" }}><b>{dt(r.created_at)}</b>{r.ai_score != null ? ` · note IA ${r.ai_score}/100` : ""}<div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div></div>) : <p style={{ color: "#888" }}>Aucun rapport.</p>}
            <h3 style={{ fontSize: 16 }}>Journal d'activité</h3>
            <div style={{ maxHeight: 360, overflow: "auto", fontSize: 13 }}>{detail.activity.map((a, i) => <div key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "3px 0" }}>{dt(a.at)} · <b>{a.label}</b>{a.lead_id ? ` · fiche #${a.lead_id}` : ""}{a.detail && (a.detail as any).result ? ` · ${(a.detail as any).result}` : ""}{a.detail && (a.detail as any).note ? ` – ${(a.detail as any).note}` : ""}{a.detail && (a.detail as any).text ? ` – « ${String((a.detail as any).text).slice(0, 160)} »` : ""}</div>)}</div>
          </>}
        </div> : null}
      </section>;
    })}

    <form onSubmit={create} style={box}>
      <b>Créer un accès</b>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 8 }}>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom et prénom" style={input} />
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={input}>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone (facultatif)" style={input} />
        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail (facultatif)" style={input} />
        <label style={{ fontSize: 14 }}>Durée de l'accès (jours)<input type="number" value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })} style={{ ...input, width: "100%" }} /></label>
        <label style={{ fontSize: 14 }}>Ligne Ringover (facultatif)<input value={form.ringover_number} onChange={e => setForm({ ...form, ringover_number: e.target.value })} placeholder="+33…" style={{ ...input, width: "100%" }} /></label>
        <label style={{ fontSize: 14 }}>Fiches max par heure<input type="number" value={form.max_views} onChange={e => setForm({ ...form, max_views: Number(e.target.value) })} style={{ ...input, width: "100%" }} /></label>
        <label style={{ fontSize: 14, alignSelf: "end" }}><input type="checkbox" checked={form.can_see_numbers} onChange={e => setForm({ ...form, can_see_numbers: e.target.checked })} /> Voir les numéros en clair</label>
      </div>
      <button style={{ ...btn("#f05a28"), marginTop: 10 }}>Créer l'accès et afficher le code</button>
      <p style={{ fontSize: 13, color: "#666" }}>Conseil : commencez par 7 jours et 20 prospects. Le code est personnel : une seule session à la fois, il est déconnecté si quelqu'un d'autre se connecte avec.</p>
    </form>
  </div></main>;
}
