/**
 * Tableau de bord du fondateur (/tableau-de-bord) et e-mail du matin (7 h 05, du lundi au samedi).
 * Chaque rubrique est lue séparément : une table ou une colonne absente fait sauter la rubrique, pas la page. Serveur uniquement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./brevo";
import { normalizePhone } from "./crm-agent";
import { eurFr, payState } from "./stock-shared";
import { pendingKeys } from "./carte-grise";
import { reviewList } from "./payment-match";
import { hotSilent } from "./reservation-temperature";

type DB = SupabaseClient;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** AAAA-MM-JJ à Paris. */
export const parisDay = (d: Date | string = new Date()) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
export const parisHour = (d = new Date()) => Number(new Date(d).toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }));
const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** Début de la journée de Paris, en UTC (ISO). */
function parisMidnight(day: string) {
  const guess = new Date(`${day}T00:00:00Z`);
  const off = Number(guess.toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" })); // 1 (hiver) ou 2 (été)
  return new Date(guess.getTime() - off * 3600000).toISOString();
}
const ts = (s: unknown) => s ? new Date(String(s)).getTime() : NaN;
const name = (r: Row) => `${r.prenom || ""} ${r.nom || ""}`.trim() || "Client";
const lastLine = (s: unknown) => String(s || "").trim().split("\n").filter(Boolean).pop()?.slice(0, 140) || "";

export const telLink = (p: unknown) => { const n = normalizePhone(p); return n ? `tel:+${n}` : ""; };
export const waLink = (p: unknown, text = "") => { const n = normalizePhone(p); return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}` : ""; };

/** Exécute une rubrique ; null si la table ou une colonne manque (rubrique masquée). */
async function safe<T>(label: string, f: () => Promise<T>): Promise<T | null> {
  try { return await f(); } catch (e) { console.warn("[TABLEAU]", label, (e as Error).message); return null; }
}
const must = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return (r.data || []) as T; };

export type Dashboard = Awaited<ReturnType<typeof buildDashboard>>;

export async function buildDashboard(db: DB, now = new Date()) {
  const today = parisDay(now), tomorrow = addDays(today, 1), in7 = addDays(today, 7), in10 = addDays(today, 10), yesterday = addDays(today, -1);
  const todayStart = parisMidnight(today), tomorrowStart = parisMidnight(tomorrow), yesterdayStart = parisMidnight(yesterday);

  const rappels = safe("rappels", async () => {
    const base = "id,nom,telephone,statut,phase,notes,opted_out_at";
    let rows: Row[];
    const a = await db.from("leads").select(`${base},rappel,next_followup_at`).or(`rappel.lt.${tomorrowStart},next_followup_at.lt.${tomorrowStart}`).not("statut", "in", "(Client,Perdu)").is("opted_out_at", null).limit(300);
    if (a.error) rows = must(await db.from("leads").select(`${base},next_followup_at`).lt("next_followup_at", tomorrowStart).not("statut", "in", "(Client,Perdu)").is("opted_out_at", null).limit(300));
    else rows = (a.data || []) as Row[];
    return rows.map(l => {
      const when = String(l.rappel || l.next_followup_at || "");
      return { id: l.id, nom: l.nom || "Sans nom", telephone: l.telephone || "", statut: l.statut || "", phase: l.phase || "", rappel: when, overdue: !!when && ts(when) < ts(todayStart), note: lastLine(l.notes), tel: telLink(l.telephone), wa: waLink(l.telephone, `Bonjour${l.nom ? " " + String(l.nom).split(/\s+/)[0] : ""}, c'est Mansour de NeoDrive. `) };
    }).filter(l => l.rappel && ts(l.rappel) < ts(tomorrowStart)).sort((x, y) => ts(x.rappel) - ts(y.rappel)).slice(0, 60);
  });

  const RES = "id,prenom,nom,telephone,ville,modele,couleur,statut,date_promise,total,acompte,montant_du,paiement_confirme_at,paiement_en_attente,livre_at,reserve_path,reserve_token,created_at";
  const reservations = safe("reservations", async () => {
    const [soon, noDate, unpaid] = await Promise.all([
      db.from("reservations").select(RES).gte("date_promise", today).lte("date_promise", in7).neq("statut", "Annulée").neq("statut", "Livrée").order("date_promise").limit(100).then(must),
      db.from("reservations").select(RES).in("statut", ["Planifiée", "Confirmée"]).is("date_promise", null).order("created_at").limit(100).then(must),
      db.from("reservations").select(RES).in("statut", ["Livrée", "Planifiée", "Confirmée"]).is("paiement_confirme_at", null).order("date_promise", { nullsFirst: false }).limit(300).then(must),
    ]) as Row[][];
    const card = (r: Row) => ({ id: r.id, client: name(r), telephone: r.telephone || "", tel: telLink(r.telephone), wa: waLink(r.telephone), ville: r.ville || "", modele: [r.modele, r.couleur].filter(Boolean).join(" "), statut: r.statut, date: r.date_promise as string | null, total: r.total == null ? null : Number(r.total), pay: payState(r), livre: !!r.livre_at });
    return {
      soon: soon.map(card), noDate: noDate.map(card),
      // Attendus : livrées avec paiement en attente, ou planifiées / confirmées pas encore payées.
      expected: unpaid.filter(r => payState(r) !== "payé").map(card),
    };
  });

  const paidToday = safe("paiements du jour", async () => {
    const rows = must(await db.from("reservations").select("id,prenom,nom,total,paiement_confirme_at").gte("paiement_confirme_at", yesterdayStart).lt("paiement_confirme_at", tomorrowStart).limit(100)) as Row[];
    const tx = await db.from("bank_transactions").select("id,date,amount,label,reservation_id,pay_linked_at").eq("pay_match_status", "lié").gte("pay_linked_at", yesterdayStart).limit(100);
    const txs = (tx.error ? [] : tx.data || []) as Row[];
    const fromRes = rows.map(r => ({ reservation_id: r.id as number, client: name(r), amount: Number(txs.filter(t => t.reservation_id === r.id).reduce((s, t) => s + Number(t.amount), 0)) || (r.total == null ? null : Number(r.total)), source: txs.some(t => t.reservation_id === r.id) ? "Revolut" : "confirmé à la main", day: ts(r.paiement_confirme_at) >= ts(todayStart) ? "aujourd'hui" : "hier" }));
    // Acomptes reliés aujourd'hui (réservation pas encore payée en entier).
    const resNames = new Map<number, string>();
    const extraIds = [...new Set(txs.map(t => Number(t.reservation_id)).filter(id => id && !rows.some(r => r.id === id)))];
    if (extraIds.length) for (const r of must(await db.from("reservations").select("id,prenom,nom").in("id", extraIds)) as Row[]) resNames.set(r.id, name(r));
    const deposits = txs.filter(t => extraIds.includes(Number(t.reservation_id))).map(t => ({ reservation_id: Number(t.reservation_id), client: resNames.get(Number(t.reservation_id)) || `Réservation n° ${t.reservation_id}`, amount: Number(t.amount), source: "Revolut (acompte ou paiement partiel)", day: ts(t.pay_linked_at) >= ts(todayStart) ? "aujourd'hui" : "hier" }));
    return [...fromRes, ...deposits];
  });

  const toReview = safe("paiements à vérifier", async () => (await reviewList(db)).map(t => ({ id: t.id, date: t.date, amount: t.amount, label: t.label || t.counterparty || "", best: t.candidates[0]?.client || "" })));

  const carteGrise = safe("carte grise", async () => {
    const rows = must(await db.from("carte_grise_dossiers").select("id,ref,created_at,nom,prenom,telephone,status,sent_to_provider_at,doc_check,missing_request").not("status", "in", "(traité,annulé,envoi en cours)").order("created_at", { ascending: false }).limit(200)) as Row[];
    const card = (d: Row) => ({ id: d.id, ref: d.ref, client: name(d), telephone: d.telephone || "", tel: telLink(d.telephone), wa: waLink(d.telephone), status: d.status, check: d.doc_check?.overall || null, missing: pendingKeys(d.missing_request, d.doc_check), since: d.missing_request?.at || d.created_at, url: `${SITE}/carte-grise-admin?id=${d.id}` });
    const waitingClient = rows.filter(d => d.missing_request && !d.missing_request.done_at).map(card);
    const wc = new Set(waitingClient.map(d => d.id));
    return {
      incomplete: rows.filter(d => !wc.has(d.id) && d.status === "reçu" && (d.doc_check?.overall === "incomplet" || d.doc_check?.overall === "à vérifier")).map(card),
      waitingClient,
      toSend: rows.filter(d => !wc.has(d.id) && d.status === "reçu" && !d.sent_to_provider_at && (!d.doc_check || d.doc_check.overall === "complet")).map(card),
    };
  });

  const fournisseurs = safe("factures fournisseurs", async () => {
    const since = addDays(today, -120);
    const q = (cols: string) => db.from("receipts").select(cols).eq("is_invoice", true).is("transaction_id", null).neq("kind", "attestation").gte("date", since).order("date").limit(100);
    const rc = await q("id,date,merchant,invoice_number,total_ttc,currency,kind");
    // Sans les colonnes « factures fournisseurs » (script SQL pas encore passé) : colonnes d'origine.
    const unpaid = (rc.error ? must(await q("id,date,merchant,total_ttc,kind")) : rc.data || []) as unknown as Row[];
    const month = today.slice(0, 7), prev = addDays(`${month}-01`, -1).slice(0, 7);
    const tx = must(await db.from("bank_transactions").select("id,amount,ignored,category,import_month").lt("amount", 0).eq("ignored", false).in("import_month", [prev, month]).limit(5000)) as Row[];
    const debits = tx.filter(t => t.category !== "frais bancaires" && t.category !== "virement interne");
    const ids = debits.map(t => t.id); const withRc = new Set<number>();
    for (let i = 0; i < ids.length; i += 300) for (const r of must(await db.from("receipts").select("transaction_id").in("transaction_id", ids.slice(i, i + 300))) as Row[]) withRc.add(Number(r.transaction_id));
    return {
      unpaid: unpaid.map(r => ({ id: r.id, date: r.date, merchant: r.merchant || "?", number: r.invoice_number || null, total: r.total_ttc == null ? null : Number(r.total_ttc), currency: r.currency || "EUR" })),
      debitsWithout: debits.filter(t => !withRc.has(Number(t.id))).length, months: [prev, month],
    };
  });

  const conteneurs = safe("conteneurs", async () => {
    const rows = must(await db.from("shipments").select("id,name,status,eta,arrived_at,pipeline").gte("eta", addDays(today, -5)).lte("eta", in10).is("arrived_at", null).order("eta").limit(50)) as Row[];
    return rows.filter(s => !/TEST –/.test(String(s.name || ""))).map(s => ({ id: s.id, name: s.name || `Conteneur ${s.id}`, status: s.status || "", pipeline: s.pipeline || "", eta: s.eta as string, late: String(s.eta) < today }));
  });

  const recrutement = safe("recrutement", async () => {
    const rows = must(await db.from("job_applications").select("id,full_name,poste,city,phone,final_score,status,created_at").gte("created_at", yesterdayStart).not("final_score", "is", null).order("final_score", { ascending: false }).limit(5)) as Row[];
    return rows.map(a => ({ id: a.id, name: a.full_name || "?", poste: a.poste || "", city: a.city || "", score: Number(a.final_score), status: a.status || "", tel: telLink(a.phone), wa: waLink(a.phone) }));
  });

  // Clients « chauds » (température) sans réponse depuis 48 h : à relancer avant de réserver Rabouin.
  const chaudsSilence = safe("chauds sans réponse", async () => {
    const rows = must(await db.from("reservations").select("id,prenom,nom,telephone,ville,statut,date_promise,temperature,temperature_at,last_client_reply_at,livre_at").eq("temperature", "chaud").in("statut", ["Nouvelle", "Confirmée", "Planifiée"]).limit(300)) as Row[];
    return rows.filter(r => !r.livre_at && hotSilent(r, now.getTime())).map(r => ({ id: r.id as number, client: name(r), ville: r.ville || "", statut: r.statut as string, date: r.date_promise as string | null, since: (r.last_client_reply_at || r.temperature_at) as string, tel: telLink(r.telephone), wa: waLink(r.telephone) }))
      .sort((x, y) => ts(x.since) - ts(y.since));
  });

  const [r1, r2, r3, r4, r5, r6, r7, r8, r9] = await Promise.all([rappels, reservations, paidToday, toReview, carteGrise, fournisseurs, conteneurs, recrutement, chaudsSilence]);
  return { today, generatedAt: now.toISOString(), rappels: r1, reservations: r2, paidToday: r3, toReview: r4, carteGrise: r5, fournisseurs: r6, conteneurs: r7, recrutement: r8, chaudsSilence: r9 };
}

/* ───────────── E-mail du matin ───────────── */

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dfr = (d: string | null | undefined) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—";
const td = "padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top";
const a = (href: string, t: string) => href ? `<a href="${esc(href)}" style="color:#f05a28;text-decoration:none">${t}</a>` : "";
function block(title: string, rows: string[], empty: string, more = 0) {
  return `<h3 style="margin:18px 0 6px;font-size:16px">${title}</h3>${rows.length ? `<table style="border-collapse:collapse;width:100%;font-size:14px">${rows.join("")}</table>${more > 0 ? `<p style="margin:4px 0;color:#666;font-size:13px">… et ${more} autre(s) sur le tableau de bord.</p>` : ""}` : `<p style="margin:0;color:#666;font-size:14px">${empty}</p>`}`;
}
const tr = (left: string, right = "") => `<tr><td style="${td}">${left}</td><td style="${td};text-align:right;white-space:nowrap">${right}</td></tr>`;

export function digestEmail(d: Dashboard) {
  const N = 12; const parts: string[] = []; const todo: string[] = [];
  if (d.rappels) {
    const late = d.rappels.filter(l => l.overdue).length;
    todo.push(`${d.rappels.length} rappel(s)`);
    parts.push(block(`📞 Rappels du jour (${d.rappels.length}${late ? `, dont ${late} en retard` : ""})`, d.rappels.slice(0, N).map(l => tr(`<b>${esc(l.nom)}</b> · ${esc(l.statut)}${l.overdue ? ' <span style="color:#b91c1c">en retard</span>' : ""}${l.note ? `<br><span style="color:#666">${esc(l.note)}</span>` : ""}`, `${a(l.tel, "Appeler")} ${a(l.wa, "WhatsApp")}`)), "Aucun rappel aujourd'hui.", d.rappels.length - N));
  }
  if (d.reservations) {
    parts.push(block(`🚚 Livraisons des 7 prochains jours (${d.reservations.soon.length})`, d.reservations.soon.slice(0, N).map(r => tr(`<b>${dfr(r.date)}</b> · ${esc(r.client)}${r.ville ? ` (${esc(r.ville)})` : ""} · ${esc(r.modele)}`, r.pay === "payé" ? "✅ payé" : `<span style="color:#b91c1c">${esc(r.pay)}</span>`)), "Aucune livraison prévue.", d.reservations.soon.length - N));
    if (d.reservations.noDate.length) parts.push(block(`📅 Planifiées / confirmées sans date (${d.reservations.noDate.length})`, d.reservations.noDate.slice(0, N).map(r => tr(`${esc(r.client)}${r.ville ? ` (${esc(r.ville)})` : ""} · ${esc(r.statut)}`, a(r.tel, "Appeler"))), "", d.reservations.noDate.length - N));
    todo.push(`${d.reservations.soon.length} livraison(s) cette semaine`);
  }
  if (d.chaudsSilence?.length) {
    todo.push(`${d.chaudsSilence.length} client(s) chaud(s) sans réponse`);
    parts.push(block(`⚠️ Clients chauds sans réponse depuis 48 h (${d.chaudsSilence.length})`, d.chaudsSilence.slice(0, N).map(r => tr(`<b>${esc(r.client)}</b>${r.ville ? ` (${esc(r.ville)})` : ""} · ${esc(r.statut)} · dernière réponse ${dfr(r.since)}`, a(r.tel, "Appeler"))), "", d.chaudsSilence.length - N));
  }
  const pay: string[] = [];
  for (const p of d.paidToday || []) pay.push(tr(`✅ ${esc(p.client)} <span style="color:#666">(${esc(p.day)}, ${esc(p.source)})</span>`, eurFr(p.amount)));
  for (const t of d.toReview || []) pay.push(tr(`⚠️ À vérifier : ${esc(t.label)}${t.best ? ` → ${esc(t.best)} ?` : ""}`, eurFr(t.amount)));
  const exp = d.reservations?.expected || [];
  parts.push(block(`💶 Paiements (reçus hier/aujourd'hui : ${(d.paidToday || []).length} · attendus : ${exp.length})`, [...pay, ...exp.slice(0, N).map(r => tr(`⏳ ${esc(r.client)} · ${esc(r.statut)}${r.date ? ` · ${dfr(r.date)}` : ""}`, r.total == null ? "—" : eurFr(r.total)))], "Rien à signaler.", exp.length - N));
  if (d.carteGrise) {
    const cg = d.carteGrise; const n = cg.incomplete.length + cg.waitingClient.length + cg.toSend.length;
    if (n) todo.push(`${n} dossier(s) carte grise`);
    parts.push(block(`📑 Carte grise (${n})`, [
      ...cg.toSend.map(x => tr(`🆕 ${esc(x.client)} · ${esc(x.ref)} : prêt à envoyer à NK`, a(x.url, "Ouvrir"))),
      ...cg.incomplete.map(x => tr(`⚠️ ${esc(x.client)} · ${esc(x.ref)} : dossier ${esc(x.check)}`, a(x.url, "Ouvrir"))),
      ...cg.waitingClient.map(x => tr(`⏳ ${esc(x.client)} · ${esc(x.ref)} : pièces attendues du client depuis le ${dfr(x.since)}`, a(x.url, "Ouvrir"))),
    ], "Aucun dossier en attente."));
  }
  if (d.fournisseurs) {
    const f = d.fournisseurs;
    parts.push(block(`📄 Factures fournisseurs à payer (${f.unpaid.length}) · ${f.debitsWithout} débit(s) sans justificatif`, f.unpaid.slice(0, N).map(r => tr(`${dfr(r.date)} · ${esc(r.merchant)}${r.number ? ` · n° ${esc(r.number)}` : ""}`, r.currency === "EUR" ? eurFr(r.total) : `${r.total ?? "?"} ${esc(r.currency)}`)), "Aucune facture fournisseur en attente.", f.unpaid.length - N));
  }
  if (d.conteneurs) parts.push(block(`🚢 Conteneurs attendus sous 10 jours (${d.conteneurs.length})`, d.conteneurs.map(s => tr(`${esc(s.name)} · ${esc(s.status)}`, `${s.late ? '<span style="color:#b91c1c">en retard</span> ' : ""}${dfr(s.eta)}`)), "Aucun arrivage prévu."));
  if (d.recrutement) parts.push(block(`🤝 Recrutement : meilleurs tests depuis hier (${d.recrutement.length})`, d.recrutement.map(c => tr(`<b>${esc(c.name)}</b> · ${esc(c.poste)}${c.city ? ` · ${esc(c.city)}` : ""} · ${esc(c.status)}`, `${c.score}/100 ${a(c.tel, "Appeler")}`)), "Aucun nouveau test."));
  const subject = `☀️ Ta journée NeoDrive – ${new Date(`${d.today}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${todo.length ? ` : ${todo.slice(0, 3).join(", ")}` : ""}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;color:#141414"><h2 style="margin:0 0 4px">Bonjour Mansour ☀️</h2>
<p style="margin:0 0 8px;color:#666">Ta journée en un coup d'œil. <a href="${SITE}/tableau-de-bord" style="color:#f05a28">Ouvrir le tableau de bord</a></p>${parts.join("")}</div>`;
  return { subject, html };
}
