"use client";

import React, { useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [open, setOpen] = useState(false);

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
            }}
          >
            {/* LOGO */}
            <div
              style={{
                fontWeight: "700",
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

          {/* MENU */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 14,
              fontSize: "13px",
            }}
          >
            <a href="/" style={link}>Accueil</a>
            <a href="/produit" style={link}>Véhicule</a>
            <a href="/livraison" style={link}>Livraison</a>
            <a href="/carte-grise" style={link}>Carte grise</a>
            <a href="/QuiSommesNous" style={link}>Qui sommes-nous</a>

            {/* DROPDOWN SERVICE */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <span style={{ cursor: "pointer", fontWeight: 500 }}>
                Service & Assistance ▾
              </span>

              {open && (
                <div
                  style={{
                    position: "absolute",
                    top: "22px",
                    left: 0,
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: "6px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    minWidth: "180px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  }}
                >
                  <a href="/sav" style={link}>Service après-vente</a>
                  <a href="/pieces" style={link}>Pièces détachées</a>
                  <a href="/faq" style={link}>Questions fréquentes</a>
                </div>
              )}
            </div>

            <a href="/contact" style={link}>Contact</a>
          </div>

        </nav>

        {children}

      </body>
    </html>
  );
}

/* STYLES */

const ctaSmall = {
  background: "#25D366",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 600,
};

const link = {
  textDecoration: "none",
  color: "#333",
};
