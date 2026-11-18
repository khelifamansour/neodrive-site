import type { Metadata } from "next";
import { COMPARATIFS } from "../../lib/seo-pillars";
import { SITE } from "../../lib/seo-landing";

export const metadata: Metadata = { title: { absolute: "Comparatifs voitures sans permis électriques : NeoDrive face aux autres" }, description: "Ami, Topolino, Duo, Aixam, Ligier, Microcar, Alumi, Simplici… comparez chaque voiture sans permis électrique avec NeoDrive : prix, garantie, livraison.", alternates: { canonical: `${SITE}/comparatif` } };

export default function Page() {
  const items = [{ href: "/citroen-ami-ou-neodrive", label: "Citroën Ami ou NeoDrive" }, { href: "/fiat-topolino-ou-neodrive", label: "Fiat Topolino ou NeoDrive" }, ...Object.values(COMPARATIFS).map(p => ({ href: p.path, label: p.title }))];
  const schema = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${x.href}`, name: x.label })) };
  return <main style={{ fontFamily: "Arial,sans-serif", maxWidth: 900, margin: "0 auto", padding: "40px 20px 70px", lineHeight: 1.7 }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <h1>Comparatifs : NeoDrive face aux autres voitures sans permis électriques</h1>
    <p>Des comparatifs honnêtes, avec les prix constatés en novembre 2026 et leurs sources. Commencez par <a href="/voiture-sans-permis-la-moins-chere">le classement des prix</a>.</p>
    <ul>{items.map(x => <li key={x.href}><a href={x.href}>{x.label}</a></li>)}</ul>
    <p><a href="/reservation-devis">Réserver une NeoDrive sans acompte</a> · <a href="/produit">Voir la gamme</a></p>
  </main>;
}
