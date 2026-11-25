/* L'application NeoDrive : service worker (portée /app).
 * Aucune mise en cache des pages : l'application reste toujours à jour. Notifications : module /sw/push.js. */
importScripts("/sw/push.js");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
