"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import c from "../giga.module.css";
import { Login, Unauthorized, gigaApi, storedCode } from "../client";
import type { Plan, PlanProduct, Supplier } from "../../../lib/giga-plan";

const PRODUCT_STATUS: Record<string, string> = { a_lancer: "À lancer", devis: "Devis demandés", echantillon: "Échantillon commandé", test: "Test en cours", valide: "Validé (dans chaque conteneur)", arrete: "Arrêté" };
const SUPPLIER_STATUS: Record<string, string> = { a_contacter: "À contacter", contacte: "Contacté", devis_recu: "Devis reçu", echantillon: "Échantillon", retenu: "Retenu", ecarte: "Écarté" };
const VERDICT_BG: Record<string, string> = { TOP: "#0a7a3d", TEST: "#c2741d", BON: "#2563eb" };
const STATUS_BG: Record<string, string> = { a_lancer: "#f1ede6", devis: "#eef6ff", echantillon: "#fff4d6", test: "#fff4d6", valide: "#e7f6ec", arrete: "#fde8e7" };

type ListRow = { year: number; updated_at: string; titre: string };

export default function GigaPlanPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [who, setWho] = useState("");
  const [plans, setPlans] = useState<ListRow[]>([]); const [year, setYear] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null); const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");

  const loadPlan = useCallback(async (y: number, code: string) => {
    const j = await gigaApi<{ plan: Plan }>({ action: "plan_get", year: y }, code);
    setPlan(j.plan); setYear(y); setDirty(false);
  }, []);
  const load = useCallback(async (code = storedCode(), pick?: number) => {
    try {
      const j = await gigaApi<{ plans: ListRow[]; who: string }>({ action: "plan_list" }, code);
      setPlans(j.plans); setWho(j.who); setPc(code); setState("ready");
      const now = new Date().getFullYear();
      const y = pick ?? (j.plans.find(p => p.year === now) || [...j.plans].sort((a, b) => a.year - b.year).find(p => p.year > now) || j.plans[0])?.year;
      if (y) await loadPlan(y, code);
    } catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, [loadPlan]);
  useEffect(() => { load().catch(() => null); }, [load]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const upd = (fn: (p: Plan) => void) => setPlan(p => { if (!p) return p; const n: Plan = JSON.parse(JSON.stringify(p)); fn(n); return n; });
  const updProd = (id: string, fn: (q: PlanProduct) => void) => { upd(p => { const q = p.produits.find(x => x.id === id); if (q) fn(q); }); setDirty(true); };

  const save = async () => {
    if (!plan || !year) return; setBusy("save"); setMsg("");
    try { const j = await gigaApi<{ plan: Plan }>({ action: "plan_save", year, plan }, pc); setPlan(j.plan); setDirty(false); setMsg("✅ Plan enregistré. La prochaine Giga Analyse en tiendra compte."); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  };
  const next = async () => {
    if (!year) return;
    if (dirty && !confirm("Des modifications ne sont pas enregistrées. Continuer quand même ?")) return;
    if (!confirm(`Créer le plan ${year + 1} ? L'IA part du plan ${year} (statuts, fournisseurs) et des derniers rapports. Cela prend 1 à 3 minutes et coûte environ 0,20 € d'IA.`)) return;
    setBusy("next"); setMsg("");
    try { const j = await gigaApi<{ year: number; ai: boolean }>({ action: "plan_next", from: year }, pc); setMsg(j.ai ? `✅ Plan ${j.year} proposé par l'IA : relisez-le et corrigez ce qu'il faut.` : `Plan ${j.year} créé en copie (la proposition IA a échoué).`); await load(pc, j.year); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;

  const counts = plan ? Object.keys(PRODUCT_STATUS).map(k => [k, plan.produits.filter(q => q.statut === k).length] as const).filter(([, n]) => n) : [];

  return <main className={c.page}><div className={c.wrap}>
    <div className={`${c.top} ${c.noPrint}`}>
      <Link href="/giga" className={c.back}>← Giga Analyse</Link>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {plans.map(p => <button key={p.year} className={`${c.btn} ${p.year === year ? c.btnBrand : c.btnGhost}`} onClick={() => { if (dirty && !confirm("Modifications non enregistrées : changer d'année quand même ?")) return; loadPlan(p.year, pc).catch(e => setMsg((e as Error).message)); }}>{p.year}</button>)}
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>
    </div>
    <p className={c.kicker}>🧠 Giga Analyse · Plan annuel</p>
    <h1 className={c.h1}>📋 Plan {year ?? ""}</h1>
    {plan ? <p className={c.muted}>{plan.titre}</p> : null}
    {msg ? <p className={c.msg}>{msg}</p> : null}

    {!plan ? <div className={`${c.card} ${c.empty}`}>Aucun plan pour l'instant.</div> : <>
      <section className={c.section}>
        <div className={c.resume}><ul>{plan.resume.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
        {plan.source ? <p className={c.small} style={{ marginTop: 8 }}>{plan.source}</p> : null}
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🎯 Objectifs de l'année</h2>
        <ol className={c.prio}>{plan.objectifs.map((o, i) => <li key={i}>{o}</li>)}</ol>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🏆 Classement des produits</h2>
        {counts.length ? <div className={c.pills} style={{ marginBottom: 10 }}>{counts.map(([k, n]) => <span key={k} className={c.pill} style={{ background: STATUS_BG[k] }}>{PRODUCT_STATUS[k]} : {n}</span>)}</div> : null}
        <div className={c.tableWrap}><table className={c.table}>
          <thead><tr><th>#</th><th>Produit</th><th>Verdict</th><th>Note</th><th>Marge / unité</th><th>Ventes/mois (croisière)</th><th>Marge/mois</th><th>Statut</th></tr></thead>
          <tbody>{plan.produits.map(q => <tr key={q.id}>
            <td className={c.num}>{q.rang}</td><td><a href={`#p-${q.id}`} style={{ color: "inherit", fontWeight: 700 }}>{q.nom}</a></td>
            <td><span className={c.badge} style={{ background: VERDICT_BG[q.verdict], color: "#fff" }}>{q.verdict}</span></td>
            <td className={c.num}>{q.note}</td><td className={c.num}>{q.marge_unite}</td><td>{q.ventes_croisiere}</td><td className={c.num}><b>{q.marge_mois}</b></td>
            <td><span className={c.pill} style={{ background: STATUS_BG[q.statut] }}>{PRODUCT_STATUS[q.statut]}</span></td>
          </tr>)}</tbody>
        </table></div>
        <p className={c.small} style={{ marginTop: 8 }}>Chiffres = estimations à confirmer par devis. Mettez à jour le statut et les fournisseurs : chaque Giga Analyse s'en sert pour vous dire quoi faire ensuite.</p>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>📦 Fiches produits et fournisseurs</h2>
        <div style={{ display: "grid", gap: 12 }}>{plan.produits.map(q => <ProductCard key={q.id} q={q} onChange={fn => updProd(q.id, fn)} />)}</div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🗓️ Calendrier</h2>
        <div className={c.timeline}>{plan.calendrier.map((s, i) => <div key={i} className={c.step}><span className={c.dot} /><div className={c.card}><p className={c.stepName}>{s.periode}</p><ul className={c.actions} style={{ marginTop: 6 }}>{s.actions.map((a, j) => <li key={j}>{a}</li>)}</ul></div></div>)}</div>
      </section>

      {plan.chargement.length ? <section className={c.section}>
        <h2 className={c.h2}>🚢 Chargement d'un conteneur</h2>
        <div className={c.grid2}>{plan.chargement.map((z, i) => <div key={i} className={c.opp}><h3 className={c.oppTitle}>{z.zone}</h3><ul className={c.actions}>{z.contenu.map((x, j) => <li key={j}>{x}</li>)}</ul></div>)}</div>
      </section> : null}

      <section className={c.section}>
        <h2 className={c.h2}>📏 Règles</h2>
        <div className={c.card}><ul className={c.actions}>{plan.regles.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      </section>

      {plan.plus_tard.length ? <section className={c.section}>
        <h2 className={c.h2}>⏸️ Plus tard ou à éviter</h2>
        <div className={c.grid2}>{plan.plus_tard.map((x, i) => <div key={i} className={c.opp}><h3 className={c.oppTitle}>{x.nom}</h3><p className={c.oppWhy}>{x.raison}</p></div>)}</div>
      </section> : null}

      {plan.interdits.length ? <section className={c.section}>
        <h2 className={c.h2}>⛔ Interdit</h2>
        <div className={c.grid2}>{plan.interdits.map((x, i) => <div key={i} className={`${c.opp} ${c.threat}`}><h3 className={c.oppTitle}>{x.nom}</h3><p className={c.oppWhy}>{x.raison}</p></div>)}</div>
      </section> : null}

      {who === "owner" && year && year === Math.max(...plans.map(p => p.year)) ? <section className={`${c.section} ${c.noPrint}`}>
        <div className={c.card}>
          <h3 className={c.oppTitle}>Nouvelle année</h3>
          <p className={c.oppWhy} style={{ margin: "6px 0 12px" }}>En fin d'année, l'IA prépare le plan {year + 1} à partir de ce plan (statuts, fournisseurs retenus) et des derniers rapports. Vous le relisez et le corrigez ici.</p>
          <button className={`${c.btn} ${c.btnGhost}`} onClick={next} disabled={!!busy}>{busy === "next" ? <><span className={c.spin} /> L'IA prépare le plan…</> : `✨ Créer le plan ${year + 1}`}</button>
        </div>
      </section> : null}
    </>}

    {dirty ? <div className={c.noPrint} style={{ position: "sticky", bottom: 12, marginTop: 20, display: "flex", justifyContent: "center" }}>
      <button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={!!busy} style={{ boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>{busy === "save" ? "Enregistrement…" : "💾 Enregistrer les modifications"}</button>
    </div> : null}
  </div></main>;
}

function ProductCard({ q, onChange }: { q: PlanProduct; onChange: (fn: (q: PlanProduct) => void) => void }) {
  const field = (label: string, v: string) => v ? <div><p className={c.colTitle}>{label}</p><p className={c.oppWhy}>{v}</p></div> : null;
  const setSup = (i: number, k: keyof Supplier, v: string) => onChange(x => { (x.fournisseurs[i] as Record<string, unknown>)[k] = v; });
  return <details id={`p-${q.id}`} className={c.card} style={{ padding: 0 }}>
    <summary style={{ padding: "14px 18px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <b>#{q.rang} {q.nom}</b>
      <span className={c.badge} style={{ background: VERDICT_BG[q.verdict], color: "#fff" }}>{q.verdict} · {q.note}/100</span>
      <span className={c.pill} style={{ background: STATUS_BG[q.statut] }}>{PRODUCT_STATUS[q.statut]}</span>
      <span className={c.small}>{q.fournisseurs.length} fournisseur{q.fournisseurs.length > 1 ? "s" : ""}</span>
    </summary>
    <div style={{ padding: "0 18px 18px", display: "grid", gap: 14 }}>
      <div className={c.stats}>
        {[["Prix usine", q.prix_usine], ["Prix de vente", q.prix_vente], ["Marge / unité", q.marge_unite], ["Ventes/mois an 1", q.ventes_an1], ["Ventes/mois croisière", q.ventes_croisiere], ["Marge/mois croisière", q.marge_mois]].map(([l, v]) => <div key={l} className={c.stat}><p className={c.statLabel}>{l}</p><p className={c.statValue} style={{ fontSize: 16 }}>{v || "—"}</p></div>)}
      </div>
      <div className={c.cols}>
        {field("Concurrence", q.concurrence)}{field("Clients", q.clients)}{field("Place dans le conteneur", q.place)}
        {field("Votre positionnement", q.positionnement)}{field("Attention", q.attention)}{field(`Premier test${q.budget_test ? " (" + q.budget_test + ")" : ""}`, q.premier_test)}
      </div>
      {q.mots_cles.length ? <div><p className={c.colTitle}>Mots-clés pour trouver des fournisseurs</p><div className={c.src}>{q.mots_cles.map(k => <a key={k} href={`https://www.made-in-china.com/multi-search/${encodeURIComponent(k)}/F1/1.html`} target="_blank" rel="noopener noreferrer nofollow">🔎 {k}</a>)}</div></div> : null}

      <div className={c.noPrint} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label className={c.small}>Statut du produit{" "}
          <select className={c.input} style={{ padding: "8px 10px", fontSize: 14 }} value={q.statut} onChange={e => onChange(x => { x.statut = e.target.value; })}>
            {Object.entries(PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className={c.colTitle}>Fournisseurs</p>
        {q.fournisseurs.length ? <div className={c.tableWrap}><table className={c.table} style={{ minWidth: 820 }}>
          <thead><tr><th>Nom</th><th>Lien / contact</th><th>Prix</th><th>MOQ</th><th>Statut</th><th>Notes</th><th /></tr></thead>
          <tbody>{q.fournisseurs.map((f, i) => <tr key={i}>
            <td><input className={c.input} style={inp} value={f.nom} onChange={e => setSup(i, "nom", e.target.value)} />{!f.verifie ? <div className={c.small}>non vérifié</div> : null}</td>
            <td><input className={c.input} style={inp} placeholder="https://…" value={f.lien || ""} onChange={e => setSup(i, "lien", e.target.value)} /><input className={c.input} style={{ ...inp, marginTop: 4 }} placeholder="Contact (WeChat, e-mail…)" value={f.contact || ""} onChange={e => setSup(i, "contact", e.target.value)} /></td>
            <td><input className={c.input} style={{ ...inp, width: 110 }} value={f.prix || ""} onChange={e => setSup(i, "prix", e.target.value)} /></td>
            <td><input className={c.input} style={{ ...inp, width: 70 }} value={f.moq || ""} onChange={e => setSup(i, "moq", e.target.value)} /></td>
            <td><select className={c.input} style={inp} value={f.statut} onChange={e => setSup(i, "statut", e.target.value)}>{Object.entries(SUPPLIER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
            <td><textarea className={c.input} style={{ ...inp, minWidth: 180 }} rows={2} value={f.notes || ""} onChange={e => setSup(i, "notes", e.target.value)} /></td>
            <td><button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 10px" }} title="Retirer" onClick={() => { if (confirm(`Retirer ${f.nom || "ce fournisseur"} ?`)) onChange(x => { x.fournisseurs.splice(i, 1); }); }}>✕</button></td>
          </tr>)}</tbody>
        </table></div> : <p className={c.small}>Aucun fournisseur pour l'instant : utilisez les mots-clés ci-dessus, puis ajoutez-les ici.</p>}
        <button className={`${c.btn} ${c.btnGhost} ${c.noPrint}`} style={{ marginTop: 8, padding: "8px 12px", fontSize: 14 }} onClick={() => onChange(x => { x.fournisseurs.push({ nom: "", statut: "a_contacter", verifie: true }); })}>+ Ajouter un fournisseur</button>
      </div>

      <div>
        <p className={c.colTitle}>Notes (résultats du test, ventes, problèmes)</p>
        <textarea className={c.input} style={{ width: "100%", fontSize: 14 }} rows={3} value={q.notes || ""} onChange={e => onChange(x => { x.notes = e.target.value; })} placeholder="Ex. : 3 devis reçus, échantillon commandé le…, 12 réservations, marge réelle…" />
      </div>
    </div>
  </details>;
}

const inp = { padding: "6px 8px", fontSize: 13.5, borderRadius: 8, width: "100%" } as const;
