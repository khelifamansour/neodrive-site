"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./parts.module.css";

export type PickedPart = { id: string; sku: string | null; name: string; category: string | null; image_url: string | null; sale_price?: number | null };

/** Choix facultatif des pièces concernées (recherche avec photos dans le catalogue). */
export default function PartsPicker({ value, onChange }: { value: PickedPart[]; onChange: (p: PickedPart[]) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState<boolean | null>(null); // catalogue vide ?
  const [openList, setOpenList] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const j = await fetch(`/api/sav/parts${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`).then(r => r.json());
        const list = (j.parts || []) as PickedPart[];
        setResults(list);
        if (!q.trim()) setEmpty(list.length === 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, q ? 250 : 0);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const has = (id: string) => value.some(v => v.id === id);
  const toggle = (p: PickedPart) => onChange(has(p.id) ? value.filter(v => v.id !== p.id) : [...value, p].slice(0, 12));

  if (empty && !value.length) return <p className={styles.note}>Le catalogue des pièces est en cours de mise à jour : décrivez simplement la pièce dans votre message.</p>;

  return <div className={styles.box}>
    {value.length ? <ul className={styles.chosen}>{value.map(p => <li key={p.id}>
      {p.image_url ? <img src={p.image_url} alt="" /> : <span className={styles.noimg}>🔧</span>}
      <span><b>{p.name}</b>{p.sku ? <small>Réf. {p.sku}</small> : null}</span>
      <button type="button" onClick={() => toggle(p)} aria-label={`Retirer ${p.name}`}>×</button>
    </li>)}</ul> : null}
    <input type="search" value={q} onChange={e => { setQ(e.target.value); setOpenList(true); }} onFocus={() => setOpenList(true)} placeholder="Chercher une pièce : rétroviseur, chargeur, phare…" aria-label="Chercher une pièce" />
    {openList ? <div className={styles.results}>
      {loading && !results.length ? <p className={styles.note}>Recherche…</p> : null}
      {!loading && !results.length ? <p className={styles.note}>Aucune pièce trouvée. Décrivez-la dans votre message.</p> : null}
      <ul>{results.map(p => <li key={p.id}><button type="button" className={has(p.id) ? styles.on : ""} onClick={() => toggle(p)}>
        {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <span className={styles.noimg}>🔧</span>}
        <span><b>{p.name}</b><small>{[p.sku && `Réf. ${p.sku}`, p.category].filter(Boolean).join(" · ")}</small></span>
        <i>{has(p.id) ? "✓" : "+"}</i>
      </button></li>)}</ul>
      <button type="button" className={styles.done} onClick={() => setOpenList(false)}>Fermer la liste</button>
    </div> : null}
  </div>;
}
