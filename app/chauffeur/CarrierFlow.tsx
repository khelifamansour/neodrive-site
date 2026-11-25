"use client";
import { useState } from "react";
import s from "../planificateur/planif.module.css";
import type { Stop } from "../../lib/planif";
import type { TourEvent } from "../../lib/schedule";
import { PhotoPick, openSign, type ResInfo } from "./DeliverySign";

/**
 * Page chauffeur d'une mission transporteur (Transports Rabouin) : sans connexion, sans heures, sans montants.
 * Pour chaque client : charger (photo de la plaque VIN) → je suis arrivé → photo du client à côté de la voiture
 * → signature de la remise sur ce téléphone → terminé. Refus de signer : le chauffeur recharge la voiture.
 */
type Client = { id: string; name: string; adresse: string; telephone: string; modele: string; couleur: string; status: string };
type Veh = { id: number; vin: string; client_id?: string | null; stage: string; has_plate?: boolean };
type Found = { vin: string; label: string; here: boolean };
export type CarrierData = { tour: { id: string; name: string; date: string; departTime: string; stops: Stop[]; hubId?: string; carrier?: { name: string; driverName?: string } }; clients: Client[]; vehicles: Veh[]; events: TourEvent[]; res?: Record<string, ResInfo> };
type Call = (body: object) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Step = "load" | "travel" | "photo" | "sign" | "finish" | "done" | "refused";

const NEODRIVE_TEL = "0689781710";
const mapsTo = (p: { lat?: number; lng?: number; address?: string }) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address || `${p.lat},${p.lng}`)}&travelmode=driving`;
const tidy = (v: string, n: number) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n);
const bigBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 60, fontSize: 18, fontWeight: 900, padding: "12px 14px", textAlign: "center", boxSizing: "border-box", cursor: "pointer", textDecoration: "none" };
const twoCols: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const linkBtn: React.CSSProperties = { background: "none", border: 0, color: "#1e3a8a", fontWeight: 800, fontSize: 16, padding: "10px 4px", textDecoration: "underline", cursor: "pointer" };
const dayFr = (d: string) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";
const STEP_TXT: Record<Step, string> = { load: "à charger", travel: "chargée · en route", photo: "arrivé : photo du client", sign: "photo faite : signature", finish: "signé : à terminer", done: "✅ livrée", refused: "↩️ refus : voiture rechargée" };

export default function CarrierFlow({ data, call, upload, reload, msg, onMsg, backUrl, focus }: { data: CarrierData; call: Call; upload: (f: File) => Promise<string>; reload: () => Promise<void>; msg: string; onMsg: (m: string) => void; backUrl: (cid: string) => string; focus: string | null }) {
  const [busy, setBusy] = useState(""); const [open, setOpen] = useState<string | null>(focus);
  const [typing, setTyping] = useState<string | null>(null); const [tail, setTail] = useState(""); const [found, setFound] = useState<Found[] | null>(null);
  const [vin4, setVin4] = useState<Record<string, string>>({});
  const [refus, setRefus] = useState<string | null>(null); const [refusNote, setRefusNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const stops = data.tour.stops || [];
  const hub = stops.find(p => p.kind === "depot");

  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); onMsg(""); try { const m = await fn(); if (m) onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };
  const event = async (body: Record<string, unknown>) => { const j = await call({ action: "event", ...body }); await reload(); return j; };

  // ── État de chaque client, dans l'ordre de la mission
  const order = stops.map((p, i) => ({ p, i })).filter(x => x.p.kind === "client");
  const rows = order.map(({ p, i }) => {
    const c = data.clients.find(x => x.id === p.id);
    const v = data.vehicles.find(x => x.client_id === p.id && x.stage !== "livrée") || data.vehicles.find(x => x.client_id === p.id);
    const ev = data.events.filter(e => e.client_id === p.id).sort((a, z) => a.created_at.localeCompare(z.created_at));
    const has = (k: string) => ev.some(e => e.kind === k);
    const lastLoad = [...ev].reverse().find(e => e.kind === "charge")?.created_at || "";
    const lastRefus = [...ev].reverse().find(e => e.kind === "refus")?.created_at || "";
    const ri = data.res?.[p.id];
    const signed = !!ri?.reserve_at || !!ri?.signed_at;
    const delivered = has("livre") || c?.status === "livre";
    const refused = !!lastRefus && !delivered && lastRefus >= lastLoad;
    const step: Step = delivered ? "done" : refused ? "refused" : !v ? "load" : signed ? "finish" : has("photo_client") ? "sign" : has("arrive") ? "photo" : "travel";
    return { p, i, c, v, ri, step, phone: c?.telephone || p.phone || "", address: p.address || c?.adresse || "" };
  });
  const current = rows.find(r => r.step !== "done" && r.step !== "refused");
  const shown = rows.find(r => r.p.id === open) || current || null;
  const loadedN = rows.filter(r => r.step !== "load").length;

  // ── Actions
  const loadFor = async (cid: string, vehicleId: number, path: string | null, force = false): Promise<string> => {
    const j = await call({ action: "load", vehicle_id: vehicleId, client_id: cid, depot: data.tour.hubId || null, path, force });
    if (j.conflict) { if (confirm(j.error)) return loadFor(cid, vehicleId, path, true); return ""; }
    setTyping(null); setTail(""); setFound(null); await reload();
    return "✅ Voiture chargée. NeoDrive est prévenu.";
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyMatch = async (cid: string, m: any, path: string | null) => {
    const veh = m?.vehicle;
    if (!veh) { setTyping(cid); return "⚠️ Ce numéro n’est pas dans notre liste : vérifiez la plaque ou appelez NeoDrive."; }
    if (veh.stage === "livrée") return `⚠️ ${veh.vin} est déjà livrée : appelez NeoDrive.`;
    if (veh.client_id && veh.client_id !== cid && !confirm(`Cette voiture est prévue pour un autre client. La charger quand même pour celui-ci ?`)) return "";
    return loadFor(cid, veh.id, path);
  };
  const loadPhoto = (cid: string, f: File) => run("load", async () => {
    const path = await upload(f);
    const j = await call({ action: "read_vin", path });
    if (!j.read || !j.match) { setTyping(cid); return "⚠️ Numéro illisible : reprenez la photo de plus près ou tapez la fin du numéro."; }
    return applyMatch(cid, j.match, path);
  });
  const searchTail = (q: string) => { setTail(q); if (q.length < 3) { setFound(null); return; } call({ action: "search_vin", q, depot: data.tour.hubId || null }).then(j => setFound(j.results || [])).catch(() => setFound([])); };
  const pickVin = (cid: string, vin: string) => run("load", async () => { const j = await call({ action: "match", vin }); return applyMatch(cid, j.match, null); });
  const arrive = (cid: string, i: number) => run("arrive", async () => { await event({ kind: "arrive", client_id: cid, stop_index: i }); return "📍 Arrivée notée. Prenez la photo du client à côté de la voiture."; });
  const clientPhoto = (cid: string, i: number, f: File) => run("photo", async () => { const path = await upload(f); await event({ kind: "photo_client", client_id: cid, stop_index: i, path }); return "✅ Photo enregistrée. Faites signer la remise au client."; });
  const sign = (cid: string) => run("sign", async () => { await openSign(call, cid, backUrl(cid)); });
  const finish = (cid: string, i: number) => run("finish", async () => { await event({ kind: "livre", client_id: cid, stop_index: i, vin_confirm: vin4[cid] || null }); setOpen(null); window.scrollTo({ top: 0, behavior: "smooth" }); return "✅ Livraison terminée. Merci ! Passez au client suivant."; });
  const refuse = (cid: string, i: number) => run("refus", async () => { await event({ kind: "refus", client_id: cid, stop_index: i, note: refusNote.trim() || null }); setRefus(null); setRefusNote(""); return "↩️ Refus noté. Rechargez la voiture : NeoDrive est prévenu et vous appelle."; });

  const card = (r: typeof rows[number]) => {
    const { p, i, v, step } = r; const cid = p.id;
    return <section key={cid} className={s.nextCard} style={{ marginTop: 10, gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>{p.label}. {p.name}</h3>
        <small style={{ fontWeight: 800, color: step === "done" ? "#067647" : step === "refused" ? "#b42318" : "#7a4b00" }}>{STEP_TXT[step]}</small>
      </div>
      <span style={{ fontSize: 16 }}>📍 {r.address}</span>
      <span style={{ fontSize: 16 }}>🕒 Créneau : <b>{p.slot || "à confirmer avec le client"}</b></span>
      {r.c?.modele ? <small className={s.muted}>🚗 {r.c.modele}{r.c.couleur ? ` ${r.c.couleur}` : ""}{v ? <> · <span style={{ fontFamily: "monospace" }}>{v.vin}</span></> : null}</small> : null}
      <div style={twoCols}>
        <a className={s.ghost} style={bigBtn} href={mapsTo(p)} target="_blank" rel="noreferrer">🧭 Itinéraire</a>
        {r.phone ? <a className={s.ghost} style={bigBtn} href={`tel:${r.phone.replace(/\s/g, "")}`}>📞 Appeler</a> : <span className={s.muted} style={{ alignSelf: "center" }}>Pas de téléphone</span>}
      </div>

      {step === "load" ? <>
        <b style={{ fontSize: 17 }}>1. Charger : photo plaque VIN</b>
        <PhotoPick busy={busy === "load"} disabled={!!busy} cam="📷 Photo plaque VIN" gal="🖼️ Galerie" onFile={f => loadPhoto(cid, f)} />
        {typing === cid ? <div style={{ display: "grid", gap: 6 }}>
          <label className={s.field}>Fin du numéro de la plaque (3 à 6 caractères)<input autoFocus value={tail} onChange={e => searchTail(tidy(e.target.value, 17))} placeholder="ex. 483" style={{ fontFamily: "monospace", fontSize: 20 }} /></label>
          {found ? found.length ? found.map(x => <button key={x.vin} className={s.ghost} style={{ ...bigBtn, fontFamily: "monospace", fontSize: 16, ...(x.here ? { borderColor: "#16a34a" } : {}) }} disabled={!!busy} onClick={() => pickVin(cid, x.vin)}>{x.vin}{x.here ? " ✅" : ""}</button>) : <small className={s.err}>Aucune voiture trouvée : tapez le numéro complet (17 caractères).</small> : null}
          {tail.length === 17 && !found?.some(x => x.vin === tail) ? <button className={s.ghost} style={bigBtn} disabled={!!busy} onClick={() => pickVin(cid, tail)}>Utiliser {tail}</button> : null}
        </div> : <button style={linkBtn} onClick={() => { setTyping(cid); setTail(""); setFound(null); }}>⌨️ Taper le numéro</button>}
      </> : null}

      {step === "travel" ? <>
        <small className={s.muted}>Voiture chargée. Appelez le client 30 minutes avant d’arriver.</small>
        <button className={s.primary} style={bigBtn} disabled={!!busy} onClick={() => arrive(cid, i)}>{busy === "arrive" ? "…" : `📍 Je suis arrivé chez ${p.name}`}</button>
      </> : null}

      {step === "photo" ? <>
        <b style={{ fontSize: 17 }}>2. Photo du client à côté de la voiture</b>
        <p className={s.tip} style={{ margin: 0 }}>💬 Prévenez le client : photo de remise pour preuve de livraison.</p>
        <PhotoPick busy={busy === "photo"} disabled={!!busy} cam="📷 Photo du client" gal="🖼️ Galerie" onFile={f => clientPhoto(cid, i, f)} />
      </> : null}

      {step === "sign" ? <>
        <b style={{ fontSize: 17 }}>3. Signature du client</b>
        <small className={s.muted}>Donnez votre téléphone au client : il lit et signe la remise, puis vous le rend.</small>
        <button className={s.primary} style={bigBtn} disabled={!!busy} onClick={() => sign(cid)}>{busy === "sign" ? "…" : "✍️ Faire signer la remise"}</button>
      </> : null}

      {step === "finish" ? <>
        <b style={{ fontSize: 17, color: "#067647" }}>✅ Remise signée par le client</b>
        {v && !v.has_plate ? <label className={s.field}>4 derniers caractères de la plaque VIN<input value={vin4[cid] || ""} maxLength={6} onChange={e => setVin4(x => ({ ...x, [cid]: tidy(e.target.value, 6) }))} placeholder="ex. 0483" style={{ fontFamily: "monospace", fontSize: 20 }} /></label> : null}
        <button className={s.primary} style={bigBtn} disabled={!!busy} onClick={() => finish(cid, i)}>{busy === "finish" ? "…" : "4. ✅ Terminé : voiture remise"}</button>
      </> : null}

      {step === "done" ? <b style={{ color: "#067647" }}>✅ Livraison terminée. Merci !</b> : null}
      {step === "refused" ? <b style={{ color: "#b42318" }}>↩️ Refus noté : la voiture reste dans le camion. NeoDrive vous appelle.</b> : null}

      {step === "photo" || step === "sign" ? (refus === cid ? <div style={{ display: "grid", gap: 8, background: "#fef3f2", border: "1px solid #fecdca", borderRadius: 12, padding: 10 }}>
        <b>Le client refuse de signer ?</b>
        <textarea value={refusNote} onChange={e => setRefusNote(e.target.value)} rows={2} placeholder="Pourquoi ? (facultatif)" style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d7db", font: "inherit", fontSize: 16 }} />
        <button className={s.primary} style={{ ...bigBtn, background: "#b42318", borderColor: "#b42318", color: "#fff" }} disabled={!!busy} onClick={() => refuse(cid, i)}>{busy === "refus" ? "…" : "Confirmer : je recharge la voiture"}</button>
        <button className={s.ghost} onClick={() => setRefus(null)}>Retour</button>
      </div> : <button className={s.ghost} style={{ ...bigBtn, color: "#b42318", borderColor: "#fecdca", fontSize: 16 }} onClick={() => { setRefus(cid); setRefusNote(""); }}>❌ Le client refuse : je recharge la voiture</button>) : null}
    </section>;
  };

  return <>
    <section className={s.card} style={{ gap: 6, background: "#fffaf5", borderColor: "#f8c9b4", marginTop: 10 }}>
      <b style={{ fontSize: 17 }}>📋 Comment faire</b>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, fontSize: 16, lineHeight: 1.35 }}>
        <li>Au chargement : photo de la plaque VIN de chaque voiture (ou tapez le numéro).</li>
        <li>Appelez le client 30 minutes avant d’arriver.</li>
        <li>Chez le client : « Je suis arrivé », puis photo du client à côté de la voiture.</li>
        <li>Le client signe la remise sur votre téléphone, puis touchez « Terminé ».</li>
        <li>Aucun paiement à encaisser. Si le client refuse de signer, rechargez la voiture.</li>
      </ol>
    </section>

    {hub ? <section className={s.card} style={{ gap: 8 }}>
      <b style={{ fontSize: 17 }}>📦 Chargement : {hub.name}</b>
      <span style={{ fontSize: 16 }}>📍 {hub.address || hub.name}</span>
      <span style={{ fontSize: 16 }}>🕒 {dayFr(data.tour.date)}{data.tour.departTime ? ` à ${data.tour.departTime.replace(":", " h ")}` : ""} · {loadedN}/{rows.length} chargée{loadedN > 1 ? "s" : ""}</span>
      <a className={s.ghost} style={bigBtn} href={mapsTo(hub)} target="_blank" rel="noreferrer">🧭 Itinéraire vers le chargement</a>
    </section> : null}

    {shown ? card(shown) : <section className={s.card}><b style={{ fontSize: 18, color: "#067647" }}>🏁 Mission terminée. Merci !</b></section>}

    <section className={s.card} style={{ gap: 8 }}>
      <h2>Clients ({rows.filter(r => r.step === "done").length}/{rows.length} livrés)</h2>
      {rows.filter(r => r !== shown).map(r => <button key={r.p.id} onClick={() => { setOpen(r.p.id); onMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "grid", gap: 4, textAlign: "left", background: r === current ? "#fffaf5" : "#fff", border: `1.5px solid ${r === current ? "#e8592a" : "#ece6dd"}`, borderRadius: 14, padding: 12, font: "inherit", color: "inherit", cursor: "pointer" }}>
        <b style={{ fontSize: 16 }}>{r.p.label}. {r.p.name}{r === current ? " · en cours" : ""}</b>
        <small className={s.muted}>{r.address}{r.p.slot ? ` · ${r.p.slot}` : ""}</small>
        <small style={{ fontWeight: 800 }}>{STEP_TXT[r.step]}</small>
      </button>)}
    </section>

    <section className={s.card} style={{ gap: 8 }}>
      <div style={twoCols}>
        <a className={s.ghost} style={bigBtn} href={`tel:${NEODRIVE_TEL}`}>📞 Appeler NeoDrive</a>
        <button className={s.ghost} style={{ ...bigBtn, color: "#b42318" }} onClick={() => setProblem(problem == null ? "" : null)}>⚠️ Problème</button>
      </div>
      {problem != null ? <div style={{ display: "grid", gap: 8 }}>
        <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} placeholder="Panne, retard, client absent…" style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d7db", font: "inherit", fontSize: 16 }} />
        <button className={s.primary} style={bigBtn} disabled={!!busy || problem.trim().length < 3} onClick={() => run("pb", async () => { await event({ kind: "probleme", client_id: shown?.p.id || null, stop_index: shown?.i ?? null, note: problem.trim() }); setProblem(null); return "⚠️ Problème envoyé à NeoDrive. Si c’est urgent, appelez."; })}>Envoyer</button>
      </div> : null}
    </section>

    {msg ? <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "rgba(255,255,255,.97)", borderTop: "1px solid #ece6dd", padding: "8px 12px calc(10px + env(safe-area-inset-bottom))" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }} className={msg.startsWith("❌") || msg.startsWith("⚠️") ? s.err : s.ok}>{msg}</div>
    </div> : null}
  </>;
}
