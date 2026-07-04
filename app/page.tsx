"use client";

import React from "react";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="overlay" />

        <div className="heroContent">
          <div className="badge">🇫🇷 Marque toulousaine</div>

          <h1>La liberté de rouler, sans permis.</h1>

          <p className="price">Dès 3 990 €</p>

          <p className="subtitle">
            Même voiture, 3 versions selon vos besoins. Électrique, économique
            et élégante.
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
          La même qualité, le même design, des équipements adaptés à votre quotidien.
        </p>

        <div className="versions">
          <div className="card">
            <span className="tag green">ESSENTIEL</span>
            <h3>Version Essentiel</h3>
            <p className="cardPrice">3 990 € TTC</p>
            <p>La version simple et accessible pour rouler au meilleur prix.</p>
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
            <p>Le meilleur compromis avec le pack équipement complet.</p>
            <ul>
              <li>✔️ Pack Confort inclus</li>
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
            <p>Plus d’autonomie, charge rapide et équipements premium.</p>
            <ul>
              <li>✔️ Pack Confort inclus</li>
              <li>✔️ Batterie lithium</li>
              <li>✔️ Charge rapide</li>
              <li>✔️ Plus d’autonomie</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="emotion">
        <h2>Une petite voiture qui change le quotidien</h2>
        <p>
          Aller au travail, faire vos courses, déposer les enfants ou retrouver
          votre autonomie : Neodrive rend votre quotidien plus simple, économique
          et agréable.
        </p>
      </section>

      <section className="presentation">
        <div>
          <h2>NEODRIVE, 6 ans d’expérience à vos côtés</h2>
          <p>
            Après 6 années dans le domaine de la voiture sans permis, nous avons
            pris le pari de vous offrir une voiture neuve, bien équipée et fiable
            à moins de 5 000 €.
          </p>
          <p>
            Neodrive est une marque toulousaine, proche de ses clients, qui place
            la transparence, la qualité et le service au cœur de son engagement.
          </p>

          <div className="stats">
            <div>🏅<strong>6 ans</strong><span>d’expérience</span></div>
            <div>📍<strong>Marque</strong><span>toulousaine</span></div>
            <div>🛡️<strong>Véhicules</strong><span>neufs garantis</span></div>
            <div>🤝<strong>SAV</strong><span>proche client</span></div>
          </div>
        </div>

        <img src="/voiture.jpg" alt="Voiture Neodrive" />
      </section>

      <section className="darkSection">
        <h2>Pourquoi choisir Neodrive ?</h2>

        <div className="advantages">
          <div>🔒<h3>Achat sécurisé</h3><p>Inspection avant paiement.</p></div>
          <div>🎥<h3>Vidéo réelle</h3><p>Photos et vidéos avant réservation.</p></div>
          <div>🚚<h3>Livraison France</h3><p>À domicile ou point relais.</p></div>
          <div>🧾<h3>Documents fournis</h3><p>Facture et immatriculation.</p></div>
          <div>🛠️<h3>SAV & pièces</h3><p>Assistance rapide en France.</p></div>
        </div>
      </section>

      <section className="features">
        <h2>Des caractéristiques pensées pour vous</h2>

        <div className="featuresGrid">
          <div>🔋 Jusqu’à 70 km d’autonomie</div>
          <div>🔌 Recharge prise standard</div>
          <div>🚗 Facile à garer</div>
          <div>🧳 Grand coffre pratique</div>
          <div>😊 Conduite simple</div>
        </div>
      </section>

      <section className="contact">
        <h2>Prêt à découvrir NEODRIVE ?</h2>
        <p>Contactez-nous maintenant et recevez photos, vidéos et informations.</p>

        <div className="buttons">
          <a href="/reservation">📅 Réserver sans paiement</a>
          <a href="https://wa.me/33628261446" target="_blank">💬 WhatsApp</a>
        </div>

        <strong>📞 06 28 26 14 46</strong>
      </section>

      <footer>
        <strong>NEODRIVE</strong>
        <span>Marque toulousaine – 31 rue Jean Nougaro, 31600 Muret</span>
        <span>SIREN 908 645 393</span>
      </footer>

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
          min-height: 720px;
          background-image: url("/hero.png");
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          padding: 0 10%;
          color: white;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15));
        }

        .heroContent {
          position: relative;
          z-index: 2;
          max-width: 620px;
        }

        .badge {
          display: inline-block;
          background: white;
          color: #111;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 900;
          margin-bottom: 24px;
        }

        h1 {
          font-size: clamp(42px, 8vw, 82px);
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
        }

        .price {
          color: #ff8a00;
          font-size: clamp(40px, 7vw, 64px);
          font-weight: 950;
          margin: 22px 0;
        }

        .subtitle {
          font-size: 22px;
          line-height: 1.5;
          max-width: 560px;
        }

        .heroIcons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 32px;
        }

        .heroIcons div {
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          padding: 16px 12px;
          border-radius: 18px;
          text-align: center;
          font-weight: 900;
        }

        .section,
        .features {
          padding: 70px 10%;
        }

        .section h2,
        .features h2,
        .darkSection h2 {
          text-align: center;
          font-size: clamp(32px, 5vw, 46px);
          line-height: 1.1;
          margin: 0;
          font-weight: 950;
        }

        .sectionText {
          text-align: center;
          font-size: 18px;
          color: #555;
          margin: 18px auto 40px;
          max-width: 700px;
        }

        .versions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          align-items: stretch;
        }

        .card {
          background: white;
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.10);
          border: 1px solid #eee;
        }

        .card.dark {
          background: linear-gradient(180deg, #090909, #242424);
          color: white;
          transform: scale(1.03);
        }

        .tag {
          display: inline-block;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 13px;
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
          font-size: 26px;
          margin: 22px 0 8px;
        }

        .cardPrice {
          font-size: 34px;
          font-weight: 950;
          margin: 8px 0;
        }

        .card p {
          color: inherit;
          line-height: 1.6;
        }

        ul {
          padding-left: 0;
          list-style: none;
          line-height: 1.9;
          font-weight: 800;
          margin-bottom: 0;
        }

        .emotion {
          margin: 0 10%;
          border-radius: 30px;
          padding: 48px;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
        }

        .emotion h2 {
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1.1;
          margin: 0 0 18px;
        }

        .emotion p {
          font-size: 20px;
          line-height: 1.6;
          margin: 0;
        }

        .presentation {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 42px;
          align-items: center;
          padding: 75px 10%;
        }

        .presentation h2 {
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.15;
        }

        .presentation p {
          font-size: 18px;
          line-height: 1.75;
          color: #333;
        }

        .presentation img {
          width: 100%;
          border-radius: 28px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.18);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 30px;
        }

        .stats div {
          display: flex;
          flex-direction: column;
          text-align: center;
          gap: 6px;
          font-size: 14px;
        }

        .stats strong {
          font-size: 18px;
        }

        .darkSection {
          background: #080808;
          color: white;
          padding: 70px 10%;
        }

        .advantages {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 18px;
          margin-top: 40px;
        }

        .advantages div {
          background: linear-gradient(180deg, #242424, #141414);
          border: 1px solid #333;
          border-radius: 22px;
          padding: 22px;
          text-align: center;
        }

        .featuresGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-top: 35px;
        }

        .featuresGrid div {
          text-align: center;
          font-size: 17px;
          font-weight: 800;
        }

        .contact {
          margin: 0 10% 30px;
          border-radius: 30px;
          padding: 48px;
          background: linear-gradient(135deg, #080808, #1f2937);
          color: white;
          text-align: center;
        }

        .contact h2 {
          font-size: clamp(32px, 5vw, 44px);
          margin: 0;
        }

        .contact p {
          color: #ddd;
          font-size: 18px;
        }

        .buttons {
          display: flex;
          justify-content: center;
          gap: 18px;
          flex-wrap: wrap;
          margin: 28px 0;
        }

        .buttons a {
          text-decoration: none;
          color: white;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          padding: 18px 28px;
          border-radius: 14px;
          font-weight: 900;
        }

        .buttons a:nth-child(2) {
          background: #25d366;
        }

        footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 22px 10%;
          font-size: 13px;
          color: #555;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .hero {
            min-height: 640px;
            padding: 55px 24px;
            align-items: flex-end;
            background-position: center;
          }

          .overlay {
            background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.78));
          }

          .heroContent {
            max-width: 100%;
          }

          .subtitle {
            font-size: 20px;
          }

          .heroIcons {
            grid-template-columns: repeat(2, 1fr);
          }

          .section,
          .features,
          .presentation,
          .darkSection {
            padding: 55px 24px;
          }

          .versions {
            grid-template-columns: 1fr;
          }

          .card,
          .card.dark {
            transform: none;
            padding: 28px;
          }

          .emotion,
          .contact {
            margin: 0 24px 30px;
            padding: 34px 26px;
          }

          .presentation {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .advantages,
          .featuresGrid {
            grid-template-columns: 1fr;
          }

          footer {
            padding: 22px 24px;
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .hero {
            min-height: 620px;
            padding: 40px 18px;
          }

          h1 {
            font-size: 48px;
          }

          .price {
            font-size: 42px;
          }

          .subtitle {
            font-size: 18px;
          }

          .heroIcons {
            display: flex;
            overflow-x: auto;
            gap: 12px;
            padding-bottom: 6px;
          }

          .heroIcons div {
            min-width: 135px;
            font-size: 14px;
          }

          .section,
          .features,
          .presentation,
          .darkSection {
            padding: 45px 18px;
          }

          .section h2,
          .features h2,
          .darkSection h2 {
            font-size: 34px;
          }

          .card {
            border-radius: 24px;
            padding: 24px;
          }

          .card h3 {
            font-size: 24px;
          }

          .cardPrice {
            font-size: 32px;
          }

          ul {
            font-size: 17px;
            line-height: 1.8;
          }

          .emotion,
          .contact {
            margin: 0 18px 28px;
            border-radius: 24px;
          }

          .emotion h2 {
            font-size: 34px;
          }

          .emotion p {
            font-size: 18px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .buttons {
            flex-direction: column;
          }

          .buttons a {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
    </main>
  );
}
