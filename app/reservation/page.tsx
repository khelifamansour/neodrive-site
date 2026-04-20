"use client";

import React, { useRef, useState } from "react";

export default function Reservation() {

  const today = new Date().toLocaleDateString("fr-FR");

  const prixVehicule = 4490;
  const transport = 490;
  const carteGrise = 150;
  const totalTTC = prixVehicule + transport + carteGrise;

  const printRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: ""
  });

  const handleChange = (e: any) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  // ✅ REAL PDF DOWNLOAD
const downloadPDF = async () => {
  if (!printRef.current) return;

  const html2canvas = (window as any).html2canvas;
  const jsPDF = (window as any).jspdf.jsPDF;

  const element = printRef.current;

  const canvas = await html2canvas(element, {
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

  // FIRST PAGE
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // ADD EXTRA PAGES
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

      {/* CDN (IMPORTANT) */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

      <h2 style={{ textAlign: "center" }}>Réservation véhicule</h2>

      <form
        action="https://formspree.io/f/xjgjrqqg"
        method="POST"
        encType="multipart/form-data"
      >

        <input type="hidden" name="_subject" value="Nouvelle réservation véhicule" />

        {/* CLIENT */}
        <div style={section}>
          <h3>Informations client</h3>

          <input name="nom" placeholder="Nom" style={input} onChange={handleChange} required />
          <input name="prenom" placeholder="Prénom" style={input} onChange={handleChange} required />
          <input name="telephone" placeholder="Téléphone" style={input} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" style={input} onChange={handleChange} required />
          <input name="adresse" placeholder="Adresse" style={input} onChange={handleChange} required />
          <input name="code_postal" placeholder="Code postal" style={input} onChange={handleChange} required />
          <input name="ville" placeholder="Ville" style={input} onChange={handleChange} required />
        </div>

        {/* DOCUMENTS */}
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

        {/* PDF */}
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
                <td>Livraison + mise en route</td>
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
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}></div>

<div style={{ fontSize: 10, lineHeight: "1.5",const cgvStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: "1.6",
  marginTop: 20,
  whiteSpace: "pre-line"
}; }}>
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

{/* SIGNATURE CGV */}
<div style={{ marginTop: 40 }}>
  <p>Signature CGV précédée de "Lu et approuvé"</p>
  <div style={{ borderTop: "1px solid black", width: 250 }}></div>
</div>
          </div>

        </div>

        {/* BUTTONS */}
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
