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
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif" }}>

      {/* HEADER */}
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
        Réserver votre véhicule
      </h1>

      <p style={{ color: "#555", marginBottom: 20 }}>
        Remplissez vos informations pour générer votre devis officiel
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

        <h2 style={{ textAlign: "center", marginBottom: 10 }}>DEVIS</h2>

        <p>Date : 11 juin 2025</p>

        <hr />

        {/* CLIENT + VENDEUR */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
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
            <p>TVA : Non applicable</p>
          </div>
        </div>

        <hr />

        {/* DETAILS */}
        <strong>Détails</strong>

        <table style={{ width: "100%", marginTop: 10 }}>
          <tbody>
            <tr>
              <td>NeoDrive SWITCH</td>
              <td style={{ textAlign: "right" }}>4 490 €</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td style={{ textAlign: "right" }}>490 €</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <p><strong>Total TTC : 4 980 €</strong></p>
        <p>Acompte : 200 €</p>

        <hr />

        {/* PAYMENT */}
        <strong>Paiement</strong>
        <p>IBAN : FR76 2823 3000 0142 1307 1051 008</p>
        <p>BIC : REVOFRP2</p>

        <p style={{ marginTop: 20 }}>
          Signature précédée de "Bon pour accord"
        </p>

      </div>

      {/* PDF BUTTON */}
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
        <h2>Envoyer vos documents</h2>

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

      {/* PRINT FIX (CORRIGÉ) */}
      <style>
        {`
        @media print {
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
            width: 90%;
            margin: 0 auto;
            padding: 20px;
            box-sizing: border-box;
          }
        }
        `}
      </style>

    </main>
  );
}

/* STYLES */

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ccc",
  borderRadius: 6
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

const devisBox = {
  marginTop: 30,
  border: "1px solid #ccc",
  padding: 20,
  background: "#fff"
};
