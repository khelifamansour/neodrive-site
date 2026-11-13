import type { Metadata } from "next";
import s from "../_components/legal.module.css";
import { COMPANY, MEDIATOR, LEGAL_UPDATED } from "../../lib/legal";
import { VEHICLES, REGISTRATION_PRICE } from "../../lib/neodrive-pricing";

export const metadata: Metadata = {
  title: "Conditions générales de vente (CGV) | NeoDrive",
  description:
    "Conditions générales de vente NeoDrive (MK HOLDING) : commande, prix, paiement à la livraison, livraison en France, droit de rétractation, garanties, SAV et carte grise.",
  alternates: { canonical: `${COMPANY.websiteUrl}/cgv` },
};

const euro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const Todo = ({ label }: { label: string }) => <span className={s.todo}>[à compléter : {label}]</span>;
const val = (v: string | null, label: string) => (v ? v : <Todo label={label} />);

const sections = [
  ["objet", "Objet et champ d’application"],
  ["vendeur", "Le vendeur"],
  ["produits", "Les véhicules"],
  ["prix", "Prix"],
  ["commande", "Réservation et commande"],
  ["paiement", "Paiement"],
  ["livraison", "Livraison et remise du véhicule"],
  ["propriete", "Transfert de propriété et des risques"],
  ["carte-grise", "Service carte grise"],
  ["retractation", "Droit de rétractation (14 jours)"],
  ["garanties-legales", "Garanties légales"],
  ["garantie-neodrive", "Garantie « 2 ans » NeoDrive"],
  ["sav", "Service après-vente et pièces"],
  ["financement", "Financement"],
  ["donnees", "Données personnelles"],
  ["reclamations", "Réclamations et médiation"],
  ["droit", "Droit applicable et litiges"],
] as const;

export default function CgvPage() {
  return (
    <main className={s.page}>
      <span className={s.kicker}>NeoDrive · MK HOLDING</span>
      <h1>Conditions générales de vente</h1>
      <p className={s.updated}>Dernière mise à jour : {LEGAL_UPDATED}</p>

      <div className={s.intro}>
        <p style={{ margin: 0 }}>
          Ces conditions s’appliquent à l’achat d’une voiture sans permis électrique NeoDrive neuve par un particulier,
          à distance (site internet, téléphone, WhatsApp, e-mail). Elles expliquent simplement comment vous réservez,
          payez et recevez votre véhicule, et quels sont vos droits. Lisez-les avant de réserver.
        </p>
      </div>

      <nav className={s.toc} aria-label="Sommaire des CGV">
        <strong>Sommaire</strong>
        <ol>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <h2 id="objet">1. Objet et champ d’application</h2>
      <p>
        Les présentes conditions générales de vente (« CGV ») régissent la vente à distance, par MK HOLDING sous la
        marque NeoDrive, de véhicules électriques neufs de catégorie quadricycle léger (L6e, dits « voitures sans
        permis »), ainsi que des services associés : livraison, formalités de carte grise et service après-vente.
      </p>
      <p>
        Elles s’adressent aux consommateurs, c’est-à-dire aux personnes physiques qui achètent pour un usage
        personnel. Les clients professionnels (entreprises, revendeurs, partenaires) bénéficient de conditions
        particulières communiquées sur demande.
      </p>
      <p>
        Les CGV applicables sont celles en vigueur le jour de votre réservation. En validant votre réservation, vous
        déclarez les avoir lues et acceptées. Vous pouvez les enregistrer ou les imprimer à tout moment depuis cette
        page.
      </p>

      <h2 id="vendeur">2. Le vendeur</h2>
      <table className={s.table}>
        <tbody>
          <tr><th scope="row">Société</th><td>{COMPANY.name}{COMPANY.legalForm ? `, ${COMPANY.legalForm}` : null}</td></tr>
          <tr><th scope="row">Marque commerciale</th><td>NeoDrive</td></tr>
          <tr><th scope="row">SIREN</th><td>{COMPANY.siren}</td></tr>
          <tr><th scope="row">Siège</th><td>{COMPANY.address}</td></tr>
          <tr><th scope="row">Téléphone</th><td><a href={COMPANY.phoneHref}>{COMPANY.phone}</a></td></tr>
          <tr><th scope="row">E-mail</th><td><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></td></tr>
          <tr><th scope="row">Site internet</th><td>{COMPANY.website}</td></tr>
        </tbody>
      </table>
      <p>
        Les autres informations légales (capital, RCS, TVA, hébergeur) figurent dans les{" "}
        <a href="/mentions-legales">mentions légales</a>.
      </p>

      <h2 id="produits">3. Les véhicules</h2>
      <p>
        NeoDrive vend des voitures sans permis 100 % électriques, neuves, de catégorie L6e : vitesse limitée à
        45 km/h, deux places. Trois versions sont proposées : {Object.values(VEHICLES).map((v) => v.label).join(", ")}.
        Les caractéristiques essentielles (équipements, batterie, autonomie indicative, dimensions) sont présentées
        sur les pages <a href="/produit">Véhicule</a> et <a href="/catalogue">Catalogue</a> et sur votre devis.
      </p>
      <p>
        L’autonomie annoncée est indicative : elle varie selon la température, le relief, la charge, la vitesse et la
        conduite. Les photos sont des photos réelles, mais la couleur et certains détails peuvent légèrement différer
        de votre véhicule.
      </p>
      <p>
        Il vous appartient de vérifier que vous remplissez les conditions pour conduire ce type de véhicule (âge,
        permis AM selon votre date de naissance, situation administrative). Un véhicule L6e ne peut pas circuler sur
        autoroute ni sur les voies qui lui sont interdites.
      </p>

      <h2 id="prix">4. Prix</h2>
      <p>Les prix sont indiqués en euros, toutes taxes comprises (TTC). À la date de mise à jour de ces CGV :</p>
      <ul>
        {Object.values(VEHICLES).map((v) => (
          <li key={v.label}>
            {v.label} : {euro(v.price)} TTC ;
          </li>
        ))}
        <li>forfait carte grise (formalités et taxe d’immatriculation) : {euro(REGISTRATION_PRICE)} TTC ;</li>
        <li>
          livraison à domicile : forfait selon la zone de livraison, calculé à partir de votre code postal (voir la page{" "}
          <a href="/livraison">Livraison</a>). Pour la Corse, l’outre-mer ou une adresse particulière, le prix de
          livraison est établi sur devis.
        </li>
      </ul>
      <p>
        Le prix total à payer (véhicule, livraison, carte grise, remise éventuelle d’un code promotionnel) figure sur
        votre devis. Le prix qui s’applique est celui de votre devis confirmé par NeoDrive : il ne peut pas être
        modifié ensuite sans votre accord écrit. Les prix affichés sur le site peuvent évoluer, mais un changement ne
        s’applique pas à une commande déjà confirmée.
      </p>
      <p>
        L’assurance du véhicule, les accessoires et options non mentionnés sur le devis ne sont pas compris dans le
        prix.
      </p>

      <h2 id="commande">5. Réservation et commande</h2>
      <h3>5.1 Réservation en ligne</h3>
      <p>Sur la page <a href="/reservation-devis">Réserver</a>, vous :</p>
      <ol>
        <li>choisissez la version du véhicule ;</li>
        <li>
          indiquez votre code postal de livraison : le prix de la livraison s’affiche (ou la mention « sur devis » si
          un tarif personnalisé est nécessaire) ;
        </li>
        <li>renseignez vos coordonnées et, si vous en avez un, un code promotionnel ;</li>
        <li>
          vérifiez votre devis, le signez en tapant votre nom et cochez la case de confirmation (signature électronique
          simple). Vous pouvez télécharger le devis en PDF.
        </li>
      </ol>
      <p>
        <strong>Aucun paiement n’est demandé lors de la réservation</strong> et aucun acompte n’est encaissé. Votre
        réservation est une demande ferme de votre part, transmise à NeoDrive.
      </p>
      <h3>5.2 Confirmation de la commande</h3>
      <p>
        Après votre réservation, un conseiller NeoDrive vous contacte pour confirmer la disponibilité du véhicule, le
        prix total et la date ou le délai de livraison. <strong>La vente est conclue lorsque NeoDrive vous confirme la
        commande</strong> ; cette confirmation vous est adressée par écrit (e-mail ou message), avec ces CGV.
      </p>
      <p>
        NeoDrive peut refuser une réservation, notamment si les informations sont incomplètes ou erronées, si le
        véhicule n’est plus disponible, en cas d’erreur manifeste de prix, ou de litige antérieur non réglé. Vous en
        êtes alors informé et vous n’avez rien à payer.
      </p>
      <h3>5.3 Dossier de commande et carte grise</h3>
      <p>
        Pour finaliser la commande et la carte grise, NeoDrive vous demande certains documents, par exemple une pièce
        d’identité, un justificatif de domicile et le devis signé. Ils peuvent être transmis en ligne (page{" "}
        <a href="/reservation">Carte grise / contrat</a>) ou directement à votre conseiller.
      </p>

      <h2 id="paiement">6. Paiement</h2>
      <p>
        <strong>Vous payez le prix total le jour de la remise du véhicule</strong>, après l’avoir vu et inspecté avec
        notre intervenant. Le paiement se fait par virement bancaire (y compris virement instantané), aux coordonnées
        bancaires de MK HOLDING figurant sur votre bon de commande, ou par tout autre moyen accepté par NeoDrive et
        indiqué dans la confirmation de commande. Indiquez votre nom et prénom dans le motif du virement.
      </p>
      <p>
        Si vous achetez avec un crédit, le montant financé est versé par l’organisme prêteur selon les conditions de
        son offre (voir l’article 14).
      </p>
      <p>
        Les clés et les documents du véhicule vous sont remis une fois le paiement reçu. Si le paiement n’est pas
        effectué lors de la remise, NeoDrive peut repartir avec le véhicule et convenir avec vous d’un nouveau
        rendez-vous.
      </p>
      <p>
        Pour votre sécurité : NeoDrive ne vous demande jamais de payer sur un autre compte que celui de MK HOLDING. En
        cas de doute, appelez-nous au <a href={COMPANY.phoneHref}>{COMPANY.phone}</a> avant tout virement.
      </p>

      <h2 id="livraison">7. Livraison et remise du véhicule</h2>
      <h3>7.1 Zones</h3>
      <p>
        NeoDrive livre à domicile en France métropolitaine, au forfait de votre zone. Pour la Corse, l’outre-mer ou
        certaines adresses, la livraison est possible sur devis. Vous pouvez aussi récupérer votre véhicule à un point
        de remise proche de Muret (31), selon les conditions indiquées sur la page <a href="/livraison">Livraison</a>.
      </p>
      <h3>7.2 Délai</h3>
      <p>
        Le délai indicatif est affiché pour chaque version (certaines versions sont disponibles en stock, d’autres sont
        livrées sur commande avec un délai plus long). La date ou le délai de livraison applicable est celui indiqué
        dans votre confirmation de commande. Le rendez-vous de livraison est fixé avec vous.
      </p>
      <p>
        Si aucune date n’est indiquée, NeoDrive livre au plus tard 30 jours après la conclusion du contrat (article
        L216-1 du Code de la consommation). En cas de retard, vous pouvez demander par écrit à NeoDrive de livrer dans
        un délai supplémentaire raisonnable ; si la livraison n’a pas lieu dans ce délai, vous pouvez annuler la
        commande et obtenir le remboursement de toute somme versée dans les 14 jours (articles L216-6 et L216-7).
      </p>
      <h3>7.3 Remise du véhicule</h3>
      <p>
        Le véhicule est déchargé, inspecté avec vous, puis les clés vous sont remises avec une explication de prise en
        main (recharge, commandes, autonomie). Si vous constatez un dommage ou un élément manquant, notez-le sur le
        document de livraison et prévenez-nous rapidement, avec des photos. Ces réserves facilitent le traitement, mais
        ne vous font perdre aucun de vos droits légaux.
      </p>

      <h2 id="propriete">8. Transfert de propriété et des risques</h2>
      <p>
        Le véhicule reste la propriété de MK HOLDING jusqu’au paiement complet du prix (réserve de propriété). Les
        risques (perte, dommage) vous sont transférés au moment où vous, ou une personne que vous avez désignée, prenez
        physiquement possession du véhicule (article L216-4 du Code de la consommation). Pendant le transport organisé
        par NeoDrive, le véhicule voyage donc aux risques de NeoDrive.
      </p>
      <p>
        Avant de circuler, vous devez assurer le véhicule : l’assurance est obligatoire et reste à votre charge.
      </p>

      <h2 id="carte-grise">9. Service carte grise</h2>
      <p>
        Le forfait carte grise de {euro(REGISTRATION_PRICE)} TTC comprend la préparation et le traitement de votre
        dossier d’immatriculation, le certificat provisoire d’immatriculation (CPI), les formalités et la taxe
        d’immatriculation. Vous devez fournir des documents exacts et à jour ; un retard ou une erreur dans vos
        documents peut retarder l’immatriculation.
      </p>
      <p>
        La carte grise définitive est délivrée et envoyée par l’administration (ANTS / Imprimerie nationale) : NeoDrive
        ne maîtrise pas ses délais.
      </p>

      <h2 id="retractation">10. Droit de rétractation (14 jours)</h2>
      <h3>10.1 Délai</h3>
      <p>
        Comme pour tout achat à distance, vous disposez d’un délai de <strong>14 jours</strong> pour vous rétracter,
        sans donner de motif (articles L221-18 et suivants du Code de la consommation). Ce délai commence le jour où
        vous, ou une personne que vous avez désignée (autre que le transporteur), prenez physiquement possession du
        véhicule. Vous pouvez aussi vous rétracter dès la conclusion du contrat, avant la livraison. Si le délai
        expire un samedi, un dimanche ou un jour férié, il est prolongé jusqu’au premier jour ouvrable suivant.
      </p>
      <h3>10.2 Comment faire</h3>
      <p>
        Informez NeoDrive de votre décision avant la fin du délai, par une déclaration claire envoyée par e-mail à{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou par courrier à {COMPANY.name}, {COMPANY.address}.
        Vous pouvez utiliser le formulaire ci-dessous, mais ce n’est pas obligatoire. NeoDrive vous envoie un accusé
        de réception.
      </p>
      <h3>10.3 Retour du véhicule</h3>
      <p>
        Vous devez rendre le véhicule, avec ses clés, son chargeur, ses accessoires et ses documents, au plus tard 14
        jours après nous avoir informés de votre décision. Le véhicule ne pouvant pas être renvoyé par la poste, les
        frais directs de retour sont à votre charge. Vous pouvez le ramener vous-même à l’adresse indiquée par
        NeoDrive, ou demander à NeoDrive d’organiser l’enlèvement : son coût vous est alors indiqué à l’avance et ne
        dépasse pas le montant du forfait de livraison de votre zone figurant sur votre devis.
      </p>
      <p>
        Vous pouvez essayer le véhicule comme vous le feriez en magasin, pour vérifier sa nature, ses caractéristiques
        et son bon fonctionnement. Votre responsabilité peut être engagée si le véhicule perd de la valeur parce que
        vous l’avez utilisé au-delà (par exemple un kilométrage important, un choc ou une salissure anormale).
      </p>
      <h3>10.4 Remboursement</h3>
      <p>
        NeoDrive vous rembourse toutes les sommes versées, y compris les frais de livraison initiaux (sur la base du
        forfait de livraison standard), au plus tard 14 jours après avoir été informée de votre décision. Le
        remboursement se fait avec le même moyen de paiement que celui que vous avez utilisé, sauf accord de votre
        part pour un autre moyen, sans frais pour vous. NeoDrive peut attendre d’avoir récupéré le véhicule avant de
        rembourser.
      </p>
      <h3>10.5 Carte grise et crédit</h3>
      <p>
        Si vous avez expressément demandé que les formalités de carte grise soient réalisées avant la fin du délai de
        rétractation, et qu’elles ont été entièrement réalisées, le forfait carte grise reste dû (article L221-28, 1°).
        Si elles ont été commencées sans être terminées, vous payez seulement la part déjà réalisée (article L221-25).
      </p>
      <p>
        Si votre achat est financé par un crédit affecté, la rétractation de la vente met fin au crédit, et la
        rétractation du crédit (14 jours) annule la vente, selon les articles L312-44 et suivants du Code de la
        consommation.
      </p>

      <div className={s.form}>
        <p><strong>Modèle de formulaire de rétractation</strong></p>
        <p>(Complétez et renvoyez ce formulaire uniquement si vous souhaitez vous rétracter du contrat.)</p>
        <p>
          À l’attention de {COMPANY.name} (NeoDrive), {COMPANY.address} — e-mail : {COMPANY.email}
        </p>
        <p>
          Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :
          <br />
          Véhicule (version, n° de devis ou de commande) : ………………………………
          <br />
          Commandé le : ……………… / reçu le : ………………
          <br />
          Nom du consommateur : ………………………………
          <br />
          Adresse du consommateur : ………………………………
          <br />
          Signature du consommateur (uniquement en cas de notification sur papier) : ………………
          <br />
          Date : ………………
        </p>
      </div>

      <h2 id="garanties-legales">11. Garanties légales</h2>
      <p>
        Tout véhicule vendu par NeoDrive bénéficie, sans supplément de prix, de la garantie légale de conformité et de
        la garantie des vices cachés. Le texte ci-dessous reprend l’information prévue par la loi.
      </p>
      <div className={s.box}>
        <p>
          Le consommateur dispose d’un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en
          œuvre de la garantie légale de conformité en cas d’apparition d’un défaut de conformité. Durant ce délai, le
          consommateur n’est tenu d’établir que l’existence du défaut de conformité et non la date d’apparition de
          celui-ci.
        </p>
        <p>
          La garantie légale de conformité emporte obligation pour le professionnel, le cas échéant, de fournir toutes
          les mises à jour nécessaires au maintien de la conformité du bien.
        </p>
        <p>
          La garantie légale de conformité donne au consommateur droit à la réparation ou au remplacement du bien dans
          un délai de trente jours suivant sa demande, sans frais et sans inconvénient majeur pour lui.
        </p>
        <p>
          Si le bien est réparé dans le cadre de la garantie légale de conformité, le consommateur bénéficie d’une
          extension de six mois de la garantie initiale.
        </p>
        <p>
          Si le consommateur demande la réparation du bien, mais que le vendeur impose le remplacement, la garantie
          légale de conformité est renouvelée pour une période de deux ans à compter de la date de remplacement du
          bien.
        </p>
        <p>
          Le consommateur peut obtenir une réduction du prix d’achat en conservant le bien ou mettre fin au contrat en
          se faisant rembourser intégralement contre restitution du bien, si :
        </p>
        <ol>
          <li>le professionnel refuse de réparer ou de remplacer le bien ;</li>
          <li>la réparation ou le remplacement du bien intervient après un délai de trente jours ;</li>
          <li>
            la réparation ou le remplacement du bien occasionne un inconvénient majeur pour le consommateur, notamment
            lorsque le consommateur supporte définitivement les frais de reprise ou d’enlèvement du bien non conforme,
            ou s’il supporte les frais d’installation du bien réparé ou de remplacement ;
          </li>
          <li>
            la non-conformité du bien persiste en dépit de la tentative de mise en conformité du vendeur restée
            infructueuse.
          </li>
        </ol>
        <p>
          Le consommateur a également droit à une réduction du prix du bien ou à la résolution du contrat lorsque le
          défaut de conformité est si grave qu’il justifie que la réduction du prix ou la résolution du contrat soit
          immédiate. Le consommateur n’est alors pas tenu de demander la réparation ou le remplacement du bien au
          préalable.
        </p>
        <p>Le consommateur n’a pas droit à la résolution de la vente si le défaut de conformité est mineur.</p>
        <p>
          Toute période d’immobilisation du bien en vue de sa réparation ou de son remplacement suspend la garantie
          qui restait à courir jusqu’à la délivrance du bien remis en état.
        </p>
        <p>
          Les droits mentionnés ci-dessus résultent de l’application des articles L. 217-1 à L. 217-32 du code de la
          consommation.
        </p>
        <p>
          Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt
          une amende civile d’un montant maximal de 300 000 euros, qui peut être porté jusqu’à 10 % du chiffre
          d’affaires moyen annuel (article L. 241-5 du code de la consommation).
        </p>
        <p>
          Le consommateur bénéficie également de la garantie légale des vices cachés en application des articles 1641
          à 1649 du code civil, pendant une durée de deux ans à compter de la découverte du défaut. Cette garantie
          donne droit à une réduction de prix si le bien est conservé ou à un remboursement intégral contre
          restitution du bien.
        </p>
      </div>
      <p>
        Ne relèvent pas de la garantie légale de conformité les dommages causés après la livraison, par exemple par un
        accident, un choc, une surcharge, un défaut d’entretien, une utilisation contraire au manuel utilisateur (en
        particulier pour la recharge et le stockage des batteries) ou une modification non autorisée, ni l’usure
        normale des pièces d’usure (pneumatiques, plaquettes de frein, ampoules, fusibles, balais d’essuie-glace).
      </p>
      <p>
        Pour faire jouer la garantie, contactez NeoDrive (voir l’article 13). NeoDrive peut vous demander des photos,
        des vidéos ou des informations simples pour établir le diagnostic.
      </p>

      <h2 id="garantie-neodrive">12. Garantie « 2 ans » NeoDrive</h2>
      <p>
        La « garantie 2 ans » mise en avant sur le site correspond à la garantie légale de conformité décrite à
        l’article 11 : elle couvre le véhicule pendant 2 ans à compter de sa livraison, sans frais pour vous.
      </p>
      <p>
        En complément, NeoDrive garantit le châssis et les éléments structurels de la carrosserie contre les défauts
        de fabrication pendant 2 ans à compter de la livraison (garantie commerciale gratuite, valable pour les
        véhicules livrés en France, assurée par {COMPANY.name}, {COMPANY.address}). Cette garantie ne couvre pas les
        dommages dus à un accident, un choc, une surcharge, une modification non autorisée, l’usure normale, un tiers
        ou une mauvaise utilisation. Pour la mettre en œuvre, contactez le SAV NeoDrive.
      </p>
      <p>
        Cette garantie commerciale s’ajoute aux garanties légales : elle ne les remplace pas et ne les limite pas.
      </p>

      <h2 id="sav">13. Service après-vente et pièces</h2>
      <p>
        Pour toute panne ou question technique, ouvrez une demande sur la page <a href="/sav">SAV</a> (description,
        numéro de châssis/VIN si vous l’avez, photos ou vidéos) ou contactez-nous par téléphone ou WhatsApp. Un
        technicien NeoDrive étudie votre demande, vous guide pour un diagnostic à distance et, si nécessaire, organise
        l’envoi de pièces ou l’intervention d’un réparateur. Vous suivez votre demande en ligne avec votre référence.
      </p>
      <p>
        Dès qu’un comportement anormal apparaît (odeur, chauffe, voyant, bruit), arrêtez d’utiliser le véhicule et
        prévenez NeoDrive, pour éviter d’aggraver le problème.
      </p>
      <p>
        Après la période de garantie, le SAV, la documentation et les pièces détachées (page{" "}
        <a href="/pieces">Pièces</a>) restent accessibles, aux tarifs en vigueur.
      </p>

      <h2 id="financement">14. Financement</h2>
      <p>
        Vous pouvez demander un financement sur la page <a href="/financement">Financement</a> : vous faites une
        simulation indicative, puis déposez votre dossier et vos justificatifs. NeoDrive vérifie le dossier et le
        transmet à son partenaire financier. L’offre de crédit est émise par l’organisme prêteur, qui seul décide
        d’accepter ou non votre demande et fixe les conditions définitives.
      </p>
      <p>
        <strong>
          Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.
        </strong>{" "}
        Vous disposez d’un délai de rétractation de 14 jours pour le crédit. Si le crédit n’est pas accordé, la vente
        financée par ce crédit est annulée et vous n’avez rien à payer.
      </p>

      <h2 id="donnees">15. Données personnelles</h2>
      <p>
        Vos données (coordonnées, adresse de livraison, documents du dossier) sont utilisées par MK HOLDING pour
        traiter votre réservation, la livraison, la carte grise, le financement le cas échéant et le service
        après-vente. Pour en savoir plus et exercer vos droits, consultez notre{" "}
        <a href="/politique-de-confidentialite">politique de confidentialité</a>.
      </p>

      <h2 id="reclamations">16. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, contactez d’abord NeoDrive : par téléphone au{" "}
        <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>, par e-mail à{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou par courrier à {COMPANY.address}. Nous cherchons
        avec vous une solution amiable.
      </p>
      <p>
        Si le désaccord persiste, vous pouvez recourir gratuitement à un médiateur de la consommation (articles
        L611-1 et suivants du Code de la consommation), dans un délai d’un an à compter de votre réclamation écrite
        auprès de NeoDrive :
      </p>
      <ul>
        <li>Médiateur : {val(MEDIATOR.name, "nom du médiateur de la consommation")}</li>
        <li>Adresse : {val(MEDIATOR.address, "adresse du médiateur")}</li>
        <li>Site internet : {val(MEDIATOR.website, "site internet du médiateur")}</li>
      </ul>

      <h2 id="droit">17. Droit applicable et litiges</h2>
      <p>
        Ces CGV sont soumises au droit français. En cas de litige, et à défaut d’accord amiable, vous pouvez saisir à
        votre choix la juridiction du lieu où vous demeuriez au moment de la conclusion du contrat ou de la
        survenance du fait dommageable, ou toute autre juridiction compétente selon la loi. Ces CGV ne vous privent
        d’aucun droit que la loi accorde aux consommateurs.
      </p>

      <p className={s.updated} style={{ marginTop: 40 }}>
        Voir aussi : <a href="/mentions-legales">Mentions légales</a> ·{" "}
        <a href="/politique-de-confidentialite">Politique de confidentialité</a> ·{" "}
        <a href="/conditions-utilisation">Conditions d’utilisation du site</a>
      </p>
    </main>
  );
}
