/**
 * Sélection et ordre des vidéos de la page /videos.
 *
 * Chaque entrée correspond à une ligne de la table Supabase `social_media_assets`
 * (status 'ready', media_type 'video', hors 'generated/%'), retrouvée par son `title`.
 * L'ordre ici est l'ordre d'affichage. Pour retirer une vidéo : supprimer la ligne.
 * Pour en ajouter une : copier une ligne et mettre le `title` exact de la table.
 *
 * `seen: true`  = contenu vérifié image par image (titre fiable).
 * `seen: false` = vidéo non visionnée : titre déduit de la série de tournage
 *                 (numéros de fichier consécutifs du même téléphone). À relire.
 */
export type SectionKey = "livraisons" | "presentations" | "arrivages";

export type CuratedVideo = {
  /** Valeur exacte de social_media_assets.title */
  match: string;
  /** Identifiant d'ancre (#v-...) — stable, ne pas changer une fois publié */
  key: string;
  section: SectionKey;
  category: string;
  title: string;
  description: string;
  seen: boolean;
};

export const SECTIONS: { key: SectionKey; title: string; intro: string }[] = [
  { key: "livraisons", title: "Livraisons à nos clients", intro: "La voiture arrive chez le client, il prend le volant." },
  { key: "presentations", title: "Présentations et essais", intro: "Le véhicule de près : extérieur, habitacle et conduite." },
  { key: "arrivages", title: "Notre stock", intro: "Nos voitures en stock et en route vers nos clients." },
];

export const CURATED: CuratedVideo[] = [
  // ── Livraisons ──────────────────────────────────────────────
  { match: "Client NeoDrive 2", key: "livraison-bord-de-mer", section: "livraisons", category: "Livraison", seen: true,
    title: "Livraison en bord de mer", description: "La NeoDrive descend de la remorque puis roule jusqu'au client." },
  { match: "Client NeoDrive 1", key: "livraison-client", section: "livraisons", category: "Livraison", seen: true,
    title: "Un client prend la route", description: "Remise du véhicule et premiers mètres au volant." },

  // ── Présentations et essais ─────────────────────────────────
  { match: "1000170275.mp4", key: "1000170275", section: "presentations", category: "Présentation", seen: true,
    title: "On vous présente la NeoDrive", description: "Présentation face caméra devant la NeoDrive rouge." },
  { match: "Essai route NeoDrive", key: "essai-route", section: "presentations", category: "Essai", seen: true,
    title: "Au volant : essai sur route", description: "Vue conducteur : volant, tableau de bord et conduite." },
  { match: "Présentation NeoDrive", key: "tour-exterieur", section: "presentations", category: "Extérieur", seen: true,
    title: "Le tour complet de la voiture", description: "Une NeoDrive grise filmée sous tous les angles." },
  { match: "Intérieur NeoDrive", key: "habitacle", section: "presentations", category: "Habitacle", seen: true,
    title: "Visite de l'habitacle", description: "Sièges, tableau de bord, plafonnier et coffre." },
  { match: "1000170241.mp4", key: "1000170241", section: "presentations", category: "Présentation", seen: true,
    title: "La NeoDrive rouge de près", description: "Le modèle rouge en détail, filmé sur place." },
  { match: "Présentation NeoDrive 2", key: "showroom", section: "presentations", category: "Showroom", seen: true,
    title: "La NeoDrive en showroom", description: "Le véhicule exposé en magasin, portes ouvertes." },
  { match: "1000170231.mp4", key: "1000170231", section: "presentations", category: "Présentation", seen: false,
    title: "NeoDrive rouge : la présentation continue", description: "Suite du tournage avec le modèle rouge." },
  { match: "1000170246.mp4", key: "1000170246", section: "presentations", category: "Présentation", seen: false,
    title: "NeoDrive rouge : autres détails", description: "Suite du tournage avec le modèle rouge." },
  { match: "1000170239.mp4", key: "1000170239", section: "presentations", category: "Présentation", seen: false,
    title: "NeoDrive rouge : encore plus près", description: "Suite du tournage avec le modèle rouge." },
  { match: "1000170227.mp4", key: "1000170227", section: "presentations", category: "Présentation", seen: false,
    title: "NeoDrive rouge : sur le parking", description: "Suite du tournage avec le modèle rouge." },
  { match: "1000170240.mp4", key: "1000170240", section: "presentations", category: "Présentation", seen: false,
    title: "NeoDrive rouge : dernière séquence", description: "Suite du tournage avec le modèle rouge." },

  // ── Arrivages et stock ──────────────────────────────────────
  { match: "NeoDrive vidéo 1", key: "parc-stock", section: "arrivages", category: "Stock", seen: true,
    title: "Des dizaines de NeoDrive en stock", description: "Notre parc : les voitures alignées, prêtes à partir." },
  { match: "1000160287.mp4", key: "1000160287", section: "arrivages", category: "Transport", seen: true,
    title: "Camion porte-voitures chargé", description: "NeoDrive rouges et grises sur le camion de transport." },
  { match: "1000160304.mp4", key: "1000160304", section: "arrivages", category: "Transport", seen: true,
    title: "NeoDrive sur le camion", description: "Une voiture sur le plateau du porte-voitures." },
  { match: "1000160267.mp4", key: "1000160267", section: "arrivages", category: "Transport", seen: true,
    title: "Arrivée des camions", description: "Les porte-voitures arrivent sur notre parc." },
];
