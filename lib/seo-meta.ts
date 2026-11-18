/** Métadonnées et données structurées SEO partagées (serveur). */
import type { Metadata } from "next";

export const SITE = "https://www.easydrive-auto.fr";
export const OG_IMAGE = `${SITE}/hero.png`;
export const SOCIALS = [
  "https://www.facebook.com/profile.php?id=61591548669494",
  "https://www.instagram.com/neodrivefrance/",
  "https://www.tiktok.com/@neodrive72",
];

/** Métadonnées complètes d'une page : titre, description, canonical, Open Graph, Twitter. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  const url = `${SITE}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "NeoDrive", locale: "fr_FR", images: [{ url: OG_IMAGE }] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "NeoDrive",
  legalName: "MK HOLDING SAS",
  url: SITE,
  logo: `${SITE}/hero.png`,
  sameAs: SOCIALS,
  address: { "@type": "PostalAddress", addressLocality: "Muret", postalCode: "31600", addressRegion: "Occitanie", addressCountry: "FR" },
  areaServed: { "@type": "Country", name: "France" },
};

const offer = (price: number, availability: "InStock" | "PreOrder", name: string) => ({
  "@type": "Offer",
  name,
  price: String(price),
  priceCurrency: "EUR",
  availability: `https://schema.org/${availability}`,
  url: `${SITE}/produit`,
  seller: { "@id": `${SITE}/#organization` },
  itemCondition: "https://schema.org/NewCondition",
});

/** Produit NeoDrive : Confort en stock, Essentielle et Confort Plus sur commande. */
export const productLd = {
  "@type": "Product",
  "@id": `${SITE}/#neodrive-switch`,
  name: "NeoDrive Switch : voiture sans permis électrique",
  description: "Voiture sans permis électrique neuve, deux places, carrosserie en acier, recharge sur prise 220 V. Livraison partout en France, paiement à la livraison, garantie 2 ans.",
  brand: { "@type": "Brand", name: "NeoDrive" },
  image: [`${SITE}/hero.png`],
  category: "Voiture sans permis électrique (quadricycle léger L6e)",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "3990",
    highPrice: "5990",
    priceCurrency: "EUR",
    offerCount: 3,
    offers: [
      offer(4990, "InStock", "NeoDrive Confort (en stock)"),
      offer(3990, "PreOrder", "NeoDrive Essentielle (sur commande)"),
      offer(5990, "PreOrder", "NeoDrive Confort Plus (sur commande)"),
    ],
  },
};

export const graph = (...nodes: object[]) => ({ "@context": "https://schema.org", "@graph": nodes });

export const breadcrumbLd = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${path}` })),
});

export const faqLd = (qa: [string, string][]) => ({
  "@type": "FAQPage",
  mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

/** Sérialise un JSON-LD en échappant « < ». */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
