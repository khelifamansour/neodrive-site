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
    <main style={container}>

      <h1 style={title}>Réserver votre véhicule</h1>

      <p style={subtitle}>
        Réservez votre NeoDrive en quelques étapes simples et sécurisées.
      </p>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={form}>

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
      <section style={section}>
        <h2>Acompte de réservation</h2>

        <p style={text}>
          Pour bloquer votre véhicule, un acompte est demandé.
        </p>

        <a href="https://buy.stripe.com/YOUR_LINK_HERE" target="_blank">
          <button style={payButton}>
            Payer l’acompte
          </button>
        </a>
      </section>

      {/* DOCUMENTS */}
      <section style={section}>
        <h2>Documents nécessaires</h2>

        <p style={text}>
          Merci de préparer les documents suivants :
        </p>

        <div style={box}>
          ✔ Pièce d’identité<br />
          ✔ Justificatif de domicile (-3 mois)<br />
        </div>

        <p style={{ marginTop: 10 }}>
          Vous pourrez les envoyer après validation de votre réservation.
        </p>
      </section>

      {/* PROCESS */}
      <section style={section}>
        <h2>Étapes de votre commande</h2>

        <div style={box}>
          ✔ 1. Remplissez vos informations<br />
          ✔ 2. Confirmation de disponibilité<br />
          ✔ 3. Signature du devis officiel<br />
          ✔ 4. Paiement de l’acompte<br />
          ✔ 5. Envoi des documents<br />
          ✔ 6. Paiement final<br />
          ✔ 7. Carte grise + livraison<br />
        </div>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 600,
  margin: "auto",
  padding: 20,
  fontFamily: "Arial"
};

const title = {
  textAlign: "center",
  fontSize: 28,
  fontWeight: 700
};

const subtitle = {
  textAlign: "center",
  color: "#555",
  marginTop: 10
};

const form = {
  marginTop: 30,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const input = {
  padding: 12,
  borderRadius: 6,
  border: "1px solid #ccc"
};

const button = {
  padding: 15,
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};

const payButton = {
  marginTop: 15,
  padding: 15,
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};

const section = {
  marginTop: 40
};

const text = {
  color: "#555",
  marginTop: 10
};

const box = {
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8,
  marginTop: 10
};
