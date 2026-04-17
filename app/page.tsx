export default function Home() {
  return (
    <main style={container}>

      <section style={{ ...hero, textAlign: "center" }}>
        <h1 style={title}>
          Voiture sans permis neuve disponible immédiatement
        </h1>

        <p style={subtitle}>
          NeoDrive SWITCH – électrique, simple et économique
        </p>

        <h2 style={price}>À partir de 4 490 €</h2>

        <p style={urgency}>
          Stock limité – livraison rapide partout en France
        </p>

        <img
          src="/voiture.jpg"
          alt="NeoDrive"
          style={image}
        />

        <a href="https://wa.me/33628261446" target="_blank" style={cta}>
          Contacter sur WhatsApp
        </a>
      </section>

      <section style={section}>
        <div style={grid}>
          <div style={card}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={card}>✔ Batterie incluse – aucun frais caché</div>
          <div style={card}>✔ Garantie 2 ans – SAV en France</div>
          <div style={card}>✔ Livraison rapide partout en France</div>
        </div>
      </section>

      <section style={{ ...sectionCenter, textAlign: "center" }}>
        <h2>Pourquoi choisir NeoDrive ?</h2>
        <p style={text}>
          Une solution simple pour se déplacer sans permis.
        </p>
      </section>

      <section style={section}>
        <h2 style={{ textAlign: "center" }}>Alternative au leasing</h2>

        <div style={flexColumn}>
          <div style={badBox}>
            <strong>Leasing</strong>
            <p>6 000 à 8 000 € perdus</p>
            <p>Aucun véhicule</p>
          </div>

          <div style={goodBox}>
            <strong>Microdrive</strong>
            <p>Vous êtes propriétaire</p>
            <p>Aucune surprise</p>
          </div>
        </div>
      </section>

      <section style={{ ...final, textAlign: "center" }}>
        <a href="https://wa.me/33628261446" target="_blank" style={cta}>
          Discuter sur WhatsApp
        </a>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  fontFamily: "Arial, sans-serif",
  maxWidth: "900px",
  margin: "auto",
  padding: "20px"
};

const hero = {
  padding: "40px 0"
};

const title = {
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.3"
};

const subtitle = {
  color: "#555",
  marginTop: "10px"
};

const price = {
  fontSize: "22px",
  marginTop: "10px"
};

const urgency = {
  color: "#dc2626",
  fontWeight: "600",
  marginTop: "5px"
};

const image = {
  width: "100%",
  maxWidth: "420px",
  borderRadius: "12px",
  marginTop: "25px"
};

const cta = {
  display: "inline-block",
  marginTop: "25px",
  padding: "14px 24px",
  background: "#25D366",
  color: "white",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "600"
};

const section = {
  padding: "30px 0"
};

const sectionCenter = {
  padding: "30px 0"
};

const text = {
  color: "#555",
  marginTop: "10px"
};

const grid = {
  display: "grid",
  gap: "12px"
};

const card = {
  background: "#f7f7f7",
  padding: "14px",
  borderRadius: "8px"
};

const flexColumn = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "20px"
};

const badBox = {
  background: "#fff0f0",
  padding: "15px",
  borderRadius: "8px"
};

const goodBox = {
  background: "#f0fff4",
  padding: "15px",
  borderRadius: "8px"
};

const final = {
  padding: "40px 0"
};
