"use client"
export default function VoitureSansPermisElectriquePage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">Voiture sans permis électrique</span>
        <h1>Une voiture électrique neuve, sans permis, accessible et bien équipée</h1>
        <p>
          NeoDrive propose une alternative moderne aux voitures sans permis
          d’occasion, à la Citroën Ami et à la Fiat Topolino.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta">
          Recevoir les photos et disponibilités
        </a>
      </section>

      <section className="section">
        <h2>Pourquoi choisir une voiture sans permis électrique ?</h2>
        <p>
          La voiture sans permis électrique permet de se déplacer simplement au
          quotidien, sans carburant, avec un coût d’utilisation réduit et une
          conduite facile.
        </p>

        <div className="grid">
          <div className="card">
            <h3>100% électrique</h3>
            <p>
              Recharge sur une prise classique à domicile, sans essence et sans
              passage à la pompe.
            </p>
          </div>

          <div className="card">
            <h3>Économique</h3>
            <p>
              Moins d’entretien qu’un véhicule thermique : pas de vidange, pas
              d’embrayage, pas de courroie.
            </p>
          </div>

          <div className="card">
            <h3>Simple à conduire</h3>
            <p>
              Idéale pour les trajets quotidiens, les courses, le travail ou
              retrouver son autonomie.
            </p>
          </div>
        </div>
      </section>

      <section className="dark">
        <h2>NeoDrive : plus équipée, plus pratique</h2>
        <p>
          Contrairement à certaines petites voitures électriques minimalistes,
          NeoDrive mise sur le confort, la praticité et l’accompagnement client.
        </p>

        <ul>
          <li>Structure en acier</li>
          <li>Grand coffre</li>
          <li>Caméra de recul</li>
          <li>Bluetooth / USB</li>
          <li>Chauffage et ventilation</li>
          <li>Alarme antivol</li>
          <li>Aide au démarrage en côte</li>
          <li>SAV et pièces disponibles</li>
        </ul>
      </section>

      <section className="section">
        <h2>Une alternative à la Citroën Ami et à la Fiat Topolino</h2>
        <p>
          Beaucoup de clients comparent NeoDrive avec la Citroën Ami ou la Fiat
          Topolino. Ces véhicules sont connus, mais ils restent souvent très
          simples en équipement.
        </p>

        <p>
          NeoDrive se positionne comme une voiture sans permis électrique neuve,
          accessible, bien équipée, avec un vrai accompagnement avant et après
          l’achat.
        </p>
      </section>

      <section className="section soft">
        <h2>Une alternative à la voiture sans permis d’occasion</h2>
        <p>
          Une voiture sans permis d’occasion peut sembler intéressante au départ,
          mais elle peut aussi cacher des frais : batterie usée, réparations,
          absence de garantie ou pièces difficiles à trouver.
        </p>

        <p>
          Avec NeoDrive, vous bénéficiez d’un véhicule neuf, d’un prix clair,
          d’un SAV en France et d’un accompagnement après l’achat.
        </p>
      </section>

      <section className="section">
        <h2>Pour qui est faite NeoDrive ?</h2>

        <div className="grid">
          <div className="card">
            <h3>Jeunes conducteurs</h3>
            <p>
              Une solution pratique pour se déplacer sans voiture classique,
              selon la réglementation en vigueur.
            </p>
          </div>

          <div className="card">
            <h3>Personnes sans permis</h3>
            <p>
              Une mobilité simple pour aller travailler, faire les courses ou
              se déplacer localement.
            </p>
          </div>

          <div className="card">
            <h3>Retraités et familles</h3>
            <p>
              Une petite voiture pratique, économique et rassurante pour les
              trajets du quotidien.
            </p>
          </div>
        </div>
      </section>

      <section className="faq">
        <h2>Questions fréquentes</h2>

        <div className="faqItem">
          <h3>Faut-il le permis pour conduire une NeoDrive ?</h3>
          <p>
            NeoDrive est une voiture sans permis de catégorie L6e. Selon votre
            âge et votre situation, le permis AM peut être nécessaire.
          </p>
        </div>

        <div className="faqItem">
          <h3>Comment se recharge la voiture ?</h3>
          <p>
            Elle se recharge simplement sur une prise domestique classique,
            comme de nombreux véhicules électriques légers.
          </p>
        </div>

        <div className="faqItem">
          <h3>Est-ce une voiture neuve ?</h3>
          <p>
            Oui, NeoDrive propose des voitures sans permis électriques neuves,
            avec accompagnement et service après-vente.
          </p>
        </div>

        <div className="faqItem">
          <h3>Les pièces sont-elles disponibles ?</h3>
          <p>
            Oui, NeoDrive met l’accent sur le SAV, les pièces détachées et la
            facilité de réparation.
          </p>
        </div>
      </section>

      <section className="ctaSection">
        <h2>Vous cherchez une voiture sans permis électrique ?</h2>
        <p>
          Contactez-nous sur WhatsApp pour recevoir les photos, vidéos,
          disponibilités et solutions de financement.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta big">
          Contacter NeoDrive
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

        ul {
          margin: 35px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        li {
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
          ul {
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
