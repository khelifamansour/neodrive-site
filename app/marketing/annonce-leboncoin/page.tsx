"use client";
import { useEffect, useMemo, useState } from "react";
import { seoCities } from "../../../lib/seo-cities";

/**
 * Modèle d'annonce Leboncoin NeoDrive (organisation › Marketing) : on choisit une ville, le titre et le texte se remplissent
 * avec les communes voisines et le département ; boutons « Copier ». Pas de lien ni de numéro dans le texte (règles Leboncoin) :
 * le numéro QuickTalk va uniquement dans le champ téléphone de l'annonce. Accès : fondateur ou section « contenu ».
 */
const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28", green: "#15803d" };
const QUICKTALK_NOTE = "Numéro QuickTalk dans le champ « téléphone » de l'annonce, jamais dans le texte.";

function titles(city: string) {
  return [
    `Voiture sans permis électrique neuve dès 3 990 € – ${city}`,
    `Voiture sans permis électrique NEUVE en stock – ${city}`,
    `Voiturette sans permis neuve livrée avant Noël – ${city}`,
    `VSP électrique neuve, livrée chez vous – ${city}`,
  ];
}

function body(city: string, nearby: string[], department: string) {
  const towns = [city, ...nearby].join(", ");
  return `👉 Pour nous retrouver, tapez « NeoDrive voiture sans permis » sur Google.

Voiture sans permis électrique neuve, à partir de 3 990 €, livrée chez vous à ${city}${nearby[0] ? `, ${nearby[0]}` : ""} et dans tout le département (${department}).

✅ La Confort en stock se réserve sans acompte : paiement uniquement à la livraison.

Pourquoi un prix aussi bas ?
NeoDrive est une marque française basée à Toulouse, 7 ans de métier dans la voiture sans permis. Nous vendons directement de l'usine au particulier, sans concession ni intermédiaire. Vous roulez en voiturette neuve pour bien moins cher qu'avec une Citroën Ami, une Fiat Topolino, une Aixam ou une Ligier.

Trois versions

⭐ Confort, 4 990 € : notre best-seller, en stock, livrée en 2 à 3 semaines, avant les fêtes, paiement à la livraison
- Jusqu'à 70 km d'autonomie, recharge sur une simple prise de maison
- Chauffage, bien au chaud l'hiver
- Caméra et radar de recul
- Assistance en côte au démarrage
- Radio, Bluetooth, USB
- Toit ouvrant avec ventilateurs

Essentielle, 3 990 € : version de base sans ces équipements, fabriquée sur commande (6 à 8 mois), paiement à la commande
Confort Plus, 5 990 € : plus d'autonomie, fabriquée sur commande (6 à 8 mois), paiement à la commande

Solide et durable
- Carrosserie en acier, pas en plastique : plus sûre et plus durable
- Extrêmement fiable et robuste
- Garantie 2 ans directement avec l'usine
- Un souci ? Nous venons chez vous

Pour tous les jours
Courses, travail, rendez-vous ou lycée dès 14 ans avec le permis AM (BSR). Cabine fermée, à l'abri du vent et de la pluie, facile à garer, avec un grand coffre.

Nous livrons à ${towns} et dans tout le département (${department}).

✅ Réservez la Confort sans rien payer : par message ici ou sur le site NeoDrive. Vous la payez uniquement quand elle est livrée devant chez vous.

Livraison à domicile de 450 € à 790 € selon votre département. Carte grise : 150 €.`;
}

const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, marginTop: 14 };
const btn = (bg: string): React.CSSProperties => ({ padding: "10px 14px", borderRadius: 12, border: 0, background: bg, color: "#fff", fontWeight: 800, font: "inherit", cursor: "pointer" });

export default function AnnonceLeboncoin() {
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [slug, setSlug] = useState("toulouse");
  const [copied, setCopied] = useState("");
  useEffect(() => {
    (async () => {
      let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ }
      const r = await fetch("/api/organisation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "me", passcode: pc }) }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      setState(!!j?.ok && (j.who === "owner" || (Array.isArray(j.sections) && j.sections.includes("contenu"))) ? "ok" : "denied");
    })();
  }, []);
  const cities = useMemo(() => [...seoCities].sort((a, b) => a.city.localeCompare(b.city, "fr")), []);
  const c = cities.find(x => x.slug === slug) || cities[0];
  const text = body(c.city, c.nearby, `${c.department} – ${c.departmentCode}`);
  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v); } catch { prompt("À copier", v); } setCopied(k); setTimeout(() => setCopied(""), 1500); };

  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>
      <a href="/organisation" style={{ color: C.ink, textDecoration: "none", fontWeight: 800 }}>← NeoDrive · Organisation</a>
      {state === "loading" ? <p style={{ color: C.mute }}>Chargement…</p> : state === "denied" ? <div style={card}>Accès réservé. <a href="/organisation" style={{ color: C.brand }}>Connectez-vous sur la page Organisation</a>.</div> : <>
        <h1 style={{ fontSize: 26, margin: "18px 0 4px" }}>Annonce Leboncoin type</h1>
        <p style={{ color: C.mute, margin: 0 }}>Choisissez la ville : le titre et le texte se remplissent avec les communes voisines. Une ville = une annonce, jamais deux fois la même.</p>

        <section style={card}>
          <label style={{ fontWeight: 800 }}>Ville
            <select value={slug} onChange={e => setSlug(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${C.line}`, font: "inherit" }}>
              {cities.map(x => <option key={x.slug} value={x.slug}>{x.city} ({x.departmentCode})</option>)}
            </select>
          </label>
          <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: C.mute, lineHeight: 1.5, fontSize: 14 }}>
            <li><b>Prix de l’annonce :</b> 4 990 € (la Confort en stock) pour éviter les « c’est 3 990 € ou 4 990 € ? ».</li>
            <li><b>Téléphone :</b> {QUICKTALK_NOTE}</li>
            <li><b>Photo principale :</b> une photo différente pour chaque ville (livraison client de préférence), sinon Leboncoin supprime le doublon.</li>
            <li>Pas de lien ni de numéro dans le texte : Leboncoin bloque l’annonce.</li>
          </ul>
        </section>

        <section style={card}>
          <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Titre (au choix)</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {titles(c.city).map((t, i) => <div key={t} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 10px" }}>
              <span style={{ fontSize: 15 }}>{t}</span>
              <button onClick={() => copy("t" + i, t)} style={btn(copied === "t" + i ? C.green : C.ink)}>{copied === "t" + i ? "Copié ✓" : "Copier"}</button>
            </div>)}
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Description</h2>
            <button onClick={() => copy("b", text)} style={btn(copied === "b" ? C.green : C.brand)}>{copied === "b" ? "Copié ✓" : "Copier le texte"}</button>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.5, margin: "12px 0 0" }}>{text}</pre>
        </section>
      </>}
    </div>
  </main>;
}
