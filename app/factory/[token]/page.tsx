"use client";
import { use, useEffect, useState } from "react";
import s from "../../planificateur/planif.module.css";
import { supabase } from "../../../lib/supabase";
import { FACTORY_DOCS, type Issue } from "../../../lib/shipments";

type Doc = { id: number; doc_type: string; version: string; file_name: string; created_at: string; vins: number | null };
type Checks = { missing: string[]; issues: Issue[]; complete: boolean };
const HINT: Record<string, string> = {
  pi: "At order time. Model, colours, quantity, unit price, total.",
  facture: "One line per model, with the VIN of every vehicle if possible. Quantity × unit price must equal the total.",
  colisage: "VIN of every vehicle, container by container (container number + VIN list).",
  coc: "One certificate of conformity per vehicle. The VIN must be exactly the same as on the packing list.",
  bl: "Bill of lading once the containers are loaded on the vessel.",
  photos: "Photos of the loading: open container, vehicles strapped, sealed container with the seal number visible.",
  pieces: "Detailed list of the spare parts shipped (reference, description, quantity, which container).",
};
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function Factory({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ship, setShip] = useState<Record<string, any> | null>(null); const [docs, setDocs] = useState<Doc[]>([]); const [checks, setChecks] = useState<Checks | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState(""); const [who, setWho] = useState("");
  const load = async () => { const r = await fetch(`/api/conteneurs/factory?t=${token}`, { cache: "no-store" }); const j = await r.json().catch(() => null); if (j?.ok) { setShip(j.ship); setDocs(j.docs || []); setChecks(j.checks); } else setErr("Invalid link. Please contact NeoDrive."); };
  useEffect(() => { load(); try { setWho(localStorage.getItem("nd_factory_who") || ""); } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const post = async (body: object) => { const r = await fetch("/api/conteneurs/factory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, who, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!j.ok) throw new Error(j.error || "Error"); return j; };

  async function upload(type: string, list: FileList | null, version: string) {
    if (!list?.length) return; const files = Array.from(list);
    try { localStorage.setItem("nd_factory_who", who); } catch { }
    setBusy(type); setMsg("");
    try {
      const init = await post({ action: "upload_url", files: files.map(f => ({ name: f.name })) });
      let ok = 0; const notes: string[] = [];
      for (const [i, u] of (init.uploads as { path: string; token: string }[]).entries()) {
        const f = files[i]; setMsg(`Uploading ${i + 1}/${files.length}: ${f.name}…`);
        const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || "application/octet-stream" });
        if (error) { notes.push(`❌ ${f.name}: upload failed`); continue; }
        setMsg(`Checking ${f.name}… (reading VIN and amounts can take up to a minute)`);
        try { const j = await post({ action: "register", path: u.path, name: f.name, doc_type: type, version }); ok++; if (j.vins != null) notes.push(`${f.name}: ${j.vins} VIN read`); } catch (e) { notes.push(`❌ ${f.name}: ${(e as Error).message}`); }
      }
      const fin = await post({ action: "finish" });
      setMsg(`✅ ${ok}/${files.length} file(s) received.${notes.length ? " " + notes.join(" · ") : ""}${fin.autoSent ? " The file is complete and has been sent to the customs broker. Thank you!" : ""}`);
      await load();
    } catch (e) { setMsg("❌ " + (e as Error).message); }
    setBusy("");
  }

  if (err) return <main className={s.page}><h1>{err}</h1></main>;
  if (!ship || !checks) return <main className={s.page}><p>Loading…</p></main>;
  const errors = checks.issues.filter(i => i.level === "error"), warns = checks.issues.filter(i => i.level === "warn");
  return <main className={s.page} style={{ maxWidth: 820 }}>
    <div className={s.top}><div><h1>🏭 {ship.name}</h1><p>MK HOLDING – NeoDrive (France) · {ship.vehicles ?? "?"} vehicles{ship.model ? ` · ${ship.model}` : ""}{ship.containers ? ` · ${ship.containers} container(s)` : ""} · port of discharge: {ship.port || "—"}{ship.loaded_at ? ` · loading ${day(ship.loaded_at)}` : ""}{ship.eta ? ` · ETA ${day(ship.eta)}` : ""}</p></div></div>

    <section className={s.card} style={{ background: checks.complete ? "#f0fdf4" : "#fff7ed" }}>
      <h2>{checks.complete ? "✅ All documents received and checked" : `Documents needed: ${FACTORY_DOCS.length - checks.missing.length}/${FACTORY_DOCS.length} received`}</h2>
      {checks.complete ? <p>Thank you. {ship.sent ? "The file has been sent to our customs broker." : "NeoDrive will send the file to the customs broker."}</p> : <p className={s.muted}>Please upload every document below. Each file is checked automatically: VIN format and check digit, same VIN list on the invoice, packing list and COC, quantities and invoice total.</p>}
      {errors.length ? <div style={{ background: "#fef2f2", padding: 12, borderRadius: 12 }}><b style={{ color: "#b91c1c" }}>❌ To correct ({errors.length})</b><ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{errors.map((i, k) => <li key={k}>{i.en}</li>)}</ul><small>Please upload a corrected version (choose “Corrected version”).</small></div> : null}
      {warns.length ? <div style={{ background: "#fffbeb", padding: 12, borderRadius: 12 }}><b style={{ color: "#b45309" }}>⚠️ Please check ({warns.length})</b><ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{warns.map((i, k) => <li key={k}>{i.en}</li>)}</ul></div> : null}
    </section>

    <section className={s.card}>
      <label className={s.field}>Your name / company<input value={who} onChange={e => setWho(e.target.value)} placeholder="e.g. Haibao – export dept." /></label>
      {msg ? <p style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", padding: 10, borderRadius: 10, wordBreak: "break-word" }}>{msg}</p> : null}
    </section>

    {FACTORY_DOCS.map(t => { const list = docs.filter(d => d.doc_type === t.key); const has = list.length > 0;
      return <section key={t.key} className={s.card} style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>{has ? "✅" : "❌"} {t.en} <small style={{ fontWeight: 400, color: "#5b6573" }}>{t.zh}</small></h2>
        <small className={s.muted}>{HINT[t.key]}</small>
        {list.map(d => <div key={d.id} style={{ fontSize: 14, color: "#374151" }}>📄 {d.file_name} · {d.version === "corrigée" ? "corrected" : "original"} · {day(d.created_at)}{d.vins != null ? ` · ${d.vins} VIN read` : ""}</div>)}
        <form onSubmit={e => e.preventDefault()} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select name="version" defaultValue={has ? "corrigée" : "originale"} style={{ width: "auto" }} id={"v-" + t.key}><option value="originale">Original</option><option value="corrigée">Corrected version</option></select>
          <label className={s.primary} style={{ cursor: busy ? "wait" : "pointer", opacity: busy && busy !== t.key ? .5 : 1 }}>{busy === t.key ? "Uploading…" : has ? "Upload another / corrected file" : "Upload"}
            <input type="file" multiple hidden disabled={!!busy} accept={t.key === "photos" ? "image/*,.pdf,.zip" : ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"} onChange={e => { const v = (document.getElementById("v-" + t.key) as HTMLSelectElement | null)?.value || "originale"; upload(t.key, e.target.files, v); e.target.value = ""; }} /></label>
        </form>
      </section>; })}
    <p className={s.muted} style={{ textAlign: "center" }}>PDF is preferred for invoices, packing lists and COC (they are read automatically). Questions: khelifamansour@hotmail.fr</p>
  </main>;
}
