"use client";
import { useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";
import type { TourEvent } from "../../lib/schedule";
import { EXPENSE_TYPES, HOTEL_CAP, MEAL_CAP, computeHours, dayTxt, eur, expenseLabel, hm, parisDay, parisTime, recapText } from "../../lib/driver-hours";

type Send = (key: string, body: Record<string, unknown>, ok: string) => Promise<unknown>;
const big: React.CSSProperties = { fontSize: 17, padding: 14, width: "100%", textAlign: "center", cursor: "pointer" };
const box: React.CSSProperties = { display: "grid", gap: 8, border: "1px solid #ece6dd", borderRadius: 14, padding: 12 };

/** Heures et frais du chauffeur : début / pause / fin de journée, tickets, corrections, récapitulatif pour la facture. */
export default function HoursCard({ events, now, rate, estH, tourName, driver, busy, send, upload, onMsg }: { events: TourEvent[]; now: number; rate: number; estH: number; tourName: string; driver: string; busy: string; send: Send; upload: (f: File) => Promise<string>; onMsg: (m: string) => void }) {
  const sum = useMemo(() => computeHours(events, rate, now), [events, rate, now]);
  const today = parisDay(now);
  const td = sum.days.find(d => d.date === today);
  // État du jour : en journée ? en pause ?
  const todays = events.filter(e => ["debut_jour", "fin_jour", "pause", "reprise"].includes(e.kind) && parisDay(e.created_at) === today);
  const lastDay = [...todays].reverse().find(e => e.kind === "debut_jour" || e.kind === "fin_jour");
  const working = lastDay?.kind === "debut_jour";
  const lastP = [...todays].reverse().find(e => e.kind === "pause" || e.kind === "reprise" || e.kind === "debut_jour");
  const paused = working && lastP?.kind === "pause";

  const [fx, setFx] = useState<{ type: string; amount: string; date: string; photo: string } | null>(null); const [up, setUp] = useState(false);
  const [cx, setCx] = useState<{ date: string; sign: "+" | "-"; h: string; m: string; note: string } | null>(null);
  const [recap, setRecap] = useState(false);
  const needPhoto = fx?.type === "hotel" || fx?.type === "repas";
  const text = recapText(tourName, driver, sum, estH);

  return <section className={s.card}>
    <div className={s.rowHead}><h2>⏱️ Mes heures et frais</h2><b>{hm(sum.workedMin)}</b></div>
    <p className={s.muted}>Comptent : conduite, chargement et sanglage, livraisons. Ne comptent pas : pauses, repas, nuits à l’hôtel. Taux : {eur(rate)}/h · prévu pour la tournée : {hm(estH * 60)}.</p>
    <p className={working ? s.ok : s.tip}>{working ? (paused ? "☕ En pause depuis " + parisTime(lastP!.created_at) : `🟢 Journée en cours depuis ${td?.start ? parisTime(td.start) : "—"}`) : lastDay?.kind === "fin_jour" ? `🌙 Journée terminée à ${parisTime(lastDay.created_at)}` : "Appuyez sur « Début de journée » quand vous commencez à travailler."} {td ? ` · aujourd’hui : ${hm(td.workedMin)}` : ""}</p>
    <div className={s.statusBtns}>
      <button className={s.go} disabled={!!busy || working} onClick={() => send("debut_jour", { kind: "debut_jour" }, "🌅 Début de journée noté. Bonne journée !")}>{busy === "debut_jour" ? "…" : "🌅 Début de journée"}</button>
      {paused ? <button className={s.stop} disabled={!!busy} onClick={() => send("reprise", { kind: "reprise" }, "▶️ Reprise notée.")}>{busy === "reprise" ? "…" : "▶️ Reprise"}</button>
        : <button className={s.stop} disabled={!!busy || !working} onClick={() => send("pause", { kind: "pause" }, "☕ Pause notée.")}>{busy === "pause" ? "…" : "☕ Pause"}</button>}
      <button className={s.bad} style={{ gridColumn: "1 / -1" }} disabled={!!busy || !working} onClick={() => confirm("Terminer la journée de travail ?") && send("fin_jour", { kind: "fin_jour" }, "🌙 Fin de journée notée. Bon repos !")}>{busy === "fin_jour" ? "…" : "🌙 Fin de journée"}</button>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className={s.ghost} onClick={() => { setFx(fx ? null : { type: "repas", amount: "", date: today, photo: "" }); setCx(null); }}>🧾 Ajouter un ticket</button>
      <button className={s.ghost} onClick={() => { setCx(cx ? null : { date: today, sign: "+", h: "0", m: "30", note: "" }); setFx(null); }}>✏️ Oubli de clic ? Corriger</button>
    </div>

    {fx ? <div style={box}>
      <label className={s.field}>Type<select value={fx.type} onChange={e => setFx({ ...fx, type: e.target.value })}>{EXPENSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <small className={s.muted}>{fx.type === "hotel" ? `Remboursé jusqu’à ${HOTEL_CAP} € la nuit.` : fx.type === "repas" ? `Remboursé jusqu’à ${MEAL_CAP} € par jour (tous repas).` : fx.type === "autre" ? "À valider par Mansour avant de le facturer." : "Payé avec la carte NeoDrive : noté pour information, pas à facturer."}</small>
      <label className={s.field}>Montant TTC (€)<input inputMode="decimal" value={fx.amount} onChange={e => setFx({ ...fx, amount: e.target.value })} placeholder="ex. 18,50" /></label>
      <label className={s.field}>Jour<input type="date" value={fx.date} onChange={e => setFx({ ...fx, date: e.target.value })} /></label>
      <label className={s.ghost} style={{ cursor: "pointer", textAlign: "center" }}>{up ? "Envoi…" : fx.photo ? "✅ Photo du ticket prête (reprendre)" : needPhoto ? "📷 Photo du ticket (obligatoire)" : "📷 Photo du ticket (conseillée)"}<input type="file" accept="image/*" capture="environment" hidden disabled={up} onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setUp(true); try { const p = await upload(f); setFx(v => v ? { ...v, photo: p } : v); } catch (er) { onMsg("❌ " + (er as Error).message); } setUp(false); }} /></label>
      <button className={s.primary} style={big} disabled={!!busy || up || !(Number(fx.amount.replace(",", ".")) > 0) || (needPhoto && !fx.photo)} onClick={async () => { const j = await send("frais", { kind: "frais", type: fx.type, amount: fx.amount, date: fx.date, path: fx.photo || null }, "🧾 Ticket enregistré."); if (j) setFx(null); }}>{busy === "frais" ? "…" : "Enregistrer le ticket"}</button>
    </div> : null}

    {cx ? <div style={box}>
      <label className={s.field}>Jour à corriger<input type="date" value={cx.date} onChange={e => setCx({ ...cx, date: e.target.value })} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label className={s.field}>Sens<select value={cx.sign} onChange={e => setCx({ ...cx, sign: e.target.value as "+" | "-" })}><option value="+">Ajouter</option><option value="-">Retirer</option></select></label>
        <label className={s.field}>Heures<input inputMode="numeric" value={cx.h} onChange={e => setCx({ ...cx, h: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label>
        <label className={s.field}>Minutes<input inputMode="numeric" value={cx.m} onChange={e => setCx({ ...cx, m: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label>
      </div>
      <label className={s.field}>Explication (obligatoire)<textarea rows={2} value={cx.note} onChange={e => setCx({ ...cx, note: e.target.value })} placeholder="ex. oublié « Fin de journée », fini à 19h" style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d7db", font: "inherit", fontSize: 16 }} /></label>
      <button className={s.primary} style={big} disabled={!!busy || cx.note.trim().length < 5 || !((Number(cx.h) || 0) * 60 + (Number(cx.m) || 0))} onClick={async () => { const min = ((Number(cx.h) || 0) * 60 + (Number(cx.m) || 0)) * (cx.sign === "-" ? -1 : 1); const j = await send("correction", { kind: "correction", date: cx.date, minutes: min, note: cx.note.trim() }, "✏️ Correction enregistrée (visible par NeoDrive)."); if (j) setCx(null); }}>{busy === "correction" ? "…" : "Enregistrer la correction"}</button>
    </div> : null}

    {sum.days.length ? <ul className={s.log}>{sum.days.map(d => <li key={d.date}><time>{dayTxt(d.date)}</time><span><b>{hm(d.workedMin)}</b>{d.start ? ` · ${parisTime(d.start)} → ${d.end ? parisTime(d.end) : d.open ? "en cours" : "?"}` : ""}{d.pauseMin >= 1 ? ` · pauses ${hm(d.pauseMin)}` : ""}{d.correctionMin ? ` · correction ${d.correctionMin > 0 ? "+" : ""}${hm(d.correctionMin)}` : ""}{d.expenses.map((p, k) => <small key={k} style={{ display: "block" }}>{expenseLabel(p.type)} {eur(p.amount)}{p.photo ? " 📷" : ""}</small>)}{d.flags.map((f, k) => <small key={"f" + k} style={{ display: "block", color: "#b42318" }}>⚠️ {f}</small>)}</span></li>)}</ul> : null}

    <div className={s.kpis}>
      <div><small>Heures × {eur(rate)}</small><b>{eur(sum.amount)}</b></div>
      <div><small>Frais remboursés</small><b>{eur(sum.refund)}</b></div>
      <div><small>Total à facturer</small><b>{eur(sum.total)}</b></div>
    </div>
    <button className={s.ghost} onClick={() => setRecap(v => !v)}>{recap ? "Masquer" : "📄 Voir"} le récapitulatif pour ma facture</button>
    {recap ? <><pre style={{ whiteSpace: "pre-wrap", background: "#f6f4f0", padding: 12, borderRadius: 12, fontSize: 13 }}>{text}</pre>
      <button className={s.ghost} onClick={() => navigator.clipboard?.writeText(text).then(() => onMsg("✅ Récapitulatif copié.")).catch(() => onMsg("Copie impossible : sélectionnez le texte."))}>📋 Copier le récapitulatif</button></> : null}
  </section>;
}
