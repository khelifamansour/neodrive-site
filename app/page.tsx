"use client";

import React from "react";

export default function Home() {
  return (
    <main style={container}>
      <section style={hero}>
        <div style={badge}>Voiture sans permis électrique</div>

        <h1 style={title}>
          Une voiture neuve, élégante et accessible dès 5 790 € TTC
        </h1>

        <p style={subtitle}>
          Design moderne, conduite simple, grand coffre et équipements utiles au quotidien.
        </p>

        <img src="/voiture.jpg" alt="Voiture sans permis électrique" style={image} />

        <div style={priceBox}>
          <span style={smallText}>À partir de</span>
          <strong style={price}>5 790 € TTC</strong>
          <span style={smallText}>Batterie incluse • Aucun frais caché</span>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Un design qui fait la différence</h2>

        <div style={grid}>
          <div style={card}>✔ Look moderne et compact</div>
          <div style={card}>✔ Idéale pour la ville</div>
          <div style={card}>✔ Grand coffre pratique</div>
          <div style={card}>✔ Véhicule neuf, jamais immatriculé</div>
        </div>
      </section>

      <section style={sectionDark}>
        <h2 style={h2White}>Version Confort bien équipée</h2>

        <div style={features}>
          <span>Caméra de recul</span>
          <span>Bluetooth</span>
          <span>USB</span>
          <span>Chauffage</span>
          <span>Ventilation</span>
          <span>Alarme antivol</span>
          <span>Bruiteur de recul</span>
          <span>Aide au démarrage en côte</span>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Achat simple et sécurisé</h2>

        <div style={box}>
          🔒 Aucun paiement à l’avance.
          <br />
          Vous voyez le véhicule en vidéo, vous validez, puis vous payez uniquement après inspection.
        </div>

        <div style={box}>
          Entreprise française : <strong>MK HOLDING</strong>
          <br />
          SIREN 908 645 393
          <br />
          31 rue Jean Nougaro – 31600 Muret
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Livraison & documents</h2>

        <div style={box}>
          ✔ Livraison possible partout en France
          <br />
          ✔ Retrait possible selon disponibilité
          <br />
          ✔ Facture fournie
          <br />
          ✔ Documents pour immatriculation
          <br />
          ✔ Assistance WhatsApp / téléphone
        </div>
      </section>

      <section style={ctaFinal}>
        <h2 style={finalTitle}>Prêt à découvrir le véhicule ?</h2>

        <p style={finalText}>
          Demandez une vidéo réelle du véhicule ou réservez sans paiement.
        </p>

        <a href="/reservation">
          <button style={btnBlack}>Réserver sans paiement</button>
        </a>

        <a
          href="https://wa.me/33628261446"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button style={btnGreen}>Contactez-nous sur WhatsApp</button>
        </a>

        <p style={contact}>
          Contactez-nous : 06 28 26 14 46
        </p>
      </section>
    </main>
  );
}

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: 14,
  fontFamily: "Arial, sans-serif",
  background: "#ffffff",
  color: "#111",
};

const hero: React.CSSProperties = {
  textAlign: "center",
  padding: "35px 12px",
  background: "linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%)",
  borderRadius: 18,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 14px",
  background: "#111",
  color: "white",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 18,
};

const title: React.CSSProperties = {
  fontSize: 32,
  lineHeight: "1.15",
  fontWeight: 800,
  margin: 0,
};

const subtitle: React.CSSProperties = {
  fontSize: 17,
  color: "#555",
  marginTop: 14,
  lineHeight: "1.5",
};

const image: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  marginTop: 24,
  borderRadius: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.16)",
};

const priceBox: React.CSSProperties = {
  margin: "25px auto 0",
  padding: 18,
  maxWidth: 360,
  background: "white",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const price: React.CSSProperties = {
  display: "block",
  fontSize: 30,
  margin: "5px 0",
};

const smallText: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
};

const section: React.CSSProperties = {
  padding: "35px 8px",
};

const sectionDark: React.CSSProperties = {
  padding: "35px 18px",
  background: "#111",
  color: "white",
  borderRadius: 18,
  marginTop: 15,
};

const h2: React.CSSProperties = {
  fontSize: 24,
  marginBottom: 18,
};

const h2White: React.CSSProperties = {
  fontSize: 24,
  marginBottom: 18,
  color: "white",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const card: React.CSSProperties = {
  background: "#f5f5f5",
  padding: 16,
  borderRadius: 14,
  fontWeight: 600,
};

const features: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const box: React.CSSProperties = {
  background: "#f7f7f7",
  padding: 18,
  borderRadius: 14,
  lineHeight: "1.7",
  marginBottom: 12,
};

const ctaFinal: React.CSSProperties = {
  textAlign: "center",
  padding: "40px 14px",
  background: "#f5f7fb",
  borderRadius: 18,
  marginBottom: 30,
};

const finalTitle: React.CSSProperties = {
  fontSize: 26,
  marginBottom: 8,
};

const finalText: React.CSSProperties = {
  color: "#555",
  marginBottom: 18,
};

const btnBlack: React.CSSProperties = {
  width: "100%",
  padding: 16,
  background: "#111",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 10,
};

const btnGreen: React.CSSProperties = {
  width: "100%",
  padding: 16,
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 10,
};

const contact: React.CSSProperties = {
  marginTop: 18,
  fontSize: 14,
  color: "#333",
  fontWeight: 700,
};
