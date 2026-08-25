"use client";

export default function VideosPage() {
  const videos = [
    {
      title: "Présentation du véhicule chez notre partenaire",
      description: "Découvrez la NeoDrive dans un environnement réel, chez notre partenaire.",
      file: "/presentation1.mp4",
      featured: true,
    },
    {
      title: "Présentation du véhicule à l'extérieur",
      description: "Un tour complet du véhicule pour voir son gabarit, ses lignes et ses équipements.",
      file: "/presentation.mp4",
    },
    {
      title: "Découverte de l'intérieur",
      description: "Habitacle, commandes, rangements et détails pratiques du quotidien.",
      file: "/interieur.mp4",
    },
    {
      title: "Essai sur route",
      description: "Voyez la NeoDrive en circulation et découvrez son comportement sur route.",
      file: "/essai-route.mp4",
    },
    {
      title: "Livraison client – région de Strasbourg",
      description: "Une vraie livraison NeoDrive chez un client, directement sur place.",
      file: "/client1.mp4",
    },
    {
      title: "Livraison et test client – Brest",
      description: "Remise du véhicule et prise en main avec notre client à Brest.",
      file: "/client2.mp4",
    },
  ];

  return (
    <main className="videosPage">
      <section className="hero">
        <span className="eyebrow">VOIR AVANT D'ACHETER</span>
        <h1>Découvrez NeoDrive en vidéo</h1>
        <p>
          Présentation en concession, intérieur, essai routier et livraisons clients :
          voyez le véhicule dans des situations réelles avant de prendre votre décision.
        </p>
        <div className="trustLine">
          <span>✓ Véhicules réels</span>
          <span>✓ Essais réels</span>
          <span>✓ Livraisons clients</span>
        </div>
      </section>

      <section className="videosGrid">
        {videos.map((video) => (
          <article
            key={video.file}
            className={video.featured ? "videoCard featured" : "videoCard"}
          >
            <div className="videoWrap">
              <video controls preload="metadata" playsInline>
                <source src={video.file} type="video/mp4" />
                Votre navigateur ne prend pas en charge la lecture vidéo.
              </video>
              {video.featured && <span className="featuredBadge">À voir en premier</span>}
            </div>

            <div className="content">
              <h2>{video.title}</h2>
              <p>{video.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="reassurance">
        <div>
          <span>🎥</span>
          <strong>Vous voulez voir un détail précis ?</strong>
          <p>Nous pouvons aussi vous envoyer des photos ou vidéos complémentaires du véhicule.</p>
        </div>
        <a href="https://wa.me/33628261446" target="_blank" rel="noreferrer">
          Demander sur WhatsApp
        </a>
      </section>

      <style jsx>{`
        .videosPage {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          background: #f7f7f8;
          color: #111;
          padding-bottom: 72px;
        }

        .hero {
          max-width: 980px;
          margin: 0 auto;
          padding: 72px 24px 50px;
          text-align: center;
        }

        .eyebrow {
          display: inline-block;
          padding: 9px 14px;
          border-radius: 999px;
          background: #fff0e7;
          color: #f97316;
          font-weight: 950;
          font-size: 12px;
          letter-spacing: 1.3px;
          margin-bottom: 18px;
        }

        h1 {
          margin: 0;
          font-size: clamp(40px, 6vw, 68px);
          line-height: 0.98;
          letter-spacing: -3px;
          font-weight: 950;
        }

        .hero p {
          max-width: 760px;
          margin: 22px auto 0;
          color: #5d5d64;
          font-size: 19px;
          line-height: 1.65;
        }

        .trustLine {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 26px;
        }

        .trustLine span {
          background: white;
          border: 1px solid #e8e8eb;
          box-shadow: 0 8px 24px rgba(0,0,0,.04);
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 850;
        }

        .videosGrid {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 26px;
        }

        .videoCard {
          min-width: 0;
          background: white;
          border: 1px solid #e8e8ea;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(0,0,0,.07);
        }

        .videoCard.featured {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
          align-items: stretch;
          background: #101010;
          color: white;
          border-color: #101010;
        }

        .videoWrap {
          position: relative;
          width: 100%;
          min-width: 0;
          background: #000;
        }

        video {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          aspect-ratio: 16 / 9;
          object-fit: contain;
          background: #000;
        }

        .featured video {
          height: 100%;
          min-height: 360px;
          object-fit: contain;
        }

        .featuredBadge {
          position: absolute;
          left: 16px;
          top: 16px;
          z-index: 2;
          background: linear-gradient(135deg, #ff7a00, #ff006e);
          color: white;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 950;
        }

        .content {
          min-width: 0;
          padding: 24px;
        }

        .featured .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 38px;
        }

        h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.7px;
        }

        .featured h2 {
          font-size: 34px;
        }

        .content p {
          margin: 12px 0 0;
          color: #696970;
          line-height: 1.55;
          font-size: 16px;
        }

        .featured .content p {
          color: #d0d0d0;
          font-size: 17px;
        }

        .reassurance {
          width: min(1180px, calc(100% - 48px));
          margin: 38px auto 0;
          padding: 30px 34px;
          border-radius: 26px;
          background: white;
          border: 1px solid #e8e8ea;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .reassurance div > span {
          font-size: 28px;
          margin-right: 8px;
        }

        .reassurance strong {
          font-size: 21px;
        }

        .reassurance p {
          margin: 8px 0 0;
          color: #666;
          line-height: 1.5;
        }

        .reassurance a {
          flex: 0 0 auto;
          background: #25d366;
          color: white;
          text-decoration: none;
          font-weight: 950;
          padding: 15px 20px;
          border-radius: 15px;
          text-align: center;
        }

        @media (max-width: 820px) {
          .hero {
            padding: 54px 18px 34px;
          }

          h1 {
            font-size: 44px;
            letter-spacing: -2px;
          }

          .hero p {
            font-size: 17px;
          }

          .videosGrid,
          .reassurance {
            width: calc(100% - 32px);
          }

          .videosGrid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .videoCard.featured {
            grid-column: auto;
            display: block;
          }

          .featured video {
            min-height: 0;
            aspect-ratio: 16 / 9;
          }

          .featured .content {
            padding: 24px;
          }

          .featured h2 {
            font-size: 26px;
          }

          .reassurance {
            padding: 24px;
            flex-direction: column;
            align-items: stretch;
          }

          .reassurance a {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .videosPage {
            padding-bottom: 48px;
          }

          .hero {
            padding: 42px 16px 28px;
          }

          h1 {
            font-size: 38px;
            line-height: 1.02;
            letter-spacing: -1.6px;
          }

          .trustLine {
            gap: 7px;
          }

          .trustLine span {
            font-size: 12px;
            padding: 8px 10px;
          }

          .videosGrid,
          .reassurance {
            width: calc(100% - 24px);
          }

          .videoCard {
            border-radius: 20px;
          }

          .content,
          .featured .content {
            padding: 18px;
          }

          h2,
          .featured h2 {
            font-size: 22px;
          }

          .content p,
          .featured .content p {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  );
}
