"use client";

import React, {
  useState,
  useEffect
} from "react";

export default function CRMPage() {

  const [leads, setLeads] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  /* SETTINGS */

  const senderEmail =
    "sales@easymicrodrive.com";

  const website =
    "https://easydrive-auto.fr";

  const videoLink =
    "https://youtube.com";

  /* LOAD SAVED DATA */

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "microdrive_leads"
      );

    if (saved) {

      setLeads(JSON.parse(saved));

    }

  }, []);

  /* SAVE DATA */

  useEffect(() => {

    localStorage.setItem(
      "microdrive_leads",
      JSON.stringify(leads)
    );

  }, [leads]);

  /* CSV IMPORT */

  const handleCSV = (e: any) => {

    const file =
      e.target.files[0];

    const reader =
      new FileReader();

    reader.onload =
      (event: any) => {

      const text =
        event.target.result;

      const rows =
        text.split("\n");

      const parsed =
        rows
        .slice(1)
        .map(
          (
            row: string,
            index: number
          ) => {

          const cols =
            row.split(",");

          return {

            id: index,

            date:
              cols[0] || "",

            annonce:
              cols[1] || "",

            nom:
              cols[3] || "",

            telephone:
              cols[4] || "",

            email:
              cols[5] || "",

            statut:
              "Nouveau",

            notes: "",

            history: []

          };

        });

      setLeads(parsed);

    };

    reader.readAsText(file);

  };

  /* UPDATE STATUS */

  const updateStatus = (
    id: number,
    status: string
  ) => {

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              statut: status
            }
          : lead
      )
    );

  };

  /* UPDATE NOTES */

  const updateNotes = (
    id: number,
    notes: string
  ) => {

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              notes
            }
          : lead
      )
    );

  };

  /* ADD HISTORY */

  const addHistory = (
    id: number,
    action: string
  ) => {

    setLeads((prev) =>
      prev.map((lead) => {

        if (
          lead.id === id
        ) {

          return {

            ...lead,

            history: [

              ...lead.history,

              {
                date:
                  new Date()
                  .toLocaleString(),

                action
              }

            ]

          };

        }

        return lead;

      })
    );

  };

  /* SEARCH */

  const filtered =
    leads.filter((lead) => {

    const text =
      `${lead.nom}
      ${lead.telephone}
      ${lead.annonce}`
      .toLowerCase();

    return text.includes(
      search.toLowerCase()
    );

  });

  return (

    <main style={container}>

      <h1 style={title}>
        Microdrive CRM
      </h1>

      <div style={topBar}>

        <input
          type="file"
          accept=".csv"
          onChange={handleCSV}
        />

        <input
          placeholder="Recherche..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          style={searchInput}
        />

      </div>

      <div
        style={{
          overflowX: "auto"
        }}
      >

        <table style={table}>

          <thead>

            <tr>

              <th style={th}>
                Date
              </th>

              <th style={th}>
                Nom
              </th>

              <th style={th}>
                Téléphone
              </th>

              <th style={th}>
                Email
              </th>

              <th style={th}>
                Annonce
              </th>

              <th style={th}>
                Statut
              </th>

              <th style={th}>
                Actions
              </th>

              <th style={th}>
                Notes
              </th>

              <th style={th}>
                Historique
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (lead) => {

              const cleanPhone =
                lead.telephone
                .replace(
                  /[^0-9]/g,
                  ""
                );

              const message =
`Bonjour ${lead.nom},

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

Nous livrons partout en France.

Découvrez notre site :
${website}

Vidéo du véhicule :
${videoLink}

N'hésitez pas à nous contacter.

Cordialement,
EasyMicrodrive

${senderEmail}`;

              const whatsappLink =
`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

              const smsLink =
`sms:${cleanPhone}?body=${encodeURIComponent(message)}`;

              const emailLink =
`mailto:${lead.email}?subject=${encodeURIComponent("EasyMicrodrive")}&body=${encodeURIComponent(message)}`;

              return (

                <tr
                  key={lead.id}
                >

                  <td style={td}>
                    {lead.date}
                  </td>

                  <td style={td}>
                    {lead.nom}
                  </td>

                  <td style={td}>
                    {
                      lead.telephone
                    }
                  </td>

                  <td style={td}>
                    {lead.email}
                  </td>

                  <td style={td}>
                    {lead.annonce}
                  </td>

                  <td style={td}>

                    <select
                      value={
                        lead.statut
                      }
                      onChange={(e) =>
                        updateStatus(
                          lead.id,
                          e.target.value
                        )
                      }
                    >

                      <option>
                        Nouveau
                      </option>

                      <option>
                        Contacté
                      </option>

                      <option>
                        Chaud
                      </option>

                      <option>
                        Livraison
                      </option>

                      <option>
                        Client
                      </option>

                      <option>
                        SAV
                      </option>

                      <option>
                        Perdu
                      </option>

                    </select>

                  </td>

                  <td style={td}>

                    <div
                      style={{
                        display:
                          "flex",

                        gap: 8,

                        flexWrap:
                          "wrap"
                      }}
                    >

                      <a
                        href={
                          whatsappLink
                        }
                        target="_blank"
                        style={waBtn}
                        onClick={() =>
                          addHistory(
                            lead.id,
                            "WhatsApp envoyé"
                          )
                        }
                      >
                        WhatsApp
                      </a>

                      <a
                        href={smsLink}
                        style={smsBtn}
                        onClick={() =>
                          addHistory(
                            lead.id,
                            "SMS envoyé"
                          )
                        }
                      >
                        SMS
                      </a>

                      <a
                        href={
                          emailLink
                        }
                        style={
                          emailBtn
                        }
                        onClick={() =>
                          addHistory(
                            lead.id,
                            "Email envoyé"
                          )
                        }
                      >
                        Email
                      </a>

                      <a
                        href={`tel:${cleanPhone}`}
                        style={
                          callBtn
                        }
                        onClick={() =>
                          addHistory(
                            lead.id,
                            "Appel"
                          )
                        }
                      >
                        Appeler
                      </a>

                    </div>

                  </td>

                  <td style={td}>

                    <textarea
                      value={
                        lead.notes
                      }
                      onChange={(e) =>
                        updateNotes(
                          lead.id,
                          e.target.value
                        )
                      }
                      style={
                        textarea
                      }
                    />

                  </td>

                  <td style={td}>

                    <div
                      style={{
                        maxHeight:
                          150,

                        overflowY:
                          "auto",

                        fontSize: 12
                      }}
                    >

                      {lead.history
                      ?.map(
                        (
                          item: any,
                          i: number
                        ) => (

                        <div
                          key={i}
                          style={{
                            marginBottom: 8
                          }}
                        >

                          <b>
                            {
                              item.date
                            }
                          </b>

                          <br />

                          {
                            item.action
                          }

                        </div>

                      ))}

                    </div>

                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>

    </main>

  );

}

/* STYLES */

const container:
React.CSSProperties = {

  padding: 20,

  fontFamily: "Arial"

};

const title:
React.CSSProperties = {

  fontSize: 50,

  marginBottom: 20

};

const topBar:
React.CSSProperties = {

  display: "flex",

  gap: 10,

  marginBottom: 20,

  flexWrap: "wrap"

};

const searchInput:
React.CSSProperties = {

  padding: 10,

  minWidth: 250,

  border:
    "1px solid #ccc",

  borderRadius: 6

};

const table:
React.CSSProperties = {

  width: "100%",

  borderCollapse:
    "collapse"

};

const th:
React.CSSProperties = {

  border:
    "1px solid #ddd",

  padding: 10,

  background: "#000",

  color: "white",

  textAlign: "left"

};

const td:
React.CSSProperties = {

  border:
    "1px solid #ddd",

  padding: 10,

  verticalAlign:
    "top"

};

const waBtn:
React.CSSProperties = {

  background:
    "#25D366",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none"

};

const smsBtn:
React.CSSProperties = {

  background:
    "#2563eb",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none"

};

const emailBtn:
React.CSSProperties = {

  background:
    "#ea4335",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none"

};

const callBtn:
React.CSSProperties = {

  background:
    "#000",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none"

};

const textarea:
React.CSSProperties = {

  width: 220,

  minHeight: 80

};
