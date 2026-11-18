"use client";
import { useState } from "react";

/**
 * Tickets en un geste : un bouton, plusieurs photos d'un coup, rien à remplir.
 * NeoDrive lit ensuite chaque ticket (date, commerçant, montant, catégorie).
 */
export default function TicketsBulk({ upload, save, todayCount, onMsg, btnClass }: { upload: (f: File) => Promise<string>; save: (paths: string[]) => Promise<void>; todayCount: number; onMsg: (m: string) => void; btnClass: string }) {
  const [left, setLeft] = useState(0); const [thumbs, setThumbs] = useState<string[]>([]);
  const pick = async (files: FileList | null) => {
    const list = Array.from(files || []).slice(0, 30); if (!list.length) return;
    setLeft(list.length);
    const paths: string[] = []; const urls: string[] = [];
    for (const f of list) {
      try { paths.push(await upload(f)); urls.push(URL.createObjectURL(f)); } catch (e) { onMsg("❌ " + (e as Error).message); }
      setLeft(n => n - 1);
    }
    if (!paths.length) return;
    try { setLeft(-1); await save(paths); setThumbs(t => [...urls, ...t].slice(0, 30)); onMsg(`🧾 ${paths.length} ticket${paths.length > 1 ? "s" : ""} ajouté${paths.length > 1 ? "s" : ""}. Merci !`); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setLeft(0); }
  };
  return <div style={{ display: "grid", gap: 8 }}>
    <label className={btnClass} style={{ cursor: "pointer", textAlign: "center", fontSize: 18, padding: 16 }}>{left > 0 ? `Envoi… (${left})` : left < 0 ? "Lecture des tickets…" : "📸 Ajouter mes tickets"}
      <input type="file" accept="image/*" multiple hidden disabled={left !== 0} onChange={e => { const f = e.target.files; pick(f).finally(() => { e.target.value = ""; }); }} /></label>
    <small style={{ color: "#555" }}>{todayCount ? `${todayCount} ticket${todayCount > 1 ? "s" : ""} ajouté${todayCount > 1 ? "s" : ""} aujourd’hui.` : "Aucun ticket aujourd’hui."} Plusieurs photos d’un coup, rien à remplir : c’est trié automatiquement.</small>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {thumbs.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{thumbs.map(u => <img key={u} src={u} alt="ticket" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />)}</div> : null}
  </div>;
}
