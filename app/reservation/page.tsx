"use client";

import { useState } from "react";

export default function Reservation() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");
  const [accepted, setAccepted] = useState(false);

  const today = "11 juin 2025";

  // PRICES TTC
  const prixVehiculeTTC = 4490;
  const transportTTC = 490;

  const prixVehiculeHT = prixVehiculeTTC / 1.2;
  const transportHT = transportTTC / 1.2;

  const totalTTC = prixVehiculeTTC + transportTTC;
  const totalHT = prixVehiculeHT + transportHT;
  const tva = totalTTC - totalHT;

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "Arial" }}>

      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>
        Réservation véhicule
      </h1>

      <p style={{ color: "#555" }}>
        Complétez vos informations pour générer votre devis
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

      {/* ACCEPT CGV */}
      <div style={{ marginTop: 20 }}>
        <label>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />{" "}
          J’ai lu et j’accepte les conditions générales de vente
        </label>
      </div>

      {/* DEVIS */}
      <div id="devis" style={{
        marginTop: 30,
        border: "1px solid #ccc",
        padding: 20,
        background: "#fff"
      }}>

        <h2 style={{ textAlign: "center" }}>DEVIS</h2>

        <p>Date : {today}</p>

        <hr />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
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
            <p>TVA incluse</p>
          </div>
        </div>

        <hr />

        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td>NeoDrive SWITCH</td>
              <td style={{ textAlign: "right" }}>{prixVehiculeTTC} €</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td style={{ textAlign: "right" }}>{transportTTC} €</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <p>Total HT : {totalHT.toFixed(0)} €</p>
        <p>TVA (20%) : {tva.toFixed(0)} €</p>
        <p><strong>Total TTC : {totalTTC.toFixed(0)} €</strong></p>

        <p>Acompte : 200 €</p>

        <hr />

        <strong>Paiement</strong>
        <p>Paiement selon accord entre le vendeur et le client</p>
        <p>Le véhicule reste la propriété du vendeur jusqu’au paiement complet</p>

        <hr />

        <p>Lu et approuvé – Bon pour accord</p>

        <div style={{ marginTop: 40 }}>
          <div style={{ borderTop: "1px solid #000", width: 200 }}>
            Signature client
          </div>
        </div>

        {/* CGV FULL */}
        <div style={{ marginTop: 40, fontSize: 10 }}>

          <h3>CONDITIONS GÉNÉRALES DE VENTE</h3>

          <p>
1. Identité du vendeur
MK HOLDING, SAS
SIREN : 908 645 393
Siège social : 31 rue Jean Nougaro, 31600 Muret
(ci-après "le Vendeur")
          </p>

          <p>
2. Objet
Les présentes CGV régissent la vente des véhicules sans permis électriques.
Toute commande implique l’acceptation pleine et entière des présentes conditions.
          </p>

          <p>
3. Prix
Les prix sont exprimés en euros TTC (TVA incluse).
Ne sont pas inclus sauf mention contraire :
frais de livraison, carte grise, assurance, frais annexes
          </p>

          <p>
4. Garantie
Châssis, structure, carrosserie : 2 ans
Moteur, contrôleur, électronique : 1 an
Batterie : 6 mois sous conditions strictes
          </p>

          <p>
5. Batterie
Recharge obligatoire après chaque utilisation.
Ne jamais laisser déchargée plus de 24h.
Charge max 12h.
Stockage avec circuit coupé.
          </p>

          <p>
6. Utilisation
Usage normal sur routes adaptées uniquement.
Exclusion : routes dégradées, surcharge, usage abusif
          </p>

          <p>
7. Autonomie
Donnée indicative selon conditions (température, poids, relief)
          </p>

          <p>
8. Panne
Diagnostic à distance obligatoire
          </p>

          <p>
9. Réparations
Transport à la charge du client.
Pièces fournies sous validation.
          </p>

          <p>
10. Exclusions
Accident, modification, mauvaise utilisation, entretien insuffisant
          </p>

          <p>
11. Responsabilité
Client responsable de l’usage et de l’assurance
          </p>

          <p>
12. Paiement
Selon accord.
Réserve de propriété jusqu’au paiement complet
          </p>

          <p>
13. Litiges
Droit français – tribunal compétent : siège du vendeur
          </p>

          <div style={{ marginTop: 20 }}>
            <div style={{ borderTop: "1px solid black", width: 200 }}>
              Signature client CGV
            </div>
          </div>

        </div>

      </div>

      {/* PDF */}
      <button onClick={() => window.print()} style={btn}>
        Télécharger le devis PDF
      </button>

      {/* PAYMENT */}
      <div style={{ marginTop: 20 }}>
        <a href="https://buy.stripe.com/YOUR_LINK" target="_blank">
          <button style={payBtn} disabled={!accepted}>
            Payer l’acompte
          </button>
        </a>
      </div>

      {/* STYLES */}
      <style>
        {`
        @media print {
          body * { visibility: hidden; }
          #devis, #devis * { visibility: visible; }
          #devis {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
        `}
      </style>

    </main>
  );
}

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
  borderRadius: 6
};

const payBtn = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8
};
