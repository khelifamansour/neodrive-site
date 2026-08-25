"use client";
export default function GoogleReviews(){
 const rating=process.env.NEXT_PUBLIC_GOOGLE_RATING||"4,8";
 const count=process.env.NEXT_PUBLIC_GOOGLE_REVIEW_COUNT||"9";
 const url=process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL||"https://g.page/r/CY-pd6eO0lLtEBM/review";
 const testimonialUrl="https://share.google/kr0l1LnJs6n3pKfSe";
 return <section className="reviewsWrap">
  <section className="reviews"><div><span className="eyebrow">AVIS CLIENTS GOOGLE</span><h2>La confiance se construit aussi après la vente.</h2><p>Consultez les retours publics laissés par nos clients et faites-vous votre propre opinion sur NeoDrive.</p></div><div className="score"><div className="stars">★★★★★</div><strong>{rating}/5</strong><span>{count} avis Google</span><a href={url} target="_blank" rel="noreferrer">Voir les avis sur Google →</a></div></section>
  <a className="testimonial" href={testimonialUrl} target="_blank" rel="noreferrer" aria-label="Lire le témoignage client 5 étoiles sur Google">
    <div className="testimonialStars">★★★★★</div>
    <div className="testimonialText"><span>TÉMOIGNAGE CLIENT</span><strong>Un avis 5 étoiles à découvrir</strong><p>Consultez directement le témoignage original publié sur Google.</p></div>
    <div className="testimonialCta">Lire le témoignage →</div>
  </a>
  <style jsx>{`
   .reviewsWrap{max-width:1132px;margin:40px auto 90px}.reviews{padding:44px;border-radius:30px;background:#111;color:#fff;display:grid;grid-template-columns:1.3fr .7fr;gap:40px;align-items:center}.eyebrow{font-size:12px;font-weight:950;letter-spacing:1.7px;color:#ff7a00}.reviews h2{font-size:clamp(32px,4vw,50px);line-height:1.05;letter-spacing:-2px;margin:10px 0}.reviews p{color:#cfcfcf;line-height:1.65;font-size:17px}.score{background:#1d1d1d;border-radius:22px;padding:26px;display:grid;gap:8px}.stars{font-size:26px;letter-spacing:3px}.score strong{font-size:40px}.score span{color:#c9c9c9}.score a{margin-top:12px;color:#fff;text-decoration:none;font-weight:900}.testimonial{margin-top:16px;padding:24px 28px;border:1px solid #ececec;border-radius:24px;background:#fff;color:#111;text-decoration:none;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:22px;box-shadow:0 14px 38px rgba(0,0,0,.06);transition:transform .2s ease,box-shadow .2s ease}.testimonial:hover{transform:translateY(-2px);box-shadow:0 18px 45px rgba(0,0,0,.09)}.testimonialStars{font-size:23px;letter-spacing:2px;white-space:nowrap}.testimonialText{display:grid;gap:4px}.testimonialText span{font-size:11px;font-weight:950;letter-spacing:1.4px;color:#f97316}.testimonialText strong{font-size:21px}.testimonialText p{margin:0;color:#666;line-height:1.45}.testimonialCta{font-weight:950;white-space:nowrap}@media(max-width:780px){.reviewsWrap{margin:25px 15px 60px}.reviews{padding:28px;grid-template-columns:1fr}.testimonial{grid-template-columns:1fr;gap:10px;padding:22px}.testimonialCta{margin-top:4px}}`}</style>
 </section>
}
