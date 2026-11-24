"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CARTE_GRISE_FILE_LABEL, CARTE_GRISE_MAX_FILE } from "../../../../lib/carte-grise";
import s from "./pieces.module.css";

export type Item = { key: string; label: string; text: string; reason: string };
type Result = Record<string, { status: string; reason: string }>;

/** Choix des photos / PDF par document, dépôt direct dans le stockage privé, puis vérification automatique. */
export default function Upload({ token, items }: { token: string; items: Item[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState(""); const [err, setErr] = useState(""); const [res, setRes] = useState<Result | null>(null);
  const count = Object.values(files).reduce((a, l) => a + l.length, 0);
  const add = (key: string, list: FileList | null) => {
    const ok = Array.from(list || []).filter(f => f.size > 0 && f.size <= CARTE_GRISE_MAX_FILE);
    if ((list?.length || 0) > ok.length) setErr("Un fichier est trop lourd (25 Mo maximum).");
    setFiles(m => ({ ...m, [key]: [...(m[key] || []), ...ok].slice(0, 4) }));
  };
  const post = (body: object) => fetch("/api/carte-grise/pieces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) }).then(r => r.json()).catch(() => ({ ok: false, error: "Erreur réseau, réessayez" }));

  const send = async () => {
    setErr(""); setRes(null);
    const all = Object.entries(files).flatMap(([key, l]) => l.map(file => ({ key, file })));
    if (!all.length) return;
    setBusy("Envoi de vos documents…");
    try {
      const init = await post({ action: "init", files: all.map(({ key, file }) => ({ key, name: file.name, type: file.type, size: file.size })) });
      if (!init.ok) throw new Error(init.error || "Envoi impossible");
      const { supabase } = await import("../../../../lib/supabase");
      const ups = init.uploads as { key: string; path: string; token: string; name: string; type: string }[];
      const done = await Promise.all(ups.map(async (u, i) => {
        const f = all[i].file;
        const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "application/octet-stream" });
        return error ? null : { key: u.key, path: u.path, name: f.name, type: f.type, size: f.size };
      }));
      const okUps = done.filter(Boolean);
      if (!okUps.length) throw new Error("L’envoi n’a pas abouti : vérifiez votre connexion et réessayez.");
      setBusy("Vérification de vos documents… (jusqu’à une minute, ne fermez pas la page)");
      const fin = await post({ action: "complete", files: okUps });
      if (!fin.ok) throw new Error(fin.error || "Envoi impossible");
      setRes(fin.pieces as Result); setFiles({});
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };

  return <div>
    {items.map(it => <div key={it.key} className={s.card}>
      <b>{it.label}</b>
      <p>{it.text}</p>
      {it.reason ? <p className={s.redo}>À refaire : {it.reason}</p> : null}
      <label className={s.pick}>📷 Ajouter une photo ou un PDF{it.key === "cni" ? " (recto et verso)" : ""}
        <input type="file" accept="image/*,application/pdf" multiple onChange={e => { add(it.key, e.target.files); e.target.value = ""; }} />
      </label>
      {files[it.key]?.length ? <ul className={s.list}>{files[it.key].map((f, i) => <li key={i}><span>{f.name}</span><button type="button" onClick={() => setFiles(m => ({ ...m, [it.key]: m[it.key].filter((_, j) => j !== i) }))}>Retirer</button></li>)}</ul> : null}
    </div>)}
    {err ? <p className={s.err}>{err}</p> : null}
    {res ? <div className={s.card}>{Object.entries(res).map(([k, r]) => <p key={k} className={r.status === "à refaire" || r.status === "manquant" ? s.bad : s.ok}>
      {CARTE_GRISE_FILE_LABEL[k] || k} : {r.status === "ok" ? "reçu et vérifié ✅" : r.status === "à vérifier" ? "reçu, nous le vérifions ✅" : `à refaire ⚠️ ${r.reason}`}
    </p>)}</div> : null}
    <button className={s.send} disabled={!count || !!busy} onClick={send}>{busy || (count ? `Envoyer ${count > 1 ? `mes ${count} documents` : "mon document"}` : "Ajoutez vos documents")}</button>
  </div>;
}
