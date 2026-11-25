"use client";

/**
 * Dossier carte grise du client d'un partenaire revendeur (?partenaire=<nom>).
 * Rempli par le partenaire pour son client : aucun devis ni contrat NeoDrive (NeoDrive n'a pas vendu à ce client).
 * Le VIN est lu automatiquement sur le COC ; le certificat de vente (vendeur = le partenaire, ne vaut pas facture) est généré et joint au dossier.
 * Le mandat d'immatriculation est signé au doigt, comme sur /reservation-carte-grise.
 * Même enregistrement que /reservation-carte-grise (copie privée + Formspree) : jamais envoyé automatiquement à NK Services.
 */
import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import s from "../reservation-devis/reservation.module.css";
import c from "../reservation-carte-grise/carte-grise.module.css";
import SignOnScreen, { type Signature } from "../reservation-carte-grise/SignOnScreen";
import { storeDossierCopy } from "../reservation-carte-grise/storeCopy";
import { writeMandat } from "../reservation-carte-grise/mandat";
import { pdfEuros, putFile, readCocVin, writeCertificat, type CertificatPdf } from "../reservation-carte-grise/certificat";
import { vinValid } from "../../lib/shipments";

type Pdf = CertificatPdf & { save: (name: string) => void; output: (type: "blob") => Blob };
type JsPdfCtor = new (...args: unknown[]) => Pdf;
type CocRead = { status: "idle" | "reading" | "ok" | "fail"; vin: string; marque: string; type: string; message: string };

const WHATSAPP = "https://wa.me/33676192234?text=" + encodeURIComponent("Bonjour, je suis partenaire NeoDrive et j’ai une question sur le dossier carte grise d’un client.");
const MODELES: { value: string; label: string }[] = [
  { value: "essentiel", label: "NeoDrive Essentielle" },
  { value: "confort", label: "NeoDrive Confort" },
  { value: "confortPlus", label: "NeoDrive Confort Plus" },
];
const MAX_ID_FILES = 4;

const Icon = {
  doc: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>,
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l1.3-3.6A7.8 7.8 0 1112 20a8 8 0 01-3.9-1z" /></svg>,
  download: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>,
  upload: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></svg>,
  gift: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M12 9v11M4 13h16M12 9c-2.5 0-4.5-1-4.5-2.7S9.6 3.8 12 9c2.4-5.2 4.5-4.4 4.5-2.7S14.5 9 12 9z" /></svg>,
  pen: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" /></svg>,
};

const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 52, border: "1.5px solid #e0d9cf", borderRadius: 14, padding: "14px 15px", font: "inherit", fontSize: 16, fontWeight: 500, color: "#16202e", background: "#fff" };
const vinBox: React.CSSProperties = { margin: "12px 0 0", padding: "12px 14px", borderRadius: 12, fontSize: 14.5, lineHeight: 1.5 };

const safeFileName = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "client";
const cleanVin = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);

export default function CarteGrisePartenaire() {
  const today = new Date().toLocaleDateString("fr-FR");

  const [client, setClient] = useState({ nom: "", prenom: "", telephone: "", email: "", adresse: "", code_postal: "", ville: "" });
  const [sale, setSale] = useState({ partenaire: "", partenaire_siret: "", partenaire_adresse: "", prix_vente_ttc: "", version: "", cnit_code: "" });
  const [coc, setCoc] = useState<CocRead>({ status: "idle", vin: "", marque: "", type: "", message: "" });
  const [manualVin, setManualVin] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<{ postal: string; list: string[] } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const certificatRef = useRef<HTMLInputElement>(null);
  const readId = useRef(0);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);

  // Nom du partenaire repris du lien (?partenaire=…), modifiable.
  useEffect(() => {
    try {
      const p = (new URLSearchParams(location.search).get("partenaire") || "").trim().slice(0, 120);
      if (p) setSale(v => v.partenaire ? v : { ...v, partenaire: p });
    } catch { /* rien */ }
  }, []);

  // Ville du client proposée à partir du code postal (geo.api.gouv.fr), sans bloquer si le service ne répond pas.
  const postal = client.code_postal;
  useEffect(() => {
    if (!/^[0-9]{5}$/.test(postal)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    fetch("https://geo.api.gouv.fr/communes?codePostal=" + postal + "&fields=nom&format=json", { signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list: string[] = Array.isArray(d) ? d.map((x: { nom: string }) => x.nom) : [];
        setCities({ postal, list });
        if (list.length === 1) setClient(p => p.ville ? p : { ...p, ville: list[0] });
      })
      .catch(() => { /* service indisponible : saisie libre */ })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [postal]);
  const postalCities = cities && cities.postal === postal ? cities.list : [];

  const partnerName = sale.partenaire.trim();
  const clientName = `${client.prenom} ${client.nom}`.trim();
  // VIN lu sur le COC ; saisie à la main seulement si la lecture échoue ou si la clé de contrôle ne tombe pas juste.
  const readOk = coc.status === "ok" && vinValid(coc.vin);
  const needManual = coc.status === "fail" || (coc.status === "ok" && !readOk);
  const vin = readOk ? coc.vin : needManual ? manualVin : "";
  const vinShapeOk = vin.length === 17 && !/[IOQ]/.test(vin);
  const vinSource = readOk ? "lu sur le COC" : vinShapeOk ? "saisi à la main" : "";
  const price = Number(sale.prix_vente_ttc.replace(",", "."));
  // Prix facultatif (le partenaire peut ne pas le communiquer) ; s'il est saisi, il doit être un montant positif.
  const hasPrice = sale.prix_vente_ttc.trim() !== "";
  const priceOk = !hasPrice || (Number.isFinite(price) && price > 0);
  const modelLabel = MODELES.find(m => m.value === sale.version)?.label || [coc.marque, coc.type].filter(Boolean).join(" ");

  const contactDone = !!(client.nom && client.prenom && client.adresse && /^[0-9]{5}$/.test(client.code_postal) && client.ville);
  const piecesDone = !!(files.cni && files.justificatif_domicile && files.coc && vinShapeOk);
  const stepState = [contactDone, piecesDone, priceOk && !!partnerName, !!files.mandat_carte_grise_signe];

  const onClient = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const value = name === "code_postal" ? e.target.value.replace(/[^0-9]/g, "").slice(0, 5) : e.target.value;
    setClient(p => ({ ...p, [name]: value }));
  };
  const onSale = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    const value = name === "partenaire_siret" ? e.target.value.replace(/[^0-9 ]/g, "").slice(0, 17) : name === "cnit_code" ? e.target.value.toUpperCase().slice(0, 40) : name === "prix_vente_ttc" ? e.target.value.replace(/[^0-9.,]/g, "").slice(0, 10) : e.target.value;
    setSale(p => ({ ...p, [name]: value }));
  };

  /** Lecture automatique du COC dès son ajout : VIN (et CNIT si visible) pour le mandat et le certificat de vente. */
  const readCoc = async (file: File) => {
    const id = ++readId.current;
    setCoc({ status: "reading", vin: "", marque: "", type: "", message: "" });
    const fail = (message: string) => { if (id === readId.current) setCoc({ status: "fail", vin: "", marque: "", type: "", message }); };
    const j = await readCocVin(file);
    if (id !== readId.current) return;
    if (!j.ok) return fail(j.error);
    setCoc({ status: "ok", vin: j.vin, marque: j.marque, type: j.type, message: "" });
    if (!vinValid(j.vin)) setManualVin(j.vin);
    if (j.cnit) setSale(p => p.cnit_code ? p : { ...p, cnit_code: j.cnit });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; const list = Array.from(input.files || []);
    if (input.multiple && list.length > MAX_ID_FILES) { alert(`${MAX_ID_FILES} fichiers maximum pour cette pièce.`); input.value = ""; setFiles(p => ({ ...p, [input.name]: "" })); return; }
    setFiles(p => ({ ...p, [input.name]: list.length > 1 ? `${list.length} fichiers` : list[0]?.name || "" }));
    if (input.name === "coc") { if (list[0]) readCoc(list[0]); else { readId.current++; setCoc({ status: "idle", vin: "", marque: "", type: "", message: "" }); } }
  };
  const setFileName = (name: string, fileName: string) => setFiles(p => p[name] === fileName ? p : ({ ...p, [name]: fileName }));

  const jsPDF = () => {
    const ctor = (window as unknown as { jspdf?: { jsPDF: JsPdfCtor } }).jspdf?.jsPDF;
    if (!ctor) alert("Le générateur PDF est encore en cours de chargement. Réessayez dans quelques secondes.");
    return ctor || null;
  };

  /* ───── Mandat d'immatriculation (même mandat que le parcours client), avec le VIN du COC ───── */
  const buildMandat = (sig?: Signature) => {
    const m = [!client.nom && "nom", !client.prenom && "prénom", !client.adresse && "adresse", !client.code_postal && "code postal", !client.ville && "ville"].filter(Boolean);
    if (m.length) { alert(`Complétez d’abord les coordonnées du client : ${m.join(", ")}.`); return null; }
    if (!vinShapeOk) { alert(coc.status === "reading" ? "Le VIN est en cours de lecture sur le COC : patientez quelques secondes." : "Ajoutez d’abord le COC : le VIN du véhicule figure sur le mandat."); document.getElementById("doc-coc")?.scrollIntoView({ behavior: "smooth", block: "center" }); return null; }
    const ctor = jsPDF(); if (!ctor) return null;
    return writeMandat(new ctor(), client, today, sig, vin);
  };
  const downloadMandat = () => buildMandat()?.save(`mandat-carte-grise-${safeFileName(client.nom)}.pdf`);
  const signMandat = async (sig: Signature) => buildMandat(sig)?.output("blob") ?? null;

  /* ───── Certificat de vente : vendeur = le partenaire, acheteur = le client (généré automatiquement, sans signature, ne vaut pas facture) ───── */
  const buildCertificat = () => {
    const ctor = jsPDF(); if (!ctor) return null;
    return writeCertificat(new ctor(), {
      date: today,
      seller: [partnerName, sale.partenaire_siret.trim() ? `SIRET : ${sale.partenaire_siret.trim()}` : "", sale.partenaire_adresse.trim()],
      buyer: [clientName, client.adresse.trim(), `${client.code_postal} ${client.ville.trim()}`, client.telephone.trim(), client.email.trim()],
      vehicle: [modelLabel ? `Modèle : ${modelLabel}` : "", `Numéro d’identification (VIN) : ${vin}`, sale.cnit_code.trim() ? `CNIT : ${sale.cnit_code.trim()}` : ""],
      prices: hasPrice && priceOk ? [["Prix de vente TTC", pdfEuros(price)]] : [],
      statement: `${partnerName} certifie avoir vendu le véhicule désigné ci-dessus à ${clientName}${hasPrice && priceOk ? ", au prix indiqué" : ""}.`,
      footer: `Établi par ${partnerName} le ${today} via le formulaire partenaire NeoDrive. NeoDrive (MK HOLDING SAS) n’est pas le vendeur : elle réalise uniquement les démarches d’immatriculation pour le compte de l’acheteur, sur mandat signé.`,
    });
  };
  const previewCertificat = () => {
    if (!partnerName || !priceOk || !vinShapeOk || !clientName) { alert(!priceOk ? "Le prix de vente doit être un montant en euros (ou laissez-le vide)." : "Complétez d’abord le client, le COC (VIN) et le nom du partenaire."); return; }
    buildCertificat()?.save(`certificat-vente-${safeFileName(client.nom)}.pdf`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const has = (name: string) => !!form.querySelector<HTMLInputElement>(`input[type=file][name="${name}"]`)?.files?.length;
    const checks: [boolean, string, string][] = [
      [has("coc"), "doc-coc", "Ajoutez le COC (la première page avec le VIN)."],
      [coc.status !== "reading", "doc-coc", "Le VIN est en cours de lecture sur le COC : patientez quelques secondes."],
      [vinShapeOk, needManual ? "vin" : "doc-coc", "Le numéro de série (VIN) doit faire 17 caractères, sans les lettres I, O et Q."],
      [has("cni"), "doc-cni", "Ajoutez la pièce d’identité du client."],
      [has("justificatif_domicile"), "doc-domicile", "Ajoutez le justificatif de domicile du client."],
      [!!partnerName, "partenaire", "Indiquez le nom du partenaire."],
      [priceOk, "prix", "Le prix de vente doit être un montant en euros (ou laissez-le vide)."],
      [has("mandat_carte_grise_signe"), "sign-mandat", "Signez le mandat (avec le doigt dans le cadre, ou en important le mandat signé)."],
    ];
    const missing = checks.find(([ok]) => !ok);
    if (missing) { alert(missing[2]); document.getElementById(missing[1])?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (sendingRef.current) return;
    // Certificat de vente généré et joint au dossier (champ fichier si possible, sinon directement dans la copie privée).
    const certificat = buildCertificat(); if (!certificat) return;
    const file = new File([certificat.output("blob")], `certificat-vente-${safeFileName(client.nom)}.pdf`, { type: "application/pdf" });
    const attached = putFile(certificatRef.current, file);
    // Même envoi que /reservation-carte-grise : copie privée NeoDrive (best effort, 30 s max), puis Formspree quoi qu'il arrive.
    sendingRef.current = true; setSending(true);
    storeDossierCopy(form, 30000, attached ? [] : [{ key: "certificat_vente", file }]).finally(() => {
      HTMLFormElement.prototype.submit.call(form);
      setTimeout(() => { sendingRef.current = false; setSending(false); }, 15000);
    });
  };

  type Opts = { type?: string; autoComplete?: string; wide?: boolean; placeholder?: string; inputMode?: "text" | "tel" | "email" | "numeric" | "decimal"; required?: boolean; list?: string; hint?: string; id?: string; maxLength?: number };
  const input = (state: Record<string, string>, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, name: string, label: string, opts: Opts = {}) => {
    const { type = "text", autoComplete, wide, placeholder, inputMode, required = true, list, hint, id, maxLength } = opts;
    return <label className={`${s.field} ${wide ? s.wide : ""}`} key={name}>
      <span>{label}{!required ? <em>(facultatif)</em> : null}</span>
      <span className={s.inputWrap}>
        <input id={id} name={name} required={required} type={type} autoComplete={autoComplete} placeholder={placeholder} list={list} inputMode={inputMode} maxLength={maxLength} value={state[name]} onChange={onChange} />
        {state[name].trim() ? <i className={s.ok}>{Icon.check}</i> : null}
      </span>
      {hint ? <em>{hint}</em> : null}
    </label>;
  };
  const cField = (name: keyof typeof client, label: string, opts: Opts = {}) => input(client, onClient, name, label, opts);
  const sField = (name: keyof typeof sale, label: string, opts: Opts = {}) => input(sale, onSale, name, label, opts);

  const fileInput = (name: string, title: string, hint: string, required: boolean, opts: { id?: string; multiple?: boolean } = {}) => (
    <label id={opts.id} className={`${c.file} ${files[name] ? c.fileDone : ""}`} style={{ scrollMarginTop: 90 }}>
      <span className={c.fileHead}><span><b>{title}</b><small>{hint}</small></span><em className={required ? c.req : ""}>{files[name] ? (files[name].endsWith("fichiers") ? `${files[name]} ajoutés` : "Ajouté") : required ? "Obligatoire" : "Facultatif"}</em></span>
      <input type="file" name={name} accept=".pdf,image/*" required={required} multiple={opts.multiple} onChange={onFile} />
    </label>
  );

  const notesValue = partnerName ? `Partenaire : ${partnerName} — carte grise offerte par NeoDrive` : "Client d’un partenaire NeoDrive — carte grise offerte par NeoDrive";

  return (
    <main className={s.page}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      {/* EN-TÊTE */}
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.kicker}><i /> Partenaire NeoDrive{partnerName ? ` · ${partnerName}` : ""}</span>
          <h1>Carte grise<br /><span>de votre client.</span></h1>
          <p>Ce dossier sert à faire la carte grise du client d’un partenaire NeoDrive{partnerName ? <> (<b>{partnerName}</b>)</> : null}. <b>La carte grise est prise en charge par NeoDrive : rien à payer, ni pour vous, ni pour votre client.</b></p>
          <p style={{ marginTop: 12 }}>Quelques minutes depuis votre téléphone : les coordonnées du client, trois documents en photo et la signature du mandat. Nous nous occupons du reste.</p>
          <div className={s.heroCtas}>
            <a href="#dossier" className={s.btnPrimary}>Commencer le dossier</a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className={s.btnLink}>{Icon.chat} Une question ?</a>
          </div>
        </div>
        <figure className={s.heroMedia}>
          <picture><img src="/reservation/neodrive-jardin-mobile.webp" alt="NeoDrive garée dans un jardin ensoleillé" fetchPriority="high" /></picture>
          <div className={s.heroFloat}><span className={s.heroFloatIcon}>{Icon.gift}</span><div><strong>Carte grise offerte</strong><small>Prise en charge par NeoDrive</small></div></div>
        </figure>
      </section>

      <ul className={s.trust}>
        <li><span>{Icon.gift}</span><div><b>Rien à payer</b><small>Carte grise prise en charge</small></div></li>
        <li><span>{Icon.upload}</span><div><b>Documents en photo</b><small>Le VIN est lu sur le COC</small></div></li>
        <li><span>{Icon.doc}</span><div><b>Certificat de vente</b><small>Joint automatiquement</small></div></li>
        <li><span>{Icon.pen}</span><div><b>Mandat au doigt</b><small>Signé à l’écran</small></div></li>
      </ul>

      <div className={s.layout} id="dossier">
        <form ref={formRef} action="https://formspree.io/f/xjgjrqqg" method="POST" encType="multipart/form-data" className={s.form} onSubmit={onSubmit}>
          <input type="hidden" name="_subject" value={`Dossier carte grise – CLIENT PARTENAIRE ${partnerName || "(partenaire)"} (carte grise offerte, pas une vente NeoDrive)`} />
          <input type="hidden" name="type_demande" value={`client partenaire${partnerName ? ` ${partnerName}` : ""} : dossier carte grise (certificat de vente du partenaire, mandat, COC, pièces)`} />
          <input type="hidden" name="service_carte_grise" value="oui (offerte par NeoDrive)" />
          <input type="hidden" name="prise_en_charge" value={notesValue} />
          <input type="hidden" name="vin" value={vinShapeOk ? vin : ""} />
          <input type="hidden" name="vin_source" value={vinSource} />
          <input type="hidden" name="coc_marque" value={coc.marque} />
          <input type="hidden" name="coc_type" value={coc.type} />
          <input type="hidden" name="date_vente" value={today} />
          <input ref={certificatRef} type="file" name="certificat_vente" accept="application/pdf" hidden tabIndex={-1} aria-hidden="true" />

          <ol className={s.progress} style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }} aria-label="Étapes du dossier">
            {["Client", "Pièces", "Prix", "Mandat"].map((t, i) => <li key={t} className={stepState[i] ? s.done : ""}><b>{stepState[i] ? Icon.check : i + 1}</b><span>{t}</span></li>)}
          </ol>

          {/* 1 — CLIENT */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>1</span><div><h2>Votre client</h2><p>La personne au nom de qui la carte grise sera faite.</p></div></header>
            <div className={s.fields}>
              {cField("prenom", "Prénom", { autoComplete: "off", placeholder: "Prénom" })}
              {cField("nom", "Nom", { autoComplete: "off", placeholder: "Nom" })}
              {cField("telephone", "Téléphone", { required: false, type: "tel", autoComplete: "off", inputMode: "tel", placeholder: "06 12 34 56 78" })}
              {cField("email", "Adresse e-mail", { required: false, type: "email", autoComplete: "off", inputMode: "email", placeholder: "client@exemple.fr" })}
              {cField("adresse", "Adresse", { autoComplete: "off", wide: true, placeholder: "N° et rue" })}
              {cField("code_postal", "Code postal", { inputMode: "numeric", autoComplete: "off", placeholder: "Ex. 31600", maxLength: 5 })}
              {cField("ville", "Ville", { autoComplete: "off", list: "cgp-cities" })}
            </div>
            <datalist id="cgp-cities">{postalCities.map(city => <option key={city} value={city} />)}</datalist>
            <p className={s.note}>Mettez l’adresse exacte du client : elle doit être la même que sur son justificatif de domicile.</p>
          </section>

          {/* 2 — PIÈCES */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>2</span><div><h2>Les documents</h2><p>Photo bien lisible ou PDF, prise directement avec votre téléphone.</p></div></header>
            <div className={c.docGrid}>
              {fileInput("coc", "Certificat de conformité (COC)", "La première page avec le numéro d’identification (VIN)", true, { id: "doc-coc" })}
              {fileInput("cni", "Pièce d’identité du client", "Carte d’identité recto et verso (2 photos possibles) ou passeport", true, { id: "doc-cni", multiple: true })}
              {fileInput("justificatif_domicile", "Justificatif de domicile du client", "De moins de 6 mois, à son nom et à son adresse (facture d’électricité, d’eau, d’internet, assurance habitation…)", true, { id: "doc-domicile" })}
            </div>

            <div aria-live="polite">
              {coc.status === "reading" ? <p style={{ ...vinBox, background: "#f3f7ff", color: "#2b4a8a" }}>Lecture du VIN sur le COC…</p> : null}
              {readOk ? <p style={{ ...vinBox, background: "#ecf8f0", color: "#15803d" }}><b>✓ VIN lu sur le COC : <span style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".04em" }}>{coc.vin}</span></b>{coc.marque || coc.type ? <><br /><span style={{ color: "#234" }}>{[coc.marque, coc.type].filter(Boolean).join(" · ")}</span></> : null}</p> : null}
            </div>
            {needManual ? (
              <div className={s.fields} style={{ marginTop: 12 }}>
                <label className={`${s.field} ${s.wide}`}>
                  <span>Numéro de série (VIN)</span>
                  <span className={s.inputWrap}>
                    <input id="vin" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={17} placeholder="17 caractères, sur le COC" value={manualVin} onChange={e => setManualVin(cleanVin(e.target.value))} style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".06em" }} />
                    {vinShapeOk ? <i className={s.ok}>{Icon.check}</i> : null}
                  </span>
                  <em style={{ color: vinShapeOk && vinValid(manualVin) ? "#15803d" : "#b45309" }}>
                    {coc.status === "fail" ? `${coc.message} Recopiez le numéro depuis le COC (rubrique « numéro d’identification »).` : "Vérifiez le numéro lu sur le COC, caractère par caractère."}
                    {manualVin.length > 0 && manualVin.length < 17 ? ` ${manualVin.length} / 17 caractères.` : /[IOQ]/.test(manualVin) ? " Un VIN ne contient jamais I, O ou Q (souvent 1 ou 0)." : ""}
                  </em>
                </label>
              </div>
            ) : null}

            <div className={s.fields} style={{ marginTop: 16 }}>
              {sField("cnit_code", "CNIT", { required: false, wide: true, autoComplete: "off", placeholder: "Code CNIT", hint: "Le CNIT envoyé par NeoDrive" })}
            </div>
          </section>

          {/* 3 — PRIX DE VENTE */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>3</span><div><h2>Prix de vente</h2><p>Un certificat de vente à votre nom est créé et joint au dossier : il prouve la vente pour la carte grise (il ne remplace pas votre facture).</p></div></header>
            <div className={s.fields}>
              <label className={`${s.field} ${s.wide}`}>
                <span>Prix de vente TTC payé par votre client (€) <em>(facultatif)</em></span>
                <span className={s.inputWrap}><input id="prix" name="prix_vente_ttc" inputMode="decimal" autoComplete="off" placeholder="Ex. 8990" value={sale.prix_vente_ttc} onChange={onSale} />{hasPrice && priceOk ? <i className={s.ok}>{Icon.check}</i> : null}</span>
                <em>Laissez vide si vous préférez ne pas l’indiquer : il n’apparaîtra pas sur le certificat.</em>
              </label>
              {sField("partenaire", "Nom du partenaire (vendeur)", { id: "partenaire", wide: true, autoComplete: "organization", placeholder: "Ex. Lolan Mobility" })}
              {sField("partenaire_siret", "SIRET", { required: false, inputMode: "numeric", autoComplete: "off", placeholder: "14 chiffres" })}
              <label className={s.field}>
                <span>Modèle <em>(facultatif)</em></span>
                <select name="version" value={sale.version} onChange={onSale} style={selectStyle}>
                  <option value="">{coc.marque || coc.type ? "Comme sur le COC" : "Choisir…"}</option>
                  {MODELES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              {sField("partenaire_adresse", "Adresse du partenaire", { required: false, wide: true, autoComplete: "street-address", placeholder: "N° et rue, code postal, ville" })}
            </div>
            <button type="button" onClick={previewCertificat} className={s.btnGhost} style={{ marginTop: 14 }}>{Icon.download} Voir le certificat de vente</button>
          </section>

          {/* 4 — MANDAT */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>4</span><div><h2>Mandat d’immatriculation</h2><p>Il permet à NeoDrive de faire la carte grise au nom du client.</p></div></header>
            <div className={c.mandat}>
              <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.5 }}>Le mandat est pré-rempli avec les coordonnées du client et le VIN du véhicule.</p>
              <b style={{ display: "block", fontSize: 17, marginBottom: 8 }}>Signature</b>
              <SignOnScreen
                id="sign-mandat" name="mandat_carte_grise_signe" label="Mandat" docWord="le mandat"
                ville={client.ville} date={today} fileName={`mandat-signe-${safeFileName(client.nom)}.pdf`}
                invalidateKey={JSON.stringify([client, vinShapeOk ? vin : ""])} build={signMandat} onFile={setFileName}
                primaryClass={s.btnPrimary} ghostClass={s.btnGhost}
                manual={<>
                  <ol>
                    <li>Téléchargez le mandat pré-rempli</li>
                    <li>Signez-le avec la mention « Lu et approuvé »</li>
                    <li>Importez le mandat signé ci-dessous</li>
                  </ol>
                  <button type="button" onClick={downloadMandat} className={s.btnGhost}>{Icon.download} Télécharger le mandat pré-rempli</button>
                </>}
                renderFileInput={required => fileInput("mandat_carte_grise_signe", "Mandat signé", "Avec la mention « Lu et approuvé »", required)}
              />
            </div>

            <div className={c.devisActions}>
              <button type="submit" className={s.btnPrimary} disabled={sending} aria-busy={sending}>{Icon.lock} {sending ? "Envoi en cours…" : "Envoyer le dossier à NeoDrive"}</button>
            </div>
            <p className={s.note}>NeoDrive vérifie chaque pièce avant de lancer la carte grise. S’il manque quelque chose, nous vous prévenons rapidement.</p>
          </section>
        </form>

        <aside className={s.aside}>
          <div className={s.card} style={{ padding: 20 }}>
            <b style={{ display: "block", fontSize: 17, marginBottom: 8 }}>À préparer</b>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14.5 }}>
              <li>Le COC du véhicule (première page)</li>
              <li>La pièce d’identité du client</li>
              <li>Son justificatif de domicile</li>
              <li>Le prix de vente (facultatif)</li>
            </ul>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#1d7a4c", fontWeight: 700 }}>Carte grise offerte par NeoDrive</p>
          </div>
          <a className={s.help} href={WHATSAPP} target="_blank" rel="noreferrer"><span>{Icon.chat}</span><div><b>Une question sur le dossier&nbsp;?</b><small>NeoDrive vous répond sur WhatsApp</small></div></a>
        </aside>
      </div>
    </main>
  );
}
