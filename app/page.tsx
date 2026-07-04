"use client";

import React from "react";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroOverlay" />

        <div className="heroContent">
          <div className="badge">🇫🇷 Marque toulousaine</div>

          <h1>La liberté de rouler, sans permis.</h1>

          <p className="price">Dès 3 990 €</p>

          <p className="subtitle">
            Une voiture électrique neuve, économique et bien équipée.
          </p>

          <div className="heroIcons">
            <div>⚡ 100% électrique</div>
            <div>💶 Économique</div>
            <div>🚗 Sans permis</div>
            <div>🛠️ SAV</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>3 versions. 1 même voiture.</h2>
        <p className="sectionText">
          Choisissez la version adaptée à votre besoin et à votre budget.
        </p>

        <div className="versions">
          <div className="card">
            <span className="tag green">ESSENTIEL</span>
            <h3>Version Essentiel</h3>
            <p className="cardPrice">3 990 € TTC</p>
            <p>La version simple et accessible.</p>
            <ul>
              <li>✔️ Voiture neuve</li>
              <li>✔️ 100% électrique</li>
              <li>✔️ Grand coffre</li>
              <li>✔️ Batterie incluse</li>
            </ul>
          </div>

          <div className="card dark">
            <span className="tag orange">LA PLUS CHOISIE</span>
            <h3>Version Confort</h3>
            <p className="cardPrice">4 990 € TTC</p>
            <p>La version avec le pack équipement complet.</p>
            <ul>
              <li>✔️ Alarme antivol</li>
              <li>✔️ Caméra de recul</li>
              <li>✔️ Chauffage</li>
              <li>✔️ Ventilation</li>
              <li>✔️ Bluetooth / USB</li>
              <li>✔️ Aide au démarrage en côte</li>
            </ul>
          </div>

          <div className="card">
            <span className="tag purple">CONFORT PLUS+</span>
            <h3>Version Confort Plus+</h3>
            <p className="cardPrice">Sur demande</p>
            <p>Plus d’autonomie et charge rapide.</p>
            <ul>
              <li>✔️ Pack Confort inclus</li>
              <li>✔️ Batterie lithium</li>
              <li>✔️ Charge rapide</li>
              <li>✔️ Usage intensif</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="emotion">
        <h2>Une petite voiture qui change le quotidien</h2>
        <p>
          Aller au travail, faire vos courses ou retrouver votre autonomie :
          Neodrive rend vos déplacements simples, économiques et agréables.
        </p>
      </section>

      <section className="presentation">
        <div>
          <h2>NEODRIVE, 6 ans d’expérience</h2>
          <p>
            Après 6 années dans la voiture sans permis, nous avons pris le pari
            de vous offrir une voiture neuve, bien équipée et fiable à moins de
            5 000 €.
          </p>
          <p>
            Neodrive est une marque toulousaine, proche de ses clients, avec un
            vrai service après-vente.
          </p>

          <div className="stats">
            <div>🏅<strong>6 ans</strong><span>d’expérience</span></div>
            <div>📍<strong>Marque</strong><span>toulousaine</span></div>
            <div>🛡️<strong>Neuf</strong><span>et garanti</span></div>
            <div>🤝<strong>SAV</strong><span>proche client</span></div>
          </div>
        </div>
      </section>

      <section className="darkSection">
        <h2>Pourquoi choisir Neodrive ?</h2>

        <div className="advantages">
          <div>🔒<h3>Achat sécurisé</h3><p>Inspection avant paiement.</p></div>
          <div>🎥<h3>Vidéo réelle</h3><p>Photos et vidéos avant réservation.</p></div>
          <div>🚚<h3>Livraison France</h3><p>À domicile ou point relais.</p></div>
          <div>🧾<h3>Documents fournis</h3><p>Facture et carte grise.</p></div>
          <div>🛠️<h3>SAV & pièces</h3><p>Assistance rapide.</p></div>
        </div>
      </section>

      <section className="contact">
        <h2>Prêt à découvrir NEODRIVE ?</h2>
        <p>Contactez-nous pour recevoir photos, vidéos et disponibilités.</p>

        <div className="buttons">
          <a href="/reservation">📅 Réserver sans paiement</a>
          <a href="https://wa.me/33628261446" target="_blank">
            💬 WhatsApp
          </a>
        </div>

        <strong>📞 06 28 26 14 46</strong>
      </section>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        .page {
          width: 100%;
          overflow-x: hidden;
          font-family: Arial, sans-serif;
          color: #111;
          background: #fff;
        }

        .hero {
          position: relative;
          min-height: 560px;
          width: 100%;
          background-image: url("/hero.png");
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: flex-end;
          padding: 32px 18px;
          color: white;
        }

        .heroOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.78)
          );
        }

        .heroContent {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 520px;
        }

        .badge {
          display: inline-block;
          background: white;
          color: #111;
          padding: 9px 15px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 15px;
          margin-bottom: 18px;
        }

        h1 {
          font-size: 45px;
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .price {
          color: #ff8a00;
          font-size: 43px;
          font-weight: 950;
          margin: 18px 0;
          line-height: 1;
        }

        .subtitle {
          font-size: 18px;
          line-height: 1.45;
          margin: 0;
          max-width: 320px;
        }

        .heroIcons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 24px;
          width: 100%;
        }

        .heroIcons div {
          background: rgba(255, 255, 255, 0.17);
          backdrop-filter: blur(8px);
          padding: 14px 10px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 900;
          text-align: center;
        }

        .section,
        .presentation,
        .darkSection {
          width: 100%;
          padding: 48px 18px;
        }

        .section h2,
        .presentation h2,
        .darkSection h2 {
          font-size: 34px;
          line-height: 1.05;
          text-align: center;
          margin: 0;
          font-weight: 950;
          letter-spacing: -1px;
        }

        .sectionText {
          text-align: center;
          color: #555;
          font-size: 17px;
          line-height: 1.5;
          margin: 16px auto 30px;
          max-width: 420px;
        }

        .versions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 22px;
          width: 100%;
        }

        .card {
          width: 100%;
          border-radius: 24px;
          padding: 24px;
          background: white;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.11);
          border: 1px solid #eee;
        }

        .card.dark {
          background: linear-gradient(180deg, #090909, #242424);
          color: white;
        }

        .tag {
          display: inline-block;
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 900;
        }

        .green {
          color: #16a34a;
          background: #dcfce7;
        }

        .orange {
          color: white;
          background: #f97316;
        }

        .purple {
          color: #7c3aed;
          background: #ede9fe;
        }

        .card h3 {
          font-size: 25px;
          margin: 20px 0 8px;
          line-height: 1.15;
        }

        .cardPrice {
          font-size: 32px;
          font-weight: 950;
          margin: 8px 0;
        }

        .card p {
          font-size: 17px;
          line-height: 1.5;
          color: inherit;
        }

        ul {
          padding: 0;
          margin: 18px 0 0;
          list-style: none;
        }

        li {
          font-size: 18px;
          line-height: 1.55;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .emotion {
          width: calc(100% - 36px);
          margin: 0 18px 28px;
          border-radius: 24px;
          padding: 32px 24px;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
        }

        .emotion h2 {
          font-size: 34px;
          line-height: 1.08;
          margin: 0 0 14px;
          letter-spacing: -1px;
        }

        .emotion p {
          font-size: 18px;
          line-height: 1.55;
          margin: 0;
        }

        .presentation p {
          font-size: 18px;
          line-height: 1.65;
          color: #333;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-top: 28px;
        }

        .stats div {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
          font-size: 15px;
        }

        .stats strong {
          font-size: 18px;
        }

        .darkSection {
          background: #050505;
          color: white;
        }

        .advantages {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-top: 32px;
        }

        .advantages div {
          background: linear-gradient(180deg, #242424, #141414);
          border: 1px solid #333;
          border-radius: 22px;
          padding: 24px;
          text-align: center;
        }

        .advantages h3 {
          margin: 12px 0 6px;
          font-size: 21px;
        }

        .advantages p {
          color: #ddd;
          margin: 0;
          font-size: 16px;
          line-height: 1.45;
        }

        .contact {
          width: calc(100% - 36px);
          margin: 28px 18px;
          border-radius: 24px;
          padding: 34px 24px;
          background: linear-gradient(135deg, #080808, #1f2937);
          color: white;
          text-align: center;
        }

        .contact h2 {
          font-size: 32px;
          line-height: 1.1;
          margin: 0;
        }

        .contact p {
          color: #ddd;
          font-size: 17px;
          line-height: 1.5;
        }

        .buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin: 24px 0;
        }

        .buttons a {
          display: block;
          width: 100%;
          text-decoration: none;
          color: white;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          padding: 16px 18px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 16px;
        }

        .buttons a:nth-child(2) {
          background: #25d366;
        }

        @media (min-width: 768px) {
          .hero {
            min-height: 720px;
            padding: 0 10%;
            align-items: center;
          }

          .heroOverlay {
            background: linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.65),
              rgba(0, 0, 0, 0.15)
            );
          }

          h1 {
            font-size: 72px;
          }

          .price {
            font-size: 60px;
          }

          .subtitle {
            font-size: 22px;
            max-width: 560px;
          }

          .heroIcons {
            grid-template-columns: repeat(4, 1fr);
          }

          .section,
          .presentation,
          .darkSection {
            padding: 75px 10%;
          }

          .section h2,
          .presentation h2,
          .darkSection h2 {
            font-size: 44px;
          }

          .versions {
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
          }

          .emotion,
          .contact {
            width: auto;
            margin-left: 10%;
            margin-right: 10%;
          }

          .stats {
            grid-template-columns: repeat(4, 1fr);
          }

          .advantages {
            grid-template-columns: repeat(5, 1fr);
          }

          .contact {
            padding: 48px;
          }

          .buttons {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
          }

          .buttons a {
            width: auto;
            padding: 18px 28px;
          }
        }
      `}</style>
    </main>
  );
}
