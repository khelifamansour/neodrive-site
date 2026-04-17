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

      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>
          Réserver votre véhicule
        </h1>

        <p style={{ color: "#555", marginTop: 10 }}>
          Réservez votre NeoDrive en quelques étapes simples et sécurisées.
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

      {/* PAYMENT */}
      <section style={{ marginTop: 40 }}>
        <h2>Acompte de réservation</h2>

        <p style={{ color: "#555" }}>
          Pour bloquer votre véhicule, un acompte est demandé.
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

        <div style={box}>
          ✔ Pièce d’identité<br />
          ✔ Justificatif de domicile (-3 mois)
        </div>
      </section>

      {/* PROCESS */}
      <section style={{ marginTop: 40 }}>
        <h2>Étapes de votre commande</h2>

        <div style={box}>
          ✔ 1. Informations<br />
          ✔ 2. Validation<br />
          ✔ 3. Devis<br />
          ✔ 4. Acompte<br />
          ✔ 5. Documents<br />
          ✔ 6. Paiement final<br />
          ✔ 7. Livraison
        </div>
      </section>

    </main>
  );
}

/* SAFE STYLES */

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

const box = {
  marginTop: 10,
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};
