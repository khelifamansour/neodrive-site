/** Gabarit serveur des pages SEO « piliers » et comparatifs (contenu factuel, sources citées, FAQ + fil d'Ariane en JSON-LD). */
import type { Metadata } from "next";
import Image from "next/image";

export const SITE = "https://www.easydrive-auto.fr";
const WA = "https://wa.me/33676192234";

export type Landing = {
  path: string; title: string; metaTitle: string; description: string; eyebrow: string; h1: string; intro: string;
  sections: Array<{ h2: string; paras?: string[]; bullets?: string[] }>;
  table?: { caption: string; head: string[]; rows: string[][]; note?: string };
  faq: Array<{ q: string; a: string }>;
  sources?: Array<{ label: string; url: string }>;
  related: Array<{ label: string; href: string }>;
  breadcrumb?: Array<{ name: string; path: string }>;
};

export function landingMetadata(p: Landing): Metadata {
  const url = `${SITE}${p.path}`;
  return { title: { absolute: p.metaTitle }, description: p.description, alternates: { canonical: url }, openGraph: { title: p.metaTitle, description: p.description, url, type: "article", images: [`${SITE}/hero.png`] } };
}

const box: React.CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "0 20px" };

export function LandingPage({ p }: { p: Landing }) {
  const crumbs = [{ name: "Accueil", path: "/" }, ...(p.breadcrumb || []), { name: p.title, path: p.path }];
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: p.metaTitle, description: p.description, url: `${SITE}${p.path}`, inLanguage: "fr-FR", publisher: { "@type": "Organization", name: "NeoDrive", url: SITE } },
    { "@type": "FAQPage", mainEntity: p.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })) },
  ] };
  return <main style={{ fontFamily: "Arial,sans-serif", color: "#111", lineHeight: 1.65 }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Fil d'Ariane" style={{ ...box, paddingTop: 18, fontSize: 13, color: "#6b7280" }}>{crumbs.map((c, i) => <span key={c.path}>{i ? " › " : ""}{i < crumbs.length - 1 ? <a href={c.path} style={{ color: "#6b7280" }}>{c.name}</a> : c.name}</span>)}</nav>
    <section style={{ ...box, paddingTop: 30, paddingBottom: 30, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 32, alignItems: "center" }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: "#ff5a1f" }}>{p.eyebrow}</span>
        <h1 style={{ fontSize: "clamp(32px,5.5vw,56px)", lineHeight: 1.05, letterSpacing: -1.5, margin: "14px 0" }}>{p.h1}</h1>
        <p style={{ fontSize: 18, color: "#525861" }}>{p.intro}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <a href="/reservation-devis" style={{ padding: "14px 20px", borderRadius: 13, background: "#ff5a1f", color: "white", textDecoration: "none", fontWeight: 800 }}>Réserver sans acompte</a>
          <a href="/produit" style={{ padding: "14px 20px", borderRadius: 13, background: "#111", color: "white", textDecoration: "none", fontWeight: 800 }}>Voir la gamme NeoDrive</a>
        </div>
      </div>
      <Image src="/hero.png" alt="Voiture sans permis électrique NeoDrive" width={680} height={540} style={{ width: "100%", height: "auto", borderRadius: 22 }} priority />
    </section>
    {p.table ? <section style={{ ...box, paddingBottom: 30 }}>
      <h2>{p.table.caption}</h2>
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560, fontSize: 15 }}>
        <thead><tr>{p.table.head.map(h => <th key={h} style={{ textAlign: "left", padding: "10px 8px", background: "#111", color: "white" }}>{h}</th>)}</tr></thead>
        <tbody>{p.table.rows.map((r, i) => <tr key={i} style={{ background: /neodrive/i.test(r[0]) ? "#fff7ed" : i % 2 ? "#fafafa" : "white" }}>{r.map((c, j) => <td key={j} style={{ padding: "9px 8px", borderBottom: "1px solid #eee", fontWeight: j === 0 && /neodrive/i.test(r[0]) ? 800 : 400 }}>{c}</td>)}</tr>)}</tbody>
      </table></div>
      {p.table.note ? <p style={{ fontSize: 13, color: "#6b7280" }}>{p.table.note}</p> : null}
    </section> : null}
    {p.sections.map(s => <section key={s.h2} style={{ ...box, paddingBottom: 18 }}>
      <h2>{s.h2}</h2>
      {(s.paras || []).map((t, i) => <p key={i} style={{ color: "#374151" }}>{t}</p>)}
      {s.bullets ? <ul>{s.bullets.map(b => <li key={b} style={{ marginBottom: 6 }}>{b}</li>)}</ul> : null}
    </section>)}
    <section style={{ background: "#f7f7f7", padding: "40px 0", marginTop: 20 }}><div style={box}>
      <h2>Questions fréquentes</h2>
      {p.faq.map(f => <article key={f.q} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}><h3 style={{ margin: "0 0 6px" }}>{f.q}</h3><p style={{ margin: 0, color: "#4b5563" }}>{f.a}</p></article>)}
    </div></section>
    <section style={{ ...box, padding: "34px 20px 60px" }}>
      <h2>Pour aller plus loin</h2>
      <ul style={{ lineHeight: 2 }}>{p.related.map(r => <li key={r.href}><a href={r.href}>{r.label}</a></li>)}<li><a href="/videos">Voir les vidéos de livraisons NeoDrive</a></li><li><a href="/produit">La gamme NeoDrive et ses prix</a></li></ul>
      <a href={WA} style={{ display: "inline-block", padding: "14px 20px", borderRadius: 13, background: "#111", color: "white", textDecoration: "none", fontWeight: 800 }}>Poser une question sur WhatsApp</a>
      {p.sources?.length ? <div style={{ marginTop: 28, fontSize: 13, color: "#6b7280" }}><strong>Sources</strong><ul>{p.sources.map(s => <li key={s.url}><a href={s.url} rel="nofollow noopener" target="_blank" style={{ color: "#6b7280" }}>{s.label}</a></li>)}</ul></div> : null}
    </section>
  </main>;
}
