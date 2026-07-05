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
            <div>🛠️ SAV France</div>
          </div>
        </div>
      </section>

      <section id="versions" className="section">
        <div className="sectionHeader">
          <span className="miniBadge">Nos modèles</span>
          <h2>3 versions. 1 même voiture.</h2>
          <p>
            Choisissez la version adaptée à votre budget, votre usage et votre
            délai de livraison.
          </p>
        </div>

        <div className="versions">
          <article className="card simple">
            <span className="tag green">ESSENTIEL</span>
            <h3>Version Essentiel</h3>
            <p className="cardPrice">3 990 € TTC</p>
            <p className="cardText">
              La solution la plus accessible pour rouler en voiture électrique
              sans permis.
            </p>

            <div className="quickInfo">
              <div>
                <strong>⏳ Délai</strong>
                <span>6 à 8 mois environ</span>
              </div>
              <div>
                <strong>🛡️ Garantie</strong>
                <span>Structure et châssis 2 ans</span>
                <span>Pièces 3 mois</span>
              </div>
            </div>

            <ul>
              <li>Voiture neuve</li>
              <li>100% électrique</li>
              <li>Grand coffre</li>
              <li>Batterie incluse</li>
            </ul>

            <a className="chooseBtn lightBtn" href="https://wa.me/33628261446" target="_blank">
              Demander cette version
            </a>
          </article>

          <article className="card featured">
            <span className="tag orange">LA PLUS CHOISIE</span>
            <h3>Version Confort</h3>
            <p className="cardPrice">4 990 € TTC</p>
            <p className="cardText">
              Le meilleur équilibre : livraison rapide, équipements utiles et
              accompagnement renforcé.
            </p>

            <div className="quickInfo darkInfo">
              <div>
                <strong>🚚 Livraison express</strong>
                <span>2 à 8 semaines environ</span>
              </div>
              <div>
                <strong>🛡️ Garantie & assistance</strong>
                <span>Structure et châssis 2 ans</span>
                <span>Pièces 6 mois</span>
                <span>Assistance technique gratuite 2 ans</span>
                <span>Remises pièces détachées jusqu’à 2 ans</span>
                <span>Réparation à domicile possible</span>
              </div>
            </div>

            <ul>
              <li>Alarme antivol</li>
              <li>Caméra de recul</li>
              <li>Chauffage & ventilation</li>
              <li>Bluetooth / USB</li>
              <li>Aide démarrage & stationnement en côte</li>
              <li>Alarme clé laissée sur contact</li>
            </ul>

            <a className="chooseBtn orangeBtn" href="https://wa.me/33628261446" target="_blank">
              Demander la Confort
            </a>
          </article>

          <article className="card premium">
            <span className="tag purple">CONFORT PLUS+</span>
            <h3>Version Confort Plus+</h3>
            <p className="cardPrice">5 990 € TTC</p>
            <p className="cardText">
              La version la plus complète avec plus d’autonomie et charge rapide
              .
            </p>

            <div className="quickInfo">
              <div>
                <strong>🚚 Livraison</strong>
                <span>Selon disponibilité</span>
              </div>
              <div>
                <span>Structure et châssis 2 ans</span>
                <span>Pièces 2 ans</span>
                <span>Assistance technique gratuite 2 ans</span>
              </div>
            </div>

            <ul>
              <li>Pack Confort inclus</li>
              <li>Charge rapide</li>
              <li>Plus d’autonomie</li>
            
             
            </ul>

            <a className="chooseBtn lightBtn" href="https://wa.me/33628261446" target="_blank">
              Demander la Plus+
            </a>
          </article>
        </div>
      </section>

      <section className="emotion">
        <h2>Une petite voiture qui change le quotidien</h2>
        <p>
          Aller au travail, faire vos courses ou retrouver votre autonomie :
          NeoDrive rend vos déplacements simples, économiques et agréables.
        </p>
      </section>

      <section id="presentation" className="presentation">
        <div className="presentationCard">
          <span className="miniBadge">Notre engagement</span>
          <h2>NeoDrive, 6 ans d’expérience</h2>

          <p>
            Après 6 années dans le domaine de la voiture sans permis, nous avons
            pris le pari de vous offrir une voiture neuve, bien équipée et fiable
            à moins de 5 000 €.
          </p>

          <p>
            NeoDrive est une marque toulousaine, proche de ses clients, avec un
            accompagnement sérieux avant et après l’achat.
          </p>

          <div className="stats">
            <div><span>🏅</span><strong>6 ans</strong><small>d’expérience</small></div>
            <div><span>📍</span><strong>Toulouse</strong><small>marque locale</small></div>
            <div><span>🛡️</span><strong>Neuf</strong><small>et garanti</small></div>
            <div><span>🤝</span><strong>SAV</strong><small>proche client</small></div>
          </div>
        </div>
      </section>

      <section id="avantages" className="darkSection">
        <div className="sectionHeader white">
          <span className="miniBadge darkMini">Pourquoi nous choisir</span>
          <h2>Une voiture simple, pratique et bien accompagnée.</h2>
        </div>

        <div className="advantages">
          <div>
            <span>🎥</span>
            <h3>Photos & vidéos</h3>
            <p>Recevez les photos et vidéos du véhicule avant de vous déplacer.</p>
          </div>

          <div>
            <span>🚚</span>
            <h3>Livraison France</h3>
            <p>Livraison possible à domicile ou en point relais.</p>
          </div>

          <div>
            <span>🧾</span>
            <h3>Documents fournis</h3>
            <p>Facture et documents pour l’immatriculation.</p>
          </div>

          <div>
            <span>🛠️</span>
            <h3>SAV & pièces</h3>
            <p>Assistance et pièces disponibles en France.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="contact">
        <h2>Envie d’en savoir plus ?</h2>
        <p>
          Contactez-nous sur WhatsApp pour recevoir les photos, vidéos et
          disponibilités.
        </p>

        <div className="buttons">
          <a className="whatsappBig" href="https://wa.me/33628261446" target="_blank">
            💬 WhatsApp
          </a>
        </div>
      </section>

   <footer className="footer">
  <strong>NeoDrive</strong>

  <a href="/guide-voiture-sans-permis">
    Guide voiture sans permis
  </a>

  <span>Marque toulousaine – 31 rue Jean Nougaro, 31600 Muret</span>
  <span>SIREN 908 645 393</span>
</footer>

    

      

      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          background: #fff;
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
          background: white;
        }

        .hero {
          position: relative;
          min-height: 680px;
          background-image: url("/hero.png");
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          padding: 70px 10%;
          color: white;
        }

        .heroOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.2));
        }

        .heroContent {
          position: relative;
          z-index: 2;
          max-width: 680px;
        }

        .badge, .miniBadge {
          display: inline-block;
          background: white;
          color: #111;
          padding: 12px 20px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 15px;
          margin-bottom: 20px;
        }

        .miniBadge {
          background: #fff3e8;
          color: #f97316;
        }

        .darkMini {
          background: rgba(255,255,255,0.12);
          color: white;
        }

        h1 {
          font-size: clamp(46px, 7vw, 82px);
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          letter-spacing: -3px;
        }

        .price {
          color: #ff8a00;
          font-size: clamp(44px, 6vw, 66px);
          font-weight: 950;
          margin: 24px 0 18px;
        }

        .subtitle {
          font-size: 23px;
          line-height: 1.45;
          max-width: 560px;
          color: #f4f4f4;
        }

        .heroIcons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 32px;
        }

        .heroIcons div {
          background: rgba(255,255,255,0.16);
          backdrop-filter: blur(8px);
          padding: 17px 12px;
          border-radius: 18px;
          text-align: center;
          font-weight: 950;
          font-size: 15px;
        }

        .section, .presentation, .darkSection {
          padding: 75px 10%;
        }

        .sectionHeader {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 44px;
        }

        .sectionHeader h2,
        .presentation h2,
        .darkSection h2 {
          font-size: clamp(36px, 5vw, 52px);
          line-height: 1.05;
          margin: 0;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .sectionHeader p {
          color: #555;
          font-size: 19px;
          line-height: 1.5;
          margin: 18px auto 0;
        }

        .white h2 {
          color: white;
        }

        .versions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          align-items: stretch;
        }

        .card {
          border-radius: 34px;
          padding: 34px;
          background: white;
          box-shadow: 0 20px 55px rgba(0,0,0,0.10);
          border: 1px solid #eee;
          display: flex;
          flex-direction: column;
        }

        .simple {
          background: linear-gradient(180deg, #ffffff, #fbfffc);
        }

        .featured {
          background: linear-gradient(180deg, #060606, #222);
          color: white;
          transform: translateY(-18px);
          box-shadow: 0 30px 75px rgba(0,0,0,0.30);
        }

        .premium {
          background: linear-gradient(180deg, #ffffff, #fbf7ff);
          border: 1px solid #eadcff;
        }

        .tag {
          width: fit-content;
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 950;
          margin-bottom: 22px;
        }

        .green { color: #16a34a; background: #dcfce7; }
        .orange { color: white; background: #f97316; }
        .purple { color: #7c3aed; background: #ede9fe; }

        .card h3 {
          font-size: 29px;
          margin: 0 0 10px;
          line-height: 1.12;
        }

        .cardPrice {
          font-size: 38px;
          font-weight: 950;
          margin: 0 0 20px;
        }

        .cardText {
          font-size: 18px;
          line-height: 1.55;
          margin: 0 0 22px;
          color: inherit;
        }

        .quickInfo {
          display: grid;
          gap: 12px;
          margin-bottom: 24px;
        }

        .quickInfo div {
          background: #f4f4f5;
          border-radius: 18px;
          padding: 15px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quickInfo strong {
          font-size: 16px;
          font-weight: 950;
        }

        .quickInfo span {
          color: #444;
          font-weight: 800;
          line-height: 1.35;
        }

        .darkInfo div {
          background: rgba(255,255,255,0.12);
        }

        .darkInfo span {
          color: #f4f4f4;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
        }

        li {
          position: relative;
          padding-left: 32px;
          font-size: 18px;
          line-height: 1.5;
          font-weight: 850;
          margin-bottom: 12px;
        }

        li::before {
          content: "✓";
          position: absolute;
          left: 0;
          top: 0;
          color: #f97316;
          font-weight: 950;
        }

        .chooseBtn {
          margin-top: auto;
          display: block;
          text-align: center;
          text-decoration: none;
          padding: 17px 20px;
          border-radius: 17px;
          font-weight: 950;
          font-size: 17px;
        }

        .lightBtn {
          background: #111;
          color: white;
        }

        .orangeBtn {
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
        }

        .emotion {
          margin: 0 10%;
          border-radius: 34px;
          padding: 52px;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
        }

        .emotion h2 {
          font-size: clamp(36px, 5vw, 54px);
          line-height: 1.05;
          margin: 0 0 18px;
          letter-spacing: -2px;
        }

        .emotion p {
          font-size: 21px;
          line-height: 1.6;
          max-width: 850px;
          margin: 0;
        }

        .presentation {
          text-align: center;
        }

        .presentationCard {
          max-width: 980px;
          margin: 0 auto;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 38px;
          padding: 56px;
        }

        .presentation p {
          font-size: 20px;
          line-height: 1.75;
          color: #333;
          max-width: 850px;
          margin: 24px auto 0;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-top: 42px;
        }

        .stats div {
          background: white;
          border: 1px solid #eee;
          border-radius: 24px;
          padding: 22px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .stats span { font-size: 32px; }
        .stats strong { font-size: 20px; }
        .stats small { color: #555; font-size: 15px; }

        .darkSection {
          background: #050505;
          color: white;
        }

        .advantages {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-top: 42px;
        }

        .advantages div {
          background: linear-gradient(180deg, #242424, #141414);
          border: 1px solid #333;
          border-radius: 26px;
          padding: 28px 20px;
          text-align: center;
        }

        .advantages span { font-size: 36px; }
        .advantages h3 { margin: 14px 0 8px; font-size: 22px; }
        .advantages p { color: #ddd; margin: 0; font-size: 16px; line-height: 1.45; }

        .contact {
          margin: 48px 10%;
          border-radius: 34px;
          padding: 56px;
          background: radial-gradient(circle at top left, #273449, #080808 60%);
          color: white;
          text-align: center;
        }

        .contact h2 {
          font-size: clamp(36px, 5vw, 54px);
          line-height: 1.05;
          margin: 0;
          letter-spacing: -2px;
        }

        .contact p {
          color: #ddd;
          font-size: 20px;
          line-height: 1.5;
          max-width: 650px;
          margin: 20px auto 34px;
        }

        .buttons {
          display: flex;
          justify-content: center;
        }

        .buttons a {
          text-decoration: none;
          color: white;
          padding: 20px 46px;
          border-radius: 17px;
          font-weight: 950;
          font-size: 20px;
        }

        .whatsappBig { background: #25d366; }

        .footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 24px 10%;
          font-size: 14px;
          color: #555;
          flex-wrap: wrap;
          border-top: 1px solid #eee;
        }

        .footer a {
  color: #111;
  font-weight: 800;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

        @media (max-width: 900px) {
          .hero {
            min-height: 650px;
            padding: 48px 24px;
            align-items: flex-end;
          }

          .heroOverlay {
            background: linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.84));
          }

          h1 { font-size: 48px; letter-spacing: -2px; }
          .price { font-size: 45px; }
          .subtitle { font-size: 18px; max-width: 360px; }

          .heroIcons {
            grid-template-columns: repeat(2, 1fr);
          }

          .section, .presentation, .darkSection {
            padding: 55px 24px;
          }

          .versions, .advantages {
            grid-template-columns: 1fr;
          }

          .featured {
            transform: none;
          }

          .card {
            padding: 28px;
            border-radius: 30px;
          }

          .emotion, .contact {
            margin-left: 24px;
            margin-right: 24px;
            padding: 36px 26px;
            border-radius: 28px;
          }

          .presentationCard {
            padding: 38px 24px;
            border-radius: 30px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }

          .buttons a {
            width: 100%;
            text-align: center;
          }

          .footer {
            padding: 24px;
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .hero {
            min-height: 620px;
            padding: 38px 18px;
          }

          h1 {
            font-size: 41px;
            line-height: 1;
            letter-spacing: -1.6px;
          }

          .price { font-size: 41px; }

          .section, .presentation, .darkSection {
            padding: 48px 18px;
          }

          .sectionHeader h2,
          .presentation h2,
          .darkSection h2 {
            font-size: 32px;
            line-height: 1.08;
          }

          .sectionHeader p {
            font-size: 17px;
          }

          .card h3 { font-size: 25px; }
          .cardPrice { font-size: 32px; }
          .cardText { font-size: 17px; }
          li { font-size: 17px; }

          .emotion, .contact {
            margin-left: 18px;
            margin-right: 18px;
            padding: 32px 24px;
          }

          .emotion h2, .contact h2 {
            font-size: 32px;
          }
        }
      `}</style>
    </main>
  );
}
