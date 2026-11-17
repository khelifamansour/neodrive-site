"use client";
import { useState } from "react";
import s from "./planif.module.css";
import type { PlanClient, PlanTour } from "../../lib/planif";

type Api = (body: object) => Promise<unknown>;

/** Clôture d'une tournée validée : liste figée, ajout en cours de route (avec explication), clients « à livrer au retour ». */
export default function TourLock({ tour, clients, api, reload, onMsg }: { tour: PlanTour; clients: PlanClient[]; api: Api; reload: () => Promise<void>; onMsg: (m: string) => void }) {
  const [busy, setBusy] = useState(""); const [cid, setCid] = useState(""); const [note, setNote] = useState("");
  const run = async (key: string, fn: () => Promise<string>) => { setBusy(key); try { const m = await fn(); await reload(); onMsg(m); } catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(""); } };
  const inTour = clients.filter(c => tour.clientIds.includes(c.id));
  const notDelivered = inTour.filter(c => c.status !== "livre");
  const candidates = clients.filter(c => c.status === "a_planifier");
  const closed = !!tour.closed_at;
  const box: React.CSSProperties = { display: "grid", gap: 10, padding: 14, borderRadius: 14, border: `1.5px solid ${closed ? "#f4b740" : "#ddd5ca"}`, background: closed ? "#fffaeb" : "#fff", margin: "12px 0" };

  return <section style={box}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
      <b>{closed ? `🔒 Tournée clôturée le ${new Date(tour.closed_at!).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "🔓 Tournée ouverte : on peut encore ajouter des clients"}</b>
      {!closed
        ? <button className={s.primary} style={{ padding: "10px 14px", fontSize: 14 }} disabled={!!busy} onClick={() => { if (confirm("Clôturer la tournée ? La liste des clients est figée : ensuite, seulement des ajouts « en cours de route » avec une explication.")) run("close", async () => { await api({ action: "close_tour", id: tour.id }); return "🔒 Tournée clôturée : le livreur le voit sur sa page."; }); }}>{busy === "close" ? "…" : "🔒 Clôturer la tournée"}</button>
        : <button className={s.ghost} style={{ padding: "8px 12px", fontSize: 13 }} disabled={!!busy} onClick={() => { if (confirm("Rouvrir la tournée (ajouts libres à nouveau) ?")) run("reopen", async () => { await api({ action: "reopen_tour", id: tour.id }); return "🔓 Tournée rouverte."; }); }}>Rouvrir</button>}
    </div>

    {closed ? <>
      <div style={{ display: "grid", gap: 8 }}>
        <b style={{ fontSize: 14 }}>➕ Ajouter en cours de route</b>
        {candidates.length ? <>
          <select value={cid} onChange={e => setCid(e.target.value)}><option value="">Choisir un client à planifier…</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom} · {c.code_postal} {c.ville}{c.retour ? " · à livrer au retour" : ""}</option>)}</select>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Pourquoi ? (ex. : sur la route du retour, accord du livreur)" />
          <button className={s.ghost} disabled={!!busy || !cid || note.trim().length < 3} onClick={() => run("add", async () => { await api({ action: "add_en_route", id: tour.id, client_id: cid, note }); setCid(""); setNote(""); return "➕ Client ajouté en cours de route : le livreur est prévenu sur sa page."; })}>{busy === "add" ? "…" : "Ajouter à la tournée"}</button>
        </> : <p className={s.muted}>Aucun client « à planifier » à ajouter.</p>}
        {tour.en_route?.length ? <ul className={s.mini}>{tour.en_route.map(e => { const c = clients.find(x => x.id === e.clientId); return <li key={e.clientId + e.at}><span>➕ {c ? `${c.prenom} ${c.nom} · ${c.ville}` : e.clientId} — {e.note} <small className={s.muted}>({e.by}, {new Date(e.at).toLocaleDateString("fr-FR")})</small></span></li>; })}</ul> : null}
      </div>
      {notDelivered.length ? <div style={{ display: "grid", gap: 6 }}>
        <b style={{ fontSize: 14 }}>↩️ Clients non livrés</b>
        <p className={s.muted}>Un client n’a pas pu être livré ? Marquez-le « à livrer au retour » : il repasse dans les clients à planifier, avec une étiquette.</p>
        <ul className={s.mini}>{notDelivered.map(c => <li key={c.id}><span>{c.prenom} {c.nom} · {c.code_postal} {c.ville}</span>
          <button style={{ color: "#b54708", fontWeight: 800, fontSize: 13 }} disabled={!!busy} onClick={() => { if (confirm(`${c.prenom} ${c.nom} : à livrer au retour ?`)) run("ret" + c.id, async () => { await api({ action: "mark_retour", client_id: c.id }); return `↩️ ${c.prenom} ${c.nom} : à livrer au retour.`; }); }}>{busy === "ret" + c.id ? "…" : "↩️ À livrer au retour"}</button></li>)}</ul>
      </div> : null}
    </> : <p className={s.muted}>Clôturez la tournée au départ du livreur : la liste est figée, les ajouts se font ensuite « en cours de route », avec une explication, et le livreur est prévenu.</p>}
  </section>;
}
