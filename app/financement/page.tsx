"use client"

export default function FinancementPage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">Financement NeoDrive</span>
        <h1>Devenez propriétaire de votre voiture sans permis dès 69 €/mois</h1>
        <p>
          Avec NeoDrive, vous pouvez financer votre voiture sans permis
          électrique neuve sur la durée et maîtriser votre budget chaque mois.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta">
          Demander une simulation
        </a>
      </section>

      <section className="section">
        <h2>Le vrai coût d’une voiture ne se limite pas au prix d’achat</h2>
        <p>
          Beaucoup de clients comparent uniquement le prix affiché. Pourtant,
          le plus important est le coût total sur plusieurs années : carburant,
          entretien, assurance, réparations et valeur de revente.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Recharge économique</h3>
            <p>
              Une NeoDrive se recharge simplement sur une prise domestique.
              Le coût d’utilisation quotidien est très faible comparé à un
              véhicule thermique.
            </p>
          </div>

          <div className="card">
            <h3>Entretien réduit</h3>
            <p>
              Pas de vidange, pas d’embrayage, pas de courroie de distribution :
              une voiture électrique simple coûte généralement moins cher à
              entretenir.
            </p>
          </div>

          <div className="card">
            <h3>Assurance accessible</h3>
            <p>
              Une voiture sans permis électrique peut souvent bénéficier d’une
              assurance moins coûteuse qu’une voiture classique.
            </p>
          </div>
        </div>
      </section>

      <section className="dark">
        <h2>Pourquoi acheter plutôt que louer ?</h2>
        <p>
          Avec une location longue durée ou une LOA, vous payez chaque mois un
          véhicule qui ne vous appartient pas forcément. Avec NeoDrive, vous
          pouvez devenir propriétaire de votre voiture.
        </p>

        <ul>
          <li>Vous devenez propriétaire du véhicule.</li>
          <li>Vous pouvez le conserver plusieurs années.</li>
          <li>Vous pouvez le revendre plus tard.</li>
          <li>Vous évitez de payer uniquement un loyer automobile.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Un coût maîtrisé sur la durée</h2>
        <p>
          Une NeoDrive est pensée pour réduire vos dépenses quotidiennes :
          recharge électrique, entretien simple, pièces disponibles et véhicule
          facile à réparer.
        </p>

        <div className="costBox">
          <strong>Exemple de raisonnement :</strong>
          <p>
            Une mensualité peut sembler importante au départ, mais elle doit
            être comparée aux économies réalisées sur le carburant, les
            réparations d’un ancien véhicule, l’entretien et les déplacements
            quotidiens.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Une alternative à la voiture sans permis d’occasion</h2>
        <p>
          Beaucoup de personnes cherchent une voiture sans permis d’occasion
          pour réduire leur budget. Mais une occasion peut parfois cacher des
          frais : batterie fatiguée, réparations, pièces difficiles à trouver ou
          absence de garantie.
        </p>

        <p>
          Avec NeoDrive, vous choisissez une voiture sans permis électrique
          neuve, bien équipée, avec un accompagnement avant et après l’achat.
        </p>
      </section>

      <section className="ctaSection">
        <h2>Demandez votre simulation gratuite</h2>
        <p>
          Envoyez-nous un message avec le modèle souhaité, votre apport éventuel
          et la durée désirée. Nous vous orienterons vers une solution adaptée.
        </p>

        <a href="https://wa.me/33628261446" target="_blank" className="cta big">
          Recevoir ma simulation
        </a>
      </section>

      <style jsx>{`
        .page {
          font-family: Arial, sans-serif;
          color: #111;
          background: #fff;
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
          max-width: 900px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 1;
          margin: 0 0 24px;
          letter-spacing: -2px;
        }

        .hero p {
          max-width: 720px;
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

        .section {
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
          grid-template-columns: repeat(2, 1fr);
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

        .costBox {
          margin-top: 35px;
          background: #fff3e8;
          border: 1px solid #fed7aa;
          border-radius: 28px;
          padding: 32px;
          max-width: 900px;
        }

        .costBox strong {
          font-size: 22px;
        }

        .costBox p {
          font-size: 18px;
          line-height: 1.7;
          margin-bottom: 0;
          color: #333;
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
          .dark {
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
