import type { Metadata } from "next";
import s from "../_components/legal.module.css";
import { COMPANY, HOST, LEGAL_UPDATED } from "../../lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales | NeoDrive",
  description: "Mentions légales du site NeoDrive : éditeur (MK HOLDING), directeur de la publication, hébergeur, propriété intellectuelle et données personnelles.",
  alternates: { canonical: `${COMPANY.websiteUrl}/mentions-legales` },
};

const Todo = ({ label }: { label: string }) => <span className={s.todo}>[à compléter : {label}]</span>;
const val = (v: string | null, label: string) => (v ? v : <Todo label={label} />);

export default function MentionsLegalesPage() {
  return (
    <main className={s.page}>
      <span className={s.kicker}>NeoDrive · MK HOLDING</span>
      <h1>Mentions légales</h1>
      <p className={s.updated}>Dernière mise à jour : {LEGAL_UPDATED}</p>

      <div className={s.intro}>
        <p style={{ margin: 0 }}>
          Informations prévues par l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie
          numérique (LCEN), concernant le site {COMPANY.website}.
        </p>
      </div>

      <h2>Éditeur du site</h2>
      <table className={s.table}>
        <tbody>
          <tr><th scope="row">Dénomination sociale</th><td>{COMPANY.name}</td></tr>
          <tr><th scope="row">Marque commerciale</th><td>NeoDrive</td></tr>
          <tr><th scope="row">Forme juridique</th><td>{val(COMPANY.legalForm, "forme juridique")}</td></tr>
          <tr><th scope="row">Capital social</th><td>{val(COMPANY.shareCapital, "montant du capital social")}</td></tr>
          <tr><th scope="row">SIREN</th><td>{COMPANY.siren}</td></tr>
          <tr>
            <th scope="row">Immatriculation</th>
            <td>RCS {val(COMPANY.rcsCity, "ville du greffe")} {COMPANY.siren}</td>
          </tr>
          <tr><th scope="row">N° TVA intracommunautaire</th><td>{val(COMPANY.vatNumber, "numéro de TVA intracommunautaire")}</td></tr>
          <tr><th scope="row">Siège social</th><td>{COMPANY.address}</td></tr>
          <tr><th scope="row">Téléphone</th><td><a href={COMPANY.phoneHref}>{COMPANY.phone}</a></td></tr>
          <tr><th scope="row">E-mail</th><td><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></td></tr>
          <tr><th scope="row">Directeur de la publication</th><td>{COMPANY.president}, président</td></tr>
        </tbody>
      </table>

      <h2>Hébergeur</h2>
      <table className={s.table}>
        <tbody>
          <tr><th scope="row">Société</th><td>{HOST.name}</td></tr>
          <tr><th scope="row">Adresse</th><td>{HOST.address}</td></tr>
          <tr><th scope="row">Téléphone</th><td>{val(HOST.phone, "téléphone de l’hébergeur")}</td></tr>
          <tr>
            <th scope="row">Site internet</th>
            <td><a href={HOST.website} target="_blank" rel="noopener noreferrer">vercel.com</a></td>
          </tr>
        </tbody>
      </table>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photographies, vidéos, logos, la marque NeoDrive, les éléments graphiques et la structure du site
        appartiennent à {COMPANY.name} ou sont utilisés avec l’autorisation de leurs titulaires. Toute reproduction,
        représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable est
        interdite, sauf exceptions prévues par la loi (articles L122-4 et L122-5 du Code de la propriété
        intellectuelle).
      </p>
      <p>
        Les marques citées à titre de comparaison (par exemple Citroën, Ami, Fiat, Topolino) appartiennent à leurs
        propriétaires respectifs.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le responsable du traitement des données collectées sur le site est {COMPANY.name}. Pour savoir quelles
        données sont collectées, pourquoi et comment exercer vos droits (accès, rectification, effacement,
        opposition…), consultez la <a href="/politique-de-confidentialite">politique de confidentialité</a> et la page{" "}
        <a href="/suppression-des-donnees">Suppression des données</a>. Vous pouvez aussi introduire une réclamation
        auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>Cookies et mesure d’audience</h2>
      <p>
        Le site n’utilise pas de cookies publicitaires. Il enregistre de façon anonyme le nombre de pages vues et de
        clics vers WhatsApp, pour améliorer le site, sans identifier les visiteurs. Votre navigateur peut aussi
        conserver un code promotionnel saisi lors d’une réservation (stockage local), afin de ne pas avoir à le
        retaper. Vous pouvez effacer ces données à tout moment depuis les réglages de votre navigateur.
      </p>
      <p>
        Les liens vers WhatsApp, Instagram ou d’autres réseaux sociaux vous emmènent sur des services tiers, qui
        appliquent leurs propres règles en matière de cookies et de données personnelles.
      </p>

      <h2>Conditions de vente et d’utilisation</h2>
      <p>
        Les ventes de véhicules sont régies par nos <a href="/cgv">conditions générales de vente</a>. L’utilisation du
        site est régie par les <a href="/conditions-utilisation">conditions d’utilisation</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur le site : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, téléphone{" "}
        <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>, ou la page <a href="/contact">Contact</a>.
      </p>
    </main>
  );
}
