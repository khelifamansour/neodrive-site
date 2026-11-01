import sharp from "sharp";

export const POSTER_CONCEPTS = [
  { id: "prix", label: "LE PRIX, SANS MYSTÈRE", lines: ["L’ÉLECTRIQUE.", "À PRIX DIRECT."], value: "CONFORT 4 990 € TTC", detail: "Essentielle dès 3 990 € TTC, sur commande.", footer: "Immatriculation / mise en route : 150 €. Livraison en supplément.", caption: "NeoDrive Confort à 4 990 € TTC. Essentielle à partir de 3 990 € TTC, sur commande. Immatriculation et mise en route : 150 €, livraison en supplément selon votre adresse. Demandez les disponibilités et un devis complet avant de choisir." },
  { id: "fiabilite", label: "CONCEPTION & ENTRETIEN", lines: ["SIMPLE À UTILISER.", "PENSÉE POUR DURER."], value: "SIMPLICITÉ • ENTRETIEN • SAV", detail: "La fiabilité se construit et s’entretient.", footer: "Entretien régulier. Garantie selon les conditions du contrat.", caption: "La fiabilité repose sur la conception, l’entretien et la prise en charge des problèmes. NeoDrive privilégie une architecture simple et le diagnostic ciblé. Demandez nos conseils d’entretien et les conditions de garantie ; aucun véhicule n’est à l’abri d’une panne." },
  { id: "securite", label: "SÉCURITÉ : LES BONS RÉFLEXES", lines: ["BIEN PRÉPARER.", "BIEN PRENDRE EN MAIN."], value: "VISIBILITÉ • PNEUS • FREINAGE", detail: "Contrôles, prise en main et conduite adaptée.", footer: "Demandez la fiche véhicule et nos conseils de prise en main.", caption: "Avant de prendre la route : contrôlez les pneumatiques, l’éclairage et le freinage, attachez votre ceinture et adaptez votre conduite. La sécurité dépend de l’ensemble du véhicule et de son utilisation ; la carrosserie acier seule ne prouve pas une protection supérieure. Demandez une vidéo de présentation et les informations de prise en main." },
  { id: "reparabilite", label: "LE CHOIX DE LA RÉPARABILITÉ", lines: ["CARROSSERIE ACIER.", "RÉPARATIONS CIBLÉES."], value: "UN MATÉRIAU CONNU DES PROS", detail: "Une intervention adaptée à chaque dommage.", footer: "Réparation possible selon le dommage et le diagnostic professionnel.", caption: "Une carrosserie acier peut, selon le dommage, être redressée ou réparée par un professionnel. Le diagnostic et l’accès aux pièces comptent autant que le matériau. Demandez-nous les modalités de SAV avant votre achat." },
  { id: "paiement", label: "ACHETER À DISTANCE, AVEC CLARTÉ", lines: ["VOYEZ LA VOITURE.", "PAYEZ À LA LIVRAISON."], value: "PHOTOS RÉELLES • DEVIS COMPLET", detail: "Contrôle du véhicule avant le règlement.", footer: "Selon les modalités commerciales convenues. Livraison payante.", caption: "Photos réelles, vidéo de présentation, devis détaillé et paiement du véhicule à la livraison selon les modalités convenues : notre parcours vous permet de voir ce que vous achetez. Indiquez votre code postal pour connaître le prix total livré." },
  { id: "confort", label: "DES ÉQUIPEMENTS CONCRETS", lines: ["LE CONFORT.", "AU QUOTIDIEN."], value: "CONFORT 4 990 € TTC", detail: "Chauffage, caméra de recul, Bluetooth et USB.", footer: "Équipements selon version. Immatriculation et livraison en supplément.", caption: "La version Confort à 4 990 € TTC propose chauffage, caméra de recul, Bluetooth et USB. Comparez les équipements inclus, les frais et le service. Photos illustratives de la gamme ; demandez la fiche et les disponibilités du véhicule proposé." },
  { id: "cout-total", label: "COMPARER POUR BIEN ACHETER", lines: ["LE VRAI PRIX.", "C’EST LE TOTAL."], value: "VÉHICULE + FRAIS + USAGE", detail: "Comparez les offres sur la même base.", footer: "Financement : vérifiez apport, durée, kilométrage et restitution.", caption: "Pour comparer NeoDrive, Citroën Ami ou Fiat Topolino, regardez le coût total : véhicule, équipements, immatriculation, livraison, assurance, entretien et financement. Une mensualité seule ne dit pas combien vous paierez. Demandez votre devis et comparez avec les offres officielles en vigueur." },
];

export function posterConcept(date: string) {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  return POSTER_CONCEPTS[((day % POSTER_CONCEPTS.length) + POSTER_CONCEPTS.length) % POSTER_CONCEPTS.length];
}
function escape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export async function renderMarketingPoster(photo: Buffer, date: string) {
  const c = posterConcept(date);
  const image = await sharp(photo, { limitInputPixels: 40000000 }).rotate().resize(984, 590, { fit: "contain", background: "#e9edf0" }).jpeg({ quality: 92 }).toBuffer();
  const svg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#071a25"/><stop offset="1" stop-color="#173744"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#bg)"/><circle cx="1020" cy="10" r="310" fill="#30d7c1" opacity=".07"/><g font-family="DejaVu Sans, sans-serif"><text x="48" y="76" fill="#fff" font-size="39" font-weight="bold">NeoDrive</text><text x="1032" y="70" text-anchor="end" fill="#8faeb8" font-size="18">VOITURE SANS PERMIS ÉLECTRIQUE</text><rect x="48" y="118" width="8" height="26" fill="#30d7c1"/><text x="72" y="140" fill="#30d7c1" font-size="23" font-weight="bold">${escape(c.label)}</text><text x="48" y="226" fill="#fff" font-size="62" font-weight="bold">${escape(c.lines[0])}</text><text x="48" y="306" fill="#fff" font-size="62" font-weight="bold">${escape(c.lines[1])}</text><rect x="48" y="354" width="984" height="590" rx="22" fill="#e9edf0"/><text x="48" y="980" fill="#a7bbc4" font-size="19">PHOTO RÉELLE NEODRIVE · GAMME ILLUSTRÉE</text><text x="48" y="1040" fill="#30d7c1" font-size="36" font-weight="bold">${escape(c.value)}</text><text x="48" y="1090" fill="#e6eef1" font-size="25">${escape(c.detail)}</text><rect x="48" y="1130" width="984" height="74" rx="16" fill="#fff"/><text x="80" y="1177" fill="#102b36" font-size="27" font-weight="bold">DEMANDEZ UNE VIDÉO ET VOTRE DEVIS</text><text x="48" y="1246" fill="#fff" font-size="25" font-weight="bold">easydrive-auto.fr</text><text x="48" y="1304" fill="#a7bbc4" font-size="19">${escape(c.footer)}</text></g></svg>`;
  return sharp(Buffer.from(svg)).composite([{ input: image, left: 48, top: 354 }]).jpeg({ quality: 94 }).toBuffer();
}

export async function dailyPosterForPublishing(key: string, platform: string) {
  const sb = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
  const date = new Date().toISOString().slice(0, 10);
  const headers = { Authorization: `Bearer ${key}`, apikey: key };
  const assetUrl = new URL(`${sb}/rest/v1/social_media_assets`);
  assetUrl.searchParams.set("storage_path", `eq.generated/visual-${date}.jpg`);
  assetUrl.searchParams.set("status", "eq.ready");
  assetUrl.searchParams.set("select", "id,storage_path,public_url,media_type,title,context,times_used,last_used_at,created_at");
  const r = await fetch(assetUrl, { headers, cache: "no-store" });
  if (!r.ok) throw new Error("Lecture de l’affiche quotidienne impossible");
  const asset = (await r.json())?.[0];
  if (!asset) return null;
  const check = new URL(`${sb}/rest/v1/social_content_queue`);
  check.searchParams.set("platform", `eq.${platform}`);
  check.searchParams.set("status", "eq.published");
  check.searchParams.set("media_url", `eq.${asset.public_url}`);
  check.searchParams.set("select", "id");
  check.searchParams.set("limit", "1");
  const published = await fetch(check, { headers, cache: "no-store" });
  if (!published.ok) throw new Error("Vérification des publications impossible");
  if ((await published.json()).length) return null;
  const c = posterConcept(date);
  const articleUrl = new URL(`${sb}/rest/v1/seo_articles`);
  articleUrl.searchParams.set("status", "eq.published");
  articleUrl.searchParams.set("published_at", `gte.${date}T00:00:00Z`);
  articleUrl.searchParams.set("select", "slug");
  articleUrl.searchParams.set("order", "published_at.desc");
  articleUrl.searchParams.set("limit", "1");
  const articleResponse = await fetch(articleUrl, { headers, cache: "no-store" });
  const article = articleResponse.ok ? (await articleResponse.json())?.[0] : null;
  const guide = article?.slug ? `\n\nGuide du jour : https://www.easydrive-auto.fr/blog/${encodeURIComponent(article.slug)}?utm_source=${platform}&utm_medium=organic_social&utm_campaign=guide_du_jour` : "";
  return { asset, theme: { id: c.id, hook: c.lines.join(" "), body: c.caption, tags: [c.id, "neodrive"] }, caption: `${c.caption}\n\nVidéo et devis : https://www.easydrive-auto.fr/produit?utm_source=${platform}&utm_medium=organic_social&utm_campaign=poster_${c.id}${guide}\n\n#NeoDrive #VoitureSansPermis #VoitureElectrique` };
}
