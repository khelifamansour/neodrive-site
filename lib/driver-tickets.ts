/** Tickets de dépenses du livreur : photos seules, lues ensuite par l'IA du projet (date, commerçant, montant TTC, TVA, catégorie). Serveur uniquement. */
import { crmDatabase } from "./crm-agent";
import { PHOTO_BUCKET } from "./fleet";
import { aiJson } from "../app/api/conteneurs/extract";
import { isExpenseType } from "./driver-hours";

type DB = ReturnType<typeof crmDatabase>;
export type TicketAi = { status: "pending" | "ok" | "failed"; confidence?: "haute" | "moyenne" | "basse"; at?: string };
export type TicketData = { type: string; amount: number; date: string; paid: "carte" | "perso"; merchant?: string | null; vat?: number | null; ai?: TicketAi; edited?: boolean };

const parisToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const num = (v: unknown) => { if (v == null || v === "") return null; const x = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", ".")); return Number.isFinite(x) ? Math.round(x * 100) / 100 : null; };
const CAT: Record<string, string> = { repas: "repas", restaurant: "repas", hotel: "hotel", "hôtel": "hotel", carburant: "carburant", peage: "peage", "péage": "peage", autre: "autre" };

/** Lecture IA d'un ticket (photo dans le stockage) ; null si la lecture est impossible. */
export async function readTicket(db: DB, path: string, fallbackDate: string): Promise<Partial<TicketData> & { ai: TicketAi }> {
  const at = new Date().toISOString();
  try {
    const { data: blob } = await db.storage.from(PHOTO_BUCKET).download(path);
    if (!blob) return { ai: { status: "failed", at } };
    const o = await aiJson(`This photo is a French receipt or invoice (ticket de caisse, note d'hôtel, ticket de péage, ticket de carburant) paid by a delivery driver on the road. Read it and answer in json:
{"date": "YYYY-MM-DD" or null, "merchant": shop / hotel / station / motorway company name or null, "amount_ttc": total paid incl. VAT as a number or null, "vat": VAT amount as a number if printed else null, "category": one of "repas" (restaurant, food, drinks), "hotel" (hotel, lodging), "carburant" (fuel, diesel, gazole, electricity charging), "peage" (motorway toll, parking), "autre", "confidence": "haute" if every value is clearly printed, "moyenne" if some values are unclear, "basse" if the photo is hard to read or not a receipt}
Do not invent anything: use null when a value is not printed.`, Buffer.from(await blob.arrayBuffer()), blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg", "ticket.jpg", 400);
    if (!o) return { ai: { status: "failed", at } };
    const cat = CAT[String(o.category || "").toLowerCase()] || "autre";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(o.date)) && Math.abs(Date.parse(o.date) - Date.now()) < 90 * 86400e3 ? String(o.date) : fallbackDate;
    const conf = ["haute", "moyenne", "basse"].includes(o.confidence) ? o.confidence : "moyenne";
    return { type: isExpenseType(cat) ? cat : "autre", amount: num(o.amount_ttc) ?? 0, vat: num(o.vat), merchant: o.merchant ? String(o.merchant).replace(/[<>]/g, "").slice(0, 80) : null, date, ai: { status: "ok", confidence: num(o.amount_ttc) == null ? "basse" : conf, at } };
  } catch (e) { console.error("[TICKETS] lecture", e); return { ai: { status: "failed", at } }; }
}

/** Ajoute des tickets (photos seules) à une tournée puis les fait lire par l'IA, en parallèle. */
export async function addTickets(db: DB, tourId: string, author: string, paths: string[]) {
  const today = parisToday();
  const rows = paths.slice(0, 30).map(p => ({ tour_id: tourId, kind: "frais", author, photo_path: p, note: null, data: { type: "autre", amount: 0, date: today, paid: "carte", ai: { status: "pending" } } as TicketData }));
  if (!rows.length) return { added: 0, read: 0 };
  const { data, error } = await db.from("tour_events").insert(rows).select("id,photo_path,data");
  if (error) throw new Error(error.message);
  let read = 0;
  await Promise.all((data || []).map(async r => {
    const got = await readTicket(db, r.photo_path, today);
    if (got.ai.status === "ok") read++;
    await db.from("tour_events").update({ data: { ...(r.data as TicketData), ...got } }).eq("id", r.id);
  }));
  return { added: rows.length, read };
}
