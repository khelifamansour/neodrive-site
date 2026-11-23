import { NextResponse, after } from "next/server";
import { isAuthorized } from "../../../../lib/integrations";
import { dataClient } from "../../../../lib/datastore";
import { extractPiece, LITIGE_BUCKET } from "../../../../lib/litiges-server";
import { fileExt, LITIGE_EXT, LITIGE_MAX_FILE, LITIGE_STATUTS, PIECE_CATEGORIES } from "../../../../lib/litiges";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
const txt = (v: unknown, max = 4000) => typeof v === "string" ? (v.trim().slice(0, max) || null) : undefined;
const day = (v: unknown) => v === "" || v === null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
const LITIGE_FIELDS = "id,ref,created_at,updated_at,titre,adverse_partie,adverse_adresse,montant_reclame,statut,avocat,resume,prochaine_action,prochaine_echeance,notes";
const PIECE_FIELDS = "id,litige_id,created_at,label,categorie,date_piece,path,name,size,mime,extracted_at";

/** Litiges : dossiers, pièces (dépôt direct dans le stockage privé) et transcription, réservés au fondateur (code principal). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "list") {
      const { data, error } = await sb.from("litiges").select(`${LITIGE_FIELDS},litige_pieces(count)`).order("updated_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, litiges: data || [] });
    }

    if (b.action === "create") {
      const titre = txt(b.titre, 200);
      if (!titre) return NextResponse.json({ ok: false, error: "Titre requis" }, { status: 400 });
      const year = new Date().getFullYear();
      const { data: last } = await sb.from("litiges").select("ref").like("ref", `LIT-${year}-%`).order("ref", { ascending: false }).limit(1);
      const n = Number(String(last?.[0]?.ref || "").split("-")[2] || 0) + 1;
      const { data, error } = await sb.from("litiges").insert({ ref: `LIT-${year}-${String(n).padStart(3, "0")}`, titre }).select("id,ref").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, ...data });
    }

    const id = Number(b.id);
    const { data: lit } = await sb.from("litiges").select(LITIGE_FIELDS).eq("id", id).maybeSingle();
    if (!lit) return NextResponse.json({ ok: false, error: "Litige introuvable" }, { status: 404 });
    const touch = () => sb.from("litiges").update({ updated_at: new Date().toISOString() }).eq("id", id);

    if (b.action === "get") {
      const { data: pieces, error } = await sb.from("litige_pieces").select(`${PIECE_FIELDS},extracted_text`).eq("litige_id", id);
      if (error) throw new Error(error.message);
      // Ordre chronologique : date de la pièce si connue, sinon date de dépôt.
      const list = (pieces || []).map(p => ({ ...p, extracted_chars: p.extracted_text ? p.extracted_text.length : 0, extract_error: p.extracted_text?.startsWith("[") ? p.extracted_text.slice(0, 200) : null, extracted_text: undefined }))
        .sort((a, c) => (a.date_piece || a.created_at.slice(0, 10)).localeCompare(c.date_piece || c.created_at.slice(0, 10)) || a.created_at.localeCompare(c.created_at));
      return NextResponse.json({ ok: true, litige: lit, pieces: list });
    }

    if (b.action === "update") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ["titre", "adverse_partie", "adverse_adresse", "avocat", "resume", "prochaine_action", "notes"]) { const v = txt(b[k], k === "notes" || k === "resume" ? 20000 : 2000); if (v !== undefined) patch[k] = v; }
      if (patch.titre === null) delete patch.titre;
      if (typeof b.statut === "string" && (LITIGE_STATUTS as readonly string[]).includes(b.statut)) patch.statut = b.statut;
      if ("montant_reclame" in b) { const m = String(b.montant_reclame ?? "").replace(/\s/g, "").replace(",", "."); patch.montant_reclame = m === "" ? null : Number.isFinite(Number(m)) ? Number(m) : undefined; if (patch.montant_reclame === undefined) delete patch.montant_reclame; }
      const d = day(b.prochaine_echeance); if (d !== undefined) patch.prochaine_echeance = d;
      const { error } = await sb.from("litiges").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (b.action === "upload_init") {
      const files = (Array.isArray(b.files) ? b.files : []) as { name?: string; type?: string; size?: number }[];
      if (!files.length || files.length > 30) return NextResponse.json({ ok: false, error: "De 1 à 30 fichiers à la fois" }, { status: 400 });
      const uploads: { path: string; token: string }[] = [];
      for (const f of files) {
        const name = String(f.name || "piece");
        if (!(Number(f.size) > 0) || Number(f.size) > LITIGE_MAX_FILE) return NextResponse.json({ ok: false, error: `${name} : 25 Mo maximum` }, { status: 400 });
        if (!(LITIGE_EXT as readonly string[]).includes(fileExt(name)) && !/^(application\/pdf|image\/|text\/plain|message\/rfc822)/.test(String(f.type || ""))) return NextResponse.json({ ok: false, error: `${name} : format non accepté` }, { status: 400 });
        const path = `litiges/${lit.ref}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(name) || "piece"}`;
        const { data, error } = await sb.storage.from(LITIGE_BUCKET).createSignedUploadUrl(path);
        if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
        uploads.push({ path: data.path, token: data.token });
      }
      return NextResponse.json({ ok: true, bucket: LITIGE_BUCKET, uploads });
    }

    if (b.action === "upload_done") {
      const path = String(b.path || "");
      if (!path.startsWith(`litiges/${lit.ref}/`) || path.includes("..")) return NextResponse.json({ ok: false, error: "Chemin invalide" }, { status: 400 });
      const name = String(b.name || path.split("/").pop() || "piece").slice(0, 200);
      const cat = (PIECE_CATEGORIES as readonly string[]).includes(String(b.categorie)) ? String(b.categorie) : "autre";
      const { data, error } = await sb.from("litige_pieces").upsert({ litige_id: id, path, name, size: Number(b.size) || null, mime: String(b.mime || "").slice(0, 120) || null, categorie: cat, label: name.replace(/\.[^.]+$/, "").slice(0, 200) || name }, { onConflict: "path" }).select(PIECE_FIELDS).single();
      if (error) throw new Error(error.message);
      await touch();
      // Lecture du contenu après la réponse : l'envoi des autres fichiers n'attend pas.
      after(() => extractPiece(sb, data.id).catch(e => console.error("[litiges] extraction", e)));
      return NextResponse.json({ ok: true, piece: data });
    }

    const pid = Number(b.piece_id);
    const { data: piece } = await sb.from("litige_pieces").select(PIECE_FIELDS).eq("id", pid).eq("litige_id", id).maybeSingle();
    if (!piece) return NextResponse.json({ ok: false, error: "Pièce introuvable" }, { status: 404 });

    if (b.action === "piece_link") {
      const { data } = await sb.storage.from(LITIGE_BUCKET).createSignedUrl(piece.path, 3600);
      if (!data?.signedUrl) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true, url: data.signedUrl });
    }
    if (b.action === "piece_text") {
      const { data } = await sb.from("litige_pieces").select("extracted_text").eq("id", pid).single();
      return NextResponse.json({ ok: true, text: data?.extracted_text || "" });
    }
    if (b.action === "piece_update") {
      const patch: Record<string, unknown> = {};
      const label = txt(b.label, 200); if (label) patch.label = label;
      if ((PIECE_CATEGORIES as readonly string[]).includes(String(b.categorie))) patch.categorie = b.categorie;
      const d = day(b.date_piece); if (d !== undefined) patch.date_piece = d;
      const { error } = await sb.from("litige_pieces").update(patch).eq("id", pid);
      if (error) throw new Error(error.message);
      await touch();
      return NextResponse.json({ ok: true });
    }
    if (b.action === "piece_extract") return NextResponse.json({ ...(await extractPiece(sb, pid)) });
    if (b.action === "piece_delete") {
      await sb.storage.from(LITIGE_BUCKET).remove([piece.path]);
      const { error } = await sb.from("litige_pieces").delete().eq("id", pid);
      if (error) throw new Error(error.message);
      await touch();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ ok: false, error: err.message || "Erreur" }, { status: err.status || 500 });
  }
}
