import { NextResponse } from "next/server";
import { crmDatabase } from "../../../lib/crm-agent";
import { authorizeSection, logSection } from "../../../lib/access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const BUCKET = "social-media";

type Item = { id: string; kind: "photo" | "video" | "document"; title: string; source: string; url: string | null; preview: string | null; tags?: string[]; created_at?: string | null };

/** Fichiers fixes du site (dossier public/) utiles au marketing. */
const DOCS: [string, string][] = [
  ["/catalogue-neodrive-2026.pdf", "Catalogue NeoDrive 2026"],
  ["/manuel-utilisateur-neodrive.pdf", "Manuel utilisateur (français)"],
  ["/user-manual-neodrive1.pdf", "User manual (anglais)"],
  ["/Manuel-technique.pdf", "Manuel technique"],
  ["/Guide-SAV-et-diagnostic-rapide.pdf", "Guide SAV et diagnostic rapide"],
  ["/pieces.pdf", "Catalogue des pièces"],
];
const IMAGES: [string, string][] = [
  ["/hero.png", "Photo principale du site"],
  ["/voiture.jpg", "Voiture NeoDrive"],
  ["/voitureaa.jpg", "Voiture NeoDrive (2)"],
  ["/marketing/affiche-prix-neodrive.jpg", "Affiche des prix"],
  ["/livraison-neodrive.webp", "Livraison NeoDrive"],
  ["/usine1.jpg", "Usine (1)"],
  ["/usine2.jpg", "Usine (2)"],
  ["/france4.jpg", "Carte de France des livraisons"],
  ...Array.from({ length: 8 }, (_, i) => [`/catalogue/page-${i + 1}.jpg`, `Catalogue – page ${i + 1}`] as [string, string]),
  ...Array.from({ length: 10 }, (_, i) => [`/livraisons-clients/livraison-client-${String(i + 1).padStart(2, "0")}.jpg`, `Livraison client ${i + 1}`] as [string, string]),
];
const staticItems = (): Item[] => [
  ...DOCS.map(([u, t]) => ({ id: `f:${u}`, kind: "document" as const, title: t, source: "Site", url: u, preview: null })),
  ...IMAGES.map(([u, t]) => ({ id: `f:${u}`, kind: "photo" as const, title: t, source: "Site", url: u, preview: u })),
];
const fileName = (u: string) => decodeURIComponent(u.split("?")[0].split("/").pop() || "fichier");

/** Médiathèque (section « contenu ») : photos et vidéos prêtes, documents PDF, visuels du site. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  const acc = await authorizeSection(req, b.passcode, "contenu");
  if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const db = crmDatabase();

  if (b.action === "list") {
    const { data, error } = await db.from("social_media_assets").select("id,storage_path,public_url,media_type,title,context,ai_summary,ai_tags,created_at,priority").eq("status", "ready").order("priority", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const seen = new Set<string>();
    const assets: Item[] = (data || []).map(a => {
      const kind = a.media_type === "video" ? "video" as const : "photo" as const;
      const url = a.public_url || null; if (url) seen.add(url.replace(/^https:\/\/www\.easydrive-auto\.fr/, ""));
      const title = a.title || String(a.ai_summary || a.context || fileName(a.storage_path || "")).slice(0, 90);
      return { id: `a:${a.id}`, kind, title, source: "Réseaux sociaux", url, preview: kind === "photo" ? url : null, tags: Array.isArray(a.ai_tags) ? a.ai_tags.slice(0, 6) : [], created_at: a.created_at };
    });
    return NextResponse.json({ ok: true, items: [...staticItems().filter(i => !seen.has(i.url || "")), ...assets] });
  }

  if (b.action === "download") {
    const id = String(b.id || "");
    let url: string | null = null; let title = "";
    if (id.startsWith("f:")) {
      const it = staticItems().find(i => i.id === id); if (!it) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });
      url = it.url; title = it.title;
    } else if (id.startsWith("a:")) {
      const { data: a } = await db.from("social_media_assets").select("id,storage_path,public_url,title").eq("id", id.slice(2)).eq("status", "ready").maybeSingle();
      if (!a) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });
      title = a.title || fileName(a.storage_path || "");
      const name = fileName(a.storage_path || a.public_url || "fichier");
      if (a.public_url && a.public_url.includes("/storage/v1/object/public/")) url = `${a.public_url}${a.public_url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
      else if (a.public_url) url = a.public_url;
      else if (a.storage_path) { const { data: s } = await db.storage.from(BUCKET).createSignedUrl(a.storage_path, 3600, { download: name }); url = s?.signedUrl || null; }
    }
    if (!url) return NextResponse.json({ ok: false, error: "Lien indisponible" }, { status: 404 });
    await logSection(acc, "content_download", { id, title: title.slice(0, 120) });
    return NextResponse.json({ ok: true, url, name: fileName(url) });
  }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
