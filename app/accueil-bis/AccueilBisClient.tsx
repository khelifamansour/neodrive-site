"use client";

const whatsapp =
  "https://wa.me/33628261446?text=Bonjour%20NeoDrive%2C%20je%20souhaite%20conna%C3%AEtre%20les%20disponibilit%C3%A9s%20de%20la%20Confort%20%C3%A0%204%20990%20%E2%82%AC.";

const gallery = [
  { src: "/neodrive-switch/real/exterieur-avant.webp", label: "NeoDrive en conditions réelles", cls: "wide" },
  { src: "/neodrive-switch/real/interieur-tableau-de-bord.webp", label: "Habitacle & conduite", cls: "" },
  { src: "/neodrive-switch/real/stock-couleurs.webp", label: "Véhicules réels en stock", cls: "" },
  { src: "/neodrive-switch/real/livraison-transporteur.webp", label: "Logistique nationale", cls: "tall" },
  { src: "/neodrive-switch/real/devant-atelier.webp", label: "Présence terrain", cls: "" },
  { src: "/neodrive-switch/real/exterieur-arriere.webp", label: "Vue arrière", cls: "" },
];

const features = [
  ["45 km/h", "Pensée pour les déplacements du quotidien"],
  ["Électrique", "Silencieuse, simple à recharger"],
  ["Carrosserie acier", "Une conception simple et rassurante"],
  ["Livraison France", "Transport organisé jusqu’à votre porte"],
];

export default function AccueilBisClient() {
  return (
    <main className="bis">
      <section className="hero">
        <div className="heroGlow glowOne" />
        <div className="heroGlow glowTwo" />
        <div className="heroInner">
          <div className="heroCopy">
            <div className="eyebrow"><span className="liveDot" /> NeoDrive · voiture sans permis électrique</div>
            <h1>
              Une vraie voiture.
              <span>À un prix qui change la donne.</span>
            </h1>
            <p className="lead">
              NeoDrive Confort à <strong>4 990 € TTC</strong> : neuve, équipée, 100% électrique
              et livrable partout en France selon disponibilités.
            </p>
            <div className="heroCtas">
              <a href={whatsapp} target="_blank" rel="noreferrer" className="ctaPrimary">
                Vérifier les disponibilités
                <span>→</span>
              </a>
              <a href="#videos" className="ctaGhost">▶ Voir les vraies vidéos</a>
            </div>
            <div className="microProof">
              <span>✓ Paiement à la livraison</span>
              <span>✓ Véhicules réels</span>
              <span>✓ SAV & accompagnement</span>
            </div>
          </div>

          <div className="heroVisual">
            <div className="imageCard">
              <img src="/neodrive-switch/real/exterieur-avant.webp" alt="Voiture sans permis électrique NeoDrive" />
              <div className="imageShade" />
              <div className="availability">
                <span className="pulse" />
                Confort · disponibilité selon stock
              </div>
              <div className="heroPrice">
                <small>NeoDrive Confort</small>
                <strong>4 990 €</strong>
                <span>TTC · hors carte grise & livraison</span>
              </div>
            </div>
            <div className="floatingCard">
              <span>Dès</span>
              <strong>3 990 €</strong>
              <small>Essentielle sur commande</small>
            </div>
          </div>
        </div>
      </section>

      <section className="proofStrip">
        <div><strong>45 km/h</strong><span>sans permis · L6e</span></div>
        <div><strong>France</strong><span>livraison à domicile</span></div>
        <div><strong>100%</strong><span>électrique</span></div>
        <div><strong>Vraies images</strong><span>pas de véhicule fictif</span></div>
      </section>

      <section className="intro section">
        <div className="sectionTitle">
          <span className="kicker">Le choix simple</span>
          <h2>Le prix d’appel attire.<br />La Confort fait la différence.</h2>
          <p>
            Chauffage, caméra de recul, Bluetooth / USB, alarme et une présentation
            claire du véhicule avant achat. L’idée : vous montrer exactement ce que vous achetez.
          </p>
        </div>
        <div className="featureGrid">
          {features.map(([title, text]) => (
            <article key={title}>
              <div className="featureIcon">✓</div>
              <strong>{title}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="models section">
        <div className="sectionTitle centered">
          <span className="kicker">3 façons d’acheter NeoDrive</span>
          <h2>Choisissez selon votre budget et votre délai.</h2>
        </div>
        <div className="modelGrid">
          <article className="modelCard">
            <div className="modelTop"><span>Essentielle</span><em>Sur commande</em></div>
            <h3>3 990 € <small>TTC</small></h3>
            <p>Pour accéder à une voiture électrique neuve au tarif le plus bas.</p>
            <ul>
              <li>100% électrique</li>
              <li>Voiture neuve</li>
              <li>Équipement essentiel</li>
              <li>Délai indicatif : 6 à 8 mois</li>
            </ul>
            <a href={whatsapp} target="_blank" rel="noreferrer">Demander les infos →</a>
          </article>

          <article className="modelCard featured">
            <div className="popular">LA PLUS DEMANDÉE</div>
            <div className="modelTop"><span>Confort</span><em>Selon stock</em></div>
            <h3>4 990 € <small>TTC</small></h3>
            <p>Le meilleur équilibre entre prix, équipement et disponibilité.</p>
            <ul>
              <li>Chauffage & ventilation</li>
              <li>Caméra de recul</li>
              <li>Bluetooth / USB</li>
              <li>Alarme antivol</li>
            </ul>
            <a href={whatsapp} target="_blank" rel="noreferrer">Vérifier une couleur →</a>
          </article>

          <article className="modelCard">
            <div className="modelTop"><span>Confort Plus+</span><em>Plus d’autonomie</em></div>
            <h3>5 990 € <small>TTC</small></h3>
            <p>Pour ceux qui veulent une réserve d’autonomie supérieure.</p>
            <ul>
              <li>Pack Confort inclus</li>
              <li>Autonomie renforcée</li>
              <li>Équipement complet</li>
              <li>Accompagnement NeoDrive</li>
            </ul>
            <a href={whatsapp} target="_blank" rel="noreferrer">Demander la Plus+ →</a>
          </article>
        </div>
        <p className="finePrint">
          Les délais, couleurs et autonomies varient selon version, stock, conditions de circulation,
          température, relief et style de conduite.
        </p>
      </section>

      <section className="reality section">
        <div className="realityHead">
          <div>
            <span className="kicker darkKicker">100% réel</span>
            <h2>Pas de studio.<br />Pas de promesse floue.</h2>
          </div>
          <p>
            Des voitures photographiées sur le terrain, des arrivages, des transporteurs et des livraisons.
            C’est volontaire : la confiance se construit mieux avec du réel.
          </p>
        </div>

        <div className="gallery">
          {gallery.map((item) => (
            <figure key={item.src} className={item.cls}>
              <img src={item.src} alt={item.label} loading="lazy" />
              <figcaption>{item.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="videos" className="videos section">
        <div className="sectionTitle centered lightTitle">
          <span className="kicker darkKicker">Voir avant d’acheter</span>
          <h2>La voiture en vidéo, sans filtre.</h2>
          <p>Présentation, intérieur, conduite et livraisons : regardez avant de décider.</p>
        </div>

        <div className="videoGrid">
          <article className="videoMain">
            <video controls preload="metadata" playsInline poster="/neodrive-switch/real/exterieur-avant.webp">
              <source src="/presentation1.mp4" type="video/mp4" />
            </video>
            <div><strong>Présentation complète</strong><span>Découvrez la NeoDrive en conditions réelles.</span></div>
          </article>
          <article>
            <video controls preload="metadata" playsInline>
              <source src="/video1.mp4" type="video/mp4" />
            </video>
            <div><strong>À bord</strong><span>Habitacle et prise en main.</span></div>
          </article>
          <article>
            <video controls preload="metadata" playsInline>
              <source src="/video2.mp4" type="video/mp4" />
            </video>
            <div><strong>Sur la route</strong><span>Voir la voiture en mouvement.</span></div>
          </article>
        </div>
        <a href="/videos" className="allVideos">Voir toutes les vidéos NeoDrive →</a>
      </section>

      <section className="delivery section">
        <div className="deliveryVisual">
          <img src="/neodrive-switch/real/livraison-transporteur.webp" alt="Transport et livraison de véhicules NeoDrive" loading="lazy" />
          <div className="deliveryBadge"><strong>Livraison nationale</strong><span>Organisation du transport jusqu’à votre porte</span></div>
        </div>
        <div className="deliveryCopy">
          <span className="kicker">Un achat à distance qui reste concret</span>
          <h2>Vous contrôlez la voiture avant le règlement.</h2>
          <p>
            Nous organisons la livraison. À l’arrivée, vous pouvez contrôler le véhicule puis effectuer
            le règlement selon les modalités convenues. Une façon simple de sécuriser l’achat à distance.
          </p>
          <div className="steps">
            <div><b>01</b><span><strong>Vous nous contactez</strong><small>Code postal, couleur, délai souhaité.</small></span></div>
            <div><b>02</b><span><strong>On confirme le véhicule</strong><small>Disponibilité, prix et transport.</small></span></div>
            <div><b>03</b><span><strong>La livraison est organisée</strong><small>Transport jusqu’à votre adresse.</small></span></div>
            <div><b>04</b><span><strong>Vous contrôlez puis réglez</strong><small>Le véhicule est devant vous.</small></span></div>
          </div>
          <a href="/livraison" className="textCta">Comprendre la livraison →</a>
        </div>
      </section>

      <section className="clientProof section">
        <div className="clientProofCopy">
          <span className="kicker">Des clients, pas seulement des clics</span>
          <h2>Des NeoDrive qui circulent déjà partout en France.</h2>
          <p>
            Chaque livraison, chaque appel et chaque vidéo de prise en main compte. Notre objectif :
            répondre rapidement, montrer le véhicule et simplifier la décision.
          </p>
        </div>
        <div className="clientVideos">
          <video controls preload="metadata" playsInline>
            <source src="/client1.mp4" type="video/mp4" />
          </video>
          <video controls preload="metadata" playsInline>
            <source src="/client2.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      <section className="faqTease section">
        <div className="faqCard">
          <span>Autonomie</span>
          <h3>Combien de kilomètres ?</h3>
          <p>L’autonomie réelle dépend de la version, du relief, de la température, de la charge et du style de conduite.</p>
        </div>
        <div className="faqCard">
          <span>SAV</span>
          <h3>Et s’il y a un problème ?</h3>
          <p>NeoDrive accompagne le diagnostic, les pièces et la solution technique selon les conditions applicables.</p>
        </div>
        <div className="faqCard">
          <span>Livraison</span>
          <h3>Combien coûte le transport ?</h3>
          <p>Le tarif dépend du code postal. Donnez-nous votre ville et nous vous communiquons le coût exact.</p>
        </div>
      </section>

      <section className="final">
        <div className="finalBg" />
        <div className="finalInner">
          <span className="kicker darkKicker">NeoDrive Confort · 4 990 € TTC</span>
          <h2>Votre prochaine voiture peut être plus simple que vous ne le pensez.</h2>
          <p>Envoyez simplement votre code postal et la couleur souhaitée. On vous répond avec la disponibilité et le prix livré.</p>
          <div className="finalActions">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="ctaPrimary">💬 WhatsApp · disponibilité</a>
            <a href="/produit" className="ctaGhost lightGhost">Voir la fiche produit</a>
          </div>
        </div>
      </section>

      <a className="floatingWhatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Contacter NeoDrive sur WhatsApp">
        <span>WhatsApp</span>
        <b>↗</b>
      </a>

      <style jsx global>{`
        html{scroll-behavior:smooth}
        body{background:#f6f5f2!important}
      `}</style>
      <style jsx>{`
        .bis{--ink:#111318;--muted:#68707b;--paper:#f6f5f2;--orange:#ff6b1a;--lime:#dfff6d;--dark:#0c0f14;background:var(--paper);color:var(--ink);overflow:hidden}
        .section{padding:104px max(22px,6vw)}
        .hero{position:relative;min-height:760px;padding:80px max(22px,6vw);display:flex;align-items:center;background:linear-gradient(145deg,#0a0d12 0%,#131922 64%,#1b2634 100%);color:#fff;overflow:hidden}
        .hero:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:70px 70px;mask-image:linear-gradient(to bottom,black,transparent 85%);pointer-events:none}
        .heroGlow{position:absolute;border-radius:999px;filter:blur(1px);opacity:.65}.glowOne{width:520px;height:520px;right:-130px;top:-190px;background:radial-gradient(circle,#ff6b1a33 0%,transparent 68%)}.glowTwo{width:440px;height:440px;left:35%;bottom:-290px;background:radial-gradient(circle,#64d7ff24 0%,transparent 70%)}
        .heroInner{position:relative;z-index:2;width:min(1240px,100%);margin:auto;display:grid;grid-template-columns:1.05fr .95fr;gap:72px;align-items:center}
        .eyebrow,.kicker{display:inline-flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900}.eyebrow{color:#dce2eb}.liveDot,.pulse{width:8px;height:8px;background:#6ef38b;border-radius:50%;box-shadow:0 0 0 6px rgba(110,243,139,.12)}
        h1{font-size:clamp(58px,7.2vw,104px);line-height:.91;letter-spacing:-.065em;margin:22px 0 26px;font-weight:950;max-width:820px}h1 span{display:block;color:#ff8a42}
        .lead{font-size:clamp(19px,2vw,24px);line-height:1.55;color:#cbd1d9;max-width:690px;margin:0}.lead strong{color:#fff}
        .heroCtas,.finalActions{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}.heroCtas a,.finalActions a{text-decoration:none;font-weight:900;border-radius:17px;padding:16px 20px;display:inline-flex;align-items:center;gap:16px;transition:.2s ease}.heroCtas a:hover,.finalActions a:hover{transform:translateY(-2px)}
        .ctaPrimary{background:#fff;color:#101318;box-shadow:0 12px 38px rgba(0,0,0,.16)}.ctaPrimary span{font-size:20px}.ctaGhost{border:1px solid rgba(255,255,255,.2);color:#fff;background:rgba(255,255,255,.06);backdrop-filter:blur(12px)}
        .microProof{display:flex;gap:15px;flex-wrap:wrap;margin-top:28px;color:#aeb7c2;font-size:13px;font-weight:750}
        .heroVisual{position:relative;min-width:0}.imageCard{position:relative;border-radius:34px;overflow:hidden;box-shadow:0 44px 90px rgba(0,0,0,.42);min-height:620px;border:1px solid rgba(255,255,255,.12);background:#111}.imageCard img{position:absolute;width:100%;height:100%;object-fit:cover;display:block}.imageShade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.75) 100%)}.availability{position:absolute;left:22px;top:22px;padding:11px 14px;border-radius:999px;background:rgba(14,17,22,.72);backdrop-filter:blur(12px);font-weight:850;font-size:12px;display:flex;align-items:center;gap:10px}.pulse{width:7px;height:7px;box-shadow:none}.heroPrice{position:absolute;left:28px;bottom:27px;display:flex;flex-direction:column}.heroPrice small{font-weight:800;color:#e3e7eb}.heroPrice strong{font-size:50px;line-height:1;margin:5px 0;letter-spacing:-.05em}.heroPrice span{font-size:12px;color:#c2c7ce}
        .floatingCard{position:absolute;right:-30px;top:60px;background:#dfff6d;color:#101318;padding:16px 18px;border-radius:19px;box-shadow:0 22px 50px rgba(0,0,0,.18);transform:rotate(3deg);display:flex;flex-direction:column}.floatingCard span,.floatingCard small{font-size:11px;font-weight:800}.floatingCard strong{font-size:28px;letter-spacing:-.04em}
        .proofStrip{position:relative;z-index:4;width:min(1120px,calc(100% - 42px));margin:-36px auto 0;background:#fff;border-radius:24px;box-shadow:0 24px 65px rgba(18,22,28,.12);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden}.proofStrip div{padding:24px 26px;border-right:1px solid #eee}.proofStrip div:last-child{border-right:0}.proofStrip strong{display:block;font-size:20px;letter-spacing:-.03em}.proofStrip span{display:block;color:#7c838b;font-size:12px;margin-top:5px}
        .sectionTitle{max-width:790px}.sectionTitle.centered{margin:0 auto 50px;text-align:center}.kicker{color:#f05e13}.sectionTitle h2,.realityHead h2,.deliveryCopy h2,.clientProofCopy h2,.final h2{font-size:clamp(42px,5.4vw,72px);line-height:.97;letter-spacing:-.055em;margin:15px 0 22px;font-weight:950}.sectionTitle p,.realityHead p,.deliveryCopy>p,.clientProofCopy p,.final p{font-size:18px;line-height:1.7;color:var(--muted);margin:0}
        .featureGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:58px}.featureGrid article{background:#fff;border:1px solid #e8e6e1;padding:28px;border-radius:24px;min-height:210px;display:flex;flex-direction:column;box-shadow:0 12px 35px rgba(21,24,29,.04)}.featureIcon{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;display:grid;place-items:center;font-weight:900;margin-bottom:auto}.featureGrid strong{font-size:24px;margin-top:28px;letter-spacing:-.03em}.featureGrid span{color:#7a8087;font-size:14px;line-height:1.5;margin-top:7px}
        .models{background:#fff}.modelGrid{width:min(1180px,100%);margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}.modelCard{position:relative;border:1px solid #e5e5e5;border-radius:28px;padding:31px;display:flex;flex-direction:column;min-height:500px;background:#fafafa}.modelCard.featured{background:#101318;color:#fff;border-color:#101318;transform:translateY(-14px);box-shadow:0 35px 70px rgba(16,19,24,.18)}.popular{position:absolute;left:28px;top:-15px;background:#ff6b1a;color:white;border-radius:999px;padding:8px 12px;font-size:10px;font-weight:950;letter-spacing:.08em}.modelTop{display:flex;justify-content:space-between;gap:10px;align-items:center}.modelTop span{font-weight:900;font-size:20px}.modelTop em{font-style:normal;font-size:11px;font-weight:850;color:#767d85;background:#ececec;border-radius:999px;padding:7px 9px}.featured .modelTop em{background:#252a31;color:#d3d7dc}.modelCard h3{font-size:44px;letter-spacing:-.05em;margin:30px 0 10px}.modelCard h3 small{font-size:13px;letter-spacing:0}.modelCard p{font-size:16px;line-height:1.55;color:#707780;margin:0}.featured p{color:#c4c9cf}.modelCard ul{list-style:none;padding:0;margin:27px 0}.modelCard li{padding:10px 0;border-top:1px solid #e6e6e6;font-size:14px;font-weight:750}.featured li{border-color:#292e35}.modelCard li:before{content:"✓";color:#ff6b1a;font-weight:950;margin-right:9px}.modelCard a{margin-top:auto;text-decoration:none;color:#111;background:#fff;border:1px solid #ddd;border-radius:15px;padding:14px 15px;font-weight:900;text-align:center}.featured a{background:#ff6b1a;border-color:#ff6b1a;color:#fff}.finePrint{max-width:880px;margin:30px auto 0;text-align:center;color:#8a8f95;font-size:12px;line-height:1.6}
        .reality{background:#101318;color:#fff}.realityHead{width:min(1180px,100%);margin:0 auto 48px;display:grid;grid-template-columns:1fr .8fr;gap:70px;align-items:end}.realityHead p{color:#aeb5be}.darkKicker{color:#dfff6d}.gallery{width:min(1240px,100%);margin:auto;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:280px;gap:12px}.gallery figure{position:relative;margin:0;overflow:hidden;border-radius:24px;background:#20242a}.gallery .wide{grid-column:span 2}.gallery .tall{grid-row:span 2}.gallery img{width:100%;height:100%;object-fit:cover;display:block;transition:.5s ease}.gallery figure:hover img{transform:scale(1.035)}.gallery figure:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.7) 100%)}.gallery figcaption{position:absolute;z-index:2;left:18px;bottom:16px;font-size:13px;font-weight:850}
        .videos{background:#0b0d11;color:#fff;padding-top:105px}.lightTitle p{color:#aeb5be}.videoGrid{width:min(1180px,100%);margin:auto;display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:1fr 1fr;gap:14px}.videoGrid article{background:#15181d;border:1px solid #24282f;border-radius:24px;overflow:hidden}.videoGrid .videoMain{grid-row:span 2}.videoGrid video{display:block;width:100%;height:100%;min-height:230px;max-height:560px;object-fit:cover;background:#000}.videoMain video{aspect-ratio:4/3}.videoGrid article:not(.videoMain) video{aspect-ratio:16/9}.videoGrid article>div{padding:16px 18px;display:flex;flex-direction:column}.videoGrid strong{font-size:15px}.videoGrid span{font-size:12px;color:#929aa4;margin-top:4px}.allVideos{display:block;width:max-content;margin:26px auto 0;color:#fff;text-decoration:none;font-weight:900;border-bottom:1px solid #555;padding-bottom:3px}
        .delivery{display:grid;grid-template-columns:1.05fr .95fr;gap:70px;align-items:center}.deliveryVisual{position:relative;min-height:650px;border-radius:32px;overflow:hidden;background:#ddd}.deliveryVisual img{position:absolute;width:100%;height:100%;object-fit:cover}.deliveryBadge{position:absolute;left:24px;right:24px;bottom:24px;background:rgba(255,255,255,.9);backdrop-filter:blur(16px);padding:18px 20px;border-radius:18px;display:flex;flex-direction:column}.deliveryBadge strong{font-size:16px}.deliveryBadge span{font-size:12px;color:#616871;margin-top:4px}.steps{margin:32px 0}.steps>div{display:flex;gap:15px;padding:16px 0;border-top:1px solid #dedbd5}.steps b{width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:#111;color:#fff;display:grid;place-items:center;font-size:12px}.steps span{display:flex;flex-direction:column}.steps strong{font-size:15px}.steps small{color:#777e86;margin-top:4px}.textCta{color:#111;font-weight:900;text-decoration:none;border-bottom:2px solid #ff6b1a;padding-bottom:3px}
        .clientProof{background:#fff;display:grid;grid-template-columns:.8fr 1.2fr;gap:58px;align-items:center}.clientProofCopy{max-width:570px}.clientVideos{display:grid;grid-template-columns:1fr 1fr;gap:12px}.clientVideos video{width:100%;aspect-ratio:9/16;max-height:560px;object-fit:cover;background:#000;border-radius:24px}
        .faqTease{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding-top:72px;padding-bottom:72px}.faqCard{background:#fff;border:1px solid #e8e5df;border-radius:24px;padding:26px}.faqCard>span{font-size:11px;color:#f05e13;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.faqCard h3{font-size:24px;letter-spacing:-.03em;margin:15px 0 10px}.faqCard p{margin:0;color:#737a82;font-size:14px;line-height:1.55}
        .final{position:relative;margin:0 max(18px,3vw) 40px;border-radius:38px;overflow:hidden;color:#fff;min-height:600px;display:grid;place-items:center;text-align:center;background:#101318}.finalBg{position:absolute;inset:0;background:linear-gradient(rgba(6,8,11,.62),rgba(6,8,11,.85)),url("/neodrive-switch/real/stock-couleurs.webp") center/cover no-repeat;filter:saturate(.8)}.finalInner{position:relative;z-index:2;max-width:920px;padding:60px 30px}.final h2{font-size:clamp(48px,7vw,88px);margin-left:auto;margin-right:auto}.final p{color:#d4d8dd;max-width:720px;margin:0 auto}.finalActions{justify-content:center}.lightGhost{background:rgba(255,255,255,.08)}
        .floatingWhatsapp{position:fixed;right:18px;bottom:18px;z-index:9998;background:#25d366;color:#fff;text-decoration:none;border-radius:999px;padding:13px 15px 13px 18px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:950;box-shadow:0 14px 35px rgba(0,0,0,.22)}.floatingWhatsapp b{width:28px;height:28px;border-radius:50%;background:#fff;color:#1b8f49;display:grid;place-items:center}
        @media(max-width:1050px){.heroInner{grid-template-columns:1fr;gap:45px}.hero{padding-top:60px}.heroCopy{max-width:860px}.heroVisual{max-width:780px;width:100%;margin:auto}.imageCard{min-height:600px}.featureGrid{grid-template-columns:repeat(2,1fr)}.delivery{gap:38px}.clientProof{grid-template-columns:1fr}.clientProofCopy{max-width:720px}}
        @media(max-width:850px){.section{padding:72px 18px}.hero{min-height:auto;padding:48px 18px 78px}.heroInner{gap:35px}.eyebrow{font-size:10px}.hero h1{font-size:clamp(46px,14vw,72px);margin-top:18px}.lead{font-size:18px}.heroVisual{width:100%}.imageCard{min-height:520px;border-radius:25px}.floatingCard{right:10px;top:16px}.proofStrip{grid-template-columns:1fr 1fr;margin-top:-30px}.proofStrip div{padding:18px 16px}.proofStrip div:nth-child(2){border-right:0}.proofStrip div:nth-child(-n+2){border-bottom:1px solid #eee}.sectionTitle h2,.realityHead h2,.deliveryCopy h2,.clientProofCopy h2{font-size:42px}.modelGrid{grid-template-columns:1fr}.modelCard{min-height:auto}.modelCard.featured{transform:none;order:-1}.realityHead{grid-template-columns:1fr;gap:20px}.gallery{grid-template-columns:1fr 1fr;grid-auto-rows:230px}.gallery .wide{grid-column:span 2}.videoGrid{grid-template-columns:1fr;grid-template-rows:auto}.videoGrid .videoMain{grid-row:auto}.videoGrid video,.videoMain video{aspect-ratio:16/9;min-height:0}.delivery{grid-template-columns:1fr}.deliveryVisual{min-height:510px}.clientVideos{grid-template-columns:1fr 1fr}.faqTease{grid-template-columns:1fr}.final{min-height:520px;border-radius:28px}.final h2{font-size:48px}}
        @media(max-width:580px){.heroCtas,.finalActions{flex-direction:column}.heroCtas a,.finalActions a{justify-content:center;text-align:center;width:100%}.microProof{gap:8px}.microProof span{font-size:11px}.imageCard{min-height:430px}.availability{left:12px;top:12px}.heroPrice{left:18px;bottom:18px}.heroPrice strong{font-size:42px}.floatingCard{display:none}.proofStrip{width:calc(100% - 20px)}.proofStrip strong{font-size:16px}.proofStrip span{font-size:10px}.featureGrid{grid-template-columns:1fr}.gallery{grid-template-columns:1fr;grid-auto-rows:250px}.gallery .wide{grid-column:auto}.gallery .tall{grid-row:auto}.clientVideos{grid-template-columns:1fr}.clientVideos video{aspect-ratio:16/10;max-height:none}.final{margin-left:10px;margin-right:10px}.finalInner{padding:46px 19px}.final h2{font-size:40px}.floatingWhatsapp span{display:none}.floatingWhatsapp{padding:11px}.floatingWhatsapp b{width:34px;height:34px}}
      `}</style>
    </main>
  );
}
