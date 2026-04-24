"use client";

import React, { useRef, useState } from "react";
import Script from "next/script";

export default function Reservation() {

  const today = new Date().toLocaleDateString("fr-FR");
    const prixVehicule = 4490;
  const carteGrise = 150;
  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: ""
  });




  const getTransportPrice = (dept: string) => {
  if (["31","81","82","32","09"].includes(dept)) return 350;

  if (["11","12","46","47","33","65","66",
       "34","30","40","24","19","87","15"].includes(dept)) return 490;

  if (["75","77","78","91","92","93","94","95",
       "13","69","63","16","17","86"].includes(dept)) return 690;

  if (["44","35","56","29","22","53","49","67","68"].includes(dept)) return 790;

  return 790;
};
const transport = getTransportPrice(client.code_postal?.substring(0,2) || "");
const totalTTC = prixVehicule + transport + carteGrise;

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
  <optgroup label="Zone 1 — 250 €">
    <option value="31">Haute-Garonne (31)</option>
    <option value="81">Tarn (81)</option>
    <option value="82">Tarn-et-Garonne (82)</option>
    <option value="32">Gers (32)</option>
    <option value="09">Ariège (09)</option>
  </optgroup>

  {/* ZONE 2 */}
  <optgroup label="Zone 2 — 350 €">
    <option value="11">Aude (11)</option>
    <option value="12">Aveyron (12)</option>
    <option value="46">Lot (46)</option>
    <option value="47">Lot-et-Garonne (47)</option>
    <option value="33">Gironde (33)</option>
    <option value="65">Hautes-Pyrénées (65)</option>
    <option value="66">Pyrénées-Orientales (66)</option>
  </optgroup>

  {/* ZONE 3 */}
  <optgroup label="Zone 3 — 490 €">
    <option value="34">Hérault (34)</option>
    <option value="30">Gard (30)</option>
    <option value="40">Landes (40)</option>
    <option value="24">Dordogne (24)</option>
    <option value="19">Corrèze (19)</option>
    <option value="87">Haute-Vienne (87)</option>
    <option value="15">Cantal (15)</option>
  </optgroup>

  {/* ZONE 4 */}
  <optgroup label="Zone 4 — 599 €">
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

  {/* ZONE 5 */}
  <optgroup label="Zone 5 — 690 €">
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

  {/* ZONE 6 */}
  <optgroup label="Zone 6 — 790 €">
    <option value="59">Nord (59)</option>
    <option value="62">Pas-de-Calais (62)</option>
    <option value="14">Calvados (14)</option>
    <option value="27">Eure (27)</option>
    <option value="50">Manche (50)</option>
    <option value="61">Orne (61)</option>
    <option value="76">Seine-Maritime (76)</option>
    <option value="54">Meurthe-et-Moselle (54)</option>
    <option value="55">Meuse (55)</option>
    <option value="57">Moselle (57)</option>
    <option value="08">Ardennes (08)</option>
    <option value="10">Aube (10)</option>
    <option value="51">Marne (51)</option>
    <option value="52">Haute-Marne (52)</option>
  </optgroup>

</select>
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
                <td>Véhicule électrique</td>
                <td style={right}>{prixVehicule} €</td>
              </tr>
              <tr>
  <td>
    Livraison (calculée selon département)
    <div style={{ fontSize: 12, color: "#555" }}>
      Prix automatique selon votre localisation
    </div>
  </td>
  <td style={right}>{transport} €</td>
</tr>
              <tr>
                <td>Carte grise</td>
                <td style={right}>{carteGrise} €</td>
              </tr>
              <tr style={totalRow}>
                <td>Total TTC</td>
                <td style={right}>{totalTTC} €</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 60 }}>
            <p>Signature précédée de "Lu et approuvé"</p>
            <div style={signature}></div>
          </div>

          <div style={{ pageBreakBefore: "always", marginTop: 40 }}></div>

          <div style={cgvStyle}>
{`CONDITIONS GÉNÉRALES DE VENTE

1. IDENTITÉ DU VENDEUR
MK HOLDING, SAS
SIREN : 908 645 393
31 rue Jean Nougaro, 31600 Muret

2. OBJET
Les présentes conditions régissent la vente de véhicules électriques sans permis.
Toute commande implique l’acceptation pleine et entière des présentes CGV.

3. COMMANDE
Le client peut commander via la plateforme du vendeur.
Toute validation vaut engagement contractuel.

4. PRIX
Les prix sont exprimés en euros TTC.
Ne sont pas inclus : livraison, carte grise, assurance.

5. RÉSERVE DE PROPRIÉTÉ
Le véhicule reste la propriété du vendeur jusqu’au paiement complet.

6. UTILISATION DU VÉHICULE
Le client s’engage à :
- utiliser le véhicule sur routes goudronnées et en bon état
- respecter le manuel utilisateur
- ne pas surcharger ni utiliser abusivement le véhicule
- utiliser le véhicule pour des trajets courts (environ 30 km/jour recommandé)

Toute utilisation non conforme entraîne l’exclusion de garantie.

7. RESPONSABILITÉ
Le client est seul responsable :
- de l’usage du véhicule
- de son entretien
- des dommages causés
- de la souscription d’une assurance obligatoire

8. BATTERIE
Le client s’engage à :
- recharger le véhicule après chaque utilisation
- ne jamais laisser la batterie déchargée plus de 24h
- effectuer des charges complètes régulières
- ne pas dépasser environ 12 heures de charge
- couper le circuit en cas d’inutilisation
- maintenir une charge même sans utilisation

Tout non-respect annule la garantie batterie.

9. GARANTIE
Structure (châssis, carrosserie) : 2 ans  
Composants : 1 an  
Batterie : 6 mois (usage normal uniquement)

La garantie s’applique uniquement si :
- le véhicule est utilisé conformément aux instructions
- aucune modification n’a été effectuée
- aucun usage abusif n’est constaté

Le vendeur se réserve le droit d’apprécier l’application de la garantie après analyse du défaut.

10. RÉPARATION ET SAV
Deux types de panne :

A. Panne simple  
→ Diagnostic à distance (WhatsApp / téléphone)  
→ Instructions envoyées au client  
→ Pièces expédiées si nécessaire  

B. Panne complexe 
→ Diagnostic à distance (WhatsApp / téléphone)
→ Orientation vers un garage local  
→ Fourniture des pièces par le vendeur  

Le vendeur :
- ne transporte jamais le véhicule  
- ne prend pas en charge le transport  
- fournit uniquement support technique et pièces  

La main d’œuvre peut être prise en charge UNIQUEMENT après validation préalable.

11. EXCLUSIONS DE GARANTIE
Sont exclus :
- accident
- choc
- mauvaise utilisation
- défaut d’entretien
- modification non autorisée
- non-respect des consignes
- usure normale

12. MODIFICATIONS
Toute modification sans autorisation écrite annule immédiatement la garantie.

13. AUTONOMIE
L’autonomie est indicative.
Elle dépend de nombreux facteurs (température, charge, route, conduite).

14. COMPORTEMENT CLIENT
Le vendeur se réserve le droit de suspendre le support en cas :
- comportement abusif
- agressivité
- non-respect des règles

15. CONTACT
Toute demande doit être effectuée via WhatsApp ou téléphone.

16. PAIEMENT
Paiement selon accord :
- acompte + solde à la livraison
- ou paiement total à la livraison

17. ACCEPTATION
Le client déclare :
- avoir pris connaissance des présentes CGV
- les accepter sans réserve
- avoir reçu toutes les informations nécessaires

18. DROIT APPLICABLE
Droit français – tribunal compétent : siège du vendeur
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
