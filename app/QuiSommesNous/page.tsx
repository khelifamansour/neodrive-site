'use client';
import React from "react";

export default function QuiSommesNous() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={center}>
        <h1 style={title}>Qui sommes-nous ?</h1>

        <p style={subtitle}>
          Une entreprise française spécialisée dans les véhicules électriques sans permis
        </p>
      </section>

      {/* INTRO */}
      <section style={section}>
        <div style={box}>
          Nous sommes une marque basée à Toulouse spécialisée dans les véhicules électriques sans permis.<br /><br />

          Nous combinons :
          <br />
          ✔ L’ingénierie et les normes européennes<br />
          ✔ Le savoir-faire industriel chinois dans l’électrique<br /><br />

          Notre objectif est simple : proposer des véhicules fiables, accessibles et disponibles rapidement en France.
        </div>
      </section>

      {/* LOGISTIQUE FRANCE */}
      <section style={section}>
        <h2 style={h2}>📍 Stock & logistique en France</h2>

        <div style={box}>
          ✔ Véhicules déjà présents en France<br />
          ✔ Préparation et vérification avant livraison<br />
          ✔ Livraison rapide partout en France<br />
          ✔ Organisation logistique maîtrisée<br /><br />

          Nos véhicules sont stockés en France, prêts à être livrés rapidement.<br /><br />

          ✔ Vidéo réelle du véhicule avant achat<br />
          ✔ Aucun paiement à l’avance
        </div>

      


     
        </div>
      </section>

      {/* USINE */}
      <section style={section}>
        <h2 style={h2}>🏭 Fabrication & usine</h2>

        <div style={box}>
          Nos véhicules sont produits dans une région industrielle spécialisée dans les véhicules électriques,
          avec une capacité de production élevée.<br /><br />

          ✔ Process industriel maîtrisé<br />
          ✔ Production en volume<br />
          ✔ Fabrication dans une zone utilisée par de grandes marques<br /><br />

          Nous sélectionnons directement les modèles pour garantir fiabilité et simplicité.
        </div>

       
      </section>

      {/* QUALITÉ */}
      <section style={section}>
        <h2 style={h2}>⚙️ Qualité & conformité</h2>

        <div style={box}>
          ✔ Véhicules conformes aux normes européennes<br />
          ✔ Certificat de conformité (COC)<br />
          ✔ Contrôle qualité avant livraison<br />
          ✔ Conçus pour un usage simple et quotidien
        </div>
      </section>

      {/* SAV */}
      <section style={section}>
        <h2 style={h2}>🛠️ Service après-vente</h2>

        <div style={box}>
          ✔ Assistance rapide via WhatsApp<br />
          ✔ Diagnostic à distance<br />
          ✔ Pièces disponibles en France<br />
          ✔ Réseau de garages partenaires<br /><br />

          Nous avons construit un système complet pour assurer le suivi après-vente partout en France.
        </div>
      </section>

      {/* CTA */}
      <section style={center}>
        <a href="https://wa.me/33628261446" target="_blank">
          <button style={btnGreen}>
            Voir le véhicule réel en vidéo
          </button>
        </a>

        <a href="/reservation">
          <button style={btnBlack}>
            Réserver sans paiement
          </button>
        </a>

        <p style={safe}>
          Réponse rapide – vidéo réelle disponible immédiatement
        </p>
      </section>

    </main>
  );
}

/* STYLES */

const container: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 10,
  fontFamily: "Arial"
};

const center: React.CSSProperties = {
  textAlign: "center",
  padding: "30px 10px"
};

const section: React.CSSProperties = {
  padding: "20px 10px"
};

const title: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700
};

const subtitle: React.CSSProperties = {
  color: "#555",
  marginTop: 10
};

const h2: React.CSSProperties = {
  marginBottom: 10
};

const box: React.CSSProperties = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 15,
  lineHeight: "1.6"
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
};

const img: React.CSSProperties = {
  width: "100%",
  borderRadius: 8
};

const videoBox: React.CSSProperties = {
  marginTop: 10
};

const video: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  marginTop: 10
};

const btnGreen: React.CSSProperties = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const btnBlack: React.CSSProperties = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const small: React.CSSProperties = {
  fontSize: 12,
  color: "#555",
  marginTop: 10
};

const safe: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "#444"
};
