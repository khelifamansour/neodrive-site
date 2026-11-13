import { SOCIAL_LINKS } from "../../lib/social";
import s from "./social-links.module.css";

type SocialKey = "whatsapp" | "instagram" | "tiktok" | "facebook";

const ICONS: Record<SocialKey, React.ReactNode> = {
  whatsapp: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.3-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.4 1.3V6.6a4.5 4.5 0 0 1-4.4-4.6Z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M13.5 21.8v-8h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.2a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.4H7.6v3.2h2.7v8h3.2Z" />
    </svg>
  ),
};

type Props = {
  /** "light" pour un fond clair, "dark" pour un fond sombre (pied de page). */
  tone?: "light" | "dark";
  /** Titre affiché au-dessus des liens. Passer null pour le masquer. */
  title?: string | null;
  /** Aligne le bloc au centre (pages) ou à gauche (pied de page). */
  align?: "center" | "start";
  className?: string;
};

/**
 * Bloc « Retrouvez-nous sur nos réseaux ».
 * N'affiche que les réseaux dont l'URL est renseignée dans lib/social.ts :
 * ajouter une URL TikTok ou Facebook là-bas suffit pour qu'elle apparaisse partout.
 */
export default function SocialLinks({ tone = "light", title = "Retrouvez-nous sur nos réseaux", align = "center", className }: Props) {
  if (!SOCIAL_LINKS.length) return null;
  const classes = [s.root, tone === "dark" ? s.dark : s.light, align === "start" ? s.start : "", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {title ? <p className={s.title}>{title}</p> : null}
      <ul className={s.list} aria-label="Réseaux sociaux de NeoDrive">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.key}>
            <a
              className={`${s.link} ${s[link.key] || ""}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`NeoDrive sur ${link.label} (s’ouvre dans un nouvel onglet)`}
            >
              <span className={s.icon}>{ICONS[link.key as SocialKey]}</span>
              <span className={s.label}>{link.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
