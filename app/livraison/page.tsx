export default function LivraisonPage() {
  const zones = [
    { price: "350 €", title: "Zone 1", text: "Haute-Garonne, Tarn, Tarn-et-Garonne, Gers, Ariège" },
    { price: "490 €", title: "Zone 2", text: "Sud-Ouest et départements proches : Aude, Aveyron, Lot, Lot-et-Garonne, Gironde, Hautes-Pyrénées, Pyrénées-Orientales, Hérault, Gard, Landes, Dordogne, Corrèze, Haute-Vienne, Cantal" },
    { price: "690 €", title: "Zone 3", text: "Île-de-France et plusieurs grandes zones : Paris, petite et grande couronne, Bouches-du-Rhône, Rhône, Puy-de-Dôme, Charente, Charente-Maritime, Vienne" },
    { price: "790 €", title: "Zone 4 / longue distance", text: "Bretagne, Pays de la Loire, Alsace, Nord, Normandie, Grand Est et autres départements éloignés" },
  ];

  return <main className="delivery">
    <section className="hero">
      <div className="copy">
        <span className="eyebrow">LIVRAISON NEODRIVE</span>
        <h1>Votre voiture sans permis livrée partout en France.</h1>
        <p>Nous organisons la livraison de votre NeoDrive à domicile ou avec un transporteur partenaire selon la destination, le planning et le nombre de véhicules à acheminer.</p>
        <div className="buttons">
          <a className="primary" href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20un%20tarif%20de%20livraison%20NeoDrive">Calculer ma livraison</a>
          <a className="secondary" href="/reservation">Réserver un véhicule</a>
        </div>
      </div>
      <div className="visual">
        <img src="/france4.jpg" alt="Livraison NeoDrive partout en France" />
        <div className="trust"><b>France entière</b><b>Organisation par NeoDrive</b><b>Suivi avant livraison</b></div>
      </div>
    </section>

    <section className="steps">
      <article><span>01</span><h2>Vous choisissez le véhicule</h2><p>Nous confirmons le modèle, la version, la disponibilité et votre adresse de livraison.</p></article>
      <article><span>02</span><h2>Nous organisons le transport</h2><p>Selon la distance, la livraison peut être réalisée par NeoDrive ou par un transporteur automobile professionnel.</p></article>
      <article><span>03</span><h2>Vous recevez votre NeoDrive</h2><p>Le rendez-vous et les modalités de règlement sont confirmés avant le départ afin d’éviter toute ambiguïté.</p></article>
    </section>

    <section className="section">
      <div className="heading"><span>TARIFS INDICATIFS</span><h2>Des zones simples pour estimer le coût.</h2><p>Le tarif définitif est confirmé avant la réservation. Il peut varier selon la destination exacte, le mode de transport et les possibilités de groupage.</p></div>
      <div className="zones">{zones.map(z => <article key={z.title}><div className="zoneTop"><span>{z.title}</span><strong>{z.price}</strong></div><p>{z.text}</p></article>)}</div>
      <p className="fine">Les montants ci-dessus sont des repères de livraison et ne constituent pas un devis contractuel. Certaines destinations peuvent bénéficier d’un tarif différent lors d’un transport groupé.</p>
    </section>

    <section className="dark">
      <div><span>CE QUI EST ORGANISÉ</span><h2>Une livraison préparée de bout en bout.</h2></div>
      <div className="darkGrid">
        <article><b>Transport</b><p>Planification du véhicule, du trajet ou de l’enlèvement par transporteur.</p></article>
        <article><b>Rendez-vous</b><p>Coordination avec le client avant l’expédition ou la remise du véhicule.</p></article>
        <article><b>Documents</b><p>Les documents nécessaires et les modalités d’immatriculation sont expliqués avant la livraison.</p></article>
        <article><b>Alternative</b><p>Vous pouvez aussi missionner votre propre transporteur et organiser un enlèvement chez NeoDrive.</p></article>
      </div>
    </section>

    <section className="section twoCols">
      <div><span className="eyebrow">TRANSPORT LONGUE DISTANCE</span><h2>Nous pouvons grouper plusieurs livraisons.</h2><p>Pour les trajets longs, le groupage de plusieurs véhicules peut réduire le coût logistique et éviter un déplacement individuel inutile. Le choix dépend de la destination et du planning disponible.</p></div>
      <div className="box"><h3>Vous avez déjà un transporteur ?</h3><p>Aucun problème. Nous pouvons préparer le véhicule pour l’enlèvement et coordonner le rendez-vous avec votre prestataire.</p><a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20organiser%20un%20enl%C3%A8vement%20NeoDrive">Organiser un enlèvement →</a></div>
    </section>

    <section className="cta">
      <div><span>UN DEVIS EN QUELQUES MINUTES</span><h2>Donnez-nous simplement votre département.</h2><p>Nous vous indiquons la solution de livraison la plus adaptée à votre véhicule et à votre destination.</p></div>
      <a href="https://wa.me/33628261446?text=Bonjour%2C%20mon%20d%C3%A9partement%20est%20%3A%20">Obtenir mon tarif</a>
    </section>

    <style jsx>{`
      .delivery{background:#fff;color:#111}.hero{max-width:1180px;margin:auto;padding:70px 24px 55px;display:grid;grid-template-columns:1fr 1fr;gap:55px;align-items:center}.eyebrow,.heading span,.dark>div>span,.cta span{font-size:12px;font-weight:950;letter-spacing:1.8px;color:#ff5a1f}.hero h1{font-size:clamp(44px,6vw,72px);line-height:.98;letter-spacing:-3px;margin:16px 0}.hero p,.heading p,.twoCols p{font-size:19px;line-height:1.65;color:#5b6470}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.primary,.secondary{padding:15px 21px;border-radius:14px;text-decoration:none;font-weight:900}.primary{background:#111;color:#fff}.secondary{background:#fff;color:#111;border:1px solid #d5d7da}.visual img{width:100%;height:430px;object-fit:cover;border-radius:28px;box-shadow:0 24px 70px #0002}.trust{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.trust b{font-size:12px;background:#f3f4f6;padding:9px 12px;border-radius:999px}.steps{max-width:1180px;margin:auto;padding:15px 24px 70px;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.steps article{background:#f7f7f7;border-radius:22px;padding:26px}.steps span{font-size:12px;font-weight:950;color:#ff5a1f}.steps h2{font-size:22px;margin:12px 0}.steps p{color:#666;line-height:1.6}.section{max-width:1180px;margin:auto;padding:85px 24px}.heading{max-width:760px}.heading h2,.dark h2,.twoCols h2,.cta h2{font-size:clamp(34px,5vw,55px);letter-spacing:-2px;line-height:1.05;margin:11px 0 18px}.zones{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin-top:35px}.zones article{border:1px solid #e5e7eb;border-radius:24px;padding:26px}.zoneTop{display:flex;align-items:center;justify-content:space-between;gap:16px}.zoneTop span{font-weight:900;color:#4b5563}.zoneTop strong{font-size:30px}.zones p{color:#60656d;line-height:1.55}.fine{font-size:13px;color:#777;line-height:1.5;margin-top:20px}.dark{background:#111;color:#fff;padding:85px max(24px,calc((100vw - 1132px)/2));display:grid;grid-template-columns:.9fr 1.1fr;gap:55px}.darkGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.darkGrid article{background:#1d1d1d;border-radius:18px;padding:22px}.darkGrid b{font-size:19px}.darkGrid p{color:#ccc;line-height:1.55}.twoCols{display:grid;grid-template-columns:1.15fr .85fr;gap:55px;align-items:center}.box{background:#f3f4f6;border-radius:26px;padding:32px}.box h3{font-size:27px;margin-top:0}.box a{font-weight:900;color:#111;text-decoration:none}.cta{max-width:1132px;margin:25px auto 90px;border-radius:30px;background:linear-gradient(135deg,#ff7a00,#ff006e);color:#fff;padding:50px;display:flex;justify-content:space-between;align-items:center;gap:40px}.cta span{color:#fff9}.cta h2{margin-bottom:10px}.cta p{max-width:650px;line-height:1.6;color:#fffddd}.cta a{background:#fff;color:#111;text-decoration:none;font-weight:950;padding:16px 24px;border-radius:14px;white-space:nowrap}@media(max-width:820px){.hero,.dark,.twoCols,.cta{grid-template-columns:1fr;display:grid}.hero{padding-top:45px;gap:30px}.visual img{height:300px}.steps,.zones,.darkGrid{grid-template-columns:1fr}.section{padding:60px 20px}.cta{margin:20px 15px 65px;padding:30px}.hero h1{letter-spacing:-2px}}
    `}</style>
  </main>
}
