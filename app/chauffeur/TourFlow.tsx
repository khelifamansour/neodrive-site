"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import s from "../planificateur/planif.module.css";
import { ScheduleView, downloadIcs } from "../planificateur/Schedule";
import type { Stop } from "../../lib/planif";
import HoursCard from "./HoursCard";
import { PhotoPick, SignInfo, openSign, type ResInfo } from "./DeliverySign";
import { EVENT_LABEL, absFromDate, delayTxt, hhmm, plannedSchedule, stopTown, tourProgress, type TourEvent } from "../../lib/schedule";

type Client = { id: string; name: string; adresse: string; telephone: string; modele: string; couleur: string; status: string; received_at?: string | null; reception?: string | null };
type Veh = { id: number; vin: string; client_id?: string | null; client_name?: string | null; stage: string; has_plate?: boolean };
type Found = { vin: string; label: string; here: boolean };
export type TourData = { tour: { id: string; name: string; date: string; driver: string; status: string; departTime: string; stops: Stop[]; rate?: number; estH?: number; hubId?: string }; clients: Client[]; vehicles: Veh[]; events: TourEvent[]; res?: Record<string, ResInfo> };
type Call = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Geo = { lat: number; lng: number; accuracy: number } | null;
type Stage = "load" | "travel" | "deliver" | "sign" | "wait" | "done";

const PING_MS = 5 * 60 * 1000;
const nav = (p: Stop) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
const waze = (p: Stop) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit" });
const tidy = (v: string, n: number) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n);
const stickyBtn: React.CSSProperties = { fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 62, fontSize: 19, padding: "12px 14px", textAlign: "center", boxSizing: "border-box", cursor: "pointer", textDecoration: "none" };
const smallLink: React.CSSProperties = { background: "none", border: 0, color: "#1e3a8a", fontWeight: 800, fontSize: 15, padding: "10px 4px", textDecoration: "underline", cursor: "pointer" };

/** Position GPS si le chauffeur l'a acceptée : jamais bloquant (8 s max, sinon on continue sans). */
function getPos(): Promise<Geo> {
  return new Promise(ok => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return ok(null);
    const t = setTimeout(() => ok(null), 8000);
    navigator.geolocation.getCurrentPosition(p => { clearTimeout(t); ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); }, () => { clearTimeout(t); ok(null); }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 7500 });
  });
}

/**
 * Tournée du chauffeur : une carte par client (dans l'ordre de la tournée), le client en cours ouvert en haut,
 * et en bas de l'écran un gros bouton « Prochaine étape » : 1 Charger → 2 Je pars / Je suis arrivé → 3 Livrer → 4 Faire signer → 5 Paiement reçu ?
 */
export default function TourFlow({ data, call, upload, reload, msg, onMsg, selId, setSelId, backUrl }: { data: TourData; call: Call; upload: (f: File) => Promise<string>; reload: () => Promise<void>; msg: string; onMsg: (m: string) => void; selId: string | null; setSelId: (id: string | null) => void; backUrl: (cid: string) => string }) {
  const stops = data.tour.stops;
  const [geo, setGeo] = useState<"oui" | "non" | "">(""); const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Date.now()); const [more, setMore] = useState(false);
  const [typing, setTyping] = useState<string | null>(null); const [tail, setTail] = useState(""); const [found, setFound] = useState<Found[] | null>(null);
  const [unknown, setUnknown] = useState<{ cid: string; vin: string } | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({}); const [hand, setHand] = useState<Record<string, string>>({}); const [handOpen, setHandOpen] = useState(false);
  const [here, setHere] = useState<Record<string, boolean>>({}); const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => { try { const g = localStorage.getItem("nd_geo"); if (g === "oui" || g === "non") setGeo(g); } catch { /* privé */ } const it = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(it); }, []);
  const chooseGeo = async (v: "oui" | "non") => { setGeo(v); try { localStorage.setItem("nd_geo", v); } catch { /* privé */ } if (v === "oui") { const p = await getPos(); if (!p) onMsg("⚠️ Position indisponible : ce n’est pas grave, les boutons suffisent."); } };

  const plan = useMemo(() => plannedSchedule(stops, data.tour.date, data.tour.departTime), [stops, data.tour.date, data.tour.departTime]);
  const deliveredIds = data.clients.filter(c => c.status === "livre").map(c => c.id);
  const prog = useMemo(() => tourProgress(stops, plan, data.events, deliveredIds, now), [stops, plan, data.events, deliveredIds.join(","), now]); // eslint-disable-line react-hooks/exhaustive-deps
  const inProgress = prog.started && !prog.finished;
  const lastMilestone = [...data.events].filter(e => e.kind === "depart" || e.kind === "arrive" || e.kind === "livre").sort((a, z) => a.created_at.localeCompare(z.created_at)).pop();
  const driving = lastMilestone?.kind === "depart";

  // Position toutes les 5 minutes, seulement pendant la tournée en cours, page ouverte et position acceptée
  const callRef = useRef(call); useEffect(() => { callRef.current = call; });
  useEffect(() => {
    if (geo !== "oui" || !inProgress) return;
    const ping = async () => { if (document.visibilityState !== "visible") return; const p = await getPos(); if (p) callRef.current({ action: "event", kind: "position", ...p }).catch(() => null); };
    const it = setInterval(ping, PING_MS); return () => clearInterval(it);
  }, [geo, inProgress]);

  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); onMsg(""); try { const m = await fn(); if (m) onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };
  const event = async (body: Record<string, unknown>) => { const p = geo === "oui" ? await getPos() : null; const j = await call({ action: "event", ...body, ...(p || {}) }); await reload(); return j; };

  // ── État de chaque client
  const clientStops = stops.map((p, i) => ({ p, i })).filter(x => x.p.kind === "client");
  const ordered = [...clientStops.map(x => data.clients.find(c => c.id === x.p.id)).filter((c): c is Client => !!c), ...data.clients.filter(c => !clientStops.some(x => x.p.id === c.id))];
  const stopIdx = (cid: string) => stops.findIndex(p => p.kind === "client" && p.id === cid);
  const vehOf = (cid: string) => data.vehicles.find(v => v.client_id === cid && v.stage !== "livrée") || data.vehicles.find(v => v.client_id === cid);
  const info = (c: Client) => {
    const v = vehOf(c.id); const ri = data.res?.[c.id];
    const delivered = v?.stage === "livrée" || c.status === "livre" || prog.delivered.has(c.id);
    const signed = ri ? !!ri.signed_at : !!c.received_at;
    const reserveWait = !!ri && !!ri.reserve_at && !ri.paid && !ri.signed_at;
    const i = stopIdx(c.id);
    const arrived = prog.pos === i && prog.phase === "arrived";
    const stage: Stage = !v && !delivered ? "load" : !delivered ? (arrived || here[c.id] ? "deliver" : "travel") : signed ? "done" : reserveWait ? "wait" : "sign";
    return { v, ri, delivered, signed, reserveWait, stage, i, paid: !!ri?.paid };
  };
  const all = ordered.map(c => ({ c, ...info(c) }));
  const atClient = all.find(x => x.i >= 0 && x.i === prog.pos && prog.phase === "arrived" && !x.delivered);
  const active = (x: typeof all[number]) => x.stage !== "done" && x.stage !== "wait";
  // Client en cours : chez qui on est ; avant le départ, la prochaine voiture à charger ; sinon le premier client pas fini.
  const current = atClient || (!prog.started ? all.find(x => x.stage === "load") : undefined) || all.find(active) || all.find(x => x.stage === "wait") || null;
  const sel = all.find(x => x.c.id === selId) || current;
  const rest = all.filter(x => x !== sel);

  // ── Actions
  const loadFor = async (cid: string, vehicleId: number, path: string | null, force = false): Promise<string> => {
    const j = await call({ action: "load", vehicle_id: vehicleId, client_id: cid, depot: data.tour.hubId || null, path, force });
    if (j.conflict) { if (confirm(j.error)) return loadFor(cid, vehicleId, path, true); return ""; }
    setTyping(null); setTail(""); setFound(null); setUnknown(null); await reload();
    return "✅ Voiture chargée.";
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyMatch = async (cid: string, m: any, path: string | null): Promise<string> => {
    const veh = m?.vehicle;
    if (!veh) { setUnknown({ cid, vin: m?.vin || "" }); return "⚠️ Ce numéro n’est pas dans le stock : vérifiez la plaque."; }
    if (veh.stage === "livrée") return `⚠️ ${veh.vin} est déjà livrée.`;
    if (veh.client_id && veh.client_id !== cid && !confirm(`Cette voiture est prévue pour ${veh.client_name || "un autre client"}. La charger quand même pour ce client ?`)) return "";
    return loadFor(cid, veh.id, path);
  };
  const loadPhoto = (cid: string, f: File) => run("load", async () => {
    const path = await upload(f);
    const j = await call({ action: "read_vin", path });
    if (!j.read || !j.match) { setTyping(cid); return "⚠️ Numéro illisible : reprenez la photo ou tapez le numéro."; }
    return applyMatch(cid, j.match, path);
  });
  const searchTail = (q: string) => { setTail(q); if (q.length < 3) { setFound(null); return; } call({ action: "search_vin", q, depot: data.tour.hubId || null }).then(j => setFound(j.results || [])).catch(() => setFound([])); };
  const pickVin = (cid: string, vin: string) => run("load", async () => { const j = await call({ action: "match", vin }); return applyMatch(cid, j.match, null); });
  const addUnknown = (cid: string, vin: string) => run("load", async () => { const j = await call({ action: "add_vehicle", vin, depot: data.tour.hubId || null }); return applyMatch(cid, j.match, null); });

  const depart = () => run("go", async () => { await event({ kind: "depart", stop_index: prog.pos }); return "🚚 Bonne route !"; });
  const arrive = (cid: string, i: number) => run("go", async () => { await event({ kind: "arrive", stop_index: i, client_id: cid }); return ""; });
  const doDeliver = async (cid: string, plate: string | null) => {
    const x = all.find(y => y.c.id === cid);
    await event({ kind: "livre", client_id: cid, stop_index: x?.i ?? null, plate_path: plate, path: hand[cid] || null, vin_confirm: manual[cid] || null });
    setHandOpen(false); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    return "✅ Voiture remise. Faites signer le client.";
  };
  const deliver = (cid: string, plate: string | null) => run("deliver", () => doDeliver(cid, plate));
  const deliverPhoto = (cid: string, f: File) => run("deliver", async () => doDeliver(cid, await upload(f)));
  const sign = (x: typeof all[number]) => run("sign", async () => {
    if (!x.ri) { if (x.c.reception) { window.location.href = x.c.reception; return; } return "Pas de réservation liée à ce client : appelez Mansour."; }
    await openSign(call, x.c.id, backUrl(x.c.id));
  });
  const checkPaid = (cid: string) => run("paid", async () => { const j = await call({ action: "get" }); await reload(); return j.res?.[cid]?.paid ? "💶 Paiement reçu." : "⏳ Paiement pas encore arrivé. Passez au client suivant : la page se met à jour toute seule."; });
  const nextClient = () => { setSelId(null); onMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // ── Bouton « Prochaine étape » (toujours la prochaine action du client affiché)
  const typed = sel ? manual[sel.c.id] || "" : "";
  const typedOk = !!sel?.v && typed.length >= 4 && sel.v.vin.endsWith(typed);
  const cam = (label: string, onFile: (f: File) => void) => <label className={s.primary} style={{ ...stickyBtn, opacity: busy ? .6 : 1 }}>{busy ? "Envoi…" : label}<input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} /></label>;
  const btn = (label: string, onClick: () => void, key = "x", tone: "go" | "ghost" = "go") => <button className={tone === "go" ? s.primary : s.ghost} style={stickyBtn} disabled={!!busy} onClick={onClick}>{busy === key ? "…" : label}</button>;
  let next: React.ReactNode = null;
  const leftToFinish = all.some(active);
  if (!sel) next = btn("🏁 Aucun client sur cette tournée", () => null);
  else if (sel.stage === "load") next = cam("1 · 📷 Charger : photo de la plaque", f => loadPhoto(sel.c.id, f));
  else if (sel.stage === "travel") next = driving && sel.i >= 0 ? btn(`2 · 📍 Je suis arrivé chez ${sel.c.name}`, () => arrive(sel.c.id, sel.i), "go") : btn(`2 · 🚚 Je pars${sel.i >= 0 ? ` chez ${sel.c.name}` : ""}`, depart, "go");
  else if (sel.stage === "deliver") next = sel.v?.has_plate || typedOk ? btn("3 · ✅ Voiture remise au client", () => deliver(sel.c.id, null), "deliver") : cam("3 · 📷 Livrer : photo de la plaque", f => deliverPhoto(sel.c.id, f));
  else if (sel.stage === "sign") next = btn("4 · ✍️ Faire signer le bon de livraison", () => sign(sel), "sign");
  else if (sel.stage === "wait") next = btn("5 · 💶 Paiement reçu ?", () => checkPaid(sel.c.id), "paid");
  else if (leftToFinish && sel !== current) next = btn("➡️ Client suivant", nextClient);
  else if (!prog.finished && prog.nextIndex != null && stops[prog.nextIndex]?.kind === "depot") next = driving ? btn("📍 Arrivé au dépôt", () => run("go", async () => { await event({ kind: "arrive", stop_index: prog.nextIndex }); return "🏁 Tournée terminée. Merci !"; }), "go") : btn("🚚 Je rentre au dépôt", depart, "go");
  else next = btn("🏁 Tournée terminée", () => null, "x", "ghost");

  const steps = (x: typeof all[number]) => {
    const it = (ok: boolean, txt: string) => <span style={{ color: ok ? "#067647" : "#9aa3ad", fontWeight: ok ? 800 : 600, whiteSpace: "nowrap" }}>{ok ? "✅" : "○"} {txt}</span>;
    return <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 14 }}>{it(!!x.v || x.delivered, "chargée")}{it(x.delivered, "livrée")}{it(x.signed || !!x.ri?.reserve_at, "bon signé")}{it(x.paid, "payé")}</div>;
  };
  const stopOf = (x: typeof all[number]) => x.i >= 0 ? stops[x.i] : null;

  if (!stops.length) return <section className={s.card}><h2>🗓️ Ma tournée</h2><p className={s.muted}>L’itinéraire n’est pas encore prêt : demandez à Mansour.</p></section>;

  return <>
    {geo === "" ? <section className={s.geo} style={{ marginTop: 10 }}>
      <b>📍 Partager ma position pendant la tournée ?</b>
      <span>Seulement pendant la tournée en cours. Vous pouvez refuser.</span>
      <div><button className={s.primary} onClick={() => chooseGeo("oui")}>Oui</button><button className={s.ghost} onClick={() => chooseGeo("non")}>Non merci</button></div>
    </section> : null}

    {sel ? <section className={s.nextCard} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <h3>{sel.c.name}</h3>
        {prog.delayMin != null && inProgress ? <small className={prog.delayMin > 10 ? s.late : s.ontime}>{delayTxt(prog.delayMin)}</small> : null}
      </div>
      <small className={s.muted}>📍 {sel.c.adresse}{sel.c.modele ? ` · ${sel.c.modele}${sel.c.couleur ? " " + sel.c.couleur : ""}` : ""}</small>
      {steps(sel)}
      {sel.stage === "travel" || sel.stage === "deliver" ? <div style={{ display: "grid", gridTemplateColumns: sel.c.telephone ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
        {sel.c.telephone ? <a className={s.ghost} href={`tel:${sel.c.telephone.replace(/\s/g, "")}`}>📞 Appeler</a> : null}
        {stopOf(sel) ? <><a className={s.ghost} href={waze(stopOf(sel)!)} target="_blank" rel="noreferrer">🚙 Waze</a><a className={s.ghost} href={nav(stopOf(sel)!)} target="_blank" rel="noreferrer">🧭 Maps</a></> : null}
      </div> : null}

      {sel.stage === "load" ? <>
        <b>1. Charger la voiture : plaque du numéro de série</b>
        <PhotoPick busy={busy === "load"} disabled={!!busy} onFile={f => loadPhoto(sel.c.id, f)} />
        {typing === sel.c.id ? <div style={{ display: "grid", gap: 6 }}>
          <input autoFocus value={tail} onChange={e => searchTail(tidy(e.target.value, 17))} placeholder="Fin du numéro, ex. 483" style={{ fontFamily: "monospace", fontSize: 20 }} />
          {found ? found.length ? found.map(f => <button key={f.vin} className={s.ghost} style={{ justifyContent: "flex-start", textAlign: "left", fontFamily: "monospace", ...(f.here ? { borderColor: "#16a34a" } : {}) }} disabled={!!busy} onClick={() => pickVin(sel.c.id, f.vin)}>{f.vin}{f.here ? " ✅" : ""}</button>) : <small className={s.err}>Aucune voiture trouvée. Tapez le numéro complet (17 caractères).</small> : null}
          {tail.length === 17 && !found?.some(f => f.vin === tail) ? <button className={s.ghost} disabled={!!busy} onClick={() => pickVin(sel.c.id, tail)}>Utiliser {tail}</button> : null}
        </div> : <button style={smallLink} onClick={() => { setTyping(sel.c.id); setTail(""); setFound(null); }}>⌨️ Taper le numéro</button>}
        {unknown?.cid === sel.c.id && unknown.vin.length === 17 ? <div className={s.err} style={{ fontWeight: 400, display: "grid", gap: 6 }}>Le numéro <b style={{ fontFamily: "monospace" }}>{unknown.vin}</b> n’est pas dans le stock.<button className={s.primary} disabled={!!busy} onClick={() => addUnknown(sel.c.id, unknown.vin)}>C’est bien lui : l’ajouter et charger</button></div> : null}
      </> : null}

      {sel.stage === "travel" ? <>
        <small className={s.muted}>{driving ? "En route." : "Voiture chargée : partez quand vous êtes prêt."}{prog.etaOf(sel.i) != null && sel.i >= 0 ? ` Arrivée prévue vers ${hhmm(prog.etaOf(sel.i)!)}.` : ""}</small>
        <button style={smallLink} onClick={() => setHere(h => ({ ...h, [sel.c.id]: true }))}>Déjà chez le client : livrer</button>
      </> : null}

      {sel.stage === "deliver" ? <>
        <b>3. Livrer : {sel.v ? <span style={{ fontFamily: "monospace" }}>{sel.v.vin}</span> : null}</b>
        {sel.v?.has_plate ? <small className={s.okTxt}>✅ Plaque déjà photographiée au chargement.</small> : <>
          <small className={s.muted}>Photo de la plaque pour vérifier que c’est la bonne voiture :</small>
          <PhotoPick busy={busy === "deliver"} disabled={!!busy} onFile={f => deliverPhoto(sel.c.id, f)} />
          {typing === "d" + sel.c.id ? <label className={s.field}>4 derniers caractères du numéro<input autoFocus value={typed} maxLength={6} onChange={e => setManual(m => ({ ...m, [sel.c.id]: tidy(e.target.value, 6) }))} placeholder="ex. 0483" style={{ fontFamily: "monospace", fontSize: 20 }} />{typed.length >= 4 ? (typedOk ? <small className={s.okTxt}>✅ C’est la bonne voiture</small> : <small className={s.err}>⚠️ Ce n’est pas la voiture prévue</small>) : null}</label>
            : <button style={smallLink} onClick={() => setTyping("d" + sel.c.id)}>⌨️ Taper le numéro</button>}
        </>}
        {handOpen || hand[sel.c.id] ? <><small className={s.muted}>{hand[sel.c.id] ? "✅ Photo de la voiture prête." : "Photo de la voiture chez le client (facultatif) :"}</small><PhotoPick busy={busy === "hand"} disabled={!!busy} onFile={f => run("hand", async () => { const p = await upload(f); setHand(h => ({ ...h, [sel.c.id]: p })); return "✅ Photo prête."; })} /></>
          : <button style={smallLink} onClick={() => setHandOpen(true)}>📷 Photo de la voiture chez le client (facultatif)</button>}
      </> : null}

      {(sel.stage === "sign" || sel.stage === "wait" || sel.stage === "done") && sel.ri ? <SignInfo cid={sel.c.id} ri={sel.ri} call={call} reload={reload} onMsg={onMsg} /> : null}
      {sel.stage === "sign" && !sel.ri && !sel.c.reception ? <small className={s.err}>Pas de réservation liée à ce client : appelez Mansour.</small> : null}
      {sel.stage === "wait" && leftToFinish ? <button className={s.ghost} onClick={nextClient}>➡️ Client suivant</button> : null}
    </section> : null}

    <section className={s.card} style={{ gap: 8 }}>
      <h2>Clients ({all.filter(x => x.delivered).length}/{all.length} livrés)</h2>
      {rest.map(x => <button key={x.c.id} onClick={() => { setSelId(x.c.id); onMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "grid", gap: 4, textAlign: "left", background: x === current ? "#fffaf5" : "#fff", border: `1.5px solid ${x === current ? "#e8592a" : "#ece6dd"}`, borderRadius: 14, padding: "12px 12px", font: "inherit", color: "inherit" }}>
        <b style={{ fontSize: 16 }}>{x.i >= 0 ? `${stops[x.i].label}. ` : ""}{x.c.name}{x === current ? " · en cours" : ""}</b>
        <small className={s.muted}>{x.c.adresse}</small>
        {steps(x)}
      </button>)}
    </section>

    <section className={s.card} style={{ gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {prog.paused ? <button className={s.ghost} disabled={!!busy} onClick={() => run("p", async () => { await event({ kind: "reprise", stop_index: prog.pos }); return "▶️ Reprise notée."; })}>▶️ Reprise</button>
          : <button className={s.ghost} disabled={!!busy || !prog.started} onClick={() => run("p", async () => { await event({ kind: "pause", stop_index: prog.pos }); return "☕ Pause notée."; })}>☕ Pause</button>}
        <button className={s.ghost} style={{ color: "#b42318" }} onClick={() => setProblem(problem == null ? "" : null)}>⚠️ Problème</button>
      </div>
      {problem != null ? <div style={{ display: "grid", gap: 8 }}>
        <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} placeholder="Panne, retard, client absent…" style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d7db", font: "inherit", fontSize: 16 }} />
        <button className={s.primary} disabled={!!busy || problem.trim().length < 3} onClick={() => run("pb", async () => { await event({ kind: "probleme", stop_index: prog.pos, client_id: sel?.c.id || null, note: problem.trim() }); setProblem(null); return "⚠️ Problème envoyé. Si c’est urgent, appelez Mansour."; })}>Envoyer</button>
      </div> : null}
      {geo ? <small className={s.muted}>{geo === "oui" ? <>📍 Position partagée pendant la tournée. <button style={smallLink} onClick={() => chooseGeo("non")}>Arrêter</button></> : <>📍 Position non partagée. <button style={smallLink} onClick={() => chooseGeo("oui")}>Partager</button></>}</small> : null}
      <button className={s.ghost} onClick={() => setMore(v => !v)}>{more ? "Masquer" : "🕒 Planning, heures et journal"}</button>
    </section>

    {more ? <>
      <section className={s.card}>
        <div className={s.rowHead}><h2>🕒 Planning</h2><button className={s.small} onClick={() => downloadIcs(plan, stops, data.tour.name, data.tour.id)}>📅 Agenda</button></div>
        <ScheduleView sched={prog.live || plan} nowAbs={absFromDate(data.tour.date, now)} doneStops={new Set(stops.map((x, i) => x.kind === "client" && prog.delivered.has(x.id) ? i : -1).filter(i => i >= 0))} />
        {data.events.filter(e => e.kind !== "position").length ? <ul className={s.log}>{data.events.filter(e => e.kind !== "position").slice(-8).reverse().map((e, k) => <li key={e.id || k}><time>{fmt(e.created_at)}</time><span>{EVENT_LABEL[e.kind] || e.kind}{e.stop_index != null && stops[e.stop_index] ? ` · ${stops[e.stop_index].kind === "client" ? stops[e.stop_index].name : stopTown(stops[e.stop_index])}` : ""}{e.note ? ` — ${e.note}` : ""}</span></li>)}</ul> : null}
      </section>
      <HoursCard events={data.events} now={now} rate={data.tour.rate || 25} estH={data.tour.estH || 0} tourName={data.tour.name || "Tournée"} driver={data.tour.driver || ""} busy={busy} send={async (key, body, ok) => { setBusy(key); onMsg(""); try { const j = await event(body); onMsg(ok); return j; } catch (e) { onMsg("❌ " + (e as Error).message); return null; } finally { setBusy(""); } }} upload={upload} addTickets={async paths => { await call({ action: "tickets", paths }); await reload(); }} onMsg={onMsg} />
    </> : null}

    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "rgba(255,255,255,.97)", borderTop: "1px solid #ece6dd", boxShadow: "0 -6px 20px rgba(22,32,46,.08)", padding: "8px 12px calc(10px + env(safe-area-inset-bottom))" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 6 }}>
        {msg ? <div className={msg.startsWith("❌") || msg.startsWith("⚠️") ? s.err : s.ok} style={{ padding: "8px 10px", fontSize: 14 }}>{msg}</div> : <small className={s.muted} style={{ textAlign: "center" }}>Prochaine étape{sel ? ` · ${sel.c.name}` : ""}</small>}
        {next}
      </div>
    </div>
  </>;
}
