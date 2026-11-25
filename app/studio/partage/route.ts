import { NextResponse } from "next/server";

/** Cible du partage Android (manifeste /studio.webmanifest). Normalement interceptée par le service worker /studio-sw.js,
 * qui garde les vidéos sur le téléphone. Si le service worker n'est pas encore actif, on renvoie vers la bibliothèque. */
export function POST(req: Request) {
  return NextResponse.redirect(new URL("/studio/bibliotheque?partage=sanssw", req.url), 303);
}
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/studio/bibliotheque", req.url), 303);
}
