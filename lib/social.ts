/** Réseaux sociaux officiels NeoDrive, dans l'ordre d'affichage. Un lien vide n'est pas affiché sur le site. */
export const SOCIAL = {
  facebook: "https://www.facebook.com/profile.php?id=61591548669494",
  instagram: "https://www.instagram.com/neodrivefrance/",
  tiktok: "https://www.tiktok.com/@neodrive72",
  whatsapp: "https://wa.me/33676192234",
} as const;

export const SOCIAL_LINKS = ([
  { key: "facebook", label: "Facebook", url: SOCIAL.facebook },
  { key: "instagram", label: "Instagram", url: SOCIAL.instagram },
  { key: "tiktok", label: "TikTok", url: SOCIAL.tiktok },
  { key: "whatsapp", label: "WhatsApp", url: SOCIAL.whatsapp },
] as const).filter(l => l.url);
