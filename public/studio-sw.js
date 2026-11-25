/* NeoDrive Studio : service worker (portée /studio/).
 * - Envois en arrière-plan (Background Fetch) : /sw/bg-upload.js
 * - Partage Android (Web Share Target) : POST /studio/partage → /studio/bibliotheque?partage=N : /sw/share-target.js
 * Aucune mise en cache des pages : le site reste toujours à jour. */
importScripts("/sw/bg-upload.js", "/sw/share-target.js");
self.ndShareTarget({ action: "/studio/partage", redirect: "/studio/bibliotheque" });
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
