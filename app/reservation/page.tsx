"use client";

import { useState } from "react";

export default function Reservation() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();

    const message =
      `Bonjour, je souhaite réserver un véhicule.\n\nNom: ${name}\nTéléphone: ${phone}\nVille: ${city}`;

    window.open(
      `https://wa.me/33628261446?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <main style={{ maxWidth: 600, margin: "auto", padding: 20, fontFamily: "Arial" }}>

      {/* HEADER */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>
          Réserver votre véhicule
        </h1>

        <p style={{ color: "#555", marginTop: 10 }}>
          Réservez votre NeoDrive en quelques étapes simples et sécurisées.
        </p>

        <p style={{ color: "#dc2626", marginTop: 5 }}>
          Stock limité – disponibilité immédiate
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
        
        <input
          placeholder="Nom complet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />

        <input
          placeholder="Téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={input}
        />

        <input
          placeholder="Ville"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={input}
        />

        <button type="submit" style={button}>
          Confirmer ma demande
        </button>
      </form>

      {/* DEVIS PDF */}
      <section style={{ marginTop: 40 }}>
        <h2>Votre devis</h2>

        <p style={{ color: "#555" }}>
          Un devis personnalisé est généré avec vos informations.
        </p>

        <div id="devis" style={box}>
          <h3>DEVIS OFFICIEL</h3>

          <p><strong>Nom:</strong> {name || "-"}</p>
          <p><strong>Téléphone:</strong> {phone || "-"}</p>
          <p><strong>Ville:</strong> {city || "-"}</p>

          <hr />

          <p>Produit: NeoDrive SWITCH</p>
          <p>Prix: 4 490 €</p>
          <p>Acompte: 200 €</p>

          <hr />

          <p><strong>IBAN:</strong> FRXX XXXX XXXX</p>
          <p><strong>Société:</strong> Microdrive</p>
        </div>

        <button
          onClick={() => window.print()}
          style={pdfButton}
        >
          Télécharger le devis (PDF)
        </button>
      </section>

      {/* PAYMENT */}
      <section style={{ marginTop: 40 }}>
        <h2>Acompte de réservation</h2>

        <p style={{ color: "#555" }}>
          Pour bloquer définitivement votre véhicule, un acompte est demandé après validation du devis.
        </p>

        <a href="https://buy.stripe.com/YOUR_LINK_HERE" target="_blank">
          <button style={payButton}>
            Payer l’acompte
          </button>
        </a>
      </section>

      {/* DOCUMENTS */}
      <section style={{ marginTop: 40 }}>
        <h2>Documents nécessaires</h2>

        <p style={{ color: "#555" }}>
          Pour finaliser votre dossier et préparer la carte grise, nous aurons besoin des documents suivants :
        </p>

        <div style={box}>
          ✔ Pièce d’identité valide<br />
          ✔ Justificatif de domicile de moins de 3 mois
        </div>

        <p style={{ marginTop: 10, color: "#555" }}>
          Ces documents vous seront demandés après confirmation de votre réservation.
        </p>
      </section>

      {/* PROCESS */}
      <section style={{ marginTop: 40 }}>
        <h2>Étapes de votre commande</h2>

        <div style={box}>
          ✔ 1. Vous remplissez vos informations<br />
          ✔ 2. Nous confirmons la disponibilité du véhicule<br />
          ✔ 3. Vous recevez un devis officiel personnalisé<br />
          ✔ 4. Vous validez le devis et payez un acompte<br />
          ✔ 5. Vous envoyez vos documents administratifs<br />
          ✔ 6. Paiement final avant immatriculation<br />
          ✔ 7. Carte grise et livraison du véhicule
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>
          Une question ? Contactez-nous directement
        </p>

        <a href="https://wa.me/33628261446" target="_blank">
          <button style={payButton}>
            Discuter sur WhatsApp
          </button>
        </a>
      </section>

      {/* PRINT MODE */}
      <style>
        {`
        @media print {
          body * {
            visibility: hidden;
          }
          #devis, #devis * {
            visibility: visible;
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
  padding: 12,
  marginTop: 10,
  borderRadius: 6,
  border: "1px solid #ccc"
};

const button = {
  marginTop: 15,
  padding: 15,
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%"
};

const payButton = {
  marginTop: 15,
  padding: 15,
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%"
};

const pdfButton = {
  marginTop: 15,
  padding: 15,
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%"
};

const box = {
  marginTop: 10,
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};
