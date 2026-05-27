"use client";

import React, {
  useEffect,
  useState
} from "react";

import { supabase }
from "@/lib/supabase";

/* =========================
   TYPES
========================= */

type Lead = {
  id?: number;
  nom: string;
  telephone: string;
  email: string;
  annonce: string;
  statut: string;
};

/* =========================
   PAGE
========================= */

export default function CRMPage() {

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =========================
     LOAD LEADS
  ========================= */

  useEffect(() => {

    loadLeads();

  }, []);

  const loadLeads =
  async () => {

    try {

      const {
        data,
        error
      } = await supabase

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

      if (error) {

        alert(
          error.message
        );

        return;

      }

      setLeads(
        (data || []) as Lead[]
      );

    } catch (err: any) {

      console.log(err);

      alert(
        err.message
      );

    }

  };

  /* =========================
     TEST SUPABASE
  ========================= */

  const testSupabase =
  async () => {

    const {
      data,
      error
    } = await supabase

      .from("leads")

      .select("*")

      .limit(1);

    console.log(
      "SUPABASE DATA",
      data
    );

    console.log(
      "SUPABASE ERROR",
      error
    );

    if (error) {

      alert(
        error.message
      );

    } else {

      alert(
        "Supabase connecté"
      );

    }

  };

  /* =========================
     IMPORT CSV
  ========================= */

  const handleCSV =
  async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    try {

      setLoading(true);

      const file =
        e.target.files?.[0];

      if (!file) {

        alert(
          "Aucun fichier"
        );

        setLoading(false);

        return;

      }

      /* =========================
         READ FILE
      ========================= */

      const text =
        await file.text();

      console.log(text);

      /* =========================
         SPLIT ROWS
      ========================= */

      const rows =
        text.split(/\r?\n/);

      console.log(rows);

      /* =========================
         PARSE CSV
      ========================= */

      const parsed:
      Lead[] = rows

        .slice(1)

        .filter(
          (row: string) =>
            row.trim() !== ""
        )

        .map(
          (row: string) => {

            /* =========================
               SIMPLE SAFE CSV PARSER
            ========================= */

            const cols =
              row.match(
                /(".*?"|[^",]+)(?=\s*,|\s*$)/g
              ) || [];

            return {

              nom:
                String(
                  cols[3] || ""
                )
                .replace(/"/g, "")
                .trim(),

              telephone:
                String(
                  cols[4] || ""
                )
                .replace(/"/g, "")
                .trim(),

              email:
                String(
                  cols[5] || ""
                )
                .replace(/"/g, "")
                .trim(),

              annonce:
                String(
                  cols[1] || ""
                )
                .replace(/"/g, "")
                .trim(),

              statut:
                "Nouveau",

            };

          }
        )

        .filter(
          (lead: Lead) =>
            lead.nom ||
            lead.telephone ||
            lead.email
        );

      console.log(
        "PARSED CSV",
        parsed
      );

      alert(
        parsed.length +
        " contacts détectés"
      );

      if (
        parsed.length === 0
      ) {

        alert(
          "Aucun contact trouvé"
        );

        setLoading(false);

        return;

      }

      /* =========================
         INSERT SUPABASE
      ========================= */

      const {
        data,
        error
      } = await supabase

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

      if (error) {

        alert(
          "Erreur import : " +
          error.message
        );

      } else {

        alert(
          "Import OK"
        );

        loadLeads();

      }

    } catch (err: any) {

      console.log(err);

      alert(
        err.message
      );

    } finally {

      setLoading(false);

    }

  };

  /* =========================
     SEARCH
  ========================= */

  const filtered =
    leads.filter(
      (lead: Lead) => {

        const text =
          `
          ${lead.nom}
          ${lead.telephone}
          ${lead.email}
          ${lead.annonce}
          `
          .toLowerCase();

        return text.includes(
          search.toLowerCase()
        );

      }
    );

  /* =========================
     EXPORT CSV
  ========================= */

  const exportCSV =
  () => {

    const rows =
      leads.map(
        (lead: Lead) => [

          lead.nom,

          lead.telephone,

          lead.email,

          lead.annonce,

          lead.statut,

        ]
      );

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
     RENDER
  ========================= */

  return (

    <main style={container}>

      <h1 style={title}>
        EasyMicrodrive CRM
      </h1>

      <button
        onClick={
          testSupabase
        }
        style={testBtn}
      >
        TEST SUPABASE
      </button>

      <div style={topBar}>

        <input
          type="file"
          accept=".csv"
          onChange={
            handleCSV
          }
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
          onClick={
            exportCSV
          }
          style={exportBtn}
        >
          Export CSV
        </button>

      </div>

      {loading && (

        <p>
          Chargement...
        </p>

      )}

      <div
        style={{
          overflowX:
            "auto"
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
              (
                lead: Lead,
                index: number
              ) => (

                <tr
                  key={
                    lead.id ||
                    index
                  }
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

  fontFamily:
    "Arial",

};

const title:
React.CSSProperties = {

  fontSize: 50,

  marginBottom: 20,

};

const topBar:
React.CSSProperties = {

  display: "flex",

  gap: 10,

  marginBottom: 20,

  flexWrap: "wrap",

};

const searchInput:
React.CSSProperties = {

  padding: 10,

  minWidth: 250,

  border:
    "1px solid #ccc",

  borderRadius: 6,

};

const exportBtn:
React.CSSProperties = {

  background: "#000",

  color: "white",

  border: "none",

  padding:
    "10px 15px",

  borderRadius: 6,

};

const testBtn:
React.CSSProperties = {

  padding: 10,

  marginBottom: 20,

};

const table:
React.CSSProperties = {

  width: "100%",

  borderCollapse:
    "collapse",

};

const th:
React.CSSProperties = {

  border:
    "1px solid #ddd",

  padding: 10,

  background: "#000",

  color: "white",

  textAlign: "left",

};

const td:
React.CSSProperties = {

  border:
    "1px solid #ddd",

  padding: 10,

};
