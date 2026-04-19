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

  const prixVehiculeTTC = 4490;
  const transportTTC = 490;

  const prixVehiculeHT = prixVehiculeTTC / 1.2;
  const transportHT = transportTTC / 1.2;

  const totalTTC = prixVehiculeTTC + transportTTC;
  const totalHT = prixVehiculeHT + transportHT;
  const tva = totalTTC - totalHT;

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "Arial" }}>

      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>Réservation véhicule</h1>

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
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />{" "}
          J’ai lu et j’accepte les conditions générales de vente
        </label>
      </div>

      {/* DEVIS */}
      <div id="devis" style={{ marginTop: 30, border: "1px solid #ccc", padding: 20 }}>

        <h2>DEVIS</h2>
        <p>Date : {today}</p>

        <p><strong>{prenom} {nom}</strong></p>
        <p>{adresse}</p>

        <hr />

        <p>Véhicule : {prixVehiculeTTC} €</p>
        <p>Transport : {transportTTC} €</p>

        <p>Total HT : {totalHT.toFixed(0)} €</p>
        <p>TVA : {tva.toFixed(0)} €</p>
        <p><strong>Total TTC : {totalTTC.toFixed(0)} €</strong></p>

        <hr />

        <p>Signature précédée de "Lu et approuvé"</p>
        <div style={{ marginTop: 40 }}>
          <div style={{ borderTop: "1px solid black", width: 200 }}>Signature client</div>
        </div>

        {/* FULL CGV */}
        <div style={{ marginTop: 40, fontSize: 10, whiteSpace: "pre-line" }}>
{`CONDITIONS GÉNÉRALES DE VENTE

1. Identité du vendeur
MK HOLDING, SAS – SIREN 908 645 393
31 rue Jean Nougaro, 31600 Muret

2. Objet
Les présentes CGV régissent la vente des véhicules sans permis électriques.

3. Prix
Les prix sont exprimés en euros TTC.
Ne sont pas inclus : livraison, carte grise, assurance.

4. Garantie
Structure (châssis, carrosserie) : 2 ans
Composants : 1 an
Batterie : 6 mois sous conditions

5. Batterie
Recharge obligatoire après chaque utilisation.
Ne jamais laisser déchargée plus de 24h.
Charge maximum recommandée : 12h.
Stockage avec circuit coupé si non utilisé.

Toute mauvaise utilisation annule la garantie batterie.

6. Utilisation
Le véhicule doit être utilisé sur routes adaptées.
Toute utilisation abusive ou sur routes dégradées exclut la garantie.

7. Autonomie
L’autonomie est indicative et dépend de nombreux facteurs.

8. Panne
Diagnostic à distance obligatoire.

9. Réparations
Le client peut effectuer les réparations simples.
Le transport du véhicule reste à la charge du client.
Le vendeur peut fournir pièces et prendre en charge main d’œuvre sous validation.

10. Exclusions
Accident, modification, mauvaise utilisation, défaut d’entretien.

11. Responsabilité
Le client est responsable de l’usage et de l’assurance.

12. Paiement
Modalités selon accord.
Le véhicule reste propriété du vendeur jusqu’au paiement complet.

13. Litiges
Droit français – tribunal du siège du vendeur.`}
        </div>

      </div>

      <button onClick={() => window.print()} style={btn}>
        Télécharger le devis PDF
      </button>

    </main>
  );
}

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ccc"
};

const btn = {
  marginTop: 20,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "white"
};
