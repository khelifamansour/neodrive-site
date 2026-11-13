import "server-only";
import { createClient } from "@supabase/supabase-js";
import { CURATED, type CuratedVideo } from "./selection";

const SB = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

export type GalleryVideo = Omit<CuratedVideo, "match"> & { id: string; src: string };

type Row = { id: string; title: string | null; public_url: string | null; storage_path: string | null; created_at: string | null };

function supabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SB, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Les vidéos du site (storage_path 'public/x.mp4') sont servies en local : /x.mp4 */
function playableUrl(row: Row): string | null {
  const path = row.storage_path || "";
  if (path.startsWith("public/")) return "/" + path.slice("public/".length);
  const url = row.public_url || "";
  return /^https:\/\//.test(url) ? url : null;
}

async function readyVideos(): Promise<Row[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("social_media_assets")
    .select("id,title,public_url,storage_path,created_at")
    .eq("status", "ready")
    .eq("media_type", "video")
    .not("storage_path", "like", "generated/%")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("Video gallery:", error.message);
    return [];
  }
  return (data || []) as Row[];
}

/** Vidéos sélectionnées, dans l'ordre de selection.ts. Doublons (même fichier importé plusieurs fois) : la plus récente. */
export async function getGalleryVideos(): Promise<GalleryVideo[]> {
  const rows = await readyVideos();
  return CURATED.flatMap(({ match, ...item }) => {
    const row = rows.find(r => r.title === match && playableUrl(r));
    return row ? [{ ...item, id: row.id, src: playableUrl(row)! }] : [];
  });
}

/** Pour les anciens liens /videos/[id] : l'ancre de la vidéo si elle fait partie de la sélection. */
export function anchorForTitle(title: string | null | undefined): string | null {
  const hit = CURATED.find(v => v.match === title);
  return hit ? `v-${hit.key}` : null;
}
