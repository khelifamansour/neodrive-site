"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import c from "../giga.module.css";
import { Login, Unauthorized, gigaApi, storedCode } from "../client";
import type { Line, ScenarioId, SimOut, Decision, LineId } from "../../../lib/meta-realiste";

type Scen = { id: ScenarioId; nom: string; resume: string; decisions: Partial<Record<LineId, Decision>>; res: SimOut; stress: { ventes: number; benefice: number; caisseMin: number; caisseFin: number } };
type Meta = { lines: Line[]; scenarios: Scen[]; sensibilite: { label: string; benefice: number; caisseMin: number; ventes: number }[]; synthese: string[]; regles: string[]; risques: string[] };

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const k = (n: number) => Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M€` : `${Math.round(n / 1000).toLocaleString("fr-FR")} k€`;
const MOIS = ["Déc. 2026", "Janv. 2027", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc. 2027"];
const RISK = ["", "faible", "faible", "moyen", "fort"];

export default function MetaRealistePage() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "denied">("loading");
  const [d, setD] = useState<Meta | null>(null); const [msg, setMsg] = useState("");
  const [sid, setSid] = useState<ScenarioId>("recommande");

  const load = useCallback(async (code = storedCode()) => {
    try { const j = await gigaApi<Meta>({ action: "meta_get" }, code); setD(j); setState("ready"); }
    catch (e) {
      if (e instanceof Unauthorized) { setState("login"); throw e; }
      if ((e as { status?: number }).status === 403) { setState("denied"); return; }
      setMsg((e as Error).message); setState("ready");
    }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Calcul des scénarios…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;
  if (state === "denied") return <main className={c.page}><div className={c.wrap}><Link href="/giga" className={c.back}>← Giga Analyse</Link><div className={`${c.card} ${c.empty}`} style={{ marginTop: 16 }}>Cette analyse est réservée au fondateur.</div></div></main>;
  if (!d) return <main className={c.page}><div className={c.wrap}><p className={c.err}>{msg || "Analyse indisponible."}</p></div></main>;

  const s = d.scenarios.find(x => x.id === sid)!; const r = s.res;
  const name = (id: string) => d.lines.find(l => l.id === id)?.nom.split(" (")[0] || id;
  const cell = { padding: "6px 8px", whiteSpace: "nowrap" as const };

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}>
      <Link href="/giga" className={c.back}>← Giga Analyse</Link>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/giga/previsionnel" className={`${c.btn} ${c.btnGhost}`}>📈 Prévisionnel</Link>
        <Link href="/giga/plan" className={`${c.btn} ${c.btnGhost}`}>📋 Plan produits</Link>
      </div>
    </div>
    <p className={c.kicker}>🧠 Giga Analyse · Méta-analyse réaliste</p>
    <h1 className={c.h1}>🎯 Méta-analyse réaliste 2027</h1>
    <p className={c.muted}>Ta situation réelle de novembre 2026 (caisse, 105 voitures commandées, pick-up, tricycles) combinée aux produits de la méta-analyse, simulée mois par mois avec des centaines de combinaisons. Les prix marqués « est. » sont des estimations à confirmer par devis.</p>

    <section className={c.resume} style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>Ce qu’il faut faire</h2>
      <ul>{d.synthese.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>⚖️ Les scénarios comparés (année 2027)</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>{d.scenarios.map(x => <button key={x.id} type="button" onClick={() => setSid(x.id)} style={{ textAlign: "left", border: x.id === sid ? "3px solid #f97316" : "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: x.id === sid ? "#fff7ed" : "#fff", cursor: "pointer", font: "inherit", color: "inherit" }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{x.id === "recommande" ? "⭐ " : ""}{x.nom}{x.id === sid ? " — affiché en dessous" : ""}</div>
        <div>Ventes 2027 : <b>{x.res.ventes2027}</b></div>
        <div>Chiffre d’affaires HT : <b>{k(x.res.ca2027)}</b></div>
        <div>Bénéfice avant impôt : <b style={{ fontSize: 18 }}>{k(x.res.benefice2027)}</b></div>
        <div>Caisse la plus basse : {eur(x.res.caisseMin)} · fin 2027 : {k(x.res.caisseFin)}</div>
        <div style={{ color: x.stress.caisseMin < 0 ? "#b42318" : "#5b6573", fontSize: 14, marginTop: 4 }}>Si tout va 30 % plus mal : {k(x.stress.benefice)}, caisse mini {eur(x.stress.caisseMin)}</div>
      </button>)}</div>
      <p className={c.small} style={{ marginTop: 8 }}>« 30 % plus mal » : ventes et partenaires −30 %, fret/douane/logistique +30 %, SAV ×1,3 et pas de hausse à 5 490 €. Le bénéfice ne compte pas l’impôt sur les sociétés. Touchez un scénario pour afficher son détail juste en dessous.</p>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>Détail du scénario : {s.id === "recommande" ? "⭐ " : ""}{s.nom}</h2>
      <p className={c.muted} style={{ marginBottom: 12 }}>{s.resume}</p>
      <div className={c.stats}>
        <div className={c.stat}><p className={c.statLabel}>Ventes 2027</p><p className={c.statValue}>{r.ventes2027}</p><p className={c.statNote}>{Object.entries(r.ventesParLigne).filter(([, v]) => v > 0).map(([id, v]) => `${name(id)} ${v}`).join(" · ")}</p></div>
        <div className={c.stat}><p className={c.statLabel}>Bénéfice avant impôt</p><p className={c.statValue}>{k(r.benefice2027)}</p><p className={c.statNote}>Marge {k(r.marge2027)} − frais fixes {k(r.fixes2027)}</p></div>
        <div className={c.stat}><p className={c.statLabel}>Caisse fin 2027</p><p className={c.statValue}>{k(r.caisseFin)}</p><p className={c.statNote}>Plus basse : {eur(r.caisseMin)} · réserve de 50 000 € jamais utilisée</p></div>
        <div className={c.stat}><p className={c.statLabel}>Si tout va 30 % plus mal</p><p className={c.statValue}>{k(s.stress.benefice)}</p><p className={c.statNote}>{s.stress.ventes} ventes · caisse mini {eur(s.stress.caisseMin)}</p></div>
      </div>
      <h3 style={{ margin: "18px 0 8px" }}>🗓️ Mois par mois</h3>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Mois</th><th>Ventes</th><th>dont voitures</th><th>À commander</th><th>Encaissé net</th><th>Achats + import</th><th>Frais fixes</th><th>Caisse fin</th><th>Décisions</th></tr></thead>
        <tbody>{r.rows.map((m, i) => <tr key={i}>
          <td style={cell}><b>{m.mois}</b></td>
          <td style={cell} className={c.num}>{Object.values(m.ventes).reduce((a, b) => a + b, 0)}</td>
          <td style={cell} className={c.num}>{m.ventes.vsp || 0}</td>
          <td style={{ ...cell, whiteSpace: "normal", minWidth: 160 }}>{Object.entries(m.commandes).map(([id, q]) => `${name(id)} ${q}`).join(" · ") || "–"}</td>
          <td style={cell} className={c.num}>{eur(m.encaisse)}</td><td style={cell} className={c.num}>{eur(m.achats)}</td><td style={cell} className={c.num}>{eur(m.fixes)}</td>
          <td style={{ ...cell, fontWeight: 800, color: m.caisse < 10000 ? "#b42318" : undefined }} className={c.num}>{eur(m.caisse)}</td>
          <td style={{ ...cell, whiteSpace: "normal", minWidth: 200 }}>{m.actions.join(" · ") || ""}</td>
        </tr>)}</tbody>
      </table></div>
      <p className={c.small} style={{ marginTop: 8 }}>Commandes : 30 % d’acompte le mois de la commande, solde le mois suivant (départ), fret + douane + logistique 3 mois après (arrivée). Les voitures en direct sont plafonnées par la capacité de livraison (≈ 18 par mois seul, + ≈ 30 par chauffeur).</p>
      <p className={c.small} style={{ marginTop: 4 }}>{MOIS.length} mois simulés de décembre 2026 à décembre 2027 ; les totaux « 2027 » comptent janvier à décembre 2027.</p>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>📦 Produit par produit</h2>
      <div className={c.grid2}>{d.lines.map(l => {
        const margeU = l.net - l.usine - l.landing; const dec = s.decisions[l.id];
        return <article key={l.id} className={c.opp}>
          <p className={c.oppTitle}>{l.nom}</p>
          <div className={c.pills}>
            <span className={`${c.pill} ${c["e_" + (RISK[l.risque] || "moyen")]}`}>Risque {RISK[l.risque]}</span>
            <span className={`${c.pill} ${c["e_" + l.sav]}`}>SAV {l.sav}</span>
            {l.id === "vsp" ? <span className={c.pill}>Cœur</span> : dec && dec.scale > 0 ? <span className={c.pill}>{dec.reassort === false ? "Stock existant seulement" : `Lancement : ${MOIS[dec.start]}`}</span> : <span className={c.pill}>Pas dans ce scénario</span>}
          </div>
          <div className={c.impact}>Coût rendu {eur(l.usine + l.landing)} · prix {eur(l.prixTTC)} TTC · <b>marge ≈ {eur(margeU)}</b> par unité{l.id === "pieces" ? " (lot)" : ""}</div>
          <p className={c.oppWhy}><b>Verdict :</b> {l.verdict}</p>
          <p className={c.oppWhy}><b>Vente :</b> {l.canal}</p>
          <p className={c.oppWhy}><b>Conteneur :</b> {l.place}</p>
          <p className={c.oppWhy}><b>Papiers :</b> {l.reglementaire}</p>
          <p className={c.small}>{l.sources}</p>
        </article>;
      })}</div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>🔬 Ce qui fait bouger le résultat (plan recommandé)</h2>
      <div className={c.tableWrap}><table className={c.table}>
        <thead><tr><th>Hypothèse</th><th>Ventes 2027</th><th>Bénéfice</th><th>Caisse la plus basse</th></tr></thead>
        <tbody>{d.sensibilite.map((x, i) => <tr key={i}><td>{x.label}</td><td className={c.num}>{x.ventes}</td><td className={c.num}><b>{k(x.benefice)}</b></td><td className={c.num} style={{ color: x.caisseMin < 10000 ? "#b42318" : undefined }}>{eur(x.caisseMin)}</td></tr>)}</tbody>
      </table></div>
      <p className={c.small} style={{ marginTop: 8 }}>Ce qui compte le plus : le nombre de ventes (closers, rappels rapides), puis la hausse à 5 490 € et les coûts d’import. Les partenaires et le SAV pèsent moins en 2027.</p>
    </section>

    <section className={c.section}>
      <div className={c.grid2}>
        <article className={c.opp}><p className={c.oppTitle}>🛡️ Les règles qui te protègent</p><ul className={c.actions}>{d.regles.map((t, i) => <li key={i}>{t}</li>)}</ul></article>
        <article className={`${c.opp} ${c.threat}`}><p className={c.oppTitle}>⚠️ Les risques</p><ul className={c.actions}>{d.risques.map((t, i) => <li key={i}>{t}</li>)}</ul></article>
      </div>
    </section>

    <section className={c.section}>
      <h2 className={c.h2}>📚 Hypothèses</h2>
      <div className={c.card}><ul className={c.actions}>
        <li>Voitures : tes chiffres réels (usine 1 771 $, fret 3 300–3 450 $ par 40 pieds, douane 10 %, dépotage et stockage à Gennevilliers) ; net encaissé 4 230 € à 4 990 € et 4 645 € à 5 490 € (après TVA, livraison, pub et SAV) ; partenaires 3 550 €.</li>
        <li>Demande voitures : plans du prévisionnel (moyen, agressif) ; prudent = moyen −25 % avec partenaires lents.</li>
        <li>Nouvelles lignes : prix usine et prix de vente estimés à partir de la méta-analyse « Produits rotation conteneur », du plan produits 2027 et des prix du marché ; demande estimée, montée en 3 mois après l’arrivée du test, saisonnalité pour les scooters, brouettes et dumpers.</li>
        <li>Frais fixes : recrutements du prévisionnel + 600 € par mois et par nouvelle ligne (échantillons, pub, temps) + 1 000 € de SAV deux-roues et 2 200 € de commercial B2B quand ces lignes démarrent.</li>
        <li>Pénalité de risque utilisée pour choisir le scénario : 10 % (risque faible-moyen), 25 % (moyen), 45 % (fort) de la marge des lignes concernées.</li>
      </ul></div>
    </section>
  </div></main>;
}
