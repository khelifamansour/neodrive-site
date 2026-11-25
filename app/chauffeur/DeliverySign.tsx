"use client";
import { useState } from "react";
import s from "../planificateur/planif.module.css";

/** Suivi d'un client : numéro de série, remise signée, paiement arrivé, accusé signé. */
export type ResInfo = { id: number; vin: string | null; has_email?: boolean; has_phone?: boolean; paid: string | null; pending: boolean; sent_at: string | null; signed_at: string | null; reglement: { mode: string; amount: number }[] | null; driver_name: string | null; pdf: string | null; total?: number | null; montant_du?: number | null; reserve_at?: string | null; reserve_pdf?: string | null; reserve_due?: string | null };
type Call = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const hhmm = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const eur0 = (n: number | null | undefined) => n == null ? "" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const MODE: Record<string, string> = { virement: "Virement", especes: "Espèces remises au chauffeur", carte: "Carte bancaire", autre: "Autre" };
/** Échéance par défaut : 3 jours ouvrés. */
const dueDefault = () => { const d = new Date(); let n = 0; while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return d.toISOString().slice(0, 10); };
const pickBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 64, padding: 10, fontSize: 17, lineHeight: 1.2, cursor: "pointer", boxSizing: "border-box" };

/** Deux boutons égaux côte à côte : appareil photo (capture) ou photo déjà dans la galerie (sans capture). */
export function PhotoPick({ onFile, disabled, busy, cam = "📷 Photographier", gal = "🖼️ Depuis la galerie" }: { onFile: (f: File) => void; disabled?: boolean; busy?: boolean; cam?: string; gal?: string }) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); };
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: busy || disabled ? .6 : 1 }}>
    <label className={s.primary} style={pickBtn}>{busy ? "Envoi…" : cam}<input type="file" accept="image/*" capture="environment" hidden disabled={disabled || busy} onChange={pick} /></label>
    <label className={s.ghost} style={pickBtn}>{busy ? "Envoi…" : gal}<input type="file" accept="image/*" hidden disabled={disabled || busy} onChange={pick} /></label>
  </div>;
}

/** Ouvre la page de signature du client sur ce téléphone (même onglet) ; « Retour à la tournée » ramène sur ce client. */
export async function openSign(call: Call, cid: string, backUrl: string) {
  const j = await call({ action: "accuse_link", client_id: cid });
  const path = new URL(j.url, window.location.href).pathname;
  window.location.href = `${path}?retour=${encodeURIComponent(backUrl)}`;
}

/** État de la signature d'un client, envoi du lien par SMS, montant dû et date limite (facultatif). */
export function SignInfo({ cid, ri, call, reload, onMsg }: { cid: string; ri: ResInfo; call: Call; reload: () => Promise<void>; onMsg: (m: string) => void }) {
  const [busy, setBusy] = useState(""); const [edit, setEdit] = useState<{ montant: string; due: string } | null>(null);
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); onMsg(""); try { const m = await fn(); if (m) onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } setBusy(""); };
  const sendLink = () => run("sms", async () => { const j = await call({ action: "accuse_send", client_id: cid }); await reload(); return `📩 Lien envoyé${j.sent?.sms ? " par SMS" : ""}${j.sent?.email ? (j.sent?.sms ? " et e-mail" : " par e-mail") : ""}. Il reste valable.`; });
  const saveEdit = () => run("edit", async () => { await call({ action: "reserve_start", client_id: cid, montant_du: edit?.montant, due: edit?.due }); setEdit(null); await reload(); return "✅ Montant et date limite enregistrés."; });
  const paid = !!ri.paid;
  if (ri.signed_at) return <div style={{ display: "grid", gap: 6 }}>
    <b style={{ color: "#15803d" }}>✅ Accusé signé le {hhmm(ri.signed_at)}</b>
    {ri.reglement?.length ? <small>💶 {ri.reglement.map(x => `${MODE[x.mode] || x.mode}${x.mode === "especes" && ri.driver_name ? " " + ri.driver_name : ""} : ${eur0(x.amount)}`).join(" ; ")}</small> : null}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {ri.pdf ? <a className={s.ghost} style={{ flex: 1 }} href={ri.pdf} target="_blank" rel="noreferrer">📄 Accusé (PDF)</a> : null}
      {ri.reserve_pdf ? <a className={s.ghost} style={{ flex: 1 }} href={ri.reserve_pdf} target="_blank" rel="noreferrer">📄 Remise (PDF)</a> : null}
    </div>
  </div>;
  if (ri.reserve_at && !paid) return <div style={{ display: "grid", gap: 6 }}>
    <b style={{ color: "#b45309" }}>✅ Remise signée le {hhmm(ri.reserve_at)} – en attente du paiement</b>
    <small>Gardez les clés et les papiers. Le client signera l’accusé final sur le même lien quand le paiement sera arrivé.</small>
    {ri.reserve_pdf ? <a className={s.ghost} href={ri.reserve_pdf} target="_blank" rel="noreferrer">📄 Remise signée (PDF)</a> : null}
  </div>;
  return <div style={{ display: "grid", gap: 6 }}>
    {paid ? <small className={s.okTxt}>💶 Paiement reçu{ri.reserve_at ? " : remettez les clés et les papiers, puis faites signer l’accusé final." : "."}</small>
      : <small style={{ background: "#fff4d6", borderRadius: 10, padding: 10, color: "#7a4b00", fontWeight: 700 }}>⏳ Paiement pas encore arrivé{ri.montant_du ?? ri.total ? ` (${eur0(ri.montant_du ?? ri.total)})` : ""} : le client signe la remise avec réserve. <b>Gardez les clés et les papiers.</b></small>}
    {ri.has_phone || ri.has_email ? <button className={s.ghost} disabled={!!busy} onClick={sendLink}>{busy === "sms" ? "Envoi…" : ri.sent_at ? `📩 Renvoyer le lien par SMS (envoyé le ${hhmm(ri.sent_at)})` : "📩 Envoyer le lien par SMS"}</button> : null}
    {!paid && !ri.reserve_at ? (edit ? <div style={{ display: "grid", gap: 6, background: "#fff4d6", borderRadius: 10, padding: 10 }}>
      <label style={{ display: "grid", gap: 2 }}>Montant restant dû (€)<input inputMode="decimal" value={edit.montant} onChange={e => setEdit({ ...edit, montant: e.target.value })} /></label>
      <label style={{ display: "grid", gap: 2 }}>Paiement au plus tard le<input type="date" value={edit.due} onChange={e => setEdit({ ...edit, due: e.target.value })} /></label>
      <div style={{ display: "flex", gap: 8 }}><button className={s.primary} style={{ flex: 1 }} disabled={!!busy} onClick={saveEdit}>{busy === "edit" ? "…" : "Enregistrer"}</button><button className={s.ghost} onClick={() => setEdit(null)}>Annuler</button></div>
    </div> : <button className={s.ghost} style={{ fontSize: 13, padding: 8 }} onClick={() => setEdit({ montant: ri.montant_du != null ? String(ri.montant_du) : ri.total != null ? String(ri.total) : "", due: ri.reserve_due || dueDefault() })}>✏️ Montant dû ou date limite (facultatif)</button>) : null}
  </div>;
}
