export default function Home() {
  return (
    <main style={{
      width: "100%",
      maxWidth: 900,
      margin: "0 auto",
      padding: "10px",
      fontFamily: "Arial"
    }}>

      {/* HERO */}
      <section style={{ padding: "30px 10px" }}>
        <div style={{ textAlign: "center" }}>

          <h1 style={{ fontSize: "24px", fontWeight: "700" }}>
            Voiture sans permis neuve disponible immédiatement
          </h1>

          <p style={{ color: "#555", marginTop: 10 }}>
            NeoDrive SWITCH – électrique, simple et économique
          </p>

          <h2 style={{ marginTop: 10 }}>À partir de 4 490 €</h2>

          <p style={{ color: "red", fontWeight: "600", marginTop: 5 }}>
            Stock limité – livraison rapide
          </p>

          <img
            src="/voiture.jpg"
            alt="NeoDrive SWITCH"
            style={{ width: "100%", marginTop: 20, borderRadius: 10 }}
          />

          {/* BUTTONS */}
          <div style={{ marginTop: 20 }}>

            <a href="/reservation">
              <button style={{
                marginTop: 10,
                padding: 15,
                width: "100%",
                background: "#000",
                color: "white",
                border: "none",
                borderRadius: 8
              }}>
                Réserver ce véhicule
              </button>
            </a>

            <a href="https://wa.me/33628261446" target="_blank">
              <button style={{
                marginTop: 10,
                padding: 15,
                width: "100%",
                background: "#25D366",
                color: "white",
                border: "none",
                borderRadius: 8
              }}>
                Contacter sur WhatsApp
              </button>
            </a>

            <a href="/sav">
              <button style={{
                marginTop: 10,
                padding: 12,
                width: "100%",
                background: "#ddd",
                color: "#000",
                border: "none",
                borderRadius: 8
              }}>
                Voir le SAV
              </button>
            </a>

          </div>

        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: "20px 10px" }}>
        <div>
          <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={box}>✔ Batterie incluse – aucun frais caché</div>
          <div style={box}>✔ Garantie 2 ans – SAV en France</div>
          <div style={box}>✔ Pièces disponibles immédiatement</div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: "20px 10px", textAlign: "center" }}>
        <h2>Pourquoi choisir NeoDrive ?</h2>
        <p style={{ color: "#555", marginTop: 10 }}>
          Une solution simple pour se déplacer sans permis,
          sans leasing et sans coûts cachés.
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "30px 10px", textAlign: "center" }}>
        <a href="/reservation">
          <button style={{
            marginTop: 10,
            padding: 15,
            width: "100%",
            background: "#000",
            color: "white",
            border: "none",
            borderRadius: 8
          }}>
            Réserver maintenant
          </button>
        </a>
      </section>

    </main>
  );
}

const box = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10
};
