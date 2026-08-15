"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Lead = {
  id: number;
  created_at?: string | null;
  nom?: string | null;
  telephone?: string | null;
  email?: string | null;
  annonce?: string | null;
  statut?: string | null;
  phase?: string | null;
  operateur?: string | null;
  commentaire?: string | null;
  historique?: string | null;
  derniere_relance?: string | null;
  next_followup_at?: string | null;
  last_contact_at?: string | null;
  source?: string | null;
  lead_score?: number | null;
  modele_interesse?: string | null;
  ville?: string | null;
  departement?: string | null;
};

const STATUTS = ["Nouveau", "Contacté", "Chaud", "Réfléchit", "Livraison", "Client", "Perdu"];
const PHASES = ["À contacter", "Attente réponse", "Réfléchit", "Devis", "Réservation", "Livraison", "Terminé"];

function normalizePhone(v?: string | null) {
  let p = String(v || "").replace(/[^0-9+]/g, "");
  if (p.startsWith("0")) p = `33${p.slice(1)}`;
  p = p.replace(/^\+/, "");
  return p;
}

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(v?: string | null) {
  if (!v) return false;
  return new Date(v).getTime() < Date.now();
}

function statusStyle(status?: string | null) {
  const map: Record<string, string> = {
    Nouveau: "#475569",
    Contacté: "#2563eb",
    Chaud: "#16a34a",
    Réfléchit: "#ca8a04",
    Livraison: "#ea580c",
    Client: "#111827",
    Perdu: "#dc2626",
  };
  return map[status || ""] || "#64748b";
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [phaseFilter, setPhaseFilter] = useState("Toutes");
  const [operatorFilter, setOperatorFilter] = useState("Tous");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({ nom: "", telephone: "", email: "", ville: "", modele_interesse: "", commentaire: "" });

  async function loadLeads() {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("id", { ascending: false });
    if (error) setMessage(`❌ ${error.message}`);
    else setLeads((data || []) as Lead[]);
    setLoading(false);
  }

  useEffect(() => { loadLeads(); }, []);

  async function patchLead(id: number, patch: Partial<Lead>) {
    setSaving(id);
    const payload = { ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("leads").update(payload).eq("id", id);
    if (error) setMessage(`❌ ${error.message}`);
    else setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    setSaving(null);
  }

  async function markContacted(lead: Lead) {
    await patchLead(lead.id, {
      statut: lead.statut === "Nouveau" ? "Contacté" : lead.statut,
      last_contact_at: new Date().toISOString(),
      derniere_relance: new Date().toISOString(),
    });
  }

  async function createLead() {
    if (!newLead.nom && !newLead.telephone && !newLead.email) return;
    const { error } = await supabase.from("leads").insert({
      ...newLead,
      statut: "Nouveau",
      phase: "À contacter",
      source: "manuel",
      lead_score: 0,
    });
    if (error) return setMessage(`❌ ${error.message}`);
    setNewLead({ nom: "", telephone: "", email: "", ville: "", modele_interesse: "", commentaire: "" });
    setNewLeadOpen(false);
    setMessage("✅ Lead ajouté");
    loadLeads();
  }

  async function deleteSelected() {
    if (!selected.length || !confirm(`Supprimer ${selected.length} lead(s) ?`)) return;
    const { error } = await supabase.from("leads").delete().in("id", selected);
    if (error) setMessage(`❌ ${error.message}`);
    else { setSelected([]); loadLeads(); }
  }

  async function bulkStatus(status: string) {
    if (!selected.length) return;
    const { error } = await supabase.from("leads").update({ statut: status, updated_at: new Date().toISOString() }).in("id", selected);
    if (error) setMessage(`❌ ${error.message}`);
    else setLeads(prev => prev.map(l => selected.includes(l.id) ? { ...l, statut: status } : l));
  }

  const operators = useMemo(() => Array.from(new Set(leads.map(l => l.operateur).filter(Boolean) as string[])).sort(), [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      const hay = [l.nom, l.telephone, l.email, l.annonce, l.commentaire, l.historique, l.ville, l.modele_interesse, l.operateur, l.source].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (statusFilter !== "Tous" && l.statut !== statusFilter) return false;
      if (phaseFilter !== "Toutes" && l.phase !== phaseFilter) return false;
      if (operatorFilter !== "Tous" && l.operateur !== operatorFilter) return false;
      return true;
    });
  }, [leads, search, statusFilter, phaseFilter, operatorFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    nouveaux: leads.filter(l => l.statut === "Nouveau").length,
    chauds: leads.filter(l => l.statut === "Chaud").length,
    relances: leads.filter(l => l.next_followup_at && isOverdue(l.next_followup_at) && l.statut !== "Client" && l.statut !== "Perdu").length,
    clients: leads.filter(l => l.statut === "Client").length,
  }), [leads]);

  function exportCSV() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Nom","Téléphone","Email","Ville","Annonce","Statut","Phase","Opérateur","Modèle","Relance"], ...filtered.map(l => [l.nom,l.telephone,l.email,l.ville,l.annonce,l.statut,l.phase,l.operateur,l.modele_interesse,l.next_followup_at])];
    const blob = new Blob([rows.map(r => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "neodrive-crm.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  function allVisibleSelected() { return filtered.length > 0 && filtered.every(l => selected.includes(l.id)); }
  function toggleAll() { setSelected(allVisibleSelected() ? selected.filter(id => !filtered.some(l => l.id === id)) : Array.from(new Set([...selected, ...filtered.map(l => l.id)]))); }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>NEODRIVE</div>
          <h1 style={styles.h1}>CRM commercial</h1>
          <p style={styles.muted}>Leads, relances et conversion — une vue de travail rapide.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.secondary} onClick={loadLeads}>↻ Actualiser</button>
          <button style={styles.secondary} onClick={exportCSV}>Exporter CSV</button>
          <button style={styles.primary} onClick={() => setNewLeadOpen(true)}>+ Nouveau lead</button>
        </div>
      </div>

      <div style={styles.stats}>
        <Stat label="Leads" value={stats.total} />
        <Stat label="Nouveaux" value={stats.nouveaux} />
        <Stat label="Chauds" value={stats.chauds} />
        <Stat label="Relances dues" value={stats.relances} danger={stats.relances > 0} />
        <Stat label="Clients" value={stats.clients} />
      </div>

      <div style={styles.toolbar}>
        <input style={styles.input} placeholder="Rechercher nom, téléphone, ville, annonce…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={styles.input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Tous</option>{STATUTS.map(x => <option key={x}>{x}</option>)}</select>
        <select style={styles.input} value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}><option>Toutes</option>{PHASES.map(x => <option key={x}>{x}</option>)}</select>
        <select style={styles.input} value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)}><option>Tous</option>{operators.map(x => <option key={x}>{x}</option>)}</select>
      </div>

      {selected.length > 0 && <div style={styles.bulk}>
        <strong>{selected.length} sélectionné(s)</strong>
        <select style={styles.smallInput} defaultValue="" onChange={e => { if (e.target.value) bulkStatus(e.target.value); e.target.value = ""; }}><option value="">Changer statut…</option>{STATUTS.map(x => <option key={x}>{x}</option>)}</select>
        <button style={styles.dangerButton} onClick={deleteSelected}>Supprimer</button>
      </div>}

      {message && <div style={styles.message}>{message}</div>}
      {loading ? <p>Chargement…</p> : <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead><tr>
            <th style={styles.th}><input type="checkbox" checked={allVisibleSelected()} onChange={toggleAll} /></th>
            <th style={styles.th}>Prospect</th><th style={styles.th}>Contact</th><th style={styles.th}>Projet</th><th style={styles.th}>Statut</th><th style={styles.th}>Phase</th><th style={styles.th}>Relance</th><th style={styles.th}>Opérateur</th><th style={styles.th}>Notes</th><th style={styles.th}>Actions</th>
          </tr></thead>
          <tbody>{filtered.map(lead => {
            const phone = normalizePhone(lead.telephone);
            const overdue = isOverdue(lead.next_followup_at);
            return <tr key={lead.id} style={{ background: overdue ? "#fff7ed" : "white" }}>
              <td style={styles.td}><input type="checkbox" checked={selected.includes(lead.id)} onChange={e => setSelected(e.target.checked ? [...selected, lead.id] : selected.filter(x => x !== lead.id))} /></td>
              <td style={styles.td}><strong>{lead.nom || "Sans nom"}</strong><div style={styles.sub}>{lead.ville || ""} {lead.departement ? `(${lead.departement})` : ""}</div><div style={styles.sub}>{lead.source || ""}</div></td>
              <td style={styles.td}><div>{lead.telephone || "—"}</div><div style={styles.sub}>{lead.email || "—"}</div></td>
              <td style={styles.td}><strong>{lead.modele_interesse || "—"}</strong><div style={styles.sub}>{lead.annonce || ""}</div></td>
              <td style={styles.td}><select value={lead.statut || "Nouveau"} disabled={saving===lead.id} onChange={e => patchLead(lead.id,{statut:e.target.value})} style={{...styles.pill, background:statusStyle(lead.statut)}}>{STATUTS.map(x => <option key={x}>{x}</option>)}</select></td>
              <td style={styles.td}><select value={lead.phase || "À contacter"} onChange={e => patchLead(lead.id,{phase:e.target.value})} style={styles.smallInput}>{PHASES.map(x => <option key={x}>{x}</option>)}</select></td>
              <td style={styles.td}><input type="datetime-local" style={{...styles.smallInput, borderColor: overdue ? "#f97316" : "#d1d5db"}} value={lead.next_followup_at ? new Date(lead.next_followup_at).toISOString().slice(0,16) : ""} onChange={e => patchLead(lead.id,{next_followup_at:e.target.value ? new Date(e.target.value).toISOString() : null})} /><div style={{...styles.sub,color:overdue?"#c2410c":"#64748b"}}>{overdue ? "⚠ À relancer" : lead.next_followup_at ? formatDate(lead.next_followup_at) : "Pas de rappel"}</div></td>
              <td style={styles.td}><input style={styles.smallInput} value={lead.operateur || ""} placeholder="Nom" onBlur={e => patchLead(lead.id,{operateur:e.target.value})} onChange={e => setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,operateur:e.target.value}:l))} /></td>
              <td style={styles.td}><textarea style={styles.note} value={lead.commentaire || ""} placeholder="Note commerciale…" onBlur={e => patchLead(lead.id,{commentaire:e.target.value})} onChange={e => setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,commentaire:e.target.value}:l))} /></td>
              <td style={styles.td}><div style={{display:"grid",gap:6}}>
                {phone && <a style={styles.action} href={`https://wa.me/${phone}`} target="_blank" onClick={() => markContacted(lead)}>WhatsApp</a>}
                {lead.telephone && <a style={styles.action} href={`tel:${lead.telephone}`} onClick={() => markContacted(lead)}>Appeler</a>}
                {lead.email && <a style={styles.action} href={`mailto:${lead.email}`} onClick={() => markContacted(lead)}>Email</a>}
              </div></td>
            </tr>
          })}</tbody>
        </table>
      </div>}

      {newLeadOpen && <div style={styles.overlay} onClick={() => setNewLeadOpen(false)}><div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{marginTop:0}}>Nouveau lead</h2>
        {Object.entries(newLead).map(([k,v]) => <label key={k} style={styles.label}>{k.replace("_"," ")}<input style={styles.input} value={v} onChange={e => setNewLead({...newLead,[k]:e.target.value})} /></label>)}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18}}><button style={styles.secondary} onClick={()=>setNewLeadOpen(false)}>Annuler</button><button style={styles.primary} onClick={createLead}>Ajouter</button></div>
      </div></div>}
    </main>
  );
}

function Stat({label,value,danger}:{label:string;value:number;danger?:boolean}) { return <div style={{...styles.card,borderColor:danger?"#fdba74":"#e5e7eb"}}><div style={styles.statValue}>{value}</div><div style={{...styles.muted,color:danger?"#c2410c":"#64748b"}}>{label}</div></div> }

const styles: Record<string, React.CSSProperties> = {
  page:{maxWidth:1700,margin:"0 auto",padding:"28px 18px 60px",fontFamily:"Arial,sans-serif",color:"#111827"},
  header:{display:"flex",justifyContent:"space-between",gap:18,alignItems:"flex-end",flexWrap:"wrap",marginBottom:20},
  eyebrow:{fontSize:12,fontWeight:900,letterSpacing:2,color:"#64748b"}, h1:{fontSize:34,margin:"5px 0"}, muted:{color:"#64748b",fontSize:14,margin:0},
  stats:{display:"grid",gridTemplateColumns:"repeat(5,minmax(120px,1fr))",gap:12,marginBottom:16}, card:{border:"1px solid #e5e7eb",borderRadius:14,padding:16,background:"white"}, statValue:{fontSize:28,fontWeight:900,marginBottom:4},
  toolbar:{display:"grid",gridTemplateColumns:"2fr repeat(3,1fr)",gap:10,marginBottom:12}, input:{width:"100%",boxSizing:"border-box",padding:"11px 12px",border:"1px solid #d1d5db",borderRadius:10,fontSize:14,background:"white"}, smallInput:{maxWidth:"100%",padding:"8px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,background:"white"},
  primary:{border:0,borderRadius:10,padding:"11px 15px",background:"#111827",color:"white",fontWeight:800,cursor:"pointer"}, secondary:{border:"1px solid #d1d5db",borderRadius:10,padding:"10px 14px",background:"white",fontWeight:700,cursor:"pointer"}, dangerButton:{border:0,borderRadius:8,padding:"8px 12px",background:"#dc2626",color:"white",fontWeight:800,cursor:"pointer"},
  bulk:{display:"flex",alignItems:"center",gap:12,background:"#f8fafc",border:"1px solid #e2e8f0",padding:10,borderRadius:10,marginBottom:12}, message:{padding:"10px 12px",background:"#f8fafc",borderRadius:10,marginBottom:12,fontWeight:700},
  tableWrap:{overflowX:"auto",border:"1px solid #e5e7eb",borderRadius:14,background:"white"}, table:{borderCollapse:"collapse",width:"100%",minWidth:1500}, th:{textAlign:"left",padding:"11px 9px",fontSize:12,textTransform:"uppercase",letterSpacing:.5,color:"#64748b",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0}, td:{verticalAlign:"top",padding:"10px 9px",borderBottom:"1px solid #f1f5f9",fontSize:13,maxWidth:240}, sub:{fontSize:11,color:"#64748b",marginTop:4}, pill:{border:0,color:"white",fontWeight:800,borderRadius:999,padding:"8px 9px",fontSize:12}, note:{width:210,height:64,resize:"vertical",border:"1px solid #d1d5db",borderRadius:8,padding:8,fontSize:12}, action:{display:"block",textAlign:"center",textDecoration:"none",padding:"7px 9px",borderRadius:8,background:"#f1f5f9",color:"#111827",fontWeight:800,fontSize:12},
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,.55)",display:"grid",placeItems:"center",padding:20,zIndex:50}, modal:{width:"min(560px,100%)",background:"white",borderRadius:16,padding:22,boxShadow:"0 24px 80px rgba(0,0,0,.25)"}, label:{display:"grid",gap:5,textTransform:"capitalize",fontSize:13,fontWeight:700,marginBottom:10},
};
