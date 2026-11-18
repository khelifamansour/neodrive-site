import { COMPANY, CONTRACT_TITLE, CONTRACT_VERSION, contractSections } from "../../lib/driver-docs";

/** Texte du contrat de prestation (lecture seule). */
export default function Contract() {
  return <div style={{ display: "grid", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
    <h2 style={{ margin: 0 }}>{CONTRACT_TITLE}</h2>
    <p style={{ margin: 0, color: "#666", fontSize: 13 }}>Prestataire indépendant, avec le véhicule, la remorque et la carte de frais de {COMPANY.name} · version du {CONTRACT_VERSION.split("-").reverse().join("/")}</p>
    {contractSections().map(x => <div key={x.title}><b>{x.title}</b><p style={{ margin: "4px 0 0" }}>{x.text}</p></div>)}
  </div>;
}
