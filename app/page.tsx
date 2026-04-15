export default function Home() {
  return (
    <main style={{ textAlign: "center" }}>

      {/* HERO */}
      <section style={{ padding: "80px 20px" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 600 }}>
          NeoDrive SWITCH
        </h1>

        <p style={{ fontSize: "18px", color: "#555" }}>
          Voiture électrique sans permis
        </p>

        <p style={{ color: "#777", marginTop: "5px" }}>
          Disponible immédiatement
        </p>

        <h2 style={{ marginTop: "10px", fontSize: "22px" }}>
          À partir de 4 490 €
        </h2>

        {/* IMAGE CENTERED */}
        <div style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "center"
        }}>
          <img
            src="/voiture.jpg"
            style={{
              width: "520px",
              maxWidth: "90%",
              borderRadius: "12px"
            }}
          />
        </div>

        {/* CTA */}
        <div style={{ marginTop: "30px" }}>
          <a href="https://wa.me/33628261446" style={ctaMain}>
            Contacter maintenant
          </a>
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{
        maxWidth: "800px",
        margin: "auto",
        padding: "40px 20px"
      }}>
        <div style={{ display: "grid", gap: "15px" }}>
          <div style={card}>Véhicule neuf – jamais immatriculé</div>
          <div style={card}>Batterie incluse – aucun frais caché</div>
          <div style={card}>Garantie 2 ans – SAV en France</div>
          <div style={card}>Pièces disponibles rapidement</div>
        </div>
      </section>

      {/* LEASING */}
      <section style={{
        maxWidth: "800px",
        margin: "auto",
        padding: "60px 20px"
      }}>
        <h2>Alternative au leasing</h2>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          marginTop: "30px"
        }}>
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

      {/* CTA FINAL */}
      <section style={{ padding: "60px 20px" }}>
        <a href="https://wa.me/33628261446" style={ctaMain}>
          Appeler maintenant
        </a>
      </section>

    </main>
  );
}

/* STYLES */

const card = {
  background: "#f7f7f7",
  padding: "15px",
  borderRadius: "8px"
};

const badBox = {
  flex: 1,
  background: "#fff0f0",
  padding: "15px",
  borderRadius: "8px"
};

const goodBox = {
  flex: 1,
  background: "#f0fff4",
  padding: "15px",
  borderRadius: "8px"
};

const ctaMain = {
  padding: "15px 30px",
  background: "#25D366",
  color: "#fff",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold"
};