import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, OWNER_EMAIL, type EmailAttachment } from "../../../lib/brevo";
import { portKey, vinValid, type ContainerInfo } from "../../../lib/shipments";
import { notifyOwner } from "../../../lib/import-notify";

const BUCKET = "shipment-docs";
const MAX_BYTES = 9 * 1024 * 1024; // Brevo : 10 Mo par e-mail
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const emails = (v: unknown) => String(v || "").split(/[,; ]+/).map(x => x.trim()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
const usd = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isTelex = (d: Doc) => d.doc_type === "telex" || (d.doc_type === "bl" && /telex|release/i.test(String(d.file_name || "")));
type Doc = { id: number; doc_type: string; version?: string | null; file_path: string; file_name?: string | null; uploaded_by?: string | null; container?: string | null; created_at?: string | null; ref?: string | null };
export type MailPlan = { container: string; to: string; toName: string; cc: string[]; subject: string; html: string; files: { name: string; path: string }[] };

/** Prestataire de dédouanement retenu pour le port du dossier (le premier actif). */
export async function customsBroker(db: SupabaseClient, port: unknown) {
  const { data } = await db.from("forwarders").select("*").eq("port", portKey(port)).order("active", { ascending: false }).order("id");
  return (data || []).find(f => (f.role || "dédouanement") === "dédouanement" && f.active !== false) || (data || []).find(f => (f.role || "dédouanement") === "dédouanement") || null;
}

/**
 * Prépare le dossier à envoyer au transitaire : un e-mail par conteneur, pièces jointes numérotées dans l'ordre
 * (1 BL, 2 facture avec VIN, 3 colisage avec VIN, 4 fret, 5 télex, 6 COC regroupés, 7 avis d'arrivée), copie au fondateur.
 */
export async function planDossier(db: SupabaseClient, id: number, toOverride?: unknown): Promise<{ plans: MailPlan[]; missing: string[] }> {
  const { data: s } = await db.from("shipments").select("*").eq("id", id).single();
  if (!s) throw new Error("Dossier introuvable");
  const fw = await customsBroker(db, s.port);
  const to = clean(toOverride || fw?.email || s.forwarder_email, 160); if (!to) throw new Error("E-mail du transitaire manquant");
  const cc = [...new Set([...emails(toOverride ? "" : fw?.cc), OWNER_EMAIL])].filter(x => x.toLowerCase() !== to.toLowerCase());
  const { data: docsRaw } = await db.from("shipment_docs").select("id,doc_type,version,file_path,file_name,uploaded_by,container,created_at,ref").eq("shipment_id", id).order("created_at");
  const docs = (docsRaw || []) as Doc[];
  const { data: veh } = await db.from("shipment_vehicles").select("vin,container").eq("shipment_id", id).order("vin");
  const list = ((s.container_list || []) as ContainerInfo[]).length ? (s.container_list as ContainerInfo[]) : [{ no: String(s.containers || "").split(/[ (–-]/)[0] || "" }];
  // Facture unique : un seul e-mail et un seul dédouanement pour tous les conteneurs du B/L.
  const sum = (k: "gross" | "net" | "cbm") => list.reduce((t, c) => t + Number(c[k] || 0), 0) || undefined;
  const conts: ContainerInfo[] = s.single_invoice && list.length > 1 ? [{ no: list.map(c => c.no).join(" + "), seal: list.map(c => c.seal).filter(Boolean).join(" / "), gross: sum("gross"), net: sum("net"), cbm: sum("cbm") }] : list;
  const partsTotal = ((s.extra_lines || []) as { qty: number; price: number }[]).reduce((t, l) => t + Number(l.qty || 0) * Number(l.price || 0), 0);
  const gen = (t: string, c: string) => docs.filter(d => d.uploaded_by === "plateforme" && d.doc_type === t && (!d.container || d.container === c || conts.length === 1));
  const orig = (t: string) => { const all = docs.filter(d => d.uploaded_by !== "plateforme" && d.doc_type === t && !isTelex(d)); const cor = all.filter(d => d.version === "corrigée"); return cor.length ? cor : all; };
  const missing: string[] = [];
  const plans: MailPlan[] = conts.map((c, i) => {
    const files: { name: string; path: string }[] = [];
    const add = (n: string, list: Doc[]) => list.forEach((d, k) => { const ext = (String(d.file_name || d.file_path).split(".").pop() || "pdf").toLowerCase(); files.push({ name: `${n}${list.length > 1 ? `-${k + 1}` : ""}.${ext}`, path: d.file_path }); });
    const bl = orig("bl"); if (!bl.length) missing.push(`${c.no} : connaissement`); add(`1-Bill-of-lading-${String(s.bl_number || "").split(" ")[0] || c.no}`, bl.slice(-1));
    const inv = gen("facture", c.no); if (!inv.length) missing.push(`${c.no} : facture avec VIN (à générer)`); add(`2-Commercial-invoice-${s.invoice_no || ""}-${c.no}`, inv.length ? inv : orig("facture").slice(-1));
    const pl = gen("colisage", c.no); add(`3-Packing-list-${s.invoice_no || ""}-${c.no}`, pl.length ? pl : orig("colisage").slice(-1));
    add(`3b-Spare-parts-list-${c.no}`, gen("pieces", c.no));
    const fr = orig("transport"); if (!fr.length) missing.push(`${c.no} : facture de fret`); add("4-Freight-invoice", fr);
    const tx = docs.filter(isTelex); add(`5-Telex-release-${String(s.bl_number || "").split(" ")[0]}`, tx.slice(-1));
    const coc = gen("coc", c.no); if (!coc.length && !orig("coc").length) missing.push(`${c.no} : COC`); add(`6-COC-${c.no}`, coc.length ? coc.slice(-1) : orig("coc"));
    add("7-Arrival-notice", orig("arrivee").slice(-1));
    const vins = (veh || []).filter(v => v.container === c.no || conts.length === 1).map(v => v.vin);
    const bad = vins.filter(v => !vinValid(v));
    const amount = vins.length * Number(s.unit_price || 0) + (s.single_invoice ? partsTotal : 0);
    const notes = [s.invoice_part ? `La facture ${esc(s.invoice_no)} est répartie sur plusieurs conteneurs : ${esc(s.invoice_part)}.` : "", bad.length ? `COC à corriger par l'usine (VIN avec clé de contrôle invalide) : ${bad.map(esc).join(", ")}. Le COC corrigé vous sera transmis dès réception.` : ""].filter(Boolean);
    const row = (k: string, v: string) => `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top"><b>${k}</b></td><td style="padding:6px 0">${v}</td></tr>`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111"><p>Bonjour${fw?.contact && to === fw.email ? " " + esc(fw.contact) : ""},</p>
<p>Veuillez trouver ci-joint le <b>dossier complet</b> ${s.single_invoice && list.length > 1 ? `des ${list.length} conteneurs ci-dessous (même B/L, une seule facture, à dédouaner ensemble)` : "du conteneur ci-dessous"}${conts.length > 1 ? ` (envoi ${i + 1}/${conts.length})` : ""}. Merci de bien vouloir prendre en charge son dédouanement.</p>
<table style="border-collapse:collapse;font-size:14px">${row(s.single_invoice && list.length > 1 ? "Conteneurs" : "Conteneur", `${esc(c.no)} (40HC)${c.seal ? ` – plomb ${esc(c.seal)}` : ""} – ${vins.length || "?"} colis`)}${row("Connaissement", `${esc(s.bl_number || "—")}`)}${row("Navire", `${esc(s.vessel || "—")}${s.eta ? ` – ETA <b>${new Date(s.eta).toLocaleDateString("fr-FR")}</b>` : ""} – ${esc(s.port || "")}`)}${row("Facture", `${esc(s.invoice_no || "—")}${s.invoice_date ? ` du ${esc(s.invoice_date)}` : ""} – ${vins.length} × ${usd(Number(s.unit_price || 0))}${s.single_invoice && partsTotal ? ` + pièces détachées ${usd(partsTotal)}` : ""} = <b>${usd(amount)} USD</b> ${esc(s.incoterm || "EXW Yinan")}`)}${row("Poids / volume", `${c.gross ? `${c.gross} kg brut` : "—"}${c.net ? ` – ${c.net} kg net` : ""}${c.cbm ? ` – ${c.cbm} m³` : ""}`)}${row("Marchandise", `${vins.length || ""} véhicules électriques neufs ${esc(s.model || "HAIBAO HB15W01A")}, quadricycles légers L6e-BP (réception UE e13*168/2013*02123*01), origine Chine`)}${row("Importateur", "MK HOLDING SAS – SIREN 908 645 393 – TVA FR93908645393 – 31 rue Jean Nougaro, 31600 Muret")}</table>
<p><b>Pièces jointes :</b><br>${files.map(f => esc(f.name)).join("<br>")}</p>
${vins.length ? `<p><b>VIN :</b> ${vins.map(esc).join(", ")}</p>` : ""}${notes.length ? `<p><b>Points à noter :</b><br>– ${notes.join("<br>– ")}</p>` : ""}
<p>Merci de nous confirmer la bonne réception, de nous indiquer votre tarif de dédouanement et la date de mise à disposition du conteneur, et de nous signaler s'il manque un élément.</p>
<p>Bien cordialement,</p><p><b>Mansour KHELIFA</b><br>MK HOLDING SAS – NeoDrive<br>+33 (0)6 89 78 17 10<br>${OWNER_EMAIL}<br>www.easydrive-auto.fr</p></div>`;
    return { container: c.no, to, toName: fw?.contact || "", cc, subject: `Dossier dédouanement ${c.no} – B/L ${String(s.bl_number || "?").split(" ")[0]}${s.eta ? ` – ETA ${new Date(s.eta).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}` : ""} – MK HOLDING`, html, files };
  });
  return { plans, missing };
}

/** Envoie le dossier (un e-mail par conteneur), enregistre l'envoi et crée une relance suivie par e-mail. */
export async function sendDossier(db: SupabaseClient, id: number, toOverride?: unknown) {
  const { plans, missing } = await planDossier(db, id, toOverride);
  let sent = 0;
  for (const p of plans) {
    const atts: EmailAttachment[] = []; let size = 0;
    for (const f of p.files) { const { data } = await db.storage.from(BUCKET).download(f.path); if (!data) throw new Error(`Pièce introuvable : ${f.name}`); const buf = Buffer.from(await data.arrayBuffer()); size += buf.length; atts.push({ name: f.name, content: buf.toString("base64") }); }
    if (size > MAX_BYTES) throw new Error(`Dossier ${p.container} trop lourd (${(size / 1048576).toFixed(1)} Mo) : compressez les COC ou le BL.`);
    await sendEmail(p.to, p.toName, p.subject, p.html, atts, { cc: p.cc, replyTo: OWNER_EMAIL });
    await db.from("shipment_followups").insert({ shipment_id: id, kind: "transitaire", label: `Dossier ${p.container}`, recipient: p.to, cc: p.cc.join(", "), subject: p.subject, auto: true });
    sent += atts.length;
  }
  await db.from("shipments").update({ sent_at: new Date().toISOString(), forwarder_email: plans[0]?.to || null }).eq("id", id);
  await notifyOwner(`📦 Dossier envoyé au transitaire (${plans.map(p => p.container).join(", ")}) : ${sent} pièces.${missing.length ? ` Manque : ${missing.join(" ; ")}` : ""}`).catch(() => null);
  return { sent, missing, to: plans[0]?.to || "", mails: plans.length };
}
