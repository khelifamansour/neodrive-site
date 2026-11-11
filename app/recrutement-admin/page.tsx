"use client";
import { useEffect, useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";
import { COMMON, POSTES, type PosteKey } from "../../lib/hiring";

type Row = Record<string, any>;
const STATUSES = ["nouveau", "à appeler", "test téléphone", "essai payé", "recruté", "écarté", "écarté (IA)"];
const color = (n?: number) => n == null ? "#9ca3af" : n >= 75 ? "#15803d" : n >= 55 ? "#b45309" : "#b91c1c";

export default function RecrutementAdmin() {
  const [code, setCode] = useState(""); const [rows, setRows] = useState<Row[] | null>(null); const [msg, setMsg] = useState("");
  const [poste, setPoste] = useState<PosteKey | "tous">("tous"); const [open, setOpen] = useState<number | null>(null); const [hideOut, setHideOut] = useState(true);
  const api = async (body: object, pc = code) => { const r = await fetch("/api/candidatures", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const [inv, setInv] = useState<Row[]>([]);
  const load = async (pc = code) => { try { const j = await api({ action: "list" }, pc); setRows(j.rows); fetch("/api/candidatures/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, action: "list" }) }).then(r => r.json()).then(k => k.ok && setInv(k.rows)).catch(() => null); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = useMemo(() => (rows || []).filter(r => (poste === "tous" || r.poste === poste) && (!hideOut || !String(r.status).startsWith("écarté"))), [rows, poste, hideOut]);
  const update = async (id: number, patch: Row) => { setRows(rs => rs!.map(r => r.id === id ? { ...r, ...patch } : r)); try { await api({ action: "update", id, patch }) } catch (e) { setMsg((e as Error).message) } };
  const openCv = async (path: string) => { const j = await api({ action: "cv", path }); if (j.url) window.open(j.url, "_blank"); };
  if (!rows) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Recrutement</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  const count = (k: string) => (rows || []).filter(r => k === "tous" || r.poste === k).length;
  return <main className={s.page}>
    <div className={s.top}><div><h1>👥 Recrutement</h1><p>Candidats triés par note IA. Lien à envoyer : easydrive-auto.fr/candidature?poste=closer | coordinateur | social</p></div></div>
    {inv.length ? <section className={s.card}>
      <h2>📨 Invitations ({inv.filter(i => i.applied).length}/{inv.length} ont rempli le formulaire)</h2>
      <p className={s.muted}>WhatsApp : envoyez depuis votre téléphone personnel, 10 maximum par jour, pas depuis le numéro de Hana.</p>
      {inv.filter(i => poste === "tous" || i.poste === poste).map(i => <div key={i.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 14, borderBottom: "1px solid #eee", padding: "6px 0" }}>
        <b style={{ minWidth: 34 }}>{i.cv_score ?? "–"}</b><b style={{ flex: 1, minWidth: 160 }}>{i.full_name}</b><small>{POSTES[i.poste as PosteKey]?.short} · {i.city}</small>
        <span>{i.applied ? "✅ formulaire rempli" : "⏳ en attente"}</span><small>{i.email_sent_at ? "✉️ " : ""}{i.sms_sent_at ? "💬 SMS" : ""}</small>
        {!i.applied ? <a href={`https://wa.me/${String(i.phone).replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${String(i.full_name).split(" ")[0]}, c'est Mansour de NeoDrive. Votre CV a retenu notre attention. Étape suivante : formulaire et tests (30-40 min, à faire seul, sans IA) : https://www.easydrive-auto.fr/candidature?poste=${i.poste}`)}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
      </div>)}
    </section> : null}
    <section className={s.card}>
      <div className={s.seg}>{(["tous", "closer", "coordinateur", "social"] as const).map(k => <button key={k} className={poste === k ? s.on : ""} onClick={() => setPoste(k)}>{k === "tous" ? "Tous" : POSTES[k].short} ({count(k)})</button>)}
        <button onClick={() => setHideOut(!hideOut)}>{hideOut ? "Afficher les écartés" : "Masquer les écartés"}</button></div>
      {shown.length === 0 ? <p className={s.muted}>Aucune candidature pour l'instant.</p> : null}
      {shown.map(r => <article key={r.id} style={{ border: "1px solid #ece6dd", borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(open === r.id ? null : r.id)}>
          <b style={{ minWidth: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: color(r.ai_score), fontSize: 18 }}>{r.ai_score ?? "–"}</b>
          <div style={{ flex: 1 }}><b>{r.full_name}</b> <small style={{ color: "#7a8594" }}>· {POSTES[r.poste as PosteKey]?.short} · {r.city || "?"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</small><br /><small>{r.ai_verdict ? `IA : ${r.ai_verdict} — ` : ""}{r.ai_summary || ""}</small></div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 14 }}>
          <a href={`tel:${String(r.phone).replace(/[^\d+]/g, "")}`}>📞 {r.phone}</a>
          <a href={`https://wa.me/${String(r.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          {r.email ? <a href={`mailto:${r.email}`}>✉️ {r.email}</a> : null}
          {r.cv_path ? <button className={s.ghost} style={{ padding: "4px 10px" }} onClick={() => openCv(r.cv_path)}>📄 CV</button> : null}
          <span>🇫🇷 {r.test_french ?? "–"}/10</span><span>🧠 {r.test_logic ?? "–"}/8</span><span>✍️ {r.test_writing ?? "–"}/20</span><span>🎓 Bac {r.bac_average ?? "?"}/20</span><span>🧩 Énigmes {r.answers?.riddles_score ?? "–"}{r.riddle_sec ? ` en ${r.riddle_sec}s` : ""}</span>{r.paste_count ? <span style={{ color: "#b91c1c" }}>⚠️ {r.paste_count} collage(s)</span> : null}{r.duration_sec ? <span>⏱ {Math.round(r.duration_sec / 60)} min</span> : null}<span>💰 {r.salary_expectation || "?"}</span><span>🧾 {r.billing_structure || "?"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <select value={r.status} onChange={e => update(r.id, { status: e.target.value })}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
          <input defaultValue={r.notes || ""} placeholder="Notes d'entretien…" onBlur={e => e.target.value !== (r.notes || "") && update(r.id, { notes: e.target.value })} />
        </div>
        {open === r.id ? <div style={{ fontSize: 14, display: "grid", gap: 8, background: "#fafaf9", borderRadius: 12, padding: 12 }}>
          <div><b>✅ Points forts :</b> {r.ai_strengths || "—"}</div><div><b>⚠️ Risques :</b> {r.ai_risks || "—"}</div><div><b>❓ Questions d'entretien :</b> {r.ai_questions || "—"}</div>
          <hr />{[...COMMON, ...(POSTES[r.poste as PosteKey]?.questions || [])].map(q => <div key={q.id}><small style={{ color: "#7a8594" }}>{q.label}</small><div style={{ whiteSpace: "pre-wrap" }}>{r.answers?.[q.id] || "—"}</div></div>)}
          <div><small style={{ color: "#7a8594" }}>Notes au bac</small><div>{r.bac_grades ? Object.entries(r.bac_grades).map(([k, v]) => `${k} ${v ?? "?"}`).join(" · ") : "—"}</div></div>
          <div><small style={{ color: "#7a8594" }}>Dernier employeur</small><div>{r.last_employer ? `${r.last_employer.entreprise} – ${r.last_employer.poste} (${r.last_employer.dates}) · départ : ${r.last_employer.depart} · ${r.last_employer.raison} · Référence : ${r.last_employer.reference || "—"} ${r.last_employer.reference_tel || ""} ${r.last_employer.accord_contact ? "(accord pour la contacter)" : "(pas d\u2019accord)"}` : "—"}</div></div>
          <div><small style={{ color: "#7a8594" }}>Rédaction</small><div style={{ whiteSpace: "pre-wrap" }}>{r.answers?.writing || "—"}</div></div>
          <div><small style={{ color: "#7a8594" }}>Formation / expérience</small><div>{r.education || "—"} · {r.experience_years || "?"} ans</div></div>
        </div> : null}
      </article>)}
    </section>
  </main>;
}
