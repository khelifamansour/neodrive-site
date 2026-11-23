"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";

type Status = "a_faire" | "en_cours" | "fait";
type Video = { id: string; date: string; produit: string; vues: number | null; commentaires: number | null; dm: number | null; prix: number | null; wilayas: string; note: string };
type Contact = { id: string; nom: string; role: string; tel: string; note: string };
type Board = { phases?: Record<string, Status>; videos?: Video[]; contacts?: Contact[] };

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/algerie/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const fmt = (v: number) => v.toLocaleString("fr-FR");

const STATUS: [Status, string, string, string][] = [
  ["a_faire", "À faire", "#f1ede6", "#444"],
  ["en_cours", "En cours", "#fff4d6", "#8a5a00"],
  ["fait", "Fait", "#e7f6ec", "#0a7a3d"],
];
const PRODUITS: [string, string][] = [["camion", "Petit camion / utilitaire"], ["tricycle", "Tricycle"], ["vsp", "Voiture sans permis"], ["autre", "Autre"]];

const UL: React.CSSProperties = { margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.55, fontSize: 15 };
const PHASES: { id: string; title: string; body: React.ReactNode }[] = [
  { id: "p1", title: "Phase 1 – Test de marché TikTok", body: <>
    <ul style={UL}>
      <li>Compte séparé <b>« NeoDrive DZ »</b>.</li>
      <li><b>5 à 10 vidéos</b> en darija sous-titrées en français, sur <b>2–3 semaines</b>.</li>
      <li>Produits : petit camion / utilitaire, tricycles, voiture sans permis.</li>
      <li>Question en fin de vidéo : <b>« votre wilaya en commentaire »</b>.</li>
    </ul>
    <p className={c.msg} style={{ margin: "8px 0 0" }}><b>Règle :</b> dire « bientôt en Algérie » sans date ni prix ; ne prendre <b>ni commande ni argent</b>.</p>
  </> },
  { id: "p2", title: "Phase 2 – Liste d’intérêt", body: <ul style={UL}>
    <li>Collecter : nom, wilaya, produit, usage.</li>
    <li>Plus tard : un formulaire public.</li>
  </ul> },
  { id: "p3", title: "Phase 3 – Équipe en Algérie", body: <>
    <ul style={UL}>
      <li>1–2 personnes en CDI via la société algérienne.</li>
      <li>Règles écrites dès le 1er jour.</li>
      <li>Recruter petit.</li>
      <li>Administratif géré par quelqu’un sur place.</li>
    </ul>
    <p className={c.small} style={{ margin: "6px 0 0" }}><b>Leçons de la 1re expérience :</b> trop de recrutements d’un coup, règles changées en cours de route, fournisseur pas sérieux.</p>
  </> },
  { id: "p4", title: "Phase 4 – Importation / partenaire agréé", body: <ul style={UL}>
    <li>Homologation des véhicules.</li>
    <li>Classification des tricycles.</li>
    <li>Avocat d’affaires.</li>
    <li>AAPI (Agence algérienne de promotion de l’investissement).</li>
    <li>Chambre de commerce algérienne et chambre algéro-française.</li>
  </ul> },
  { id: "p5", title: "Phase 5 – Projet de fabrication", body: <ul style={UL}>
    <li>Terrain ; châssis d’abord, puis composants ; petites voitures puis classiques.</li>
    <li>Communication positive : appel à experts, <b>jamais de critique de l’administration</b>.</li>
    <li>Vidéo devant un gros stock et des livraisons : « 7 ans de métier, réseau en France ».</li>
  </ul> },
];

export default function Algerie() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState("");
  const [phases, setPhases] = useState<Record<string, Status>>({});
  const [videos, setVideos] = useState<Video[]>([]); const [contacts, setContacts] = useState<Contact[]>([]);
  const [dirty, setDirty] = useState<{ videos?: boolean; contacts?: boolean }>({});
  const [saving, setSaving] = useState("");

  const load = useCallback(async (p = code()) => {
    try {
      const j = await api<{ board: Board }>({ action: "list" }, p);
      setPhases(j.board.phases || {}); setVideos(j.board.videos || []); setContacts(j.board.contacts || []);
      setDirty({}); setState("ready");
    } catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg("❌ " + (e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  const save = async (key: "phases" | "videos" | "contacts", value: unknown) => {
    setSaving(key); setMsg("");
    try { await api({ action: "save", key, value }); setDirty(d => ({ ...d, [key]: false })); setMsg("✅ Enregistré."); }
    catch (e) { setMsg("❌ " + (e as Error).message); } finally { setSaving(""); }
  };
  const setPhase = (id: string, s: Status) => { const next = { ...phases, [id]: s }; setPhases(next); save("phases", next); };
  const editVideo = (id: string, k: keyof Video, v: string) => { setVideos(l => l.map(r => r.id === id ? { ...r, [k]: k === "vues" || k === "commentaires" || k === "dm" || k === "prix" ? (v === "" ? null : Number(v.replace(/\D/g, ""))) : v } : r)); setDirty(d => ({ ...d, videos: true })); };
  const editContact = (id: string, k: keyof Contact, v: string) => { setContacts(l => l.map(r => r.id === id ? { ...r, [k]: v } : r)); setDirty(d => ({ ...d, contacts: true })); };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🇩🇿 NeoDrive Algérie</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  // ---- Totaux par produit
  const totals = PRODUITS.map(([p, l]) => {
    const rs = videos.filter(v => v.produit === p);
    const s = (k: "vues" | "commentaires" | "dm" | "prix") => rs.reduce((a, r) => a + (r[k] ?? 0), 0);
    return { p, l, n: rs.length, vues: s("vues"), commentaires: s("commentaires"), dm: s("dm"), prix: s("prix") };
  }).filter(t => t.n > 0);
  const score = (t: { commentaires: number; dm: number; prix: number }) => t.commentaires + 2 * t.dm + 3 * t.prix;
  const best = totals.length > 1 ? [...totals].sort((a, b) => score(b) - score(a))[0] : null;
  const allViews = videos.reduce((a, r) => a + (r.vues ?? 0), 0);
  const avgViews = videos.length ? Math.round(allViews / videos.length) : null;
  const doneCount = PHASES.filter(p => phases[p.id] === "fait").length;

  const cell: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 14, borderRadius: 10 };
  const stat = (l: string, v: string, note?: string) => <div className={c.stat}><p className={c.statLabel}>{l}</p><p className={c.statValue}>{v}</p>{note ? <p className={c.statNote}>{note}</p> : null}</div>;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load().catch(() => null)}>Actualiser</button></div>
    <h1 style={{ margin: "0 0 4px" }}>🇩🇿 NeoDrive Algérie</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Stratégie et test de marché.</p>

    <div className={c.card} style={{ marginTop: 12, borderColor: "#f05a28", background: "#fff4ec", fontSize: 16, lineHeight: 1.5 }}>
      <b>Principe :</b> France d’abord (≈ 90 % de l’énergie). En Algérie, seul le test TikTok est gratuit : une vraie entrée (conteneur, dossiers, équipe, terrain) coûte des centaines de milliers d’euros et des mois. Aucun capital engagé tant que la France n’est pas rentable et autonome, et tant que l’étude de marché ne le justifie pas.
    </div>

    <div className={c.stats} style={{ marginTop: 12 }}>
      {stat("Phases faites", `${doneCount}/${PHASES.length}`, `en cours : ${PHASES.filter(p => phases[p.id] === "en_cours").map(p => p.id.replace("p", "phase ")).join(", ") || "—"}`)}
      {stat("Vidéos publiées", `${videos.length}/10`, videos.length >= 10 ? "✅ prêt pour la décision" : "décision après 10 vidéos")}
      {stat("Vues moyennes", avgViews === null ? "—" : fmt(avgViews), avgViews !== null && avgViews < 500 ? "⚠️ sous 500 vues / vidéo" : "par vidéo")}
      {stat("Produit en tête", best ? best.l : "—", best ? "commentaires + MP + questions prix" : "au moins 2 produits testés")}
    </div>

    {/* ---- Phases */}
    <h2 style={{ fontSize: 19, margin: "22px 0 8px" }}>🧭 Phases</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {PHASES.map(p => { const s = phases[p.id] || "a_faire"; return <div key={p.id} className={c.card} style={s === "en_cours" ? { borderColor: "#f05a28" } : s === "fait" ? { opacity: .8 } : undefined}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <b style={{ fontSize: 16.5 }}>{s === "fait" ? "✅ " : ""}{p.title}</b>
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS.map(([v, l, bg, fg]) => <button key={v} type="button" disabled={saving === "phases"} onClick={() => setPhase(p.id, v)} className={c.btn} style={{ padding: "6px 11px", fontSize: 13, background: s === v ? bg : "#fff", color: s === v ? fg : "#888", border: `1px solid ${s === v ? fg : "#e5e0d8"}` }}>{l}</button>)}
          </div>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.55 }}>{p.body}</div>
      </div>; })}
    </div>

    {/* ---- Test de marché */}
    <h2 style={{ fontSize: 19, margin: "22px 0 8px" }}>📱 Test de marché – suivi des vidéos</h2>
    {totals.length ? <div className={c.tableWrap} style={{ marginBottom: 10 }}>
      <table className={c.table} style={{ minWidth: 520 }}>
        <thead><tr><th>Produit</th><th>Vidéos</th><th>Vues</th><th>Comm.</th><th>MP</th><th>Questions prix</th><th>Vues / vidéo</th></tr></thead>
        <tbody>{totals.map(t => <tr key={t.p} style={best?.p === t.p ? { background: "#fff4ec" } : undefined}>
          <td><b>{best?.p === t.p ? "🏆 " : ""}{t.l}</b></td><td className={c.num}>{t.n}</td><td className={c.num}>{fmt(t.vues)}</td><td className={c.num}>{fmt(t.commentaires)}</td><td className={c.num}>{fmt(t.dm)}</td><td className={c.num}>{fmt(t.prix)}</td><td className={c.num}>{fmt(Math.round(t.vues / t.n))}</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
    <div className={c.tableWrap}>
      <table className={c.table} style={{ minWidth: 1050 }}>
        <thead><tr><th>Date</th><th>Produit</th><th>Vues</th><th>Comm.</th><th>MP</th><th>Q. prix</th><th>Wilayas citées</th><th>Note</th><th /></tr></thead>
        <tbody>
          {videos.length ? videos.map(v => <tr key={v.id}>
            <td style={{ width: 150 }}><input className={c.input} style={cell} type="date" value={v.date} onChange={e => editVideo(v.id, "date", e.target.value)} /></td>
            <td style={{ width: 170 }}><select className={c.input} style={cell} value={v.produit} onChange={e => editVideo(v.id, "produit", e.target.value)}>{PRODUITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
            {(["vues", "commentaires", "dm", "prix"] as const).map(k => <td key={k} style={{ width: k === "vues" ? 95 : 75 }}><input className={c.input} style={cell} inputMode="numeric" value={v[k] ?? ""} onChange={e => editVideo(v.id, k, e.target.value)} /></td>)}
            <td><input className={c.input} style={cell} value={v.wilayas} placeholder="Alger, Oran, Sétif…" onChange={e => editVideo(v.id, "wilayas", e.target.value)} /></td>
            <td><input className={c.input} style={cell} value={v.note} onChange={e => editVideo(v.id, "note", e.target.value)} /></td>
            <td style={{ width: 40 }}><button type="button" className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 9px", color: "#b42318" }} title="Supprimer" onClick={() => { if (confirm("Supprimer cette vidéo ?")) { setVideos(l => l.filter(r => r.id !== v.id)); setDirty(d => ({ ...d, videos: true })); } }}>✕</button></td>
          </tr>) : <tr><td colSpan={9} className={c.small}>Aucune vidéo encore. Ajoute une ligne par vidéo publiée.</td></tr>}
        </tbody>
      </table>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <button type="button" className={`${c.btn} ${c.btnGhost}`} onClick={() => { setVideos(l => [...l, { id: uid(), date: today(), produit: l[l.length - 1]?.produit || "camion", vues: null, commentaires: null, dm: null, prix: null, wilayas: "", note: "" }]); setDirty(d => ({ ...d, videos: true })); }}>+ Ajouter une vidéo</button>
      <button type="button" className={`${c.btn} ${c.btnBrand}`} disabled={!dirty.videos || saving === "videos"} onClick={() => save("videos", videos)}>{saving === "videos" ? "…" : dirty.videos ? "Enregistrer le tableau" : "Tableau enregistré"}</button>
    </div>

    {/* ---- Décision */}
    <div className={c.card} style={{ marginTop: 16 }}>
      <b>🚦 Indicateurs de décision</b>
      <ul style={UL}>
        <li><b>Passer à la phase 2</b> si, après 10 vidéos, un produit obtient nettement plus de commentaires, de messages privés et de questions sur le prix.</li>
        <li><b>Arrêter ou mettre en pause</b> si moins de ~500 vues par vidéo et peu de messages privés.</li>
      </ul>
    </div>

    {/* ---- Risques */}
    <div className={c.card} style={{ marginTop: 12, borderColor: "#f3c2bc" }}>
      <b>⚠️ Risques et règles</b>
      <ul style={UL}>
        <li><b>Vente de véhicules très encadrée</b> en Algérie : ne rien vendre sans agrément.</li>
        <li><b>Facturation entre les sociétés FR / DZ</b> : contrat de prestation au prix de marché, domiciliation bancaire et règles de change, validation par un expert-comptable des deux côtés.</li>
        <li><b>Les commerciaux en Algérie ne signent pas de contrats au nom de la société française</b> (risque d’établissement stable).</li>
        <li><b>Contexte économique</b> à surveiller.</li>
      </ul>
    </div>

    {/* ---- Contacts */}
    <h2 style={{ fontSize: 19, margin: "22px 0 8px" }}>📇 Contacts et notes</h2>
    <div style={{ display: "grid", gap: 8 }}>
      {contacts.map(r => <div key={r.id} className={c.card} style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          <input className={c.input} style={cell} placeholder="Nom" value={r.nom} onChange={e => editContact(r.id, "nom", e.target.value)} />
          <input className={c.input} style={cell} placeholder="Rôle (avocat, comptable, fournisseur…)" value={r.role} onChange={e => editContact(r.id, "role", e.target.value)} />
          <input className={c.input} style={cell} placeholder="Téléphone" inputMode="tel" value={r.tel} onChange={e => editContact(r.id, "tel", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <textarea className={c.input} rows={2} style={{ ...cell, resize: "vertical" }} placeholder="Note" value={r.note} onChange={e => editContact(r.id, "note", e.target.value)} />
          <button type="button" className={`${c.btn} ${c.btnGhost}`} style={{ padding: "6px 10px", color: "#b42318", alignSelf: "flex-start" }} title="Supprimer" onClick={() => { if (confirm(`Supprimer ${r.nom || "ce contact"} ?`)) { setContacts(l => l.filter(x => x.id !== r.id)); setDirty(d => ({ ...d, contacts: true })); } }}>✕</button>
        </div>
      </div>)}
      {!contacts.length ? <p className={c.small} style={{ margin: 0 }}>Aucun contact pour l’instant.</p> : null}
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <button type="button" className={`${c.btn} ${c.btnGhost}`} onClick={() => { setContacts(l => [...l, { id: uid(), nom: "", role: "", tel: "", note: "" }]); setDirty(d => ({ ...d, contacts: true })); }}>+ Ajouter un contact</button>
      <button type="button" className={`${c.btn} ${c.btnBrand}`} disabled={!dirty.contacts || saving === "contacts"} onClick={() => save("contacts", contacts)}>{saving === "contacts" ? "…" : dirty.contacts ? "Enregistrer les contacts" : "Contacts enregistrés"}</button>
    </div>

    {msg ? <p className={c.msg} style={{ position: "sticky", bottom: 12 }}>{msg}</p> : null}
  </div></main>;
}
