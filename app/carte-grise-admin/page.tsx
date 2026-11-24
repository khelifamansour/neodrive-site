"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { PAY_STYLE, type PayState } from "../../lib/stock-shared";

type F = { key: string; label: string; name: string; size: number };
type D = {
  id: number; ref: string; created_at: string; type_demande: string | null; nom: string | null; prenom: string | null; telephone: string | null; email: string | null;
  adresse: string | null; code_postal: string | null; ville: string | null; version: string | null; service_carte_grise: string | null;
  files: F[]; status: string; sent_to_provider_at: string | null; sent_to: string | null; notes: string | null;
  vin: string | null; vin_check_ok: boolean | null; vin_source: string | null; reservation_id: number | null; vehicle_id: number | null; match_note: string | null; analysed_at: string | null;
  reservation: { id: number; name: string; statut: string; livre_at: string | null; vin: string | null; total: number | null; montant_du: number | null } | null; pay: PayState;
};
/** Prêt pour NK Services : pièces reçues, pas encore envoyé. */
const ready = (d: D) => d.status === "reçu" && !d.sent_to_provider_at;
const ST_BG: Record<string, string> = { "envoi en cours": "#fde8e8", "reçu": "#fff4d6", "envoyé": "#e8f0fe", "traité": "#e7f6ec", "annulé": "#f1f1f1" };
const STATUSES = ["reçu", "envoyé", "traité", "annulé"];
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—";
const mo = (n: number) => `${(n / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
class Unauthorized extends Error {}
async function api<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/carte-grise/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}

/** Dossiers carte grise reçus du site (copie serveur de l'envoi Formspree) : consultation et envoi à NK Services. */
export default function CarteGriseAdmin() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [pc, setPc] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState<number | null>(null);
  const [rows, setRows] = useState<D[]>([]); const [provider, setProvider] = useState({ name: "NK SERVICES", email: "" });
  const [links, setLinks] = useState<Record<number, { label: string; url: string }[]>>({});
  const [tab, setTab] = useState<"queue" | "all">("queue");

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ dossiers: D[]; provider: { name: string; email: string } }>({ action: "list" }, p); setRows(j.dossiers); setProvider(j.provider); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  const send = async (d: D) => {
    const again = !!d.sent_to_provider_at;
    const unpaid = d.pay !== "payé";
    if (!confirm(`${unpaid ? `⛔ ATTENTION : paiement ${d.pay.toUpperCase()}.\n\n` : ""}${again ? "RENVOYER" : "Envoyer"} le dossier de ${[d.prenom, d.nom].filter(Boolean).join(" ")} à ${provider.name} (${provider.email}) ?\nVous serez en copie.`)) return;
    setBusy(d.id); setMsg("");
    try {
      const r = await api<{ to: string; attached: string[]; linked: string[]; missing: string[] }>({ action: "send", id: d.id, force: again, unpaid_ok: unpaid });
      setMsg(`✅ Envoyé à ${r.to} : ${r.attached.length} pièce(s) jointe(s)${r.linked.length ? `, ${r.linked.length} en lien (14 jours)` : ""}${r.missing.length ? ` ⚠️ manquantes : ${r.missing.join(", ")}` : ""}.`);
      await load();
    } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); }
  };
  const showLinks = async (d: D) => { try { const j = await api<{ links: { label: string; url: string }[] }>({ action: "links", id: d.id }); setLinks(l => ({ ...l, [d.id]: j.links })); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const reread = async (d: D) => { setBusy(d.id); setMsg(""); try { const r = await api<{ vin: string | null; note: string }>({ action: "analyse", id: d.id, reset: true }); setMsg(`🔎 ${r.vin ? `VIN ${r.vin}` : "VIN non lu"} · ${r.note}`); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); } };
  const fix = async (d: D) => {
    const vin = prompt("VIN du véhicule (17 caractères, vide = inchangé) :", d.vin || ""); if (vin === null) return;
    const rid = prompt("N° de réservation du client (vide = recherche automatique) :", d.reservation_id ? String(d.reservation_id) : ""); if (rid === null) return;
    try { const r = await api<{ note: string }>({ action: "link", id: d.id, vin: vin.trim(), reservation_id: Number(rid) || null }); setMsg(`✅ ${r.note}`); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); }
  };
  const setStatus = async (d: D, status: string) => { try { await api({ action: "update", id: d.id, status }); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } };

  if (state === "loading") return <main className={c.page}><div className={c.wrap}><p className={c.muted}>Chargement…</p></div></main>;
  if (state === "login") return <main className={c.page}><form className={c.login} onSubmit={async e => { e.preventDefault(); try { await load(pc.trim()); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* */ } } catch (er) { setMsg((er as Error).message); } }}>
    <h1>🪪 Dossiers carte grise</h1><p className={c.muted}>Code d’accès du fondateur.</p>
    <input className={c.input} type="password" value={pc} onChange={e => setPc(e.target.value)} placeholder="Code" autoFocus />
    <button className={`${c.btn} ${c.btnBrand}`}>Entrer</button>{msg ? <p className={c.err}>{msg}</p> : null}
    <a href="/organisation" className={c.back}>← Organisation</a></form></main>;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><a href="/organisation" className={c.back}>← Organisation</a><button className={`${c.btn} ${c.btnGhost}`} onClick={() => load().catch(() => null)}>Actualiser</button></div>
    <h1 style={{ margin: "0 0 4px" }}>🪪 Dossiers carte grise</h1>
    <p className={c.muted} style={{ marginTop: 0 }}>Copie de chaque dossier envoyé depuis /reservation-carte-grise (l’e-mail Formspree continue d’arriver). Prestataire : <b>{provider.name}</b> {provider.email || "(adresse à renseigner)"}.</p>
    {msg ? <p className={c.msg}>{msg}</p> : null}
    <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
      <button className={`${c.btn} ${tab === "queue" ? c.btnBrand : c.btnGhost}`} style={{ fontSize: 14, padding: "10px 14px" }} onClick={() => setTab("queue")}>À valider avant envoi ({rows.filter(ready).length})</button>
      <button className={`${c.btn} ${tab === "all" ? c.btnBrand : c.btnGhost}`} style={{ fontSize: 14, padding: "10px 14px" }} onClick={() => setTab("all")}>Tous les dossiers ({rows.length})</button>
    </div>
    {tab === "queue" ? <p className={c.small} style={{ marginTop: 0 }}>Dossiers complets, pas encore envoyés. Le VIN est lu automatiquement sur le COC et rapproché du stock et de la réservation. Rien ne part chez {provider.name} sans votre clic : vérifiez le paiement avant d’envoyer.</p> : null}
    {!(tab === "queue" ? rows.filter(ready) : rows).length ? <p className={c.empty}>{tab === "queue" ? "Aucun dossier à valider." : "Aucun dossier pour l’instant."}</p> : null}
    <div style={{ display: "grid", gap: 12 }}>
      {(tab === "queue" ? rows.filter(ready) : rows).map(d => {
        const total = (d.files || []).reduce((a, f) => a + (f.size || 0), 0);
        return <div key={d.id} className={c.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
            <div><b style={{ fontSize: 17 }}>{[d.prenom, d.nom].filter(Boolean).join(" ") || "—"}</b> <span className={c.muted}>· {d.ref} · {fmt(d.created_at)}</span></div>
            <span className={c.pill} style={{ background: ST_BG[d.status] || "#eee" }}>{d.status}</span>
          </div>
          <div className={c.small} style={{ margin: "6px 0", lineHeight: 1.5 }}>
            {d.telephone} · {d.email}<br />{d.adresse}, {d.code_postal} {d.ville}<br />{d.version} · {d.type_demande}{d.service_carte_grise === "non" ? " · carte grise non demandée" : ""}
          </div>
          <div className={c.small}>📎 {(d.files || []).map(f => f.label).join(" · ") || "aucune pièce"} ({mo(total)})</div>
          <div className={c.small} style={{ marginTop: 6, lineHeight: 1.55 }}>
            🔢 VIN : {d.vin ? <b style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{d.vin}</b> : <i>{d.analysed_at ? "non lu" : "lecture en cours…"}</i>}{d.vin ? (d.vin_check_ok ? " ✅ clé de contrôle correcte" : " ⚠️ clé de contrôle incorrecte : vérifiez") : ""}{d.vin_source ? ` (${d.vin_source})` : ""}<br />
            👤 {d.reservation ? `Réservation n° ${d.reservation.id} : ${d.reservation.name} (${d.reservation.statut}${d.reservation.livre_at ? `, livrée le ${fmt(d.reservation.livre_at)}` : ""})` : "Aucune réservation reliée"}{" "}
            <span className={c.pill} style={{ background: PAY_STYLE[d.pay].bg, color: PAY_STYLE[d.pay].color }}>{PAY_STYLE[d.pay].icon} {d.pay}</span>
            {d.match_note ? <><br /><span style={{ color: "#666" }}>{d.match_note}</span></> : null}
          </div>
          {ready(d) && d.pay !== "payé" ? <div style={{ marginTop: 8, background: "#fde8e8", border: "1px solid #f5b5b5", color: "#b91c1c", borderRadius: 10, padding: "8px 10px", fontWeight: 700, fontSize: 14 }}>⛔ {d.pay === "réserve de propriété" ? `Remis avec réserve de propriété : paiement en attente${d.reservation?.montant_du ? ` (${Number(d.reservation.montant_du).toLocaleString("fr-FR")} € dus)` : ""}.` : d.pay === "inconnu" ? "Client non relié à une réservation : paiement non vérifié." : "Paiement non reçu."} Vérifiez avant d’envoyer à {provider.name}.</div> : null}
          {d.sent_to_provider_at ? <div className={c.small} style={{ marginTop: 4 }}>📤 Envoyé le {fmt(d.sent_to_provider_at)} à {d.sent_to}</div> : null}
          {d.notes ? <pre className={c.small} style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontFamily: "inherit" }}>{d.notes}</pre> : null}
          {links[d.id] ? <ul className={c.small} style={{ margin: "6px 0 0" }}>{links[d.id].map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>)}</ul> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className={`${c.btn} ${c.btnBrand}`} disabled={busy !== null || !d.files?.length || d.status === "envoi en cours"} onClick={() => send(d)}>{busy === d.id ? "Envoi…" : d.sent_to_provider_at ? "Renvoyer à NK Services" : "Envoyer à NK Services"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => showLinks(d)}>Voir les pièces</button>
            <button className={`${c.btn} ${c.btnGhost}`} disabled={busy !== null} onClick={() => reread(d)}>{busy === d.id ? "Lecture…" : "Relire le VIN"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => fix(d)}>Corriger VIN / client</button>
            <select className={c.input} style={{ width: "auto" }} value={STATUSES.includes(d.status) ? d.status : ""} onChange={e => setStatus(d, e.target.value)}>
              {!STATUSES.includes(d.status) ? <option value="">{d.status}</option> : null}
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>;
      })}
    </div>
  </div></main>;
}
