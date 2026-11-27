import type { Metadata } from "next";
import { COMPARATIFS } from "../../lib/seo-pillars";
import { GUIDES } from "../../lib/seo-guides";
import { SITE } from "../../lib/seo-landing";

const title = "Comparatifs voitures sans permis électriques : NeoDrive face aux autres";
const description = "Ami, Topolino, Duo, Aixam, Ligier, Microcar, Alumi, Simplici… comparez chaque voiture sans permis électrique avec NeoDrive : prix, autonomie, garantie, livraison.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: `${SITE}/comparatif` }, openGraph: { title, description, url: `${SITE}/comparatif`, type: "website", siteName: "NeoDrive", locale: "fr_FR", images: [`${SITE}/hero.png`] } };

const g = (slug: string) => ({ href: GUIDES[slug].path, label: GUIDES[slug].title });
const models = [g("citroen-ami-ou-neodrive"), g("fiat-topolino-ou-neodrive"), ...Object.values(COMPARATIFS).map(p => ({ href: p.path, label: p.title }))];
const guides = [
  g("voiture-sans-permis-chinoise-prix-concession"),
  g("budget-voiture-sans-permis-2026"),
  { href: "/voiture-sans-permis-la-moins-chere", label: "La voiture sans permis électrique la moins chère" },
  g("prix-voiture-sans-permis"),
  g("meilleure-voiture-sans-permis-electrique"),
  g("quelle-voiture-sans-permis-choisir"),
];

export default function Page() {
  const items = [...models, ...guides];
  const schema = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${x.href}`, name: x.label })) };
  return <main style={{ fontFamily: "Arial,sans-serif", maxWidth: 900, margin: "0 auto", padding: "40px 20px 70px", lineHeight: 1.7 }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <h1>Comparatifs : NeoDrive face aux autres voitures sans permis électriques</h1>
    <p>Des comparatifs factuels, avec les prix publics constatés en novembre 2026 et leurs sources : prix, autonomie, garantie, livraison et paiement. NeoDrive Confort : 4 990 € TTC, en stock, livrée chez vous partout en France.</p>
    <h2>Modèle par modèle</h2>
    <ul>{models.map(x => <li key={x.href}><a href={x.href}>{x.label}</a></li>)}</ul>
    <h2>Guides prix et budget</h2>
    <ul>{guides.map(x => <li key={x.href}><a href={x.href}>{x.label}</a></li>)}</ul>
    <p><a href="/reservation-devis">Réserver une NeoDrive sans acompte</a> · <a href="/temoignage">Témoignage d’une cliente</a> · <a href="/produit">Voir la gamme</a> · <a href="/financement">Financement</a></p>
  </main>;
}
