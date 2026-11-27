/**
 * Mensualité affichée à côté d'un prix + mention légale du crédit.
 * Les chiffres viennent du simulateur /financement (lib/neodrive-finance.ts).
 * Tant que FINANCE_RATE_CONFIRMED est false, aucun montant mensuel n'est affiché :
 * seulement un lien vers le simulateur et la mention obligatoire.
 */
import { CREDIT_WARNING, FINANCE_RATE_CONFIRMED, representativeExample } from "../../lib/neodrive-finance";

const eur = (n: number, digits = 0) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const pct = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " %";

/** Ligne courte sous un prix : « ou dès 74 €/mois* » (taux confirmé) ou « Paiement en mensualités possible · Simuler ». */
export function FinanceHint({ price, style }: { price: number; style?: React.CSSProperties }) {
  const base: React.CSSProperties = { display: "block", margin: "2px 0 12px", fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "inherit", opacity: 0.9, ...style };
  if (FINANCE_RATE_CONFIRMED) {
    const ex = representativeExample(price);
    return <a href="/financement" style={{ ...base, textDecoration: "none" }}>ou dès <b>{Math.ceil(ex.monthly)} €/mois</b><sup>*</sup> · <u>simuler</u></a>;
  }
  return <a href="/financement" style={{ ...base, textDecoration: "none" }}>Paiement en mensualités possible · <u>simuler mon financement</u></a>;
}

/** Bloc de mentions à placer en bas de la section qui affiche des prix avec FinanceHint. */
export function CreditNotice({ price, label, style }: { price: number; label: string; style?: React.CSSProperties }) {
  const base: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, color: "inherit", opacity: 0.75, margin: "18px auto 0", maxWidth: 1100, ...style };
  if (FINANCE_RATE_CONFIRMED) {
    const ex = representativeExample(price);
    return <p style={base}>
      <b>{CREDIT_WARNING}</b>{" "}
      * Exemple représentatif pour un crédit affecté de {eur(ex.amount)} ({label}, hors carte grise et livraison), sans apport, sur {ex.months} mois : {ex.months} mensualités de {eur(ex.monthly, 2)}, taux débiteur fixe {pct(ex.tauxDebiteur)}, TAEG fixe {pct(ex.taeg)}, frais de dossier {eur(ex.fraisDossier)}, coût total du crédit {eur(ex.cost, 2)}, montant total dû {eur(ex.totalDue, 2)}. Hors assurance facultative. Sous réserve d’acceptation du dossier par l’organisme prêteur. Délai de rétractation de 14 jours. <a href="/financement" style={{ color: "inherit" }}>Simuler mon financement</a>.
    </p>;
  }
  return <p style={base}>
    <b>{CREDIT_WARNING}</b>{" "}
    Financement étudié sur dossier et sous réserve d’acceptation par l’organisme prêteur ; conditions communiquées avant tout engagement. <a href="/financement" style={{ color: "inherit" }}>Faire une simulation</a>.
  </p>;
}
