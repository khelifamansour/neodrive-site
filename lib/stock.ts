/**
 * « Boucler la boucle » : chaque voiture (VIN) suivie de l'usine au client, reliée à sa réservation, à son dossier carte grise
 * et à sa facture de vente. Source unique par VIN : la table shipment_vehicles. Serveur uniquement.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeText } from "./pdf-text";
import { BANK } from "./parts-server";
import { DEBOURS_MENTION, SELLER_INVOICE, eurFr, lineHt, suggestLines, totals, payState, type InvoiceLine } from "./stock-shared";
import { normalizePhone } from "./crm-agent";
import { applyStoredSecrets } from "./integrations";
import { brevoReady, OWNER_EMAIL, sendEmail, SITE } from "./brevo";
import { CARTE_GRISE_BUCKET, fullName, type CarteGriseDossier } from "./carte-grise-server";
import { nearestVin, readVinFromDocument } from "./vin-read";
import { vinCheckOk } from "./vin";

type DB = SupabaseClient;
export const INVOICE_BUCKET = "erp-documents";
export const INVOICE_FOLDER = "factures-ventes";
const RES_COLS = "id,nom,prenom,telephone,email,adresse,code_postal,ville,departement,modele,couleur,total,delivery_price,statut,livre_at,vin,updated_at,plan_client_id,paiement_confirme_at,paiement_en_attente,montant_du,reserve_path,reserve_token";
const day = (d?: string | null) => d ? new Date(d).toISOString().slice(0, 10) : null;
const fr = (d: string | null | undefined) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "";
const historyAdd = (h: unknown, ev: Record<string, unknown>) => [...(Array.isArray(h) ? h : []), { at: new Date().toISOString(), ...ev }].slice(-50);

/* ───────────── Lien réservation ↔ VIN ───────────── */

/**
 * Relie une réservation à son VIN dans le stock (crée la ligne si ce VIN n'y est pas encore, sans conteneur).
 * delivered : la voiture est remise au client (accusé ou réserve de propriété signés). Ne lève pas d'erreur bloquante.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function linkReservationVin(db: DB, r: any, opts: { delivered?: boolean; by?: string; at?: string } = {}) {
  const vin = String(r?.vin || "").toUpperCase();
  if (!r?.id || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return null;
  const client = `${r.prenom || ""} ${r.nom || ""}`.trim();
  const at = opts.at || new Date().toISOString();
  const { data: rows } = await db.from("shipment_vehicles").select("id,reservation_id,status,history").eq("vin", vin).order("id");
  // La réservation change de VIN (erreur de plaque corrigée) : l'ancienne voiture, pas encore livrée, redevient libre.
  await db.from("shipment_vehicles").update({ reservation_id: null, client_name: null, client_id: null, updated_at: at }).eq("reservation_id", r.id).neq("vin", vin).neq("status", "livrée");
  if (!rows?.length) {
    const { data: ins } = await db.from("shipment_vehicles").insert({
      shipment_id: null, vin, status: opts.delivered ? "livrée" : "au dépôt", reservation_id: r.id, client_name: client, model: r.modele || null, color: r.couleur || null, source: "livraison",
      ...(opts.delivered ? { delivered_at: at } : {}), history: [{ at, by: opts.by || "auto", note: `VIN ajouté au stock depuis la réservation de ${client}` }],
    }).select("id").single();
    return ins?.id ?? null;
  }
  for (const v of rows) {
    const patch: Record<string, unknown> = { reservation_id: r.id, client_name: client, updated_at: at };
    if (opts.delivered && v.status !== "livrée") { patch.status = "livrée"; patch.delivered_at = at; }
    if (v.reservation_id !== r.id || patch.status) patch.history = historyAdd(v.history, { by: opts.by || "auto", stage: patch.status, note: `lié à la réservation de ${client}` });
    await db.from("shipment_vehicles").update(patch).eq("id", v.id);
  }
  return rows[0].id as number;
}

/* ───────────── Factures de vente ───────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function draftFromReservation(r: any, vehicleId: number | null) {
  const s = suggestLines(r);
  const t = totals(s.lines);
  return {
    reservation_id: r.id, vehicle_id: vehicleId, vin: r.vin || null, status: "brouillon", delivered_at: day(r.livre_at) || day(r.updated_at),
    client_name: `${r.prenom || ""} ${r.nom || ""}`.trim(),
    client_address: [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].map((x: string) => String(x || "").trim()).filter(Boolean).join(", "),
    client_email: r.email || null, client_phone: r.telephone || null, lines: s.lines, suggested_ttc: s.suggested, retained_ttc: t.total_ttc, ...t,
    notes: s.fromGrid ? "Montant suggéré d'après le barème (pas de total sur la réservation)" : null,
  };
}

/** Crée le brouillon de facture d'une vente livrée s'il n'existe pas (idempotent : une facture par réservation). Complète le VIN d'un brouillon. */
export async function ensureDraftInvoice(db: DB, reservationId: number) {
  const { data: r } = await db.from("reservations").select(RES_COLS).eq("id", reservationId).maybeSingle();
  if (!r || r.statut === "Annulée") return null;
  const { data: v } = r.vin ? await db.from("shipment_vehicles").select("id").eq("vin", r.vin).order("id").limit(1) : { data: [] };
  const vehicleId = v?.[0]?.id ?? null;
  const { data: cur } = await db.from("sales_invoices").select("id,status,vin,vehicle_id").eq("reservation_id", reservationId).maybeSingle();
  if (cur) {
    if (cur.status === "brouillon" && r.vin && (cur.vin !== r.vin || cur.vehicle_id !== vehicleId)) await db.from("sales_invoices").update({ vin: r.vin, vehicle_id: vehicleId, updated_at: new Date().toISOString() }).eq("id", cur.id);
    return cur.id as number;
  }
  const { data: ins, error } = await db.from("sales_invoices").upsert(draftFromReservation(r, vehicleId), { onConflict: "reservation_id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  return ins?.[0]?.id ?? null;
}

/** Brouillons manquants pour toutes les réservations livrées (rattrapage, rejouable). */
export async function ensureAllDrafts(db: DB) {
  const [{ data: res }, { data: inv }] = await Promise.all([
    db.from("reservations").select("id,livre_at,statut").neq("statut", "Annulée").or("livre_at.not.is.null,statut.eq.Livrée").limit(5000),
    db.from("sales_invoices").select("reservation_id").limit(10000),
  ]);
  const have = new Set((inv || []).map(x => x.reservation_id));
  let n = 0;
  for (const r of res || []) if (!have.has(r.id)) { await ensureDraftInvoice(db, r.id); n++; }
  return n;
}

/** Après une remise signée (accusé ou réserve de propriété) : lien stock + brouillon de facture. Ne lève jamais d'erreur. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onDelivered(db: DB, r: any, by: string, at: string) {
  try { await linkReservationVin(db, r, { delivered: true, by, at }); } catch (e) { console.error("[STOCK] lien livraison", e); }
  try { await ensureDraftInvoice(db, Number(r.id)); } catch (e) { console.error("[STOCK] brouillon facture", e); }
}

export type SalesInvoice = {
  id: number; reservation_id: number | null; vehicle_id: number | null; vin: string | null; status: string; number: string | null; issued_at: string | null; delivered_at: string | null;
  client_name: string | null; client_address: string | null; client_email: string | null; client_phone: string | null; lines: InvoiceLine[];
  suggested_ttc: number | null; retained_ttc: number | null; adjust_reason: string | null; total_ht: number | null; tva: number | null; total_ttc: number | null; pdf_path: string | null; notes: string | null; year?: number | null;
};

/** PDF de la facture de vente (même mise en page que les pro forma pièces). */
export function invoicePdf(inv: SalesInvoice, paid: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = safeText(new PDFDocument({ size: "A4", margin: 40, info: { Title: `Facture ${inv.number}`, Author: SELLER_INVOICE.name } }));
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const ink = "#111", grey = "#666", accent = "#ff5a1f";
    doc.font("Helvetica-Bold").fontSize(18).fillColor(ink).text(SELLER_INVOICE.brand, 40, 40);
    doc.font("Helvetica-Bold").fontSize(9).text(SELLER_INVOICE.name, 40, 64);
    doc.font("Helvetica").fontSize(9).fillColor(grey).text([...SELLER_INVOICE.address, `SIREN ${SELLER_INVOICE.siren} · RCS ${SELLER_INVOICE.rcs}`, `Capital ${SELLER_INVOICE.capital} · TVA ${SELLER_INVOICE.tva_intra}`, ...SELLER_INVOICE.contact].join("\n"), 40, 76, { width: 250 });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(accent).text("FACTURE", 300, 40, { width: 255, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(ink)
      .text(`N° ${inv.number}`, 300, 66, { width: 255, align: "right" })
      .text(`Date : ${fr(inv.issued_at)}`, 300, 78, { width: 255, align: "right" })
      .text(inv.delivered_at ? `Date de livraison : ${fr(inv.delivered_at)}` : "", 300, 90, { width: 255, align: "right" });

    const cy = 150;
    doc.roundedRect(300, cy, 255, 90, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("CLIENT", 310, cy + 8);
    doc.font("Helvetica").fontSize(9).text([inv.client_name, inv.client_address, inv.client_phone ? `Tél. ${inv.client_phone}` : "", inv.client_email].filter(Boolean).join("\n"), 310, cy + 21, { width: 235, height: 64, ellipsis: true });
    doc.font("Helvetica-Bold").fontSize(9).text("VÉHICULE", 40, cy + 8);
    doc.font("Helvetica").fontSize(9).text(`Voiturette électrique neuve NeoDrive (catégorie L6e)\nN° de série (VIN) : ${inv.vin || "—"}`, 40, cy + 21, { width: 240 });

    const cols = [{ h: "Désignation", w: 265 }, { h: "Total HT", w: 85, a: "right" }, { h: "TVA 20 %", w: 75, a: "right" }, { h: "Total TTC", w: 90, a: "right" }];
    let y = cy + 110;
    const row = (cells: string[], bold = false, bg?: string) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const h = Math.max(18, ...cells.map((t, i) => doc.heightOfString(t, { width: cols[i].w - 10 }) + 8));
      let x = 40;
      if (bg) doc.rect(40, y, 515, h).fill(bg);
      cells.forEach((t, i) => { doc.fillColor(ink).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(t, x + 5, y + 4, { width: cols[i].w - 10, align: (cols[i].a as "right") || "left" }); x += cols[i].w; });
      doc.moveTo(40, y + h).lineTo(555, y + h).lineWidth(0.4).stroke("#ccc");
      y += h;
    };
    row(cols.map(c => c.h), true, "#f1f1f1");
    for (const l of inv.lines.filter(l => Number(l.ttc))) { const ht = lineHt(l); row([l.debours && !l.label.includes(DEBOURS_MENTION) ? `${l.label} (${DEBOURS_MENTION})` : l.label, eurFr(ht), l.debours ? "—" : eurFr(Number(l.ttc) - ht), eurFr(l.ttc)]); }
    const deb = inv.lines.filter(l => l.debours).reduce((a, l) => a + (Number(l.ttc) || 0), 0);
    y += 10;
    const tot = (k: string, v: string, b = false) => { doc.font(b ? "Helvetica-Bold" : "Helvetica").fontSize(b ? 11 : 9.5).fillColor(ink).text(k, 340, y, { width: 120 }).text(v, 460, y, { width: 95, align: "right" }); y += b ? 18 : 14; };
    tot("Total HT", eurFr(inv.total_ht));
    if (deb) tot("dont débours (sans TVA)", eurFr(deb));
    tot("TVA 20 %", eurFr(inv.tva)); tot("Total TTC", eurFr(inv.total_ttc), true);
    doc.font("Helvetica").fontSize(9).fillColor(grey).text(`Règlement : ${paid}`, 300, y + 2, { width: 255, align: "right" }); y += 26;

    doc.roundedRect(40, y, 515, 70, 6).lineWidth(0.6).stroke("#bbb");
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("Paiement par virement bancaire", 52, y + 10);
    doc.font("Helvetica").fontSize(9).text(`Titulaire : ${BANK.holder}  ·  Banque : ${BANK.bank}\nIBAN : ${BANK.iban}  ·  BIC : ${BANK.bic}\nRéférence : ${inv.number}`, 52, y + 26, { width: 490 });
    y += 84;
    doc.font("Helvetica").fontSize(7.5).fillColor(grey).text("Prix en euros, TVA 20 % incluse sauf débours. Débours : frais d'immatriculation payés au nom et pour le compte du client et refacturés à l'euro près, non soumis à TVA (article 267 II 2° du CGI). En cas de retard de paiement : pénalités au taux d'intérêt légal majoré de 10 points ; pour un client professionnel, indemnité forfaitaire pour frais de recouvrement de 40 €. Pas d'escompte pour paiement anticipé. Le véhicule reste la propriété de MK HOLDING SAS jusqu'au paiement intégral du prix.", 40, y, { width: 515 });
    doc.end();
  });
}

/** Valide un brouillon : numéro suivant (fonction SQL atomique, sans trou), PDF rangé dans le stockage privé. */
export async function validateInvoice(db: DB, id: number) {
  const { data, error } = await db.rpc("validate_sales_invoice", { p_id: id });
  if (error) throw new Error(error.message);
  const inv = (Array.isArray(data) ? data[0] : data) as SalesInvoice;
  if (!inv.pdf_path) await storeInvoicePdf(db, inv);
  return inv;
}

export async function storeInvoicePdf(db: DB, inv: SalesInvoice) {
  if (!inv.number) throw new Error("Brouillon : pas de PDF avant validation.");
  const { data: r } = inv.reservation_id ? await db.from("reservations").select("paiement_confirme_at,paiement_en_attente,reserve_path,reserve_token,statut,montant_du").eq("id", inv.reservation_id).maybeSingle() : { data: null };
  const ps = payState(r);
  const paid = ps === "payé" ? `payée${r?.paiement_confirme_at ? ` le ${fr(r.paiement_confirme_at)}` : ""}` : ps === "réserve de propriété" ? "en attente (réserve de propriété)" : "à régler à réception";
  const pdf = await invoicePdf({ ...inv, lines: (inv.lines || []) as InvoiceLine[] }, paid);
  const path = `${INVOICE_FOLDER}/${inv.year || new Date().getFullYear()}/${inv.number}.pdf`;
  const up = await db.storage.from(INVOICE_BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) throw new Error("PDF non enregistré : " + up.error.message);
  await db.from("sales_invoices").update({ pdf_path: path, updated_at: new Date().toISOString() }).eq("id", inv.id);
  return path;
}

/* ───────────── Dossier carte grise : VIN lu sur les documents ───────────── */

const READ_ORDER = ["coc", "cnit", "devis_signe", "mandat_carte_grise_signe"];
const norm = (s: unknown) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const phone9 = (p: unknown) => normalizePhone(p).slice(-9);

/**
 * Lit le VIN sur le COC (sinon homologation, contrat, mandat), vérifie la clé de contrôle, rapproche du stock et de la réservation
 * (VIN, puis téléphone, puis nom), relie la voiture au client et prépare le brouillon de facture si la vente est livrée.
 * Ne touche jamais au statut de paiement ni à l'envoi à NK Services. Prévient le fondateur par e-mail (une fois).
 */
export async function analyseDossier(db: DB, id: number, opts: { notify?: boolean } = {}) {
  const { data: d } = await db.from("carte_grise_dossiers").select("*").eq("id", id).maybeSingle();
  if (!d) throw new Error("Dossier introuvable");
  const dossier = d as CarteGriseDossier & { vin?: string | null; reservation_id?: number | null; founder_notified_at?: string | null; vin_source?: string | null };
  const notes: string[] = [];
  let vin: string | null = dossier.vin || null; let checkOk: boolean | null = vin ? vinCheckOk(vin) : null; let source = "";
  if (!vin) {
    const files = [...(dossier.files || [])].sort((a, b) => (READ_ORDER.indexOf(a.key) + 1 || 99) - (READ_ORDER.indexOf(b.key) + 1 || 99)).filter(f => READ_ORDER.includes(f.key));
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { notes.push(`${f.label} trop lourd pour la lecture automatique`); continue; }
      const { data: blob } = await db.storage.from(CARTE_GRISE_BUCKET).download(f.path);
      if (!blob) { notes.push(`${f.label} introuvable`); continue; }
      try {
        const out = await readVinFromDocument(new Uint8Array(await blob.arrayBuffer()), f.type || blob.type || "", f.name);
        if (!out) { notes.push(`${f.label} : format illisible (HEIC ?)`); continue; }
        if (out.vin) { vin = out.vin; checkOk = out.check_ok; source = f.label; if (out.check_ok) break; }
      } catch (e) { notes.push(`${f.label} : ${(e as Error).message}`); }
    }
  }
  // Stock : VIN exact, sinon VIN à 1-2 caractères près (erreur de lecture corrigée seulement si la clé de contrôle tombe juste).
  let vehicle: { id: number; vin: string; reservation_id: number | null } | null = null;
  if (vin) {
    const { data: all } = await db.from("shipment_vehicles").select("id,vin,reservation_id").limit(5000);
    vehicle = (all || []).find(v => v.vin === vin) || null;
    if (!vehicle) {
      const near = nearestVin(vin, (all || []).map(v => String(v.vin)));
      if (near && (vinCheckOk(near.vin) || !checkOk)) { notes.push(`VIN lu ${vin} corrigé en ${near.vin} (stock, ${near.d} caractère(s) d'écart)`); vin = near.vin; checkOk = vinCheckOk(vin); vehicle = (all || []).find(v => v.vin === vin) || null; }
      else notes.push(`VIN ${vin} absent du stock`);
    }
  }
  // Réservation : par VIN, puis téléphone, puis nom + prénom (hors annulées).
  let res = null as null | Record<string, unknown>; let how = "";
  if (dossier.reservation_id) { const { data } = await db.from("reservations").select(RES_COLS).eq("id", dossier.reservation_id).maybeSingle(); res = data; how = "lien manuel"; }
  if (!res && vin) { const { data } = await db.from("reservations").select(RES_COLS).eq("vin", vin).neq("statut", "Annulée").limit(1); res = data?.[0] || null; how = "VIN"; }
  if (!res && vehicle?.reservation_id) { const { data } = await db.from("reservations").select(RES_COLS).eq("id", vehicle.reservation_id).maybeSingle(); res = data; how = "stock"; }
  if (!res) {
    const { data: list } = await db.from("reservations").select(RES_COLS).neq("statut", "Annulée").order("id", { ascending: false }).limit(3000);
    const p = phone9(dossier.telephone);
    const byPhone = p.length === 9 ? (list || []).filter(r => phone9(r.telephone) === p) : [];
    const byName = (list || []).filter(r => norm(r.nom) && norm(r.nom) === norm(dossier.nom) && norm(r.prenom).slice(0, 4) === norm(dossier.prenom).slice(0, 4));
    const pick = (arr: typeof byPhone) => arr.find(r => !r.vin || r.vin === vin) || arr[0] || null;
    res = pick(byPhone); how = res ? "téléphone" : "";
    if (!res) { res = pick(byName); how = res ? "nom" : ""; }
  }
  if (res) {
    if (vin && res.vin && res.vin !== vin) notes.push(`⚠️ La réservation porte un autre VIN (${res.vin}) : à vérifier`);
    else if (vin && !res.vin) {
      const { data: dup } = await db.from("reservations").select("id,prenom,nom").eq("vin", vin).neq("id", res.id).limit(1);
      if (dup?.length) notes.push(`⚠️ VIN ${vin} déjà attribué à ${dup[0].prenom} ${dup[0].nom}`);
      else { await db.from("reservations").update({ vin, updated_at: new Date().toISOString() }).eq("id", res.id); res.vin = vin; notes.push("VIN ajouté à la réservation"); }
    }
    if (res.vin === vin && vin) {
      const delivered = !!res.livre_at || res.statut === "Livrée";
      const vid = await linkReservationVin(db, res, { delivered, by: "carte grise" });
      if (vid && !vehicle) vehicle = { id: vid, vin, reservation_id: Number(res.id) };
      if (delivered) await ensureDraftInvoice(db, Number(res.id));
    }
  } else notes.push("Aucune réservation trouvée (VIN, téléphone, nom) : à relier à la main");
  const note = [res ? `Réservation n° ${res.id} trouvée par ${how}` : "", source ? `VIN lu sur : ${source}` : "", ...notes].filter(Boolean).join(" · ");
  const at = new Date().toISOString();
  await db.from("carte_grise_dossiers").update({ vin, vin_check_ok: checkOk, vin_source: source || dossier.vin_source || null, reservation_id: res ? Number(res.id) : null, vehicle_id: vehicle?.id ?? null, match_note: note.slice(0, 2000), analysed_at: at, updated_at: at }).eq("id", id);
  if (opts.notify && !dossier.founder_notified_at) await notifyFounder(db, { ...dossier, vin }, res, note);
  return { vin, check_ok: checkOk, reservation_id: res?.id ?? null, vehicle_id: vehicle?.id ?? null, note };
}

/** E-mail au fondateur : nouveau dossier prêt à valider avant envoi à NK Services (jamais envoyé automatiquement). */
async function notifyFounder(db: DB, d: CarteGriseDossier & { vin?: string | null }, res: Record<string, unknown> | null, note: string) {
  try {
    await applyStoredSecrets();
    if (!brevoReady()) return;
    const ps = payState(res as never);
    const warn = ps === "payé" ? "" : `<p style="background:#fde8e8;border:1px solid #f5b5b5;border-radius:8px;padding:8px 10px;color:#b91c1c"><b>⛔ Paiement : ${ps}</b>. Vérifiez avant d'envoyer le dossier à NK Services.</p>`;
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const html = `<p>Nouveau dossier carte grise <b>${esc(fullName(d))}</b> (${esc(d.ref)}) prêt à valider.</p><p>VIN : <b>${esc(d.vin || "non lu")}</b><br>${esc(note)}</p>${warn}<p>Paiement : <b>${esc(ps)}</b></p><p>Rien n'est envoyé à NK Services sans votre clic : <a href="${SITE}/carte-grise-admin">${SITE}/carte-grise-admin</a> (onglet « À valider avant envoi »).</p>`;
    await sendEmail(OWNER_EMAIL, "Mansour", `Carte grise à valider – ${fullName(d)}${ps === "payé" ? "" : ` – ${ps.toUpperCase()}`}`, html);
    await db.from("carte_grise_dossiers").update({ founder_notified_at: new Date().toISOString() }).eq("id", d.id);
  } catch (e) { console.error("[CARTE GRISE] e-mail fondateur", e); }
}
