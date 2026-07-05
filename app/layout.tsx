"use client";

import React, { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <html lang="fr">
  <html lang="fr">
  <body>
  <body
        <header className="header">
          <div className="top">
            <a href="/" className="brand">
              <span className="icon">N</span>
              <span className="brandText">
                <strong>NeoDrive</strong>
                <small>Voiture sans permis électrique</small>
              </span>
            </a>

            <div className="actions">
              <a
                href="https://wa.me/33628261446"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp"
              >
                WhatsApp
              </a>

              <button className="menuBtn" onClick={() => setOpen(!open)}>
                ☰
              </button>
            </div>
          </div>

          <nav className={open ? "menu open" : "menu"}>
            <a href="/">Accueil</a>
            <a href="/produit">Véhicules</a>
            <a href="/livraison">Livraison</a>
            <a href="/carte-grise">Carte grise</a>
            <a href="/QuiSommesNous">Qui sommes-nous</a>
            <a href="/sav">SAV</a>
            <a href="/pieces">Pièces détachées</a>
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>

        {children}

        <style jsx global>{`
          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            overflow-x: hidden;
            background: #fff;
            font-family: system-ui, Arial, sans-serif;
          }

          * {
            box-sizing: border-box;
          }
        `}</style>

        <style jsx>{`
          .header {
            position: sticky;
            top: 0;
            z-index: 9999;
            width: 100%;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(18px);
            border-bottom: 1px solid #eee;
            padding: 10px 14px;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.05);
          }

          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            color: #111;
            text-decoration: none;
          }

          .icon {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            border-radius: 13px;
            background: linear-gradient(135deg, #ff7a00, #ff006e);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            font-size: 23px;
          }

          .brandText {
            min-width: 0;
          }

          .brand strong {
            display: block;
            font-size: 24px;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -1px;
          }

          .brand small {
            display: block;
            margin-top: 3px;
            font-size: 11px;
            color: #666;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 170px;
          }

          .actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .whatsapp {
            background: #25d366;
            color: white;
            text-decoration: none;
            padding: 10px 13px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 900;
            white-space: nowrap;
          }

          .menuBtn {
            width: 42px;
            height: 42px;
            border: none;
            border-radius: 14px;
            background: #111;
            color: white;
            font-size: 22px;
            font-weight: 900;
            cursor: pointer;
          }

          .menu {
            display: none;
            margin-top: 12px;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .menu.open {
            display: grid;
          }

          .menu a {
            text-decoration: none;
            color: #111;
            background: #f5f5f5;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 850;
            text-align: center;
          }

          @media (min-width: 900px) {
            .header {
              padding: 14px 32px;
            }

            .top {
              max-width: 1180px;
              margin: 0 auto;
            }

            .icon {
              width: 44px;
              height: 44px;
              flex-basis: 44px;
            }

            .brand strong {
              font-size: 30px;
            }

            .brand small {
              font-size: 13px;
              max-width: none;
            }

            .menuBtn {
              display: none;
            }

            .menu,
            .menu.open {
              max-width: 1180px;
              margin: 14px auto 0;
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              gap: 10px;
            }

            .menu a {
              width: auto;
              padding: 10px 16px;
              border-radius: 999px;
            }

            .whatsapp {
              padding: 12px 22px;
              font-size: 16px;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
