"use client";
/** Liste d'appels du jour + tableau de bord des ventes (calculés à partir des fiches du CRM). */
import React, { useMemo, useState } from "react";

type L = { id: number; nom?: string | null; telephone?: string | null; ville?: string | null; statut?: string | null; phase?: string | null; source?: string | null; created_at?: string | null; next_followup_at?: string | null; last_contact_at?: string | null; commentaire?: string | null; opted_out_at?: string | null; history?: any; lead_score?: number | null };

const FUNNEL = ["Nouveau", "Contacté", "Chaud", "Réfléchit", "Livraison", "Client"] as const;
const DAY = 86400000;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pourquoi rappeler ce client aujourd'hui (et à quel point c'est urgent). */
function callReason(l: L): { score: number; why: string } | null {
  if (l.opted_out_at || ["Client", "Perdu"].includes(String(l.statut || ""))) return null;
  if (!l.telephone) return null;
  const t = norm(String(l.commentaire || ""));
  const due = l.next_followup_at && new Date(l.next_followup_at).getTime() <= Date.now();
  const s = String(l.statut || "Nouveau");
  if (s === "Livraison") return { score: 100, why: "Réservation en cours : confirmer la date de livraison" };
  if (s === "Chaud") return { score: 90, why: "Client chaud : appeler pour conclure" };
  if (/appel|rappel|telephone|joindre|m'appeler/.test(t)) return { score: 85, why: "A demandé à être appelé" };
  if (due) return { score: 75, why: "Relance prévue aujourd'hui" };
  if (/essai|financ|reprise|confort|commande|reserv|livraison/.test(t) && s !== "Nouveau") return { score: 65, why: "A posé une question précise (essai, financement, livraison…)" };
  if (s === "Réfléchit") return { score: 55, why: "Réfléchit : relancer avec une vidéo ou le prix livré" };
  if (s === "Contacté" && l.last_contact_at && Date.now() - new Date(l.last_contact_at).getTime() > 3 * DAY) return { score: 40, why: "Package envoyé il y a plus de 3 jours, sans réponse" };
  return null;
}

export default function SalesPanels({ leads, onCalled }: { leads: L[]; onCalled: (l: L) => void }) {
  const [open, setOpen] = useState<"calls" | "funnel" | null>("calls");
  const calls = useMemo(() => leads.map(l => ({ l, r: callReason(l) })).filter(x => x.r).sort((a, b) => b.r!.score - a.r!.score).slice(0, 30), [leads]);
  const funnel = useMemo(() => {
    const active = leads.filter(l => String(l.statut) !== "Perdu");
    const reached = (i: number) => active.filter(l => FUNNEL.indexOf((l.statut as any) || "Nouveau") >= i).length;
    const steps = FUNNEL.map((s, i) => ({ s, n: reached(i) }));
    const since = (d: number) => leads.filter(l => l.created_at && Date.now() - new Date(l.created_at).getTime() < d * DAY).length;
    const bySource: Record<string, { total: number; clients: number }> = {};
    for (const l of leads) { const k = l.source || "autre"; bySource[k] ||= { total: 0, clients: 0 }; bySource[k].total++; if (l.statut === "Client") bySource[k].clients++; }
    return { steps, perdus: leads.length - active.length, week: since(7), month: since(30), bySource };
  }, [leads]);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const box: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white", marginBottom: 14 };
  const tab = (k: "calls" | "funnel", label: string) => <button onClick={() => setOpen(open === k ? null : k)} style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: "9px 13px", background: open === k ? "#111827" : "white", color: open === k ? "white" : "#111827", fontWeight: 800, cursor: "pointer" }}>{label}</button>;
  return <div style={{ marginBottom: 6 }}>
    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>{tab("calls", `📞 À appeler aujourd'hui (${calls.length})`)}{tab("funnel", "📊 Tableau de bord des ventes")}</div>
    {open === "calls" && <div style={box}>
      {!calls.length ? <p style={{ margin: 0, color: "#64748b" }}>Personne à rappeler pour l'instant. Les clients chauds, ceux qui demandent un appel et les relances du jour apparaîtront ici.</p> :
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>{calls.map(({ l, r }) => <li key={l.id}><b>{l.nom || "Sans nom"}</b>{l.ville ? ` · ${l.ville}` : ""} — <span style={{ color: r!.score >= 85 ? "#b91c1c" : r!.score >= 60 ? "#b45309" : "#475569" }}>{r!.why}</span><div style={{ display: "flex", gap: 8, marginTop: 4 }}><a href={`tel:${l.telephone}`} onClick={() => onCalled(l)} style={{ fontWeight: 800 }}>📞 {l.telephone}</a><a href={`https://wa.me/${String(l.telephone || "").replace(/\D/g, "").replace(/^0/, "33")}`} target="_blank" rel="noreferrer">WhatsApp</a></div>{l.commentaire ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>« {String(l.commentaire).slice(0, 140)}{String(l.commentaire).length > 140 ? "…" : ""} »</div> : null}</li>)}</ol>}
    </div>}
    {open === "funnel" && <div style={box}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {funnel.steps.map((x, i) => <div key={x.s} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{i + 1}. {x.s === "Nouveau" ? "Contacts" : x.s}</div><div style={{ fontSize: 26, fontWeight: 900 }}>{x.n}</div><div style={{ fontSize: 12, color: "#64748b" }}>{i ? `${pct(x.n, funnel.steps[i - 1].n)} de l'étape précédente` : "tous les contacts actifs"}</div></div>)}
      </div>
      <p style={{ margin: "12px 0 6px", fontSize: 14 }}><b>Taux de vente global :</b> {pct(funnel.steps[5].n, funnel.steps[0].n + funnel.perdus)} · <b>Nouveaux contacts :</b> {funnel.week} cette semaine, {funnel.month} ce mois-ci · <b>Perdus / STOP :</b> {funnel.perdus}</p>
      <div style={{ fontSize: 13, color: "#334155" }}><b>Par source :</b> {Object.entries(funnel.bySource).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => `${k} ${v.total} contacts → ${v.clients} client(s) (${pct(v.clients, v.total)})`).join(" · ")}</div>
    </div>}
  </div>;
}
