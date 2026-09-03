"use client";

import { useState } from "react";

type Data = any;

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
function sourceLabel(s: string) {
  if (s === "auto") return "Automatique";
  if (s === "manual") return "Manuel";
  if (s === "git_static") return "SEO statique";
  return "Ancien / manuel";
}

export default function SeoDashboard() {
  const [passcode, setPasscode] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!passcode) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/seo/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }), cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Impossible de charger le tableau SEO");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  }

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 70px", fontFamily: "Arial,sans-serif" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div><h1 style={{ marginBottom: 6 }}>Tableau de bord SEO NeoDrive</h1><p style={{ marginTop: 0, color: "#666" }}>Historique des publications et mesure du trafic des articles.</p></div>
      <a href="/social-upload" style={{ textDecoration: "none", fontWeight: 800, color: "#111" }}>← Bibliothèque sociale</a>
    </div>

    <section style={panel}>
      <label style={{ fontWeight: 800 }}>Code d’accès<input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} style={input} /></label>
      <button onClick={load} disabled={loading || !passcode} style={button}>{loading ? "Chargement…" : data ? "Actualiser" : "Afficher le suivi SEO"}</button>
      {error && <p style={{ color: "#b00020", fontWeight: 800 }}>{error}</p>}
    </section>

    {data && <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginTop: 18 }}>
        <Card n={data.summary.total_articles} label="Articles suivis" />
        <Card n={data.summary.published_last_7d} label="Publiés sur 7 jours" />
        <Card n={data.summary.views_30d} label="Vues articles · 30 j" />
        <Card n={data.summary.google_views_30d} label="Vues venant de Google · 30 j" />
        <Card n={data.summary.seo_cta_clicks_30d} label="Clics vers offre / WhatsApp · 30 j" />
        <Card n={data.summary.failed_runs} label="Échecs de génération tracés" />
      </section>

      <section style={{ ...panel, marginTop: 18, background: "#eef8ff" }}>
        <strong>Publication automatique :</strong> {data.cron.description}.<br />
        <span style={{ color: "#555" }}>Dernier article détecté : {fmt(data.summary.last_published_at)}. Les nouvelles tentatives automatiques et manuelles sont maintenant enregistrées avec succès/échec.</span>
      </section>

      <h2 style={{ marginTop: 32 }}>Historique des articles</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {data.articles.map((a: any) => <article key={`${a.source}-${a.id}`} style={articleCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 500px" }}><strong style={{ fontSize: 17 }}>{a.title}</strong><div style={{ color: "#666", fontSize: 13, marginTop: 5 }}>{fmt(a.published_at)} · {sourceLabel(a.source)}{a.keyword ? ` · ${a.keyword}` : ""}</div></div>
            <a href={a.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: "#1473e6" }}>Ouvrir ↗</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 7, marginTop: 12 }}>
            <Mini n={a.metrics.views7} label="vues 7 j" /><Mini n={a.metrics.views30} label="vues 30 j" /><Mini n={a.metrics.google30} label="Google 30 j" /><Mini n={a.metrics.product30} label="clics offre" /><Mini n={a.metrics.whatsapp30} label="clics WhatsApp" />
          </div>
        </article>)}
      </div>

      <h2 style={{ marginTop: 34 }}>Journal des générations SEO</h2>
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}><thead><tr><Th>Date</Th><Th>Déclenchement</Th><Th>État</Th><Th>Sujet / article</Th><Th>Durée</Th><Th>Erreur</Th></tr></thead><tbody>
          {data.runs.map((r: any) => <tr key={r.id}><Td>{fmt(r.started_at)}</Td><Td>{sourceLabel(r.trigger_source)}</Td><Td><span style={{ fontWeight: 900, color: r.status === "success" ? "#137333" : r.status === "failed" ? "#b00020" : "#a05a00" }}>{r.status}</span></Td><Td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title || r.topic || "Article"}</a> : (r.title || r.topic || "—")}</Td><Td>{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)} s` : "—"}</Td><Td>{r.error_message || "—"}</Td></tr>)}
        </tbody></table>
      </div>

      <p style={{ marginTop: 18, color: "#666", fontSize: 13 }}>Le compteur intégré mesure les visites des pages /blog et les clics vers les offres/WhatsApp à partir de maintenant. « Vues venant de Google » signifie que le navigateur indique Google comme référent. Pour les impressions, positions moyennes et requêtes Google exactes, il faudra connecter Google Search Console.</p>
    </>}
  </main>;
}

function Card({ n, label }: { n: number; label: string }) { return <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e3e3e3", background: "white" }}><div style={{ fontSize: 28, fontWeight: 950 }}>{Number(n || 0).toLocaleString("fr-FR")}</div><div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{label}</div></div> }
function Mini({ n, label }: { n: number; label: string }) { return <div style={{ background: "#f7f7f7", borderRadius: 10, padding: "8px 10px", fontSize: 12 }}><strong>{Number(n || 0).toLocaleString("fr-FR")}</strong> {label}</div> }
function Th({ children }: { children: React.ReactNode }) { return <th style={{ padding: 11, textAlign: "left", background: "#f5f5f5", fontSize: 13 }}>{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td style={{ padding: 11, borderTop: "1px solid #eee", fontSize: 13, verticalAlign: "top" }}>{children}</td> }
const panel: React.CSSProperties = { padding: 18, borderRadius: 16, background: "#f7f7f7", border: "1px solid #e5e5e5", display: "grid", gap: 12 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", marginTop: 7, padding: 12, borderRadius: 10, border: "1px solid #ccc", fontSize: 16 };
const button: React.CSSProperties = { border: 0, borderRadius: 12, background: "#111", color: "#fff", padding: "14px 18px", fontSize: 15, fontWeight: 900, cursor: "pointer" };
const articleCard: React.CSSProperties = { border: "1px solid #e2e2e2", borderRadius: 16, padding: 16, background: "white" };
