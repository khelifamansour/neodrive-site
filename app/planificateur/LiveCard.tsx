"use client";
import { useEffect, useState } from "react";
import type { Stop } from "../../lib/planif";
import { EVENT_LABEL, delayTxt, hhmm, plannedSchedule, tourProgress, type TourEvent } from "../../lib/schedule";

type T = { id: string; name: string; date: string; departTime: string; driver: string; clientIds: string[]; stops: Stop[] };
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit" });

/** Carte compacte « Tournées en cours » (page Organisation) : où en est chaque livreur. */
export default function LiveCard() {
  const [d, setD] = useState<{ tours: T[]; events: TourEvent[] } | null>(null); const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let dead = false;
    const load = async () => {
      let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ }
      const j = await fetch("/api/planificateur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "live_summary", passcode: pc }) }).then(r => r.json()).catch(() => null);
      if (!dead && j?.ok) { setD({ tours: j.tours || [], events: j.events || [] }); setNow(Date.now()); }
    };
    load(); const it = setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
    return () => { dead = true; clearInterval(it); };
  }, []);
  if (!d || !d.tours.length) return null;
  const rows = d.tours.map(t => {
    const plan = plannedSchedule(t.stops, t.date, t.departTime);
    const p = tourProgress(t.stops, plan, d.events.filter(e => e.tour_id === t.id), [], now);
    const clients = t.stops.filter(x => x.kind === "client"); const done = clients.filter(x => p.delivered.has(x.id)).length;
    const next = p.nextIndex != null ? t.stops[p.nextIndex] : null; const eta = p.nextIndex != null ? p.etaOf(p.nextIndex) : null;
    const state = p.finished ? "🏁 Terminée" : !p.started ? `⏳ Départ prévu ${new Date(t.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" })} ${hhmm(plan.startAbs)}` : p.paused ? "☕ En pause" : next ? `🚚 Vers ${next.name}${eta != null ? ` · vers ${hhmm(eta)}` : ""}` : "🚚 En route";
    return { t, p, done, total: clients.length, state };
  }).filter(r => !r.p.finished || now - Date.parse(r.p.lastEvent?.created_at || "0") < 86400000);
  if (!rows.length) return null;
  return <section style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 18, padding: 16, marginTop: 18, display: "grid", gap: 10 }}>
    <b style={{ fontSize: 17 }}>📡 Tournées en cours</b>
    {rows.map(({ t, p, done, total, state }) => <a key={t.id} href={`/planificateur?tour=${encodeURIComponent(t.id)}`} style={{ display: "grid", gap: 3, padding: 12, borderRadius: 14, background: "#f6f4f0", color: "#141414", textDecoration: "none" }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b>{t.name}{t.driver ? ` · ${t.driver}` : ""}</b><span>✅ {done}/{total}</span></span>
      <span style={{ fontSize: 14 }}>{state}{p.started && !p.finished && p.delayMin != null ? <b style={{ color: p.delayMin > 10 ? "#b42318" : "#067647" }}> · {delayTxt(p.delayMin)}</b> : null}</span>
      {p.lastEvent ? <small style={{ color: "#666" }}>Dernière nouvelle : {EVENT_LABEL[p.lastEvent.kind] || p.lastEvent.kind} · {fmt(p.lastEvent.created_at)}{p.lastEvent.kind === "probleme" && p.lastEvent.note ? ` — « ${p.lastEvent.note} »` : ""}</small> : null}
    </a>)}
  </section>;
}
