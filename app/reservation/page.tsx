"use client";

export default function Reservation() {

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

      {/* FORM */}
      <form
        action="https://formspree.io/f/xjgjrqqg"
        method="POST"
        encType="multipart/form-data"
      >

        <div style={section}>
          <h3>Informations client</h3>

          <input name="nom" placeholder="Nom" style={input} required />
          <input name="prenom" placeholder="Prénom" style={input} required />
          <input name="telephone" placeholder="Téléphone" style={input} required />
          <input name="adresse" placeholder="Adresse" style={input} required />
          <input name="code_postal" placeholder="Code postal" style={input} required />
          <input name="ville" placeholder="Ville" style={input} required />
        </div>

        {/* DOCUMENTS */}
        <div style={section}>
          <h3>Documents obligatoires</h3>

          <p style={small}>Carte d’identité :</p>
          <input type="file" name="cni" accept="image/*,.pdf" style={input} required />

          <p style={small}>Justificatif de domicile :</p>
          <input type="file" name="justificatif" accept="image/*,.pdf" style={input} required />

          <p style={small}>Devis signé :</p>
          <input type="file" name="devis_signe" accept="image/*,.pdf" style={input} required />

          <p style={{ fontSize: 12, marginTop: 10 }}>
            Vos documents sont traités de manière confidentielle.
          </p>
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

        {/* CGV */}
        <div className="cgv">
{`CONDITIONS GÉNÉRALES DE VENTE

1. Identité du vendeur
MK HOLDING – SIREN 908 645 393
31 rue Jean Nougaro, 31600 Muret

2. Objet
Vente de véhicules électriques sans permis

3. Prix
Prix TTC – hors carte grise et assurance

4. Garantie
Structure : 2 ans
Composants : 1 an
Batterie : 6 mois

5. Batterie
Recharge obligatoire après utilisation
Pas de décharge prolongée

6. Utilisation
Routes adaptées uniquement

7. Autonomie
Indicative selon conditions

8. Panne
Diagnostic à distance

9. Réparation
Transport à charge client

10. Responsabilité
Client responsable de l’usage

11. Paiement
Paiement à la livraison

12. Litiges
Droit français
`}
        </div>

        {/* SUBMIT */}
        <button type="submit" style={btn}>
          Envoyer mon dossier
        </button>

      </form>

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
  padding: 15,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 8
};
