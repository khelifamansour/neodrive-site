"use client";

import React from "react";

export default function Home() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={center}>
        <h1 style={title}>
          Voiture sans permis neuve dès 4 490 € TTC
        </h1>

        <p style={subtitle}>
          Électrique – simple – économique
        </p>

        <p style={alert}>
          Stock limité – livraison rapide partout en France
        </p>

        <img
          src="/voiture.jpg"
          alt="voiture sans permis"
          style={image}
        />

        <div style={ctaBox}>
          <a href="https://wa.me/33628261446" target="_blank">
            <button style={btnGreen}>
              Voir le véhicule réel en vidéo maintenant
            </button>
          </a>

          <a href="/reservation">
            <button style={btnBlack}>
              Réserver sans paiement
            </button>
          </a>
        </div>

        <p style={safeStrong}>
          🔒 Achat 100% sécurisé : aucun paiement à l’avance – inspection avant paiement
        </p>
      </section>

      {/* SECURITY */}
      <section style={section}>
        <h2 style={h2}>Achat sécurisé</h2>

        <div style={box}>
          ✔ Aucun acompte demandé<br />
          ✔ Paiement uniquement à la livraison<br />
          ✔ Inspection complète du véhicule avant paiement<br />
          ✔ Refus possible si non conforme<br />
          ✔ Aucun engagement tant que vous n’avez pas validé
        </div>
      </section>

      {/* TRUST */}
      <section style={section}>
        <div style={box}>
          <strong>Entreprise Française</strong><br />
          MK HOLDING – SIREN 908 645 393<br />
          31 rue Jean Nougaro – 31600 Muret<br />
          Véhicules conformes à la réglementation française<br />
          Facture fournie + documents pour immatriculation
        </div>

        <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
        <div style={box}>✔ Batterie incluse – aucun frais caché</div>
        <div style={box}>✔ Paiement sécurisé à la livraison</div>
        <div style={box}>✔ SAV + pièces disponibles en France</div>
        <div style={box}>✔ Assistance rapide WhatsApp / téléphone</div>
      </section>

      {/* PRICE */}
      <section style={section}>
        <h2 style={h2}>Prix clair</h2>

        <div style={box}>
 ✔ Véhicule : à partir de 4 490 € TTC  <br />
✔ Livraison partout en France via transport personnalisé  <br />
✔ Paiement uniquement à la livraison  <br />
✔ Possibilité d’organiser votre propre transporteur  <br />
✔ Carte grise : 150 €  <br />
✔ Aucun frais caché  

👉 Voir les détails dans la section Livraison
        </div>
      </section>

      {/* WHY PRICE */}
      <section style={section}>
        <h2 style={h2}>Pourquoi ce prix ?</h2>

        <div style={box}>
          ✔ Import direct usine<br />
          ✔ Pas de concession coûteuse<br />
          ✔ Pas de leasing imposé<br />
          ✔ Structure légère = prix réduit pour le client
        </div>
      </section>

      {/* PROCESS */}
      <section style={section}>
        <h2 style={h2}>Comment ça marche (simple et sécurisé)</h2>

        <div style={box}>
          1. Contact WhatsApp ou téléphone<br />
          2. Vidéo réelle du véhicule disponible<br />
          3. Validation sans engagement<br />
          4. Préparation du véhicule<br />
          5. Livraison à domicile ou retrait<br />
          6. Inspection complète AVANT paiement<br />
          7. Paiement uniquement si tout est conforme<br />
          8. Aide pour immatriculation
        </div>
      </section>

      {/* WARRANTY */}
      <section style={section}>
        <h2 style={h2}>Garantie & assistance</h2>

        <div style={box}>
          <strong>✔ Vous n’êtes jamais seul après l’achat</strong><br /><br />

          ✔ Garantie constructeur :<br />
          - Structure (châssis, carrosserie) : 2 ans<br />
          - Composants électriques : 1 an<br />
          - Batterie : 6 mois (usage normal)<br /><br />

          ✔ Assistance technique gratuite à vie (WhatsApp / téléphone)<br />
          ✔ Diagnostic rapide à distance<br />
          ✔ Pièces disponibles durablement (suivi assuré)<br />
          ✔ Envoi de pièces partout en France<br />
          ✔ Main d’œuvre prise en charge après validation pour pannes couvertes<br /><br />

          ✔ Accompagnement réel :<br />
          Nous vous guidons étape par étape pour résoudre rapidement toute situation.
        </div>
      </section>

      {/* DIFFERENCE */}
      <section style={center}>
        <h2 style={h2}>Pourquoi nous choisir</h2>

        <p style={why}>
          ✔ Pas de leasing (contrairement à Ami)<br />
          ✔ Pas d’abonnement mensuel<br />
          ✔ Vous êtes propriétaire du véhicule<br />
          ✔ Prix direct import sans intermédiaire<br />
          ✔ Process simple et transparent<br />
          ✔ Achat sans risque
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={center}>
        <a href="https://wa.me/33628261446" target="_blank">
          <button style={btnGreen}>
            Voir le véhicule en vidéo maintenant
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
  fontSize: 24,
  fontWeight: 700
};

const subtitle: React.CSSProperties = {
  color: "#555",
  marginTop: 10
};

const alert: React.CSSProperties = {
  color: "red",
  fontWeight: 600,
  marginTop: 5
};

const image: React.CSSProperties = {
  width: "100%",
  marginTop: 20,
  borderRadius: 10
};

const ctaBox: React.CSSProperties = {
  marginTop: 20
};

const box: React.CSSProperties = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10,
  lineHeight: "1.6"
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

const h2: React.CSSProperties = {
  marginBottom: 10
};

const why: React.CSSProperties = {
  color: "#555",
  marginTop: 10
};

const safe: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "#444"
};

const safeStrong: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  color: "#000",
  fontWeight: 700
};
