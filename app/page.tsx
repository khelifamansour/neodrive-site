export default function Home() {
  return (
    <main style={{ maxWidth: "900px", margin: "auto", padding: "20px", fontFamily: "Arial" }}>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: "40px 0" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>
          Voiture sans permis neuve disponible immédiatement
        </h1>

        <p style={{ color: "#555" }}>
          NeoDrive SWITCH – électrique, simple et économique
        </p>

        <h2>À partir de 4 490 €</h2>

        <p style={{ color: "red", fontWeight: "600" }}>
          Stock limité – livraison rapide
        </p>

        <img
          src="/voiture.jpg"
          alt="car"
          style={{ width: "100%", maxWidth: "400px", marginTop: "20px", borderRadius: "10px" }}
        />

        <div style={{ marginTop: "20px" }}>
          <a href="https://wa.me/33628261446" target="_blank">
            <button style={{
              padding: "15px 25px",
              background: "#25D366",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer"
            }}>
              Contacter sur WhatsApp
            </button>
          </a>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: "30px 0" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={box}>✔ Batterie incluse – aucun frais caché</div>
          <div style={box}>✔ Garantie 2 ans – SAV France</div>
          <div style={box}>✔ Livraison rapide</div>
        </div>
      </section>

      {/* LEASING */}
      <section style={{ padding: "30px 0", textAlign: "center" }}>
        <h2>Alternative au leasing</h2>

        <div style={{ marginTop: "20px" }}>
          <div style={{ ...box, background: "#fff0f0" }}>
            <strong>Leasing</strong>
            <p>6 000 à 8 000 € perdus</p>
            <p>Aucun véhicule</p>
          </div>

          <div style={{ ...box, background: "#f0fff4", marginTop: "10px" }}>
            <strong>Microdrive</strong>
            <p>Vous êtes propriétaire</p>
            <p>Aucune surprise</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: "center", padding: "40px 0" }}>
        <a href="https://wa.me/33628261446" target="_blank">
          <button style={{
            padding: "15px 25px",
            background: "#25D366",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600"
          }}>
            Discuter sur WhatsApp
          </button>
        </a>
      </section>

    </main>
  );
}

const box = {
  background: "#f7f7f7",
  padding: "12px",
  borderRadius: "8px"
};
