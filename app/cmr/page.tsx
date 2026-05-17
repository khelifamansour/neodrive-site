"use client";

import React, {
  useState,
  useEffect
} from "react";

import { supabase }
from "@/lib/supabase";

export default function CRMPage() {

  /* =========================
     STATES
  ========================= */

  const [leads, setLeads] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  /* =========================
     SETTINGS
  ========================= */

  const senderEmail =
    "sales@easymicrodrive.com";

  const website =
    "https://easydrive-auto.fr";

  /* =========================
     LOAD LEADS
  ========================= */

  useEffect(() => {

    loadLeads();

  }, []);

  const loadLeads =
  async () => {

    const { data, error } =
    await supabase
      .from("leads")
      .select("*")
      .order("id", {
        ascending: false
      });

    console.log(
      "LOAD DATA",
      data
    );

    console.log(
      "LOAD ERROR",
      error
    );

    if (!error && data) {

      setLeads(data);

    }

  };

  /* =========================
     TEST SUPABASE
  ========================= */

  const testSupabase =
  async () => {

    const { data, error } =
    await supabase
      .from("leads")
      .select("*");

    console.log(
      "SUPABASE DATA",
      data
    );

    console.log(
      "SUPABASE ERROR",
      error
    );

    alert(
      "Check console F12"
    );

  };

  /* =========================
     IMPORT CSV
  ========================= */

  const handleCSV = async (
    e: any
  ) => {

    const file =
      e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload =
    async (
      event: any
    ) => {

      const text =
        event.target.result;

      const rows =
        text.split("\n");

      const parsed =
        rows
        .slice(1)
        .map(
          (
            row: string
          ) => {

          const cols =
            row.split(",");

          return {

            nom:
              cols[3]?.trim() || "",

            telephone:
              cols[4]?.trim() || "",

            email:
              cols[5]?.trim() || "",

            annonce:
              cols[1]?.trim() || "",

            statut:
              "Nouveau"

          };

        })

        .filter(
          (lead) =>
            lead.nom
        );

      console.log(
        "PARSED",
        parsed
      );

      const { data, error } =
      await supabase
        .from("leads")
        .insert(parsed)
        .select();

      console.log(
        "INSERT DATA",
        data
      );

      console.log(
        "INSERT ERROR",
        error
      );

      if (!error) {

        alert(
          "Import OK"
        );

        loadLeads();

      } else {

        alert(
          "Erreur import"
        );

      }

    };

    reader.readAsText(file);

  };

  /* =========================
     SEARCH
  ========================= */

  const filtered =
    leads.filter((lead) => {

    const text =
      `${lead.nom}
      ${lead.telephone}
      ${lead.email}
      ${lead.annonce}`
      .toLowerCase();

    return text.includes(
      search.toLowerCase()
    );

  });

  /* =========================
     EXPORT CSV
  ========================= */

  const exportCSV = () => {

    const rows =
      leads.map((lead) => [

      lead.nom,

      lead.telephone,

      lead.email,

      lead.annonce,

      lead.statut

    ]);

    const csvContent =

      "Nom,Téléphone,Email,Annonce,Statut\n"

      +

      rows
      .map((e) =>
        e.join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [csvContent],
        {
          type:
          "text/csv;charset=utf-8;"
        }
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "microdrive_crm.csv";

    link.click();

  };

  /* =========================
     BULK EMAIL
  ========================= */

  const sendBulkEmail =
  () => {

    const emails =
      leads
      .map(
        (lead) =>
          lead.email
      )
      .join(",");

    const message =
`Bonjour,

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

${website}

Cordialement,
EasyMicrodrive`;

    window.location.href =
`mailto:${senderEmail}?bcc=${emails}&subject=${encodeURIComponent("EasyMicrodrive")}&body=${encodeURIComponent(message)}`;

  };

  /* =========================
     RENDER
  ========================= */

  return (

    <main style={container}>

      <h1 style={title}>
        EasyMicrodrive CRM
      </h1>

      <button
        onClick={testSupabase}
        style={testBtn}
      >
        TEST SUPABASE
      </button>

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

        <button
          onClick={exportCSV}
          style={exportBtn}
        >
          Export CSV
        </button>

        <button
          onClick={sendBulkEmail}
          style={bulkBtn}
        >
          Email groupé
        </button>

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

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (lead) => (

                <tr
                  key={lead.id}
                >

                  <td style={td}>
                    {lead.nom}
                  </td>

                  <td style={td}>
                    {lead.telephone}
                  </td>

                  <td style={td}>
                    {lead.email}
                  </td>

                  <td style={td}>
                    {lead.annonce}
                  </td>

                  <td style={td}>
                    {lead.statut}
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </main>

  );

}

/* =========================
   STYLES
========================= */

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

const exportBtn:
React.CSSProperties = {

  background: "#000",

  color: "white",

  border: "none",

  padding: "10px 15px",

  borderRadius: 6

};

const bulkBtn:
React.CSSProperties = {

  background: "#2563eb",

  color: "white",

  border: "none",

  padding: "10px 15px",

  borderRadius: 6

};

const testBtn:
React.CSSProperties = {

  padding: 10,

  marginBottom: 20

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

  padding: 10

};
