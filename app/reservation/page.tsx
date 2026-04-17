"use client";

import { useState } from "react";

export default function Reservation() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");

  const today = "11 juin 2025";

  return (
    <main style={container}>

      <h1 style={title}>Réservation véhicule</h1>

      <p style={subtitle}>
        Complétez vos informations pour générer votre devis officiel
      </p>

      {/* FORM */}
      <div>
        <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} style={input}/>
        <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={input}/>
        <input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} style={input}/>
        <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} style={input}/>
        <input placeholder="Code postal" value={cp} onChange={(e) => setCp(e.target.value)} style={input}/>
        <input placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} style={input}/>
      </div>

      {/* DEVIS */}
      <div id="devis" style={devisBox}>

        <h2 style={{ textAlign: "center" }}>DEVIS</h2>

        <div style={topRow}>
          <span>Date : {today}</span>
          <span>MK HOLDING</span>
        </div>

        <hr />

        {/* CLIENT + ENTREPRISE */}
        <div style={row}>
          <div>
            <strong>Client</strong>
            <p>{prenom} {nom}</p>
            <p>{adresse}</p>
            <p>{cp} {ville}</p>
            <p>{phone}</p>
          </div>

          <div>
            <strong>Vendeur</strong>
            <p>MK HOLDING</p>
            <p>31 rue Jean Nougaro</p>
            <p>31600 Muret</p>
            <p>SIREN : 908 645 393</p>
            <p>Code NAF : 45.11Z</p>
            <p>TVA : Non applicable (article 293B CGI)</p>
          </div>
        </div>

        <hr />

        {/* TABLE */}
        <table style={table}>
          <thead>
            <tr>
              <th style={left}>Désignation</th>
              <th style={right}>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NeoDrive SWITCH</td>
              <td style={right}>4 490 €</td>
            </tr>
            <tr>
              <td>Frais de transport</td>
              <td style={right}>490 €</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <p style={total}>Total TTC : 4 980 €</p>
        <p>Acompte demandé : 200 €</p>

        <hr />

        {/* PAYMENT */}
        <strong>Coordonnées bancaires</strong>
        <p>IBAN : FR76 2823 3000 0142 1307 1051 008</p>
        <p>BIC : REVOFRP2</p>
        <p>Banque : Revolut Bank UAB</p>

        <hr />

        <p style={{ marginTop: 15 }}>
          Signature du client précédée de la mention "Bon pour accord"
        </p>

      </div>

      {/* PDF */}
      <button onClick={() => window.print()} style={btn}>
        Télécharger le devis (PDF)
      </button>

      {/* PAYMENT */}
      <div style={{ marginTop: 20 }}>
        <a href="https://buy.stripe.com/YOUR_LINK" target="_blank">
          <button style={payBtn}>
            Payer l’acompte
          </button>
        </a>
      </div>

      {/* DOCUMENTS */}
      <div style={{ marginTop: 30 }}>
        <h2>Documents nécessaires</h2>

        <div style={box}>
          ✔ Pièce d’identité valide<br/>
          ✔ Justificatif de domicile (-3 mois)<br/>
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

          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          #devis, #devis * {
            visibility: visible;
          }

          #devis {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-width: 190mm;
            padding: 10mm;
            box-sizing: border-box;
          }
        }
        `}
      </style>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 700,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial"
};

const title = {
  fontSize: 24,
  fontWeight: 700
};

const subtitle = {
  color: "#555",
  marginBottom: 20
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
  background: "#fff"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  marginBottom: 5
};

const table = {
  width: "100%",
  marginTop: 10,
  borderCollapse: "collapse"
};

const left = { textAlign: "left" };
const right = { textAlign: "right" };

const total = {
  fontWeight: "bold",
  marginTop: 10
};

const btn = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};

const payBtn = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const box = {
  marginTop: 10,
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};
