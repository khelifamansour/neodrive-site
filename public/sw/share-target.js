/* Partage Android (Web Share Target) — module de service worker réutilisable.
 * Utilisation : importScripts("/sw/share-target.js"); ndShareTarget({ action: "/studio/partage", redirect: "/studio/bibliotheque" });
 * Les fichiers reçus (champs « videos » ou « files ») sont rangés dans le cache « nd-share » ; la page les reprend avec
 * takeSharedFiles() (lib/bg-upload.ts). */
self.ndShareTarget = function (opts) {
  const action = opts.action, redirect = opts.redirect;
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "POST" || u.origin !== location.origin || u.pathname !== action) return;
  e.respondWith((async () => {
    try {
      const form = await e.request.formData();
      const files = [...form.getAll("videos"), ...form.getAll("files")].filter(f => f && typeof f === "object" && "size" in f);
      const c = await caches.open("nd-share");
      let i = 0;
      for (const f of files) {
        i++;
        await c.put(`/studio/__share/${Date.now()}-${i}`, new Response(f, { headers: { "content-type": f.type || "video/mp4", "x-name": encodeURIComponent(f.name || `fichier-${i}`), "x-modified": String(f.lastModified || Date.now()) } }));
      }
      return Response.redirect(`${redirect}?partage=${files.length}`, 303);
    } catch (err) {
      return Response.redirect(`${redirect}?partage=erreur`, 303);
    }
  })());
});
};
