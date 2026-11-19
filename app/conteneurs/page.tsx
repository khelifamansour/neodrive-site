"use client";
import { useEffect, useState } from "react";
import s from "../planificateur/planif.module.css";
import { DEPOTS, DOC_TYPES, FACTORY_DOCS, FOLLOWUP_KINDS, FORWARDER_ROLES, PIPELINE, VERSIONS, pipelineStyle, factoryChecks, portKey, vinValid, type ContainerInfo, type DocLite } from "../../lib/shipments";

type Row = Record<string, any>;
const STATUS = ["en production", "en mer", "arrivé au port", "dédouané", "dépoté", "terminé"];
const FIELDS: [string, string, string?][] = [["name", "Nom du dossier"], ["port", "Port d'arrivée"], ["vessel", "Navire / voyage"], ["bl_number", "N° connaissement (B/L)"], ["vehicles", "Nb de véhicules", "number"], ["loaded_at", "Date de départ", "date"], ["eta", "Arrivée prévue (ETA)", "date"], ["arrived_at", "Arrivée réelle", "date"], ["supplier", "Fournisseur"], ["invoice_no", "N° facture usine"], ["invoice_date", "Date facture usine", "date"], ["unit_price", "Prix unitaire véhicule (USD)", "number"], ["incoterm", "Incoterm"], ["model", "Désignation véhicule"], ["invoice_part", "Part de facture (si facture usine découpée)"], ["factory_email", "E-mail de l'usine (relances automatiques)"]];
const REQ = DOC_TYPES.filter(t => t.required);
const SHORT: Record<string, string> = { facture: "Facture", colisage: "Colisage", coc: "COC", bl: "B/L", transport: "Fret" };
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";
const cell: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #eceef1", textAlign: "center", whiteSpace: "nowrap" };
const box = (bg: string): React.CSSProperties => ({ background: bg, padding: 12, borderRadius: 12, display: "grid", gap: 8 });

export default function Conteneurs() {
  const [code, setCode] = useState(""); const [ships, setShips] = useState<Row[] | null>(null); const [docs, setDocs] = useState<Row[]>([]); const [veh, setVeh] = useState<Row[]>([]); const [fws, setFws] = useState<Row[]>([]);
  const [msg, setMsg] = useState(""); const [open, setOpen] = useState<number | null>(null); const [busy, setBusy] = useState(""); const [showFw, setShowFw] = useState(false);
  const [fups, setFups] = useState<Row[]>([]); const [pv, setPv] = useState<Row | null>(null); const [showOrder, setShowOrder] = useState(false); const [order, setOrder] = useState<Row | null>(null);
  const api = async (body: object, pc = code) => { const r = await fetch("/api/conteneurs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const j = await api({ action: "list" }, pc); setShips(j.ships); setDocs(j.docs); setVeh(j.vehicles || []); setFws(j.forwarders || []); setFups(j.followups || []); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || "" } catch { } setCode(pc); load(pc).then(() => { if (!pc) setMsg("") }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); try { const m = await fn(); if (m) setMsg(m); await load(); } catch (e) { setMsg("❌ " + (e as Error).message) } setBusy(""); };
  const save = (id: number | null, ship: Row) => run("save", async () => { await api({ action: "save", id, ship }); return "✅ Enregistré"; });
  const upload = (id: number, form: HTMLFormElement) => run("up" + id, async () => { const fd = new FormData(form); fd.append("passcode", code); fd.append("shipment_id", String(id)); const r = await fetch("/api/conteneurs", { method: "POST", body: fd }); const j = await r.json().catch(() => null); form.reset(); return j?.ok ? `✅ ${j.saved.length} document(s) classé(s)` : "❌ Erreur d'envoi"; });
  const openDoc = async (path: string) => { const j = await api({ action: "url", path }); if (j.url) window.open(j.url, "_blank"); };
  const fwFor = (sh: Row) => { const l = fws.filter(f => f.port === portKey(sh.port) && (f.role || "dédouanement") === "dédouanement"); return l.find(f => f.active !== false) || l[0]; };
  const copy = (t: string, m: string) => { navigator.clipboard?.writeText(t).catch(() => null); setMsg(m); };
  const Badge = ({ k }: { k: unknown }) => { const st = pipelineStyle(k); return <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}`, padding: "2px 8px", borderRadius: 999, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>{String(k || st.key)}</span>; };
  // Étape de validation : on prévisualise les e-mails (un par conteneur), puis on confirme l'envoi.
  const preview = (sh: Row, to?: string) => run("pv" + sh.id, async () => { const j = await api({ action: "preview", id: sh.id, to }); setPv({ sh, to, plans: j.plans, missing: j.missing }); setTimeout(() => document.getElementById("pv")?.scrollIntoView({ behavior: "smooth" }), 50); });
  const send = (sh: Row, to?: string) => { if (!confirm(`Envoyer maintenant ${pv?.plans?.length || 1} e-mail(s) au transitaire ${portKey(sh.port)} ?`)) return; run("send" + sh.id, async () => { const j = await api({ action: "send", id: sh.id, to }); setPv(null); return `✅ Dossier envoyé (${j.mails ?? 1} e-mail(s), ${j.sent} pièces jointes)${j.missing.length ? ` — signalés manquants : ${j.missing.join(", ")}` : ""}`; }); };
  const factory = (sh: Row) => { const url = `${window.location.origin}/factory/${sh.factory_token}`; navigator.clipboard?.writeText(url).catch(() => null); setMsg(`🏭 Lien usine copié (portail en anglais : checklist + contrôles automatiques) : ${url}`); };
  const share = (sh: Row) => { const url = `${window.location.origin}/depot/${sh.share_token}`; navigator.clipboard?.writeText(url).catch(() => null); setMsg(`🔗 Lien de dépôt copié (usine / transitaire, FR-EN-中文) : ${url}`); };

  const info = (sh: Row) => {
    const d = docs.filter(x => x.shipment_id === sh.id); const v = veh.filter(x => x.shipment_id === sh.id); const conts = (sh.container_list || []) as ContainerInfo[];
    const has = (k: string) => d.some(x => x.doc_type === k); const gen = d.some(x => x.uploaded_by === "plateforme");
    const unassigned = conts.length > 1 ? v.filter(x => !conts.some(c => c.no === x.container)).length : 0; const bad = v.filter(x => !vinValid(x.vin));
    const fw = fwFor(sh); const days = sh.eta ? Math.round((new Date(sh.eta).getTime() - Date.now()) / 86400000) : null;
    const missing = [...REQ.filter(t => !has(t.key)).map(t => t.fr.split(" (")[0]),
      ...(sh.vehicles && v.length < sh.vehicles ? [`Numéros de série : ${v.length}/${sh.vehicles}`] : []),
      ...(unassigned ? [`${unassigned} VIN sans conteneur attribué`] : []),
      ...(bad.length ? [`${bad.length} COC à corriger (VIN invalide)`] : []),
      ...(v.length && !gen ? ["Facture + colisage avec VIN à générer"] : []),
      ...(!fw?.email ? [`E-mail du transitaire ${portKey(sh.port)}`] : [])];
    return { d, v, conts, has, gen, unassigned, bad, fw, days, missing, ready: !missing.length };
  };

  if (!ships) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Dossiers conteneurs</h1><p>Code d’accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button><p style={{ fontSize: 13, marginTop: 12 }}><a href="/organisation" style={{ color: "inherit" }}>Membre de l’équipe ? Connectez-vous avec votre code sur la page Organisation</a></p>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  const totalVeh = ships.filter(x => x.status !== "terminé").reduce((t, x) => t + Number(x.vehicles || 0), 0);
  const totalCont = ships.filter(x => x.status !== "terminé").reduce((t, x) => t + Math.max(1, ((x.container_list || []) as ContainerInfo[]).length), 0);

  return <main className={s.page} style={{ maxWidth: 1200 }}>
    <div className={s.top}><div><h1>📦 Suivi des conteneurs</h1><p>{totalCont} conteneurs · {totalVeh} véhicules en cours. Cliquez sur une ligne pour ouvrir le dossier.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><a className={s.ghost} href="/vehicules">🚗 Véhicules & stock</a><button className={s.ghost} onClick={() => setShowFw(!showFw)}>🤝 Partenaires logistiques</button><button className={s.primary} onClick={() => { setShowOrder(!showOrder); setOrder(null); }}>🏭 Nouvelle commande usine</button><button className={s.ghost} onClick={() => { const n = prompt("Nom du dossier (ex. Le Havre – EVER ACE – nov. 2026)"); if (n) save(null, { name: n, status: "en mer" }); }}>+ Nouveau dossier</button></div></div>
    {msg ? <p style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", padding: 10, borderRadius: 10, wordBreak: "break-word" }}>{msg}</p> : null}

    {showFw ? <section className={s.card}><h2>🤝 Partenaires logistiques</h2><p className={s.muted}>Transitaires, dépotage, transport, stockage, compagnies : tous les contacts au même endroit, les partenaires confirmés en premier. Plusieurs prestataires par port. L’envoi du dossier part au premier prestataire « dédouanement » actif du port, avec ses copies (cc) et Mansour en copie et en réponse.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>{[...[...fws].sort((a, b) => Number(!!b.confirmed) - Number(!!a.confirmed) || Number(b.active !== false) - Number(a.active !== false)), { id: null, port: "Le Havre", role: "dédouanement", active: true }].map(f => <form key={f.id ?? "new"} style={box(f.id ? (f.active === false ? "#f4f4f5" : "#fafaf9") : "#f0f9ff")} onSubmit={e => { e.preventDefault(); const el = e.currentTarget; const fd = Object.fromEntries(new FormData(el)); run("fw", async () => { await api({ action: "forwarder_save", id: f.id, ...fd, active: fd.active === "on", confirmed: fd.confirmed === "on" }); if (!f.id) el.reset(); return `✅ ${fd.company || "Prestataire"} enregistré`; }); }}>
        <b>{f.confirmed ? "✅ " : ""}{f.id ? `${f.company || "?"} · ${f.port}` : "+ Ajouter un partenaire"}{f.id && f.active === false ? " (inactif)" : ""}</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><label className={s.field}>Port<select name="port" defaultValue={f.port || "Le Havre"}>{["Le Havre", "Fos-sur-Mer"].map(p => <option key={p}>{p}</option>)}</select></label>
          <label className={s.field}>Rôle<select name="role" defaultValue={f.role || "dédouanement"}>{FORWARDER_ROLES.map(r => <option key={r}>{r}</option>)}</select></label></div>
        {[["company", "Société"], ["contact", "Nom du contact"], ["email", "E-mail principal"], ["cc", "Copie à (e-mails séparés par des virgules)"], ["phone", "Téléphone"], ["notes", "Notes"]].map(([k, l]) => <label key={k} className={s.field}>{l}<input name={k} defaultValue={f[k] || ""} /></label>)}
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="active" defaultChecked={f.active !== false} style={{ width: "auto" }} /> Actif</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="confirmed" defaultChecked={!!f.confirmed} style={{ width: "auto" }} /> Partenaire confirmé (on travaille avec lui)</label>
        <div style={{ display: "flex", gap: 8 }}><button className={s.primary}>Enregistrer</button>{f.id ? <button type="button" className={s.ghost} onClick={() => confirm(`Supprimer ${f.company} ?`) && run("fw", async () => { await api({ action: "forwarder_delete", id: f.id }); return "✅ Supprimé"; })}>Supprimer</button> : null}</div></form>)}</div></section> : null}

    {showOrder ? <section className={s.card}><h2>🏭 Nouvelle commande usine</h2><p className={s.muted}>Crée le dossier à l’étape « commandé » et prépare le lien privé où l’usine dépose ses documents, avec un texte WeChat en anglais à copier. Rien n’est envoyé si la case e-mail n’est pas cochée.</p>
      <form style={box("#fafaf9")} onSubmit={e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.currentTarget)); run("order", async () => { const j = await api({ action: "new_order", ...fd, send: fd.send === "on" }); setOrder(j); return `✅ Commande créée${j.mailed ? " et e-mail envoyé à l'usine" : ""}`; }); }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
          <label className={s.field}>Nom du dossier<input name="name" required placeholder="Le Havre – BYD – janv. 2027" /></label>
          <label className={s.field}>Port<select name="port">{["Le Havre", "Fos-sur-Mer"].map(p => <option key={p}>{p}</option>)}</select></label>
          <label className={s.field}>Nb de véhicules<input name="vehicles" type="number" /></label>
          <label className={s.field}>Modèle<input name="model" /></label>
          <label className={s.field}>E-mail de l’usine<input name="factory_email" type="email" /></label>
          <label className={s.field}>Transitaire Chine (Lilian)<input name="origin_email" type="email" defaultValue="oceanexp1@yihaifreight.com" /></label></div>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="send" style={{ width: "auto" }} /> Envoyer l’e-mail de commande à l’usine et au transitaire Chine (en anglais), avec le lien de dépôt des documents</label>
        <button className={s.primary} disabled={busy === "order"}>{busy === "order" ? "Création…" : "Créer la commande"}</button></form>
      {order ? <div style={box("#f0fdf4")}><b>Lien usine</b><code style={{ wordBreak: "break-all" }}>{order.link}</code><button className={s.ghost} onClick={() => copy(order.link, "🔗 Lien usine copié")}>Copier le lien</button>
        <b>Texte WeChat (anglais)</b><textarea readOnly value={order.wechat} rows={6} /><button className={s.ghost} onClick={() => copy(order.wechat, "💬 Texte WeChat copié")}>Copier le texte WeChat</button></div> : null}</section> : null}

    <section className={s.card} style={{ overflowX: "auto", padding: 0 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr style={{ background: "#f4f6f9" }}>{["Dossier", "Port", "Cont.", "Véh.", "Départ", "Arrivée", ...REQ.map(t => SHORT[t.key]), "VIN", "Transitaire", "Étape", "État"].map(h => <th key={h} style={{ ...cell, fontWeight: 700 }}>{h}</th>)}</tr></thead>
        <tbody>{ships.map(sh => { const I = info(sh); const late = I.days != null && I.days <= 7;
          return <tr key={sh.id} onClick={() => { setOpen(open === sh.id ? null : sh.id); setTimeout(() => document.getElementById("d" + sh.id)?.scrollIntoView({ behavior: "smooth" }), 50); }} style={{ cursor: "pointer", background: open === sh.id ? "#fff7ed" : undefined }}>
            <td style={{ ...cell, textAlign: "left", whiteSpace: "normal", minWidth: 170 }}><b>{sh.name}</b><br /><small className={s.muted}>{sh.vessel || ""}</small></td>
            <td style={cell}>{sh.port || "?"}</td><td style={cell}>{Math.max(1, I.conts.length)}</td><td style={cell}><b>{sh.vehicles ?? "?"}</b></td><td style={cell}>{fmt(sh.loaded_at)}</td>
            <td style={{ ...cell, color: late ? "#b91c1c" : undefined }}><b>{fmt(sh.eta)}</b><br /><small>{I.days == null ? "" : I.days >= 0 ? `J-${I.days}` : `arrivé (J+${-I.days})`}</small></td>
            {REQ.map(t => <td key={t.key} style={{ ...cell, fontSize: 17 }}>{I.has(t.key) ? (t.key === "coc" && I.bad.length ? "⚠️" : "✅") : "❌"}</td>)}
            <td style={cell}>{I.v.length ? (I.unassigned ? `⚠️ ${I.v.length}` : `✅ ${I.v.length}`) : "❌"}</td>
            <td style={cell}>{I.fw?.email ? "✅" : "❌"}{sh.sent_at ? <><br /><small>📨 {fmt(sh.sent_at)}</small></> : null}</td>
            <td style={cell}><Badge k={sh.pipeline} /></td>
            <td style={cell}>{I.ready ? <span style={{ color: "#15803d", fontWeight: 700 }}>Prêt</span> : <span style={{ color: "#b45309", fontWeight: 700 }}>{I.missing.length} manquant{I.missing.length > 1 ? "s" : ""}</span>}<br /><small>{sh.status}</small></td>
          </tr>; })}</tbody>
      </table>
    </section>

    {ships.filter(sh => sh.id === open).map(sh => { const I = info(sh);
      return <section key={sh.id} id={"d" + sh.id} className={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h2>{sh.name}</h2><p className={s.muted}>{sh.port} · {sh.vehicles ?? "?"} véhicules · B/L {sh.bl_number || "—"} · départ {fmt(sh.loaded_at)} · arrivée {fmt(sh.eta)}</p></div><button className={s.ghost} onClick={() => setOpen(null)}>Fermer ✕</button></div>

        <div style={box(pipelineStyle(sh.pipeline).bg)}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><b>Étape :</b> <Badge k={sh.pipeline} />
          <select value={sh.pipeline || "commandé"} onChange={e => { const note = prompt(`Passer à « ${e.target.value} ». Note (facultatif) :`, ""); if (note === null) return; run("pl", async () => { await api({ action: "pipeline", id: sh.id, stage: e.target.value, note }); return `✅ Étape « ${e.target.value} » enregistrée (SMS envoyé à Mansour)`; }); }} style={{ width: "auto", padding: 4 }}>{PIPELINE.map(p => <option key={p.key}>{p.key}</option>)}</select></div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{PIPELINE.map(p => <span key={p.key} title={p.key} style={{ flex: 1, minWidth: 18, height: 6, borderRadius: 3, background: PIPELINE.findIndex(x => x.key === sh.pipeline) >= PIPELINE.indexOf(p) ? p.color : "#e5e7eb" }} />)}</div>
          {Array.isArray(sh.pipeline_history) && sh.pipeline_history.length ? <details><summary style={{ cursor: "pointer", fontSize: 14 }}>Historique ({sh.pipeline_history.length})</summary><ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>{[...sh.pipeline_history].reverse().map((h: Row, k: number) => <li key={k}>{new Date(h.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {h.from ? `${h.from} → ` : ""}<b>{h.stage}</b>{h.by ? ` · ${h.by}` : ""}{h.note ? ` · ${h.note}` : ""}</li>)}</ul></details> : null}
        </div>

        <div style={box("#f8fafc")}><b>✉️ Suivi des échanges et relances</b><small className={s.muted}>Relance automatique à 10 h 30 si pas de réponse après 24 h (3 relances max, jamais le soir ni le dimanche), uniquement si « auto » est coché. Cochez « répondu » dès que la réponse arrive.</small>
          {fups.filter(f => f.shipment_id === sh.id).map(f => <div key={f.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, opacity: f.answered_at ? .6 : 1 }}>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={!!f.answered_at} onChange={e => run("f", async () => { await api({ action: "followup_update", id: f.id, answered: e.target.checked }); })} style={{ width: "auto" }} /> répondu</label>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={!!f.auto} onChange={e => run("f", async () => { await api({ action: "followup_update", id: f.id, auto: e.target.checked }); })} style={{ width: "auto" }} /> auto</label>
            <small style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 6 }}>{f.kind}</small><span><b>{f.label || f.subject || "—"}</b> → {f.recipient}</span>
            <small className={s.muted}>{f.sent_at ? `envoyé ${fmt(f.sent_at)}` : ""}{f.relance_count ? ` · ${f.relance_count} relance(s), dernière ${fmt(f.last_relance_at)}` : ""}{f.answered_at ? ` · répondu ${fmt(f.answered_at)}` : ""}</small></div>)}
          <form onSubmit={e => { e.preventDefault(); const el = e.currentTarget; const fd = Object.fromEntries(new FormData(el)); run("fa", async () => { await api({ action: "followup_add", shipment_id: sh.id, ...fd, auto: fd.auto === "on" }); el.reset(); return "✅ Échange ajouté au suivi"; }); }} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <select name="kind" style={{ width: "auto", padding: 4 }}>{FOLLOWUP_KINDS.map(k => <option key={k}>{k}</option>)}</select><input name="label" placeholder="Objet de la demande" style={{ flex: 2, minWidth: 160 }} /><input name="recipient" type="email" required placeholder="destinataire@…" style={{ flex: 2, minWidth: 160 }} /><input name="subject" placeholder="Sujet exact de l'e-mail" style={{ flex: 2, minWidth: 160 }} />
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" name="auto" style={{ width: "auto" }} /> auto</label><button className={s.ghost}>+ Ajouter</button></form>
        </div>

        {I.missing.length ? <div style={box("#fef2f2")}><b style={{ color: "#b91c1c" }}>❌ Il manque ({I.missing.length})</b><ul style={{ margin: 0, paddingLeft: 20 }}>{I.missing.map(m => <li key={m}>{m}</li>)}</ul></div> : <div style={box("#f0fdf4")}><b style={{ color: "#15803d" }}>✅ Dossier complet : prêt à envoyer au transitaire</b></div>}

        <details><summary style={{ cursor: "pointer", fontWeight: 700, padding: "6px 0" }}>📝 Informations du dossier et de la facture usine</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, marginTop: 8 }}>
            {FIELDS.map(([k, l, type]) => <label key={k} className={s.field}>{l}<input type={type || "text"} step="any" defaultValue={sh[k] ?? ""} onBlur={e => String(e.target.value) !== String(sh[k] ?? "") && save(sh.id, { [k]: type === "number" ? Number(e.target.value) || null : e.target.value })} /></label>)}
            <label className={s.field}>Statut<select defaultValue={sh.status} onChange={e => save(sh.id, { status: e.target.value })}>{STATUS.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className={s.field}>Dépôt de destination<select defaultValue={sh.depot || ""} onChange={e => save(sh.id, { depot: e.target.value })}><option value="">à définir</option>{DEPOTS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label className={s.field}>Envoi automatique au transitaire quand l’usine a tout déposé<select defaultValue={sh.auto_send ? "1" : ""} onChange={e => save(sh.id, { auto_send: !!e.target.value })}><option value="1">Oui</option><option value="">Non (j’envoie moi-même)</option></select></label>
          </div>
          <label className={s.field}>Notes<textarea rows={3} defaultValue={sh.notes || ""} onBlur={e => e.target.value !== (sh.notes || "") && save(sh.id, { notes: e.target.value })} style={{ font: "inherit", padding: 10, borderRadius: 12, border: "1px solid #d4d7db" }} /></label>
        </details>

        <div style={box("#f8fafc")}><b>🚢 Conteneurs</b>
          {I.conts.map((c, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.2fr .8fr .8fr .7fr auto", gap: 6, alignItems: "end" }}>
            {(["no", "seal", "net", "gross", "cbm"] as const).map(k => <label key={k} className={s.field} style={{ fontSize: 12 }}>{({ no: "N° conteneur", seal: "Scellé", net: "Net kg", gross: "Brut kg", cbm: "m³" })[k]}<input defaultValue={c[k] ?? ""} onBlur={e => { const list = I.conts.map(x => ({ ...x })); (list[i] as any)[k] = k === "no" || k === "seal" ? e.target.value.toUpperCase().trim() : Number(e.target.value) || null; if (String(c[k] ?? "") !== e.target.value) save(sh.id, { container_list: list }); }} /></label>)}
            <button className={s.ghost} style={{ padding: "6px 10px" }} onClick={() => confirm("Retirer ce conteneur ?") && save(sh.id, { container_list: I.conts.filter((_, j) => j !== i) })}>✕</button>
            <small className={s.muted} style={{ gridColumn: "1/-1" }}>{I.v.filter(x => x.container === c.no || I.conts.length === 1).length} véhicule(s) attribué(s)</small>
          </div>)}
          <button className={s.ghost} onClick={() => { const no = prompt("N° du conteneur (ex. TRHU6790832)"); if (no) save(sh.id, { container_list: [...I.conts, { no: no.toUpperCase().trim() }] }); }}>+ Ajouter un conteneur</button>
        </div>

        <div style={box("#f8fafc")}><b>🔢 Numéros de série (VIN) et COC — {I.v.length}{sh.vehicles ? `/${sh.vehicles}` : ""}</b>
          {I.v.length ? <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontSize: 13.5, width: "100%" }}><thead><tr><th style={cell}>VIN</th><th style={cell}>Conteneur</th><th style={cell}>COC</th><th style={cell}></th></tr></thead><tbody>
            {I.v.map(x => <tr key={x.id}><td style={{ ...cell, fontFamily: "monospace" }}>{x.vin}</td>
              <td style={cell}>{I.conts.length > 1 ? <select value={x.container || ""} onChange={e => run("v", async () => { await api({ action: "vehicle_update", id: x.id, container: e.target.value }); })} style={{ padding: 4, width: "auto", background: x.container ? undefined : "#fef3c7" }}><option value="">— à attribuer —</option>{I.conts.map(c => <option key={c.no}>{c.no}</option>)}</select> : (I.conts[0]?.no || "—")}</td>
              <td style={{ ...cell, whiteSpace: "normal" }}>{vinValid(x.vin) ? "✅" : <span style={{ color: "#b91c1c" }}>⚠️ clé de contrôle invalide : COC à corriger <button className={s.ghost} style={{ padding: "2px 6px" }} onClick={() => { const n = prompt("VIN correct (relevé sur le châssis)", x.vin); if (n) run("v", async () => { await api({ action: "vehicle_update", id: x.id, vin: n.trim() }); }); }}>corriger</button></span>}</td>
              <td style={cell}><button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => confirm(`Retirer ${x.vin} ?`) && run("v", async () => { await api({ action: "vehicle_delete", id: x.id }); })}>✕</button></td></tr>)}
          </tbody></table></div> : <p className={s.muted}>Aucun numéro de série pour l’instant.</p>}
          <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const el = e.currentTarget; run("va", async () => { const j = await api({ action: "vehicles_add", id: sh.id, vins: f.get("vins"), container: f.get("container") }); el.reset(); return `✅ ${j.added} VIN ajouté(s)`; }); }} style={{ display: "grid", gap: 6 }}>
            <textarea name="vins" rows={3} placeholder="Collez un ou plusieurs VIN (un par ligne ou séparés par des espaces)" style={{ font: "inherit", padding: 10, borderRadius: 12, border: "1px solid #d4d7db" }} required />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{I.conts.length > 1 ? <select name="container" style={{ width: "auto" }}><option value="">Conteneur : à attribuer plus tard</option>{I.conts.map(c => <option key={c.no}>{c.no}</option>)}</select> : null}<button className={s.ghost} disabled={busy === "va"}>Ajouter les VIN</button></div>
          </form>
        </div>

        <div style={box("#fff7ed")}><b>📄 Facture, liste de colisage et pièces détachées, avec les VIN et les COC</b>
          <small>Générées à partir de la facture usine (mêmes quantités, prix et montants), avec une ligne par véhicule, son VIN et sa référence COC, et la liste de colisage conteneur par conteneur. Elles sont jointes à l’envoi en plus des originaux de l’usine.</small>
          {I.unassigned ? <small style={{ color: "#b45309" }}>⚠️ {I.unassigned} VIN sans conteneur : ils apparaîtront dans « container to be confirmed ». Attribuez-les avant de générer la version définitive.</small> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className={s.primary} disabled={busy === "gen" + sh.id} onClick={() => run("gen" + sh.id, async () => { await api({ action: "gen_docs", id: sh.id }); return "✅ Facture, colisage et liste des pièces générés (voir le coffre-fort ci-dessous)"; })}>{busy === "gen" + sh.id ? "Génération…" : I.gen ? "🔄 Regénérer facture + colisage avec VIN" : "📄 Générer facture + colisage avec VIN"}</button>
            {I.d.filter(x => x.uploaded_by === "plateforme").map(x => <button key={x.id} className={s.ghost} title={x.file_name} onClick={() => openDoc(x.file_path)}>👁 {x.doc_type === "facture" ? "Facture" : x.doc_type === "pieces" ? "Pièces détachées" : "Colisage"}{x.ref && x.ref !== sh.invoice_no ? ` (${x.ref})` : ""}</button>)}</div>
        </div>

        {(() => { const fc = factoryChecks(sh, I.d.filter(x => x.uploaded_by !== "plateforme") as DocLite[]); return <div style={box(fc.complete ? "#f0fdf4" : "#f8fafc")}><b>🏭 Portail usine : {FACTORY_DOCS.length - fc.missing.length}/{FACTORY_DOCS.length} pièces{sh.factory_complete_at ? ` · complet le ${new Date(sh.factory_complete_at).toLocaleDateString("fr-FR")}` : ""}</b>
          {fc.missing.length ? <small>Manque : {fc.missing.map(k => DOC_TYPES.find(t => t.key === k)?.fr.split(" (")[0]).join(", ")}</small> : null}
          {fc.issues.length ? <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>{fc.issues.map((i, k) => <li key={k} style={{ color: i.level === "error" ? "#b91c1c" : "#b45309" }}>{i.fr}</li>)}</ul> : <small>✅ Contrôles automatiques OK (VIN, quantités, totaux) sur les documents lus.</small>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><button className={s.ghost} onClick={() => factory(sh)}>🏭 Copier le lien usine</button><small className={s.muted}>{sh.factory_email ? `Relances automatiques à ${sh.factory_email}` : "Ajoutez l'e-mail de l'usine pour les relances automatiques"}</small></div>
        </div>; })()}

        <div style={box("#fafaf9")}><b>🔒 Coffre-fort des documents</b>
          {DOC_TYPES.map(t => { const list = I.d.filter(x => x.doc_type === t.key); if (!list.length && !t.required) return null; return <div key={t.key}><b>{list.length ? "✅" : "❌"} {t.fr}</b>
            {list.map(x => <div key={x.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, padding: "4px 0 4px 22px" }}>
              <a href="#" onClick={e => { e.preventDefault(); openDoc(x.file_path); }}>📄 {x.file_name}</a>{x.uploaded_by === "plateforme" ? <small style={{ background: "#ffedd5", padding: "1px 6px", borderRadius: 6 }}>avec VIN</small> : <small>· {x.version}</small>}{x.ref ? <small>· {x.ref}</small> : null}
              {x.uploaded_by !== "plateforme" ? <><select value={x.version} onChange={e => run("d", async () => { await api({ action: "doc_update", id: x.id, version: e.target.value }); })} style={{ width: "auto", padding: 4 }}>{VERSIONS.map(v => <option key={v}>{v}</option>)}</select>
              <select value={x.doc_type} onChange={e => run("d", async () => { await api({ action: "doc_update", id: x.id, doc_type: e.target.value }); })} style={{ width: "auto", padding: 4 }}>{DOC_TYPES.map(o => <option key={o.key} value={o.key}>{o.fr.split(" (")[0]}</option>)}</select>
              {I.conts.length > 1 ? <select value={x.container || ""} onChange={e => run("d", async () => { await api({ action: "doc_update", id: x.id, container: e.target.value }); })} style={{ width: "auto", padding: 4 }}><option value="">tous conteneurs</option>{I.conts.map(c => <option key={c.no}>{c.no}</option>)}</select> : null}</> : x.container ? <small>· {x.container}</small> : null}
              <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => confirm("Supprimer ce document ?") && run("d", async () => { await api({ action: "doc_delete", id: x.id }); })}>✕</button>
              {x.ai_note ? <small style={{ flexBasis: "100%", color: "#5b6573" }}>{x.ai_note}</small> : null}
            </div>)}</div>; })}
          <form onSubmit={e => { e.preventDefault(); upload(sh.id, e.currentTarget); }} style={{ display: "grid", gap: 8, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
            <b>Ajouter des documents (un ou plusieurs)</b>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select name="doc_type" defaultValue="autre">{DOC_TYPES.map(o => <option key={o.key} value={o.key}>{o.key === "autre" ? "Classement automatique (IA)" : o.fr}</option>)}</select>
              <select name="version" defaultValue="originale">{VERSIONS.map(v => <option key={v}>{v}</option>)}</select>
            </div>
            <input type="file" name="files" multiple required />
            <button className={s.ghost} disabled={busy === "up" + sh.id}>{busy === "up" + sh.id ? "Classement…" : "Ajouter"}</button>
          </form>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className={s.primary} disabled={busy === "pv" + sh.id} onClick={() => preview(sh)}>{busy === "pv" + sh.id ? "Préparation…" : `👁 Prévisualiser puis envoyer au transitaire ${portKey(sh.port)}`}</button>
          <button className={s.ghost} onClick={() => share(sh)}>🔗 Lien de dépôt (usine / transitaire)</button>
          <small className={s.muted}>{I.fw?.email ? `→ ${I.fw.contact ? I.fw.contact + " · " : ""}${I.fw.email}` : "Ajoutez le contact dans « 🚚 Transitaires »"}{sh.sent_at ? ` · dernier envoi le ${new Date(sh.sent_at).toLocaleDateString("fr-FR")}` : ""}{!I.ready ? " · les éléments manquants seront signalés dans l'e-mail" : ""}</small>
        </div>
        {pv && pv.sh.id === sh.id ? <div id="pv" style={{ ...box("#eff6ff"), border: "2px solid #1d4ed8" }}><b>👁 Aperçu : {pv.plans.length} e-mail(s), un par conteneur. Rien n’est encore parti.</b>
          {pv.missing.length ? <small style={{ color: "#b45309" }}>⚠️ Signalés manquants dans l’e-mail : {pv.missing.join(", ")}</small> : null}
          {pv.plans.map((m: Row, k: number) => <details key={k} open={k === 0} style={{ background: "#fff", borderRadius: 10, padding: 10 }}><summary style={{ cursor: "pointer" }}><b>{m.container}</b> · {m.subject}</summary>
            <p style={{ fontSize: 14, margin: "6px 0" }}>À : <b>{m.toName ? `${m.toName} <${m.to}>` : m.to}</b><br />Cc : {m.cc.join(", ") || "—"}<br />Pièces jointes : {m.files.map((f: Row) => f.name).join(" · ") || "aucune"}</p>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, maxHeight: 420, overflow: "auto", fontSize: 13 }} dangerouslySetInnerHTML={{ __html: m.html }} /></details>)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className={s.primary} disabled={busy === "send" + sh.id} onClick={() => send(sh, pv.to)}>{busy === "send" + sh.id ? "Envoi…" : `✅ Confirmer l'envoi (${pv.plans.length} e-mail${pv.plans.length > 1 ? "s" : ""})`}</button>
            <button className={s.ghost} onClick={() => { const to = prompt("Envoyer à une autre adresse (le cc reste identique) :", pv.plans[0]?.to || ""); if (to) preview(sh, to); }}>Changer le destinataire</button><button className={s.ghost} onClick={() => setPv(null)}>Annuler</button></div></div> : null}
      </section>; })}
  </main>;
}
