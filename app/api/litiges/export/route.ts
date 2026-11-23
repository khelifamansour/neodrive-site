import { NextResponse } from "next/server";
import { crmDatabase } from "../../../../lib/crm-agent";

export const dynamic = "force-dynamic";
const MAX_PIECE_TEXT = 40_000;

/**
 * Export d'un litige pour analyse par l'assistant : fiche + pièces avec leur texte transcrit (pas de liens vers les fichiers).
 * Jeton admin_once_tokens purpose « litige-export », payload { ref } ou { id } ; réutilisable jusqu'à son expiration.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data: tok } = await db.from("admin_once_tokens").select("payload").eq("token", token).eq("purpose", "litige-export").gt("expires_at", new Date().toISOString()).maybeSingle();
  const p = (tok as { payload?: { ref?: string; id?: number } } | null)?.payload;
  if (!p || (!p.ref && !p.id)) return NextResponse.json({ ok: false }, { status: 401 });
  const q = db.from("litiges").select("*");
  const { data: litige } = p.id ? await q.eq("id", Number(p.id)).maybeSingle() : await q.eq("ref", String(p.ref)).maybeSingle();
  if (!litige) return NextResponse.json({ ok: false, error: "Litige introuvable" }, { status: 404 });
  const { data: rows, error } = await db.from("litige_pieces").select("id,created_at,label,categorie,date_piece,name,size,mime,extracted_text,extracted_at").eq("litige_id", litige.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const pieces = (rows || [])
    .sort((a, c) => (a.date_piece || a.created_at.slice(0, 10)).localeCompare(c.date_piece || c.created_at.slice(0, 10)) || a.created_at.localeCompare(c.created_at))
    .map(r => {
      const t = r.extracted_text || "";
      return { ...r, extracted_text: t.length > MAX_PIECE_TEXT ? `${t.slice(0, MAX_PIECE_TEXT)}\n[… tronqué : ${t.length} caractères au total]` : (t || null), extracted_chars: t.length };
    });
  return NextResponse.json({ ok: true, exported_at: new Date().toISOString(), litige, pieces_count: pieces.length, pieces_without_text: pieces.filter(x => !x.extracted_text).length, pieces }, { headers: { "cache-control": "no-store" } });
}
