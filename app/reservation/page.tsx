"use client";

import React, { useRef } from "react";

export default function Reservation() {

  const today = new Date().toLocaleDateString("fr-FR");

  const prixVehicule = 4490;
  const transport = 490;
  const carteGrise = 150;

  const totalTTC = prixVehicule + transport + carteGrise;

  const printRef = useRef<HTMLDivElement>(null);

  const downloadPDF = () => {
    if (!printRef.current) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Devis NEODRIVE</title>
          <style>
            body { font-family: Arial; padding: 30px; }
            h1 { text-align: center; margin-bottom: 20px; }
            h3 { margin-top: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .total { font-weight: bold; border-top: 2px solid black; }
            .box { margin-top: 20px; }
            .signature { margin-top: 50px; border-top: 1px solid black; width: 250px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  return (
    <main style={container}>

      <h2 style={{ textAlign: "center" }}>Réservation véhicule</h2>

      <form
        action="https://formspree.io/f/xjgjrqqg"
        method="POST"
        encType="multipart/form-data"
      >

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
          <input type="file" name="cni" required />

          <p style={small}>Justificatif de domicile :</p>
          <input type="file" name="justificatif" required />

          <p style={small}>Devis signé :</p>
          <input type="file" name="devis_signe" required />

          <p style={small}>
            1. Télécharger le devis<br/>
            2. Signer<br/>
            3. Envoyer ici
          </p>
        </div>

        {/* PDF */}
        <div ref={printRef} style={pdf}>

          <h1>DEVIS</h1>

          <p>Date : {today}</p>

          <div className="box">
            <h3>Vendeur</h3>
            <p>NEODRIVE – MK HOLDING</p>
            <p>SIREN : 908 645 393</p>
            <p>Adresse : 31 rue Jean Nougaro, 31600 Muret</p>
            <p>TVA : FR93908645393</p>
          </div>

          <div className="box">
            <h3>Acheteur</h3>
            <p>Nom : __________________________</p>
            <p>Adresse : ______________________</p>
            <p>Téléphone : ____________________</p>
          </div>

          <h3>Détail</h3>

          <table>
            <tbody>
              <tr>
                <td>Véhicule électrique</td>
                <td style={right}>{prixVehicule} €</td>
              </tr>
              <tr>
                <td>Transport</td>
                <td style={right}>{transport} €</td>
              </tr>
              <tr>
                <td>Carte grise</td>
                <td style={right}>{carteGrise} €</td>
              </tr>
              <tr className="total">
                <td>Total TTC (TVA incluse)</td>
                <td style={right}>{totalTTC} €</td>
              </tr>
            </tbody>
          </table>

          <h3>Conditions générales de vente</h3>
          <p style={small}>
            Le véhicule est vendu prêt à être livré. Paiement à la livraison possible.
            La garantie est de 2 ans pièces et main d’œuvre.
            Aucun abonnement. Batterie incluse.
            Le client accepte les conditions après signature du devis.
          </p>

          <div style={{ marginTop: 40 }}>
            <p>Signature précédée de "Lu et approuvé"</p>
            <div className="signature"></div>
          </div>

        </div>

        <button type="button" onClick={downloadPDF} style={btn}>
          Télécharger le devis PDF
        </button>

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
  fontFamily: "Arial"
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

const pdf: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  border: "1px solid #ddd",
  marginTop: 30
};

const right: React.CSSProperties = {
  textAlign: "right"
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
