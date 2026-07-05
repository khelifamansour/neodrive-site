"use client"
export const metadata = {
  title: "Citroën Ami ou NeoDrive ? Comparatif voiture sans permis électrique",
  description:
    "Comparez Citroën Ami et NeoDrive : équipements, confort, coffre, structure acier, SAV, financement et rapport qualité/prix.",
};

export default function CitroenAmiOuNeoDrivePage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">Comparatif</span>
        <h1>Citroën Ami ou NeoDrive : quelle voiture sans permis choisir ?</h1>
        <p>
          Vous hésitez entre une Citroën Ami, une Fiat Topolino ou une NeoDrive ?
          Voici les différences importantes à regarder avant d’acheter.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta">
          Recevoir les photos NeoDrive
        </a>
      </section>

      <section className="section">
        <h2>NeoDrive : une alternative plus équipée</h2>
        <p>
          La Citroën Ami est connue, mais elle reste très simple. NeoDrive a été
          pensée pour offrir une voiture sans permis électrique neuve, accessible,
          plus pratique au quotidien et mieux équipée.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Plus de confort</h3>
            <p>
              Chauffage, ventilation, Bluetooth, USB et caméra de recul selon la
              version choisie.
            </p>
          </div>

          <div className="card">
            <h3>Plus pratique</h3>
            <p>
              Grand coffre, vraie sensation de petite voiture et usage quotidien
              plus confortable.
            </p>
          </div>

          <div className="card">
            <h3>Structure acier</h3>
            <p>
              NeoDrive met en avant une conception robuste avec une structure en
              acier.
            </p>
          </div>
        </div>
      </section>

      <section className="dark">
        <h2>Les points à comparer avant d’acheter</h2>

        <div className="compare">
          <div>
            <h3>Citroën Ami / Fiat Topolino</h3>
            <ul>
              <li>Véhicules très connus</li>
              <li>Design urbain</li>
              <li>Équipement souvent minimaliste</li>
              <li>Coffre limité</li>
              <li>Confort simple</li>
            </ul>
          </div>

          <div className="highlight">
            <h3>NeoDrive</h3>
            <ul>
              <li>Voiture sans permis électrique neuve</li>
              <li>Prix accessible</li>
              <li>Caméra de recul disponible</li>
              <li>Chauffage et ventilation</li>
              <li>Bluetooth / USB</li>
              <li>Grand coffre</li>
              <li>Alarme antivol</li>
              <li>SAV et pièces disponibles</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section soft">
        <h2>Le vrai sujet : le rapport équipement / prix</h2>
        <p>
          Quand on achète une voiture sans permis électrique, il ne faut pas
          regarder uniquement le nom de la marque. Il faut regarder ce que le
          véhicule propose réellement : confort, coffre, équipements, SAV,
          pièces détachées et coût d’utilisation.
        </p>

        <p>
          NeoDrive se positionne comme une solution simple : une voiture sans
          permis électrique neuve, bien équipée, facile à utiliser et accessible.
        </p>
      </section>

      <section className="section">
        <h2>Pourquoi certains clients choisissent NeoDrive ?</h2>

        <div className="grid">
          <div className="card">
            <h3>Pour les équipements</h3>
            <p>
              Caméra de recul, chauffage, ventilation, Bluetooth, USB et alarme
              antivol rendent l’usage quotidien plus agréable.
            </p>
          </div>

          <div className="card">
            <h3>Pour le budget</h3>
            <p>
              Prix accessible, financement possible et coût d’utilisation réduit
              grâce à l’électrique.
            </p>
          </div>

          <div className="card">
            <h3>Pour l’accompagnement</h3>
            <p>
              NeoDrive accompagne ses clients avant et après l’achat, avec SAV et
              pièces disponibles.
            </p>
          </div>
        </div>
      </section>

      <section className="faq">
        <h2>Questions fréquentes</h2>

        <div className="faqItem">
          <h3>NeoDrive est-elle une alternative à la Citroën Ami ?</h3>
          <p>
            Oui. NeoDrive vise les clients qui recherchent une voiture sans permis
            électrique neuve, accessible, pratique et mieux équipée.
          </p>
        </div>

        <div className="faqItem">
          <h3>NeoDrive est-elle comparable à la Fiat Topolino ?</h3>
          <p>
            Oui, car les deux véhicules répondent au même besoin de mobilité
            urbaine sans permis. NeoDrive se distingue par ses équipements et son
            positionnement prix.
          </p>
        </div>

        <div className="faqItem">
          <h3>Pourquoi ne pas acheter une voiture sans permis d’occasion ?</h3>
          <p>
            Une occasion peut cacher des frais : batterie usée, réparations,
            absence de garantie ou pièces difficiles à trouver. Une voiture neuve
            permet de partir sur une base plus saine.
          </p>
        </div>
      </section>

      <section className="ctaSection">
        <h2>Vous hésitez entre Ami, Topolino et NeoDrive ?</h2>
        <p>
          Contactez-nous sur WhatsApp. Nous pouvons vous envoyer les photos,
          vidéos, prix, disponibilités et solutions de financement.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta big">
          Comparer avec NeoDrive
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
        .faq {
          padding: 75px 10%;
        }

        h2 {
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1.08;
          margin: 0 0 24px;
          letter-spacing: -1.5px;
        }

        .section > p,
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

        ul {
          margin: 0;
          padding-left: 20px;
        }

        li {
          font-size: 18px;
          line-height: 1.6;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .soft {
          background: #fff7ed;
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
          .faq {
            padding: 55px 24px;
          }

          .grid,
          .compare {
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
