import type { Metadata } from "next";

const VIDEO = "https://tzlsdjzcxdjaatcpwqwn.supabase.co/storage/v1/object/public/social-media/site/temoignage-yonne.mp4";

export const metadata: Metadata = {
  title: "Témoignage d'une cliente NeoDrive – livraison dans l'Yonne",
  description: "Une cliente raconte sa livraison NeoDrive : voiture sans permis électrique livrée chez elle, prise en main expliquée sur place.",
  openGraph: { title: "« Je suis tombée sur NeoDrive… » – témoignage client", description: "Voiture sans permis électrique livrée à domicile partout en France.", videos: [{ url: VIDEO, type: "video/mp4" }] },
};

/** Page courte à partager (WhatsApp, SMS) : le témoignage vidéo d'une cliente, puis le catalogue et la réservation. */
export default function Temoignage() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 40px", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, margin: "4px 0 6px" }}>Ils roulent en NeoDrive</h1>
      <p style={{ color: "#555", margin: "0 0 14px" }}>Une cliente de l'Yonne, le jour de sa livraison.</p>
      <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 16, background: "#000" }}>
        <source src={VIDEO} type="video/mp4" />
      </video>
      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        <a href="/catalogue" style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: "#15120f", color: "#fff", fontWeight: 800, textDecoration: "none" }}>📄 Voir le catalogue</a>
        <a href="/reservation-devis" style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: "linear-gradient(180deg,#f47a3b,#e8592a)", color: "#fff", fontWeight: 800, textDecoration: "none" }}>💶 Mon prix livré chez moi</a>
        <a href="/videos" style={{ display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 14, border: "2px solid #15120f", color: "#15120f", fontWeight: 800, textDecoration: "none" }}>🎬 Toutes nos vidéos de livraison</a>
      </div>
    </main>
  );
}
