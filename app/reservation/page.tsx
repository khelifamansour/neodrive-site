"use client";

import { useState } from "react";

export default function Reservation() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");

  return (
    <main style={container}>

      {/* HEADER */}
      <h1 style={title}>Réserver votre véhicule</h1>

      {/* FORM */}
      <div style={{ marginTop: 20 }}>
        <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} style={input}/>
        <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={input}/>
        <input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} style={input}/>
        <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} style={input}/>
        <input placeholder="Code postal" value={cp} onChange={(e) => setCp(e.target.value)} style={input}/>
        <input placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} style={input}/>
      </div>

      {/* DEVIS */}
      <div id="devis" style={devisBox}>

        <h2 style={{ textAlign: "center", marginBottom: 10 }}>DEVIS</h2>

        <div style={row}>
          <div>
            <strong>Client</strong><br/>
            {prenom} {nom}<br/>
            {adresse}<br/>
            {cp} {ville}<br/>
            {phone}
          </div>

          <div>
            <strong>MK HOLDING</strong><br/>
            31 rue Jean Nougaro<br/>
            31600 Muret<br/>
            SIREN: 908 645 393<br/>
            TVA: Non applicable
          </div>
        </div>

        <hr/>

        <table style={table}>
          <tbody>
            <tr>
              <td>NeoDrive SWITCH</td>
              <td style={right}>4 490 €</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td style={right}>490 €</td>
            </tr>
          </tbody>
        </table>

        <hr/>

        <p><strong>Total TTC: 4 980 €</strong></p>
        <p>Acompte: 200 €</p>

        <hr/>

        <p><strong>Paiement:</strong></p>
        <p>IBAN: FR76 2823 3000 0142 1307 1051 008</p>
        <p>BIC: REVOFRP2</p>

        <p style={{ marginTop: 20 }}>
          Signature précédée de "Bon pour accord"
        </p>

      </div>

      <button onClick={() => window.print()} style={btn}>
        Télécharger le devis PDF
      </button>

      {/* PAYMENT */}
      <div style={{ marginTop: 30 }}>
        <a href="https://buy.stripe.com/YOUR_LINK" target="_blank">
          <button style={payBtn}>Payer l’acompte</button>
        </a>
      </div>

      {/* DOCUMENT UPLOAD */}
      <div style={{ marginTop: 40 }}>
        <h2>Envoyer vos documents</h2>

        <p>Merci d’envoyer :</p>

        <div style={box}>
          ✔ Pièce d’identité<br/>
          ✔ Justificatif de domicile<br/>
          ✔ Devis signé
        </div>

        <a href="https://tally.so/r/YOUR_FORM" target="_blank">
          <button style={btn}>
            Envoyer mes documents
          </button>
        </a>
      </div>

      {/* PRINT FIX */}
      <style>
        {`
        @media print {
          body * { visibility: hidden; }
          #devis, #devis * { visibility: visible; }
          #devis { position: absolute; top: 0; left: 0; width: 100%; }
        }
        `}
      </style>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 700,
  margin: "auto",
  padding: 20,
  fontFamily: "Arial"
};

const title = {
  fontSize: 26,
  textAlign: "center"
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ccc",
  borderRadius: 6
};

const devisBox = {
  marginTop: 30,
  border: "1px solid #ccc",
  padding: 20,
  background: "white"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20
};

const table = {
  width: "100%"
};

const right = {
  textAlign: "right"
};

const btn = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 6
};

const payBtn = {
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8
};

const box = {
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};
