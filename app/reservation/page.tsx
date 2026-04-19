"use client";

import { useState } from "react";

export default function Reservation() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");

  const today = new Date().toLocaleDateString("fr-FR");

  const prixVehiculeTTC = 4490;
  const transportTTC = 490;

  const totalTTC = prixVehiculeTTC + transportTTC;
  const totalHT = totalTTC / 1.2;
  const tva = totalTTC - totalHT;

  return (
    <main style={container}>

      {/* PRINT STYLE */}
      <style>{`
        @media print {
          body { margin: 0; }
          main { padding: 20mm; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
          .cgv {
            font-size: 11px;
            line-height: 1.4;
            white-space: pre-line;
          }
        }
        @page {
          size: A4;
          margin: 20mm;
        }
      `}</style>

      {/* HEADER */}
      <div style={header}>
        <div>
          <h2 style={{ margin: 0 }}>Microdrive</h2>
          <p style={small}>MK HOLDING – SIREN 908 645 393</p>
          <p style={small}>31 rue Jean Nougaro, 31600 Muret</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>DEVIS</h2>
          <p style={small}>Date : {today}</p>
        </div>
      </div>

      {/* CLIENT */}
      <div style={section}>
        <h3>Informations client</h3>

        <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} style={input}/>
        <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={input}/>
        <input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} style={input}/>
        <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} style={input}/>
        <input placeholder="Code postal" value={cp} onChange={(e) => setCp(e.target.value)} style={input}/>
        <input placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} style={input}/>
      </div>

      {/* PRICING */}
      <div style={section} className="no-break">
        <h3>Détail</h3>

        <table style={table}>
          <tbody>
            <tr>
              <td>Véhicule électrique</td>
              <td style={right}>{prixVehiculeTTC} €</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td style={right}>{transportTTC} €</td>
            </tr>
            <tr>
              <td>Total HT</td>
              <td style={right}>{totalHT.toFixed(0)} €</td>
            </tr>
            <tr>
              <td>TVA</td>
              <td style={right}>{tva.toFixed(0)} €</td>
            </tr>
            <tr style={totalRow}>
              <td>Total TTC</td>
              <td style={right}>{totalTTC} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SIGNATURE */}
      <div style={section} className="no-break">
        <p>Signature précédée de "Lu et approuvé"</p>
        <div style={signature}></div>
      </div>

      {/* PAGE BREAK */}
      <div className="page-break"></div>

      {/* FULL CGV */}
      <div className="cgv">
{`CONDITIONS GÉNÉRALES DE VENTE

1. Identité du vendeur
MK HOLDING, SAS
SIREN : 908 645 393
Siège social : 31 rue Jean Nougaro, 31600 Muret

2. Objet
Les présentes CGV régissent la vente des véhicules électriques sans permis.

3. Prix
Les prix sont exprimés en euros TTC.
Ne sont pas inclus : carte grise, assurance, frais annexes.

4. Garantie
Structure : 2 ans
Composants : 1 an
Batterie : 6 mois sous conditions strictes

5. Batterie (OBLIGATOIRE)
- Recharge après chaque utilisation
- Ne pas laisser déchargée > 24h
- Charges complètes régulières
- Max 12h de charge
- Utiliser chargeur fourni uniquement

6. Utilisation
- Routes adaptées uniquement
- Pas de surcharge
- Pas d’usage abusif

7. Autonomie
Donnée à titre indicatif, dépend de :
température, poids, relief, conduite

8. Panne
- Contact vendeur
- Diagnostic à distance
- Application des instructions

9. Réparation
- Pièces fournies
- Main d’œuvre possible si validée
- Transport à charge du client

10. Exclusions
- Accident
- Mauvaise utilisation
- Modifications
- Non-respect consignes

11. Responsabilité
Le client est responsable de l’usage et de l’entretien

12. Assurance
Obligatoire

13. Paiement
- Acompte ou paiement à livraison
- Réserve de propriété jusqu’au paiement complet

14. Litiges
Droit français – Tribunal du siège
`}
      </div>

      <button onClick={() => window.print()} style={btn}>
        Télécharger / Imprimer le devis
      </button>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial",
  background: "#fff"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "2px solid black",
  paddingBottom: 10,
  marginBottom: 20
};

const section = {
  marginBottom: 25
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  border: "1px solid #ccc",
  borderRadius: 4
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const right = {
  textAlign: "right"
};

const totalRow = {
  fontWeight: "bold",
  borderTop: "2px solid black"
};

const signature = {
  marginTop: 40,
  width: 250,
  borderTop: "1px solid black"
};

const small = {
  fontSize: 12,
  color: "#555"
};

const btn = {
  marginTop: 20,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};
