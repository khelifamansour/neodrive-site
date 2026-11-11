"use client";
import { useEffect, useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";
import { COMMON, POSTES, type PosteKey } from "../../lib/hiring";

type Row = Record<string, any>;
type Dossier = { key: string; poste: PosteKey; name: string; city: string; phone: string; email: string; cvScore: number | null; app: Row | null; inv: Row | null; score: number; stage: string };
const STATUSES = ["nouveau", "à appeler", "test téléphone", "essai payé", "recruté", "écarté", "écarté (IA)"];
const color = (n?: number | null) => n == null ? "#9ca3af" : n >= 75 ? "#15803d" : n >= 60 ? "#b45309" : "#b91c1c";
const tail = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);

export default function RecrutementAdmin() {
  const [code, setCode] = useState(""); const [apps, setApps] = useState<Row[] | null>(null); const [invs, setInvs] = useState<Row[]>([]); const [msg, setMsg] = useState("");
  const [poste, setPoste] = useState<PosteKey | "tous">("tous"); const [open, setOpen] = useState<string | null>(null); const [hideOut, setHideOut] = useState(true); const [waOnly, setWaOnly] = useState(false);
  const call = async (url: string, method: string, body: object, pc = code) => { const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const [a, i] = await Promise.all([call("/api/candidatures", "PUT", { action: "list" }, pc), call("/api/candidatures/invite", "POST", { action: "list" }, pc)]); setApps(a.rows); setInvs(i.rows); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un dossier par candidat : présélection CV (invitation) + formulaire (candidature), fusionnés par numéro de téléphone.
  const dossiers = useMemo<Dossier[]>(() => {
    const out: Dossier[] = []; const used = new Set<number>();
    for (const inv of invs) {
      const app = (apps || []).find(a => a.poste === inv.poste && tail(a.phone) === tail(inv.phone)) || null; if (app) used.add(app.id);
      const score = app ? (app.final_score ?? app.ai_score ?? 0) : Math.round((inv.cv_score ?? 0) * 0.6);
      out.push({ key: "i" + inv.id, poste: inv.poste, name: inv.full_name, city: inv.city || "", phone: inv.phone, email: inv.email || "", cvScore: inv.cv_score, app, inv, score, stage: app ? (app.status || "nouveau") : /^écart/i.test(inv.cv_verdict || "") ? "écarté (CV)" : "invité" });
    }
    for (const app of apps || []) if (!used.has(app.id)) out.push({ key: "a" + app.id, poste: app.poste, name: app.full_name, city: app.city || "", phone: app.phone, email: app.email || "", cvScore: null, app, inv: null, score: app.final_score ?? app.ai_score ?? 0, stage: app.status || "nouveau" });
    return out.sort((x, y) => (y.app ? 1 : 0) - (x.app ? 1 : 0) || y.score - x.score);
  }, [apps, invs]);
  const waTodo = (d: Dossier) => !!d.inv && !d.app && !d.inv.whatsapp_at && d.stage === "invité";
  const shown = dossiers.filter(d => (poste === "tous" || d.poste === poste) && (!hideOut || !String(d.stage).startsWith("écarté")) && (!waOnly || waTodo(d)));
  const top = shown.filter(d => d.app && d.score >= 75 && !["recruté", "écarté", "écarté (IA)"].includes(d.stage));
  const update = async (id: number, patch: Row) => { setApps(rs => rs!.map(r => r.id === id ? { ...r, ...patch } : r)); try { await call("/api/candidatures", "PUT", { action: "update", id, patch }) } catch (e) { setMsg((e as Error).message) } };
  const openCv = async (path: string) => { try { const j = await call("/api/candidatures", "PUT", { action: "cv", path }); if (j.url) window.open(j.url, "_blank"); } catch { setMsg("CV indisponible") } };
  const markWa = async (id: number, done: boolean) => { setInvs(rs => rs.map(r => r.id === id ? { ...r, whatsapp_at: done ? new Date().toISOString() : null } : r)); try { await call("/api/candidatures/invite", "POST", { action: "wa", id, done }) } catch (e) { setMsg((e as Error).message) } };
  const day = (t?: string | null) => t ? new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
  const wa = (d: Dossier) => `https://wa.me/${String(d.phone).replace(/\D/g, "")}?text=${encodeURIComponent(d.app ? `Bonjour ${d.name.split(" ")[0]}, c'est Mansour de NeoDrive, marque française de voitures sans permis électriques. Merci d'avoir rempli notre formulaire suite à votre candidature sur Emploitic. J'aimerais échanger 15 minutes avec vous : quand êtes-vous disponible ?` : `Bonjour ${d.name.split(" ")[0]}, c'est Mansour de NeoDrive, marque française de voitures sans permis électriques. Suite à votre candidature sur Emploitic (${POSTES[d.poste]?.short}, freelance en présentiel à Alger), voici le test : un formulaire de 30-40 min, à faire seul(e), sans aide ni IA : https://www.easydrive-auto.fr/candidature?poste=${d.poste}`)}`;

  if (!apps) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Recrutement</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  const count = (k: string) => dossiers.filter(d => k === "tous" || d.poste === k).length;

  const card = (d: Dossier) => { const a = d.app; const cvPath = a?.cv_path || d.inv?.cv_path; return <article key={d.key} style={{ border: "1px solid #ece6dd", borderRadius: 14, padding: 12, display: "grid", gap: 8, background: d.score >= 75 && a ? "#f0fdf4" : "#fff" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(open === d.key ? null : d.key)}>
      <b style={{ minWidth: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: color(a ? d.score : d.cvScore), fontSize: 18 }}>{a ? d.score : (d.cvScore ?? "–")}</b>
      <div style={{ flex: 1 }}><b>{d.name}</b> <small style={{ color: "#7a8594" }}>· {POSTES[d.poste]?.short} · {d.city}</small><br />
        <small>{a ? `✅ Formulaire rempli · CV ${d.cvScore ?? "–"} · tests/IA ${a.ai_score ?? "–"}` : `⏳ Invité, formulaire non rempli · note CV ${d.cvScore ?? "–"}`} · <b>{d.stage}</b></small><br />
        <small style={{ color: "#5b6573" }}>{a?.ai_summary || d.inv?.cv_summary || ""}</small></div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 14 }}>
      <a href={`tel:+${String(d.phone).replace(/\D/g, "")}`}>📞 {d.phone}</a><a href={wa(d)} target="_blank" rel="noreferrer" onClick={() => { if (d.inv && !d.inv.whatsapp_at && !d.app) markWa(d.inv.id, true); }}>💬 WhatsApp</a>{d.email ? <a href={`mailto:${d.email}`}>✉️ e-mail</a> : null}
      {cvPath ? <button className={s.ghost} style={{ padding: "4px 10px" }} onClick={() => openCv(cvPath)}>📄 CV</button> : null}
      {a ? <><span>🇫🇷 {a.test_french ?? "–"}/10</span><span>🧠 {a.test_logic ?? "–"}/8</span><span>✍️ {a.test_writing ?? "–"}/20</span><span>🧩 {a.answers?.riddles_score ?? "–"}{a.riddle_sec ? ` en ${a.riddle_sec}s` : ""}</span><span>🎓 {a.bac_average ?? "?"}/20</span>{a.paste_count ? <span style={{ color: "#b91c1c" }}>⚠️ {a.paste_count} collage(s)</span> : null}{a.duration_sec ? <span>⏱ {Math.round(a.duration_sec / 60)} min</span> : null}<span>💰 {a.salary_expectation || "?"}</span></> : null}
    </div>
    {d.inv ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
      <span style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.sms_sent_at ? "#dcfce7" : "#f3f4f6" }}>📱 SMS test {d.inv.sms_sent_at ? `✅ ${day(d.inv.sms_sent_at)}` : "❌"}</span>
      <span style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.email_sent_at ? "#dcfce7" : "#f3f4f6" }}>✉️ E-mail test {d.inv.email_sent_at ? `✅ ${day(d.inv.email_sent_at)}` : "❌"}</span>
      <label style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.whatsapp_at ? "#dcfce7" : "#fef3c7", cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!d.inv.whatsapp_at} onChange={e => markWa(d.inv!.id, e.target.checked)} style={{ width: "auto" }} />💬 Test envoyé par WhatsApp {d.inv.whatsapp_at ? `✅ ${day(d.inv.whatsapp_at)}` : "— pas encore"}</label>
    </div> : null}
    {a ? <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
      <select value={a.status} onChange={e => update(a.id, { status: e.target.value })}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
      <input defaultValue={a.notes || ""} placeholder="Notes d'entretien…" onBlur={e => e.target.value !== (a.notes || "") && update(a.id, { notes: e.target.value })} />
    </div> : null}
    {open === d.key ? <div style={{ fontSize: 14, display: "grid", gap: 8, background: "#fafaf9", borderRadius: 12, padding: 12 }}>
      {d.inv ? <><div><b>📄 Analyse du CV :</b> {d.inv.cv_summary || "—"}</div>{d.inv.cv_strengths ? <div><b>✅</b> {d.inv.cv_strengths}</div> : null}{d.inv.cv_risks ? <div><b>⚠️</b> {d.inv.cv_risks}</div> : null}{d.inv.cv_questions ? <div><b>❓</b> {d.inv.cv_questions}</div> : null}</> : null}
      {a ? <>
        <hr /><div><b>🤖 Analyse du formulaire :</b> {a.ai_summary}</div><div><b>✅ Points forts :</b> {a.ai_strengths || "—"}</div><div><b>⚠️ Risques :</b> {a.ai_risks || "—"}</div><div><b>❓ Questions d'entretien :</b> {a.ai_questions || "—"}</div>
        <div><small style={{ color: "#7a8594" }}>Notes au bac</small><div>{a.bac_grades ? Object.entries(a.bac_grades).map(([k, v]) => `${k} ${v ?? "?"}`).join(" · ") : "—"}</div></div>
        <div><small style={{ color: "#7a8594" }}>Dernier employeur</small><div>{a.last_employer ? `${a.last_employer.entreprise} – ${a.last_employer.poste} (${a.last_employer.dates}) · départ : ${a.last_employer.depart} · ${a.last_employer.raison} · Référence : ${a.last_employer.reference || "—"} ${a.last_employer.reference_tel || ""} ${a.last_employer.accord_contact ? "(accord pour la contacter)" : "(pas d’accord)"}` : "—"}</div></div>
        <div><small style={{ color: "#7a8594" }}>Rédaction</small><div style={{ whiteSpace: "pre-wrap" }}>{a.answers?.writing || "—"}</div></div>
        {[...COMMON, ...(POSTES[d.poste]?.questions || [])].map(q => <div key={q.id}><small style={{ color: "#7a8594" }}>{q.label}</small><div style={{ whiteSpace: "pre-wrap" }}>{a.answers?.[q.id] || "—"}</div></div>)}
      </> : null}
    </div> : null}
  </article>; };

  return <main className={s.page}>
    <div className={s.top}><div><h1>👥 Recrutement</h1><p>Note finale = 30 % CV + 70 % formulaire et tests. Mise à jour à chaque nouvelle candidature.</p></div><button className={s.ghost} onClick={() => load()}>↻ Actualiser</button></div>
    <div className={s.seg} style={{ marginTop: 12 }}>{(["tous", "closer", "coordinateur", "social"] as const).map(k => <button key={k} className={poste === k ? s.on : ""} onClick={() => setPoste(k)}>{k === "tous" ? "Tous" : POSTES[k].short} ({count(k)})</button>)}
      <button className={waOnly ? s.on : ""} onClick={() => setWaOnly(!waOnly)}>💬 WhatsApp à envoyer ({dossiers.filter(d => (poste === "tous" || d.poste === poste) && waTodo(d)).length})</button>
      <button onClick={() => setHideOut(!hideOut)}>{hideOut ? "Afficher les écartés" : "Masquer les écartés"}</button></div>
    <section className={s.card} style={{ borderColor: "#86efac" }}>
      <h2>🔥 À contacter en priorité ({top.length})</h2>
      <p className={s.muted}>Formulaire rempli, note finale ≥ 75. Vous recevez un SMS dès qu'un candidat entre ici.</p>
      {top.length ? top.map(card) : <p className={s.muted}>Personne pour l'instant : les candidats invités n'ont pas encore rempli le formulaire.</p>}
    </section>
    <section className={s.card}>
      <h2>Tous les dossiers ({shown.length})</h2>
      <p className={s.muted}>D'abord ceux qui ont rempli le formulaire (par note finale), puis les invités en attente (par note CV). Le bouton 💬 WhatsApp ouvre le message prêt à envoyer et coche automatiquement « Test envoyé par WhatsApp ». Filtre « 💬 WhatsApp à envoyer » : les invités qui n'ont ni rempli le formulaire ni reçu le WhatsApp. Depuis votre téléphone personnel, 10 par jour maximum.</p>
      {shown.filter(d => !top.includes(d)).map(card)}
    </section>
    {msg ? <p>{msg}</p> : null}
  </main>;
}
