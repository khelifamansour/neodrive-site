"use client";
import { useCallback, useEffect, useState } from "react";
import { STATUS_FR, eur, frDate, parisDay, type PayTerms } from "../../lib/team-pay";
import { BADGE, StatementView, type MonthOut } from "../equipe/Factures";

/* Paie de l'équipe (fondateur) : dossiers des membres, relevés mensuels calculés, factures reçues, ajustements, paiement. */

type Doc = { filename: string | null; uploaded_at: string; url: string | null } | null;
type Excl = { reservation_id: number; client: string; city: string; date: string; reason: string };
type M = {
  id: number; name: string; role: string; active: boolean; is_test: boolean; terms: PayTerms | null;
  profile: { full_name?: string; address?: string; ae_number?: string; email?: string; bank_holder?: string; bank_name?: string; iban?: string; rib?: string; bic?: string; updated_at?: string } | null;
  docs: Record<string, Doc>; blockers: string[]; months: (MonthOut & { pdf_url: string | null })[]; excluded: Excl[];
};
const C = { bg: "#f6f4f0", line: "#e5e0d8", ink: "#141414", mute: "#6b6b6b", brand: "#f05a28", ok: "#15803d", bad: "#b91c1c" };
const box: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: "10px 0" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "9px 12px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 14 });
const input: React.CSSProperties = { padding: 10, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", fontSize: 16, boxSizing: "border-box", background: "#fff" };
const DOC_FR: Record<string, string> = { identite: "Pièce d'identité", domicile: "Justificatif de domicile", rib: "RIB" };

export default function EquipePaie() {
  const [pc, setPc] = useState(""); const [authed, setAuthed] = useState(false);
  const [members, setMembers] = useState<M[]>([]); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [adj, setAdj] = useState({ label: "", amount: "" }); const [paidDate, setPaidDate] = useState(parisDay());

  const call = useCallback(async (body: object, code = pc) => {
    const r = await fetch("/api/equipe/dossier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
    if (r.status === 401) { setAuthed(false); throw new Error(j.error || "Code incorrect."); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, [pc]);
  const load = useCallback(async (code = pc) => {
    setErr("");
    try { const j = await call({ action: "admin_list" }, code); setMembers(j.members); setAuthed(true); try { sessionStorage.setItem("nd_pc", code); } catch { /* privé */ } }
    catch (e) { setErr((e as Error).message); }
  }, [call, pc]);
  useEffect(() => { try { const c = sessionStorage.getItem("nd_pc"); if (c) { setPc(c); load(c); } } catch { /* privé */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (body: object, ok: string) => { setBusy(true); setErr(""); setMsg(""); try { const j = await call(body); setMsg(typeof ok === "string" ? ok : ""); if (j.reopened) setMsg(`${ok} La facture déjà envoyée repasse en brouillon : la prestataire doit la renvoyer.`); await load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };

  if (!authed) return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, Arial, sans-serif" }}><form onSubmit={e => { e.preventDefault(); load(); }} style={{ maxWidth: 380, margin: "0 auto", padding: "80px 16px" }}>
    <h1 style={{ fontSize: 22 }}>Paie de l’équipe</h1>
    <input type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code d'accès" style={{ ...input, width: "100%" }} />
    <button style={{ ...btn(C.brand), width: "100%", marginTop: 10, padding: 12 }}>Entrer</button>{err ? <p style={{ color: C.bad }}>{err}</p> : null}
  </form></main>;

  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}><div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 80px" }}>
    <h1 style={{ fontSize: 24, margin: "4px 0" }}>Paie de l’équipe</h1>
    <p style={{ margin: "0 0 6px" }}><a href="/equipe-admin" style={{ color: C.brand, fontWeight: 700 }}>← Pilotage de l’équipe</a></p>
    <p style={{ color: C.mute, margin: 0, fontSize: 14 }}>Relevé calculé automatiquement chaque mois civil. La prestataire envoie sa facture signée à la fin du mois (au plus tard le 3) ; paiement le 10. Les liens vers les documents expirent après 10 minutes : <button onClick={() => load()} style={{ border: 0, background: "none", color: C.brand, fontWeight: 700, font: "inherit", padding: 0, cursor: "pointer" }}>actualiser</button>.</p>
    {err ? <p style={{ color: C.bad, fontWeight: 600 }}>{err}</p> : null}
    {msg ? <p style={{ color: C.ok, fontWeight: 600 }}>{msg}</p> : null}
    {!members.length ? <p style={{ color: C.mute }}>Aucun membre avec un dossier ou des conditions de rémunération.</p> : null}

    {members.map(m => {
      const p = m.profile || {};
      return <section key={m.id} style={{ ...box, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 19 }}>{m.active ? "🟢" : "🔴"} {m.name}{m.is_test ? " (test)" : ""} <span style={{ fontWeight: 500, color: C.mute, fontSize: 14 }}>· {m.role}</span></div>
        {m.terms ? <div style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>Depuis le {frDate(m.terms.start_date)}{m.terms.guarantee_until ? ` · minimum garanti ${eur(m.terms.guarantee_eur)}/mois jusqu'au ${frDate(m.terms.guarantee_until)}` : ""} · fixe {eur(m.terms.fixed_eur)}/mois + {eur(m.terms.prime_vente_eur)} par vente + {eur(m.terms.prime_confirmation_eur)} par confirmation</div> : null}

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>🪪 Dossier {m.blockers.length ? <span style={{ color: C.bad }}>· manque : {m.blockers.join(", ")}</span> : <span style={{ color: C.ok }}>· complet pour facturer</span>}</summary>
          <div style={{ display: "grid", gap: 4, fontSize: 14, marginTop: 8 }}>
            <div><b>Nom :</b> {p.full_name || "—"}</div>
            <div style={{ whiteSpace: "pre-wrap" }}><b>Adresse :</b> {p.address || "—"}</div>
            <div><b>E-mail :</b> {p.email || "—"}</div>
            <div><b>N° auto-entrepreneur :</b> {p.ae_number || "— (facultatif pendant l'essai)"}</div>
            <div><b>Banque :</b> {[p.bank_name, p.bank_holder && `titulaire ${p.bank_holder}`].filter(Boolean).join(" · ") || "—"}</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}><b style={{ fontFamily: "system-ui" }}>IBAN :</b> {p.iban || "—"}{p.rib ? <> · <b style={{ fontFamily: "system-ui" }}>RIB :</b> {p.rib}</> : null}{p.bic ? <> · <b style={{ fontFamily: "system-ui" }}>BIC :</b> {p.bic}</> : null}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>{Object.entries(m.docs).map(([k, d]) => d?.url ? <a key={k} href={d.url} target="_blank" rel="noreferrer" style={{ ...btn("#555"), textDecoration: "none" }}>✅ {DOC_FR[k] || k}</a> : <span key={k} style={{ ...btn("#eee"), color: C.mute, cursor: "default" }}>❌ {DOC_FR[k] || k}</span>)}</div>
            {p.updated_at ? <small style={{ color: C.mute }}>Mis à jour le {new Date(p.updated_at).toLocaleString("fr-FR")}</small> : null}
          </div>
        </details>

        {m.months.map(v => {
          const key = `${m.id}:${v.month}`; const isOpen = open === key; const [bg, fg] = BADGE[v.status];
          const adjLines = v.statement.lines.filter(l => l.kind === "adjust");
          return <div key={key} style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
            <button onClick={() => { setOpen(isOpen ? null : key); setAdj({ label: "", amount: "" }); }} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ textTransform: "capitalize" }}>{v.label}</b><b>{eur(v.statement.total)}</b></div>
              <div style={{ fontSize: 13, display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                <span style={{ background: bg, color: fg, borderRadius: 99, padding: "2px 10px", fontWeight: 700 }}>{STATUS_FR[v.status]}</span>
                <span style={{ color: C.mute }}>{v.number ? `N° ${v.number} · ` : ""}{v.sent_at ? `reçue le ${new Date(v.sent_at).toLocaleDateString("fr-FR")} · ` : ""}{v.status === "payee" && v.paid_at ? `payée le ${frDate(v.paid_at)}` : `à payer le ${frDate(v.due)}`}{v.resend ? " · à renvoyer par la prestataire (ajustement)" : ""}</span>
              </div>
            </button>
            {isOpen ? <div style={{ marginTop: 6 }}>
              <StatementView st={v.statement} />
              {v.pdf_url ? <a href={v.pdf_url} target="_blank" rel="noreferrer" style={{ ...btn("#555"), display: "inline-block", textDecoration: "none", marginTop: 8 }}>📄 Facture PDF</a> : null}
              {v.status !== "payee" ? <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                {adjLines.length ? <div style={{ fontSize: 14 }}>{adjLines.map((l, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ flex: 1 }}>{l.label} ({eur(l.amount || 0)})</span><button disabled={busy} onClick={() => confirm("Supprimer cet ajustement ?") && run({ action: "admin_adjust_delete", member_id: m.id, month: v.month, index: i }, "Ajustement supprimé.")} style={btn("#777")}>Supprimer</button></div>)}</div> : null}
                <b style={{ fontSize: 14 }}>Ajouter un ajustement (avant paiement)</b>
                <input value={adj.label} onChange={e => setAdj({ ...adj, label: e.target.value })} placeholder="Raison (ex. vente du 28/11 oubliée, avance…)" style={{ ...input, width: "100%" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={adj.amount} onChange={e => setAdj({ ...adj, amount: e.target.value })} inputMode="decimal" placeholder="Montant € (ex. 20 ou -10)" style={{ ...input, flex: 1, minWidth: 0 }} />
                  <button disabled={busy || adj.label.trim().length < 3 || !adj.amount} onClick={() => run({ action: "admin_adjust", member_id: m.id, month: v.month, label: adj.label, amount: adj.amount }, "✅ Ajustement ajouté.")} style={btn(C.brand)}>Ajouter</button>
                </div>
                <b style={{ fontSize: 14, marginTop: 6 }}>Paiement</b>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }} />
                  <button disabled={busy || !paidDate} onClick={() => (v.status === "envoyee" || confirm("La prestataire n'a pas encore envoyé sa facture. Marquer quand même ce mois comme payé ?")) && run({ action: "admin_paid", member_id: m.id, month: v.month, date: paidDate }, `💶 ${v.label} marqué payé.`)} style={btn(C.ok)}>Marquer payée</button>
                </div>
              </div> : <button disabled={busy} onClick={() => confirm("Annuler le statut « payée » ?") && run({ action: "admin_paid", member_id: m.id, month: v.month, date: null }, "Statut « payée » annulé.")} style={{ ...btn("#777"), marginTop: 10 }}>Annuler « payée »</button>}
            </div> : null}
          </div>;
        })}

        {m.excluded.length ? <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>⚠️ Livraisons liées à ce membre non comptées ({m.excluded.length})</summary>
          <ul style={{ fontSize: 13, paddingLeft: 18, display: "grid", gap: 4 }}>{m.excluded.map(x => <li key={x.reservation_id}>{x.client}{x.city ? `, ${x.city}` : ""} · livrée le {frDate(x.date)} (réservation n° {x.reservation_id}) : {x.reason}</li>)}</ul>
          <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>Si l’une d’elles doit compter, confirmez le paiement dans Réservations ou ajoutez un ajustement.</p>
        </details> : null}
      </section>;
    })}
  </div></main>;
}
