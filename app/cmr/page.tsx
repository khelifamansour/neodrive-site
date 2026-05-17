"use client";

import React, {
  useState,
  useEffect
} from "react";

import { supabase }
from "@/lib/supabase";

type Lead = {
  id?: number;
  nom: string;
  telephone: string;
  email: string;
  annonce: string;
  statut: string;
};

export default function CRMPage() {

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [search, setSearch] =
    useState("");

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

    console.log(data);
    console.log(error);

    if (!error && data) {

      setLeads(data);

    }

  };

  const testSupabase =
  async () => {

    const { data, error } =
    await supabase
      .from("leads")
      .select("*");

    console.log(data);
    console.log(error);

    alert(
      "Check console F12"
    );

  };

  const handleCSV =
  async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload =
    async (
      event
    ) => {

      const text =
        event.target?.result as string;

      const rows =
        text.split("\n");

      const parsed: Lead[] =
        rows
        .slice(1)
        .map((row) => {

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
              "Nouveau",

          };

        })

        .filter(
          (
            lead: Lead
          ) => lead.nom
        );

      console.log(parsed);

      const { data, error } =
      await supabase
        .from("leads")
        .insert(parsed)
        .select();

      console.log(data);
      console.log(error);

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

  const filtered =
    leads.filter(
      (
        lead: Lead
      ) => {

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

    });

  const exportCSV = () => {

    const rows =
      leads.map((lead) => [

      lead.nom,

      lead.telephone,

      lead.email,

      lead.annonce,

      lead.statut,

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
          "text/csv;charset=utf-8;",
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

      </div>

      <div
        style={{
          overflowX: "auto",
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
                lead: Lead
              ) => (

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

const container: React.CSSProperties = {
  padding: 20,
  fontFamily: "Arial",
};

const title: React.CSSProperties = {
  fontSize: 50,
  marginBottom: 20,
};

const topBar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap: "wrap",
};

const searchInput: React.CSSProperties = {
  padding: 10,
  minWidth: 250,
  border: "1px solid #ccc",
  borderRadius: 6,
};

const exportBtn: React.CSSProperties = {
  background: "#000",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6,
};

const testBtn: React.CSSProperties = {
  padding: 10,
  marginBottom: 20,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: 10,
  background: "#000",
  color: "white",
  textAlign: "left",
};

const td: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: 10,
};
