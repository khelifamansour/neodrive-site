"use client";

export default function AssuranceVoitureSansPermisPage() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">Guide assurance</span>
        <h1>Assurance voiture sans permis : prix, garanties et conseils</h1>
        <p>
          Avant d’acheter une voiture sans permis, il est important de comprendre
          le coût de l’assurance, les garanties utiles et les différences entre
          une voiture électrique neuve et un véhicule d’occasion.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta">
          Demander une information
        </a>
      </section>

      <section className="section">
        <h2>Faut-il assurer une voiture sans permis ?</h2>
        <p>
          Oui. Une voiture sans permis doit être assurée pour circuler sur la
          voie publique. Comme pour tout véhicule, l’assurance permet de couvrir
          les dommages causés à autrui et, selon la formule choisie, les dommages
          subis par votre véhicule.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Responsabilité civile</h3>
            <p>
              C’est la base obligatoire pour circuler. Elle couvre les dommages
              causés aux autres personnes ou véhicules.
            </p>
          </div>

          <div className="card">
            <h3>Vol et incendie</h3>
            <p>
              Utile si vous stationnez souvent dehors ou si vous souhaitez mieux
              protéger votre véhicule.
            </p>
          </div>

          <div className="card">
            <h3>Tous risques</h3>
            <p>
              Une protection plus complète, intéressante pour une voiture neuve
              ou récente.
            </p>
          </div>
        </div>
      </section>

      <section className="dark">
        <h2>Ce qui influence le prix de l’assurance</h2>
        <ul>
          <li>Âge du conducteur</li>
          <li>Lieu de résidence</li>
          <li>Formule choisie</li>
          <li>Valeur du véhicule</li>
          <li>Stationnement</li>
          <li>Antécédents d’assurance</li>
          <li>Usage quotidien</li>
          <li>Garanties optionnelles</li>
        </ul>
      </section>

      <section className="section soft">
        <h2>Une voiture électrique peut réduire certains coûts</h2>
        <p>
          Une voiture sans permis électrique peut être intéressante sur la durée :
          pas de carburant, recharge à domicile, entretien réduit et mécanique
          plus simple qu’un véhicule thermique.
        </p>
        <p>
          L’assurance reste à comparer selon votre profil, mais le coût global
          d’utilisation peut être plus maîtrisé avec une voiture électrique neuve.
        </p>
      </section>

      <section className="compareSection">
        <h2>Neuf ou occasion : que regarder pour l’assurance ?</h2>

        <div className="compare">
          <div>
            <h3>Voiture sans permis d’occasion</h3>
            <ul>
              <li>Prix d’achat parfois plus bas</li>
              <li>État général à vérifier</li>
              <li>Valeur réelle parfois difficile à estimer</li>
              <li>Réparations possibles</li>
              <li>Garantie souvent limitée</li>
            </ul>
          </div>

          <div className="highlight">
            <h3>NeoDrive neuve</h3>
            <ul>
              <li>Véhicule neuf</li>
              <li>Prix clair</li>
              <li>Structure en acier</li>
              <li>Équipements utiles</li>
              <li>SAV et pièces disponibles</li>
              <li>Financement possible</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Pourquoi demander une simulation avant d’acheter ?</h2>
        <p>
          Avant de réserver votre voiture sans permis, il est conseillé de
          demander une estimation d’assurance. Cela vous permet de connaître le
          budget total : mensualité éventuelle, assurance, recharge et entretien.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Budget clair</h3>
            <p>
              Vous savez combien coûtera réellement votre véhicule chaque mois.
            </p>
          </div>

          <div className="card">
            <h3>Meilleur choix</h3>
            <p>
              Vous pouvez choisir une formule adaptée à votre usage et à votre
              budget.
            </p>
          </div>

          <div className="card">
            <h3>Achat plus serein</h3>
            <p>
              Vous évitez les mauvaises surprises après la commande du véhicule.
            </p>
          </div>
        </div>
      </section>

      <section className="faq">
        <h2>Questions fréquentes</h2>

        <div className="faqItem">
          <h3>Une voiture sans permis doit-elle être assurée ?</h3>
          <p>
            Oui, une assurance est obligatoire pour circuler sur la voie
            publique, au minimum avec une responsabilité civile.
          </p>
        </div>

        <div className="faqItem">
          <h3>Combien coûte une assurance voiture sans permis ?</h3>
          <p>
            Le prix dépend du conducteur, du lieu, de la formule choisie, des
            garanties et du véhicule. Il faut demander une simulation adaptée à
            votre situation.
          </p>
        </div>

        <div className="faqItem">
          <h3>Quelle assurance choisir pour une voiture neuve ?</h3>
          <p>
            Pour une voiture neuve, il peut être intéressant de comparer une
            formule plus protectrice, notamment contre le vol, l’incendie ou les
            dommages.
          </p>
        </div>

        <div className="faqItem">
          <h3>NeoDrive peut-elle aider pour l’assurance ?</h3>
          <p>
            Oui, nous pouvons vous orienter pour obtenir une simulation et mieux
            estimer le budget total de votre voiture sans permis.
          </p>
        </div>
      </section>

      <section className="ctaSection">
        <h2>Vous voulez estimer votre budget complet ?</h2>
        <p>
          Contactez NeoDrive sur WhatsApp pour recevoir les photos, vidéos,
          tarifs, disponibilités, financement et informations assurance.
        </p>
        <a href="https://wa.me/33628261446" target="_blank" className="cta big">
          Contacter NeoDrive
        </a>
      </section>

      <style jsx>{`
        .page { font-family: Arial, sans-serif; color: #111; background: white; }
        .hero { padding: 90px 10%; background: linear-gradient(135deg, #050505, #242424); color: white; }
        .badge { display: inline-block; background: #ff7a00; color: white; padding: 10px 18px; border-radius: 999px; font-weight: 900; margin-bottom: 22px; }
        h1 { max-width: 950px; font-size: clamp(42px, 6vw, 72px); line-height: 1; margin: 0 0 24px; letter-spacing: -2px; }
        .hero p { max-width: 760px; font-size: 22px; line-height: 1.55; color: #e5e5e5; margin-bottom: 34px; }
        .cta { display: inline-block; background: linear-gradient(135deg, #ff7a00, #ff006e); color: white; text-decoration: none; padding: 18px 28px; border-radius: 16px; font-weight: 950; font-size: 18px; }
        .section, .faq, .compareSection, .dark { padding: 75px 10%; }
        h2 { font-size: clamp(34px, 5vw, 52px); line-height: 1.08; margin: 0 0 24px; letter-spacing: -1.5px; }
        .section > p, .ctaSection > p { max-width: 900px; font-size: 20px; line-height: 1.7; color: #444; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 40px; }
        .card { background: #fafafa; border: 1px solid #eee; border-radius: 28px; padding: 30px; box-shadow: 0 18px 45px rgba(0,0,0,0.08); }
        .card h3 { font-size: 25px; margin: 0 0 14px; }
        .card p { font-size: 17px; line-height: 1.6; color: #444; margin: 0; }
        .dark, .compareSection { background: #050505; color: white; }
        .dark ul { margin: 35px 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .dark li { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.14); border-radius: 20px; padding: 20px; font-size: 18px; font-weight: 800; }
        .soft { background: #fff7ed; }
        .compare { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; margin-top: 40px; }
        .compare > div { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 30px; padding: 34px; }
        .compare .highlight { background: linear-gradient(135deg, #ff7a00, #ff006e); }
        .compare h3 { font-size: 28px; margin: 0 0 22px; }
        .compare ul { margin: 0; padding-left: 20px; }
        .compare li { font-size: 18px; line-height: 1.6; margin-bottom: 8px; font-weight: 700; }
        .faq { background: #fafafa; }
        .faqItem { max-width: 900px; background: white; border: 1px solid #eee; border-radius: 22px; padding: 26px; margin-top: 18px; }
        .faqItem h3 { font-size: 22px; margin: 0 0 10px; }
        .faqItem p { font-size: 18px; line-height: 1.6; color: #444; margin: 0; }
        .ctaSection { margin: 40px 10% 80px; padding: 56px; border-radius: 34px; background: radial-gradient(circle at top left, #273449, #080808 60%); color: white; text-align: center; }
        .ctaSection p { color: #ddd; margin: 0 auto 34px; }
        .big { font-size: 20px; padding: 20px 36px; }

        @media (max-width: 900px) {
          .hero, .section, .dark, .faq, .compareSection { padding: 55px 24px; }
          .grid, .compare, .dark ul { grid-template-columns: 1fr; }
          .ctaSection { margin: 32px 24px 60px; padding: 38px 26px; }
        }
      `}</style>
    </main>
  );
}
