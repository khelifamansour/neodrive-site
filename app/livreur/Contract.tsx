import { COMPANY, CONTRACT_TITLE, CONTRACT_VERSION, EMPLOYEE_CONTRACT_TITLE, EMPLOYEE_CONTRACT_VERSION, contractSections, employeeContractSections, type Employment } from "../../lib/driver-docs";

/** Texte du contrat (lecture seule) : prestation de services, ou CDD pour un salarié. */
export default function Contract({ salarie = false, name = "", employment = null }: { salarie?: boolean; name?: string; employment?: Employment | null }) {
  if (salarie) {
    const e = employment || {};
    return <div style={{ display: "grid", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
      <h2 style={{ margin: 0 }}>{EMPLOYEE_CONTRACT_TITLE}</h2>
      <p style={{ margin: 0, color: "#666", fontSize: 13 }}>{e.title || "Chauffeur-livreur et préparateur de véhicules"} · {COMPANY.name} · version du {EMPLOYEE_CONTRACT_VERSION.replace("cdd-", "").split("-").reverse().join("/")}</p>
      {employeeContractSections(name, e).map(x => <div key={x.title}><b>{x.title}</b><p style={{ margin: "4px 0 0" }}>{x.text}</p></div>)}
    </div>;
  }
  return <div style={{ display: "grid", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
    <h2 style={{ margin: 0 }}>{CONTRACT_TITLE}</h2>
    <p style={{ margin: 0, color: "#666", fontSize: 13 }}>Prestataire indépendant, avec le véhicule, la remorque et la carte de frais de {COMPANY.name} · version du {CONTRACT_VERSION.split("-").reverse().join("/")}</p>
    {contractSections().map(x => <div key={x.title}><b>{x.title}</b><p style={{ margin: "4px 0 0" }}>{x.text}</p></div>)}
  </div>;
}
