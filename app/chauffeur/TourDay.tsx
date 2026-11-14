"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import s from "../planificateur/planif.module.css";
import { ScheduleView, downloadIcs } from "../planificateur/Schedule";
import type { Stop } from "../../lib/planif";
import { EVENT_LABEL, absFromDate, dayLabel, dayOf, delayTxt, hhmm, plannedSchedule, stopTown, tourProgress, type TourEvent } from "../../lib/schedule";

type Client = { id: string; name: string; adresse: string; telephone: string; modele: string; couleur: string; status: string };
type Veh = { id: number; vin: string; client_id?: string | null; client_name?: string | null; stage: string; has_plate?: boolean };
export type TourData = { tour: { id: string; name: string; date: string; driver: string; status: string; departTime: string; stops: Stop[] }; clients: Client[]; vehicles: Veh[]; events: TourEvent[] };
type Call = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Geo = { lat: number; lng: number; accuracy: number } | null;

const PING_MS = 5 * 60 * 1000;
const nav = (p: Stop) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
const waze = (p: Stop) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit" });
const big: React.CSSProperties = { fontSize: 18, padding: 16, width: "100%", textAlign: "center", cursor: "pointer" };

/** Position GPS si le livreur l'a acceptée : jamais bloquant (8 s max, sinon on continue sans). */
function getPos(): Promise<Geo> {
  return new Promise(ok => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return ok(null);
    const t = setTimeout(() => ok(null), 8000);
    navigator.geolocation.getCurrentPosition(p => { clearTimeout(t); ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); }, () => { clearTimeout(t); ok(null); }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 7500 });
  });
}

/** Journée du livreur : prochaine étape, boutons d'état, livraison avec photo de la plaque VIN, planning. */
export default function TourDay({ data, call, upload, reload, onMsg, deliverId, setDeliverId }: { data: TourData; call: Call; upload: (f: File) => Promise<string>; reload: () => Promise<void>; onMsg: (m: string) => void; deliverId: string | null; setDeliverId: (id: string | null) => void }) {
  const stops = data.tour.stops;
  const [geo, setGeo] = useState<"oui" | "non" | "">(""); const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Date.now()); const [all, setAll] = useState(false);
  const [plate, setPlate] = useState<Record<string, string>>({}); const [handover, setHandover] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => { try { const g = localStorage.getItem("nd_geo"); if (g === "oui" || g === "non") setGeo(g); } catch { /* privé */ } const it = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(it); }, []);
  const chooseGeo = async (v: "oui" | "non") => { setGeo(v); try { localStorage.setItem("nd_geo", v); } catch { /* privé */ } if (v === "oui") { const p = await getPos(); if (!p) onMsg("⚠️ Position refusée ou indisponible : ce n’est pas grave, les boutons suffisent."); } };

  const plan = useMemo(() => plannedSchedule(stops, data.tour.date, data.tour.departTime), [stops, data.tour.date, data.tour.departTime]);
  const delivered = data.clients.filter(c => c.status === "livre").map(c => c.id);
  const prog = useMemo(() => tourProgress(stops, plan, data.events, delivered, now), [stops, plan, data.events, delivered.join(","), now]); // eslint-disable-line react-hooks/exhaustive-deps
  const inProgress = prog.started && !prog.finished;

  // Position toutes les 5 minutes, seulement pendant la tournée en cours, page ouverte et position acceptée
  const callRef = useRef(call); useEffect(() => { callRef.current = call; });
  useEffect(() => {
    if (geo !== "oui" || !inProgress) return;
    const ping = async () => { if (document.visibilityState !== "visible") return; const p = await getPos(); if (p) callRef.current({ action: "event", kind: "position", ...p }).catch(() => null); };
    const it = setInterval(ping, PING_MS); return () => clearInterval(it);
  }, [geo, inProgress]);

  const send = async (key: string, body: Record<string, unknown>, ok: string) => {
    setBusy(key); onMsg("");
    try { const p = geo === "oui" ? await getPos() : null; const j = await call({ action: "event", ...body, ...(p || {}) }); await reload(); onMsg(ok); return j; }
    catch (e) { onMsg("❌ " + (e as Error).message); return null; } finally { setBusy(""); }
  };

  const cur = stops[prog.pos]; const next = prog.nextIndex != null ? stops[prog.nextIndex] : null;
  const atClient = prog.phase === "arrived" && cur?.kind === "client" ? cur : null;
  const target = atClient || (next?.kind === "client" ? next : null); // client à livrer maintenant
  const etaNext = prog.nextIndex != null ? prog.etaOf(prog.nextIndex) : null;
  const nowAbs = absFromDate(data.tour.date, now);
  const sched = prog.live || plan;
  const today = Math.min(Math.max(dayOf(nowAbs), dayOf(sched.startAbs)), dayOf(sched.endAbs));
  const doneStops = new Set(stops.map((x, i) => x.kind === "client" && prog.delivered.has(x.id) ? i : -1).filter(i => i >= 0));
  const lastEvents = data.events.filter(e => e.kind !== "position").slice(-6).reverse();

  const vehOf = (cid: string) => data.vehicles.find(v => v.client_id === cid && v.stage !== "livrée");
  const deliverClient = deliverId ? stops.find(x => x.kind === "client" && x.id === deliverId) || null : null;
  const dv = deliverId ? vehOf(deliverId) : undefined;
  const onPlate = async (cid: string, f?: File) => { if (!f) return; setBusy("plate"); try { const p = await upload(f); setPlate(v => ({ ...v, [cid]: p })); onMsg("✅ Photo de la plaque VIN prête."); } catch (e) { onMsg("❌ " + (e as Error).message); } setBusy(""); };
  const onHandover = async (cid: string, f?: File) => { if (!f) return; setBusy("hand"); try { const p = await upload(f); setHandover(v => ({ ...v, [cid]: p })); onMsg("✅ Photo de remise prête."); } catch (e) { onMsg("❌ " + (e as Error).message); } setBusy(""); };
  const confirmDelivery = async () => {
    if (!deliverClient) return;
    const i = stops.indexOf(deliverClient);
    const j = await send("livre", { kind: "livre", client_id: deliverClient.id, stop_index: i, plate_path: plate[deliverClient.id] || null, path: handover[deliverClient.id] || null }, `✅ ${deliverClient.name} livré${dv ? ` (VIN ${dv.vin})` : ""}. Merci !`);
    if (j?.ok) { setDeliverId(null); if (j.reception && confirm("✅ Livraison enregistrée. Faire signer l’accusé de réception au client maintenant ?")) window.location.href = j.reception; }
  };

  if (!stops.length) return <section className={s.card}><h2>🗓️ Ma tournée</h2><p className={s.muted}>L’itinéraire n’est pas encore calculé : demandez à Mansour.</p></section>;

  return <>
    {geo === "" ? <section className={s.geo}>
      <b>📍 Partager ma position pendant la tournée ?</b>
      <span>Elle permet à NeoDrive de savoir où vous en êtes et de prévenir les clients. Elle est envoyée <b>seulement pendant une tournée en cours</b> : à chaque bouton (« Je pars », « Livré »…) et toutes les 5 minutes quand cette page est ouverte. Jamais en dehors de la tournée. Les positions sont effacées après 90 jours. Vous pouvez refuser : tout fonctionne quand même.</span>
      <div><button className={s.primary} onClick={() => chooseGeo("oui")}>Oui, partager</button><button className={s.ghost} onClick={() => chooseGeo("non")}>Non merci</button></div>
    </section> : <p className={s.muted}>{geo === "oui" ? <>📍 Position partagée pendant la tournée en cours seulement. <button className={s.danger} onClick={() => chooseGeo("non")}>Arrêter</button></> : <>📍 Position non partagée. <button className={s.danger} style={{ color: "#1e3a8a" }} onClick={() => chooseGeo("oui")}>Partager</button></>}</p>}

    <section className={s.card}>
      <div className={s.rowHead}><h2>🗓️ Ma tournée</h2>{prog.delayMin != null && prog.started && !prog.finished ? <span className={prog.delayMin > 10 ? s.late : s.ontime}>{delayTxt(prog.delayMin)}</span> : null}</div>
      {prog.finished ? <p className={s.ok}>🏁 Tournée terminée. Merci et bon retour !</p> : null}
      {!prog.started ? <p className={s.tip}>Départ prévu <b>{dayLabel(data.tour.date, dayOf(plan.startAbs))} à {hhmm(plan.startAbs)}</b> de {stops[0].name}.{data.tour.departTime ? "" : " (heure à confirmer par Mansour)"} Chargez les voitures (photo de la plaque VIN, plus bas), puis appuyez sur « Je pars ».</p> : null}
      {next && !prog.finished ? <div className={s.nextCard}>
        <small className={s.muted}>{atClient ? "Vous êtes chez" : "Prochaine étape"}{!atClient && etaNext != null ? ` · arrivée vers ${hhmm(etaNext)}${dayOf(etaNext) !== dayOf(nowAbs) ? ` (jour ${dayOf(etaNext) + 1})` : ""}` : ""}</small>
        <h3>{(atClient || next).kind === "client" ? "🚗 " : "📦 "}{(atClient || next).name}</h3>
        <p className={s.addr}>📍 {(atClient || next).kind === "client" ? (atClient || next).label : stopTown(atClient || next)}</p>
        <p className={s.muted}>{(atClient || next).action}</p>
        {(atClient || next).phone ? <a className={s.phone} href={`tel:${String((atClient || next).phone).replace(/\s/g, "")}`}>📞 {(atClient || next).phone}</a> : null}
        <div className={s.navBtns}><a href={waze(atClient || next)} target="_blank" rel="noreferrer">🚙 Waze</a><a href={nav(atClient || next)} target="_blank" rel="noreferrer">🧭 Google Maps</a></div>
      </div> : null}

      {!prog.finished ? <div className={s.statusBtns}>
        <button className={s.go} disabled={!!busy} onClick={() => send("depart", { kind: "depart", stop_index: prog.pos }, `🚚 Bonne route !${next ? ` Prochaine étape : ${next.name}.` : ""}`)}>{busy === "depart" ? "…" : `🚚 Je pars${cur ? ` de ${cur.kind === "client" ? "chez le client" : stopTown(cur)}` : ""}`}</button>
        {prog.paused ? <button className={s.stop} disabled={!!busy} onClick={() => send("reprise", { kind: "reprise", stop_index: prog.pos }, "▶️ Reprise notée.")}>{busy === "reprise" ? "…" : "▶️ Reprise"}</button>
          : <button className={s.stop} disabled={!!busy || !prog.started} onClick={() => send("pause", { kind: "pause", stop_index: prog.pos }, "☕ Pause notée. Bonne pause !")}>{busy === "pause" ? "…" : "☕ Pause"}</button>}
        {next ? <button disabled={!!busy || !prog.started || !!atClient} onClick={() => send("arrive", { kind: "arrive", stop_index: prog.nextIndex, client_id: next.kind === "client" ? next.id : null }, next.kind === "client" ? `📍 Arrivé chez ${next.name}. Après la remise, appuyez sur « Livré ».` : `📍 Arrivé à ${next.name}.`)}>{busy === "arrive" ? "…" : next.kind === "client" ? "📍 Arrivé chez le client" : "📍 Arrivé au dépôt"}</button> : <button disabled>📍 Arrivé</button>}
        <button className={s.go} disabled={!!busy || !target} onClick={() => target && setDeliverId(target.id)}>✅ Livré</button>
        <button className={s.bad} style={{ gridColumn: "1 / -1" }} disabled={!!busy} onClick={() => setProblem(problem == null ? "" : null)}>⚠️ Problème</button>
      </div> : null}

      {problem != null ? <div style={{ display: "grid", gap: 8 }}>
        <label className={s.field}>Expliquez le problème (panne, retard, client absent, accident…)<textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d7db", font: "inherit", fontSize: 16 }} /></label>
        <button className={s.primary} disabled={!!busy || problem.trim().length < 3} onClick={async () => { const j = await send("probleme", { kind: "probleme", stop_index: prog.pos, client_id: target?.id || null, note: problem.trim() }, "⚠️ Problème envoyé à NeoDrive. Si c’est urgent, appelez Mansour."); if (j?.ok) setProblem(null); }}>{busy === "probleme" ? "…" : "Envoyer"}</button>
      </div> : null}

      {deliverClient ? <div id="livraison" className={s.nextCard} style={{ borderColor: "#16a34a", background: "#f3fdf6" }}>
        <h3>✅ Livraison : {deliverClient.name}</h3>
        {!dv ? <p className={s.err}>Aucune voiture chargée pour ce client. Faites d’abord « Charger un véhicule » plus bas (photo de la plaque VIN et choix du client).</p> : <>
          <span>Voiture : <b style={{ fontFamily: "monospace" }}>{dv.vin}</b></span>
          {dv.has_plate ? <p className={s.okTxt}>✅ Plaque VIN déjà photographiée au chargement.</p> : plate[deliverClient.id] ? <p className={s.okTxt}>✅ Plaque VIN photographiée.</p> : <p className={s.muted}>Obligatoire : photographiez la plaque VIN de la voiture.</p>}
          {!dv.has_plate ? <label className={s.primary} style={{ ...big, opacity: busy === "plate" ? .6 : 1 }}>{busy === "plate" ? "Envoi…" : plate[deliverClient.id] ? "📷 Reprendre la plaque VIN" : "📷 Photographier la plaque VIN"}<input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={e => { onPlate(deliverClient.id, e.target.files?.[0]); e.target.value = ""; }} /></label> : null}
          <label className={s.ghost} style={{ cursor: "pointer" }}>{busy === "hand" ? "Envoi…" : handover[deliverClient.id] ? "✅ Photo de remise prête (reprendre)" : "📷 Photo de la remise (facultatif)"}<input type="file" accept="image/*" capture="environment" hidden disabled={!!busy} onChange={e => { onHandover(deliverClient.id, e.target.files?.[0]); e.target.value = ""; }} /></label>
          <button className={s.primary} style={big} disabled={!!busy || (!dv.has_plate && !plate[deliverClient.id])} onClick={confirmDelivery}>{busy === "livre" ? "Enregistrement…" : "✅ Confirmer : voiture livrée"}</button>
        </>}
        <button className={s.ghost} onClick={() => setDeliverId(null)}>Fermer</button>
      </div> : null}

      {lastEvents.length ? <ul className={s.log}>{lastEvents.map((e, k) => <li key={e.id || k}><time>{fmt(e.created_at)}</time><span>{EVENT_LABEL[e.kind] || e.kind}{e.stop_index != null && stops[e.stop_index] ? ` · ${stops[e.stop_index].name}` : ""}{e.note ? ` — ${e.note}` : ""}</span></li>)}</ul> : null}
    </section>

    <section className={s.card}>
      <div className={s.rowHead}><h2>🕒 {all ? "Toute la tournée" : `Mon planning · jour ${today + 1}`}</h2><button className={s.small} onClick={() => setAll(v => !v)}>{all ? "Aujourd’hui" : "Tout voir"}</button></div>
      {prog.live ? <p className={s.muted}>Heures recalculées depuis votre dernier bouton.</p> : null}
      <ScheduleView sched={sched} nowAbs={nowAbs} onlyDay={all ? undefined : today} doneStops={doneStops} />
      <p className={s.muted}>☕ Les pauses en jaune sont recommandées : 20 min toutes les 2 h de route, déjeuner vers midi. Ne dépassez pas 9 h 30 de travail par jour.</p>
      <button className={s.ghost} onClick={() => downloadIcs(plan, stops, data.tour.name, data.tour.id)}>📅 Ajouter à mon agenda</button>
    </section>
  </>;
}
