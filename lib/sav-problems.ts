/**
 * Page publique /sav/problemes : « Problèmes et questions déjà rencontrés par nos clients ».
 * Contenu piloté par ce tableau : pour ajouter une fiche, ajoutez un objet (id unique, en minuscules avec des tirets).
 * N'y mettez que des vérifications sans danger (rien à démonter, aucune manipulation électrique).
 */
export type SavLink = { label: string; href: string };
export type SavProblem = {
  id: string;
  icon: string;
  title: string;
  /** Une phrase qui rassure / explique. */
  intro?: string;
  /** Vérifications simples, dans l'ordre. */
  checks?: string[];
  /** Point d'attention (sécurité, garantie). */
  warning?: string;
  links?: SavLink[];
};

export const SAV_PROBLEMS: SavProblem[] = [
  {
    id: "batterie-recharge",
    icon: "🔋",
    title: "Batterie, recharge et autonomie",
    intro: "La plupart des questions sur l'autonomie et la recharge trouvent leur réponse dans notre guide batterie : niveau de charge, temps de charge, bonnes habitudes et stockage.",
    checks: [
      "Rechargez uniquement avec le chargeur fourni avec le véhicule, sur une prise classique, sans rallonge enroulée.",
      "Le contact doit être coupé et le coupe-circuit en position de fonctionnement pendant la charge.",
      "Branchez d'abord le chargeur côté véhicule, puis à la prise ; débranchez dans l'ordre inverse.",
      "Le froid, les côtes et le poids transporté réduisent l'autonomie : c'est normal.",
    ],
    warning: "Odeur inhabituelle, chauffe anormale, gonflement ou fuite : arrêtez l'utilisation et la recharge, puis contactez le SAV.",
    links: [{ label: "Lire le guide batterie", href: "/guide-batterie" }],
  },
  {
    id: "ne-demarre-pas",
    icon: "🔑",
    title: "Le véhicule ne démarre pas",
    intro: "Avant tout, quelques vérifications simples, véhicule à l'arrêt :",
    checks: [
      "Le coupe-circuit est bien en position de fonctionnement (il est coupé pour le stockage ou après certaines recharges).",
      "Le contact est bien mis avec la clé.",
      "Le niveau de charge : si la batterie est très basse, rechargez complètement avant de réessayer.",
    ],
    warning: "Si le véhicule ne démarre toujours pas, ne démontez rien : décrivez-nous la situation avec une photo du tableau de bord.",
    links: [{ label: "Ouvrir une demande SAV", href: "/sav#demande" }],
  },
];

export const SAV_WHATSAPP = "https://wa.me/33676192234?text=" + encodeURIComponent("Bonjour, j'ai une question sur ma NeoDrive.");
