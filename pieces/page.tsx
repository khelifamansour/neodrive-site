export default function Pieces() {
  return (
    <main style={{
      fontFamily: "system-ui, Arial",
      background: "#fafafa",
      minHeight: "100vh",
      padding: "80px 20px",
      textAlign: "center"
    }}>

      {/* TITLE */}
      <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
        Pièces détachées
      </h1>

      <p style={{ marginTop: "10px", color: "#555" }}>
        Toutes les pièces disponibles en France
      </p>

      {/* TRUST BLOCK */}
      <div style={{
        maxWidth: "700px",
        margin: "40px auto",
        textAlign: "left"
      }}>
        <h2>Un service après-vente prioritaire</h2>

        <p style={text}>
          Chez Microdrive, le service après-vente est une priorité.
          Nous savons que la disponibilité des pièces est essentielle
          pour garantir la fiabilité de votre véhicule.
        </p>

        <p style={text}>
          C’est pourquoi nous assurons un stock de pièces en France
          avec des délais rapides et des prix accessibles.
        </p>

        <ul style={list}>
          <li>✔ Pièces disponibles rapidement</li>
          <li>✔ Prix accessibles</li>
          <li>✔ Support technique</li>
          <li>✔ Assistance après achat</li>
        </ul>
      </div>

      {/* SAMPLE PARTS */}
      <div style={{
        maxWidth: "900px",
        margin: "auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        marginTop: "40px"
      }}>

        <div style={card}>
          <strong>Écran</strong>
          <p>169 €</p>
        </div>

        <div style={card}>
          <strong>Caméra de recul</strong>
          <p>79 €</p>
        </div>

        <div style={card}>
          <strong>Contrôleur</strong>
          <p>449 €</p>
        </div>

        <div style={card}>
          <strong>Autoradio</strong>
          <p>69 €</p>
        </div>

      </div>

      {/* DOWNLOAD FULL LIST */}
      <div style={{ marginTop: "50px" }}>
        <a href="/pieces.pdf"
          target="_blank"
          style={cta}>
          Télécharger la liste complète
        </a>
      </div>

      {/* CTA */}
      <div style={{ marginTop: "40px" }}>
        <a href="https://wa.me/33776156169"
          style={ctaGreen}>
          Commander une pièce
        </a>
      </div>

    </main>
  );
}

/* STYLES */

const text = {
  marginTop: "15px",
  color: "#444",
  lineHeight: "1.6"
};

const list = {
  marginTop: "20px",
  lineHeight: "2"
};

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
};

const cta = {
  padding: "15px 30px",
  background: "#111",
  color: "#fff",
  borderRadius: "8px",
  textDecoration: "none"
};

const ctaGreen = {
  padding: "15px 30px",
  background: "#25D366",
  color: "#fff",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold"
};