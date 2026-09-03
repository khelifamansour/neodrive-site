export type SeoCity = {
  slug: string;
  city: string;
  department: string;
  departmentCode: string;
  region: string;
  nearby: string[];
  intro: string;
  delivery: string;
  useCases: string[];
};

export const seoCities: SeoCity[] = [
  {
    slug: "toulouse",
    city: "Toulouse",
    department: "Haute-Garonne",
    departmentCode: "31",
    region: "Occitanie",
    nearby: ["Muret", "Colomiers", "Blagnac", "Tournefeuille"],
    intro: "NeoDrive est une marque toulousaine basée à Muret. Pour Toulouse et la Haute-Garonne, nous pouvons organiser une présentation sur rendez-vous, puis préparer la livraison ou le retrait selon la disponibilité du véhicule.",
    delivery: "La proximité de notre base de Muret simplifie la préparation, la présentation du véhicule et l'organisation de la remise des clés autour de Toulouse.",
    useCases: ["trajets domicile-travail", "courses et rendez-vous", "mobilité des jeunes dès l'âge légal", "déplacements de proximité"],
  },
  {
    slug: "paris",
    city: "Paris",
    department: "Paris",
    departmentCode: "75",
    region: "Île-de-France",
    nearby: ["Boulogne-Billancourt", "Saint-Denis", "Versailles", "Créteil"],
    intro: "Vous cherchez une voiture sans permis à Paris sans multiplier les visites en concession ? NeoDrive permet de découvrir le véhicule à distance en vidéo, de vérifier les équipements puis d'organiser une livraison en Île-de-France.",
    delivery: "Nous organisons la livraison à Paris et dans les principaux départements franciliens. Le rendez-vous de remise est convenu avec le client afin de faciliter la réception du véhicule.",
    useCases: ["trajets urbains courts", "stationnement dans un format compact", "mobilité entre communes proches", "solution électrique pour le quotidien"],
  },
  {
    slug: "lyon",
    city: "Lyon",
    department: "Rhône",
    departmentCode: "69",
    region: "Auvergne-Rhône-Alpes",
    nearby: ["Villeurbanne", "Bron", "Vénissieux", "Caluire-et-Cuire"],
    intro: "À Lyon, une voiture sans permis compacte peut répondre aux besoins de déplacement quotidien entre centre-ville, quartiers résidentiels et communes de la métropole. NeoDrive propose une commande à distance avec vidéos réelles et livraison à domicile.",
    delivery: "La livraison peut être organisée dans Lyon et les communes de la métropole, avec une prise de rendez-vous avant le déplacement du véhicule.",
    useCases: ["trajets locaux réguliers", "déplacements entre quartiers", "courses et rendez-vous", "mobilité électrique simple"],
  },
  {
    slug: "marseille",
    city: "Marseille",
    department: "Bouches-du-Rhône",
    departmentCode: "13",
    region: "Provence-Alpes-Côte d’Azur",
    nearby: ["Aix-en-Provence", "Aubagne", "Martigues", "La Ciotat"],
    intro: "Pour Marseille et les Bouches-du-Rhône, NeoDrive permet de préparer l'achat à distance grâce aux photos et vidéos réelles du véhicule, puis d'organiser la livraison directement avec le client.",
    delivery: "Nous livrons dans les Bouches-du-Rhône selon un planning défini à l'avance. Le client reçoit les informations nécessaires avant la remise du véhicule.",
    useCases: ["trajets de proximité", "déplacements quotidiens", "accès aux commerces et services", "alternative électrique compacte"],
  },
  {
    slug: "bordeaux",
    city: "Bordeaux",
    department: "Gironde",
    departmentCode: "33",
    region: "Nouvelle-Aquitaine",
    nearby: ["Mérignac", "Pessac", "Talence", "Libourne"],
    intro: "À Bordeaux et en Gironde, NeoDrive propose une voiture sans permis électrique neuve à prix accessible, présentée en détail à distance avant d'organiser la livraison.",
    delivery: "La livraison est possible à Bordeaux, dans la métropole et plus largement en Gironde selon le planning logistique disponible.",
    useCases: ["trajets domicile-travail", "déplacements dans la métropole", "courses", "mobilité autonome au quotidien"],
  },
  {
    slug: "lille",
    city: "Lille",
    department: "Nord",
    departmentCode: "59",
    region: "Hauts-de-France",
    nearby: ["Roubaix", "Tourcoing", "Villeneuve-d’Ascq", "Douai"],
    intro: "NeoDrive livre ses voitures sans permis électriques dans le Nord. Les clients de Lille peuvent découvrir le véhicule en vidéo, comparer les versions et organiser une livraison sans avoir à se déplacer jusqu'à Toulouse.",
    delivery: "Nous organisons les livraisons dans la métropole lilloise et le Nord en regroupant autant que possible les tournées pour limiter les délais et les coûts logistiques.",
    useCases: ["trajets entre communes proches", "mobilité des jeunes et familles", "déplacements professionnels courts", "usage quotidien électrique"],
  },
  {
    slug: "nantes",
    city: "Nantes",
    department: "Loire-Atlantique",
    departmentCode: "44",
    region: "Pays de la Loire",
    nearby: ["Saint-Herblain", "Rezé", "Orvault", "Saint-Nazaire"],
    intro: "Pour Nantes et la Loire-Atlantique, NeoDrive propose un parcours d'achat simple : présentation réelle du véhicule, choix de la version, préparation puis livraison au lieu convenu.",
    delivery: "La livraison peut être organisée à Nantes et dans les principales communes de Loire-Atlantique selon les disponibilités et la tournée logistique.",
    useCases: ["trajets urbains et périurbains", "courses et rendez-vous", "déplacements vers une gare ou un commerce", "mobilité locale sans permis B"],
  },
  {
    slug: "strasbourg",
    city: "Strasbourg",
    department: "Bas-Rhin",
    departmentCode: "67",
    region: "Grand Est",
    nearby: ["Schiltigheim", "Illkirch-Graffenstaden", "Haguenau", "Sélestat"],
    intro: "NeoDrive dessert Strasbourg et le Bas-Rhin avec une organisation de livraison à distance. Les photos et vidéos réelles permettent de voir le véhicule avant de confirmer la remise.",
    delivery: "Les tournées vers le Grand Est sont organisées en fonction des commandes afin de livrer plusieurs clients efficacement lorsque cela est possible.",
    useCases: ["déplacements quotidiens", "trajets de proximité", "mobilité électrique compacte", "courses et services"],
  },
  {
    slug: "montpellier",
    city: "Montpellier",
    department: "Hérault",
    departmentCode: "34",
    region: "Occitanie",
    nearby: ["Lattes", "Castelnau-le-Lez", "Sète", "Béziers"],
    intro: "Montpellier est relativement proche de notre base toulousaine. NeoDrive peut y organiser des livraisons régulières et présenter le véhicule en vidéo avant le rendez-vous.",
    delivery: "Nous desservons Montpellier et l'Hérault avec des tournées depuis le Sud-Ouest, selon le stock et les commandes en cours.",
    useCases: ["trajets urbains", "déplacements étudiants ou familiaux", "courses", "liaisons de proximité"],
  },
  {
    slug: "nice",
    city: "Nice",
    department: "Alpes-Maritimes",
    departmentCode: "06",
    region: "Provence-Alpes-Côte d’Azur",
    nearby: ["Cagnes-sur-Mer", "Antibes", "Cannes", "Menton"],
    intro: "Les clients des Alpes-Maritimes peuvent commander une NeoDrive à distance après avoir reçu photos, vidéos et informations sur la version choisie. La livraison est ensuite planifiée directement avec eux.",
    delivery: "La livraison vers Nice et la Côte d'Azur est organisée par tournée selon le nombre de véhicules et les disponibilités logistiques.",
    useCases: ["trajets de proximité", "déplacements côtiers courts", "courses et rendez-vous", "mobilité électrique quotidienne"],
  },
  {
    slug: "rennes",
    city: "Rennes",
    department: "Ille-et-Vilaine",
    departmentCode: "35",
    region: "Bretagne",
    nearby: ["Cesson-Sévigné", "Bruz", "Vitré", "Saint-Malo"],
    intro: "À Rennes et en Ille-et-Vilaine, NeoDrive permet d'acheter une voiture sans permis électrique neuve sans déplacement préalable : présentation vidéo, échange avec l'équipe puis livraison organisée.",
    delivery: "Les livraisons vers la Bretagne peuvent être regroupées avec d'autres commandes afin d'optimiser les tournées et la remise des véhicules.",
    useCases: ["trajets locaux", "mobilité familiale", "déplacements vers les commerces", "usage quotidien sans permis B"],
  },
  {
    slug: "grenoble",
    city: "Grenoble",
    department: "Isère",
    departmentCode: "38",
    region: "Auvergne-Rhône-Alpes",
    nearby: ["Échirolles", "Saint-Martin-d’Hères", "Meylan", "Voiron"],
    intro: "Pour Grenoble et l'Isère, NeoDrive propose une solution électrique compacte qui peut être étudiée à distance avant la livraison. Les caractéristiques du véhicule et ses limites d'usage sont expliquées avant la commande.",
    delivery: "La livraison dans l'Isère est organisée sur rendez-vous, en fonction des disponibilités de stock et du planning des tournées.",
    useCases: ["trajets urbains courts", "déplacements entre communes proches", "courses", "mobilité de proximité"],
  },
];

export function getSeoCity(slug: string) {
  return seoCities.find((city) => city.slug === slug);
}
