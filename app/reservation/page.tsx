"use client";

import React, { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Reservation() {

  const printRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    ville: ""
  });

  const prixVehicule = 4490;
  const transport = 490;
  const carteGrise = 150;
  const totalTTC = prixVehicule + transport + carteGrise;

  const today = new Date().toLocaleDateString("fr-FR");

  const handleChange = (e: any) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  const generatePDF = async () => {
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();

    const imgProps = pdf.getImageProperties(imgData);
    const height = (imgProps.height * width) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("devis-neodrive.pdf");
  };

  return (
    <main style={container}>

      <h2 style={{ textAlign: "center" }}>Réservation véhicule</h2>

      {/* FORM */}
      <div style={section}>
        <input name="nom" placeholder="Nom" onChange={handleChange} style={input} />
        <input name="prenom" placeholder="Prénom" onChange={handleChange} style={input} />
        <input name="telephone" placeholder="Téléphone" onChange={handleChange} style={input} />
        <input name="email" placeholder="Email" onChange={handleChange} style={input} />
        <input name="adresse" placeholder="Adresse" onChange={handleChange} style={input} />
        <input name="ville" placeholder="Ville" onChange={handleChange} style={input} />
      </div>

      {/* PDF */}
      <div ref={printRef} style={pdf}>

        <div style={header}>
          <div>
            <h2>NEODRIVE</h2>
            <p>MK HOLDING</p>
            <p>SIREN : 908 645 393</p>
            <p>31 rue Jean Nougaro, 31600 Muret</p>
            <p>TVA : FR93908645393</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <h1>DEVIS</h1>
            <p>Date : {today}</p>
          </div>
        </div>

        <hr />

        <div style={block}>
          <h3>Acheteur</h3>
          <p>{client.nom} {client.prenom}</p>
          <p>{client.adresse}</p>
          <p>{client.ville}</p>
          <p>{client.telephone}</p>
          <p>{client.email}</p>
        </div>

        <div style={block}>
          <h3>Détail</h3>

          <table style={table}>
            <tbody>
              <tr>
                <td>Véhicule électrique</td>
                <td>{prixVehicule} €</td>
              </tr>
              <tr>
                <td>Livraison + mise en route</td>
                <td>{transport} €</td>
              </tr>
              <tr>
                <td>Carte grise</td>
                <td>{carteGrise} €</td>
              </tr>
              <tr style={totalRow}>
                <td>Total TTC</td>
                <td>{totalTTC} €</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={block}>
          <h3>Conditions générales de vente</h3>

          <p style={small}>
            Le véhicule est vendu prêt à être livré. Paiement à la livraison possible.
            Livraison sous réserve de disponibilité.
          </p>

          <p style={small}>
            Garantie :
            Structure et châssis : 2 ans.
            Composants mécaniques et électroniques : 1 an.
            Batterie : garantie incluse.
          </p>

          <p style={small}>
            Le client reconnaît avoir pris connaissance des conditions générales de vente
            et les accepte après signature du devis.
          </p>
        </div>

        <div style={{ marginTop: 50 }}>
          <p>Signature précédée de "Lu et approuvé"</p>
          <div style={signature}></div>
        </div>

      </div>

      <button onClick={generatePDF} style={btn}>
        Télécharger le devis PDF
      </button>

    </main>
  );
}

/* STYLES */

const container: React.CSSProperties = {
  maxWidth: 700,
  margin: "auto",
  padding: 20,
  fontFamily: "Arial"
};

const section: React.CSSProperties = {
  marginBottom: 20
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  border: "1px solid #ccc"
};

const pdf: React.CSSProperties = {
  background: "#fff",
  padding: 30,
  border: "1px solid #ddd"
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between"
};

const block: React.CSSProperties = {
  marginTop: 20
};

const table: React.CSSProperties = {
  width: "100%",
  marginTop: 10
};

const totalRow: React.CSSProperties = {
  fontWeight: "bold",
  borderTop: "2px solid black"
};

const small: React.CSSProperties = {
  fontSize: 12
};

const signature: React.CSSProperties = {
  marginTop: 40,
  width: 250,
  borderTop: "1px solid black"
};

const btn: React.CSSProperties = {
  marginTop: 20,
  padding: 12,
  width: "100%",
  background: "black",
  color: "white",
  border: "none"
};
