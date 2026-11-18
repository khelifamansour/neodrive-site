"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zipSync } from "fflate";
import c from "../giga/giga.module.css";
import { EXPENSE_TYPES, HOTEL_CAP, MEAL_CAP } from "../../lib/driver-hours";

type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;
type Control = { planned_h: number; real_h: number; gap_h: number; planned_stops: number; delivered: number; missing: string[]; no_vin: string[]; no_receipt: string[]; card_total: number; perso_total: number; tickets?: number; cap_alerts: string[] };
type Inv = { id: number; driver: string; member_id: number; tour_id: string; tour_name: string; number: string; status: string; worked_min: number; total: number; control: Control | null; deliveries: { client: string; vin: string }[]; sent_at: string; paid_at: string | null; url: string | null };
type Exp = { id: number; date: string; type: string; amount: number; vat: number | null; merchant: string; paid: string; ai: { status: string; confidence?: string } | null; edited: boolean; tour_id: string; tour: string; driver: string; url: string | null; photo: boolean };

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const hm = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}`;
const dTxt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const catLabel = (t: string) => EXPENSE_TYPES.find(x => x.id === t)?.label || t;
const sum = (xs: Exp[]) => Math.round(xs.reduce((a, x) => a + x.amount, 0) * 100) / 100;
const groupBy = <T, K extends string>(xs: T[], k: (x: T) => K) => xs.reduce((m, x) => { const key = k(x); (m[key] ||= []).push(x); return m; }, {} as Record<K, T[]>);

/** Factures des livreurs (à payer / payées), contrôle prévu-réel, vue mensuelle, tickets du mois triés par l'IA et export comptable. */
export default function Invoices({ api, onMsg }: { api: Api; onMsg: (m: string) => void }) {
  const [inv, setInv] = useState<Inv[]>([]); const [busy, setBusy] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); const [exp, setExp] = useState<Exp[]>([]); const [edit, setEdit] = useState<Exp | null>(null);
  const loadInv = useCallback(() => api<{ invoices: Inv[] }>({ action: "admin_invoices" }).then(j => setInv(j.invoices)).catch(e => onMsg("❌ " + (e as Error).message)), [api, onMsg]);
  const loadExp = useCallback(() => api<{ expenses: Exp[] }>({ action: "admin_expenses", month }).then(j => setExp(j.expenses)).catch(e => onMsg("❌ " + (e as Error).message)), [api, onMsg, month]);
  useEffect(() => { loadInv(); }, [loadInv]);
  useEffect(() => { loadExp(); }, [loadExp]);
  const run = async (k: string, fn: () => Promise<string | void>) => { setBusy(k); try { const m = await fn(); if (m) onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };

  const months = useMemo(() => {
    const g = groupBy(inv, x => `${x.sent_at.slice(0, 7)}|${x.driver}`);
    return Object.entries(g).map(([k, xs]) => { const [m, driver] = k.split("|"); return { m, driver, tours: xs.length, min: xs.reduce((a, x) => a + x.worked_min, 0), total: xs.reduce((a, x) => a + Number(x.total), 0), paid: xs.filter(x => x.status === "payee").length, unpaid: xs.filter(x => x.status !== "payee").reduce((a, x) => a + Number(x.total), 0), vins: xs.reduce((a, x) => a + (x.deliveries || []).filter(d => d.vin).length, 0), dlv: xs.reduce((a, x) => a + (x.deliveries || []).length, 0) }; }).sort((a, z) => z.m.localeCompare(a.m) || a.driver.localeCompare(z.driver));
  }, [inv]);

  const csv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Date", "Livreur", "Tournée", "Catégorie", "Commerçant", "Montant TTC", "TVA", "Payé avec", "Lecture", "Photo"].map(q).join(";"), ...exp.map(x => [x.date, x.driver, x.tour, catLabel(x.type).replace(/^\S+\s/, ""), x.merchant, String(x.amount).replace(".", ","), x.vat == null ? "" : String(x.vat).replace(".", ","), x.paid === "perso" ? "Personnel (à rembourser)" : "Carte MK HOLDING", x.edited ? "corrigé" : x.ai?.status === "ok" ? `IA (${x.ai.confidence})` : "à vérifier", `${x.date}_${x.id}.jpg`].map(q).join(";"))];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `tickets-livreurs-${month}.csv`; a.click();
  };
  const zip = () => run("zip", async () => {
    const files: Record<string, Uint8Array> = {};
    for (const x of exp) if (x.url) { const r = await fetch(x.url); if (r.ok) files[`${x.date}_${x.id}_${x.type}.jpg`] = new Uint8Array(await r.arrayBuffer()); }
    if (!Object.keys(files).length) return "Aucune photo ce mois-ci.";
    const out = zipSync(files, { level: 0 });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out.buffer as ArrayBuffer], { type: "application/zip" })); a.download = `tickets-livreurs-${month}.zip`; a.click();
    return `📦 ${Object.keys(files).length} photos téléchargées.`;
  });

  const byTour = groupBy(exp, x => x.tour_id);
  const inp = { padding: 6, fontSize: 14 } as const;

  return <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
    <section className={c.card} style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>🧾 Factures des livreurs</h2>
      <small className={c.muted}>Factures d’autofacturation (heures × taux, sans frais), envoyées par le livreur à la clôture de sa tournée. Vous payez par virement puis « Marquer payée ».</small>
      {inv.length ? inv.map(x => { const k = x.control; return <div key={x.id} style={{ display: "grid", gap: 4, padding: 10, borderRadius: 10, background: x.status === "payee" ? "#f3fbf6" : "#fffaeb" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <span><b>{x.number}</b> · {x.driver} · {x.tour_name} · {hm(x.worked_min)} · <b>{eur(Number(x.total))}</b></span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={c.badge} style={{ background: x.status === "payee" ? "#e7f6ec" : "#fef0c7", color: "#111" }}>{x.status === "payee" ? `Payée le ${new Date(x.paid_at || "").toLocaleDateString("fr-FR")}` : "À payer"}</span>
            {x.url ? <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} href={x.url} target="_blank" rel="noreferrer">PDF</a> : null}
            {x.status === "payee" ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} disabled={!!busy} onClick={() => confirm("Annuler le paiement ?") && run("p" + x.id, async () => { await api({ action: "admin_invoice_paid", id: x.id, paid: false }); await loadInv(); })}>Annuler</button>
              : <button className={`${c.btn} ${c.btnBrand}`} style={{ padding: "4px 10px" }} disabled={!!busy} onClick={() => confirm(`Virement de ${eur(Number(x.total))} fait à ${x.driver} ?`) && run("p" + x.id, async () => { await api({ action: "admin_invoice_paid", id: x.id, paid: true }); await loadInv(); return "✅ Facture marquée payée."; })}>Marquer payée</button>}
          </span>
        </div>
        {k ? <small className={c.muted}>Contrôle : {k.real_h} h pour {k.planned_h} h prévues (<b style={{ color: Math.abs(k.gap_h) > 1.5 ? "#b42318" : "inherit" }}>écart {k.gap_h > 0 ? "+" : ""}{k.gap_h} h</b>) · livrés {k.delivered}/{k.planned_stops}{k.missing.length ? ` · non livrés : ${k.missing.join(", ")}` : ""}{k.no_vin.length ? ` · VIN non saisis : ${k.no_vin.join(", ")}` : ""}{k.no_receipt.length ? ` · sans accusé : ${k.no_receipt.join(", ")}` : ""} · carte société {eur(k.card_total)} ({k.tickets ?? 0} tickets){k.perso_total ? ` · à rembourser ${eur(k.perso_total)}` : ""}{k.cap_alerts.length ? ` · ⚠️ ${k.cap_alerts.join(", ")}` : ""}</small> : null}
      </div>; }) : <p className={c.muted}>Aucune facture pour l’instant.</p>}
    </section>

    {months.length ? <section className={c.card} style={{ display: "grid", gap: 8, overflowX: "auto" }}>
      <h2 style={{ margin: 0 }}>📅 Vue mensuelle par livreur</h2>
      <table style={{ borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}><thead><tr>{["Mois", "Livreur", "Tournées", "Heures", "Montant", "Factures", "Livraisons (VIN)"].map(h => <th key={h} style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead>
        <tbody>{months.map(r => <tr key={r.m + r.driver}><td style={{ padding: 6 }}>{r.m}</td><td style={{ padding: 6 }}>{r.driver}</td><td style={{ padding: 6 }}>{r.tours}</td><td style={{ padding: 6 }}>{hm(r.min)}</td><td style={{ padding: 6 }}>{eur(r.total)}</td><td style={{ padding: 6 }}>{r.paid}/{r.tours} payées{r.unpaid ? ` · ${eur(r.unpaid)} à payer` : ""}</td><td style={{ padding: 6 }}>{r.dlv} ({r.vins} avec VIN)</td></tr>)}</tbody></table>
    </section> : null}

    <section className={c.card} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>💳 Tickets du mois (carte société)</h2>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input className={c.input} type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 160 }} />
          <button className={`${c.btn} ${c.btnGhost}`} disabled={!exp.length} onClick={csv}>⬇️ CSV comptable</button>
          <button className={`${c.btn} ${c.btnGhost}`} disabled={!exp.length || !!busy} onClick={zip}>{busy === "zip" ? "…" : "📦 Photos (zip)"}</button>
        </span>
      </div>
      <small className={c.muted}>Le livreur envoie seulement des photos ; l’IA lit la date, le commerçant, le montant, la TVA et la catégorie. Corrigez si besoin (✏️). Repères : hôtel {HOTEL_CAP} €/nuit, repas {MEAL_CAP} €/jour.</small>
      <b>Total du mois : {eur(sum(exp))}{sum(exp.filter(x => x.paid === "perso")) ? ` · dont ${eur(sum(exp.filter(x => x.paid === "perso")))} à rembourser (payé personnellement)` : ""} · {exp.length} tickets{exp.filter(x => !x.edited && x.ai?.status !== "ok" || x.ai?.confidence === "basse").length ? ` · ${exp.filter(x => !x.edited && (x.ai?.status !== "ok" || x.ai?.confidence === "basse")).length} à vérifier` : ""}</b>
      {Object.entries(byTour).map(([tid, xs]) => <div key={tid} style={{ display: "grid", gap: 6, padding: 10, borderRadius: 10, background: "#faf8f5" }}>
        <b>{xs[0].tour} · {xs[0].driver} · {eur(sum(xs))}</b>
        <small className={c.muted}>{Object.entries(groupBy(xs, x => x.type)).map(([t, ys]) => `${catLabel(t)} ${eur(sum(ys))}`).join(" · ")}</small>
        {Object.entries(groupBy(xs, x => x.date)).sort(([a], [z]) => a.localeCompare(z)).map(([d, ys]) => { const hotel = sum(ys.filter(y => y.type === "hotel")), meals = sum(ys.filter(y => y.type === "repas")); return <div key={d} style={{ display: "grid", gap: 4 }}>
          <span style={{ fontWeight: 700 }}>{dTxt(d)} · {eur(sum(ys))}{hotel > HOTEL_CAP ? <b style={{ color: "#b42318" }}> · hôtel {eur(hotel)} &gt; {HOTEL_CAP} €</b> : null}{meals > MEAL_CAP ? <b style={{ color: "#b42318" }}> · repas {eur(meals)} &gt; {MEAL_CAP} €</b> : null}</span>
          {ys.map(y => edit?.id === y.id ? <div key={y.id} style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", padding: 8, background: "#fff", borderRadius: 8 }}>
            <select style={inp} value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}>{EXPENSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
            <input style={inp} value={edit.merchant} onChange={e => setEdit({ ...edit, merchant: e.target.value })} placeholder="Commerçant" />
            <input style={inp} inputMode="decimal" value={String(edit.amount)} onChange={e => setEdit({ ...edit, amount: e.target.value as unknown as number })} placeholder="TTC" />
            <input style={inp} inputMode="decimal" value={edit.vat == null ? "" : String(edit.vat)} onChange={e => setEdit({ ...edit, vat: (e.target.value || null) as unknown as number })} placeholder="TVA" />
            <input style={inp} type="date" value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} />
            <select style={inp} value={edit.paid} onChange={e => setEdit({ ...edit, paid: e.target.value })}><option value="carte">Carte société</option><option value="perso">Payé par le livreur (à rembourser)</option></select>
            <button className={`${c.btn} ${c.btnBrand}`} style={{ padding: "4px 10px" }} disabled={!!busy} onClick={() => run("e", async () => { await api({ action: "admin_expense_update", ...edit, vat: edit.vat ?? "" }); setEdit(null); await loadExp(); return "✅ Ticket corrigé."; })}>Enregistrer</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} onClick={() => setEdit(null)}>Annuler</button>
          </div> : <div key={y.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
            <span>{catLabel(y.type)} · {y.merchant || "?"} · <b>{eur(y.amount)}</b>{y.vat != null ? ` (TVA ${eur(y.vat)})` : ""}{y.paid === "perso" ? " · à rembourser" : ""}
              {" "}<small style={{ color: y.edited ? "#067647" : y.ai?.status === "ok" && y.ai.confidence !== "basse" ? "#555" : "#b42318" }}>{y.edited ? "corrigé" : y.ai?.status === "pending" ? "lecture en cours" : y.ai?.status === "ok" ? `IA ${y.ai.confidence}` : "à vérifier"}</small></span>
            <span style={{ display: "flex", gap: 6 }}>
              {y.url ? <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "2px 8px" }} href={y.url} target="_blank" rel="noreferrer">📷</a> : null}
              <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "2px 8px" }} onClick={() => setEdit(y)}>✏️</button>
              <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "2px 8px" }} disabled={!!busy} title="Relire avec l’IA" onClick={() => run("r" + y.id, async () => { await api({ action: "admin_expense_reread", id: y.id }); await loadExp(); })}>{busy === "r" + y.id ? "…" : "🔁"}</button>
            </span>
          </div>)}
        </div>; })}
      </div>)}
      {!exp.length ? <p className={c.muted}>Aucun ticket pour ce mois.</p> : null}
    </section>
  </div>;
}
