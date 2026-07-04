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
      <body>
        <nav className="navbar">
          <div className="brandRow">
            <a href="/" className="brand">
              <span className="brandIcon">N</span>
              <span className="brandText">
                <strong>NeoDrive</strong>
                <small>Voiture sans permis électrique</small>
              </span>
            </a>

            <a
              href="https://wa.me/33628261446"
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp"
            >
              💬 WhatsApp
            </a>
          </div>

          <div className="menu">
            <a href="/">Accueil</a>
            <a href="/produit">Véhicules</a>
            <a href="/livraison">Livraison</a>
            <a href="/carte-grise">Carte grise</a>
            <a href="/QuiSommesNous">Qui sommes-nous</a>

            <div className="service">
              <button onClick={() => setOpen(!open)}>
                Service & Assistance ▾
              </button>

              {open && (
                <div className="dropdown">
                  <a href="/sav">Service après-vente</a>
                  <a href="/pieces">Pièces détachées</a>
                  <a href="/faq">Questions fréquentes</a>
                </div>
              )}
            </div>

            <a href="/contact">Contact</a>
          </div>
        </nav>

        {children}

        <style jsx global>{`
          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: system-ui, Arial, sans-serif;
            overflow-x: hidden;
          }

          * {
            box-sizing: border-box;
          }
        `}</style>

        <style jsx>{`
          .navbar {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(18px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            padding: 14px 28px 12px;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.045);
          }

          .brandRow {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 18px;
            max-width: 1180px;
            margin: 0 auto;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #111;
          }

          .brandIcon {
            width: 44px;
            height: 44px;
            border-radius: 15px;
            background: linear-gradient(135deg, #ff7a00, #ff006e);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            font-size: 25px;
            box-shadow: 0 12px 28px rgba(255, 122, 0, 0.28);
          }

          .brandText {
            display: flex;
            flex-direction: column;
            line-height: 1.1;
          }

          .brandText strong {
            font-size: 28px;
            font-weight: 950;
            letter-spacing: -1.2px;
          }

          .brandText small {
            margin-top: 4px;
            color: #666;
            font-size: 13px;
            font-weight: 700;
          }

          .whatsapp {
            background: #25d366;
            color: white;
            text-decoration: none;
            padding: 13px 22px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 900;
            box-shadow: 0 10px 25px rgba(37, 211, 102, 0.25);
            white-space: nowrap;
          }

          .menu {
            max-width: 1180px;
            margin: 15px auto 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .menu a,
          .service button {
            border: 1px solid rgba(0, 0, 0, 0.06);
            background: #f7f7f7;
            color: #222;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 850;
            cursor: pointer;
            font-family: inherit;
            transition: 0.2s ease;
          }

          .menu a:hover,
          .service button:hover {
            background: #111;
            color: white;
            transform: translateY(-1px);
          }

          .service {
            position: relative;
          }

          .dropdown {
            position: absolute;
            top: 46px;
            left: 0;
            min-width: 230px;
            background: white;
            border: 1px solid #eeeeee;
            border-radius: 18px;
            padding: 10px;
            box-shadow: 0 18px 45px rgba(0, 0, 0, 0.12);
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .dropdown a {
            display: block;
            background: white;
            border-radius: 12px;
          }

          .dropdown a:hover {
            background: #111;
            color: white;
          }

          @media (max-width: 768px) {
            .navbar {
              padding: 12px 14px 10px;
            }

            .brandRow {
              gap: 12px;
            }

            .brandIcon {
              width: 40px;
              height: 40px;
              border-radius: 14px;
              font-size: 23px;
            }

            .brandText strong {
              font-size: 25px;
            }

            .brandText small {
              font-size: 11px;
              max-width: 170px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .whatsapp {
              padding: 11px 15px;
              border-radius: 14px;
              font-size: 14px;
            }

            .menu {
              justify-content: flex-start;
              flex-wrap: nowrap;
              overflow-x: auto;
              gap: 10px;
              padding-bottom: 5px;
              scrollbar-width: none;
            }

            .menu::-webkit-scrollbar {
              display: none;
            }

            .menu a,
            .service button {
              white-space: nowrap;
              font-size: 14px;
              padding: 10px 15px;
            }

            .dropdown {
              position: fixed;
              top: 104px;
              left: 14px;
              right: 14px;
              min-width: auto;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
