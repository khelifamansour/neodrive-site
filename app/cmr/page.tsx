"use client";

import React, { useRef, useState } from "react";
import Script from "next/script";

export default function Facturation() {

  const today = new Date().toLocaleDateString("fr-FR");

  const prixVehicule = 4490;
  const carteGrise = 150;

  const invoiceNumber = `FAC-${Date.now()}`;

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

  const getTransportPrice = (dept: string) => {

    if (["31","81","82","32","09"].includes(dept)) return 350;

    if ([
      "11","12","46","47","33","65","66",
      "34","30","40","24","19","87","15"
    ].includes(dept)) return 490;

    if ([
      "75","77","78","91","92","93","94","95",
      "13","69","63","16","17","86"
    ].includes(dept)) return 690;

    if ([
      "44","35","56","29","22","53",
      "49","67","68"
    ].includes(dept)) return 790;

    return 790;
  };

  const transport = noDelivery
    ? 0
    : getTransportPrice(client.code_postal?.substring(0,2) || "");

  const totalTTC =
    (prixVehicule * quantity)
    + transport
    + (carteGrise * quantity);

  const totalHT = totalTTC / 1.20;

  const montantTVA = totalTTC - totalHT;

  const printRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: any) => {
    setClient({
      ...client,
      [e.target.name]: e.target.value
    });
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

    const imgHeight =
      (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeight;

    while (heightLeft > 0) {

      position = heightLeft - imgHeight;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;
    }

    pdf.save(`facture-${invoiceNumber}.pdf`);
  };

  return (

    <main style={container}>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

      <h2 style={{ textAlign: "center" }}>
        Facturation
      </h2>

      <div style={section}>

        <h3>Informations client</h3>

        <input
          name="nom"
          placeholder="Nom"
          style={input}
          onChange={handleChange}
          required
        />

        <input
          name="prenom"
          placeholder="Prénom"
          style={input}
          onChange={handleChange}
          required
        />

        <input
          name="telephone"
          placeholder="Téléphone"
          style={input}
          onChange={handleChange}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          style={input}
          onChange={handleChange}
          required
        />

        <input
          name="adresse"
          placeholder="Adresse"
          style={input}
          onChange={handleChange}
          required
        />

        <input
          name="code_postal"
          placeholder="Code postal"
          style={input}
          onChange={handleChange}
          required
        />

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

          <option value="">
            Sélectionner votre département
          </option>

          <optgroup label="Zone 1 — 350 €">
            <option value="31">Haute-Garonne (31)</option>
            <option value="81">Tarn (81)</option>
            <option value="82">Tarn-et-Garonne (82)</option>
            <option value="32">Gers (32)</option>
            <option value="09">Ariège (09)</option>
          </optgroup>

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

        <label
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 10
          }}
        >

          <input
            type="checkbox"
            checked={noDelivery}
            onChange={(e) =>
              setNoDelivery(e.target.checked)
            }
            style={{ marginRight: 8 }}
          />

          Retrait sur place (pas de livraison)

        </label>

        <input
          name="ville"
          placeholder="Ville"
          style={input}
          onChange={handleChange}
          required
        />

      </div>

      <div ref={printRef} style={pdf}>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between"
          }}
        >

          <div>
            <h2>NEODRIVE</h2>
            <p>MK HOLDING</p>
            <p>SIREN : 908 645 393</p>
            <p>31 rue Jean Nougaro, 31600 Muret</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <h1>FACTURE</h1>
            <p>Date : {today}</p>
            <p>N° : {invoiceNumber}</p>
          </div>

        </div>

        <hr />

        <h3>Acheteur</h3>

        <p>
          {client.nom} {client.prenom}
        </p>

        <p>{client.adresse}</p>

        <p>
          {client.code_postal} {client.ville}
        </p>

        <p>{client.telephone}</p>

        <p>{client.email}</p>

        <h3>Détail</h3>

        <table style={table}>

          <tbody>

            <tr>
              <td>
                Véhicule électrique x{quantity}
              </td>

              <td style={right}>
                {prixVehicule * quantity} €
              </td>
            </tr>

            {!noDelivery && (

              <tr>

                <td>
                  Livraison
                  <div
                    style={{
                      fontSize: 12,
                      color: "#555"
                    }}
                  >
                    Prix automatique selon votre localisation
                  </div>
                </td>

                <td style={right}>
                  {transport} €
                </td>

              </tr>

            )}

            {noDelivery && (

              <tr>

                <td
                  colSpan={2}
                  style={{
                    color: "green",
                    textAlign: "center"
                  }}
                >
                  Retrait sur place – aucun frais de livraison
                </td>

              </tr>

            )}

            <tr>

              <td>
                Carte grise x{quantity}
              </td>

              <td style={right}>
                {carteGrise * quantity} €
              </td>

            </tr>

            <tr>

              <td>Total HT</td>

              <td style={right}>
                {totalHT.toFixed(2)} €
              </td>

            </tr>

            <tr>

              <td>TVA 20%</td>

              <td style={right}>
                {montantTVA.toFixed(2)} €
              </td>

            </tr>

            <tr style={totalRow}>

              <td>Total TTC</td>

              <td style={right}>
                {totalTTC.toFixed(2)} €
              </td>

            </tr>

          </tbody>

        </table>

        <div style={{ marginTop: 40 }}>

          <p>
            Paiement à la livraison par virement bancaire.
          </p>

          <p>
            Merci pour votre confiance.
          </p>

        </div>

      </div>

      <button
        type="button"
        onClick={downloadPDF}
        style={btn}
      >
        Télécharger la facture PDF
      </button>

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

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 6
};
