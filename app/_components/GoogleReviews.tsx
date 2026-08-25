"use client";

export default function GoogleReviews(){
  const rating=process.env.NEXT_PUBLIC_GOOGLE_RATING||"4,8";
  const count=process.env.NEXT_PUBLIC_GOOGLE_REVIEW_COUNT||"9";
  const url=process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL||"https://g.page/r/CY-pd6eO0lLtEBM/review";
  const testimonialUrl="https://share.google/kr0l1LnJs6n3pKfSe";

  const reviewCards = [
    { label:"Témoignage 5 étoiles", sub:"Avis client partagé sur Google", href:testimonialUrl, featured:true },
    { label:"Avis client NeoDrive", sub:"Consulter le retour sur Google", href:url },
    { label:"Expérience après livraison", sub:"Voir les avis publics de nos clients", href:url },
    { label:"Retour d’un client", sub:"Découvrir les témoignages Google", href:url },
    { label:"Avis sur l’accompagnement", sub:"Lire les retours clients", href:url },
    { label:"Avis sur la NeoDrive", sub:"Voir les expériences publiées", href:url },
  ];

  return (
    <section className="reviewsWrap">
      <section className="reviewsHead">
        <div className="intro">
          <span className="eyebrow">AVIS CLIENTS GOOGLE</span>
          <h2>Ce sont nos clients qui parlent le mieux de nous.</h2>
          <p>Des retours publics, consultables directement sur Google. Pas de témoignages inventés : vous pouvez ouvrir les avis originaux.</p>
        </div>
        <div className="score">
          <div className="googleMark">G</div>
          <div className="stars">★★★★★</div>
          <strong>{rating}/5</strong>
          <span>{count} avis Google</span>
          <a href={url} target="_blank" rel="noreferrer">Voir tous les avis →</a>
        </div>
      </section>

      <div className="reviewsTitleRow">
        <div>
          <span>TÉMOIGNAGES</span>
          <strong>Quelques retours à découvrir</strong>
        </div>
        <small>Faites défiler →</small>
      </div>

      <div className="reviewsRail" aria-label="Témoignages clients Google">
        {reviewCards.map((review, index)=>(
          <a key={index} className={review.featured ? "reviewCard featured" : "reviewCard"} href={review.href} target="_blank" rel="noreferrer">
            <div className="cardTop">
              <span className="googleMini">G</span>
              {review.featured ? <span className="fiveStars">★★★★★</span> : <span className="googleLabel">Avis Google</span>}
            </div>
            <strong>{review.label}</strong>
            <p>{review.sub}</p>
            <span className="readMore">Lire sur Google →</span>
          </a>
        ))}
      </div>

      <style jsx>{`
        .reviewsWrap{max-width:1160px;margin:30px auto 90px;padding:0 14px}
        .reviewsHead{padding:46px;border-radius:32px;background:linear-gradient(135deg,#111 0%,#1d1d1d 70%,#292929 100%);color:#fff;display:grid;grid-template-columns:1.35fr .65fr;gap:40px;align-items:center;box-shadow:0 24px 65px rgba(0,0,0,.16)}
        .eyebrow{font-size:12px;font-weight:950;letter-spacing:1.7px;color:#ff8a00}
        .intro h2{font-size:clamp(34px,4vw,52px);line-height:1.03;letter-spacing:-2px;margin:10px 0 14px}
        .intro p{color:#cfcfcf;line-height:1.65;font-size:17px;max-width:650px;margin:0}
        .score{position:relative;background:#fff;color:#111;border-radius:24px;padding:28px;display:grid;gap:7px;box-shadow:0 14px 36px rgba(0,0,0,.18)}
        .googleMark{position:absolute;right:20px;top:18px;width:36px;height:36px;border-radius:12px;background:#f5f5f5;display:grid;place-items:center;font-weight:950;font-size:20px}
        .stars{font-size:24px;letter-spacing:2px;color:#f6b800}.score strong{font-size:42px;line-height:1}.score span{color:#666}.score a{margin-top:10px;color:#111;text-decoration:none;font-weight:950}
        .reviewsTitleRow{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:28px 4px 14px}.reviewsTitleRow div{display:grid;gap:3px}.reviewsTitleRow span{font-size:11px;color:#f97316;font-weight:950;letter-spacing:1.3px}.reviewsTitleRow strong{font-size:24px}.reviewsTitleRow small{color:#777}
        .reviewsRail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(245px,1fr);gap:14px;overflow-x:auto;padding:4px 4px 16px;scroll-snap-type:x mandatory;scrollbar-width:thin}
        .reviewCard{scroll-snap-align:start;min-height:190px;padding:22px;border:1px solid #eaeaea;border-radius:22px;background:#fff;color:#111;text-decoration:none;display:flex;flex-direction:column;box-shadow:0 12px 30px rgba(0,0,0,.055);transition:transform .2s ease,box-shadow .2s ease}
        .reviewCard:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(0,0,0,.09)}
        .reviewCard.featured{background:linear-gradient(135deg,#fff8ef,#fff);border-color:#ffd6ad}
        .cardTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:17px}.googleMini{width:34px;height:34px;border-radius:11px;background:#f5f5f5;display:grid;place-items:center;font-weight:950}.fiveStars{font-size:16px;letter-spacing:1px;color:#f6b800}.googleLabel{font-size:11px;font-weight:900;color:#777;text-transform:uppercase;letter-spacing:.7px}.reviewCard>strong{font-size:19px;line-height:1.2}.reviewCard p{margin:8px 0 16px;color:#6a6a6a;font-size:14px;line-height:1.45}.readMore{margin-top:auto;font-size:13px;font-weight:950;color:#111}
        @media(max-width:780px){
          .reviewsWrap{margin:20px auto 58px;padding:0 14px}.reviewsHead{padding:28px 22px;grid-template-columns:1fr;gap:22px;border-radius:26px}.intro h2{font-size:34px;letter-spacing:-1.5px}.intro p{font-size:15px}.score{padding:22px}.score strong{font-size:36px}.reviewsTitleRow{margin-top:24px}.reviewsTitleRow strong{font-size:20px}.reviewsTitleRow small{display:none}.reviewsRail{grid-auto-columns:82%;gap:11px}.reviewCard{min-height:178px;padding:19px;border-radius:20px}
        }
      `}</style>
    </section>
  );
}
