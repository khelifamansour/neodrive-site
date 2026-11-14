"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { eur, ORDER_STATUSES, orderTotals, SHIPPING_LABEL, type OrderStatus, type PartsOrder } from "../../../lib/parts";
import s from "./admin.module.css";

type Order = PartsOrder & { status_url: string; whatsapp_url: string | null };
type AdminPart = { id: string; sku: string; name: string; category: string | null; sale_price: number | null; purchase_price: number | null; stock_qty: number | null; image_url: string | null; active: boolean; notes: string | null };
const PC_KEY = "nd_pc";
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const STATUS_COLOR: Record<OrderStatus, string> = { "nouvelle": "#ff5a1f", "proforma envoyée": "#b45309", "payée": "#047857", "préparée": "#1d4ed8", "expédiée": "#6d28d9", "livrée": "#374151", "annulée": "#9ca3af" };

export default function PiecesAdmin() {
  const [pc, setPc] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [who, setWho] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"orders" | "parts">("orders");
  const [parts, setParts] = useState<AdminPart[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (body: Record<string, unknown>, code?: string) => {
    const r = await fetch("/api/pieces/admin", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ passcode: code ?? pc, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { setAuthed(false); throw new Error("Accès refusé"); }
    if (!r.ok || !j.ok) throw new Error(j.error || "Erreur");
    return j;
  }, [pc]);

  const load = useCallback(async (code: string) => {
    try {
      const j = await call({ action: "list" }, code);
      setOrders(j.orders); setWho(j.who); setAuthed(true); setPc(code);
      try { if (code) sessionStorage.setItem(PC_KEY, code); } catch { /* ignore */ }
    } catch (e) {
      const m = (e as Error).message;
      setAuthed(a => (m === "Accès refusé" ? false : a === true));
      setMsg(m === "Accès refusé" ? (code ? "Code incorrect ou accès non autorisé" : "") : m);
    }
  }, [call]);

  useEffect(() => { let code = ""; try { code = sessionStorage.getItem(PC_KEY) || ""; } catch { /* ignore */ } load(code); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const replace = (o: Order) => setOrders(list => list.map(x => (x.id === o.id ? o : x)));
  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true); setMsg("");
    try { const j = await call(body); if (j.order) replace(j.order); setMsg(ok); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const downloadPdf = async (id: string) => {
    setBusy(true); setMsg("");
    try {
      const j = await call({ action: "pdf", id });
      const bytes = Uint8Array.from(atob(j.base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = j.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  const counts = useMemo(() => { const c: Record<string, number> = {}; orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; }); return c; }, [orders]);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return orders.filter(o => (!filter || o.status === filter) && (!n || `${o.order_number} ${o.customer_first_name} ${o.customer_last_name} ${o.customer_phone} ${o.customer_email} ${o.vin || ""}`.toLowerCase().includes(n))); }, [orders, filter, q]);
  const cur = orders.find(o => o.id === sel) || null;

  if (authed === null) return <main className={s.page}><p>Chargement…</p></main>;
  if (!authed) return (
    <main className={s.page}>
      <form className={s.login} onSubmit={e => { e.preventDefault(); setMsg(""); load(pc); }}>
        <h1>Commandes de pièces</h1>
        <label>Code d’accès<input type="password" value={pc} onChange={e => setPc(e.target.value)} autoFocus /></label>
        <button className={s.primary}>Entrer</button>
        {msg && <p className={s.err}>{msg}</p>}
        <a href="/organisation">Membre de l’équipe ? Se connecter</a>
      </form>
    </main>
  );

  return (
    <main className={s.page}>
      <header className={s.head}>
        <div><h1>Pièces détachées</h1><small>Connecté : {who}</small></div>
        <nav className={s.tabs}>
          <button className={tab === "orders" ? s.tabOn : s.tab} onClick={() => setTab("orders")}>Commandes ({orders.length})</button>
          <button className={tab === "parts" ? s.tabOn : s.tab} onClick={() => { setTab("parts"); if (!parts) call({ action: "parts" }).then(j => setParts(j.parts)).catch(e => setMsg(e.message)); }}>Catalogue</button>
          <button className={s.tab} onClick={() => load(pc)}>↻</button>
        </nav>
      </header>
      {msg && <p className={s.msg} onClick={() => setMsg("")}>{msg}</p>}

      {tab === "orders" && (cur ? (
        <OrderDetail o={cur} busy={busy} onBack={() => setSel(null)} act={act} downloadPdf={downloadPdf} />
      ) : (
        <>
          <input className={s.search} type="search" placeholder="Rechercher : n°, nom, téléphone, VIN…" value={q} onChange={e => setQ(e.target.value)} />
          <div className={s.chips}>
            <button className={!filter ? s.chipOn : s.chip} onClick={() => setFilter("")}>Toutes ({orders.length})</button>
            {ORDER_STATUSES.map(st => <button key={st} className={filter === st ? s.chipOn : s.chip} onClick={() => setFilter(filter === st ? "" : st)}>{st} ({counts[st] || 0})</button>)}
          </div>
          <ul className={s.list}>
            {shown.map(o => (
              <li key={o.id} onClick={() => { setSel(o.id); setMsg(""); }}>
                <div><b>{o.order_number}</b><small>{fmt(o.created_at)}</small></div>
                <div>{o.customer_first_name} {o.customer_last_name}<small>{o.lines.reduce((t, l) => t + l.qty, 0)} pièce(s) · {o.shipping_mode === "envoi" ? "Envoi" : "Retrait"}</small></div>
                <div className={s.right}><b>{eur(o.total_ttc)}</b><span className={s.badge} style={{ background: STATUS_COLOR[o.status] }}>{o.status}</span></div>
              </li>
            ))}
            {!shown.length && <li className={s.none}>Aucune commande.</li>}
          </ul>
        </>
      ))}

      {tab === "parts" && <PartsEditor parts={parts} setParts={setParts} call={call} setMsg={setMsg} />}
    </main>
  );
}

function OrderDetail({ o, busy, onBack, act, downloadPdf }: { o: Order; busy: boolean; onBack: () => void; act: (b: Record<string, unknown>, ok: string) => Promise<void>; downloadPdf: (id: string) => void }) {
  const [status, setStatus] = useState<OrderStatus>(o.status);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(o.notes || "");
  const [ship, setShip] = useState(o.shipping_ht === null ? "" : String(o.shipping_ht));
  useEffect(() => { setStatus(o.status); setNotes(o.notes || ""); setShip(o.shipping_ht === null ? "" : String(o.shipping_ht)); }, [o]);
  const t = orderTotals(o.lines, o.shipping_ht);
  const mail = `mailto:${o.customer_email}?subject=${encodeURIComponent(`NeoDrive - votre commande ${o.order_number}`)}&body=${encodeURIComponent(`Bonjour ${o.customer_first_name},\n\nAu sujet de votre commande de pièces ${o.order_number} :\n\n\nSuivi de la commande : ${o.status_url}\n\nL'équipe NeoDrive\n06 89 78 17 10`)}`;

  return (
    <section className={s.detail}>
      <button className={s.back} onClick={onBack}>← Toutes les commandes</button>
      <div className={s.dHead}><h2>{o.order_number}</h2><span className={s.badge} style={{ background: STATUS_COLOR[o.status] }}>{o.status}</span></div>
      <p className={s.muted}>Reçue le {fmt(o.created_at)}</p>

      <div className={s.cols}>
        <div className={s.box}>
          <h3>Client</h3>
          <p><b>{o.customer_first_name} {o.customer_last_name}</b><br /><a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a><br /><a href={`mailto:${o.customer_email}`}>{o.customer_email}</a><br />{o.shipping_address || <i>Pas d’adresse</i>}{o.vin && <><br />VIN : <b>{o.vin}</b></>}</p>
          <p>Livraison : <b>{SHIPPING_LABEL[o.shipping_mode]}</b></p>
          {o.customer_message && <p className={s.quote}>« {o.customer_message} »</p>}
          <div className={s.actions}>
            {o.whatsapp_url && <a className={s.wa} href={o.whatsapp_url} target="_blank" rel="noopener">WhatsApp</a>}
            <a className={s.secondary} href={mail}>E-mail</a>
            <a className={s.secondary} href={o.status_url} target="_blank" rel="noopener">Page client</a>
          </div>
        </div>

        <div className={s.box}>
          <h3>Statut</h3>
          <select value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>{ORDER_STATUSES.map(x => <option key={x} value={x}>{x}</option>)}</select>
          <input placeholder="Note (facultatif, ex. n° de suivi colis)" value={note} onChange={e => setNote(e.target.value)} />
          <button className={s.primary} disabled={busy || status === o.status} onClick={() => act({ action: "status", id: o.id, status, note }, "Statut enregistré").then(() => setNote(""))}>Changer le statut</button>
          <h3>Facture pro forma</h3>
          {o.shipping_mode === "envoi" && (
            <label className={s.inline}>Frais d’envoi HT (€)<input inputMode="decimal" placeholder="à confirmer" value={ship} onChange={e => setShip(e.target.value)} /><button className={s.secondary} disabled={busy} onClick={() => act({ action: "shipping", id: o.id, shipping_ht: ship.trim() === "" ? null : ship }, "Frais d’envoi enregistrés")}>OK</button></label>
          )}
          <div className={s.actions}>
            <button className={s.primary} disabled={busy} onClick={() => { if (confirm(`Envoyer la pro forma à ${o.customer_email} ?`)) act({ action: "send", id: o.id }, "Pro forma envoyée au client"); }}>Envoyer par e-mail</button>
            <button className={s.secondary} disabled={busy} onClick={() => downloadPdf(o.id)}>Télécharger le PDF</button>
          </div>
        </div>
      </div>

      <div className={s.box}>
        <h3>Pièces</h3>
        <ul className={s.lines}>
          {o.lines.map(l => <li key={l.sku}>{l.image_url ? <img src={l.image_url} alt="" /> : <span className={s.noimg} />}<div><b>{l.name}</b><small>Réf. {l.sku}</small></div><span>{l.qty} × {eur(l.unit_ht)}</span><b>{eur(l.qty * l.unit_ht)}</b></li>)}
        </ul>
        <p className={s.tot}>Envoi : {o.shipping_mode === "retrait" ? "retrait" : o.shipping_ht === null ? "à confirmer" : `${eur(o.shipping_ht)} HT`} · Total HT <b>{eur(t.total_ht)}</b> · TVA {eur(t.tva)} · <b>TTC {eur(t.total_ttc)}</b></p>
      </div>

      <div className={s.box}>
        <h3>Notes internes</h3>
        <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Visible uniquement par l’équipe" />
        <button className={s.secondary} disabled={busy || notes === (o.notes || "")} onClick={() => act({ action: "notes", id: o.id, notes }, "Notes enregistrées")}>Enregistrer les notes</button>
      </div>

      <div className={s.box}>
        <h3>Historique</h3>
        <ul className={s.history}>
          {[...o.history].reverse().map((h, i) => <li key={i}><small>{fmt(h.at)} · {h.by}</small><br />{h.action}{h.from && h.to ? ` : ${h.from} → ${h.to}` : h.to ? ` : ${h.to}` : ""}{h.note ? ` (${h.note})` : ""}</li>)}
        </ul>
      </div>
    </section>
  );
}

function PartsEditor({ parts, setParts, call, setMsg }: { parts: AdminPart[] | null; setParts: (p: AdminPart[]) => void; call: (b: Record<string, unknown>) => Promise<{ part: AdminPart }>; setMsg: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Record<string, Partial<Record<keyof AdminPart, string | boolean>>>>({});
  if (!parts) return <p>Chargement du catalogue…</p>;
  const n = q.trim().toLowerCase();
  const shown = parts.filter(p => !n || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(n));
  const val = (p: AdminPart, k: keyof AdminPart) => (edit[p.id]?.[k] ?? (p[k] === null ? "" : p[k])) as string | boolean;
  const set = (p: AdminPart, k: keyof AdminPart, v: string | boolean) => setEdit({ ...edit, [p.id]: { ...edit[p.id], [k]: v } });
  const save = async (p: AdminPart) => {
    try {
      const j = await call({ action: "part_update", id: p.id, part: edit[p.id] });
      setParts(parts.map(x => (x.id === p.id ? j.part : x))); const e = { ...edit }; delete e[p.id]; setEdit(e); setMsg(`${j.part.name} enregistré`);
    } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <section>
      <input className={s.search} type="search" placeholder="Rechercher une pièce…" value={q} onChange={e => setQ(e.target.value)} />
      <p className={s.muted}>{parts.length} pièces · {parts.filter(p => !p.active).length} masquées du site. Les changements sont visibles sur /pieces sous 5 minutes.</p>
      <ul className={s.parts}>
        {shown.map(p => (
          <li key={p.id} className={p.active ? undefined : s.off}>
            {p.image_url ? <img src={String(val(p, "image_url")) || p.image_url} alt="" /> : <span className={s.noimg} />}
            <div className={s.pmain}><b>{p.name}</b><small>{p.sku} · {p.category}</small></div>
            <label>Prix HT<input inputMode="decimal" value={String(val(p, "sale_price"))} onChange={e => set(p, "sale_price", e.target.value)} placeholder="sur devis" /></label>
            <label>Stock<input inputMode="numeric" value={String(val(p, "stock_qty"))} onChange={e => set(p, "stock_qty", e.target.value)} /></label>
            <label className={s.wide}>Photo<input value={String(val(p, "image_url"))} onChange={e => set(p, "image_url", e.target.value)} placeholder="/pieces/xxx.jpg" /></label>
            <label className={s.check}><input type="checkbox" checked={Boolean(val(p, "active"))} onChange={e => set(p, "active", e.target.checked)} /> En ligne</label>
            <button className={s.primary} disabled={!edit[p.id]} onClick={() => save(p)}>Enregistrer</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
