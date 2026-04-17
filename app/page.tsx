export default function Home() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={centerSection}>
        <h1 style={title}>
          Voiture sans permis neuve disponible immédiatement
        </h1>

        <p style={subtitle}>
          NeoDrive SWITCH – 100% électrique, économique et simple à utiliser
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

        <a href="https://wa.me/33628261446" target="_blank">
          <button style={ctaMain}>
            Contacter sur WhatsApp
          </button>
        </a>
      </section>

      {/* TRUST */}
      <section style={section}>
        <div style={grid}>
          <div style={card}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={card}>✔ Batterie incluse – aucun frais caché</div>
          <div style={card}>✔ Garantie 2 ans – SAV en France</div>
          <div style={card}>✔ Livraison rapide partout en France</div>
        </div>
      </section>

      {/* WHY */}
      <section style={section}>
        <h2 style={centerTitle}>Pourquoi choisir NeoDrive ?</h2>

        <p style={text}>
          NeoDrive SWITCH est une solution simple pour se déplacer sans permis,
          sans contraintes et sans leasing.
        </p>

        <p style={text}>
          Contrairement aux offres classiques, vous achetez votre véhicule une fois
          et vous en êtes propriétaire immédiatement, sans mensualités ni surprises.
        </p>
      </section>

      {/* LEASING COMPARISON */}
      <section style={section}>
        <h2 style={centerTitle}>Alternative au leasing</h2>

        <div style={{ marginTop: "20px" }}>
          <div style={badBox}>
            <strong>Leasing</strong>
            <p>6 000 à 8 000 € dépensés</p>
            <p>Vous ne possédez rien</p>
            <p>Frais cachés possibles</p>
          </div>

          <div style={goodBox}>
            <strong>Microdrive</strong>
            <p>Vous êtes propriétaire</p>
            <p>Aucun frais caché</p>
            <p>Investissement rentable</p>
          </div>
        </div>
      </section>

      {/* USE CASE */}
      <section style={section}>
        <h2 style={centerTitle}>Pour qui ?</h2>

        <div style={grid}>
          <div style={card}>✔ Jeunes conducteurs</div>
          <div style={card}>✔ Déplacements quotidiens</div>
          <div style={card}>✔ Personnes sans permis</div>
          <div style={card}>✔ Utilisation en ville</div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={centerSection}>
        <p style={{ fontWeight: "600", marginBottom: "15px" }}>
          Contactez-nous maintenant pour vérifier la disponibilité
        </p>

        <a href="https://wa.me/33628261446" target="_blank">
          <button style={ctaMain}>
            Discuter sur WhatsApp
          </button>
        </a>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: "900px",
  margin: "auto",
  padding: "20px",
  fontFamily: "Arial"
};

const centerSection = {
  textAlign: "center",
  padding: "40px 0"
};

const section = {
  padding: "40px 0"
};

const title = {
  fontSize: "30px",
  fontWeight: "700"
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
  borderRadius: "10px",
  marginTop: "25px"
};

const ctaMain = {
  padding: "15px 25px",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "20px"
};

const grid = {
  display: "grid",
  gap: "10px"
};

const card = {
  background: "#f7f7f7",
  padding: "12px",
  borderRadius: "8px"
};

const badBox = {
  background: "#fff0f0",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "10px"
};

const goodBox = {
  background: "#f0fff4",
  padding: "15px",
  borderRadius: "8px"
};

const centerTitle = {
  textAlign: "center"
};

const text = {
  color: "#555",
  marginTop: "10px"
};
