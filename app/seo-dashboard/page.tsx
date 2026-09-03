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
function statusColor(s: string) {
  if (s === "success" || s === "published" || s === "succeeded" || s === "ready") return "#137333";
  if (s === "failed" || s === "error") return "#b00020";
  return "#a05a00";
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
      if (!r.ok || !j.ok) throw new Error(j.error || "Impossible de charger le tableau");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  }

  return <main style={{ maxWidth: 1220, margin: "0 auto", padding: "28px 16px 80px", fontFamily: "Arial,sans-serif", color: "#111" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div><h1 style={{ marginBottom: 6 }}>Pilotage SEO & contenu NeoDrive</h1><p style={{ marginTop: 0, color: "#666" }}>Articles, pages locales, vidéos, publications sociales et résultats au même endroit.</p></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/social-upload" style={linkButton}>Bibliothèque sociale</a><a href="/voiture-sans-permis" style={linkButton}>Pages locales</a></div>
    </div>

    <section style={panel}>
      <label style={{ fontWeight: 800 }}>Code d’accès<input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} style={input} /></label>
      <button onClick={load} disabled={loading || !passcode} style={button}>{loading ? "Chargement…" : data ? "Actualiser tout" : "Afficher le tableau de bord"}</button>
      {error && <p style={{ color: "#b00020", fontWeight: 800 }}>{error}</p>}
    </section>

    {data && <>
      <section style={cards}>
        <Card n={data.summary.total_articles} label="Articles suivis" />
        <Card n={data.summary.published_last_7d} label="Articles publiés · 7 j" />
        <Card n={data.summary.total_views_30d} label="Vues SEO totales · 30 j" />
        <Card n={data.summary.google_views_30d} label="Visites venant de Google · 30 j" />
        <Card n={data.summary.seo_cta_clicks_30d} label="Clics offre / WhatsApp · 30 j" />
        <Card n={data.summary.total_videos} label="Vidéos suivies" />
        <Card n={data.summary.social_published_last_7d} label="Posts sociaux publiés · 7 j" />
        <Card n={data.summary.social_failed} label="Échecs sociaux visibles" />
      </section>

      <section style={{ ...panel, marginTop: 18, background: "#eef8ff" }}>
        <div><strong>SEO automatique :</strong> {data.cron.description}</div>
        <div><strong>Prochaine publication automatique :</strong> {fmt(data.cron.next_run_at)}</div>
        <div><strong>Réseaux sociaux :</strong> {data.cron.social_description}</div>
        <div style={{ color: "#555" }}>Dernier article détecté : {fmt(data.summary.last_published_at)}.</div>
      </section>

      <section style={{ ...panel, marginTop: 14, background: data.search_console.connected ? "#effaf0" : "#fff8e8" }}>
        <strong>Mesure Google :</strong> {data.search_console.note}
      </section>

      <SectionTitle title="Historique des articles SEO" subtitle="Chaque article garde sa date, son origine et ses résultats." />
      <div style={{ display: "grid", gap: 10 }}>
        {data.articles.map((a: any) => <article key={`${a.source}-${a.id}`} style={articleCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px" }}><strong style={{ fontSize: 17 }}>{a.title}</strong><div style={{ color: "#666", fontSize: 13, marginTop: 5 }}>{fmt(a.published_at)} · {sourceLabel(a.source)}{a.keyword ? ` · ${a.keyword}` : ""}</div></div>
            <a href={a.url} target="_blank" rel="noreferrer" style={openLink}>Ouvrir ↗</a>
          </div>
          <MetricRow m={a.metrics} />
        </article>)}
      </div>

      <SectionTitle title="Pages locales et commerciales" subtitle="Le compteur suit maintenant aussi les hubs, villes, prix, occasion, comparatifs et page produit." />
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}><thead><tr><Th>Page</Th><Th>Vues 7 j</Th><Th>Vues 30 j</Th><Th>Google 30 j</Th><Th>Clics offre</Th><Th>WhatsApp</Th></tr></thead><tbody>
          {data.pages.map((p: any) => <tr key={p.key}><Td><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a><div style={{ color: "#777", fontSize: 11 }}>{p.path}</div></Td><Td>{p.metrics.views7}</Td><Td>{p.metrics.views30}</Td><Td>{p.metrics.google30}</Td><Td>{p.metrics.product30}</Td><Td>{p.metrics.whatsapp30}</Td></tr>)}
        </tbody></table>
      </div>

      <SectionTitle title="Vidéos réelles et pages vidéo" subtitle="Chaque vidéo récente dispose d’une page mesurable; tu vois aussi si elle a déjà été utilisée." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {data.videos.slice(0, 40).map((v: any) => <article key={v.id} style={articleCard}>
          <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>{v.title || "Vidéo NeoDrive"}</div>
          <div style={{ color: "#666", fontSize: 12, marginTop: 5 }}>{fmt(v.created_at)} · {v.generated ? "Montage généré" : "Vidéo réelle uploadée"} · utilisée {Number(v.times_used || 0)} fois</div>
          <MetricRow m={v.metrics} />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}><a href={v.page_url} target="_blank" rel="noreferrer" style={openLink}>Page SEO vidéo ↗</a><a href={v.public_url} target="_blank" rel="noreferrer" style={openLink}>Fichier ↗</a></div>
        </article>)}
      </div>

      <SectionTitle title="Instagram / Facebook : historique réel" subtitle="Publié, programmé ou échoué : le statut est conservé et visible ici." />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>{data.social.by_platform.map((s: any) => <div key={s.platform} style={{ ...articleCard, padding: 12 }}><strong style={{ textTransform: "capitalize" }}>{s.platform}</strong> · {s.published} publiés · {s.scheduled} programmés · <span style={{ color: s.failed ? "#b00020" : "#137333" }}>{s.failed} échecs</span></div>)}</div>
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}><thead><tr><Th>Date</Th><Th>Plateforme</Th><Th>État</Th><Th>Contenu</Th><Th>Média</Th><Th>Lien / erreur</Th></tr></thead><tbody>
          {data.social.recent.map((r: any) => <tr key={r.id}><Td>{fmt(r.updated_at || r.publish_at || r.created_at)}</Td><Td style={{ textTransform: "capitalize" }}>{r.platform}</Td><Td><strong style={{ color: statusColor(r.status) }}>{r.status}</strong></Td><Td>{r.hook || (r.caption ? String(r.caption).slice(0, 90) : "—")}</Td><Td>{r.media_url ? <a href={r.media_url} target="_blank" rel="noreferrer">Voir média</a> : "—"}</Td><Td>{r.external_url ? <a href={r.external_url} target="_blank" rel="noreferrer">Voir publication ↗</a> : (r.error_message || "—")}</Td></tr>)}
        </tbody></table>
      </div>

      <SectionTitle title="Journal des générations SEO" subtitle="Permet de vérifier demain matin si le cron a bien tourné et quel article il a publié." />
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr><Th>Date</Th><Th>Déclenchement</Th><Th>État</Th><Th>Sujet / article</Th><Th>Durée</Th><Th>Erreur</Th></tr></thead><tbody>
          {data.runs.map((r: any) => <tr key={r.id}><Td>{fmt(r.started_at)}</Td><Td>{sourceLabel(r.trigger_source)}</Td><Td><span style={{ fontWeight: 900, color: statusColor(r.status) }}>{r.status}</span></Td><Td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title || r.topic || "Article"}</a> : (r.title || r.topic || "—")}</Td><Td>{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)} s` : "—"}</Td><Td>{r.error_message || "—"}</Td></tr>)}
        </tbody></table>
      </div>

      <SectionTitle title="Journal des montages vidéo" subtitle="Pour voir si un montage automatique a réussi ou utilisé une vidéo réelle en secours." />
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr><Th>Date</Th><Th>État</Th><Th>Thème</Th><Th>Moteur</Th><Th>Sortie</Th><Th>Erreur</Th></tr></thead><tbody>
          {data.video_jobs.map((j: any) => <tr key={j.id}><Td>{fmt(j.created_at)}</Td><Td><strong style={{ color: statusColor(j.status) }}>{j.status}</strong></Td><Td>{j.theme || j.hook || "—"}</Td><Td>{j.render_provider || "—"}</Td><Td>{j.output_url ? <a href={j.output_url} target="_blank" rel="noreferrer">Voir vidéo ↗</a> : "—"}</Td><Td>{j.error_message || "—"}</Td></tr>)}
        </tbody></table>
      </div>

      <p style={{ marginTop: 22, color: "#666", fontSize: 13 }}>Les compteurs du site démarrent à partir de l’activation du tracker. Les statistiques Google exactes de Search Console — impressions, requêtes, CTR et position moyenne — ne sont pas encore importées dans ce tableau.</p>
    </>}
  </main>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div style={{ marginTop: 38, marginBottom: 12 }}><h2 style={{ marginBottom: 5 }}>{title}</h2><p style={{ margin: 0, color: "#666" }}>{subtitle}</p></div> }
function Card({ n, label }: { n: number; label: string }) { return <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e3e3e3", background: "white" }}><div style={{ fontSize: 28, fontWeight: 950 }}>{Number(n || 0).toLocaleString("fr-FR")}</div><div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{label}</div></div> }
function MetricRow({ m }: { m: any }) { return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 7, marginTop: 12 }}><Mini n={m?.views7} label="vues 7 j" /><Mini n={m?.views30} label="vues 30 j" /><Mini n={m?.google30} label="Google 30 j" /><Mini n={m?.product30} label="clics offre" /><Mini n={m?.whatsapp30} label="WhatsApp" /></div> }
function Mini({ n, label }: { n: number; label: string }) { return <div style={{ background: "#f7f7f7", borderRadius: 10, padding: "8px 10px", fontSize: 12 }}><strong>{Number(n || 0).toLocaleString("fr-FR")}</strong> {label}</div> }
function Th({ children }: { children: React.ReactNode }) { return <th style={{ padding: 11, textAlign: "left", background: "#f5f5f5", fontSize: 13 }}>{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td style={{ padding: 11, borderTop: "1px solid #eee", fontSize: 13, verticalAlign: "top" }}>{children}</td> }
const cards: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginTop: 18 };
const panel: React.CSSProperties = { padding: 18, borderRadius: 16, background: "#f7f7f7", border: "1px solid #e5e5e5", display: "grid", gap: 12 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", marginTop: 7, padding: 12, borderRadius: 10, border: "1px solid #ccc", fontSize: 16 };
const button: React.CSSProperties = { border: 0, borderRadius: 12, background: "#111", color: "#fff", padding: "14px 18px", fontSize: 15, fontWeight: 900, cursor: "pointer" };
const articleCard: React.CSSProperties = { border: "1px solid #e2e2e2", borderRadius: 16, padding: 16, background: "white" };
const openLink: React.CSSProperties = { fontWeight: 800, color: "#1473e6", textDecoration: "none" };
const linkButton: React.CSSProperties = { textDecoration: "none", fontWeight: 850, color: "#111", background: "#f3f3f3", padding: "10px 13px", borderRadius: 12 };
