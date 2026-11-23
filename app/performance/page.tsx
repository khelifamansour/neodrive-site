"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";

type R = {
  date: string; updated_at?: string; poids: number | string | null; sommeil: number | string | null; energie: number | null;
  km: number | string | null; conduite: number | string | null; sport: string | null; sport_min: number | null; eau: number | string | null;
  proteines: boolean | null; grignotage: boolean | null; soir_leger: boolean | null; note: string | null;
};
type F = Record<string, string>;

const GOAL_KG = 8;
const TARGET = [0.5, 0.75] as const; // kg/semaine
const FIELDS = ["poids", "sommeil", "energie", "km", "conduite", "sport", "sport_min", "eau", "proteines", "grignotage", "soir_leger", "note"] as const;

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/performance/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}

const parisDay = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const dfr = (d: string, long = false) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
const n = (v: unknown) => v === null || v === undefined || v === "" ? null : Number(String(v).replace(",", "."));
const kg = (v: number | null, sign = false) => v === null || !Number.isFinite(v) ? "—" : `${sign && v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} kg`;
const toForm = (r?: R): F => Object.fromEntries(FIELDS.map(k => { const v = r?.[k]; return [k, v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "oui" : "non") : String(v)]; }));

/** Signaux de fatigue pour un relevé. */
function fatigue(f: F) {
  const why: string[] = [];
  const h = n(f.conduite), s = n(f.sommeil), e = n(f.energie);
  if (h !== null && h >= 8) why.push(`${h} h de conduite`);
  if (s !== null && s < 6) why.push(`${s} h de sommeil`);
  if (e !== null && e <= 2) why.push(`énergie ${e}/5`);
  return why;
}

/** Tendance en kg/semaine (régression linéaire sur les pesées des 28 derniers jours). */
function trend(pts: { d: string; w: number }[], today: string) {
  const p = pts.filter(x => dayDiff(x.d, today) <= 28);
  if (p.length < 2 || dayDiff(p[0].d, p[p.length - 1].d) < 4) return null;
  const xs = p.map(x => dayDiff(p[0].d, x.d)), mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = p.reduce((a, b) => a + b.w, 0) / p.length;
  const num = xs.reduce((a, x, i) => a + (x - mx) * (p[i].w - my), 0), den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

function Chart({ pts, start }: { pts: { d: string; w: number }[]; start: number }) {
  if (pts.length < 2) return <p className={c.small} style={{ margin: "8px 0 0" }}>La courbe apparaît dès la 2ᵉ pesée.</p>;
  const W = 640, H = 220, P = { l: 40, r: 12, t: 12, b: 26 };
  const d0 = pts[0].d, span = Math.max(dayDiff(d0, pts[pts.length - 1].d), 7);
  const goal = start - GOAL_KG;
  const ws = pts.map(p => p.w);
  const lo = Math.floor(Math.min(...ws, goal) - 0.5), hi = Math.ceil(Math.max(...ws) + 0.5);
  const x = (d: string) => P.l + (dayDiff(d0, d) / span) * (W - P.l - P.r);
  const y = (w: number) => P.t + ((hi - w) / (hi - lo || 1)) * (H - P.t - P.b);
  const ideal = (d: string) => Math.max(goal, start - (dayDiff(d0, d) / 7) * 0.6);
  const end = addDays(d0, span);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((_, i, a) => a.length <= 8 || i % Math.ceil(a.length / 6) === 0);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 8 }} role="img" aria-label="Courbe du poids">
    {ticks.map(t => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#eee8df" /><text x={P.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#888">{t}</text></g>)}
    <line x1={P.l} x2={W - P.r} y1={y(goal)} y2={y(goal)} stroke="#0a7a3d" strokeDasharray="4 4" />
    <text x={W - P.r} y={y(goal) - 4} fontSize="11" textAnchor="end" fill="#0a7a3d">objectif {goal.toLocaleString("fr-FR")} kg</text>
    <line x1={x(d0)} y1={y(ideal(d0))} x2={x(end)} y2={y(ideal(end))} stroke="#c9c2b6" strokeDasharray="2 4" />
    <polyline fill="none" stroke="#f05a28" strokeWidth="2.5" strokeLinejoin="round" points={pts.map(p => `${x(p.d)},${y(p.w)}`).join(" ")} />
    {pts.map(p => <circle key={p.d} cx={x(p.d)} cy={y(p.w)} r="3.5" fill="#f05a28"><title>{`${dfr(p.d)} : ${kg(p.w)}`}</title></circle>)}
    <text x={P.l} y={H - 6} fontSize="11" fill="#888">{dfr(d0)}</text>
    <text x={W - P.r} y={H - 6} fontSize="11" textAnchor="end" fill="#888">{dfr(end)}</text>
  </svg>;
}

export default function Performance() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<R[]>([]);
  const [sel, setSel] = useState(""); const [form, setForm] = useState<F>(toForm()); const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = code()) => {
    try {
      const j = await api<{ rows: R[] }>({ action: "list" }, p);
      setRows(j.rows); setState("ready");
      return j.rows;
    } catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg("❌ " + (e as Error).message); setState("ready"); return null; }
  }, []);
  const pick = useCallback((d: string, list: R[]) => { setSel(d); setForm(toForm(list.find(r => r.date === d))); }, []);
  useEffect(() => { load().then(l => { if (l) pick(parisDay(), l); }).catch(() => null); }, [load, pick]);

  const save = async () => {
    setSaving(true); setMsg("");
    try { await api({ action: "save", date: sel, ...form }); const l = await load(); if (l) pick(sel, l); setMsg("✅ Enregistré."); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm(`Effacer le relevé du ${dfr(sel)} ?`)) return;
    try { await api({ action: "delete", date: sel }); const l = await load(); if (l) pick(sel, l); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { const l = await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } if (l) pick(parisDay(), l); } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🎯 Performance</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  // ---- Tableau de bord
  const today = parisDay();
  const pts = rows.filter(r => n(r.poids) !== null).map(r => ({ d: r.date, w: n(r.poids) as number }));
  const start = pts[0]?.w ?? null, current = pts[pts.length - 1]?.w ?? null;
  const lost = start !== null && current !== null ? start - current : null;
  const last7 = pts.filter(p => dayDiff(p.d, today) >= 0 && dayDiff(p.d, today) < 7);
  const avg7 = last7.length ? last7.reduce((a, p) => a + p.w, 0) / last7.length : null;
  const t = trend(pts, today); const loss = t === null ? null : -t;
  const trendNote = loss === null ? "2 pesées à quelques jours d’écart minimum" : loss < 0 ? "en hausse : on revient aux règles du plan" : loss < TARGET[0] ? "sous la cible (0,5–0,75)" : loss <= TARGET[1] ? "✅ dans la cible" : pts.length && dayDiff(pts[0].d, today) <= 21 ? "rapide : normal au début (surtout de l’eau)" : "plus rapide que la cible : manger assez de protéines";
  const left = start !== null && lost !== null ? Math.max(0, GOAL_KG - lost) : null;
  const eta = left !== null && left > 0 ? addDays(today, Math.round((left / 0.6) * 7)) : null;

  const byDate = new Map(rows.map(r => [r.date, r]));
  let streak = 0;
  for (let d = byDate.get(today)?.grignotage === false ? today : addDays(today, -1); byDate.get(d)?.grignotage === false; d = addDays(d, -1)) streak++;
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const week = Array.from({ length: dow + 1 }, (_, i) => byDate.get(addDays(today, i - dow))).filter(Boolean) as R[];
  const muscu = week.filter(r => r.sport === "muscu").length;
  const moved = week.filter(r => r.sport && r.sport !== "aucun" && (r.sport_min ?? 0) >= 20).length;

  // ---- Garde-fou fatigue : le formulaire si on édite aujourd'hui, sinon le relevé du jour enregistré.
  const tired = fatigue(sel === today ? form : toForm(byDate.get(today)));

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const lab = (t: string) => <span className={c.small} style={{ display: "block", margin: "10px 0 4px" }}>{t}</span>;
  const inp = (k: string, t: string, ph = "", mode: "decimal" | "numeric" = "decimal") => <label style={{ display: "block", flex: 1, minWidth: 0 }}>{lab(t)}
    <input className={c.input} style={{ width: "100%", boxSizing: "border-box" }} inputMode={mode} placeholder={ph} value={form[k] || ""} onChange={e => set(k, e.target.value)} /></label>;
  const chips = (k: string, opts: [string, string][]) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {opts.map(([v, l]) => <button key={v} type="button" onClick={() => set(k, form[k] === v ? "" : v)} className={`${c.btn} ${form[k] === v ? c.btnBrand : c.btnGhost}`} style={{ padding: "9px 13px", fontSize: 14 }}>{l}</button>)}
  </div>;
  const yn = (k: string, t: string) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
    <span style={{ fontSize: 15 }}>{t}</span>{chips(k, [["oui", "Oui"], ["non", "Non"]])}</div>;
  const stat = (l: string, v: string, note?: string) => <div className={c.stat}><p className={c.statLabel}>{l}</p><p className={c.statValue}>{v}</p>{note ? <p className={c.statNote}>{note}</p> : null}</div>;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load()}>Actualiser</button></div>
    <h1 style={{ margin: "0 0 4px" }}>🎯 Performance</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Un relevé par jour, 1 minute. Objectif : −{GOAL_KG} kg en ~4 mois, 0,5–0,75 kg/semaine.</p>

    {tired.length ? <div style={{ background: "#b42318", color: "#fff", borderRadius: 14, padding: "14px 16px", margin: "12px 0", fontSize: 15.5, lineHeight: 1.45 }}>
      <b style={{ fontSize: 17 }}>🛑 Repos conseillé</b> ({tired.join(", ")})<br />
      Pause toutes les 2 h, pas de conduite de nuit au-delà de 22 h, sieste de 20 min dès les premiers bâillements. Si tu dors dans la voiture : pas de moteur allumé pour te chauffer.
    </div> : null}

    <div className={c.stats} style={{ marginTop: 12 }}>
      {stat("Poids actuel", kg(current), pts.length ? `pesée du ${dfr(pts[pts.length - 1].d)}` : "aucune pesée")}
      {stat("Départ", kg(start), pts[0] ? dfr(pts[0].d) : undefined)}
      {stat("Perdu", lost === null ? "—" : kg(lost), left !== null ? left > 0 ? `reste ${kg(left)}${eta ? ` · ~${dfr(eta)}` : ""}` : "🎉 objectif atteint" : undefined)}
      {stat("Moyenne 7 j", kg(avg7), `${last7.length} pesée(s)`)}
      {stat("Tendance", loss === null ? "—" : `${loss >= 0 ? "−" : "+"}${Math.abs(loss).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg/sem`, trendNote)}
      {stat("Sans grignotage", `${streak} j`, "série en cours")}
      {stat("Muscu semaine", `${muscu}/2`, muscu >= 2 ? "✅ fait" : "lun → dim")}
      {stat("Bougé ≥ 20 min", `${moved}/${dow + 1} j`, "objectif : chaque jour")}
    </div>

    <div className={c.card} style={{ marginTop: 12 }}>
      <b>📉 Poids</b>
      {start !== null ? <Chart pts={pts} start={start} /> : <p className={c.small}>Saisis une première pesée ci-dessous.</p>}
    </div>

    <div className={c.card} style={{ marginTop: 12, borderColor: "#f05a28" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 17 }}>✍️ {sel === today ? "Aujourd’hui" : dfr(sel, true)}</b>
        <input className={c.input} type="date" style={{ width: "auto" }} value={sel} max={today} onChange={e => e.target.value && pick(e.target.value, rows)} />
      </div>
      {byDate.has(sel) ? <span className={c.small}>Relevé déjà saisi : modifie et enregistre.</span> : null}
      <div style={{ display: "flex", gap: 8 }}>{inp("poids", "Poids (kg)", "facultatif")}{inp("sommeil", "Sommeil (h)", "7")}{inp("eau", "Eau (L)", "1,5")}</div>
      {lab("Énergie")}{chips("energie", [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]])}
      <div style={{ display: "flex", gap: 8 }}>{inp("km", "Km roulés", "0", "numeric")}{inp("conduite", "Heures de conduite", "0")}</div>
      {lab("Sport")}{chips("sport", [["aucun", "Aucun"], ["marche", "Marche"], ["muscu", "Muscu"], ["autre", "Autre"]])}
      {form.sport && form.sport !== "aucun" ? <div style={{ maxWidth: 160 }}>{inp("sport_min", "Minutes", "30", "numeric")}</div> : null}
      {yn("proteines", "Protéines à chaque repas")}
      {yn("grignotage", "Grignotage de stress")}
      {yn("soir_leger", "Repas du soir léger")}
      {lab("Note")}
      <textarea className={c.input} rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} value={form.note || ""} onChange={e => set("note", e.target.value)} placeholder="Ce qui a aidé / ce qui a coincé" />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className={`${c.btn} ${c.btnBrand}`} style={{ flex: 1, justifyContent: "center" }} disabled={saving || !sel} onClick={save}>{saving ? "…" : "Enregistrer"}</button>
        {byDate.has(sel) ? <button className={`${c.btn} ${c.btnGhost}`} style={{ color: "#b42318" }} onClick={del}>Effacer</button> : null}
      </div>
      {msg ? <p className={c.msg}>{msg}</p> : null}
    </div>

    {rows.length ? <div className={c.card} style={{ marginTop: 12 }}>
      <b>🗓️ Derniers jours</b>
      <div style={{ display: "grid", gap: 2, marginTop: 8 }}>
        {rows.slice(-14).reverse().map(r => <button key={r.date} onClick={() => { pick(r.date, rows); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", justifyContent: "space-between", gap: 8, background: r.date === sel ? "#fff4ec" : "none", border: 0, borderBottom: "1px solid #f1ede6", padding: "8px 4px", font: "inherit", fontSize: 14, cursor: "pointer", color: "inherit", textAlign: "left" }}>
          <span>{fatigue(toForm(r)).length ? "🛑 " : ""}{dfr(r.date)}</span>
          <span className={c.small} style={{ textAlign: "right" }}>{[n(r.poids) !== null ? kg(n(r.poids)) : null, n(r.sommeil) !== null ? `${r.sommeil} h 😴` : null, r.energie ? `⚡${r.energie}` : null, n(r.conduite) ? `🚗 ${r.conduite} h` : null, r.sport && r.sport !== "aucun" ? `🏃 ${r.sport}` : null, r.grignotage === true ? "🍫" : r.grignotage === false ? "✅" : null].filter(Boolean).join(" · ")}</span>
        </button>)}
      </div>
    </div> : null}

    <details className={c.card} style={{ marginTop: 12 }} open={!rows.length}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>📋 Mon plan</summary>
      <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.55, fontSize: 15 }}>
        <li><b>Pas de grignotage de stress</b> : un verre d’eau d’abord ; dans la voiture, fruits ou amandes plutôt que la boulangerie / station.</li>
        <li><b>3 repas avec protéines</b> (œufs, poulet, poisson, fromage blanc, légumineuses).</li>
        <li><b>Soir léger</b> : légumes + protéines, peu de féculents.</li>
        <li><b>1,5–2 L d’eau</b> par jour.</li>
        <li><b>Bouger chaque jour 20–30 min</b> (marche) + <b>2 séances de muscu</b> par semaine.</li>
        <li><b>Pesée 1×/semaine</b>, même jour, le matin, à jeun.</li>
        <li><b>1 repas plaisir</b> par semaine, sans culpabiliser.</li>
        <li><b>Objectif 0,5–0,75 kg/semaine</b> ; les 2–3 premières semaines vont souvent plus vite (surtout de l’eau).</li>
      </ul>
      <b style={{ display: "block", marginTop: 12 }}>🚚 Sur la route</b>
      <ul style={{ margin: "6px 0 0", paddingLeft: 20, lineHeight: 1.55, fontSize: 15 }}>
        <li><b>Glacière</b> : œufs durs, poulet, fruits, eau.</li>
        <li>Pause toutes les 2 h ; pas de conduite de nuit quand la fatigue monte.</li>
        <li>En dormant dans la voiture : <b>jamais le moteur allumé pour se chauffer</b> (monoxyde de carbone) — duvet et couverture.</li>
      </ul>
    </details>
  </div></main>;
}
