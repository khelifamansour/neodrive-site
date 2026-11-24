"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import c from "../giga/giga.module.css";
import Compta from "./Compta";
import { PAY_STYLE, STOCK_ICON, STOCK_LABEL, STOCK_STATES, eurFr, parseImport, totals, type InvoiceLine, type PayState, type StockState } from "../../lib/stock-shared";

type ResV = { id: number; name: string; ville?: string | null; statut: string; livre_at: string | null; total: number | null; modele?: string | null; pay: PayState; date_promise?: string | null; telephone?: string | null; vin?: string };
type Car = {
  id: number; vin: string; model: string; color: string; container: string; shipment: string; shipment_id: number | null; eta: string | null; hub: string; status: string; state: StockState;
  defect: boolean; defect_note: string; client_name: string; delivered_at: string | null; reservation: ResV | null; linked: boolean;
  dossier: { id: number; ref: string; status: string; sent: boolean } | null; invoice: { id: number; status: string; number: string | null; total_ttc: number | null } | null; source: string;
};
type Inv = {
  id: number; reservation_id: number | null; vin: string | null; status: string; number: string | null; issued_at: string | null; delivered_at: string | null; client_name: string | null; client_address: string | null;
  lines: InvoiceLine[]; suggested_ttc: number | null; retained_ttc: number | null; adjust_reason: string | null; total_ht: number | null; tva: number | null; total_ttc: number | null; pdf_path: string | null; notes: string | null; pay: PayState;
};
type Data = { cars: Car[]; reservedNoVin: ResV[]; soldNotInStock: ResV[]; invoices: Inv[]; openRes: { id: number; name: string; statut: string; vin: string | null; ville: string | null }[]; drafted: number; hubs: { id: string; name: string }[]; statuses: string[] };

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/stock-facturation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const dfr = (d?: string | null) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : "—";
const ST_BG: Record<StockState, string> = { "commandée": "#f3e8ff", "en mer": "#dbeafe", "au hub": "#ffedd5", "réservée": "#fff4d6", "livrée": "#e7f6ec" };
const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: .3 };
const sel: React.CSSProperties = { padding: "8px 10px", fontSize: 14 };
const TABS = [["bord", "📊 Tableau de bord"], ["voitures", "🚗 Voitures et liens"], ["import", "📥 Importer des VIN"], ["factures", "🧾 Factures"], ["compta", "📒 Comptabilité"]] as const;
type Tab = typeof TABS[number][0];
const Pay = ({ p }: { p: PayState }) => <span className={c.pill} style={{ background: PAY_STYLE[p].bg, color: PAY_STYLE[p].color }}>{PAY_STYLE[p].icon} {p}</span>;

/** Stock et facturation : chaque voiture (VIN) de l'usine au client, ses liens et sa facture. Fondateur seulement. */
export default function StockFacturation() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState(""); const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>(() => { try { return (sessionStorage.getItem("sf_tab") as Tab) || "bord"; } catch { return "bord"; } });

  const load = useCallback(async (p = code()) => {
    try { const j = await api<Data>({ action: "load" }, p); setD(j); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg("❌ " + (e as Error).message); setState("ready"); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état n'est modifié qu'après la réponse du serveur
  useEffect(() => { load().catch(() => null); }, [load]);
  const go = (t: Tab) => { setTab(t); try { sessionStorage.setItem("sf_tab", t); } catch { /* privé */ } window.scrollTo(0, 0); };
  const run = async (body: object, ok?: string) => { setMsg(""); try { const r = await api<Record<string, unknown>>(body); if (ok) setMsg(ok); await load(); return r; } catch (e) { setMsg("❌ " + (e as Error).message); return null; } };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🔁 Stock et facturation</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load().catch(() => null)}>Actualiser</button></div>
    <h1 style={{ margin: "0 0 4px" }}>🔁 Stock et facturation</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Chaque voiture suivie par son numéro de série (VIN), de l’usine au client : conteneur, hub, réservation, carte grise et facture.</p>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "12px 0", paddingBottom: 4 }}>
      {TABS.map(([k, l]) => <button key={k} className={`${c.btn} ${tab === k ? c.btnBrand : c.btnGhost}`} style={{ whiteSpace: "nowrap", padding: "10px 14px", fontSize: 14 }} onClick={() => go(k)}>{l}</button>)}
    </div>
    {msg ? <p className={c.msg}>{msg}</p> : null}
    {!d ? null : tab === "bord" ? <Dashboard d={d} go={go} /> : tab === "voitures" ? <Cars d={d} run={run} /> : tab === "import" ? <Import d={d} run={run} /> : tab === "compta" ? <Compta /> : <Invoices d={d} run={run} setMsg={setMsg} />}
  </div></main>;
}

function Stat({ label, value, note, onClick }: { label: string; value: React.ReactNode; note?: string; onClick?: () => void }) {
  return <div className={c.stat} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}><p className={c.statLabel}>{label}</p><p className={c.statValue}>{value}</p>{note ? <p className={c.statNote}>{note}</p> : null}</div>;
}
const countBy = <T,>(arr: T[], f: (x: T) => string) => arr.reduce<Record<string, number>>((a, x) => { const k = f(x) || "—"; a[k] = (a[k] || 0) + 1; return a; }, {});

function Dashboard({ d, go }: { d: Data; go: (t: Tab) => void }) {
  const byState = countBy(d.cars, x => x.state);
  const inStock = d.cars.filter(x => x.state !== "livrée");
  const hubName = (id: string) => d.hubs.find(h => h.id === id)?.name || (id ? id : "Hub à définir");
  const byHub = countBy(inStock.filter(x => x.state === "au hub" || x.state === "réservée"), x => hubName(x.hub));
  const byModel = countBy(inStock, x => x.model);
  const free = inStock.filter(x => x.state !== "réservée");
  const drafts = d.invoices.filter(i => i.status === "brouillon");
  const unpaid = d.invoices.filter(i => i.pay !== "payé");
  return <div style={{ display: "grid", gap: 16 }}>
    <div className={c.stats}>
      {STOCK_STATES.map(s => <Stat key={s} label={`${STOCK_ICON[s]} ${STOCK_LABEL[s]}`} value={byState[s] || 0} onClick={() => go("voitures")} />)}
    </div>
    <div className={c.stats}>
      <Stat label="🚗 Voitures sans client" value={free.length} note="Commandées, en mer ou au hub, pas encore réservées." />
      <Stat label="🔖 Réservées sans VIN" value={d.reservedNoVin.length} note="Réservations confirmées ou planifiées sans voiture attribuée." />
      <Stat label="⚠️ Défauts signalés" value={d.cars.filter(x => x.defect && x.state !== "livrée").length} />
      <Stat label="🧾 Factures brouillon" value={drafts.length} note={`${d.invoices.length - drafts.length} validée(s) · ${unpaid.length} vente(s) non payée(s)`} onClick={() => go("factures")} />
    </div>
    <div className={c.card}><b>🏠 Par hub (en stock)</b>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{Object.entries(byHub).sort((a, z) => z[1] - a[1]).map(([k, n]) => <span key={k} className={c.pill}>{k} : <b>{n}</b></span>)}{!Object.keys(byHub).length ? <span className={c.muted}>Aucune voiture au hub.</span> : null}</div>
    </div>
    <div className={c.card}><b>🚙 Par modèle (en stock, hors livrées)</b>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{Object.entries(byModel).sort((a, z) => z[1] - a[1]).map(([k, n]) => <span key={k} className={c.pill}>{k} : <b>{n}</b></span>)}</div>
    </div>
    <div className={c.card}><b>🔖 Réservées sans VIN</b>
      {!d.reservedNoVin.length ? <p className={c.muted}>Aucune.</p> : <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.reservedNoVin.map(r => <li key={r.id}>{r.name} <span className={c.muted}>· {r.ville} · {r.statut}{r.date_promise ? ` · promise le ${dfr(r.date_promise)}` : ""}</span></li>)}</ul>}
      <p className={c.small}>Attribuez une voiture depuis l’onglet « Voitures et liens » (bouton « Lier à un client »).</p>
    </div>
    {d.soldNotInStock.length ? <div className={c.card}><b>❓ VIN sur une réservation mais absent du stock</b>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{d.soldNotInStock.map(r => <li key={r.id}><span style={mono}>{r.vin}</span> · {r.name} <span className={c.muted}>· {r.statut}</span></li>)}</ul>
      <p className={c.small}>Ajoutés automatiquement au stock à la signature de la livraison, ou maintenant via « Importer des VIN ».</p></div> : null}
  </div>;
}

function Cars({ d, run }: { d: Data; run: (b: object, ok?: string) => Promise<unknown> }) {
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [hub, setHub] = useState(""); const [open, setOpen] = useState<number | null>(null);
  const list = useMemo(() => d.cars.filter(x => (!st || x.state === st) && (!hub || x.hub === hub) && (!q || `${x.vin} ${x.model} ${x.color} ${x.container} ${x.reservation?.name || x.client_name}`.toLowerCase().includes(q.toLowerCase()))), [d.cars, q, st, hub]);
  const hubName = (id: string) => d.hubs.find(h => h.id === id)?.name || id;
  const link = async (x: Car) => {
    const opts = d.openRes.filter(r => !r.vin).map(r => `${r.id} : ${r.name} (${r.statut}${r.ville ? `, ${r.ville}` : ""})`).join("\n");
    const v = prompt(`Numéro de la réservation à lier au VIN ${x.vin} :\n\n${opts || "(aucune réservation ouverte sans VIN)"}`)?.trim();
    if (v) await run({ action: "set_vehicle", id: x.id, reservation_id: Number(v.split(/\D/)[0]) }, "✅ Voiture liée au client.");
  };
  return <div>
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 12 }}>
      <input className={c.input} placeholder="Chercher (VIN, client, conteneur…)" value={q} onChange={e => setQ(e.target.value)} />
      <select className={c.input} value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les états</option>{STOCK_STATES.map(s => <option key={s} value={s}>{STOCK_ICON[s]} {STOCK_LABEL[s]}</option>)}</select>
      <select className={c.input} value={hub} onChange={e => setHub(e.target.value)}><option value="">Tous les hubs</option>{d.hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
    </div>
    <p className={c.small}>{list.length} voiture(s). Touchez une voiture pour la modifier.</p>
    <div style={{ display: "grid", gap: 10 }}>
      {list.map(x => <div key={x.id} className={c.card} style={{ padding: 14, borderColor: x.defect ? "#f5b5b5" : undefined }}>
        <div onClick={() => setOpen(open === x.id ? null : x.id)} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
            <b style={{ ...mono, fontSize: 15, overflowWrap: "anywhere" }}>{x.vin}</b>
            <span className={c.pill} style={{ background: ST_BG[x.state] }}>{STOCK_ICON[x.state]} {STOCK_LABEL[x.state]}</span>
          </div>
          <div className={c.small} style={{ marginTop: 4, lineHeight: 1.55 }}>
            {[x.model, x.color].filter(Boolean).join(" · ") || "Modèle à préciser"}{x.defect ? <b style={{ color: "#b91c1c" }}> · ⚠️ défaut{x.defect_note ? ` : ${x.defect_note}` : ""}</b> : null}<br />
            🚢 {x.container || "conteneur à préciser"}{x.shipment ? ` · ${x.shipment}` : ""} · 🏠 {x.hub ? hubName(x.hub) : "hub à définir"}<br />
            👤 {x.reservation ? <>{x.reservation.name} (rés. n° {x.reservation.id}, {x.reservation.statut}) <Pay p={x.reservation.pay} /></> : x.client_name || "pas de client"}
            {x.delivered_at ? ` · livrée le ${dfr(x.delivered_at)}` : ""}<br />
            🪪 {x.dossier ? `carte grise ${x.dossier.ref} (${x.dossier.status})` : "pas de dossier carte grise"} · 🧾 {x.invoice ? (x.invoice.number || "brouillon") + ` ${eurFr(x.invoice.total_ttc)}` : "pas de facture"}
          </div>
        </div>
        {open === x.id ? <div style={{ display: "grid", gap: 8, marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className={c.input} style={sel} value={x.hub} onChange={e => run({ action: "set_vehicle", id: x.id, depot: e.target.value })}><option value="">Hub à définir</option>{d.hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
            <select className={c.input} style={sel} value={x.status} onChange={e => run({ action: "set_vehicle", id: x.id, status: e.target.value })}>{d.statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "8px 12px" }} onClick={() => { const v = prompt("N° de conteneur (vide pour effacer) :", x.container); if (v !== null) run({ action: "set_vehicle", id: x.id, container: v }); }}>Conteneur</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "8px 12px" }} onClick={() => { const m = prompt("Modèle :", x.model); if (m === null) return; const col = prompt("Couleur :", x.color); if (col !== null) run({ action: "set_vehicle", id: x.id, model: m, color: col }); }}>Modèle / couleur</button>
            <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "8px 12px", color: x.defect ? "#166534" : "#b91c1c" }} onClick={() => { if (x.defect) { run({ action: "set_vehicle", id: x.id, defect: false }); return; } const n = prompt("Défaut constaté (note) :"); if (n !== null) run({ action: "set_vehicle", id: x.id, defect: true, defect_note: n }); }}>{x.defect ? "Lever le défaut" : "⚠️ Signaler un défaut"}</button>
            {x.reservation && x.linked ? <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "8px 12px" }} onClick={() => { if (confirm(`Retirer le lien avec ${x.reservation?.name} ? (la réservation garde son VIN)`)) run({ action: "set_vehicle", id: x.id, reservation_id: null }); }}>Retirer le client</button>
              : <button className={`${c.btn} ${c.btnBrand}`} style={{ fontSize: 14, padding: "8px 12px" }} onClick={() => link(x)}>Lier à un client</button>}
          </div>
        </div> : null}
      </div>)}
    </div>
  </div>;
}

function Import({ d, run }: { d: Data; run: (b: object, ok?: string) => Promise<unknown> }) {
  const [text, setText] = useState(""); const [status, setStatus] = useState("en mer"); const [depot, setDepot] = useState(""); const [res, setRes] = useState<Record<string, unknown> | null>(null); const [busy, setBusy] = useState(false);
  const preview = useMemo(() => parseImport(text), [text]);
  const known = new Set(d.cars.map(x => x.vin));
  const onFile = async (f?: File | null) => { if (f) setText(await f.text()); };
  const go = async () => {
    if (!preview.rows.length) return;
    setBusy(true); const r = await run({ action: "import", text, status, depot }) as Record<string, unknown> | null; setBusy(false); if (r) setRes(r);
  };
  return <div className={c.card} style={{ display: "grid", gap: 10 }}>
    <b>📥 Charger des VIN (liste collée ou fichier CSV)</b>
    <p className={c.small} style={{ margin: 0, lineHeight: 1.5 }}>Une voiture par ligne : <b>VIN ; modèle ; couleur ; conteneur</b>. Seul le VIN est obligatoire : le conteneur peut rester vide et être ajouté plus tard. Un VIN déjà connu n’est jamais dupliqué : seuls le modèle, la couleur et le conteneur indiqués sont complétés.</p>
    <textarea className={c.input} rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={"LP4SE0D00T1600343;NeoDrive Confort;blanc;TEMU8609257\nLP4SE0D00T1600357;NeoDrive Confort;gris;"} style={{ ...mono, fontSize: 13 }} />
    <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e => onFile(e.target.files?.[0])} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label className={c.small}>État des nouvelles voitures<br /><select className={c.input} style={sel} value={status} onChange={e => setStatus(e.target.value)}><option value="commandée">🏭 Commandée</option><option value="en mer">🚢 En mer</option><option value="au dépôt">🏠 Arrivée au hub</option></select></label>
      {status === "au dépôt" ? <label className={c.small}>Hub<br /><select className={c.input} style={sel} value={depot} onChange={e => setDepot(e.target.value)}><option value="">À définir</option>{d.hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label> : null}
    </div>
    {text ? <p className={c.small} style={{ margin: 0 }}>{preview.rows.length} VIN lu(s) : {preview.rows.filter(r => !known.has(r.vin)).length} nouveau(x), {preview.rows.filter(r => known.has(r.vin)).length} déjà en stock{preview.rows.filter(r => !r.container).length ? ` · ${preview.rows.filter(r => !r.container).length} sans conteneur` : ""}.</p> : null}
    {preview.errors.length ? <ul className={c.err} style={{ margin: 0, paddingLeft: 18 }}>{preview.errors.slice(0, 10).map(e => <li key={e}>{e}</li>)}</ul> : null}
    <button className={`${c.btn} ${c.btnBrand}`} disabled={busy || !preview.rows.length} onClick={go}>{busy ? "Import…" : `Importer ${preview.rows.length} VIN`}</button>
    {res ? <p className={c.msg} style={{ margin: 0 }}>✅ {String(res.created)} ajoutée(s){Number(res.noContainer) ? ` (dont ${String(res.noContainer)} sans conteneur rattaché)` : ""}, {String(res.updated)} complétée(s), {String(res.unchanged)} inchangée(s).{(res.notes as string[])?.length ? <><br />{(res.notes as string[]).slice(0, 12).join(" · ")}</> : null}</p> : null}
  </div>;
}

function Invoices({ d, run, setMsg }: { d: Data; run: (b: object, ok?: string) => Promise<unknown>; setMsg: (s: string) => void }) {
  const [f, setF] = useState<"brouillon" | "validée" | "">("brouillon");
  const list = d.invoices.filter(i => !f || i.status === f);
  const csv = async () => {
    try { const r = await api<{ csv: string; count: number }>({ action: "csv" });
      const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `factures-ventes-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
      setMsg(`✅ ${r.count} facture(s) validée(s) exportée(s).`);
    } catch (e) { setMsg("❌ " + (e as Error).message); }
  };
  const sum = (arr: Inv[]) => arr.reduce((a, i) => a + Number(i.total_ttc || 0), 0);
  return <div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      <select className={c.input} style={sel} value={f} onChange={e => setF(e.target.value as typeof f)}><option value="brouillon">Brouillons ({d.invoices.filter(i => i.status === "brouillon").length})</option><option value="validée">Validées ({d.invoices.filter(i => i.status === "validée").length})</option><option value="">Toutes</option></select>
      <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "9px 12px" }} onClick={csv}>⬇️ Export CSV (comptable)</button>
    </div>
    <p className={c.small}>Total affiché : {eurFr(sum(list))} TTC. Numérotation FA-AAAA-NNNN attribuée à la validation, sans trou ; un brouillon n’a pas de numéro. Une facture validée est définitive.</p>
    <div style={{ display: "grid", gap: 10 }}>{list.map(i => <InvoiceCard key={i.id} i={i} run={run} setMsg={setMsg} />)}</div>
    {!list.length ? <p className={c.empty}>Aucune facture.</p> : null}
  </div>;
}

function InvoiceCard({ i, run, setMsg }: { i: Inv; run: (b: object, ok?: string) => Promise<unknown>; setMsg: (s: string) => void }) {
  const [lines, setLines] = useState<InvoiceLine[]>(i.lines || []); const [reason, setReason] = useState(i.adjust_reason || ""); const [open, setOpen] = useState(false); const [vin, setVin] = useState(i.vin || "");
  const t = totals(lines); const draft = i.status === "brouillon";
  const diff = Math.round((t.total_ttc - Number(i.suggested_ttc || 0)) * 100) / 100;
  const pdf = async () => { try { const r = await api<{ url: string }>({ action: "invoice_pdf", id: i.id }); window.open(r.url, "_blank"); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const validate = async () => {
    if (!confirm(`Valider la facture de ${i.client_name} pour ${eurFr(t.total_ttc)} TTC ?\nLe numéro suivant sera attribué et la facture ne pourra plus être modifiée.`)) return;
    await run({ action: "invoice_validate", id: i.id, lines, adjust_reason: reason, vin }, "✅ Facture validée.");
  };
  return <div className={c.card} style={{ padding: 14 }}>
    <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
        <b style={{ fontSize: 16 }}>{i.client_name || "—"}</b>
        <span className={c.pill} style={{ background: draft ? "#f1ede6" : "#e7f6ec" }}>{draft ? "Brouillon" : `✅ ${i.number}`}</span>
      </div>
      <div className={c.small} style={{ marginTop: 4, lineHeight: 1.55 }}>
        VIN <span style={mono}>{i.vin || "à relier"}</span> · livrée le {dfr(i.delivered_at)}{i.issued_at ? ` · facture du ${dfr(i.issued_at)}` : ""}<br />
        Suggéré <b>{eurFr(i.suggested_ttc)}</b> · retenu <b>{eurFr(draft ? t.total_ttc : i.total_ttc)}</b>{diff && draft ? <span style={{ color: diff < 0 ? "#b91c1c" : "#166534" }}> ({diff > 0 ? "+" : ""}{eurFr(diff)})</span> : null} TTC · <Pay p={i.pay} />
        {i.adjust_reason ? <><br />Raison : {i.adjust_reason}</> : null}
      </div>
    </div>
    {open ? <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10, display: "grid", gap: 8 }}>
      <div className={c.small}>{i.client_address || "Adresse à compléter"}</div>
      {lines.map((l, k) => <div key={l.key + k} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, alignItems: "center" }}>
        <span className={c.small}>{l.label}</span>
        <input className={c.input} style={{ ...sel, textAlign: "right" }} type="number" inputMode="decimal" step="0.01" min="0" disabled={!draft} value={l.ttc} onChange={e => setLines(ls => ls.map((x, j) => j === k ? { ...x, ttc: Number(e.target.value) } : x))} />
      </div>)}
      <div className={c.small} style={{ textAlign: "right" }}>HT {eurFr(t.total_ht)}{lines.some(l => l.debours) ? ` (dont débours sans TVA ${eurFr(lines.filter(l => l.debours).reduce((a, l) => a + Number(l.ttc || 0), 0))})` : ""} · TVA 20 % {eurFr(t.tva)} · <b>TTC {eurFr(t.total_ttc)}</b></div>
      {draft && !i.vin ? <input className={c.input} style={{ ...sel, ...mono }} placeholder="VIN de la voiture vendue (17 caractères)" maxLength={17} value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /> : null}
      {draft ? <input className={c.input} style={sel} placeholder={diff ? "Raison de l’écart (obligatoire : défaut, geste commercial…)" : "Raison d’un ajustement (si besoin)"} value={reason} onChange={e => setReason(e.target.value)} /> : null}
      {i.notes ? <div className={c.small} style={{ color: "#666" }}>{i.notes}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {draft ? <>
          <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "9px 12px" }} onClick={() => run({ action: "invoice_save", id: i.id, lines, adjust_reason: reason, vin }, "✅ Brouillon enregistré.")}>Enregistrer</button>
          <button className={`${c.btn} ${c.btnBrand}`} style={{ fontSize: 14, padding: "9px 12px" }} disabled={vin.length !== 17 || (!!diff && !reason.trim())} onClick={validate}>Valider (numéroter)</button>
          {vin.length !== 17 ? <span className={c.small} style={{ color: "#b91c1c" }}>VIN manquant : saisissez-le ou liez la voiture au client.</span> : null}
        </> : <button className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 14, padding: "9px 12px" }} onClick={pdf}>📄 PDF</button>}
      </div>
    </div> : null}
  </div>;
}
