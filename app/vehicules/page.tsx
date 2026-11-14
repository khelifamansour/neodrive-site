"use client";
import { useEffect, useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";
import { DEPOTS, HORIZONS, PORT_TO_DEPOT_DAYS, STAGES, STAGE_ICON, availableOn, depotName, horizonOf, vehicleDepot, vehicleStage, vinValid, type ContainerInfo, type Horizon } from "../../lib/shipments";

type Row = Record<string, any>;
const fmt = (d?: string | Date | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";
const cell: React.CSSProperties = { padding: "7px 6px", borderBottom: "1px solid #eceef1", textAlign: "center", whiteSpace: "nowrap" };
const sel: React.CSSProperties = { width: "auto", padding: 4, fontSize: 13 };
const DEP_KEYS = [...DEPOTS.map(d => d.id as string), ""];

export default function Vehicules() {
  const [code, setCode] = useState(""); const [d, setD] = useState<Row | null>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<number | null>(null); const [showDone, setShowDone] = useState(false);
  const api = async (url: string, body: object, pc = code) => { const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await api("/api/vehicules", { action: "list" }, pc); setD(j); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || "" } catch { } setCode(pc); load(pc).then(() => { if (!pc) setMsg("") }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); try { const m = await fn(); if (m) setMsg(m); await load(); } catch (e) { setMsg("❌ " + (e as Error).message) } setBusy(""); };
  const setV = (id: number, patch: object) => run("v" + id, async () => { await api("/api/vehicules", { action: "set", id, ...patch }); });
  const bulk = (sh: Row, status: string, container?: string) => { const dep = status === "au dépôt" ? (sh.depot || prompt(`Dépôt ? (${DEPOTS.map(x => x.id).join(" / ")})`, DEPOTS[0].id)) : null; if (status === "au dépôt" && !dep) return; run("b" + sh.id, async () => { const j = await api("/api/vehicules", { action: "bulk", shipment_id: sh.id, status, depot: dep, container }); return `✅ ${j.updated} véhicule(s) : ${status}${dep ? " – " + depotName(dep) : ""}`; }); };
  const saveShip = (id: number, ship: Row) => run("s" + id, async () => { await api("/api/conteneurs", { action: "save", id, ship }); });

  const V = useMemo(() => {
    if (!d) return null;
    const ship = (id: number) => d.ships.find((x: Row) => x.id === id);
    const vs: Row[] = (d.vehicles as Row[]).map(v => { const sh = ship(v.shipment_id); return { ...v, sh, stage: vehicleStage(v, sh), dep: vehicleDepot(v, sh) || "", hz: horizonOf(v, sh), avail: availableOn(v, sh) } as Row; });
    const grid: Record<string, Record<Horizon, { free: number; res: number }>> = {};
    for (const k of DEP_KEYS) grid[k] = Object.fromEntries(HORIZONS.map(h => [h, { free: 0, res: 0 }])) as any;
    for (const v of vs) if (v.hz) { const g = grid[DEP_KEYS.includes(v.dep) ? v.dep : ""][v.hz as Horizon]; if (v.client_id) g.res++; else g.free++; }
    const linked = new Set(vs.filter(v => v.client_id).map(v => v.client_id));
    const waiting = (d.clients as Row[]).filter(c => c.status !== "livre" && !linked.has(c.id));
    return { vs, grid, waiting, stageCount: Object.fromEntries(STAGES.map(st => [st, vs.filter(v => v.stage === st).length])) as Record<string, number> };
  }, [d]);

  if (!d || !V) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Véhicules & stock entrant</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button><p style={{ fontSize: 13, marginTop: 12 }}><a href="/organisation" style={{ color: "inherit" }}>Membre de l’équipe ? Connectez-vous avec votre code sur la page Organisation</a></p>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  const freeClients = (v: Row) => (d.clients as Row[]).filter(c => c.status !== "livre" && (c.id === v.client_id || !V.vs.some(x => x.client_id === c.id)));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const photo = (path: string) => api("/api/vehicules", { action: "photo_url", path }).then(j => j.url && window.open(j.url, "_blank")).catch(e => setMsg("❌ " + e.message));

  return <main className={s.page} style={{ maxWidth: 1200 }}>
    <div className={s.top}><div><h1>🚗 Véhicules & stock entrant</h1><p>{STAGES.map(st => `${STAGE_ICON[st]} ${V.stageCount[st]} ${st}`).join(" · ")}</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><a className={s.ghost} href="/conteneurs">📦 Dossiers conteneurs</a><a className={s.ghost} href="/planificateur">🗺️ Planificateur</a></div></div>
    {msg ? <p style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", padding: 10, borderRadius: 10, wordBreak: "break-word" }}>{msg}</p> : null}

    <section className={s.card} style={{ overflowX: "auto" }}>
      <h2>📊 Disponibilités par dépôt</h2>
      <small className={s.muted}>« libres » = sans réservation · « réservés » = déjà attribués à un client. Les véhicules en mer sont comptés disponibles {PORT_TO_DEPOT_DAYS} jours après l'arrivée prévue du navire (dédouanement + transport).</small>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr style={{ background: "#f4f6f9" }}><th style={{ ...cell, textAlign: "left" }}>Dépôt</th>{HORIZONS.map(h => <th key={h} style={cell}>{h === "maintenant" ? "Disponibles maintenant" : h}</th>)}</tr></thead>
        <tbody>{DEP_KEYS.map(k => { const g = V.grid[k]; if (!k && !HORIZONS.some(h => g[h].free + g[h].res)) return null; return <tr key={k}><td style={{ ...cell, textAlign: "left" }}><b>{depotName(k)}</b></td>{HORIZONS.map(h => <td key={h} style={cell}>{g[h].free + g[h].res ? <><b style={{ color: "#15803d", fontSize: 16 }}>{g[h].free}</b> libres<br /><small>{g[h].res} réservés</small></> : "—"}</td>)}</tr>; })}</tbody>
      </table>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><button className={s.ghost} disabled={busy === "hub"} onClick={() => run("hub", async () => { const j = await api("/api/vehicules", { action: "sync_hubs" }); return "✅ Stock du planificateur mis à jour : " + (j.hubs as Row[]).map(h => `${h.name} ${h.stock}`).join(" · "); })}>🔄 Mettre à jour le stock des hubs du planificateur</button><small className={s.muted}>(véhicules au dépôt, pas encore chargés)</small></div>
    </section>

    {V.waiting.length ? <section className={s.card}><h2>🧾 Réservations sans véhicule attribué ({V.waiting.length})</h2>
      <small className={s.muted}>Attribuez un VIN dans la liste des véhicules ci-dessous, ou le chauffeur le fera au chargement.</small>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{V.waiting.map(c => <span key={c.id} style={{ background: "#fff7ed", padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>{c.name} · {c.modele} {c.couleur}{c.status === "planifie" ? " · 🗓️ planifié" : ""}</span>)}</div></section> : null}

    <section className={s.card} style={{ overflowX: "auto", padding: 0 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr style={{ background: "#f4f6f9" }}>{["Conteneur / dossier", "Port", "ETA", "Statut", "Véh.", "En mer / port", "Au dépôt", "Chargés", "Livrés", "Réservés", "Dépôt prévu"].map(h => <th key={h} style={{ ...cell, fontWeight: 700 }}>{h}</th>)}</tr></thead>
        <tbody>{(d.ships as Row[]).filter(sh => showDone || sh.status !== "terminé").map(sh => { const v = V.vs.filter(x => x.shipment_id === sh.id); const days = sh.eta ? Math.round((new Date(sh.eta).getTime() - Date.now()) / 86400000) : null; const c = (st: string) => v.filter(x => x.stage === st).length;
          return <tr key={sh.id} onClick={() => setOpen(open === sh.id ? null : sh.id)} style={{ cursor: "pointer", background: open === sh.id ? "#fff7ed" : undefined }}>
            <td style={{ ...cell, textAlign: "left", whiteSpace: "normal", minWidth: 170 }}><b>{sh.name}</b><br /><small className={s.muted}>{((sh.container_list || []) as ContainerInfo[]).map(x => x.no).join(", ") || "—"}</small></td>
            <td style={cell}>{sh.port || "?"}</td><td style={cell}><b>{fmt(sh.arrived_at || sh.eta)}</b><br /><small>{sh.arrived_at ? "arrivé" : days == null ? "" : days >= 0 ? `J-${days}` : `J+${-days}`}</small></td>
            <td style={cell}>{sh.status}</td><td style={cell}><b>{v.length}</b>{sh.vehicles && sh.vehicles !== v.length ? <small>/{sh.vehicles}</small> : null}</td>
            <td style={cell}>{c("en mer") + c("au port") || "—"}</td><td style={cell}>{c("au dépôt") || "—"}</td><td style={cell}>{c("chargée") || "—"}</td><td style={cell}>{c("livrée") || "—"}</td>
            <td style={cell}>{v.filter(x => x.client_id).length}/{v.length}</td>
            <td style={cell} onClick={e => e.stopPropagation()}><select value={sh.depot || ""} style={sel} onChange={e => saveShip(sh.id, { depot: e.target.value })}><option value="">à définir</option>{DEPOTS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
          </tr>; })}</tbody>
      </table>
      <label style={{ display: "flex", gap: 6, padding: 10, fontSize: 13 }}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} style={{ width: "auto" }} /> Afficher les dossiers terminés</label>
    </section>

    {(d.ships as Row[]).filter(sh => sh.id === open).map(sh => { const v = V.vs.filter(x => x.shipment_id === sh.id); const conts = (sh.container_list || []) as ContainerInfo[];
      return <section key={sh.id} className={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h2>{sh.name}</h2><p className={s.muted}>{sh.port} · ETA {fmt(sh.eta)} · {v.length} véhicule(s) · dépôt prévu : {depotName(sh.depot)}</p></div><button className={s.ghost} onClick={() => setOpen(null)}>Fermer ✕</button></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={s.ghost} disabled={busy === "b" + sh.id} onClick={() => bulk(sh, "au port")}>⚓ Tout le dossier : arrivé au port</button>
          <button className={s.ghost} disabled={busy === "b" + sh.id} onClick={() => bulk(sh, "au dépôt")}>🏠 Tout le dossier : au dépôt</button>
          {conts.length > 1 ? conts.map(c => <button key={c.no} className={s.ghost} disabled={busy === "b" + sh.id} onClick={() => bulk(sh, "au dépôt", c.no)}>🏠 {c.no} au dépôt</button>) : null}
        </div>
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontSize: 13.5, width: "100%" }}>
          <thead><tr>{["VIN", "Cont.", "Étape", "Dépôt", "Dispo", "Réservation / client", "Chauffeur", "Photos"].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead>
          <tbody>{v.map(x => <tr key={x.id} style={{ opacity: busy === "v" + x.id ? .5 : 1 }}>
            <td style={{ ...cell, fontFamily: "monospace" }} title={(x.history || []).map((h: Row) => `${new Date(h.at).toLocaleString("fr-FR")} ${h.stage || ""} ${h.by || ""} ${h.note || ""}`).join("\n")}>{x.vin}{vinValid(x.vin) ? "" : " ⚠️"}</td>
            <td style={cell}>{x.container || "—"}</td>
            <td style={cell}><select value={x.stage} style={sel} onChange={e => setV(x.id, { status: e.target.value })}>{STAGES.map(st => <option key={st} value={st}>{STAGE_ICON[st]} {st}</option>)}</select></td>
            <td style={cell}><select value={x.depot || ""} style={sel} onChange={e => setV(x.id, { depot: e.target.value })}><option value="">{sh.depot ? `(${depotName(sh.depot)})` : "—"}</option>{DEPOTS.map(dp => <option key={dp.id} value={dp.id}>{dp.name}</option>)}</select></td>
            <td style={cell}>{x.stage === "au dépôt" ? "maintenant" : x.avail ? fmt(x.avail) : x.stage === "livrée" ? fmt(x.delivered_at) : x.stage === "chargée" ? "en route" : "?"}</td>
            <td style={cell}>{x.stage === "livrée" ? <b>{x.client_name || "—"}</b> : <select value={x.client_id || ""} style={{ ...sel, maxWidth: 230, background: x.client_id ? "#ecfdf3" : undefined }} onChange={e => setV(x.id, { client_id: e.target.value })}><option value="">— libre —</option>{freeClients(x).map(c => <option key={c.id} value={c.id}>{c.name} · {c.modele} {c.couleur}</option>)}{x.client_id && !freeClients(x).some(c => c.id === x.client_id) ? <option value={x.client_id}>{x.client_name}</option> : null}</select>}</td>
            <td style={cell}>{x.driver || "—"}{x.picked_at ? <><br /><small>{fmt(x.picked_at)}</small></> : null}</td>
            <td style={cell}>{x.plate_photo ? <button className={s.ghost} style={{ padding: "2px 6px" }} onClick={() => photo(x.plate_photo)}>🔢</button> : null}{x.delivery_photo ? <button className={s.ghost} style={{ padding: "2px 6px" }} onClick={() => photo(x.delivery_photo)}>📸</button> : null}</td>
          </tr>)}</tbody></table></div>
        {!v.length ? <p className={s.muted}>Aucun VIN pour ce dossier : ajoutez-les dans « Dossiers conteneurs » ou via le colisage déposé par l'usine.</p> : null}
      </section>; })}

    <section className={s.card}>
      <h2>📱 Liens chauffeur</h2>
      <small className={s.muted}>À envoyer au chauffeur (SMS / WhatsApp). Sans code d'accès : il photographie la plaque VIN au chargement, choisit le client, puis valide la livraison et fait signer l'accusé de réception.</small>
      {(d.links as Row[]).map(l => { const url = l.key ? `${origin}/chauffeur?k=${l.key}` : ""; return <div key={l.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #eee", paddingTop: 8 }}>
        <span style={{ flex: 1, minWidth: 200 }}><b>{l.name || l.id}</b>{l.date ? ` · ${l.date}` : ""}{l.driver ? ` · ${l.driver}` : ""}{l.status ? ` · ${l.status}` : ""}</span>
        {url ? <><button className={s.ghost} style={{ padding: "6px 10px" }} onClick={() => { navigator.clipboard?.writeText(url).catch(() => null); setMsg("🔗 Lien copié : " + url); }}>Copier le lien</button><a className={s.ghost} style={{ padding: "6px 10px" }} href={url} target="_blank" rel="noreferrer">Ouvrir</a></> : <small>CRON_SECRET manquant</small>}
      </div>; })}
    </section>
  </main>;
}
