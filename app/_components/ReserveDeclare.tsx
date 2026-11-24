"use client";
import { useEffect, useState } from "react";
import { PENAL_TEXT, PROCESS_TEXT, declText, propertyText, type Declaration } from "../../lib/reserve-text";

const today = () => new Date().toISOString().slice(0, 10);
const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #d9d3c9", fontSize: 16, width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 };

/** Remise sans paiement : réserve de propriété + le client choisit sa déclaration (virement ordonné ou engagement de payer). */
export default function ReserveDeclare({ vin, montant, due, onChange }: { vin: string; montant: number | null; due: string | null; onChange: (d: Declaration | null) => void }) {
  const [kind, setKind] = useState<Declaration["kind"] | "">("");
  const [vDate, setVDate] = useState(today()); const [eDate, setEDate] = useState(due || today());
  useEffect(() => { onChange(kind ? { kind, montant, date: kind === "virement" ? vDate : eDate } : null); }, [kind, vDate, eDate, montant, onChange]);
  const opt = (k: Declaration["kind"], date: string, set: (v: string) => void, label: string) => <div style={{ display: "grid", gap: 6, padding: 10, borderRadius: 10, border: `2px solid ${kind === k ? "#b42318" : "#e5e0d8"}`, background: "#fff", minWidth: 0 }}>
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16, fontWeight: 600, minWidth: 0 }}>
      <input type="radio" name="decl" checked={kind === k} onChange={() => setKind(k)} style={{ width: 22, height: 22, flex: "0 0 22px" }} />
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{declText({ kind: k, date }, montant)}</span>
    </label>
    {kind === k ? <label style={{ display: "grid", gap: 4, fontSize: 14, paddingLeft: 32, minWidth: 0 }}>{label}<input type="date" value={date} onChange={e => set(e.target.value)} style={inp} /></label> : null}
  </div>;
  return <div style={{ display: "grid", gap: 10, border: "2px solid #f5c2c0", borderRadius: 12, padding: 12, background: "#fff6f5", minWidth: 0 }}>
    <b style={{ color: "#b42318", overflowWrap: "anywhere" }}>{propertyText(vin, montant)}</b>
    <b>Le client choisit :</b>
    {opt("virement", vDate, setVDate, "Date du virement")}
    {opt("engagement", eDate, setEDate, "Payer au plus tard le")}
    <small style={{ fontSize: 14, color: "#333", lineHeight: 1.45 }}>{PROCESS_TEXT}</small>
    <small style={{ fontSize: 14, color: "#333", lineHeight: 1.45, fontWeight: 600 }}>{PENAL_TEXT}</small>
  </div>;
}
