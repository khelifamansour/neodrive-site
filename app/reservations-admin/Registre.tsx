"use client";
import { useEffect, useMemo, useState } from "react";
import c from "../giga/giga.module.css";
import { normalizePhone, whatsappLink, REVIEW_URL } from "../../lib/clients";

/** Registre clients : livraison, numéro de série (VIN) et avis Google, client par client. */
export type RegRow = {
  id: number; prenom: string; nom: string; telephone: string; ville: string; code_postal: string; modele: string; couleur: string;
  statut: string; created_at: string; vin?: string | null; avis_google?: string | null; avis_at?: string | null;
  nouvelles_at?: string | null; avis_demande_at?: string | null;
  accuse_token?: string | null; livre_at?: string | null; accuse_data?: { reglement?: { mode: string; amount: number }[] | null; driver_name?: string | null } | null;
};
type Vin = { vin: string; container: string | null; status: string | null };
type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const fold = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const first = (r: RegRow) => { const p = (r.prenom || "").trim().split(/\s+/)[0] || ""; return p && !/^(mme|mr|m\.|madame|monsieur)$/i.test(p) ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""; };
const nomPropre = (n: string) => (n || "").replace(/\(.*?\)/g, "").trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, x: string, y: string) => x + y.toUpperCase());
const salut = (r: RegRow) => { if (first(r)) return " " + first(r); const p = (r.prenom || "").trim().toLowerCase(); const civ = /^(mme|madame)$/.test(p) ? "Madame" : /^(mr|m\.|monsieur)$/.test(p) ? "Monsieur" : ""; const n = nomPropre(r.nom); return civ && n ? ` ${civ} ${n}` : n ? ` ${n}` : ""; };
const msgNouvelles = (r: RegRow) => `Bonjour${salut(r)}, j'espère que vous allez bien. Je voulais juste savoir comment ça se passait avec votre véhicule, si vous en êtes content, et si vous avez besoin de quoi que ce soit. Mansour – NeoDrive`;
const msgAvis = (r: RegRow) => `Merci beaucoup${salut(r)}, ça me fait très plaisir ! Si vous avez 30 secondes, un petit avis sur Google nous aiderait énormément, cela rassure les personnes qui hésitent à se lancer : ${REVIEW_URL} Merci encore et bonne route ! Mansour – NeoDrive`;
const day = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
const FILTERS = [["tous", "Tous"], ["livres", "✅ Livrés"], ["alivrer", "⏳ À livrer"], ["sansavis", "⭐ Sans avis"], ["sansvin", "🔢 Sans n° de série"]] as const;

export default function Registre({ rows, api, onSaved }: { rows: RegRow[]; api: Api; onSaved: (msg: string) => void }) {
  const [filter, setFilter] = useState<string>("tous");
  const [q, setQ] = useState("");
  const [vins, setVins] = useState<Vin[]>([]);
  const [draft, setDraft] = useState<Record<number, { vin: string; avis: string; avis_at: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<Record<number, string>>({});

  useEffect(() => { api<{ vins: Vin[] }>({ action: "vins" }).then(j => setVins(j.vins || [])).catch(() => null); }, [api, rows]);

  const base = rows.filter(r => r.statut !== "Annulée");
  const livre = (r: RegRow) => r.statut === "Livrée";
  const counts = {
    tous: base.length, livres: base.filter(livre).length, alivrer: base.filter(r => !livre(r)).length,
    sansavis: base.filter(r => livre(r) && !r.avis_google).length, sansvin: base.filter(r => livre(r) && !r.vin).length,
  } as Record<string, number>;
  const shown = useMemo(() => {
    const t = fold(q.trim());
    return base
      .filter(r => filter === "tous" ? true : filter === "livres" ? livre(r) : filter === "alivrer" ? !livre(r) : filter === "sansavis" ? livre(r) && !r.avis_google : livre(r) && !r.vin)
      .filter(r => !t || fold(`${r.prenom} ${r.nom} ${r.ville} ${r.code_postal} ${r.telephone} ${r.vin || ""}`).includes(t))
      .sort((a, b) => Number(livre(b)) - Number(livre(a)) || fold(a.nom).localeCompare(fold(b.nom)));
  }, [base, filter, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = (r: RegRow) => draft[r.id] || { vin: r.vin || "", avis: r.avis_google || "", avis_at: r.avis_at || "" };
  const setD = (r: RegRow, patch: Partial<{ vin: string; avis: string; avis_at: string }>) => setDraft({ ...draft, [r.id]: { ...d(r), ...patch } });
  const changed = (r: RegRow) => { const x = d(r); return x.vin !== (r.vin || "") || x.avis !== (r.avis_google || "") || x.avis_at !== (r.avis_at || ""); };

  const save = async (r: RegRow) => {
    const x = d(r); const vin = x.vin.toUpperCase().replace(/[\s-]/g, "");
    if (vin && !VIN_RE.test(vin)) { setErr({ ...err, [r.id]: "Le numéro de série doit faire 17 caractères (lettres et chiffres, sans I, O ni Q)." }); return; }
    setBusy(r.id); setErr({ ...err, [r.id]: "" });
    try {
      await api({ action: "update", id: r.id, vin, avis_google: x.avis, avis_at: x.avis_at });
      const n = { ...draft }; delete n[r.id]; setDraft(n);
      onSaved(`✅ ${r.prenom} ${r.nom} enregistré.`);
    } catch (e) { setErr({ ...err, [r.id]: (e as Error).message }); }
    finally { setBusy(null); }
  };
  const markDelivered = async (r: RegRow) => {
    setBusy(r.id);
    try { await api({ action: "update", id: r.id, statut: "Livrée" }); onSaved(`✅ ${r.prenom} ${r.nom} marqué livré.`); }
    catch (e) { setErr({ ...err, [r.id]: (e as Error).message }); } finally { setBusy(null); }
  };
  const sendWa = async (r: RegRow, kind: "nouvelles" | "avis") => {
    const ph = normalizePhone(r.telephone);
    if (!ph.valid) { setErr({ ...err, [r.id]: "Numéro de téléphone à vérifier avant d’envoyer." }); return; }
    window.open(whatsappLink(ph.intl, kind === "nouvelles" ? msgNouvelles(r) : msgAvis(r)), "_blank");
    try { await api({ action: "update", id: r.id, [kind === "nouvelles" ? "nouvelles_at" : "avis_demande_at"]: true }); onSaved(kind === "nouvelles" ? `💬 Message de nouvelles ouvert pour ${r.prenom} ${r.nom}.` : `⭐ Demande d’avis ouverte pour ${r.prenom} ${r.nom}.`); } catch { /* l'envoi WhatsApp reste possible */ }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => onSaved(`📋 ${t} copié.`)).catch(() => null); };

  return <section style={{ marginTop: 14 }}>
    <p className={c.muted} style={{ margin: "0 0 10px" }}>Un client par ligne : livré ou non, numéro de série (VIN) et avis Google. Complétez au fur et à mesure des livraisons.</p>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
      {FILTERS.map(([k, l]) => <button key={k} className={`${c.btn} ${filter === k ? c.btnBrand : c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => setFilter(k)}>{l} ({counts[k] || 0})</button>)}
    </div>
    <input className={c.input} value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 Chercher un nom, une ville, un téléphone, un n° de série…" style={{ marginBottom: 10 }} />
    <datalist id="reg-vins">{vins.map(v => <option key={v.vin} value={v.vin}>{[v.container, v.status].filter(Boolean).join(" · ")}</option>)}</datalist>
    {shown.length ? <div style={{ display: "grid", gap: 8 }}>{shown.map(r => {
      const x = d(r); const ok = livre(r);
      return <div key={r.id} className={c.card} style={{ display: "grid", gap: 8, padding: 12, borderColor: ok ? "#a6e3b8" : undefined }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className={c.badge} style={{ background: ok ? "#e7f6ec" : "#fff4d6", color: "#111" }}>{ok ? "✅ Livré" : `⏳ ${r.statut}`}</span>
          <b style={{ fontSize: 16 }}>{r.prenom} {r.nom}</b>
          {r.avis_google ? <span className={c.badge} style={{ background: "#fef3c7", color: "#92400e" }}>⭐ Avis laissé</span> : ok ? <span className={c.badge} style={{ background: "#f1f1f1", color: "#555" }}>Pas d’avis</span> : null}
        </div>
        <div className={c.muted} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span>📍 {r.ville || "—"}{r.code_postal ? ` (${r.code_postal})` : ""}</span>
          <span>🚗 {r.modele || "—"}{r.couleur ? ` · ${r.couleur}` : ""}</span>
          {r.telephone ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} onClick={() => copy(r.telephone)}>📋 {r.telephone}</button> : null}
          {r.accuse_token ? <a className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} href={`/api/accuse/${r.accuse_token}`} target="_blank" rel="noreferrer">📄 Accusé signé</a> : null}
          {r.accuse_data?.reglement?.length ? <span style={{ fontSize: 13, padding: "4px 8px", borderRadius: 8, background: r.accuse_data.reglement.some(l => l.mode === "especes") ? "#fff4d6" : "#f1ede6" }}>
            💶 Règlement déclaré : {r.accuse_data.reglement.map(l => `${l.mode === "especes" ? `espèces remises à ${r.accuse_data?.driver_name || "au chauffeur"}` : l.mode === "virement" ? "virement" : l.mode === "carte" ? "carte" : "autre"} ${Math.round(l.amount).toLocaleString("fr-FR")} €`).join(" · ")}
            {r.accuse_data.reglement.some(l => l.mode === "especes") ? <b> → à récupérer auprès de {r.accuse_data.driver_name || "du chauffeur"}</b> : null}
          </span> : null}
          {!ok ? <button className={`${c.btn} ${c.btnGhost}`} style={{ padding: "4px 10px" }} disabled={busy === r.id} onClick={() => { if (confirm(`Marquer ${r.prenom} ${r.nom} comme livré ?`)) markDelivered(r); }}>Marquer livré</button> : null}
        </div>
        {ok && !r.avis_google ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#f6faf7", borderRadius: 10, padding: 8 }}>
          <button className={`${c.btn} ${c.btnBrand}`} style={{ padding: "6px 12px", background: "#1fa855" }} onClick={() => sendWa(r, "nouvelles")}>1️⃣ Prendre des nouvelles</button>
          {r.nouvelles_at ? <span className={c.muted}>envoyé le {day(r.nouvelles_at)}</span> : null}
          <button className={`${c.btn} ${r.nouvelles_at ? c.btnBrand : c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => { if (r.nouvelles_at || confirm("Conseil : envoyez d’abord le message de nouvelles, et demandez l’avis seulement si la réponse est positive. Continuer quand même ?")) sendWa(r, "avis"); }}>2️⃣ Demander un avis</button>
          {r.avis_demande_at ? <span className={c.muted}>demandé le {day(r.avis_demande_at)}</span> : null}
        </div> : null}
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>N° de série (VIN)
            <input className={c.input} list="reg-vins" value={x.vin} maxLength={17} autoCapitalize="characters" spellCheck={false} placeholder="17 caractères, ex. LP4SE0D0…" onChange={e => setD(r, { vin: e.target.value.toUpperCase() })} style={{ fontFamily: "monospace" }} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Date de l’avis
            <input className={c.input} type="date" value={x.avis_at} onChange={e => setD(r, { avis_at: e.target.value })} /></label>
        </div>
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Avis Google
          <textarea className={c.input} rows={x.avis ? 3 : 1} value={x.avis} onChange={e => setD(r, { avis: e.target.value })} placeholder="Collez le texte de l’avis (ou laissez vide s’il n’y en a pas)" /></label>
        {err[r.id] ? <p className={c.err} style={{ margin: 0 }}>{err[r.id]}</p> : null}
        {changed(r) ? <div><button className={`${c.btn} ${c.btnBrand}`} disabled={busy === r.id} onClick={() => save(r)}>{busy === r.id ? "…" : "Enregistrer"}</button></div> : null}
      </div>; })}</div> : <p className={c.muted}>Aucun client dans cette liste.</p>}
  </section>;
}
