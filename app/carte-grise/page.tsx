"use client";

import React, { useState } from "react";
import Script from "next/script";

export default function CarteGrise() {

  const today = new Date().toLocaleDateString("fr-FR");

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

  // 🔥 GENERATION MANDAT PDF
  const downloadMandat = async () => {
    const jsPDF = (window as any).jspdf.jsPDF;

    const pdf = new jsPDF();

    pdf.setFontSize(14);
    pdf.text("MANDAT CARTE GRISE", 20, 20);

    pdf.setFontSize(11);

    pdf.text(`Nom : ${client.nom}`, 20, 40);
    pdf.text(`Prénom : ${client.prenom}`, 20, 50);
    pdf.text(`Adresse : ${client.adresse}`, 20, 60);
    pdf.text(`${client.code_postal} ${client.ville}`, 20, 70);

    pdf.text(`Date : ${today}`, 20, 90);

    pdf.text(
      "Je soussigné(e), autorise la société MK HOLDING à effectuer toutes les démarches nécessaires à l'immatriculation du véhicule en mon nom.",
      20,
      110,
      { maxWidth: 170 }
    );

    pdf.text(
      "Ce mandat permet à MK HOLDING de traiter la demande de carte grise auprès des services compétents.",
      20,
      130,
      { maxWidth: 170 }
    );

    pdf.text("Signature précédée de 'Lu et approuvé' :", 20, 170);

    pdf.line(20, 190, 120, 190);

    pdf.save("mandat-carte-grise.pdf");
  };

  return (
    <main style={container}>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      <h2 style={{ textAlign: "center" }}>Carte grise simplifiée</h2>

      {/* 🔒 INTRO */}
      <div style={section}>
        <p>
          Tous nos véhicules sont <strong>conformes aux normes européennes</strong> et fournis avec le certificat de conformité (COC).
        </p>

        <p>
          Nous vous accompagnons pour effectuer votre carte grise rapidement et simplement.
        </p>
      </div>

      {/* ⚙️ PROCESS */}
      <div style={section}>
        <h3>Comment ça marche</h3>

        <ol>
          <li>Remplissez vos informations</li>
          <li>Téléchargez le mandat pré-rempli</li>
          <li>Signez le mandat</li>
          <li>Envoyez les documents</li>
          <li>Effectuez le paiement (150€)</li>
        </ol>

        <p style={small}>
          ✔ Certificat provisoire sous 3-4 jours  
          ✔ Carte grise sous environ 7 jours
        </p>
      </div>

      {/* 📝 INFOS CLIENT */}
      <div style={section}>
        <h3>Informations client</h3>

        <input name="nom" placeholder="Nom" style={input} onChange={handleChange} required />
        <input name="prenom" placeholder="Prénom" style={input} onChange={handleChange} required />
        <input name="telephone" placeholder="Téléphone" style={input} onChange={handleChange} required />
        <input name="email" placeholder="Email" style={input} onChange={handleChange} required />
        <input name="adresse" placeholder="Adresse" style={input} onChange={handleChange} required />
        <input name="code_postal" placeholder="Code postal" style={input} onChange={handleChange} required />
        <input name="ville" placeholder="Ville" style={input} onChange={handleChange} required />
      </div>

      {/* 📄 MANDAT */}
      <div style={section}>
        <h3>Mandat carte grise</h3>

        <p>
          Téléchargez le mandat pré-rempli, signez-le puis renvoyez-le.
        </p>

        <button type="button" onClick={downloadMandat} style={btn}>
          Télécharger le mandat
        </button>
      </div>

      {/* 💰 PAIEMENT */}
      <div style={section}>
        <h3>Paiement</h3>

        <p>
          Frais de traitement : <strong>150 €</strong>
        </p>

        <p style={small}>
          Le traitement commence uniquement après réception du paiement et du dossier complet.
        </p>
      </div>

      {/* 📎 UPLOAD DOCUMENTS */}
      <form
        action="https://formspree.io/f/xjgjrqqg"
        method="POST"
        encType="multipart/form-data"
      >

        <input type="hidden" name="_subject" value="Dossier carte grise" />

        <div style={section}>
          <h3>Documents à envoyer</h3>

          <p style={small}>Carte d’identité :</p>
          <input type="file" name="cni" required />

          <p style={small}>Justificatif de domicile :</p>
          <input type="file" name="justificatif" required />

          <p style={small}>Mandat signé :</p>
          <input type="file" name="mandat" required />

          <p style={small}>Preuve de paiement (150€) :</p>
          <input type="file" name="paiement" required />
        </div>

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

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 6
};

const small: React.CSSProperties = {
  fontSize: 12,
  color: "#555"
};
