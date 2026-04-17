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
    <main style={{ maxWidth: 700, margin: "auto", padding: 20, fontFamily: "Arial" }}>

      {/* HEADER */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>
          Réserver votre véhicule
        </h1>

        <p style={{ color: "#555" }}>
          Remplissez vos informations pour générer votre devis officiel
        </p>
      </div>

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
      <section style={{ marginTop: 40 }}>
        <h2>Devis officiel</h2>

        <div id="devis" style={devisBox}>
          
          <h2 style={{ textAlign: "center" }}>DEVIS</h2>

          <p>Date : {today}</p>

          <hr />

          <h3>Client</h3>
          <p>{prenom} {nom}</p>
          <p>{adresse}</p>
          <p>{cp} {ville}</p>
          <p>{phone}</p>

          <hr />

          <h3>Vendeur</h3>
          <p><strong>MK HOLDING</strong></p>
          <p>31 rue Jean Nougaro, 31600 Muret</p>
          <p>SIREN : 908 645 393</p>
          <p>SIRET : 908 645 393 00012</p>
          <p>Code NAF : 45.11Z</p>
          <p>TVA : Non applicable</p>

          <hr />

          <h3>Détails</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
          <p>Acompte demandé : 200 €</p>

          <hr />

          <h3>Paiement</h3>
          <p>IBAN : FR76 2823 3000 0142 1307 1051 008</p>
          <p>BIC : REVOFRP2</p>
          <p>Banque : Revolut Bank UAB</p>

          <hr />

          <p>
            Signature du client précédée de la mention "Bon pour accord"
          </p>

        </div>

        <button onClick={() => window.print()} style={pdfButton}>
          Télécharger le devis PDF
        </button>
      </section>

      {/* PAYMENT */}
      <section style={{ marginTop: 40 }}>
        <h2>Paiement acompte</h2>
        <p>Pour bloquer le véhicule, un acompte est demandé</p>

        <a href="https://buy.stripe.com/YOUR_LINK" target="_blank">
          <button style={payButton}>Payer l’acompte</button>
        </a>
      </section>

      {/* PRINT */}
      <style>
        {`
        @media print {
          body * { visibility: hidden; }
          #devis, #devis * { visibility: visible; }
        }
        `}
      </style>

    </main>
  );
}

/* STYLES */

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 6,
  border: "1px solid #ccc"
};

const devisBox = {
  marginTop: 20,
  background: "#fff",
  padding: 20,
  border: "1px solid #ccc"
};

const pdfButton = {
  marginTop: 15,
  padding: 15,
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  width: "100%"
};

const payButton = {
  marginTop: 15,
  padding: 15,
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  width: "100%"
};
