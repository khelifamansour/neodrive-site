"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import c from "../giga.module.css";
import { Login, Unauthorized, gigaApi, storedCode } from "../client";
import { DEFAULT_CASH, cashPlan, type CashHyp, DEFAULT_HUB, DEFAULT_SIM, SEASON, SIM_MONTHS, hubCost, milestones, simulate, type HubHyp, type SimHyp } from "../../../lib/sales-sim";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const KEY = "nd_sim_hyp_v2";
type History = { mois: { m: string; n: number }[]; part_sud: number | null };

const FIELDS: { k: keyof SimHyp; label: string; step?: number; month?: boolean }[] = [
  { k: "base", label: "Réservations par mois (rythme actuel)" },
  { k: "croissance", label: "Croissance par mois (%)" },
  { k: "conversion", label: "Réservations qui deviennent des ventes (%)" },
  { k: "hausse", label: "Hausse de prix (€ TTC)", step: 100 },
  { k: "mois_hausse", label: "Mois de la hausse", month: true },
  { k: "elasticite", label: "Sensibilité au prix (1 = normale)", step: 0.1 },
  { k: "equipe_mois", label: "Arrivée équipe commerciale", month: true },
  { k: "equipe_gain", label: "Ventes en plus grâce à l'équipe (%)" },
  { k: "reseau_mois", label: "Premiers revendeurs", month: true },
  { k: "reseau_par_mois", label: "Ventes revendeurs ajoutées chaque mois" },
  { k: "reseau_max", label: "Plafond ventes revendeurs par mois" },
  { k: "part_sud", label: "Part des ventes au sud (%)" },
  { k: "net_direct", label: "Net HT par voiture vendue en direct (€)", step: 50 },
  { k: "usine", label: "Prix usine (€)", step: 10 },
  { k: "arrivee", label: "Fret + douane + dépotage par voiture (€)", step: 10 },
  { k: "livraison", label: "Coût livraison par voiture : livreur + déplacements (€)", step: 10 },
  { k: "net_revendeur", label: "Net HT par voiture revendeur (€)", step: 50 },
  { k: "fixes", label: "Frais fixes par mois hors pub (€)", step: 100 },
  { k: "pub_actuelle", label: "Pub actuelle par mois (€)", step: 100 },
  { k: "pub", label: "Budget pub visé par mois (€)", step: 500 },
  { k: "mois_pub", label: "Début du nouveau budget pub", month: true },
  { k: "cout_resa", label: "Coût d'une réservation en plus (€)", step: 50 },
  { k: "livreur_nord", label: "Surcoût fixe du dépôt nord une fois le livreur embauché (€)", step: 100 },
  { k: "cap_livreur", label: "Livraisons par livreur et par mois" },
];

export default function SimulationPage() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "denied">("loading");
  const [hist, setHist] = useState<History | null>(null);
  const [h, setH] = useState<SimHyp>(DEFAULT_SIM);
  const [hub, setHub] = useState<HubHyp>(DEFAULT_HUB);
  const [cash, setCash] = useState<CashHyp>(DEFAULT_CASH);

  const load = useCallback(async (code = storedCode()) => {
    try { const j = await gigaApi<History>({ action: "sim_history" }, code); setHist(j); try { const s = localStorage.getItem(KEY); if (s) setH({ ...DEFAULT_SIM, ...JSON.parse(s) }); } catch { /* rien */ } setState("ready"); }
    catch (e) {
      if (e instanceof Unauthorized) { setState("login"); throw e; }
      if ((e as { status?: number }).status === 403) { setState("denied"); return; }
      setState("ready");
    }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);
  const set = (k: keyof SimHyp, v: number) => setH(p => { const n = { ...p, [k]: v }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* rien */ } return n; });

  const rows = useMemo(() => simulate(h), [h]);
  const sansHausse = useMemo(() => simulate({ ...h, hausse: 0 }), [h]);
  const jalons = useMemo(() => milestones(rows, h), [rows, h]);
  const hc = useMemo(() => hubCost(hub), [hub]);
  const cp = useMemo(() => cashPlan(h, cash), [h, cash]);
  const sum = (r: typeof rows, f: (x: (typeof rows)[number]) => number) => r.reduce((t, x) => t + f(x), 0);

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;
  if (state === "denied") return <main className={c.page}><div className={c.wrap}><Link href="/giga" className={c.back}>← Giga Analyse</Link><div className={`${c.card} ${c.empty}`} style={{ marginTop: 16 }}>La simulation est réservée au fondateur.</div></div></main>;

  const t3 = rows.slice(0, 3); const maxBar = Math.max(...rows.map(r => r.total), 1);
  const th: React.CSSProperties = { textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" };
  const tdl: React.CSSProperties = { ...th, textAlign: "left" };

  return (
    <main className={c.page}><div className={c.wrap}>
      <Link href="/giga" className={c.back}>← Giga Analyse</Link>
      <p className={c.kicker} style={{ marginTop: 12 }}>Simulation</p>
      <h1 className={c.h1}>Ventes et plan logistique sur 12 mois</h1>
      <p className={c.muted}>Change une hypothèse : tout se recalcule. Tes réglages restent sur cet appareil.</p>

      <section className={c.section}>
        <h2 className={c.h2}>📊 Ton historique réel (réservations hors annulées)</h2>
        <div className={c.card} style={{ display: "flex", gap: 10, alignItems: "flex-end", overflowX: "auto" }}>
          {(hist?.mois || []).map(x => (
            <div key={x.m} style={{ textAlign: "center", minWidth: 44 }}>
              <div style={{ fontWeight: 800 }}>{x.n}</div>
              <div style={{ background: "#f05a28", height: x.n * 5, borderRadius: 6 }} />
              <div className={c.small}>{x.m.slice(5)}/{x.m.slice(2, 4)}</div>
            </div>
          ))}
          <div className={c.small} style={{ marginLeft: 12 }}>Part du sud : <b>{hist?.part_sud ?? "?"} %</b></div>
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🗓️ Les 3 prochains mois</h2>
        <div className={c.card}>
          <p style={{ margin: 0, fontSize: 17 }}>
            <b>{sum(t3, r => r.total)} ventes</b> ({t3.map(r => `${r.mois} ${r.total}`).join(", ")}) — sud {sum(t3, r => r.sud)}, nord {sum(t3, r => r.nord)}.
            Résultat avant ton salaire et les impôts : <b>{eur(sum(t3, r => r.resultat))}</b>.
          </p>
          <p className={c.small} style={{ marginTop: 8 }}>
            Sans la hausse de prix : {sum(sansHausse.slice(0, 3), r => r.total)} ventes, {eur(sum(sansHausse.slice(0, 3), r => r.resultat))}.
            Sur l&apos;année : avec hausse {sum(rows, r => r.total)} ventes / {eur(sum(rows, r => r.resultat))} ; sans hausse {sum(sansHausse, r => r.total)} ventes / {eur(sum(sansHausse, r => r.resultat))}.
          </p>
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>📈 Mois par mois</h2>
        <div className={c.card} style={{ overflowX: "auto", padding: 8 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}>
            <thead><tr style={{ color: "#666" }}>
              <th style={tdl}>Mois</th><th style={th}>Saison</th><th style={th}>Réserv.</th><th style={th}>Direct</th><th style={th}>Revendeurs</th>
              <th style={th}>Total</th><th style={th}>Sud</th><th style={th}>Nord</th><th style={th}>Conteneurs</th><th style={th}>Livreurs N/S</th><th style={th}>Résultat</th>
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.mois} style={{ borderTop: "1px solid #eee" }}>
                <td style={tdl}><b>{r.mois}</b><div style={{ background: "#f05a28", height: 4, width: `${r.total / maxBar * 100}%`, borderRadius: 3 }} /></td>
                <td style={th}>{SEASON[i]}</td><td style={th}>{r.reservations}</td><td style={th}>{r.direct}</td><td style={th}>{r.reseau}</td>
                <td style={th}><b>{r.total}</b></td><td style={th}>{r.sud}</td><td style={th}>{r.nord}</td><td style={th}>{r.conteneurs}</td>
                <td style={th}>{r.livreurs_nord}/{r.livreurs_sud}</td><td style={th}>{eur(r.resultat)}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className={c.small} style={{ margin: 8 }}>Conteneurs : à commander environ 3 mois avant le mois de vente. Résultat = marge sur les voitures − frais fixes (avant ton salaire, les impôts et l&apos;argent bloqué dans le stock).</p>
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🚚 Le plan : quoi, quand, pourquoi</h2>
        <div className={c.card}>
          {jalons.map(j => (
            <div key={j.quoi} style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: "1px solid #eee" }}>
              <div style={{ minWidth: 90, fontWeight: 800, color: "#f05a28" }}>{j.quand}</div>
              <div><b>{j.quoi}</b><div className={c.small}>{j.pourquoi}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>🏗️ Dépôt : sous-traiter ou le faire soi-même ?</h2>
        <div className={c.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {([["voitures", "Voitures qui passent par mois"], ["stock", "Voitures en stock en moyenne"], ["terrain", "Loyer terrain par mois (€)"], ["materiel", "Matériel acheté (rampes, treuil…) €"], ["assurance", "Assurance + surveillance par mois (€)"], ["heures_conteneur", "Heures pour dépoter un conteneur"], ["taux", "Coût de l'heure du gars (€)"]] as [keyof HubHyp, string][]).map(([k, l]) => (
              <label key={k} className={c.small}>{l}<input className={c.input} type="number" value={hub[k]} onChange={e => setHub(p => ({ ...p, [k]: Number(e.target.value) || 0 }))} style={{ width: "100%" }} /></label>
            ))}
          </div>
          <p style={{ fontSize: 16, marginTop: 14 }}>
            Sous-traité (400 € par conteneur + 25 € par voiture + 15 € par voiture et par mois) : <b>{eur(hc.soustraite)}/mois</b><br />
            Ton propre dépôt : <b>{eur(hc.interne)}/mois</b><br />
            👉 Ton dépôt devient rentable à partir d&apos;environ <b>{hc.seuil || "?"} voitures par mois</b> dans ce dépôt.
          </p>
          <p className={c.small}>Pas compté : le vol et la casse sur un terrain à toi, le temps pour trouver le terrain et les autorisations, et le fait que le loyer tombe même les mois creux.</p>
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>💶 Trésorerie : l&apos;argent gagné est réinvesti dans les commandes</h2>
        <div className={c.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {([["caisse", "Argent sur le compte (hors réserve 50 000 €)"], ["stock", "Voitures vendables en décembre (stock + arrivées payées)"], ["stock_reste", "Reste à payer par voiture arrivante (€)"], ["stock_a_payer", "Voitures arrivantes avec ce reste dû"], ["prod", "Voitures en production"], ["prod_usine", "Reste usine par voiture en production (€)"], ["prod_fret", "Fret par voiture en production (€)"], ["prod_mois", "Mois d'arrivée de la production (0 = déc.)"], ["prod_decale", "Dont voitures envoyées 1 mois plus tard"], ["acompte", "Nouvelle commande : acompte (€/voiture)"], ["solde", "Solde usine ~45 jours après (€/voiture)"], ["fret", "Fret au départ (€/voiture)"], ["douane", "Douane, transitaire, transport, dépotage (€/voiture)"], ["delai", "Mois entre commande et voiture vendable"], ["seuil", "Minimum à garder sur le compte (€)"], ["prelevement", "Ce que tu te verses par mois (€)"], ["securite", "Stock de sécurité (mois de ventes)"]] as [keyof CashHyp, string][]).map(([k, l]) => (
              <label key={k} className={c.small}>{l}<input className={c.input} type="number" step={k === "securite" ? 0.1 : 1} value={cash[k]} onChange={e => setCash(p => ({ ...p, [k]: Number(e.target.value) || 0 }))} style={{ width: "100%" }} /></label>
            ))}
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}>
              <thead><tr style={{ color: "#666" }}><th style={tdl}>Mois</th><th style={th}>Demande</th><th style={th}>Vendues</th><th style={th}>Perdues</th><th style={th}>Arrivées</th><th style={th}>Commandées</th><th style={th}>En route</th><th style={th}>Stock fin</th><th style={th}>Usine + fret</th><th style={th}>Douane, dépotage</th><th style={th}>Compte fin de mois</th></tr></thead>
              <tbody>{cp.map(r => (
                <tr key={r.mois} style={{ borderTop: "1px solid #eee", background: r.perdues ? "#fff4ec" : undefined }}>
                  <td style={tdl}><b>{r.mois}</b></td><td style={th}>{r.demande}</td><td style={th}>{r.ventes}</td><td style={{ ...th, color: r.perdues ? "#b42318" : undefined }}>{r.perdues || ""}</td>
                  <td style={th}>{r.arrivees || ""}</td><td style={th}><b>{r.commande}</b></td><td style={th}>{r.en_route}</td><td style={th}>{r.stock_fin}</td><td style={th}>{eur(r.usine)}</td><td style={th}>{eur(r.arrivee)}</td><td style={th}><b>{eur(r.caisse_fin)}</b></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className={c.small}>Chaque nouvelle voiture : acompte à la commande, solde de l&apos;usine environ 45 jours après, fret au départ, douane + transitaire + transport + dépotage à l&apos;arrivée, encaissement à la vente. La commande du mois couvre les ventes du mois d&apos;arrivée + le stock de sécurité, dans la limite de l&apos;argent disponible. TVA et impôt sur les sociétés non comptés.</p>
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>⚙️ Hypothèses</h2>
        <div className={c.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
            {FIELDS.map(f => (
              <label key={f.k} className={c.small}>{f.label}
                {f.month
                  ? <select className={c.input} value={h[f.k]} onChange={e => set(f.k, Number(e.target.value))} style={{ width: "100%" }}>{SIM_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}<option value={99}>Jamais</option></select>
                  : <input className={c.input} type="number" step={f.step || 1} value={h[f.k]} onChange={e => set(f.k, Number(e.target.value) || 0)} style={{ width: "100%" }} />}
              </label>
            ))}
          </div>
          <button className={`${c.btn} ${c.btnGhost}`} style={{ marginTop: 12 }} onClick={() => { setH(DEFAULT_SIM); try { localStorage.removeItem(KEY); } catch { /* rien */ } }}>Revenir au scénario le plus probable</button>
          <p className={c.small} style={{ marginTop: 10 }}>La saisonnalité est une estimation du marché (fort au printemps et à la rentrée, creux en août et en hiver). Elle sera corrigée quand on aura une année complète de tes chiffres.</p>
        </div>
      </section>
    </div></main>
  );
}
