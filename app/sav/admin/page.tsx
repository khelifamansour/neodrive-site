"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MediaGallery, { type GalleryItem } from "../MediaGallery";
import { CHANNEL_LABEL, SAV_PRIORITIES, SAV_STATUSES, priorityOf, statusOf, waNumberOf, type SavAlert, type SavEventRow, type SavMessage, type SavMedia } from "../../../lib/sav-center";

type Row = {
  id: string; ref: string; sav_status: string; priority: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null;
  vin: string | null; category: string | null; assigned_to: string | null; created_at: string; updated_at: string | null; closed_at: string | null;
  status_changed_at: string | null; days_open: number; alerts: SavAlert[]; attachments: number; messages: number; parts: number;
  last: { at: string; direction: string; body: string } | null;
};
type Part = { id: string; sku: string | null; name: string; image_url: string | null; category?: string | null; sale_price?: number | null; stock_qty?: number | null; kind: string };
type Ticket = Row & { error_code: string | null; description: string | null; ai_diagnosis: string | null; resolution: string | null; ticket_number: string | null; last_customer_message_at: string | null; last_staff_message_at: string | null };
type Detail = { ticket: Ticket; messages: SavMessage[]; events: SavEventRow[]; media: SavMedia[]; parts: Part[]; vehicle: { vin: string; internal_ref: string; model: string; version: string; color: string } | null; history: { id: string; public_reference: string; sav_status: string; created_at: string; category: string }[] };
type Api = (body: Record<string, unknown>) => Promise<Record<string, unknown>>;

const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDay = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const digits = (s: string | null | undefined) => String(s || "").replace(/\D/g, "");
const fold = (s: string | null | undefined) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const first = (n: string | null | undefined) => String(n || "").trim().split(/\s+/)[0] || "";

export default function SavAdmin() {
  const [code, setCode] = useState("");
  const [pc, setPc] = useState("");
  const [state, setState] = useState<"loading" | "login" | "ok">("loading");
  const [err, setErr] = useState("");
  const [me, setMe] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pushed = useRef(false);

  const api: Api = useCallback(async (body) => {
    const r = await fetch("/api/sav/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Réponse illisible" }));
    if (r.status === 401) { setState("login"); throw new Error(j.error || "Accès refusé"); }
    if (!r.ok || !j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, [pc]);

  const load = useCallback(async (pass: string, fromLogin = false) => {
    setErr(""); setRefreshing(true);
    try {
      const r = await fetch("/api/sav/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pass, action: "list" }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { setState("login"); if (fromLogin) setErr("Code incorrect."); return; }
      if (!r.ok || !j.ok) throw new Error(j.error || "Erreur de chargement");
      setRows(j.tickets); setMe(j.me); setPc(pass); setState("ok");
      if (pass) try { sessionStorage.setItem("nd_pc", pass); } catch { /* navigation privée */ }
    } catch (e) { setErr((e as Error).message); if (fromLogin) setState("login"); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    let saved = "";
    try { saved = sessionStorage.getItem("nd_pc") || sessionStorage.getItem("sav_pc") || ""; } catch { /* rien */ }
    void load(saved);
  }, [load]);

  // Lien direct /sav/admin#SAV-… et bouton Retour du téléphone
  useEffect(() => {
    const read = () => { const h = decodeURIComponent(location.hash.replace(/^#/, "")); if (!h) pushed.current = false; setOpenRef(h.startsWith("SAV-") ? h : null); };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const openTicket = (ref: string) => { pushed.current = true; location.hash = ref; window.scrollTo(0, 0); };
  const closeTicket = () => { if (pushed.current) { pushed.current = false; history.back(); } else { history.replaceState(null, "", location.pathname); setOpenRef(null); } };

  const openRows = rows.filter(r => !["resolu", "cloture"].includes(r.sav_status));
  const urgent = useMemo(() => openRows.filter(r => r.alerts.length).sort((a, b) => b.alerts.length - a.alerts.length || SAV_PRIORITIES.findIndex(p => p.key === b.priority) - SAV_PRIORITIES.findIndex(p => p.key === a.priority) || a.created_at.localeCompare(b.created_at)), [openRows]);
  const list = useMemo(() => {
    const f = fold(q.trim()), d = digits(q);
    return rows.filter(r => filter === "all" || (filter === "open" ? !["resolu", "cloture"].includes(r.sav_status) : filter === "alerts" ? r.alerts.length > 0 : r.sav_status === filter))
      .filter(r => !f || [r.ref, r.customer_name, r.customer_email, r.vin, r.category, r.assigned_to].some(x => fold(x).includes(f)) || (d.length >= 4 && digits(r.customer_phone).includes(d.replace(/^33/, "0").replace(/^0/, ""))));
  }, [rows, filter, q]);
  const count = (k: string) => rows.filter(r => r.sav_status === k).length;

  if (state === "loading") return <main className="savA"><p className="muted center">Chargement…</p><style jsx global>{css}</style></main>;
  if (state === "login") return <main className="savA">
    <form className="login" onSubmit={e => { e.preventDefault(); void load(code, true); }}>
      <h1>Service après-vente</h1>
      <p>Entrez le code d’accès NeoDrive.</p>
      <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code d’accès" autoFocus />
      <button className="btn dark" disabled={refreshing}>{refreshing ? "Vérification…" : "Entrer"}</button>
      {err ? <p className="err">{err}</p> : null}
      <p className="muted">Membre de l’équipe ? <a href="/organisation">Se connecter</a> avec votre accès personnel, puis revenez sur cette page.</p>
    </form>
    <style jsx global>{css}</style>
  </main>;

  const current = openRef ? rows.find(r => r.ref === openRef) : null;
  if (openRef) return <main className="savA">
    <button className="back" onClick={closeTicket}>← Retour à la liste</button>
    {current ? <TicketView key={current.id} id={current.id} api={api} me={me} onChanged={() => load(pc)} /> : <p className="muted">Ticket {openRef} introuvable. <button className="link" onClick={closeTicket}>Retour</button></p>}
    <style jsx global>{css}</style>
  </main>;

  return <main className="savA">
    <header className="top">
      <div><h1>Service après-vente</h1><p className="muted">{openRows.length} ticket{openRows.length > 1 ? "s" : ""} ouvert{openRows.length > 1 ? "s" : ""} · {rows.length} au total{me ? ` · connecté : ${me}` : ""}</p></div>
      <button className="btn ghost" onClick={() => load(pc)} disabled={refreshing}>{refreshing ? "…" : "↻ Actualiser"}</button>
    </header>
    {err ? <p className="err">{err}</p> : null}

    {urgent.length ? <section className="urgent">
      <h2>⚠️ À traiter maintenant <span>{urgent.length}</span></h2>
      <p className="muted small">Client sans réponse depuis plus de 24 h, ticket ouvert depuis plus de 7 jours, ou statut inchangé depuis plus de 3 jours.</p>
      <ul>{urgent.map(r => <li key={r.id}><button onClick={() => openTicket(r.ref)}>
        <span className="badge" style={{ background: statusOf(r.sav_status).color }}>{statusOf(r.sav_status).label}</span>
        <b>{r.customer_name || "Client"}</b><small>{r.ref} · {r.category} · J+{r.days_open}{r.assigned_to ? ` · ${r.assigned_to}` : " · non attribué"}</small>
        <span className="chips">{r.alerts.map(a => <i key={a.key} className={`chip ${a.key}`}>{a.label}</i>)}</span>
      </button></li>)}</ul>
    </section> : <p className="allgood">✅ Rien d’urgent : tous les clients ont eu une réponse.</p>}

    <section className="filters">
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher : nom, téléphone, VIN, n° de ticket…" aria-label="Rechercher" />
      <div className="fchips">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>Ouverts · {openRows.length}</button>
        <button className={filter === "alerts" ? "on" : ""} onClick={() => setFilter("alerts")}>⚠️ En alerte · {urgent.length}</button>
        {SAV_STATUSES.map(s => <button key={s.key} className={filter === s.key ? "on" : ""} onClick={() => setFilter(s.key)}><i style={{ background: s.color }} />{s.label} · {count(s.key)}</button>)}
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Tous · {rows.length}</button>
      </div>
    </section>

    {!list.length ? <p className="muted center">Aucun ticket ne correspond.</p> : null}
    <ul className="rows">{list.map(r => {
      const st = statusOf(r.sav_status), pr = priorityOf(r.priority);
      return <li key={r.id}><button onClick={() => openTicket(r.ref)} className={r.alerts.length ? "hot" : ""}>
        <span className="badge" style={{ background: st.color }}>{st.label}</span>
        <span className="main">
          <b>{r.customer_name || "Client"}{["high", "urgent"].includes(r.priority) ? <em className="prio" style={{ color: pr.color }}> · {pr.label}</em> : null}</b>
          <small>{r.ref} · {r.category || "—"}{r.vin ? ` · VIN ${r.vin}` : ""}</small>
          {r.last ? <small className="last">{r.last.direction === "in" ? "👤 Client : " : r.last.direction === "note" ? "🔒 " : "↩︎ NeoDrive : "}{r.last.body}</small> : null}
        </span>
        <span className="side"><b>J+{r.days_open}</b><small>{r.assigned_to || "non attribué"}</small><small>{r.attachments ? `📎${r.attachments} ` : ""}{r.messages ? `💬${r.messages}` : ""}{r.alerts.length ? " ⚠️" : ""}</small></span>
      </button></li>;
    })}</ul>
    <style jsx global>{css}</style>
  </main>;
}

/* ────────────────────────────── Fiche ticket ────────────────────────────── */

function TicketView({ id, api, me, onChanged }: { id: string; api: Api; me: string; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const reload = useCallback(async () => {
    try { const j = await api({ action: "get", id }); setD(j as unknown as Detail); setErr(""); } catch (e) { setErr((e as Error).message); }
  }, [api, id]);
  useEffect(() => { void reload(); }, [reload]);
  const changed = () => { void reload(); onChanged(); };

  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted center">Chargement du ticket…</p>;
  const t = d.ticket, st = statusOf(t.sav_status);
  const gallery: GalleryItem[] = [
    ...d.media.map(m => ({ ...m, caption: "Demande initiale" })),
    ...d.messages.flatMap(m => (m.media || []).map(x => ({ ...x, caption: `${m.direction === "in" ? "Client" : "NeoDrive"} · ${fmtDay(m.created_at)}` }))),
  ];
  const suivi = typeof window !== "undefined" ? `${location.origin}/sav?ref=${encodeURIComponent(t.ref)}&email=${encodeURIComponent(t.customer_email || "")}#suivi` : "";

  return <div className="ticket">
    <header className="tHead">
      <div>
        <small className="muted">{t.ref}</small>
        <h1>{t.customer_name || "Client"}</h1>
        <div className="tags"><span className="badge" style={{ background: st.color }}>{st.label}</span><span className="tag" style={{ color: priorityOf(t.priority).color }}>Priorité {priorityOf(t.priority).label.toLowerCase()}</span><span className="tag">Ouvert depuis {t.days_open} jour{t.days_open > 1 ? "s" : ""}</span>{t.assigned_to ? <span className="tag">👤 {t.assigned_to}</span> : <span className="tag warn">Non attribué</span>}</div>
      </div>
      <dl className="dates"><div><dt>Créé</dt><dd>{fmt(t.created_at)}</dd></div><div><dt>Dernière mise à jour</dt><dd>{fmt(t.updated_at)}</dd></div><div><dt>Clôturé</dt><dd>{t.closed_at ? fmt(t.closed_at) : "—"}</dd></div></dl>
    </header>
    {t.alerts.length ? <div className="alertBox">{t.alerts.map(a => <span key={a.key} className={`chip ${a.key}`}>⚠️ {a.label}</span>)}</div> : null}

    <div className="cols">
      <div className="colL">
        <StatusCard t={t} api={api} onSaved={changed} />

        <section className="card">
          <h2>Client</h2>
          <p className="big"><b>{t.customer_name}</b></p>
          <p>📞 {t.customer_phone ? <a href={`tel:${t.customer_phone}`}>{t.customer_phone}</a> : "—"}<br />✉️ {t.customer_email ? <a href={`mailto:${t.customer_email}`}>{t.customer_email}</a> : "—"}</p>
          <div className="btns">
            {t.customer_phone ? <a className="btn wa" href={`https://wa.me/${waNumberOf(t.customer_phone)}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
            {t.customer_phone ? <a className="btn ghost" href={`tel:${t.customer_phone}`}>Appeler</a> : null}
            <CopyButton text={suivi} label="Copier le lien de suivi client" />
          </div>
          {d.history.length ? <><h3>Autres demandes de ce client</h3><ul className="hist">{d.history.map(h => <li key={h.id}><a href={`#${h.public_reference}`}>{h.public_reference}</a> · {statusOf(h.sav_status).label} · {h.category} · {fmtDay(h.created_at)}</li>)}</ul></> : null}
        </section>

        <section className="card">
          <h2>Véhicule et demande</h2>
          <p>VIN : <b className="mono">{t.vin || "non renseigné"}</b>{d.vehicle ? <><br />Reconnu : {d.vehicle.model} {d.vehicle.version} {d.vehicle.color ? `· ${d.vehicle.color}` : ""} ({d.vehicle.internal_ref || d.vehicle.vin})</> : t.vin ? <><br /><span className="muted small">VIN non trouvé dans le stock NeoDrive.</span></> : null}</p>
          <p>Sujet : <b>{t.category || "—"}</b> · Code écran : <b>{t.error_code || "aucun"}</b></p>
          <h3>Description du client</h3>
          <p className="desc">{t.description || "—"}</p>
          {t.ai_diagnosis ? <details><summary>Pré-diagnostic automatique envoyé au client</summary><p className="desc">{t.ai_diagnosis}</p></details> : null}
        </section>

        <section className="card">
          <h2>Pièces demandées</h2>
          {d.parts.length ? <ul className="parts">{d.parts.map(p => <li key={p.id + p.kind}>
            {p.image_url ? <img src={p.image_url} alt="" /> : <span className="noimg">🔧</span>}
            <span><b>{p.name}</b><small>{[p.sku && `Réf. ${p.sku}`, p.category, p.sale_price != null && `${Number(p.sale_price).toLocaleString("fr-FR")} €`, p.stock_qty != null && `stock ${p.stock_qty}`].filter(Boolean).join(" · ")}</small><small className="kind">{p.kind === "client" ? "Choisie par le client" : "Recommandée"}</small></span>
          </li>)}</ul> : <p className="muted">Aucune pièce indiquée par le client.</p>}
        </section>

        <section className="card">
          <h2>Photos et vidéos <span className="count">{gallery.length}</span></h2>
          {gallery.length ? <><p className="muted small">Touchez une vignette pour l’ouvrir. Les vidéos se lisent directement.</p><MediaGallery items={gallery} /></> : <p className="muted">Aucun fichier envoyé.</p>}
        </section>
      </div>

      <div className="colR">
        <Conversation t={t} messages={d.messages} api={api} me={me} onSent={changed} suivi={suivi} />
        <Summary id={t.id} api={api} />
        <section className="card">
          <h2>Historique du ticket</h2>
          <ul className="events">{[...d.events].reverse().map(e => <li key={e.id}><small>{fmt(e.created_at)} · {e.author || "—"}</small><p>{eventText(e)}</p>{e.note ? <p className="muted small">« {e.note} »</p> : null}</li>)}</ul>
        </section>
      </div>
    </div>
  </div>;
}

function eventText(e: SavEventRow) {
  if (e.kind === "created") return "Demande créée";
  if (e.kind === "status") return `Statut : ${e.from_value ? statusOf(e.from_value).label : "—"} → ${statusOf(e.to_value).label}`;
  if (e.kind === "priority") return `Priorité : ${priorityOf(e.from_value).label} → ${priorityOf(e.to_value).label}`;
  if (e.kind === "assign") return e.to_value ? `Attribué à ${e.to_value}` : "Attribution retirée";
  if (e.kind === "resolution") return "Solution / diagnostic mis à jour";
  return e.kind;
}

/* Statut, priorité, attribution */
function StatusCard({ t, api, onSaved }: { t: Ticket; api: Api; onSaved: () => void }) {
  const [status, setStatus] = useState(t.sav_status);
  const [priority, setPriority] = useState(t.priority || "normal");
  const [assigned, setAssigned] = useState(t.assigned_to || "");
  const [resolution, setResolution] = useState(t.resolution || "");
  const [clientMsg, setClientMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = status !== t.sav_status || priority !== (t.priority || "normal") || assigned.trim() !== (t.assigned_to || "") || resolution.trim() !== (t.resolution || "") || !!clientMsg.trim();
  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const j = await api({ action: "update", id: t.id, sav_status: status, priority, assigned_to: assigned, resolution, client_message: clientMsg });
      setMsg((j.changes as string[] | undefined)?.length || clientMsg ? "✅ Enregistré." : "Rien n’a changé."); setClientMsg(""); onSaved();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return <section className="card status">
    <h2>Statut du ticket</h2>
    <div className="stg">{SAV_STATUSES.map(s => <button key={s.key} type="button" className={status === s.key ? "on" : ""} style={status === s.key ? { background: s.color, borderColor: s.color } : undefined} onClick={() => setStatus(s.key)}>{s.label}</button>)}</div>
    {status !== t.sav_status ? <label className="fld">Message au client <em>(facultatif · visible sur sa page de suivi)</em><textarea rows={2} value={clientMsg} onChange={e => setClientMsg(e.target.value)} placeholder={statusOf(status).clientMsg} /></label> : null}
    <div className="two">
      <label className="fld">Priorité<select value={priority} onChange={e => setPriority(e.target.value)}>{SAV_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
      <label className="fld">Attribué à<input value={assigned} onChange={e => setAssigned(e.target.value)} placeholder="Nom de la personne ou du garage" /></label>
    </div>
    <label className="fld">Solution / diagnostic <em>(interne)</em><textarea rows={2} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Ce qui a été trouvé ou fait" /></label>
    <button className="btn dark wide" onClick={save} disabled={busy || !dirty}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
    {msg ? <p className="ok">{msg}</p> : null}
  </section>;
}

/* Conversation centralisée */
const MODES = [
  { key: "email", label: "✉️ E-mail", help: "Le message part tout de suite par e-mail au client. Il est enregistré ici.", button: "Envoyer par e-mail" },
  { key: "whatsapp", label: "WhatsApp", help: "WhatsApp s’ouvre avec le message déjà écrit : appuyez sur Envoyer dans WhatsApp. Le message est enregistré ici.", button: "Ouvrir WhatsApp et enregistrer" },
  { key: "in", label: "📥 Réponse du client", help: "Le client a répondu sur WhatsApp ou par e-mail ? Collez sa réponse ici pour garder tout l’historique.", button: "Enregistrer la réponse du client" },
  { key: "note", label: "🔒 Note interne", help: "Visible seulement par l’équipe NeoDrive. Le client ne la voit jamais.", button: "Ajouter la note" },
] as const;

function Conversation({ t, messages, api, me, onSent, suivi }: { t: Ticket; messages: SavMessage[]; api: Api; me: string; onSent: () => void; suivi: string }) {
  const [mode, setMode] = useState<typeof MODES[number]["key"]>("whatsapp");
  const [inCh, setInCh] = useState<"whatsapp" | "email">("whatsapp");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const m = MODES.find(x => x.key === mode)!;
  const disabled = (mode === "email" && !t.customer_email) || (mode === "whatsapp" && !t.customer_phone);
  const hello = `Bonjour ${first(t.customer_name)},\n\n`;
  const sign = `\n\n${first(me) || "L’équipe"} · NeoDrive`;
  const templates = [
    { label: "Demander une vidéo", text: `${hello}Merci pour votre message. Pour bien comprendre, pouvez-vous nous envoyer une courte vidéo (30 secondes) du problème ? Vous pouvez l’ajouter directement ici : ${suivi}${sign}` },
    { label: "Demander le VIN", text: `${hello}Pouvez-vous nous envoyer le numéro de châssis (VIN) de votre véhicule ? Il se trouve sur la carte grise (case E).${sign}` },
    { label: "Pièce commandée", text: `${hello}La pièce nécessaire est commandée. Nous vous prévenons dès son expédition.${sign}` },
    { label: "Problème résolu ?", text: `${hello}Est-ce que tout fonctionne bien maintenant ? Sans nouvelles de votre part, nous clôturerons la demande dans quelques jours.${sign}` },
    { label: "Lien de suivi", text: `${hello}Vous pouvez suivre votre demande ${t.ref} et nous envoyer des photos ou vidéos ici : ${suivi}${sign}` },
  ];

  const send = async () => {
    const body = text.trim(); if (!body || busy) return;
    setBusy(true); setMsg("");
    // Ouvrir WhatsApp tout de suite (sinon le navigateur bloque la fenêtre)
    if (mode === "whatsapp") window.open(`https://wa.me/${waNumberOf(t.customer_phone)}?text=${encodeURIComponent(body)}`, "_blank", "noopener");
    try {
      const kind = mode === "in" ? (inCh === "email" ? "in_email" : "in_whatsapp") : mode;
      await api({ action: "message", id: t.id, kind, body });
      setText(""); setMsg(mode === "email" ? "✅ E-mail envoyé et enregistré." : mode === "whatsapp" ? "✅ Enregistré. Pensez à appuyer sur Envoyer dans WhatsApp." : "✅ Enregistré.");
      onSent();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return <section className="card conv">
    <h2>Conversation <span className="count">{messages.length}</span></h2>
    <div className="thread">
      <div className="bubble in first"><small>Demande initiale · {fmt(t.created_at)} · Site NeoDrive</small><p>{t.description}</p></div>
      {messages.map(x => <div key={x.id} className={`bubble ${x.direction}`}>
        <small>{x.direction === "note" ? "🔒 Note interne" : `${x.direction === "in" ? "👤 Client" : "↩︎ NeoDrive"} · ${CHANNEL_LABEL[x.channel] || x.channel}`} · {x.author || "—"} · {fmt(x.created_at)}</small>
        {x.body ? <p>{x.body}</p> : null}
        {x.media?.length ? <MediaGallery items={x.media} compact /> : null}
      </div>)}
    </div>
    <div className="composer">
      <div className="modes" role="tablist">{MODES.map(x => <button key={x.key} role="tab" aria-selected={mode === x.key} className={`${mode === x.key ? "on" : ""} m-${x.key}`} onClick={() => { setMode(x.key); setMsg(""); }}>{x.label}</button>)}</div>
      <p className="help">{m.help}</p>
      {mode === "in" ? <div className="inCh">Reçue par : <label><input type="radio" checked={inCh === "whatsapp"} onChange={() => setInCh("whatsapp")} /> WhatsApp</label><label><input type="radio" checked={inCh === "email"} onChange={() => setInCh("email")} /> E-mail</label></div> : null}
      {mode === "email" || mode === "whatsapp" ? <div className="tpl"><span>Modèles :</span>{templates.map(x => <button key={x.label} type="button" onClick={() => setText(x.text)}>{x.label}</button>)}</div> : null}
      <textarea rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={mode === "in" ? "Collez ici le message du client…" : mode === "note" ? "Note pour l’équipe…" : hello.trim()} />
      {disabled ? <p className="err small">{mode === "email" ? "Pas d’e-mail pour ce client." : "Pas de téléphone pour ce client."}</p> : null}
      <button className={`btn wide ${mode === "whatsapp" ? "wa" : mode === "note" ? "note" : "dark"}`} onClick={send} disabled={busy || !text.trim() || disabled}>{busy ? "…" : m.button}</button>
      {msg ? <p className="ok">{msg}</p> : null}
    </div>
  </section>;
}

function Summary({ id, api }: { id: string; api: Api }) {
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const run = async () => { setBusy(true); setErr(""); try { const j = await api({ action: "summary", id }); setText(String(j.summary || "")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const save = async () => { try { await api({ action: "message", id, kind: "note", body: `Résumé IA :\n${text}` }); setText(""); } catch (e) { setErr((e as Error).message); } };
  return <section className="card">
    <h2>Résumé IA</h2>
    <p className="muted small">Un résumé du dossier en quelques lignes, pour un collègue qui reprend le ticket.</p>
    {text ? <><p className="desc summary">{text}</p><div className="btns"><button className="btn ghost" onClick={save}>Garder comme note interne</button><button className="btn ghost" onClick={() => setText("")}>Fermer</button></div></> : <button className="btn ghost" onClick={run} disabled={busy}>{busy ? "Résumé en cours…" : "✨ Résumer le dossier"}</button>}
    {err ? <p className="err small">{err}</p> : null}
  </section>;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { prompt("Copiez le lien :", text); } }}>{done ? "✓ Copié" : label}</button>;
}

const css = `
.savA{max-width:1180px;margin:0 auto;padding:18px 14px 90px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;background:#fff}
.savA *{box-sizing:border-box}
.savA h1{margin:0;font-size:28px;letter-spacing:-.5px}
.savA h2{margin:0 0 10px;font-size:17px}
.savA h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:14px 0 6px}
.savA a{color:#111}
.savA .muted{color:#6b7280}.savA .small{font-size:13px}.savA .center{text-align:center;padding:40px 0}
.savA .err{color:#b42318;font-weight:700}.savA .ok{font-weight:700;margin:8px 0 0}
.savA input,.savA textarea,.savA select{width:100%;padding:12px;border:1px solid #d4d7db;border-radius:12px;font:inherit;font-size:16px;background:#fff;color:#111}
.savA textarea{resize:vertical;line-height:1.45}
.savA button{font:inherit;cursor:pointer}
.savA .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 16px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;border:1px solid transparent}
.savA .btn:disabled{opacity:.45;cursor:not-allowed}
.savA .btn.dark{background:#111;color:#fff}.savA .btn.ghost{background:#fff;border-color:#d4d7db;color:#111}.savA .btn.wa{background:#25d366;color:#fff}.savA .btn.note{background:#fde68a;color:#713f12}.savA .btn.wide{width:100%;padding:14px}
.savA .link{border:0;background:none;text-decoration:underline;font-weight:700}
.savA .login{max-width:380px;margin:60px auto;display:grid;gap:12px;text-align:center}
.savA .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.savA .top p{margin:4px 0 0}
.savA .badge{display:inline-block;color:#fff;font-size:12px;font-weight:900;padding:5px 10px;border-radius:999px;white-space:nowrap}
.savA .urgent{background:#fff7ed;border:2px solid #fdba74;border-radius:18px;padding:14px;margin-bottom:16px}
.savA .urgent h2{font-size:19px;display:flex;align-items:center;gap:8px;margin:0}
.savA .urgent h2 span{background:#ea580c;color:#fff;border-radius:999px;font-size:13px;padding:2px 9px}
.savA .urgent p{margin:4px 0 10px}
.savA .urgent ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.savA .urgent li button{width:100%;text-align:left;background:#fff;border:1px solid #fed7aa;border-radius:14px;padding:12px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;color:#111}
.savA .urgent li small{grid-column:2;color:#6b7280}
.savA .urgent .badge{grid-row:1/3}
.savA .chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.savA .chip{font-style:normal;font-size:12.5px;font-weight:800;padding:4px 9px;border-radius:999px;background:#fee2e2;color:#991b1b}
.savA .chip.open_long{background:#ffedd5;color:#9a3412}.savA .chip.stale{background:#e0e7ff;color:#3730a3}
.savA .allgood{background:#ecfdf5;color:#065f46;font-weight:800;border-radius:14px;padding:12px 14px}
.savA .filters{display:grid;gap:10px;margin-bottom:12px;position:sticky;top:0;background:#fff;padding:8px 0;z-index:5}
.savA .fchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.savA .fchips button{flex:none;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #ddd;background:#fff;border-radius:999px;font-weight:800;font-size:14px;color:#111}
.savA .fchips button i{width:9px;height:9px;border-radius:50%}
.savA .fchips button.on{background:#111;color:#fff;border-color:#111}
.savA .rows{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.savA .rows li>button{width:100%;text-align:left;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:12px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;color:#111}
.savA .rows li>button.hot{border-color:#fdba74;box-shadow:inset 4px 0 0 #ea580c}
.savA .rows .main{display:grid;gap:3px;min-width:0}
.savA .rows .main small{color:#6b7280;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.savA .rows .last{font-style:italic}
.savA .rows .prio{font-style:normal;font-size:13px}
.savA .rows .side{display:grid;gap:2px;text-align:right;font-size:13px}
.savA .rows .side small{color:#6b7280;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.savA .back{border:0;background:none;font-weight:800;font-size:16px;padding:6px 0;margin-bottom:8px;color:#111}
.savA .tHead{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.savA .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.savA .tag{font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:999px;background:#f3f4f6}
.savA .tag.warn{background:#fef3c7;color:#92400e}
.savA .dates{display:grid;grid-template-columns:repeat(3,auto);gap:4px 16px;margin:0;font-size:13px}
.savA .dates dt{color:#6b7280}.savA .dates dd{margin:0;font-weight:800}
.savA .alertBox{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.savA .cols{display:grid;grid-template-columns:1fr;gap:12px}
.savA .colL,.savA .colR{display:grid;gap:12px;align-content:start;min-width:0}
.savA .card{border:1px solid #e5e7eb;border-radius:18px;padding:14px;background:#fff;min-width:0}
.savA .card p{margin:0 0 8px;line-height:1.55}
.savA .card .big{font-size:18px}
.savA .count{background:#f3f4f6;border-radius:999px;font-size:13px;padding:1px 8px;margin-left:4px}
.savA .btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.savA .mono{font-family:ui-monospace,Menlo,monospace;letter-spacing:.5px}
.savA .desc{white-space:pre-line}
.savA details{background:#fff7ed;border-radius:12px;padding:10px 12px;margin-top:8px}
.savA summary{font-weight:800;cursor:pointer}
.savA .hist{margin:0;padding-left:18px;font-size:14px;line-height:1.7}
.savA .stg{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.savA .stg button{padding:9px 12px;border:1px solid #d4d7db;border-radius:999px;background:#fff;font-weight:800;font-size:14px;color:#111}
.savA .stg button.on{color:#fff}
.savA .fld{display:grid;gap:5px;font-weight:800;font-size:14px;margin-bottom:10px}
.savA .fld em{font-style:normal;font-weight:500;color:#6b7280}
.savA .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.savA .parts{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.savA .parts li{display:flex;gap:10px;align-items:center}
.savA .parts img,.savA .parts .noimg{width:64px;height:64px;border-radius:12px;object-fit:cover;background:#f3f4f6;flex:none;display:grid;place-items:center;font-size:24px}
.savA .parts span:not(.noimg){display:grid;gap:2px;min-width:0}
.savA .parts small{color:#6b7280;font-size:13px}.savA .parts .kind{color:#ea580c;font-weight:700}
.savA .thread{display:grid;gap:8px;max-height:560px;overflow:auto;padding:4px 2px 10px;margin-bottom:10px;border-bottom:1px solid #f0f0f0}
.savA .bubble{max-width:90%;padding:10px 12px;border-radius:14px;display:grid;gap:6px}
.savA .bubble small{font-size:12px;color:#6b7280;font-weight:700}
.savA .bubble p{margin:0;white-space:pre-line;line-height:1.5;overflow-wrap:anywhere}
.savA .bubble.in{justify-self:start;background:#f3f4f6;border-bottom-left-radius:4px}
.savA .bubble.in.first{background:#fff;border:1px dashed #d4d7db}
.savA .bubble.out{justify-self:end;background:#111;color:#fff;border-bottom-right-radius:4px}
.savA .bubble.out small{color:#bbb}
.savA .bubble.note{justify-self:stretch;max-width:100%;background:#fef9c3;border:1px solid #fde68a}
.savA .composer{display:grid;gap:8px}
.savA .modes{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.savA .modes button{padding:10px 8px;border:1px solid #d4d7db;border-radius:12px;background:#fff;font-weight:800;font-size:14px;color:#111}
.savA .modes button.on{background:#111;color:#fff;border-color:#111}
.savA .modes button.m-whatsapp.on{background:#25d366;border-color:#25d366}
.savA .modes button.m-note.on{background:#fde68a;color:#713f12;border-color:#fde68a}
.savA .help{margin:0;font-size:14px;color:#374151;background:#f9fafb;border-radius:10px;padding:8px 10px}
.savA .inCh{display:flex;gap:14px;align-items:center;font-weight:700;font-size:14px}
.savA .inCh label{display:flex;gap:6px;align-items:center}
.savA .inCh input{width:auto}
.savA .tpl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px}
.savA .tpl span{color:#6b7280;font-weight:700}
.savA .tpl button{padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;font-weight:700;color:#111}
.savA .events{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.savA .events li{background:#f9fafb;border-radius:10px;padding:8px 10px}
.savA .events small{color:#6b7280;font-size:12.5px}
.savA .events p{margin:2px 0 0}
.savA .summary{background:#f5f3ff;border-radius:12px;padding:10px 12px}
@media(min-width:960px){.savA{padding:24px 24px 90px}.savA .cols{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}.savA .modes{grid-template-columns:repeat(4,1fr)}.savA .colR .conv{position:sticky;top:10px}}
@media(max-width:600px){.savA .two{grid-template-columns:1fr}.savA .dates{grid-template-columns:1fr 1fr 1fr;font-size:12px}.savA .rows li>button{grid-template-columns:1fr auto}.savA .rows .badge{grid-column:1/-1;justify-self:start}.savA h1{font-size:24px}}
`;
