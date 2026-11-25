"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { VEHICLES, REGISTRATION_PRICE, calculateQuote, AVAILABILITY, type VehicleKey } from "../../lib/neodrive-pricing";
import s from "../reservation-devis/reservation.module.css";
import c from "./carte-grise.module.css";
import SignOnScreen, { type Signature } from "./SignOnScreen";
import { storeDossierCopy } from "./storeCopy";
import { fitSignature, writeMandat } from "./mandat";
import { NEODRIVE_SELLER, pdfEuros, putFile, readCocVin, writeCertificat, type CocVin } from "./certificat";
import { vinValid } from "../../lib/shipments";

// Bibliothèques chargées par CDN (balises Script ci-dessous) : html2canvas pour le devis, jsPDF pour le devis et le mandat.
type JsPdfCtor = new (...args: unknown[]) => {
  setFontSize: (n: number) => void;
  text: (t: string, x: number, y: number, o?: { maxWidth?: number }) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: "NONE" | "FAST" | "MEDIUM" | "SLOW") => void;
  addPage: () => void;
  save: (name: string) => void;
  output: (type: "blob") => Blob;
  getTextWidth: (t: string) => number;
};
type PdfGlobals = {
  jspdf?: { jsPDF: JsPdfCtor };
  html2canvas?: (el: HTMLElement, o: { scale: number; useCORS: boolean; windowWidth?: number; onclone?: (doc: Document) => void }) => Promise<HTMLCanvasElement>;
};

const euro = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const WHATSAPP = "https://wa.me/33676192234?text=" + encodeURIComponent("Bonjour, j'ai une question sur mon dossier carte grise NeoDrive.");

/** Valeur postée dans le champ « version » (inchangée pour le traitement du dossier) et libellé du devis. */
const VERSION_FORM: Record<VehicleKey, { value: string; devis: string }> = {
  essentielle: { value: "essentiel", devis: "VSP Version Essentiel" },
  confort: { value: "confort", devis: "VSP Version Confort" },
  confortPlus: { value: "confortPlus", devis: "VSP Version Confort Plus+" },
};
const MODELS: Record<VehicleKey, { img: string; tagline: string; badge?: string }> = {
  essentielle: { img: "/reservation/essentielle.svg", tagline: "L’essentiel au meilleur prix" },
  confort: { img: "/reservation/confort.svg", tagline: "Le meilleur équilibre", badge: "Le plus équilibré" },
  confortPlus: { img: "/reservation/confort-plus.svg", tagline: "Tout le confort" },
};

const Icon = {
  truck: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>,
  shield: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M8.8 12.2l2.2 2.2 4.4-4.6" /></svg>,
  doc: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg>,
  pin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>,
  user: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>,
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l1.3-3.6A7.8 7.8 0 1112 20a8 8 0 01-3.9-1z" /></svg>,
  download: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>,
  upload: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></svg>,
};

export default function ReservationCarteGrise() {
  const today = new Date().toLocaleDateString("fr-FR");

  const [model, setModel] = useState<VehicleKey>("confort");
  const [client, setClient] = useState({ nom: "", prenom: "", telephone: "", email: "", adresse: "", code_postal: "", ville: "" });
  const [noDelivery, setNoDelivery] = useState(false);
  const [wantsCarteGriseChoice, setWantsCarteGrise] = useState(true);
  // Client qui a déjà réservé ou reçu son véhicule : il dépose ses documents carte grise, le « devis » devient son contrat de vente (pas de nouvelle commande).
  const [dejaClient, setDejaClient] = useState(false);
  useEffect(() => { try { if (new URLSearchParams(location.search).get("client") === "1") setDejaClient(true); } catch { /* rien */ } }, []);
  // Client existant : il envoie son dossier carte grise, la carte grise est donc forcément confiée à NeoDrive (étape « Carte grise » masquée).
  const wantsCarteGrise = dejaClient || wantsCarteGriseChoice;
  // Client d'un partenaire revendeur : NeoDrive ne lui a rien vendu, aucun devis / contrat NeoDrive ne doit être généré → page dédiée.
  useEffect(() => { try { const p = new URLSearchParams(location.search).get("partenaire"); if (p) location.replace(`/carte-grise-partenaire?partenaire=${encodeURIComponent(p)}`); } catch { /* rien */ } }, []);
  // Options conseiller (non envoyées dans le formulaire, elles ne servent qu'au devis).
  const [quantity, setQuantity] = useState(1);
  const [manualTransport, setManualTransport] = useState("");
  const [discount, setDiscount] = useState(0);
  const [files, setFiles] = useState<Record<string, string>>({});

  // Résultat de la vérification geo.api.gouv.fr pour un code postal donné.
  const [geo, setGeo] = useState<{ postal: string; cities: string[]; unchecked: boolean } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  // Lecture du VIN sur le COC (pour le certificat de vente) et champ fichier qui reçoit le certificat.
  const cocRef = useRef<Promise<CocVin> | null>(null);
  const cocReadId = useRef(0);
  const [cocInfo, setCocInfo] = useState<{ status: "idle" | "reading" | "done"; read: CocVin | null }>({ status: "idle", read: null });
  const [manualVin, setManualVin] = useState("");
  const certificatRef = useRef<HTMLInputElement>(null);

  const postal = client.code_postal;

  // Même vérification de commune que /reservation-devis (geo.api.gouv.fr), sans bloquer si le service ne répond pas.
  useEffect(() => {
    if (!/^[0-9]{5}$/.test(postal)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setGeo({ postal, cities: [], unchecked: true }); }, 6000);
    fetch("https://geo.api.gouv.fr/communes?codePostal=" + postal + "&fields=nom&format=json", { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error("geo " + r.status); return r.json(); })
      .then(d => {
        if (controller.signal.aborted) return;
        const cities: string[] = Array.isArray(d) ? d.map((x: { nom: string }) => x.nom) : [];
        setGeo({ postal, cities, unchecked: false });
        if (cities.length === 1) setClient(p => p.ville ? p : { ...p, ville: cities[0] });
      })
      .catch(() => { if (!controller.signal.aborted) setGeo({ postal, cities: [], unchecked: true }); })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [postal]);
  const geoCurrent = geo && geo.postal === postal ? geo : null;
  const postalCities = geoCurrent ? geoCurrent.cities : [];
  const postalVerified = postalCities.length > 0;
  const postalUnchecked = !!geoCurrent?.unchecked;
  const postalLoading = /^[0-9]{5}$/.test(postal) && !geoCurrent;

  // Barème unique (lib/neodrive-pricing) : mêmes montants que le simulateur /reservation-devis.
  const quote = useMemo(() => calculateQuote(model, postal, wantsCarteGrise), [model, postal, wantsCarteGrise]);
  const manualAmount = manualTransport.trim() !== "" && Number.isFinite(Number(manualTransport)) ? Number(manualTransport) : null;
  const transport: number | null = noDelivery ? 0 : manualAmount !== null ? manualAmount : quote.delivery.status === "estimated" ? quote.delivery.price : null;
  const vehiclesTotal = quote.vehiclePrice * quantity;
  const registrationTotal = quote.registrationPrice * quantity;
  const totalTTC = transport === null ? null : vehiclesTotal + transport + registrationTotal - discount;

  const postalComplete = /^[0-9]{5}$/.test(postal);
  const departementLivraison = quote.delivery.department ?? "";
  const livraisonValue = noDelivery ? "retrait sur place" : manualAmount !== null ? String(manualAmount) : quote.delivery.status === "estimated" ? String(quote.delivery.price) : "sur devis";
  const deliveryLabel = noDelivery ? "Retrait sur place" : manualAmount !== null ? euro(manualAmount) : !postalComplete ? "—" : postalLoading ? "Calcul…" : quote.delivery.status === "estimated" ? euro(quote.delivery.price) : "Sur devis";
  const deliveryOk = noDelivery || manualAmount !== null || quote.delivery.status === "estimated";
  const totalLabel = totalTTC === null ? (postalComplete ? "Sur devis" : null) : euro(totalTTC);

  const normalizeCity = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cityMatches = postalCities.some(city => normalizeCity(city) === normalizeCity(client.ville));
  const contactDone = !!(client.nom && client.prenom && client.telephone && client.email && client.adresse && client.ville && postalComplete);
  const docsDone = !!(files.cni && files.justificatif_domicile && (!wantsCarteGrise || files.mandat_carte_grise_signe));
  const stepState = [true, contactDone, true, docsDone, !!files.devis_signe];
  // Client existant : pas d'étape « Carte grise » (confiée à NeoDrive d'office).
  const steps: [string, boolean][] = dejaClient
    ? [["Véhicule", true], ["Coordonnées", contactDone], ["Documents", docsDone], ["Contrat", !!files.devis_signe]]
    : [["Véhicule", true], ["Livraison", contactDone], ["Carte grise", true], ["Documents", docsDone], ["Devis", !!files.devis_signe]];

  const cocRead = cocInfo.status === "done" ? cocInfo.read : null;
  const cocVinOk = !!cocRead?.ok && vinValid(cocRead.vin);
  const needManualVin = cocInfo.status === "done" && !cocVinOk;
  const knownVin = cocVinOk ? cocRead!.vin : needManualVin && manualVin.length === 17 && !/[IOQ]/.test(manualVin) ? manualVin : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const value = name === "code_postal" ? e.target.value.replace(/[^0-9]/g, "").slice(0, 5) : e.target.value;
    setClient(previousClient => ({ ...previousClient, [name]: value }));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: list } = e.target;
    setFiles(p => ({ ...p, [name]: list?.[0]?.name || "" }));
    if (name === "coc") {
      // VIN (et CNIT des modèles connus) lus automatiquement sur le COC, pour le certificat de vente et le dossier.
      const id = ++cocReadId.current;
      if (!list?.[0]) { cocRef.current = null; setCocInfo({ status: "idle", read: null }); return; }
      setCocInfo({ status: "reading", read: null });
      cocRef.current = readCocVin(list[0]).then(read => {
        if (id === cocReadId.current) { setCocInfo({ status: "done", read }); if (read.ok && !vinValid(read.vin)) setManualVin(read.vin); }
        return read;
      });
    }
  };
  const setFileName = (name: string, fileName: string) => setFiles(p => p[name] === fileName ? p : ({ ...p, [name]: fileName }));
  const safeFileName = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "client";
  const signerName = `${client.prenom} ${client.nom}`.trim();

  /** Mandat pré-rempli ; avec `sig`, la signature au doigt, « Lu et approuvé », le lieu et la date sont placés dans la zone de signature. */
  const buildMandat = (sig?: Signature) => {
    const jsPDF = (window as unknown as PdfGlobals).jspdf?.jsPDF;

    if (!jsPDF) {
      alert(
        "Le générateur PDF est encore en cours de chargement. Merci de réessayer dans quelques secondes."
      );
      return null;
    }

    const formData = formRef.current
      ? new FormData(formRef.current)
      : null;

    const mandatClient = {
      nom: String(formData?.get("nom") || client.nom || "").trim(),
      prenom: String(formData?.get("prenom") || client.prenom || "").trim(),
      telephone: String(formData?.get("telephone") || client.telephone || "").trim(),
      email: String(formData?.get("email") || client.email || "").trim(),
      adresse: String(formData?.get("adresse") || client.adresse || "").trim(),
      code_postal: String(formData?.get("code_postal") || client.code_postal || "").trim(),
      ville: String(formData?.get("ville") || client.ville || "").trim()
    };

    const champsManquants = [
      !mandatClient.nom && "nom",
      !mandatClient.prenom && "prénom",
      !mandatClient.adresse && "adresse",
      !mandatClient.code_postal && "code postal",
      !mandatClient.ville && "ville"
    ].filter(Boolean);

    if (champsManquants.length > 0) {
      alert(
        `Merci de compléter les champs suivants avant ${sig ? "de signer" : "de télécharger"} le mandat : ${champsManquants.join(", ")}.`
      );
      return null;
    }

    const pdf = writeMandat(new jsPDF(), mandatClient, today, sig);

    const safeName = mandatClient.nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-");

    return { pdf, safeName };
  };

  const downloadMandat = () => {
    const built = buildMandat();
    if (built) built.pdf.save(`mandat-carte-grise-${built.safeName || "client"}.pdf`);
  };
  const signMandat = async (sig: Signature) => buildMandat(sig)?.pdf.output("blob") ?? null;

  /** Capture du devis / contrat ; avec `sig`, la signature au doigt est placée dans les zones de signature. */
  const captureDevis = async (sig?: Signature) => {
    if (!printRef.current) return null;

    const w = window as unknown as PdfGlobals;
    const html2canvas = w.html2canvas;
    const jsPDF = w.jspdf?.jsPDF;
    if (!html2canvas || !jsPDF) {
      alert("Le générateur PDF est encore en cours de chargement. Merci de réessayer dans quelques secondes.");
      return null;
    }

    // Capture toujours au format A4 (794 px de large), même depuis un téléphone.
    const el = printRef.current;
    const previousWidth = el.style.width;
    el.style.width = "794px";
    const canvas = await html2canvas(el, {
      scale: sig ? 1.5 : 2,
      useCORS: true,
      windowWidth: 1024,
      onclone: (doc) => {
        // À l'écran les CGV défilent dans un cadre ; dans le PDF elles sont reproduites en entier.
        doc.querySelectorAll<HTMLElement>("[data-cgv]").forEach(node => { node.style.maxHeight = "none"; node.style.overflow = "visible"; node.style.border = "0"; node.style.padding = "0"; });
        if (sig) stampDevis(doc, sig);
      }
    }).finally(() => { el.style.width = previousWidth; });
    return { canvas, jsPDF };
  };

  // Version signée : « Lu et approuvé », lieu, date, nom et signature au doigt dans chaque zone de signature.
  const stampDevis = (doc: Document, sig: Signature) => {
    const lieu = client.ville || "________";
    doc.querySelectorAll<HTMLElement>("[data-cgv]").forEach(node => {
      node.textContent = CGV.replace("Fait à : ________", `Fait à : ${lieu}`).replace("Le : ________", `Le : ${today}`).replace("Nom et prénom du client :", `Nom et prénom du client : ${signerName}`);
    });
    const size = fitSignature(sig, 240, 80);
    doc.querySelectorAll<HTMLElement>("[data-sig]").forEach(zone => {
      const line = zone.lastElementChild as HTMLElement | null;
      const block = doc.createElement("div");
      block.style.cssText = "display:flex;align-items:flex-end;gap:18px;margin-top:10px";
      const img = doc.createElement("img");
      img.src = sig.png; img.alt = ""; img.style.cssText = `width:${size.w}px;height:${size.h}px;display:block`;
      const text = doc.createElement("div");
      text.style.cssText = "font-size:13px;line-height:1.5";
      [["Lu et approuvé", "font-style:italic;font-weight:bold"], [`Fait à ${lieu}, le ${today}`, ""], [signerName, ""], ["Signé à l’écran", "color:#666;font-size:11px"]].forEach(([t, css]) => { const d = doc.createElement("div"); d.textContent = t; d.style.cssText = css; text.appendChild(d); });
      block.append(img, text);
      zone.insertBefore(block, line);
      if (line) line.style.marginTop = "4px";
    });
  };

  const downloadPDF = async () => {
    const captured = await captureDevis();
    if (!captured) return;
    const { canvas, jsPDF } = captured;

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("devis-neodrive.pdf");
  };

  /** PDF signé : page par page en JPEG pour rester léger (envoi Formspree). */
  const signDevis = async (sig: Signature) => {
    const missing = [!client.nom && "nom", !client.prenom && "prénom", !client.adresse && "adresse", !postalComplete && "code postal", !client.ville && "ville"].filter(Boolean);
    if (missing.length) { alert(`Merci de compléter les champs suivants avant de signer : ${missing.join(", ")}.`); return null; }
    const captured = await captureDevis(sig);
    if (!captured) return null;
    const { canvas, jsPDF } = captured;
    const pdf = new jsPDF("p", "mm", "a4");
    const pagePx = Math.floor(canvas.width * 297 / 210);
    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
      const h = Math.min(pagePx, canvas.height - y);
      const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = h;
      const ctx = slice.getContext("2d"); if (!ctx) return null;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, h); ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.75), "JPEG", 0, 0, 210, h * 210 / canvas.width);
    }
    return pdf.output("blob");
  };

  /** Certificat de vente (vendeur MK HOLDING SAS) : preuve d'achat pour l'immatriculation, ne vaut pas facture, sans numéro ni signature. */
  const buildCertificat = async () => {
    const jsPDF = (window as unknown as PdfGlobals).jspdf?.jsPDF;
    if (!jsPDF) return null;
    const read = cocRef.current ? await Promise.race([cocRef.current, new Promise<null>(res => setTimeout(() => res(null), 15000))]) : null;
    const vin = read?.ok && vinValid(read.vin) ? read.vin : manualVin.length === 17 && !/[IOQ]/.test(manualVin) ? manualVin : "";
    const prices: [string, string][] = [[`${VERSION_FORM[model].devis} x${quantity}`, pdfEuros(vehiclesTotal)]];
    prices.push(noDelivery ? ["Retrait sur place", pdfEuros(0)] : [`Livraison à domicile${postalComplete ? ` (code postal ${postal})` : ""}`, transport === null ? "sur devis" : pdfEuros(transport)]);
    if (wantsCarteGrise) prices.push([`Pack mise en route et accompagnement administratif x${quantity}`, pdfEuros(registrationTotal)]);
    if (discount > 0) prices.push(["Remise commerciale", `- ${pdfEuros(discount)}`]);
    prices.push(["Total TTC", totalTTC === null ? "sur devis" : pdfEuros(totalTTC)]);
    const pdf = writeCertificat(new jsPDF(), {
      date: today,
      seller: NEODRIVE_SELLER,
      buyer: [signerName, client.adresse.trim(), `${client.code_postal} ${client.ville.trim()}`, client.telephone.trim(), client.email.trim()],
      vehicle: [`Modèle : ${VEHICLES[model].label}${quantity > 1 ? ` (x${quantity})` : ""}`, `Numéro d’identification (VIN) : ${vin || "voir COC"}`, read?.ok && read.cnit ? `CNIT : ${read.cnit}` : ""],
      prices,
      statement: dejaClient
        ? `MK HOLDING SAS (NeoDrive) certifie avoir vendu le véhicule désigné ci-dessus à ${signerName}, au prix indiqué.`
        : `MK HOLDING SAS (NeoDrive) certifie la vente à ${signerName} du véhicule désigné ci-dessus, commandé le ${today} au prix indiqué (réserve de propriété jusqu’au paiement intégral).`,
    });
    return new File([pdf.output("blob")], `certificat-vente-${safeFileName(client.nom)}.pdf`, { type: "application/pdf" });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const docs: [string, string, string][] = [
      ...(wantsCarteGrise ? [["mandat_carte_grise_signe", "sign-mandat", "le mandat carte grise"] as [string, string, string]] : []),
      ["devis_signe", "sign-devis", dejaClient ? "le contrat de vente" : "le devis"],
    ];
    const missing = docs.find(([name]) => !(form.querySelector<HTMLInputElement>(`input[type=file][name="${name}"]`)?.files?.length));
    if (!missing) {
      // Copie du dossier dans l'espace privé NeoDrive (best effort, 30 s max), puis envoi Formspree habituel quoi qu'il arrive.
      e.preventDefault();
      if (sendingRef.current) return;
      sendingRef.current = true; setSending(true);
      // Certificat de vente joint au dossier (si la carte grise est confiée à NeoDrive), puis copie privée et Formspree.
      (wantsCarteGrise ? buildCertificat().catch(() => null) : Promise.resolve(null)).then(file => {
        const extra = file && !putFile(certificatRef.current, file) ? [{ key: "certificat_vente", file }] : [];
        return storeDossierCopy(form, 30000, extra);
      }).finally(() => {
        HTMLFormElement.prototype.submit.call(form);
        setTimeout(() => { sendingRef.current = false; setSending(false); }, 15000);
      });
      return;
    }
    e.preventDefault();
    alert(`Merci de signer ${missing[2]} (avec le doigt dans le cadre, ou en important le document signé).`);
    document.getElementById(missing[1])?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  type ClientField = keyof typeof client;
  const field = (name: ClientField, label: string, opts: { type?: string; autoComplete?: string; wide?: boolean; placeholder?: string; list?: string; inputMode?: "text" | "tel" | "email" } = {}) => {
    const { type = "text", autoComplete, wide, placeholder, list, inputMode } = opts;
    return <label className={`${s.field} ${wide ? s.wide : ""}`}>
      <span>{label}</span>
      <span className={s.inputWrap}>
        <input name={name} required type={type} autoComplete={autoComplete} placeholder={placeholder} list={list} inputMode={inputMode} value={client[name]} onChange={handleChange} />
        {client[name].trim() ? <i className={s.ok}>{Icon.check}</i> : null}
      </span>
    </label>;
  };
  const fileInput = (name: string, title: string, hint: string, required: boolean, multiple = false) => (
    <label className={`${c.file} ${files[name] ? c.fileDone : ""}`}>
      <span className={c.fileHead}><span><b>{title}</b><small>{hint}</small></span><em className={required ? c.req : ""}>{files[name] ? "Ajouté" : required ? "Obligatoire" : "Facultatif"}</em></span>
      <input type="file" name={name} accept=".pdf,image/*" required={required} multiple={multiple} onChange={onFile} />
    </label>
  );

  const summary = <div className={s.summary}>
    <div className={s.summaryHead}><img src={MODELS[model].img} alt="" /><div><small>Votre véhicule</small><strong>{VEHICLES[model].label}{quantity > 1 ? ` × ${quantity}` : ""}</strong></div></div>
    <dl>
      <div><dt>Véhicule</dt><dd>{euro(vehiclesTotal)}</dd></div>
      <div><dt>{noDelivery ? "Retrait sur place" : "Livraison à domicile"}{!noDelivery && quote.delivery.status === "estimated" ? <small> · {postal}</small> : null}</dt><dd className={deliveryOk ? "" : s.muted}>{noDelivery ? euro(0) : deliveryLabel}</dd></div>
      <div><dt>Carte grise (formalités)</dt><dd className={wantsCarteGrise ? "" : s.muted}>{wantsCarteGrise ? euro(registrationTotal) : "Non demandée"}</dd></div>
      {discount > 0 ? <div><dt>Remise</dt><dd>- {euro(discount)}</dd></div> : null}
    </dl>
    <div className={s.summaryTotal}><span>Total TTC</span>{totalLabel && totalTTC !== null ? <strong>{totalLabel}</strong> : <em>{totalLabel || "Saisissez votre code postal pour voir le prix livré"}</em>}</div>
    <ul className={s.summaryPerks}>
      <li>{Icon.check} Prix livré selon votre code postal</li>
      <li>{Icon.check} Carte grise gérée par NeoDrive</li>
      <li>{Icon.check} Garantie 2 ans selon conditions</li>
    </ul>
  </div>;

  return (
    <main className={s.page}>

      {/* CDN FIXED FOR NEXT */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      {/* HERO */}
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.kicker}><i /> Carte grise · dossier en ligne</span>
          <h1>Votre dossier<br /><span>carte grise.</span></h1>
          <p>Un seul formulaire pour choisir votre véhicule, obtenir votre prix livré et préparer son immatriculation. <b>Vos informations ne sont demandées qu’une seule fois.</b></p>
          <div className={s.heroPrice}><small>À partir de</small><strong>{euro(VEHICLES.essentielle.price)}</strong><span>TTC</span></div>
          <div className={s.heroCtas}>
            <a href="#dossier" className={s.btnPrimary}>Commencer mon dossier</a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className={s.btnLink}>{Icon.chat} Parler à un conseiller</a>
          </div>
        </div>
        <figure className={s.heroMedia}>
          <picture>
            <img src="/reservation/neodrive-jardin-mobile.webp" alt="NeoDrive Confort grise garée dans un jardin ensoleillé" fetchPriority="high" />
          </picture>
          <figcaption><i /> NeoDrive Confort · véhicule réel</figcaption>
          <div className={s.heroFloat}><span className={s.heroFloatIcon}>{Icon.doc}</span><div><strong>Carte grise gérée</strong><small>Formalités {euro(REGISTRATION_PRICE)}</small></div></div>
        </figure>
      </section>

      <ul className={s.trust}>
        <li><span>{Icon.truck}</span><div><b>Livraison à domicile</b><small>Prix selon votre code postal</small></div></li>
        <li><span>{Icon.doc}</span><div><b>Carte grise gérée</b><small>Formalités {euro(REGISTRATION_PRICE)}</small></div></li>
        <li><span>{Icon.upload}</span><div><b>Documents en ligne</b><small>Photo ou PDF acceptés</small></div></li>
        <li><span>{Icon.shield}</span><div><b>Garantie 2 ans</b><small>Selon conditions de garantie</small></div></li>
      </ul>

      <div className={s.layout} id="dossier">
        <form
          ref={formRef}
          action="https://formspree.io/f/xjgjrqqg"
          method="POST"
          encType="multipart/form-data"
          className={s.form}
          onSubmit={onSubmit}
        >

          <input type="hidden" name="_subject" value={dejaClient ? "Dossier carte grise – CLIENT EXISTANT (pas une nouvelle commande)" : "Nouvelle réservation véhicule + carte grise"} />
          <input type="hidden" name="type_demande" value={dejaClient ? "client existant : dossier carte grise (contrat, mandat, COC, pièces)" : "nouvelle réservation"} />
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff1ea", border: "1px solid #f8c9b4", borderRadius: 14, padding: "12px 14px", margin: "0 0 14px", cursor: "pointer", lineHeight: 1.45 }}>
            <input type="checkbox" checked={dejaClient} onChange={e => setDejaClient(e.target.checked)} style={{ marginTop: 4, width: 20, height: 20, flex: "none" }} />
            <span><b>J’ai déjà réservé ou reçu ma NeoDrive</b> : je complète seulement mon dossier carte grise. Ce n’est pas une nouvelle commande : le document de l’étape 5 est votre contrat de vente, à signer et à joindre avec le mandat, le COC et vos pièces.</span>
          </label>
          <input type="hidden" name="version" value={VERSION_FORM[model].value} />
          <input ref={certificatRef} type="file" name="certificat_vente" accept="application/pdf" hidden tabIndex={-1} aria-hidden="true" />
          {dejaClient ? <input type="hidden" name="service_carte_grise" value="oui" /> : null}
          <input type="hidden" name="vin" value={knownVin} />
          <input type="hidden" name="vin_source" value={knownVin ? (cocVinOk ? "lu sur le COC" : "saisi à la main") : ""} />
          <input type="hidden" name="coc_type" value={cocRead?.type || ""} />
          <input type="hidden" name="coc_reception" value={cocRead?.reception || ""} />
          <input type="hidden" name="cnit_code" value={cocRead?.cnit || ""} />
          <input type="hidden" name="departement_livraison" value={departementLivraison} />
          <input type="hidden" name="livraison" value={livraisonValue} />

          <ol className={`${s.progress} ${dejaClient ? "" : c.progress5}`} style={dejaClient ? { gridTemplateColumns: "repeat(4,minmax(0,1fr))" } : undefined} aria-label="Étapes du dossier">
            {steps.map(([t, done], i) => <li key={t} className={done ? s.done : ""}><b>{done ? Icon.check : i + 1}</b><span>{t}</span></li>)}
          </ol>

          {/* ÉTAPE 1 — VÉHICULE */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>1</span><div><h2>Version souhaitée</h2><p>Même carrosserie, trois niveaux d’équipement.</p></div></header>
            <div className={s.models} role="radiogroup" aria-label="Version du véhicule">
              {(Object.keys(VEHICLES) as VehicleKey[]).map(key => {
                const v = VEHICLES[key]; const m = MODELS[key]; const on = model === key;
                return <button type="button" role="radio" aria-checked={on} key={key} onClick={() => setModel(key)} className={`${s.model} ${on ? s.modelOn : ""}`}>
                  {m.badge ? <span className={s.badge}>{m.badge}</span> : null}
                  <span className={s.radio}>{on ? Icon.check : null}</span>
                  <img src={m.img} alt="" />
                  <strong>{v.label.replace("NeoDrive ", "")}</strong>
                  <small>{m.tagline}</small>
                  <b>{euro(v.price)}<em> TTC</em></b>
                  <small style={{ display: "block", marginTop: 4, fontWeight: 800, color: AVAILABILITY[key].inStock ? "#15803d" : "#b45309" }}>{AVAILABILITY[key].inStock ? "✅ " : "⏳ "}{AVAILABILITY[key].short}</small>
                </button>;
              })}
            </div>
          </section>

          {/* ÉTAPE 2 — LIVRAISON & COORDONNÉES */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>2</span><div><h2>Livraison et coordonnées</h2><p>Le prix de livraison s’affiche dès votre code postal.</p></div></header>
            <div className={s.postalRow}>
              <label className={s.field}><span>Code postal de livraison</span>
                <span className={s.inputWrap}><i className={s.inputIcon}>{Icon.pin}</i><input name="code_postal" className={s.withIcon} inputMode="numeric" autoComplete="postal-code" maxLength={5} pattern="[0-9]{5}" required value={client.code_postal} onChange={handleChange} placeholder="Ex. 31600" />{postalVerified ? <i className={s.ok}>{Icon.check}</i> : null}</span>
              </label>
              <div className={`${s.deliveryBox} ${deliveryOk && (postalComplete || noDelivery) ? s.deliveryOk : ""}`} aria-live="polite" data-testid="delivery-price">
                <small>{noDelivery ? "Remise du véhicule" : "Livraison à votre porte"}</small>
                <strong>{deliveryLabel}</strong>
                <span>{noDelivery ? "Aucun frais de livraison" : manualAmount !== null ? "Transport personnalisé" : !postalComplete ? "Saisissez vos 5 chiffres" : quote.delivery.status === "estimated" ? (postalVerified ? postalCities.slice(0, 2).join(", ") + (postalCities.length > 2 ? "…" : "") : "Tarif forfaitaire de la zone") : "Tarif personnalisé avant confirmation"}</span>
              </div>
            </div>
            {!noDelivery && manualAmount === null && quote.delivery.status === "manual" && postalComplete ? <p className={s.note}>{quote.delivery.reason}. Nous vous communiquerons un tarif personnalisé avant toute confirmation — ou <a href={WHATSAPP} target="_blank" rel="noreferrer">demandez-le sur WhatsApp</a>.</p> : null}
            {postalComplete && !postalLoading && !postalVerified && !postalUnchecked && quote.delivery.status === "estimated" ? <p className={s.note}>Nous ne trouvons pas ce code postal. Vérifiez-le pour continuer.</p> : null}
            <label className={c.pickup}><input type="checkbox" checked={noDelivery} onChange={e => setNoDelivery(e.target.checked)} /> Retrait sur place (pas de livraison)</label>

            <div className={s.subHead}><i>{Icon.user}</i><div><h3>Vos coordonnées</h3><p>Elles servent au devis, au mandat et à la carte grise.</p></div></div>
            <div className={s.fields}>
              {field("prenom", "Prénom", { autoComplete: "given-name", placeholder: "Prénom" })}
              {field("nom", "Nom", { autoComplete: "family-name", placeholder: "Nom" })}
              {field("telephone", "Téléphone", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "06 12 34 56 78" })}
              {field("email", "Adresse e-mail", { type: "email", autoComplete: "email", inputMode: "email", placeholder: "vous@exemple.fr" })}
              {field("adresse", "Adresse", { autoComplete: "street-address", wide: true, placeholder: "N° et rue" })}
              {field("ville", "Ville", { autoComplete: "address-level2", list: "cg-cities", wide: true })}
            </div>
            <datalist id="cg-cities">{postalCities.map(city => <option key={city} value={city} />)}</datalist>
            {postalVerified && client.ville && !cityMatches ? <p className={s.note}>Vérifiez la ville : elle ne correspond pas au code postal {postal} (communes possibles&nbsp;: {postalCities.slice(0, 6).join(", ")}).</p> : null}
          </section>

          {/* ÉTAPE 3 — CARTE GRISE (masquée pour un client existant) */}
          <section className={s.card} style={dejaClient ? { display: "none" } : undefined}>
            <header className={s.cardHead}><span className={s.stepNum}>3</span><div><h2>Carte grise</h2><p>Souhaitez-vous que Neodrive réalise les démarches d’immatriculation&nbsp;?</p></div></header>
            <div className={c.choices}>
              <label className={`${c.choice} ${wantsCarteGrise ? c.choiceOn : ""}`}>
                <input type="radio" name="service_carte_grise" value="oui" checked={wantsCarteGrise} onChange={() => setWantsCarteGrise(true)} />
                <span><b>Oui, je confie la carte grise à Neodrive</b><small>Nous réalisons les démarches avec votre mandat signé.</small><strong>{euro(REGISTRATION_PRICE)}</strong></span>
              </label>
              <label className={`${c.choice} ${!wantsCarteGrise ? c.choiceOn : ""}`}>
                <input type="radio" name="service_carte_grise" value="non" checked={!wantsCarteGrise} onChange={() => setWantsCarteGrise(false)} />
                <span><b>Non, je réaliserai moi-même les démarches</b><small>Aucun mandat à fournir.</small><strong>{euro(0)}</strong></span>
              </label>
            </div>
          </section>

          {/* ÉTAPE 4 — DOCUMENTS */}
          <section className={s.card}>
            <header className={s.cardHead}><span className={s.stepNum}>{dejaClient ? 3 : 4}</span><div><h2>Documents obligatoires</h2><p>Une photo bien lisible avec votre téléphone suffit (ou un PDF).</p></div></header>
            <div className={c.docGrid}>
              {wantsCarteGrise ? fileInput("coc", "Certificat de conformité (COC)", dejaClient ? "La première page avec le numéro d’identification — remis avec votre véhicule" : "La première page avec le numéro d’identification — peut être ajouté plus tard", dejaClient) : null}
              {fileInput("cni", "Carte nationale d’identité", "Recto et verso (2 photos possibles), ou passeport", true, true)}
              {fileInput("justificatif_domicile", "Justificatif de domicile", "De moins de 6 mois, à votre nom et à votre adresse", true)}
            </div>
            {wantsCarteGrise ? <div aria-live="polite">
              {cocInfo.status === "reading" ? <p className={s.note} style={{ background: "#f3f7ff", color: "#2b4a8a" }}>Lecture du numéro d’identification sur le COC…</p> : null}
              {cocVinOk ? <p className={s.note} style={{ background: "#ecf8f0", color: "#15803d" }}><b>✓ Numéro d’identification (VIN) lu sur le COC : <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{cocRead!.vin}</span></b></p> : null}
              {needManualVin ? <div className={s.fields} style={{ marginTop: 12 }}>
                <label className={`${s.field} ${s.wide}`}>
                  <span>Numéro de série (VIN)</span>
                  <span className={s.inputWrap}><input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={17} placeholder="17 caractères, sur le COC" value={manualVin} onChange={e => setManualVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))} style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".06em" }} />{knownVin ? <i className={s.ok}>{Icon.check}</i> : null}</span>
                  <em>{cocRead?.ok ? "Vérifiez le numéro lu sur le COC, caractère par caractère." : `${cocRead?.error || "Lecture impossible."} Recopiez le numéro depuis le COC (rubrique « numéro d’identification »).`}</em>
                </label>
              </div> : null}
            </div> : null}

            {wantsCarteGrise && (
              <div className={c.mandat}>
                <h3>Mandat carte grise</h3>
                <p style={{ margin: "6px 0 12px", fontSize: 14.5, lineHeight: 1.5 }}>Le mandat est pré-rempli avec vos coordonnées : il permet à Neodrive de faire la carte grise à votre place.</p>
                <SignOnScreen
                  id="sign-mandat" name="mandat_carte_grise_signe" label="Mandat" docWord="le mandat"
                  ville={client.ville} date={today} fileName={`mandat-signe-${safeFileName(client.nom)}.pdf`}
                  invalidateKey={JSON.stringify(client)} build={signMandat} onFile={setFileName}
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
            )}
          </section>

          {/* ÉTAPE 5 — DEVIS */}
          <section className={s.card} id="devis">
            <header className={s.cardHead}><span className={s.stepNum}>{dejaClient ? 4 : 5}</span><div><h2>{dejaClient ? "Votre contrat de vente" : "Votre devis"}</h2><p>{dejaClient ? "Il reprend votre commande (ce n’est pas une nouvelle commande) : relisez-le, puis signez-le avec le doigt ci-dessous." : "Relisez-le, puis signez-le avec le doigt ci-dessous."}</p></div></header>

            <div className={c.devisWrap}>
              <div ref={printRef} style={pdf}>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <h2 style={{ margin: "0 0 6px" }}>NEODRIVE</h2>
                    <p style={pLine}>MK HOLDING</p>
                    <p style={pLine}>SIREN : 908 645 393</p>
                    <p style={pLine}>Muret (31), France</p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <h1 style={{ margin: "0 0 6px" }}>DEVIS</h1>
                    <p style={pLine}>Date : {today}</p>
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid #ddd", margin: "18px 0" }} />

                <h3 style={h3}>Acheteur</h3>
                <p style={pLine}>{client.nom} {client.prenom}</p>
                <p style={pLine}>{client.adresse}</p>
                <p style={pLine}>{client.code_postal} {client.ville}</p>
                <p style={pLine}>{client.telephone}</p>
                <p style={pLine}>{client.email}</p>

                <h3 style={h3}>Détail achat voiture sans permis</h3>

                <table style={table}>
                  <tbody>
                    <tr>
                      <td>{VERSION_FORM[model].devis} x{quantity}</td>
                      <td style={right}>{vehiclesTotal} €</td>
                    </tr>

                    {!noDelivery && (
                      <tr>
                        <td>
                          Livraison à domicile{postalComplete ? ` (code postal ${postal})` : ""}
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {manualAmount !== null ? "Transport personnalisé" : "Prix automatique selon votre code postal"}
                          </div>
                        </td>
                        <td style={right}>{transport === null ? "Sur devis" : `${transport} €`}</td>
                      </tr>
                    )}

                    {noDelivery && (
                      <tr>
                        <td colSpan={2} style={{ color: "green", textAlign: "center" }}>
                          Retrait sur place – aucun frais de livraison
                        </td>
                      </tr>
                    )}

                    {wantsCarteGrise ? (
                      <tr>
                        <td>Pack mise en route et accompagnement administratif x{quantity}</td>
                        <td style={right}>{registrationTotal} €</td>
                      </tr>
                    ) : (
                      <tr>
                        <td>Carte grise : démarches réalisées par le client</td>
                        <td style={right}>0 €</td>
                      </tr>
                    )}

                    {discount > 0 && (
                      <tr>
                        <td>Remise commerciale</td>
                        <td style={right}>- {discount} €</td>
                      </tr>
                    )}

                    <tr style={totalRow}>
                      <td>Total TTC</td>
                      <td style={right}>{totalTTC === null ? "Sur devis" : `${totalTTC} €`}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={bank}>{BANK}</div>

                <div style={{ marginTop: 60 }} data-sig>
                  <p>Signature précédée de « Lu et approuvé »</p>
                  <div style={signature}></div>
                </div>

                <div style={{ pageBreakBefore: "always", marginTop: 40 }}></div>

                <div data-cgv style={cgvStyle} tabIndex={0} aria-label="Conditions générales de vente">{CGV}</div>

                <div style={{ marginTop: 40 }} data-sig>
                  <p>Signature CGV précédée de « Lu et approuvé »</p>
                  <div style={{ borderTop: "1px solid black", width: 250 }}></div>
                </div>

              </div>
            </div>

            <div className={c.upload}>
              <SignOnScreen
                id="sign-devis" name="devis_signe" label={dejaClient ? "Contrat" : "Devis"} docWord={dejaClient ? "le contrat" : "le devis"}
                ville={client.ville} date={today} fileName={`${dejaClient ? "contrat" : "devis"}-signe-${safeFileName(client.nom)}.pdf`}
                invalidateKey={JSON.stringify([client, model, quantity, transport, discount, wantsCarteGrise, noDelivery, dejaClient])}
                build={signDevis} onFile={setFileName} primaryClass={s.btnPrimary} ghostClass={s.btnGhost}
                manual={<>
                  <ol className={c.howto} style={{ marginTop: 0 }}>
                    <li>{dejaClient ? "Télécharger le contrat" : "Télécharger le devis"}</li>
                    <li>Signer</li>
                    <li>Réimporter ici</li>
                    <li>Envoyer</li>
                  </ol>
                  <button type="button" onClick={downloadPDF} className={s.btnGhost}>{Icon.download} {dejaClient ? "Télécharger le contrat PDF" : "Télécharger le devis PDF"}</button>
                </>}
                renderFileInput={required => fileInput("devis_signe", dejaClient ? "Contrat de vente signé" : "Devis signé", dejaClient ? "Le contrat ci-dessus, signé « Lu et approuvé »" : "Le devis ci-dessus, signé", required)}
              />
            </div>

            <details className={c.advisor}>
              <summary>Options conseiller</summary>
              <div className={c.advisorGrid}>
                <label>Nombre de véhicules
                  <input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={e => setQuantity(Math.max(1, Math.floor(Number(e.target.value)) || 1))} placeholder="Nombre de véhicules" />
                </label>
                <label>Transport personnalisé (€)
                  <input type="number" min="0" inputMode="numeric" value={manualTransport} onChange={e => setManualTransport(e.target.value)} placeholder="Barème auto" />
                </label>
                <label>Remise / Promotion (€)
                  <input type="number" min="0" inputMode="numeric" value={discount || ""} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" />
                </label>
              </div>
              <p>Laissez « Transport personnalisé » vide pour appliquer le barème de livraison du simulateur.</p>
            </details>

            <div className={c.devisActions}>
              {dejaClient ? null : <button type="button" onClick={downloadPDF} className={s.btnGhost}>{Icon.download} Télécharger le devis PDF</button>}
              <button type="submit" className={s.btnPrimary} disabled={sending} aria-busy={sending}>{Icon.lock} {sending ? "Envoi en cours…" : "Envoyer mon dossier"}</button>
            </div>
          </section>

        </form>

        <aside className={s.aside}>
          {summary}
          <a className={s.help} href={WHATSAPP} target="_blank" rel="noreferrer"><span>{Icon.chat}</span><div><b>Une question sur votre dossier&nbsp;?</b><small>Un conseiller vous répond sur WhatsApp</small></div></a>
        </aside>
      </div>

      {/* BARRE MOBILE */}
      <div className={s.mobileBar}>
        <div><small>{VEHICLES[model].label.replace("NeoDrive ", "")} · total TTC</small><strong data-testid="mobile-total">{totalTTC !== null ? euro(totalTTC) : postalComplete ? "Sur devis" : euro(vehiclesTotal + registrationTotal - discount) + " + livr."}</strong></div>
        <a href={contactDone ? "#devis" : "#dossier"} className={s.btnPrimary}>Continuer</a>
      </div>
    </main>
  );
}

/* TEXTES DU DEVIS */

const BANK = `COORDONNÉES BANCAIRES

Titulaire du compte :
MK HOLDING

Banque :
REVOLUT

IBAN :
FR76 2823 3000 0142 1307 1051 008

BIC :
REVOFRP2

Devise :
EUR

Référence à indiquer lors du virement :
Nom et prénom du client

Le paiement peut être effectué par virement bancaire sur le compte ci-dessus.

Pour toute question relative au règlement, merci de nous contacter avant l'émission du virement.
IMPORTANT

Merci d'indiquer votre nom et prénom dans le motif du virement.

La livraison ou la remise du véhicule est effectuée après réception du règlement selon les modalités convenues entre les parties.`;

const CGV = `CONDITIONS GÉNÉRALES DE VENTE

GARANTIE NEODRIVE

Les véhicules neufs vendus par Neodrive à des consommateurs bénéficient de la garantie légale de conformité pendant une durée de 2 ans à compter de leur livraison.

Cette garantie s'applique dans les conditions prévues par les articles L. 217-3 à L. 217-20 du Code de la consommation. Elle permet au client d'obtenir la réparation ou le remplacement du bien en cas de défaut de conformité reconnu, sans frais, sous réserve des conditions légales applicables.

Cette garantie légale est indépendante de toute éventuelle prestation commerciale complémentaire proposée par Neodrive.


1. IDENTIFICATION DU VENDEUR

Les présentes Conditions Générales de Vente sont proposées par :

MK HOLDING SAS

SIREN : 908 645 393

31600 Muret

France

Marque commerciale : Neodrive

Email : sales@easyNeodrive.com

Site internet : easyNeodrive.com

2. OBJET

Les présentes Conditions Générales de Vente régissent la vente des véhicules électriques sans permis commercialisés sous la marque Neodrive ainsi que les accessoires, pièces détachées et services associés.

Toute commande implique l'acceptation pleine et entière des présentes Conditions Générales de Vente.

3. CARACTÉRISTIQUES DES VÉHICULES

Les véhicules proposés à la vente sont des véhicules électriques sans permis homologués dans leur catégorie.

Les descriptions, caractéristiques techniques, photographies, dimensions, poids, équipements, options et autonomies figurant sur les supports commerciaux, catalogues ou sites internet sont communiqués à titre indicatif.

Dans une démarche d'amélioration continue, Neodrive se réserve le droit d'apporter à tout moment des modifications techniques, esthétiques ou fonctionnelles à ses produits sans obligation de modifier les véhicules déjà livrés.

4. COMMANDE

Toute commande devient définitive après validation par le vendeur.

Le vendeur se réserve le droit de refuser une commande notamment en cas :

- d'informations incomplètes ;
- d'indisponibilité du produit ;
- d'erreur manifeste ;
- de litige antérieur avec le client ;
- de force majeure.

Toute modification de commande demandée après validation devra être acceptée expressément par le vendeur.

5. PRIX

Les prix sont exprimés en euros TTC.

Sauf indication contraire, les prix affichés ne comprennent pas :

- les frais de livraison ;
- les frais d'immatriculation ;
- les frais de carte grise ;
- l'assurance ;
- les options ;
- les accessoires ;
- les prestations particulières.

Les prix applicables sont ceux en vigueur au jour de la validation de la commande.

6. MODALITÉS DE PAIEMENT

Le paiement s'effectue selon les modalités convenues entre les parties.

Selon les cas, le règlement peut prendre la forme :

- d'un acompte suivi d'un solde ;
- d'un paiement intégral à la livraison ;
- d'un virement bancaire ;
- d'un paiement instantané ;
- ou de toute autre modalité acceptée par le vendeur.

Le vendeur se réserve le droit de suspendre la livraison tant que le règlement intégral n'a pas été reçu.

7. LIVRAISON

Le véhicule peut être :

- retiré sur rendez-vous ;
- livré à domicile ;
- remis à un transporteur mandaté par le client.

Les délais de livraison sont communiqués à titre indicatif.

Le vendeur ne pourra être tenu responsable d'un retard résultant notamment :

- du transport ;
- des formalités administratives ;
- d'événements indépendants de sa volonté ;
- d'un cas de force majeure.

Lors de la réception du véhicule, le client s'engage à vérifier son état apparent.

Toute anomalie visible devra être signalée immédiatement.

À défaut de réserve formulée lors de la réception, le véhicule sera réputé livré conforme.

8. TRANSFERT DES RISQUES

Le transfert des risques intervient dès la remise du véhicule au client ou à son représentant.

À compter de cette remise, le véhicule voyage aux risques du client.

9. RÉSERVE DE PROPRIÉTÉ

Le véhicule demeure la propriété exclusive de MK HOLDING SAS jusqu'au paiement intégral du prix de vente.

En cas de non-paiement, le vendeur pourra exiger la restitution du véhicule aux frais du client.

10. IMMATRICULATION ET ASSURANCE

Le client demeure responsable :

- de l'immatriculation du véhicule lorsque celle-ci est requise ;
- de la fourniture des documents administratifs nécessaires ;
- de la souscription d'une assurance conforme à la réglementation en vigueur.

Le véhicule ne doit pas être utilisé sans assurance lorsque celle-ci est légalement obligatoire.

11. ACCEPTATION

Le client reconnaît :

- avoir pris connaissance des présentes Conditions Générales de Vente ;
- avoir reçu les informations nécessaires à son achat ;
- avoir obtenu les réponses à ses questions ;
- accepter les présentes conditions sans réserve.

La validation de la commande vaut acceptation des présentes Conditions Générales de Vente.

12. UTILISATION DU VÉHICULE

Le client s'engage à utiliser le véhicule conformément à sa destination, aux recommandations du constructeur et aux présentes Conditions Générales de Vente.

Le véhicule est conçu pour une utilisation normale sur route ou voie autorisée conformément à sa catégorie d'homologation.

Le client s'engage notamment à :

- respecter les limitations techniques du véhicule ;
- respecter les charges maximales autorisées ;
- respecter les recommandations d'entretien ;
- utiliser le véhicule de manière prudente et raisonnable ;
- respecter les règles de circulation applicables.

Toute utilisation abusive, anormale ou non conforme peut entraîner l'exclusion totale ou partielle de la garantie.

13. ENTRETIEN GÉNÉRAL DU VÉHICULE

Le client s'engage à assurer l'entretien courant du véhicule.

Il lui appartient notamment de vérifier régulièrement :

- l'état général du véhicule ;
- l'état des pneumatiques ;
- le système de freinage ;
- l'éclairage ;
- les connexions électriques ;
- les éléments de sécurité ;
- les fixations et éléments visibles du véhicule.

Le client s'engage à ne pas continuer à utiliser le véhicule lorsqu'un défaut important susceptible d'aggraver les dommages est constaté.

Tout dommage résultant de l'absence d'entretien ou de la poursuite d'utilisation malgré un défaut connu pourra être exclu de toute prise en charge.

14. BATTERIES – UTILISATION, CHARGE ET ENTRETIEN

Le client reconnaît avoir reçu les consignes d'utilisation et d'entretien des batteries du véhicule.

Afin de préserver les performances et la durée de vie des batteries, le client s'engage à respecter les recommandations suivantes.

RECHARGE

- recharger régulièrement le véhicule ;
- éviter autant que possible les décharges profondes ;
- éviter de rouler jusqu'à décharge complète ;
- utiliser exclusivement le chargeur fourni ou recommandé par Neodrive ;
- effectuer des charges complètes régulièrement ;
- éviter de laisser le véhicule sans recharge pendant une période prolongée.

Temps de charge généralement recommandés :

- été : 6 à 7 heures ;
- printemps / automne : 6 à 8 heures ;
- hiver : 8 à 10 heures.

Une fois le voyant du chargeur passé au vert, il est recommandé de laisser la charge se stabiliser pendant une courte période avant déconnexion.

Il est déconseillé de laisser le véhicule en charge pendant des durées excessivement longues.

PROCÉDURE DE CHARGE

1. Brancher d'abord le véhicule.
2. Brancher ensuite le chargeur sur la prise secteur.
3. Une fois la charge terminée, débrancher d'abord la prise secteur.
4. Débrancher ensuite le véhicule.

CONDITIONS DE CHARGE

Le client s'engage à :

- laisser refroidir le véhicule après utilisation avant recharge ;
- éviter les charges sous pluie directe ;
- éviter les environnements excessivement humides ;
- éviter les températures extrêmes ;
- éviter les espaces insuffisamment ventilés.

UTILISATION

Le client s'engage à :

- respecter la charge maximale du véhicule ;
- éviter les surcharges ;
- éviter les sollicitations excessives ;
- utiliser le véhicule conformément à sa destination.

15. STOCKAGE LONGUE DURÉE

En cas d'immobilisation supérieure à 7 jours, il est recommandé :

- de recharger complètement le véhicule avant stockage ;
- de couper le coupe-circuit principal lorsque le véhicule en est équipé ;
- de stocker le véhicule dans un endroit sec et ventilé ;
- d'éviter les fortes chaleurs et l'humidité excessive ;
- d'effectuer une recharge d'entretien environ une fois par mois.

Le client reconnaît qu'une batterie laissée déchargée pendant une période prolongée peut subir des dommages irréversibles.

16. ENTRETIEN DES BATTERIES

Le client s'engage à vérifier régulièrement :

- la propreté des batteries ;
- les connexions électriques ;
- les câbles ;
- l'absence d'oxydation ;
- l'absence de fuite ;
- l'absence de gonflement.

En cas d'odeur inhabituelle, de chauffe anormale ou de comportement anormal du véhicule, le client s'engage à interrompre immédiatement l'utilisation du véhicule et à contacter Neodrive.

17. RESPONSABILITÉ DU CLIENT CONCERNANT LES BATTERIES

Le client demeure responsable du respect des consignes d'utilisation, de charge, de stockage et d'entretien des batteries.

Les dommages résultant notamment :

- d'une décharge profonde ;
- d'un stockage prolongé batterie déchargée ;
- d'un défaut d'entretien ;
- d'une mauvaise utilisation ;
- de l'utilisation d'un chargeur non recommandé ;
- d'une modification non autorisée ;
- d'une exposition prolongée à l'eau ou à l'humidité ;

pourront entraîner l'exclusion de la garantie applicable aux composants concernés.

Le vendeur recommande au client de contacter Neodrive dès l'apparition d'un comportement anormal afin de limiter les risques d'aggravation du problème.

18. GARANTIE STRUCTURE

Le châssis et les éléments structurels de carrosserie bénéficient d'une garantie de 2 ans à compter de la date de livraison du véhicule contre les défauts de fabrication.

Cette garantie couvre exclusivement les défauts de fabrication affectant les éléments structurels du véhicule.

Sont notamment exclus de cette garantie :

- les dommages résultant d'un accident ;
- les chocs ;
- les surcharges ;
- les modifications non autorisées ;
- l'usure normale ;
- les dommages causés par un tiers ;
- les dommages résultant d'une mauvaise utilisation du véhicule.

19. GARANTIE LÉGALE DE CONFORMITÉ

La garantie légale de conformité couvre le véhicule et ses composants lorsqu'un défaut de conformité existait au moment de la délivrance du véhicule, dans les conditions prévues par la loi.

Pour un véhicule neuf, le client dispose d'un délai de 2 ans à compter de la livraison pour demander l'application de cette garantie, sans avoir à prouver que le défaut existait au jour de la vente pendant cette période.

Lorsque la garantie légale de conformité est applicable, la mise en conformité par réparation ou remplacement est réalisée sans frais pour le client, conformément aux dispositions légales.

Les pannes ou dommages résultant notamment de l'usure normale, d'un accident, d'un choc, d'un défaut d'entretien, d'une mauvaise utilisation ou d'une modification non autorisée ne constituent pas des défauts de conformité imputables au vendeur.

20. PIÈCES EXCLUES DE LA GARANTIE

Sont notamment considérés comme des éléments d'usure et exclus de la garantie :

- pneumatiques ;
- plaquettes de frein ;
- ampoules ;
- fusibles ;
- balais d'essuie-glace ;
- consommables ;
- éléments soumis à une usure normale.

21. PROCÉDURE DE DIAGNOSTIC

Avant toute prise en charge, Neodrive pourra demander au client :

- des photographies ;
- des vidéos ;
- des mesures techniques ;
- des captures d'écran ;
- des essais simples ;
- tout document ou information utile au diagnostic.

Le client s'engage à coopérer avec Neodrive afin de permettre l'identification de la panne.

Lorsque le diagnostic à distance ne permet pas d'identifier avec certitude l'origine du problème, Neodrive pourra demander le retour de la pièce concernée afin de procéder à une expertise technique.

Lorsque la demande est susceptible de relever de la garantie légale de conformité, les modalités de retour ou d'expertise sont organisées avec Neodrive. Les frais nécessaires à la mise en conformité sont pris en charge conformément aux dispositions légales.

Après expertise :

- si la défaillance est reconnue comme couverte par la garantie légale de conformité, la mise en conformité sera effectuée sans frais dans les conditions prévues par la loi ;
- si la défaillance n'est pas couverte par la garantie, aucune prise en charge ne sera accordée.

Les frais de retour de la pièce restent à la charge du client lorsque la garantie n'est pas applicable.

22. EXCLUSIONS DE GARANTIE DES COMPOSANTS

Sont notamment exclus :

- les dommages causés par une mauvaise utilisation ;
- les dommages résultant d'un défaut d'entretien ;
- les dommages résultant d'une modification non autorisée ;
- les dommages résultant d'un accident ;
- les dommages résultant d'un choc ;
- les dommages résultant d'une surcharge ;
- les dommages résultant du non-respect des consignes d'utilisation ;
- les dommages résultant d'une réparation non conforme.

Concernant les batteries, sont notamment exclus :

- la décharge profonde ;
- le stockage prolongé batterie déchargée ;
- le défaut d'entretien ;
- l'utilisation d'un chargeur non recommandé ;
- les dommages résultant du non-respect des consignes figurant dans les présentes CGV ou dans le manuel utilisateur.

23. PROGRAMME ASSISTANCE Neodrive

Pendant la période de garantie légale de conformité, Neodrive accompagne le client dans le diagnostic et le traitement des défauts susceptibles d'être couverts. Après cette période, le service après-vente, le diagnostic et les pièces détachées restent accessibles selon les tarifs et disponibilités en vigueur.

24. SERVICE APRÈS-VENTE Neodrive

Neodrive privilégie une approche basée sur l'assistance technique, le diagnostic et la réparation locale afin de réduire les délais d'immobilisation du véhicule et les coûts supportés par le client.

L'objectif de Neodrive est d'accompagner ses clients dans l'identification et la résolution des problèmes pouvant survenir au cours de l'utilisation du véhicule.

Le client s'engage à contacter Neodrive dès l'apparition d'un dysfonctionnement afin de permettre un diagnostic rapide et d'éviter toute aggravation éventuelle de la panne.

25. DIAGNOSTIC À DISTANCE

Lorsqu'un problème est signalé, Neodrive procède en priorité à un diagnostic à distance.

Afin de permettre l'identification de l'origine du problème, Neodrive pourra demander au client :

- des photographies ;
- des vidéos ;
- des relevés techniques ;
- des captures d'écran ;
- des mesures simples ;
- des essais simples ;
- toute information utile au diagnostic.

Le client s'engage à coopérer avec Neodrive dans le cadre de la recherche de panne.

Neodrive pourra guider le client étape par étape afin de réaliser certains contrôles simples lorsque cela est nécessaire.

26. PANNES SIMPLES

Lorsqu'une panne peut être identifiée et résolue à distance, Neodrive accompagne gratuitement le client dans la recherche de panne.

Selon la situation, Neodrive pourra :

- fournir des conseils techniques ;
- transmettre des procédures de contrôle ;
- transmettre des procédures de réparation ;
- recommander le remplacement d'une pièce ;
- fournir les pièces nécessaires selon disponibilité.

Les conditions de garantie prévues aux présentes Conditions Générales de Vente demeurent applicables.

27. PANNES COMPLEXES

Lorsque la panne nécessite l'intervention d'un professionnel, Neodrive pourra orienter le client vers un réparateur ou un professionnel compétent.

Neodrive pourra également assister ce professionnel à distance afin de faciliter le diagnostic et la réparation.

Avant toute intervention susceptible de faire l'objet d'une demande de prise en charge ou de participation financière, le client devra obtenir l'accord préalable écrit de Neodrive.

À défaut d'accord préalable écrit, les frais engagés demeureront intégralement à la charge du client.

Le recours à un professionnel tiers ne crée aucune obligation de prise en charge financière par Neodrive.

28. TRANSPORT DU VÉHICULE

Sauf accord écrit exceptionnel préalable, Neodrive ne prend pas en charge :

- le transport du véhicule ;
- le remorquage ;
- les frais de déplacement ;
- les frais de récupération du véhicule ;
- les frais de gardiennage ;
- les frais d'hébergement ;
- les frais de location d'un véhicule de remplacement ;
- les pertes d'exploitation ;
- les pertes de revenus ;
- les frais indirects liés à l'immobilisation du véhicule.

Ces frais demeurent intégralement à la charge du client.

29. MAIN-D'ŒUVRE ET INTERVENTIONS

Neodrive privilégie la fourniture :

- d'assistance technique ;
- d'accompagnement au diagnostic ;
- de support technique à distance ;
- de pièces détachées.

Les réparations réalisées par un garage, un réparateur ou tout autre prestataire extérieur demeurent à la charge du client sauf accord écrit préalable de Neodrive.

Aucune facture de réparation, de diagnostic, de recherche de panne, de déplacement, de transport ou de main-d'œuvre ne pourra faire l'objet d'un remboursement sans accord écrit préalable de Neodrive.

Lorsque Neodrive accepte exceptionnellement une participation financière à une intervention, cette participation fera l'objet d'un accord écrit précisant son montant et ses conditions.

30. CONTRÔLE TECHNIQUE DES PIÈCES ET DEMANDES DE GARANTIE

Dans le cadre d'une demande de garantie ou d'une demande de prise en charge, Neodrive pourra demander au client le retour de la pièce concernée afin de procéder à une expertise technique.

Cette procédure peut notamment s'appliquer aux :

- batteries ;
- contrôleurs ;
- chargeurs ;
- moteurs ;
- convertisseurs ;
- composants électriques ;
- composants électroniques ;
- ou toute autre pièce concernée par la demande.

Lorsque la demande est susceptible de relever de la garantie légale de conformité, les modalités et frais nécessaires au retour ou à l'expertise sont organisés et pris en charge conformément aux dispositions légales.

Après réception, Neodrive procédera aux vérifications, mesures et contrôles techniques jugés nécessaires afin de déterminer l'origine de la défaillance.

À l'issue de cette expertise :

- si la défaillance est reconnue comme couverte par la garantie légale de conformité, la mise en conformité sera effectuée sans frais dans les conditions prévues par la loi ;
- si la défaillance résulte d'une usure normale, d'un défaut d'entretien, d'une mauvaise utilisation, d'une modification non autorisée ou de toute autre cause exclue de garantie, aucune prise en charge ne sera accordée.

Neodrive se réserve le droit de demander le retour de toute pièce avant validation définitive d'une demande de garantie.

Les frais de retour de la pièce vers le client demeurent à la charge du client lorsque la garantie n'est pas applicable.

Le client reconnaît que l'expertise technique réalisée par Neodrive constitue la base permettant de déterminer l'éligibilité ou non à une prise en charge au titre de la garantie.

31. PROGRAMME ASSISTANCE Neodrive

Pendant la période de garantie légale de conformité, Neodrive accompagne le client dans le diagnostic et le traitement des défauts susceptibles d'être couverts. Après cette période, le service après-vente, le diagnostic et les pièces détachées restent accessibles selon les tarifs et disponibilités en vigueur. Cet accompagnement ne constitue pas une extension de garantie.

32. RESPONSABILITÉ

La responsabilité de Neodrive est strictement limitée aux obligations prévues dans les présentes Conditions Générales de Vente.

Neodrive ne pourra être tenu responsable :

- d'une mauvaise utilisation du véhicule ;
- d'un défaut d'entretien ;
- d'une réparation non conforme ;
- d'une modification non autorisée ;
- d'un accident ;
- d'un dommage causé par un tiers ;
- d'un cas de force majeure ;
- d'une utilisation non conforme aux recommandations fournies.

33. AUTONOMIE ET PERFORMANCES

Les autonomies, performances et consommations annoncées sont communiquées à titre indicatif.

Elles peuvent varier notamment en fonction :

- de la température extérieure ;
- du relief ;
- du style de conduite ;
- du poids transporté ;
- de l'état de charge des batteries ;
- de l'état général du véhicule ;
- des conditions d'utilisation.

Aucune autonomie minimale ne peut être garantie dans toutes les conditions d'utilisation.

34. MODIFICATIONS DU VÉHICULE

Toute modification technique réalisée sans accord écrit préalable de Neodrive peut entraîner l'exclusion totale ou partielle des garanties prévues aux présentes Conditions Générales de Vente.

35. DROIT APPLICABLE ET LITIGES

Les présentes Conditions Générales de Vente sont soumises au droit français.

En cas de litige, les parties s'efforceront de rechercher une solution amiable avant toute procédure judiciaire.

À défaut d'accord amiable, les juridictions compétentes seront celles déterminées par la réglementation française applicable.

36. ACCEPTATION DES CONDITIONS GÉNÉRALES DE VENTE

Le client reconnaît :

- avoir pris connaissance des présentes Conditions Générales de Vente ;
- avoir reçu les informations nécessaires à son achat ;
- avoir reçu les consignes d'utilisation et d'entretien ;
- avoir obtenu les réponses à ses questions ;
- accepter les présentes Conditions Générales de Vente sans réserve.

Fait à : ________

Le : ________

Nom et prénom du client :

---

Signature précédée de la mention :

"Lu et approuvé"

`;

/* STYLES DU DEVIS (couleurs simples pour la capture html2canvas) */

const pdf: React.CSSProperties = {
  background: "#fff",
  color: "#111",
  padding: "24px 20px",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  lineHeight: 1.45
};

const pLine: React.CSSProperties = { margin: "2px 0" };

const h3: React.CSSProperties = { margin: "18px 0 8px", fontSize: 16 };

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};

const right: React.CSSProperties = {
  textAlign: "right",
  whiteSpace: "nowrap",
  paddingLeft: 12
};

const totalRow: React.CSSProperties = {
  fontWeight: "bold",
  borderTop: "2px solid black"
};

const bank: React.CSSProperties = {
  marginTop: 24,
  fontSize: 13,
  whiteSpace: "pre-line"
};

const signature: React.CSSProperties = {
  marginTop: 40,
  width: 250,
  maxWidth: "100%",
  borderTop: "1px solid black"
};

const cgvStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: "1.6",
  marginTop: 20,
  whiteSpace: "pre-line",
  maxHeight: 360,
  overflowY: "auto",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: "10px 12px"
};
