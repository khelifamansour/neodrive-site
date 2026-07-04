"use client";

import React from "react";

export default function Home() {
  return (
    <main style={page}>
      <nav style={nav}>
        <div style={logo}>
          <span style={logoIcon}>N</span> NEODRIVE
        </div>
        <div style={navLinks}>
          <span>Accueil</span>
          <span>Versions</span>
          <span>Équipements</span>
          <span>Achat sécurisé</span>
          <span>Livraison</span>
        </div>
      </nav>

      <section style={hero}>
        <div style={heroOverlay}>
          <div style={heroText}>
            <div style={badge}>🇫🇷 Marque toulousaine</div>

            <h1 style={title}>
              La liberté de rouler,
              <br />
              sans permis.
            </h1>

            <p style={priceHero}>Dès 3 990 €</p>

            <p style={subtitle}>
              Même voiture, 3 versions selon vos besoins.
              <br />
              Électrique, économique et élégante.
            </p>

            <div style={icons}>
              <div>⚡<br />100% électrique</div>
              <div>💶<br />Économique</div>
              <div>🚗<br />Sans permis</div>
              <div>🛠️<br />Garantie & SAV</div>
            </div>
          </div>

          <img src="/voiture.jpg" alt="Voiture sans permis Neodrive" style={heroCar} />
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>3 versions. 1 même voiture. À vous de choisir.</h2>
        <p style={sectionSubtitle}>
          La même qualité, le même design, avec des équipements adaptés à votre quotidien.
        </p>

        <div style={cards}>
          <article style={card}>
            <span style={tagGreen}>ESSENTIEL</span>
            <h3 style={cardTitle}>Version Essentiel</h3>
            <p style={cardPrice}>3 990 € TTC</p>
            <p style={cardText}>
              La version simple et accessible pour rouler au meilleur prix.
            </p>
            <ul style={list}>
              <li>Voiture neuve</li>
              <li>100% électrique</li>
              <li>Grand coffre</li>
              <li>Batterie incluse</li>
            </ul>
          </article>

          <article style={cardDark}>
            <span style={tagOrange}>LA PLUS CHOISIE</span>
            <h3 style={cardTitle}>Version Confort</h3>
            <p style={cardPriceWhite}>4 990 € TTC</p>
            <p style={cardTextWhite}>
              Le meilleur compromis avec le pack équipement complet.
            </p>
            <ul style={listWhite}>
              <li>Pack Confort inclus</li>
              <li>Alarme antivol</li>
              <li>Caméra de recul</li>
              <li>Chauffage</li>
              <li>Ventilation</li>
            </ul>
          </article>

          <article style={card}>
            <span style={tagPurple}>CONFORT PLUS+</span>
            <h3 style={cardTitle}>Version Confort Plus+</h3>
            <p style={cardPrice}>Sur demande</p>
            <p style={cardText}>
              Plus d’autonomie, charge rapide et équipements premium.
            </p>
            <ul style={list}>
              <li>Pack Confort inclus</li>
              <li>Charge rapide</li>
              <li>Plus d’autonomie</li>
              <li>Idéale usage intensif</li>
            </ul>
          </article>
        </div>
      </section>

      <section style={emotion}>
        <div>
          <h2 style={emotionTitle}>Une petite voiture qui change le quotidien</h2>
          <p style={emotionText}>
            Aller au travail, faire vos courses, déposer les enfants ou retrouver votre autonomie :
            Neodrive rend votre quotidien plus simple, plus économique et plus agréable.
          </p>
        </div>
      </section>

      <section style={presentation}>
        <div style={presentationText}>
          <h2 style={sectionTitleLeft}>NEODRIVE, 6 ans d’expérience à vos côtés</h2>

          <p style={paragraph}>
            Après 6 années dans le domaine de la voiture sans permis, nous avons pris le pari
            de vous offrir une voiture neuve, bien équipée et fiable à moins de 5 000 €.
          </p>

          <p style={paragraph}>
            Neodrive est une marque toulousaine, proche de ses clients, qui place la transparence,
            la qualité et le service au cœur de son engagement.
          </p>

          <div style={stats}>
            <div>
              🏅
              <strong>6 ans</strong>
              <span>d’expérience</span>
            </div>
            <div>
              📍
              <strong>Toulouse</strong>
              <span>marque locale</span>
            </div>
            <div>
              🛡️
              <strong>Véhicules</strong>
              <span>neufs et garantis</span>
            </div>
          </div>
        </div>

        <img src="/voiture.jpg" alt="Neodrive Toulouse" style={presentationImage} />
      </section>

      <section style={whySection}>
        <h2 style={whyTitle}>Pourquoi choisir Neodrive ?</h2>

        <div style={whyGrid}>
          <div style={whyCard}>🔒<strong>Achat sécurisé</strong><span>Aucun paiement à l’avance.</span></div>
          <div style={whyCard}>🎥<strong>Vidéo réelle</strong><span>Découverte du véhicule sur demande.</span></div>
          <div style={whyCard}>🚚<strong>Livraison France</strong><span>Transport personnalisé.</span></div>
          <div style={whyCard}>🧾<strong>Documents fournis</strong><span>Facture + immatriculation.</span></div>
          <div style={whyCard}>🛠️<strong>SAV disponible</strong><span>Assistance et pièces en France.</span></div>
        </div>
      </section>

      <section style={featuresSection}>
        <h2 style={sectionTitle}>Des caractéristiques pensées pour vous</h2>

        <div style={features}>
          <div>🔋<br />Jusqu’à 70 km d’autonomie</div>
          <div>🔌<br />Recharge sur prise standard</div>
          <div>🚘<br />Compacte et facile à garer</div>
          <div>🧳<br />Grand coffre pratique</div>
          <div>😊<br />Conduite simple et confortable</div>
        </div>
      </section>

      <section style={finalCta}>
        <h2 style={finalTitle}>Prêt à découvrir NEODRIVE ?</h2>
        <p style={finalText}>
          Contactez-nous dès maintenant, obtenez votre vidéo et réservez sans engagement.
        </p>

        <div style={finalButtons}>
          <a href="/reservation">
            <button style={btnReserve}>📅 Réserver sans paiement</button>
          </a>

          <a href="https://wa.me/33628261446" target="_blank" rel="noopener noreferrer">
            <button style={btnWhatsapp}>💬 Contactez-nous sur WhatsApp</button>
          </a>
        </div>

        <p style={response}>Réponse rapide — Vidéo disponible immédiatement</p>
      </section>

      <footer style={footer}>
        <div style={logoFooter}>
          <span style={logoIcon}>N</span> NEODRIVE
        </div>
        <div>
          Marque toulousaine — 31 rue Jean Nougaro, 31600 Muret
          <br />
          SIREN 908 645 393
        </div>
        <strong>📞 06 28 26 14 46</strong>
      </footer>
    </main>
  );
}

const page: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  background: "#ffffff",
  color: "#111",
};

const nav: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "18px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logo: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
};

const logoFooter: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
};

const logoIcon: React.CSSProperties = {
  color: "#ff8a00",
  fontWeight: 900,
  marginRight: 6,
};

const navLinks: React.CSSProperties = {
  display: "flex",
  gap: 24,
  fontSize: 14,
  fontWeight: 700,
};

const hero: React.CSSProperties = {
  background: "linear-gradient(135deg, #08111f 0%, #12395a 50%, #f39c12 100%)",
  color: "white",
};

const heroOverlay: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "70px 24px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 40,
  alignItems: "center",
};

const heroText: React.CSSProperties = {
  zIndex: 2,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  background: "white",
  color: "#111",
  padding: "10px 16px",
  borderRadius: 999,
  fontWeight: 900,
  marginBottom: 22,
};

const title: React.CSSProperties = {
  fontSize: 62,
  lineHeight: "1.03",
  margin: 0,
  fontWeight: 900,
};

const priceHero: React.CSSProperties = {
  fontSize: 46,
  color: "#ff8a00",
  fontWeight: 900,
  margin: "18px 0 10px",
};

const subtitle: React.CSSProperties = {
  fontSize: 20,
  lineHeight: "1.5",
  color: "#f1f1f1",
};

const icons: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginTop: 28,
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
};

const heroCar: React.CSSProperties = {
  width: "100%",
  borderRadius: 26,
  boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
  background: "white",
};

const section: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "60px 24px",
};

const sectionTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 36,
  marginBottom: 10,
  fontWeight: 900,
};

const sectionTitleLeft: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 18,
  fontWeight: 900,
};

const sectionSubtitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 18,
  color: "#555",
  marginBottom: 36,
};

const cards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 32,
};

const card: React.CSSProperties = {
  padding: 34,
  borderRadius: 28,
  background: "white",
  boxShadow: "0 20px 45px rgba(0,0,0,0.10)",
  border: "1px solid #eee",
};

const cardDark: React.CSSProperties = {
  padding: 34,
  borderRadius: 28,
  color: "white",
  background: "linear-gradient(180deg, #0f0f0f 0%, #272727 100%)",
  boxShadow: "0 25px 55px rgba(0,0,0,0.30)",
  transform: "scale(1.04)",
};

const tagGreen: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 900,
  fontSize: 13,
};

const tagOrange: React.CSSProperties = {
  display: "inline-block",
  background: "#ff8a00",
  color: "white",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 13,
};

const tagPurple: React.CSSProperties = {
  color: "#7c3aed",
  fontWeight: 900,
  fontSize: 13,
};

const cardTitle: React.CSSProperties = {
  fontSize: 24,
  margin: "18px 0 8px",
};

const cardPrice: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  margin: "0 0 18px",
};

const cardPriceWhite: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 900,
  margin: "0 0 18px",
};

const cardText: React.CSSProperties = {
  color: "#555",
  lineHeight: "1.6",
};

const cardTextWhite: React.CSSProperties = {
  color: "#eee",
  lineHeight: "1.6",
};

const list: React.CSSProperties = {
  lineHeight: "2",
  fontWeight: 700,
  paddingLeft: 20,
};

const listWhite: React.CSSProperties = {
  lineHeight: "2",
  fontWeight: 700,
  paddingLeft: 20,
};

const emotion: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "45px 36px",
  borderRadius: 30,
  background: "linear-gradient(135deg, #ff7a00 0%, #ff006e 100%)",
  color: "white",
};

const emotionTitle: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 12,
};

const emotionText: React.CSSProperties = {
  fontSize: 19,
  lineHeight: "1.6",
  maxWidth: 850,
};

const presentation: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "70px 24px",
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 50,
  alignItems: "center",
};

const presentationText: React.CSSProperties = {};

const paragraph: React.CSSProperties = {
  fontSize: 17,
  lineHeight: "1.8",
  color: "#444",
};

const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 20,
  marginTop: 30,
  textAlign: "center",
};

const presentationImage: React.CSSProperties = {
  width: "100%",
  borderRadius: 28,
  boxShadow: "0 20px 45px rgba(0,0,0,0.18)",
};

const whySection: React.CSSProperties = {
  background: "#111",
  color: "white",
  padding: "60px 24px",
};

const whyTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 36,
  marginBottom: 36,
};

const whyGrid: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 18,
};

const whyCard: React.CSSProperties = {
  background: "#222",
  padding: 24,
  borderRadius: 20,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const featuresSection: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "60px 24px",
};

const features: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 24,
  textAlign: "center",
  fontWeight: 700,
  marginTop: 35,
};

const finalCta: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto 20px",
  padding: "45px 24px",
  borderRadius: 28,
  background: "linear-gradient(135deg, #111 0%, #222 100%)",
  color: "white",
  textAlign: "center",
};

const finalTitle: React.CSSProperties = {
  fontSize: 36,
  margin: "0 0 10px",
};

const finalText: React.CSSProperties = {
  color: "#ddd",
  fontSize: 18,
};

const finalButtons: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 22,
  marginTop: 24,
};

const btnReserve: React.CSSProperties = {
  padding: "18px 42px",
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #ff7a00 0%, #ff006e 100%)",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
};

const btnWhatsapp: React.CSSProperties = {
  padding: "18px 42px",
  border: "none",
  borderRadius: 14,
  background: "#25D366",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
};

const response: React.CSSProperties = {
  marginTop: 18,
  color: "#ddd",
};

const footer: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "18px 24px 30px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 14,
  color: "#333",
};
