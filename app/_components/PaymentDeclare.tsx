"use client";
import { useEffect, useState } from "react";

/** Mêmes modes que lib/delivery-receipt.ts (PAY_MODES) : le client déclare comment il a réglé, avant de signer. */
const MODES = [
  { id: "virement", label: "Virement bancaire" },
  { id: "especes", label: "Espèces remises au chauffeur" },
  { id: "carte", label: "Carte bancaire" },
  { id: "autre", label: "Autre" },
] as const;
export type PayDecl = { lines: { mode: string; amount: number }[]; driver: string };
export const payValid = (d: PayDecl) => d.lines.some(l => l.amount > 0) && (!d.lines.some(l => l.mode === "especes") || d.driver.trim().length >= 2);

/** « Comment avez-vous réglé votre véhicule ? » : cases + montant par mode ; nom du chauffeur affiché pour les espèces. */
export default function PaymentDeclare({ driver, total, onChange, defaultVirement = false }: { driver: string; total?: number | null; onChange: (d: PayDecl) => void; defaultVirement?: boolean }) {
  // Par défaut (sécurité maximale) : virement du prix total déjà coché.
  const [on, setOn] = useState<Record<string, boolean>>(defaultVirement ? { virement: true } : {});
  const [amt, setAmt] = useState<Record<string, string>>(defaultVirement && total ? { virement: String(Math.round(total * 100) / 100) } : {});
  const [drv, setDrv] = useState(driver);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (defaultVirement) emit(on, amt, drv); }, []);
  const emit = (o: Record<string, boolean>, a: Record<string, string>, d: string) =>
    onChange({ lines: MODES.filter(m => o[m.id]).map(m => ({ mode: m.id, amount: Number(String(a[m.id] || "").replace(",", ".")) || 0 })), driver: d });
  const sum = MODES.filter(m => on[m.id]).reduce((t, m) => t + (Number(String(amt[m.id] || "").replace(",", ".")) || 0), 0);
  return <div style={{ display: "grid", gap: 8, border: "1px solid #e5e0d8", borderRadius: 12, padding: 12, background: "#fffaf5" }}>
    <b>Comment avez-vous réglé votre véhicule ?</b>
    <small style={{ color: "#666" }}>Cochez chaque moyen utilisé et indiquez le montant. Cette déclaration figure sur l’accusé que vous signez.</small>
    {MODES.map(m => <div key={m.id} style={{ display: "grid", gap: 6 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 16 }}>
        <input type="checkbox" checked={!!on[m.id]} style={{ width: 22, height: 22 }} onChange={e => { const o = { ...on, [m.id]: e.target.checked }; setOn(o); emit(o, amt, drv); }} />
        {m.id === "especes" && on[m.id] && driver ? `Espèces remises au chauffeur ${driver}` : m.label}
      </label>
      {on[m.id] ? <div style={{ display: "grid", gap: 6, paddingLeft: 32 }}>
        <input inputMode="decimal" placeholder="Montant en €" value={amt[m.id] || ""} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d9d3c9", fontSize: 16 }}
          onChange={e => { const a = { ...amt, [m.id]: e.target.value }; setAmt(a); emit(on, a, drv); }} />
        {m.id === "especes" && !driver ? <input placeholder="Nom du chauffeur" value={drv} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d9d3c9", fontSize: 16 }}
          onChange={e => { setDrv(e.target.value); emit(on, amt, e.target.value); }} /> : null}
      </div> : null}
    </div>)}
    {sum > 0 ? <small style={{ color: "#444" }}>Total déclaré : <b>{sum.toLocaleString("fr-FR")} €</b>{total ? ` · prix de la commande : ${Math.round(total).toLocaleString("fr-FR")} €` : ""}</small> : null}
  </div>;
}
