/**
 * Copie côté serveur du dossier carte grise, juste avant l'envoi Formspree (qui reste la voie principale).
 * Best effort : ne lève jamais d'erreur et s'arrête au bout de `timeoutMs` pour ne jamais bloquer l'envoi du dossier.
 * Les pièces partent directement vers le stockage privé (URL signées), sans passer par le serveur du site.
 */
import { CARTE_GRISE_FILE_LABEL, CARTE_GRISE_MAX_FILE } from "../../lib/carte-grise";

/** extra : pièces générées par la page qui n'ont pas pu être placées dans un champ fichier du formulaire. */
export async function storeDossierCopy(form: HTMLFormElement, timeoutMs = 30000, extra: { key: string; file: File }[] = []): Promise<string | null> {
  const work = (async () => {
    const fd = new FormData(form);
    const fields: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string" && !k.startsWith("_")) fields[k] = fields[k] ? `${fields[k]}, ${v}` : v; });
    const files: { key: string; file: File }[] = [];
    form.querySelectorAll<HTMLInputElement>("input[type=file]").forEach(input => {
      // Plusieurs fichiers possibles pour une même pièce (ex. carte d'identité recto + verso).
      for (const f of Array.from(input.files || [])) if (f.size > 0 && f.size <= CARTE_GRISE_MAX_FILE && CARTE_GRISE_FILE_LABEL[input.name]) files.push({ key: input.name, file: f });
    });
    for (const x of extra) if (x.file.size > 0 && x.file.size <= CARTE_GRISE_MAX_FILE && CARTE_GRISE_FILE_LABEL[x.key]) files.push(x);
    if (!files.length) return null;
    const post = (body: object, ms = 10000) => fetch("/api/carte-grise/dossier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) }).then(r => r.json());
    // Serveur lent ou indisponible : on n'attend pas plus de 8 s avant l'envoi Formspree.
    const init = await post({ action: "init", fields, files: files.map(({ key, file }) => ({ key, name: file.name, type: file.type, size: file.size })) }, 8000);
    if (!init?.ok) return null;
    const { supabase } = await import("../../lib/supabase");
    // Les URL d'envoi suivent l'ordre des fichiers annoncés.
    await Promise.all((init.uploads as { key: string; path: string; token: string }[]).map((u, i) => {
      const f = files[i]?.key === u.key ? files[i].file : files.find(x => x.key === u.key)?.file;
      return f ? supabase.storage.from(init.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "application/octet-stream" }).catch(() => null) : null;
    }));
    await post({ action: "complete", folder: init.folder }).catch(() => null);
    return init.ref as string;
  })().catch(() => null);
  return Promise.race([work, new Promise<null>(res => setTimeout(() => res(null), timeoutMs))]);
}
