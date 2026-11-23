"use client";
import { useEffect, useMemo, useState } from "react";
import {
  STATUSES, TEMPLATE_LABELS, messageFor, normalizePhone, parseCsv, parsePaste, savLink, smsLink, whatsappLink,
  type Customer, type ImportRow, type Satisfaction, type Status, type TemplateKey,
} from "../../lib/clients";

/* Clients et avis : bouton « Envoyer » = SMS + e-mail envoyés par le serveur (Brevo) sans quitter la page ; liens WhatsApp / SMS en secours. Suivi automatique ~10 jours après livraison (/api/clients/suivi). */

const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28", green: "#15803d", red: "#b91c1c", wa: "#1fa855" };
const btn = (bg = C.ink, small = false): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: small ? "8px 12px" : "12px 16px", borderRadius: 12, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: small ? 14 : 16, textDecoration: "none", lineHeight: 1.2 });
const ghost = (active = false): React.CSSProperties => ({ ...btn(active ? C.ink : "#fff", true), color: active ? "#fff" : C.ink, border: `1px solid ${active ? C.ink : "#d8d2c8"}` });
const input: React.CSSProperties = { width: "100%", padding: 11, borderRadius: 10, border: "1px solid #d8d2c8", font: "inherit", fontSize: 16, boxSizing: "border-box", background: "#fff" };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 14 };
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: C.mute, marginBottom: 4 };

const STATUS_STYLE: Record<Status, { bg: string; fg: string; icon: string }> = {
  "à contacter": { bg: "#eef2ff", fg: "#3730a3", icon: "📋" },
  "nouvelles demandées": { bg: "#e0f2fe", fg: "#075985", icon: "💬" },
  "problème en cours": { bg: "#fee2e2", fg: "#991b1b", icon: "⚠️" },
  "avis demandé": { bg: "#fef3c7", fg: "#92400e", icon: "⭐" },
  "avis laissé": { bg: "#dcfce7", fg: "#166534", icon: "✅" },
  "ne pas contacter": { bg: "#e5e5e5", fg: "#404040", icon: "🚫" },
};
const SAT: { v: Satisfaction; icon: string; label: string }[] = [{ v: "content", icon: "😊", label: "Content" }, { v: "neutre", icon: "😐", label: "Neutre" }, { v: "pas content", icon: "😟", label: "Pas content" }];
const MODELS = ["Essentielle", "Confort", "Confort Plus+"];
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const fmtDay = (d: string | null) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "";
const fullName = (c: Pick<Customer, "first_name" | "last_name">) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sans nom";
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Call = (body: Record<string, unknown>, opts?: { keepalive?: boolean }) => Promise<any>;
const DAY = 86_400_000;
const CHANNEL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "e-mail", "sms+email": "SMS + e-mail" };
const canReach = (c: Customer) => normalizePhone(c.phone).valid || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || ""));
const sentRecently = (c: Customer) => !!c.last_sent_at && Date.now() - new Date(c.last_sent_at).getTime() < DAY;
/** Clients qui peuvent recevoir « Prendre des nouvelles » en un clic. */
const quickOk = (c: Customer) => !["ne pas contacter", "avis laissé", "problème en cours"].includes(c.status) && canReach(c);

function Badge({ s }: { s: Status }) {
  const st = STATUS_STYLE[s] || STATUS_STYLE["à contacter"];
  return <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: "3px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{st.icon} {s}</span>;
}

export default function ClientsPage() {
  const [pc, setPc] = useState(""); const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState(""); const [loginMsg, setLoginMsg] = useState("");
  const [list, setList] = useState<Customer[]>([]); const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"tous" | Status>("tous"); const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [panel, setPanel] = useState<"" | "add" | "import">("");

  const call: Call = async (body, opts) => {
    const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }), keepalive: opts?.keepalive });
    const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
    if (r.status === 401) { setAuthed(false); throw new Error("Non connecté"); }
    if (!j.ok) throw new Error(j.error || "Erreur");
    return j;
  };
  const load = async (p: string) => {
    const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: p, action: "list" }) });
    if (r.status === 401) return false;
    const j = await r.json().catch(() => ({ ok: false }));
    if (!j.ok) { setErr(j.error || "Impossible de charger la liste."); return true; }
    setList(j.customers || []); setErr(""); return true;
  };
  useEffect(() => {
    (async () => { let p = ""; try { p = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ } setPc(p); setAuthed(await load(p)); })();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginMsg("");
    const c = code.trim(); if (await load(c)) { try { sessionStorage.setItem("nd_pc", c); } catch { /* privé */ } setPc(c); setAuthed(true); setCode(""); }
    else setLoginMsg("Code incorrect.");
  };
  const replace = (c: Customer) => setList(l => { const i = l.findIndex(x => x.id === c.id); if (i < 0) return [c, ...l]; const n = l.slice(); n[i] = c; return n; });

  const counts = useMemo(() => { const m: Record<string, number> = {}; for (const c of list) m[c.status] = (m[c.status] || 0) + 1; return m; }, [list]);
  const shown = useMemo(() => {
    const t = fold(q.trim()); const digits = q.replace(/\D/g, "");
    return list.filter(c => (filter === "tous" || c.status === filter) && (!t || fold(`${c.first_name} ${c.last_name} ${c.city || ""} ${c.model || ""} ${c.vin || ""} ${c.email || ""}`).includes(t) || (digits.length >= 3 && String(c.phone || "").replace(/\D/g, "").includes(digits))));
  }, [list, filter, q]);

  if (authed === null) return <Shell><p style={{ color: C.mute }}>Chargement…</p></Shell>;
  if (!authed) return <Shell>
    <form onSubmit={login} style={{ ...card, maxWidth: 420, marginTop: 18 }}>
      <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Code d’accès</label>
      <input value={code} onChange={e => setCode(e.target.value)} type="password" autoComplete="off" autoFocus style={input} />
      <button disabled={code.trim().length < 4} style={{ ...btn(C.brand), width: "100%", marginTop: 12 }}>Entrer</button>
      {loginMsg ? <p style={{ color: C.red, fontWeight: 600 }}>{loginMsg}</p> : null}
      <p style={{ color: C.mute, fontSize: 14, marginBottom: 0 }}>Membre de l’équipe ? Connectez-vous d’abord sur <a href="/organisation" style={{ color: C.brand, fontWeight: 700 }}>l’espace Organisation</a>.</p>
    </form>
  </Shell>;

  const COUNTERS: { s: Status; label: string }[] = [{ s: "à contacter", label: "À contacter" }, { s: "problème en cours", label: "Problèmes en cours" }, { s: "avis demandé", label: "Avis demandés" }, { s: "avis laissé", label: "Avis laissés" }];

  return <Shell>
    <HelpBox />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 14 }}>
      {COUNTERS.map(k => { const st = STATUS_STYLE[k.s]; const on = filter === k.s; return <button key={k.s} onClick={() => setFilter(on ? "tous" : k.s)} style={{ background: st.bg, color: st.fg, border: on ? `2px solid ${st.fg}` : "2px solid transparent", borderRadius: 14, padding: "10px 12px", textAlign: "left", cursor: "pointer", font: "inherit" }}>
        <b style={{ fontSize: 26, display: "block", lineHeight: 1.1 }}>{counts[k.s] || 0}</b><span style={{ fontSize: 14, fontWeight: 600 }}>{st.icon} {k.label}</span>
      </button>; })}
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher : nom, ville, téléphone…" style={{ ...input, flex: "1 1 220px", width: "auto" }} />
      <select value={filter} onChange={e => setFilter(e.target.value as "tous" | Status)} style={{ ...input, flex: "0 1 210px", width: "auto" }}>
        <option value="tous">Tous les statuts ({list.length})</option>
        {STATUSES.map(s => <option key={s} value={s}>{s} ({counts[s] || 0})</option>)}
      </select>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <button onClick={() => setPanel(panel === "add" ? "" : "add")} style={btn(panel === "add" ? "#555" : C.brand)}>{panel === "add" ? "Fermer" : "+ Ajouter un client"}</button>
      <button onClick={() => setPanel(panel === "import" ? "" : "import")} style={btn(panel === "import" ? "#555" : C.ink)}>{panel === "import" ? "Fermer" : "Importer une liste"}</button>
    </div>
    {err ? <p style={{ color: C.red, fontWeight: 600 }}>{err}</p> : null}
    <BulkSend shown={shown} call={call} onChange={replace} />

    {panel === "add" ? <div style={{ ...card, marginTop: 12 }}><CustomerForm call={call} onSaved={c => { replace(c); setPanel(""); setOpenId(c.id); setFilter("tous"); }} onCancel={() => setPanel("")} /></div> : null}
    {panel === "import" ? <div style={{ ...card, marginTop: 12 }}><ImportPanel call={call} onDone={async () => { await load(pc); }} /></div> : null}

    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
      {shown.length ? shown.map(c => <CustomerRow key={c.id} c={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} call={call} onChange={replace} />)
        : <div style={{ ...card, color: C.mute }}>{list.length ? "Aucun client pour ce filtre." : "Aucun client pour l’instant. Ajoutez-en un ou importez une liste."}</div>}
    </div>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
        <a href="/organisation" style={{ display: "flex", alignItems: "center", gap: 10, color: C.ink, textDecoration: "none" }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: C.brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18 }}>N</span>
          <b style={{ fontSize: 18 }}>Clients et avis</b>
        </a>
        <a href="/organisation" style={{ color: C.mute, fontSize: 14 }}>← Organisation</a>
      </div>
      {children}
    </div>
  </main>;
}

function HelpBox() {
  return <details style={{ ...card, marginTop: 14, background: "#fffbeb", borderColor: "#fde68a" }}>
    <summary style={{ cursor: "pointer", fontWeight: 700 }}>ℹ️ Comment ça marche (et la règle Google)</summary>
    <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>
      <p style={{ margin: "0 0 8px" }}><b>📨 Bouton « Nouvelles » à côté de chaque client :</b> un appui suffit, le SMS et l’e-mail partent tout de suite, sans quitter la page (la ligne passe à ✓). Le client répond sur WhatsApp. Le même message n’est jamais renvoyé dans les 24 h, et jamais aux clients « Ne pas contacter » ou désinscrits.</p>
      <p style={{ margin: "0 0 8px" }}><b>Automatique :</b> environ 10 jours après la livraison, chaque nouveau client reçoit une seule fois « comment ça se passe ? » (SMS + e-mail, avec le guide batterie). Vous recevez un récapitulatif par e-mail. Les clients livrés avant la mise en place ne sont pas relancés automatiquement : c’est vous qui choisissez, ici.</p>
      <p style={{ margin: "0 0 8px" }}>WhatsApp et SMS depuis votre téléphone restent possibles dans la fiche du client.</p>
      <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>
        <li><b>Prendre des nouvelles</b> de chaque client.</li>
        <li><b>S’il y a un problème</b>, le régler d’abord (ticket SAV). La demande d’avis attend que le problème soit résolu.</li>
        <li>Une fois que tout va bien, <b>demander un avis à tous les clients, de la même façon</b>, qu’ils aient répondu « content », « neutre » ou « pas content ».</li>
      </ol>
      <p style={{ margin: 0 }}>Google interdit de demander un avis <b>seulement aux clients contents</b> (« filtrage des avis ») : cela peut faire supprimer les avis ou suspendre la fiche. Vous pouvez quand même choisir de ne pas contacter quelqu’un (ex. ancien litige) avec « Ne pas contacter » et une raison.</p>
    </div>
  </details>;
}

function CustomerRow({ c, open, onToggle, call, onChange }: { c: Customer; open: boolean; onToggle: () => void; call: Call; onChange: (c: Customer) => void }) {
  const ph = normalizePhone(c.phone);
  return <div style={{ ...card, padding: 0, overflow: "hidden", borderColor: open ? "#bdb5a8" : C.line }}>
    <div style={{ display: "flex", alignItems: "center" }}>
    <button onClick={onToggle} style={{ display: "flex", flex: 1, minWidth: 0, gap: 10, alignItems: "center", justifyContent: "space-between", padding: 14, background: "none", border: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: C.ink }}>
      <span style={{ minWidth: 0 }}>
        <b style={{ fontSize: 17 }}>{fullName(c)}</b>{c.source === "test" ? <span style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginLeft: 6 }}>TEST</span> : null}
        <span style={{ display: "block", color: C.mute, fontSize: 14, marginTop: 2 }}>{[c.city, c.model ? `NeoDrive ${c.model.replace(/^neodrive\s*/i, "")}` : "", c.last_contact_at ? `contacté le ${fmt(c.last_contact_at)}` : ""].filter(Boolean).join(" · ")}{!ph.valid ? <span style={{ color: C.red }}> · ⚠️ numéro</span> : null}</span>
      </span>
      <Badge s={c.status} />
    </button>
    {quickOk(c) ? <div style={{ padding: "0 12px 0 0" }}><QuickSend c={c} call={call} onChange={onChange} /></div> : null}
    </div>
    {open ? <Detail c={c} call={call} onChange={onChange} /> : null}
  </div>;
}

function Detail({ c, call, onChange }: { c: Customer; call: Call; onChange: (c: Customer) => void }) {
  const [edit, setEdit] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const blocked = c.status === "ne pas contacter"; const problem = c.status === "problème en cours";
  const [tpl, setTpl] = useState<TemplateKey>(["nouvelles demandées", "avis demandé", "avis laissé"].includes(c.status) ? "avis" : "nouvelles");
  const [dnc, setDnc] = useState(false); const [reason, setReason] = useState("");
  const [ticket, setTicket] = useState(c.sav_ticket_ref || ""); const [notes, setNotes] = useState(c.notes || "");
  const ph = normalizePhone(c.phone);

  const act = async (kind: string, extra: Record<string, unknown> = {}, keepalive = false) => {
    setBusy(true); setMsg("");
    try { const j = await call({ action: "act", id: c.id, kind, ...extra }, { keepalive }); onChange(j.customer); return true; }
    catch (e) { setMsg((e as Error).message); return false; } finally { setBusy(false); }
  };

  if (edit) return <div style={{ padding: "0 14px 14px" }}><CustomerForm call={call} initial={c} onSaved={x => { onChange(x); setEdit(false); }} onCancel={() => setEdit(false)} /></div>;

  return <div style={{ padding: "0 14px 14px", display: "grid", gap: 14 }}>
    {/* Coordonnées */}
    <div style={{ fontSize: 15, lineHeight: 1.6, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
      <div>📞 {c.phone ? <a href={ph.valid ? `tel:+${ph.intl}` : undefined} style={{ color: C.ink, fontWeight: 700 }}>{c.phone}</a> : <i>pas de numéro</i>}{ph.valid ? <span style={{ color: C.mute }}> (+{ph.intl})</span> : null}</div>
      {ph.warning ? <div style={{ color: ph.valid ? "#92400e" : C.red, fontWeight: 600, fontSize: 14 }}>⚠️ {ph.warning}</div> : null}
      {c.email ? <div>✉️ {c.email}</div> : null}
      <div style={{ color: C.mute }}>{[c.city && `📍 ${c.city}`, c.model && `🚗 NeoDrive ${c.model.replace(/^neodrive\s*/i, "")}`, c.vin && `VIN ${c.vin}`, c.delivered_at && `livrée le ${fmtDay(c.delivered_at)}`].filter(Boolean).join(" · ")}</div>
      <button onClick={() => setEdit(true)} style={{ ...ghost(), marginTop: 6 }}>✏️ Modifier la fiche</button>
    </div>

    {/* Message */}
    <section>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>1. Préparer le message</h3>
      {blocked ? <div style={{ background: "#f1f1f1", borderRadius: 12, padding: 12 }}>🚫 <b>Ne pas contacter</b>{c.do_not_contact_reason ? ` — ${c.do_not_contact_reason}` : ""}<div style={{ marginTop: 8 }}><button disabled={busy} onClick={() => act("reactiver")} style={ghost()}>Remettre « à contacter »</button></div></div> : <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {(["nouvelles", "avis"] as TemplateKey[]).map(k => <button key={k} onClick={() => setTpl(k)} style={ghost(tpl === k)}>{k === "nouvelles" ? "💬 " : "⭐ "}{TEMPLATE_LABELS[k]}</button>)}
        </div>
        {tpl === "avis" && problem
          ? <div style={{ background: "#fee2e2", color: "#7f1d1d", borderRadius: 12, padding: 12, fontSize: 15, lineHeight: 1.5 }}>⚠️ <b>Un problème est en cours.</b> On demande l’avis une fois le problème réglé (plus bas : « Problème résolu »). Ce n’est pas un filtre : tous les clients reçoivent la demande, elle est seulement repoussée le temps de régler le souci.</div>
          : <MessageBox key={`${c.id}-${tpl}`} c={c} tpl={tpl} phoneOk={ph.valid} call={call} onChange={onChange} onSent={(channel, text) => act(tpl === "avis" ? "message_avis" : "message_nouvelles", { channel, text }, true)} />}
      </>}
    </section>

    {/* Réponse */}
    {!blocked ? <section>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>2. Noter la réponse du client</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SAT.map(s => <button key={s.v} disabled={busy} onClick={() => act("satisfaction", { value: c.satisfaction === s.v ? null : s.v })} style={ghost(c.satisfaction === s.v)}>{s.icon} {s.label}</button>)}
      </div>
      <p style={{ color: C.mute, fontSize: 13, margin: "6px 0 10px" }}>Quelle que soit la réponse, la demande d’avis se fait de la même façon. Seul un problème ouvert la repousse.</p>

      {problem ? <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
        <b style={{ color: "#991b1b" }}>⚠️ Problème en cours</b>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Référence du ticket SAV (ex. SAV-…)" style={{ ...input, flex: "1 1 200px", width: "auto" }} />
          <button disabled={busy || ticket === (c.sav_ticket_ref || "")} onClick={() => act("ticket", { sav_ticket_ref: ticket })} style={btn(C.ink, true)}>Enregistrer</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <a href={savLink(c)} target="_blank" rel="noopener" style={btn("#555", true)}>Ouvrir / créer le ticket SAV</a>
          {c.sav_ticket_ref ? <a href="/sav/admin" target="_blank" rel="noopener" style={btn("#555", true)}>Espace SAV (ticket {c.sav_ticket_ref})</a> : null}
          <button disabled={busy} onClick={() => act("resolu")} style={btn(C.green, true)}>✓ Problème résolu</button>
        </div>
      </div> : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a href={savLink(c)} target="_blank" rel="noopener" onClick={() => { void act("probleme", {}, true); }} style={btn(C.red, true)}>⚠️ Problème → créer un ticket SAV</a>
        {c.status !== "avis laissé" ? <button disabled={busy} onClick={() => act("avis_laisse")} style={btn(C.green, true)}>⭐ Avis laissé ✓</button> : null}
        <button disabled={busy} onClick={() => setDnc(!dnc)} style={ghost(dnc)}>🚫 Ne pas contacter</button>
      </div>}
      {dnc && !problem ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison (ex. ancien litige)" style={{ ...input, flex: "1 1 200px", width: "auto" }} />
        <button disabled={busy || !reason.trim()} onClick={async () => { if (await act("ne_pas_contacter", { reason })) { setDnc(false); setReason(""); } }} style={btn("#404040", true)}>Confirmer</button>
      </div> : null}
    </section> : null}

    {/* Notes */}
    <section>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Notes</h3>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Ce que le client a dit, à rappeler…" style={{ ...input, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        <button disabled={busy || notes === (c.notes || "")} onClick={() => act("notes", { notes })} style={btn(C.ink, true)}>Enregistrer les notes</button>
        <select value="" onChange={e => { if (e.target.value) void act("statut", { value: e.target.value }); }} style={{ ...input, width: "auto", fontSize: 14, padding: 8 }} aria-label="Changer le statut à la main">
          <option value="">Changer le statut…</option>
          {STATUSES.filter(s => s !== "ne pas contacter" && s !== c.status).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </section>
    {msg ? <p style={{ color: C.red, fontWeight: 600, margin: 0 }}>{msg}</p> : null}

    {/* Historique */}
    <section>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Historique</h3>
      {c.history?.length ? <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {[...c.history].reverse().map((h, i) => <li key={i} style={{ fontSize: 14, borderLeft: `3px solid ${C.line}`, paddingLeft: 10 }}>
          <span style={{ color: C.mute }}>{fmt(h.at)}</span> · <b>{h.action}</b>{h.channel ? ` (${CHANNEL[h.channel] || h.channel})` : ""}{h.by ? <span style={{ color: C.mute }}> · {h.by}</span> : null}
          {h.text ? <div style={{ color: "#444", whiteSpace: "pre-wrap", marginTop: 2 }}>{h.text}</div> : null}
        </li>)}
      </ul> : <p style={{ color: C.mute, margin: 0 }}>Rien pour l’instant.</p>}
    </section>
  </div>;
}

function MessageBox({ c, tpl, phoneOk, call, onChange, onSent }: { c: Customer; tpl: TemplateKey; phoneOk: boolean; call: Call; onChange: (c: Customer) => void; onSent: (channel: "whatsapp" | "sms", text: string) => void }) {
  const [text, setText] = useState(() => messageFor(tpl, c));
  const [state, setState] = useState<"" | "busy" | "ok">(""); const [note, setNote] = useState("");
  const ph = normalizePhone(c.phone);
  const ready = phoneOk && text.trim().length > 0;
  const direct = async () => {
    setState("busy"); setNote("");
    try {
      const j = await call({ action: "send", id: c.id, kind: tpl, text: text === messageFor(tpl, c) ? undefined : text });
      onChange(j.customer); setState("ok");
      setNote(`✓ Envoyé par ${[j.sms && "SMS", j.email && "e-mail"].filter(Boolean).join(" + ")}${j.warning ? ` (${j.warning})` : ""}.`);
    } catch (e) { setState(""); setNote((e as Error).message); }
  };
  const secondary: React.CSSProperties = { ...ghost(), flex: "1 1 140px" };
  return <div>
    <textarea value={text} onChange={e => { setText(e.target.value); if (state === "ok") setState(""); }} rows={6} style={{ ...input, resize: "vertical", lineHeight: 1.45 }} aria-label="Message à envoyer (modifiable)" />
    <button disabled={state !== "" || !text.trim() || !canReach(c)} onClick={direct} style={{ ...btn(state === "ok" ? C.green : C.brand), width: "100%", marginTop: 8, opacity: !canReach(c) ? 0.5 : 1 }}>
      {state === "busy" ? "Envoi…" : state === "ok" ? "✓ Envoyé" : "📨 Envoyer (SMS + e-mail)"}
    </button>
    {note ? <p style={{ margin: "6px 0 0", fontWeight: 600, color: state === "ok" ? C.green : C.red }}>{note}</p> : null}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {ready ? <>
        <a href={whatsappLink(ph.intl, text)} target="_blank" rel="noopener" onClick={() => onSent("whatsapp", text)} style={secondary}>WhatsApp (mon téléphone)</a>
        <a href={smsLink(ph.intl, text)} onClick={() => onSent("sms", text)} style={secondary}>SMS (mon téléphone)</a>
      </> : null}
      <button onClick={() => setText(messageFor(tpl, c))} style={ghost()}>↺ Texte d’origine</button>
    </div>
    <p style={{ color: C.mute, fontSize: 13, margin: "6px 0 0" }}>{canReach(c) ? "« Envoyer » part tout de suite, sans quitter la page (SMS si le numéro est bon, e-mail si l’adresse est connue). Le client répond sur WhatsApp." : "Ajoutez un numéro de portable ou un e-mail (« Modifier la fiche ») pour pouvoir envoyer."}</p>
  </div>;
}

/** Bouton « un appui » à côté de chaque client : « Prendre des nouvelles » par SMS + e-mail, la ligne passe à ✓. */
function QuickSend({ c, call, onChange }: { c: Customer; call: Call; onChange: (c: Customer) => void }) {
  const [state, setState] = useState<"" | "busy" | "err">(""); const [msg, setMsg] = useState("");
  if (sentRecently(c)) return <span title={`Envoyé le ${fmt(c.last_sent_at ?? null)}`} style={{ ...btn(C.green, true), cursor: "default", padding: "8px 10px" }}>✓ envoyé</span>;
  const go = async () => {
    setState("busy"); setMsg("");
    try { const j = await call({ action: "send", id: c.id, kind: "nouvelles" }); onChange(j.customer); setState(""); }
    catch (e) { setState("err"); setMsg((e as Error).message); }
  };
  return <div style={{ display: "grid", justifyItems: "end", gap: 4, maxWidth: 190 }}>
    <button onClick={go} disabled={state === "busy"} title="Envoyer « Prendre des nouvelles » par SMS + e-mail" style={{ ...btn(state === "err" ? C.red : C.brand, true), padding: "8px 10px", whiteSpace: "nowrap" }}>
      {state === "busy" ? "Envoi…" : state === "err" ? "⚠️ Réessayer" : "📨 Nouvelles"}
    </button>
    {state === "err" ? <small style={{ color: C.red, fontWeight: 600, fontSize: 12, textAlign: "right" }}>{msg}</small> : null}
  </div>;
}

/** Envoi groupé : « Prendre des nouvelles » à tous les clients « à contacter » affichés (filtre et recherche en cours). */
function BulkSend({ shown, call, onChange }: { shown: Customer[]; call: Call; onChange: (c: Customer) => void }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const todo = shown.filter(c => c.status === "à contacter" && quickOk(c) && !sentRecently(c)).slice(0, 40);
  if (!todo.length && !msg) return null;
  const run = async () => {
    if (!window.confirm(`Envoyer « Prendre des nouvelles » (SMS + e-mail) à ${todo.length} client${todo.length > 1 ? "s" : ""} « à contacter » ?`)) return;
    setBusy(true); setMsg("");
    try {
      const j = await call({ action: "send_bulk", ids: todo.map(c => c.id) });
      (j.customers || []).forEach(onChange);
      setMsg(`✓ ${j.sent} message${j.sent > 1 ? "s" : ""} envoyé${j.sent > 1 ? "s" : ""}.${j.errors?.length ? ` Pas envoyé : ${j.errors.join(" · ")}` : ""}`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return <div style={{ marginTop: 10 }}>
    {todo.length ? <button disabled={busy} onClick={run} style={btn(C.ink)}>{busy ? "Envoi en cours…" : `📨 Envoyer le suivi aux ${todo.length} client${todo.length > 1 ? "s" : ""} « à contacter »`}</button> : null}
    {msg ? <p style={{ margin: "6px 0 0", fontWeight: 600, color: msg.startsWith("✓") ? C.green : C.red }}>{msg}</p> : null}
  </div>;
}

function CustomerForm({ call, initial, onSaved, onCancel }: { call: Call; initial?: Customer; onSaved: (c: Customer) => void; onCancel: () => void }) {
  const [f, setF] = useState({ first_name: initial?.first_name || "", last_name: initial?.last_name || "", phone: initial?.phone || "", email: initial?.email || "", city: initial?.city || "", model: initial?.model || "", vin: initial?.vin || "", delivered_at: initial?.delivered_at || "" });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const ph = normalizePhone(f.phone);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try { const j = await call({ action: "save", customer: { ...f, id: initial?.id } }); onSaved(j.customer); } catch (er) { setMsg((er as Error).message); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, l: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label style={{ display: "block" }}><span style={label}>{l}</span><input value={f[k]} onChange={set(k)} style={input} {...extra} /></label>;
  return <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
    <b>{initial ? "Modifier la fiche" : "Nouveau client"}</b>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {field("first_name", "Prénom", { autoComplete: "off" })}
      {field("last_name", "Nom", { autoComplete: "off" })}
      <div>{field("phone", "Téléphone", { type: "tel", inputMode: "tel", placeholder: "06 12 34 56 78" })}{f.phone && ph.warning ? <div style={{ color: ph.valid ? "#92400e" : C.red, fontSize: 13, fontWeight: 600, marginTop: 4 }}>⚠️ {ph.warning}</div> : null}</div>
      {field("email", "E-mail (facultatif)", { type: "email" })}
      {field("city", "Ville")}
      <label style={{ display: "block" }}><span style={label}>Modèle</span><input value={f.model} onChange={set("model")} list="nd-models" style={input} /><datalist id="nd-models">{MODELS.map(m => <option key={m} value={m} />)}</datalist></label>
      {field("vin", "VIN / châssis (facultatif)")}
      {field("delivered_at", "Date de livraison (facultatif)", { type: "date" })}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button disabled={busy || !(f.first_name.trim() || f.last_name.trim())} style={btn(C.brand)}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      <button type="button" onClick={onCancel} style={btn("#777")}>Annuler</button>
    </div>
    {msg ? <p style={{ color: C.red, fontWeight: 600, margin: 0 }}>{msg}</p> : null}
  </form>;
}

async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return new TextDecoder("windows-1252").decode(buf); } // CSV Excel en français
}

function ImportPanel({ call, onDone }: { call: Call; onDone: () => Promise<void> }) {
  const [paste, setPaste] = useState(""); const [csv, setCsv] = useState<{ name: string; rows: ImportRow[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const rows = csv ? csv.rows : parsePaste(paste);
  const run = async () => {
    setBusy(true); setMsg("");
    try { const j = await call({ action: "import", rows, source: csv ? "import-csv" : "import-collé" }); setMsg(`✅ ${j.added} client(s) ajouté(s)${j.skipped ? `, ${j.skipped} ignoré(s) (déjà présents ou sans nom)` : ""}.`); setPaste(""); setCsv(null); await onDone(); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return <div style={{ display: "grid", gap: 10 }}>
    <b>Importer des clients</b>
    {!csv ? <>
      <label><span style={label}>Collez une ligne par client : Prénom Nom ; téléphone ; ville ; modèle</span>
        <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={6} placeholder={"Jean Dupont ; 06 12 34 56 78 ; Toulouse ; Confort\nMarie Martin ; 07 98 76 54 32 ; Albi ; Essentielle"} style={{ ...input, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 14 }} />
      </label>
      <div style={{ color: C.mute, fontSize: 14 }}>ou un fichier CSV (colonnes reconnues : Prénom, Nom, Téléphone, Ville, Modèle, E-mail, VIN, Date de livraison) :
        <input type="file" accept=".csv,text/csv,text/plain" style={{ display: "block", marginTop: 6 }} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const r = parseCsv(await readFileText(file)); setCsv({ name: file.name, rows: r.rows, error: r.error }); e.target.value = ""; }} />
      </div>
    </> : <div style={{ fontSize: 15 }}>📄 {csv.name} <button onClick={() => setCsv(null)} style={{ ...ghost(), marginLeft: 6 }}>Retirer</button>{csv.error ? <p style={{ color: C.red, fontWeight: 600 }}>{csv.error}</p> : null}</div>}

    {rows.length ? <div style={{ fontSize: 14 }}>
      <b>{rows.length} client(s) prêt(s) :</b>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {rows.slice(0, 8).map((r, i) => { const p = normalizePhone(r.phone); return <li key={i}>{fullName(r)} · {r.phone || "sans tél."}{!p.valid ? <span style={{ color: C.red }}> ⚠️</span> : null}{r.city ? ` · ${r.city}` : ""}{r.model ? ` · ${r.model}` : ""}</li>; })}
        {rows.length > 8 ? <li style={{ color: C.mute }}>… et {rows.length - 8} autre(s)</li> : null}
      </ul>
    </div> : null}
    <div><button disabled={busy || !rows.length} onClick={run} style={btn(C.brand)}>{busy ? "Import…" : `Importer ${rows.length || ""} client(s)`}</button></div>
    <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>Les numéros déjà présents dans la liste sont ignorés. Chaque client importé est « à contacter ».</p>
    {msg ? <p style={{ fontWeight: 600, color: msg.startsWith("✅") ? C.green : C.red, margin: 0 }}>{msg}</p> : null}
  </div>;
}
