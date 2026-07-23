"use client";

import React, { useRef, useState } from "react";
import Script from "next/script";

const versions = {
  essentiel: {
    label: "VSP Version Essentiel",
    prix: 3990,
  },
  confort: {
    label: "VSP Version Confort",
    prix: 4990,
  },
  confortPlus: {
    label: "VSP Version Confort Plus+",
    prix: 5990,
  },
} as const;

type VersionKey = keyof typeof versions;

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: {
        scale?: number;
        useCORS?: boolean;
        backgroundColor?: string;
      }
    ) => Promise<HTMLCanvasElement>;

    jspdf?: {
      jsPDF: new (
        orientation?: "p" | "portrait" | "l" | "landscape",
        unit?: string,
        format?: string
      ) => {
        addImage: (
          imageData: string,
          format: string,
          x: number,
          y: number,
          width: number,
          height: number
        ) => void;
        addPage: () => void;
        save: (filename: string) => void;
      };
    };
  }
}

export default function Facturation() {
  const [today] = useState(() =>
    new Date().toLocaleDateString("fr-FR")
  );

  const [invoiceNumber] = useState(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const uniqueNumber = String(Date.now()).slice(-6);

    return `FAC-${year}${month}${day}-${uniqueNumber}`;
  });

  const [version, setVersion] =
    useState<VersionKey>("confort");

  const [client, setClient] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: "",
  });

  const [departementLivraison, setDepartementLivraison] =
    useState("");

  const [quantity, setQuantity] = useState(1);

  const [noDelivery, setNoDelivery] = useState(false);

  const [manualTransport, setManualTransport] =
    useState("");

  const [wantsCarteGrise, setWantsCarteGrise] =
    useState(true);

  const [discount, setDiscount] = useState(0);

  const printRef = useRef<HTMLDivElement>(null);

  const prixVehicule = versions[version].prix;
  const fraisCarteGriseUnitaire = 150;

  const getTransportPrice = (departement: string) => {
    const dept = departement.trim();

    if (["31", "81", "82", "32", "09"].includes(dept)) {
      return 350;
    }

    if (
      [
        "11",
        "12",
        "46",
        "47",
        "33",
        "65",
        "66",
        "34",
        "30",
        "40",
        "24",
        "19",
        "87",
        "15",
      ].includes(dept)
    ) {
      return 490;
    }

    if (
      [
        "75",
        "77",
        "78",
        "91",
        "92",
        "93",
        "94",
        "95",
        "13",
        "69",
        "63",
        "16",
        "17",
        "86",
      ].includes(dept)
    ) {
      return 690;
    }

    if (
      [
        "44",
        "35",
        "56",
        "29",
        "22",
        "53",
        "49",
        "67",
        "68",
      ].includes(dept)
    ) {
      return 790;
    }

    return 790;
  };

  const codePostalNormalise = client.code_postal.replace(
    /\s/g,
    ""
  );

  const departementCalcule =
    departementLivraison ||
    codePostalNormalise.substring(0, 2);

  const tarifTransportAutomatique = getTransportPrice(
    departementCalcule
  );

  const transportPersonnalise =
    manualTransport.trim() !== ""
      ? Math.max(
          0,
          Number(manualTransport.replace(",", ".")) || 0
        )
      : null;

  const transport = noDelivery
    ? 0
    : transportPersonnalise !== null
      ? transportPersonnalise
      : tarifTransportAutomatique;

  const montantVehicules = prixVehicule * quantity;

  const montantCarteGrise = wantsCarteGrise
    ? fraisCarteGriseUnitaire * quantity
    : 0;

  const remiseAppliquee = Math.max(0, discount);

  const sousTotalTTC =
    montantVehicules + transport + montantCarteGrise;

  const totalTTC = Math.max(
    0,
    sousTotalTTC - remiseAppliquee
  );

  const totalHT = totalTTC / 1.2;
  const montantTVA = totalTTC - totalHT;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setClient((previousClient) => ({
      ...previousClient,
      [name]: value,
    }));

    if (name === "code_postal") {
      const normalizedPostalCode = value.replace(/\s/g, "");

      if (/^\d{5}$/.test(normalizedPostalCode)) {
        setDepartementLivraison(
          normalizedPostalCode.substring(0, 2)
        );
      }
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) {
      return;
    }

    const html2canvas = window.html2canvas;
    const JsPDF = window.jspdf?.jsPDF;

    if (!html2canvas || !JsPDF) {
      alert(
        "Le générateur PDF est encore en cours de chargement. Merci de réessayer dans quelques secondes."
      );

      return;
    }

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdfDocument = new JsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;

      const imgWidth = pageWidth;
      const imgHeight =
        (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdfDocument.addImage(
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

        pdfDocument.addPage();

        pdfDocument.addImage(
          imgData,
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pageHeight;
      }

      pdfDocument.save(`facture-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error(
        "Erreur pendant la création du PDF :",
        error
      );

      alert(
        "Une erreur est survenue pendant la création de la facture PDF."
      );
    }
  };

  return (
    <main style={container}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        strategy="afterInteractive"
      />

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
      />

      <h2 style={{ textAlign: "center" }}>
        Facturation NeoDrive
      </h2>

      <div style={intro}>
        <strong>Création de la facture finale</strong>

        <p style={{ marginBottom: 0 }}>
          Sélectionnez la version du véhicule, le transport,
          la carte grise et les éventuelles remises.
        </p>
      </div>

      <div style={section}>
        <h3>Véhicule</h3>

        <p style={label}>Version du véhicule</p>

        <select
          name="version"
          value={version}
          onChange={(event) =>
            setVersion(event.target.value as VersionKey)
          }
          style={input}
        >
          <option value="essentiel">
            Version Essentiel — 3 990 € TTC
          </option>

          <option value="confort">
            Version Confort — 4 990 € TTC
          </option>

          <option value="confortPlus">
            Version Confort Plus+ — 5 990 € TTC
          </option>
        </select>

        <p style={label}>Nombre de véhicules</p>

        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) =>
            setQuantity(
              Math.max(
                1,
                Math.floor(Number(event.target.value) || 1)
              )
            )
          }
          style={input}
        />
      </div>

      <div style={section}>
        <h3>Informations client</h3>

        <p style={label}>Nom</p>

        <input
          name="nom"
          value={client.nom}
          placeholder="Nom"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Prénom</p>

        <input
          name="prenom"
          value={client.prenom}
          placeholder="Prénom"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Téléphone</p>

        <input
          name="telephone"
          value={client.telephone}
          type="tel"
          placeholder="Téléphone"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Adresse e-mail</p>

        <input
          name="email"
          value={client.email}
          type="email"
          placeholder="Adresse e-mail"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Adresse</p>

        <input
          name="adresse"
          value={client.adresse}
          placeholder="Adresse"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Code postal</p>

        <input
          name="code_postal"
          value={client.code_postal}
          inputMode="numeric"
          maxLength={5}
          placeholder="Code postal"
          style={input}
          onChange={handleChange}
          required
        />

        <p style={label}>Ville</p>

        <input
          name="ville"
          value={client.ville}
          placeholder="Ville"
          style={input}
          onChange={handleChange}
          required
        />
      </div>

      <div style={section}>
        <h3>Livraison</h3>

        <p style={label}>Département de livraison</p>

        <select
          name="departement_livraison"
          style={input}
          value={departementLivraison}
          onChange={(event) =>
            setDepartementLivraison(event.target.value)
          }
          disabled={noDelivery}
        >
          <option value="">
            Sélectionner le département
          </option>

          <optgroup label="Zone 1 — 350 €">
            <option value="31">Haute-Garonne (31)</option>
            <option value="81">Tarn (81)</option>
            <option value="82">
              Tarn-et-Garonne (82)
            </option>
            <option value="32">Gers (32)</option>
            <option value="09">Ariège (09)</option>
          </optgroup>

          <optgroup label="Zone 2 — 490 €">
            <option value="11">Aude (11)</option>
            <option value="12">Aveyron (12)</option>
            <option value="46">Lot (46)</option>
            <option value="47">
              Lot-et-Garonne (47)
            </option>
            <option value="33">Gironde (33)</option>
            <option value="65">
              Hautes-Pyrénées (65)
            </option>
            <option value="66">
              Pyrénées-Orientales (66)
            </option>
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
            <option value="77">
              Seine-et-Marne (77)
            </option>
            <option value="78">Yvelines (78)</option>
            <option value="91">Essonne (91)</option>
            <option value="92">
              Hauts-de-Seine (92)
            </option>
            <option value="93">
              Seine-Saint-Denis (93)
            </option>
            <option value="94">
              Val-de-Marne (94)
            </option>
            <option value="95">Val-d’Oise (95)</option>
            <option value="13">
              Bouches-du-Rhône (13)
            </option>
            <option value="69">Rhône (69)</option>
            <option value="63">
              Puy-de-Dôme (63)
            </option>
            <option value="16">Charente (16)</option>
            <option value="17">
              Charente-Maritime (17)
            </option>
            <option value="86">Vienne (86)</option>
          </optgroup>

          <optgroup label="Zone 4 — 790 €">
            <option value="44">
              Loire-Atlantique (44)
            </option>
            <option value="35">
              Ille-et-Vilaine (35)
            </option>
            <option value="56">Morbihan (56)</option>
            <option value="29">Finistère (29)</option>
            <option value="22">
              Côtes-d’Armor (22)
            </option>
            <option value="53">Mayenne (53)</option>
            <option value="49">
              Maine-et-Loire (49)
            </option>
            <option value="67">Bas-Rhin (67)</option>
            <option value="68">Haut-Rhin (68)</option>
          </optgroup>
        </select>

        <p style={label}>Transport personnalisé</p>

        <input
          type="number"
          min="0"
          step="0.01"
          value={manualTransport}
          onChange={(event) =>
            setManualTransport(event.target.value)
          }
          style={input}
          disabled={noDelivery}
          placeholder={`Laisser vide pour appliquer le tarif automatique : ${tarifTransportAutomatique} €`}
        />

        <p style={helpText}>
          Lorsqu’un montant est saisi ici, il remplace le
          tarif automatique calculé selon le département.
        </p>

        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={noDelivery}
            onChange={(event) =>
              setNoDelivery(event.target.checked)
            }
          />

          <span>
            Retrait sur place — aucun frais de livraison
          </span>
        </label>
      </div>

      <div style={choiceBox}>
        <h3 style={{ marginTop: 0 }}>Carte grise</h3>

        <p style={helpText}>
          Les frais de carte grise et d’accompagnement sont de
          150 € par véhicule.
        </p>

        <label style={radioLabel}>
          <input
            type="radio"
            name="service_carte_grise"
            checked={wantsCarteGrise}
            onChange={() => setWantsCarteGrise(true)}
          />

          <span>
            Avec carte grise — 150 € par véhicule
          </span>
        </label>

        <label style={radioLabel}>
          <input
            type="radio"
            name="service_carte_grise"
            checked={!wantsCarteGrise}
            onChange={() => setWantsCarteGrise(false)}
          />

          <span>
            Sans carte grise — démarches réalisées par le
            client
          </span>
        </label>
      </div>

      <div style={section}>
        <p style={label}>Remise ou promotion</p>

        <input
          type="number"
          min="0"
          step="0.01"
          value={discount || ""}
          onChange={(event) =>
            setDiscount(
              Math.max(
                0,
                Number(event.target.value.replace(",", ".")) ||
                  0
              )
            )
          }
          style={input}
          placeholder="Montant de la remise en euros"
        />
      </div>

      <div ref={printRef} style={pdf}>
        <div style={invoiceHeader}>
          <div>
            <h2 style={{ marginBottom: 8 }}>NEODRIVE</h2>

            <p style={invoiceText}>MK HOLDING SAS</p>

            <p style={invoiceText}>
              SIREN : 908 645 393
            </p>

            <p style={invoiceText}>
              31 rue Jean Nougaro
            </p>

            <p style={invoiceText}>31600 Muret</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <h1 style={{ marginBottom: 8 }}>FACTURE</h1>

            <p style={invoiceText}>Date : {today}</p>

            <p style={invoiceText}>
              N° : {invoiceNumber}
            </p>
          </div>
        </div>

        <hr style={{ margin: "24px 0" }} />

        <div style={customerBox}>
          <h3 style={{ marginTop: 0 }}>Acheteur</h3>

          <p style={invoiceText}>
            {client.nom || "Nom"}{" "}
            {client.prenom || "Prénom"}
          </p>

          <p style={invoiceText}>
            {client.adresse || "Adresse"}
          </p>

          <p style={invoiceText}>
            {client.code_postal || "Code postal"}{" "}
            {client.ville || "Ville"}
          </p>

          <p style={invoiceText}>
            {client.telephone || "Téléphone"}
          </p>

          <p style={invoiceText}>
            {client.email || "Adresse e-mail"}
          </p>
        </div>

        <h3>Détail de la facture</h3>

        <table style={table}>
          <thead>
            <tr style={tableHeader}>
              <th style={descriptionCell}>
                Désignation
              </th>

              <th style={quantityCell}>Quantité</th>

              <th style={priceCell}>Prix unitaire</th>

              <th style={priceCell}>Total TTC</th>
            </tr>
          </thead>

          <tbody>
            <tr style={tableRow}>
              <td style={descriptionCell}>
                {versions[version].label}
              </td>

              <td style={quantityCell}>{quantity}</td>

              <td style={priceCell}>
                {formatPrice(prixVehicule)} €
              </td>

              <td style={priceCell}>
                {formatPrice(montantVehicules)} €
              </td>
            </tr>

            {!noDelivery && (
              <tr style={tableRow}>
                <td style={descriptionCell}>
                  Livraison du véhicule

                  <div style={lineDescription}>
                    {transportPersonnalise !== null
                      ? "Tarif de transport personnalisé"
                      : `Tarif calculé pour le département ${
                          departementCalcule ||
                          "non renseigné"
                        }`}
                  </div>
                </td>

                <td style={quantityCell}>1</td>

                <td style={priceCell}>
                  {formatPrice(transport)} €
                </td>

                <td style={priceCell}>
                  {formatPrice(transport)} €
                </td>
              </tr>
            )}

            {noDelivery && (
              <tr style={tableRow}>
                <td style={descriptionCell}>
                  Retrait sur place
                </td>

                <td style={quantityCell}>1</td>

                <td style={priceCell}>0,00 €</td>

                <td style={priceCell}>0,00 €</td>
              </tr>
            )}

            {wantsCarteGrise && (
              <tr style={tableRow}>
                <td style={descriptionCell}>
                  Frais de carte grise et accompagnement
                  administratif
                </td>

                <td style={quantityCell}>{quantity}</td>

                <td style={priceCell}>
                  {formatPrice(fraisCarteGriseUnitaire)} €
                </td>

                <td style={priceCell}>
                  {formatPrice(montantCarteGrise)} €
                </td>
              </tr>
            )}

            {!wantsCarteGrise && (
              <tr style={tableRow}>
                <td style={descriptionCell}>
                  Carte grise réalisée par le client
                </td>

                <td style={quantityCell}>—</td>

                <td style={priceCell}>0,00 €</td>

                <td style={priceCell}>0,00 €</td>
              </tr>
            )}

            {remiseAppliquee > 0 && (
              <tr style={tableRow}>
                <td style={descriptionCell}>
                  Remise commerciale
                </td>

                <td style={quantityCell}>1</td>

                <td style={priceCell}>
                  - {formatPrice(remiseAppliquee)} €
                </td>

                <td style={priceCell}>
                  - {formatPrice(remiseAppliquee)} €
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={totalsContainer}>
          <table style={totalsTable}>
            <tbody>
              <tr>
                <td style={totalsLabel}>Total HT</td>

                <td style={totalsAmount}>
                  {formatPrice(totalHT)} €
                </td>
              </tr>

              <tr>
                <td style={totalsLabel}>TVA 20 %</td>

                <td style={totalsAmount}>
                  {formatPrice(montantTVA)} €
                </td>
              </tr>

              <tr style={totalRow}>
                <td style={totalsLabel}>Total TTC</td>

                <td style={totalsAmount}>
                  {formatPrice(totalTTC)} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={bankBox}>
          <h3 style={{ marginTop: 0 }}>
            Coordonnées bancaires
          </h3>

          <p style={invoiceText}>
            <strong>Titulaire :</strong> MK HOLDING
          </p>

          <p style={invoiceText}>
            <strong>Banque :</strong> REVOLUT
          </p>

          <p style={invoiceText}>
            <strong>IBAN :</strong>{" "}
            FR76 2823 3000 0142 1307 1051 008
          </p>

          <p style={invoiceText}>
            <strong>BIC :</strong> REVOFRP2
          </p>

          <p style={invoiceText}>
            <strong>Devise :</strong> EUR
          </p>

          <p style={invoiceText}>
            <strong>Référence du virement :</strong>{" "}
            nom et prénom du client
          </p>
        </div>

        <div style={{ marginTop: 30 }}>
          <p style={invoiceText}>
            Le paiement peut être effectué par virement
            bancaire sur le compte indiqué ci-dessus.
          </p>

          <p style={invoiceText}>
            Merci d’indiquer le nom et le prénom du client
            dans le motif du virement.
          </p>

          <p style={invoiceText}>
            La livraison ou la remise du véhicule est
            effectuée après réception du règlement, selon les
            modalités convenues entre les parties.
          </p>

          <p style={{ marginTop: 25 }}>
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
  maxWidth: 900,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial, sans-serif",
};

const section: React.CSSProperties = {
  marginBottom: 25,
};

const intro: React.CSSProperties = {
  background: "#f7f7f7",
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: 16,
  marginBottom: 25,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 11,
  marginTop: 6,
  border: "1px solid #ccc",
  borderRadius: 5,
  background: "#fff",
};

const label: React.CSSProperties = {
  marginTop: 14,
  marginBottom: 2,
  fontWeight: "bold",
  fontSize: 14,
};

const helpText: React.CSSProperties = {
  fontSize: 12,
  color: "#555",
  lineHeight: 1.5,
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 15,
};

const choiceBox: React.CSSProperties = {
  marginTop: 20,
  marginBottom: 25,
  padding: 16,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#fafafa",
};

const radioLabel: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginTop: 12,
};

const pdf: React.CSSProperties = {
  background: "#fff",
  padding: 30,
  border: "1px solid #ddd",
  marginTop: 30,
  color: "#000",
};

const invoiceHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const invoiceText: React.CSSProperties = {
  marginTop: 5,
  marginBottom: 5,
  fontSize: 13,
  lineHeight: 1.4,
};

const customerBox: React.CSSProperties = {
  marginBottom: 25,
  padding: 15,
  background: "#f8f8f8",
  borderRadius: 6,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const tableHeader: React.CSSProperties = {
  background: "#f1f1f1",
  borderBottom: "2px solid #222",
};

const tableRow: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
};

const descriptionCell: React.CSSProperties = {
  padding: "12px 8px",
  textAlign: "left",
  verticalAlign: "top",
};

const quantityCell: React.CSSProperties = {
  padding: "12px 8px",
  textAlign: "center",
  verticalAlign: "top",
  width: 80,
};

const priceCell: React.CSSProperties = {
  padding: "12px 8px",
  textAlign: "right",
  verticalAlign: "top",
  width: 130,
};

const lineDescription: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "#555",
};

const totalsContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 25,
};

const totalsTable: React.CSSProperties = {
  width: 320,
  borderCollapse: "collapse",
};

const totalsLabel: React.CSSProperties = {
  padding: "8px 5px",
  fontWeight: "bold",
};

const totalsAmount: React.CSSProperties = {
  padding: "8px 5px",
  textAlign: "right",
};

const totalRow: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: 16,
  borderTop: "2px solid #000",
};

const bankBox: React.CSSProperties = {
  marginTop: 35,
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 6,
  background: "#fafafa",
};

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 13,
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: "bold",
};
