"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import s from "../planificateur/planif.module.css";
import { supabase } from "../../lib/supabase";
import { STAGE_ICON, vinValid, type Stage } from "../../lib/shipments";
import TourDay, { type TourData } from "./TourDay";
import { PhotoPick, ResChips, type ResInfo } from "./DeliverySign";

type Client = { id: string; name: string; adresse: string; telephone: string; modele: string; couleur: string; status: string; received_at: string | null; reception: string | null };
type Veh = { id: number; vin: string; container?: string; depot?: string | null; client_id?: string | null; client_name?: string | null; tour_id?: string | null; shipment: string; stage: Stage; delivered_at?: string | null; has_plate?: boolean };
type Match = { vin: string; valid: boolean; vehicle: Veh | null; suggestions: Veh[] };
const big: React.CSSProperties = { fontSize: 18, padding: 16, width: "100%", textAlign: "center", cursor: "pointer" };

/** Réduit la photo (≤ 2000 px, JPEG) : envoi rapide en 4G, plaque toujours lisible. */
async function shrink(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file); const k = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error("photo")), "image/jpeg", 0.85));
  } catch { return file; }
}

function Driver() {
  const sp = useSearchParams(); const k = sp.get("k") || "";
  const [data, setData] = useState<{ tour: any; res?: Record<string, ResInfo>; clients: Client[]; depots: { id: string; name: string }[]; vehicles: Veh[]; events?: TourData["events"] } | null>(null);
  // Retour de la page de signature : la livraison du client se rouvre (« &livrer=<client> »).
  const [deliverId, setDeliverId] = useState<string | null>(() => sp.get("livrer"));
  const backUrl = (cid: string) => `/chauffeur?k=${encodeURIComponent(k)}&livrer=${encodeURIComponent(cid)}`;
  const openDelivery = (cid: string) => { setDeliverId(cid); setTimeout(() => document.getElementById("livraison")?.scrollIntoView({ behavior: "smooth" }), 50); }; const [vplate, setVplate] = useState<Record<number, string>>({});
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const [depot, setDepot] = useState(""); const [photo, setPhoto] = useState(""); const [match, setMatch] = useState<Match | null>(null); const [vin, setVin] = useState(""); const [client, setClient] = useState(""); const [driver, setDriver] = useState("");
  const [tail, setTail] = useState(""); const [found, setFound] = useState<{ vin: string; label: string; here: boolean }[] | null>(null); const [owner, setOwner] = useState(false);
  const call = async (body: object) => { const r = await fetch("/api/chauffeur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k, driver, ...body }) }); const j = await r.json().catch(() => ({ ok: false, error: "Connexion impossible" })); if (!j.ok && !j.conflict) throw new Error(j.error || "Erreur"); return j; };
  const load = async () => { try { const j = await call({ action: "get" }); const first = !data; setData(j); if (first && sp.get("livrer")) setTimeout(() => document.getElementById("livraison")?.scrollIntoView(), 150); if (!depot) { const d = j.depots.find((x: any) => x.id === j.tour?.hubId); if (d) setDepot(d.id); } } catch (e) { setErr((e as Error).message); } };
  useEffect(() => { if (!k) { setErr("Lien incomplet : utilisez le lien envoyé par NeoDrive."); return; } try { setDriver(localStorage.getItem("nd_driver") || ""); } catch { } try { setOwner(!!sessionStorage.getItem("nd_pc")); } catch { } load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Suivi en direct (paiement confirmé, accusé signé par le client) : rafraîchi toutes les 15 s
  useEffect(() => { if (!k) return; const it = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000); return () => clearInterval(it); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); setMsg(""); try { const m = await fn(); if (m) setMsg(m); } catch (e) { setMsg("❌ " + (e as Error).message); } setBusy(""); };
  const uploadPhoto = async (file: File) => { const u = await call({ action: "upload_url" }); const blob = await shrink(file); const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, blob, { contentType: "image/jpeg" }); if (error) throw new Error("Envoi de la photo impossible, réessayez."); return u.path as string; };

  const onPlate = (f?: File) => f && run("read", async () => {
    setMatch(null); const path = await uploadPhoto(f); setPhoto(path);
    const j = await call({ action: "read_vin", path });
    if (!j.read || !j.match) { setVin(""); return "⚠️ VIN illisible sur la photo : reprenez-la de plus près ou tapez le VIN."; }
    setMatch(j.match); setVin(j.match.vehicle?.vin || j.match.vin);
    if (j.match.vehicle?.client_id) setClient(j.match.vehicle.client_id);
  });
  // Appareil photo en panne : recherche par les derniers caractères du VIN (ex. « 483 » → LP4SE0D05T1600483)
  const searchTail = (q: string) => { setTail(q); if (q.length < 3) { setFound(null); return; } call({ action: "search_vin", q, depot: depot || null }).then(j => setFound(j.results || [])).catch(() => setFound([])); };
  const pick = (x: string) => run("match", async () => { setVin(x); setFound(null); setTail(""); const j = await call({ action: "match", vin: x }); setMatch(j.match); if (j.match.vehicle?.client_id) setClient(j.match.vehicle.client_id); });
  const check = () => run("match", async () => { const j = await call({ action: "match", vin }); setMatch(j.match); if (j.match.vehicle?.client_id) setClient(j.match.vehicle.client_id); });
  const confirmLoad = (force = false): Promise<void> => run("load", async () => {
    const veh = match?.vehicle; if (!veh) return "Choisissez d'abord le véhicule.";
    try { localStorage.setItem("nd_driver", driver); } catch { }
    const j = await call({ action: "load", vehicle_id: veh.id, client_id: client || null, depot: depot || null, path: photo || null, force });
    if (j.conflict) { if (confirm(j.error)) return confirmLoad(true); return; }
    setMatch(null); setPhoto(""); setVin(""); setClient(""); await load();
    return `✅ ${veh.vin} chargé${client ? " pour " + (data?.clients.find(c => c.id === client)?.name || "") : ""}`;
  });
  const deliver = (v: Veh, f?: File, vinConfirm?: string) => run("dl" + v.id, async () => {
    const path = f ? await uploadPhoto(f) : null;
    const j = await call({ action: "deliver", vehicle_id: v.id, path, plate_path: vplate[v.id] || null, vin_confirm: vinConfirm || null }); await load();
    const ri = v.client_id ? data?.res?.[v.client_id] : undefined;
    if (ri && !ri.signed_at && v.client_id && data?.tour?.stops?.some((p: { id: string }) => p.id === v.client_id)) openDelivery(v.client_id);
    else if (j.reception) { if (confirm("✅ Livraison enregistrée. Faire signer l'accusé de réception au client maintenant ?")) window.location.href = j.reception; }
    return `✅ ${v.vin} livré`;
  });
  const addVehicle = () => run("add", async () => { const j = await call({ action: "add_vehicle", vin, depot: depot || null }); setMatch(j.match); return "✅ Véhicule ajouté au stock du dépôt : choisissez le client puis confirmez le chargement."; });
  const undo = (v: Veh) => confirm(`Annuler le chargement de ${v.vin} ?`) && run("u" + v.id, async () => { await call({ action: "undo", vehicle_id: v.id }); await load(); return "Chargement annulé"; });

  if (err) return <main className={s.page}><section className={s.card}><h1>🚚 Chauffeur</h1><p className={s.err}>{err}</p></section></main>;
  if (!data) return <main className={s.page}><p className={s.muted}>Chargement…</p></main>;
  const loaded = data.vehicles.filter(v => v.stage === "chargée"), delivered = data.vehicles.filter(v => v.stage === "livrée");
  const taken = new Set(data.vehicles.filter(v => v.stage !== "livrée").map(v => v.client_id).filter(Boolean));
  const v = match?.vehicle;
  return <main className={s.page} style={{ maxWidth: 560 }}>
    <div className={s.top}><div><h1>🚚 {data.tour ? data.tour.name || "Tournée" : "Chargement / livraison"}</h1><p>{data.tour ? `${data.tour.date || ""} · ${data.tour.driver || ""} · ` : ""}{loaded.length} chargé(s) · {delivered.length} livré(s)</p></div></div>
    {msg ? <p className={msg.startsWith("❌") || msg.startsWith("⚠️") ? s.err : s.ok}>{msg}</p> : null}
    {data.tour?.closed_at ? <section className={s.card} style={{ borderColor: "#f4b740", background: "#fffaeb" }}>
      <b>🔒 Tournée clôturée</b>
      <p className={s.muted}>La liste des clients est figée. Un client ne peut être ajouté qu’en cours de route, par NeoDrive, avec votre accord.</p>
      {(data.tour.en_route || []).length ? <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{(data.tour.en_route as { clientId: string; note: string; at: string }[]).map(e => { const c = data.clients.find(x => x.id === e.clientId); return <li key={e.clientId + e.at}><b>➕ {c ? c.name : "Client ajouté"}</b>{c ? ` · ${c.adresse}` : ""} — {e.note}</li>; })}</ul> : null}
    </section> : null}
    {data.tour ? <TourDay data={{ tour: data.tour, clients: data.clients, vehicles: data.vehicles, events: data.events || [], res: data.res }} backUrl={backUrl} call={call} upload={uploadPhoto} reload={load} onMsg={setMsg} deliverId={deliverId} setDeliverId={setDeliverId} /> : null}

    <section className={s.card}>
      <h2>1. Charger un véhicule</h2>
      <label className={s.field}>Votre prénom<input value={driver} onChange={e => setDriver(e.target.value)} placeholder={data.tour?.driver || "Prénom"} /></label>
      <label className={s.field}>Dépôt de chargement<select value={depot} onChange={e => setDepot(e.target.value)}><option value="">—</option>{data.depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <b>Plaque du numéro de série (VIN)</b>
      {busy === "read" ? <p className={s.muted}>Lecture du numéro de série…</p> : null}
      <PhotoPick busy={busy === "read"} disabled={!!busy} onFile={f => onPlate(f)} />
      <div style={{ display: "flex", gap: 8 }}><input value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))} placeholder="⌨️ ou tapez le numéro (17 caractères)" style={{ fontFamily: "monospace", flex: 1 }} /><button className={s.ghost} disabled={vin.length !== 17 || !!busy} onClick={check}>Vérifier</button></div>
      <label className={s.field}>Ou les derniers chiffres du VIN (3 à 6)<input value={tail} inputMode="text" onChange={e => searchTail(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="ex. 483" style={{ fontFamily: "monospace", fontSize: 18 }} /></label>
      <small className={s.muted}>Nos VIN commencent par <code>LP4SE0D0</code> et finissent par <code>T1600…</code> : tapez juste la fin, puis touchez la bonne voiture.</small>
      {found ? found.length ? <div style={{ display: "grid", gap: 6 }}>{found.map(x => <button key={x.vin} className={s.ghost} style={{ textAlign: "left", fontFamily: "monospace", ...(x.here ? { borderColor: "#16a34a" } : {}) }} disabled={!!busy} onClick={() => pick(x.vin)}><b>{x.vin}</b><br /><small style={{ fontFamily: "inherit" }}>{x.here ? "✅ au dépôt · " : ""}{x.label}</small></button>)}</div> : <small className={s.err}>Aucun VIN connu ne finit par « {tail} ». Tapez le VIN complet ci-dessus.</small> : null}
      {vin.length === 17 ? <small style={{ color: vinValid(vin) ? "#15803d" : "#b91c1c" }}>{vinValid(vin) ? "✅ VIN valide (clé de contrôle OK)" : "⚠️ Clé de contrôle incorrecte : vérifiez chaque caractère"}</small> : null}

      {match && !v ? <div className={s.err} style={{ fontWeight: 400 }}><b>VIN {match.vin} inconnu dans les conteneurs.</b>{match.suggestions.length ? <><br />VIN proches (erreur de lecture ?) :{match.suggestions.map(x => <button key={x.id} className={s.ghost} style={{ display: "block", margin: "6px 0", fontFamily: "monospace", width: "100%" }} onClick={() => { setMatch({ ...match, vehicle: x }); setVin(x.vin); if (x.client_id) setClient(x.client_id); }}>{x.vin} · {x.shipment}</button>)}</> : <><br />Vérifiez la plaque ou appelez Mansour.</>}{match.vin.length === 17 ? <button className={s.primary} style={{ display: "block", marginTop: 8, width: "100%" }} disabled={!!busy} onClick={addVehicle}>{busy === "add" ? "…" : `➕ C'est bien ce VIN : ajouter ce véhicule au stock du dépôt (ancien stock, hors conteneur)`}</button> : null}</div> : null}
      {v ? <div className={s.ok} style={{ fontWeight: 400, display: "grid", gap: 6 }}>
        <b style={{ fontFamily: "monospace", fontSize: 17 }}>{v.vin}</b>
        <span>{v.shipment}{v.container ? ` · conteneur ${v.container}` : ""} · {STAGE_ICON[v.stage]} {v.stage}</span>
        {v.stage === "livrée" ? <b style={{ color: "#b91c1c" }}>⚠️ Déjà livré !</b> : null}
        {v.client_name ? <span>Réservé pour : <b>{v.client_name}</b></span> : null}
      </div> : null}
      {v && v.stage !== "livrée" ? <>
        <label className={s.field}>Client / réservation livrée avec ce véhicule<select value={client} onChange={e => setClient(e.target.value)}><option value="">— sans client (transfert de stock) —</option>{data.clients.filter(c => c.status !== "livre" || c.id === client).map(c => <option key={c.id} value={c.id}>{c.name}{c.modele ? ` · ${c.modele}` : ""}{c.couleur ? ` ${c.couleur}` : ""}{taken.has(c.id) && c.id !== v.client_id ? " (déjà un VIN)" : ""}</option>)}</select></label>
        <button className={s.primary} style={big} disabled={!!busy} onClick={() => confirmLoad()}>{busy === "load" ? "…" : "✅ Confirmer le chargement"}</button>
      </> : null}
    </section>

    <section className={s.card}>
      <h2>2. À livrer ({loaded.length})</h2>
      {!loaded.length ? <p className={s.muted}>Aucun véhicule chargé pour l'instant.</p> : null}
      {loaded.map(x => { const c = data.clients.find(y => y.id === x.client_id); return <div key={x.id} style={{ border: "1px solid #ece6dd", borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
        <b>{x.client_name || "Sans client"}</b>
        {c ? <small>{c.adresse}{c.telephone ? <> · <a href={`tel:${c.telephone}`}>{c.telephone}</a></> : null}</small> : null}
        <small style={{ fontFamily: "monospace" }}>{x.vin}</small>
        {data.tour && x.client_id && data.tour.stops?.some((p: { id: string }) => p.id === x.client_id) ? <>
          <button className={s.primary} style={big} disabled={!!busy} onClick={() => openDelivery(x.client_id!)}>🚗 Livrer ce client</button>
          <button className={s.ghost} disabled={!!busy} onClick={() => undo(x)}>Annuler le chargement</button>
        </> : <>
          {data.tour && !x.has_plate ? <>{vplate[x.id] ? <small className={s.okTxt}>✅ Photo de la plaque prête</small> : <small className={s.muted}>Photo de la plaque du numéro de série (obligatoire) :</small>}<PhotoPick main={false} busy={busy === "vp" + x.id} disabled={!!busy} cam={vplate[x.id] ? "📷 Reprendre la photo" : "📷 Prendre la photo"} onFile={f => run("vp" + x.id, async () => { const p = await uploadPhoto(f); setVplate(v => ({ ...v, [x.id]: p })); return "✅ Photo de la plaque prête."; })} /></> : null}
          <small className={s.muted}>Livré : photo de la voiture chez le client</small>
          <PhotoPick busy={busy === "dl" + x.id} disabled={!!busy || (!!data.tour && !x.has_plate && !vplate[x.id])} onFile={f => deliver(x, f)} />
          <div style={{ display: "flex", gap: 8 }}><button className={s.ghost} style={{ flex: 1 }} disabled={!!busy} onClick={() => { if (data.tour && !x.has_plate && !vplate[x.id]) { const typed = prompt(`Pas d'appareil photo ? Retapez les 4 derniers caractères du VIN de la voiture (prévu : …${x.vin.slice(-6, -4)}••••)`); if (typed) deliver(x, undefined, typed); } else deliver(x); }}>⌨️ Livré sans photo</button><button className={s.ghost} disabled={!!busy} onClick={() => undo(x)}>Annuler</button></div>
        </>}
      </div>; })}
    </section>

    {data.tour ? <section className={s.card}>
      <h2>Clients de la tournée</h2>
      {data.clients.map(c => { const veh = data.vehicles.find(x => x.client_id === c.id); return <div key={c.id} style={{ borderBottom: "1px solid #eee", padding: "6px 0", display: "grid", gap: 4 }}>
        <span><b>{c.name}</b> · {c.modele} {c.couleur}</span>
        <small className={s.muted}>{veh ? `${STAGE_ICON[veh.stage]} ${veh.stage} · ${veh.vin}` : "pas encore de VIN : chargez la voiture (étape 1)"}{c.received_at ? " · ✍️ réception signée" : ""}</small>
        {(() => { const ri = data.res?.[c.id];
          if (!ri) return veh?.stage === "livrée" && c.reception && !c.received_at ? <a className={s.ghost} href={c.reception}>✍️ Faire signer le client ici</a> : null;
          return <div style={{ display: "grid", gap: 6 }}>
            <ResChips ri={ri} />
            {ri.reserve_at && !ri.paid ? <small style={{ color: "#b45309", fontWeight: 700 }}>Remise signée le {new Date(ri.reserve_at).toLocaleDateString("fr-FR")} – en attente du paiement : gardez les clés et les papiers.</small> : null}
            {ri.paid && ri.reserve_at && !ri.signed_at ? <small className={s.okTxt}>💶 Paiement reçu : faites signer l&apos;accusé final.</small> : null}
            {!ri.paid && (owner || String(data.tour?.id || "").startsWith("test-")) ? <a className={s.ghost} href="/reservations-admin" target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>👉 Mansour : Réservations clients → {c.name} → 💶 Confirmer le paiement</a> : null}
            {data.tour?.stops?.some((p: { id: string }) => p.id === c.id) ? <button className={ri.signed_at ? s.ghost : s.primary} style={{ padding: 12 }} onClick={() => openDelivery(c.id)}>{ri.signed_at ? "📄 Voir la livraison" : "🚗 Ouvrir la livraison (numéro de série → signature)"}</button> : null}
          </div>; })()}
      </div>; })}
    </section> : null}
  </main>;
}
export default function Page() { return <Suspense fallback={null}><Driver /></Suspense>; }
