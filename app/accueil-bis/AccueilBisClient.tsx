"use client";

const whatsapp =
  "https://wa.me/33628261446?text=Bonjour%20NeoDrive%2C%20je%20souhaite%20des%20informations%20sur%20vos%20voitures%20sans%20permis%20%C3%A9lectriques.";

const versions = [
  {
    name: "Essentielle",
    price: "3 990 €",
    note: "Sur commande",
    text: "L’essentiel pour rouler en électrique avec une voiture neuve et simple.",
    items: ["100% électrique", "Voiture neuve", "Batterie incluse", "Grand coffre"],
  },
  {
    name: "Confort",
    price: "4 990 €",
    note: "Selon stock",
    text: "Notre version la plus complète pour le quotidien, avec les équipements les plus demandés.",
    items: ["Chauffage & ventilation", "Caméra de recul", "Bluetooth / USB", "Alarme antivol"],
    featured: true,
  },
  {
    name: "Confort Plus+",
    price: "5 990 €",
    note: "Autonomie renforcée",
    text: "Pour ceux qui souhaitent davantage d’autonomie et un équipement complet.",
    items: ["Pack Confort inclus", "Autonomie renforcée", "Charge adaptée", "Accompagnement NeoDrive"],
  },
];

export default function AccueilBisClient() {
  return (
    <main className="bis">
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <span className="badge">🇫🇷 NeoDrive · Muret / Toulouse</span>
          <h1>La liberté de rouler, simplement.</h1>
          <p className="heroLead">
            Une voiture sans permis électrique <strong>neuve, pratique et accessible</strong>,
            pensée pour les déplacements du quotidien.
          </p>
          <div className="priceLine">
            <span>Dès</span>
            <strong>3 990 €</strong>
            <small>TTC</small>
          </div>
          <div className="heroActions">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="primaryBtn">
              Parler avec NeoDrive
            </a>
            <a href="#videos" className="secondaryBtn">▶ Voir la voiture en vidéo</a>
          </div>
          <div className="heroProof">
            <span>✓ 100% électrique</span>
            <span>✓ Livraison en France</span>
            <span>✓ Paiement à la livraison</span>
          </div>
        </div>
      </section>

      <section className="trustBar">
        <div><strong>45 km/h</strong><span>Voiture sans permis L6e</span></div>
        <div><strong>Carrosserie acier</strong><span>Conception simple et robuste</span></div>
        <div><strong>France</strong><span>Livraison jusqu’à votre adresse</span></div>
      </section>

      <section className="welcome section">
        <div className="sectionText">
          <span className="eyebrow">Une voiture faite pour la vraie vie</span>
          <h2>Petite à l’extérieur.<br />Étonnamment pratique à l’intérieur.</h2>
          <p>
            Facile à garer, silencieuse et simple à recharger, la NeoDrive a été pensée pour
            les trajets du quotidien : courses, rendez-vous, travail, centre-ville ou petites routes.
          </p>
        </div>
        <div className="miniFeatures">
          <article><b>⚡</b><strong>Électrique</strong><span>Recharge simple au quotidien</span></article>
          <article><b>☀️</b><strong>Toit ouvrant</strong><span>Un habitacle lumineux et agréable</span></article>
          <article><b>↩</b><strong>Caméra de recul</strong><span>Plus simple pour se garer</span></article>
          <article><b>♫</b><strong>Bluetooth / USB</strong><span>Vos trajets, votre musique</span></article>
        </div>
      </section>

      <section className="showcase section">
        <div className="carStage">
          <div className="stageHalo" />
          <img src="/img1.png" alt="NeoDrive Confort grise vue de trois-quarts avant" />
          <div className="stageBadge">
            <span>NeoDrive Confort</span>
            <strong>4 990 € TTC</strong>
          </div>
        </div>
        <div className="showcaseCopy">
          <span className="eyebrow">La Confort</span>
          <h2>Tout ce qu’il faut pour rouler sereinement.</h2>
          <p>
            La version Confort rassemble les équipements les plus utiles au quotidien,
            sans compliquer la voiture : chauffage, ventilation, caméra de recul, Bluetooth,
            USB et alarme.
          </p>
          <div className="pills">
            <span>Chauffage</span><span>Caméra</span><span>Bluetooth</span><span>Alarme</span>
          </div>
          <a href={whatsapp} target="_blank" rel="noreferrer" className="darkBtn">
            Vérifier une disponibilité →
          </a>
        </div>
      </section>

      <section className="details section">
        <div className="detailGrid">
          <figure>
            <img src="/img2.png" alt="NeoDrive vue de profil" loading="lazy" />
            <figcaption><strong>Compacte</strong><span>Une silhouette facile à garer.</span></figcaption>
          </figure>
          <figure>
            <img src="/img4.png" alt="Habitacle avant de la NeoDrive" loading="lazy" />
            <figcaption><strong>Confortable</strong><span>Deux vraies places à l’avant et un espace arrière pratique.</span></figcaption>
          </figure>
          <figure>
            <img src="/img3.png" alt="NeoDrive vue de trois-quarts arrière" loading="lazy" />
            <figcaption><strong>Simple</strong><span>Une voiture pensée pour être facile à vivre.</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="versionsSection section">
        <div className="sectionHeader">
          <span className="eyebrow">La gamme NeoDrive</span>
          <h2>Trois versions, selon votre besoin.</h2>
          <p>
            Pas de faux prix ni de formule cachée : chaque version correspond simplement
            à un niveau d’équipement et de disponibilité différent.
          </p>
        </div>
        <div className="versions">
          {versions.map((v) => (
            <article key={v.name} className={v.featured ? "version featured" : "version"}>
              {v.featured && <span className="popular">LA PLUS CHOISIE</span>}
              <div className="versionTop">
                <h3>{v.name}</h3>
                <span>{v.note}</span>
              </div>
              <p className="versionPrice">{v.price} <small>TTC</small></p>
              <p className="versionText">{v.text}</p>
              <ul>
                {v.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <a href={whatsapp} target="_blank" rel="noreferrer">
                Demander des informations →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="videos" className="videos section">
        <div className="sectionHeader lightHeader">
          <span className="eyebrow lightEyebrow">Voir avant d’acheter</span>
          <h2>Découvrez la NeoDrive telle qu’elle est vraiment.</h2>
          <p>
            Présentation, habitacle et conduite : uniquement des vidéos utiles pour voir la voiture,
            pas des images de manutention ou de déchargement.
          </p>
        </div>

        <div className="videoGrid">
          <article className="mainVideo">
            <video controls preload="metadata" playsInline poster="/img1.png">
              <source src="/presentation1.mp4" type="video/mp4" />
            </video>
            <div><strong>Présentation NeoDrive</strong><span>Le véhicule sous tous les angles.</span></div>
          </article>

          <article>
            <video controls preload="metadata" playsInline poster="/img4.png">
              <source src="/interieur.mp4" type="video/mp4" />
            </video>
            <div><strong>À l’intérieur</strong><span>Habitacle, commandes et espace.</span></div>
          </article>

          <article>
            <video controls preload="metadata" playsInline poster="/img2.png">
              <source src="/essai-route.mp4" type="video/mp4" />
            </video>
            <div><strong>Sur la route</strong><span>La NeoDrive en mouvement.</span></div>
          </article>
        </div>

        <a href="/videos" className="videoLink">Voir toutes les vidéos →</a>
      </section>

      <section className="clients section">
        <div className="clientIntro">
          <span className="eyebrow">Des clients partout en France</span>
          <h2>Une vraie voiture, livrée chez de vrais clients.</h2>
          <p>
            Nous préférons montrer des expériences concrètes : livraison, prise en main et utilisation
            réelle. C’est aussi ce qui permet d’acheter à distance plus sereinement.
          </p>
          <div className="clientPoints">
            <span>✓ Livraison nationale</span>
            <span>✓ Vidéo du véhicule possible</span>
            <span>✓ Accompagnement SAV</span>
          </div>
        </div>
        <div className="clientVideos">
          <article>
            <video controls preload="metadata" playsInline>
              <source src="/client1.mp4" type="video/mp4" />
            </video>
            <span>Livraison client</span>
          </article>
          <article>
            <video controls preload="metadata" playsInline>
              <source src="/client2.mp4" type="video/mp4" />
            </video>
            <span>Prise en main NeoDrive</span>
          </article>
        </div>
      </section>

      <section className="buying section">
        <div className="buyCard">
          <span className="eyebrow">Acheter simplement</span>
          <h2>Vous savez ce que vous achetez avant de payer.</h2>
          <p>
            Vous nous contactez avec votre code postal et la version souhaitée. Nous confirmons
            la disponibilité, le transport et le prix. Le véhicule est ensuite livré à l’adresse convenue.
          </p>
          <div className="steps">
            <div><b>01</b><span><strong>Vous nous contactez</strong><small>Version, couleur et code postal.</small></span></div>
            <div><b>02</b><span><strong>Nous confirmons</strong><small>Disponibilité, délai et transport.</small></span></div>
            <div><b>03</b><span><strong>Livraison</strong><small>Votre NeoDrive arrive à l’adresse prévue.</small></span></div>
            <div><b>04</b><span><strong>Contrôle & règlement</strong><small>Selon les modalités convenues avec NeoDrive.</small></span></div>
          </div>
        </div>
        <div className="buyImage">
          <img src="/img1.png" alt="NeoDrive électrique grise" loading="lazy" />
        </div>
      </section>

      <section className="finalCta">
        <div className="finalOverlay" />
        <div className="finalContent">
          <span className="badge">NeoDrive · voiture sans permis électrique</span>
          <h2>Envie de voir si une NeoDrive vous correspond ?</h2>
          <p>
            Envoyez-nous simplement votre code postal et la version qui vous intéresse.
            Nous vous répondons avec les disponibilités et le prix de livraison.
          </p>
          <div className="finalActions">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="primaryBtn">💬 WhatsApp</a>
            <a href="/produit" className="secondaryBtn">Voir les véhicules</a>
          </div>
        </div>
      </section>

      <a className="floatingWhatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Contacter NeoDrive sur WhatsApp">
        <span>WhatsApp</span><b>↗</b>
      </a>

      <style jsx global>{`
        html{scroll-behavior:smooth}
        body{background:#fff!important}
      `}</style>

      <style jsx>{`
        .bis{--ink:#111318;--muted:#6f747c;--orange:#f97316;--green:#25d366;background:#fff;color:var(--ink);overflow:hidden}
        .section{padding:88px max(20px,6vw)}
        .hero{position:relative;min-height:690px;display:flex;align-items:center;background:url('/hero.png') center 52%/cover no-repeat;color:#fff}
        .heroOverlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,14,.78) 0%,rgba(8,10,14,.52) 44%,rgba(8,10,14,.14) 100%)}
        .heroContent{position:relative;z-index:2;width:min(1180px,100%);margin:auto;padding:74px max(22px,4vw);display:flex;flex-direction:column;align-items:flex-start}
        .badge{display:inline-flex;align-items:center;background:rgba(255,255,255,.94);color:#111;padding:9px 13px;border-radius:999px;font-size:12px;font-weight:900}
        .hero h1{font-size:clamp(54px,7vw,92px);line-height:.93;letter-spacing:-.055em;max-width:760px;margin:18px 0 20px;font-weight:950}
        .heroLead{font-size:clamp(18px,2vw,23px);line-height:1.55;max-width:630px;margin:0;color:#eef1f4}.heroLead strong{color:#fff}
        .priceLine{display:flex;align-items:end;gap:8px;margin-top:24px}.priceLine span{font-size:15px;font-weight:800;margin-bottom:10px}.priceLine strong{font-size:50px;line-height:1;color:#ff972f;letter-spacing:-.05em}.priceLine small{font-weight:900;margin-bottom:8px}
        .heroActions,.finalActions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.heroActions a,.finalActions a{text-decoration:none;padding:15px 19px;border-radius:14px;font-weight:950;transition:.2s ease}.heroActions a:hover,.finalActions a:hover{transform:translateY(-2px)}
        .primaryBtn{background:var(--green);color:#fff}.secondaryBtn{background:#fff;color:#111}.heroProof{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.heroProof span{font-size:12px;font-weight:850;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.26);background:rgba(255,255,255,.09);backdrop-filter:blur(8px)}
        .trustBar{position:relative;z-index:4;width:min(1060px,calc(100% - 34px));margin:-38px auto 0;background:#fff;border-radius:24px;box-shadow:0 20px 55px rgba(16,20,26,.12);display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden}.trustBar div{padding:23px 25px;border-right:1px solid #ececec}.trustBar div:last-child{border:0}.trustBar strong{display:block;font-size:18px}.trustBar span{display:block;margin-top:5px;color:#7a8088;font-size:12px}
        .eyebrow{display:inline-block;color:#f26618;font-size:11px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.sectionText,.sectionHeader{max-width:800px}.sectionText h2,.sectionHeader h2,.showcaseCopy h2,.clientIntro h2,.buyCard h2,.finalCta h2{font-size:clamp(40px,5.2vw,64px);line-height:1;letter-spacing:-.05em;margin:14px 0 18px;font-weight:950}.sectionText p,.sectionHeader p,.showcaseCopy p,.clientIntro p,.buyCard>p,.finalCta p{font-size:17px;line-height:1.68;color:var(--muted);margin:0}
        .welcome{padding-top:110px}.miniFeatures{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:42px}.miniFeatures article{padding:22px;background:#f7f7f5;border:1px solid #ecebe7;border-radius:20px;display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center}.miniFeatures b{grid-row:span 2;width:38px;height:38px;border-radius:12px;background:#111;color:#fff;display:grid;place-items:center;font-size:16px}.miniFeatures strong{font-size:15px}.miniFeatures span{font-size:12px;color:#7a7f86}
        .showcase{background:#f5f5f2;display:grid;grid-template-columns:1.08fr .92fr;gap:70px;align-items:center}.carStage{position:relative;min-height:570px;background:radial-gradient(circle at 50% 48%,#fff 0%,#fff 35%,#ecece8 72%);border-radius:34px;display:grid;place-items:center;overflow:hidden}.carStage img{position:relative;z-index:2;width:93%;height:93%;object-fit:contain}.stageHalo{position:absolute;width:72%;height:20%;left:14%;bottom:10%;background:#c9cbc8;filter:blur(28px);border-radius:50%;opacity:.45}.stageBadge{position:absolute;z-index:3;left:22px;bottom:22px;background:#111;color:#fff;border-radius:15px;padding:13px 16px;display:flex;flex-direction:column}.stageBadge span{font-size:11px;color:#c6cad0}.stageBadge strong{font-size:20px;margin-top:3px}.showcaseCopy{max-width:580px}.pills{display:flex;flex-wrap:wrap;gap:8px;margin:25px 0}.pills span{font-size:12px;font-weight:850;background:#fff;border:1px solid #dddcd6;border-radius:999px;padding:9px 11px}.darkBtn{display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:900;border-radius:14px;padding:14px 17px}
        .details{padding-top:70px;padding-bottom:70px}.detailGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:min(1180px,100%);margin:auto}.detailGrid figure{margin:0;background:#f8f8f6;border:1px solid #ecebe8;border-radius:24px;overflow:hidden}.detailGrid img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.detailGrid figcaption{padding:17px 19px;display:flex;flex-direction:column;gap:4px}.detailGrid strong{font-size:17px}.detailGrid span{font-size:12px;color:#767c84;line-height:1.45}
        .versionsSection{background:#faf9f7}.sectionHeader{margin:0 auto 46px;text-align:center}.versions{width:min(1180px,100%);margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch}.version{position:relative;background:#fff;border:1px solid #e7e5e1;border-radius:26px;padding:28px;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(10,14,20,.04)}.version.featured{border:2px solid #f97316;box-shadow:0 24px 55px rgba(249,115,22,.12)}.popular{position:absolute;left:24px;top:-13px;background:#f97316;color:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:950;letter-spacing:.08em}.versionTop{display:flex;justify-content:space-between;gap:14px;align-items:start}.versionTop h3{font-size:25px;margin:0}.versionTop span{font-size:10px;font-weight:850;color:#757b83;background:#f0f0ee;padding:7px 9px;border-radius:999px}.versionPrice{font-size:39px;font-weight:950;letter-spacing:-.04em;margin:30px 0 12px}.versionPrice small{font-size:12px;letter-spacing:0}.versionText{font-size:14px;line-height:1.55;color:#747981;min-height:66px}.version ul{list-style:none;padding:0;margin:20px 0 28px}.version li{padding:10px 0;border-top:1px solid #eceae6;font-size:14px;font-weight:750}.version li:before{content:'✓';color:#f97316;font-weight:950;margin-right:8px}.version a{margin-top:auto;text-decoration:none;text-align:center;color:#111;font-weight:900;border:1px solid #dedcd7;padding:13px;border-radius:14px}.featured a{background:#f97316;border-color:#f97316;color:#fff}
        .videos{background:#0c0f14;color:#fff}.lightHeader p{color:#adb3bc}.lightEyebrow{color:#ff9c52}.videoGrid{width:min(1180px,100%);margin:auto;display:grid;grid-template-columns:1.1fr .9fr;grid-template-rows:1fr 1fr;gap:14px}.videoGrid article{background:#171a20;border:1px solid #252a31;border-radius:22px;overflow:hidden}.mainVideo{grid-row:span 2}.videoGrid video{display:block;width:100%;background:#000;object-fit:cover}.mainVideo video{aspect-ratio:4/3}.videoGrid article:not(.mainVideo) video{aspect-ratio:16/9}.videoGrid article>div{padding:14px 17px;display:flex;flex-direction:column;gap:3px}.videoGrid strong{font-size:14px}.videoGrid span{font-size:11px;color:#8f97a1}.videoLink{display:block;width:max-content;margin:24px auto 0;color:#fff;text-decoration:none;font-weight:900;border-bottom:1px solid #666;padding-bottom:3px}
        .clients{display:grid;grid-template-columns:.8fr 1.2fr;gap:60px;align-items:center}.clientIntro{max-width:570px}.clientPoints{display:flex;flex-direction:column;gap:8px;margin-top:24px}.clientPoints span{font-size:13px;font-weight:850}.clientVideos{display:grid;grid-template-columns:1fr 1fr;gap:14px}.clientVideos article{border-radius:22px;overflow:hidden;background:#111;position:relative}.clientVideos video{display:block;width:100%;aspect-ratio:9/13;object-fit:cover;background:#000}.clientVideos article>span{position:absolute;left:13px;bottom:13px;background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:7px 9px;font-size:10px;font-weight:850}
        .buying{background:#f6f5f2;display:grid;grid-template-columns:.95fr 1.05fr;gap:55px;align-items:center}.buyCard{max-width:640px}.steps{margin-top:30px}.steps>div{display:flex;gap:13px;padding:13px 0;border-top:1px solid #dedcd7}.steps b{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:#111;color:#fff;display:grid;place-items:center;font-size:10px}.steps span{display:flex;flex-direction:column}.steps strong{font-size:14px}.steps small{font-size:11px;color:#777d85;margin-top:3px}.buyImage{min-height:500px;background:#fff;border-radius:30px;display:grid;place-items:center;overflow:hidden}.buyImage img{width:95%;height:95%;object-fit:contain}
        .finalCta{position:relative;min-height:530px;margin:0 max(14px,3vw) 38px;border-radius:34px;overflow:hidden;background:url('/hero.png') center/cover no-repeat;color:#fff;display:grid;place-items:center;text-align:center}.finalOverlay{position:absolute;inset:0;background:rgba(5,8,12,.68)}.finalContent{position:relative;z-index:2;max-width:880px;padding:50px 25px}.finalCta p{color:#e0e4e8;max-width:700px;margin:0 auto}.finalActions{justify-content:center}
        .floatingWhatsapp{position:fixed;right:17px;bottom:17px;z-index:9998;background:#25d366;color:#fff;text-decoration:none;border-radius:999px;padding:12px 14px 12px 17px;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:950;box-shadow:0 12px 30px rgba(0,0,0,.2)}.floatingWhatsapp b{width:27px;height:27px;border-radius:50%;background:#fff;color:#178f45;display:grid;place-items:center}
        @media(max-width:1000px){.showcase,.clients,.buying{grid-template-columns:1fr}.showcaseCopy,.clientIntro,.buyCard{max-width:760px}.miniFeatures{grid-template-columns:repeat(2,1fr)}.carStage{min-height:500px}.buyImage{min-height:440px}}
        @media(max-width:800px){.section{padding:66px 18px}.hero{min-height:610px;align-items:flex-end;background-position:58% center}.heroOverlay{background:linear-gradient(180deg,rgba(7,9,13,.12) 0%,rgba(7,9,13,.40) 42%,rgba(7,9,13,.88) 100%)}.heroContent{padding:70px 18px 58px}.hero h1{font-size:49px;max-width:560px}.heroLead{font-size:17px}.priceLine strong{font-size:43px}.trustBar{margin-top:-28px;grid-template-columns:1fr 1fr}.trustBar div{padding:17px 16px}.trustBar div:nth-child(2){border-right:0}.trustBar div:last-child{grid-column:span 2;border-top:1px solid #ececec}.welcome{padding-top:90px}.sectionText h2,.sectionHeader h2,.showcaseCopy h2,.clientIntro h2,.buyCard h2{font-size:39px}.miniFeatures{grid-template-columns:1fr 1fr}.showcase{gap:34px}.carStage{min-height:410px}.detailGrid{grid-template-columns:1fr 1fr}.detailGrid figure:last-child{grid-column:span 2}.detailGrid figure:last-child img{aspect-ratio:16/9}.versions{grid-template-columns:1fr}.version.featured{order:-1}.videoGrid{grid-template-columns:1fr;grid-template-rows:auto}.mainVideo{grid-row:auto}.mainVideo video,.videoGrid article:not(.mainVideo) video{aspect-ratio:16/9}.clientVideos{grid-template-columns:1fr 1fr}.buyImage{min-height:360px}.finalCta{min-height:470px}.finalCta h2{font-size:43px}}
        @media(max-width:520px){.hero{min-height:560px}.hero h1{font-size:42px}.heroActions,.finalActions{width:100%;flex-direction:column}.heroActions a,.finalActions a{text-align:center;width:100%}.heroProof span{font-size:10px}.trustBar strong{font-size:15px}.trustBar span{font-size:10px}.miniFeatures{grid-template-columns:1fr;gap:9px}.miniFeatures article{padding:16px}.sectionText h2,.sectionHeader h2,.showcaseCopy h2,.clientIntro h2,.buyCard h2{font-size:34px}.carStage{min-height:330px;border-radius:24px}.stageBadge{left:14px;bottom:14px;padding:10px 12px}.stageBadge strong{font-size:17px}.detailGrid{grid-template-columns:1fr}.detailGrid figure:last-child{grid-column:auto}.detailGrid figure:last-child img{aspect-ratio:4/3}.clientVideos{grid-template-columns:1fr}.clientVideos video{aspect-ratio:16/11}.buyImage{min-height:300px}.finalCta{margin-left:10px;margin-right:10px;border-radius:26px}.finalCta h2{font-size:36px}.floatingWhatsapp span{display:none}.floatingWhatsapp{padding:10px}.floatingWhatsapp b{width:34px;height:34px}}
      `}</style>
    </main>
  );
}
