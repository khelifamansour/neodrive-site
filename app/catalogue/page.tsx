import type { Metadata } from "next";
import GoogleReviews from "../_components/GoogleReviews";
import SocialLinks from "../_components/SocialLinks";
import s from "./catalogue.module.css";

export const metadata: Metadata = {
  title: "Catalogue NeoDrive 2026 | Voitures sans permis électriques dès 3 990 €",
  description: "Feuilletez le catalogue NeoDrive 2026 en ligne : les 3 versions (Essentielle, Confort, Confort Plus), équipements, habitacle et livraison partout en France.",
  alternates: { canonical: "https://www.easydrive-auto.fr/catalogue" },
  openGraph: { title: "Catalogue NeoDrive 2026", description: "Toute la gamme NeoDrive en 8 pages : versions, prix, équipements et livraison.", url: "https://www.easydrive-auto.fr/catalogue", type: "website", images: ["/catalogue/page-1.jpg"] },
};

const PAGES = [
  { n: 1, title: "La microcar électrique qui simplifie le quotidien" },
  { n: 2, title: "Pourquoi choisir NeoDrive ?" },
  { n: 3, title: "Choisissez votre NeoDrive : versions et prix" },
  { n: 4, title: "Design & équipements" },
  { n: 5, title: "À bord de NeoDrive" },
  { n: 6, title: "NeoDrive au quotidien" },
  { n: 7, title: "Comment ça se passe ? De la commande à la livraison" },
  { n: 8, title: "NeoDrive, la mobilité plus simple, plus libre" },
];
const PDF = "/catalogue-neodrive-2026.pdf";

export default function CataloguePage() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <span className={s.eyebrow}>CATALOGUE 2026</span>
        <h1>Toute la gamme NeoDrive, page par page.</h1>
        <p>Feuilletez notre catalogue directement ici, sans rien télécharger : les 3 versions, les équipements, l’habitacle et le déroulement de la livraison.</p>
        <div className={s.actions}>
          <a className={s.primary} href="/reservation-devis">Réserver ma NeoDrive</a>
          <a className={s.secondary} href={PDF} target="_blank" rel="noreferrer" download>📄 Télécharger le PDF</a>
        </div>
      </section>

      <nav className={s.thumbs} aria-label="Pages du catalogue">
        {PAGES.map(p => (
          <a key={p.n} href={`#page-${p.n}`}>
            <img src={`/catalogue/page-${p.n}.jpg`} alt="" loading="lazy" />
            <span>{String(p.n).padStart(2, "0")}</span>
          </a>
        ))}
      </nav>

      <div className={s.pages}>
        {PAGES.map(p => (
          <figure key={p.n} id={`page-${p.n}`} className={s.sheet}>
            <a href={`/catalogue/page-${p.n}.jpg`} target="_blank" rel="noreferrer" aria-label={`Agrandir la page ${p.n}`}>
              <img src={`/catalogue/page-${p.n}.jpg`} alt={`Catalogue NeoDrive 2026, page ${p.n} : ${p.title}`} loading={p.n <= 1 ? "eager" : "lazy"} width={1240} height={1754} />
            </a>
            <figcaption><b>Page {p.n} / {PAGES.length}</b><span>{p.title}</span></figcaption>
          </figure>
        ))}
      </div>

      <section className={s.cta}>
        <h2>Une question sur une version ?</h2>
        <p>Garantie 2 ans, service après-vente national et livraison chez vous partout en France.</p>
        <div className={s.actions}>
          <a className={s.primary} href="/reservation-devis">Réserver ma NeoDrive</a>
          <a className={s.whatsapp} href="https://wa.me/33676192234?text=Bonjour%2C%20j%27ai%20vu%20votre%20catalogue%20et%20j%27ai%20une%20question" target="_blank" rel="noreferrer">💬 Nous écrire sur WhatsApp</a>
          <a className={s.secondary} href="/videos">🎬 Voir les vidéos</a>
        </div>
      </section>
      <div style={{padding:"34px 0 42px"}}><SocialLinks/></div>
      <GoogleReviews />
    </main>
  );
}
