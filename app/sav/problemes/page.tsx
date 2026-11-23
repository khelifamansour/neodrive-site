import type { Metadata } from "next";
import Image from "next/image";
import { SAV_PROBLEMS, SAV_WHATSAPP } from "../../../lib/sav-problems";

export const metadata: Metadata = {
  title: "Problèmes et questions déjà rencontrés par nos clients | SAV NeoDrive",
  description: "Les solutions aux problèmes déjà rencontrés par les clients NeoDrive : voiture bloquée en P, ne s'allume pas, eau par les portes, chargeur, autonomie, test des batteries.",
  alternates: { canonical: "https://www.easydrive-auto.fr/sav/problemes" },
};

const linkBtn: React.CSSProperties = { display: "inline-block", background: "#141414", color: "#fff", padding: "11px 16px", borderRadius: 12, fontWeight: 800, textDecoration: "none" };
const h3: React.CSSProperties = { fontSize: 15, margin: "12px 0 6px", color: "#f05a28", textTransform: "uppercase", letterSpacing: 0.5 };

function Help() {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
    <a href="/sav#demande" style={{ ...linkBtn, background: "#f05a28", padding: "9px 14px", fontSize: 15 }}>Demande SAV</a>
    <a href={SAV_WHATSAPP} target="_blank" rel="noreferrer" style={{ ...linkBtn, background: "#1fa855", padding: "9px 14px", fontSize: 15 }}>WhatsApp</a>
  </div>;
}

export default function SavProblemes() {
  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 72px", fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif", color: "#141414", lineHeight: 1.55 }}>
        <p style={{ margin: 0, color: "#f05a28", fontWeight: 800, letterSpacing: 1, fontSize: 13 }}>SERVICE APRÈS-VENTE NEODRIVE</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "6px 0 10px" }}>Problèmes et questions déjà rencontrés par nos clients</h1>
        <p style={{ margin: "0 0 16px", color: "#444" }}>La solution est souvent simple. Choisissez votre situation et suivez les étapes, dans l’ordre. Et si ça ne suffit pas, un technicien NeoDrive vous répond.</p>

        <nav aria-label="Sommaire" style={{ background: "#fff", border: "1px solid #ece7df", borderRadius: 16, padding: "10px 12px", margin: "0 0 18px" }}>
          <b style={{ display: "block", margin: "2px 4px 6px" }}>Votre situation :</b>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
            {SAV_PROBLEMS.map(p => <li key={p.id}><a href={`#${p.id}`} style={{ display: "flex", gap: 8, padding: "8px 6px", borderRadius: 10, color: "#141414", textDecoration: "none", fontWeight: 600 }}><span aria-hidden="true">{p.icon}</span><span>{p.title}</span></a></li>)}
          </ol>
        </nav>

        {SAV_PROBLEMS.map(p => (
          <section key={p.id} id={p.id} style={{ background: "#fff", border: "1px solid #ece7df", borderRadius: 16, padding: "16px", margin: "0 0 14px", scrollMarginTop: 16 }}>
            <h2 style={{ fontSize: 20, lineHeight: 1.25, margin: 0 }}>{p.icon} {p.title}</h2>
            <h3 style={h3}>Pourquoi</h3>
            <p style={{ margin: 0 }}>{p.why}</p>
            <h3 style={h3}>Que faire</h3>
            <ol style={{ margin: "0 0 0 22px", padding: 0, display: "grid", gap: 6 }}>{p.steps.map(s => <li key={s}>{s}</li>)}</ol>
            {p.warning ? <p style={{ margin: "12px 0 0", background: "#fff1ea", border: "1px solid #f8c9b4", borderRadius: 12, padding: "10px 12px" }}>⚠️ {p.warning}</p> : null}
            {p.photos?.length ? <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {p.photos.map(ph => <figure key={ph.src} style={{ margin: 0 }}>
                <Image src={ph.src} alt={ph.alt} width={ph.width} height={ph.height} sizes="(max-width: 760px) 100vw, 728px" style={{ width: "100%", height: "auto", maxHeight: 520, objectFit: "contain", background: "#f1eee9", borderRadius: 12 }} />
                {ph.caption ? <figcaption style={{ fontSize: 14, color: "#555", marginTop: 4 }}>{ph.caption}</figcaption> : null}
              </figure>)}
            </div> : null}
            {p.after ? <p style={{ margin: "12px 0 0", fontWeight: 600 }}>{p.after}</p> : null}
            {p.links?.length ? <p style={{ margin: "12px 0 0", display: "flex", flexWrap: "wrap", gap: 8 }}>{p.links.map(l => <a key={l.href} href={l.href} style={{ ...linkBtn, padding: "9px 14px", fontSize: 15 }}>{l.label}</a>)}</p> : null}
            <Help />
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
      </div>
    </main>
  );
}
