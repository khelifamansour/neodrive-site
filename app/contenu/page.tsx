"use client";
import { useEffect, useMemo, useState } from "react";

type Item = { id: string; kind: "photo" | "video" | "document"; title: string; source: string; url: string | null; preview: string | null; tags?: string[]; created_at?: string | null };
const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "9px 14px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 14 });
const FILTERS = [["all", "Tout"], ["photo", "📷 Photos"], ["video", "🎬 Vidéos"], ["document", "📄 Documents"]] as const;
const PAGE = 48;

export default function Contenu() {
  const [code, setCode] = useState(""); const [items, setItems] = useState<Item[] | null>(null); const [msg, setMsg] = useState(""); const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<string>("all"); const [q, setQ] = useState(""); const [shown, setShown] = useState(PAGE); const [playing, setPlaying] = useState<string | null>(null); const [busy, setBusy] = useState("");

  const api = async (body: object, pc = code) => { const r = await fetch("/api/contenu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (r.status === 401) setItems(null); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await api({ action: "list" }, pc); setItems(j.items); if (pc) try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { (async () => { let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || "" } catch { } setCode(pc); await load(pc); if (!pc) setMsg(""); setReady(true); })(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const words = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    return (items || []).filter(i => (filter === "all" || i.kind === filter) && words.every(w => `${i.title} ${(i.tags || []).join(" ")} ${i.source}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(w)));
  }, [items, filter, q]);
  const count = (k: string) => (items || []).filter(i => k === "all" || i.kind === k).length;

  const download = async (it: Item) => {
    setBusy(it.id); setMsg("");
    try { const j = await api({ action: "download", id: it.id }); const a = document.createElement("a"); a.href = j.url; a.download = j.name || ""; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
    catch (e) { setMsg((e as Error).message) } finally { setBusy("") }
  };

  if (!ready) return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, Arial, sans-serif", padding: 24 }}>Chargement…</main>;
  if (!items) return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, Arial, sans-serif" }}><form onSubmit={e => { e.preventDefault(); load(); }} style={{ maxWidth: 380, margin: "0 auto", padding: "80px 16px" }}>
    <h1 style={{ fontSize: 22 }}>Contenu NeoDrive</h1>
    <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code d’accès" style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", boxSizing: "border-box" }} />
    <button style={{ ...btn(C.brand), width: "100%", marginTop: 10, padding: 12 }}>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}
    <p style={{ fontSize: 13 }}><a href="/organisation" style={{ color: "inherit" }}>Membre de l’équipe ? Connectez-vous avec votre code sur la page Organisation</a></p>
  </form></main>;

  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}><div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 80px" }}>
    <p style={{ margin: "0 0 6px" }}><a href="/organisation" style={{ color: C.brand, fontWeight: 700, textDecoration: "none" }}>← Organisation</a></p>
    <h1 style={{ fontSize: 26, margin: "4px 0" }}>🎬 Contenu</h1>
    <p style={{ color: C.mute, margin: "0 0 12px" }}>Les photos, vidéos et documents de NeoDrive, prêts à être utilisés pour les réseaux sociaux et les clients. Touchez « Télécharger » pour récupérer un fichier.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", position: "sticky", top: 0, background: C.bg, padding: "8px 0", zIndex: 2 }}>
      {FILTERS.map(([k, l]) => <button key={k} onClick={() => { setFilter(k); setShown(PAGE); }} style={{ ...btn(filter === k ? C.brand : "#fff"), color: filter === k ? "#fff" : C.ink, border: `1px solid ${C.line}` }}>{l} <span style={{ opacity: .7, fontWeight: 500 }}>{count(k)}</span></button>)}
      <input value={q} onChange={e => { setQ(e.target.value); setShown(PAGE); }} placeholder="Rechercher (ex. livraison, intérieur, catalogue)…" style={{ flex: "1 1 220px", padding: 10, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", minWidth: 0 }} />
    </div>
    {msg ? <p style={{ color: "#b91c1c", fontWeight: 600 }}>{msg}</p> : null}
    {!list.length ? <p style={{ color: C.mute }}>Aucun fichier ne correspond.</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 8 }}>
      {list.slice(0, shown).map(it => <div key={it.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ aspectRatio: "4 / 5", background: "#eee9e1", display: "grid", placeItems: "center", overflow: "hidden" }}>
          {it.kind === "photo" && it.preview ? <img src={it.preview} alt={it.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : it.kind === "video" && it.url ? (playing === it.id ? <video src={it.url} controls autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
              : <button onClick={() => setPlaying(it.id)} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 44 }} aria-label="Lire la vidéo">▶️</button>)
            : <span style={{ fontSize: 48 }} aria-hidden>📄</span>}
        </div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} title={it.title}>{it.title}</div>
          <div style={{ fontSize: 12, color: C.mute }}>{it.kind === "photo" ? "Photo" : it.kind === "video" ? "Vidéo" : "Document PDF"} · {it.source}</div>
          <div style={{ marginTop: "auto", display: "flex", gap: 6 }}>
            <button onClick={() => download(it)} disabled={busy === it.id} style={{ ...btn(), flex: 1, padding: "8px 6px", fontSize: 13 }}>{busy === it.id ? "…" : "⬇ Télécharger"}</button>
            {it.kind === "document" && it.url ? <a href={it.url} target="_blank" rel="noopener" style={{ ...btn("#777"), padding: "8px 10px", fontSize: 13, textDecoration: "none" }}>Voir</a> : null}
          </div>
        </div>
      </div>)}
    </div>
    {list.length > shown ? <div style={{ textAlign: "center", marginTop: 16 }}><button onClick={() => setShown(shown + PAGE)} style={btn("#555")}>Voir plus ({list.length - shown} restants)</button></div> : null}
  </div></main>;
}
