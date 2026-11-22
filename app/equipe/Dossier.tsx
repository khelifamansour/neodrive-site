"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DOSSIER_DOCS } from "../../lib/team-pay";

/** « Mon dossier » : coordonnées, banque et pièces du membre (fichiers privés, envoyés par URL signée). */
export type DossierApi = <T = Record<string, unknown>>(body: object) => Promise<T>;
type P = { full_name: string; address: string; ae_number: string; email: string; bank_holder: string; bank_name: string; iban: string; rib: string; bic: string };
type Doc = { filename: string | null; uploaded_at: string } | undefined;
const C = { line: "#e5e0d8", ink: "#141414", mute: "#6b6b6b", brand: "#f05a28", ok: "#15803d", bad: "#b91c1c" };
const box: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: "10px 0" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "11px 14px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit" });
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 10, border: `1px solid ${C.line}`, font: "inherit", fontSize: 16, background: "#fff" };
const lab: React.CSSProperties = { display: "block", fontWeight: 600, fontSize: 14, margin: "10px 0 4px" };
const hint: React.CSSProperties = { color: C.mute, fontSize: 12.5, margin: "3px 0 0" };

export default function Dossier({ api }: { api: DossierApi }) {
  const [p, setP] = useState<P | null>(null); const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [saved, setSaved] = useState<P | null>(null);
  const [busy, setBusy] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { const j = await api<{ profile: P; docs: Record<string, Doc> }>({ action: "me" }); setP(j.profile); setSaved(j.profile); setDocs(j.docs || {}); } catch (e) { setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  if (!p) return <p style={{ color: err ? C.bad : C.mute }}>{err || "Chargement de votre dossier…"}</p>;
  const set = (k: keyof P) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);

  const save = async () => {
    setErr(""); setMsg(""); setBusy("save");
    try { await api({ action: "save", ...p }); setSaved(p); setMsg("✅ Dossier enregistré. Merci !"); } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };
  const upload = async (kind: string, f?: File) => {
    if (!f) return; setErr(""); setMsg("");
    if (f.size > 15 * 1024 * 1024) { setErr("Fichier trop lourd (15 Mo maximum). Prenez une photo un peu moins grande."); return; }
    const ext = (f.name.split(".").pop() || (f.type.includes("pdf") ? "pdf" : "jpg")).toLowerCase();
    setBusy(kind);
    try {
      const u = await api<{ bucket: string; path: string; token: string }>({ action: "upload_url", kind, ext });
      const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || undefined });
      if (error) throw new Error("L'envoi du fichier n'a pas abouti. Vérifiez votre connexion et réessayez.");
      await api({ action: "upload_done", kind, path: u.path, filename: f.name });
      setMsg("✅ Pièce bien reçue."); await load();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };
  const view = async (kind: string) => { try { const j = await api<{ url: string }>({ action: "doc_url", kind }); if (j.url) window.open(j.url, "_blank", "noopener"); } catch (e) { setErr((e as Error).message); } };

  const s = saved || p;
  const bankOk = !!s.iban || (!!s.rib && !!s.bic);
  const checks: [boolean, string, string?][] = [
    [!!s.full_name, "Nom complet"],
    [!!s.address, "Adresse postale"],
    [!!s.email, "Adresse e-mail"],
    [bankOk, "Coordonnées bancaires (IBAN, ou RIB + SWIFT/BIC)"],
    [!!s.ae_number, "Numéro de carte auto-entrepreneur", "facultatif jusqu'à la fin de la période d'essai"],
    ...DOSSIER_DOCS.map(d => [!!docs[d.id], d.label] as [boolean, string]),
  ];
  const done = checks.filter(c => c[0]).length;

  return <div>
    <div style={box}>
      <b style={{ fontSize: 17 }}>Pièces à fournir · {done}/{checks.length}</b>
      <p style={hint}>Ces informations servent à établir vos factures et à vous payer. Elles restent privées : seul Mansour peut les voir.</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 4 }}>
        {checks.map(([ok, t, opt]) => <li key={t} style={{ fontSize: 15 }}>{ok ? "✅" : "❌"} {t}{!ok && opt ? <span style={{ color: C.mute, fontSize: 13 }}> ({opt})</span> : null}</li>)}
      </ul>
    </div>
    {err ? <p style={{ color: C.bad, fontWeight: 600 }}>{err}</p> : null}
    {msg ? <p style={{ color: C.ok, fontWeight: 600 }}>{msg}</p> : null}

    <div style={box}>
      <b style={{ fontSize: 17 }}>👤 Mes coordonnées</b>
      <label style={lab}>Nom et prénom complets</label><input style={input} value={p.full_name} onChange={set("full_name")} autoComplete="name" placeholder="Comme sur votre pièce d'identité" />
      <label style={lab}>Adresse postale</label><textarea style={input} rows={3} value={p.address} onChange={set("address")} autoComplete="street-address" placeholder="Rue, code postal, ville, pays" />
      <label style={lab}>Adresse e-mail</label><input style={input} type="email" value={p.email} onChange={set("email")} autoComplete="email" inputMode="email" />
      <label style={lab}>Numéro de carte auto-entrepreneur</label><input style={input} value={p.ae_number} onChange={set("ae_number")} />
      <p style={hint}>Facultatif pendant la période d’essai. Il apparaîtra sur vos factures.</p>
    </div>

    <div style={box}>
      <b style={{ fontSize: 17 }}>🏦 Mon compte bancaire</b>
      <p style={hint}>Un compte qui peut recevoir des virements internationaux en euros (EUR).</p>
      <label style={lab}>Titulaire du compte</label><input style={input} value={p.bank_holder} onChange={set("bank_holder")} placeholder="Nom exact du titulaire" />
      <label style={lab}>Nom de la banque</label><input style={input} value={p.bank_name} onChange={set("bank_name")} />
      <label style={lab}>IBAN</label><input style={{ ...input, fontFamily: "monospace" }} value={p.iban} onChange={set("iban")} autoCapitalize="characters" spellCheck={false} placeholder="Ex. FR76 …" />
      <p style={hint}>Votre banque n’a pas d’IBAN ? Laissez ce champ vide et remplissez le RIB et le code SWIFT/BIC.</p>
      <label style={lab}>RIB (si pas d’IBAN)</label><input style={{ ...input, fontFamily: "monospace" }} value={p.rib} onChange={set("rib")} spellCheck={false} inputMode="numeric" />
      <label style={lab}>Code SWIFT / BIC</label><input style={{ ...input, fontFamily: "monospace" }} value={p.bic} onChange={set("bic")} autoCapitalize="characters" spellCheck={false} placeholder="8 ou 11 caractères" />
    </div>
    <button onClick={save} disabled={busy === "save" || !dirty} style={{ ...btn(dirty ? C.brand : "#9c9890"), width: "100%", padding: 14, fontSize: 16 }}>{busy === "save" ? "Enregistrement…" : dirty ? "Enregistrer mon dossier" : "✅ Dossier enregistré"}</button>

    <div style={box}>
      <b style={{ fontSize: 17 }}>📎 Mes documents</b>
      <p style={hint}>Une photo bien nette (avec le téléphone) ou un PDF. Vous pouvez remplacer un document à tout moment.</p>
      {DOSSIER_DOCS.map(d => { const v = docs[d.id]; return <div key={d.id} style={{ borderTop: `1px solid ${C.line}`, padding: "10px 0", marginTop: 8 }}>
        <div style={{ fontWeight: 700 }}>{v ? "✅" : "❌"} {d.label}</div>
        <div style={hint}>{d.hint}</div>
        {v ? <div style={{ ...hint, marginTop: 4 }}>Reçu le {new Date(v.uploaded_at).toLocaleDateString("fr-FR")}{v.filename ? ` · ${v.filename}` : ""} · <button onClick={() => view(d.id)} style={{ border: 0, background: "none", color: C.brand, font: "inherit", fontWeight: 700, padding: 0, cursor: "pointer" }}>voir</button></div> : null}
        <label style={{ ...btn(v ? "#555" : C.ink), display: "inline-block", marginTop: 8, opacity: busy === d.id ? 0.6 : 1 }}>
          {busy === d.id ? "Envoi en cours…" : v ? "Remplacer" : "📷 Ajouter (photo ou PDF)"}
          <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={e => { upload(d.id, e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>; })}
    </div>
  </div>;
}
