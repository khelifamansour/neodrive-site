"use client";

import { useState } from "react";

export default function Reservation() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");
  const [accepted, setAccepted] = useState(false);

  const today = "11 juin 2025";

  const prixVehiculeTTC = 4490;
  const transportTTC = 490;

  const prixVehiculeHT = prixVehiculeTTC / 1.2;
  const transportHT = transportTTC / 1.2;

  const totalTTC = prixVehiculeTTC + transportTTC;
  const totalHT = prixVehiculeHT + transportHT;
  const tva = totalTTC - totalHT;

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "Arial" }}>

      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>Réservation véhicule</h1>

      <div>
        <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} style={input}/>
        <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={input}/>
        <input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} style={input}/>
        <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} style={input}/>
        <input placeholder="Code postal" value={cp} onChange={(e) => setCp(e.target.value)} style={input}/>
        <input placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} style={input}/>
      </div>

      {/* ACCEPT CGV */}
      <div style={{ marginTop: 20 }}>
        <label>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />{" "}
          J’ai lu et j’accepte les conditions générales de vente
        </label>
      </div>

      {/* DEVIS */}
      <div id="devis" style={{ marginTop: 30, border: "1px solid #ccc", padding: 20 }}>

        <h2>DEVIS</h2>
        <p>Date : {today}</p>

        <p><strong>{prenom} {nom}</strong></p>
        <p>{adresse}</p>

        <hr />

        <p>Véhicule : {prixVehiculeTTC} €</p>
        <p>Transport : {transportTTC} €</p>

        <p>Total HT : {totalHT.toFixed(0)} €</p>
        <p>TVA : {tva.toFixed(0)} €</p>
        <p><strong>Total TTC : {totalTTC.toFixed(0)} €</strong></p>

        <hr />

        <p>Signature précédée de "Lu et approuvé"</p>
        <div style={{ marginTop: 40 }}>
          <div style={{ borderTop: "1px solid black", width: 200 }}>Signature client</div>
        </div>

        {/* FULL CGV */}
        <div style={{ marginTop: 40, fontSize: 10, whiteSpace: "pre-line" }}>
{`CONDITIONS GÉNÉRALES DE VENTE 

1. Identité du vendeur
MK HOLDING, SAS
SIREN : 908 645 393
Siège social : 31 rue Jean Nougaro, 31600 Muret
(ci-après « le Vendeur »)

2. Objet
Les présentes CGV régissent la vente des véhicules sans permis électriques.
Toute commande implique l’acceptation pleine et entière des présentes conditions.

3. Prix
Les prix sont exprimés en euros TTC (TVA incluse).
Ne sont pas inclus sauf mention contraire :
- frais de livraison
- carte grise
- assurance
- frais annexes

4. Garantie

4.1 Structure du véhicule
Châssis, structure, carrosserie : 2 ans

4.2 Composants
Moteur, contrôleur, électronique : 1 an

4.3 Batterie
Garantie limitée à 6 mois, sous conditions strictes d’utilisation.

5. Conditions d’utilisation de la batterie (OBLIGATOIRES)

Le client reconnaît avoir été informé que la batterie nécessite un usage rigoureux.

Le client s’engage à :
- recharger la batterie après chaque utilisation
- ne jamais laisser la batterie déchargée plus de 24h
- effectuer des charges complètes régulièrement
- ne pas dépasser environ 12 heures de charge continue
- utiliser uniquement le chargeur fourni
- stocker le véhicule dans un environnement sec et tempéré

En cas d’inutilisation prolongée :
- couper le circuit électrique
- maintenir une charge régulière (au moins une fois par semaine)

Exclusion de garantie batterie :
La garantie batterie est exclue en cas de :
- décharge profonde
- stockage sans recharge
- mauvaise utilisation
- non-respect des consignes

6. Utilisation du véhicule

Le véhicule doit être utilisé :
- sur routes adaptées et en bon état
- dans des conditions normales

Exclusions :
Sont exclus de garantie :
- routes dégradées
- chocs liés à la chaussée
- surcharge
- utilisation abusive

7. Autonomie

L’autonomie est donnée à titre indicatif.
Elle dépend notamment de :
- température
- poids transporté
- relief
- style de conduite
- état de la route

Aucune garantie d’autonomie n’est donnée.

8. Procédure en cas de panne

En cas de problème :
- le client contacte le Vendeur
- diagnostic à distance (téléphone / WhatsApp)
- application des instructions

9. Réparations

9.1 Réparations simples
Le Vendeur peut demander au client :
- d’effectuer la réparation lui-même
- ou via un tiers

Le Vendeur fournit les instructions nécessaires.

9.2 Réparations en garage
Si nécessaire :
- le Vendeur oriente vers un garage
- le client transporte le véhicule

Transport :
Le transport du véhicule est à la charge exclusive du client.
Le Vendeur ne prend pas en charge :
- remorquage
- transport
- déplacement

9.3 Prise en charge
Si la panne est couverte par la garantie :
- le Vendeur fournit les pièces
- le Vendeur peut prendre en charge la main d’œuvre du garage

Uniquement si :
- validation préalable du Vendeur
- réparation conforme
- absence de faute du client

10. Exclusions de garantie

La garantie ne couvre pas :
- accident
- choc
- mauvaise utilisation
- modification du véhicule
- intervention non autorisée
- défaut d’entretien
- non-respect des consignes

11. Modifications

Toute modification sans accord écrit entraîne l’annulation immédiate de la garantie.

12. Responsabilité

Le client est seul responsable :
- de l’usage du véhicule
- de son entretien
- de sa conduite

13. Assurance

Le client doit souscrire une assurance conforme à la réglementation.

14. Comportement client

Le Vendeur peut suspendre toute assistance en cas de :
- comportement agressif
- abus
- non-respect des règles

15. Livraison

Le client doit vérifier le véhicule à réception.
Toute anomalie doit être signalée immédiatement.

16. Paiement

Les modalités de paiement sont définies selon accord entre le Vendeur et le Client.

Le paiement peut être :
- avec acompte à la commande et solde à la livraison
- ou paiement total à la livraison

Réserve de propriété :
Le véhicule reste la propriété du Vendeur jusqu’au paiement complet.

Tant que le paiement n’est pas intégral :
- le véhicule ne devient pas la propriété du client
- la livraison peut être refusée ou suspendue

17. Litiges

Droit applicable : français
Tribunal compétent : juridiction du siège du Vendeur
`}
</div>

      </div>

      <button onClick={() => window.print()} style={btn}>
        Télécharger le devis PDF
      </button>

    </main>
  );
}

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ccc"
};

const btn = {
  marginTop: 20,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "white"
};
