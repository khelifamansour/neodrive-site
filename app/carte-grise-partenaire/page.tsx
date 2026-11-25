"use client";

/**
 * Dossier carte grise du client d'un partenaire revendeur (?partenaire=<nom>).
 * Rempli par le partenaire pour son client : aucun devis ni contrat NeoDrive (NeoDrive n'a pas vendu à ce client).
 * Le client (titulaire) signe le mandat d'immatriculation ; le partenaire signe, en tant que vendeur, la facture / certificat de vente générée ici.
 * Même enregistrement que /reservation-carte-grise (copie privée + Formspree) : jamais envoyé automatiquement à NK Services.
 */
import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import s from "../reservation-devis/reservation.module.css";
import c from "../reservation-carte-grise/carte-grise.module.css";
import SignOnScreen, { type Signature } from "../reservation-carte-grise/SignOnScreen";
import { storeDossierCopy } from "../reservation-carte-grise/storeCopy";
import { fitSignature, writeMandat, type MandatPdf } from "../reservation-carte-grise/mandat";
import { vinValid } from "../../lib/shipments";

type Pdf = MandatPdf & { save: (name: string) => void; output: (type: "blob") => Blob; getTextWidth: (t: string) => number };
type JsPdfCtor = new (...args: unknown[]) => Pdf;

const WHATSAPP = "https://wa.me/33676192234?text=" + encodeURIComponent("Bonjour, je suis partenaire NeoDrive et j’ai une question sur le dossier carte grise d’un client.");
const MODELES: { value: string; label: string }[] = [
  { value: "essentiel", label: "NeoDrive Essentielle" },
  { value: "confort", label: "NeoDrive Confort" },
  { value: "confortPlus", label: "NeoDrive Confort Plus" },
];
const MAX_ID_FILES = 4;

const Icon = {
  doc: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg>,
  user: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>,
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l1.3-3.6A7.8 7.8 0 1112 20a8 8 0 01-3.9-1z" /></svg>,
  download: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>,
  upload: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></svg>,
  gift: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M12 9v11M4 13h16M12 9c-2.5 0-4.5-1-4.5-2.7S9.6 3.8 12 9c2.4-5.2 4.5-4.4 4.5-2.7S14.5 9 12 9z" /></svg>,
  car: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v2H3zM7 11h10" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="16.5" cy="18.5" r="1.5" /></svg>,
  pen: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" /></svg>,
};

const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 52, border: "1.5px solid #e0d9cf", borderRadius: 14, padding: "14px 15px", font: "inherit", fontSize: 16, fontWeight: 500, color: "#16202e", background: "#fff" };
const who: React.CSSProperties = { display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 16, margin: "0 0 12px", lineHeight: 1.5, fontSize: 15 };

/** Texte compatible avec les polices standard de jsPDF (pas d'espaces fines insécables). */
const pdfText = (v: string) => v.replace(/[  ]/g, " ");
const euros = (n: number) => pdfText(new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)) + " €";
const safeFileName = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "client";
const cleanVin = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
const frDate = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

export default function CarteGrisePartenaire() {
  const today = new Date().toLocaleDateString("fr-FR");
  const todayIso = new Date().toLocaleDateString("sv-SE");

  const [client, setClient] = useState({ nom: "", prenom: "", telephone: "", email: "", adresse: "", code_postal: "", ville: "" });
  const [vehicle, setVehicle] = useState({ vin: "", cnit_code: "", version: "", prix_vente_ttc: "", date_vente: "" });
  const [seller, setSeller] = useState({ partenaire: "", partenaire_siret: "", partenaire_adresse: "", partenaire_code_postal: "", partenaire_ville: "", partenaire_signataire: "", facture_numero: "" });
  const [files, setFiles] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<{ postal: string; list: string[] } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);

  // Nom du partenaire repris du lien (?partenaire=…), modifiable.
  useEffect(() => {
    try {
      const p = (new URLSearchParams(location.search).get("partenaire") || "").trim().slice(0, 120);
      if (p) setSeller(v => v.partenaire ? v : { ...v, partenaire: p });
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

  const partnerName = seller.partenaire.trim();
  const clientName = `${client.prenom} ${client.nom}`.trim();
  const vin = vehicle.vin;
  const vinShapeOk = vin.length === 17 && !/[IOQ]/.test(vin);
  const vinCheckOk = vinShapeOk && vinValid(vin);
  const price = Number(vehicle.prix_vente_ttc.replace(",", "."));
  const priceOk = vehicle.prix_vente_ttc.trim() !== "" && Number.isFinite(price) && price > 0;
  const modelLabel = MODELES.find(m => m.value === vehicle.version)?.label || "";

  const contactDone = !!(client.nom && client.prenom && client.telephone && client.email && client.adresse && /^[0-9]{5}$/.test(client.code_postal) && client.ville);
  const vehicleDone = vinShapeOk;
  const piecesDone = !!(files.cni && files.justificatif_domicile && files.coc);
  const stepState = [contactDone, vehicleDone, piecesDone, !!files.mandat_carte_grise_signe, !!files.facture_partenaire];

  const onClient = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const value = name === "code_postal" ? e.target.value.replace(/[^0-9]/g, "").slice(0, 5) : e.target.value;
    setClient(p => ({ ...p, [name]: value }));
  };
  const onSeller = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const value = name === "partenaire_code_postal" ? e.target.value.replace(/[^0-9]/g, "").slice(0, 5) : name === "partenaire_siret" ? e.target.value.replace(/[^0-9 ]/g, "").slice(0, 17) : e.target.value;
    setSeller(p => ({ ...p, [name]: value }));
  };
  const onVehicle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    const value = name === "vin" ? cleanVin(e.target.value) : name === "cnit_code" ? e.target.value.toUpperCase().slice(0, 40) : name === "prix_vente_ttc" ? e.target.value.replace(/[^0-9.,]/g, "").slice(0, 10) : e.target.value;
    setVehicle(p => ({ ...p, [name]: value }));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; const list = Array.from(input.files || []);
    if (input.multiple && list.length > MAX_ID_FILES) { alert(`${MAX_ID_FILES} fichiers maximum pour cette pièce.`); input.value = ""; setFiles(p => ({ ...p, [input.name]: "" })); return; }
    setFiles(p => ({ ...p, [input.name]: list.length > 1 ? `${list.length} fichiers` : list[0]?.name || "" }));
  };
  const setFileName = (name: string, fileName: string) => setFiles(p => p[name] === fileName ? p : ({ ...p, [name]: fileName }));

  const jsPDF = () => {
    const ctor = (window as unknown as { jspdf?: { jsPDF: JsPdfCtor } }).jspdf?.jsPDF;
    if (!ctor) alert("Le générateur PDF est encore en cours de chargement. Réessayez dans quelques secondes.");
    return ctor || null;
  };
  const missingText = (list: (string | false)[], what: string) => {
    const m = list.filter(Boolean);
    if (m.length) alert(`Complétez d’abord ${what} : ${m.join(", ")}.`);
    return m.length > 0;
  };

  /* ───── Mandat : signé par le client, titulaire de la carte grise ───── */
  const buildMandat = (sig?: Signature) => {
    if (missingText([!client.nom && "nom du client", !client.prenom && "prénom du client", !client.adresse && "adresse", !client.code_postal && "code postal", !client.ville && "ville"], "les coordonnées du client")) return null;
    const ctor = jsPDF(); if (!ctor) return null;
    return writeMandat(new ctor(), client, today, sig, vinShapeOk ? vin : undefined);
  };
  const downloadMandat = () => buildMandat()?.save(`mandat-carte-grise-${safeFileName(client.nom)}.pdf`);
  const signMandat = async (sig: Signature) => buildMandat(sig)?.output("blob") ?? null;

  /* ───── Facture / certificat de vente : le vendeur est le partenaire, signée par le partenaire ───── */
  const buildFacture = (sig?: Signature) => {
    if (missingText([
      !partnerName && "nom du partenaire", !seller.partenaire_adresse.trim() && "adresse du partenaire", !/^[0-9]{5}$/.test(seller.partenaire_code_postal) && "code postal du partenaire", !seller.partenaire_ville.trim() && "ville du partenaire", !seller.partenaire_signataire.trim() && "nom du signataire",
      !client.nom && "nom du client", !client.prenom && "prénom du client", !client.adresse && "adresse du client", !client.ville && "ville du client",
      !vinShapeOk && "VIN (17 caractères)", !priceOk && "prix de vente TTC",
    ], "la facture")) return null;
    const ctor = jsPDF(); if (!ctor) return null;
    const pdf = new ctor();
    const dateVente = frDate(vehicle.date_vente || todayIso);
    pdf.setFontSize(16);
    pdf.text("FACTURE DE VENTE – CERTIFICAT DE VENTE", 20, 20);
    pdf.setFontSize(10);
    pdf.text(`${seller.facture_numero.trim() ? `N° ${seller.facture_numero.trim()}   ·   ` : ""}Date : ${today}`, 20, 28);

    pdf.setFontSize(12); pdf.text("Vendeur", 20, 42); pdf.text("Acheteur", 110, 42);
    pdf.setFontSize(10);
    const sellerLines = [partnerName, seller.partenaire_siret.trim() ? `SIRET : ${seller.partenaire_siret.trim()}` : "", seller.partenaire_adresse.trim(), `${seller.partenaire_code_postal} ${seller.partenaire_ville.trim()}`].filter(Boolean);
    const buyerLines = [clientName, client.adresse.trim(), `${client.code_postal} ${client.ville.trim()}`, client.telephone.trim(), client.email.trim()].filter(Boolean);
    sellerLines.forEach((t, i) => pdf.text(pdfText(t), 20, 50 + i * 6, { maxWidth: 82 }));
    buyerLines.forEach((t, i) => pdf.text(pdfText(t), 110, 50 + i * 6, { maxWidth: 82 }));

    pdf.setFontSize(12); pdf.text("Véhicule vendu", 20, 92);
    pdf.setFontSize(10);
    pdf.text("Voiturette électrique neuve (quadricycle léger, catégorie L6e) – marque NeoDrive", 20, 100, { maxWidth: 170 });
    if (modelLabel) pdf.text(`Modèle : ${modelLabel}`, 20, 107);
    pdf.text(`Numéro d’identification (VIN) : ${vin}`, 20, 114);
    if (vehicle.cnit_code.trim()) pdf.text(`CNIT : ${pdfText(vehicle.cnit_code.trim())}`, 20, 121);
    pdf.text(`Date de la vente : ${dateVente}`, 20, 128);

    pdf.line(20, 138, 190, 138);
    pdf.setFontSize(12);
    pdf.text("Prix de vente TTC", 20, 146); pdf.text(euros(price), 190 - pdf.getTextWidth(euros(price)), 146);
    pdf.line(20, 151, 190, 151);

    pdf.setFontSize(10);
    pdf.text(pdfText(`Le vendeur, ${partnerName}, certifie avoir vendu le véhicule désigné ci-dessus à ${clientName}, le ${dateVente}, au prix indiqué.`), 20, 162, { maxWidth: 170 });

    pdf.setFontSize(11);
    pdf.text("Le vendeur – Lu et approuvé", 20, 185);
    pdf.text(pdfText(`Fait à ${seller.partenaire_ville.trim()}, le ${today}`), 20, 192);
    pdf.text(pdfText(`Pour ${partnerName} : ${seller.partenaire_signataire.trim()}`), 20, 199, { maxWidth: 170 });
    if (sig) {
      const size = fitSignature(sig, 90, 22);
      pdf.addImage(sig.png, "PNG", 22, 228.5 - size.h, size.w, size.h, undefined, "FAST");
    }
    pdf.line(20, 230, 120, 230);
    pdf.setFontSize(8.5);
    if (sig) pdf.text(pdfText(`Signé à l’écran par ${seller.partenaire_signataire.trim()}, pour le vendeur ${partnerName}, le ${today}, précédé de la mention « Lu et approuvé ».`), 20, 236, { maxWidth: 170 });
    pdf.text(pdfText("Document établi et signé par le vendeur. NeoDrive (MK HOLDING SAS) n’est pas partie à cette vente : elle réalise uniquement les démarches d’immatriculation pour le compte de l’acheteur, sur mandat signé par celui-ci."), 20, 270, { maxWidth: 170 });
    return pdf;
  };
  const downloadFacture = () => buildFacture()?.save(`facture-vente-${safeFileName(client.nom)}.pdf`);
  const signFacture = async (sig: Signature) => buildFacture(sig)?.output("blob") ?? null;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const has = (name: string) => !!form.querySelector<HTMLInputElement>(`input[type=file][name="${name}"]`)?.files?.length;
    if (!vinShapeOk) { alert("Le VIN doit faire 17 caractères (sans les lettres I, O et Q)."); document.getElementById("vin")?.focus(); return; }
    const checks: [boolean, string, string][] = [
      [has("cni"), "doc-cni", "Ajoutez la pièce d’identité du client."],
      [has("justificatif_domicile"), "doc-domicile", "Ajoutez le justificatif de domicile du client."],
      [has("coc"), "doc-coc", "Ajoutez le COC (la première page avec le VIN)."],
      [has("mandat_carte_grise_signe"), "sign-mandat", "Signez le mandat (avec le doigt dans le cadre, ou en important le mandat signé)."],
      [has("facture_partenaire"), "sign-facture", "Signez la facture de vente en tant que vendeur (avec le doigt dans le cadre, ou en important la facture signée)."],
    ];
    const missing = checks.find(([ok]) => !ok);
    if (missing) { alert(missing[2]); document.getElementById(missing[1])?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    // Même envoi que /reservation-carte-grise : copie privée NeoDrive (best effort, 30 s max), puis Formspree quoi qu'il arrive.
    if (sendingRef.current) return;
    sendingRef.current = true; setSending(true);
    storeDossierCopy(form).finally(() => {
      HTMLFormElement.prototype.submit.call(form);
      setTimeout(() => { sendingRef.current = false; setSending(false); }, 15000);
    });
  };

  const input = (state: Record<string, string>, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, name: string, label: string, opts: { type?: string; autoComplete?: string; wide?: boolean; placeholder?: string; inputMode?: "text" | "tel" | "email" | "numeric" | "decimal"; required?: boolean; list?: string; hint?: string; id?: string; maxLength?: number } = {}) => {
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
  const cField = (name: keyof typeof client, label: string, opts: Parameters<typeof input>[4] = {}) => input(client, onClient, name, label, opts);
  const pField = (name: keyof typeof seller, label: string, opts: Parameters<typeof input>[4] = {}) => input(seller, onSeller, name, label, opts);

  const fileInput = (name: string, title: string, hint: string, required: boolean, opts: { id?: string; multiple?: boolean } = {}) => (
    <label id={opts.id} className={`${c.file} ${files[name] ? c.fileDone : ""}`}>
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
          <p style={{ marginTop: 12 }}>Vous remplissez le dossier pour votre client, en 5 minutes, depuis votre téléphone. Le mandat et la facture se signent avec le doigt.</p>
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
        <li><span>{Icon.upload}</span><div><b>Documents en ligne</b><small>Photo ou PDF acceptés</small></div></li>
        <li><span>{Icon.pen}</span><div><b>Signature au doigt</b><small>Mandat et facture</small></div></li>
        <li><span>{Icon.doc}</span><div><b>Suivi par NeoDrive</b><small>Nous vérifions chaque pièce</small></div></li>
      </ul>

      <div className={s.layout} id="dossier">
        <form ref={formRef} action="https://formspree.io/f/xjgjrqqg" method="POST" encType="multipart/form-data" className={s.form} onSubmit={onSubmit} noValidate={false}>
          <input type="hidden" name="_subject" value={`Dossier carte grise – CLIENT PARTENAIRE ${partnerName || "(partenaire)"} (carte grise offerte, pas une vente NeoDrive)`} />
          <input type="hidden" name="type_demande" value={`client partenaire${partnerName ? ` ${partnerName}` : ""} : dossier carte grise (facture du partenaire, mandat, COC, pièces)`} />
          <input type="hidden" name="service_carte_grise" value="oui (offerte par NeoDrive)" />
          <input type="hidden" name="prise_en_charge" value={notesValue} />

          <ol className={`${s.progress} ${c.progress5}`} aria-label="Étapes du dossier">
            {["Client", "Véhicule", "Pièces", "Mandat", "Vente"].map((t, i) => <li key={t} className={stepState[i] ? s.done : ""}><b>{stepState[i] ? Icon.check : i + 1}</b><span>{t}</span></li>)}
          </ol>

          {/* 1 — CLIENT */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>1</span><div><h2>Votre client</h2><p>La personne au nom de qui la carte grise sera faite.</p></div></header>
            <div className={s.fields}>
              {cField("prenom", "Prénom", { autoComplete: "off", placeholder: "Prénom" })}
              {cField("nom", "Nom", { autoComplete: "off", placeholder: "Nom" })}
              {cField("telephone", "Téléphone", { type: "tel", autoComplete: "off", inputMode: "tel", placeholder: "06 12 34 56 78" })}
              {cField("email", "Adresse e-mail", { type: "email", autoComplete: "off", inputMode: "email", placeholder: "client@exemple.fr" })}
              {cField("adresse", "Adresse", { autoComplete: "off", wide: true, placeholder: "N° et rue" })}
              {cField("code_postal", "Code postal", { inputMode: "numeric", autoComplete: "off", placeholder: "Ex. 31600", maxLength: 5 })}
              {cField("ville", "Ville", { autoComplete: "off", list: "cgp-cities" })}
            </div>
            <datalist id="cgp-cities">{postalCities.map(city => <option key={city} value={city} />)}</datalist>
            <p className={s.note}>Mettez l’adresse exacte du client : elle doit être la même que sur son justificatif de domicile.</p>
          </section>

          {/* 2 — VÉHICULE */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>2</span><div><h2>Le véhicule</h2><p>Le numéro VIN est sur le COC, à la rubrique « numéro d’identification ».</p></div></header>
            <div className={s.fields}>
              <label className={`${s.field} ${s.wide}`}>
                <span>VIN (numéro d’identification, 17 caractères)</span>
                <span className={s.inputWrap}>
                  <input id="vin" name="vin" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={17} placeholder="Ex. LJ1EKABR0P1234567" value={vehicle.vin} onChange={onVehicle} style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".06em" }} />
                  {vinCheckOk ? <i className={s.ok}>{Icon.check}</i> : null}
                </span>
                <em style={{ color: !vin ? undefined : !vinShapeOk ? "#b45309" : vinCheckOk ? "#15803d" : "#b45309" }}>
                  {!vin ? "Recopiez-le depuis le COC." : vin.length < 17 ? `${vin.length} / 17 caractères` : /[IOQ]/.test(vin) ? "Un VIN ne contient jamais les lettres I, O ou Q : vérifiez (souvent 1 ou 0)." : vinCheckOk ? "VIN valide" : "La clé de contrôle ne tombe pas juste : vérifiez chaque caractère. Nous le recouperons avec le COC."}
                </em>
              </label>
              <label className={s.field}>
                <span>Modèle <em>(facultatif)</em></span>
                <select name="version" value={vehicle.version} onChange={onVehicle} style={selectStyle}>
                  <option value="">Choisir…</option>
                  {MODELES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              <label className={s.field}>
                <span>CNIT <em>(facultatif)</em></span>
                <span className={s.inputWrap}><input name="cnit_code" autoComplete="off" spellCheck={false} value={vehicle.cnit_code} onChange={onVehicle} placeholder="Code CNIT" /></span>
                <em>Le CNIT envoyé par NeoDrive</em>
              </label>
            </div>
          </section>

          {/* 3 — PIÈCES */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>3</span><div><h2>Les documents</h2><p>Photo bien lisible ou PDF, prise directement avec votre téléphone.</p></div></header>
            <div className={c.docGrid}>
              {fileInput("coc", "Certificat de conformité (COC)", "La première page avec le numéro d’identification (VIN)", true, { id: "doc-coc" })}
              {fileInput("cni", "Pièce d’identité du client", "Carte d’identité recto et verso (2 photos possibles) ou passeport", true, { id: "doc-cni", multiple: true })}
              {fileInput("justificatif_domicile", "Justificatif de domicile du client", "De moins de 6 mois, à son nom et à son adresse (facture d’électricité, d’eau, d’internet, assurance habitation…)", true, { id: "doc-domicile" })}
            </div>
          </section>

          {/* 4 — MANDAT (CLIENT) */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>4</span><div><h2>Mandat d’immatriculation</h2><p>Il permet à NeoDrive de faire la carte grise au nom de votre client.</p></div></header>
            <div className={c.mandat}>
              <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.5 }}>Le mandat est pré-rempli avec les coordonnées du client.</p>
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
          </section>

          {/* 5 — VENTE (PARTENAIRE) */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>5</span><div><h2>Facture de vente</h2><p>C’est vous qui avez vendu le véhicule à votre client : cette facture le prouve pour la carte grise.</p></div></header>
            <div className={s.subHead} style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}><i>{Icon.doc}</i><div><h3>Le vendeur : vous</h3><p>Ces informations apparaissent sur la facture.</p></div></div>
            <div className={s.fields}>
              {pField("partenaire", "Nom du partenaire (raison sociale)", { wide: true, autoComplete: "organization", placeholder: "Ex. Lolan Mobility" })}
              {pField("partenaire_siret", "SIRET", { required: false, inputMode: "numeric", autoComplete: "off", placeholder: "14 chiffres" })}
              {pField("facture_numero", "N° de facture", { required: false, autoComplete: "off", placeholder: "Votre numérotation" })}
              {pField("partenaire_adresse", "Adresse du partenaire", { wide: true, autoComplete: "street-address", placeholder: "N° et rue" })}
              {pField("partenaire_code_postal", "Code postal", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 5 })}
              {pField("partenaire_ville", "Ville", { autoComplete: "address-level2" })}
              {pField("partenaire_signataire", "Nom de la personne qui signe", { wide: true, autoComplete: "name", placeholder: "Prénom Nom", hint: "Vous, au nom du partenaire vendeur." })}
            </div>
            <div className={s.subHead}><i>{Icon.car}</i><div><h3>La vente</h3><p>Le prix payé par votre client.</p></div></div>
            <div className={s.fields}>
              <label className={s.field}>
                <span>Prix de vente TTC (€)</span>
                <span className={s.inputWrap}><input name="prix_vente_ttc" required inputMode="decimal" autoComplete="off" placeholder="Ex. 8990" value={vehicle.prix_vente_ttc} onChange={onVehicle} />{priceOk ? <i className={s.ok}>{Icon.check}</i> : null}</span>
              </label>
              <label className={s.field}>
                <span>Date de la vente</span>
                <span className={s.inputWrap}><input name="date_vente" type="date" max={todayIso} value={vehicle.date_vente || todayIso} onChange={onVehicle} /></span>
              </label>
            </div>

            <div className={c.upload} style={{ marginTop: 18 }}>
              <div style={{ ...who, background: "#f3f7ff", border: "1px solid #c9d8f5" }}>
                <span style={{ fontSize: 22, color: "#2b5bb8", display: "flex" }}>{Icon.pen}</span>
                <span><b style={{ fontSize: 17 }}>Signature du vendeur{partnerName ? ` (${partnerName})` : ""}</b><br />C’est vous qui signez la facture, en tant que vendeur. Relisez-la avec « Voir le PDF » avant de signer.</span>
              </div>
              <SignOnScreen
                id="sign-facture" name="facture_partenaire" label="Facture" docWord="la facture de vente"
                ville={seller.partenaire_ville} date={today} fileName={`facture-vente-${safeFileName(client.nom)}.pdf`}
                invalidateKey={JSON.stringify([client, seller, vehicle])} build={signFacture} onFile={setFileName}
                primaryClass={s.btnPrimary} ghostClass={s.btnGhost}
                manual={<>
                  <ol className={c.howto} style={{ marginTop: 0 }}>
                    <li>Téléchargez la facture pré-remplie</li>
                    <li>Signez-la en tant que vendeur</li>
                    <li>Importez-la ci-dessous</li>
                  </ol>
                  <button type="button" onClick={downloadFacture} className={s.btnGhost}>{Icon.download} Télécharger la facture pré-remplie</button>
                </>}
                renderFileInput={required => fileInput("facture_partenaire", "Facture de vente signée par le vendeur", "Au nom de votre client, avec le VIN", required)}
              />
              <button type="button" onClick={downloadFacture} className={s.btnGhost} style={{ marginTop: 10 }}>{Icon.download} Voir le PDF de la facture (avant signature)</button>
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
              <li>Le COC du véhicule</li>
              <li>La pièce d’identité du client</li>
              <li>Son justificatif de domicile</li>
              <li>La signature du mandat</li>
              <li>Le prix de vente</li>
            </ul>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#1d7a4c", fontWeight: 700 }}>Carte grise offerte par NeoDrive</p>
          </div>
          <a className={s.help} href={WHATSAPP} target="_blank" rel="noreferrer"><span>{Icon.chat}</span><div><b>Une question sur le dossier&nbsp;?</b><small>NeoDrive vous répond sur WhatsApp</small></div></a>
        </aside>
      </div>
    </main>
  );
}
