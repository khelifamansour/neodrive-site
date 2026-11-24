"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { eurFr } from "../../lib/stock-shared";

type Cand = { reservation_id: number; score: number; why: string; kind: string; client: string; total: number | null; statut: string | null; paid: boolean; modele: string | null; date_promise: string | null };
type Item = { id: number; date: string; amount: number; label: string | null; counterparty: string | null; reference: string | null; payer: string; candidates: Cand[] };

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
async function papi<T = Record<string, unknown>>(body: object): Promise<T> {
  const r = await fetch("/api/paiements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code(), ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const dfr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const small: React.CSSProperties = { fontSize: 14, padding: "8px 12px" };

/** Paiements clients « à vérifier » : le rapprochement automatique a hésité, le fondateur choisit la réservation ou rejette. */
export default function PaymentReview({ onChange }: { onChange?: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null); const [ready, setReady] = useState(true);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(0); const [manual, setManual] = useState<Record<number, string>>({});
  const load = useCallback(async () => { try { const j = await papi<{ ready: boolean; items: Item[] }>({ action: "list" }); setReady(j.ready); setItems(j.items); } catch (e) { setMsg("❌ " + (e as Error).message); setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (id: number, body: object, ok: string) => {
    setBusy(id); setMsg("");
    try { await papi(body); setMsg(ok); await load(); onChange?.(); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(0); }
  };
  const run = async () => {
    setBusy(-1); setMsg("");
    try { const r = await papi<{ linked: unknown[]; review: number; scanned: number }>({ action: "run" }); setMsg(`✅ ${r.scanned} encaissement(s) regardé(s) : ${r.linked.length} paiement(s) confirmé(s), ${r.review} à vérifier.`); await load(); onChange?.(); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(0); }
  };

  if (!items) return null;
  return <div className={c.card} style={{ display: "grid", gap: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <b>💶 Paiements clients à vérifier ({items.length})</b>
      {ready ? <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy} onClick={run}>{busy === -1 ? "…" : "Chercher les paiements"}</button> : null}
    </div>
    {!ready ? <p className={c.small} style={{ margin: 0, color: "#b45309" }}>Pour activer les paiements automatiques, passez le script supabase/sql/2026-11-24-paiements-auto.sql dans Supabase.</p>
      : <p className={c.small} style={{ margin: 0 }}>Un virement reçu qui correspond sans doute possible à une réservation (montant + nom ou référence) est confirmé tout seul et vous recevez un e-mail. Ici : ceux où il y a un doute.</p>}
    {msg ? <p className={c.msg} style={{ margin: 0 }}>{msg}</p> : null}
    {ready && !items.length ? <p className={c.muted} style={{ margin: 0 }}>Rien à vérifier.</p> : null}
    {items.map(t => <div key={t.id} style={{ borderTop: "1px solid #eee", paddingTop: 8, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{t.label || t.counterparty || "—"}</div>
          <div className={c.small}>{dfr(t.date)}{t.payer ? ` · payeur : ${t.payer}` : ""}{t.reference ? ` · réf. ${t.reference}` : ""}</div></div>
        <b style={{ color: "#166534", whiteSpace: "nowrap" }}>+{eurFr(t.amount)}</b>
      </div>
      {t.candidates.map(k => <div key={k.reservation_id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", background: "#f8f7f4", borderRadius: 10, padding: "6px 10px" }}>
        <div style={{ minWidth: 0 }}><b>{k.client}</b> · n° {k.reservation_id} · total {eurFr(k.total)}{k.statut ? ` · ${k.statut}` : ""}{k.paid ? " · déjà payée" : ""}
          <div className={c.small}>{k.why || "—"}{k.kind === "acompte" ? " · acompte" : k.kind === "solde" ? " · solde" : ""}</div></div>
        <button className={`${c.btn} ${c.btnBrand}`} style={{ ...small, whiteSpace: "nowrap" }} disabled={!!busy} onClick={() => act(t.id, { action: "confirm", tx_id: t.id, reservation_id: k.reservation_id }, `✅ Paiement relié à ${k.client}.`)}>{busy === t.id ? "…" : "C’est lui"}</button>
      </div>)}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input className={c.input} style={{ ...small, width: 150 }} inputMode="numeric" placeholder="Autre n° de réservation" value={manual[t.id] || ""} onChange={e => setManual(m => ({ ...m, [t.id]: e.target.value.replace(/\D/g, "") }))} />
        <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy || !manual[t.id]} onClick={() => act(t.id, { action: "confirm", tx_id: t.id, reservation_id: Number(manual[t.id]) }, "✅ Paiement relié.")}>Relier</button>
        <button className={`${c.btn} ${c.btnGhost}`} style={small} disabled={!!busy} onClick={() => act(t.id, { action: "reject", tx_id: t.id }, "Écarté : ce n’est pas un paiement de réservation.")}>Aucun (écarter)</button>
      </div>
    </div>)}
  </div>;
}
