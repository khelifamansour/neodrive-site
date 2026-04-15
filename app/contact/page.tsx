export default function Contact() {
  return (
    <main style={{
      fontFamily: "system-ui, Arial",
      background: "#fafafa",
      minHeight: "100vh",
      padding: "80px 20px",
      textAlign: "center"
    }}>

      {/* TITLE */}
      <h1 style={{
        fontSize: "42px",
        fontWeight: 600,
        marginBottom: "10px"
      }}>
        Contact
      </h1>

      <p style={{
        color: "#666",
        fontSize: "16px"
      }}>
        Réponse rapide – Disponible tous les jours
      </p>

      {/* CONTACT CARD */}
      <div style={{
        maxWidth: "420px",
        margin: "40px auto",
        background: "#ffffff",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
      }}>

        {/* ICON */}
        <div style={{
          fontSize: "30px",
          marginBottom: "10px"
        }}>
          📞
        </div>

        {/* PHONE */}
        <div style={{
          fontSize: "20px",
          fontWeight: "600",
          marginBottom: "20px"
        }}>
          07 76 15 61 69
        </div>

        {/* WHATSAPP BUTTON */}
        <a href="https://wa.me/33776156169"
          style={{
            display: "inline-block",
            padding: "14px 30px",
            background: "#25D366",
            color: "#fff",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "15px"
          }}>
          Contacter sur WhatsApp
        </a>

        {/* SMALL TEXT */}
        <div style={{
          marginTop: "15px",
          fontSize: "13px",
          color: "#888"
        }}>
          Réponse en quelques minutes
        </div>

      </div>

      {/* TRUST SECTION */}
      <div style={{
        maxWidth: "600px",
        margin: "auto",
        marginTop: "40px",
        textAlign: "left"
      }}>

        <h2 style={{ fontSize: "22px" }}>
          Pourquoi nous contacter ?
        </h2>

        <ul style={{
          marginTop: "20px",
          lineHeight: "2",
          color: "#333"
        }}>
          <li>✔ Véhicules disponibles immédiatement</li>
          <li>✔ Livraison partout en France</li>
          <li>✔ Envoi de vidéo avant déplacement</li>
          <li>✔ Aucun frais caché</li>
          <li>✔ Conseils personnalisés</li>
        </ul>

      </div>

      {/* FINAL CTA */}
      <div style={{ marginTop: "50px" }}>
        <a href="https://wa.me/33776156169"
          style={{
            padding: "18px 40px",
            background: "#25D366",
            color: "#fff",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "16px"
          }}>
          Parler maintenant
        </a>
      </div>

    </main>
  );
}