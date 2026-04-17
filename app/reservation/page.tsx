
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

      <h1 style={{ textAlign: "center" }}>Réserver votre véhicule</h1>

      <p style={{ textAlign: "center", color: "#555" }}>
        Remplissez vos informations et nous vous contacterons rapidement.
      </p>

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
          Réserver maintenant
        </button>

      </form>

      <div style={box}>
        <p>✔ 1. Vous remplissez vos informations</p>
        <p>✔ 2. Nous confirmons la disponibilité</p>
        <p>✔ 3. Réservation avec acompte</p>
        <p>✔ 4. Envoi des documents</p>
        <p>✔ 5. Livraison</p>
      </div>

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
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%"
};

const box = {
  marginTop: 30,
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};
