
"use client";

import React, {
  useEffect,
  useState
} from "react";

import {
  createClient
} from "@supabase/supabase-js";

/* =========================
SUPABASE
========================= */

const supabase =
createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

/* =========================
PAGE
========================= */

export default function CRMPage() {

  const [leads, setLeads] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [selected, setSelected] =
    useState([]);

  /* =========================
     LOAD LEADS
  ========================= */

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

        if (!error && data) {

          setLeads(data);

        }

      } catch (err) {

        console.log(err);

      }

    };

  useEffect(() => {

    loadLeads();

  }, []);

  /* =========================
     UPDATE LEAD
  ========================= */

  const updateLead =
    async (
      id,
      field,
      value
    ) => {

      try {

        const {
          error
        } = await supabase

          .from("leads")

          .update({
            [field]: value
          })

          .eq("id", id);

        if (!error) {

          setLeads((prev) =>
            prev.map((lead) =>
              lead.id === id
                ? {
                    ...lead,
                    [field]: value
                  }
                : lead
            )
          );

        }

      } catch (err) {

        console.log(err);

      }

    };

  /* =========================
     DELETE SELECTED
  ========================= */

  const deleteSelected =
    async () => {

      try {

        const ok =
          confirm(
            "Supprimer les leads sélectionnés ?"
          );

        if (!ok) return;

        const {
          error
        } = await supabase

          .from("leads")

          .delete()

          .in("id", selected);

        if (!error) {

          setSelected([]);

          loadLeads();

        }

      } catch (err) {

        console.log(err);

      }

    };

  /* =========================
     BULK WHATSAPP
  ========================= */

  const bulkWhatsApp =
    () => {

      const leadsSelected =
        leads.filter(
          (lead) =>
            selected.includes(
              lead.id
            )
        );

      leadsSelected.forEach(
        (lead, index) => {

          const phone =
            String(
              lead.telephone || ""
            ).replace(
              /[^0-9+]/g,
              ""
            );

          setTimeout(() => {

            window.open(
              `https://wa.me/${phone}`,
              "_blank"
            );

          }, index * 500);

        });

    };

  /* =========================
     BULK EMAIL
  ========================= */

  const bulkEmail =
    () => {

      const emails =
        leads

          .filter(
            (lead) =>
              selected.includes(
                lead.id
              )
          )

          .map(
            (lead) =>
              lead.email
          )

          .join(",");

      window.location.href =
        `mailto:?bcc=${emails}`;

    };

  /* =========================
     IMPORT CSV
  ========================= */

  const handleCSV =
    async (e) => {

      try {

        setLoading(true);

        const file =
          e.target.files[0];

        if (!file) return;

        const text =
          await file.text();

        /* =========================
           SAFE CSV PARSER
        ========================= */

        const parseCSV = (csvText) => {

          const rows = [];

          let row = [];
          let current = "";

          let insideQuotes = false;

          for (
            let i = 0;
            i < csvText.length;
            i++
          ) {

            const char =
              csvText[i];

            const next =
              csvText[i + 1];

            if (char === '"') {

              if (
                insideQuotes &&
                next === '"'
              ) {

                current += '"';

                i++;

              } else {

                insideQuotes =
                  !insideQuotes;

              }

            }

            else if (
              char === "," &&
              !insideQuotes
            ) {

              row.push(current);

              current = "";

            }

            else if (
              (char === "\n" ||
                char === "\r") &&
              !insideQuotes
            ) {

              if (
                current !== "" ||
                row.length > 0
              ) {

                row.push(current);

                rows.push(row);

                row = [];
                current = "";

              }

              if (
                char === "\r" &&
                next === "\n"
              ) {

                i++;

              }

            }

            else {

              current += char;

            }

          }

          if (
            current !== "" ||
            row.length > 0
          ) {

            row.push(current);

            rows.push(row);

          }

          return rows;

        };

        /* =========================
           CLEAN
        ========================= */

        const clean = (value) => {

          if (!value) return "";

          return String(value)

            .replace(/\r/g, " ")

            .replace(/\n/g, " ")

            .replace(/\s+/g, " ")

            .replace(/^"|"$/g, "")

            .trim();

        };

        /* =========================
           PARSE FULL CSV
        ========================= */

        const rows =
          parseCSV(text)
            .filter(
              (row) =>
                row.length > 1
            );

        if (rows.length <= 1) {

          alert("CSV vide");

          return;

        }

        /* =========================
           HEADERS
        ========================= */

        const headers =

          rows[0].map((h) =>

            clean(h)

              .toLowerCase()

              .normalize("NFD")

              .replace(
                /[\u0300-\u036f]/g,
                ""
              )

          );

        /* =========================
           FIND COLUMN INDEX
        ========================= */

        const findIndex =
          (names) => {

            return headers.findIndex(
              (header) =>

                names.some(
                  (name) =>
                    header.includes(name)
                )

            );

          };

        const annonceIndex = 1;
const nomIndex = 3;
const telIndex = 4;
const emailIndex = 5;
const infoIndex = 7;
const messageIndex = 8;

        /* =========================
           BUILD LEADS
        ========================= */

        const parsed =

          rows

            .slice(1)

            .map((cols) => {

              return {

                annonce:
                  clean(
                    cols[annonceIndex]
                  ),

                nom:
                  clean(
                    cols[nomIndex]
                  ),

                telephone:
                  clean(
                    cols[telIndex]
                  ),

                email:
                  clean(
                    cols[emailIndex]
                  ),

                commentaire:
                  clean(
                    cols[infoIndex]
                  ),

                historique:
                  clean(
                    cols[messageIndex]
                  ),

                statut:
                  "Nouveau",

                phase:
                  "À contacter",

                operateur:
                  "",

                derniere_relance:
                  "",

              };

            })

            .filter(
              (lead) =>

                lead.nom ||

                lead.telephone ||

                lead.email
            );

        /* =========================
           INSERT SUPABASE
        ========================= */

        const {
          error
        } = await supabase

          .from("leads")

          .insert(parsed);

        if (error) {

          alert(error.message);

        } else {

          alert("Import OK");

          loadLeads();

        }

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);

      }

    };

  /* =========================
     SEARCH
  ========================= */

  const filtered =
    leads.filter((lead) => {

      const text =
        `
        ${lead.nom}
        ${lead.telephone}
        ${lead.email}
        ${lead.annonce}
        ${lead.commentaire}
        ${lead.historique}
        `
          .toLowerCase();

      return text.includes(
        search.toLowerCase()
      );

    });

  /* =========================
     EXPORT CSV
  ========================= */

  const exportCSV =
    () => {

      const rows =
        leads.map((lead) => [

          lead.nom,

          lead.telephone,

          lead.email,

          lead.annonce,

        ]);

      const csvContent =

        "Nom,Téléphone,Email,Annonce\n"

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
        "crm_export.csv";

      link.click();

    };

  /* =========================
     STATUS COLORS
  ========================= */

  const getStatusColor =
    (status) => {

      switch (status) {

        case "Chaud":
          return "#16a34a";

        case "Contacté":
          return "#2563eb";

        case "Réfléchit":
          return "#eab308";

        case "Livraison":
          return "#f97316";

        case "Client":
          return "#000";

        case "Perdu":
          return "#dc2626";

        default:
          return "#666";

      }

    };

  /* =========================
     RENDER
  ========================= */

  return (

    <main style={container}>

      <h1 style={title}>
        EasyMicrodrive CRM
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

        <button
          onClick={exportCSV}
          style={exportBtn}
        >
          Export CSV
        </button>

        <button
          onClick={bulkWhatsApp}
          style={waBtn}
        >
          WhatsApp groupé
        </button>

        <button
          onClick={bulkEmail}
          style={emailBtn}
        >
          Email groupé
        </button>

        <button
          onClick={deleteSelected}
          style={deleteBtn}
        >
          Supprimer sélection
        </button>

      </div>

      {loading && (
        <p>Chargement...</p>
      )}

      <div
        style={{
          overflowX: "auto"
        }}
      >

        <table style={table}>

          <thead>

            <tr>

              <th style={th}>✓</th>
              <th style={th}>Nom</th>
              <th style={th}>Téléphone</th>
              <th style={th}>Email</th>
              <th style={th}>Annonce</th>
              <th style={th}>Statut</th>
              <th style={th}>Phase</th>
              <th style={th}>Opérateur</th>
              <th style={th}>Commentaire</th>
              <th style={th}>Message client</th>
              <th style={th}>Actions</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (lead, index) => {

                const phone =
                  String(
                    lead.telephone || ""
                  ).replace(
                    /[^0-9+]/g,
                    ""
                  );

                return (

                  <tr
                    key={
                      lead.id || index
                    }
                  >

                    <td style={td}>

                      <input
                        type="checkbox"

                        checked={
                          selected.includes(
                            lead.id
                          )
                        }

                        onChange={(e) => {

                          if (e.target.checked) {

                            setSelected([
                              ...selected,
                              lead.id
                            ]);

                          } else {

                            setSelected(
                              selected.filter(
                                (id) =>
                                  id !== lead.id
                              )
                            );

                          }

                        }}
                      />

                    </td>

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

                      <select
                        value={
                          lead.statut || ""
                        }

                        onChange={(e) =>
                          updateLead(
                            lead.id,
                            "statut",
                            e.target.value
                          )
                        }

                        style={{
                          background:
                            getStatusColor(
                              lead.statut
                            ),

                          color:
                            "white",

                          padding: 8,

                          borderRadius: 6
                        }}
                      >

                        <option>Nouveau</option>
                        <option>Contacté</option>
                        <option>Chaud</option>
                        <option>Réfléchit</option>
                        <option>Livraison</option>
                        <option>Client</option>
                        <option>Perdu</option>

                      </select>

                    </td>

                    <td style={td}>

                      <select
                        value={
                          lead.phase || ""
                        }

                        onChange={(e) =>
                          updateLead(
                            lead.id,
                            "phase",
                            e.target.value
                          )
                        }
                      >

                        <option>
                          À contacter
                        </option>

                        <option>
                          Attente réponse
                        </option>

                        <option>
                          Réfléchit
                        </option>

                        <option>
                          Livraison
                        </option>

                      </select>

                    </td>

                    <td style={td}>

                      <input
                        value={
                          lead.operateur || ""
                        }

                        onChange={(e) =>
                          updateLead(
                            lead.id,
                            "operateur",
                            e.target.value
                          )
                        }

                        style={input}
                      />

                    </td>

                    <td style={td}>

                      <textarea
                        value={
                          lead.commentaire || ""
                        }

                        onChange={(e) =>
                          updateLead(
                            lead.id,
                            "commentaire",
                            e.target.value
                          )
                        }

                        style={textarea}
                      />

                    </td>

                    <td style={td}>

                      <textarea
                        value={
                          lead.historique || ""
                        }

                        onChange={(e) =>
                          updateLead(
                            lead.id,
                            "historique",
                            e.target.value
                          )
                        }

                        style={textarea}
                      />

                    </td>

                    <td style={td}>

                      <div
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: 8
                        }}
                      >

                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={waBtn}
                        >
                          WhatsApp
                        </a>

                        <a
                          href={`mailto:${lead.email || ""}`}
                          style={emailBtn}
                        >
                          Email
                        </a>

                        <a
                          href={`sms:${phone}`}
                          style={smsBtn}
                        >
                          SMS
                        </a>

                      </div>

                    </td>

                  </tr>

                );

              }
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

const container = {
  padding: 20,
  fontFamily: "Arial"
};

const title = {
  fontSize: 50,
  marginBottom: 20
};

const topBar = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap: "wrap"
};

const searchInput = {
  padding: 10,
  minWidth: 250,
  border: "1px solid #ccc",
  borderRadius: 6
};

const input = {
  padding: 8,
  width: 160
};

const textarea = {
  width: 220,
  minHeight: 80
};

const exportBtn = {
  background: "#000",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6
};

const deleteBtn = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  border: "1px solid #ddd",
  padding: 10,
  background: "#000",
  color: "white",
  textAlign: "left"
};

const td = {
  border: "1px solid #ddd",
  padding: 10,
  verticalAlign: "top"
};

const waBtn = {
  background: "#25D366",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center"
};

const emailBtn = {
  background: "#2563eb",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center"
};

const smsBtn = {
  background: "#f97316",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center"
};

