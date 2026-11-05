/** Rapport quotidien de l'équipe IA (CRM + WhatsApp), envoyé par e-mail chaque soir. */
import { crmDatabase } from "./crm-agent";

export async function buildDailyReport(day = new Date()) {
  const db = crmDatabase();
  const start = new Date(day); start.setUTCHours(0, 0, 0, 0);
  const since = start.toISOString();
  const [{ data: leads }, { data: msgs }] = await Promise.all([
    db.from("leads").select("id,nom,ville,statut,phase,created_at,history,last_inbound_at,telephone,opted_out_at").order("id", { ascending: false }).limit(5000),
    db.from("crm_messages").select("lead_id,direction,created_at,body").gte("created_at", since).limit(5000),
  ]);
  const L = leads || []; const M = msgs || [];
  const today = (d?: string | null) => Boolean(d && d >= since);
  const packages = L.filter((l: any) => (Array.isArray(l.history) ? l.history : []).some((h: any) => h?.type === "package" && today(h.sent_at))).length;
  const inboundLeads = new Set(M.filter((m: any) => m.direction === "inbound").map((m: any) => m.lead_id));
  const byStatus: Record<string, number> = {}; for (const l of L as any[]) byStatus[l.statut || "Nouveau"] = (byStatus[l.statut || "Nouveau"] || 0) + 1;
  const hot = (L as any[]).filter(l => l.statut === "Chaud" && today(l.last_inbound_at)).slice(0, 10);
  const waiting = (L as any[]).filter(l => (l.statut || "Nouveau") === "Nouveau" && l.telephone && !l.opted_out_at).length;
  return {
    date: start.toISOString().slice(0, 10),
    imported: (L as any[]).filter(l => today(l.created_at)).length,
    packages, replies: inboundLeads.size,
    outbound: M.filter((m: any) => m.direction === "outbound").length,
    stops: (L as any[]).filter(l => today(l.opted_out_at)).length,
    waiting, byStatus, hot: hot.map(l => ({ nom: l.nom, ville: l.ville, statut: l.statut })),
    total: L.length,
  };
}

export function reportHtml(r: Awaited<ReturnType<typeof buildDailyReport>>) {
  const li = (k: string, v: unknown) => `<li><b>${k}</b> : ${v}</li>`;
  return `<h2>NeoDrive — rapport du ${r.date}</h2><ul>
${li("📥 Nouveaux contacts importés", r.imported)}
${li("📦 Packages de bienvenue envoyés", r.packages)}
${li("💬 Clients qui ont répondu aujourd'hui", r.replies)}
${li("📤 Messages envoyés aujourd'hui", r.outbound)}
${li("🛑 STOP", r.stops)}
${li("⏳ Nouveaux clients pas encore contactés", r.waiting)}
</ul><h3>Où en sont les ${r.total} clients</h3><ul>${Object.entries(r.byStatus).map(([k, v]) => li(k, v)).join("")}</ul>
${r.hot.length ? `<h3>🔥 À rappeler en priorité</h3><ul>${r.hot.map(h => `<li>${h.nom || "Sans nom"}${h.ville ? ` (${h.ville})` : ""}</li>`).join("")}</ul>` : ""}
<p><a href="https://www.easydrive-auto.fr/crm">Ouvrir le CRM</a></p>`;
}

export async function sendReportEmail(r: Awaited<ReturnType<typeof buildDailyReport>>) {
  const key = process.env.RESEND_API_KEY, from = process.env.CRM_FROM_EMAIL, to = process.env.REPORT_EMAIL;
  if (!key || !from || !to) return { sent: false, reason: "E-mail du rapport non configuré (RESEND_API_KEY, CRM_FROM_EMAIL, REPORT_EMAIL)" };
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: to.split(",").map(s => s.trim()), subject: `NeoDrive — rapport du ${r.date} : ${r.packages} packages, ${r.replies} réponses`, html: reportHtml(r) }) });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { sent: true, id: j.id } : { sent: false, reason: j?.message || "envoi refusé" };
}
