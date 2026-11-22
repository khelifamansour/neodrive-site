import type { Metadata } from "next";
import s from "../catalogue/catalogue.module.css";

export const metadata: Metadata = {
  title: "Catalogue partenaires NeoDrive 2027 | Devenez revendeur",
  description: "Feuilletez le catalogue partenaires NeoDrive : l'entreprise, la NeoDrive Confort, ce que vous gagnez à devenir partenaire, le pack de démarrage et l'accompagnement.",
  alternates: { canonical: "https://www.easydrive-auto.fr/catalogue-pro" },
  robots: { index: false, follow: true },
  openGraph: { title: "Catalogue partenaires NeoDrive 2027", description: "Devenez partenaire NeoDrive : ouverture du réseau en avril 2027.", url: "https://www.easydrive-auto.fr/catalogue-pro", type: "website", images: ["/catalogue-pro/p-1.jpg"] },
};

const PAGES = [
  { n: 1, title: "Devenez partenaire NeoDrive" },
  { n: 2, title: "L'entreprise" },
  { n: 3, title: "La NeoDrive Confort" },
  { n: 4, title: "Un produit simple à vendre" },
  { n: 5, title: "Ce que vous gagnez à devenir partenaire" },
  { n: 6, title: "Pack de démarrage : démonstration et pièces" },
  { n: 7, title: "Du port directement à votre parc" },
  { n: 8, title: "Accompagnement" },
  { n: 9, title: "Démarrer en 5 étapes" },
];
const PDF = "/catalogue-partenaires-neodrive.pdf";

export default function CatalogueProPage() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <span className={s.eyebrow}>CATALOGUE PARTENAIRES 2027</span>
        <h1>Devenez partenaire NeoDrive.</h1>
        <p>Feuilletez notre catalogue professionnel directement ici : l’entreprise, la NeoDrive Confort, ce que vous gagnez à devenir partenaire et le pack de démarrage. Ouverture du réseau en avril 2027.</p>
        <div className={s.actions}>
          <a className={s.primary} href="/devenir-partenaire">Déposer ma candidature</a>
          <a className={s.secondary} href={PDF} target="_blank" rel="noreferrer" download>📄 Télécharger le PDF</a>
        </div>
      </section>

      <nav className={s.thumbs} aria-label="Pages du catalogue">
        {PAGES.map(p => (
          <a key={p.n} href={`#page-${p.n}`}>
            <img src={`/catalogue-pro/p-${p.n}.jpg`} alt="" loading="lazy" />
            <span>{String(p.n).padStart(2, "0")}</span>
          </a>
        ))}
      </nav>

      <div className={s.pages}>
        {PAGES.map(p => (
          <figure key={p.n} id={`page-${p.n}`} className={s.sheet}>
            <a href={`/catalogue-pro/p-${p.n}.jpg`} target="_blank" rel="noreferrer" aria-label={`Agrandir la page ${p.n}`}>
              <img src={`/catalogue-pro/p-${p.n}.jpg`} alt={`Catalogue partenaires NeoDrive, page ${p.n} : ${p.title}`} loading={p.n <= 1 ? "eager" : "lazy"} width={909} height={1287} />
            </a>
            <figcaption><b>Page {p.n} / {PAGES.length}</b><span>{p.title}</span></figcaption>
          </figure>
        ))}
      </div>

      <section className={s.cta}>
        <h2>Intéressé par le réseau NeoDrive ?</h2>
        <p>Déposez votre candidature : un conseiller NeoDrive vous recontacte pour vous présenter nos conditions.</p>
        <div className={s.actions}>
          <a className={s.primary} href="/devenir-partenaire">Devenir partenaire</a>
          <a className={s.secondary} href="mailto:contact.neodrivefrance@gmail.com">✉️ contact.neodrivefrance@gmail.com</a>
        </div>
      </section>
    </main>
  );
}
