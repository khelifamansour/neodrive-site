import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { readCocFromDocument } from "../../../../lib/vin-read";
import { cnitFor } from "../../../../lib/cnit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Sous la limite de corps de requête Vercel (~4,5 Mo) : les photos sont réduites dans le navigateur avant l'envoi. */
const MAX = 4 * 1024 * 1024;
const TYPES = /^(application\/pdf|image\/(jpeg|png|webp|gif))$/i;

// Limite simple par adresse IP (formulaire public /carte-grise-partenaire)
const hits = new Map<string, number[]>();
function tooMany(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(); const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

/** Lecture du COC (photo ou PDF de la première page) : VIN, et si visibles marque, type et CNIT. Rien n'est enregistré. */
export async function POST(req: Request) {
  if (tooMany(req)) return NextResponse.json({ ok: false, error: "Trop de lectures, réessayez dans une heure" }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ ok: false, error: "Aucun fichier" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "Fichier trop lourd pour la lecture automatique" }, { status: 413 });
  if (!TYPES.test(file.type || "")) return NextResponse.json({ ok: false, error: "Format non lisible automatiquement" }, { status: 415 });
  try {
    await applyStoredSecrets();
    const out = await readCocFromDocument(new Uint8Array(await file.arrayBuffer()), file.type, file.name || "coc");
    if (!out?.vin) return NextResponse.json({ ok: false, error: "VIN illisible sur ce document" });
    const x = out.extra || {};
    // CNIT : modèle connu (lib/cnit) en priorité, sinon celui lu sur le document.
    const cnit = cnitFor({ reception: x.reception, type: x.type }) || (x.cnit || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return NextResponse.json({ ok: true, vin: out.vin, check_ok: out.check_ok, doubt: out.doubt, marque: x.marque || "", type: x.type || "", reception: x.reception || "", cnit });
  } catch (e) {
    console.error("[carte-grise] lecture COC", e);
    return NextResponse.json({ ok: false, error: "Lecture automatique indisponible" });
  }
}
