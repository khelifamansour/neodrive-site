"use client";
import { useEffect, useMemo, useState } from "react";
import { CART_KEY, eur, orderTotals, SHIPPING_NOTE, ttc, type Part, type ShippingMode } from "../../lib/parts";
import s from "./pieces.module.css";

type Cart = Record<string, number>;
const WA = "33676192234";
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function readCart(): Cart {
  try { const v = JSON.parse(localStorage.getItem(CART_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function writeCart(c: Cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch { /* stockage indisponible */ }
}

export default function Catalogue({ parts }: { parts: Part[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "", vin: "", message: "", website: "" });
  const [mode, setMode] = useState<ShippingMode>("retrait");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ order_number: string; token: string; emailSent: boolean } | null>(null);

  const bySku = useMemo(() => new Map(parts.map(p => [p.sku, p])), [parts]);
  useEffect(() => {
    // Panier enregistré : on ne garde que les pièces encore commandables
    const c = readCart(); const ok: Cart = {};
    for (const [k, v] of Object.entries(c)) { const p = bySku.get(k); const n = Math.floor(Number(v)); if (p && p.sale_price !== null && n > 0) ok[k] = Math.min(99, n); }
    setCart(ok);
  }, [bySku]);
  const update = (c: Cart) => { setCart(c); writeCart(c); };

  const cats = useMemo(() => { const m = new Map<string, number>(); parts.forEach(p => m.set(p.category || "Autres", (m.get(p.category || "Autres") || 0) + 1)); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr")); }, [parts]);
  const shown = useMemo(() => { const n = norm(q.trim()); return parts.filter(p => (!cat || (p.category || "Autres") === cat) && (!n || norm(`${p.name} ${p.sku} ${p.category || ""}`).includes(n))); }, [parts, q, cat]);

  const lines = Object.entries(cart).map(([sku, n]) => { const p = bySku.get(sku)!; return { sku, name: p.name, qty: n, unit_ht: p.sale_price || 0, image_url: p.image_url }; }).filter(l => bySku.has(l.sku));
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const totals = orderTotals(lines, mode === "retrait" ? 0 : null);

  const add = (p: Part) => {
    const n = qty[p.sku] || 1;
    setDone(null);
    update({ ...cart, [p.sku]: Math.min(99, (cart[p.sku] || 0) + n) });
    setAdded(p.sku); setTimeout(() => setAdded(a => (a === p.sku ? "" : a)), 1600);
  };
  const setLine = (sku: string, n: number) => { const c = { ...cart }; if (n <= 0) delete c[sku]; else c[sku] = Math.min(99, n); update(c); };
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }) });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setSending(true);
    try {
      const r = await fetch("/api/pieces/commande", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, shipping_mode: mode, lines: lines.map(l => ({ sku: l.sku, qty: l.qty })) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Erreur, réessayez.");
      setDone({ order_number: j.order_number, token: j.token, emailSent: j.emailSent }); update({});
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur, réessayez."); }
    finally { setSending(false); }
  }

  return (
    <>
      <section className={s.tools} aria-label="Recherche">
        <input className={s.search} type="search" placeholder="Rechercher : phare, frein, vitre, référence…" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher une pièce" />
        <div className={s.chips}>
          <button type="button" className={!cat ? s.chipOn : s.chip} onClick={() => setCat("")}>Toutes ({parts.length})</button>
          {cats.map(([c, n]) => <button type="button" key={c} className={cat === c ? s.chipOn : s.chip} onClick={() => setCat(cat === c ? "" : c)}>{c} ({n})</button>)}
        </div>
      </section>

      <section className={s.grid}>
        {shown.map(p => (
          <article key={p.sku} className={s.card}>
            <div className={s.photo}>{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span>Photo sur demande</span>}</div>
            <div className={s.body}>
              <small className={s.cat}>{p.category}</small>
              <h3>{p.name}</h3>
              <small className={s.ref}>Réf. {p.sku}</small>
              {p.sale_price !== null ? <>
                <div className={s.price}><b>{eur(p.sale_price)} HT</b><span>{eur(ttc(p.sale_price))} TTC</span></div>
                <div className={s.buy}>
                  <div className={s.qty}>
                    <button type="button" aria-label="Moins" onClick={() => setQty({ ...qty, [p.sku]: Math.max(1, (qty[p.sku] || 1) - 1) })}>−</button>
                    <span>{qty[p.sku] || 1}</span>
                    <button type="button" aria-label="Plus" onClick={() => setQty({ ...qty, [p.sku]: Math.min(99, (qty[p.sku] || 1) + 1) })}>+</button>
                  </div>
                  <button type="button" className={s.add} onClick={() => add(p)}>{added === p.sku ? "Ajouté ✓" : "Ajouter au panier"}</button>
                </div>
              </> : <>
                <div className={s.price}><b>Sur devis</b></div>
                <a className={s.quote} href={`https://wa.me/${WA}?text=${encodeURIComponent(`Bonjour, je voudrais un devis pour la pièce « ${p.name} » pour ma NeoDrive. Mon VIN est : `)}`} target="_blank" rel="noopener">Demander un devis</a>
              </>}
            </div>
          </article>
        ))}
        {!shown.length && <p className={s.empty}>Aucune pièce trouvée. Essayez un autre mot ou <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener">écrivez-nous sur WhatsApp</a>.</p>}
      </section>

      {count > 0 && !open && <button type="button" className={s.cartBar} onClick={() => setOpen(true)}>🛒 Panier : {count} pièce{count > 1 ? "s" : ""} · {eur(totals.total_ttc)} TTC<b>Commander →</b></button>}

      {open && (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Panier" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className={s.drawer}>
            <div className={s.drawerHead}><h2>{done ? "Commande envoyée" : "Mon panier"}</h2><button type="button" onClick={() => { setOpen(false); }} aria-label="Fermer">✕</button></div>
            {done ? (
              <div className={s.done}>
                <p>Merci ! Votre commande est enregistrée sous le numéro</p>
                <strong>{done.order_number}</strong>
                <p>{done.emailSent ? "Vous allez recevoir la facture pro forma par e-mail (pensez à regarder dans les spams)." : "Nous vous envoyons la facture pro forma très vite par e-mail."} Le paiement se fait par virement : les pièces sont préparées dès réception.</p>
                <a className={s.add} href={`/pieces/commande/${done.token}`}>Suivre ma commande</a>
                <a className={s.linkBtn} href={`/api/pieces/commande/${done.token}/pdf`} target="_blank" rel="noopener">Voir la facture pro forma (PDF)</a>
                <small>Gardez ce lien : il permet de suivre votre commande à tout moment.</small>
              </div>
            ) : !lines.length ? <p className={s.empty}>Votre panier est vide.</p> : (
              <>
                <ul className={s.lines}>
                  {lines.map(l => (
                    <li key={l.sku}>
                      {l.image_url ? <img src={l.image_url} alt="" /> : <span className={s.noimg} />}
                      <div><b>{l.name}</b><small>Réf. {l.sku} · {eur(l.unit_ht)} HT</small>
                        <div className={s.qty}><button type="button" aria-label="Moins" onClick={() => setLine(l.sku, l.qty - 1)}>−</button><span>{l.qty}</span><button type="button" aria-label="Plus" onClick={() => setLine(l.sku, l.qty + 1)}>+</button><button type="button" className={s.remove} onClick={() => setLine(l.sku, 0)}>Retirer</button></div>
                      </div>
                      <b className={s.lineTotal}>{eur(l.qty * l.unit_ht)}</b>
                    </li>
                  ))}
                </ul>
                <div className={s.totals}>
                  <div><span>Total HT</span><b>{eur(totals.total_ht)}</b></div>
                  <div><span>TVA 20 %</span><span>{eur(totals.tva)}</span></div>
                  <div className={s.big}><span>Total TTC</span><b>{eur(totals.total_ttc)}</b></div>
                  {mode === "envoi" && <p className={s.note}>+ {SHIPPING_NOTE.toLowerCase()}.</p>}
                </div>

                <form className={s.form} onSubmit={submit}>
                  <h3>Vos coordonnées</h3>
                  <div className={s.two}>
                    <label>Prénom *<input required autoComplete="given-name" {...field("first_name")} /></label>
                    <label>Nom *<input required autoComplete="family-name" {...field("last_name")} /></label>
                  </div>
                  <div className={s.two}>
                    <label>Téléphone *<input required type="tel" autoComplete="tel" {...field("phone")} /></label>
                    <label>E-mail *<input required type="email" autoComplete="email" {...field("email")} /></label>
                  </div>
                  <fieldset className={s.modes}>
                    <legend>Livraison *</legend>
                    <label className={mode === "retrait" ? s.modeOn : s.mode}><input type="radio" name="mode" checked={mode === "retrait"} onChange={() => setMode("retrait")} /> <span><b>Retrait à Muret</b><small>31 rue Jean Nougaro, 31600 Muret · sans frais d’envoi</small></span></label>
                    <label className={mode === "envoi" ? s.modeOn : s.mode}><input type="radio" name="mode" checked={mode === "envoi"} onChange={() => setMode("envoi")} /> <span><b>Envoi</b><small>{SHIPPING_NOTE}</small></span></label>
                  </fieldset>
                  <label>Adresse de livraison {mode === "envoi" ? "*" : "(facultatif)"}<textarea rows={2} required={mode === "envoi"} autoComplete="street-address" placeholder="N°, rue, code postal, ville" {...field("address")} /></label>
                  <label>Numéro de série / VIN de la voiture (facultatif)<input placeholder="Ex. LJ5…" {...field("vin")} /></label>
                  <label>Message (facultatif)<textarea rows={3} placeholder="Une précision sur la pièce, le modèle, la couleur…" {...field("message")} /></label>
                  <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" {...field("website")} />
                  {err && <p className={s.err}>{err}</p>}
                  <button className={s.submit} disabled={sending}>{sending ? "Envoi…" : `Valider la commande · ${eur(totals.total_ttc)} TTC`}</button>
                  <small className={s.legal}>Vous recevez une facture pro forma par e-mail. Paiement par virement bancaire ; les pièces sont préparées à réception du paiement.</small>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
