const MODULES = [
  ["Découvrir NeoDrive", "L’entreprise, nos valeurs, la voiture sans permis électrique et nos clients."],
  ["La gamme et les prix", "Les modèles, les finitions, les options et les frais de livraison."],
  ["Ce que dit la loi", "Qui peut conduire une voiture sans permis, l’assurance, la carte grise."],
  ["Financement et livraison", "Le paiement, le financement, les délais et le déroulé de la livraison."],
  ["Le premier appel", "Se présenter, écouter, comprendre le besoin du client."],
  ["Répondre aux objections", "Le prix, l’autonomie, la confiance, la vente à distance."],
  ["WhatsApp et écrit", "Écrire un message clair, poli et précis ; ce qu’on ne promet jamais."],
  ["Les outils NeoDrive", "L’espace prospects, les comptes-rendus d’appel et le rapport du jour."],
];
const PATH = [
  ["🎓", "Formation", "Les 8 modules, à son rythme, sur téléphone ou ordinateur."],
  ["📝", "QCM", "Un questionnaire à la fin de chaque module : il faut 80 % de bonnes réponses pour valider."],
  ["🎧", "Écoute", "Écouter des appels réels avec un closer confirmé."],
  ["📞", "Premiers appels", "Appels accompagnés, avec un retour après chaque journée."],
  ["⭐", "Closer NeoDrive", "Accès complet à l’espace prospects."],
];

export default function Academy() {
  return <main style={{ background: "#f6f4f0", minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#141414" }}><div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 16px 80px" }}>
    <p style={{ margin: "0 0 6px" }}><a href="/organisation" style={{ color: "#f05a28", fontWeight: 700, textDecoration: "none" }}>← Organisation</a></p>
    <h1 style={{ fontSize: 28, margin: "6px 0" }}>🎓 NeoDrive Academy</h1>
    <p style={{ display: "inline-block", background: "#fff1ea", color: "#b4410f", fontWeight: 700, borderRadius: 999, padding: "4px 12px", margin: "4px 0 10px" }}>Bientôt disponible</p>
    <p style={{ fontSize: 16, lineHeight: 1.55 }}>La formation de l’équipe NeoDrive est en préparation. Voici le programme prévu pour devenir closer (conseiller commercial).</p>
    <h2 style={{ fontSize: 19, marginTop: 24 }}>Le parcours closer</h2>
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>{PATH.map(([i, t, d], n) => <li key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 14, padding: 12 }}>
      <span style={{ fontSize: 26 }} aria-hidden>{i}</span><span><b>Étape {n + 1} · {t}</b><br /><span style={{ color: "#666", fontSize: 14 }}>{d}</span></span></li>)}</ol>
    <h2 style={{ fontSize: 19, marginTop: 24 }}>Les 8 modules</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>{MODULES.map(([t, d], n) => <div key={t} style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 14, padding: 12 }}>
      <div style={{ color: "#f05a28", fontWeight: 800, fontSize: 13 }}>MODULE {n + 1}</div><b>{t}</b><p style={{ color: "#666", fontSize: 14, margin: "4px 0 0" }}>{d}</p><p style={{ fontSize: 12, color: "#888", margin: "6px 0 0" }}>QCM final · 80 % pour valider</p></div>)}</div>
  </div></main>;
}
