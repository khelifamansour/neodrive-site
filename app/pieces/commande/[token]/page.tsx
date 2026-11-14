import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eur, ORDER_STATUSES, orderTotals, SHIPPING_LABEL, SHIPPING_NOTE, STATUS_TEXT, type PartsOrder } from "../../../../lib/parts";
import { BANK, db, normOrder, ORDER_COLUMNS } from "../../../../lib/parts-server";
import s from "./suivi.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de commande de pièces - NeoDrive", robots: { index: false, follow: false } };

const STEPS = ORDER_STATUSES.filter(x => x !== "annulée");
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function SuiviCommande({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24,64}$/.test(token)) notFound();
  let o: PartsOrder | null = null;
  try { const { data } = await db().from("parts_orders").select(ORDER_COLUMNS).eq("public_token", token).maybeSingle(); o = data ? normOrder(data) : null; }
  catch { return <main className={s.page}><h1>Suivi momentanément indisponible</h1><p>Réessayez dans quelques minutes ou appelez-nous au 06 89 78 17 10.</p></main>; }
  if (!o) notFound();

  const t = orderTotals(o.lines, o.shipping_ht);
  const step = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const timeline = o.history.filter(h => h.to); // seulement les changements de statut (pas de notes internes)
  const unpaid = o.status === "nouvelle" || o.status === "proforma envoyée";

  return (
    <main className={s.page}>
      <span className={s.kicker}>COMMANDE DE PIÈCES</span>
      <h1>{o.order_number}</h1>
      <p className={s.sub}>Passée le {fmt(o.created_at)} par {o.customer_first_name} {o.customer_last_name.slice(0, 1)}.</p>

      <section className={o.status === "annulée" ? s.statusOff : s.status}>
        <b>{o.status === "annulée" ? "Annulée" : o.status.charAt(0).toUpperCase() + o.status.slice(1)}</b>
        <p>{STATUS_TEXT[o.status]}</p>
      </section>

      {o.status !== "annulée" && (
        <ol className={s.steps}>
          {STEPS.map((x, i) => <li key={x} className={i <= step ? s.on : undefined}><span>{i + 1}</span>{x}</li>)}
        </ol>
      )}

      <section className={s.box}>
        <h2>Pièces commandées</h2>
        <ul className={s.lines}>
          {o.lines.map(l => (
            <li key={l.sku}>
              {l.image_url ? <img src={l.image_url} alt="" /> : <span className={s.noimg} />}
              <div><b>{l.name}</b><small>Réf. {l.sku} · {l.qty} × {eur(l.unit_ht)} HT</small></div>
              <b>{eur(l.qty * l.unit_ht)}</b>
            </li>
          ))}
        </ul>
        <div className={s.totals}>
          <div><span>{SHIPPING_LABEL[o.shipping_mode]}</span><span>{o.shipping_mode === "retrait" ? eur(0) : o.shipping_ht === null ? "à confirmer" : `${eur(o.shipping_ht)} HT`}</span></div>
          <div><span>Total HT</span><b>{eur(t.total_ht)}</b></div>
          <div><span>TVA 20 %</span><span>{eur(t.tva)}</span></div>
          <div className={s.big}><span>Total TTC</span><b>{eur(t.total_ttc)}</b></div>
          {o.shipping_mode === "envoi" && o.shipping_ht === null && <p className={s.note}>{SHIPPING_NOTE}.</p>}
        </div>
        {o.status !== "annulée" && <a className={s.btn} href={`/api/pieces/commande/${o.public_token}/pdf`} target="_blank" rel="noopener">Télécharger la facture pro forma (PDF)</a>}
      </section>

      {unpaid && (
        <section className={s.box}>
          <h2>Paiement par virement</h2>
          <p>Titulaire : <b>{BANK.holder}</b><br />Banque : {BANK.bank}<br />IBAN : <b>{BANK.iban}</b><br />BIC : {BANK.bic}<br />Référence à indiquer : <b>{o.order_number}</b></p>
          {o.shipping_mode === "envoi" && o.shipping_ht === null && <p className={s.note}>Attendez la facture pro forma avec les frais d’envoi avant de payer.</p>}
          <small>Ce sont nos seules coordonnées bancaires. En cas de doute, appelez-nous au 06 89 78 17 10 avant de payer.</small>
        </section>
      )}

      {timeline.length > 0 && (
        <section className={s.box}>
          <h2>Historique</h2>
          <ul className={s.history}>{timeline.map((h, i) => <li key={i}><small>{fmt(h.at)}</small> {h.to}</li>)}</ul>
        </section>
      )}

      <p className={s.help}>Une question ? <a href="tel:+33689781710">06 89 78 17 10</a> · <a href="mailto:contact.neodrivefrance@gmail.com">contact.neodrivefrance@gmail.com</a><br /><a href="/pieces">← Retour au catalogue des pièces</a></p>
    </main>
  );
}
