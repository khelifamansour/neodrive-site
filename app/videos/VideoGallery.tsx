"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryVideo } from "./data";
import type { SectionKey } from "./selection";
import styles from "./videos.module.css";

type Section = { key: SectionKey; title: string; intro: string };

function formatDuration(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Vignette = vraie image de la vidéo (#t=0.5), chargée seulement quand la carte approche de l'écran. */
function Poster({ src, onDuration }: { src: string; onDuration: (d: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.poster}>
      {visible && (
        <video
          className={ready ? styles.posterReady : undefined}
          src={`${src}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
          onLoadedMetadata={e => onDuration(e.currentTarget.duration)}
          onLoadedData={() => setReady(true)}
        />
      )}
    </div>
  );
}

export default function VideoGallery({ videos, sections }: { videos: GalleryVideo[]; sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const pushedRef = useRef(false);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  const indexFromHash = useCallback(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash.startsWith("v-")) return null;
    const i = videos.findIndex(v => `v-${v.key}` === hash);
    return i >= 0 ? i : null;
  }, [videos]);

  const open = useCallback((i: number) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    const hash = `#v-${videos[i].key}`;
    if (window.location.hash !== hash) {
      if (pushedRef.current) history.replaceState(null, "", hash);
      else { history.pushState(null, "", hash); pushedRef.current = true; }
    }
    setOpenIndex(i);
  }, [videos]);

  const close = useCallback(() => {
    if (pushedRef.current) { pushedRef.current = false; history.back(); }
    else history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpenIndex(null);
  }, []);

  // Lien direct /videos#v-... (anciens liens /videos/[id] redirigés ici) + bouton Retour du téléphone
  useEffect(() => {
    const initial = indexFromHash();
    if (initial !== null) {
      document.getElementById(`v-${videos[initial].key}`)?.scrollIntoView({ block: "center" });
      setOpenIndex(initial);
    }
    const onPop = () => { pushedRef.current = false; setOpenIndex(indexFromHash()); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [indexFromHash, videos]);

  const isOpen = openIndex !== null;

  // Clavier, blocage du défilement, focus
  useEffect(() => {
    if (!isOpen) {
      lastFocus.current?.focus?.();
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.target instanceof HTMLVideoElement) return; // flèches = avance/retour dans la vidéo
      else if (e.key === "ArrowRight") setOpenIndex(i => (i === null ? i : Math.min(videos.length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setOpenIndex(i => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener("keydown", onKey); };
  }, [isOpen, close, videos.length]);

  // Garder l'URL à jour quand on passe à la vidéo suivante / précédente
  useEffect(() => {
    if (openIndex === null) return;
    const hash = `#v-${videos[openIndex].key}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
    const p = playerRef.current;
    if (p) p.play().catch(() => { /* lecture auto refusée : les contrôles restent visibles */ });
  }, [openIndex, videos]);

  const current = openIndex !== null ? videos[openIndex] : null;
  return (
    <>
      {sections.map(section => {
        const list = videos.map((v, i) => ({ v, i })).filter(({ v }) => v.section === section.key);
        if (list.length === 0) return null;
        return (
          <section key={section.key} id={section.key} className={styles.section} aria-labelledby={`h-${section.key}`}>
            <div className={styles.sectionHead}>
              <h2 id={`h-${section.key}`}>{section.title}</h2>
              <p>{section.intro}</p>
            </div>
            <ul className={styles.grid}>
              {list.map(({ v, i }) => {
                const d = formatDuration(durations[v.key]);
                return (
                  <li key={v.key} id={`v-${v.key}`} className={styles.card}>
                    <button type="button" className={styles.cardButton} onClick={() => open(i)} aria-label={`Lire la vidéo : ${v.title}`}>
                      <Poster src={v.src} onDuration={dur => setDurations(s => (s[v.key] ? s : { ...s, [v.key]: dur }))} />
                      <span className={styles.shade} aria-hidden="true" />
                      <span className={styles.play} aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
                      {d && <span className={styles.duration}>{d}</span>}
                      <span className={styles.cardText}>
                        <span className={styles.category}>{v.category}</span>
                        <span className={styles.cardTitle}>{v.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {current && openIndex !== null && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={current.title} onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className={styles.modalBar}>
            <span className={styles.modalCount}>{openIndex + 1} / {videos.length}</span>
            <button ref={closeBtn} type="button" className={styles.modalClose} onClick={close} aria-label="Fermer la vidéo">✕</button>
          </div>
          <div className={styles.modalStage} onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <video
              key={current.key}
              ref={playerRef}
              className={styles.player}
              src={current.src}
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>
          <div className={styles.modalInfo}>
            <span className={styles.category}>{current.category}</span>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <div className={styles.modalNav}>
              <button type="button" onClick={() => setOpenIndex(openIndex - 1)} disabled={openIndex === 0}>← Précédente</button>
              <button type="button" onClick={() => setOpenIndex(openIndex + 1)} disabled={openIndex === videos.length - 1}>Suivante →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
