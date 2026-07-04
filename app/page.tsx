"use client";

import React from "react";

export default function Home() {
  return (
    <main style={page}>
      <section style={hero}>
        <div style={heroText}>
          <div style={badge}>🇫🇷 Marque toulousaine</div>

          <h1 style={title}>La liberté de rouler, sans permis.</h1>

          <p style={priceHero}>Dès 3 990 €</p>

          <p style={subtitle}>
            Même voiture, 3 versions selon vos besoins. Électrique, économique
            et élégante.
          </p>

          <div style={heroIcons}>
            <div style={heroIcon}>⚡ 100% électrique</div>
            <div style={heroIcon}>💶 Économique</div>
            <div style={heroIcon}>🚗 Sans permis</div>
            <div style={heroIcon}>🛠 Garantie & SAV</div>
          </div>
        </div>
      </section>

      <section id="versions" style={section}>
        <h2 style={sectionTitle}>
          3 versions. 1 même voiture. À vous de choisir.
        </h2>

        <p style={sectionSubtitle}>
          La même qualité, le même design, des équipements adaptés à votre quotidien.
        </p>

        <div style={versionsGrid}>
          <div style={card}>
            <div style={greenBadge}>ESSENTIEL</div>
            <h3 style={cardTitle}>Version Essentiel</h3>
            <p style={cardPrice}>3 990 € TTC</p>
            <p style={cardText}>
              La version simple et accessible pour rouler au meilleur prix.
            </p>
            <ul style={list}>
              <li>✔ Voiture neuve</li>
              <li>✔ 100% électrique</li>
              <li>✔ Grand coffre</li>
              <li>✔ Batterie incluse</li>
            </ul>
          </div>

          <div style={cardDark}>
            <div style={orangeBadge}>LA PLUS CHOISIE</div>
            <h3 style={cardTitle}>Version Confort</h3>
            <p style={cardPriceWhite}>4 990 € TTC</p>
            <p style={cardTextWhite}>
              Le meilleur compromis avec le pack équipement complet.
            </p>
            <ul style={listWhite}>
              <li>✔ Pack Confort inclus</li>
              <li>✔ Alarme antivol</li>
              <li>✔ Caméra de recul</li>
              <li>✔ Chauffage</li>
              <li>✔ Ventilation</li>
            </ul>
          </div>

          <div style={card}>
            <div style={purpleBadge}>CONFORT PLUS+</div>
            <h3 style={cardTitle}>Version Confort Plus+</h3>
            <p style={cardPrice}>Sur demande</p>
            <p style={cardText}>
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
          Aller au travail, faire vos courses, déposer les enfants ou retrouver
          votre autonomie : Neodrive rend votre quotidien plus simple, plus
          économique et plus agréable.
        </p>
      </section>

      <section id="presentation" style={presentation}>
        <div>
          <h2 style={presentationTitle}>
            NEODRIVE, 6 ans d’expérience à vos côtés
          </h2>

          <p style={paragraph}>
            Après 6 années dans le domaine de la voiture sans permis, nous avons
            pris le pari de vous offrir une voiture neuve, bien équipée et fiable
            à moins de 5 000 €.
          </p>

          <p style={paragraph}>
            Neodrive est une marque toulousaine, proche de ses clients, qui place
            la transparence, la qualité et le service au cœur de son engagement.
          </p>

          <div style={stats}>
            <div style={stat}>
              <span style={statIcon}>🏅</span>
              <strong>6 ans</strong>
              <span>d’expérience</span>
            </div>

            <div style={stat}>
              <span style={statIcon}>📍</span>
              <strong>Marque</strong>
              <span>toulousaine</span>
            </div>

            <div style={stat}>
              <span style={statIcon}>🛡️</span>
              <strong>Véhicules</strong>
              <span>neufs et garantis</span>
            </div>

            <div style={stat}>
              <span style={statIcon}>🤝</span>
              <strong>SAV</strong>
              <span>proche client</span>
            </div>
          </div>
        </div>

        <div style={presentationImageBox}>
          <img
            src="/voiture.jpg"
            alt="Voiture Neodrive"
            style={presentationImage}
          />
        </div>
      </section>

      <section id="avantages" style={darkSection}>
        <h2 style={darkTitle}>Pourquoi choisir Neodrive ?</h2>

        <div style={advantagesGrid}>
          <div style={advantageCard}>
            <div style={advantageIcon}>🔒</div>
            <h3>Achat sécurisé</h3>
            <p>Aucun paiement à l’avance. Inspection avant paiement.</p>
          </div>

          <div style={advantageCard}>
            <div style={advantageIcon}>🎥</div>
            <h3>Vidéo réelle</h3>
            <p>Découvrez la voiture en vidéo avant de réserver.</p>
          </div>

          <div style={advantageCard}>
            <div style={advantageIcon}>🚚</div>
            <h3>Livraison France</h3>
            <p>Transport personnalisé à domicile ou en point relais.</p>
          </div>

          <div style={advantageCard}>
            <div style={advantageIcon}>🧾</div>
            <h3>Documents fournis</h3>
            <p>Facture et documents pour l’immatriculation.</p>
          </div>

          <div style={advantageCard}>
            <div style={advantageIcon}>🛠</div>
            <h3>SAV & pièces</h3>
            <p>Assistance rapide et pièces disponibles en France.</p>
          </div>
        </div>
      </section>

      <section style={features}>
        <h2 style={sectionTitle}>Des caractéristiques pensées pour vous</h2>

        <div style={featuresGrid}>
          <div style={feature}>🔋 Jusqu’à 70 km d’autonomie</div>
          <div style={feature}>🔌 Recharge sur prise standard</div>
          <div style={feature}>🚗 Compacte et facile à garer</div>
          <div style={feature}>🧳 Grand coffre pratique</div>
          <div style={feature}>😊 Conduite simple et confortable</div>
        </div>
      </section>

      <section id="contact" style={contact}>
        <h2 style={contactTitle}>Prêt à découvrir NEODRIVE ?</h2>

        <p style={contactText}>
          Contactez-nous maintenant, obtenez votre vidéo réelle et réservez sans engagement.
        </p>

        <div style={contactButtons}>
          <a href="/reservation">
            <button style={reserveButton}>📅 Réserver sans paiement</button>
          </a>

          <a
            href="https://wa.me/33628261446"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button style={whatsappButton}>💬 Contactez-nous sur WhatsApp</button>
          </a>
        </div>

        <p style={phone}>📞 06 28 26 14 46</p>
      </section>

      <footer style={footer}>
        <strong>NEODRIVE</strong>
        <span>Marque toulousaine – 31 rue Jean Nougaro, 31600 Muret</span>
        <span>SIREN 908 645 393</span>
      </footer>
    </main>
  );
}

const page: React.CSSProperties = {
  width: "100%",
  margin: 0,
  fontFamily: "Arial, sans-serif",
  background: "#ffffff",
  color: "#111",
};

const hero: React.CSSProperties = {
  minHeight: 720,
  display: "flex",
  alignItems: "center",
  padding: "0 10%",
  backgroundImage: "url('/hero.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  color: "white",
};

const heroText: React.CSSProperties = {
  width: "48%",
  maxWidth: 650,
  zIndex: 2,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  background: "white",
  color: "#111",
  padding: "10px 18px",
  borderRadius: 999,
  fontWeight: 900,
  marginBottom: 24,
};

const title: React.CSSProperties = {
  fontSize: 72,
  lineHeight: 1,
  fontWeight: 950,
  margin: 0,
};

const priceHero: React.CSSProperties = {
  color: "#ff8a00",
  fontSize: 56,
  fontWeight: 950,
  margin: "18px 0",
};

const subtitle: React.CSSProperties = {
  fontSize: 23,
  lineHeight: 1.5,
  maxWidth: 580,
  color: "#f4f4f4",
};

const heroIcons: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginTop: 35,
  maxWidth: 680,
};

const heroIcon: React.CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(8px)",
  padding: "16px 12px",
  borderRadius: 18,
  fontWeight: 900,
  textAlign: "center",
  fontSize: 14,
};

const section: React.CSSProperties = {
  padding: "70px 10%",
};

const sectionTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 38,
  margin: 0,
  fontWeight: 950,
};

const sectionSubtitle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 12,
  marginBottom: 38,
  fontSize: 18,
  color: "#555",
};

const versionsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 32,
};

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 18px 45px rgba(0,0,0,0.10)",
  border: "1px solid #eee",
};

const cardDark: React.CSSProperties = {
  background: "linear-gradient(180deg, #090909 0%, #242424 100%)",
  color: "white",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 25px 60px rgba(0,0,0,0.30)",
  transform: "scale(1.04)",
};

const greenBadge: React.CSSProperties = {
  display: "inline-block",
  color: "#16a34a",
  background: "#dcfce7",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 900,
};

const orangeBadge: React.CSSProperties = {
  display: "inline-block",
  color: "white",
  background: "#f97316",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 900,
};

const purpleBadge: React.CSSProperties = {
  display: "inline-block",
  color: "#7c3aed",
  background: "#ede9fe",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 900,
};

const cardTitle: React.CSSProperties = {
  fontSize: 26,
  marginBottom: 8,
};

const cardPrice: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 950,
  margin: "8px 0",
};

const cardPriceWhite: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 950,
  margin: "8px 0",
  color: "white",
};

const cardText: React.CSSProperties = {
  color: "#555",
  lineHeight: 1.6,
};

const cardTextWhite: React.CSSProperties = {
  color: "#ddd",
  lineHeight: 1.6,
};

const list: React.CSSProperties = {
  paddingLeft: 20,
  lineHeight: 2,
  fontWeight: 800,
};

const listWhite: React.CSSProperties = {
  paddingLeft: 20,
  lineHeight: 2,
  fontWeight: 800,
  color: "white",
};

const emotion: React.CSSProperties = {
  margin: "0 10%",
  borderRadius: 30,
  padding: 45,
  background: "linear-gradient(135deg, #ff7a00 0%, #ff006e 100%)",
  color: "white",
};

const emotionTitle: React.CSSProperties = {
  fontSize: 34,
  margin: "0 0 12px",
};

const emotionText: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.6,
  margin: 0,
};

const presentation: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 40,
  alignItems: "center",
  padding: "75px 10%",
};

const presentationTitle: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 18,
};

const paragraph: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.75,
  color: "#333",
};

const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 18,
  marginTop: 30,
};

const stat: React.CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const statIcon: React.CSSProperties = {
  fontSize: 32,
};

const presentationImageBox: React.CSSProperties = {
  textAlign: "center",
};

const presentationImage: React.CSSProperties = {
  width: "100%",
  borderRadius: 28,
  boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
};

const darkSection: React.CSSProperties = {
  background: "#080808",
  color: "white",
  padding: "70px 10%",
};

const darkTitle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 38,
  marginBottom: 38,
};

const advantagesGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 18,
};

const advantageCard: React.CSSProperties = {
  background: "linear-gradient(180deg, #242424, #141414)",
  border: "1px solid #333",
  borderRadius: 22,
  padding: 22,
  textAlign: "center",
};

const advantageIcon: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 10,
};

const features: React.CSSProperties = {
  padding: "70px 10%",
};

const featuresGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 20,
  marginTop: 35,
};

const feature: React.CSSProperties = {
  textAlign: "center",
  fontSize: 17,
  fontWeight: 800,
};

const contact: React.CSSProperties = {
  margin: "0 10% 30px",
  borderRadius: 30,
  padding: 45,
  background: "linear-gradient(135deg, #080808 0%, #1f2937 100%)",
  color: "white",
  textAlign: "center",
};

const contactTitle: React.CSSProperties = {
  fontSize: 38,
  margin: 0,
};

const contactText: React.CSSProperties = {
  color: "#ddd",
  fontSize: 18,
};

const contactButtons: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 20,
  flexWrap: "wrap",
  marginTop: 25,
};

const reserveButton: React.CSSProperties = {
  padding: "18px 34px",
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #ff7a00 0%, #ff006e 100%)",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
};

const whatsappButton: React.CSSProperties = {
  padding: "18px 34px",
  border: "none",
  borderRadius: 14,
  background: "#25D366",
  color: "white",
  fontSize: 17,
  fontWeight: 900,
  cursor: "pointer",
};

const phone: React.CSSProperties = {
  marginTop: 22,
  fontSize: 22,
  fontWeight: 900,
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  padding: "20px 10%",
  fontSize: 13,
  color: "#555",
  flexWrap: "wrap",
};
