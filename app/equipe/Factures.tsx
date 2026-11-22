"use client";
import { useCallback, useEffect, useState } from "react";
import SignaturePad from "../livreur/SignaturePad";
import { STATUS_FR, eur, frDate, type InvoiceStatus, type Statement } from "../../lib/team-pay";
import type { DossierApi } from "./Dossier";

/** « Mes factures » : relevé automatique de chaque mois civil, puis facture signée au doigt et envoyée à NeoDrive. */
export type MonthOut = { month: string; label: string; status: InvoiceStatus; number: string | null; statement: Statement; sent_at: string | null; paid_at: string | null; resend: boolean; due: string; can_send_from: string; pdf_url: string | null };
const C = { line: "#e5e0d8", ink: "#141414", mute: "#6b6b6b", brand: "#f05a28", ok: "#15803d", bad: "#b91c1c" };
const box: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: "10px 0" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "11px 14px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit" });
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 10, border: `1px solid ${C.line}`, font: "inherit", fontSize: 16, background: "#fff" };
export const BADGE: Record<InvoiceStatus, [string, string]> = { brouillon: ["#f1f1f1", "#555"], envoyee: ["#e0f2fe", "#075985"], payee: ["#dcfce7", "#15803d"] };

/** Lignes du relevé (partagé avec la page fondateur). */
export function StatementView({ st }: { st: Statement }) {
  return <div>
    <div style={{ display: "grid", gap: 6, margin: "8px 0" }}>
      {st.lines.map((l, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, color: l.kind === "info" ? C.mute : C.ink }}>
        <span style={{ flex: 1, minWidth: 0 }}>{l.label}</span><b style={{ whiteSpace: "nowrap", fontWeight: l.kind === "info" ? 400 : 700 }}>{l.amount == null ? "—" : eur(l.amount)}</b>
      </div>)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 8, fontSize: 17 }}><b>Total</b><b>{eur(st.total)}</b></div>
    {!st.items.length ? <p style={{ color: C.mute, fontSize: 13, margin: "6px 0 0" }}>Aucune vente ni confirmation livrée et payée ce mois-ci pour l’instant.</p> : null}
    <details style={{ marginTop: 8 }}><summary style={{ cursor: "pointer", color: C.mute, fontSize: 13 }}>Comment c’est calculé ?</summary>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#333", fontSize: 13, display: "grid", gap: 4 }}>{st.explain.map((e, i) => <li key={i}>{e}</li>)}
        <li>Une vente ou une confirmation compte le mois où la voiture est livrée et entièrement payée. Une seule prime par voiture.</li></ul>
    </details>
  </div>;
}

export default function Factures({ api, goDossier }: { api: DossierApi; goDossier: () => void }) {
  const [data, setData] = useState<{ today: string; months: MonthOut[]; suggest: Record<string, string>; blockers: string[] } | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [num, setNum] = useState(""); const [sig, setSig] = useState<string | null>(null); const [busy, setBusy] = useState(""); const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const j = await api<NonNullable<typeof data>>({ action: "invoices" }); setData(j); } catch (e) { setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p style={{ color: err ? C.bad : C.mute }}>{err || "Chargement de vos relevés…"}</p>;
  const pick = (m: MonthOut) => { setOpen(open === m.month ? null : m.month); setNum(data.suggest[m.month] || ""); setSig(null); setPreview(null); setErr(""); setMsg(""); };
  const doPreview = async (m: MonthOut) => {
    setBusy("preview"); setErr(""); setPreview(null);
    try { const j = await api<{ pdf: string }>({ action: "invoice_preview", month: m.month, number: num, signature: sig }); const bin = atob(j.pdf); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); setPreview(URL.createObjectURL(new Blob([u8], { type: "application/pdf" }))); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };
  const send = async (m: MonthOut) => {
    if (!confirm(`Envoyer la facture ${num} de ${m.label} (${eur(m.statement.total)}) à NeoDrive ?`)) return;
    setBusy("send"); setErr("");
    try { await api({ action: "invoice_send", month: m.month, number: num, signature: sig }); setMsg(`✅ Facture ${num} envoyée à NeoDrive. Paiement prévu le ${frDate(m.due)}.`); setOpen(null); await load(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };

  return <div>
    <div style={box}>
      <b style={{ fontSize: 17 }}>🧾 Mes factures</b>
      <p style={{ color: C.mute, fontSize: 14, margin: "4px 0 0" }}>Chaque mois, votre relevé se calcule tout seul. À la fin du mois (au plus tard le 3 du mois suivant), vérifiez-le, signez avec le doigt et envoyez votre facture. Le paiement est fait le 10 par virement.</p>
    </div>
    {data.blockers.length ? <div style={{ ...box, background: "#fff7ed", borderColor: "#fdba74" }}>
      <b>Avant votre première facture, complétez votre dossier :</b> {data.blockers.join(", ")}.
      <div><button onClick={goDossier} style={{ ...btn(C.brand), marginTop: 8 }}>Compléter mon dossier</button></div>
    </div> : null}
    {err && !open ? <p style={{ color: C.bad, fontWeight: 600 }}>{err}</p> : null}
    {msg ? <p style={{ color: C.ok, fontWeight: 600 }}>{msg}</p> : null}

    {data.months.map(m => {
      const isOpen = open === m.month; const [bg, fg] = BADGE[m.status];
      const early = data.today < m.can_send_from;
      return <div key={m.month} style={box}>
        <button onClick={() => pick(m)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <b style={{ fontSize: 17, textTransform: "capitalize" }}>{m.label}</b><b style={{ fontSize: 17 }}>{eur(m.statement.total)}</b>
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
            <span style={{ background: bg, color: fg, borderRadius: 99, padding: "2px 10px", fontWeight: 700 }}>{STATUS_FR[m.status]}</span>
            <span style={{ color: C.mute }}>{m.number ? `N° ${m.number} · ` : ""}{m.status === "payee" && m.paid_at ? `payée le ${frDate(m.paid_at)}` : `paiement prévu le ${frDate(m.due)}`}</span>
          </div>
          {!isOpen ? <div style={{ color: C.brand, fontSize: 13, marginTop: 6, fontWeight: 600 }}>{m.status === "brouillon" ? "Voir le détail et envoyer ›" : "Voir le détail ›"}</div> : null}
        </button>
        {m.resend ? <p style={{ background: "#fff7ed", borderRadius: 10, padding: 8, fontSize: 14, margin: "8px 0 0" }}>NeoDrive a ajouté un ajustement à ce mois : vérifiez le relevé, puis renvoyez votre facture.</p> : null}
        {isOpen ? <div style={{ marginTop: 8 }}>
          <StatementView st={m.statement} />
          {m.pdf_url ? <a href={m.pdf_url} target="_blank" rel="noreferrer" style={{ ...btn("#555"), display: "inline-block", textDecoration: "none", marginTop: 10 }}>📄 Voir ma facture (PDF)</a> : null}
          {m.status === "brouillon" ? <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 10 }}>
            <b>Ma facture</b>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "8px 0 4px" }}>Numéro de facture</label>
            <input style={{ ...input, fontFamily: "monospace" }} value={num} onChange={e => setNum(e.target.value)} />
            <p style={{ color: C.mute, fontSize: 12.5, margin: "3px 0 8px" }}>Un numéro différent chaque mois, qui se suit (ex. 2026-11-001, puis 2026-12-002).</p>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "8px 0 4px" }}>Ma signature</label>
            <SignaturePad onChange={setSig} />
            {err ? <p style={{ color: C.bad, fontWeight: 600 }}>{err}</p> : null}
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <button onClick={() => doPreview(m)} disabled={!!busy} style={btn("#555")}>{busy === "preview" ? "Préparation…" : "👀 Voir l'aperçu de la facture"}</button>
              {preview ? <a href={preview} target="_blank" rel="noreferrer" style={{ color: C.brand, fontWeight: 700, textAlign: "center" }}>📄 Ouvrir l’aperçu (PDF)</a> : null}
              <button onClick={() => send(m)} disabled={!!busy || early || !sig || !!data.blockers.length || num.trim().length < 3} style={{ ...btn(C.brand), padding: 14, fontSize: 16, opacity: early || !sig || data.blockers.length ? 0.55 : 1 }}>{busy === "send" ? "Envoi…" : "Envoyer ma facture à NeoDrive"}</button>
              <small style={{ color: C.mute, textAlign: "center" }}>{early ? `Envoi possible à partir du ${frDate(m.can_send_from)} (dernier jour du mois).` : data.blockers.length ? "Complétez d'abord votre dossier." : !sig ? "Signez dans le cadre pour pouvoir envoyer." : "Mansour recevra votre facture par e-mail."}</small>
            </div>
          </div> : null}
        </div> : null}
      </div>;
    })}
  </div>;
}
