"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import PaymentReview from "./PaymentReview";
import { PAY_STYLE, eurFr, type PayState } from "../../lib/stock-shared";

type Lead = { id: number; nom: string; telephone: string; statut: string; phase: string; rappel: string; overdue: boolean; note: string; tel: string; wa: string };
type Res = { id: number; client: string; telephone: string; tel: string; wa: string; ville: string; modele: string; statut: string; date: string | null; total: number | null; pay: PayState; livre: boolean };
type Cg = { id: number; ref: string; client: string; tel: string; wa: string; status: string; check: string | null; missing: string[]; since: string; url: string };
type D = {
  today: string; generatedAt: string;
  rappels: Lead[] | null;
  reservations: { soon: Res[]; noDate: Res[]; expected: Res[] } | null;
  paidToday: { reservation_id: number; client: string; amount: number | null; source: string; day: string }[] | null;
  toReview: { id: number }[] | null;
  carteGrise: { incomplete: Cg[]; waitingClient: Cg[]; toSend: Cg[] } | null;
  fournisseurs: { unpaid: { id: number; date: string | null; merchant: string; number: string | null; total: number | null; currency: string }[]; debitsWithout: number; months: string[] } | null;
  conteneurs: { id: number; name: string; status: string; pipeline: string; eta: string; late: boolean }[] | null;
  recrutement: { id: number; name: string; poste: string; city: string; score: number; status: string; tel: string; wa: string }[] | null;
  chaudsSilence?: { id: number; client: string; ville: string; statut: string; date: string | null; since: string; tel: string; wa: string }[] | null;
};

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/tableau-de-bord", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const dfr = (d?: string | null) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—";
const hfr = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const small: React.CSSProperties = { fontSize: 14, padding: "7px 11px", textDecoration: "none", display: "inline-block" };
const row: React.CSSProperties = { borderTop: "1px solid #eee", paddingTop: 8, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" };
const Pay = ({ p }: { p: PayState }) => <span className={c.pill} style={{ background: PAY_STYLE[p].bg, color: PAY_STYLE[p].color, whiteSpace: "nowrap" }}>{PAY_STYLE[p].icon} {p}</span>;
const Links = ({ tel, wa }: { tel?: string; wa?: string }) => <span style={{ display: "flex", gap: 6 }}>
  {tel ? <a className={`${c.btn} ${c.btnBrand}`} style={small} href={tel}>📞 Appeler</a> : null}
  {wa ? <a className={`${c.btn} ${c.btnGhost}`} style={small} href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a> : null}
</span>;
function Section({ title, children, empty, n, href }: { title: string; children?: React.ReactNode; empty?: string; n?: number; href?: string }) {
  return <div className={c.card} style={{ display: "grid", gap: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b>{title}{n !== undefined ? ` (${n})` : ""}</b>{href ? <a href={href} className={c.small} style={{ color: "#f05a28" }}>Ouvrir →</a> : null}</div>
    {n === 0 && empty ? <p className={c.muted} style={{ margin: 0 }}>{empty}</p> : children}
  </div>;
}

/** Tableau de bord du fondateur : la journée en un écran, avec les actions. */
export default function TableauDeBord() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState(""); const [d, setD] = useState<D | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async (p = code()) => {
    try { setD(await api<D>({ action: "load" }, p)); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg("❌ " + (e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);
  const send = async () => { setBusy(true); setMsg(""); try { const r = await api<{ to: string }>({ action: "send" }); setMsg(`✅ E-mail du matin envoyé à ${r.to}.`); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(false); } };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>☀️ Tableau de bord</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;
  if (!d) return <main className={c.page}><div className={c.wrap}><p className={c.err}>{msg || "Erreur"}</p></div></main>;

  const r = d.reservations; const cg = d.carteGrise; const f = d.fournisseurs;
  const cgN = cg ? cg.incomplete.length + cg.waitingClient.length + cg.toSend.length : 0;
  const late = (d.rappels || []).filter(l => l.overdue).length;

  return <main className={c.page}><div className={c.wrap} style={{ display: "grid", gap: 14 }}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a>
      <span style={{ display: "flex", gap: 8 }}><button className={`${c.btn} ${c.btnGhost}`} disabled={busy} onClick={send}>{busy ? "…" : "M’envoyer l’e-mail"}</button><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load().catch(() => null)}>Actualiser</button></span></div>
    <div><h1 style={{ margin: "0 0 4px" }}>☀️ Ma journée</h1>
      <p className={c.muted} style={{ margin: 0 }}>{new Date(`${d.today}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · mis à jour à {hfr(d.generatedAt)} · e-mail chaque matin à 7 h (lundi au samedi)</p></div>
    {msg ? <p className={c.msg} style={{ margin: 0 }}>{msg}</p> : null}

    <div className={c.stats}>
      {d.rappels ? <div className={c.stat}><p className={c.statLabel}>Rappels</p><p className={c.statValue}>{d.rappels.length}</p><p className={c.statNote}>{late ? `dont ${late} en retard` : "à faire aujourd’hui"}</p></div> : null}
      {r ? <div className={c.stat}><p className={c.statLabel}>Livraisons 7 jours</p><p className={c.statValue}>{r.soon.length}</p><p className={c.statNote}>{r.noDate.length} sans date</p></div> : null}
      {d.paidToday ? <div className={c.stat}><p className={c.statLabel}>Paiements reçus</p><p className={c.statValue}>{d.paidToday.length}</p><p className={c.statNote}>hier et aujourd’hui · {r?.expected.length ?? 0} attendu(s)</p></div> : null}
      {d.chaudsSilence?.length ? <div className={c.stat}><p className={c.statLabel}>⚠️ Chauds muets</p><p className={c.statValue} style={{ color: "#b42318" }}>{d.chaudsSilence.length}</p><p className={c.statNote}>sans réponse 48 h</p></div> : null}
      {cg ? <div className={c.stat}><p className={c.statLabel}>Carte grise</p><p className={c.statValue}>{cgN}</p><p className={c.statNote}>dossier(s) à suivre</p></div> : null}
    </div>

    {d.rappels ? <Section title="📞 Rappels du jour" n={d.rappels.length} empty="Aucun rappel aujourd’hui." href="/equipe">
      {d.rappels.map(l => <div key={l.id} style={row}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><b>{l.nom}</b> <span className={c.small}>· {l.statut}{l.phase ? ` · ${l.phase}` : ""} · {l.overdue ? <span style={{ color: "#b91c1c" }}>en retard ({dfr(l.rappel)})</span> : `à ${hfr(l.rappel)}`}</span>
          {l.note ? <div className={c.small} style={{ overflowWrap: "anywhere" }}>{l.note}</div> : null}</div>
        <Links tel={l.tel} wa={l.wa} />
      </div>)}
    </Section> : null}

    {d.chaudsSilence?.length ? <Section title="⚠️ Clients chauds sans réponse depuis 48 h" n={d.chaudsSilence.length} href="/reservations-admin">
      {d.chaudsSilence.map(x => <div key={x.id} style={row}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><b>{x.client}</b>{x.ville ? ` (${x.ville})` : ""}<div className={c.small}>{x.statut} · dernière réponse {dfr(x.since)}{x.date ? ` · date promise ${dfr(x.date)}` : ""} · à relancer avant de réserver Rabouin</div></div>
        <Links tel={x.tel} wa={x.wa} />
      </div>)}
    </Section> : null}

    {r ? <Section title="🚚 Livraisons des 7 prochains jours" n={r.soon.length} empty="Aucune livraison prévue cette semaine." href="/reservations-admin">
      {r.soon.map(x => <div key={x.id} style={row}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><b>{dfr(x.date)}</b> · {x.client}{x.ville ? ` (${x.ville})` : ""}<div className={c.small}>{x.modele || "modèle ?"} · {x.statut}{x.total != null ? ` · ${eurFr(x.total)}` : ""}</div></div>
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Pay p={x.pay} /><Links tel={x.tel} /></span>
      </div>)}
    </Section> : null}
    {r && r.noDate.length ? <Section title="📅 Planifiées / confirmées sans date" n={r.noDate.length} href="/reservations-admin">
      {r.noDate.map(x => <div key={x.id} style={row}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>{x.client}{x.ville ? ` (${x.ville})` : ""}<div className={c.small}>{x.modele} · {x.statut}</div></div>
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Pay p={x.pay} /><Links tel={x.tel} wa={x.wa} /></span>
      </div>)}
    </Section> : null}

    {d.paidToday || r ? <Section title="💶 Paiements">
      {(d.paidToday || []).length ? <div><div className={c.small} style={{ fontWeight: 700 }}>Reçus hier et aujourd’hui</div>
        {(d.paidToday || []).map(p => <div key={`${p.reservation_id}-${p.source}`} style={row}><span>✅ {p.client} <span className={c.small}>· {p.day} · {p.source}</span></span><b style={{ color: "#166534" }}>{eurFr(p.amount)}</b></div>)}</div>
        : <p className={c.muted} style={{ margin: 0 }}>Aucun paiement reçu depuis hier.</p>}
      {r ? <div><div className={c.small} style={{ fontWeight: 700, marginTop: 6 }}>Attendus ({r.expected.length}) : livrées en attente de paiement, planifiées ou confirmées non payées</div>
        {r.expected.map(x => <div key={x.id} style={row}>
          <span style={{ minWidth: 0 }}>⏳ {x.client} <span className={c.small}>· {x.statut}{x.date ? ` · ${dfr(x.date)}` : ""}</span></span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Pay p={x.pay} /><b>{eurFr(x.total)}</b></span>
        </div>)}</div> : null}
    </Section> : null}
    <PaymentReview onChange={() => load().catch(() => null)} />

    {cg ? <Section title="📑 Carte grise" n={cgN} empty="Aucun dossier en attente." href="/carte-grise-admin">
      {cg.toSend.map(x => <div key={x.id} style={row}><span>🆕 <b>{x.client}</b> <span className={c.small}>· {x.ref} · nouveau dossier, à envoyer à NK</span></span><a className={`${c.btn} ${c.btnBrand}`} style={small} href={x.url}>Ouvrir</a></div>)}
      {cg.incomplete.map(x => <div key={x.id} style={row}><span>⚠️ <b>{x.client}</b> <span className={c.small}>· {x.ref} · dossier {x.check}{x.missing.length ? ` · ${x.missing.length} pièce(s)` : ""}</span></span><a className={`${c.btn} ${c.btnBrand}`} style={small} href={x.url}>Ouvrir</a></div>)}
      {cg.waitingClient.map(x => <div key={x.id} style={row}><span>⏳ <b>{x.client}</b> <span className={c.small}>· {x.ref} · pièces demandées au client le {dfr(x.since)}{x.missing.length ? ` (${x.missing.length} manquante(s))` : ""}</span></span><span style={{ display: "flex", gap: 6 }}><Links tel={x.tel} wa={x.wa} /><a className={`${c.btn} ${c.btnGhost}`} style={small} href={x.url}>Ouvrir</a></span></div>)}
    </Section> : null}

    {f ? <Section title="📄 Factures fournisseurs à payer" n={f.unpaid.length} empty="Aucune facture fournisseur en attente." href="/stock-facturation?onglet=compta">
      {f.unpaid.map(x => <div key={x.id} style={row}><span>{x.date ? dfr(x.date) : "date ?"} · <b>{x.merchant}</b>{x.number ? <span className={c.small}> · n° {x.number}</span> : null}</span><b>{x.currency === "EUR" ? eurFr(x.total) : `${x.total ?? "?"} ${x.currency}`}</b></div>)}
    </Section> : null}
    {f ? <p className={c.small} style={{ margin: "-6px 4px 0" }}>📎 {f.debitsWithout} débit(s) Revolut sans justificatif ({f.months.join(" et ")}). <a href="/stock-facturation/tickets" style={{ color: "#f05a28" }}>Envoyer un ticket</a></p> : null}

    {d.conteneurs ? <Section title="🚢 Conteneurs attendus sous 10 jours" n={d.conteneurs.length} empty="Aucun arrivage prévu." href="/conteneurs">
      {d.conteneurs.map(s => <div key={s.id} style={row}><span><b>{s.name}</b> <span className={c.small}>· {s.status}{s.pipeline ? ` · ${s.pipeline}` : ""}</span></span><span style={{ color: s.late ? "#b91c1c" : undefined }}>{s.late ? "en retard · " : ""}{dfr(s.eta)}</span></div>)}
    </Section> : null}

    {d.recrutement ? <Section title="🤝 Recrutement : meilleurs tests depuis hier" n={d.recrutement.length} empty="Aucun nouveau test." href="/recrutement-admin">
      {d.recrutement.map(x => <div key={x.id} style={row}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}><b>{x.name}</b> · <b style={{ color: x.score >= 70 ? "#166534" : undefined }}>{x.score}/100</b><div className={c.small}>{x.poste}{x.city ? ` · ${x.city}` : ""} · {x.status}</div></div>
        <Links tel={x.tel} wa={x.wa} />
      </div>)}
    </Section> : null}
  </div></main>;
}
