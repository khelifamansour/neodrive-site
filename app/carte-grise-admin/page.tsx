"use client";
import { useCallback, useEffect, useState } from "react";
import c from "../giga/giga.module.css";
import { PAY_STYLE, type PayState } from "../../lib/stock-shared";
import PrepLinks from "./PrepLinks";
import { CARTE_GRISE_CLIENT_TEXT, CARTE_GRISE_FILES, CARTE_GRISE_FILE_LABEL, missingWaText, overallLabel, pendingKeys, type DocCheck, type MissingRequest } from "../../lib/carte-grise";

type F = { key: string; label: string; name: string; size: number };
type D = {
  id: number; ref: string; created_at: string; type_demande: string | null; nom: string | null; prenom: string | null; telephone: string | null; email: string | null;
  adresse: string | null; code_postal: string | null; ville: string | null; version: string | null; service_carte_grise: string | null;
  files: F[]; status: string; sent_to_provider_at: string | null; sent_to: string | null; notes: string | null;
  vin: string | null; vin_check_ok: boolean | null; vin_source: string | null; reservation_id: number | null; vehicle_id: number | null; match_note: string | null; analysed_at: string | null;
  doc_check?: DocCheck | null; missing_token?: string | null; missing_request?: MissingRequest | null; auto_resend?: boolean | null;
  reservation: { id: number; name: string; statut: string; livre_at: string | null; vin: string | null; total: number | null; montant_du: number | null } | null; pay: PayState;
};
/** Prêt pour NK Services : pièces reçues, pas encore envoyé. */
const ready = (d: D) => d.status === "reçu" && !d.sent_to_provider_at;
const ST_BG: Record<string, string> = { "envoi en cours": "#fde8e8", "reçu": "#fff4d6", "envoyé": "#e8f0fe", "traité": "#e7f6ec", "annulé": "#f1f1f1" };
const STATUSES = ["reçu", "envoyé", "traité", "annulé"];
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—";
const DOC_ICON: Record<string, string> = { ok: "✅", manquant: "❌", "à refaire": "⚠️", "à vérifier": "🔎" };
const OVERALL_BG: Record<string, string> = { complet: "#e7f6ec", incomplet: "#fde8e8", "à vérifier": "#fff4d6" };
const piecesUrl = (t: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/carte-grise/pieces/${t}`;
const waUrl = (d: D) => { if (!d.telephone || !d.missing_token) return null; const n = d.telephone.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "33");
  return `https://wa.me/${n}?text=${encodeURIComponent(missingWaText(d.prenom, piecesUrl(d.missing_token), pendingKeys(d.missing_request, d.doc_check).map(k => CARTE_GRISE_CLIENT_TEXT[k] || k)))}`; };
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
  const [focus, setFocus] = useState<number | null>(null);
  const [ask, setAsk] = useState<{ id: number; keys: string[]; note: string; sms: boolean; email: boolean } | null>(null);
  useEffect(() => { const id = Number(new URLSearchParams(window.location.search).get("id")); if (id) { setFocus(id); setTab("all"); } }, []);

  const load = useCallback(async (p = code()) => {
    try { const j = await api<{ dossiers: D[]; provider: { name: string; email: string } }>({ action: "list" }, p); setRows(j.dossiers); setProvider(j.provider); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);

  const send = async (d: D) => {
    const again = !!d.sent_to_provider_at;
    const unpaid = d.pay !== "payé";
    const absent = Object.entries(d.doc_check?.pieces || {}).filter(([, p]) => p.status === "manquant").map(([k]) => CARTE_GRISE_FILE_LABEL[k] || k);
    const docs = (d.doc_check && d.doc_check.overall !== "complet" ? `⚠️ Pièces : dossier ${overallLabel(d.doc_check)}.\n` : "") + (absent.length ? `❌ Manquant (signalé à ${provider.name}) : ${absent.join(", ")}.\n` : "") + (d.doc_check && d.doc_check.overall !== "complet" ? "\n" : "");
    if (!confirm(`${unpaid ? `⛔ ATTENTION : paiement ${d.pay.toUpperCase()}.\n\n` : ""}${docs}${again ? "RENVOYER" : "Envoyer"} le dossier de ${[d.prenom, d.nom].filter(Boolean).join(" ")} à ${provider.name} (${provider.email}) ?\nVous serez en copie.`)) return;
    setBusy(d.id); setMsg("");
    try {
      const r = await api<{ to: string; attached: string[]; linked: string[]; missing: string[] }>({ action: "send", id: d.id, force: again, unpaid_ok: unpaid, allow_missing: true });
      setMsg(`✅ Envoyé à ${r.to} : ${r.attached.length} pièce(s) jointe(s)${r.linked.length ? `, ${r.linked.length} en lien (14 jours)` : ""}${r.missing.length ? ` ⚠️ manquantes : ${r.missing.join(", ")}` : ""}.`);
      await load();
    } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); }
  };
  const check = async (d: D) => { setBusy(d.id); setMsg(""); try { const r = await api<{ check: DocCheck }>({ action: "check", id: d.id }); setMsg(`🔎 Contrôle des pièces : ${r.check.overall}`); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); } };
  const openAsk = (d: D) => setAsk({ id: d.id, keys: pendingKeys(null, d.doc_check), note: "", sms: true, email: true });
  const sendAsk = async (d: D) => {
    if (!ask?.keys.length) { setMsg("Cochez au moins une pièce."); return; }
    setBusy(d.id); setMsg("");
    try {
      const r = await api<{ url: string; sms: string; email: string; wa: string | null; auto_resend: boolean }>({ action: "request_missing", id: d.id, keys: ask.keys, note: ask.note, sms: ask.sms, email: ask.email });
      setMsg(`📨 Demande envoyée : SMS ${r.sms}, e-mail ${r.email}.${r.auto_resend ? " Renvoi automatique à NK Services activé." : ""} Lien client : ${r.url}`);
      setAsk(null); await load();
    } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); }
  };
  const toggleAuto = async (d: D, value: boolean) => { try { await api({ action: "auto_resend", id: d.id, value }); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const showLinks = async (d: D) => { try { const j = await api<{ links: { label: string; url: string }[] }>({ action: "links", id: d.id }); setLinks(l => ({ ...l, [d.id]: j.links })); } catch (e) { setMsg("❌ " + (e as Error).message); } };
  const reread = async (d: D) => { setBusy(d.id); setMsg(""); try { const r = await api<{ vin: string | null; note: string }>({ action: "analyse", id: d.id, reset: true }); setMsg(`🔎 ${r.vin ? `VIN ${r.vin}` : "VIN non lu"} · ${r.note}`); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); } };
  const stamp = async (d: D) => { setBusy(d.id); setMsg(""); try { const r = await api<{ message: string }>({ action: "stamp_mandat", id: d.id }); setMsg(`🖋️ ${r.message}`); await load(); } catch (e) { setMsg("❌ " + (e as Error).message); } finally { setBusy(null); } };
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
    <PrepLinks call={api} />
    <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
      <button className={`${c.btn} ${tab === "queue" ? c.btnBrand : c.btnGhost}`} style={{ fontSize: 14, padding: "10px 14px" }} onClick={() => setTab("queue")}>À valider avant envoi ({rows.filter(ready).length})</button>
      <button className={`${c.btn} ${tab === "all" ? c.btnBrand : c.btnGhost}`} style={{ fontSize: 14, padding: "10px 14px" }} onClick={() => setTab("all")}>Tous les dossiers ({rows.length})</button>
    </div>
    {tab === "queue" ? <p className={c.small} style={{ marginTop: 0 }}>Dossiers complets, pas encore envoyés. Le VIN est lu automatiquement sur le COC et rapproché du stock et de la réservation. Rien ne part chez {provider.name} sans votre clic : vérifiez le paiement avant d’envoyer.</p> : null}
    {focus ? <p className={c.small}>Dossier n° {focus} seulement. <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setFocus(null)}>Voir tous les dossiers</button></p> : null}
    {!(tab === "queue" ? rows.filter(ready) : rows).length ? <p className={c.empty}>{tab === "queue" ? "Aucun dossier à valider." : "Aucun dossier pour l’instant."}</p> : null}
    <div style={{ display: "grid", gap: 12 }}>
      {(tab === "queue" ? rows.filter(ready) : rows).filter(d => !focus || d.id === focus).map(d => {
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
          <div style={{ marginTop: 8, background: d.doc_check ? OVERALL_BG[d.doc_check.overall] : "#f5f5f5", borderRadius: 10, padding: "8px 10px" }} className={c.small}>
            <b>📋 Contrôle des pièces : {d.doc_check ? overallLabel(d.doc_check) : "pas encore fait"}</b>{d.doc_check ? <span style={{ color: "#666" }}> · {fmt(d.doc_check.at)}</span> : null}
            {d.doc_check ? <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>{Object.entries(d.doc_check.pieces).map(([k, p]) => <li key={k}>{DOC_ICON[p.status]} <b>{CARTE_GRISE_FILE_LABEL[k] || k}</b> : {p.status}{p.reason ? ` – ${p.reason}` : ""}{p.remark && p.remark !== p.reason ? <span style={{ color: "#a16207" }}> · Remarque : {p.remark}</span> : null}{p.detail ? <span style={{ color: "#777" }}> ({p.detail})</span> : null}</li>)}</ul> : null}
            {d.missing_token ? <div style={{ marginTop: 6 }}>
              📨 Pièces demandées{d.missing_request ? ` le ${fmt(d.missing_request.at)} : ${d.missing_request.keys.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ")}` : ""}{d.missing_request?.received?.length ? ` · reçues : ${d.missing_request.received.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ")}` : ""}{d.missing_request?.done_at ? " · ✅ terminé" : ""}<br />
              <a href={piecesUrl(d.missing_token)} target="_blank" rel="noreferrer">Lien client</a>{waUrl(d) ? <> · <a href={waUrl(d)!} target="_blank" rel="noreferrer">Envoyer sur WhatsApp</a></> : null}{" · "}
              <label><input type="checkbox" checked={!!d.auto_resend} onChange={e => toggleAuto(d, e.target.checked)} /> Renvoi automatique à {provider.name} quand le dossier est complet</label>
            </div> : null}
          </div>
          {ask?.id === d.id ? <div style={{ marginTop: 8, border: "1px solid #ddd", borderRadius: 10, padding: 10 }} className={c.small}>
            <b>Pièces à demander au client</b>
            {CARTE_GRISE_FILES.map(f => <label key={f.key} style={{ display: "block", marginTop: 4 }}><input type="checkbox" checked={ask.keys.includes(f.key)} onChange={e => setAsk({ ...ask, keys: e.target.checked ? [...ask.keys, f.key] : ask.keys.filter(k => k !== f.key) })} /> {f.label}{d.doc_check?.pieces?.[f.key] && d.doc_check.pieces[f.key].status !== "ok" ? ` (${d.doc_check.pieces[f.key].status})` : ""}</label>)}
            <textarea className={c.input} style={{ marginTop: 6, minHeight: 60 }} placeholder="Message pour le client (facultatif), ex. : NK Services demande une photo plus nette du verso" value={ask.note} onChange={e => setAsk({ ...ask, note: e.target.value })} />
            <label style={{ marginRight: 12 }}><input type="checkbox" checked={ask.sms} onChange={e => setAsk({ ...ask, sms: e.target.checked })} /> SMS</label>
            <label><input type="checkbox" checked={ask.email} onChange={e => setAsk({ ...ask, email: e.target.checked })} /> E-mail</label>
            {d.sent_to_provider_at ? <p style={{ margin: "6px 0 0" }}>Dossier déjà envoyé à {provider.name} : il sera renvoyé automatiquement dès que les pièces reçues sont bonnes.</p> : <p style={{ margin: "6px 0 0" }}>Nouveau dossier : rien ne part chez {provider.name} sans votre clic.</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className={`${c.btn} ${c.btnBrand}`} disabled={busy !== null} onClick={() => sendAsk(d)}>{busy === d.id ? "Envoi…" : "Envoyer la demande"}</button>
              <button className={`${c.btn} ${c.btnGhost}`} onClick={() => setAsk(null)}>Annuler</button>
            </div>
          </div> : null}
          {ready(d) && d.pay !== "payé" ? <div style={{ marginTop: 8, background: "#fde8e8", border: "1px solid #f5b5b5", color: "#b91c1c", borderRadius: 10, padding: "8px 10px", fontWeight: 700, fontSize: 14 }}>⛔ {d.pay === "réserve de propriété" ? `Remis avec réserve de propriété : paiement en attente${d.reservation?.montant_du ? ` (${Number(d.reservation.montant_du).toLocaleString("fr-FR")} € dus)` : ""}.` : d.pay === "inconnu" ? "Client non relié à une réservation : paiement non vérifié." : "Paiement non reçu."} Vérifiez avant d’envoyer à {provider.name}.</div> : null}
          {d.sent_to_provider_at ? <div className={c.small} style={{ marginTop: 4 }}>📤 Envoyé le {fmt(d.sent_to_provider_at)} à {d.sent_to}</div> : null}
          {d.notes ? <pre className={c.small} style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontFamily: "inherit" }}>{d.notes}</pre> : null}
          {links[d.id] ? <ul className={c.small} style={{ margin: "6px 0 0" }}>{links[d.id].map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>)}</ul> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className={`${c.btn} ${c.btnBrand}`} disabled={busy !== null || !d.files?.length || d.status === "envoi en cours"} onClick={() => send(d)}>{busy === d.id ? "Envoi…" : d.sent_to_provider_at ? "Renvoyer à NK Services" : "Envoyer à NK Services"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} onClick={() => showLinks(d)}>Voir les pièces</button>
            <button className={`${c.btn} ${c.btnGhost}`} disabled={busy !== null} onClick={() => check(d)}>{busy === d.id ? "Analyse…" : "Analyser les pièces"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} disabled={busy !== null} onClick={() => openAsk(d)}>Demander les pièces manquantes</button>
            <button className={`${c.btn} ${c.btnGhost}`} disabled={busy !== null} onClick={() => reread(d)}>{busy === d.id ? "Lecture…" : "Relire le VIN"}</button>
            <button className={`${c.btn} ${c.btnGhost}`} disabled={busy !== null} onClick={() => stamp(d)} title="Appose le cachet et la signature MK HOLDING sur le mandat">{busy === d.id ? "…" : "🖋️ Cachet sur le mandat"}</button>
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
