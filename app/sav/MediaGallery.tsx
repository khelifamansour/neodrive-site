"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./media.module.css";

export type GalleryItem = { name: string; type: string; url: string; caption?: string };
const isVideo = (m: GalleryItem) => m.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp)(\?|$)/i.test(m.name);

/** Vignette vidéo = vraie image de la vidéo, chargée quand la carte approche de l'écran. */
function VideoThumb({ src }: { src: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <span ref={ref} className={styles.thumbInner}>{visible ? <video src={`${src}#t=0.5`} preload="metadata" muted playsInline disablePictureInPicture tabIndex={-1} aria-hidden="true" /> : null}</span>;
}

/** Galerie photos / vidéos : clic → lecture sur place dans une visionneuse plein écran (flèches, Échap, glisser). */
export default function MediaGallery({ items, compact = false }: { items: GalleryItem[]; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const go = useCallback((d: number) => setOpen(i => (i === null ? i : Math.min(items.length - 1, Math.max(0, i + d)))), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.target instanceof HTMLVideoElement) return;
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, close, go]);

  if (!items.length) return null;
  const cur = open !== null ? items[open] : null;
  return <>
    <ul className={compact ? `${styles.grid} ${styles.compact}` : styles.grid}>
      {items.map((m, i) => <li key={`${i}-${m.url}`}>
        <button type="button" className={styles.thumb} onClick={() => setOpen(i)} aria-label={`${isVideo(m) ? "Lire la vidéo" : "Voir la photo"} ${m.name}`}>
          {isVideo(m) ? <><VideoThumb src={m.url} /><span className={styles.play} aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span></> : <img src={m.url} alt="" loading="lazy" />}
          {m.caption ? <span className={styles.cap}>{m.caption}</span> : null}
        </button>
      </li>)}
    </ul>
    {cur && open !== null ? <div className={styles.modal} role="dialog" aria-modal="true" aria-label={cur.name} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className={styles.bar}><span>{open + 1} / {items.length}</span><a href={cur.url} target="_blank" rel="noreferrer" className={styles.dl}>Ouvrir l’original</a><button ref={closeBtn} type="button" onClick={close} aria-label="Fermer">✕</button></div>
      <div className={styles.stage} onClick={e => { if (e.target === e.currentTarget) close(); }}
        onTouchStart={e => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
        {isVideo(cur) ? <video key={cur.url} className={styles.media} src={cur.url} controls autoPlay playsInline preload="auto" /> : <img key={cur.url} className={styles.media} src={cur.url} alt={cur.name} />}
      </div>
      <div className={styles.info}><b>{cur.caption || cur.name}</b>
        <div className={styles.nav}><button type="button" onClick={() => go(-1)} disabled={open === 0}>← Précédent</button><button type="button" onClick={() => go(1)} disabled={open === items.length - 1}>Suivant →</button></div>
      </div>
    </div> : null}
  </>;
}
