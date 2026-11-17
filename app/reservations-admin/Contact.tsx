"use client";
import { useMemo, useState } from "react";
import c from "../giga/giga.module.css";

type R = { id: number; prenom: string; nom: string; telephone: string; ville: string; modele: string; date_promise: string | null };
const SITE = "https://www.easydrive-auto.fr";
const SIGN = "Mansour - NeoDrive";
const intl = (p: string) => { const d = p.replace(/\D/g, ""); return d.startsWith("00") ? d.slice(2) : d.startsWith("0") ? "33" + d.slice(1) : d; };
const longDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Modèles de messages (envoi manuel depuis le téléphone, rien d'automatique). */
function templates(r: R, hs: boolean, video: string) {
  const who = (r.prenom || r.nom || "").trim();
  const hi = `Bonjour${who ? " " + who : ""},`;
  const modele = r.modele || "NeoDrive";
  const list: { id: string; label: string; text: string }[] = [
    { id: "confirmation", label: "Confirmation", text: `${hi} c’est Mansour de NeoDrive. Je prépare les livraisons dans votre secteur${r.ville ? ` (${r.ville})` : ""} : souhaitez-vous toujours être livré(e) de votre ${modele} ? Pouvez-vous me confirmer votre adresse de livraison et vos disponibilités ? Répondez simplement OUI et je vous propose une date. Merci ! ${SIGN}` },
    { id: "livraison", label: "Livraison prochaine", text: `${hi} bonne nouvelle : votre livraison est prévue ${r.date_promise ? "le " + longDate(r.date_promise) : "dans les prochains jours"}${r.ville ? ` à ${r.ville}` : ""}. Voici les instructions pour préparer votre livraison : ${SITE}/preparer-ma-livraison\nLe paiement se fait par virement instantané au moment de la livraison ; les clés vous sont remises dès que nous avons confirmé sa réception. Merci d’être présent(e) en personne (titulaire de la réservation) et de prévoir une prise 220 V à proximité. À très bientôt ! ${SIGN}` },
    { id: "patience", label: "Patience", text: `${hi} merci pour votre patience. Nous traversons une période très chargée et nous finalisons le planning des livraisons dans votre secteur. Je vous donne une date de livraison dans les prochains jours. Bonne journée, ${SIGN}` },
    { id: "horsstock", label: "Hors stock", text: `${hi} merci pour votre réservation de la ${modele}. Cette version n’est pas disponible en stock pour le moment. En revanche, la NeoDrive Confort est disponible tout de suite (caméra de recul, chauffage, Bluetooth) et peut vous être livrée rapidement. Souhaitez-vous que je vous la réserve à la place ? ${SIGN}` },
  ];
  if (video) list.push({ id: "video", label: "Vidéo de prise en main", text: `${hi} voici la vidéo de prise en main de votre NeoDrive, à regarder avant la livraison : ${video}\nN’hésitez pas si vous avez une question ! ${SIGN}` });
  if (hs) { const i = list.findIndex(t => t.id === "horsstock"); list.unshift(...list.splice(i, 1)); }
  return list;
}

/** Bouton « Contacter » : canal, modèle pré-rempli et modifiable, ouverture de WhatsApp ou des SMS du téléphone. */
export default function Contact({ r, hs, video, onSent, onClose }: { r: R; hs: boolean; video: string; onSent: (channel: "whatsapp" | "sms", template: string) => void; onClose: () => void }) {
  const list = useMemo(() => templates(r, hs, video), [r, hs, video]);
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [tpl, setTpl] = useState(list[0].id);
  const [text, setText] = useState(list[0].text);
  const num = intl(r.telephone || "");
  const href = channel === "whatsapp" ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : `sms:+${num}?&body=${encodeURIComponent(text)}`;
  const label = list.find(t => t.id === tpl)?.label || tpl;
  if (!num) return <p className={c.err}>Pas de numéro de téléphone pour ce client.</p>;
  return <div style={{ display: "grid", gap: 8, borderTop: "1px solid #eee", paddingTop: 10 }}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {(["whatsapp", "sms"] as const).map(ch => <button key={ch} className={`${c.btn} ${channel === ch ? c.btnBrand : c.btnGhost}`} style={{ padding: "6px 12px" }} onClick={() => setChannel(ch)}>{ch === "whatsapp" ? "💬 WhatsApp" : "📱 SMS"}</button>)}
    </div>
    <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 600 }}>Message
      <select className={c.input} value={tpl} onChange={e => { const t = list.find(x => x.id === e.target.value)!; setTpl(t.id); setText(t.text); }}>
        {list.map(t => <option key={t.id} value={t.id}>{t.label}{t.id === "horsstock" && hs ? " (recommandé)" : ""}</option>)}
      </select></label>
    <textarea className={c.input} rows={7} value={text} onChange={e => setText(e.target.value)} />
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a className={`${c.btn} ${c.btnBrand}`} href={href} target={channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer" style={{ textDecoration: "none" }} onClick={() => onSent(channel, label)}>{channel === "whatsapp" ? "Ouvrir WhatsApp" : "Ouvrir les SMS"}</a>
      <button className={`${c.btn} ${c.btnGhost}`} onClick={onClose}>Fermer</button>
    </div>
    <small className={c.muted}>Le message s’ouvre dans votre téléphone : vérifiez-le puis envoyez-le vous-même. Le contact est noté dans la réservation.</small>
  </div>;
}
