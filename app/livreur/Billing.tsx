"use client";
import { useState } from "react";
import c from "../giga/giga.module.css";
import { ibanOk } from "../../lib/driver-invoice-shared";

type Api = <T = Record<string, unknown>>(body: object) => Promise<T>;
export type BillingInfo = { legal_name?: string; siret?: string; address?: string; iban?: string; bic?: string } | null;

/** Coordonnées de facturation du livreur : nom, SIRET, adresse, IBAN (clé contrôlée) et BIC. Obligatoires avant d'envoyer une facture. */
export default function Billing({ initial, api, onSaved, onMsg }: { initial: BillingInfo; api: Api; onSaved: () => void; onMsg: (m: string) => void }) {
  const [f, setF] = useState({ legal_name: initial?.legal_name || "", siret: initial?.siret || "", address: initial?.address || "", iban: initial?.iban || "", bic: initial?.bic || "" });
  const [busy, setBusy] = useState(false);
  const ibanClean = f.iban.toUpperCase().replace(/\s+/g, "");
  const ibanState = !ibanClean ? "" : ibanOk(ibanClean) ? "✅ IBAN valide" : "❌ IBAN invalide (vérifiez chaque caractère)";
  const field = { display: "grid", gap: 4, fontSize: 14, fontWeight: 600 } as const;
  const save = async () => {
    setBusy(true);
    try { const j = await api<{ missing: string[] }>({ action: "billing_save", ...f }); onSaved(); onMsg(j.missing.length ? `💾 Enregistré. Il manque encore : ${j.missing.join(", ")}.` : "✅ Coordonnées de facturation complètes."); }
    catch (e) { onMsg("❌ " + (e as Error).message); } finally { setBusy(false); }
  };
  return <section className={c.card} style={{ display: "grid", gap: 10, padding: 14 }}>
    <b style={{ fontSize: 16 }}>🏦 Mes coordonnées de facturation</b>
    <small className={c.muted}>Elles figurent sur vos factures (établies par NeoDrive en votre nom, article 11 du contrat). Le RIB doit aussi être déposé ci-dessous.</small>
    <label style={field}>Nom et prénom ou nom commercial<input className={c.input} value={f.legal_name} onChange={e => setF({ ...f, legal_name: e.target.value })} placeholder="Ex. : Jean Dupont EI" /></label>
    <label style={field}>SIRET (14 chiffres)<input className={c.input} inputMode="numeric" value={f.siret} onChange={e => setF({ ...f, siret: e.target.value.replace(/[^\d ]/g, "") })} /></label>
    <label style={field}>Adresse de facturation<input className={c.input} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="N°, rue, code postal, ville" /></label>
    <label style={field}>IBAN<input className={c.input} value={f.iban} onChange={e => setF({ ...f, iban: e.target.value.toUpperCase() })} placeholder="FR76 …" autoComplete="off" /></label>
    {ibanState ? <small style={{ color: ibanState.startsWith("✅") ? "#067647" : "#b42318", fontWeight: 700 }}>{ibanState}</small> : null}
    <label style={field}>BIC (facultatif)<input className={c.input} value={f.bic} onChange={e => setF({ ...f, bic: e.target.value.toUpperCase() })} /></label>
    <button className={`${c.btn} ${c.btnBrand}`} disabled={busy || (!!ibanClean && !ibanOk(ibanClean))} onClick={save}>{busy ? "…" : "💾 Enregistrer"}</button>
  </section>;
}
