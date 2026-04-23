export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, Arial",
          background: "#ffffff",
        }}
      >

        {/* NAVBAR */}
        <nav
          style={{
            padding: "10px",
            borderBottom: "1px solid #eee",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1000,
          }}
        >
          {/* TOP ROW */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* LOGO */}
            <div
              style={{
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              Microdrive
            </div>

            {/* WHATSAPP BUTTON */}
            <a href="https://wa.me/33628261446" style={ctaSmall}>
              WhatsApp
            </a>
          </div>

          {/* MENU (SECOND ROW ON MOBILE) */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: "13px",
            }}
          >
            <a href="/">Accueil</a>
            <a href="/produit">Produit</a>
            <a href="/pieces">Pièces</a>
            <a href="/sav">SAV</a>
            <a href="/livraison">Livraison</a>
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact</a>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}

/* BUTTON */

const ctaSmall = {
  background: "#25D366",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "12px",
};
