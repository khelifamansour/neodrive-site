export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: "auto", padding: 20, fontFamily: "Arial" }}>

      {/* HERO */}
      <section style={{ padding: "40px 0" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>
            Voiture sans permis neuve disponible immédiatement
          </h1>

          <p style={{ color: "#555" }}>
            NeoDrive SWITCH – électrique, simple et économique
          </p>

          <h2>À partir de 4 490 €</h2>

          <p style={{ color: "red", fontWeight: 600 }}>
            Stock limité – livraison rapide
          </p>

          <img
            src="/voiture.jpg"
            alt="car"
            style={{ width: "100%", maxWidth: 400, marginTop: 20, borderRadius: 10 }}
          />

          {/* BUTTONS */}
          <div style={{ marginTop: 20 }}>

            {/* RESERVATION BUTTON */}
            <div style={{ marginBottom: 10 }}>
              <a href="/reservation">
                <button style={ctaPrimary}>
                  Réserver ce véhicule
                </button>
              </a>
            </div>

            {/* WHATSAPP BUTTON */}
            <a href="https://wa.me/33628261446" target="_blank">
              <button style={cta}>
                Contacter sur WhatsApp
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
          <div style={box}>✔ Garantie 2 ans – SAV France</div>
          <div style={box}>✔ Livraison rapide</div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: "30px 0" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Pourquoi choisir NeoDrive ?</h2>

          <p style={{ color: "#555" }}>
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

const box = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10
};

const cta = {
  padding: "15px 25px",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};

const ctaPrimary = {
  padding: "15px 25px",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer"
};
