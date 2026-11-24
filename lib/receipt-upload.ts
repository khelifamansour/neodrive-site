"use client";
/** Envoi d'un justificatif depuis le navigateur (onglet Comptabilité, page « Tickets » du téléphone) : photo réduite, stockage privé, lecture automatique. */
import { supabase } from "./supabase";

const code = () => { try { return sessionStorage.getItem("nd_pc") || ""; } catch { return ""; } };
export class Unauthorized extends Error {}
export async function capi<T = Record<string, unknown>>(body: object, pc = code()): Promise<T> {
  const r = await fetch("/api/comptabilite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (r.status === 401) throw new Unauthorized(j.error || "Code incorrect");
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}

/** Photo → JPEG réduit (≤ 2000 px) : envoi rapide et lisible par la lecture automatique. */
export async function toJpeg(f: File): Promise<Blob> {
  if (!f.type.startsWith("image/")) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise<Blob | null>(res => cv.toBlob(res, "image/jpeg", 0.85));
    if (b) return b;
  } catch { /* format non lisible par le navigateur : on envoie l'original */ }
  return f;
}

/** Envoie un fichier et le fait lire ; renvoie le justificatif enregistré (status « lu » ou « erreur »). */
export async function uploadReceipt<R = Record<string, unknown>>(file: File, month: string, source: "envoi" | "telephone" = "envoi") {
  const blob = await toJpeg(file); const type = blob.type || file.type || "image/jpeg"; const name = blob === file ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const u = await capi<{ bucket: string; path: string; token: string }>({ action: "receipt_upload", month, name, type, size: blob.size });
  const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, blob, { contentType: type });
  if (error) throw new Error(error.message);
  const r = await capi<{ receipt: R }>({ action: "receipt_read", month, path: u.path, name, type, size: blob.size, source });
  return r.receipt;
}
