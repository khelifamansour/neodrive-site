"use client";
import { useEffect, useState } from "react";

/** Consignes de sécurité pour le dépotage des conteneurs : même accès que Logistique / Conteneurs (membre avec l’une des deux sections, ou le fondateur). */
const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28", red: "#b91c1c", green: "#15803d" };
const PDF = "/depotage/consignes-dechargement-neodrive.pdf";
const PDF_URL = "https://www.easydrive-auto.fr/depotage/consignes-dechargement-neodrive.pdf";
const WA = `https://wa.me/?text=${encodeURIComponent(`⚠️ NeoDrive – Consignes de sécurité pour le déchargement des conteneurs. À lire avant chaque dépotage : ${PDF_URL}`)}`;
const PHONE = "06 89 78 17 10";

const RULES: { title: string; text: React.ReactNode }[] = [
  { title: "Conteneur POSÉ AU SOL", text: <>Le conteneur est posé au sol (ou à quai) <b>avant</b> de sortir les châssis. Jamais sur le camion.</> },
  { title: "Une CALE sous la roue avant", text: <>Mettre une cale (petit cube) sous la roue avant <b>avant</b> de bouger le châssis.</> },
  { title: "Fourches À FOND dans les trous", text: <>Les fourches vont à fond dans les trous du châssis. Si le châssis est incliné : fourches <b>À L’INTÉRIEUR DU TRIANGLE</b>.</> },
  { title: "Très étroit : rien ne doit taper", text: <>Le toit, les côtés (ailes, rétroviseurs) et <b>SURTOUT LE PARE-CHOCS AVANT EN BAS</b> ne doivent jamais taper le conteneur.</> },
  { title: "Lever JUSTE ASSEZ", text: <>Ne lever la voiture que juste assez pour la déplacer : <b>plusieurs toits ont déjà été abîmés</b> contre le haut du conteneur.</> },
  { title: "Ne jamais toucher la carrosserie", text: <>Même en retirant le châssis : nos voitures sont en tôle d’acier, <b>la moindre touche laisse une marque</b>. Manipuler avec attention.</> },
  { title: "Pivoter le châssis : attention aux fourches", text: <>Nous utilisions une chèvre (grue d’atelier). Avec un chariot élévateur (Fenwick), <b>les fourches peuvent avancer et taper le pare-chocs</b> : manœuvrer très délicatement, les réparations coûtent très cher.</> },
  { title: "La voiture peut pivoter et se renverser", text: <>Sortir lentement, bien droit, avec une personne qui guide. <b>Personne dessous ni à côté.</b></> },
  { title: "Un doute : on arrête", text: <>On arrête tout et on appelle Mansour au <a href="tel:+33689781710" style={{ color: C.brand, fontWeight: 800 }}>{PHONE}</a>.</> },
];

const PHOTOS: { src: string; ok: boolean; caption: string }[] = [
  { src: "/depotage/accident_annote.jpg", ok: false, caption: "Accident réel : châssis mal manipulé, la voiture s’est renversée." },
  { src: "/depotage/camion_annote.jpg", ok: false, caption: "NON : on ne sort pas les châssis d’un conteneur encore sur le camion." },
  { src: "/depotage/personne_dessous.jpg", ok: false, caption: "NON : personne sous la charge, jamais." },
  { src: "/depotage/chassis_au_sol.jpg", ok: true, caption: "OUI : les châssis sont sortis et posés au sol." },
];

const CHECKS = [
  "Conteneur posé au sol (ou à quai)",
  "Cales en place sous les roues avant",
  "Fourches à fond dans les trous / dans le triangle",
  "Une personne guide la sortie",
  "Zone dégagée autour du chariot",
  "Personne dessous ni à côté de la charge",
];

const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, marginTop: 14 };
const btn = (bg: string): React.CSSProperties => ({ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: bg, color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none" });

function Photo({ src, ok, caption, big }: { src: string; ok: boolean; caption: string; big?: boolean }) {
  const col = ok ? C.green : C.red;
  return <figure style={{ margin: 0, border: `4px solid ${col}`, borderRadius: 16, overflow: "hidden", background: "#fff" }}>
    <a href={src} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={caption} loading={big ? "eager" : "lazy"} style={{ display: "block", width: "100%", height: "auto" }} />
    </a>
    <figcaption style={{ padding: "10px 12px", fontSize: big ? 16 : 14, lineHeight: 1.4 }}>
      <b style={{ color: col }}>{ok ? "✅ OUI" : "⛔ NON"}</b> · {caption}
    </figcaption>
  </figure>;
}

export default function Dechargement() {
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [checked, setChecked] = useState<boolean[]>(() => CHECKS.map(() => false));

  useEffect(() => {
    (async () => {
      let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ }
      const r = await fetch("/api/organisation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "me", passcode: pc }) }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      const allowed = !!j?.ok && (j.who === "owner" || (Array.isArray(j.sections) && (j.sections.includes("logistique") || j.sections.includes("conteneurs"))));
      setState(allowed ? "ok" : "denied");
    })();
  }, []);

  const done = checked.filter(Boolean).length;
  const all = done === CHECKS.length;

  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>
      <a href="/organisation" style={{ display: "flex", alignItems: "center", gap: 10, color: C.ink, textDecoration: "none" }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: C.brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18 }}>N</span>
        <b style={{ fontSize: 16 }}>NeoDrive · Organisation</b>
      </a>

      {state === "loading" ? <p style={{ color: C.mute, marginTop: 30 }}>Chargement…</p> : state === "denied" ? <div style={card}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Accès réservé</h1>
        <p style={{ margin: 0, lineHeight: 1.5 }}>Cette page est ouverte à l’équipe Logistique / Conteneurs. <a href="/organisation" style={{ color: C.brand, fontWeight: 700 }}>Connectez-vous avec votre code sur la page Organisation</a>, puis revenez ici.</p>
      </div> : <>
        <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: "22px 0 4px" }}>Déchargement des conteneurs</h1>
        <p style={{ color: C.mute, margin: 0 }}>Consignes de sécurité pour le dépotage — à relire avant chaque conteneur.</p>

        <div style={{ background: C.red, color: "#fff", borderRadius: 18, padding: 16, marginTop: 16, lineHeight: 1.5 }}>
          <b style={{ fontSize: 18, display: "block", marginBottom: 6 }}>⚠️ DANGER</b>
          Les voitures voyagent sur des <b>châssis en acier</b>. Un châssis mal manipulé peut basculer et <b>la voiture tombe</b>. C’est déjà arrivé : une voiture est tombée d’un camion sur l’un de nos conteneurs.
        </div>

        <section style={card}>
          <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Les 6 règles</h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {RULES.map((r, i) => <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", borderTop: i ? `1px solid ${C.line}` : 0, paddingTop: i ? 10 : 0 }}>
              <span style={{ flex: "0 0 34px", height: 34, borderRadius: 999, background: i === 5 ? C.brand : C.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>{i + 1}</span>
              <span style={{ lineHeight: 1.45 }}><b style={{ display: "block", fontSize: 16 }}>{r.title}</b>{r.text}</span>
            </li>)}
          </ol>
          <a href="tel:+33689781710" style={{ ...btn(C.brand), marginTop: 14 }}>📞 Appeler Mansour · {PHONE}</a>
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>En photos</h2>
          <Photo big src="/depotage/zoom_conteneur.jpg" ok={false} caption="ATTENTION DANGER : très étroit. Le toit et les côtés ne doivent pas toucher. Le PARE-CHOCS AVANT en bas est le risque n°1." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
            {PHOTOS.map(p => <Photo key={p.src} {...p} />)}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Avant chaque dépotage</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {CHECKS.map((c, i) => <label key={c} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 12px", borderRadius: 12, border: `1px solid ${checked[i] ? C.green : C.line}`, background: checked[i] ? "#f0fdf4" : "#fff", fontSize: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={checked[i]} onChange={() => setChecked(x => x.map((v, k) => k === i ? !v : v))} style={{ width: 24, height: 24, accentColor: C.green, flex: "0 0 auto" }} />
              <span>{c}</span>
            </label>)}
          </div>
          <p style={{ margin: "12px 0 0", fontWeight: 800, color: all ? C.green : C.red }}>{all ? "✅ Tout est vérifié : vous pouvez commencer, lentement." : `⛔ ${done}/${CHECKS.length} vérifié${done > 1 ? "s" : ""} : on ne commence pas tant que tout n’est pas coché.`}</p>
          {done ? <button onClick={() => setChecked(CHECKS.map(() => false))} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", font: "inherit", fontSize: 14, cursor: "pointer" }}>Tout décocher (conteneur suivant)</button> : null}
        </section>

        <section style={{ ...card, display: "grid", gap: 10 }}>
          <a href={PDF} target="_blank" rel="noreferrer" download style={btn(C.ink)}>📄 Télécharger la plaquette (PDF)</a>
          <a href={WA} target="_blank" rel="noreferrer" style={btn("#16a34a")}>💬 Partager sur WhatsApp</a>
          <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>Envoyez la plaquette au cariste et au prestataire de dépotage avant l’arrivée du conteneur.</p>
        </section>
      </>}
    </div>
  </main>;
}
