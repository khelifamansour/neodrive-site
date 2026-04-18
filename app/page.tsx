export default function Home() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={{ padding: "40px 0" }}>
        <div style={{ textAlign: "center" }}>

          <h1 style={title}>
            Voiture sans permis neuve disponible immédiatement
          </h1>

          <p style={subtitle}>
            NeoDrive SWITCH – électrique, simple et économique
          </p>

          <h2 style={price}>À partir de 4 490 €</h2>

          <p style={urgency}>
            Stock limité – livraison rapide
          </p>

          <img
            src="/voiture.jpg"
            alt="NeoDrive SWITCH"
            style={image}
          />

          {/* BUTTONS */}
          <div style={{ marginTop: 20 }}>

            <a href="/reservation">
              <button style={ctaPrimary}>
                Réserver ce véhicule
              </button>
            </a>

            <a href="https://wa.me/33628261446" target="_blank">
              <button style={cta}>
                Contacter sur WhatsApp
              </button>
            </a>

            {/* NEW SAV BUTTON */}
            <a href="/sav">
              <button style={ctaSecondary}>
                Voir le service après-vente
              </button>
            </a>

          </div>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: "30px 0" }}>
        <div>
          <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={box}>✔ Batterie incluse – aucun frais caché</div>
          <div style={box}>✔ Garantie 2 ans – SAV en France</div>
          <div style={box}>✔ Pièces disponibles immédiatement</div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: "30px 0" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Pourquoi choisir NeoDrive ?</h2>

          <p style={subtitle}>
            Une solution simple pour se déplacer sans permis,
            sans leasing et sans coûts cachés.
          </p>
        </div>
      </section>

      {/* LEASING */}
      <section style={{ padding: "30px 0" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Alternative au leasing</h2>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ ...box, background: "#fff0f0" }}>
            <strong>Leasing</strong>
            <p>6 000 à 8 000 € perdus</p>
            <p>Aucun véhicule</p>
          </div>

          <div style={{ ...box, background: "#f0fff4", marginTop: 10 }}>
            <strong>Microdrive</strong>
            <p>Vous êtes propriétaire</p>
            <p>Aucune surprise</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "40px 0" }}>
        <div style={{ textAlign: "center" }}>
          <a href="/reservation">
            <button style={ctaPrimary}>
              Réserver maintenant
            </button>
          </a>
        </div>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial"
};

const title = {
  fontSize: 26,
  fontWeight: "700"
};

const subtitle = {
  color: "#555",
  marginTop: 10
};

const price = {
  marginTop: 10
};

const urgency = {
  color: "red",
  fontWeight: "600",
  marginTop: 5
};

const image = {
  width: "100%",
  maxWidth: 400,
  marginTop: 20,
  borderRadius: 10
};

const box = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10
};

const ctaPrimary = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: "700",
  cursor: "pointer"
};

const cta = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: "600",
  cursor: "pointer"
};

const ctaSecondary = {
  marginTop: 10,
  padding: 12,
  width: "100%",
  background: "#ddd",
  color: "#000",
  border: "none",
  borderRadius: 8,
  fontWeight: "600",
  cursor: "pointer"
};
