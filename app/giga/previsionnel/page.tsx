"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import c from "../giga.module.css";
import { Login, Unauthorized, gigaApi, storedCode } from "../client";
import { MONTHS, ROLE_STATUS, computeForecast, fixedCost, type ForecastData, type RoleStatus, type Scenario } from "../../../lib/forecast";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const ROLE_BG: Record<RoleStatus, string> = { a_faire: "#f1ede6", en_cours: "#fff4d6", fait: "#e7f6ec", annule: "#fde8e7" };
/** Index du mois en cours dans le prévisionnel (0 = décembre 2026). */
const nowIndex = () => { const d = new Date(); return Math.max(0, Math.min(MONTHS.length - 1, (d.getFullYear() - 2026) * 12 + d.getMonth() - 11)); };

export default function PrevisionnelPage() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "denied">("loading");
  const [pc, setPc] = useState(""); const [d, setD] = useState<ForecastData | null>(null);
  const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [updated, setUpdated] = useState<string | null>(null);

  const load = useCallback(async (code = storedCode()) => {
    try { const j = await gigaApi<{ data: ForecastData; updated_at: string | null }>({ action: "forecast_get" }, code); setD(j.data); setUpdated(j.updated_at); setPc(code); setDirty(false); setState("ready"); }
    catch (e) {
      if (e instanceof Unauthorized) { setState("login"); throw e; }
      if ((e as { status?: number }).status === 403) { setState("denied"); return; }
      setMsg((e as Error).message); setState("ready");
    }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const upd = (fn: (x: ForecastData) => void) => { setD(p => { if (!p) return p; const n: ForecastData = JSON.parse(JSON.stringify(p)); fn(n); return n; }); setDirty(true); };
  const save = async () => {
    if (!d) return; setBusy(true); setMsg("");
    try { const j = await gigaApi<{ data: ForecastData }>({ action: "forecast_save", data: d }, pc); setD(j.data); setDirty(false); setUpdated(new Date().toISOString()); setMsg("✅ Prévisionnel enregistré."); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  const rows = useMemo(() => d ? computeForecast(d) : [], [d]);
  const other = useMemo(() => d ? computeForecast(d, d.scenario === "moyen" ? "agressif" : "moyen") : [], [d]);

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;
  if (state === "denied") return <main className={c.page}><div className={c.wrap}><Link href="/giga" className={c.back}>← Giga Analyse</Link><div className={`${c.card} ${c.empty}`} style={{ marginTop: 16 }}>Le prévisionnel est réservé au fondateur.</div></div></main>;
  if (!d) return <main className={c.page}><div className={c.wrap}><p className={c.err}>{msg || "Prévisionnel indisponible."}</p></div></main>;

  const i = nowIndex(); const cur = rows[i]; const h = d.hyp;
  const totalYear = rows.slice(1).reduce((t, r) => t + r.vendus, 0);
  const minCash = Math.min(...rows.map(r => r.caisse));
  const cell = { padding: "6px 8px", whiteSpace: "nowrap" as const };
  const numIn = (v: number | null | undefined, on: (n: number | null) => void, w = 64) => <input className={c.input} style={{ width: w, padding: "4px 6px", fontSize: 13 }} inputMode="numeric" value={v ?? ""} placeholder="–" onChange={e => { const t = e.target.value.replace(/[^\d-]/g, ""); on(t === "" ? null : Number(t)); }} />;

  return <main className={c.page}><div className={c.wrap}>
    <div className={`${c.top} ${c.noPrint}`}>
      <Link href="/giga" className={c.back}>← Giga Analyse</Link>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/giga/meta-realiste" className={`${c.btn} ${c.btnGhost}`}>🎯 Méta-analyse réaliste</Link>
        <Link href="/giga/plan" className={`${c.btn} ${c.btnGhost}`}>📋 Plan produits</Link>
        <button className={`${c.btn} ${c.btnGhost}`} onClick={() => window.print()}>🖨️ Imprimer</button>
        <button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={busy || !dirty}>{busy ? "…" : dirty ? "💾 Enregistrer" : "Enregistré"}</button>
      </div>
    </div>
    <p className={c.kicker}>🧠 Giga Analyse · Prévisionnel</p>
    <h1 className={c.h1}>📈 Prévisionnel 2027</h1>
    <p className={c.muted}>Trésorerie, commandes, recrutements et étapes, mois par mois. Chaque fin de mois, saisissez les ventes et la caisse réelles : les mois suivants se recalculent.{updated ? ` Dernière mise à jour : ${new Date(updated).toLocaleDateString("fr-FR")}.` : ""}</p>
    {msg ? <p className={c.msg}>{msg}</p> : null}

    <div style={{ display: "flex", gap: 8, margin: "14px 0", flexWrap: "wrap" }}>
      {(["moyen", "agressif"] as Scenario[]).map(s => <button key={s} className={`${c.btn} ${d.scenario === s ? c.btnBrand : c.btnGhost}`} onClick={() => upd(x => { x.scenario = s; })}>{s === "moyen" ? "🟢 Plan moyen" : "🔥 Plan agressif"}</button>)}
    </div>

    <div className={c.stats}>
      <div className={c.stat}><p className={c.statLabel}>Caisse fin {cur.mois}</p><p className={c.statValue} style={{ color: cur.caisse < h.seuil_alerte ? "#b42318" : undefined }}>{eur(cur.caisse)}</p><p className={c.statNote}>Réserve de {eur(h.reserve)} non comptée</p></div>
      <div className={c.stat}><p className={c.statLabel}>Ventes {cur.mois}</p><p className={c.statValue}>{cur.vendus}</p><p className={c.statNote}>{cur.direct} directes + {cur.partenaires} partenaires{cur.reel ? " (réel)" : " (prévu)"}</p></div>
      <div className={c.stat}><p className={c.statLabel}>À commander ce mois</p><p className={c.statValue}>{cur.commande}</p><p className={c.statNote}>{cur.commande / 9} conteneur(s), acompte {eur(cur.commande * h.prix_usine * h.acompte_pct / 100)}</p></div>
      <div className={c.stat}><p className={c.statLabel}>Stock fin de mois</p><p className={c.statValue}>{cur.stock}</p><p className={c.statNote}>{totalYear} ventes prévues en 2027 · caisse mini {eur(minCash)}</p></div>
    </div>

    <section className={c.section}>
      <h2 className={c.h2}>💶 Trésorerie mois par mois ({d.scenario === "moyen" ? "plan moyen" : "plan agressif"})</h2>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Mois</th><th>Ventes (dir. + part.)</th><th>À commander</th><th>Arrivées</th><th>Stock fin</th><th>Encaissé net</th><th>Achats + import</th><th>Frais fixes</th><th>Caisse fin</th><th>Ventes réelles dir. / part.</th><th>Caisse réelle</th></tr></thead>
        <tbody>{rows.map((r, m) => <tr key={m} style={{ background: m === i ? "#fff7ed" : undefined }}>
          <td style={cell}><b>{r.mois}</b></td>
          <td style={cell}>{r.vendus} ({r.direct} + {r.partenaires}){r.reel ? " ✅" : ""}</td>
          <td style={cell} className={c.num}><b>{r.commande}</b></td>
          <td style={cell} className={c.num}>{r.arrivees}</td>
          <td style={cell} className={c.num}>{r.stock}</td>
          <td style={cell} className={c.num}>{eur(r.encaisse)}</td>
          <td style={cell} className={c.num}>{eur(r.sorties)}</td>
          <td style={cell} className={c.num}>{eur(r.fixes)}</td>
          <td style={{ ...cell, color: r.caisse < h.seuil_alerte ? "#b42318" : undefined, fontWeight: 800 }} className={c.num}>{eur(r.caisse)}{r.caisseReelle ? " ✅" : ""}</td>
          <td style={cell}>{numIn(d.reels[m]?.direct, n => upd(x => { x.reels[m] = { ...x.reels[m], direct: n }; }), 52)} {numIn(d.reels[m]?.partenaires, n => upd(x => { x.reels[m] = { ...x.reels[m], partenaires: n }; }), 52)}</td>
          <td style={cell}>{numIn(d.reels[m]?.caisse, n => upd(x => { x.reels[m] = { ...x.reels[m], caisse: n }; }), 90)}</td>
        </tr>)}</tbody>
      </table></div>
      <p className={c.small} style={{ marginTop: 8 }}>En rouge : caisse sous {eur(h.seuil_alerte)}, il faut décaler un départ d'usine ou ralentir les commandes. « À commander » = véhicules à commander ce mois pour couvrir les ventes de dans 3 mois, arrondi au conteneur de 9. L'autre plan ({d.scenario === "moyen" ? "agressif" : "moyen"}) donne {other.slice(1).reduce((t, r) => t + r.vendus, 0)} ventes en 2027 et une caisse fin 2027 de {eur(other[other.length - 1]?.caisse || 0)}.</p>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>🎯 Ventes prévues par mois</h2>
      <p className={c.small}>Modifiez la demande prévue (directes et partenaires) du plan affiché.</p>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Mois</th>{MONTHS.map(mo => <th key={mo}>{mo}</th>)}</tr></thead>
        <tbody>
          <tr><td style={cell}><b>Directes</b></td>{d.demande[d.scenario].direct.map((v, m) => <td key={m} style={cell}>{numIn(v, n => upd(x => { x.demande[x.scenario].direct[m] = Math.max(0, n ?? 0); }), 48)}</td>)}</tr>
          <tr><td style={cell}><b>Partenaires</b></td>{d.demande[d.scenario].partenaires.map((v, m) => <td key={m} style={cell}>{numIn(v, n => upd(x => { x.demande[x.scenario].partenaires[m] = Math.max(0, n ?? 0); }), 48)}</td>)}</tr>
        </tbody>
      </table></div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>👥 Recrutements</h2>
      <p className={c.small}>Le coût de chaque poste compte dans les frais fixes à partir de son mois, sauf s'il est « Annulé ». Recrutez seulement quand le déclencheur est atteint.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        {[...d.roles].map((r, k) => ({ r, k })).sort((a, b) => a.r.mois - b.r.mois).map(({ r, k }) => <div key={r.id} className={c.card} style={{ background: ROLE_BG[r.statut], padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <p className={c.stepName} style={{ fontSize: 17 }}>{MONTHS[r.mois]} · {r.role}</p>
            <select className={c.input} style={{ width: "auto" }} value={r.statut} onChange={e => upd(x => { x.roles[k].statut = e.target.value as RoleStatus; })}>{Object.entries(ROLE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <p className={c.rowText}>{r.mission}</p>
          <p className={c.rowText}><b>Déclencheur :</b> {r.declencheur}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
            <label className={c.small}>Coût mensuel {numIn(r.cout, n => upd(x => { x.roles[k].cout = Math.max(0, n ?? 0); }), 80)} €</label>
            <label className={c.small}>Mois de départ <select className={c.input} style={{ width: "auto", padding: "4px 6px" }} value={r.mois} onChange={e => upd(x => { x.roles[k].mois = Number(e.target.value); })}>{MONTHS.map((mo, m) => <option key={mo} value={m}>{mo}</option>)}</select></label>
          </div>
        </div>)}
      </div>
      <p className={c.small} style={{ marginTop: 8 }}>Frais fixes en {MONTHS[i]} : {eur(fixedCost(d, i))} · en décembre 2027 : {eur(fixedCost(d, MONTHS.length - 1))}.</p>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>🗓️ Étapes du mois</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {d.etapes.map((s, m) => { const done = s.items.filter(x => x.fait).length; return <div key={m} className={c.card} style={{ padding: 16, borderColor: m === i ? "#f05a28" : undefined, borderWidth: m === i ? 2 : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <p className={c.stepName} style={{ fontSize: 17 }}>{s.mois}{m === i ? " · ce mois-ci" : ""}</p>
            <span className={c.pill}>{done}/{s.items.length} fait</span>
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>{s.items.map((it, j) => <label key={it.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 15, textDecoration: it.fait ? "line-through" : undefined, opacity: it.fait ? 0.6 : 1 }}>
            <input type="checkbox" checked={it.fait} onChange={e => upd(x => { x.etapes[m].items[j].fait = e.target.checked; })} style={{ width: 20, height: 20, marginTop: 2 }} />{it.texte}</label>)}</div>
          <textarea className={c.input} rows={2} style={{ marginTop: 8 }} placeholder="Notes du mois…" value={s.notes} onChange={e => upd(x => { x.etapes[m].notes = e.target.value; })} />
        </div>; })}
      </div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>🤝 Programme clients ambassadeurs</h2>
      <div className={c.card} style={{ padding: 16 }}>
        <ul className={c.actions}>
          <li>Un client content recommande NeoDrive avec <b>son code</b> (ex. NEOJULIE27) ou son lien, créés dès l'inscription.</li>
          <li><b>100 € par voiture livrée et payée</b> grâce à son code (programme actuel). Pour les clients, on peut tester <b>150 € ou un bon d'accessoires de 200 €</b> par vente conclue.</li>
          <li>Le filleul profite d'<b>une petite remise</b> (ex. 100 €) ou d'un accessoire offert.</li>
          <li>Conditions : la prime est versée après livraison et paiement complet ; pas de cumul avec une autre remise ; dès 30 voitures vendues, l'ambassadeur devient partenaire officiel.</li>
          <li>Suivi : le code parrain est noté sur chaque contact dans le CRM.</li>
          <li>Quand le proposer : à la livraison, et dans le message d'avis Google une semaine après.</li>
        </ul>
        <Link href="/devenir-ambassadeur" className={`${c.btn} ${c.btnGhost}`} style={{ marginTop: 10, display: "inline-block" }}>Voir la page ambassadeur →</Link>
      </div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>🏗️ Déclencheurs pour devenir un groupe</h2>
      <div className={c.grid2}>
        <div className={c.opp}><h3 className={c.oppTitle}>🅿️ Ton propre terrain logistique</h3><p className={c.oppWhy}>Quand le stock dépasse <b>80 à 100 véhicules en permanence</b> : ton terrain, ton dépotage et ton responsable dépôt coûtent moins cher que le stockage à la voiture. Matériel à commander 4 mois avant.</p></div>
        <div className={c.opp}><h3 className={c.oppTitle}>🧰 Nouvelles catégories</h3><p className={c.oppWhy}>Quand la caisse dépasse <b>300 000 € hors besoins des voitures</b> et que les voitures tournent seules : petits engins et levage (méta-analyse), d'abord glissés sous les voitures dans les conteneurs.</p></div>
        <div className={c.opp}><h3 className={c.oppTitle}>🏦 Crédit de stock</h3><p className={c.oppWhy}>Dès <b>3 à 6 mois de chiffres solides</b> : ligne de crédit banque ou Bpifrance pour financer les conteneurs pendant le pic, sans faire entrer d'associé.</p></div>
        <div className={c.opp}><h3 className={c.oppTitle}>🏷️ Hausse de prix</h3><p className={c.oppWhy}>Prix à <b>5 490 €</b> à partir de {MONTHS[h.mois_hausse]} sur les nouveaux arrivages : il finance la marge des partenaires. Garder le prix livré sous ≈ 6 500 €.</p></div>
      </div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>⚙️ Hypothèses</h2>
      <div className={c.card} style={{ padding: 16, display: "grid", gap: 8 }}>
        {([
          ["prix_usine", "Prix usine par véhicule (€)"], ["acompte_pct", "Acompte à la commande (%)"], ["landing", "Fret + douane + logistique par véhicule (€)"],
          ["net_direct_avant", "Net encaissé par vente directe à 4 990 € (€)"], ["net_direct_apres", "Net encaissé par vente directe à 5 490 € (€)"], ["net_partenaire", "Net encaissé par vente partenaire (€)"],
          ["caisse_depart", "Caisse de départ, décembre 2026 (€)"], ["reserve", "Réserve personnelle, non utilisée (€)"], ["base_fixe", "Frais fixes de base par mois (€)"], ["seuil_alerte", "Seuil d'alerte de caisse (€)"],
        ] as [keyof ForecastData["hyp"], string][]).map(([k, l]) => <label key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", fontSize: 14 }}>{l}{numIn(d.hyp[k], n => upd(x => { x.hyp[k] = Math.max(0, n ?? 0); }), 100)}</label>)}
        <label style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", fontSize: 14 }}>Mois du passage à 5 490 €<select className={c.input} style={{ width: "auto" }} value={h.mois_hausse} onChange={e => upd(x => { x.hyp.mois_hausse = Number(e.target.value); })}>{MONTHS.map((mo, m) => <option key={mo} value={m}>{mo}</option>)}</select></label>
      </div>
      <p className={c.small} style={{ marginTop: 8 }}>Acompte à la commande, solde au départ du bateau (≈ 1 mois après), fret, douane et logistique payés à l'arrivée (≈ 3 mois après la commande), vente le mois d'arrivée. Net encaissé = prix TTC (voiture, livraison, carte grise) moins TVA, coût réel de livraison, pub et réserve SAV. Stock déjà commandé : 45 véhicules en décembre 2026 (déjà financés), 24 en février (solde payé en décembre), 27 voitures + 9 pick-up en mars (solde payé en janvier). Non compris : impôt sur les sociétés (≈ 25 % du bénéfice), ancien stock, achat comptant d'un véhicule.</p>
      <textarea className={c.input} rows={3} style={{ marginTop: 10 }} placeholder="Notes générales…" value={d.notes} onChange={e => upd(x => { x.notes = e.target.value; })} />
    </section>

    {dirty ? <div style={{ position: "sticky", bottom: 12, display: "flex", justifyContent: "center" }} className={c.noPrint}><button className={`${c.btn} ${c.btnBrand}`} onClick={save} disabled={busy}>{busy ? "…" : "💾 Enregistrer les modifications"}</button></div> : null}
  </div></main>;
}
