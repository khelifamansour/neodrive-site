"use client";
import { useState } from "react";
import c from "../giga/giga.module.css";
import { prepMessage, prepSmsText } from "../../lib/carte-grise";

type R = { id: number; prenom: string | null; nom: string | null; telephone: string | null; ville: string | null; modele: string | null; statut: string | null; livre_at: string | null; vin: string | null; link: string | null; dossier: { id: number; status: string } | null };
type Link = { link: string; message: string; phone: string | null };
const intl = (p: string | null) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("00") ? d.slice(2) : d.startsWith("0") ? "33" + d.slice(1) : d; };
const wa = (r: R, l: Link) => `https://wa.me/${intl(r.telephone)}?text=${encodeURIComponent(l.message)}`;
const sms = (r: R, l: Link) => `sms:${String(r.telephone || "").replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(prepSmsText(r.prenom, l.link))}`;
const name = (r: R) => [r.prenom, r.nom].filter(Boolean).join(" ") || `Réservation ${r.id}`;
const copy = (t: string) => { try { void navigator.clipboard?.writeText(t); return true; } catch { return false; } };

/** Liens « préparer ma carte grise » (avant la livraison) : copie du lien et message WhatsApp / SMS pré-rempli, par réservation. */
export default function PrepLinks({ call }: { call: <T>(body: object) => Promise<T> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<R[] | null>(null);
  const [migrated, setMigrated] = useState(true);
  const [q, setQ] = useState(""); const [all, setAll] = useState(false);
  const [links, setLinks] = useState<Record<number, Link>>({});
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    try { const j = await call<{ reservations: R[]; migrated: boolean }>({ action: "prep_list" }); setRows(j.reservations); setMigrated(j.migrated); }
    catch (e) { setMsg("❌ " + (e as Error).message); }
  };
  const toggle = () => { const next = !open; setOpen(next); if (next && !rows) void load(); };

  /** Lien connu : copié et WhatsApp ouvert dans le même clic. Sinon le jeton est créé, puis les boutons WhatsApp / SMS s'affichent. */
  const go = async (r: R) => {
    setMsg("");
    if (r.link) {
      const l = { link: r.link, message: prepMessage(r.prenom, r.link), phone: r.telephone };
      setLinks(m => ({ ...m, [r.id]: l })); copy(r.link);
      if (r.telephone) window.open(wa(r, l), "_blank", "noopener");
      setMsg(`🔗 Lien de ${name(r)} copié.`);
      return;
    }
    setBusy(r.id);
    try {
      const l = await call<Link>({ action: "prep_link", reservation_id: r.id });
      setLinks(m => ({ ...m, [r.id]: l })); setRows(list => list?.map(x => x.id === r.id ? { ...x, link: l.link } : x) || list);
      setMsg(copy(l.link) ? `🔗 Lien de ${name(r)} créé et copié : envoyez-le par WhatsApp ou SMS ci-dessous.` : `🔗 Lien de ${name(r)} : ${l.link}`);
    } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); }
  };

  const needle = q.trim().toLowerCase();
  const shown = (rows || []).filter(r => all || needle || (r.statut !== "Livrée" && !r.livre_at) || !r.dossier)
    .filter(r => !needle || [r.id, r.prenom, r.nom, r.telephone, r.ville, r.vin].join(" ").toLowerCase().includes(needle)).slice(0, 80);

  return <div className={c.card} style={{ marginBottom: 14 }}>
    <button type="button" onClick={toggle} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
      <b style={{ fontSize: 16 }}>📨 Préparer la carte grise avant la livraison</b> <span className={c.muted}>{open ? "▲" : "▼"}</span>
      <div className={c.small} style={{ marginTop: 2 }}>Lien personnel par réservation : pièce d’identité + justificatif maintenant, plaque VIN + mandat signé après la livraison.</div>
    </button>
    {open ? <div style={{ marginTop: 10 }}>
      {!migrated ? <p className={c.err}>Migration 20261127090000_carte_grise_preparation.sql à appliquer (colonne reservations.cg_prep_token) avant de créer des liens.</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className={c.input} style={{ flex: "1 1 200px" }} placeholder="Rechercher (nom, téléphone, ville, n°)" value={q} onChange={e => setQ(e.target.value)} />
        <label className={c.small}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Toutes les réservations</label>
      </div>
      {msg ? <p className={c.msg}>{msg}</p> : null}
      {!rows ? <p className={c.muted}>Chargement…</p> : !shown.length ? <p className={c.empty}>Aucune réservation.</p> : null}
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {shown.map(r => { const l = links[r.id]; return <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className={c.small} style={{ lineHeight: 1.45 }}>
              <b style={{ fontSize: 15 }}>{name(r)}</b> · n° {r.id} · {r.statut || "—"}{r.ville ? ` · ${r.ville}` : ""}{r.modele ? ` · ${r.modele}` : ""}<br />
              {r.telephone || "pas de téléphone"} · {r.dossier ? `🪪 dossier : ${r.dossier.status}` : "pas encore de dossier carte grise"}{r.vin ? ` · VIN …${r.vin.slice(-6)}` : ""}
            </div>
            <button className={`${c.btn} ${c.btnBrand}`} style={{ fontSize: 14, padding: "9px 12px" }} disabled={busy !== null || !migrated} onClick={() => go(r)}>{busy === r.id ? "…" : "Lien carte grise (préparer)"}</button>
          </div>
          {l ? <div className={c.small} style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {r.telephone ? <><a href={wa(r, l)} target="_blank" rel="noreferrer">WhatsApp</a><a href={sms(r, l)}>SMS</a></> : <span>Pas de téléphone : copiez le lien.</span>}
            <a href={l.link} target="_blank" rel="noreferrer">Ouvrir le lien</a>
            <button type="button" className={`${c.btn} ${c.btnGhost}`} style={{ fontSize: 13, padding: "6px 10px" }} onClick={() => { copy(l.message); setMsg(`📋 Message de ${name(r)} copié.`); }}>Copier le message</button>
          </div> : null}
        </div>; })}
      </div>
    </div> : null}
  </div>;
}
