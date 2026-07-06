"use client";

export default function VoitureSansPermisOccasionPage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">Guide d’achat</span>
        <h1>Voiture sans permis d’occasion ou neuve : que choisir ?</h1>
        <p>
          Une voiture sans permis d’occasion peut sembler moins chère au départ.
          Mais sur la durée, une voiture neuve électrique peut parfois être un
          choix plus sûr et plus économique.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta">
          Comparer avec NeoDrive
        </a>
      </section>

      <section className="section">
        <h2>Pourquoi l’occasion attire beaucoup d’acheteurs ?</h2>
        <p>
          Beaucoup de personnes cherchent une voiture sans permis d’occasion
          pour réduire le budget d’achat. C’est logique : le prix affiché est
          souvent plus bas qu’un véhicule neuf.
        </p>
        <p>
          Mais le prix d’achat ne raconte pas toute l’histoire. Il faut aussi
          regarder l’état de la batterie, les réparations possibles, la garantie,
          la disponibilité des pièces et le coût d’entretien.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Batterie usée</h3>
            <p>
              Sur une voiture électrique d’occasion, la batterie peut avoir
              perdu de l’autonomie avec le temps.
            </p>
          </div>

          <div className="card">
            <h3>Réparations cachées</h3>
            <p>
              Certains véhicules d’occasion peuvent nécessiter des réparations
              peu visibles au moment de l’achat.
            </p>
          </div>

          <div className="card">
            <h3>Garantie limitée</h3>
            <p>
              Une occasion ancienne peut avoir une garantie courte, voire aucune
              garantie réelle selon le vendeur.
            </p>
          </div>
        </div>
      </section>

      <section className="dark">
        <h2>Le vrai coût se calcule sur la durée</h2>
        <p>
          Une voiture moins chère à l’achat peut devenir plus coûteuse si elle
          demande des réparations, une batterie à remplacer ou des pièces
          difficiles à trouver.
        </p>

        <ul>
          <li>Coût d’achat</li>
          <li>État de la batterie</li>
          <li>Garantie</li>
          <li>Entretien</li>
          <li>Disponibilité des pièces</li>
          <li>Valeur de revente</li>
          <li>Assurance</li>
          <li>Coût de recharge</li>
        </ul>
      </section>

      <section className="section soft">
        <h2>Pourquoi choisir une voiture sans permis électrique neuve ?</h2>
        <p>
          Avec une voiture sans permis électrique neuve, vous partez sur une
          base saine : véhicule récent, batterie neuve, équipements modernes et
          accompagnement après l’achat.
        </p>
        <p>
          Chez NeoDrive, notre objectif est de proposer une voiture sans permis
          neuve à un prix accessible, afin d’offrir une alternative sérieuse à
          l’occasion.
        </p>
      </section>

      <section className="section">
        <h2>NeoDrive : une alternative neuve à l’occasion</h2>

        <div className="grid">
          <div className="card">
            <h3>Voiture neuve</h3>
            <p>
              Vous bénéficiez d’un véhicule neuf, sans historique inconnu, sans
              usure cachée et avec un accompagnement clair.
            </p>
          </div>

          <div className="card">
            <h3>Prix accessible</h3>
            <p>
              NeoDrive propose une voiture sans permis électrique neuve dès
              3 990 € TTC selon la version.
            </p>
          </div>

          <div className="card">
            <h3>SAV et pièces</h3>
            <p>
              Nous mettons l’accent sur les pièces disponibles, la réparation
              simple et l’assistance après l’achat.
            </p>
          </div>
        </div>
      </section>

      <section className="compareSection">
        <h2>Occasion ou NeoDrive neuve ?</h2>

        <div className="compare">
          <div>
            <h3>Voiture sans permis d’occasion</h3>
            <ul>
              <li>Prix affiché parfois plus bas</li>
              <li>Historique du véhicule à vérifier</li>
              <li>Batterie potentiellement fatiguée</li>
              <li>Réparations possibles</li>
              <li>Garantie parfois limitée</li>
              <li>Pièces parfois difficiles à trouver</li>
            </ul>
          </div>

          <div className="highlight">
            <h3>NeoDrive neuve</h3>
            <ul>
              <li>Véhicule neuf</li>
              <li>Prix clair</li>
              <li>Structure en acier</li>
              <li>Équipements modernes</li>
              <li>SAV et pièces disponibles</li>
              <li>Financement possible</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="faq">
        <h2>Questions fréquentes</h2>

        <div className="faqItem">
          <h3>Une voiture sans permis d’occasion est-elle toujours moins chère ?</h3>
          <p>
            Pas forcément. Elle peut coûter moins cher à l’achat, mais les frais
            de réparation, de batterie ou d’entretien peuvent augmenter le coût
            total.
          </p>
        </div>

        <div className="faqItem">
          <h3>Pourquoi acheter une voiture sans permis neuve ?</h3>
          <p>
            Une voiture neuve permet de partir sur une base claire, avec une
            batterie récente, des équipements modernes et un meilleur suivi.
          </p>
        </div>

        <div className="faqItem">
          <h3>NeoDrive est-elle une alternative à l’occasion ?</h3>
          <p>
            Oui. NeoDrive vise les personnes qui cherchent un prix accessible,
            mais qui veulent éviter les risques d’un véhicule ancien.
          </p>
        </div>
      </section>

      <section className="ctaSection">
        <h2>Vous cherchez une voiture sans permis d’occasion ?</h2>
        <p>
          Avant d’acheter, comparez avec une NeoDrive neuve. Recevez les photos,
          vidéos, prix, disponibilités et solutions de financement.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta big">
          Recevoir les informations
        </a>
      </section>

      <style jsx>{`
        .page {
          font-family: Arial, sans-serif;
          color: #111;
          background: white;
        }

        .hero {
          padding: 90px 10%;
          background: linear-gradient(135deg, #050505, #242424);
          color: white;
        }

        .badge {
          display: inline-block;
          background: #ff7a00;
          color: white;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 900;
          margin-bottom: 22px;
        }

        h1 {
          max-width: 950px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 1;
          margin: 0 0 24px;
          letter-spacing: -2px;
        }

        .hero p {
          max-width: 760px;
          font-size: 22px;
          line-height: 1.55;
          color: #e5e5e5;
          margin-bottom: 34px;
        }

        .cta {
          display: inline-block;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
          text-decoration: none;
          padding: 18px 28px;
          border-radius: 16px;
          font-weight: 950;
          font-size: 18px;
        }

        .section,
        .faq,
        .compareSection {
          padding: 75px 10%;
        }

        h2 {
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1.08;
          margin: 0 0 24px;
          letter-spacing: -1.5px;
        }

        .section > p,
        .dark > p,
        .ctaSection > p {
          max-width: 900px;
          font-size: 20px;
          line-height: 1.7;
          color: #444;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 40px;
        }

        .card {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 28px;
          padding: 30px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.08);
        }

        .card h3 {
          font-size: 25px;
          margin: 0 0 14px;
        }

        .card p {
          font-size: 17px;
          line-height: 1.6;
          color: #444;
          margin: 0;
        }

        .dark {
          padding: 75px 10%;
          background: #050505;
          color: white;
        }

        .dark p {
          color: #ddd;
        }

        .dark ul {
          margin: 35px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .dark li {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 20px;
          padding: 20px;
          font-size: 18px;
          font-weight: 800;
        }

        .soft {
          background: #fff7ed;
        }

        .compareSection {
          background: #050505;
          color: white;
        }

        .compare {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
          margin-top: 40px;
        }

        .compare > div {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 30px;
          padding: 34px;
        }

        .compare .highlight {
          background: linear-gradient(135deg, #ff7a00, #ff006e);
        }

        .compare h3 {
          font-size: 28px;
          margin: 0 0 22px;
        }

        .compare ul {
          margin: 0;
          padding-left: 20px;
        }

        .compare li {
          font-size: 18px;
          line-height: 1.6;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .faq {
          background: #fafafa;
        }

        .faqItem {
          max-width: 900px;
          background: white;
          border: 1px solid #eee;
          border-radius: 22px;
          padding: 26px;
          margin-top: 18px;
        }

        .faqItem h3 {
          font-size: 22px;
          margin: 0 0 10px;
        }

        .faqItem p {
          font-size: 18px;
          line-height: 1.6;
          color: #444;
          margin: 0;
        }

        .ctaSection {
          margin: 40px 10% 80px;
          padding: 56px;
          border-radius: 34px;
          background: radial-gradient(circle at top left, #273449, #080808 60%);
          color: white;
          text-align: center;
        }

        .ctaSection p {
          color: #ddd;
          margin: 0 auto 34px;
        }

        .big {
          font-size: 20px;
          padding: 20px 36px;
        }

        @media (max-width: 900px) {
          .hero,
          .section,
          .dark,
          .faq,
          .compareSection {
            padding: 55px 24px;
          }

          .grid,
          .compare,
          .dark ul {
            grid-template-columns: 1fr;
          }

          .ctaSection {
            margin: 32px 24px 60px;
            padding: 38px 26px;
          }
        }
      `}</style>
    </main>
  );
}
