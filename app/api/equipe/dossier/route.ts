import { NextResponse } from "next/server";
import { applyStoredSecrets, isAuthorized } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../../lib/brevo";
import { TEAM_COOKIE, logActivity, teamSession } from "../../../../lib/team";
import { bicOk, fmtIban, ibanOk } from "../../../../lib/driver-invoice-shared";
import { DOSSIER_DOCS, eur, frDate, invoiceBlockers, monthLabel, parisDay, type Adjustment, type Profile, type Statement } from "../../../../lib/team-pay";
import { TEAM_BUCKET, memberMonths, teamInvoicePdf, type MonthView } from "../../../../lib/team-pay-server";

/**
 * Espace équipe : « Mon dossier » (identité, adresse, banque, pièces) et « Mes factures » (relevé et facture du mois).
 * POST { action, ... } — membre : cookie d'équipe. Fondateur : { passcode, action: "admin_*" }.
 * Fichiers : bucket privé « team-docs », dépôt par URL signée, lecture par URL signée de courte durée.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Db = ReturnType<typeof crmDatabase>;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const deny = () => { const r = NextResponse.json({ ok: false, error: "Session expirée : reconnectez-vous.", logout: true }, { status: 401 }); r.cookies.set(TEAM_COOKIE, "", { path: "/", maxAge: 0 }); return r; };
const clean = (v: unknown, n = 300) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const DOC_IDS = DOSSIER_DOCS.map(d => d.id) as string[];
const EXT = ["jpg", "jpeg", "png", "webp", "heic", "pdf"];

async function getProfile(db: Db, memberId: number): Promise<Profile | null> {
  const { data, error } = await db.from("team_member_profile").select("*").eq("member_id", memberId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}
async function signed(db: Db, paths: string[], ttl = 600) {
  const urls: Record<string, string> = {};
  if (paths.length) { const { data } = await db.storage.from(TEAM_BUCKET).createSignedUrls(paths, ttl); for (const x of data || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
  return urls;
}
/** Relevés pour l'affichage (sans chemins internes), avec lien PDF signé pour les factures envoyées. */
async function monthsOut(db: Db, months: MonthView[], ttl = 600) {
  const urls = await signed(db, months.map(m => m.pdf_path).filter(Boolean) as string[], ttl);
  return months.map(({ pdf_path, ...m }) => ({ ...m, pdf_url: pdf_path ? urls[pdf_path] || null : null }));
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const db = crmDatabase();
  try {
    if (typeof b.action === "string" && b.action.startsWith("admin_")) {
      if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return fail("Code fondateur incorrect.", 401);
      return await admin(db, b);
    }
    const ctx = await teamSession(req); if (!ctx) return deny();
    const m = ctx.member as typeof ctx.member & { pay_terms?: unknown; email?: string | null };
    const mid = m.id;

    if (b.action === "me") {
      const p = await getProfile(db, mid);
      const docs = Object.fromEntries(Object.entries(p?.docs || {}).map(([k, v]) => [k, { filename: v.filename || null, uploaded_at: v.uploaded_at }]));
      return NextResponse.json({ ok: true, name: m.name, has_pay: !!m.pay_terms, profile: { full_name: p?.full_name || "", address: p?.address || "", ae_number: p?.ae_number || "", email: p?.email || m.email || "", bank_holder: p?.bank_holder || "", bank_name: p?.bank_name || "", iban: p?.iban || "", rib: p?.rib || "", bic: p?.bic || "" }, docs, blockers: invoiceBlockers(p) });
    }

    if (b.action === "save") {
      const f = { full_name: clean(b.full_name, 120), address: clean(b.address, 400), ae_number: clean(b.ae_number, 60), email: clean(b.email, 160).toLowerCase(), bank_holder: clean(b.bank_holder, 120), bank_name: clean(b.bank_name, 120), iban: clean(b.iban, 50).toUpperCase().replace(/\s+/g, ""), rib: clean(b.rib, 60).replace(/\s+/g, " "), bic: clean(b.bic, 15).toUpperCase().replace(/\s+/g, "") };
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return fail("Adresse e-mail invalide.");
      if (f.iban && !ibanOk(f.iban)) return fail("IBAN invalide : vérifiez-le (la clé de contrôle ne correspond pas). Si votre banque n'a pas d'IBAN, laissez ce champ vide et remplissez RIB + SWIFT/BIC.");
      if (f.bic && !bicOk(f.bic)) return fail("Code SWIFT/BIC invalide : 8 ou 11 lettres et chiffres.");
      const { error } = await db.from("team_member_profile").upsert({ member_id: mid, ...f, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
      if (error) throw new Error(error.message);
      await logActivity(mid, "dossier_save");
      return NextResponse.json({ ok: true, blockers: invoiceBlockers(f) });
    }

    if (b.action === "upload_url") {
      if (!DOC_IDS.includes(String(b.kind))) return fail("Type de pièce inconnu.");
      const ext = String(b.ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      if (!EXT.includes(ext)) return fail("Format accepté : photo (JPG, PNG) ou PDF.");
      const path = `profile/${mid}/${b.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await db.storage.from(TEAM_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return fail("Stockage indisponible, réessayez dans un instant.", 502);
      return NextResponse.json({ ok: true, bucket: TEAM_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "upload_done") {
      const kind = String(b.kind); const path = clean(b.path, 300);
      if (!DOC_IDS.includes(kind) || !path.startsWith(`profile/${mid}/${kind}/`) || path.includes("..")) return fail("Pièce invalide.");
      const p = await getProfile(db, mid);
      const docs = { ...(p?.docs || {}), [kind]: { path, filename: clean(b.filename, 160) || null, uploaded_at: new Date().toISOString() } };
      const { error } = await db.from("team_member_profile").upsert({ member_id: mid, docs, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
      if (error) throw new Error(error.message);
      await logActivity(mid, "dossier_document", null, { kind });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "doc_url") {
      const p = await getProfile(db, mid); const d = p?.docs?.[String(b.kind)];
      if (!d) return fail("Pièce non déposée.", 404);
      const urls = await signed(db, [d.path], 300);
      return NextResponse.json({ ok: true, url: urls[d.path] || null });
    }

    if (!m.pay_terms) return fail("Aucune facturation mensuelle n'est prévue pour votre accès.", 404);

    if (b.action === "invoices") {
      const [mm, p] = await Promise.all([memberMonths(db, mid, m.pay_terms), getProfile(db, mid)]);
      if (!mm) return fail("Conditions de rémunération incomplètes : prévenez Mansour.", 500);
      // Numéro proposé : « AAAA-MM-NNN », à la suite des numéros déjà utilisés (le même s'il faut renvoyer une facture).
      let seq = mm.sentCount; const suggest: Record<string, string> = {};
      for (const v of [...mm.months].reverse()) if (v.status === "brouillon") suggest[v.month] = v.number || `${v.month}-${String(++seq).padStart(3, "0")}`;
      return NextResponse.json({ ok: true, today: parisDay(), months: await monthsOut(db, mm.months, 1800), suggest, blockers: invoiceBlockers(p), terms: mm.terms });
    }

    if (b.action === "invoice_preview" || b.action === "invoice_send") {
      const month = String(b.month || "");
      const [mm, p] = await Promise.all([memberMonths(db, mid, m.pay_terms), getProfile(db, mid)]);
      const v = mm?.months.find(x => x.month === month);
      if (!mm || !v) return fail("Mois introuvable.", 404);
      if (v.status !== "brouillon") return fail(v.status === "payee" ? "Cette facture est déjà payée." : "Cette facture est déjà envoyée.", 409);
      const today = parisDay();
      const number = clean(b.number, 30);
      if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{2,29}$/.test(number)) return fail("Numéro de facture : 3 à 30 caractères, lettres, chiffres et tirets (ex. 2026-11-001).");
      const other = Object.values(mm.rows).find(r => r.number === number && r.month !== month);
      if (other) return fail(`Le numéro ${number} est déjà utilisé pour ${monthLabel(other.month)}. Choisissez le numéro suivant.`, 409);
      const sig = String(b.signature || "");
      const sigBuf = /^data:image\/png;base64,/.test(sig) ? Buffer.from(sig.split(",")[1], "base64") : null;
      const pdfData = { number, issued: today, month, profile: p || {}, memberName: m.name, st: v.statement, signature: sigBuf };
      if (b.action === "invoice_preview") return NextResponse.json({ ok: true, pdf: (await teamInvoicePdf(pdfData)).toString("base64") });
      if (today < v.can_send_from) return fail(`Vous pourrez envoyer la facture de ${v.label} à partir du ${frDate(v.can_send_from)} (dernier jour du mois).`, 409);
      const blockers = invoiceBlockers(p);
      if (blockers.length) return fail(`Avant d'envoyer votre facture, complétez « Mon dossier » : ${blockers.join(", ")}.`);
      if (!sigBuf || sigBuf.length < 500 || sigBuf.length > 800_000) return fail("Signez avec le doigt dans le cadre avant d'envoyer.");
      const pdf = await teamInvoicePdf(pdfData);
      const safe = number.replace(/[^A-Za-z0-9_-]/g, "-");
      const base = `invoices/${mid}/${month}-${safe}-${Date.now()}`;
      const up1 = await db.storage.from(TEAM_BUCKET).upload(`${base}.pdf`, pdf, { contentType: "application/pdf", upsert: true });
      if (up1.error) throw new Error("Enregistrement du PDF impossible : " + up1.error.message);
      await db.storage.from(TEAM_BUCKET).upload(`${base}-signature.png`, sigBuf, { contentType: "image/png", upsert: true });
      const at = new Date().toISOString();
      const row = { member_id: mid, month, status: "envoyee", number, statement: v.statement, total: v.statement.total, pdf_path: `${base}.pdf`, signature_path: `${base}-signature.png`, sent_at: at, resend: false, updated_at: at };
      const { error } = await db.from("team_invoices").upsert(row, { onConflict: "member_id,month" });
      if (error) { if (/team_invoices_member_number/.test(error.message)) return fail("Ce numéro de facture est déjà utilisé.", 409); throw new Error(error.message); }
      await logActivity(mid, "invoice_sent", null, { month, number, total: v.statement.total });
      let emailed = false;
      await applyStoredSecrets();
      if (brevoReady()) {
        const name = p?.full_name || m.name;
        const html = `<p>Bonjour Mansour,</p><p><b>${esc(name)}</b> vient d'envoyer sa facture <b>${esc(number)}</b> pour ${esc(v.label)} : <b>${esc(eur(v.statement.total))}</b>, à payer le ${esc(frDate(v.due))} par virement${p?.iban ? ` (IBAN ${esc(fmtIban(p.iban).slice(0, 9))}…)` : ""}.</p><ul>${v.statement.lines.map(l => `<li>${esc(l.label)} : ${l.amount == null ? "—" : esc(eur(l.amount))}</li>`).join("")}</ul><p><a href="https://www.easydrive-auto.fr/equipe-paie">Voir le relevé et marquer « payée »</a></p>`;
        const cc = p?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? [p.email] : [];
        try { emailed = !!(await sendEmail(OWNER_EMAIL, "Mansour", `🧾 Facture ${number} de ${name} (${v.label}) : ${eur(v.statement.total)}`, html, [{ name: `Facture-${safe}.pdf`, content: pdf.toString("base64") }], { cc })); } catch (e) { console.error("[EQUIPE] e-mail facture", e); }
      }
      return NextResponse.json({ ok: true, emailed });
    }

    return fail("Action inconnue");
  } catch (e) {
    console.error("[EQUIPE DOSSIER]", e);
    return fail((e as Error).message || "Erreur serveur", 500);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function admin(db: Db, b: Record<string, any>) {
  if (b.action === "admin_list") {
    const [{ data: members, error: e1 }, { data: profiles, error: e2 }] = await Promise.all([
      db.from("team_members").select("id,name,role,active,revoked_at,is_test,pay_terms,email").order("id"),
      db.from("team_member_profile").select("*"),
    ]);
    if (e1 || e2) throw new Error((e1 || e2)!.message);
    const prof = Object.fromEntries((profiles || []).map(p => [p.member_id, p as Profile & { updated_at: string }]));
    const list = (members || []).filter(x => x.pay_terms || prof[x.id]);
    const out = [];
    for (const x of list) {
      const p = prof[x.id] || null;
      const docPaths = Object.values(p?.docs || {}).map(d => (d as { path: string }).path);
      const urls = await signed(db, docPaths, 600);
      const mm = x.pay_terms ? await memberMonths(db, x.id, x.pay_terms) : null;
      out.push({
        id: x.id, name: x.name, role: x.role, active: x.active && !x.revoked_at, is_test: x.is_test, terms: mm?.terms || null,
        profile: p ? { ...p, docs: undefined } : null,
        docs: Object.fromEntries(DOSSIER_DOCS.map(d => { const v = p?.docs?.[d.id]; return [d.id, v ? { filename: v.filename || null, uploaded_at: v.uploaded_at, url: urls[v.path] || null } : null]; })),
        blockers: invoiceBlockers(p),
        months: mm ? await monthsOut(db, mm.months) : [], excluded: mm?.excluded || [],
      });
    }
    return NextResponse.json({ ok: true, today: parisDay(), members: out });
  }

  const mid = Number(b.member_id); const month = String(b.month || "");
  if (!mid || !/^\d{4}-\d{2}$/.test(month)) return fail("Membre ou mois manquant.");
  const { data: mem } = await db.from("team_members").select("id,name,pay_terms").eq("id", mid).maybeSingle();
  if (!mem?.pay_terms) return fail("Ce membre n'a pas de conditions de rémunération.", 404);
  const { data: cur } = await db.from("team_invoices").select("*").eq("member_id", mid).eq("month", month).maybeSingle();
  const at = new Date().toISOString();

  if (b.action === "admin_adjust" || b.action === "admin_adjust_delete") {
    if (cur?.status === "payee") return fail("Facture déjà payée : ajoutez l'ajustement sur le mois suivant.", 409);
    let adj = (cur?.adjustments || []) as Adjustment[];
    if (b.action === "admin_adjust") {
      const label = clean(b.label, 200); const amount = Math.round(Number(String(b.amount ?? "").replace(",", ".")) * 100) / 100;
      if (label.length < 3) return fail("Indiquez la raison de l'ajustement.");
      if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 10000) return fail("Montant invalide (ex. 15 ou -10).");
      adj = [...adj, { label, amount, at }];
    } else {
      const i = Number(b.index); if (!(i >= 0 && i < adj.length)) return fail("Ligne introuvable.");
      adj = adj.filter((_, k) => k !== i);
    }
    // Facture déjà envoyée : elle repasse en brouillon, la prestataire la renvoie (même numéro conseillé) avec l'ajustement.
    const reopen = cur?.status === "envoyee";
    const { error } = await db.from("team_invoices").upsert({ member_id: mid, month, adjustments: adj, ...(reopen ? { status: "brouillon", statement: null, resend: true } : {}), updated_at: at }, { onConflict: "member_id,month" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, reopened: reopen });
  }

  if (b.action === "admin_paid") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? String(b.date) : null;
    if (!date) {
      if (cur?.status !== "payee") return fail("Cette facture n'est pas marquée payée.");
      const { error } = await db.from("team_invoices").update({ status: cur.number ? "envoyee" : "brouillon", paid_at: null, ...(cur.number ? {} : { statement: null }), updated_at: at }).eq("id", cur.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    // Payée sans facture envoyée (cas exceptionnel) : on fige le relevé calculé.
    let statement = cur?.statement as Statement | null;
    if (!cur || cur.status === "brouillon") {
      const mm = await memberMonths(db, mid, mem.pay_terms);
      statement = mm?.months.find(x => x.month === month)?.statement || null;
      if (!statement) return fail("Mois introuvable.", 404);
    }
    const { error } = await db.from("team_invoices").upsert({ member_id: mid, month, status: "payee", paid_at: date, statement, total: statement?.total ?? null, updated_at: at }, { onConflict: "member_id,month" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  }

  return fail("Action inconnue");
}
