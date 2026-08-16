"use client";

const zones = [
  {
    name: "Zone 1",
    price: "350 €",
    badge: "Proche Toulouse",
    text: "Haute-Garonne, Tarn, Tarn-et-Garonne, Gers et Ariège.",
  },
  {
    name: "Zone 2",
    price: "490 €",
    badge: "Sud-Ouest",
    text: "Aude, Aveyron, Lot, Lot-et-Garonne, Gironde, Hautes-Pyrénées, Pyrénées-Orientales, Hérault, Gard, Landes, Dordogne, Corrèze, Haute-Vienne et Cantal.",
  },
  {
    name: "Zone 3",
    price: "690 €",
    badge: "Grandes métropoles",
    text: "Île-de-France, Bouches-du-Rhône, Rhône, Puy-de-Dôme, Charente, Charente-Maritime et Vienne.",
  },
  {
    name: "Zone 4",
    price: "790 €",
    badge: "Longue distance",
    text: "Bretagne, Pays de la Loire, Alsace, Nord, Normandie, Grand Est et autres départements éloignés.",
  },
];

export default function LivraisonPage() {
  return (
    <main className="deliveryPage">
      <section className="hero">
        <div className="heroImage" aria-hidden="true" />
        <div className="heroShade" />
        <div className="heroInner">
          <div className="heroCopy">
            <span className="pill">🚚 Livraison partout en France</span>
            <h1>Votre NeoDrive arrive directement chez vous.</h1>
            <p className="heroLead">
              Vous choisissez votre voiture. Nous organisons le transport et le rendez-vous jusqu&apos;à votre adresse.
            </p>
            <div className="heroActions">
              <a
                className="mainButton"
                href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20conna%C3%AEtre%20le%20tarif%20de%20livraison%20NeoDrive%20pour%20mon%20d%C3%A9partement%20%3A%20"
                target="_blank"
              >
                Calculer ma livraison
              </a>
              <a className="ghostButton" href="#tarifs">
                Voir les tarifs
              </a>
            </div>
            <div className="heroFacts">
              <div><strong>France entière</strong><span>Livraison à domicile</span></div>
              <div><strong>Rendez-vous</strong><span>Confirmé avant départ</span></div>
              <div><strong>Suivi</strong><span>Jusqu&apos;à la remise</span></div>
            </div>
          </div>

          <div className="priceCard">
            <span className="smallLabel">LIVRAISON À PARTIR DE</span>
            <div className="bigPrice">350 €</div>
            <p>Tarif selon votre département et la solution de transport disponible.</p>
            <div className="miniLine"><span>📍</span><div><b>Votre adresse</b><small>Nous confirmons la zone</small></div></div>
            <div className="miniLine"><span>🚛</span><div><b>Le transport</b><small>NeoDrive ou partenaire spécialisé</small></div></div>
            <div className="miniLine"><span>📞</span><div><b>Le rendez-vous</b><small>Organisé avant l&apos;expédition</small></div></div>
          </div>
        </div>
      </section>

      <section className="process">
        <div className="sectionTitle">
          <span>COMMENT ÇA MARCHE ?</span>
          <h2>Simple du choix du véhicule jusqu&apos;à votre porte.</h2>
        </div>
        <div className="processGrid">
          <article>
            <div className="stepNumber">01</div>
            <div className="stepIcon">🚗</div>
            <h3>Choisissez votre NeoDrive</h3>
            <p>Nous validons ensemble le modèle, la version, la couleur et la disponibilité.</p>
          </article>
          <article>
            <div className="stepNumber">02</div>
            <div className="stepIcon">🗺️</div>
            <h3>Donnez-nous votre département</h3>
            <p>Nous calculons le tarif et sélectionnons la solution de transport adaptée.</p>
          </article>
          <article>
            <div className="stepNumber">03</div>
            <div className="stepIcon">🏠</div>
            <h3>Recevez la voiture chez vous</h3>
            <p>Le rendez-vous est confirmé à l&apos;avance pour une remise simple et organisée.</p>
          </article>
        </div>
      </section>

      <section className="tariffs" id="tarifs">
        <div className="tariffHeading">
          <div>
            <span className="orangeLabel">TARIFS INDICATIFS</span>
            <h2>Un prix clair selon votre zone.</h2>
          </div>
          <p>
            Ces montants donnent un repère immédiat. Le tarif définitif dépend de l&apos;adresse exacte, du planning et des possibilités de groupage.
          </p>
        </div>

        <div className="zoneGrid">
          {zones.map((zone, index) => (
            <article className={`zoneCard ${index === 0 ? "featured" : ""}`} key={zone.name}>
              <div className="zoneHeader">
                <span className="zoneBadge">{zone.badge}</span>
                <span className="zoneName">{zone.name}</span>
              </div>
              <strong className="zonePrice">{zone.price}</strong>
              <p>{zone.text}</p>
              <a
                href={`https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20un%20devis%20de%20livraison%20NeoDrive%20pour%20la%20${encodeURIComponent(zone.name)}`}
                target="_blank"
              >
                Demander mon tarif →
              </a>
            </article>
          ))}
        </div>
        <p className="disclaimer">
          Tarifs indicatifs non contractuels. Certaines destinations peuvent bénéficier d&apos;un tarif différent lors d&apos;un transport groupé.
        </p>
      </section>

      <section className="darkSection">
        <div className="darkIntro">
          <span>UNE LIVRAISON BIEN PRÉPARÉE</span>
          <h2>Vous savez ce qui se passe avant que la voiture parte.</h2>
          <p>
            Nous confirmons les éléments importants à l&apos;avance pour éviter les mauvaises surprises au moment de la livraison.
          </p>
        </div>
        <div className="trustGrid">
          <article><span>📸</span><h3>Photos et vidéos</h3><p>Vous pouvez recevoir des images du véhicule avant son départ.</p></article>
          <article><span>📅</span><h3>Créneau organisé</h3><p>Le rendez-vous est coordonné avec vous ou avec le transporteur.</p></article>
          <article><span>📄</span><h3>Documents expliqués</h3><p>Nous vous indiquons les documents et les démarches liés à votre véhicule.</p></article>
          <article><span>🤝</span><h3>Un interlocuteur NeoDrive</h3><p>Vous gardez un contact avant, pendant et après l&apos;acheminement.</p></article>
        </div>
      </section>

      <section className="splitSection">
        <div className="mapCard">
          <img src="/france4.jpg" alt="Livraison NeoDrive partout en France" />
          <div className="mapBadge">🇫🇷 France métropolitaine</div>
        </div>
        <div className="splitCopy">
          <span className="orangeLabel">LONGUE DISTANCE</span>
          <h2>Le groupage peut réduire le coût du trajet.</h2>
          <p>
            Lorsque plusieurs véhicules partent dans une même direction, nous pouvons organiser un transport groupé. Cela permet parfois d&apos;obtenir un meilleur tarif qu&apos;un trajet dédié.
          </p>
          <div className="noteBox">
            <b>Vous avez déjà votre propre transporteur ?</b>
            <p>Nous pouvons préparer le véhicule et organiser son enlèvement avec votre prestataire.</p>
          </div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <span>VOTRE TARIF PERSONNALISÉ</span>
          <h2>Envoyez simplement votre département.</h2>
          <p>Nous vous répondons avec la solution de livraison adaptée à votre destination.</p>
        </div>
        <a
          href="https://wa.me/33628261446?text=Bonjour%2C%20mon%20d%C3%A9partement%20est%20%3A%20"
          target="_blank"
        >
          💬 Obtenir mon tarif
        </a>
      </section>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        * { box-sizing: border-box; }
      `}</style>

      <style jsx>{`
        .deliveryPage{font-family:Arial,sans-serif;background:#fff;color:#111;overflow:hidden}.hero{position:relative;min-height:760px;color:#fff;display:flex;align-items:center}.heroImage{position:absolute;inset:0;background-image:url('/hero.png');background-size:cover;background-position:center}.heroShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.65) 47%,rgba(0,0,0,.24) 100%)}.heroInner{position:relative;z-index:2;width:min(1180px,calc(100% - 48px));margin:auto;display:grid;grid-template-columns:1.15fr .65fr;gap:70px;align-items:center;padding:78px 0}.heroCopy{max-width:720px}.pill{display:inline-flex;background:#fff;color:#111;padding:11px 17px;border-radius:999px;font-size:14px;font-weight:900;margin-bottom:24px}.hero h1{font-size:clamp(50px,7vw,84px);line-height:.94;letter-spacing:-4px;margin:0;font-weight:950}.heroLead{font-size:21px;line-height:1.55;color:#efefef;max-width:650px;margin:25px 0 0}.heroActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.mainButton,.ghostButton{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 23px;border-radius:15px;font-weight:950;text-decoration:none}.mainButton{background:#ff7a00;color:#fff;box-shadow:0 14px 36px rgba(255,122,0,.25)}.ghostButton{color:#fff;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.08);backdrop-filter:blur(8px)}.heroFacts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:38px}.heroFacts div{padding:16px;border:1px solid rgba(255,255,255,.18);border-radius:16px;background:rgba(255,255,255,.08);backdrop-filter:blur(10px)}.heroFacts strong,.heroFacts span{display:block}.heroFacts strong{font-size:14px}.heroFacts span{font-size:12px;color:#ddd;margin-top:5px}.priceCard{background:#fff;color:#111;border-radius:30px;padding:33px;box-shadow:0 30px 90px rgba(0,0,0,.35)}.smallLabel,.orangeLabel,.sectionTitle>span,.darkIntro>span,.finalCta span{font-size:12px;letter-spacing:1.8px;font-weight:950;color:#f97316}.bigPrice{font-size:58px;line-height:1;font-weight:950;letter-spacing:-3px;margin:11px 0}.priceCard>p{color:#666;line-height:1.55;margin-bottom:25px}.miniLine{display:flex;gap:13px;align-items:center;border-top:1px solid #eee;padding:15px 0}.miniLine>span{font-size:22px}.miniLine b,.miniLine small{display:block}.miniLine b{font-size:14px}.miniLine small{color:#777;margin-top:3px}.process,.tariffs,.splitSection{max-width:1180px;margin:auto;padding:90px 24px}.sectionTitle{text-align:center;max-width:760px;margin:0 auto 42px}.sectionTitle h2,.tariffHeading h2,.darkIntro h2,.splitCopy h2,.finalCta h2{font-size:clamp(36px,5vw,56px);line-height:1.03;letter-spacing:-2.3px;margin:12px 0 0;font-weight:950}.processGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.processGrid article{position:relative;background:#f7f7f7;border-radius:27px;padding:30px;min-height:280px}.stepNumber{position:absolute;right:22px;top:20px;font-size:13px;font-weight:950;color:#aaa}.stepIcon{font-size:39px;margin-bottom:30px}.processGrid h3{font-size:24px;margin:0 0 12px}.processGrid p{color:#656565;line-height:1.6;margin:0}.tariffs{padding-top:60px}.tariffHeading{display:grid;grid-template-columns:1fr .85fr;gap:45px;align-items:end;margin-bottom:35px}.tariffHeading p{font-size:18px;line-height:1.65;color:#666;margin:0}.zoneGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.zoneCard{border:1px solid #e6e6e6;border-radius:26px;padding:26px;display:flex;flex-direction:column;min-height:330px;transition:transform .2s ease,box-shadow .2s ease}.zoneCard:hover{transform:translateY(-4px);box-shadow:0 22px 55px rgba(0,0,0,.09)}.zoneCard.featured{background:#111;color:#fff;border-color:#111}.zoneHeader{display:flex;align-items:center;justify-content:space-between;gap:8px}.zoneBadge{font-size:11px;font-weight:950;background:#fff3e8;color:#f97316;border-radius:999px;padding:8px 10px}.featured .zoneBadge{background:#ff7a00;color:#fff}.zoneName{font-size:12px;font-weight:900;color:#999}.zonePrice{font-size:44px;letter-spacing:-2px;margin:25px 0 14px}.zoneCard p{font-size:14px;line-height:1.6;color:#676767;flex:1}.featured p{color:#d4d4d4}.zoneCard a{font-size:14px;font-weight:950;text-decoration:none;color:#111;margin-top:20px}.featured a{color:#ff9a36}.disclaimer{text-align:center;color:#888;font-size:12px;line-height:1.5;margin:23px auto 0;max-width:830px}.darkSection{background:#111;color:#fff;padding:95px max(24px,calc((100vw - 1132px)/2));display:grid;grid-template-columns:.9fr 1.1fr;gap:65px;align-items:start}.darkIntro p{font-size:18px;line-height:1.65;color:#bbb;max-width:520px}.trustGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.trustGrid article{background:#1c1c1c;border:1px solid #292929;border-radius:22px;padding:24px}.trustGrid article>span{font-size:28px}.trustGrid h3{font-size:19px;margin:16px 0 8px}.trustGrid p{font-size:14px;line-height:1.55;color:#bbb;margin:0}.splitSection{display:grid;grid-template-columns:1fr 1fr;gap:65px;align-items:center}.mapCard{position:relative}.mapCard img{display:block;width:100%;height:500px;object-fit:cover;border-radius:30px;box-shadow:0 28px 75px rgba(0,0,0,.13)}.mapBadge{position:absolute;left:20px;bottom:20px;background:#fff;padding:13px 17px;border-radius:999px;font-weight:950;box-shadow:0 10px 30px rgba(0,0,0,.14)}.splitCopy>p{font-size:18px;line-height:1.7;color:#626262}.noteBox{background:#fff4e8;border-radius:22px;padding:23px;margin-top:28px}.noteBox b{font-size:18px}.noteBox p{font-size:15px;margin:8px 0 0;color:#666;line-height:1.55}.finalCta{width:min(1132px,calc(100% - 30px));margin:10px auto 90px;background:linear-gradient(125deg,#ff7a00,#ff3d54);color:#fff;border-radius:32px;padding:50px;display:flex;align-items:center;justify-content:space-between;gap:40px}.finalCta span{color:rgba(255,255,255,.72)}.finalCta h2{margin-top:10px}.finalCta p{font-size:17px;line-height:1.5;color:rgba(255,255,255,.9);margin-bottom:0}.finalCta a{background:#fff;color:#111;text-decoration:none;font-weight:950;padding:17px 24px;border-radius:15px;white-space:nowrap;box-shadow:0 12px 35px rgba(0,0,0,.12)}@media(max-width:980px){.heroInner{grid-template-columns:1fr;gap:34px}.priceCard{max-width:520px}.heroFacts{max-width:650px}.zoneGrid{grid-template-columns:1fr 1fr}.darkSection,.splitSection{grid-template-columns:1fr}.tariffHeading{grid-template-columns:1fr}.hero{min-height:auto}.heroShade{background:rgba(0,0,0,.72)}}@media(max-width:680px){.heroInner{width:calc(100% - 32px);padding:55px 0}.hero h1{font-size:48px;letter-spacing:-2.5px}.heroLead{font-size:18px}.heroFacts,.processGrid,.zoneGrid,.trustGrid{grid-template-columns:1fr}.heroFacts{gap:8px}.priceCard{padding:25px}.process,.tariffs,.splitSection{padding:65px 18px}.processGrid article{min-height:auto}.darkSection{padding:70px 18px;gap:40px}.mapCard img{height:330px}.finalCta{display:grid;padding:30px 24px;margin-bottom:60px}.finalCta a{text-align:center;white-space:normal}.sectionTitle h2,.tariffHeading h2,.darkIntro h2,.splitCopy h2,.finalCta h2{letter-spacing:-1.6px}.bigPrice{font-size:50px}}
      `}</style>
    </main>
  );
}
