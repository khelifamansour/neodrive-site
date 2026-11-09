import type { Metadata } from "next";
import AmbassadorForm from "./AmbassadorForm";
import s from "../devenir-partenaire/partenaire.module.css";
import { AMBASSADOR } from "../../lib/ambassadors";

export const metadata: Metadata = {
  title: "Devenir ambassadeur NeoDrive | 100 € par voiture vendue grâce à vous",
  description: "Créateurs de contenu, influenceurs, clients : recommandez NeoDrive, la voiture sans permis électrique neuve, avec votre code promo et touchez 100 € par voiture vendue.",
  alternates: { canonical: "https://www.easydrive-auto.fr/devenir-ambassadeur" },
  openGraph: { title: "Devenir ambassadeur NeoDrive", description: "100 € pour chaque voiture vendue grâce à votre code promo.", url: "https://www.easydrive-auto.fr/devenir-ambassadeur", type: "website", images: ["/catalogue/page-1.jpg"] },
};

const euro = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} €`;

export default function AmbassadorPage() {
  const c = AMBASSADOR.commission;
  return (
    <main className={s.page}>
      <section className={s.whyTop}>
        <span className={s.eyebrow}>PROGRAMME AMBASSADEUR NEODRIVE</span>
        <h1>Gagnez <em>{euro(c)}</em> pour chaque voiture vendue grâce à vous.</h1>
        <p className={s.lead}>Vous créez du contenu, vous avez une communauté, ou vous aimez simplement votre NeoDrive ? Recommandez-la avec votre code promo personnel. Pas de stock, pas d’avance, pas de minimum : vous gagnez à chaque vente.</p>
        <div className={s.market}>
          <article><b>{euro(c)}</b><span>par voiture livrée et payée avec votre code</span></article>
          <article><b>Immédiat</b><span>votre code promo et votre lien sont créés dès l’inscription</span></article>
          <article><b>Sans limite</b><span>5 ventes = {euro(5 * c)}, 20 ventes = {euro(20 * c)}, 50 ventes = {euro(50 * c)}</span></article>
        </div>
        <div className={s.actions}>
          <a className={s.primary} href="#inscription">Recevoir mon code</a>
          <a className={s.ghost} href="/catalogue">📖 Découvrir les voitures</a>
        </div>
      </section>

      <section className={s.facts} style={{ marginTop: 40 }}>
        <article><b>1. Inscription</b><span>2 minutes : vous recevez votre code (ex. NEOJULIE27) et votre lien</span></article>
        <article><b>2. Publication</b><span>vous parlez de NeoDrive à votre façon, avec votre code ou votre lien</span></article>
        <article><b>3. Vente</b><span>vos abonnés réservent avec votre code et profitent d’une petite remise</span></article>
        <article><b>4. Paiement</b><span>{euro(c)} par voiture, versés sous {AMBASSADOR.payDelayDays} jours après la livraison</span></article>
      </section>

      <section className={s.formulas}>
        <div className={s.heading}><span className={s.eyebrow}>QUOI PUBLIER ?</span><h2>Des idées qui marchent.</h2><p>Soyez vous-même : les vidéos sincères vendent mieux que les publicités. Format vertical, 15 à 45 secondes.</p></div>
        <div className={s.whyGrid}>
          <article><b>« Je l’ai testée »</b><p>Tour de la voiture, intérieur (caméra de recul, chauffage, Bluetooth), petit trajet, votre avis honnête.</p></article>
          <article><b>« Pour mon ado de 14 ans »</b><p>Dès 14 ans avec le permis AM : la sécurité et l’autonomie, vues par un parent.</p></article>
          <article><b>« Combien ça coûte vraiment ? »</b><p>Prix de la voiture neuve, recharge sur une prise normale, garantie 2 ans, livraison à domicile.</p></article>
          <article><b>« Le neuf au prix de l’occasion »</b><p>Comparez avec une voiture sans permis d’occasion : âge, kilomètres, batterie.</p></article>
          <article><b>La vie à la campagne</b><p>Courses, médecin, travail : la liberté sans permis B, au chaud et au sec.</p></article>
          <article><b>Votre style</b><p>Humour, sketch, mise en scène… tant que les informations sur la voiture sont justes.</p></article>
        </div>
        <p className={s.note}>Vous souhaitez filmer une voiture ? Nous organisons des tournages sur place sur rendez-vous (nous ne prêtons pas de véhicule).</p>
      </section>

      <section className={s.formulas}>
        <div className={s.heading}><span className={s.eyebrow}>LES RÈGLES DU PROGRAMME</span><h2>Simples, mais obligatoires.</h2></div>
        <div className={s.grid}>
          <article>
            <span className={s.tag}>À FAIRE</span>
            <h3>Toujours</h3>
            <ul>
              <li>Indiquer <b>« collaboration commerciale »</b> (ou l’option « contenu de marque ») sur chaque publication : c’est la loi.</li>
              <li>Donner les vrais prix : <b>neuve dès 3 990 €</b>, la <b>Confort à 4 990 €</b>, prix livré selon le code postal sur le site.</li>
              <li>Parler de <b>votre code</b> ou de <b>votre lien</b> : « avec mon code, vous avez une petite remise ».</li>
              <li>Renvoyer les questions précises vers le site ou le WhatsApp NeoDrive.</li>
              <li>Rester respectueux en commentaires, même face aux critiques.</li>
            </ul>
          </article>
          <article className={s.featured}>
            <span className={s.tag}>INTERDIT</span>
            <h3>Jamais</h3>
            <ul>
              <li>Dire « la moins chère de France », « le leader » ou toute promesse impossible à prouver.</li>
              <li>Parler de crédit, de financement ou de mensualités.</li>
              <li>Inventer des caractéristiques (vitesse, autonomie, options) ou de faux avis.</li>
              <li>Acheter de la publicité sur le nom « NeoDrive » (Google, Meta…) ou se faire passer pour NeoDrive.</li>
              <li>Spammer (messages privés en masse, commentaires sous les publicités des concurrents).</li>
              <li>Publier des contenus choquants, violents ou dangereux au volant.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={s.formulas}>
        <div className={s.heading}><span className={s.eyebrow}>QUESTIONS FRÉQUENTES</span><h2>Tout ce qu’il faut savoir.</h2></div>
        <div className={s.whyGrid}>
          <article><b>Faut-il beaucoup d’abonnés ?</b><p>Non. Une vidéo à 2 000 vues dans le bon public peut vendre une voiture. Clients, parents, auto-écoles : tout le monde peut devenir ambassadeur.</p></article>
          <article><b>Quand une vente compte-t-elle ?</b><p>Quand la voiture est réservée avec votre code (ou votre lien), livrée et entièrement payée. Une commande annulée ne donne pas de commission.</p></article>
          <article><b>Comment suis-je payé ?</b><p>Par virement, sous {AMBASSADOR.payDelayDays} jours après la livraison. Les sommes perçues sont des revenus à déclarer ; le statut d’auto-entrepreneur est conseillé si vous vendez souvent.</p></article>
          <article><b>Puis-je utiliser mon code pour moi ?</b><p>Non, le code sert à recommander NeoDrive à d’autres personnes. Un seul code par personne.</p></article>
          <article><b>Puis-je arrêter quand je veux ?</b><p>Oui, sans engagement et sans frais. Les commissions des ventes déjà livrées restent dues.</p></article>
          <article><b>Que se passe-t-il si une règle n’est pas respectée ?</b><p>NeoDrive peut demander de modifier ou supprimer un contenu, et suspendre le code en cas de manquement grave.</p></article>
        </div>
      </section>

      <section className={s.formSection} id="inscription">
        <div className={s.heading}><span className={s.eyebrow}>INSCRIPTION</span><h2>Recevez votre code ambassadeur.</h2><p>Gratuit et sans engagement. Votre code est créé immédiatement.</p></div>
        <AmbassadorForm />
      </section>
    </main>
  );
}
