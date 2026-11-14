"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import c from "../giga.module.css";
import { Login, STATUS, Sources, Unauthorized, fmtDate, gigaApi, host, storedCode } from "../client";
import type { GigaReport } from "../../../lib/giga";

type Row = { id: string; created_at: string; period: string | null; status: string; error: string | null; cost_tokens: number | null; report: GigaReport | null; internal: unknown; sources: { sujet: string; sources: { url: string; title?: string }[] }[] | null };

const effortClass = (e: string) => { const t = (e || "").toLowerCase(); return t.includes("faible") ? c.e_faible : t.includes("fort") || t.includes("élev") ? c.e_fort : t.includes("moyen") ? c.e_moyen : ""; };
const List = ({ items }: { items?: string[] }) => items?.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className={c.small}>—</p>;

export default function GigaReportPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [row, setRow] = useState<Row | null>(null); const [msg, setMsg] = useState("");

  const load = useCallback(async (code = storedCode()) => {
    try { const j = await gigaApi<{ report: Row }>({ action: "get", id }, code); setRow(j.report); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("error"); }
  }, [id]);
  useEffect(() => { load().catch(() => null); }, [load]);
  useEffect(() => { if (row?.status !== "running") return; const t = setInterval(() => load().catch(() => null), 8000); return () => clearInterval(t); }, [row?.status, load]);

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;
  if (state === "error" || !row) return <main className={c.page}><div className={c.wrap}><Link href="/giga" className={c.back}>← Tous les rapports</Link><p className={c.msg}>{msg || "Rapport introuvable"}</p></div></main>;

  const r = row.report;
  const head = <>
    <div className={`${c.top} ${c.noPrint}`}>
      <Link href="/giga" className={c.back}>← Tous les rapports</Link>
      {r ? <button className={`${c.btn} ${c.btnGhost}`} onClick={() => window.print()}>🖨️ Imprimer / PDF</button> : null}
    </div>
    <p className={c.kicker}>🧠 Giga Analyse</p>
    <h1 className={c.h1}>{row.period || "Analyse"}</h1>
    <p className={c.muted}>{fmtDate(row.created_at)} · <span className={`${c.badge} ${c["b_" + row.status] || ""}`}>{STATUS[row.status] || row.status}</span></p>
  </>;

  if (!r) return <main className={c.page}><div className={c.wrap}>{head}
    {row.status === "running" ? <div className={c.card} style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}><span className={c.spin} /> L’IA lit vos chiffres et l’actualité du marché… (2 à 4 minutes, la page se met à jour toute seule)</div>
      : <p className={c.msg}>{row.error || "L’analyse s’est arrêtée avant la fin."}</p>}
  </div></main>;

  const meta = r._meta;
  return <main className={c.page}><div className={c.wrap}>{head}

    <section className={c.section}>
      <div className={c.resume}>
        <ul>{r.resume.slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul>
        {meta && !meta.web_search ? <div className={c.warn}>⚠️ La recherche web n’a pas fonctionné cette fois : ce rapport s’appuie surtout sur les chiffres internes. Les faits externes ne sont pas vérifiés.</div> : null}
      </div>
    </section>

    {r.priorites_2_semaines.length ? <section className={c.section}>
      <h2 className={c.h2}>✅ Priorités des 2 prochaines semaines</h2>
      <ol className={c.prio}>{r.priorites_2_semaines.map((p, i) => <li key={i}>{p}</li>)}</ol>
    </section> : null}

    {r.chiffres_cles.length ? <section className={c.section}>
      <h2 className={c.h2}>📊 Chiffres clés</h2>
      <div className={c.stats}>{r.chiffres_cles.map((k, i) => <div key={i} className={c.stat}>
        <p className={c.statLabel}>{k.libelle}</p><p className={c.statValue}>{k.valeur}</p>
        {k.commentaire ? <p className={c.statNote}>{k.commentaire}</p> : null}
        {k.source && /^https?:/.test(k.source) ? <p className={c.statNote}><a href={k.source} target="_blank" rel="noopener noreferrer nofollow">↗ {host(k.source)}</a></p> : k.source ? <p className={c.statNote}>Source : {k.source}</p> : null}
      </div>)}</div>
    </section> : null}

    {r.opportunites.length ? <section className={c.section}>
      <h2 className={c.h2}>🚀 Opportunités</h2>
      <div className={c.grid2}>{r.opportunites.map((o, i) => <article key={i} className={c.opp}>
        <h3 className={c.oppTitle}>{o.titre}</h3>
        <div className={c.pills}>
          {o.effort ? <span className={`${c.pill} ${effortClass(o.effort)}`}>Effort : {o.effort}</span> : null}
          {o.horizon ? <span className={c.pill}>⏱ {o.horizon}</span> : null}
        </div>
        <p className={c.oppWhy}>{o.pourquoi}</p>
        {o.impact_estime ? <div className={c.impact}>💶 {o.impact_estime}</div> : null}
        {o.actions?.length ? <ul className={c.actions}>{o.actions.map((a, j) => <li key={j}>{a}</li>)}</ul> : null}
        <Sources urls={o.sources} />
      </article>)}</div>
    </section> : null}

    {r.menaces.length ? <section className={c.section}>
      <h2 className={c.h2}>⚠️ Menaces</h2>
      <div className={c.grid2}>{r.menaces.map((m, i) => <article key={i} className={`${c.opp} ${c.threat}`}>
        <h3 className={c.oppTitle}>{m.titre}</h3>
        {m.pourquoi ? <p className={c.oppWhy}>{m.pourquoi}</p> : null}
        {m.parade ? <p className={c.oppWhy}><b>Parade :</b> {m.parade}</p> : null}
        <Sources urls={m.sources} />
      </article>)}</div>
    </section> : null}

    {r.produits_a_tester.length ? <section className={c.section}>
      <h2 className={c.h2}>📦 Produits à tester</h2>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Produit</th><th>Prix usine (estim.)</th><th>Prix de vente (estim.)</th><th>Marge (estim.)</th><th>Sources</th></tr></thead>
        <tbody>{r.produits_a_tester.map((p, i) => <tr key={i}>
          <td><b>{p.produit}</b>{p.note ? <div className={c.small}>{p.note}</div> : null}</td>
          <td className={c.num}>{p.prix_usine_estime}</td><td className={c.num}>{p.prix_vente_estime}</td><td className={c.num}><b>{p.marge_estimee}</b></td>
          <td><Sources urls={p.sources} /></td>
        </tr>)}</tbody>
      </table></div>
      <p className={c.small} style={{ marginTop: 8 }}>Estimations à vérifier avec des devis fournisseurs (transport, douane, homologation, SAV non toujours inclus).</p>
    </section> : null}

    {r.marketing.length ? <section className={c.section}>
      <h2 className={c.h2}>📣 Idées marketing</h2>
      <div className={c.mk}>{r.marketing.map((m, i) => <div key={i} className={c.card}>
        <b>{m.idee}</b>{m.canal ? <span className={c.pill} style={{ marginLeft: 8 }}>{m.canal}</span> : null}
        {m.pourquoi ? <p className={c.oppWhy} style={{ marginTop: 6 }}>{m.pourquoi}</p> : null}
        <Sources urls={m.sources} />
      </div>)}</div>
    </section> : null}

    {r.scenarios.length ? <section className={c.section}>
      <h2 className={c.h2}>🗺️ Scénarios de croissance</h2>
      <div className={c.timeline}>{r.scenarios.map((s, i) => <div key={i} className={c.step}>
        <span className={c.dot} />
        <div className={c.card}>
          <div className={c.stepHead}><p className={c.stepName}>{s.nom}</p><span className={c.target}>{s.ca_cible}</span></div>
          <p className={c.small}>Horizon : {s.horizon_annees} {typeof s.horizon_annees === "number" ? (s.horizon_annees > 1 ? "ans" : "an") : ""}</p>
          <div className={c.cols}>
            <div><p className={c.colTitle}>Étapes</p><List items={s.etapes} /></div>
            <div><p className={c.colTitle}>Hypothèses</p><List items={s.hypotheses} /></div>
            <div><p className={c.colTitle}>Risques</p><List items={s.risques} /></div>
          </div>
        </div>
      </div>)}</div>
    </section> : null}

    {r.sources.length ? <section className={c.section}>
      <h2 className={c.h2}>🔗 Sources</h2>
      <div className={c.card}><ol className={c.sources}>{r.sources.filter(u => /^https?:/.test(u)).map(u => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow">{host(u)}</a> <span className={c.small}>{u.length > 90 ? u.slice(0, 90) + "…" : u}</span></li>)}</ol></div>
    </section> : null}

    <section className={`${c.section} ${c.noPrint}`}>
      <div className={c.card}>
        <p className={c.small} style={{ margin: 0 }}>
          {meta ? <>Recherche web : {meta.web_search ? `oui (${meta.tool || "web"})` : "non"} · Modèles : {meta.models?.research} + {meta.models?.synthesis}{meta.email ? ` · E-mail : ${meta.email}` : ""} · </> : null}
          {row.cost_tokens ? `${row.cost_tokens.toLocaleString("fr-FR")} jetons IA` : null}
        </p>
        {meta?.topics?.some(t => !t.ok) ? <p className={c.small}>Sujets sans recherche web : {meta.topics.filter(t => !t.ok).map(t => t.titre).join(", ")}</p> : null}
        <details className={c.details} style={{ marginTop: 10 }}><summary>Chiffres internes envoyés à l’IA (sans données personnelles)</summary><pre className={c.pre}>{JSON.stringify(row.internal, null, 2)}</pre></details>
        <p className={c.small} style={{ marginBottom: 0 }}>Rapport généré par IA : les estimations sont indiquées comme telles. Vérifiez les sources avant une décision importante.</p>
      </div>
    </section>
  </div></main>;
}
