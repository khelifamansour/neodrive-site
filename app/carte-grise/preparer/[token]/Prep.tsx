"use client";
import { useEffect, useRef, useState } from "react";
import SignOnScreen, { type Signature } from "../../../reservation-carte-grise/SignOnScreen";
import { writeMandat, type MandatClient } from "../../../reservation-carte-grise/mandat";
import { CARTE_GRISE_MAX_FILE, PLATE_PHOTO_KEY } from "../../../../lib/carte-grise";
import s from "./prep.module.css";

type Stage = "pieces" | "attente" | "signature" | "termine";
type Piece = { files: number; status: string; reason: string };
type View = { ok: boolean; error?: string; stage: Stage; client: MandatClient; pieces: Record<string, Piece>; vehicle: { model: string; vin_tail: string; vin?: string } };
type Upload = { key: string; path: string; token: string };
const ACCEPT = "image/*,application/pdf";
const PHONE = "06 89 78 17 10";

const post = (token: string, body: object) => fetch("/api/carte-grise/preparer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) })
  .then(r => r.json()).catch(() => ({ ok: false, error: "Erreur réseau : vérifiez votre connexion et réessayez" }));

/** Dépôt direct dans le stockage privé (URL signées données par le serveur, dans l'ordre des fichiers annoncés). */
async function uploadAll(bucket: string, ups: Upload[], files: { key: string; file: File }[]) {
  const { supabase } = await import("../../../../lib/supabase");
  const done = await Promise.all(ups.map(async (u, i) => {
    const f = files[i].file;
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "application/octet-stream" });
    return error ? null : { key: u.key, path: u.path, name: f.name, type: f.type, size: f.size };
  }));
  return done.filter(Boolean);
}

/** Gros bouton « ajouter une photo ou un PDF » (appareil photo ou galerie : pas d'attribut capture). */
function Pick({ title, hint, files, onAdd, onRemove, multiple = false, accept = ACCEPT }: { title: string; hint?: string; files: File[]; onAdd: (l: File[]) => void; onRemove: (i: number) => void; multiple?: boolean; accept?: string }) {
  return <div className={`${s.pickBox} ${files.length ? s.pickDone : ""}`}>
    <label className={s.pick}>
      <span className={s.pickIcon} aria-hidden="true">{files.length ? "✓" : "📷"}</span>
      <span><b>{title}</b>{hint ? <small>{hint}</small> : null}</span>
      <input type="file" accept={accept} multiple={multiple} onChange={e => { onAdd(Array.from(e.target.files || [])); e.target.value = ""; }} />
    </label>
    {files.length ? <ul className={s.list}>{files.map((f, i) => <li key={i}><span>{f.name}</span><button type="button" onClick={() => onRemove(i)}>Retirer</button></li>)}</ul> : null}
  </div>;
}

/** Champ du mandat : reçoit le PDF signé au doigt (SignOnScreen), ou le mandat imprimé et signé importé à la main. */
function MandatInput({ required }: { required: boolean }) {
  const [name, setName] = useState("");
  return <div className={`${s.pickBox} ${name ? s.pickDone : ""}`}>
    <label className={s.pick}>
      <span className={s.pickIcon} aria-hidden="true">{name ? "✓" : "📄"}</span>
      <span><b>Ajouter le mandat signé</b><small>{name || "Photo ou PDF"}</small></span>
      <input type="file" name="mandat_carte_grise_signe" accept={ACCEPT} required={required} onChange={e => setName(e.target.files?.[0]?.name || "")} />
    </label>
  </div>;
}

export default function Prep({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [edit, setEdit] = useState(false);
  const [client, setClient] = useState<MandatClient | null>(null);
  const [recto, setRecto] = useState<File[]>([]); const [verso, setVerso] = useState<File[]>([]); const [domicile, setDomicile] = useState<File[]>([]);
  const [plate, setPlate] = useState<File[]>([]);
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const signRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString("fr-FR");

  useEffect(() => {
    post(token, { action: "state" }).then((j: View) => { if (j.ok) { setView(j); setClient(j.client); } else setLoadErr(j.error || "Lien invalide"); });
  }, [token]);

  const size = (l: File[]) => { const ok = l.filter(f => f.size > 0 && f.size <= CARTE_GRISE_MAX_FILE); if (ok.length < l.length) setErr("Un fichier est trop lourd (25 Mo maximum)."); else setErr(""); return ok; };
  const top = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* */ } };

  if (loadErr) return <main className={s.page}><span className={s.kicker}>CARTE GRISE NEODRIVE</span><h1>Lien invalide</h1><p className={s.sub}>{loadErr}. Contactez-nous au {PHONE}, nous vous renvoyons un lien.</p></main>;
  if (!view || !client) return <main className={s.page}><span className={s.kicker}>CARTE GRISE NEODRIVE</span><p className={s.sub} role="status">Chargement…</p></main>;

  const stage: Stage = edit && (view.stage === "attente" || view.stage === "signature") ? "pieces" : view.stage;
  const has = (k: string) => (view.pieces[k]?.files || 0) > 0;
  const hello = <h1>Bonjour{client.prenom ? ` ${client.prenom}` : ""},</h1>;
  const set = (k: keyof MandatClient) => (e: React.ChangeEvent<HTMLInputElement>) => setClient({ ...client, [k]: e.target.value });
  const input = (k: keyof MandatClient, label: string, o: { type?: string; auto?: string; mode?: "text" | "tel" | "email" | "numeric"; wide?: boolean; req?: boolean } = {}) =>
    <label className={`${s.field} ${o.wide ? s.wide : ""}`}><span>{label}{o.req === false ? <i> (facultatif)</i> : null}</span>
      <input type={o.type || "text"} autoComplete={o.auto} inputMode={o.mode} value={client[k]} onChange={set(k)} required={o.req !== false} /></label>;

  /* ───── Étape 1 : pièce d'identité + justificatif de domicile ───── */
  const sendPieces = async () => {
    setErr("");
    if (!client.prenom.trim() || !client.nom.trim() || !client.adresse.trim() || !client.code_postal.trim() || !client.ville.trim()) { setErr("Complétez vos nom, prénom et adresse."); return; }
    const files = [...recto.map(file => ({ key: "cni", file })), ...verso.map(file => ({ key: "cni", file })), ...domicile.map(file => ({ key: "justificatif_domicile", file }))];
    if (!recto.length && !has("cni")) { setErr("Ajoutez votre pièce d’identité (recto)."); return; }
    if (!domicile.length && !has("justificatif_domicile")) { setErr("Ajoutez votre justificatif de domicile."); return; }
    if (!files.length) { setErr("Ajoutez le document à remplacer."); return; }
    // Une pièce d'identité redéposée remplace l'ancienne : recto et verso doivent repartir ensemble.
    if ((recto.length || verso.length) && !recto.length) { setErr("Ajoutez aussi le recto de votre pièce d’identité."); return; }
    setBusy("Envoi de vos documents…");
    try {
      const init = await post(token, { action: "init", client, files: files.map(({ key, file }) => ({ key, name: file.name, type: file.type, size: file.size })) });
      if (!init.ok) throw new Error(init.error || "Envoi impossible");
      const ok = await uploadAll(init.bucket, init.uploads, files);
      if (ok.length < files.length) throw new Error("L’envoi n’a pas abouti : vérifiez votre connexion et réessayez.");
      setBusy("Vérification de vos documents… (jusqu’à une minute, ne fermez pas la page)");
      const fin = await post(token, { action: "complete", files: ok });
      if (!fin.ok) throw new Error(fin.error || "Envoi impossible");
      setView(fin as View); setRecto([]); setVerso([]); setDomicile([]); setEdit(false); top();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };

  /* ───── Étape 2 : plaque VIN + mandat signé ───── */
  const vin = view.vehicle.vin || "";
  const fileName = `mandat-carte-grise-${client.nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "client"}.pdf`;
  const mandat = async (sig?: Signature) => { const { jsPDF } = await import("jspdf"); return writeMandat(new jsPDF(), client, today, sig, vin || undefined); };
  const sendSignature = async () => {
    setErr("");
    const input = signRef.current?.querySelector<HTMLInputElement>('input[type=file][name="mandat_carte_grise_signe"]');
    const m = input?.files?.[0];
    if (!plate.length) { setErr("Prenez d’abord la photo de la plaque du véhicule."); return; }
    if (!m) { setErr("Signez le mandat avec votre doigt, puis touchez « Valider ma signature »."); signRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const mode = /^signé à l’écran/.test(signRef.current?.querySelector<HTMLInputElement>('input[name="mandat_carte_grise_signe_mode"]')?.value || "") ? "screen" : "manual";
    const files = [{ key: "mandat_carte_grise_signe", file: m }, { key: PLATE_PHOTO_KEY, file: plate[0] }];
    setBusy("Envoi de votre dossier…");
    try {
      const init = await post(token, { action: "sign_init", files: files.map(({ key, file }) => ({ key, name: file.name, type: file.type, size: file.size })) });
      if (!init.ok) throw new Error(init.error || "Envoi impossible");
      if (!init.uploads) { setView(init as View); return; }
      const ok = await uploadAll(init.bucket, init.uploads, files);
      if (ok.length < files.length) throw new Error("L’envoi n’a pas abouti : vérifiez votre connexion et réessayez.");
      const fin = await post(token, { action: "sign_complete", mode, files: ok });
      if (!fin.ok) throw new Error(fin.error || "Envoi impossible");
      setView({ ...view, stage: "termine" }); top();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };

  const pieceLine = (k: string, label: string) => {
    const p = view.pieces[k];
    if (!p?.files) return <li className={s.bad}>{label} : à ajouter</li>;
    if (p.status === "à refaire") return <li className={s.bad}>{label} : à refaire ⚠️ {p.reason}</li>;
    return <li className={s.good}>{label} : reçu ✅</li>;
  };
  const redo = ["cni", "justificatif_domicile"].some(k => view.pieces[k]?.status === "à refaire");

  return <main className={s.page}>
    <span className={s.kicker}>CARTE GRISE NEODRIVE</span>

    {stage === "pieces" ? <>
      {hello}
      <p className={s.sub}>Préparons votre carte grise <b>avant la livraison</b> : vérifiez vos coordonnées, puis ajoutez votre pièce d’identité et un justificatif de domicile. C’est tout, 2 minutes.</p>
      <section className={s.card}>
        <h2><span className={s.num}>1</span> Vos coordonnées</h2>
        <p className={s.hint}>La carte grise sera à ce nom et à cette adresse.</p>
        <div className={s.grid}>
          {input("prenom", "Prénom", { auto: "given-name" })}{input("nom", "Nom", { auto: "family-name" })}
          {input("adresse", "Adresse", { auto: "street-address", wide: true })}
          {input("code_postal", "Code postal", { auto: "postal-code", mode: "numeric" })}{input("ville", "Ville", { auto: "address-level2" })}
          {input("telephone", "Téléphone", { type: "tel", auto: "tel", mode: "tel", req: false })}{input("email", "E-mail", { type: "email", auto: "email", mode: "email", req: false })}
        </div>
      </section>
      <section className={s.card}>
        <h2><span className={s.num}>2</span> Pièce d’identité</h2>
        <p className={s.hint}>Carte d’identité (recto et verso) ou passeport, en cours de validité. Photo bien à plat, en entier, sans reflet, ou PDF.{has("cni") ? " Déjà reçue : ajoutez-la seulement pour la remplacer." : ""}</p>
        {view.pieces.cni?.status === "à refaire" ? <p className={s.redo}>À refaire : {view.pieces.cni.reason}</p> : null}
        <Pick title="Ajouter le recto" hint="Photo ou PDF" files={recto} onAdd={l => setRecto(size(l).slice(0, 1))} onRemove={() => setRecto([])} />
        <Pick title="Ajouter le verso" hint="Pas de verso pour un passeport" files={verso} onAdd={l => setVerso(size(l).slice(0, 1))} onRemove={() => setVerso([])} />
      </section>
      <section className={s.card}>
        <h2><span className={s.num}>3</span> Justificatif de domicile</h2>
        <p className={s.hint}>De moins de 6 mois, à votre nom : facture d’électricité, de gaz, d’eau, de téléphone ou d’internet, ou attestation d’assurance habitation.{has("justificatif_domicile") ? " Déjà reçu : ajoutez-le seulement pour le remplacer." : ""}</p>
        {view.pieces.justificatif_domicile?.status === "à refaire" ? <p className={s.redo}>À refaire : {view.pieces.justificatif_domicile.reason}</p> : null}
        <Pick title="Ajouter le justificatif" hint="Photo ou PDF (plusieurs pages possibles)" multiple files={domicile} onAdd={l => setDomicile(d => [...d, ...size(l)].slice(0, 4))} onRemove={i => setDomicile(d => d.filter((_, j) => j !== i))} />
      </section>
      {err ? <p className={s.err} role="alert">{err}</p> : null}
      <button type="button" className={s.send} disabled={!!busy} onClick={sendPieces}>{busy || "Envoyer mes documents"}</button>
      {edit ? <button type="button" className={s.link} onClick={() => { setEdit(false); setErr(""); }}>Annuler</button> : null}
      <p className={s.small}>Vos documents sont transmis de façon privée à NeoDrive, uniquement pour votre carte grise.</p>
    </> : null}

    {stage === "attente" ? <section className={s.done}>
      <div className={s.big} aria-hidden="true">🎉</div>
      <h1>C’est prêt !</h1>
      <p>Après la livraison, vous recevrez un dernier lien pour signer.</p>
      <ul className={s.status}>{pieceLine("cni", "Pièce d’identité")}{pieceLine("justificatif_domicile", "Justificatif de domicile")}</ul>
      {redo ? <button type="button" className={s.send} onClick={() => setEdit(true)}>Renvoyer le document à refaire</button>
        : <button type="button" className={s.ghost} onClick={() => setEdit(true)}>Modifier mes documents</button>}
    </section> : null}

    {stage === "signature" ? <>
      {hello}
      <p className={s.sub}>Votre véhicule est là. Dernière étape pour votre carte grise : une photo de la plaque du véhicule, puis votre signature.</p>
      <section className={s.vehicle}>
        <small>Votre véhicule</small>
        <b>{view.vehicle.model}</b>
        {view.vehicle.vin_tail ? <span>N° de série : …<b className={s.mono}>{view.vehicle.vin_tail}</b></span> : null}
      </section>
      <section className={s.card}>
        <h2><span className={s.num}>1</span> Photo de la plaque du véhicule</h2>
        <p className={s.hint}>Prenez en photo la plaque constructeur : l’étiquette qui porte le numéro de série à 17 caractères. Bien nette, sans reflet.</p>
        <Pick title="Prendre la photo de la plaque" hint="Appareil photo ou galerie" accept="image/*" files={plate} onAdd={l => setPlate(size(l).slice(0, 1))} onRemove={() => setPlate([])} />
      </section>
      <section className={s.card}>
        <h2><span className={s.num}>2</span> Signer le mandat d’immatriculation</h2>
        <p className={s.hint}>Vous autorisez MK HOLDING (NeoDrive) à faire la carte grise en votre nom.</p>
        <div ref={signRef}>
          <SignOnScreen
            id="sign-mandat" name="mandat_carte_grise_signe" label="Mandat" docWord="le mandat" ville={client.ville} date={today} fileName={fileName}
            invalidateKey={JSON.stringify([client, vin])} build={async sig => (await mandat(sig)).output("blob")} onFile={() => setErr("")}
            primaryClass={s.send} ghostClass={s.ghost}
            manual={<button type="button" className={s.ghost} onClick={async () => (await mandat()).save(fileName.replace(".pdf", "-a-signer.pdf"))}>Télécharger le mandat à imprimer</button>}
            renderFileInput={required => <MandatInput required={required} />}
          />
        </div>
      </section>
      {err ? <p className={s.err} role="alert">{err}</p> : null}
      <button type="button" className={s.send} disabled={!!busy} onClick={sendSignature}>{busy || "Valider mon dossier"}</button>
      <button type="button" className={s.link} onClick={() => setEdit(true)}>Modifier mes documents</button>
    </> : null}

    {stage === "termine" ? <section className={s.done}>
      <div className={s.big} aria-hidden="true">✅</div>
      <h1>Merci{client.prenom ? ` ${client.prenom}` : ""} !</h1>
      <p>Votre dossier carte grise est complet. Nous nous occupons de la suite et vous tenons informé.</p>
    </section> : null}

    <p className={s.help}>Une question ? Appelez-nous au <a href="tel:+33689781710">{PHONE}</a>.</p>
  </main>;
}
