"use client";
import { useState } from "react";
import c from "../giga/giga.module.css";
import { NEGATIVE_SIGNALS, POSITIVE_SIGNALS, TEMPS, hotSilent, regionOf, suggestTemperature, tempInfo, type TempSignals, type Temperature } from "../../lib/reservation-temperature";

export type TempRow = {
  id: number; prenom: string; nom: string; telephone: string; ville: string; code_postal: string; departement: string; adresse: string;
  modele: string; couleur: string; statut: string; date_promise: string | null; livre_at?: string | null; paiement_confirme_at?: string | null;
  temperature?: Temperature | null; temperature_signals?: TempSignals | null; temperature_at?: string | null; last_client_reply_at?: string | null;
  signature_at?: string | null; pack_confirmed_at?: string | null; livraison_mode?: string | null;
};
const dt = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—";
const day = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";

/** Pastilles affichées sur la carte : température + alerte « sans réponse depuis 48 h ». */
export function TempBadges({ r }: { r: TempRow }) {
  const t = tempInfo(r.temperature);
  return <>
    {t ? <span className={c.badge} style={{ background: t.bg, color: t.color }}>{t.icon} {t.label}</span> : null}
    {hotSilent(r) ? <span className={c.badge} style={{ background: "#b42318", color: "#fff" }} title="Client « chaud » sans réponse depuis plus de 48 h">⚠️ Sans réponse 48 h</span> : null}
  </>;
}

/** Réglage de la température : signaux cochés, suggestion automatique, choix final (modifiable). */
export function TempPanel({ r, busy, onSave, onReply }: { r: TempRow; busy: boolean; onSave: (t: Temperature | null, signals: string[]) => void; onReply: () => void }) {
  const [checked, setChecked] = useState<string[]>(r.temperature_signals?.checked || []);
  const [temp, setTemp] = useState<Temperature | null>(r.temperature || null);
  const sug = suggestTemperature(checked); const s = tempInfo(sug)!;
  const toggle = (k: string) => setChecked(checked.includes(k) ? checked.filter(x => x !== k) : [...checked, k]);
  const box = (list: readonly { key: string; label: string }[], col: string, title: string) => <div style={{ display: "grid", gap: 4 }}>
    <small style={{ fontWeight: 700, color: col }}>{title}</small>
    {list.map(x => <label key={x.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, padding: "4px 0" }}>
      <input type="checkbox" style={{ width: 20, height: 20 }} checked={checked.includes(x.key)} onChange={() => toggle(x.key)} />{x.label}</label>)}
  </div>;
  return <div style={{ display: "grid", gap: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
    <b>🌡️ Température du client</b>
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      {box(POSITIVE_SIGNALS, "#067647", "👍 Signaux positifs")}
      {box(NEGATIVE_SIGNALS, "#b42318", "👎 Signaux négatifs")}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span className={c.muted}>Suggestion : <b style={{ color: s.color }}>{s.icon} {s.label}</b></span>
      {temp !== sug ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => setTemp(sug)}>Appliquer</button> : null}
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {TEMPS.map(t => <button key={t.key} className={c.btn} onClick={() => setTemp(temp === t.key ? null : t.key)}
        style={{ flex: "1 1 90px", border: `2px solid ${temp === t.key ? t.color : "#e5e0d8"}`, background: temp === t.key ? t.bg : "#fff", color: t.color, fontWeight: 700 }}>{t.icon} {t.label}</button>)}
    </div>
    {temp && temp !== sug ? <small className={c.muted}>Choix différent de la suggestion (forcé à la main).</small> : null}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className={`${c.btn} ${c.btnBrand}`} disabled={busy} onClick={() => onSave(temp, checked)}>{busy ? "…" : "Enregistrer la température"}</button>
      <button className={`${c.btn} ${c.btnGhost}`} disabled={busy} onClick={onReply}>✅ Le client a répondu</button>
    </div>
    <small className={c.muted}>
      {r.temperature_at ? `Réglée le ${dt(r.temperature_at)}${r.temperature_signals?.by ? ` par ${r.temperature_signals.by}` : ""}` : "Pas encore réglée"}
      {" · "}Dernière réponse du client : {dt(r.last_client_reply_at)}{r.temperature_signals?.reply_by && r.last_client_reply_at ? ` (noté par ${r.temperature_signals.reply_by})` : ""}
    </small>
  </div>;
}

const Check = ({ ok, label }: { ok: boolean; label: string }) => <span className={c.badge} style={{ background: ok ? "#e7f6ec" : "#f1f1f1", color: ok ? "#067647" : "#667085" }}>{ok ? "✅" : "⬜"} {label}</span>;

/** « Prêts pour Rabouin » : réservations Nouvelle / Confirmée, chaudes, non livrées, regroupées par région. */
export function RabouinList({ rows, onCopy, onReply, busy }: { rows: TempRow[]; onCopy: (txt: string) => void; onReply: (id: number) => void; busy: boolean }) {
  const ready = rows.filter(r => ["Nouvelle", "Confirmée"].includes(r.statut) && r.temperature === "chaud" && !r.livre_at);
  const groups = new Map<string, TempRow[]>();
  for (const r of ready) { const g = regionOf(r.departement, r.code_postal); groups.set(g, [...(groups.get(g) || []), r]); }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const silent = ready.filter(r => hotSilent(r)).length;
  return <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
    <p className={c.muted} style={{ margin: 0 }}>Clients « 🔥 Chaud », statut Nouvelle ou Confirmée, pas encore livrés. Le camion Rabouin se réserve ~1 semaine à l’avance et n’est pas annulable : vérifiez les points ci-dessous avant de réserver.{silent ? <b style={{ color: "#b42318" }}> ⚠️ {silent} client(s) sans réponse depuis 48 h : à rappeler avant de réserver.</b> : null}</p>
    {!sorted.length ? <p className={c.muted}>Aucune réservation chaude pour l’instant. Réglez la température dans la liste (bouton 🌡️).</p> : null}
    {sorted.map(([region, list]) => <section key={region} className={c.card} style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 17 }}>📍 {region} ({list.length})</b>
        <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => onCopy(list.map(r => `${r.prenom} ${r.nom}, ${r.adresse}, ${r.code_postal} ${r.ville}, ${r.telephone} – ${r.modele}${r.couleur ? " " + r.couleur : ""} – ${day(r.date_promise)}`).join("\n"))}>📋 Copier pour Rabouin</button>
      </div>
      {[...list].sort((a, b) => String(a.date_promise || "9").localeCompare(String(b.date_promise || "9"))).map(r => <div key={r.id} style={{ borderTop: "1px solid #eee", paddingTop: 8, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <b>{r.prenom} {r.nom}</b><span className={c.muted}>· {r.ville || "—"}{r.departement ? ` (${r.departement})` : ""} · {r.statut}</span>
          {hotSilent(r) ? <span className={c.badge} style={{ background: "#b42318", color: "#fff" }}>⚠️ Sans réponse 48 h</span> : null}
          {r.livraison_mode === "transporteur" ? <span className={c.badge} style={{ background: "#ede7fb", color: "#111" }}>🚛 Transporteur</span> : null}
        </div>
        <div className={c.muted} style={{ fontSize: 14 }}>🚗 {r.modele || "—"}{r.couleur ? ` ${r.couleur}` : ""} · 📅 Date promise : <b>{day(r.date_promise)}</b></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Check ok={!!r.signature_at} label="Bon de commande signé" />
          <Check ok={!!r.pack_confirmed_at} label="RIB / pack confirmé" />
          <Check ok={!!r.date_promise} label="Date promise" />
          <Check ok={!!r.paiement_confirme_at} label="Paiement reçu" />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.telephone ? <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 12px" }} href={`tel:${r.telephone}`}>📞 Appeler</a> : null}
          {hotSilent(r) ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 12px" }} disabled={busy} onClick={() => onReply(r.id)}>✅ Le client a répondu</button> : null}
        </div>
      </div>)}
    </section>)}
    <small className={c.muted}>Pièce d’identité : pas encore suivie dans les réservations (à vérifier à la main).</small>
  </div>;
}
