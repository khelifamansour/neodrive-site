"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  images: string[];
  video: string;
  specs: { value: string; label: string }[];
  benefits: string[];
};

const products: Product[] = [
  {
    id: "zj150",
    name: "NeoDrive Pro ZJ150",
    subtitle: "Le compact agile",
    description: "Un tricycle utilitaire facile à prendre en main, pensé pour les petits transports quotidiens, l’entretien et les espaces où un utilitaire classique devient encombrant.",
    accent: "#b43b33",
    images: Array.from({ length: 8 }, (_, i) => `/neodrive-pro/zj150/zj150-${String(i + 1).padStart(2, "0")}.webp`),
    video: "/neodrive-pro/zj150/zj150-presentation.mp4",
    specs: [
      { value: "1,50 × 1,10 m", label: "Benne acier" },
      { value: "300 kg*", label: "Charge utile" },
      { value: "1 000 W", label: "Moteur électrique" },
      { value: "50–70 km*", label: "Autonomie annoncée" },
      { value: "25 / 35 km/h*", label: "Vitesse selon version" },
      { value: "2,85 m", label: "Longueur totale" },
    ],
    benefits: ["Format compact", "Ridelles rabattables", "Benne acier", "Double vitesse"],
  },
  {
    id: "jb150",
    name: "NeoDrive Pro JB150",
    subtitle: "La force hydraulique",
    description: "La version conçue pour charger davantage et décharger sans effort grâce à sa benne basculante hydraulique. Une solution adaptée aux usages professionnels plus intensifs.",
    accent: "#1569c7",
    images: Array.from({ length: 5 }, (_, i) => `/neodrive-pro/jb150/jb150-0${i + 1}.webp`),
    video: "/neodrive-pro/jb150/jb150-presentation.mp4",
    specs: [
      { value: "1,50 × 1,10 m", label: "Grande benne acier" },
      { value: "500 kg*", label: "Charge utile" },
      { value: "1 500 W", label: "Moteur électrique" },
      { value: "40–60 km*", label: "Autonomie annoncée" },
      { value: "25 / 42 km/h*", label: "Vitesse selon version" },
      { value: "1 200 W", label: "Pompe hydraulique" },
    ],
    benefits: ["Benne hydraulique", "Charge renforcée", "Ridelles rabattables", "Structure acier"],
  },
  {
    id: "yc3",
    name: "NeoDrive Pro YC3-16K",
    subtitle: "Le confort professionnel",
    description: "Un poste de conduite protégé par un toit et un pare-brise, une assise généreuse et la plus grande benne de la gamme pour les tournées et les usages réguliers.",
    accent: "#d56824",
    images: Array.from({ length: 6 }, (_, i) => `/neodrive-pro/yc3/yc3-00${i}.webp`),
    video: "/neodrive-pro/yc3/yc3-presentation.mp4",
    specs: [
      { value: "1,60 × 1,20 m", label: "Plus grande benne" },
      { value: "280 kg*", label: "Charge utile" },
      { value: "1 500 W", label: "Moteur électrique" },
      { value: "50–60 km*", label: "Autonomie annoncée" },
      { value: "25 / 40 km/h*", label: "Vitesse selon version" },
      { value: "Toit + pare-brise", label: "Protection conducteur" },
    ],
    benefits: ["Grande benne", "Pare-brise avec essuie-glace", "Toit de protection", "Double assise"],
  },
];

const uses = [
  ["01", "Agriculture", "Cagettes, aliments, outils, petites récoltes et déplacements dans l’exploitation."],
  ["02", "Espaces verts", "Branches, sacs, terre, végétaux et matériel d’entretien directement dans la benne."],
  ["03", "Artisans", "Transport d’outillage et de matériaux sur chantier, atelier ou zone industrielle."],
  ["04", "Collectivités", "Entretien des rues, parcs, cimetières et équipements publics sans moteur thermique bruyant."],
  ["05", "Campings & domaines", "Bagages, linge, déchets, maintenance et approvisionnement sur les voies internes."],
  ["06", "Maison & terrain", "Bois, bricolage, jardinage et trajets vers la déchetterie sans atteler de remorque."],
];

function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const current = product.images[active];

  return (
    <section id={product.id} className="product" style={{ "--accent": product.accent } as React.CSSProperties}>
      <div className="productIntro">
        <div>
          <span className="modelType">{product.subtitle}</span>
          <h2>{product.name}</h2>
        </div>
        <p>{product.description}</p>
      </div>

      <div className="showcase">
        <div className="gallery">
          <div className="mainVisual">
            {showVideo ? (
              <video src={product.video} controls playsInline preload="metadata" />
            ) : (
              <img src={current} alt={`${product.name}, vue ${active + 1}`} />
            )}
            <div className="visualControls">
              <span>{showVideo ? "Vidéo de présentation" : `Vue ${active + 1} sur ${product.images.length}`}</span>
              <button onClick={() => setShowVideo(!showVideo)}>{showVideo ? "Voir les photos" : "Voir la vidéo"}</button>
            </div>
            {!showVideo && <>
              <button className="arrow previous" onClick={() => setActive((active - 1 + product.images.length) % product.images.length)} aria-label="Photo précédente">‹</button>
              <button className="arrow next" onClick={() => setActive((active + 1) % product.images.length)} aria-label="Photo suivante">›</button>
            </>}
          </div>
          <div className="thumbs">
            {product.images.map((image, index) => (
              <button key={image} className={!showVideo && active === index ? "selected" : ""} onClick={() => { setActive(index); setShowVideo(false); }} aria-label={`Afficher la vue ${index + 1}`}>
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="productInfo">
          <div className="specGrid">
            {product.specs.map((spec) => <article key={spec.label}><b>{spec.value}</b><span>{spec.label}</span></article>)}
          </div>
          <div className="benefits">
            {product.benefits.map((benefit) => <span key={benefit}>✓ {benefit}</span>)}
          </div>
          <a className="quote" href={`https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20des%20informations%20sur%20le%20${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer">Recevoir la fiche et le tarif</a>
        </div>
      </div>
    </section>
  );
}

export default function Professional() {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">NEODRIVE PRO · TRICYCLES ÉLECTRIQUES UTILITAIRES</span>
          <h1>Une grande benne.<br/><em>Trois roues.</em><br/>Mille usages.</h1>
          <p>Transportez outils, matériaux, récoltes ou déchets verts avec un véhicule électrique compact, robuste et simple à utiliser.</p>
          <div className="actions"><a href="#gamme">Découvrir la gamme</a><a className="wa" href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20d%C3%A9couvrir%20les%20tricycles%20NeoDrive%20Pro" target="_blank" rel="noreferrer">Demander conseil</a></div>
        </div>
        <div className="heroVisual">
          <img src="/neodrive-pro/yc3/yc3-001.webp" alt="Tricycle électrique utilitaire NeoDrive Pro YC3-16K" />
          <div className="heroBadge"><b>Jusqu’à 1,60 × 1,20 m</b><span>de surface de benne selon modèle</span></div>
        </div>
      </section>

      <section className="proof">
        <article><b>100 % électrique</b><span>Une motorisation silencieuse, sans échappement au point d’usage.</span></article>
        <article><b>Jusqu’à 500 kg*</b><span>Une vraie capacité de chargement dans un format compact.</span></article>
        <article><b>Acier robuste</b><span>Structure et benne en acier conçues pour le travail quotidien.</span></article>
        <article><b>Recharge 220 V</b><span>Branchez simplement le véhicule sur une prise adaptée.</span></article>
      </section>

      <section className="statement">
        <span className="eyebrow">PLUS PRATIQUE QU’UNE BROUETTE. PLUS SIMPLE QU’UN UTILITAIRE.</span>
        <h2>Chargez. Roulez. Déchargez.</h2>
        <p>La benne est toujours avec vous. Pas de remorque à atteler, pas de moteur thermique bruyant à démarrer : le tricycle se faufile, transporte et se gare facilement.</p>
      </section>

      <section className="uses">
        <div className="usesHeading"><span className="eyebrow">UN OUTIL, DE NOMBREUX MÉTIERS</span><h2>Un même véhicule pour tous vos transports courts.</h2></div>
        <div className="usesGrid">{uses.map(([number, title, text]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="steel">
        <div className="steelImage"><img src="/neodrive-pro/zj150/zj150-02.webp" alt="Grande benne en acier du NeoDrive Pro ZJ150" /></div>
        <div className="steelCopy">
          <span className="eyebrow">PENSÉ POUR PORTER</span>
          <h2>Une grande benne en acier, accessible des trois côtés.</h2>
          <p>Les ridelles arrière et latérales se rabattent pour simplifier le chargement des objets lourds ou encombrants. La structure acier privilégie la résistance, la réparabilité et une utilisation durable.</p>
          <div className="steelFacts"><div><b>1,50 à 1,60 m</b><span>de longueur de benne</span></div><div><b>1,10 à 1,20 m</b><span>de largeur de benne</span></div></div>
        </div>
      </section>

      <section id="gamme" className="rangeHeader">
        <span className="eyebrow">LES TROIS NEODRIVE PRO</span>
        <h2>Choisissez le tricycle adapté à votre charge.</h2>
        <div className="rangeLinks"><a href="#zj150">ZJ150 · Compact</a><a href="#jb150">JB150 · Hydraulique</a><a href="#yc3">YC3-16K · Confort</a></div>
      </section>

      {products.map((product) => <ProductGallery key={product.id} product={product} />)}

      <section className="quiet">
        <div><span className="eyebrow">ÉLECTRIQUE ET DISCRET</span><h2>Travaillez sans le vacarme d’un moteur thermique.</h2></div>
        <p>La motorisation électrique réduit fortement le bruit mécanique pendant les déplacements. Un avantage appréciable tôt le matin, dans les zones résidentielles, les campings, les parcs et les espaces accueillant du public.</p>
      </section>

      <section className="finalCta">
        <div><span>VOUS HÉSITEZ ENTRE LES TROIS MODÈLES ?</span><h2>Dites-nous ce que vous transportez.</h2><p>Charge habituelle, dimensions, terrain et distance quotidienne : NeoDrive vous aide à choisir le modèle et la configuration adaptés.</p></div>
        <a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20choisir%20un%20tricycle%20NeoDrive%20Pro.%20Mon%20usage%20est%20%3A%20" target="_blank" rel="noreferrer">Parler à un conseiller</a>
      </section>

      <p className="legal">*Caractéristiques issues des fiches techniques fabricant et susceptibles de varier selon la configuration et l’homologation. Autonomie réelle variable selon la vitesse, la charge, le relief, la température et les conditions d’utilisation. L’utilisation sur voie publique dépend de la version homologuée, de l’immatriculation et du permis requis.</p>

      <style jsx>{`
        .page{--ink:#132019;--green:#226737;--lime:#a8df72;--cream:#f5f7f2;background:#fff;color:var(--ink);overflow:hidden}.eyebrow,.modelType,.finalCta span{font-size:11px;font-weight:950;letter-spacing:1.8px;text-transform:uppercase;color:#3d8550}.hero{min-height:660px;padding:70px max(24px,calc((100vw - 1180px)/2));display:grid;grid-template-columns:.82fr 1.18fr;gap:54px;align-items:center;background:linear-gradient(135deg,#0d1b11,#194729);color:#fff}.hero .eyebrow{color:#a8df72}.hero h1{font-size:clamp(52px,6.7vw,90px);line-height:.9;letter-spacing:-4.5px;margin:17px 0 22px}.hero h1 em{font-style:normal;color:var(--lime)}.hero p{max-width:600px;font-size:19px;line-height:1.6;color:#d2e1d6}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}.actions a,.quote,.finalCta a{padding:15px 20px;border-radius:13px;background:#fff;color:#132019;text-decoration:none;font-weight:950}.actions .wa,.quote,.finalCta a{background:#25d366;color:#fff}.heroVisual{position:relative;background:#fff;border-radius:34px;padding:10px;box-shadow:0 28px 80px #0005}.heroVisual img{width:100%;height:480px;object-fit:contain;border-radius:26px;display:block}.heroBadge{position:absolute;left:25px;bottom:24px;background:#122219eF;color:#fff;border-radius:18px;padding:13px 16px;display:grid}.heroBadge b{font-size:18px}.heroBadge span{font-size:11px;color:#cfdbd2}.proof{width:min(1160px,calc(100% - 32px));margin:-34px auto 90px;position:relative;background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(23,61,32,.14);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden}.proof article{padding:26px;border-right:1px solid #e8ece7;display:grid;gap:7px}.proof article:last-child{border:0}.proof b{font-size:18px}.proof span{font-size:12px;line-height:1.5;color:#6c776e}.statement{max-width:900px;margin:0 auto 100px;padding:0 20px;text-align:center}.statement h2,.uses h2,.steel h2,.rangeHeader h2,.product h2,.quiet h2,.finalCta h2{font-size:clamp(39px,5vw,62px);line-height:.98;letter-spacing:-3px;margin:11px 0 18px}.statement p{font-size:19px;line-height:1.7;color:#667068}.uses{padding:85px max(22px,calc((100vw - 1160px)/2));background:var(--cream)}.usesHeading{max-width:780px;margin-bottom:40px}.usesGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.usesGrid article{background:#fff;border-radius:22px;padding:25px;min-height:210px;border:1px solid #e4e9e2}.usesGrid article>span{font-size:12px;font-weight:950;color:#58a169}.usesGrid h3{font-size:23px;margin:30px 0 8px}.usesGrid p{font-size:14px;line-height:1.6;color:#687269}.steel{max-width:1180px;margin:100px auto;padding:0 20px;display:grid;grid-template-columns:1.08fr .92fr;gap:60px;align-items:center}.steelImage{background:#f5f7f3;border-radius:30px;padding:10px}.steelImage img{width:100%;height:500px;object-fit:contain;display:block}.steelCopy>p{font-size:17px;line-height:1.7;color:#667068}.steelFacts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:25px}.steelFacts div{background:#eef4eb;padding:18px;border-radius:16px}.steelFacts b,.steelFacts span{display:block}.steelFacts b{font-size:21px}.steelFacts span{font-size:12px;color:#687269;margin-top:4px}.rangeHeader{padding:90px 20px 55px;text-align:center;background:#102017;color:#fff}.rangeHeader .eyebrow{color:var(--lime)}.rangeHeader h2{max-width:820px;margin:12px auto 25px}.rangeLinks{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}.rangeLinks a{padding:11px 14px;border:1px solid #ffffff30;border-radius:999px;color:#fff;text-decoration:none;font-size:13px;font-weight:850}.product{padding:90px max(20px,calc((100vw - 1180px)/2));border-bottom:1px solid #e5e9e5}.product:nth-of-type(even){background:#f7f9f5}.productIntro{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end;margin-bottom:32px}.product h2{margin-bottom:0}.modelType{color:var(--accent)}.productIntro>p{font-size:17px;line-height:1.65;color:#657068}.showcase{display:grid;grid-template-columns:1.3fr .7fr;gap:28px}.mainVisual{height:555px;position:relative;background:#f1f4ef;border-radius:28px;overflow:hidden}.mainVisual>img,.mainVisual>video{width:100%;height:100%;object-fit:contain;display:block}.mainVisual>video{background:#0b0f0c}.visualControls{position:absolute;left:18px;right:18px;bottom:16px;background:rgba(15,29,20,.91);color:#fff;border-radius:15px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:850}.visualControls button{border:0;border-radius:9px;background:#fff;color:#142018;padding:8px 10px;font-weight:900;cursor:pointer}.arrow{position:absolute;top:48%;transform:translateY(-50%);width:44px;height:44px;border:1px solid #dbe3dc;border-radius:50%;background:#fffffff0;color:#132019;font-size:30px;cursor:pointer;box-shadow:0 7px 20px #0002}.previous{left:16px}.next{right:16px}.thumbs{display:flex;gap:7px;overflow:auto;margin-top:8px;padding-bottom:3px}.thumbs button{flex:0 0 90px;height:68px;border:2px solid transparent;border-radius:12px;padding:3px;background:#edf1ec;cursor:pointer}.thumbs button.selected{border-color:var(--accent)}.thumbs img{width:100%;height:100%;object-fit:cover;border-radius:8px}.productInfo{background:#17241b;color:#fff;border-radius:28px;padding:25px;align-self:start}.specGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.specGrid article{background:#ffffff0d;border:1px solid #ffffff12;border-radius:14px;padding:15px}.specGrid b,.specGrid span{display:block}.specGrid b{font-size:19px}.specGrid span{font-size:11px;color:#adbbb1;margin-top:4px}.benefits{display:flex;gap:7px;flex-wrap:wrap;margin:22px 0}.benefits span{background:#ffffff0e;padding:8px 10px;border-radius:999px;font-size:11px;color:#d9e3dc}.quote{display:block;text-align:center}.quiet{padding:85px max(24px,calc((100vw - 1120px)/2));display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center;background:#e9f4e4}.quiet p{font-size:18px;line-height:1.75;color:#516059}.finalCta{max-width:1140px;margin:85px auto 30px;padding:50px;border-radius:30px;background:linear-gradient(135deg,#15281c,#28643a);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:45px}.finalCta span{color:#a8df72}.finalCta h2{margin-bottom:8px}.finalCta p{max-width:720px;line-height:1.65;color:#c8d8cc}.finalCta a{white-space:nowrap}.legal{max-width:1050px;margin:0 auto;padding:0 20px 50px;text-align:center;color:#78817a;font-size:11px;line-height:1.6}
        @media(max-width:900px){.hero{grid-template-columns:1fr;padding:40px 16px 30px;min-height:auto;gap:28px}.hero h1{font-size:49px;letter-spacing:-2.8px}.hero p{font-size:16px}.heroVisual{padding:4px;border-radius:23px}.heroVisual img{height:340px}.proof{grid-template-columns:1fr 1fr;margin:14px auto 60px}.proof article{padding:17px}.proof article:nth-child(2){border-right:0}.statement{margin-bottom:65px}.uses{padding:60px 16px}.usesGrid{grid-template-columns:1fr 1fr}.steel{grid-template-columns:1fr;margin:65px auto;gap:32px}.steelImage img{height:340px}.product{padding:60px 14px}.productIntro,.showcase,.quiet{grid-template-columns:1fr}.productIntro{gap:5px}.mainVisual{height:370px}.productInfo{padding:20px}.quiet{padding:58px 20px;gap:10px}.finalCta{margin:55px 14px 25px;padding:30px 22px;display:grid}.finalCta a{text-align:center}.statement h2,.uses h2,.steel h2,.rangeHeader h2,.product h2,.quiet h2,.finalCta h2{font-size:39px;letter-spacing:-2px}}
        @media(max-width:520px){.proof{grid-template-columns:1fr}.proof article{border-right:0;border-bottom:1px solid #e8ece7}.usesGrid{grid-template-columns:1fr}.usesGrid article{min-height:auto}.steelFacts,.specGrid{grid-template-columns:1fr 1fr}.mainVisual{height:300px}.thumbs button{flex-basis:73px;height:56px}.visualControls{font-size:10px}.heroBadge{left:14px;bottom:13px}.heroBadge b{font-size:15px}}
      `}</style>
    </main>
  );
}
