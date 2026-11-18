import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { listJson } from "../../../lib/datastore";
import { PLAN_CLIENTS, PLAN_TOURS } from "../../../lib/fleet";
import { driverKey } from "../../../lib/driver-link";
import { brevoReady, sendEmail, sendSms } from "../../../lib/brevo";
import { newCode, sha } from "../../../lib/team";
import { CONTRACT_VERSION, DOC_KINDS, DRIVER_BUCKET, REQUIRED_DOCS, isDocKind } from "../../../lib/driver-docs";
import { roadKm, splitTrips, type PlanClient, type PlanTour, type Stop } from "../../../lib/planif";
import { estimateHours, isExpenseType } from "../../../lib/driver-hours";
import { addTickets, readTicket, type TicketData } from "../../../lib/driver-tickets";
import { randomBytes } from "crypto";
import { RECEIPT_FOLDER, VIN_RE, checksFor, type ReceiptData } from "../../../lib/delivery-receipt";
import { finalizeDelivery, intlPhone } from "../../../lib/delivery-finalize";
import { OWNER_EMAIL } from "../../../lib/brevo";
import { PHOTO_BUCKET } from "../../../lib/fleet";
import { bicOk, fmtIban, ibanOk, invoicePdf, siretOk, type Billing, type Control } from "../../../lib/driver-invoice";
import { cleanDays, control, initials, invoiceTotal, tourBillingBase } from "../../../lib/driver-billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://www.easydrive-auto.fr";
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type Doc = { id: number; member_id: number; kind: string; path: string | null; filename: string | null; status: string; data: Record<string, unknown>; note: string | null; uploaded_at: string; validated_at: string | null };
type DB = ReturnType<typeof crmDatabase>;

/** Dernier document de chaque type pour un livreur. */
async function latestDocs(db: DB, memberId: number) {
  const { data } = await db.from("driver_documents").select("*").eq("member_id", memberId).order("uploaded_at", { ascending: false }).limit(200);
  const out: Record<string, Doc> = {};
  for (const d of (data || []) as Doc[]) if (!out[d.kind]) out[d.kind] = d;
  return out;
}
const publicDoc = (d?: Doc) => d ? { status: d.status, filename: d.filename, uploaded_at: d.uploaded_at, note: d.note, signed_name: d.data?.signed_name || null, signed_at: d.data?.signed_at || null } : { status: "manquant" };


const INVOICE_FOLDER = "factures";
const eurTxt = (n: number) => `${(Math.round(Number(n) * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const hmTxt = (min: number) => `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`;
/** Coordonnées de facturation nettoyées + liste de ce qui manque. */
function checkBilling(x: Billing | null | undefined) {
  const b: Billing = { legal_name: clean(x?.legal_name, 120), siret: String(x?.siret || "").replace(/\s+/g, ""), address: clean(x?.address, 200), iban: String(x?.iban || "").toUpperCase().replace(/\s+/g, ""), bic: String(x?.bic || "").toUpperCase().replace(/\s+/g, "") };
  const missing: string[] = [];
  if ((b.legal_name || "").length < 3) missing.push("nom ou raison sociale");
  if (!siretOk(b.siret || "")) missing.push("SIRET (14 chiffres)");
  if ((b.address || "").length < 8) missing.push("adresse");
  if (!ibanOk(b.iban || "")) missing.push("IBAN valide");
  if (b.bic && !bicOk(b.bic)) missing.push("BIC valide (8 ou 11 caractères)");
  return { b, missing };
}
/** Rapport court de contrôle (SMS, 2 SMS maximum, sans emoji). */
function controlSms(driver: string, tour: string, number: string, total: number, c: Control) {
  const parts = [`NeoDrive : facture ${number} de ${driver} (${tour}) : ${eurTxt(total)}.`, `Heures ${c.real_h} h pour ${c.planned_h} h prevues (ecart ${c.gap_h > 0 ? "+" : ""}${c.gap_h} h).`, `Livres ${c.delivered}/${c.planned_stops}.`];
  if (c.missing.length) parts.push(`Non livres : ${c.missing.slice(0, 3).join(", ")}${c.missing.length > 3 ? "..." : ""}.`);
  if (c.no_vin.length) parts.push(`VIN non saisi : ${c.no_vin.length}.`);
  if (c.no_receipt.length) parts.push(`Sans accuse : ${c.no_receipt.length}.`);
  parts.push(`Carte societe : ${eurTxt(c.card_total)} (${c.tickets} ticket${c.tickets > 1 ? "s" : ""}${c.tickets ? "" : ", AUCUN TICKET"}).`);
  if (c.cap_alerts.length) parts.push(`Depassements : ${c.cap_alerts.length}.`);
  if (c.perso_total) parts.push(`A rembourser : ${eurTxt(c.perso_total)}.`);
  return parts.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 300);
}

/** Tournées du livreur : nom du livreur de la tournée qui contient son prénom (ou toutes pour le fondateur). */
const isMine = (t: PlanTour, name: string | null) => {
  if (!name) return true;
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() || "";
  return !!first && String(t.driver || "").toLowerCase().includes(first);
};


/**
 * Vue livreur d'une tournée (lecture seule) : voyages, prénom + ville de chaque client, km et heures estimées.
 * Jamais de prix ni de coûts. Tournée prévisionnelle (brouillon) : ni adresse ni téléphone, positions arrondies (~1 km).
 */
function driverPlan(t: PlanTour, clients: Map<string, PlanClient>) {
  const draft = t.status === "brouillon";
  const stops: Stop[] = (t.stops || []).map(s => {
    if (s.kind !== "client") return { kind: "depot", id: s.id, name: s.name, label: s.name, lat: s.lat, lng: s.lng, load: s.load, loaded: s.loaded, action: s.action, legKm: s.legKm, legH: s.legH };
    const c = clients.get(s.id);
    const who = c ? `${c.prenom || c.nom}`.trim() : s.name.split(" ")[0];
    const ville = c ? `${c.code_postal ? c.code_postal.slice(0, 2) + " · " : ""}${c.ville}` : "";
    const r = (x: number) => draft ? Math.round(x * 100) / 100 : x;
    return { kind: "client", id: s.id, name: who, label: ville, lat: r(s.lat), lng: r(s.lng), load: s.load, action: s.action, legKm: s.legKm, legH: s.legH };
  });
  const trips = splitTrips(stops).map(v => {
    const legs = [...v.clients, ...(v.next ? [v.next] : [])];
    const drive = legs.every(x => x.legH) ? legs.reduce((a, x) => a + (x.legH || 0), 0) : v.km / 72;
    const hours = drive + v.clients.length * 0.75 + (v.hub.loaded ? 0.5 : 0);
    return { n: v.n, color: v.color, hub: v.hub.name, hubPos: [v.hub.lat, v.hub.lng], action: v.hub.action, clients: v.clients.map(x => ({ id: x.id, name: x.name, ville: x.label, pos: [x.lat, x.lng] })), next: v.next ? v.next.name : null, nextPos: v.next ? [v.next.lat, v.next.lng] : null, driveH: Math.round(drive * 10) / 10, km: Math.round(v.km || legs.reduce((a, x, i) => a + roadKm(i ? legs[i - 1] : v.hub, x), 0)), hours: Math.round(hours * 10) / 10 };
  });
  const hours = Math.round(estimateHours(t) * 10) / 10;
  const days = Math.max(1, Math.ceil(hours / 9));
  const end = t.date ? new Date(new Date(t.date + "T12:00:00").getTime() + (days - 1) * 86400e3).toISOString().slice(0, 10) : null;
  return { draft, stops, trips, km: t.km || Math.round(trips.reduce((a, v) => a + v.km, 0)), hours, days, end };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = crmDatabase();
  try {
    // ── Fondateur : invitations et vérification des documents
    if (typeof b.action === "string" && b.action.startsWith("admin_")) {
      if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
      if (b.action === "admin_list") {
        const { data: members } = await db.from("team_members").select("id,name,role,phone,email,active,expires_at,revoked_at,last_seen_at,sections,created_at,is_test").order("created_at", { ascending: false });
        const drivers = (members || []).filter(m => m.role === "livreur" || (Array.isArray(m.sections) && m.sections.includes("livreur")));
        const out = [];
        for (const m of drivers) {
          const docs = await latestDocs(db, m.id);
          const paths = Object.values(docs).map(d => d.path).filter(Boolean) as string[];
          const urls: Record<string, string> = {};
          if (paths.length) { const { data } = await db.storage.from(DRIVER_BUCKET).createSignedUrls(paths, 1800); for (const x of data || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
          out.push({ ...m, docs: Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, { id: d.id, status: d.status, filename: d.filename, uploaded_at: d.uploaded_at, validated_at: d.validated_at, note: d.note, url: d.path ? urls[d.path] || null : null, data: d.data }])) });
        }
        return NextResponse.json({ ok: true, drivers: out, kinds: DOC_KINDS, required: REQUIRED_DOCS });
      }
      if (b.action === "admin_validate") {
        const status = b.status === "valide" ? "valide" : b.status === "refuse" ? "refuse" : null;
        if (!status) return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
        const { error } = await db.from("driver_documents").update({ status, note: clean(b.note, 300) || null, validated_at: new Date().toISOString() }).eq("id", Number(b.id));
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }
      if (b.action === "admin_invoices") {
        const { data, error } = await db.from("driver_invoices").select("id,member_id,tour_id,tour_name,number,status,days,deliveries,expenses,rate,worked_min,total,control,pdf_path,sent_at,paid_at,created_at").order("created_at", { ascending: false }).limit(500);
        if (error) throw new Error(error.message);
        const { data: mem } = await db.from("team_members").select("id,name,is_test");
        const names = new Map((mem || []).map(m => [m.id, m.name]));
        const paths = (data || []).map(x => x.pdf_path).filter(Boolean) as string[];
        const urls: Record<string, string> = {};
        if (paths.length) { const { data: u } = await db.storage.from(DRIVER_BUCKET).createSignedUrls(paths, 1800); for (const x of u || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
        return NextResponse.json({ ok: true, invoices: (data || []).map(x => ({ ...x, driver: names.get(x.member_id) || "?", url: x.pdf_path ? urls[x.pdf_path] || null : null })) });
      }
      if (b.action === "admin_invoice_paid") {
        const paid = b.paid !== false;
        const { error } = await db.from("driver_invoices").update({ status: paid ? "payee" : "a_payer", paid_at: paid ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", Number(b.id)).neq("status", "brouillon");
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }
      // Dépenses de tournée (tickets) d'un mois : tableau, CSV et photos pour le comptable
      if (b.action === "admin_expenses") {
        const month = /^\d{4}-\d{2}$/.test(String(b.month)) ? String(b.month) : new Date().toISOString().slice(0, 7);
        const from = new Date(month + "-01T00:00:00Z"); const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
        const { data, error } = await db.from("tour_events").select("id,tour_id,created_at,author,note,photo_path,data").eq("kind", "frais").gte("created_at", new Date(from.getTime() - 3 * 86400e3).toISOString()).lt("created_at", new Date(to.getTime() + 3 * 86400e3).toISOString()).order("created_at").limit(3000);
        if (error) throw new Error(error.message);
        const tours = new Map((await listJson<PlanTour>(db, PLAN_TOURS)).map(t => [t.id, t]));
        const rows = (data || []).map(e => { const d = (e.data || {}) as Record<string, unknown>; return { id: e.id, date: String(d.date || e.created_at.slice(0, 10)), type: String(d.type || "autre"), amount: Number(d.amount) || 0, paid: d.paid === "perso" ? "perso" : "carte", merchant: (d.merchant as string) || "", vat: d.vat == null ? null : Number(d.vat), ai: (d.ai || null) as TicketData["ai"] | null, edited: !!d.edited, tour_id: e.tour_id, tour: tours.get(e.tour_id)?.name || e.tour_id, driver: tours.get(e.tour_id)?.driver || e.author || "", note: e.note || "", photo: e.photo_path as string | null }; }).filter(r => r.date.startsWith(month));
        const paths = rows.map(r => r.photo).filter(Boolean) as string[];
        const urls: Record<string, string> = {};
        for (let i = 0; i < paths.length; i += 100) { const { data: u } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(paths.slice(i, i + 100), 3600); for (const x of u || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
        return NextResponse.json({ ok: true, month, expenses: rows.map(r => ({ ...r, url: r.photo ? urls[r.photo] || null : null, photo: !!r.photo })) });
      }
      if (b.action === "admin_expense_update" || b.action === "admin_expense_reread") {
        const { data: ev } = await db.from("tour_events").select("id,photo_path,data,created_at").eq("id", Number(b.id)).eq("kind", "frais").maybeSingle();
        if (!ev) return NextResponse.json({ ok: false, error: "Ticket introuvable" }, { status: 404 });
        const cur = (ev.data || {}) as TicketData;
        let next: TicketData;
        if (b.action === "admin_expense_reread") {
          if (!ev.photo_path) return NextResponse.json({ ok: false, error: "Pas de photo" }, { status: 400 });
          next = { ...cur, ...(await readTicket(db, ev.photo_path, cur.date || ev.created_at.slice(0, 10))), edited: false };
        } else {
          const amount = Math.round(Number(String(b.amount ?? cur.amount).replace(",", ".")) * 100) / 100;
          if (!(amount >= 0 && amount <= 5000)) return NextResponse.json({ ok: false, error: "Montant invalide" }, { status: 400 });
          const vat = b.vat === "" || b.vat == null ? null : Math.round(Number(String(b.vat).replace(",", ".")) * 100) / 100;
          next = { ...cur, type: isExpenseType(b.type) ? b.type : cur.type, amount, vat: Number.isFinite(vat as number) ? vat : null, date: /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : cur.date, merchant: clean(b.merchant ?? cur.merchant, 80) || null, paid: b.paid === "perso" ? "perso" : "carte", edited: true };
        }
        const { error } = await db.from("tour_events").update({ data: next }).eq("id", ev.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, ticket: next });
      }
      if (b.action === "admin_delete_test") {
        const id = Number(b.id);
        const { data: m } = await db.from("team_members").select("id,is_test").eq("id", id).maybeSingle();
        if (!m?.is_test) return NextResponse.json({ ok: false, error: "Seuls les comptes de test peuvent être supprimés ici." }, { status: 400 });
        const { data: files } = await db.from("driver_documents").select("path").eq("member_id", id);
        const { data: invs } = await db.from("driver_invoices").select("pdf_path").eq("member_id", id);
        const paths = [...(files || []).map(f => f.path), ...(invs || []).map(f => f.pdf_path)].filter(Boolean) as string[];
        if (paths.length) await db.storage.from(DRIVER_BUCKET).remove(paths);
        await db.from("driver_invoices").delete().eq("member_id", id);
        await db.from("driver_documents").delete().eq("member_id", id);
        await db.from("team_sessions").update({ ended_at: new Date().toISOString() }).eq("member_id", id).is("ended_at", null);
        const { error } = await db.from("team_members").delete().eq("id", id).eq("is_test", true);
        if (error) { await db.from("team_members").update({ active: false, revoked_at: new Date().toISOString() }).eq("id", id); return NextResponse.json({ ok: true, revoked_only: true }); }
        return NextResponse.json({ ok: true });
      }
      if (b.action === "admin_resend_code") {
        // Nouveau code personnel envoyé par SMS (l'ancien ne marche plus) ; le code n'est jamais affiché ici.
        const id = Number(b.id);
        const { data: m } = await db.from("team_members").select("id,name,phone,role").eq("id", id).maybeSingle();
        if (!m || m.role !== "livreur" || !m.phone) return NextResponse.json({ ok: false, error: "Livreur introuvable ou sans téléphone." }, { status: 400 });
        await applyStoredSecrets();
        if (!brevoReady()) return NextResponse.json({ ok: false, error: "Envoi SMS indisponible (Brevo non configuré)" }, { status: 503 });
        const code = newCode();
        await db.from("team_members").update({ code_hash: sha(code), active: true, revoked_at: null }).eq("id", id);
        const first = String(m.name || "").split(/\s+/)[0];
        await sendSms(m.phone, `Bonjour ${first}, voici votre nouveau code NeoDrive (livreur) : ${code}. Ouvrez ${SITE}/organisation puis « Espace livreur ».`, "transactional");
        return NextResponse.json({ ok: true });
      }
      if (b.action === "admin_invite") {
        const name = clean(b.name, 80); if (name.length < 2) return NextResponse.json({ ok: false, error: "Nom manquant" }, { status: 400 });
        const phone = clean(b.phone, 30), email = clean(b.email, 160);
        const days = Math.min(Math.max(Number(b.days) || 90, 1), 365); const code = newCode();
        const { data, error } = await db.from("team_members").insert({ name, role: "livreur", phone: phone || null, email: email || null, code_hash: sha(code), expires_at: new Date(Date.now() + days * 86400e3).toISOString(), can_see_numbers: true, max_views_per_hour: 60, note: "Livreur prestataire (invitation espace livreur)", sections: ["livreur"] }).select("id").single();
        if (error) throw new Error(error.message);
        const first = name.split(/\s+/)[0];
        const text = `Bonjour ${first}, voici votre accès NeoDrive (livreur) : ${SITE}/organisation - code personnel : ${code}. Ouvrez « Espace livreur » pour déposer vos documents et signer votre contrat.`;
        const sent = { sms: false, email: false, errors: [] as string[] };
        await applyStoredSecrets();
        if (brevoReady()) {
          if (phone) { try { sent.sms = !!(await sendSms(phone, text, "transactional")); } catch (e) { sent.errors.push("SMS : " + (e as Error).message); } }
          if (email) { try { sent.email = !!(await sendEmail(email, name, "Votre accès NeoDrive (espace livreur)", `<p>Bonjour ${esc(first)},</p><p>Voici votre accès à l'espace livreur NeoDrive.</p><p>1. Ouvrez <a href="${SITE}/organisation">${SITE}/organisation</a><br>2. Entrez votre code personnel : <b style="font-size:18px;letter-spacing:2px">${esc(code)}</b><br>3. Ouvrez « Espace livreur » : déposez vos documents (SIRET, assurance RC pro, permis, pièce d'identité, RIB) et signez votre contrat.</p><p>Ce code est personnel : ne le communiquez à personne.</p><p>À bientôt,<br>Mansour - NeoDrive</p>`)); } catch (e) { sent.errors.push("E-mail : " + (e as Error).message); } }
        } else sent.errors.push("Envoi automatique indisponible (Brevo non configuré)");
        return NextResponse.json({ ok: true, id: data.id, code, text, sent });
      }
      return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
    }

    // ── Livreur connecté (section « livreur ») ou fondateur
    const acc = await authorizeSection(req, b.passcode, "livreur");
    if (!acc) return NextResponse.json({ ok: false, error: "Connectez-vous avec votre code personnel." }, { status: 401 });
    const memberId = acc.who === "member" ? acc.member.id : null;
    const name = acc.who === "member" ? acc.member.name : null;
    // Compte de test (is_test) : voit toutes les tournées, comme le fondateur, pour essayer le parcours complet
    const tourName = acc.who === "member" && (acc.member as { is_test?: boolean }).is_test ? null : name;

    if (b.action === "me") {
      const docs = memberId ? await latestDocs(db, memberId) : {};
      const { data: mb } = memberId ? await db.from("team_members").select("billing").eq("id", memberId).maybeSingle() : { data: null };
      return NextResponse.json({ ok: true, who: acc.who, name: acc.name, kinds: DOC_KINDS, required: REQUIRED_DOCS, docs: Object.fromEntries([...DOC_KINDS.map(k => k.id), "contrat"].map(k => [k, publicDoc(docs[k])])), contractVersion: CONTRACT_VERSION, billing: (mb?.billing || null) as Billing | null });
    }
    if (b.action === "reservations") {
      const { data, error } = await db.from("reservations").select("id,prenom,nom,ville,code_postal,departement,telephone,statut,date_promise,modele,priorite").in("statut", ["Nouvelle", "Confirmée", "Planifiée"]).order("date_promise", { ascending: true, nullsFirst: false }).limit(500);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, reservations: data || [] });
    }
    if (b.action === "tours") {
      const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => isMine(t, tourName) && (t.status !== "brouillon" || (t.stops?.length ?? 0) > 0)).sort((a, z) => String(a.date).localeCompare(String(z.date))).slice(0, 30);
      const need = new Set(tours.flatMap(t => t.clientIds));
      const clients = new Map((need.size ? await listJson<PlanClient>(db, PLAN_CLIENTS) : []).filter(c => need.has(c.id)).map(c => [c.id, c]));
      return NextResponse.json({ ok: true, tours: tours.map(t => { const k = t.status === "brouillon" ? null : driverKey(t.id); return { id: t.id, name: t.name, date: t.date, departTime: t.departTime || "", driver: t.driver, status: t.status, clients: t.clientIds.length, km: t.km || 0, closed_at: t.closed_at || null, en_route: (t.en_route || []).length, link: k ? `/chauffeur?k=${encodeURIComponent(k)}` : null, plan: driverPlan(t, clients) }; }) });
    }
    // ── Livraisons : numéro de série (VIN) + accusé de réception signé par le client
    if (b.action === "deliveries") {
      const since = new Date(Date.now() - 3 * 86400e3).toISOString();
      const { data, error } = await db.from("reservations").select("id,prenom,nom,adresse,code_postal,ville,telephone,email,modele,couleur,statut,date_promise,vin,vin_photo_path,paiement_confirme_at,livre_at,accuse_token,confirm_sent_at,remote_confirm,paiement_en_attente,montant_du,prevenu_at,total,remise_data").or(`statut.in.(Confirmée,Planifiée),livre_at.gte.${since}`).order("date_promise", { ascending: true, nullsFirst: false }).limit(200);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, deliveries: (data || []).map(r => ({ ...r, email: undefined, has_email: !!r.email, has_vin_photo: !!r.vin_photo_path, vin_photo_path: undefined, accuse_url: r.accuse_token ? `${SITE}/api/accuse/${r.accuse_token}` : null, accuse_token: undefined, remote_confirmed: !!r.remote_confirm, remote_confirm: undefined })), checks: checksFor(false), checks_pending: checksFor(true) });
    }
    if (b.action === "free_vins") {
      const [{ data: sv }, { data: used }] = await Promise.all([db.from("shipment_vehicles").select("vin,container,status,client_name").neq("status", "livrée").order("vin").limit(500), db.from("reservations").select("vin").not("vin", "is", null)]);
      const taken = new Set((used || []).map(x => x.vin));
      return NextResponse.json({ ok: true, vins: (sv || []).filter(v => !taken.has(v.vin) && !v.client_name).map(v => ({ vin: v.vin, container: v.container, status: v.status })) });
    }
    if (b.action === "vin_photo_url") {
      const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "Livraison inconnue" }, { status: 400 });
      const ext = String(b.ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      if (!["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return NextResponse.json({ ok: false, error: "Envoyez une photo (JPG ou PNG)." }, { status: 400 });
      const path = `${RECEIPT_FOLDER}/${id}/vin-${Date.now()}.${ext}`;
      const { data, error } = await db.storage.from(DRIVER_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: DRIVER_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "save_vin") {
      const id = Number(b.id); const vin = String(b.vin || "").toUpperCase().replace(/[\s-]/g, "");
      if (!id) return NextResponse.json({ ok: false, error: "Livraison inconnue" }, { status: 400 });
      if (!VIN_RE.test(vin)) return NextResponse.json({ ok: false, error: "Numéro de série invalide : 17 caractères, lettres et chiffres, sans I, O ni Q." }, { status: 400 });
      const photo = clean(b.photo_path, 300);
      if (photo && (!photo.startsWith(`${RECEIPT_FOLDER}/${id}/`) || photo.includes(".."))) return NextResponse.json({ ok: false, error: "Photo invalide" }, { status: 400 });
      const { data: r } = await db.from("reservations").select("id,prenom,nom,statut,vin_photo_path").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      const { data: dup } = await db.from("reservations").select("id,prenom,nom").eq("vin", vin).neq("id", id).limit(1);
      if (dup?.length) return NextResponse.json({ ok: false, error: `Ce numéro de série est déjà attribué à ${dup[0].prenom} ${dup[0].nom}. Vérifiez la plaque.` }, { status: 409 });
      const { error } = await db.from("reservations").update({ vin, ...(photo ? { vin_photo_path: photo } : {}), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      await db.from("shipment_vehicles").update({ client_name: `${r.prenom} ${r.nom}`.trim(), ...(photo ? { plate_photo: photo } : {}), updated_at: new Date().toISOString() }).eq("vin", vin);
      await logSection(acc, "livraison_vin", { id, vin });
      return NextResponse.json({ ok: true, vin });
    }
    if (b.action === "sign") {
      const id = Number(b.id);
      const { data: r } = await db.from("reservations").select("*").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      if (r.accuse_token) return NextResponse.json({ ok: false, error: "Cette livraison est déjà confirmée." }, { status: 409 });
      if (!r.vin) return NextResponse.json({ ok: false, error: "Enregistrez d'abord le numéro de série (VIN)." }, { status: 400 });
      if (!r.paiement_confirme_at && !r.paiement_en_attente) return NextResponse.json({ ok: false, error: "Le paiement n'est pas encore confirmé par NeoDrive. Ne remettez pas les clés : appelez Mansour." }, { status: 409 });
      const signer = clean(b.signer, 120);
      if (signer.length < 3) return NextResponse.json({ ok: false, error: "Le client doit écrire son nom et prénom." }, { status: 400 });
      const sigUrl = String(b.signature || "");
      const m = sigUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!m || m[1].length < 800) return NextResponse.json({ ok: false, error: "Le client doit signer dans le cadre." }, { status: 400 });
      if (m[1].length > 900_000) return NextResponse.json({ ok: false, error: "Signature trop lourde, recommencez." }, { status: 400 });
      const pending = !r.paiement_confirme_at && !!r.paiement_en_attente;
      const checksIn = (b.checks || {}) as Record<string, unknown>;
      const checks = Object.fromEntries(checksFor(pending).map(c => [c.id, !!checksIn[c.id]]));
      const at = new Date().toISOString();
      const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
      const data: ReceiptData = {
        numero: `LIV-${at.slice(0, 4)}-${String(id).padStart(6, "0")}`,
        client: `${r.prenom || ""} ${r.nom || ""}`.trim(), adresse: [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", "),
        telephone: r.telephone || "", email: r.email || "", modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin,
        checks, reserves: clean(b.reserves, 600), signer, signed_at: at, livreur: name || acc.name || "NeoDrive",
        paiement_confirme_at: r.paiement_confirme_at, lat: num(b.lat), lng: num(b.lng), mode: "signature",
        pending: pending ? { montant_du: r.montant_du == null ? null : Number(r.montant_du) } : null,
      };
      const out = await finalizeDelivery(db, r, data, Buffer.from(m[1], "base64"));
      await logSection(acc, "livraison_accuse", { id, vin: r.vin, pending });
      return NextResponse.json({ ok: true, ...out });
    }
    // Livraison avec paiement en attente : le livreur peut l'activer, jamais confirmer un paiement.
    if (b.action === "pending_mode") {
      const id = Number(b.id);
      const { data: r } = await db.from("reservations").select("id,prenom,nom,total,paiement_confirme_at,accuse_token,notes").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      if (r.accuse_token) return NextResponse.json({ ok: false, error: "Cette livraison est déjà confirmée." }, { status: 409 });
      if (r.paiement_confirme_at) return NextResponse.json({ ok: false, error: "Le paiement est déjà confirmé : livraison normale." }, { status: 409 });
      const on = !!b.on;
      const montant = Number(String(b.montant_du ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
      const kept = { cles: !!(b.kept as Record<string, unknown>)?.cles, documents: !!(b.kept as Record<string, unknown>)?.documents };
      if (on && (!kept.cles || !kept.documents)) return NextResponse.json({ ok: false, error: "Cochez que vous gardez les clés et les documents du véhicule." }, { status: 400 });
      const at = new Date().toISOString();
      const line = `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] ${on ? `Livraison avec paiement en attente (${name || acc.name}) : clés et documents gardés par le livreur` : "Paiement en attente annulé"}`;
      const { error } = await db.from("reservations").update({ paiement_en_attente: on, montant_du: on ? (Number.isFinite(montant) && montant > 0 ? montant : r.total ?? null) : null, remise_data: on ? { kept, by: name || acc.name, at } : null, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at }).eq("id", id);
      if (error) throw new Error(error.message);
      await logSection(acc, "livraison_paiement_attente", { id, on });
      return NextResponse.json({ ok: true });
    }
    // Accusé confirmé à distance : lien personnel envoyé au client par SMS (et e-mail si connu).
    if (b.action === "send_confirm") {
      const id = Number(b.id);
      const { data: r } = await db.from("reservations").select("id,prenom,nom,telephone,email,vin,modele,paiement_confirme_at,paiement_en_attente,accuse_token,confirm_token,notes").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      if (r.accuse_token) return NextResponse.json({ ok: false, error: "Cette livraison est déjà confirmée." }, { status: 409 });
      if (!r.vin) return NextResponse.json({ ok: false, error: "Enregistrez d'abord le numéro de série (VIN)." }, { status: 400 });
      if (!r.paiement_confirme_at && !r.paiement_en_attente) return NextResponse.json({ ok: false, error: "Le paiement n'est pas encore confirmé par NeoDrive : appelez Mansour avant de remettre le véhicule." }, { status: 409 });
      if (!r.telephone && !r.email) return NextResponse.json({ ok: false, error: "Ni téléphone ni e-mail pour ce client : faites signer sur votre téléphone." }, { status: 400 });
      const token = r.confirm_token || randomBytes(24).toString("hex");
      const link = `${SITE}/accuse/confirmer/${token}`;
      const first = String(r.prenom || "").split(/\s+/)[0];
      const sent = { sms: false, email: false, errors: [] as string[] };
      await applyStoredSecrets();
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Envoi indisponible (Brevo non configuré) : faites signer sur votre téléphone." }, { status: 503 });
      if (r.telephone) { try { sent.sms = !!(await sendSms(r.telephone, `Bonjour ${first}, NeoDrive : merci de confirmer la reception de votre vehicule en 30 secondes sur ce lien : ${link}`, "transactional")); } catch (e) { sent.errors.push("SMS : " + (e as Error).message); } }
      if (r.email) { try { sent.email = !!(await sendEmail(r.email, `${r.prenom || ""} ${r.nom || ""}`.trim(), "Confirmez la réception de votre NeoDrive", `<p>Bonjour ${esc(first)},</p><p>Votre NeoDrive ${esc(r.modele || "")} (n° de série ${esc(r.vin)}) vient de vous être remise. Merci de confirmer sa réception en 30 secondes :</p><p><a href="${link}" style="display:inline-block;background:#e8592a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Je confirme la réception</a></p><p>Vous recevrez ensuite votre accusé de réception en PDF.</p><p>Merci,<br>Mansour - NeoDrive</p>`)); } catch (e) { sent.errors.push("E-mail : " + (e as Error).message); } }
      if (!sent.sms && !sent.email) return NextResponse.json({ ok: false, error: "Envoi impossible : " + sent.errors.join(" · ") }, { status: 502 });
      const at = new Date().toISOString();
      await db.from("reservations").update({ confirm_token: token, confirm_sent_at: at, updated_at: at }).eq("id", id);
      await logSection(acc, "livraison_lien_accuse", { id });
      const wa = r.telephone ? `https://wa.me/${intlPhone(r.telephone)}?text=${encodeURIComponent(`Bonjour ${first}, merci de confirmer la réception de votre NeoDrive sur ce lien : ${link}`)}` : null;
      return NextResponse.json({ ok: true, sent, whatsapp: wa });
    }
    if (b.action === "confirm_status") {
      const { data: r } = await db.from("reservations").select("id,accuse_token,remote_confirm").eq("id", Number(b.id)).maybeSingle();
      return NextResponse.json({ ok: true, confirmed: !!r?.accuse_token, remote: !!r?.remote_confirm, url: r?.accuse_token ? `${SITE}/api/accuse/${r.accuse_token}` : null });
    }
    // Prévenir le client de la livraison (déclenchement manuel uniquement).
    if (b.action === "notify_client") {
      const id = Number(b.id); const date = clean(b.date, 10); const from = clean(b.from, 5), to = clean(b.to, 5);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return NextResponse.json({ ok: false, error: "Indiquez la date et le créneau." }, { status: 400 });
      const { data: r } = await db.from("reservations").select("id,prenom,telephone,notes").eq("id", id).maybeSingle();
      if (!r?.telephone) return NextResponse.json({ ok: false, error: "Pas de téléphone pour ce client." }, { status: 400 });
      const jour = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
      const h = (x: string) => x.replace(":00", "h").replace(":", "h");
      const first = String(r.prenom || "").split(/\s+/)[0];
      const text = `Bonjour ${first}, NeoDrive : votre voiture sans permis vous sera livree le ${jour} entre ${h(from)} et ${h(to)}. Merci d'etre present(e) et de prevoir le virement instantane. Une question : 06 89 78 17 10.`;
      await applyStoredSecrets();
      if (!brevoReady()) return NextResponse.json({ ok: false, error: "Envoi indisponible (Brevo non configuré)." }, { status: 503 });
      await sendSms(r.telephone, text);
      const at = new Date().toISOString();
      const line = `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Client prévenu par SMS : livraison le ${jour} entre ${h(from)} et ${h(to)} (${name || acc.name})`;
      await db.from("reservations").update({ prevenu_at: at, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at }).eq("id", id);
      await logSection(acc, "livraison_client_prevenu", { id, date });
      return NextResponse.json({ ok: true, text });
    }

    if (!memberId) return NextResponse.json({ ok: false, error: "Le dépôt de documents se fait depuis le compte du livreur." }, { status: 403 });

    if (b.action === "upload_url") {
      if (!isDocKind(b.kind) || b.kind === "contrat") return NextResponse.json({ ok: false, error: "Type de document inconnu" }, { status: 400 });
      const ext = String(b.ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      if (!["jpg", "jpeg", "png", "webp", "heic", "pdf"].includes(ext)) return NextResponse.json({ ok: false, error: "Format accepté : photo (JPG, PNG) ou PDF." }, { status: 400 });
      const path = `${memberId}/${b.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await db.storage.from(DRIVER_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: DRIVER_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "upload_done") {
      const path = clean(b.path, 300);
      if (!isDocKind(b.kind) || b.kind === "contrat" || !path.startsWith(`${memberId}/${b.kind}/`) || path.includes("..")) return NextResponse.json({ ok: false, error: "Document invalide" }, { status: 400 });
      const { error } = await db.from("driver_documents").insert({ member_id: memberId, kind: b.kind, path, filename: clean(b.filename, 160) || null, status: "recu" });
      if (error) throw new Error(error.message);
      await logSection(acc, "livreur_document", { kind: b.kind });
      return NextResponse.json({ ok: true });
    }
    // ── Coordonnées de facturation (IBAN contrôlé) et factures de fin de tournée
    if (b.action === "billing_save") {
      if (!memberId) return NextResponse.json({ ok: false, error: "Réservé au livreur." }, { status: 403 });
      const { b: bill, missing } = checkBilling(b as Billing);
      if (bill.iban && !ibanOk(bill.iban)) return NextResponse.json({ ok: false, error: "IBAN invalide : vérifiez-le (la clé de contrôle ne correspond pas)." }, { status: 400 });
      if (bill.siret && !siretOk(bill.siret)) return NextResponse.json({ ok: false, error: "SIRET invalide : 14 chiffres." }, { status: 400 });
      if (bill.bic && !bicOk(bill.bic)) return NextResponse.json({ ok: false, error: "BIC invalide : 8 ou 11 caractères." }, { status: 400 });
      const { error } = await db.from("team_members").update({ billing: { ...bill, updated_at: new Date().toISOString() } }).eq("id", memberId);
      if (error) throw new Error(error.message);
      await logSection(acc, "livreur_facturation", { complete: !missing.length });
      return NextResponse.json({ ok: true, missing });
    }
    if (b.action === "my_invoices") {
      if (!memberId) return NextResponse.json({ ok: true, invoices: [] });
      const { data } = await db.from("driver_invoices").select("id,tour_id,tour_name,number,status,worked_min,total,sent_at,paid_at,pdf_path").eq("member_id", memberId).order("seq", { ascending: false });
      const paths = (data || []).map(x => x.pdf_path).filter(Boolean) as string[];
      const urls: Record<string, string> = {};
      if (paths.length) { const { data: u } = await db.storage.from(DRIVER_BUCKET).createSignedUrls(paths, 1800); for (const x of u || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
      return NextResponse.json({ ok: true, invoices: (data || []).map(x => ({ ...x, pdf_path: undefined, url: x.pdf_path ? urls[x.pdf_path] || null : null })) });
    }
    // Tickets de dépenses en lot depuis l'espace livreur (photos rangées avec celles de la tournée)
    if (b.action === "ticket_upload_url" || b.action === "ticket_add") {
      const t = (await listJson<PlanTour>(db, PLAN_TOURS)).find(x => x.id === String(b.tour_id || ""));
      if (!t || !isMine(t, tourName) || t.status === "brouillon") return NextResponse.json({ ok: false, error: "Tournée introuvable." }, { status: 404 });
      if (b.action === "ticket_upload_url") {
        const path = `vehicles/${t.id}/ticket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
        if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
        return NextResponse.json({ ok: true, bucket: PHOTO_BUCKET, path: data.path, token: data.token });
      }
      const paths = (Array.isArray(b.paths) ? b.paths : []).map(String).filter(p => p.startsWith(`vehicles/${t.id}/`) && !p.includes(".."));
      if (!paths.length) return NextResponse.json({ ok: false, error: "Aucune photo reçue." }, { status: 400 });
      return NextResponse.json({ ok: true, ...(await addTickets(db, t.id, name || acc.name, paths)) });
    }
    if (b.action === "invoice_prepare" || b.action === "invoice_preview" || b.action === "invoice_send") {
      if (!memberId) return NextResponse.json({ ok: false, error: "La facture est faite par le livreur depuis son espace." }, { status: 403 });
      const t = (await listJson<PlanTour>(db, PLAN_TOURS)).find(x => x.id === String(b.tour_id || ""));
      if (!t || !isMine(t, tourName)) return NextResponse.json({ ok: false, error: "Tournée introuvable." }, { status: 404 });
      if (t.status === "brouillon") return NextResponse.json({ ok: false, error: "Tournée prévisionnelle : rien à facturer." }, { status: 400 });
      const [{ data: existing }, { data: mb }, docs] = await Promise.all([
        db.from("driver_invoices").select("id,number,status,total,sent_at,paid_at").eq("member_id", memberId).eq("tour_id", t.id).maybeSingle(),
        db.from("team_members").select("name,email,billing").eq("id", memberId).maybeSingle(),
        latestDocs(db, memberId),
      ]);
      const base = await tourBillingBase(db, t);
      const { b: bill, missing } = checkBilling((mb?.billing || {}) as Billing);
      const blockers = [...missing.map(m => `Profil de facturation : ${m}`)];
      if (!docs.rib || docs.rib.status === "refuse") blockers.push("RIB à déposer (onglet Mes documents)");
      if (!docs.contrat || docs.contrat.status === "refuse") blockers.push("Contrat à signer");
      const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
      const exp = { card: base.sum.card, perso: base.sum.refund, count: base.expenses.length, today: base.expenses.filter(e => e.created === todayStr).length, no_photo: base.expenses.filter(e => !e.photo).length, by_day: base.sum.days.filter(d => d.expenses.length).map(d => ({ date: d.date, n: d.expenses.length, card: d.card, perso: d.perso, flags: d.flags.filter(f => /repère|photo/.test(f)) })) };
      if (b.action === "invoice_prepare") {
        return NextResponse.json({ ok: true, tour: { id: t.id, name: t.name, date: t.date }, rate: base.rate, days: base.days, deliveries: base.deliveries, expenses: exp, planned: { h: base.planned_h, km: base.planned_km, stops: base.planned_stops }, existing: existing || null, blockers });
      }
      if (existing) return NextResponse.json({ ok: false, error: `Facture ${existing.number} déjà envoyée pour cette tournée.` }, { status: 409 });
      const { days, errors } = cleanDays(b.days);
      if (errors.length) return NextResponse.json({ ok: false, error: errors.join(" ") }, { status: 400 });
      const { worked_min, total } = invoiceTotal(days, base.rate);
      if (!worked_min) return NextResponse.json({ ok: false, error: "Aucune heure saisie." }, { status: 400 });
      const issued = new Date().toISOString();
      const driverName = mb?.name || name || "Livreur";
      const deliveries = base.deliveries.filter(d => d.delivered).map(({ client, vin, date, accuse }) => ({ client, vin, date, accuse }));
      const pdfData = { issued, driver: driverName, billing: bill, tour: `${t.name || t.id}${t.date ? " du " + new Date(t.date + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC" }) : ""}`, days, deliveries, rate: base.rate, worked_min, total };
      if (b.action === "invoice_preview") {
        const pdf = await invoicePdf({ ...pdfData, number: "APERÇU (numéro attribué à l'envoi)" });
        return NextResponse.json({ ok: true, worked_min, total, pdf: pdf.toString("base64"), blockers });
      }
      if (blockers.length) return NextResponse.json({ ok: false, error: "Avant d'envoyer la facture : " + blockers.join(" ; ") + "." }, { status: 400 });
      const ctl = control(base, days, worked_min, base.deliveries);
      // Numéro séquentiel propre au livreur (aucun trou : attribué seulement à l'envoi)
      let row: { id: number; number: string } | null = null;
      for (let attempt = 0; attempt < 3 && !row; attempt++) {
        const { data: last } = await db.from("driver_invoices").select("seq").eq("member_id", memberId).order("seq", { ascending: false }).limit(1);
        const seq = (last?.[0]?.seq || 0) + 1;
        const number = `${initials(driverName)}${memberId}-${issued.slice(0, 4)}-${String(seq).padStart(3, "0")}`;
        const ins = await db.from("driver_invoices").insert({ member_id: memberId, tour_id: t.id, tour_name: t.name || t.id, seq, number, status: "a_payer", days, deliveries, expenses: base.expenses, rate: base.rate, worked_min, amount_hours: total, amount_expenses: 0, total, control: ctl, billing: bill, sent_at: issued }).select("id,number").single();
        if (ins.error) { if (/member_id, tour_id|driver_invoices_member_id_tour_id/.test(ins.error.message)) return NextResponse.json({ ok: false, error: "Facture déjà envoyée pour cette tournée." }, { status: 409 }); if (!/duplicate/.test(ins.error.message)) throw new Error(ins.error.message); }
        else row = ins.data;
      }
      if (!row) throw new Error("Numérotation de la facture impossible, réessayez.");
      const pdf = await invoicePdf({ ...pdfData, number: row.number });
      const path = `${INVOICE_FOLDER}/${memberId}/${row.number}.pdf`;
      const up = await db.storage.from(DRIVER_BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (up.error) throw new Error("Enregistrement du PDF impossible : " + up.error.message);
      await db.from("driver_invoices").update({ pdf_path: path }).eq("id", row.id);
      const sent = { email: false, sms: false };
      await applyStoredSecrets();
      if (brevoReady()) {
        const first = driverName.split(/\s+/)[0];
        const att = [{ name: `Facture-${row.number}.pdf`, content: pdf.toString("base64") }];
        const html = `<p>Bonjour ${esc(first)},</p><p>Voici votre facture <b>${esc(row.number)}</b> pour la tournée ${esc(t.name || t.id)} : ${esc(hmTxt(worked_min))} de travail, <b>${esc(eurTxt(total))}</b> (TVA non applicable, art. 293 B du CGI).</p><p>Elle est établie par MK HOLDING en votre nom (mandat d'autofacturation, article 11 de votre contrat). Vous avez 15 jours pour la contester en répondant à cet e-mail. Le paiement est fait par virement sur votre compte ${esc(fmtIban(bill.iban || "").slice(0, 9))}…</p><p>Merci pour cette tournée !<br>Mansour - NeoDrive</p>`;
        try { sent.email = !!(await sendEmail(mb?.email || OWNER_EMAIL, driverName, `Facture ${row.number} - tournée ${t.name || t.id}`, html, att, mb?.email ? { cc: [OWNER_EMAIL], replyTo: OWNER_EMAIL } : undefined)); } catch (e) { console.error("[LIVREUR] e-mail facture", e); }
        try { sent.sms = !!(await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", controlSms(driverName, t.name || t.id, row.number, total, ctl))); } catch (e) { console.error("[LIVREUR] SMS contrôle", e); }
      }
      await logSection(acc, "livreur_facture", { number: row.number, total, tour: t.id });
      return NextResponse.json({ ok: true, number: row.number, total, worked_min, sent, emailed_to_driver: !!mb?.email, control: ctl });
    }
    if (b.action === "contract_sign") {
      const signed = clean(b.signed_name, 120);
      if (signed.length < 3 || !b.accept) return NextResponse.json({ ok: false, error: "Écrivez votre nom complet et cochez la case." }, { status: 400 });
      const at = new Date().toISOString();
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
      const { error } = await db.from("driver_documents").insert({ member_id: memberId, kind: "contrat", path: null, filename: `Contrat de prestation v${CONTRACT_VERSION}`, status: "recu", data: { signed_name: signed, signed_at: at, version: CONTRACT_VERSION, ip, ua: clean(req.headers.get("user-agent"), 200), member_name: name, rate: 25 } });
      if (error) throw new Error(error.message);
      await logSection(acc, "livreur_contrat_signe", { version: CONTRACT_VERSION });
      return NextResponse.json({ ok: true, signed_at: at });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[LIVREUR]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
