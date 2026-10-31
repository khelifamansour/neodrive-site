"use client";

/** Avis Google réels de clients NeoDrive (recopiés depuis la fiche Google, prénoms + initiale). */
import { GOOGLE_PROFILE_URL } from "../../lib/reviews";

const REVIEWS = [
  { name: "Jessica A.", when: "Octobre 2026", text: "Achat sans aucun regret… Ma fille de 16 ans l’utilise tous les jours, très pratique surtout lorsqu’elle a des coupures au lycée. Très bon investissement et personnel très réactif et disponible. Je recommande sincèrement." },
  { name: "Morgane L.", when: "La Rochelle", text: "Le monsieur nous l’a livrée sur La Rochelle très rapidement en prenant le temps de tout nous expliquer. Nous avons eu un léger problème sur le chargeur, il nous a renvoyé un chargeur neuf très rapidement. Je recommande vraiment cette société très à l’écoute." },
  { name: "Gautier Z.", when: "Association", text: "Super produit, très compétitif. Nous en avons acheté trois pour notre association et nous sommes très satisfaits par la qualité par rapport au prix. C’est imbattable !" },
  { name: "Candice", when: "Yvelines", text: "Très satisfaite de mon achat ! Agréable à conduire, confortable et fonctionne très bien. Livraison rapide en 2 jours en sachant qu’on est situé dans les Yvelines. Merci pour votre professionnalisme." },
  { name: "Jean-Marie M.", when: "Alsace", text: "Conforme à ce que nous attendions. Véhicule pour un jeune en apprentissage (il sera au chaud et au sec). Réponse très rapide à la moindre question. Livraison à notre domicile en Alsace dans le délai promis." },
  { name: "Jean-François G.", when: "Août 2026", text: "Bien reçu le VSP, carte grise reçue 8 jours plus tard, satisfait de mon achat." },
  { name: "Fatiha B.", when: "Août 2026", text: "La voiture est très bien, je la charge à la maison, elle consomme pas. Ils me l’ont ramenée en bas de chez moi, pas cher. Même après la vente ils sont là pour répondre à nos questions." },
  { name: "Nicolas B.", when: "Août 2026", text: "Livraison parfaitement réalisée, le véhicule fonctionne très bien." },
  { name: "Pauline C.", when: "Octobre 2026", text: "Très réactif, professionnel et à l’écoute." },
];

export default function GoogleReviews({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "gr compact" : "gr"} aria-label="Avis clients Google">
      <div className="head">
        <div>
          <span className="eyebrow">AVIS CLIENTS GOOGLE</span>
          <h2>Ils roulent en NeoDrive.</h2>
          <p>De vrais avis, publiés par nos clients sur Google.</p>
        </div>
        <a className="all" href={GOOGLE_PROFILE_URL} target="_blank" rel="noreferrer"><span className="g">G</span><span><b>★★★★★</b><small>Voir tous les avis sur Google →</small></span></a>
      </div>
      <div className="rail" tabIndex={0}>
        {REVIEWS.map(r => (
          <figure key={r.name} className="card">
            <div className="top"><span className="stars">★★★★★</span><span className="gm">G</span></div>
            <blockquote>« {r.text} »</blockquote>
            <figcaption><b>{r.name}</b><small>{r.when}</small></figcaption>
          </figure>
        ))}
      </div>
      <style jsx>{`
        .gr{max-width:1180px;margin:70px auto;padding:0 20px;font-family:inherit;color:#111}
        .gr.compact{margin:40px auto}
        .head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:22px}
        .eyebrow{font-size:12px;font-weight:950;letter-spacing:1.6px;color:#ff5a1f}
        h2{font-size:clamp(32px,4.6vw,52px);line-height:1.02;letter-spacing:-2px;margin:10px 0 8px;font-weight:950}
        .head p{margin:0;color:#666;font-size:17px}
        .all{display:flex;align-items:center;gap:12px;text-decoration:none;color:#111;border:1px solid #e5e7eb;border-radius:18px;padding:12px 16px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.05)}
        .g,.gm{display:grid;place-items:center;border-radius:50%;background:#fff;font-weight:950;color:#4285f4;border:1px solid #e5e7eb}
        .g{width:40px;height:40px;font-size:20px}
        .gm{width:26px;height:26px;font-size:13px}
        .all b{display:block;color:#fbbc04;letter-spacing:2px}
        .all small{display:block;font-weight:800;font-size:13px}
        .rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(280px,340px);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 14px}
        .card{margin:0;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:space-between;gap:14px;background:#fff;border:1px solid #ececec;border-radius:22px;padding:22px;box-shadow:0 14px 34px rgba(0,0,0,.06)}
        .top{display:flex;justify-content:space-between;align-items:center}
        .stars{color:#fbbc04;letter-spacing:2px;font-size:18px}
        blockquote{margin:0;font-size:16px;line-height:1.6;color:#222;flex:1}
        figcaption b{display:block;font-size:15px}
        figcaption small{color:#777}
        @media(max-width:600px){.gr{margin:50px auto;padding:0 14px}.rail{grid-auto-columns:84%}.head p{font-size:15px}}
      `}</style>
    </section>
  );
}
