/* Envois en arrière-plan (Background Fetch) — module de service worker réutilisable.
 * Utilisation dans un service worker : importScripts("/sw/bg-upload.js");
 * La page (lib/bg-upload.ts) range chaque lot dans IndexedDB « nd-bg-upload » ; à la fin, ce module appelle l'URL
 * d'enregistrement de chaque fichier arrivé, prévient les pages (BroadcastChannel « nd-bg-upload ») et met à jour la notification. */
(() => {
const IDB = "nd-bg-upload", STORE = "batches", CHANNEL = "nd-bg-upload";


function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
const tell = msg => { try { const c = new BroadcastChannel(CHANNEL); c.postMessage(msg); c.close(); } catch (e) { /* ancien navigateur */ } };

async function registerOne(item) {
  if (!item.register) return true;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(item.register.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.register.body) });
      if (r.ok) return true;
      if (r.status >= 400 && r.status < 500 && r.status !== 409) return false;
    } catch (e) { /* réseau : on réessaie */ }
    await new Promise(r => setTimeout(r, 3000 * (i + 1)));
  }
  return false;
}

async function finish(event) {
  const reg = event.registration;
  const batch = await idbDo("readonly", s => s.get(reg.id)).catch(() => null);
  const results = {};
  let ok = 0, ko = 0;
  if (batch) {
    const records = await reg.matchAll().catch(() => []);
    for (const rec of records) {
      const item = batch.items.find(x => x.url === rec.request.url);
      if (!item) continue;
      let good = false;
      try { const resp = await rec.responseReady; good = resp.ok; } catch (e) { good = false; }
      if (good) good = await registerOne(item);
      results[item.key] = good ? "done" : "error";
      good ? ok++ : ko++;
    }
    batch.results = results; batch.finished = true;
    await idbDo("readwrite", s => s.put(batch)).catch(() => null);
  }
  tell({ type: "batch", id: reg.id, results });
  const title = ko ? `NeoDrive : ${ok} vidéo(s) envoyée(s), ${ko} à renvoyer` : `NeoDrive : ${ok} vidéo(s) envoyée(s) ✔`;
  if (event.updateUI) await event.updateUI({ title }).catch(() => null);
}

self.addEventListener("backgroundfetchsuccess", e => e.waitUntil(finish(e)));
self.addEventListener("backgroundfetchfail", e => e.waitUntil(finish(e)));
self.addEventListener("backgroundfetchabort", e => e.waitUntil((async () => {
  const batch = await idbDo("readonly", s => s.get(e.registration.id)).catch(() => null);
  if (batch) { batch.finished = true; batch.aborted = true; await idbDo("readwrite", s => s.put(batch)).catch(() => null); }
  tell({ type: "batch", id: e.registration.id, results: {}, aborted: true });
})()));
self.addEventListener("backgroundfetchclick", e => e.waitUntil((async () => {
  const batch = await idbDo("readonly", s => s.get(e.registration.id)).catch(() => null);
  const url = (batch && batch.page) || "/";
  const wins = await self.clients.matchAll({ type: "window" });
  const w = wins.find(c => new URL(c.url).pathname === url);
  if (w) return w.focus();
  return self.clients.openWindow(url);
})()));

})();
