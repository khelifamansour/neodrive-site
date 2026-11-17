"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_FORECAST, computeForecast, normalizeForecast, type ForecastData } from "../../../lib/forecast";
import { api, storedCode } from "../client";

type L = "fr" | "en";
const MONTHS_EN = ["Dec 2026", "Jan 2027", "Feb 2027", "Mar 2027", "Apr 2027", "May 2027", "Jun 2027", "Jul 2027", "Aug 2027", "Sep 2027", "Oct 2027", "Nov 2027", "Dec 2027"];
const MONTHS_FR = ["Déc. 2026", "Janv. 2027", "Févr. 2027", "Mars 2027", "Avr. 2027", "Mai 2027", "Juin 2027", "Juil. 2027", "Août 2027", "Sept. 2027", "Oct. 2027", "Nov. 2027", "Déc. 2027"];
const PHOTOS = ["/hero.png", "/usine1.jpg", "/usine2.jpg", "/livraison-neodrive.webp", "/livraisons-clients/livraison-client-01.jpg", "/livraisons-clients/livraison-client-02.jpg", "/livraisons-clients/livraison-client-03.jpg", "/livraisons-clients/livraison-client-04.jpg", "/livraisons-clients/livraison-client-05.jpg"];

const T = {
  fr: {
    title: "Présentation de l’activité", sub: "Document établi pour les banques et organismes de contrôle.",
    id: "Identité", idRows: [["Société", "MK HOLDING SAS"], ["Marque", "NeoDrive"], ["SIREN", "908 645 393"], ["Siège", "31 rue Jean Nougaro, 31600 Muret, France"], ["Site", "www.easydrive-auto.fr"], ["Président", "Mansour Khelifa"]],
    act: "Notre activité", actTxt: "Nous achetons des voitures sans permis électriques neuves (quadricycles légers de catégorie L6e, conduits dès 14 ans avec le permis AM) et des produits liés auprès de constructeurs en Chine. Nous les importons en France et les vendons à des clients en France, livrés à domicile. Chaque véhicule est homologué en Europe et livré avec son certificat de conformité (COC). Prix public : 4 990 € TTC, hors livraison et carte grise.",
    stage: "Où en est l’activité", stageTxt: "L’activité actuelle a démarré en janvier 2026. Les premiers conteneurs importés arrivent en novembre et décembre 2026 : nous n’avons pas encore une année complète d’historique. Les volumes futurs sont incertains et dépendront du marché. Nous ne commandons de nouveaux véhicules qu’en fonction des ventes réelles.",
    chain: "Chaîne d’approvisionnement", chainSteps: ["Constructeurs en Chine (province du Shandong) — paiement en USD : 30 % à la commande, solde avant expédition", "Fret maritime en conteneur 40' HC (9 véhicules) — transitaire en Chine", "Arrivée au Havre ou à Fos-sur-Mer — dédouanement par un transitaire agréé (droits de douane 10 %)", "Dépotage et stockage à Gennevilliers (région parisienne) et en Occitanie", "Livraison au domicile du client, paiement par virement"],
    who: "Fournisseurs, partenaires et clients", whoRows: [["Fournisseurs", "Un constructeur de voitures sans permis électriques (Shandong), un second constructeur chinois pour les pick-up électriques L6e, un fournisseur de tricycles électriques ; pièces détachées avec chaque production."], ["Partenaires", "Transitaire maritime en Chine, transitaire en douane en France, prestataires de dépotage et de stockage au port de Gennevilliers, transporteurs."], ["Distributeurs", "À partir de 2027 : garages et concessionnaires indépendants (réseau de partenaires) qui exposent ou achètent des véhicules par lots."], ["Clients", "Particuliers en France (parents d’adolescents dès 14 ans, seniors, zones rurales) et petites entreprises. Vente par le site, les places de marché (Leboncoin), le téléphone et WhatsApp."]],
    bg: "Bulgarie", bgTxt: "Aucune activité régulière à ce jour. Un seul paiement ponctuel a été fait à une société bulgare pour l’achat de composants. Nous pourrions y chercher d’autres fournisseurs de pièces à l’avenir, sans engagement à ce stade. Nous informerons nos banques si cela change.",
    proj: "Projection indicative, non garantie", projTxt: "Projection sur 12 mois, recalculée chaque mois avec les ventes réelles. Deux cas : prudent (environ la moitié du cas de base) et base. Elle dépend de la demande du marché et ne constitue pas un engagement.",
    cols: ["Mois", "Véhicules vendus (prudent / base)", "Encaissements clients TTC (prudent / base)", "Paiements vers la Chine (prudent / base)"], total: "Total 2027", photos: "Photos", photoCap: "Notre véhicule, l’usine du fournisseur en Chine et des livraisons à des clients en France.",
    print: "🖨️ Imprimer / PDF", back: "← Conformité", sign: "Mansour Khelifa, Président de MK HOLDING SAS",
  },
  en: {
    title: "Business presentation", sub: "Document prepared for banks and compliance teams.",
    id: "Company", idRows: [["Company", "MK HOLDING SAS"], ["Brand", "NeoDrive"], ["SIREN", "908 645 393"], ["Registered office", "31 rue Jean Nougaro, 31600 Muret, France"], ["Website", "www.easydrive-auto.fr"], ["President", "Mansour Khelifa"]],
    act: "Our business", actTxt: "We buy new electric light quadricycles (EU category L6e, “voitures sans permis”, drivable from age 14 with an AM licence) and related products from manufacturers in China, import them into France and sell them to customers in France, delivered to their home. Each vehicle is EU type-approved and delivered with its Certificate of Conformity (COC). Retail price: €4,990 incl. VAT, excluding delivery and registration.",
    stage: "Stage of the business", stageTxt: "Our current activity started in January 2026. The first imported containers are arriving in November–December 2026, so we do not yet have a full year of history. Future volumes are uncertain and will depend on market demand. We order new vehicles only according to actual sales.",
    chain: "Supply chain", chainSteps: ["Manufacturers in China (Shandong province) — paid in USD: 30% deposit at order, balance before shipment", "Sea freight in 40' HC containers (9 vehicles) — freight forwarder in China", "Arrival at Le Havre or Fos-sur-Mer — customs clearance by a licensed broker (10% import duty)", "Unloading and storage at Gennevilliers (Paris area) and in Occitanie", "Home delivery to the customer, payment by bank transfer"],
    who: "Suppliers, partners and customers", whoRows: [["Suppliers", "An electric L6e car manufacturer (Shandong), a second Chinese manufacturer for electric L6e pick-ups, a supplier of electric tricycles; spare parts ordered with each production."], ["Partners", "Freight forwarder in China, customs broker in France, unloading and storage providers at the port of Gennevilliers, carriers."], ["Distributors", "From 2027: independent garages and dealers (partner network) who exhibit or buy vehicles in batches."], ["Customers", "Private individuals in France (parents of teenagers from 14, seniors, rural households) and small businesses. Sales through our website, marketplaces (Leboncoin), phone and WhatsApp."]],
    bg: "Bulgaria", bgTxt: "No regular activity today. One single one-off payment was made to a Bulgarian company for components. We may look for additional parts suppliers there in the future, with no commitment at this stage. We will inform our banks if this changes.",
    proj: "Indicative projection, not guaranteed", projTxt: "12-month projection, recalculated every month with actual sales. Two cases: prudent (about half of the base case) and base. It depends on market demand and is not a commitment.",
    cols: ["Month", "Vehicles sold (prudent / base)", "Customer payments incl. VAT (prudent / base)", "Payments to China (prudent / base)"], total: "Total 2027", photos: "Photos", photoCap: "Our vehicle, the supplier’s factory in China and deliveries to customers in France.",
    print: "🖨️ Print / PDF", back: "← Compliance", sign: "Mansour Khelifa, President of MK HOLDING SAS",
  },
} as const;

export default function Presentation() {
  const [lang, setLang] = useState<L>("fr");
  const [fc, setFc] = useState<ForecastData>(normalizeForecast(DEFAULT_FORECAST));
  useEffect(() => { if (storedCode()) api<{ data: ForecastData }>({ action: "forecast" }).then(j => setFc(j.data)).catch(() => null); }, []);
  const t = T[lang]; const M = lang === "fr" ? MONTHS_FR : MONTHS_EN;
  const rows = useMemo(() => computeForecast(fc, "moyen").map((r, i) => ({ i, v: r.vendus, ca: r.direct * (i < 2 ? 5790 : 6290) + r.partenaires * 4380, cn: r.sorties * 0.8 })), [fc]);
  const n = (x: number) => Math.round(x).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");
  const e = (x: number) => lang === "fr" ? `${n(x)} €` : `€${n(x)}`;
  const tot = rows.slice(1).reduce((a, r) => ({ v: a.v + r.v, ca: a.ca + r.ca, cn: a.cn + r.cn }), { v: 0, ca: 0, cn: 0 });
  const box: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 12, padding: 14, marginTop: 14, breakInside: "avoid" };
  const td: React.CSSProperties = { border: "1px solid #ccc", padding: "5px 7px", textAlign: "right" };
  const th: React.CSSProperties = { ...td, background: "#f1f1f1", textAlign: "left" };

  return <main style={{ background: "#fff", color: "#111", minHeight: "100vh", fontFamily: "Arial, Helvetica, sans-serif" }}>
    <style>{`@media print { .np { display: none !important } main { padding: 0 !important } @page { margin: 12mm } }`}</style>
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div className="np" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <Link href="/conformite" style={{ color: "#111" }}>{t.back}</Link>
        <span style={{ marginLeft: "auto" }} />
        <button onClick={() => setLang("fr")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: lang === "fr" ? "#111" : "#fff", color: lang === "fr" ? "#fff" : "#111" }}>Français</button>
        <button onClick={() => setLang("en")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: lang === "en" ? "#111" : "#fff", color: lang === "en" ? "#fff" : "#111" }}>English</button>
        <button onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 10, border: 0, background: "#f05a28", color: "#fff", fontWeight: 700 }}>{t.print}</button>
      </div>
      <h1 style={{ margin: "6px 0 2px", fontSize: 26 }}>{t.title}</h1>
      <p style={{ margin: 0, color: "#555" }}>MK HOLDING SAS · NeoDrive — {t.sub}</p>

      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.id}</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{t.idRows.map(([k, v]) => <tr key={k}><td style={{ ...th, width: "35%" }}>{k}</td><td style={{ ...td, textAlign: "left" }}>{v}</td></tr>)}</tbody></table></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.act}</h2><p style={{ margin: 0, lineHeight: 1.5 }}>{t.actTxt}</p></section>
      <section style={{ ...box, background: "#fff8ec", borderColor: "#f5c97a" }}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.stage}</h2><p style={{ margin: 0, lineHeight: 1.5 }}>{t.stageTxt}</p></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.photos}</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>{PHOTOS.map(p => <img key={p} src={p} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />)}</div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#555" }}>{t.photoCap}</p></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.chain}</h2><ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>{t.chainSteps.map(x => <li key={x}>{x}</li>)}</ol></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.who}</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{t.whoRows.map(([k, v]) => <tr key={k}><td style={{ ...th, width: "22%" }}>{k}</td><td style={{ ...td, textAlign: "left", lineHeight: 1.4 }}>{v}</td></tr>)}</tbody></table></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>{t.bg}</h2><p style={{ margin: 0, lineHeight: 1.5 }}>{t.bgTxt}</p></section>
      <section style={box}><h2 style={{ marginTop: 0, fontSize: 18 }}>📈 {t.proj}</h2><p style={{ marginTop: 0, lineHeight: 1.5 }}>{t.projTxt}</p>
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead><tr>{t.cols.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.i}><td style={{ ...td, textAlign: "left" }}>{M[r.i]}</td><td style={td}>{n(r.v / 2)} / {n(r.v)}</td><td style={td}>{e(r.ca / 2)} / {e(r.ca)}</td><td style={td}>{e(r.cn / 2)} / {e(r.cn)}</td></tr>)}
            <tr><th style={th}>{t.total}</th><th style={td}>{n(tot.v / 2)} / {n(tot.v)}</th><th style={td}>{e(tot.ca / 2)} / {e(tot.ca)}</th><th style={td}>{e(tot.cn / 2)} / {e(tot.cn)}</th></tr></tbody>
        </table></div></section>
      <p style={{ marginTop: 18 }}>{t.sign}</p>
    </div>
  </main>;
}
