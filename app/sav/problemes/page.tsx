import type { Metadata } from "next";
import { SAV_PROBLEMS, SAV_WHATSAPP } from "../../../lib/sav-problems";

export const metadata: Metadata = {
  title: "Problèmes et questions déjà rencontrés par nos clients | SAV NeoDrive",
  description: "Les réponses aux questions et problèmes déjà rencontrés par les clients NeoDrive : recharge, batterie, démarrage. Et si besoin, un technicien vous répond.",
  alternates: { canonical: "https://www.easydrive-auto.fr/sav/problemes" },
};

const linkBtn: React.CSSProperties = { display: "inline-block", background: "#141414", color: "#fff", padding: "11px 16px", borderRadius: 12, fontWeight: 800, textDecoration: "none" };

export default function SavProblemes() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 72px", fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif", color: "#141414", lineHeight: 1.55, background: "#faf8f5", minHeight: "100vh" }}>
      <p style={{ margin: 0, color: "#f05a28", fontWeight: 800, letterSpacing: 1, fontSize: 13 }}>SERVICE APRÈS-VENTE NEODRIVE</p>
      <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "6px 0 10px" }}>Problèmes et questions déjà rencontrés par nos clients</h1>
      <p style={{ margin: "0 0 18px", color: "#444" }}>Avant d’ouvrir une demande, jetez un œil ici : la solution est souvent simple. Et si ce n’est pas le cas, un technicien NeoDrive vous répond.</p>

      <nav aria-label="Sommaire" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 18px" }}>
        {SAV_PROBLEMS.map(p => <a key={p.id} href={`#${p.id}`} style={{ background: "#fff", border: "1px solid #ece7df", borderRadius: 999, padding: "8px 14px", color: "#141414", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>{p.icon} {p.title}</a>)}
      </nav>

      {SAV_PROBLEMS.map(p => (
        <section key={p.id} id={p.id} style={{ background: "#fff", border: "1px solid #ece7df", borderRadius: 16, padding: "14px 16px", margin: "0 0 12px", scrollMarginTop: 16 }}>
          <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>{p.icon} {p.title}</h2>
          {p.intro ? <p style={{ margin: "0 0 8px" }}>{p.intro}</p> : null}
          {p.checks?.length ? <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>{p.checks.map(c => <li key={c}>{c}</li>)}</ol> : null}
          {p.warning ? <p style={{ margin: "10px 0 0", background: "#fff1ea", border: "1px solid #f8c9b4", borderRadius: 12, padding: "10px 12px" }}>⚠️ {p.warning}</p> : null}
          {p.links?.length ? <p style={{ margin: "12px 0 0", display: "flex", flexWrap: "wrap", gap: 8 }}>{p.links.map(l => <a key={l.href} href={l.href} style={linkBtn}>{l.label}</a>)}</p> : null}
        </section>
      ))}

      <section style={{ background: "#141414", color: "#fff", borderRadius: 18, padding: "18px 16px", marginTop: 20 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>Votre situation n’est pas dans la liste ?</h2>
        <p style={{ margin: "0 0 12px", color: "#ddd" }}>Décrivez-la avec une photo ou une courte vidéo : un technicien NeoDrive étudie votre demande et revient vers vous.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a href="/sav#demande" style={{ ...linkBtn, background: "#f05a28" }}>Ouvrir une demande SAV</a>
          <a href={SAV_WHATSAPP} target="_blank" rel="noreferrer" style={{ ...linkBtn, background: "#1fa855" }}>Écrire sur WhatsApp</a>
        </div>
      </section>
    </main>
  );
}
