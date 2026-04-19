"use client";

import React from "react";

export default function Reservation() {

  const today = new Date().toLocaleDateString("fr-FR");

  const prixVehiculeTTC = 4490;
  const transportTTC = 490;

  const totalTTC = prixVehiculeTTC + transportTTC;
  const totalHT = totalTTC / 1.2;
  const tva = totalTTC - totalHT;

  // ✅ PDF DOWNLOAD FUNCTION
  const downloadPDF = () => {
    const content = document.getElementById("devis-print");

    if (!content) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Devis</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <main style={container}>

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

        {/* hidden fields */}
        <input type="hidden" name="_subject" value="Nouvelle réservation véhicule" />

        {/* CLIENT */}
        <div style={section}>
          <h3>Informations client</h3>

          <input name="nom" placeholder="Nom" style={input} required />
          <input name="prenom" placeholder="Prénom" style={input} required />
          <input name="telephone" placeholder="Téléphone" style={input} required />
          <input name="email" type="email" placeholder="Email" style={input} required />
          <input name="adresse" placeholder="Adresse" style={input} required />
          <input name="code_postal" placeholder="Code postal" style={input} required />
          <input name="ville" placeholder="Ville" style={input} required />
        </div>

        {/* DOCUMENTS */}
        <div style={section}>
          <h3>Documents obligatoires</h3>

          <p style={small}>Carte d’identité :</p>
          <input type="file" name="cni" accept=".pdf,image/*" style={input} required />

          <p style={small}>Justificatif de domicile :</p>
          <input type="file" name="justificatif" accept=".pdf,image/*" style={input} required />

          <p style={small}>Devis signé :</p>
          <input type="file" name="devis_signe" accept=".pdf,image/*" style={input} required />

          <p style={{ fontSize: 12 }}>
            1. Télécharger le devis ci-dessous<br/>
            2. Signer<br/>
            3. Envoyer ici
          </p>
        </div>

        {/* PDF CONTENT */}
        <div id="devis-print">

          <div style={section}>
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

          <div style={section}>
            <p>Signature précédée de "Lu et approuvé"</p>
            <div style={signature}></div>
          </div>

        </div>

        {/* DOWNLOAD BUTTON */}
        <button type="button" onClick={downloadPDF} style={btn}>
          Télécharger le devis PDF
        </button>

        {/* SUBMIT */}
        <button type="submit" style={btn}>
          Envoyer mon dossier
        </button>

      </form>

    </main>
  );
}

/* STYLES */

const container: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial",
  background: "#fff"
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "2px solid black",
  paddingBottom: 10,
  marginBottom: 20
};

const section: React.CSSProperties = {
  marginBottom: 25
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  border: "1px solid #ccc",
  borderRadius: 4
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};

const right: React.CSSProperties = {
  textAlign: "right"
};

const totalRow: React.CSSProperties = {
  fontWeight: "bold",
  borderTop: "2px solid black"
};

const signature: React.CSSProperties = {
  marginTop: 40,
  width: 250,
  borderTop: "1px solid black"
};

const small: React.CSSProperties = {
  fontSize: 12,
  color: "#555"
};

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 6
};
