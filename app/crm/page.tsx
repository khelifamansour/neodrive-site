"use client";

import React, { useState } from "react";

export default function CRMPage() {

  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const handleCSV = (e: any) => {

    const file = e.target.files[0];

    const reader = new FileReader();

    reader.onload = (event: any) => {

      const text = event.target.result;

      const rows = text.split("\n");

      const parsed = rows
        .slice(1)
        .map((row: string, index: number) => {

          const cols = row.split(",");

          return {

            id: index,

            date: cols[0] || "",

            annonce: cols[1] || "",

            nom: cols[3] || "",

            telephone: cols[4] || "",

            statut: "Nouveau",

            notes: ""

          };

        });

      setLeads(parsed);

    };

    reader.readAsText(file);

  };

  const updateStatus = (
    id: number,
    status: string
  ) => {

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? { ...lead, statut: status }
          : lead
      )
    );

  };

  const updateNotes = (
    id: number,
    notes: string
  ) => {

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? { ...lead, notes }
          : lead
      )
    );

  };

  const filtered = leads.filter((lead) => {

    const text =
      `${lead.nom} ${lead.telephone} ${lead.annonce}`
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
            setSearch(e.target.value)
          }
          style={searchInput}
        />

      </div>

      <div style={{ overflowX: "auto" }}>

        <table style={table}>

          <thead>

            <tr>

              <th style={th}>Date</th>

              <th style={th}>Nom</th>

              <th style={th}>Téléphone</th>

              <th style={th}>Annonce</th>

              <th style={th}>Statut</th>

              <th style={th}>Actions</th>

              <th style={th}>Notes</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((lead) => {

              const whatsappMessage =
                `Bonjour, votre annonce m'intéresse. Est-elle toujours disponible ?`;

              const whatsappLink =
                `https://wa.me/${lead.telephone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

              return (

                <tr key={lead.id}>

                  <td style={td}>
                    {lead.date}
                  </td>

                  <td style={td}>
                    {lead.nom}
                  </td>

                  <td style={td}>
                    {lead.telephone}
                  </td>

                  <td style={td}>
                    {lead.annonce}
                  </td>

                  <td style={td}>

                    <select
                      value={lead.statut}
                      onChange={(e) =>
                        updateStatus(
                          lead.id,
                          e.target.value
                        )
                      }
                    >

                      <option>Nouveau</option>

                      <option>Contacté</option>

                      <option>Chaud</option>

                      <option>Livraison</option>

                      <option>Client</option>

                      <option>SAV</option>

                      <option>Perdu</option>

                    </select>

                  </td>

                  <td style={td}>

                    <div
                      style={{
                        display: "flex",
                        gap: 8
                      }}
                    >

                      <a
                        href={whatsappLink}
                        target="_blank"
                        style={waBtn}
                      >
                        WhatsApp
                      </a>

                      <a
                        href={`tel:${lead.telephone}`}
                        style={callBtn}
                      >
                        Appeler
                      </a>

                    </div>

                  </td>

                  <td style={td}>

                    <textarea
                      value={lead.notes}
                      onChange={(e) =>
                        updateNotes(
                          lead.id,
                          e.target.value
                        )
                      }
                      style={textarea}
                    />

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

const container: React.CSSProperties = {

  padding: 20,

  fontFamily: "Arial"

};

const title: React.CSSProperties = {

  fontSize: 40,

  marginBottom: 20

};

const topBar: React.CSSProperties = {

  display: "flex",

  gap: 10,

  marginBottom: 20,

  flexWrap: "wrap"

};

const searchInput: React.CSSProperties = {

  padding: 10,

  minWidth: 250,

  border: "1px solid #ccc",

  borderRadius: 6

};

const table: React.CSSProperties = {

  width: "100%",

  borderCollapse: "collapse"

};

const th: React.CSSProperties = {

  border: "1px solid #ddd",

  padding: 10,

  background: "#000",

  color: "white",

  textAlign: "left"

};

const td: React.CSSProperties = {

  border: "1px solid #ddd",

  padding: 10,

  verticalAlign: "top"

};

const waBtn: React.CSSProperties = {

  background: "#25D366",

  color: "white",

  padding: "8px 12px",

  borderRadius: 6,

  textDecoration: "none"

};

const callBtn: React.CSSProperties = {

  background: "#000",

  color: "white",

  padding: "8px 12px",

  borderRadius: 6,

  textDecoration: "none"

};

const textarea: React.CSSProperties = {

  width: 200,

  minHeight: 60

};
