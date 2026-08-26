"use client";

import { useState } from "react";

const photos = [
  { src: "/neodrive-deux-roues/cameleon/cameleon-5931.webp", label: "Vue 3/4 avant" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5930.webp", label: "Profil gauche" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5933.webp", label: "Vue 3/4 droite" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5936.webp", label: "Profil droit" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5932.webp", label: "Vue avant" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5938.webp", label: "Vue arrière gauche" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5941.webp", label: "Vue arrière droite" },
  { src: "/neodrive-deux-roues/cameleon/cameleon-5939.webp", label: "Vue arrière" },
];

const specs = [
  ["1 500 W", "Puissance moteur"],
  ["72 V · 30 Ah", "Batterie"],
  ["60 km/h*", "Vitesse fabricant"],
  ["120–150 km*", "Autonomie annoncée"],
  ["6 à 8 h", "Temps de recharge"],
  ["150 kg", "Charge nominale"],
];

export default function LightMobility() {
  const [active, setActive] = useState(0);

  return (
    <main className="page">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">NOUVEAU · NEODRIVE DEUX ROUES</span>
          <h1>NeoDrive<br/><em>Caméléon 1500</em></h1>
          <p className="lead">Le scooter électrique qui s’adapte à votre quotidien.</p>
          <div className="heroSpecs">
            <span><b>1 500 W</b> moteur électrique</span>
            <span><b>72 V · 30 Ah</b> batterie</span>
            <span><b>Disques AV/AR</b> freinage</span>
          </div>
          <div className="actions">
            <a className="primary" href="#galerie">Voir toutes les photos</a>
            <a className="whatsapp" href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20des%20informations%20sur%20le%20NeoDrive%20Cam%C3%A9l%C3%A9on%201500" target="_blank" rel="noreferrer">Demander le tarif</a>
          </div>
        </div>
        <div className="heroVisual">
          <img src={photos[0].src} alt="Scooter électrique NeoDrive Caméléon 1500, vue trois-quarts avant" />
          <div className="colorBadge"><i/> Vert Caméléon</div>
        </div>
      </section>

      <section className="trust">
        <article><span>01</span><b>100 % électrique</b><small>Silencieux et simple à recharger</small></article>
        <article><span>02</span><b>Conçu pour le quotidien</b><small>Travail, études, courses et rendez-vous</small></article>
        <article><span>03</span><b>Style distinctif</b><small>Une silhouette moderne et reconnaissable</small></article>
      </section>

      <section id="galerie" className="gallerySection">
        <div className="sectionHeading">
          <div><span className="eyebrow">GALERIE PRODUIT</span><h2>Découvrez-le sous tous les angles.</h2></div>
          <p>Choisissez une vue pour examiner le design, les roues, l’éclairage, la selle et les finitions du Caméléon 1500.</p>
        </div>
        <div className="gallery">
          <div className="mainPhoto">
            <img src={photos[active].src} alt={`NeoDrive Caméléon 1500 — ${photos[active].label}`} />
            <span>{active + 1} / {photos.length} · {photos[active].label}</span>
            <button className="previous" onClick={() => setActive((active - 1 + photos.length) % photos.length)} aria-label="Photo précédente">‹</button>
            <button className="next" onClick={() => setActive((active + 1) % photos.length)} aria-label="Photo suivante">›</button>
          </div>
          <div className="thumbnails" role="tablist" aria-label="Choisir une photo">
            {photos.map((photo, index) => (
              <button key={photo.src} className={active === index ? "selected" : ""} onClick={() => setActive(index)} aria-label={photo.label} aria-selected={active === index} role="tab">
                <img src={photo.src} alt="" />
                <small>{photo.label}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="details">
        <div className="detailsCopy">
          <span className="eyebrow">CAMÉLÉON 1500</span>
          <h2>Une mobilité plus légère, sans sacrifier le style.</h2>
          <p>Compact en ville, confortable pour les déplacements réguliers et immédiatement reconnaissable avec sa finition vert profond : le Caméléon 1500 a été pensé pour remplacer la voiture sur de nombreux trajets courts.</p>
          <ul>
            <li><b>Assise deux places</b><span>Selle longue et dosseret passager</span></li>
            <li><b>Freinage à disque</b><span>À l’avant comme à l’arrière</span></li>
            <li><b>Plancher plat</b><span>Accès simple et position confortable</span></li>
          </ul>
        </div>
        <div className="specPanel">
          <span>FICHE TECHNIQUE</span>
          <div className="specGrid">{specs.map(([value, label]) => <div key={label}><b>{value}</b><small>{label}</small></div>)}</div>
          <a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20recevoir%20la%20fiche%20du%20NeoDrive%20Cam%C3%A9l%C3%A9on%201500" target="_blank" rel="noreferrer">Recevoir la fiche complète →</a>
        </div>
      </section>

      <section className="cta">
        <div><span>DISPONIBILITÉ & TARIF</span><h2>Le Caméléon vous intéresse ?</h2><p>Échangez directement avec NeoDrive pour connaître la configuration proposée, le tarif et les prochaines disponibilités.</p></div>
        <a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20conna%C3%AEtre%20le%20prix%20et%20la%20disponibilit%C3%A9%20du%20NeoDrive%20Cam%C3%A9l%C3%A9on%201500" target="_blank" rel="noreferrer">Contacter NeoDrive</a>
      </section>

      <p className="legal">*Données issues de la fiche technique du fabricant, à confirmer selon la version commercialisée et son homologation. L’autonomie réelle varie selon la vitesse, la charge, la température et les conditions d’utilisation. La vitesse autorisée, l’immatriculation, le permis requis et l’utilisation sur voie publique dépendent de la version homologuée.</p>

      <style jsx>{`
        .page{--ink:#10201b;--green:#0f6658;--mist:#f3f7f4;background:#fff;color:var(--ink);overflow:hidden}.hero{min-height:650px;padding:72px max(24px,calc((100vw - 1180px)/2));display:grid;grid-template-columns:.82fr 1.18fr;gap:54px;align-items:center;background:radial-gradient(circle at 82% 30%,#dceee8 0,transparent 32%),linear-gradient(140deg,#edf5f1 0%,#fbfcfb 66%)}.eyebrow,.cta span,.specPanel>span{font-size:12px;font-weight:950;letter-spacing:1.8px;color:var(--green)}h1{font-size:clamp(54px,7vw,92px);line-height:.89;letter-spacing:-4.5px;margin:16px 0 20px}h1 em{font-style:normal;color:var(--green)}.lead{font-size:21px;line-height:1.55;color:#53635d;max-width:530px}.heroSpecs{display:flex;gap:9px;flex-wrap:wrap;margin:24px 0}.heroSpecs span{background:#fff;border:1px solid #dce7e1;padding:10px 12px;border-radius:999px;font-size:13px;color:#53635d}.heroSpecs b{color:var(--ink)}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions a,.cta a{padding:15px 20px;border-radius:13px;text-decoration:none;font-weight:900}.primary{background:var(--ink);color:#fff}.whatsapp,.cta a{background:#25d366;color:#fff}.heroVisual{position:relative;background:#fff;border-radius:34px;padding:10px;box-shadow:0 30px 80px rgba(13,71,57,.14)}.heroVisual img{display:block;width:100%;height:475px;object-fit:cover;border-radius:27px}.colorBadge{position:absolute;right:24px;bottom:24px;display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:999px;background:rgba(16,32,27,.92);color:#fff;font-size:12px;font-weight:900}.colorBadge i{width:13px;height:13px;border-radius:50%;background:#126c61;border:2px solid #b8df32}.trust{width:min(1100px,calc(100% - 36px));margin:-34px auto 85px;position:relative;background:#fff;border-radius:24px;box-shadow:0 20px 55px rgba(21,60,48,.11);display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden}.trust article{padding:25px 28px;display:grid;gap:4px;border-right:1px solid #e8eeea}.trust article:last-child{border:0}.trust span{font-size:11px;color:var(--green);font-weight:950}.trust b{font-size:17px}.trust small{color:#6a7872}.gallerySection{max-width:1180px;margin:0 auto 100px;padding:0 20px}.sectionHeading{display:grid;grid-template-columns:1.15fr .85fr;gap:45px;align-items:end;margin-bottom:35px}.sectionHeading h2,.details h2,.cta h2{font-size:clamp(38px,5vw,60px);line-height:.98;letter-spacing:-3px;margin:10px 0}.sectionHeading p,.detailsCopy>p,.cta p{font-size:17px;line-height:1.65;color:#66736e}.gallery{display:grid;grid-template-columns:1fr 180px;gap:14px}.mainPhoto{position:relative;background:var(--mist);border-radius:30px;overflow:hidden;min-height:610px}.mainPhoto>img{width:100%;height:610px;object-fit:cover;display:block}.mainPhoto>span{position:absolute;left:22px;bottom:20px;background:rgba(16,32,27,.9);color:#fff;border-radius:999px;padding:10px 13px;font-size:12px;font-weight:850}.mainPhoto>button{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:1px solid #dfe7e2;background:rgba(255,255,255,.92);font-size:32px;color:var(--ink);cursor:pointer;box-shadow:0 7px 20px #0002}.previous{left:18px}.next{right:18px}.thumbnails{display:grid;grid-template-columns:1fr;gap:8px;max-height:610px;overflow:auto;padding-right:3px}.thumbnails button{border:2px solid transparent;background:#f4f6f4;border-radius:15px;padding:5px;cursor:pointer;text-align:left;color:#617069}.thumbnails button.selected{border-color:var(--green);background:#eaf3ef}.thumbnails img{width:100%;height:82px;object-fit:cover;border-radius:10px;display:block}.thumbnails small{display:block;padding:5px 4px 2px;font-size:10px;font-weight:800}.details{padding:90px max(24px,calc((100vw - 1140px)/2));background:#0e211b;color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.detailsCopy>p{color:#bfd0c9}.detailsCopy ul{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:14px}.detailsCopy li{display:grid;grid-template-columns:180px 1fr;gap:12px;padding-bottom:14px;border-bottom:1px solid #ffffff1c}.detailsCopy li span{color:#aebfb8}.specPanel{background:#fff;color:var(--ink);border-radius:28px;padding:34px}.specGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0 25px}.specGrid div{background:var(--mist);border-radius:15px;padding:16px}.specGrid b,.specGrid small{display:block}.specGrid b{font-size:20px}.specGrid small{color:#718079;margin-top:3px}.specPanel>a{color:var(--green);text-decoration:none;font-weight:950}.cta{max-width:1140px;margin:85px auto 30px;padding:52px;border-radius:30px;background:linear-gradient(135deg,#eaf4ef,#dff0e8);display:flex;justify-content:space-between;align-items:center;gap:45px}.cta h2{margin-bottom:8px}.cta p{max-width:700px;margin-bottom:0}.cta a{white-space:nowrap}.legal{max-width:1050px;margin:0 auto;padding:0 20px 45px;text-align:center;color:#7b8782;font-size:12px;line-height:1.55}
        @media(max-width:900px){.hero{grid-template-columns:1fr;padding:40px 16px 30px;min-height:auto;gap:30px}h1{font-size:50px;letter-spacing:-3px}.lead{font-size:17px}.heroVisual{padding:5px;border-radius:23px}.heroVisual img{height:360px;border-radius:19px}.trust{grid-template-columns:1fr;margin:14px auto 58px}.trust article{padding:16px 20px;border-right:0;border-bottom:1px solid #e8eeea}.sectionHeading,.details{grid-template-columns:1fr}.sectionHeading{gap:2px}.gallery{grid-template-columns:1fr}.mainPhoto,.mainPhoto>img{min-height:0;height:360px}.thumbnails{grid-template-columns:repeat(4,1fr);max-height:none;overflow:visible}.thumbnails small{display:none}.thumbnails img{height:70px}.details{padding:58px 20px;gap:34px}.detailsCopy li{grid-template-columns:1fr;gap:4px}.specPanel{padding:23px}.cta{margin:55px 14px 25px;padding:30px 22px;display:grid}.cta a{text-align:center}.sectionHeading h2,.details h2,.cta h2{font-size:39px;letter-spacing:-2px}}
        @media(max-width:430px){.heroVisual img,.mainPhoto,.mainPhoto>img{height:290px}.heroSpecs span{font-size:11px}.mainPhoto>button{width:40px;height:40px}.thumbnails{grid-template-columns:repeat(4,1fr)}.thumbnails img{height:54px}.specGrid{grid-template-columns:1fr 1fr}.specGrid b{font-size:17px}}
      `}</style>
    </main>
  );
}
