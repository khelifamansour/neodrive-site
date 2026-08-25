"use client";

export default function LivraisonPage() {
  const zones = [
    { price: "350 €", title: "Zone 1", text: "Haute-Garonne, Tarn, Tarn-et-Garonne, Gers, Ariège" },
    { price: "490 €", title: "Zone 2", text: "Sud-Ouest et départements proches : Aude, Aveyron, Lot, Lot-et-Garonne, Gironde, Hautes-Pyrénées, Pyrénées-Orientales, Hérault, Gard, Landes, Dordogne, Corrèze, Haute-Vienne, Cantal" },
    { price: "690 €", title: "Zone 3", text: "Île-de-France et plusieurs grandes zones : Paris, petite et grande couronne, Bouches-du-Rhône, Rhône, Puy-de-Dôme, Charente, Charente-Maritime, Vienne" },
    { price: "790 €", title: "Zone 4 / longue distance", text: "Bretagne, Pays de la Loire, Alsace, Nord, Normandie, Grand Est et autres départements éloignés" },
  ];

  return (
    <main className="delivery">
      <section className="hero">
        <div className="copy">
          <span className="eyebrow">LIVRAISON NEODRIVE • FRANCE ENTIÈRE</span>
          <h1>Votre NeoDrive livrée directement chez vous.</h1>
          <p className="lead">Nous organisons votre livraison de A à Z, avec nos solutions de transport ou un transporteur automobile partenaire selon votre destination.</p>
          <div className="buttons">
            <a className="primary" href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20un%20tarif%20de%20livraison%20NeoDrive">Obtenir mon tarif</a>
            <a className="secondary" href="/reservation">Réserver une NeoDrive</a>
          </div>
          <div className="reassurance">
            <span>✓ Livraison partout en France</span>
            <span>✓ Rendez-vous organisé à l’avance</span>
            <span>✓ Suivi jusqu’à la remise du véhicule</span>
          </div>
        </div>

        <div className="visual">
          <div className="photoWrap">
            <img src="/livraison-neodrive.webp" alt="Livraison réelle d'une NeoDrive par transporteur automobile" />
            <div className="photoBadge"><b>Livraison réelle</b><span>NeoDrive prise en charge par un transporteur partenaire</span></div>
          </div>
          <div className="trust"><b>France entière</b><b>Transport professionnel</b><b>Suivi client</b></div>
        </div>
      </section>

      <section className="proofbar">
        <div><strong>01</strong><span><b>Vous choisissez votre véhicule</b>Nous confirmons modèle, disponibilité et adresse.</span></div>
        <div><strong>02</strong><span><b>Nous planifions le transport</b>NeoDrive ou un partenaire prend en charge la livraison.</span></div>
        <div><strong>03</strong><span><b>Vous recevez votre NeoDrive</b>Le rendez-vous est confirmé avant le départ.</span></div>
      </section>

      <section className="section prices">
        <div className="heading">
          <span>TARIFS INDICATIFS</span>
          <h2>Une estimation simple selon votre zone.</h2>
          <p>Donnez-nous votre département : nous vous confirmons le tarif exact avant la réservation. Le prix peut varier selon le trajet, le planning et les possibilités de groupage.</p>
        </div>
        <div className="zones">
          {zones.map((z) => (
            <article key={z.title}>
              <div className="zoneTop"><span>{z.title}</span><strong>{z.price}</strong></div>
              <p>{z.text}</p>
              <a href={`https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20un%20devis%20de%20livraison%20NeoDrive%20pour%20la%20${encodeURIComponent(z.title)}`}>Demander un devis →</a>
            </article>
          ))}
        </div>
        <p className="fine">Ces montants sont des repères de livraison et ne constituent pas un devis contractuel. Un transport groupé peut permettre un tarif différent selon la destination.</p>
      </section>

      <section className="dark">
        <div className="darkIntro">
          <span>UNE LIVRAISON SANS SURPRISE</span>
          <h2>Nous nous occupons de l’organisation.</h2>
          <p>Vous savez avant le départ qui transporte votre véhicule, comment la remise est organisée et quand vous devez être disponible.</p>
        </div>
        <div className="darkGrid">
          <article><span>01</span><b>Transport adapté</b><p>Selon la destination, livraison NeoDrive ou transporteur automobile professionnel.</p></article>
          <article><span>02</span><b>Rendez-vous confirmé</b><p>Nous coordonnons la date et les modalités avant l’expédition.</p></article>
          <article><span>03</span><b>Documents préparés</b><p>Les documents nécessaires et les démarches d’immatriculation sont expliqués en amont.</p></article>
          <article><span>04</span><b>Votre transporteur accepté</b><p>Vous pouvez aussi organiser un enlèvement avec votre propre prestataire.</p></article>
        </div>
      </section>

      <section className="section groupage">
        <div>
          <span className="eyebrow">LONGUE DISTANCE</span>
          <h2>Le groupage peut réduire le coût de livraison.</h2>
          <p>Pour certaines destinations, plusieurs véhicules peuvent être transportés sur le même trajet. Nous choisissons la solution la plus cohérente selon le planning disponible.</p>
        </div>
        <div className="box">
          <div className="boxIcon">↗</div>
          <h3>Vous avez déjà un transporteur ?</h3>
          <p>Nous préparons le véhicule pour l’enlèvement et coordonnons directement le rendez-vous avec votre prestataire.</p>
          <a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20organiser%20un%20enl%C3%A8vement%20NeoDrive">Organiser un enlèvement →</a>
        </div>
      </section>

      <section className="cta">
        <div><span>DEVIS DE LIVRAISON</span><h2>Indiquez simplement votre département.</h2><p>Nous vous répondons avec la solution et le tarif adaptés à votre destination.</p></div>
        <a href="https://wa.me/33628261446?text=Bonjour%2C%20mon%20d%C3%A9partement%20est%20%3A%20">Calculer ma livraison</a>
      </section>

      <style jsx>{`
        .delivery{background:#fff;color:#0b0b0c}.hero{max-width:1220px;margin:auto;padding:72px 24px 62px;display:grid;grid-template-columns:.96fr 1.04fr;gap:64px;align-items:center}.eyebrow,.heading>span,.darkIntro>span,.cta span{font-size:12px;font-weight:950;letter-spacing:1.8px;color:#ff4b24}.hero h1{font-size:clamp(46px,5.7vw,72px);line-height:.98;letter-spacing:-3.3px;margin:17px 0 23px;max-width:650px}.lead,.heading p,.groupage p{font-size:18px;line-height:1.7;color:#5f6570}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:29px}.primary,.secondary{padding:16px 22px;border-radius:13px;text-decoration:none;font-weight:900}.primary{background:#0b0b0c;color:#fff}.secondary{background:#fff;color:#111;border:1px solid #dadde2}.reassurance{display:grid;gap:9px;margin-top:28px;color:#3c4149;font-size:14px;font-weight:750}.photoWrap{position:relative;overflow:hidden;border-radius:30px;background:#eee;box-shadow:0 28px 75px #0000001c}.photoWrap img{width:100%;height:455px;display:block;object-fit:cover;object-position:center}.photoBadge{position:absolute;left:18px;right:18px;bottom:18px;background:#fffffff2;backdrop-filter:blur(12px);border-radius:17px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;box-shadow:0 8px 25px #0002}.photoBadge b{font-size:14px}.photoBadge span{font-size:12px;color:#5f6570}.trust{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.trust b{font-size:12px;background:#f4f5f7;padding:9px 12px;border-radius:999px}.proofbar{max-width:1172px;margin:0 auto 20px;padding:0 0 54px;display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #eceef1}.proofbar>div{display:flex;gap:16px;padding:18px 26px;border-right:1px solid #eceef1}.proofbar>div:last-child{border-right:0}.proofbar strong{font-size:13px;color:#ff4b24}.proofbar span{display:grid;gap:6px;color:#6b7078;font-size:13px;line-height:1.45}.proofbar b{font-size:16px;color:#111}.section{max-width:1180px;margin:auto;padding:85px 24px}.heading{max-width:760px}.heading h2,.dark h2,.groupage h2,.cta h2{font-size:clamp(36px,4.6vw,56px);letter-spacing:-2.4px;line-height:1.04;margin:12px 0 18px}.zones{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin-top:38px}.zones article{border:1px solid #e7e9ed;border-radius:24px;padding:27px;transition:.2s ease}.zones article:hover{transform:translateY(-2px);box-shadow:0 16px 35px #0000000d}.zoneTop{display:flex;align-items:center;justify-content:space-between;gap:16px}.zoneTop span{font-weight:900;color:#4c535d}.zoneTop strong{font-size:31px;letter-spacing:-1px}.zones p{color:#666d76;line-height:1.6;min-height:52px}.zones a{color:#111;text-decoration:none;font-weight:900;font-size:14px}.fine{font-size:13px;color:#777d85;line-height:1.55;margin-top:20px}.dark{background:#0b0b0c;color:#fff;padding:92px max(24px,calc((100vw - 1132px)/2));display:grid;grid-template-columns:.9fr 1.1fr;gap:60px}.darkIntro p{color:#b8bcc3;font-size:17px;line-height:1.7}.darkGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.darkGrid article{background:#18191b;border:1px solid #292b2f;border-radius:19px;padding:23px}.darkGrid span{display:block;color:#ff6a46;font-size:11px;font-weight:950;margin-bottom:15px}.darkGrid b{font-size:18px}.darkGrid p{color:#bfc2c7;line-height:1.55;font-size:14px}.groupage{display:grid;grid-template-columns:1.08fr .92fr;gap:60px;align-items:center}.box{background:#f3f4f6;border-radius:28px;padding:34px}.boxIcon{width:46px;height:46px;border-radius:14px;background:#111;color:#fff;display:grid;place-items:center;font-size:22px;margin-bottom:25px}.box h3{font-size:28px;letter-spacing:-1px;margin:0 0 12px}.box p{font-size:16px}.box a{font-weight:900;color:#111;text-decoration:none}.cta{max-width:1132px;margin:20px auto 92px;border-radius:31px;background:linear-gradient(135deg,#ff6a2a,#ff2b55);color:#fff;padding:52px;display:flex;justify-content:space-between;align-items:center;gap:42px}.cta span{color:#ffffffb8}.cta h2{margin-bottom:10px}.cta p{max-width:650px;line-height:1.6;color:#fff}.cta a{background:#fff;color:#111;text-decoration:none;font-weight:950;padding:17px 24px;border-radius:14px;white-space:nowrap}@media(max-width:850px){.hero,.dark,.groupage,.cta{grid-template-columns:1fr;display:grid}.hero{padding-top:45px;gap:34px}.hero h1{letter-spacing:-2.3px}.photoWrap img{height:340px}.proofbar,.zones,.darkGrid{grid-template-columns:1fr}.proofbar{padding:0 20px 45px}.proofbar>div{border-right:0;border-bottom:1px solid #eceef1;padding:18px 4px}.proofbar>div:last-child{border-bottom:0}.section{padding:62px 20px}.dark{padding-top:65px;padding-bottom:65px}.cta{margin:18px 15px 65px;padding:31px}.cta a{white-space:normal;text-align:center}}`}</style>
    </main>
  );
}
