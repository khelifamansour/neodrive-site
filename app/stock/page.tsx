"use client";
import { useEffect, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import s from "../planificateur/planif.module.css";
import { supabase } from "../../lib/supabase";
import { CG_STATUS, STARTS, STOCK_STATUS, defaultAd, nextStep, type StockRow } from "../../lib/oldstock";

const FIELDS: [string, string, string?][] = [["ref", "Référence / n° interne"], ["model", "Modèle (marque)"], ["version", "Version"], ["color", "Couleur"], ["year", "Année"], ["km", "Kilométrage", "number"], ["vin", "N° de série (VIN)"], ["location", "Emplacement"], ["price_min", "Prix minimum accepté (€)", "number"], ["price_ad", "Prix de l'annonce (€)", "number"]];
const COLORS = { red: "#fee2e2", orange: "#fef3c7", green: "#dcfce7", grey: "#f3f4f6" };
const FILTERS = ["tous", "carte grise manquante", "à réparer", "prêt / en vente", "vendus"] as const;
const box: React.CSSProperties = { background: "#fafaf9", borderRadius: 12, padding: 12, display: "grid", gap: 8 };
const ta: React.CSSProperties = { font: "inherit", padding: 10, borderRadius: 12, border: "1px solid #d4d7db" };

export default function Stock() {
  const [code, setCode] = useState(""); const [rows, setRows] = useState<StockRow[] | null>(null); const [media, setMedia] = useState<StockRow[]>([]);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(""); const [open, setOpen] = useState<number | null>(null); const [filter, setFilter] = useState<typeof FILTERS[number]>("tous");
  const api = async (body: object, pc = code) => { const r = await fetch("/api/stock", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await api({ action: "list" }, pc); setRows(j.rows); setMedia(j.media); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || "" } catch { } setCode(pc); load(pc).then(() => { if (!pc) setMsg("") }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (k: string, fn: () => Promise<string | void>) => { setBusy(k); try { const m = await fn(); if (m) setMsg(m); await load(); } catch (e) { setMsg("❌ " + (e as Error).message) } setBusy(""); };
  const save = (id: number | null, row: StockRow) => run("save", async () => { const j = await api({ action: "save", id, row }); if (!id && j.id) setOpen(j.id); });
  const upload = (id: number, files: FileList | null) => run("up" + id, async () => {
    if (!files?.length) return; const list = Array.from(files);
    const init = await api({ action: "upload_init", id, files: list.map(f => ({ name: f.name, type: f.type })) });
    const done = [];
    for (const [i, u] of init.uploads.entries()) { const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path, u.token, list[i], { contentType: list[i].type || "application/octet-stream" }); if (!error) done.push(u); }
    await api({ action: "media_add", id, items: done });
    return `✅ ${done.length}/${list.length} fichier(s) ajouté(s)`;
  });
  const genAd = (v: StockRow) => run("ai" + v.id, async () => { const j = await api({ action: "ai_ad", id: v.id }); await api({ action: "save", id: v.id, row: { ad_title: j.title, ad_text: j.text } }); return "✅ Annonce générée : relisez-la avant de publier"; });
  const download = async (v: StockRow) => {
    setBusy("zip" + v.id); setMsg("Préparation du fichier…");
    try {
      const ad = v.ad_text ? { title: v.ad_title || "", text: v.ad_text } : defaultAd(v);
      const files: Record<string, Uint8Array> = { "annonce.txt": strToU8(`${ad.title}\n\n${ad.text}\n`) };
      const list = media.filter(m => m.stock_id === v.id && m.url);
      for (const [i, m] of list.entries()) { const buf = new Uint8Array(await (await fetch(m.url)).arrayBuffer()); const ext = (m.name.split(".").pop() || (m.kind === "video" ? "mp4" : "jpg")).toLowerCase(); files[`${String(i + 1).padStart(2, "0")}-${m.kind}.${ext}`] = buf; }
      const blob = new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `annonce-${(v.ref || v.model || "vehicule").replace(/[^a-z0-9]+/gi, "-")}-${v.id}.zip`; a.click(); setMsg(`✅ ${list.length} média(s) + annonce téléchargés`);
    } catch (e) { setMsg("❌ Téléchargement impossible : " + (e as Error).message); }
    setBusy("");
  };

  if (!rows) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Ancien stock</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button><p style={{ fontSize: 13, marginTop: 12 }}><a href="/organisation" style={{ color: "inherit" }}>Membre de l’équipe ? Connectez-vous avec votre code sur la page Organisation</a></p>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;

  const active = rows.filter(r => r.status !== "vendu");
  const cgMissing = active.filter(r => r.cg_status === "manquante").length;
  const ready = active.filter(r => ["prêt à vendre", "en vente", "réservé"].includes(r.status)).length;
  const value = active.reduce((t, r) => t + Number(r.price_ad || 0), 0); const floor = active.reduce((t, r) => t + Number(r.price_min || 0), 0);
  const cash = rows.filter(r => r.status === "vendu").reduce((t, r) => t + Number(r.sold_price || 0), 0);
  const shown = rows.filter(r => filter === "tous" ? true : filter === "carte grise manquante" ? r.cg_status === "manquante" && r.status !== "vendu" : filter === "à réparer" ? (r.status === "à réparer" || r.starts === "non") && r.status !== "vendu" : filter === "vendus" ? r.status === "vendu" : ["prêt à vendre", "en vente", "réservé"].includes(r.status));
  const stat = (label: string, val: string | number, bg = "#fff") => <div style={{ background: bg, border: "1px solid #ece6dd", borderRadius: 14, padding: "10px 12px" }}><small style={{ color: "#5b6573" }}>{label}</small><div style={{ fontSize: 22, fontWeight: 800 }}>{val}</div></div>;

  return <main className={s.page} style={{ maxWidth: 1100 }}>
    <div className={s.top}><div><h1>🚗 Ancien stock</h1><p>Inventaire, photos, annonces et carte grise : objectif, tout vendre vite pour financer le nouveau stock.</p></div><button className={s.ghost} onClick={() => save(null, { model: prompt("Modèle (ex. Ligier JS50, Aixam City…)") || "Véhicule", status: "à inventorier" })}>+ Ajouter un véhicule</button></div>
    {msg ? <p style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", padding: 10, borderRadius: 10 }}>{msg}</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
      {stat("Véhicules à vendre", active.length)}{stat("Prêts / en vente", ready, "#f0fdf4")}{stat("Carte grise manquante", cgMissing, cgMissing ? "#fee2e2" : "#fff")}{stat("Valeur affichée", `${value.toLocaleString("fr-FR")} €`)}{stat("Prix plancher total", `${floor.toLocaleString("fr-FR")} €`)}{stat("Déjà encaissé", `${cash.toLocaleString("fr-FR")} €`, "#ecfeff")}
    </div>
    <div className={s.seg} style={{ marginTop: 12 }}>{FILTERS.map(f => <button key={f} className={filter === f ? s.on : ""} onClick={() => setFilter(f)}>{f}</button>)}</div>

    {shown.map(v => { const m = media.filter(x => x.stock_id === v.id); const step = nextStep(v, m.filter(x => x.kind === "photo").length); const isOpen = open === v.id;
      return <section key={v.id} className={s.card}>
        {v.cg_status === "manquante" && v.status !== "vendu" ? <div style={{ background: "#dc2626", color: "#fff", fontWeight: 900, fontSize: 18, padding: "10px 14px", borderRadius: 12, textAlign: "center" }}>⛔ CARTE GRISE MANQUANTE — retrouver les papiers</div> : null}
        <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", flexWrap: "wrap" }} onClick={() => setOpen(isOpen ? null : v.id)}>
          {m.find(x => x.kind === "photo")?.url ? <img src={m.find(x => x.kind === "photo")!.url} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 10 }} /> : <div style={{ width: 96, height: 72, borderRadius: 10, background: "#f3f4f6", display: "grid", placeItems: "center" }}>📷</div>}
          <div style={{ flex: 1, minWidth: 200 }}><h2 style={{ margin: 0 }}>{[v.ref ? `#${v.ref}` : "", v.model, v.version].filter(Boolean).join(" ")}</h2>
            <p className={s.muted} style={{ margin: "2px 0" }}>{[v.color, v.year, v.km != null ? `${Number(v.km).toLocaleString("fr-FR")} km` : "km ?", v.starts === "oui" ? "démarre ✅" : v.starts === "non" ? "ne démarre pas ❌" : "démarrage ?", `carte grise : ${v.cg_status}`, `${m.length} média(s)`].filter(Boolean).join(" · ")}</p>
            <div style={{ display: "inline-block", background: COLORS[step.level], padding: "4px 10px", borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}>👉 {step.text}</div></div>
          <div style={{ textAlign: "right" }}><b>{v.status}</b><br /><span style={{ fontSize: 18, fontWeight: 800 }}>{v.price_ad ? `${Number(v.price_ad).toLocaleString("fr-FR")} €` : "prix ?"}</span>{v.price_min ? <><br /><small>plancher {Number(v.price_min).toLocaleString("fr-FR")} €</small></> : null}</div>
        </div>
        {isOpen ? <>
          <div style={box}><b>📸 Photos et vidéos ({m.length})</b>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{m.map(x => <div key={x.id} style={{ position: "relative" }}>{x.kind === "video" ? <video src={x.url} style={{ width: 150, height: 110, objectFit: "cover", borderRadius: 10 }} controls /> : <a href={x.url} target="_blank" rel="noreferrer"><img src={x.url} alt="" style={{ width: 150, height: 110, objectFit: "cover", borderRadius: 10 }} /></a>}<button onClick={() => confirm("Supprimer ce média ?") && run("d", async () => { await api({ action: "media_delete", mid: x.id }); })} style={{ position: "absolute", top: 4, right: 4, border: 0, borderRadius: 999, background: "#0009", color: "#fff", width: 24, height: 24 }}>✕</button></div>)}</div>
            <label className={s.ghost} style={{ textAlign: "center", cursor: "pointer" }}>{busy === "up" + v.id ? "Envoi en cours…" : "➕ Ajouter des photos / vidéos (plusieurs à la fois)"}<input type="file" accept="image/*,video/*" multiple hidden onChange={e => upload(v.id, e.target.files)} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            {FIELDS.map(([k, l, type]) => <label key={k} className={s.field}>{l}<input type={type || "text"} defaultValue={v[k] ?? ""} onBlur={e => String(e.target.value) !== String(v[k] ?? "") && save(v.id, { [k]: e.target.value })} /></label>)}
            <label className={s.field}>Statut<select defaultValue={v.status} onChange={e => save(v.id, { status: e.target.value })}>{STOCK_STATUS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className={s.field}>Carte grise<select defaultValue={v.cg_status} onChange={e => save(v.id, { cg_status: e.target.value })} style={{ background: v.cg_status === "manquante" ? "#fee2e2" : undefined }}>{CG_STATUS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className={s.field}>Démarre ?<select defaultValue={v.starts} onChange={e => save(v.id, { starts: e.target.value })}>{STARTS.map(x => <option key={x}>{x}</option>)}</select></label>
            {v.status === "vendu" ? <label className={s.field}>Prix de vente réel (€)<input type="number" defaultValue={v.sold_price ?? ""} onBlur={e => save(v.id, { sold_price: e.target.value })} /></label> : null}
          </div>
          {[["condition", "État général (carrosserie, intérieur…)"], ["repairs", "Réparations à faire"], ["cg_notes", "Carte grise : où sont les papiers, démarches"], ["notes", "Notes internes"]].map(([k, l]) => <label key={k} className={s.field}>{l}<textarea rows={2} defaultValue={v[k] || ""} onBlur={e => e.target.value !== (v[k] || "") && save(v.id, { [k]: e.target.value })} style={ta} /></label>)}
          <div style={box}><b>📝 Annonce</b>
            <input key={"t" + v.ad_title} defaultValue={v.ad_title || ""} placeholder="Titre de l'annonce" onBlur={e => e.target.value !== (v.ad_title || "") && save(v.id, { ad_title: e.target.value })} />
            <textarea key={"x" + v.ad_text} rows={9} defaultValue={v.ad_text || ""} placeholder="Texte de l'annonce" onBlur={e => e.target.value !== (v.ad_text || "") && save(v.id, { ad_text: e.target.value })} style={ta} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className={s.primary} disabled={busy === "ai" + v.id} onClick={() => genAd(v)}>{busy === "ai" + v.id ? "Rédaction…" : "✨ Générer l'annonce"}</button>
              <button className={s.ghost} disabled={busy === "zip" + v.id} onClick={() => download(v)}>⬇️ Télécharger photos + annonce</button>
              <button className={s.ghost} onClick={() => { const ad = v.ad_text ? { title: v.ad_title || "", text: v.ad_text } : defaultAd(v); navigator.clipboard?.writeText(`${ad.title}\n\n${ad.text}`).catch(() => null); setMsg("📋 Annonce copiée"); }}>📋 Copier l'annonce</button>
              <button className={s.ghost} onClick={() => confirm("Supprimer ce véhicule et ses médias ?") && run("del", async () => { await api({ action: "delete", id: v.id }); })}>🗑 Supprimer</button>
            </div>
          </div>
        </> : null}
      </section>; })}
    {!shown.length ? <p className={s.muted}>Aucun véhicule ici pour l'instant. Cliquez sur « + Ajouter un véhicule », ou envoyez-moi les photos et les informations : je remplis la fiche.</p> : null}
  </main>;
}
