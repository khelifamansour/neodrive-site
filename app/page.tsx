"use client";

import React from "react";

export default function Home() {
  return (
    <main style={page}>
      <section style={hero}>
        <div style={badge}>🚗 Nouvelle voiture sans permis électrique</div>

        <h1 style={title}>
          La liberté de rouler, sans permis, dès 3 990 €
        </h1>

        <p style={subtitle}>
          Même voiture, 3 versions selon votre budget et vos envies.
          Simple, élégante, économique et parfaite pour le quotidien.
        </p>

        <img src="/voiture.jpg" alt="Voiture sans permis électrique" style={carImage} />

        <div style={heroButtons}>
          <a href="/reservation">
            <button style={btnPrimary}>Réserver sans paiement</button>
          </a>

          <a href="https://wa.me/33628261446" target="_blank" rel="noopener noreferrer">
            <button style={btnWhatsapp}>Voir la voiture en vidéo</button>
          </a>
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>Choisissez votre version</h2>
        <p style={sectionSubtitle}>
          La même voiture, le même design, mais avec des équipements différents.
        </p>

        <div style={cards}>
          <div style={card}>
            <div style={versionBadge}>Essentiel</div>
            <h3 style={cardTitle}>Version Essentiel</h3>
            <p style={price}>3 990 € TTC</p>
            <p style={desc}>
              La version simple et accessible pour rouler au meilleur prix.
            </p>
            <ul style={list}>
              <li>✔ Voiture neuve</li>
              <li>✔ 100% électrique</li>
              <li>✔ Grand coffre</li>
              <li>✔ Batterie incluse</li>
            </ul>
          </div>

          <div style={cardHighlight}>
            <div style={popular}>⭐ La plus demandée</div>
            <div style={versionBadgeGold}>Confort</div>
            <h3 style={cardTitle}>Version Confort</h3>
            <p style={price}>4 990 € TTC</p>
            <p style={desc}>
              La version idéale avec le pack équipement complet.
            </p>
            <ul style={list}>
              <li>✔ Pack Confort inclus</li>
              <li>✔ Alarme antivol</li>
              <li>✔ Caméra de recul</li>
              <li>✔ Chauffage</li>
              <li>✔ Ventilation</li>
            </ul>
          </div>

          <div style={card}>
            <div style={versionBadge}>Confort Plus+</div>
            <h3 style={cardTitle}>Version Confort Plus+</h3>
            <p style={price}>Sur demande</p>
            <p style={desc}>
              Plus d’autonomie, charge rapide et équipements premium.
            </p>
            <ul style={list}>
              <li>✔ Pack Confort inclus</li>
              <li>✔ Charge rapide</li>
              <li>✔ Plus d’autonomie</li>
              <li>✔ Idéale usage intensif</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={emotion}>
        <h2 style={emotionTitle}>Une petite voiture qui change le quotidien</h2>
        <p style={emotionText}>
          Pour aller au travail, faire vos courses, déposer les enfants ou garder votre autonomie :
          une voiture pratique, jolie et économique.
        </p>
      </section>

      <section style={trust}>
        <h2 style={sectionTitle}>Achat simple et rassurant</h2>

        <div style={trustGrid}>
          <div style={trustBox}>🔒 Aucun paiement à l’avance</div>
          <div style={trustBox}>🎥 Vidéo réelle disponible</div>
          <div style={trustBox}>🚚 Livraison partout en France</div>
          <div style={trustBox}>🇫🇷 Entreprise française</div>
          <div style={trustBox}>🧾 Facture + documents</div>
          <div style={trustBox}>🛠 SAV + pièces disponibles</div>
        </div>
      </section>

      <section style={bottom}>
        <h2 style={bottomTitle}>Envie de la voir en vrai ?</h2>
        <p style={bottomText}>
          Contactez-nous, recevez les photos et vidéos, puis réservez votre véhicule sans paiement.
        </p>

        <a href="/reservation">
          <button style={btnPrimary}>Réserver sans paiement</button>
        </a>

        <a href="https://wa.me/33628261446" target="_blank" rel="noopener noreferrer">
          <button style={btnWhatsapp}>Contactez-nous sur WhatsApp</button>
        </a>

        <p style={phone}>📞 06 28 26 14 46</p>
      </section>
    </main>
  );
}

const page: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: 14,
  fontFamily: "Arial, sans-serif",
  color: "#1b1b1b",
  background: "#fffaf3",
};

const hero: React.CSSProperties = {
  textAlign: "center",
  padding: "45px 18px",
  borderRadius: 28,
  background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  background: "#ffffff",
  color: "#e85d04",
  padding: "9px 16px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
  marginBottom: 18,
};

const title: React.CSSProperties = {
  fontSize: 42,
  lineHeight: "1.1",
  fontWeight: 900,
  margin: 0,
};

const subtitle: React.CSSProperties = {
  maxWidth: 720,
  margin: "18px auto 0",
  fontSize: 19,
  lineHeight: "1.55",
  color: "#4a2d1f",
};

const carImage: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  marginTop: 30,
  borderRadius: 26,
  boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
};

const heroButtons: React.CSSProperties = {
  marginTop: 28,
};

const section: React.CSSProperties = {
  padding: "50px 8px",
};

const sectionTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 32,
  marginBottom: 8,
  fontWeight: 900,
};

const sectionSubtitle: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  fontSize: 17,
  marginBottom: 28,
};

const cards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
};

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 15px 35px rgba(0,0,0,0.08)",
};

const cardHighlight: React.CSSProperties = {
  background: "linear-gradient(180deg, #111 0%, #2b2b2b 100%)",
  color: "white",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
  transform: "scale(1.03)",
};

const popular: React.CSSProperties = {
  background: "#ffbe0b",
  color: "#111",
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 12,
};

const versionBadge: React.CSSProperties = {
  color: "#e85d04",
  fontWeight: 900,
  fontSize: 14,
  marginBottom: 8,
};

const versionBadgeGold: React.CSSProperties = {
  color: "#ffbe0b",
  fontWeight: 900,
  fontSize: 14,
  marginBottom: 8,
};

const cardTitle: React.CSSProperties = {
  fontSize: 24,
  margin: "5px 0",
};

const price: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  margin: "10px 0",
};

const desc: React.CSSProperties = {
  lineHeight: "1.5",
  color: "inherit",
  opacity: 0.85,
};

const list: React.CSSProperties = {
  paddingLeft: 18,
  lineHeight: "1.9",
  fontWeight: 600,
};

const emotion: React.CSSProperties = {
  textAlign: "center",
  padding: "45px 22px",
  borderRadius: 28,
  background: "linear-gradient(135deg, #fb8500 0%, #ff006e 100%)",
  color: "white",
};

const emotionTitle: React.CSSProperties = {
  fontSize: 32,
  marginBottom: 12,
};

const emotionText: React.CSSProperties = {
  maxWidth: 750,
  margin: "0 auto",
  fontSize: 19,
  lineHeight: "1.6",
};

const trust: React.CSSProperties = {
  padding: "50px 8px",
};

const trustGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 12,
};

const trustBox: React.CSSProperties = {
  background: "#ffffff",
  padding: 18,
  borderRadius: 18,
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(0,0,0,0.07)",
};

const bottom: React.CSSProperties = {
  textAlign: "center",
  padding: "45px 18px",
  borderRadius: 28,
  background: "#111",
  color: "white",
  marginBottom: 30,
};

const bottomTitle: React.CSSProperties = {
  fontSize: 32,
  marginBottom: 10,
};

const bottomText: React.CSSProperties = {
  color: "#ddd",
  fontSize: 17,
  marginBottom: 20,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  maxWidth: 430,
  padding: 17,
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #ff7b00 0%, #ff006e 100%)",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 10,
};

const btnWhatsapp: React.CSSProperties = {
  width: "100%",
  maxWidth: 430,
  padding: 17,
  border: "none",
  borderRadius: 14,
  background: "#25D366",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 10,
};

const phone: React.CSSProperties = {
  marginTop: 18,
  fontSize: 18,
  fontWeight: 900,
};
