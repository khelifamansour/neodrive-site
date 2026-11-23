/**
 * Page publique /sav/problemes : « Problèmes et questions déjà rencontrés par nos clients ».
 * Contenu piloté par ce tableau : pour ajouter une fiche, ajoutez un objet (id unique, minuscules et tirets : il sert d'ancre, ex. /sav/problemes#p-gear).
 * Photos dans public/sav/problemes/ (JPG ~1200 px). Hana (WhatsApp) envoie le lien de la fiche correspondante : garder les id stables.
 */
export type SavLink = { label: string; href: string };
export type SavPhoto = { src: string; alt: string; caption?: string; width: number; height: number };
export type SavProblem = {
  id: string;
  icon: string;
  /** Le symptôme, tel que le client le décrit. */
  title: string;
  /** « Pourquoi » : l'explication simple. */
  why: string;
  /** Étapes, dans l'ordre. */
  steps: string[];
  /** Point d'attention (sécurité, garantie). */
  warning?: string;
  /** Si ça ne suffit pas. */
  after?: string;
  photos?: SavPhoto[];
  links?: SavLink[];
};

const VIDEO_SAV = "Si cela ne suffit pas : envoyez-nous une courte vidéo et la description par le formulaire SAV ou sur WhatsApp, un technicien vous répond.";

export const SAV_PROBLEMS: SavProblem[] = [
  {
    id: "p-gear",
    icon: "🅿️",
    title: "La voiture s'allume, mais rien ne se passe quand j'appuie sur l'accélérateur (bloquée en P, voyant READY absent)",
    why: "Le plus souvent, une petite prise blanche appelée « P-gear » (fils marron et noir, près du contrôleur à l'arrière) est mal emboîtée, par exemple après des vibrations. La voiture ne reçoit alors pas l'information pour sortir du P.",
    steps: [
      "Coupez le contact.",
      "Repérez la petite prise blanche étiquetée « P-gear » (fils marron et noir), près du contrôleur à l'arrière (photo 1).",
      "Débranchez-la et regardez à l'intérieur : aucune broche ne doit être enfoncée ou tordue.",
      "Rebranchez-la à fond, jusqu'au « clic ».",
      "Vérifiez aussi la petite prise blanche juste à côté du relais jaune : elle doit être bien emboîtée jusqu'au clic (photo 2).",
      "Mettez le contact, gardez le pied sur le frein et passez en D : le voyant READY doit s'afficher.",
    ],
    after: "Toujours rien ? Filmez le tableau de bord au moment où vous mettez le contact (quelques secondes suffisent) et envoyez la vidéo au SAV.",
    photos: [
      { src: "/sav/problemes/p-gear-connecteur.jpg", alt: "Petite prise blanche étiquetée P-gear, avec un fil marron et un fil noir", caption: "1. La prise « P-gear » : petite prise blanche, fils marron et noir, étiquette « P-gear ».", width: 810, height: 1052 },
      { src: "/sav/problemes/prise-blanche-relais-jaune.jpg", alt: "Petite prise blanche branchée à côté du relais jaune", caption: "2. La petite prise blanche à côté du relais jaune : bien emboîtée jusqu'au clic.", width: 1200, height: 899 },
    ],
  },
  {
    id: "ne-s-allume-pas",
    icon: "🔌",
    title: "La voiture ne s'allume pas du tout",
    why: "Le tableau de bord et l'électronique sont alimentés par le convertisseur 12 V. Si sa grosse prise blanche (fil rouge), sous le tableau de bord, est mal emboîtée, plus rien ne s'allume.",
    steps: [
      "Vérifiez d'abord que le coupe-circuit est bien en position de fonctionnement (il est coupé pour le stockage).",
      "Coupez le contact.",
      "Sous le tableau de bord, repérez la grosse prise blanche avec un fil rouge qui va vers le convertisseur 12 V (photo).",
      "Emboîtez-la bien à fond, jusqu'au « clic » du verrou.",
      "Si le petit clip du verrou est cassé : emboîtez la prise à fond, entourez-la de scotch épais, puis serrez bien un serre-câble (collier plastique) autour, en attendant la pièce. Prévenez le SAV pour recevoir la pièce.",
      "Remettez le contact : le tableau de bord doit s'allumer.",
    ],
    after: VIDEO_SAV,
    photos: [
      { src: "/sav/problemes/connecteur-convertisseur-12v.jpg", alt: "Grosse prise blanche avec fil rouge, sous le tableau de bord, vers le convertisseur 12 V", caption: "La grosse prise blanche (fil rouge) du convertisseur 12 V : emboîtée jusqu'au clic du verrou.", width: 1200, height: 899 },
    ],
  },
  {
    id: "eau-portes",
    icon: "💧",
    title: "De l'eau rentre par les portes",
    why: "Le joint de la porte ne plaque bien que si la porte est fermée fermement. Une porte fermée doucement reste légèrement entrouverte au niveau du joint, et l'eau passe.",
    steps: [
      "À chaque fermeture, claquez la porte franchement (sans forcer sur la poignée).",
      "Vérifiez que la porte est bien alignée avec la carrosserie sur tout son tour.",
      "Si l'eau entre encore alors que la porte est bien claquée : prenez une photo de l'endroit où l'eau passe et envoyez-la au SAV.",
    ],
  },
  {
    id: "chargeur",
    icon: "🔋",
    title: "Le chargeur : comment le ranger et l'utiliser",
    why: "Le chargeur est un appareil électronique sensible. Quand la voiture roule, chaque vibration de la route le secoue : à la longue, les fils et les soudures à l'intérieur bougent, se fragilisent et finissent par lâcher. Le coussin sert à amortir ces vibrations, comme une suspension. Une boîte fermée seule ne suffit pas : posée directement sur le plancher, elle transmet toutes les secousses au chargeur.",
    steps: [
      "Ne posez jamais le chargeur au sol, ni pendant la charge ni pour le ranger.",
      "Rangez-le dans une boîte, dans le coffre, avec un coussin ou une mousse en dessous (et idéalement autour) pour amortir les vibrations de la route.",
      "Si vous ne l'utilisez pas en déplacement, le mieux est de le laisser à la maison, au sec.",
      "Gardez-le au sec, à l'abri de la pluie et de l'humidité.",
      "Utilisez uniquement le chargeur fourni avec le véhicule.",
    ],
    links: [{ label: "Lire le guide batterie", href: "/guide-batterie" }],
  },
  {
    id: "autonomie",
    icon: "📉",
    title: "Autonomie en baisse, batterie qui se vide vite",
    why: "Souvent, la batterie n'a pas été chargée complètement, ou le coupe-circuit était coupé pendant la charge. Quand la batterie est basse, la voiture ralentit volontairement : elle passe en mode économie pour protéger les batteries, c'est normal.",
    steps: [
      "Mettez le coupe-circuit en position de fonctionnement.",
      "Chargez à fond, pendant environ 10 heures, avec le chargeur fourni.",
      "Après la charge, le compteur doit afficher environ 65 à 66 V : c'est le repère d'une batterie bien chargée (voir le guide batterie).",
      "Si la voiture ralentit quand la batterie est basse, ne forcez pas : rentrez tranquillement et rechargez.",
      "Le froid, les côtes et le poids transporté réduisent aussi l'autonomie.",
    ],
    after: "L'autonomie reste faible après une charge complète ? Testez vos batteries (fiche suivante) et envoyez-nous les valeurs.",
    links: [{ label: "Lire le guide batterie", href: "/guide-batterie" }, { label: "Tester ses batteries", href: "#multimetre" }],
  },
  {
    id: "multimetre",
    icon: "🧪",
    title: "Tester ses batteries avec un multimètre",
    why: "Un multimètre permet de savoir en une minute si chaque batterie est en bon état. Ces valeurs aident beaucoup le SAV à vous répondre vite.",
    steps: [
      "Procurez-vous un multimètre simple : quelques euros en magasin de bricolage ou chez Action.",
      "Faites une charge complète d'environ 10 heures.",
      "Coupez le contact, puis coupez le coupe-circuit.",
      "Réglez le multimètre sur V continu (le V avec un trait droit ⎓), calibre 20 V.",
      "Posez la pointe rouge sur la borne + d'une batterie, et la pointe noire sur la borne − de la même batterie.",
      "Lisez la valeur, puis recommencez pour chaque batterie de 12 V, une par une.",
      "Au-dessus de 12,7 V (environ 12,7 à 13 V) : la batterie est en bon état.",
      "Nettement en dessous : notez la valeur de chaque batterie et envoyez-les au SAV.",
    ],
    warning: "Ne touchez jamais les deux bornes en même temps avec un objet métallique (clé, outil). Retirez bagues, bracelets et montre avant le test.",
  },
  {
    id: "consommation",
    icon: "🛞",
    title: "La voiture consomme trop ou manque de puissance",
    why: "Un frein à main pas tout à fait desserré, ou une roue qui frotte, freine la voiture en permanence : elle force, consomme plus et paraît moins puissante.",
    steps: [
      "Vérifiez que le frein à main est bien desserré.",
      "Garez la voiture sur un sol plat et dur, contact coupé.",
      "Levez la voiture avec un cric, une roue à la fois, en sécurité (ne passez jamais sous la voiture).",
      "Faites tourner la roue à la main : elle doit tourner librement, sans frotter ni freiner.",
      "Reposez la voiture, puis passez à la roue suivante.",
      "Une roue qui frotte ou freine : contactez le SAV.",
    ],
    warning: "Ne vous mettez jamais sous un véhicule soutenu seulement par un cric.",
  },
];

export const SAV_WHATSAPP = "https://wa.me/33676192234?text=" + encodeURIComponent("Bonjour, j'ai une question sur ma NeoDrive.");
