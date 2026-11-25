/* Notifications (Web Push) — module de service worker réutilisable.
 * Utilisation : importScripts("/sw/push.js");
 * Message attendu (JSON) : { title, body, url, tag }. Un clic ouvre (ou ramène) l'application sur `url`. */
(() => {
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "NeoDrive", {
    body: d.body || "", tag: d.tag || undefined, data: { url: d.url || "/app" },
    icon: "/app-icon-192.png", badge: "/app-icon-192.png",
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/app", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) if (w.url.startsWith(self.location.origin)) { await w.focus(); if ("navigate" in w) await w.navigate(url).catch(() => null); return; }
    await self.clients.openWindow(url);
  })());
});
})();
