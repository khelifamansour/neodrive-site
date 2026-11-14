import type { Metadata } from "next";
import GoogleReviews from "../_components/GoogleReviews";
import { loadCatalogue } from "../../lib/parts-server";
import Catalogue from "./Catalogue";
import s from "./pieces.module.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pièces détachées NeoDrive : catalogue et commande en ligne",
  description: "Toutes les pièces détachées NeoDrive avec photo, référence et prix : électricité, carrosserie, freinage, éclairage, vitrage… Commande en ligne, retrait à Muret ou envoi.",
  alternates: { canonical: "/pieces" },
};

export default async function PiecesPage() {
  const { parts } = await loadCatalogue();
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <span className={s.kicker}>PIÈCES DÉTACHÉES NEODRIVE</span>
        <h1>La bonne pièce pour votre NeoDrive.</h1>
        <p>{parts.length} pièces d’origine avec photo, référence et prix. Ajoutez-les au panier : vous recevez tout de suite une facture pro forma par e-mail.</p>
        <div className={s.heroActions}>
          <a href="/pieces.pdf" target="_blank" rel="noopener" className={s.btnLight}>Télécharger le catalogue PDF</a>
          <a href="/sav" className={s.btnLight}>Je ne sais pas quelle pièce choisir</a>
        </div>
      </section>

      <Catalogue parts={parts} />

      <section className={s.docs}>
        <div>
          <span className={s.kicker}>DOCUMENTATION</span>
          <h2>Pour les utilisateurs et les garages.</h2>
          <p>Un doute sur la référence ? Créez un ticket SAV avec le VIN et des photos : nous vous indiquons la pièce compatible.</p>
        </div>
        <div className={s.docLinks}>
          <a href="/pieces.pdf" target="_blank" rel="noopener">Catalogue PDF des pièces →</a>
          <a href="/Manuel-technique.pdf" target="_blank" rel="noopener">Manuel technique →</a>
          <a href="/Guide-SAV-et-diagnostic-rapide.pdf" target="_blank" rel="noopener">Guide SAV →</a>
        </div>
      </section>
      <GoogleReviews />
    </main>
  );
}
