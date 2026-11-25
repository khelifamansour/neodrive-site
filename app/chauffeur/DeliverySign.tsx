"use client";
import { useState } from "react";
import s from "../planificateur/planif.module.css";

/** Suivi d'un client : numéro de série, remise signée, paiement arrivé, accusé signé. */
export type ResInfo = { id: number; vin: string | null; has_email?: boolean; has_phone?: boolean; paid: string | null; pending: boolean; sent_at: string | null; signed_at: string | null; reglement: { mode: string; amount: number }[] | null; driver_name: string | null; pdf: string | null; total?: number | null; montant_du?: number | null; reserve_at?: string | null; reserve_pdf?: string | null; reserve_due?: string | null };
type Call = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const big: React.CSSProperties = { fontSize: 18, padding: 16, width: "100%", textAlign: "center", cursor: "pointer", boxSizing: "border-box" };
const hhmm = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const eur0 = (n: number | null | undefined) => n == null ? "" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const MODE: Record<string, string> = { virement: "Virement", especes: "Espèces remises au chauffeur", carte: "Carte bancaire", autre: "Autre" };
/** Échéance par défaut : 3 jours ouvrés. */
const dueDefault = () => { const d = new Date(); let n = 0; while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return d.toISOString().slice(0, 10); };

/** Deux boutons : appareil photo (capture) ou photo déjà dans la galerie (sans capture). */
export function PhotoPick({ onFile, disabled, busy, main = true, cam = "📷 Prendre la photo", gal = "🖼️ Choisir dans la galerie" }: { onFile: (f: File) => void; disabled?: boolean; busy?: boolean; main?: boolean; cam?: string; gal?: string }) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); };
  return <div style={{ display: "grid", gap: 8, opacity: busy ? .6 : 1 }}>
    <label className={main ? s.primary : s.ghost} style={big}>{busy ? "Envoi…" : cam}<input type="file" accept="image/*" capture="environment" hidden disabled={disabled || busy} onChange={pick} /></label>
    <label className={s.ghost} style={big}>{busy ? "Envoi…" : gal}<input type="file" accept="image/*" hidden disabled={disabled || busy} onChange={pick} /></label>
  </div>;
}

/** Pastilles d'état d'un client. */
export function ResChips({ ri }: { ri?: ResInfo }) {
  if (!ri) return null;
  const chip = (ok: boolean, txt: string) => <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: ok ? "#dcfce7" : "#f1f1f1", color: ok ? "#166534" : "#6b7280" }}>{ok ? "✅" : "⬜"} {txt}</span>;
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {chip(!!ri.vin, "N° de série")}
    {chip(!!ri.reserve_at || !!ri.signed_at, "Remise signée")}
    {chip(!!ri.paid, "Paiement reçu")}
    {chip(!!ri.signed_at, "Accusé signé")}
  </div>;
}

/**
 * Étape 2 de la livraison : faire signer le client sur ce téléphone (même onglet, retour à la tournée ensuite),
 * ou lui envoyer le lien par SMS. Paiement pas encore arrivé : remise avec réserve de propriété (par défaut).
 */
export default function DeliverySign({ cid, ri, ready, reception, backUrl, call, reload, onMsg }: { cid: string; ri?: ResInfo; ready: boolean; reception?: string | null; backUrl: string; call: Call; reload: () => Promise<void>; onMsg: (m: string) => void }) {
  const [busy, setBusy] = useState(""); const [edit, setEdit] = useState<{ montant: string; due: string } | null>(null);
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); onMsg(""); try { const m = await fn(); if (m) onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } setBusy(""); };
  const signHere = () => run("sign", async () => {
    const j = await call({ action: "accuse_link", client_id: cid });
    const path = new URL(j.url, window.location.href).pathname;
    window.location.href = `${path}?retour=${encodeURIComponent(backUrl)}`;
  });
  const sendLink = () => run("sms", async () => { const j = await call({ action: "accuse_send", client_id: cid }); await reload(); return `📩 Lien envoyé${j.sent?.sms ? " par SMS" : ""}${j.sent?.email ? (j.sent?.sms ? " et e-mail" : " par e-mail") : ""}. Ce lien reste valable : la signature apparaîtra ici.`; });
  const saveEdit = () => run("edit", async () => { await call({ action: "reserve_start", client_id: cid, montant_du: edit?.montant, due: edit?.due }); setEdit(null); await reload(); return "✅ Montant et date limite enregistrés."; });

  if (!ri) return reception && ready ? <a className={s.primary} style={{ ...big, textDecoration: "none" }} href={reception}>✍️ Faire signer le client ici</a>
    : <p className={s.muted}>{ready ? "Pas de réservation liée à ce client : appelez Mansour." : "Faites d’abord l’étape 1."}</p>;

  const paid = !!ri.paid; const reserveSigned = !!ri.reserve_at && !paid; const done = !!ri.signed_at;
  const canSign = ready && !!ri.vin && !done && !reserveSigned;
  return <div style={{ display: "grid", gap: 8 }}>
    <ResChips ri={ri} />
    {done ? <>
      <b style={{ color: "#15803d" }}>✅ Accusé signé le {hhmm(ri.signed_at!)}</b>
      {ri.reglement?.length ? <small>💶 Règlement déclaré : {ri.reglement.map(x => `${MODE[x.mode] || x.mode}${x.mode === "especes" && ri.driver_name ? " " + ri.driver_name : ""} : ${eur0(x.amount)}`).join(" ; ")}</small> : null}
      {ri.pdf ? <a className={s.ghost} href={ri.pdf} target="_blank" rel="noreferrer">📄 Accusé signé (PDF)</a> : null}
    </> : reserveSigned ? <>
      <b style={{ color: "#b45309" }}>✅ Remise signée le {hhmm(ri.reserve_at!)} – en attente du paiement</b>
      <small>Gardez les clés et les papiers. Quand le paiement sera arrivé, le client signera l’accusé final <b>sur le même lien</b> (la page se met à jour toute seule).</small>
    </> : !ri.vin ? <p className={s.muted}>Le numéro de série n’est pas encore enregistré pour ce client : faites l’étape 1.</p>
      : !ready ? <p className={s.muted}>Faites d’abord l’étape 1.</p>
      : paid ? <small className={s.okTxt}>💶 Paiement reçu{ri.reserve_at ? " : il reste l’accusé final à signer. Remettez les clés et les papiers." : " : le client signe l’accusé de réception."}</small>
      : <small style={{ background: "#fff4d6", borderRadius: 10, padding: 10, color: "#7a4b00", fontWeight: 700 }}>⏳ Paiement pas encore arrivé sur le compte{ri.montant_du ?? ri.total ? ` (${eur0(ri.montant_du ?? ri.total)})` : ""} : le client signe la remise avec réserve de propriété. <b>Gardez les clés et les papiers.</b></small>}
    {ri.reserve_pdf ? <a className={s.ghost} href={ri.reserve_pdf} target="_blank" rel="noreferrer">📄 Remise signée (PDF)</a> : null}
    {canSign ? <>
      <button className={s.primary} style={big} disabled={!!busy} onClick={signHere}>{busy === "sign" ? "Ouverture…" : paid && ri.reserve_at ? "✍️ Faire signer l’accusé final ici" : "✍️ Faire signer le client ici"}</button>
      {ri.has_phone || ri.has_email ? <button className={s.ghost} style={{ width: "100%" }} disabled={!!busy} onClick={sendLink}>{busy === "sms" ? "Envoi…" : ri.sent_at ? `📩 Renvoyer le lien par SMS (envoyé le ${hhmm(ri.sent_at)})` : "📩 Envoyer le lien par SMS"}</button> : null}
      {!paid && !ri.reserve_at ? (edit ? <div style={{ display: "grid", gap: 6, background: "#fff4d6", borderRadius: 10, padding: 10 }}>
        <label style={{ display: "grid", gap: 2 }}>Montant restant dû (€)<input inputMode="decimal" value={edit.montant} onChange={e => setEdit({ ...edit, montant: e.target.value })} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }} /></label>
        <label style={{ display: "grid", gap: 2 }}>Paiement au plus tard le<input type="date" value={edit.due} onChange={e => setEdit({ ...edit, due: e.target.value })} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }} /></label>
        <div style={{ display: "flex", gap: 8 }}><button className={s.primary} style={{ flex: 1 }} disabled={!!busy} onClick={saveEdit}>{busy === "edit" ? "…" : "Enregistrer"}</button><button className={s.ghost} onClick={() => setEdit(null)}>Annuler</button></div>
      </div> : <button className={s.ghost} style={{ fontSize: 13, padding: 8 }} onClick={() => setEdit({ montant: ri.montant_du != null ? String(ri.montant_du) : ri.total != null ? String(ri.total) : "", due: ri.reserve_due || dueDefault() })}>✏️ Changer le montant dû ou la date limite (facultatif)</button>) : null}
    </> : null}
  </div>;
}
