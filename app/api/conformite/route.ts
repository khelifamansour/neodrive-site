import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { crmDatabase } from "../../../lib/crm-agent";
import { getForecast } from "../../../lib/forecast";
import { BUCKET, CATEGORIES, ORGANISMES, STATUTS } from "../../../lib/conformite";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const s = (v: unknown, max = 20000) => String(v ?? "").slice(0, max);
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null;
const safeName = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-90) || "document";
type DB = ReturnType<typeof crmDatabase>;

async function ensureBucket(db: DB) {
  const { error } = await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 30 * 1024 * 1024 });
  if (error && !/exist/i.test(error.message)) throw new Error("Stockage indisponible : " + error.message);
}
const docRow = (b: Record<string, unknown>) => ({
  categorie: String(b.categorie) in CATEGORIES ? String(b.categorie) : "autre", titre: s(b.titre, 200), description: s(b.description, 2000),
  date_doc: day(b.date_doc), request_id: Number(b.request_id) > 0 ? Number(b.request_id) : null,
});

/** Espace Conformité (fondateur, ou membre avec la section « conformite »). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const acc = await authorizeSection(req, b.passcode, "conformite");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();
  try {
    if (b.action === "list") {
      const [{ data: reqs, error: e1 }, { data: docs, error: e2 }] = await Promise.all([
        db.from("compliance_requests").select("*").order("statut").order("date_limite", { ascending: true, nullsFirst: false }),
        db.from("compliance_docs").select("*").order("created_at", { ascending: false }),
      ]);
      if (e1 || e2) throw new Error((e1 || e2)!.message);
      return NextResponse.json({ ok: true, requests: reqs || [], docs: docs || [], who: acc.who });
    }
    if (b.action === "req_save") {
      const r = b.request || {};
      const row = {
        organisme: (ORGANISMES as readonly string[]).includes(r.organisme) ? r.organisme : "Autre", objet: s(r.objet, 300), demande: s(r.demande),
        date_demande: day(r.date_demande), date_limite: day(r.date_limite), statut: r.statut in STATUTS ? r.statut : "a_faire",
        reponse: s(r.reponse), notes: s(r.notes, 5000),
        history: Array.isArray(r.history) ? r.history.slice(0, 200).map((h: any) => ({ date: day(h.date) || new Date().toISOString().slice(0, 10), sens: h.sens === "envoye" ? "envoye" : "recu", texte: s(h.texte) })) : [],
        updated_at: new Date().toISOString(),
      };
      const q = Number(r.id) > 0 ? db.from("compliance_requests").update(row).eq("id", Number(r.id)).select().single() : db.from("compliance_requests").insert(row).select().single();
      const { data, error } = await q; if (error) throw new Error(error.message);
      await logSection(acc, "conformite_demande", { id: data.id });
      return NextResponse.json({ ok: true, request: data });
    }
    if (b.action === "req_delete") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
      const { error } = await db.from("compliance_requests").delete().eq("id", Number(b.id)); if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "doc_init") {
      await ensureBucket(db);
      const path = `docs/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}-${safeName(s(b.name, 200))}`;
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw new Error("Stockage indisponible, réessayez.");
      return NextResponse.json({ ok: true, bucket: BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "doc_save") {
      if (!/^docs\//.test(String(b.path))) return NextResponse.json({ ok: false, error: "Chemin invalide" }, { status: 400 });
      const { data, error } = await db.from("compliance_docs").insert({ ...docRow(b), path: String(b.path), mime: s(b.mime, 100), size: Number(b.size) || null }).select().single();
      if (error) throw new Error(error.message);
      await logSection(acc, "conformite_document", { id: data.id });
      return NextResponse.json({ ok: true, doc: data });
    }
    if (b.action === "doc_update") {
      const { data, error } = await db.from("compliance_docs").update(docRow(b)).eq("id", Number(b.id)).select().single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, doc: data });
    }
    if (b.action === "doc_url") {
      const { data: d } = await db.from("compliance_docs").select("path").eq("id", Number(b.id)).maybeSingle();
      if (!d) return NextResponse.json({ ok: false, error: "Document introuvable" }, { status: 404 });
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(d.path, 600, b.download ? { download: true } : undefined);
      if (error || !data) throw new Error("Lien indisponible");
      return NextResponse.json({ ok: true, url: data.signedUrl });
    }
    if (b.action === "doc_delete") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
      const { data: d } = await db.from("compliance_docs").select("path").eq("id", Number(b.id)).maybeSingle();
      if (d) await db.storage.from(BUCKET).remove([d.path]);
      await db.from("compliance_docs").delete().eq("id", Number(b.id));
      return NextResponse.json({ ok: true });
    }
    if (b.action === "forecast") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
      return NextResponse.json({ ok: true, ...(await getForecast(db)) });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
}

/** Dépôt d'un document par jeton à usage unique (admin_once_tokens, purpose « conformite-import », payload { name, mime, b64, categorie, titre, description, request_id }). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "conformite-import").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: Record<string, any> } | undefined)?.payload;
  if (!p?.b64) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await ensureBucket(db);
    const buf = Buffer.from(String(p.b64), "base64");
    const path = `docs/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}-${safeName(s(p.name, 200))}`;
    const { error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: s(p.mime, 100) || "application/pdf" });
    if (error) throw new Error(error.message);
    const { data: row, error: e2 } = await db.from("compliance_docs").insert({ ...docRow(p), path, mime: s(p.mime, 100) || "application/pdf", size: buf.length }).select("id,titre").single();
    if (e2) throw new Error(e2.message);
    return NextResponse.json({ ok: true, doc: row });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
}
