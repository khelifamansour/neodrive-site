export type SocialTheme = {
  id: string;
  hook: string;
  body: string;
  tags: string[];
};

export type SocialAssetLike = {
  id?: string | null;
  media_type?: string | null;
  public_url?: string | null;
  context?: string | null;
  title?: string | null;
};

export const SOCIAL_THEMES: SocialTheme[] = [
  {
    id: "prix-direct",
    hook: "Pourquoi NeoDrive peut afficher un prix aussi bas ?",
    body: "Le prix vient d’abord du modèle de distribution : approvisionnement direct, structure centralisée et vente sans multiplier les concessions, showrooms et intermédiaires. L’objectif est de réduire les coûts de distribution, pas de cacher une étape au client.",
    tags: ["prix", "confiance", "distribution"],
  },
  {
    id: "prix-pas-piege",
    hook: "Un prix bas doit pouvoir s’expliquer.",
    body: "Quand une voiture sans permis est nettement moins chère, la bonne réaction est de poser des questions. Chez NeoDrive, nous voulons expliquer clairement ce qui permet ce positionnement : distribution directe, organisation légère et véhicule pensé sans complexité inutile.",
    tags: ["prix", "confiance"],
  },
  {
    id: "paiement-livraison",
    hook: "Acheter à distance sans payer le véhicule des semaines à l’avance.",
    body: "Notre parcours est conçu pour rassurer : le véhicule est commandé, préparé puis livré, et le paiement du véhicule s’effectue à la livraison selon les modalités commerciales convenues. Le client voit ainsi le produit avant de finaliser la transaction.",
    tags: ["paiement", "confiance", "livraison"],
  },
  {
    id: "livraison-domicile",
    hook: "Une vraie remise du véhicule, pas seulement un colis expédié.",
    body: "NeoDrive organise la livraison à domicile. La remise du véhicule permet de présenter les commandes, la recharge et les points essentiels de prise en main. C’est une partie importante de notre modèle de vente à distance.",
    tags: ["livraison", "confiance"],
  },
  {
    id: "preuve-reelle",
    hook: "Pourquoi nous publions autant de vraies photos et vidéos ?",
    body: "Parce qu’un acheteur doit pouvoir voir autre chose que des images de catalogue. Livraisons, véhicules, détails et essais réels permettent de mieux comprendre ce que l’on achète avant de prendre une décision.",
    tags: ["confiance", "preuve", "livraison"],
  },
  {
    id: "acheter-internet",
    hook: "Acheter une voiture sans permis sur Internet : que faut-il vérifier ?",
    body: "Identité de l’entreprise, homologation, documents, conditions de vente, prix de livraison, photos réelles et possibilité de joindre quelqu’un : ce sont les bons réflexes. Notre objectif est de rendre ces éléments visibles et compréhensibles avant la livraison.",
    tags: ["confiance", "internet", "homologation"],
  },
  {
    id: "documents-homologation",
    hook: "Le prix ne suffit pas : les documents comptent aussi.",
    body: "Pour un véhicule routier, l’acheteur doit s’intéresser à l’homologation, aux documents nécessaires à l’immatriculation et aux caractéristiques réellement déclarées. C’est aussi important que l’esthétique ou le tarif affiché.",
    tags: ["homologation", "confiance"],
  },
  {
    id: "centralisation",
    hook: "Pourquoi centraliser la préparation plutôt que multiplier les showrooms ?",
    body: "Une organisation centralisée permet de concentrer les contrôles, les pièces, la préparation et la logistique au même endroit. Cela réduit les coûts fixes tout en permettant de vendre et livrer à l’échelle nationale.",
    tags: ["distribution", "prix", "sav"],
  },
  {
    id: "showroom",
    hook: "Pas de réseau de concessions à financer dans chaque ville.",
    body: "Des locaux d’exposition partout en France représentent un coût important. NeoDrive privilégie la vente directe, les médias réels et la livraison pour consacrer davantage du prix au véhicule, à sa préparation et au service.",
    tags: ["prix", "distribution", "confiance"],
  },
  {
    id: "simplicite",
    hook: "La simplicité peut être un avantage sur le long terme.",
    body: "Notre philosophie est d’éviter la complexité inutile. Moins de systèmes sophistiqués signifie aussi des diagnostics plus lisibles et, selon la panne, des interventions plus simples. Aucun véhicule n’est à l’abri d’une panne, mais la réparabilité compte.",
    tags: ["sav", "reparabilite", "confiance"],
  },
  {
    id: "acier",
    hook: "Pourquoi le châssis acier est intéressant pour la réparabilité ?",
    body: "L’acier est un matériau bien connu des professionnels de la carrosserie. Selon le dommage, il peut être redressé, soudé ou réparé avec des méthodes classiques. La sécurité dépend toutefois de la conception globale et de l’homologation du véhicule, pas d’un matériau seul.",
    tags: ["reparabilite", "sav", "acier"],
  },
  {
    id: "reparer",
    hook: "Après un petit choc, le vrai sujet est souvent : peut-on réparer ?",
    body: "Le coût d’usage ne dépend pas seulement du prix d’achat. L’accès aux pièces, la possibilité de redresser certains éléments et la simplicité des interventions sont aussi importants. Nous voulons garder cette logique de réparabilité au cœur du produit.",
    tags: ["reparabilite", "sav"],
  },
  {
    id: "sav-pieces",
    hook: "Le SAV ne se résume pas à dire “garantie”.",
    body: "Un SAV utile doit pouvoir identifier une panne, trouver la bonne pièce et organiser une solution adaptée. C’est pourquoi nous travaillons aussi sur la documentation, les pièces détachées et les procédures de diagnostic, pas seulement sur la vente du véhicule.",
    tags: ["sav", "pieces", "confiance"],
  },
  {
    id: "pieces-ciblees",
    hook: "Changer la bonne pièce plutôt que remplacer tout un ensemble.",
    body: "Sur une architecture simple, de nombreuses interventions peuvent être traitées composant par composant : connectique, commande, électronique de puissance ou éléments mécaniques. L’objectif est de garder les réparations aussi ciblées et rationnelles que possible.",
    tags: ["sav", "pieces", "reparabilite"],
  },
  {
    id: "recharge-220",
    hook: "Pas besoin d’une borne rapide pour l’usage quotidien.",
    body: "La NeoDrive est pensée pour une recharge simple sur une prise 220 V adaptée. Pour beaucoup d’utilisateurs, cela permet de recharger à domicile ou sur un lieu de stationnement équipé sans installer une infrastructure complexe.",
    tags: ["recharge", "usage", "simplicite"],
  },
  {
    id: "deux-places",
    hook: "Deux places et l’essentiel pour les trajets du quotidien.",
    body: "Une voiture sans permis n’a pas vocation à remplacer tous les usages d’une grande voiture. Elle répond surtout aux déplacements courts et réguliers avec deux places, un format compact et une utilisation simple.",
    tags: ["usage", "produit"],
  },
  {
    id: "cout-total",
    hook: "Comparez le coût total, pas seulement le logo ou la mensualité.",
    body: "Prix d’achat, livraison, équipements, recharge, assurance, entretien, SAV et conditions de financement doivent être regardés ensemble. Deux offres affichées différemment peuvent avoir un coût réel très différent.",
    tags: ["prix", "comparaison", "confiance"],
  },
  {
    id: "leasing",
    hook: "Une petite mensualité n’est pas le prix final du véhicule.",
    body: "En LOA ou LLD, il faut regarder l’apport éventuel, la durée, le kilométrage, l’assurance et les conditions de restitution. L’achat comptant et le leasing répondent à des besoins différents : la comparaison doit se faire sur le coût total.",
    tags: ["prix", "leasing", "comparaison"],
  },
  {
    id: "ami-comparaison",
    hook: "NeoDrive ou Citroën Ami : comparez point par point.",
    body: "Plutôt que d’opposer les marques, comparez ce qui compte pour votre usage : prix réellement payé, équipements, recharge, livraison, SAV et conditions de financement. Les caractéristiques des concurrents doivent toujours être vérifiées sur leurs offres officielles en vigueur.",
    tags: ["comparaison", "prix", "confiance"],
  },
  {
    id: "preparation",
    hook: "Une livraison commence avant le départ du véhicule.",
    body: "Préparation, contrôle des fonctions essentielles, documents, charge et organisation du transport font partie du travail en amont. La qualité de la remise au client dépend beaucoup de cette préparation.",
    tags: ["livraison", "preparation", "confiance"],
  },
  {
    id: "france",
    hook: "Vendre en ligne n’empêche pas d’avoir une logistique réelle en France.",
    body: "Le modèle NeoDrive repose sur des stocks, de la préparation, des tournées et une livraison physique. L’objectif est de combiner la simplicité de la vente en ligne avec une organisation de terrain capable de remettre le véhicule au client.",
    tags: ["livraison", "distribution", "confiance"],
  },
  {
    id: "humain",
    hook: "Derrière le site, il doit rester possible de parler à quelqu’un.",
    body: "Pour un achat automobile, certaines questions méritent une réponse humaine : immatriculation, livraison, recharge, utilisation ou SAV. La vente en ligne doit simplifier le parcours, pas supprimer le contact quand il est nécessaire.",
    tags: ["confiance", "sav", "internet"],
  },
  {
    id: "pas-surpromesse",
    hook: "Mieux vaut expliquer précisément que promettre trop.",
    body: "Autonomie, délais, garanties et conditions d’utilisation doivent être présentés avec leurs limites réelles. Nous préférons une information claire et vérifiable à une promesse commerciale impossible à tenir dans toutes les situations.",
    tags: ["confiance", "transparence"],
  },
  {
    id: "choix-rationnel",
    hook: "Une voiture sans permis doit rester un achat rationnel.",
    body: "Le bon véhicule est celui qui correspond au trajet, au budget et aux contraintes du client. Notre positionnement est simple : proposer une mobilité électrique accessible, pratique et réparable, sans faire payer une complexité qui n’est pas nécessaire à tous.",
    tags: ["prix", "usage", "confiance"],
  },
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isVideoAsset(asset: SocialAssetLike) {
  const type = String(asset.media_type || "");
  const url = String(asset.public_url || "");
  return /video|reel/i.test(type) || /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

export function cleanContext(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 320);
}

function contextTags(asset: SocialAssetLike) {
  const text = `${asset.context || ""} ${asset.title || ""}`.toLowerCase();
  const tags = new Set<string>();
  if (/livrai|client|remise|transport|remorque/.test(text)) tags.add("livraison");
  if (/recharg|prise|220|batter/.test(text)) tags.add("recharge");
  if (/répar|repar|panne|sav|pi[eè]ce|atelier|contr[oô]leur|moteur|carross/.test(text)) tags.add("sav");
  if (/acier|ch[aâ]ssis|choc|bosse|aile/.test(text)) tags.add("reparabilite");
  if (/prix|tarif|3990|4990|promo/.test(text)) tags.add("prix");
  if (/int[eé]rieur|si[eè]ge|tableau|habitacle/.test(text)) tags.add("produit");
  if (/route|essai|roul|trajet/.test(text)) tags.add("usage");
  return tags;
}

export function pickSocialTheme(asset: SocialAssetLike, recentTexts: string[] = [], seed = "") {
  const recent = recentTexts.join("\n").toLowerCase();
  const tags = contextTags(asset);
  const contextual = tags.size
    ? SOCIAL_THEMES.filter((t) => t.tags.some((tag) => tags.has(tag)))
    : SOCIAL_THEMES;
  const unseen = contextual.filter((t) => !recent.includes(t.hook.toLowerCase()));
  const pool = unseen.length ? unseen : contextual.length ? contextual : SOCIAL_THEMES;
  const basis = `${seed}|${asset.id || ""}|${asset.title || ""}|${asset.context || ""}|${Date.now()}`;
  return pool[hash(basis) % pool.length];
}

export function buildSocialCaption(theme: SocialTheme, asset: SocialAssetLike, platform = "social") {
  const ctx = cleanContext(asset.context);
  const video = isVideoAsset(asset);
  const variant = hash(`${theme.id}|${asset.id || ""}|${platform}|${asset.title || ""}`) % 5;
  const intros = [
    theme.hook,
    `Question fréquente : ${theme.hook.charAt(0).toLowerCase()}${theme.hook.slice(1)}`,
    `On nous pose souvent cette question : ${theme.hook}`,
    `Un point important avant d’acheter : ${theme.hook}`,
    `Parlons d’un sujet concret : ${theme.hook}`,
  ];
  const proof = ctx
    ? `${video ? "🎥" : "📸"} Image réelle de notre activité : ${ctx}`
    : video
      ? "🎥 Séquence réelle issue de notre activité NeoDrive."
      : "📸 Photo réelle issue de notre activité NeoDrive.";
  const ctas = [
    "Plus d’informations : easydrive-auto.fr",
    "Découvrez la gamme et les informations pratiques sur easydrive-auto.fr",
    "Une question ? Retrouvez les informations NeoDrive sur easydrive-auto.fr",
    "Pour voir la gamme : easydrive-auto.fr",
    "Détails et contact : easydrive-auto.fr",
  ];
  const hashtags = [
    "#NeoDrive #VoitureSansPermis #VSP #MobiliteElectrique",
    "#NeoDrive #Voiturette #Electrique #Mobilite",
    "#NeoDrive #VSPFrance #VoitureElectrique #SansPermis",
    "#NeoDrive #MobiliteDuQuotidien #VSP #Electrique",
    "#NeoDrive #VoitureSansPermis #Mobilite #France",
  ];
  return `${intros[variant]}\n\n${theme.body}\n\n${proof}\n\n${ctas[variant]}\n\n${hashtags[variant]}`;
}
