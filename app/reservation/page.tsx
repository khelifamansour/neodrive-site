"use client";

import React, { useRef, useState } from "react";
import Script from "next/script";

export default function Reservation() {

  const today = new Date().toLocaleDateString("fr-FR");
    const prixVehicule = 5790;
  const carteGrise = 249;
  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: ""
  });
  const [noDelivery, setNoDelivery] = useState(false);

const [quantity, setQuantity] = useState(1);
const [manualTransport, setManualTransport] = useState("");
const [discount, setDiscount] = useState(0);
  

  const getTransportPrice = (dept: string) => {
  if (["31","81","82","32","09"].includes(dept)) return 350;

  if (["11","12","46","47","33","65","66",
       "34","30","40","24","19","87","15"].includes(dept)) return 490;

  if (["75","77","78","91","92","93","94","95",
       "13","69","63","16","17","86"].includes(dept)) return 690;

  if (["44","35","56","29","22","53","49","67","68"].includes(dept)) return 790;

  return 790;
};
const transport = noDelivery
  ? 0
  : manualTransport
      ? Number(manualTransport)
      : getTransportPrice(
          client.code_postal?.substring(0,2) || ""
        );
const totalTTC =
  (prixVehicule * quantity)
  + transport
  + (carteGrise * quantity)
  - discount;

  const printRef = useRef<HTMLDivElement>(null);



 ​


  const handleChange = (e: any) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;

    const html2canvas = (window as any).html2canvas;
    const jsPDF = (window as any).jspdf.jsPDF;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("devis-neodrive.pdf");
  };

  return (
    <main style={container}>

      {/* CDN FIXED FOR NEXT */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      <h2 style={{ textAlign: "center" }}>Réservation véhicule</h2>

      <form
        action="https://formspree.io/f/xjgjrqqg"
        method="POST"
        encType="multipart/form-data"
      >

        <input type="hidden" name="_subject" value="Nouvelle réservation véhicule" />

        <div style={section}>
          <h3>Informations client</h3>

          <input name="nom" placeholder="Nom" style={input} onChange={handleChange} required />
          <input name="prenom" placeholder="Prénom" style={input} onChange={handleChange} required />
          <input name="telephone" placeholder="Téléphone" style={input} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" style={input} onChange={handleChange} required />
          <input name="adresse" placeholder="Adresse" style={input} onChange={handleChange} required />
          <input name="code_postal" placeholder="Code postal" style={input} onChange={handleChange} required />
        <select
  style={input}
  onChange={(e) =>
    setClient({
      ...client,
      code_postal: e.target.value
    })
  }
  required
>
  <option value="">Sélectionner votre département</option>

  {/* ZONE 1 */}
  <optgroup label="Zone 1 — 350 €">
    <option value="31">Haute-Garonne (31)</option>
    <option value="81">Tarn (81)</option>
    <option value="82">Tarn-et-Garonne (82)</option>
    <option value="32">Gers (32)</option>
    <option value="09">Ariège (09)</option>
  </optgroup>

  {/* ZONE 2 + 3 fusionnées */}
  <optgroup label="Zone 2 — 490 €">
    <option value="11">Aude (11)</option>
    <option value="12">Aveyron (12)</option>
    <option value="46">Lot (46)</option>
    <option value="47">Lot-et-Garonne (47)</option>
    <option value="33">Gironde (33)</option>
    <option value="65">Hautes-Pyrénées (65)</option>
    <option value="66">Pyrénées-Orientales (66)</option>

    <option value="34">Hérault (34)</option>
    <option value="30">Gard (30)</option>
    <option value="40">Landes (40)</option>
    <option value="24">Dordogne (24)</option>
    <option value="19">Corrèze (19)</option>
    <option value="87">Haute-Vienne (87)</option>
    <option value="15">Cantal (15)</option>
  </optgroup>

  {/* ZONE 3 */}
  <optgroup label="Zone 3 — 690 €">
    <option value="75">Paris (75)</option>
    <option value="77">Seine-et-Marne (77)</option>
    <option value="78">Yvelines (78)</option>
    <option value="91">Essonne (91)</option>
    <option value="92">Hauts-de-Seine (92)</option>
    <option value="93">Seine-Saint-Denis (93)</option>
    <option value="94">Val-de-Marne (94)</option>
    <option value="95">Val-d’Oise (95)</option>
    <option value="13">Bouches-du-Rhône (13)</option>
    <option value="69">Rhône (69)</option>
    <option value="63">Puy-de-Dôme (63)</option>
    <option value="16">Charente (16)</option>
    <option value="17">Charente-Maritime (17)</option>
    <option value="86">Vienne (86)</option>
  </optgroup>

  {/* ZONE 4 */}
  <optgroup label="Zone 4 — 790 €">
    <option value="44">Loire-Atlantique (44)</option>
    <option value="35">Ille-et-Vilaine (35)</option>
    <option value="56">Morbihan (56)</option>
    <option value="29">Finistère (29)</option>
    <option value="22">Côtes-d’Armor (22)</option>
    <option value="53">Mayenne (53)</option>
    <option value="49">Maine-et-Loire (49)</option>
    <option value="67">Bas-Rhin (67)</option>
    <option value="68">Haut-Rhin (68)</option>
  </optgroup>
</select>

<p style={label}>Nombre de véhicules</p>
<input
  type="number"
  min="1"
  value={quantity}
  onChange={(e) =>
    setQuantity(Number(e.target.value))
  }
  style={input}
  placeholder="Nombre de véhicules"
/>

<p style={label}>Transport personnalisé (€)</p>
<input
  type="number"
  value={manualTransport}
  onChange={(e) =>
    setManualTransport(e.target.value)
  }
  style={input}
  placeholder="Transport personnalisé (€)"
/>

<p style={label}>Remise / Promotion (€)</p>
<input
  type="number"
  value={discount}
  onChange={(e) =>
    setDiscount(Number(e.target.value) || 0)
  }
  style={input}
  placeholder="Remise / Promotion (€)"
/>
      
          <label style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
  <input
    type="checkbox"
    checked={noDelivery}
    onChange={(e) => setNoDelivery(e.target.checked)}
    style={{ marginRight: 8 }}
  />

            
  Retrait sur place (pas de livraison)
</label>
          <input name="ville" placeholder="Ville" style={input} onChange={handleChange} required />
        </div>

        <div style={section}>
          <h3>Documents obligatoires</h3>

          <p style={small}>Carte d’identité :</p>
          <input type="file" name="cni" accept=".pdf,image/*" required />

          <p style={small}>Justificatif de domicile :</p>
          <input type="file" name="justificatif" accept=".pdf,image/*" required />

          <p style={small}>Devis signé :</p>
          <input type="file" name="devis_signe" accept=".pdf,image/*" required />

          <p style={small}>
            1. Télécharger le devis<br/>
            2. Signer<br/>
            3. Réimporter ici<br/>
            4. Envoyer
          </p>
        </div>

        <div ref={printRef} style={pdf}>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <h2>NEODRIVE</h2>
              <p>MK HOLDING</p>
              <p>SIREN : 908 645 393</p>
              <p>31 rue Jean Nougaro, 31600 Muret</p>
            </div>

            <div style={{ textAlign: "right" }}>
              <h1>DEVIS</h1>
              <p>Date : {today}</p>
            </div>
          </div>

          <hr />

          <h3>Acheteur</h3>
          <p>{client.nom} {client.prenom}</p>
          <p>{client.adresse}</p>
          <p>{client.code_postal} {client.ville}</p>
          <p>{client.telephone}</p>
          <p>{client.email}</p>

          <h3>Détail</h3>

          <table style={table}>
           <tbody>
  <tr>
<td>Véhicule électrique x{quantity}</td>
<td style={right}>{prixVehicule * quantity} €</td>
  </tr>

  {!noDelivery && (
    <tr>
      <td>
        Livraison (calculée selon département)
        <div style={{ fontSize: 12, color: "#555" }}>
          Prix automatique selon votre localisation
        </div>
      </td>
      <td style={right}>{transport} €</td>
    </tr>
  )}

  {noDelivery && (
    <tr>
      <td colSpan={2} style={{ color: "green", textAlign: "center" }}>
        Retrait sur place – aucun frais de livraison
      </td>
    </tr>
  )}

  <tr>
  <td>Pack frais de mise en route et Carte grise x{quantity}</td>
<td style={right}>{carteGrise * quantity} €</td>
  </tr>

{discount > 0 && (
  <tr>
    <td>Remise commerciale</td>
    <td style={right}>- {discount} €</td>
  </tr>
)}

<tr style={totalRow}>
  <td>Total TTC</td>
  <td style={right}>{totalTTC} €</td>
</tr>
</tbody>
          </table>
     COORDONNÉES BANCAIRES

Titulaire du compte :
MK HOLDING

Banque :
REVOLUT

IBAN :
FR76 2823 3000 0142 1307 1051 008

BIC :
REVOFRP2

Devise :
EUR

Référence à indiquer lors du virement :
Nom et prénom du client

Le paiement peut être effectué par virement bancaire sur le compte ci-dessus.

Pour toute question relative au règlement, merci de nous contacter avant l'émission du virement.
IMPORTANT

Merci d'indiquer votre nom et prénom dans le motif du virement.

La livraison ou la remise du véhicule est effectuée après réception du règlement selon les modalités convenues entre les parties.

          

          <div style={{ marginTop: 60 }}>
            <p>Signature précédée de "Lu et approuvé"</p>
            <div style={signature}></div>
          </div>

          <div style={{ pageBreakBefore: "always", marginTop: 40 }}></div>

          <div style={cgvStyle}>
{`CONDITIONS GÉNÉRALES DE VENTE

PHILOSOPHIE DE LA GARANTIE MICRODRIVE

La philosophie Microdrive n'est pas de concentrer l'intégralité de la protection du client sur une courte période, mais de l'accompagner sur plusieurs années.

Pendant les 24 premiers mois, Microdrive participe au remplacement des composants selon un système de prise en charge dégressive.

Parallèlement, le premier propriétaire bénéficie pendant 3 ans :

- d'une assistance technique gratuite ;
- d'un diagnostic à distance gratuit ;
- d'une remise permanente de 20 % sur les pièces détachées achetées auprès de Microdrive.

Cette approche permet au client de continuer à bénéficier d'un accompagnement et d'un avantage économique même après la période principale de garantie.

L'objectif est d'aider le propriétaire à maintenir son véhicule en bon état de fonctionnement pendant de nombreuses années tout en limitant le coût global de possession du véhicule.


1. IDENTIFICATION DU VENDEUR

Les présentes Conditions Générales de Vente sont proposées par :

MK HOLDING SAS

SIREN : 908 645 393

31 Rue Jean Nougaro

31600 Muret

France

Marque commerciale : MICRODRIVE

Email : sales@easymicrodrive.com

Site internet : easymicrodrive.com

2. OBJET

Les présentes Conditions Générales de Vente régissent la vente des véhicules électriques sans permis commercialisés sous la marque Microdrive ainsi que les accessoires, pièces détachées et services associés.

Toute commande implique l'acceptation pleine et entière des présentes Conditions Générales de Vente.

3. CARACTÉRISTIQUES DES VÉHICULES

Les véhicules proposés à la vente sont des véhicules électriques sans permis homologués dans leur catégorie.

Les descriptions, caractéristiques techniques, photographies, dimensions, poids, équipements, options et autonomies figurant sur les supports commerciaux, catalogues ou sites internet sont communiqués à titre indicatif.

Dans une démarche d'amélioration continue, Microdrive se réserve le droit d'apporter à tout moment des modifications techniques, esthétiques ou fonctionnelles à ses produits sans obligation de modifier les véhicules déjà livrés.

4. COMMANDE

Toute commande devient définitive après validation par le vendeur.

Le vendeur se réserve le droit de refuser une commande notamment en cas :

- d'informations incomplètes ;
- d'indisponibilité du produit ;
- d'erreur manifeste ;
- de litige antérieur avec le client ;
- de force majeure.

Toute modification de commande demandée après validation devra être acceptée expressément par le vendeur.

5. PRIX

Les prix sont exprimés en euros TTC.

Sauf indication contraire, les prix affichés ne comprennent pas :

- les frais de livraison ;
- les frais d'immatriculation ;
- les frais de carte grise ;
- l'assurance ;
- les options ;
- les accessoires ;
- les prestations particulières.

Les prix applicables sont ceux en vigueur au jour de la validation de la commande.

6. MODALITÉS DE PAIEMENT

Le paiement s'effectue selon les modalités convenues entre les parties.

Selon les cas, le règlement peut prendre la forme :

- d'un acompte suivi d'un solde ;
- d'un paiement intégral à la livraison ;
- d'un virement bancaire ;
- d'un paiement instantané ;
- ou de toute autre modalité acceptée par le vendeur.

Le vendeur se réserve le droit de suspendre la livraison tant que le règlement intégral n'a pas été reçu.

7. LIVRAISON

Le véhicule peut être :

- retiré sur rendez-vous ;
- livré à domicile ;
- remis à un transporteur mandaté par le client.

Les délais de livraison sont communiqués à titre indicatif.

Le vendeur ne pourra être tenu responsable d'un retard résultant notamment :

- du transport ;
- des formalités administratives ;
- d'événements indépendants de sa volonté ;
- d'un cas de force majeure.

Lors de la réception du véhicule, le client s'engage à vérifier son état apparent.

Toute anomalie visible devra être signalée immédiatement.

À défaut de réserve formulée lors de la réception, le véhicule sera réputé livré conforme.

8. TRANSFERT DES RISQUES

Le transfert des risques intervient dès la remise du véhicule au client ou à son représentant.

À compter de cette remise, le véhicule voyage aux risques du client.

9. RÉSERVE DE PROPRIÉTÉ

Le véhicule demeure la propriété exclusive de MK HOLDING SAS jusqu'au paiement intégral du prix de vente.

En cas de non-paiement, le vendeur pourra exiger la restitution du véhicule aux frais du client.

10. IMMATRICULATION ET ASSURANCE

Le client demeure responsable :

- de l'immatriculation du véhicule lorsque celle-ci est requise ;
- de la fourniture des documents administratifs nécessaires ;
- de la souscription d'une assurance conforme à la réglementation en vigueur.

Le véhicule ne doit pas être utilisé sans assurance lorsque celle-ci est légalement obligatoire.

11. ACCEPTATION

Le client reconnaît :

- avoir pris connaissance des présentes Conditions Générales de Vente ;
- avoir reçu les informations nécessaires à son achat ;
- avoir obtenu les réponses à ses questions ;
- accepter les présentes conditions sans réserve.

La validation de la commande vaut acceptation des présentes Conditions Générales de Vente.

12. UTILISATION DU VÉHICULE

Le client s'engage à utiliser le véhicule conformément à sa destination, aux recommandations du constructeur et aux présentes Conditions Générales de Vente.

Le véhicule est conçu pour une utilisation normale sur route ou voie autorisée conformément à sa catégorie d'homologation.

Le client s'engage notamment à :

- respecter les limitations techniques du véhicule ;
- respecter les charges maximales autorisées ;
- respecter les recommandations d'entretien ;
- utiliser le véhicule de manière prudente et raisonnable ;
- respecter les règles de circulation applicables.

Toute utilisation abusive, anormale ou non conforme peut entraîner l'exclusion totale ou partielle de la garantie.

13. ENTRETIEN GÉNÉRAL DU VÉHICULE

Le client s'engage à assurer l'entretien courant du véhicule.

Il lui appartient notamment de vérifier régulièrement :

- l'état général du véhicule ;
- l'état des pneumatiques ;
- le système de freinage ;
- l'éclairage ;
- les connexions électriques ;
- les éléments de sécurité ;
- les fixations et éléments visibles du véhicule.

Le client s'engage à ne pas continuer à utiliser le véhicule lorsqu'un défaut important susceptible d'aggraver les dommages est constaté.

Tout dommage résultant de l'absence d'entretien ou de la poursuite d'utilisation malgré un défaut connu pourra être exclu de toute prise en charge.

14. BATTERIES – UTILISATION, CHARGE ET ENTRETIEN

Le client reconnaît avoir reçu les consignes d'utilisation et d'entretien des batteries du véhicule.

Afin de préserver les performances et la durée de vie des batteries, le client s'engage à respecter les recommandations suivantes.

RECHARGE

- recharger régulièrement le véhicule ;
- éviter autant que possible les décharges profondes ;
- éviter de rouler jusqu'à décharge complète ;
- utiliser exclusivement le chargeur fourni ou recommandé par Microdrive ;
- effectuer des charges complètes régulièrement ;
- éviter de laisser le véhicule sans recharge pendant une période prolongée.

Temps de charge généralement recommandés :

- été : 6 à 7 heures ;
- printemps / automne : 6 à 8 heures ;
- hiver : 8 à 10 heures.

Une fois le voyant du chargeur passé au vert, il est recommandé de laisser la charge se stabiliser pendant une courte période avant déconnexion.

Il est déconseillé de laisser le véhicule en charge pendant des durées excessivement longues.

PROCÉDURE DE CHARGE

1. Brancher d'abord le véhicule.
2. Brancher ensuite le chargeur sur la prise secteur.
3. Une fois la charge terminée, débrancher d'abord la prise secteur.
4. Débrancher ensuite le véhicule.

CONDITIONS DE CHARGE

Le client s'engage à :

- laisser refroidir le véhicule après utilisation avant recharge ;
- éviter les charges sous pluie directe ;
- éviter les environnements excessivement humides ;
- éviter les températures extrêmes ;
- éviter les espaces insuffisamment ventilés.

UTILISATION

Le client s'engage à :

- respecter la charge maximale du véhicule ;
- éviter les surcharges ;
- éviter les sollicitations excessives ;
- utiliser le véhicule conformément à sa destination.

15. STOCKAGE LONGUE DURÉE

En cas d'immobilisation supérieure à 7 jours, il est recommandé :

- de recharger complètement le véhicule avant stockage ;
- de couper le coupe-circuit principal lorsque le véhicule en est équipé ;
- de stocker le véhicule dans un endroit sec et ventilé ;
- d'éviter les fortes chaleurs et l'humidité excessive ;
- d'effectuer une recharge d'entretien environ une fois par mois.

Le client reconnaît qu'une batterie laissée déchargée pendant une période prolongée peut subir des dommages irréversibles.

16. ENTRETIEN DES BATTERIES

Le client s'engage à vérifier régulièrement :

- la propreté des batteries ;
- les connexions électriques ;
- les câbles ;
- l'absence d'oxydation ;
- l'absence de fuite ;
- l'absence de gonflement.

En cas d'odeur inhabituelle, de chauffe anormale ou de comportement anormal du véhicule, le client s'engage à interrompre immédiatement l'utilisation du véhicule et à contacter Microdrive.

17. RESPONSABILITÉ DU CLIENT CONCERNANT LES BATTERIES

Le client demeure responsable du respect des consignes d'utilisation, de charge, de stockage et d'entretien des batteries.

Les dommages résultant notamment :

- d'une décharge profonde ;
- d'un stockage prolongé batterie déchargée ;
- d'un défaut d'entretien ;
- d'une mauvaise utilisation ;
- de l'utilisation d'un chargeur non recommandé ;
- d'une modification non autorisée ;
- d'une exposition prolongée à l'eau ou à l'humidité ;

pourront entraîner l'exclusion de la garantie applicable aux composants concernés.

Le vendeur recommande au client de contacter Microdrive dès l'apparition d'un comportement anormal afin de limiter les risques d'aggravation du problème.

18. GARANTIE STRUCTURE

Le châssis et les éléments structurels de carrosserie bénéficient d'une garantie de 2 ans à compter de la date de livraison du véhicule contre les défauts de fabrication.

Cette garantie couvre exclusivement les défauts de fabrication affectant les éléments structurels du véhicule.

Sont notamment exclus de cette garantie :

- les dommages résultant d'un accident ;
- les chocs ;
- les surcharges ;
- les modifications non autorisées ;
- l'usure normale ;
- les dommages causés par un tiers ;
- les dommages résultant d'une mauvaise utilisation du véhicule.

19. GARANTIE DES COMPOSANTS

Les composants mécaniques, électriques et électroniques du véhicule, y compris les batteries, bénéficient d'un programme de participation dégressive au remplacement pendant une durée maximale de 24 mois à compter de la date de livraison du véhicule.

La participation de Microdrive est calculée sur le prix public TTC de la pièce vendue par Microdrive au moment de la demande.

Barème de participation :

- de 0 à 6 mois : prise en charge de 100 % du prix de la pièce ;
- de 7 à 12 mois : prise en charge de 70 % du prix de la pièce ;
- de 13 à 18 mois : prise en charge de 60 % du prix de la pièce ;
- de 19 à 24 mois : prise en charge de 50 % du prix de la pièce.

Exemple :

Pour une pièce vendue 100 € TTC :

- entre 0 et 6 mois : reste à charge client = 0 € ;
- entre 7 et 12 mois : reste à charge client = 30 € ;
- entre 13 et 18 mois : reste à charge client = 40 € ;
- entre 19 et 24 mois : reste à charge client = 50 €.

Cette participation concerne exclusivement les pièces reconnues défectueuses après diagnostic.

La garantie porte exclusivement sur la pièce concernée.

La main-d'œuvre, les déplacements, les frais annexes et les frais d'immobilisation ne sont pas couverts sauf accord écrit préalable de Microdrive.

20. PIÈCES EXCLUES DE LA GARANTIE

Sont notamment considérés comme des éléments d'usure et exclus de la garantie :

- pneumatiques ;
- plaquettes de frein ;
- ampoules ;
- fusibles ;
- balais d'essuie-glace ;
- consommables ;
- éléments soumis à une usure normale.

21. PROCÉDURE DE DIAGNOSTIC

Avant toute prise en charge, Microdrive pourra demander au client :

- des photographies ;
- des vidéos ;
- des mesures techniques ;
- des captures d'écran ;
- des essais simples ;
- tout document ou information utile au diagnostic.

Le client s'engage à coopérer avec Microdrive afin de permettre l'identification de la panne.

Lorsque le diagnostic à distance ne permet pas d'identifier avec certitude l'origine du problème, Microdrive pourra demander le retour de la pièce concernée afin de procéder à une expertise technique.

Les frais d'expédition de la pièce vers Microdrive restent à la charge du client.

Après expertise :

- si la défaillance est reconnue comme couverte par la garantie, la participation prévue au présent contrat sera appliquée ;
- si la défaillance n'est pas couverte par la garantie, aucune prise en charge ne sera accordée.

Les frais de retour de la pièce restent à la charge du client lorsque la garantie n'est pas applicable.

22. EXCLUSIONS DE GARANTIE DES COMPOSANTS

Sont notamment exclus :

- les dommages causés par une mauvaise utilisation ;
- les dommages résultant d'un défaut d'entretien ;
- les dommages résultant d'une modification non autorisée ;
- les dommages résultant d'un accident ;
- les dommages résultant d'un choc ;
- les dommages résultant d'une surcharge ;
- les dommages résultant du non-respect des consignes d'utilisation ;
- les dommages résultant d'une réparation non conforme.

Concernant les batteries, sont notamment exclus :

- la décharge profonde ;
- le stockage prolongé batterie déchargée ;
- le défaut d'entretien ;
- l'utilisation d'un chargeur non recommandé ;
- les dommages résultant du non-respect des consignes figurant dans les présentes CGV ou dans le manuel utilisateur.

23. PROGRAMME ASSISTANCE MICRODRIVE

Microdrive privilégie l'accompagnement de ses clients sur le long terme.

Le premier propriétaire du véhicule bénéficie pendant une durée de 3 ans à compter de la date de livraison :

- assistance technique gratuite ;
- diagnostic à distance gratuit ;
- assistance téléphonique ;
- assistance WhatsApp ;
- aide à la recherche de panne ;
- accès aux procédures techniques disponibles ;
- remise de 20 % sur les pièces détachées achetées auprès de Microdrive.

Ce programme est réservé au premier acheteur du véhicule et n'est pas transférable sauf accord écrit de Microdrive.

L'assistance technique a pour objectif d'aider le client à diagnostiquer, comprendre et résoudre les éventuels problèmes rencontrés sur le véhicule.

Cette assistance ne constitue pas une garantie supplémentaire sur les pièces ou sur le véhicule.

24. SERVICE APRÈS-VENTE MICRODRIVE

Microdrive privilégie une approche basée sur l'assistance technique, le diagnostic et la réparation locale afin de réduire les délais d'immobilisation du véhicule et les coûts supportés par le client.

L'objectif de Microdrive est d'accompagner ses clients dans l'identification et la résolution des problèmes pouvant survenir au cours de l'utilisation du véhicule.

Le client s'engage à contacter Microdrive dès l'apparition d'un dysfonctionnement afin de permettre un diagnostic rapide et d'éviter toute aggravation éventuelle de la panne.

25. DIAGNOSTIC À DISTANCE

Lorsqu'un problème est signalé, Microdrive procède en priorité à un diagnostic à distance.

Afin de permettre l'identification de l'origine du problème, Microdrive pourra demander au client :

- des photographies ;
- des vidéos ;
- des relevés techniques ;
- des captures d'écran ;
- des mesures simples ;
- des essais simples ;
- toute information utile au diagnostic.

Le client s'engage à coopérer avec Microdrive dans le cadre de la recherche de panne.

Microdrive pourra guider le client étape par étape afin de réaliser certains contrôles simples lorsque cela est nécessaire.

26. PANNES SIMPLES

Lorsqu'une panne peut être identifiée et résolue à distance, Microdrive accompagne gratuitement le client dans la recherche de panne.

Selon la situation, Microdrive pourra :

- fournir des conseils techniques ;
- transmettre des procédures de contrôle ;
- transmettre des procédures de réparation ;
- recommander le remplacement d'une pièce ;
- fournir les pièces nécessaires selon disponibilité.

Les conditions de garantie prévues aux présentes Conditions Générales de Vente demeurent applicables.

27. PANNES COMPLEXES

Lorsque la panne nécessite l'intervention d'un professionnel, Microdrive pourra orienter le client vers un réparateur ou un professionnel compétent.

Microdrive pourra également assister ce professionnel à distance afin de faciliter le diagnostic et la réparation.

Avant toute intervention susceptible de faire l'objet d'une demande de prise en charge ou de participation financière, le client devra obtenir l'accord préalable écrit de Microdrive.

À défaut d'accord préalable écrit, les frais engagés demeureront intégralement à la charge du client.

Le recours à un professionnel tiers ne crée aucune obligation de prise en charge financière par Microdrive.

28. TRANSPORT DU VÉHICULE

Sauf accord écrit exceptionnel préalable, Microdrive ne prend pas en charge :

- le transport du véhicule ;
- le remorquage ;
- les frais de déplacement ;
- les frais de récupération du véhicule ;
- les frais de gardiennage ;
- les frais d'hébergement ;
- les frais de location d'un véhicule de remplacement ;
- les pertes d'exploitation ;
- les pertes de revenus ;
- les frais indirects liés à l'immobilisation du véhicule.

Ces frais demeurent intégralement à la charge du client.

29. MAIN-D'ŒUVRE ET INTERVENTIONS

Microdrive privilégie la fourniture :

- d'assistance technique ;
- d'accompagnement au diagnostic ;
- de support technique à distance ;
- de pièces détachées.

Les réparations réalisées par un garage, un réparateur ou tout autre prestataire extérieur demeurent à la charge du client sauf accord écrit préalable de Microdrive.

Aucune facture de réparation, de diagnostic, de recherche de panne, de déplacement, de transport ou de main-d'œuvre ne pourra faire l'objet d'un remboursement sans accord écrit préalable de Microdrive.

Lorsque Microdrive accepte exceptionnellement une participation financière à une intervention, cette participation fera l'objet d'un accord écrit précisant son montant et ses conditions.

30. CONTRÔLE TECHNIQUE DES PIÈCES ET DEMANDES DE GARANTIE

Dans le cadre d'une demande de garantie ou d'une demande de prise en charge, Microdrive pourra demander au client le retour de la pièce concernée afin de procéder à une expertise technique.

Cette procédure peut notamment s'appliquer aux :

- batteries ;
- contrôleurs ;
- chargeurs ;
- moteurs ;
- convertisseurs ;
- composants électriques ;
- composants électroniques ;
- ou toute autre pièce concernée par la demande.

Les frais d'expédition de la pièce vers Microdrive demeurent à la charge du client.

Après réception, Microdrive procédera aux vérifications, mesures et contrôles techniques jugés nécessaires afin de déterminer l'origine de la défaillance.

À l'issue de cette expertise :

- si la défaillance est reconnue comme couverte par les présentes Conditions Générales de Vente, la garantie ou la participation applicable sera accordée conformément aux dispositions prévues ;
- si la défaillance résulte d'une usure normale, d'un défaut d'entretien, d'une mauvaise utilisation, d'une modification non autorisée ou de toute autre cause exclue de garantie, aucune prise en charge ne sera accordée.

Microdrive se réserve le droit de demander le retour de toute pièce avant validation définitive d'une demande de garantie.

Les frais de retour de la pièce vers le client demeurent à la charge du client lorsque la garantie n'est pas applicable.

Le client reconnaît que l'expertise technique réalisée par Microdrive constitue la base permettant de déterminer l'éligibilité ou non à une prise en charge au titre de la garantie.

31. PROGRAMME ASSISTANCE MICRODRIVE

Microdrive privilégie l'accompagnement de ses clients sur le long terme.

Le premier propriétaire du véhicule bénéficie pendant une durée de 3 ans à compter de la date de livraison :

- assistance technique gratuite ;
- diagnostic à distance gratuit ;
- assistance par téléphone ou messagerie ;
- aide à la recherche de panne ;
- accès aux procédures techniques disponibles ;
- remise de 20 % sur les pièces détachées achetées auprès de Microdrive.

Ce programme est réservé au premier acheteur du véhicule.

Le programme Assistance Microdrive constitue un accompagnement technique et commercial destiné à faciliter l'entretien et la réparation du véhicule.

Il ne constitue pas une extension de garantie au-delà des dispositions prévues dans les présentes Conditions Générales de Vente.

32. RESPONSABILITÉ

La responsabilité de Microdrive est strictement limitée aux obligations prévues dans les présentes Conditions Générales de Vente.

Microdrive ne pourra être tenu responsable :

- d'une mauvaise utilisation du véhicule ;
- d'un défaut d'entretien ;
- d'une réparation non conforme ;
- d'une modification non autorisée ;
- d'un accident ;
- d'un dommage causé par un tiers ;
- d'un cas de force majeure ;
- d'une utilisation non conforme aux recommandations fournies.

33. AUTONOMIE ET PERFORMANCES

Les autonomies, performances et consommations annoncées sont communiquées à titre indicatif.

Elles peuvent varier notamment en fonction :

- de la température extérieure ;
- du relief ;
- du style de conduite ;
- du poids transporté ;
- de l'état de charge des batteries ;
- de l'état général du véhicule ;
- des conditions d'utilisation.

Aucune autonomie minimale ne peut être garantie dans toutes les conditions d'utilisation.

34. MODIFICATIONS DU VÉHICULE

Toute modification technique réalisée sans accord écrit préalable de Microdrive peut entraîner l'exclusion totale ou partielle des garanties prévues aux présentes Conditions Générales de Vente.

35. DROIT APPLICABLE ET LITIGES

Les présentes Conditions Générales de Vente sont soumises au droit français.

En cas de litige, les parties s'efforceront de rechercher une solution amiable avant toute procédure judiciaire.

À défaut d'accord amiable, les juridictions compétentes seront celles déterminées par la réglementation française applicable.

36. ACCEPTATION DES CONDITIONS GÉNÉRALES DE VENTE

Le client reconnaît :

- avoir pris connaissance des présentes Conditions Générales de Vente ;
- avoir reçu les informations nécessaires à son achat ;
- avoir reçu les consignes d'utilisation et d'entretien ;
- avoir obtenu les réponses à ses questions ;
- accepter les présentes Conditions Générales de Vente sans réserve.

Fait à : ________

Le : ________

Nom et prénom du client :

---

Signature précédée de la mention :

"Lu et approuvé"

`}
          </div>

          <div style={{ marginTop: 40 }}>
            <p>Signature CGV précédée de "Lu et approuvé"</p>
            <div style={{ borderTop: "1px solid black", width: 250 }}></div>
          </div>

        </div>

        <button type="button" onClick={downloadPDF} style={btn}>
          Télécharger le devis PDF
        </button>

        <button type="submit" style={btn}>
          Envoyer mon dossier
        </button>

      </form>

    </main>
  );
}

/* STYLES */

const container: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial"
};

const section: React.CSSProperties = {
  marginBottom: 25
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  border: "1px solid #ccc",
  borderRadius: 4
};

const label: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 2,
  fontWeight: "bold",
  fontSize: 14
};

const pdf: React.CSSProperties = {
  background: "#fff",
  padding: 30,
  border: "1px solid #ddd",
  marginTop: 30
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};

const right: React.CSSProperties = {
  textAlign: "right"
};

const totalRow: React.CSSProperties = {
  fontWeight: "bold",
  borderTop: "2px solid black"
};

const signature: React.CSSProperties = {
  marginTop: 40,
  width: 250,
  borderTop: "1px solid black"
};

const small: React.CSSProperties = {
  fontSize: 12,
  color: "#555"
};

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 6
};

const cgvStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: "1.6",
  marginTop: 20,
  whiteSpace: "pre-line"
};
