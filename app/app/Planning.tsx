"use client";
import { useCallback, useEffect, useState } from "react";
import s from "./app.module.css";
import { api } from "./ui";

/** Planning des livraisons en haut de l'accueil (fondateur) : fenêtre large à annoncer, appel / WhatsApp / SMS en un geste, statut d'appel. */
type Row = { id: number; reservation_id: number | null; block: string; sort: number; client: string; ville: string | null; phone: string | null; delivery_window: string; who: string | null; status: string; note: string | null };
const STATUSES = ["à appeler", "confirmé", "décalé", "livré", "annulé"] as const;
const COLORS: Record<string, string> = { "à appeler": "#b45309", "confirmé": "#15803d", "décalé": "#7c3aed", "livré": "#0f766e", "annulé": "#6b7280" };

const intl = (p: string | null) => { const d = (p || "").replace(/\D/g, ""); return d.startsWith("0") ? "33" + d.slice(1) : d; };
const first = (n: string) => (n.split(" ")[0] || "").replace(/^./, c => c.toUpperCase());
const message = (r: Row) => `Bonjour ${first(r.client)}, c'est Mansour de NeoDrive. Votre voiture sans permis est arrivée. Je prévois de vous la livrer à ${r.ville || "votre adresse"} ${r.delivery_window}. C'est une fenêtre large car il peut y avoir des aléas sur la route : je vous confirme le jour exact et l'heure la veille. Le règlement se fait à la livraison par virement instantané. À bientôt !`;

export function Planning() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => { try { const j = await api<{ plan: Row[] }>("plan"); setRows(j.plan); } catch { setRows([]); } }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (id: number, patch: Record<string, unknown>) => { try { const j = await api<{ plan: Row[] }>("plan_update", { id, ...patch }); setRows(j.plan); } catch (e) { alert((e as Error).message); } };
  if (!rows || !rows.length) return null;
  const blocks = [...new Set(rows.map(r => r.block))];
  const todo = rows.filter(r => r.status === "à appeler").length;
  return <section className={s.card} style={{ padding: 14 }} aria-label="Planning des livraisons">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>🚚 Planning des livraisons</h2>
      <span style={{ fontSize: 13, color: "#6b6259" }}>{todo} à appeler</span>
    </div>
    <p style={{ margin: "4px 0 10px", fontSize: 13, color: "#6b6259" }}>Annoncez la fenêtre large, jamais un jour fixe. Confirmez le jour exact la veille.</p>
    {blocks.map(b => <div key={b} style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .3, color: "#e8592a", margin: "6px 0" }}>{b}</div>
      {rows.filter(r => r.block === b).map(r => {
        const txt = message(r); const tel = intl(r.phone);
        return <div key={r.id} style={{ borderTop: "1px solid #efe8df", padding: "9px 0" }}>
          <button onClick={() => setOpen(open === r.id ? null : r.id)} style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span style={{ minWidth: 0 }}><strong style={{ fontSize: 15 }}>{r.client}</strong> <span style={{ color: "#6b6259", fontSize: 13.5 }}>· {r.ville}</span><br /><span style={{ fontSize: 13, color: "#3f3a35" }}>{r.delivery_window} · {r.who}</span></span>
            <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, color: "#fff", background: COLORS[r.status] || "#6b7280", borderRadius: 999, padding: "4px 9px" }}>{r.status}</span>
          </button>
          {open === r.id && <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {r.note && <div style={{ fontSize: 13, background: "#fff7ed", borderRadius: 10, padding: "6px 9px" }}>📝 {r.note}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {r.phone && <a className={`${s.btn} ${s.btn2}`} style={{ minHeight: 44, fontSize: 15 }} href={`tel:${r.phone.replace(/\s/g, "")}`}>📞 Appeler</a>}
              {tel && <a className={s.btn} style={{ minHeight: 44, fontSize: 15, background: "#16a34a" }} href={`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
              {r.phone && <a className={`${s.btn} ${s.btn2}`} style={{ minHeight: 44, fontSize: 15 }} href={`sms:${r.phone.replace(/\s/g, "")}?body=${encodeURIComponent(txt)}`}>✉️ SMS</a>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUSES.map(st => <button key={st} onClick={() => update(r.id, { status: st })} style={{ border: `2px solid ${COLORS[st]}`, background: r.status === st ? COLORS[st] : "#fff", color: r.status === st ? "#fff" : COLORS[st], borderRadius: 999, padding: "6px 11px", fontWeight: 800, fontSize: 13 }}>{st}</button>)}
              <button onClick={() => { const w = prompt("Nouvelle fenêtre (ex. : entre le lundi 7 et le samedi 12 décembre)", r.delivery_window); if (w) update(r.id, { window: w }); }} style={{ border: "2px solid #15120f", background: "#fff", borderRadius: 999, padding: "6px 11px", fontWeight: 800, fontSize: 13 }}>✏️ Fenêtre</button>
              <button onClick={() => { const n = prompt("Note", r.note || ""); if (n !== null) update(r.id, { note: n }); }} style={{ border: "2px solid #15120f", background: "#fff", borderRadius: 999, padding: "6px 11px", fontWeight: 800, fontSize: 13 }}>📝 Note</button>
            </div>
          </div>}
        </div>;
      })}
    </div>)}
  </section>;
}
