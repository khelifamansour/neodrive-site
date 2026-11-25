"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import SignaturePad from "../livreur/SignaturePad";

/** Signature recadrée sur le tracé (PNG noir sur blanc, léger) et ses dimensions en pixels. */
export type Signature = { png: string; w: number; h: number };

/** Recadre la signature sur l'encre et la réduit (≤ 600 px de large) pour un PDF léger. */
export async function trimSignature(dataUrl: string): Promise<Signature> {
  const img = new Image();
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error("signature")); img.src = dataUrl; });
  const src = document.createElement("canvas"); src.width = img.naturalWidth; src.height = img.naturalHeight;
  const sctx = src.getContext("2d"); if (!sctx) return { png: dataUrl, w: img.naturalWidth, h: img.naturalHeight };
  sctx.drawImage(img, 0, 0);
  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = width - 1; y1 = height - 1; }
  const pad = Math.round(Math.max(width, height) * 0.02);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1; const k = Math.min(1, 600 / cw);
  const out = document.createElement("canvas"); out.width = Math.max(1, Math.round(cw * k)); out.height = Math.max(1, Math.round(ch * k));
  const octx = out.getContext("2d"); if (!octx) return { png: dataUrl, w: width, h: height };
  octx.fillStyle = "#fff"; octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return { png: out.toDataURL("image/png"), w: out.width, h: out.height };
}

/** Le navigateur sait-il placer un fichier dans un champ <input type=file> (DataTransfer) ? */
let injectable: boolean | null = null;
function canInjectFiles(): boolean {
  if (injectable !== null) return injectable;
  try {
    const dt = new DataTransfer(); dt.items.add(new File(["x"], "test.txt", { type: "text/plain" }));
    const input = document.createElement("input"); input.type = "file"; input.files = dt.files;
    injectable = input.files?.length === 1;
  } catch { injectable = false; }
  return injectable;
}
const noSubscribe = () => () => {};

const box: React.CSSProperties = { display: "grid", gap: 12, padding: 16, borderRadius: 16, border: "2px solid #f3c6ae", background: "#fffaf6" };
const linkBtn: React.CSSProperties = { background: "none", border: 0, padding: "8px 0", font: "inherit", fontSize: 15, color: "#444", textDecoration: "underline", cursor: "pointer", textAlign: "left" };

type Props = {
  id: string;
  /** Nom du champ fichier envoyé à Formspree (devis_signe, mandat_carte_grise_signe). */
  name: string;
  /** « Contrat », « Devis » ou « Mandat ». */
  label: string;
  /** « le contrat », « le devis », « le mandat ». */
  docWord: string;
  ville: string;
  date: string;
  fileName: string;
  /** Change quand les informations du document changent : la signature doit alors être refaite. */
  invalidateKey: string;
  /** Génère le PDF signé (ou null si impossible : informations manquantes, générateur pas prêt…). */
  build: (sig: Signature) => Promise<Blob | null>;
  /** Parcours d'origine : téléchargement du PDF à imprimer. */
  manual: React.ReactNode;
  /** Champ fichier d'origine (toujours présent dans la page : il reçoit le PDF signé). */
  renderFileInput: (required: boolean) => React.ReactNode;
  onFile: (name: string, fileName: string) => void;
  primaryClass?: string;
  ghostClass?: string;
};

export default function SignOnScreen({ id, name, label, docWord, ville, date, fileName, invalidateKey, build, manual, renderFileInput, onFile, primaryClass, ghostClass }: Props) {
  const supported = useSyncExternalStore(noSubscribe, canInjectFiles, () => true);
  const [wantsManual, setWantsManual] = useState(false);
  const manualMode = wantsManual || !supported;
  const [png, setPng] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [padKey, setPadKey] = useState(0);
  const [signed, setSigned] = useState<{ url: string; key: string; size: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Informations modifiées après la signature : le PDF signé n'est plus à jour, il faut signer à nouveau.
  if (signed && signed.key !== invalidateKey) { setSigned(null); setPng(null); setAgreed(false); setPadKey(k => k + 1); setNotice(`Vos informations ont changé : merci de signer à nouveau ${docWord}.`); }
  const isSigned = !!signed && !manualMode;

  const input = () => wrapRef.current?.querySelector<HTMLInputElement>(`input[type=file][name="${name}"]`) ?? null;
  const clearInput = () => { const i = input(); if (i) i.value = ""; onFile(name, ""); };

  // Mode écran sans signature valide : aucun ancien PDF signé ne doit rester dans le formulaire.
  useEffect(() => { if (!manualMode && !signed && input()?.files?.length) clearInput(); });

  const reset = (msg = "") => {
    if (signed) URL.revokeObjectURL(signed.url);
    setSigned(null); setPng(null); setAgreed(false); setPadKey(k => k + 1); setNotice(msg); clearInput();
  };

  const sign = async () => {
    if (!png) { setNotice("Signez d’abord dans le cadre blanc avec votre doigt."); return; }
    if (!agreed) { setNotice("Cochez la case « Lu et approuvé » pour valider."); return; }
    setBusy(true); setNotice("");
    try {
      const blob = await build(await trimSignature(png));
      if (!blob) return;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const i = input();
      let ok = false;
      try { const dt = new DataTransfer(); dt.items.add(file); if (i) { i.files = dt.files; ok = i.files?.length === 1; } } catch { ok = false; }
      const url = URL.createObjectURL(blob);
      if (!ok) {
        // Navigateur trop ancien : on donne le PDF signé, à importer à la main.
        const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
        setWantsManual(true);
        setNotice(`Votre navigateur ne permet pas de joindre ${docWord} automatiquement : le PDF signé vient d’être téléchargé, importez-le ci-dessous.`);
        return;
      }
      if (signed) URL.revokeObjectURL(signed.url);
      setSigned({ url, key: invalidateKey, size: blob.size });
      onFile(name, fileName);
    } catch {
      setNotice("La création du PDF signé a échoué. Réessayez, ou choisissez « Je préfère imprimer ».");
    } finally { setBusy(false); }
  };

  const toManual = () => { reset(); setWantsManual(true); };
  const toScreen = () => { clearInput(); setNotice(""); setWantsManual(false); };

  return <div id={id} ref={wrapRef} style={{ display: "grid", gap: 10, scrollMarginTop: 90 }}>
    <input type="hidden" name={`${name}_mode`} value={manualMode ? "imprimé et signé à la main (fichier importé)" : isSigned ? `signé à l’écran au doigt le ${date}, mention « Lu et approuvé »` : ""} />

    {!manualMode && (isSigned ? (
      <div style={{ ...box, border: "2px solid #9fd8b5", background: "#ecf8f0" }} role="status">
        <b style={{ fontSize: 19, color: "#15803d" }}>✓ {label} signé</b>
        <span style={{ fontSize: 15, lineHeight: 1.5, color: "#234" }}>Le PDF signé <b>{fileName}</b> ({Math.max(1, Math.round(signed!.size / 1024))} Ko) sera envoyé avec votre dossier. Rien d’autre à faire pour {docWord}.</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <a href={signed!.url} target="_blank" rel="noopener noreferrer" className={ghostClass}>Voir le PDF signé</a>
          <button type="button" className={ghostClass} onClick={() => reset()}>Signer à nouveau</button>
        </div>
      </div>
    ) : (
      <div style={box}>
        <div>
          <b style={{ fontSize: 19 }}>Signer ici avec le doigt</b>
          <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.5, color: "#444" }}>Tracez votre signature dans le cadre blanc, comme sur papier. Elle sera placée sur {docWord}.</p>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5, padding: "8px 12px", background: "#fff", border: "1px solid #eee", borderRadius: 10 }}>
          <b style={{ fontStyle: "italic" }}>Lu et approuvé</b><br />
          Fait à {ville || "…"}, le {date}
        </div>
        <SignaturePad key={padKey} onChange={p => { setPng(p); if (p) setNotice(""); }} btnClass={ghostClass} height={180} />
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 16, lineHeight: 1.45, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setNotice(""); }} style={{ width: 22, height: 22, marginTop: 1, flex: "none", accentColor: "#e8592a" }} />
          <span>J’ai lu {docWord} : <b>« Lu et approuvé »</b></span>
        </label>
        {notice ? <p role="alert" style={{ margin: 0, fontSize: 15, color: "#b42318", fontWeight: 700 }}>{notice}</p> : null}
        <button type="button" className={primaryClass} onClick={sign} disabled={busy} style={{ width: "100%" }}>{busy ? "Création du PDF signé…" : `Valider ma signature`}</button>
      </div>
    ))}

    {!manualMode ? <button type="button" style={linkBtn} onClick={toManual}>Je préfère imprimer</button> : <>
      {notice ? <p role="alert" style={{ margin: 0, fontSize: 15, color: "#b45309", fontWeight: 700 }}>{notice}</p> : null}
      {manual}
      {supported ? <button type="button" style={linkBtn} onClick={toScreen}>Signer plutôt avec le doigt à l’écran</button> : null}
    </>}

    <div style={manualMode ? undefined : { display: "none" }}>{renderFileInput(manualMode)}</div>
  </div>;
}
