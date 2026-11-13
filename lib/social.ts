/** Réseaux sociaux officiels NeoDrive. Un lien vide n'est pas affiché sur le site. */
export const SOCIAL = {
  whatsapp: "https://wa.me/33628261446",
  instagram: "https://www.instagram.com/neodrivefrance/",
  tiktok: "",
  facebook: "",
} as const;

export const SOCIAL_LINKS = ([
  { key: "whatsapp", label: "WhatsApp", url: SOCIAL.whatsapp },
  { key: "instagram", label: "Instagram", url: SOCIAL.instagram },
  { key: "tiktok", label: "TikTok", url: SOCIAL.tiktok },
  { key: "facebook", label: "Facebook", url: SOCIAL.facebook },
] as const).filter(l => l.url);
