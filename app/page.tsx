"use client";

import React from "react";
import GoogleReviews from "./_components/GoogleReviews";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <div className="badge">🇫🇷 Marque toulousaine</div>
          <h1>La liberté de rouler, sans permis.</h1>
          <p className="price">Dès 3 990 €</p>
          <p className="subtitle">Une voiture électrique neuve, économique et bien équipée.</p>
          <div className="heroIcons">
            <div>⚡ 100% électrique</div>
            <div>💶 Prix accessible</div>
            <div>🚗 Sans permis</div>
            <div>🛠️ SAV France</div>
          </div>
          <div className="heroActions">
            <a href="/videos" className="secondaryBtn">▶ Voir les vraies vidéos</a>
            <a href="https://wa.me/33628261446" target="_blank" rel="noreferrer" className="primaryBtn">WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="trustStrip">
        <div><strong>6 ans</strong><span>d'expérience VSP</span></div>
        <div><strong>Toulouse</strong><span>marque française</span></div>
        <div><strong>France</strong><span>livraison possible</span></div>
        <div><strong>SAV</strong><span>pièces disponibles</span></div>
      </section>

      <section className="realVideoSection">
        <div className="realVideoText">
          <span className="miniBadge">Voir avant d'acheter</span>
          <h2>Pas seulement des photos : voyez la voiture en vrai.</h2>
          <p>
            Cette vidéo a été tournée chez notre partenaire. Elle vous permet de voir le véhicule,
            ses proportions et sa présentation dans un environnement réel avant de vous déplacer.
          </p>
          <div className="proofPoints">
            <span>✓ Véhicule réel</span>
            <span>✓ Présentation chez un partenaire</span>
            <span>✓ Vidéos clients disponibles</span>
          </div>
          <a href="/videos" className="textLink">Voir toutes les vidéos →</a>
        </div>
        <div className="realVideoCard">
          <video controls preload="metadata" playsInline>
            <source src="/presentation1.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      <section id="versions" className="section">
        <div className="sectionHeader">
          <span className="miniBadge">Nos modèles</span>
          <h2>3 versions. 1 même voiture.</h2>
          <p>Choisissez la version adaptée à votre budget, votre usage et votre délai de livraison.</p>
        </div>

        <div className="versions">
          <article className="card simple">
            <span className="tag green">ESSENTIEL</span>
            <h3>Version Essentiel</h3>
            <p className="cardPrice">3 990 € TTC</p>
            <p className="cardText">La solution la plus accessible pour rouler en voiture électrique sans permis.</p>
            <div className="quickInfo">
              <div><strong>⏳ Délai</strong><span>6 à 8 mois environ</span></div>
              <div><strong>🛡️ Garantie</strong><span>Structure et châssis 2 ans</span><span>Pièces 3 mois</span></div>
            </div>
            <ul>
              <li>Voiture neuve</li>
              <li>100% électrique</li>
              <li>Grand coffre</li>
              <li>Batterie incluse</li>
            </ul>
            <a className="chooseBtn lightBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander cette version</a>
          </article>

          <article className="card featured">
            <span className="tag orange">LA PLUS CHOISIE</span>
            <h3>Version Confort</h3>
            <p className="cardPrice">4 990 € TTC</p>
            <p className="cardText">Le meilleur équilibre : livraison rapide, équipements utiles et accompagnement renforcé.</p>
            <div className="quickInfo darkInfo">
              <div><strong>🚚 Livraison express</strong><span>2 à 8 semaines environ</span></div>
              <div>
                <strong>🛡️ Garantie & assistance</strong>
                <span>Structure et châssis 2 ans</span>
                <span>Pièces 6 mois</span>
                <span>Assistance technique gratuite 2 ans</span>
                <span>Remises pièces détachées jusqu’à 2 ans</span>
                <span>Réparation à domicile possible</span>
              </div>
            </div>
            <ul>
              <li>Alarme antivol</li>
              <li>Caméra de recul</li>
              <li>Chauffage & ventilation</li>
              <li>Bluetooth / USB</li>
              <li>Aide démarrage & stationnement en côte</li>
              <li>Alarme clé laissée sur contact</li>
            </ul>
            <a className="chooseBtn orangeBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander la Confort</a>
          </article>

          <article className="card premium">
            <span className="tag purple">CONFORT PLUS+</span>
            <h3>Version Confort Plus+</h3>
            <p className="cardPrice">5 990 € TTC</p>
            <p className="cardText">La version la plus complète avec plus d’autonomie et charge rapide.</p>
            <div className="quickInfo">
              <div><strong>🚚 Livraison</strong><span>Selon disponibilité</span></div>
              <div><span>Structure et châssis 2 ans</span><span>Pièces 2 ans</span><span>Assistance technique gratuite 2 ans</span></div>
            </div>
            <ul>
              <li>Pack Confort inclus</li>
              <li>Charge rapide</li>
              <li>Plus d’autonomie</li>
            </ul>
            <a className="chooseBtn lightBtn" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">Demander la Plus+</a>
          </article>
        </div>
      </section>

      <section className="clientProof">
        <div className="sectionHeader">
          <span className="miniBadge">Clients NeoDrive</span>
          <h2>Des livraisons réelles, partout en France.</h2>
          <p>Plutôt que de vous demander de nous croire sur parole, regardez nos véhicules livrés chez de vrais clients.</p>
        </div>
        <div className="clientVideos">
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

      <section id="presentation" className="presentation">
        <div className="presentationCard">
          <span className="miniBadge">Notre engagement</span>
          <h2>NeoDrive, 6 ans d’expérience</h2>
          <p>Après 6 années dans le domaine de la voiture sans permis, nous avons pris le pari de proposer une voiture neuve, bien équipée et accessible.</p>
          <p>NeoDrive est une marque toulousaine, proche de ses clients, avec un accompagnement sérieux avant et après l’achat.</p>
          <div className="stats">
            <div><span>🏅</span><strong>6 ans</strong><small>d’expérience</small></div>
            <div><span>📍</span><strong>Toulouse</strong><small>marque locale</small></div>
            <div><span>🛡️</span><strong>Neuf</strong><small>et garanti</small></div>
            <div><span>🤝</span><strong>SAV</strong><small>proche client</small></div>
          </div>
        </div>
      </section>

      <section id="avantages" className="darkSection">
        <div className="sectionHeader white">
          <span className="miniBadge darkMini">Pourquoi nous choisir</span>
          <h2>Une voiture simple, pratique et bien accompagnée.</h2>
        </div>
        <div className="advantages">
          <div><span>🎥</span><h3>Photos & vidéos</h3><p>Voyez le véhicule avant de vous déplacer.</p></div>
          <div><span>🚚</span><h3>Livraison France</h3><p>Livraison possible à domicile ou en point relais.</p></div>
          <div><span>🧾</span><h3>Documents fournis</h3><p>Facture et documents pour l’immatriculation.</p></div>
          <div><span>🛠️</span><h3>SAV & pièces</h3><p>Assistance et pièces disponibles en France.</p></div>
        </div>
      </section>

      <section id="contact" className="contact">
        <h2>Vous voulez voir le véhicule avant de décider ?</h2>
        <p>Demandez-nous les disponibilités, photos, vidéos ou une présentation à distance.</p>
        <div className="buttons"><a className="whatsappBig" href="https://wa.me/33628261446" target="_blank" rel="noreferrer">💬 WhatsApp</a></div>
      </section>

      <section className="seoLinks">
        <h2>Guides et conseils NeoDrive</h2>
        <div className="seoGrid">
          <a href="/a-propos">À propos de NeoDrive</a>
          <a href="/financement">Financement voiture sans permis</a>
          <a href="/voiture-sans-permis-electrique">Voiture sans permis électrique</a>
          <a href="/citroen-ami-ou-neodrive">Citroën Ami ou NeoDrive ?</a>
          <a href="/voiture-sans-permis-occasion">Voiture sans permis d'occasion</a>
          <a href="/quelle-voiture-sans-permis-choisir">Quelle voiture sans permis choisir ?</a>
          <a href="/prix-voiture-sans-permis">Prix d'une voiture sans permis</a>
          <a href="/fiat-topolino-ou-neodrive">Fiat Topolino ou NeoDrive ?</a>
          <a href="/meilleure-voiture-sans-permis-electrique">Meilleure voiture sans permis électrique</a>
          <a href="/assurance-voiture-sans-permis">Assurance voiture sans permis</a>
          <a href="/guide-voiture-sans-permis">Guide complet voiture sans permis</a>
          <a href="/livraison">Livraison partout en France</a>
          <a href="/carte-grise">Carte grise voiture sans permis</a>
          <a href="/pieces">Pièces détachées</a>
          <a href="/sav">Service après-vente</a>
          <a href="/faq">Questions fréquentes</a>
        </div>
      </section>

      <footer className="footer">
        <strong>NeoDrive</strong>
        <a href="/guide-voiture-sans-permis">Guide voiture sans permis</a>
        <a href="/videos">Vidéos</a>
        <span>Marque toulousaine – 31 rue Jean Nougaro, 31600 Muret</span>
        <span>SIREN 908 645 393</span>
      </footer>

      <style jsx global>{`
        html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; overflow-x: clip; background: #fff; }
        * { box-sizing: border-box; }
      `}</style>

      <style jsx>{`
        .page { width: 100%; max-width: 100%; overflow-x: clip; font-family: Arial, sans-serif; color: #111; background: white; }
        .hero { position: relative; min-height: 680px; background-image: url("/hero.png"); background-size: cover; background-position: center; display: flex; align-items: center; padding: 70px 10%; color: white; }
        .heroOverlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.76), rgba(0,0,0,.18)); }
        .heroContent { position: relative; z-index: 2; max-width: 720px; }
        .badge, .miniBadge { display: inline-block; background: white; color: #111; padding: 11px 18px; border-radius: 999px; font-weight: 950; font-size: 14px; margin-bottom: 18px; }
        .miniBadge { background: #fff3e8; color: #f97316; }
        .darkMini { background: rgba(255,255,255,.12); color: white; }
        h1 { font-size: clamp(46px, 7vw, 82px); line-height: .95; margin: 0; font-weight: 950; letter-spacing: -3px; }
        .price { color: #ff8a00; font-size: clamp(44px, 6vw, 66px); font-weight: 950; margin: 24px 0 18px; }
        .subtitle { font-size: 23px; line-height: 1.45; max-width: 560px; color: #f4f4f4; }
        .heroIcons { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-top: 30px; }
        .heroIcons div { min-width:0; background: rgba(255,255,255,.16); backdrop-filter: blur(8px); padding: 16px 10px; border-radius: 18px; text-align:center; font-weight:950; font-size:14px; }
        .heroActions { display:flex; flex-wrap:wrap; gap:12px; margin-top:22px; }
        .heroActions a { text-decoration:none; border-radius:15px; padding:15px 18px; font-weight:950; }
        .secondaryBtn { background:white; color:#111; }
        .primaryBtn { background:#25d366; color:white; }

        .trustStrip { width:min(1120px, calc(100% - 48px)); margin:-32px auto 70px; position:relative; z-index:4; background:white; border:1px solid #eee; box-shadow:0 22px 55px rgba(0,0,0,.12); border-radius:26px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); overflow:hidden; }
        .trustStrip div { min-width:0; padding:24px 18px; text-align:center; border-right:1px solid #eee; }
        .trustStrip div:last-child { border-right:0; }
        .trustStrip strong { display:block; font-size:22px; }
        .trustStrip span { display:block; color:#666; font-size:14px; margin-top:5px; }

        .realVideoSection { width:min(1180px, calc(100% - 48px)); margin:0 auto 80px; display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr); gap:44px; align-items:center; }
        .realVideoText h2, .sectionHeader h2, .presentation h2, .darkSection h2 { font-size:clamp(36px,5vw,52px); line-height:1.05; margin:0; font-weight:950; letter-spacing:-2px; }
        .realVideoText p { color:#555; font-size:18px; line-height:1.65; }
        .proofPoints { display:flex; flex-wrap:wrap; gap:8px; margin:20px 0; }
        .proofPoints span { background:#f5f5f5; border-radius:999px; padding:9px 12px; font-weight:850; font-size:13px; }
        .textLink { color:#111; font-weight:950; text-decoration:none; }
        .realVideoCard { min-width:0; border-radius:30px; overflow:hidden; background:#000; box-shadow:0 26px 65px rgba(0,0,0,.18); }
        .realVideoCard video, .clientVideos video { display:block; width:100%; max-width:100%; aspect-ratio:16/9; object-fit:contain; background:#000; }

        .section, .presentation, .darkSection, .clientProof { padding:75px 10%; }
        .sectionHeader { text-align:center; max-width:800px; margin:0 auto 44px; }
        .sectionHeader p { color:#555; font-size:19px; line-height:1.5; margin:18px auto 0; }
        .white h2 { color:white; }
        .versions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:28px; align-items:stretch; }
        .card { min-width:0; border-radius:34px; padding:34px; background:white; box-shadow:0 20px 55px rgba(0,0,0,.10); border:1px solid #eee; display:flex; flex-direction:column; }
        .simple { background:linear-gradient(180deg,#fff,#fbfffc); }
        .featured { background:linear-gradient(180deg,#060606,#222); color:white; transform:translateY(-18px); box-shadow:0 30px 75px rgba(0,0,0,.30); }
        .premium { background:linear-gradient(180deg,#fff,#fbf7ff); border:1px solid #eadcff; }
        .tag { width:fit-content; border-radius:999px; padding:9px 16px; font-size:13px; font-weight:950; margin-bottom:22px; }
        .green { color:#16a34a; background:#dcfce7; } .orange { color:white; background:#f97316; } .purple { color:#7c3aed; background:#ede9fe; }
        .card h3 { font-size:29px; margin:0 0 10px; line-height:1.12; }
        .cardPrice { font-size:38px; font-weight:950; margin:0 0 20px; }
        .cardText { font-size:18px; line-height:1.55; margin:0 0 22px; color:inherit; }
        .quickInfo { display:grid; gap:12px; margin-bottom:24px; }
        .quickInfo div { background:#f4f4f5; border-radius:18px; padding:15px 16px; display:flex; flex-direction:column; gap:4px; }
        .quickInfo strong { font-size:16px; font-weight:950; }
        .quickInfo span { color:#444; font-weight:800; line-height:1.35; }
        .darkInfo div { background:rgba(255,255,255,.12); } .darkInfo span { color:#f4f4f4; }
        ul { list-style:none; padding:0; margin:0 0 28px; }
        li { position:relative; padding-left:32px; font-size:17px; line-height:1.5; font-weight:850; margin-bottom:11px; }
        li::before { content:"✓"; position:absolute; left:0; top:0; color:#f97316; font-weight:950; }
        .chooseBtn { margin-top:auto; display:block; text-align:center; text-decoration:none; padding:17px 20px; border-radius:17px; font-weight:950; font-size:17px; }
        .lightBtn { background:#111; color:white; } .orangeBtn { background:linear-gradient(135deg,#ff7a00,#ff006e); color:white; }

        .clientProof { background:#fafafa; }
        .clientVideos { max-width:1120px; margin:0 auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; }
        .clientVideos article { min-width:0; background:white; border:1px solid #e8e8e8; border-radius:26px; overflow:hidden; box-shadow:0 16px 40px rgba(0,0,0,.07); }
        .clientVideos article div { padding:18px 20px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .clientVideos strong { font-size:18px; } .clientVideos span { color:#666; }

        .presentation { text-align:center; }
        .presentationCard { max-width:980px; margin:0 auto; background:#fafafa; border:1px solid #eee; border-radius:38px; padding:56px; }
        .presentation p { font-size:19px; line-height:1.7; color:#333; max-width:850px; margin:22px auto 0; }
        .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin-top:42px; }
        .stats div { min-width:0; background:white; border:1px solid #eee; border-radius:24px; padding:22px 14px; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .stats span { font-size:32px; } .stats strong { font-size:20px; } .stats small { color:#555; font-size:15px; }

        .darkSection { background:#050505; color:white; }
        .advantages { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin-top:42px; }
        .advantages div { min-width:0; background:linear-gradient(180deg,#242424,#141414); border:1px solid #333; border-radius:26px; padding:28px 20px; text-align:center; }
        .advantages span { font-size:36px; } .advantages h3 { margin:14px 0 8px; font-size:22px; } .advantages p { color:#ddd; margin:0; font-size:16px; line-height:1.45; }

        .contact { margin:48px 10%; border-radius:34px; padding:56px; background:radial-gradient(circle at top left,#273449,#080808 60%); color:white; text-align:center; }
        .contact h2 { font-size:clamp(36px,5vw,54px); line-height:1.05; margin:0; letter-spacing:-2px; }
        .contact p { color:#ddd; font-size:20px; line-height:1.5; max-width:700px; margin:20px auto 34px; }
        .buttons { display:flex; justify-content:center; }
        .buttons a { text-decoration:none; color:white; padding:20px 46px; border-radius:17px; font-weight:950; font-size:20px; }
        .whatsappBig { background:#25d366; }

        .seoLinks { padding:60px 10%; background:#fafafa; text-align:center; }
        .seoLinks h2 { font-size:38px; margin-bottom:28px; }
        .seoGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; }
        .seoGrid a { min-width:0; background:white; border:1px solid #eee; border-radius:18px; padding:22px; color:#111; text-decoration:none; font-weight:900; box-shadow:0 12px 35px rgba(0,0,0,.08); }
        .footer { display:flex; justify-content:space-between; gap:15px; padding:24px 10%; font-size:14px; color:#555; flex-wrap:wrap; border-top:1px solid #eee; }
        .footer a { color:#111; font-weight:800; text-decoration:none; }

        @media (max-width:900px) {
          .hero { min-height:650px; padding:48px 24px; align-items:flex-end; }
          .heroOverlay { background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.86)); }
          h1 { font-size:48px; letter-spacing:-2px; } .price { font-size:45px; } .subtitle { font-size:18px; max-width:360px; }
          .heroIcons { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .trustStrip { width:calc(100% - 32px); grid-template-columns:repeat(2,minmax(0,1fr)); margin-top:-24px; margin-bottom:54px; }
          .trustStrip div { border-bottom:1px solid #eee; }
          .realVideoSection { width:calc(100% - 36px); grid-template-columns:1fr; gap:24px; margin-bottom:58px; }
          .section, .presentation, .darkSection, .clientProof { padding:55px 24px; }
          .versions, .advantages, .clientVideos { grid-template-columns:1fr; }
          .featured { transform:none; }
          .card { padding:28px; border-radius:30px; }
          .presentationCard { padding:38px 24px; border-radius:30px; }
          .stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
          .contact { margin-left:24px; margin-right:24px; padding:36px 26px; border-radius:28px; }
          .buttons a { width:100%; text-align:center; }
          .seoLinks { padding:50px 24px; }
          .seoGrid { grid-template-columns:1fr; }
          .footer { padding:24px; flex-direction:column; }
        }

        @media (max-width:480px) {
          .hero { min-height:620px; padding:38px 18px; }
          h1 { font-size:41px; line-height:1; letter-spacing:-1.6px; }
          .price { font-size:41px; }
          .heroActions { display:grid; grid-template-columns:1fr; }
          .heroActions a { text-align:center; }
          .trustStrip { width:calc(100% - 24px); border-radius:20px; }
          .trustStrip div { padding:18px 10px; }
          .trustStrip strong { font-size:18px; } .trustStrip span { font-size:12px; }
          .realVideoSection { width:calc(100% - 24px); }
          .realVideoText h2, .sectionHeader h2, .presentation h2, .darkSection h2 { font-size:32px; line-height:1.08; }
          .section, .presentation, .darkSection, .clientProof { padding:48px 18px; }
          .sectionHeader p { font-size:17px; }
          .card h3 { font-size:25px; } .cardPrice { font-size:32px; } .cardText, li { font-size:16px; }
          .contact { margin-left:18px; margin-right:18px; padding:32px 24px; }
          .contact h2 { font-size:32px; }
          .seoLinks { padding:44px 18px; }
          .seoLinks h2 { font-size:30px; }
        }
      `}</style>
    </main>
  );
}
