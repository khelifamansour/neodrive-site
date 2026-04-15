export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial", background: "#ffffff" }}>

        {/* NAVBAR */}
        <nav style={{
          padding: "20px 50px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 1000
        }}>
          <div style={{ fontWeight: 600, fontSize: "18px" }}>
            Microdrive
          </div>

          <div style={{ display: "flex", gap: "25px", fontSize: "14px" }}>
            <a href="/">Accueil</a>
            <a href="/produit">Produit</a>
            <a href="/pieces">Pièces</a>
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact</a>


          </div>

          <a href="https://wa.me/33628261446" style={ctaSmall}>
            WhatsApp
          </a>
        </nav>

        {children}

      </body>
    </html>
  );
}

const ctaSmall = {
  background: "#25D366",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: "6px",
  textDecoration: "none"
};
