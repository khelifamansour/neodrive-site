"use client";
import { useEffect, useMemo, useState } from "react";
import c from "./rentabilite.module.css";
import { VEHICLES, type VehicleKey } from "../../lib/neodrive-pricing";
import { DEFAULT_SETTINGS, compute, monthKeyNow, monthLabel, monthsCsv, type CarCalc, type RawData, type RawExpense, type Settings, type ShipOverride } from "../../lib/rentabilite";

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n || 0));
const usd = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " $";
const sign = (n: number) => (n >= 0 ? c.pos : c.neg);
type Tab = "resume" | "mois" | "depenses" | "conteneurs" | "voitures" | "hypotheses";
const TABS: [Tab, string][] = [["resume", "📊 Résumé"], ["mois", "📅 Par mois"], ["depenses", "🧾 Dépenses"], ["conteneurs", "🚢 Conteneurs"], ["voitures", "🚗 Voitures"], ["hypotheses", "⚙️ Hypothèses"]];
const CAT_LABEL: Record<string, string> = { loyer: "Loyer", publicite: "Publicité", equipe: "Équipe", transport: "Transport / carburant", banque: "Banque", assurance: "Assurance", materiel: "Matériel", autre: "Autre" };
const MODELS = Object.entries(VEHICLES) as [VehicleKey, { label: string; price: number }][];

function How({ children, title = "Comment c’est calculé ?" }: { children: React.ReactNode; title?: string }) {
  return <details className={c.how}><summary>{title}</summary>{children}</details>;
}

export default function RentabilitePage() {
  const [code, setCode] = useState(""); const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [raw, setRaw] = useState<RawData | null>(null); const [set, setSet] = useState<Settings>(DEFAULT_SETTINGS);
  const [meta, setMeta] = useState<{ updated_at: string; updated_by: string } | null>(null);
  const [who, setWho] = useState<{ who: string; name: string }>({ who: "", name: "" });
  const [categories, setCategories] = useState<string[]>(Object.keys(CAT_LABEL));
  const [tab, setTab] = useState<Tab>("resume"); const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");
  const [exp, setExp] = useState({ month: monthKeyNow(), label: "", category: "autre", amount: "", ttc: true, tva: 20, note: "" });

  const api = async (body: object, pc = code) => {
    const r = await fetch("/api/rentabilite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
    if (r.status === 401) { setState("login"); throw new Error(j.error || "Code incorrect"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  };
  const load = async (pc = code, remember = false) => {
    setBusy("load"); setMsg("");
    try {
      const j = await api({ action: "load" }, pc);
      setRaw(j.raw); setSet(j.settings); setMeta(j.settingsMeta); setWho({ who: j.who, name: j.name }); if (j.categories) setCategories(j.categories);
      setDirty(false); setState("ready");
      if (remember && pc) { try { sessionStorage.setItem("nd_pc", pc); } catch { /* navigation privée */ } }
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  };
  useEffect(() => {
    let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* navigation privée */ }
    setCode(pc); load(pc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = useMemo(() => (raw ? compute(raw, set) : null), [raw, set]);
  const upd = (patch: Partial<Settings>) => { setSet(s => ({ ...s, ...patch })); setDirty(true); setMsg(""); };
  const updShip = (id: number, k: keyof ShipOverride, v: string) => { const n = v === "" ? null : Number(v); setSet(s => ({ ...s, ships: { ...s.ships, [id]: { ...(s.ships[id] || {}), [k]: Number.isFinite(n as number) ? n : null } } })); setDirty(true); };
  const updVin = (vin: string, patch: { sale_ttc?: number | null; model?: VehicleKey | null }) => { setSet(s => ({ ...s, vins: { ...s.vins, [vin]: { ...(s.vins[vin] || {}), ...patch } } })); setDirty(true); };
  const save = async () => { setBusy("save"); try { const j = await api({ action: "save_settings", settings: set }); setSet(j.settings); setDirty(false); setMeta({ updated_at: new Date().toISOString(), updated_by: who.name }); setMsg("✅ Hypothèses enregistrées."); } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); } };
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("exp"); setMsg("");
    try { const j = await api({ action: "expense_add", ...exp, amount: Number(String(exp.amount).replace(",", ".")) }); setRaw(x => x ? { ...x, expenses: [j.expense, ...x.expenses] } : x); setExp(x => ({ ...x, label: "", amount: "", note: "" })); setMsg("✅ Dépense ajoutée."); }
    catch (er) { setMsg((er as Error).message); } finally { setBusy(""); }
  };
  const delExpense = async (x: RawExpense) => {
    if (!confirm(`Supprimer « ${x.label} » (${eur(Number(x.amount_ht))} HT) ?`)) return;
    try { await api({ action: "expense_delete", id: x.id }); setRaw(d => d ? { ...d, expenses: d.expenses.filter(e => e.id !== x.id) } : d); } catch (e) { setMsg((e as Error).message); }
  };
  const csv = () => { if (!r) return; const blob = new Blob([monthsCsv(r)], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `neodrive-rentabilite-${monthKeyNow()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

  if (state !== "ready" || !r || !raw) return <main className={c.page}>
    {state === "loading" ? <p style={{ padding: 30, color: "#666" }}>Chargement…</p> :
      <form className={c.login} onSubmit={e => { e.preventDefault(); load(code, true); }}>
        <h1>💰 Rentabilité</h1>
        <p className={c.muted}>Code d’accès NeoDrive. Membre de l’équipe : connectez-vous d’abord sur <a href="/organisation">la page Organisation</a> (la section « Rentabilité » doit être ouverte pour vous).</p>
        <input className={c.input} type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus />
        <button className={`${c.btn} ${c.btnBrand}`} disabled={busy === "load"}>{busy === "load" ? "…" : "Entrer"}</button>
        {msg ? <p className={c.err}>{msg}</p> : null}
        <a href="/organisation" style={{ fontSize: 14 }}>← Organisation</a>
      </form>}
  </main>;

  const nowM = monthKeyNow();
  const cur = r.months.find(m => m.month === nowM);
  const N = (k: keyof Settings, label: string, help?: string, step = 1) => <label className={c.field}><span>{label}</span><input type="number" step={step} value={set[k] as number} onChange={e => upd({ [k]: Number(e.target.value) || 0 } as Partial<Settings>)} />{help ? <small className={c.muted}>{help}</small> : null}</label>;
  const expensesByMonth = raw.expenses.reduce<Record<string, RawExpense[]>>((a, e) => { (a[e.month] ||= []).push(e); return a; }, {});

  return <main className={c.page}><div className={c.wrap}>
    <header className={c.top}>
      <div><h1>💰 Rentabilité NeoDrive</h1><p>Estimation de pilotage — mise à jour automatique avec les conteneurs, les voitures, les tournées et les pièces.</p></div>
      <div className={c.links}><a href="/organisation">Organisation</a>{who.who === "owner" ? <a href="/pilotage">📊 Pilotage</a> : null}<button className={`${c.btn} ${c.btnLight}`} onClick={() => load()} disabled={!!busy}>{busy === "load" ? "…" : "↻ Actualiser"}</button></div>
    </header>
    <div className={c.notice}>⚠️ <b>Estimation, pas une comptabilité officielle.</b> Les montants sont calculés à partir des données de la plateforme et des hypothèses de l’onglet ⚙️. Montants <b>hors taxes</b> (la TVA collectée et la TVA d’import sont reversées / récupérées, ce ne sont pas des coûts). Les vrais chiffres restent ceux du comptable.</div>
    {msg ? <p className={msg.startsWith("✅") ? c.ok : c.err}>{msg}</p> : null}

    <nav className={c.tabs}>{TABS.map(([k, l]) => <button key={k} className={tab === k ? c.on : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>

    {tab === "resume" ? <>
      <div className={c.cards}>
        <div className={c.kpi}><small>Résultat estimé {monthLabel(nowM)}</small><b className={sign(cur?.net || 0)}>{eur(cur?.net || 0)}</b><span>{cur?.carsDelivered || 0} voiture(s) livrée(s) · charges {eur((cur?.recurringHt || 0) + (cur?.expensesHt || 0))}</span></div>
        <div className={c.kpi}><small>Résultat estimé {r.ytd.year} (cumul)</small><b className={sign(r.ytd.net)}>{eur(r.ytd.net)}</b><span>{r.ytd.carsDelivered} voiture(s) · marge voitures {eur(r.ytd.carsMargin)} · pièces {eur(r.ytd.partsMargin)}</span></div>
        <div className={c.kpi}><small>Marge moyenne par voiture</small><b>{eur(r.avgMarginPerCar)}</b><span>après achat, transport, douane, livraison et stockage</span></div>
        <div className={c.kpi}><small>Voitures à vendre par mois pour couvrir les charges</small><b>{r.breakEvenCars ? r.breakEvenCars.toFixed(1).replace(".", ",") : "—"}</b><span>charges habituelles {eur(r.recurringMonthlyHt)} HT / mois</span></div>
        <div className={c.kpi}><small>Argent dans le stock (au dépôt)</small><b>{eur(r.stock.atDepot)}</b><span>{r.stock.atDepotCars} voiture(s)</span></div>
        <div className={c.kpi}><small>Argent en route (mer / port)</small><b>{eur(r.stock.transit)}</b><span>{r.stock.transitCars} voiture(s)</span></div>
        <div className={c.kpi}><small>Marge attendue sur les voitures pas encore livrées</small><b className={c.pos}>{eur(r.stock.expectedMargin)}</b><span>{r.stock.reservedCars} réservée(s) · {r.stock.freeCars} libre(s)</span></div>
        <div className={c.kpi}><small>Commandes de pièces pas encore payées</small><b>{eur(r.pendingParts.ht)}</b><span>{r.pendingParts.count} commande(s), non comptées dans le résultat</span></div>
      </div>
      <section className={c.card}>
        <h2>Les grandes lignes</h2>
        <How title="Comment lire cette page ?"><ul>
          <li><b>Marge d’une voiture</b> = prix de vente HT + livraison facturée HT + carte grise facturée HT − coût de revient (usine + fret + douane + transitaire + dépotage) − coût réel de livraison − stockage − coût réel carte grise.</li>
          <li><b>Résultat du mois</b> = marge des voitures <b>livrées</b> ce mois-ci + marge des pièces payées ce mois-ci − charges habituelles − dépenses saisies dans 🧾.</li>
          <li><b>Argent dans le stock / en route</b> = coût de revient des voitures pas encore livrées (ce que vous avez déjà payé ou allez payer pour elles).</li>
          <li><b>Voitures pour couvrir les charges</b> = charges habituelles du mois ÷ marge moyenne par voiture.</li>
          <li>Tout se met à jour seul : nouveau conteneur, VIN livré (accusé de réception ou chauffeur), tournée calculée, commande de pièces payée. Il suffit de saisir les dépenses du mois dans 🧾.</li>
        </ul></How>
        <h3>Par conteneur</h3>
        <div className={c.tableWrap}><table className={c.table}><thead><tr><th>Dossier</th><th>Voitures</th><th>Coût de revient / voiture</th><th>Total investi</th><th>Statut</th></tr></thead>
          <tbody>{r.ships.map(s => <tr key={s.id}><td className={c.left}>{s.name}{s.warnings.length ? <span className={c.warnTxt}> ⚠️</span> : null}</td><td>{s.cars}</td><td>{eur(s.perCar)}</td><td>{eur(s.total)}</td><td>{s.status}</td></tr>)}</tbody>
          <tfoot><tr><td>Total</td><td>{r.ships.reduce((t, s) => t + s.cars, 0)}</td><td></td><td>{eur(r.ships.reduce((t, s) => t + s.total, 0))}</td><td></td></tr></tfoot></table></div>
      </section>
    </> : null}

    {tab === "mois" ? <section className={c.card}>
      <div className={c.row} style={{ justifyContent: "space-between" }}><h2>Résultat estimé par mois</h2><button className={`${c.btn} ${c.btnLight}`} onClick={csv}>⬇️ Export CSV</button></div>
      <p className={c.muted}>Montants HT. Une voiture compte dans le mois où elle est <b>livrée</b> (statut « livrée » dans le suivi des voitures).</p>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Mois</th><th>Voitures livrées</th><th>CA voitures HT</th><th>Marge voitures</th><th>Marge pièces</th><th>Charges habituelles</th><th>Autres dépenses</th><th>Résultat</th><th>Cumul</th></tr></thead>
        <tbody>{[...r.months].reverse().map(m => <tr key={m.month}><td>{monthLabel(m.month)}</td><td>{m.carsDelivered}</td><td>{eur(m.carsRevenueHt)}</td><td>{eur(m.carsMargin)}</td><td>{eur(m.partsMargin)}{m.partsEstimated ? <span className={c.tag}>estimée</span> : null}</td><td>−{eur(m.recurringHt)}</td><td>−{eur(m.expensesHt)}</td><td className={sign(m.net)}><b>{eur(m.net)}</b></td><td className={sign(m.cumul)}>{eur(m.cumul)}</td></tr>)}</tbody>
        <tfoot><tr><td>Cumul {r.ytd.year}</td><td>{r.ytd.carsDelivered}</td><td></td><td>{eur(r.ytd.carsMargin)}</td><td>{eur(r.ytd.partsMargin)}</td><td colSpan={2}>−{eur(r.ytd.fixed)}</td><td className={sign(r.ytd.net)}>{eur(r.ytd.net)}</td><td></td></tr></tfoot>
      </table></div>
      <How><ul>
        <li><b>Marge voitures</b> : somme des marges des voitures livrées dans le mois (détail dans 🚗).</li>
        <li><b>Marge pièces</b> : commandes au statut payée, préparée, expédiée ou livrée, comptées dans le mois de la commande. Marge = prix de vente HT − prix d’achat quand il est connu dans le catalogue ; sinon {set.partsMarginPct} % du prix de vente (« estimée »). Les frais de port facturés ne sont pas comptés comme marge.</li>
        <li><b>Charges habituelles</b> : la liste de l’onglet ⚙️, comptée chaque mois à partir de {monthLabel(set.startMonth || r.months[0]?.month || nowM)}.</li>
        <li><b>Autres dépenses</b> : ce que l’équipe saisit dans 🧾 (HT).</li>
      </ul></How>
    </section> : null}

    {tab === "depenses" ? <section className={c.card}>
      <h2>Dépenses du mois</h2>
      <p className={c.muted}>Les charges habituelles (loyer, Leboncoin…) sont déjà comptées chaque mois : ajoutez ici <b>seulement les autres dépenses</b> (salaires ou factures de l’équipe, carburant hors tournée, réparation, frais bancaires, douane réelle…). Pour changer une charge habituelle, allez dans ⚙️.</p>
      <form onSubmit={addExpense} className={c.grid} style={{ marginTop: 10 }}>
        <label className={c.field}><span>Mois</span><input type="month" value={exp.month} onChange={e => setExp({ ...exp, month: e.target.value })} required /></label>
        <label className={c.field}><span>Libellé</span><input value={exp.label} onChange={e => setExp({ ...exp, label: e.target.value })} placeholder="Ex. : facture Ahmed novembre" required /></label>
        <label className={c.field}><span>Catégorie</span><select value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })}>{categories.map(k => <option key={k} value={k}>{CAT_LABEL[k] || k}</option>)}</select></label>
        <label className={c.field}><span>Montant (€)</span><input inputMode="decimal" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} placeholder="0" required /></label>
        <label className={c.field}><span>Le montant est…</span><select value={exp.ttc ? "ttc" : "ht"} onChange={e => setExp({ ...exp, ttc: e.target.value === "ttc" })}><option value="ttc">TTC (sur la facture)</option><option value="ht">HT / sans TVA</option></select></label>
        <label className={c.field}><span>TVA sur la facture</span><select value={exp.tva} onChange={e => setExp({ ...exp, tva: Number(e.target.value) })}><option value={20}>20 %</option><option value={10}>10 %</option><option value={5.5}>5,5 %</option><option value={0}>Pas de TVA</option></select></label>
        <label className={c.field} style={{ gridColumn: "1 / -1" }}><span>Note (facultatif)</span><input value={exp.note} onChange={e => setExp({ ...exp, note: e.target.value })} /></label>
        <div><button className={`${c.btn} ${c.btnBrand}`} disabled={busy === "exp"}>{busy === "exp" ? "…" : "➕ Ajouter la dépense"}</button></div>
      </form>
      {Object.keys(expensesByMonth).sort().reverse().map(m => <div key={m}>
        <h3>{monthLabel(m)} — {eur(expensesByMonth[m].reduce((t, e) => t + Number(e.amount_ht), 0))} HT</h3>
        <div className={c.tableWrap}><table className={c.table}><thead><tr><th>Libellé</th><th>Catégorie</th><th>HT</th><th>TTC</th><th>Saisi par</th><th></th></tr></thead>
          <tbody>{expensesByMonth[m].map(e => <tr key={e.id}><td className={c.left}>{e.label}{e.note ? <span className={c.muted}> · {e.note}</span> : null}</td><td>{CAT_LABEL[e.category] || e.category}</td><td>{eur(Number(e.amount_ht))}</td><td>{e.amount_ttc != null ? eur(Number(e.amount_ttc)) : "—"}</td><td>{e.created_by || "—"}</td><td>{who.who === "owner" || e.created_by === who.name ? <button className={`${c.btn} ${c.btnLight}`} style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => delExpense(e)}>Supprimer</button> : null}</td></tr>)}</tbody></table></div>
      </div>)}
      {!raw.expenses.length ? <p className={c.muted}>Aucune dépense saisie pour l’instant.</p> : null}
    </section> : null}

    {tab === "conteneurs" ? <section className={c.card}>
      <h2>Coût de revient par conteneur</h2>
      <p className={c.muted}>Dollar à {set.usd} € · douane {set.dutyPct} % de (usine + fret) · transitaire {eur(set.forwarder)} et dépotage {eur(set.unloading)} par conteneur. Les cases « corriger » remplacent la valeur automatique (laisser vide = automatique).</p>
      {r.ships.map(s => { const o = set.ships[s.id] || {}; return <article key={s.id} className={c.ship}>
        <header><b>{s.name}</b><span className={c.muted}>{s.cars} voitures · {s.containers} conteneur(s) · {s.status}</span></header>
        <div className={c.lines}>
          <span>Usine : {s.cars} × {usd(s.unitUsd)}{s.unitEstimated ? " (supposé)" : ""}{s.extrasCounted ? ` + accessoires ${usd(s.extrasCounted)}` : ""} = {usd(s.factoryUsd)}</span><b>{eur(s.factoryEur)}</b>
          <span>Fret maritime {s.freightUsd != null ? usd(s.freightUsd) : "—"} <span className={c.tag}>{s.freightSource === "document" ? "lu sur la facture de transport" : s.freightSource}</span></span><b>{eur(s.freightEur)}</b>
          <span>Droits de douane {s.dutyManual ? "(montant réel saisi)" : `${set.dutyPct} %`}</span><b>{eur(s.dutyEur)}</b>
          <span>Transitaire ({s.containers} × {eur(set.forwarder)})</span><b>{eur(s.forwarderEur)}</b>
          <span>Dépotage ({s.containers} × {eur(set.unloading)})</span><b>{eur(s.unloadingEur)}</b>
          {s.otherEur ? <><span>Autres frais</span><b>{eur(s.otherEur)}</b></> : null}
          <span className={c.total}>Total investi</span><b className={c.total}>{eur(s.total)}</b>
          <span className={c.total}>Coût de revient par voiture (÷ {s.cars})</span><b className={c.total}>{eur(s.perCar)}</b>
        </div>
        {s.warnings.length ? <ul className={c.warnList}>{s.warnings.map(w => <li key={w}>{w}</li>)}</ul> : null}
        <details className={c.how}><summary>Corriger les montants de ce dossier</summary>
          <div className={c.grid} style={{ marginTop: 8 }}>
            <label className={c.field}><span>Prix usine par voiture ($)</span><input type="number" value={o.unit_price_usd ?? ""} placeholder={String(s.unitUsd)} onChange={e => updShip(s.id, "unit_price_usd", e.target.value)} /></label>
            <label className={c.field}><span>Fret total ($)</span><input type="number" value={o.freight_usd ?? ""} placeholder={s.freightUsd != null ? String(s.freightUsd) : "inconnu"} onChange={e => updShip(s.id, "freight_usd", e.target.value)} /></label>
            <label className={c.field}><span>Douane réellement payée (€)</span><input type="number" value={o.duty_eur ?? ""} placeholder={String(Math.round(s.dutyEur))} onChange={e => updShip(s.id, "duty_eur", e.target.value)} /></label>
            <label className={c.field}><span>Autres frais de ce dossier (€ HT)</span><input type="number" value={o.other_eur ?? ""} placeholder="0" onChange={e => updShip(s.id, "other_eur", e.target.value)} /></label>
          </div>
        </details>
      </article>; })}
      <How><ul>
        <li><b>Usine</b> = prix unitaire de la facture usine × nombre de voitures{set.extrasOnCars ? " + accessoires de la facture (répartis sur les voitures)" : ""}, converti au taux de {set.usd} € pour 1 $. Si le prix n’est pas encore saisi dans le dossier : {usd(set.defaultUnitUsd)} supposé.</li>
        <li><b>Fret</b> = montant lu automatiquement sur la facture de transport (note du document), sinon à saisir.</li>
        <li><b>Douane</b> = {set.dutyPct} % × (usine + fret), tant que le montant réel n’est pas saisi. La TVA d’import (20 %) est récupérable : elle n’est pas comptée.</li>
        <li><b>Coût par voiture</b> = total ÷ nombre de voitures du dossier.</li>
      </ul></How>
      {dirty ? <div className={c.saveBar}><span className={c.warnTxt}>Modifications non enregistrées</span><button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={busy === "save"}>💾 Enregistrer</button></div> : null}
    </section> : null}

    {tab === "voitures" ? <section className={c.card}>
      <h2>Marge voiture par voiture</h2>
      <p className={c.muted}>{r.cars.length} voitures · {r.cars.filter(x => x.delivered).length} livrée(s) · {r.cars.filter(x => !x.delivered && x.sold).length} réservée(s) · {r.cars.filter(x => !x.sold).length} libre(s). Sans réservation liée, le modèle supposé est {VEHICLES[set.defaultModel].label} ({eur(VEHICLES[set.defaultModel].price)} TTC) sans livraison.</p>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>VIN</th><th>Étape</th><th>Client</th><th>Modèle</th><th>Prix TTC</th><th>Vente HT</th><th>Livraison facturée HT</th><th>Coût de revient</th><th>Livraison réelle</th><th>Stockage</th><th>Marge</th></tr></thead>
        <tbody>{r.cars.map((x: CarCalc) => <tr key={x.key}>
          <td className={c.left}>{x.vin || <span className={c.muted}>VIN à saisir</span>}<br /><span className={c.muted} style={{ fontSize: 11 }}>{x.shipName.split("–").slice(0, 2).join("–")}</span></td>
          <td>{x.stage}</td><td className={c.left}>{x.client || "—"}</td>
          <td>{x.vin ? <select className={c.small} value={set.vins[x.vin]?.model || ""} onChange={e => updVin(x.vin!, { model: (e.target.value || null) as VehicleKey | null })}><option value="">{VEHICLES[x.model].label.replace("NeoDrive ", "")} ({x.modelSource})</option>{MODELS.map(([k, v]) => <option key={k} value={k}>{v.label.replace("NeoDrive ", "")}</option>)}</select> : VEHICLES[x.model].label.replace("NeoDrive ", "")}</td>
          <td>{x.vin ? <input className={c.small} type="number" value={set.vins[x.vin]?.sale_ttc ?? ""} placeholder={String(Math.round(x.saleTtc))} onChange={e => updVin(x.vin!, { sale_ttc: e.target.value === "" ? null : Number(e.target.value) })} /> : eur(x.saleTtc)}</td>
          <td>{eur(x.saleHt)}</td><td>{eur(x.deliveryBilledHt + x.regBilledHt)}</td><td>−{eur(x.landed)}</td>
          <td>{x.deliverySource === "aucune" ? "—" : <>−{eur(x.deliveryCost)}<span className={c.tag}>{x.deliverySource}</span></>}</td>
          <td>{x.storage ? `−${eur(x.storage)}` : "—"}</td><td className={sign(x.margin)}><b>{eur(x.margin)}</b></td></tr>)}</tbody>
      </table></div>
      <How><ul>
        <li><b>Modèle et prix</b> : ceux de la réservation liée au VIN (suivi des voitures → réservation du planificateur). Sinon le modèle par défaut. Vous pouvez forcer le modèle ou le prix TTC réellement payé (vente Leboncoin, remise…).</li>
        <li><b>Livraison facturée</b> : barème par département (450 / 590 / 690 / 790 € TTC) d’après le code postal du client, + carte grise 150 € TTC si elle est incluse dans le total de la réservation.</li>
        <li><b>Livraison réelle</b> : coût de la tournée (carburant, péages, chauffeur, repas, hôtel) ÷ nombre de clients de la tournée. Sans tournée calculée : {eur(set.deliveryCost)} par voiture.</li>
        <li><b>Stockage</b> : {eur(set.storage)} par voiture et par mois passé au dépôt (de l’arrivée au dépôt à la livraison).</li>
        <li><b>Marge</b> = vente HT + livraison et carte grise facturées HT − coût de revient − livraison réelle − stockage − coût réel carte grise ({eur(set.registrationCost)}).</li>
      </ul></How>
      {dirty ? <div className={c.saveBar}><span className={c.warnTxt}>Modifications non enregistrées</span><button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={busy === "save"}>💾 Enregistrer</button></div> : null}
    </section> : null}

    {tab === "hypotheses" ? <section className={c.card}>
      <h2>Hypothèses</h2>
      <p className={c.muted}>Changez un chiffre : toute la page se recalcule tout de suite. Cliquez sur « Enregistrer » pour le garder pour toute l’équipe.{meta ? ` Dernière modification : ${new Date(meta.updated_at).toLocaleString("fr-FR")} par ${meta.updated_by || "?"}.` : " (valeurs par défaut, jamais enregistrées)"}</p>
      <h3>Import</h3>
      <div className={c.grid}>
        {N("usd", "Taux du dollar (1 $ = … €)", "Mettre le taux du jour du paiement.", 0.01)}
        {N("dutyPct", "Droits de douane (% de usine + fret)", undefined, 0.1)}
        {N("forwarder", "Transitaire par conteneur (€ HT)")}
        {N("unloading", "Dépotage par conteneur (€ HT)")}
        {N("otherPerContainer", "Autres frais par conteneur (€ HT)", "Port, transfert vers le dépôt… si pas compris ailleurs.")}
        {N("defaultUnitUsd", "Prix usine supposé si non saisi ($ / voiture)")}
        <label className={c.field}><span>Accessoires de la facture usine</span><select value={set.extrasOnCars ? "1" : "0"} onChange={e => upd({ extrasOnCars: e.target.value === "1" })}><option value="1">Répartis sur le coût des voitures</option><option value="0">Ne pas les compter</option></select></label>
      </div>
      <h3>Vente et livraison</h3>
      <div className={c.grid}>
        {N("tva", "TVA (%)", undefined, 0.1)}
        <label className={c.field}><span>Modèle supposé (voiture pas encore vendue)</span><select value={set.defaultModel} onChange={e => upd({ defaultModel: e.target.value as VehicleKey })}>{MODELS.map(([k, v]) => <option key={k} value={k}>{v.label} — {eur(v.price)} TTC</option>)}</select></label>
        {N("deliveryCost", "Coût réel d’une livraison sans tournée (€)")}
        {N("registrationCost", "Coût réel de la carte grise (€)", "Les 150 € facturés sont un service : mettre ici ce que la carte grise coûte vraiment.")}
        {N("storage", "Stockage (€ / voiture / mois)")}
        {N("partsMarginPct", "Marge pièces si prix d’achat inconnu (%)")}
      </div>
      <h3>Charges habituelles (comptées chaque mois)</h3>
      <label className={c.field} style={{ maxWidth: 260 }}><span>À partir du mois</span><input type="month" value={set.startMonth || r.months[0]?.month || nowM} onChange={e => upd({ startMonth: e.target.value })} /></label>
      <div className={c.tableWrap}><table className={c.table}><thead><tr><th>Libellé</th><th>Montant (€)</th><th>Le montant est</th><th>HT / mois</th><th></th></tr></thead>
        <tbody>{set.recurring.map((x, i) => <tr key={i}>
          <td className={c.left}><input className={c.input} value={x.label} onChange={e => upd({ recurring: set.recurring.map((y, j) => j === i ? { ...y, label: e.target.value } : y) })} /></td>
          <td><input className={c.small} type="number" value={x.amount} onChange={e => upd({ recurring: set.recurring.map((y, j) => j === i ? { ...y, amount: Number(e.target.value) || 0 } : y) })} /></td>
          <td><select className={c.small} value={x.ttc ? "ttc" : "ht"} onChange={e => upd({ recurring: set.recurring.map((y, j) => j === i ? { ...y, ttc: e.target.value === "ttc" } : y) })}><option value="ttc">TTC</option><option value="ht">HT / sans TVA</option></select></td>
          <td>{eur(x.ttc ? x.amount / (1 + set.tva / 100) : x.amount)}</td>
          <td><button className={`${c.btn} ${c.btnLight}`} style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => upd({ recurring: set.recurring.filter((_, j) => j !== i) })}>✕</button></td></tr>)}</tbody>
        <tfoot><tr><td>Total</td><td></td><td></td><td>{eur(r.recurringMonthlyHt)}</td><td></td></tr></tfoot></table></div>
      <button className={`${c.btn} ${c.btnLight}`} onClick={() => upd({ recurring: [...set.recurring, { label: "Nouvelle charge", amount: 0, ttc: true }] })}>➕ Ajouter une charge habituelle</button>
      <div className={c.saveBar}>
        <button className={`${c.btn} ${c.btnLight}`} onClick={() => { if (confirm("Revenir aux valeurs par défaut ? (les corrections par dossier et par VIN sont gardées)")) upd({ ...DEFAULT_SETTINGS, ships: set.ships, vins: set.vins }); }}>Valeurs par défaut</button>
        <button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={!dirty || busy === "save"}>{busy === "save" ? "…" : dirty ? "💾 Enregistrer" : "✓ Enregistré"}</button>
      </div>
    </section> : null}
  </div></main>;
}
