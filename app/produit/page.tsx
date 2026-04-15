"use client";
import { useState } from "react";
import type { CSSProperties } from "react";

export default function Produit() {

  const images = [
    "/img1.png",
    "/img2.png",
    "/img3.png",
    "/img4.png",
    "/img5.png",
    "/img6.png",
    "/img7.png"
  ];

  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main style={mainStyle}>

      {/* HERO */}
      <section style={heroSection}>
        <h1 style={title}>NeoDrive SWITCH</h1>

        <p style={subtitle}>
          Voiture électrique sans permis
        </p>

        <p style={smallText}>
          Disponible immédiatement
        </p>

        <h2 style={price}>
          À partir de 4 490 €
        </h2>

        <div style={center}>
          <img
            src="/voiture.jpg"
            style={mainImage}
            onClick={() => setSelected("/voiture.jpg")}
          />
        </div>
      </section>

      {/* GALLERY */}
      <section style={gallerySection}>
        <h2 style={centerTitle}>Photos du véhicule</h2>

        <div style={grid}>
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              style={imgStyle}
              onClick={() => setSelected(img)}
            />
          ))}
        </div>
      </section>

      {/* POSITIONING */}
      <section style={section}>
        <h2>Simple, fiable, accessible</h2>

        <p style={text}>
          Le NeoDrive SWITCH a été conçu avec une idée simple :
          proposer un véhicule électrique sans permis fiable,
          économique et sans complexité inutile.
        </p>

        <p style={text}>
          Nous privilégions un design simple et robuste afin de garantir
          une utilisation durable et limiter les coûts d’entretien.
        </p>
      </section>

      {/* PRICE */}
      <section style={graySection}>
        <div style={container}>
          <h2>Pourquoi ce prix est-il aussi accessible ?</h2>

          <p style={text}>
            Nous vendons directement depuis l’usine, sans intermédiaires.
          </p>

          <ul style={list}>
            <li>✔ Pas de concessionnaires coûteux</li>
            <li>✔ Pas de marketing inutile</li>
            <li>✔ Design simple et fiable</li>
            <li>✔ Optimisation des coûts</li>
          </ul>

          <p style={text}>
            Résultat : un véhicule fiable, moderne et bien équipé
            à un prix largement inférieur aux grandes marques.
          </p>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section style={section}>
        <h2>Une expérience solide</h2>

        <p style={text}>
          Nous sommes présents dans le secteur des véhicules électriques
          sans permis depuis 2020.
        </p>

        <p style={text}>
          Grâce à notre expérience, nous sélectionnons des modèles fiables
          et adaptés à une utilisation quotidienne.
        </p>
      </section>

      {/* SPECIFICATIONS */}
      <section style={specSection}>
        <h2 style={centerTitle}>Fiche technique complète</h2>

        <div style={table}>
          <Row label="Moteur" value="3000W électrique" />
          <Row label="Vitesse maximale" value="45 km/h" />
          <Row label="Autonomie" value="60 à 80 km" />
          <Row label="Batterie" value="60V 58Ah" />
          <Row label="Temps de charge" value="6 à 8 heures" />
          <Row label="Nombre de places" value="2" />
          <Row label="Poids" value="267 kg" />
          <Row label="Dimensions" value="2500 × 1290 × 1675 mm" />
          <Row label="Freins" value="Disques avant/arrière" />
          <Row label="Caméra" value="Caméra de recul" />
          <Row label="Chauffage" value="Oui" />
        </div>
      </section>

      {/* DOCUMENTATION */}
      <section style={docSection}>
        <h2>Documentation du véhicule</h2>

        <p style={text}>
          Un manuel utilisateur complet est disponible pour vous accompagner.
        </p>

        <div style={{ marginTop: "30px" }}>
          <a href="/manuel-utilisateur-neodrive.pdf" target="_blank" style={ctaDark}>
            Télécharger le manuel utilisateur
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={ctaSection}>
        <a href="https://wa.me/33776156169" style={cta}>
          Demander une vidéo ou réserver
        </a>
      </section>

      {/* FULLSCREEN IMAGE */}
      {selected && (
        <div onClick={() => setSelected(null)} style={overlay}>
          <img src={selected} style={zoomImg} />
        </div>
      )}

    </main>
  );
}

/* COMPONENT */
function Row(props: { label: string; value: string }) {
  return (
    <div style={row}>
      <div>{props.label}</div>
      <div style={{ color: "#555" }}>{props.value}</div>
    </div>
  );
}

/* STYLES */

const mainStyle: CSSProperties = {
  fontFamily: "system-ui, Arial",
  background: "#ffffff",
  color: "#111"
};

const heroSection: CSSProperties = {
  textAlign: "center",
  padding: "80px 20px"
};

const title: CSSProperties = { fontSize: "48px", fontWeight: 600 };
const subtitle: CSSProperties = { fontSize: "18px", color: "#555" };
const smallText: CSSProperties = { color: "#777", marginTop: "5px" };
const price: CSSProperties = { marginTop: "10px" };

const center: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "40px"
};

const mainImage: CSSProperties = {
  width: "550px",
  maxWidth: "90%",
  borderRadius: "12px",
  cursor: "pointer"
};

const gallerySection: CSSProperties = {
  maxWidth: "900px",
  margin: "40px auto",
  padding: "20px"
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "15px"
};

const imgStyle: CSSProperties = {
  width: "100%",
  borderRadius: "10px",
  cursor: "pointer"
};

const centerTitle: CSSProperties = {
  textAlign: "center",
  marginBottom: "20px"
};

const section: CSSProperties = {
  maxWidth: "800px",
  margin: "auto",
  padding: "60px 20px"
};

const text: CSSProperties = {
  marginTop: "15px",
  color: "#444",
  lineHeight: "1.6"
};

const graySection: CSSProperties = {
  background: "#f7f7f7",
  padding: "60px 20px"
};

const container: CSSProperties = {
  maxWidth: "800px",
  margin: "auto"
};

const list: CSSProperties = {
  marginTop: "20px",
  lineHeight: "2"
};

const specSection: CSSProperties = {
  maxWidth: "900px",
  margin: "auto",
  padding: "60px 20px"
};

const table: CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "15px 20px",
  borderBottom: "1px solid #eee"
};

const docSection: CSSProperties = {
  maxWidth: "800px",
  margin: "auto",
  padding: "60px 20px",
  textAlign: "center"
};

const ctaSection: CSSProperties = {
  textAlign: "center",
  padding: "80px 20px"
};

const cta: CSSProperties = {
  padding: "18px 40px",
  background: "#25D366",
  color: "#fff",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: "bold"
};

const ctaDark: CSSProperties = {
  padding: "15px 30px",
  background: "#111",
  color: "#fff",
  borderRadius: "10px",
  textDecoration: "none"
};

const overlay: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.9)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  cursor: "pointer"
};

const zoomImg: CSSProperties = {
  maxWidth: "90%",
  maxHeight: "90%"
};
