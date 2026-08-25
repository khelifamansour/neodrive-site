"use client";

import React from "react";
import GoogleReviews from "./_components/GoogleReviews";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <span className="badge">🇫🇷 Marque toulousaine</span>
          <h1>La liberté de rouler, simplement.</h1>
          <p className="price">Dès 3 990 €</p>
          <p className="subtitle">Une voiture électrique sans permis, neuve, rassurante et accessible.</p>
          <div className="heroProof">
            <span>✓ 100% électrique</span>
            <span>✓ Livraison France</span>
            <span>✓ SAV & accompagnement</span>
          </div>
          <div className="heroActions">
            <a href="https://wa.me/33628261446" target="_blank" rel="noreferrer" className="primaryBtn">Parler avec nous</a>
            <a href="/videos" className="secondaryBtn">▶ Voir les vidéos</a>
          </div>
        </div>
      </section>

      <section className="trustBar">
        <div><strong>6 ans</strong><span>d’expérience VSP</span></div>
        <div><strong>Toulouse</strong><span>marque française</span></div>
        <div><strong>France</strong><span>livraison possible</span></div>
      </section>

      <section id="versions" className="modelsSection">
        <div className="sectionHeader">
          <span className="miniBadge">Choisissez votre NeoDrive</span>
          <h2>Un prix clair. Une voiture neuve. Un accompagnement sérieux.</h2>
          <p>Trois versions selon votre budget, votre délai et votre besoin d’autonomie.</p>
        </div>

        <div className="versions">
          <article className="card simple">
            <span className="tag green">ESSENTIEL</span>
            <h3>Essentiel</h3>
            <p className="cardPrice">3 990 € TTC</p>
            <p className="cardText">Pour accéder à une voiture électrique neuve au prix le plus bas.</p>
            <div className="infoBox"><strong>⏳ Délai</strong><span>6 à 8 mois environ</span></div>
            <ul>
              <li>Voiture neuve</li>
              <li>100% électrique</li>
              <li>Grand coffre</li>
              <li>Batterie incluse</li>
            </ul>
            <a className="chooseBtn darkBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander l’Essentiel</a>
          </article>

          <article className="card featured">
            <span className="tag orange">LA PLUS CHOISIE</span>
            <h3>Confort</h3>
            <p className="cardPrice">4 990 € TTC</p>
            <p className="cardText">Le meilleur équilibre entre prix, équipement, délai et tranquillité.</p>
            <div className="infoBox darkInfo"><strong>🚚 Livraison</strong><span>2 à 8 semaines environ</span></div>
            <div className="warranty">
              <strong>🛡️ Accompagnement jusqu’à 2 ans</strong>
              <span>Prise en charge à 100% pendant les 6 premiers mois.</span>
              <span>Puis jusqu’à 70% pris en charge par NeoDrive pendant la période restante, avec participation client minimale de 30%.</span>
              <small>Voir conditions.</small>
            </div>
            <ul>
              <li>Caméra de recul</li>
              <li>Chauffage & ventilation</li>
              <li>Bluetooth / USB</li>
              <li>Alarme antivol</li>
            </ul>
            <a className="chooseBtn orangeBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander la Confort</a>
          </article>

          <article className="card premium">
            <span className="tag purple">CONFORT PLUS+</span>
            <h3>Confort Plus+</h3>
            <p className="cardPrice">5 990 € TTC</p>
            <p className="cardText">Pour ceux qui veulent plus d’autonomie et une expérience plus complète.</p>
            <div className="infoBox"><strong>⚡ Plus+</strong><span>Lithium, charge rapide et autonomie renforcée</span></div>
            <ul>
              <li>Pack Confort inclus</li>
              <li>Charge rapide</li>
              <li>Plus d’autonomie</li>
              <li>Accompagnement renforcé</li>
            </ul>
            <a className="chooseBtn darkBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander la Plus+</a>
          </article>
        </div>
      </section>

      <section className="emotionSection">
        <div className="emotionText">
          <span className="miniBadge">Voir avant d’acheter</span>
          <h2>Une vraie voiture. De vraies livraisons. De vrais clients.</h2>
          <p>Nous préférons vous montrer le véhicule tel qu’il est réellement : présentation, intérieur, essai routier et livraisons partout en France.</p>
          <a href="/videos" className="textLink">Découvrir toutes les vidéos →</a>
        </div>
        <div className="videoFrame">
          <video controls preload="metadata" playsInline>
            <source src="/presentation1.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      <section className="clientMoments">
        <div className="sectionHeader compact">
          <span className="miniBadge">La confiance en images</span>
          <h2>Livrée chez vous, partout en France.</h2>
        </div>
        <div className="clientGrid">
          <article>
            <video controls preload="metadata" playsInline><source src="/client1.mp4" type="video/mp4" /></video>
            <div><strong>Livraison client</strong><span>Région de Strasbourg</span></div>
          </article>
          <article>
            <video controls preload="metadata" playsInline><source src="/client2.mp4" type="video/mp4" /></video>
            <div><strong>Livraison & prise en main</strong><span>Brest</span></div>
          </article>
        </div>
      </section>

      <GoogleReviews />

      <section className="finalCta">
        <span>NeoDrive</span>
        <h2>Votre prochaine voiture peut être simple, accessible et rassurante.</h2>
        <p>Posez-nous vos questions, demandez les disponibilités ou une vidéo personnalisée du véhicule.</p>
        <div className="ctaActions">
          <a href="https://wa.me/33628261446" target="_blank" rel="noreferrer" className="primaryBtn">💬 WhatsApp</a>
          <a href="/videos" className="secondaryDark">Voir les vidéos</a>
        </div>
      </section>

      <footer className="footer">
        <strong>NeoDrive</strong>
        <span>31 rue Jean Nougaro, 31600 Muret</span>
        <span>SIREN 908 645 393</span>
      </footer>

      <style jsx global>{`
        html, body { margin:0; padding:0; width:100%; max-width:100%; overflow-x:hidden; background:#fff; }
        * { box-sizing:border-box; }
      `}</style>

      <style jsx>{`
        .page{width:100%;overflow:hidden;background:#fff;color:#101010;font-family:Arial,sans-serif}
        .hero{position:relative;min-height:700px;background:url('/hero.png') center/cover no-repeat;display:flex;align-items:center;padding:80px 8%;color:#fff}
        .heroOverlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.46) 45%,rgba(0,0,0,.12) 100%)}
        .heroContent{position:relative;z-index:1;max-width:760px}
        .badge,.miniBadge{display:inline-block;border-radius:999px;font-weight:900}.badge{background:rgba(255,255,255,.95);color:#111;padding:10px 16px;font-size:14px}.miniBadge{background:#fff3e8;color:#f97316;padding:9px 14px;font-size:12px;letter-spacing:.5px}
        h1{font-size:clamp(50px,7vw,88px);line-height:.94;letter-spacing:-4px;margin:20px 0 0;font-weight:950}
        .price{font-size:clamp(44px,6vw,70px);font-weight:950;color:#ff8a00;margin:22px 0 8px}.subtitle{font-size:22px;line-height:1.5;max-width:580px;color:#f2f2f2;margin:0}
        .heroProof{display:flex;flex-wrap:wrap;gap:10px;margin-top:25px}.heroProof span{padding:10px 13px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.10);backdrop-filter:blur(8px);border-radius:999px;font-size:14px;font-weight:800}
        .heroActions,.ctaActions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.heroActions a,.ctaActions a{text-decoration:none;padding:15px 20px;border-radius:15px;font-weight:950}.primaryBtn{background:#25d366;color:white}.secondaryBtn{background:white;color:#111}.secondaryDark{background:#1d1d1d;color:white}
        .trustBar{width:min(1040px,calc(100% - 48px));margin:-34px auto 80px;position:relative;z-index:3;display:grid;grid-template-columns:repeat(3,1fr);background:white;border-radius:24px;box-shadow:0 20px 55px rgba(0,0,0,.12);overflow:hidden}.trustBar div{padding:25px 20px;text-align:center;border-right:1px solid #eee}.trustBar div:last-child{border-right:none}.trustBar strong{display:block;font-size:23px}.trustBar span{display:block;color:#6a6a6a;font-size:14px;margin-top:4px}
        .modelsSection,.clientMoments{padding:20px 7% 90px}.sectionHeader{max-width:760px;margin:0 auto 42px;text-align:center}.sectionHeader h2,.emotionText h2,.finalCta h2{font-size:clamp(36px,5vw,56px);line-height:1.04;letter-spacing:-2px;margin:14px 0 0;font-weight:950}.sectionHeader p,.emotionText p,.finalCta p{font-size:18px;line-height:1.65;color:#666}.versions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;max-width:1180px;margin:0 auto}.card{min-width:0;border-radius:30px;padding:32px;background:#fff;border:1px solid #e9e9e9;box-shadow:0 18px 50px rgba(0,0,0,.07);display:flex;flex-direction:column}.featured{background:linear-gradient(180deg,#111,#1d1d1d);color:#fff;transform:translateY(-14px);box-shadow:0 30px 70px rgba(0,0,0,.22)}.premium{background:linear-gradient(180deg,#fff,#fbf7ff)}
        .tag{width:max-content;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:950}.green{background:#dcfce7;color:#16803c}.orange{background:#f97316;color:#fff}.purple{background:#ede9fe;color:#6d28d9}.card h3{font-size:29px;margin:18px 0 6px}.cardPrice{font-size:38px;font-weight:950;margin:0 0 12px}.cardText{font-size:17px;line-height:1.55;color:inherit;opacity:.88;margin:0 0 18px}.infoBox,.warranty{padding:15px 16px;border-radius:17px;background:#f4f4f5;display:flex;flex-direction:column;gap:5px;margin-bottom:16px}.darkInfo,.warranty{background:rgba(255,255,255,.1)}.infoBox span,.warranty span{font-size:14px;line-height:1.45;color:#555}.darkInfo span,.warranty span{color:#e7e7e7}.warranty strong{font-size:16px}.warranty small{color:#bbb;margin-top:2px}.card ul{list-style:none;padding:0;margin:4px 0 26px}.card li{position:relative;padding-left:26px;margin:10px 0;font-size:16px;line-height:1.4}.card li:before{content:'✓';position:absolute;left:0;color:#f97316;font-weight:950}.chooseBtn{margin-top:auto;text-decoration:none;text-align:center;padding:15px 16px;border-radius:15px;font-weight:950}.darkBtn{background:#111;color:white}.orangeBtn{background:linear-gradient(135deg,#ff7a00,#ff006e);color:white}
        .emotionSection{width:min(1180px,calc(100% - 48px));margin:0 auto 100px;display:grid;grid-template-columns:.9fr 1.1fr;gap:42px;align-items:center;background:#0c0c0c;color:#fff;border-radius:34px;padding:44px}.emotionText p{color:#d1d1d1}.textLink{display:inline-block;margin-top:8px;color:#fff;text-decoration:none;font-weight:950}.videoFrame{border-radius:24px;overflow:hidden;background:#000}.videoFrame video,.clientGrid video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#000}
        .compact{margin-bottom:28px}.clientGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;max-width:1080px;margin:0 auto}.clientGrid article{overflow:hidden;border-radius:24px;background:#fff;border:1px solid #eee;box-shadow:0 14px 36px rgba(0,0,0,.07)}.clientGrid article div{padding:17px 20px;display:flex;justify-content:space-between;gap:10px}.clientGrid span{color:#777}
        .finalCta{margin:10px 7% 70px;padding:58px;border-radius:34px;background:radial-gradient(circle at top left,#2d3b52,#090909 65%);color:white;text-align:center}.finalCta>span{font-weight:950;color:#ff8a00;letter-spacing:1px}.finalCta p{color:#d7d7d7;max-width:680px;margin:18px auto 0}.ctaActions{justify-content:center}.footer{padding:24px 7%;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;border-top:1px solid #eee;color:#666;font-size:14px}
        @media(max-width:900px){
          .hero{min-height:650px;padding:48px 22px;align-items:flex-end;background-position:58% center}.heroOverlay{background:linear-gradient(180deg,rgba(0,0,0,.16) 0%,rgba(0,0,0,.4) 45%,rgba(0,0,0,.88) 100%)}h1{font-size:48px;letter-spacing:-2.4px}.price{font-size:44px}.subtitle{font-size:18px}.heroProof{gap:7px}.heroProof span{font-size:12px;padding:8px 10px}.heroActions a{flex:1;text-align:center;min-width:145px}
          .trustBar{width:calc(100% - 28px);margin:-22px auto 54px;border-radius:20px}.trustBar div{padding:18px 8px}.trustBar strong{font-size:18px}.trustBar span{font-size:11px}
          .modelsSection,.clientMoments{padding:10px 16px 62px}.sectionHeader{margin-bottom:28px}.sectionHeader h2,.emotionText h2,.finalCta h2{font-size:34px;letter-spacing:-1.4px}.sectionHeader p,.emotionText p,.finalCta p{font-size:16px}.versions{grid-template-columns:1fr;gap:16px}.card{padding:24px;border-radius:24px;box-shadow:0 10px 28px rgba(0,0,0,.06)}.featured{transform:none;order:-1}.card h3{font-size:25px}.cardPrice{font-size:34px}.cardText{font-size:16px}.card ul{margin-bottom:20px}.card li{font-size:15px}.warranty span{font-size:13px}
          .emotionSection{width:calc(100% - 28px);margin-bottom:62px;grid-template-columns:1fr;padding:24px;border-radius:26px;gap:24px}.emotionText{text-align:left}.videoFrame{border-radius:18px}.clientGrid{grid-template-columns:1fr;gap:16px}.clientGrid article div{padding:14px 16px;font-size:14px}.finalCta{margin:0 14px 42px;padding:36px 22px;border-radius:26px}.ctaActions{flex-direction:column}.ctaActions a{width:100%}.footer{padding:22px 18px;flex-direction:column}
        }
        @media(max-width:480px){.hero{min-height:610px;padding:34px 16px}.badge{font-size:12px;padding:8px 12px}h1{font-size:41px}.price{font-size:40px;margin-top:16px}.subtitle{font-size:17px}.heroProof span:nth-child(3){display:none}.heroActions{margin-top:20px}.trustBar{grid-template-columns:repeat(3,1fr)}.trustBar span{display:none}.trustBar strong{font-size:16px}.modelsSection,.clientMoments{padding-left:12px;padding-right:12px}.sectionHeader h2,.emotionText h2,.finalCta h2{font-size:30px}.card{padding:21px}.featured .warranty span:nth-of-type(2){font-size:12.5px}.emotionSection{width:calc(100% - 20px)}.clientGrid article div{flex-direction:column;gap:4px}}
      `}</style>
    </main>
  );
}
