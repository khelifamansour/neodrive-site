"use client";

import React, {
  useEffect,
  useState
} from "react";

import {
  createClient
} from "@supabase/supabase-js";

/* =========================================
   SUPABASE
========================================= */

const supabase = createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

/* =========================================
   PAGE
========================================= */

export default function CRMPage() {

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  /* =========================================
     LOAD LEADS
  ========================================= */

  const loadLeads = async () => {

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

      if (error) {

        console.log(error);
        return;

      }

      setLeads(data || []);

    } catch (err) {

      console.log(err);

    }

  };

  useEffect(() => {

    loadLeads();

  }, []);

  /* =========================================
     UPDATE LEAD
  ========================================= */

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

        if (error) {

          console.log(error);
          return;

        }

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

      } catch (err) {

        console.log(err);

      }

    };

  /* =========================================
     DELETE SELECTED
  ========================================= */

  const deleteSelected =
    async () => {

      try {

        const ok = confirm(
          "Supprimer les leads sélectionnés ?"
        );

        if (!ok) return;

        const {
          error
        } = await supabase

          .from("leads")

          .delete()

          .in("id", selected);

        if (error) {

          console.log(error);
          return;

        }

        setSelected([]);

        loadLeads();

      } catch (err) {

        console.log(err);

      }

    };

  /* =========================================
     BULK WHATSAPP
  ========================================= */

  const bulkWhatsApp = () => {

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
            /[^0-9]/g,
            ""
          );

        setTimeout(() => {

          window.open(
            `https://wa.me/${phone}`,
            "_blank"
          );

        }, index * 500);

      }
    );

  };

  /* =========================================
     BULK EMAIL
  ========================================= */

  const bulkEmail = () => {

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

        .filter(Boolean)

        .join(",");

    window.location.href =
      `mailto:?bcc=${emails}`;

  };

  /* =========================================
     SAFE CSV PARSER
  ========================================= */

  const parseCSVLine = (line) => {

    const result = [];

    let current = "";
    let insideQuotes = false;

    for (
      let i = 0;
      i < line.length;
      i++
    ) {

      const char = line[i];

      if (char === '"') {

        insideQuotes =
          !insideQuotes;

      }

      else if (
        char === "," &&
        !insideQuotes
      ) {

        result.push(current);

        current = "";

      }

      else {

        current += char;

      }

    }

    result.push(current);

    return result;

  };

  /* =========================================
     CLEAN VALUE
  ========================================= */

  const clean = (value) => {

    if (!value) return "";

    return String(value)

      .replace(/^"|"$/g, "")

      .replace(/\r/g, "")

      .replace(/\n/g, " ")

      .trim();

  };

  /* =========================================
     IMPORT CSV
  ========================================= */

  const handleCSV =
    async (e) => {

      try {

        setLoading(true);

        const file =
          e.target.files[0];

        if (!file) return;

        const text =
          await file.text();

        const rows =

          text

            .split(/\r?\n/)

            .filter(
              (row) =>
                row.trim() !== ""
            );

        if (rows.length <= 1) {

          alert("CSV vide");

          return;

        }

        /* =========================================
           HEADER
        ========================================= */

        const headers =

          parseCSVLine(rows[0])

            .map((h) =>

              clean(h)

                .toLowerCase()

                .normalize("NFD")

                .replace(
                  /[\u0300-\u036f]/g,
                  ""
                )

            );

        console.log(headers);

        /* =========================================
           FIND INDEX
        ========================================= */

        const getIndex =
          (possibleNames) => {

            return headers.findIndex(
              (header) =>

                possibleNames.some(
                  (name) =>
                    header.includes(name)
                )

            );

          };

        const annonceIndex =
          getIndex([
            "annonce",
            "reference",
            "titre"
          ]);

        const nomIndex =
          getIndex([
            "nom",
            "name"
          ]);

        const telIndex =
          getIndex([
            "telephone",
            "phone",
            "mobile"
          ]);

        const emailIndex =
          getIndex([
            "email",
            "mail"
          ]);

        const messageIndex =
          getIndex([
            "message",
            "memo"
          ]);

        const infoIndex =
          getIndex([
            "information",
            "infos"
          ]);

        console.log({
          annonceIndex,
          nomIndex,
          telIndex,
          emailIndex,
          messageIndex,
          infoIndex
        });

        /* =========================================
           BUILD LEADS
        ========================================= */

        const parsed =

          rows

            .slice(1)

            .map((row) => {

              const cols =
                parseCSVLine(row);

              const nom =
                clean(
                  cols[nomIndex]
                );

              const telephone =
                clean(
                  cols[telIndex]
                );

              const email =
                clean(
                  cols[emailIndex]
                );

              const annonce =
                clean(
                  cols[annonceIndex]
                );

              const infos =
                clean(
                  cols[infoIndex]
                );

              const message =
                clean(
                  cols[messageIndex]
                );

              return {

                nom,

                telephone,

                email,

                annonce,

                statut:
                  "Nouveau",

                phase:
                  "À contacter",

                commentaire:
                  infos || "",

                historique:
                  message || "",

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

        console.log(parsed);

        if (parsed.length === 0) {

          alert(
            "Aucune donnée trouvée"
          );

          return;

        }

        /* =========================================
           INSERT SUPABASE
        ========================================= */

        const {
          error
        } = await supabase

          .from("leads")

          .insert(parsed);

        if (error) {

          console.log(error);

          alert(error.message);

          return;

        }

        alert(
          `${parsed.length} leads importés`
        );

        loadLeads();

      } catch (err) {

        console.log(err);

        alert(
          "Erreur import CSV"
        );

      } finally {

        setLoading(false);

      }

    };

  /* =========================================
     SEARCH
  ========================================= */

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

  /* =========================================
     EXPORT CSV
  ========================================= */

  const exportCSV = () => {

    const headers = [

      "Nom",
      "Téléphone",
      "Email",
      "Annonce",
      "Statut",
      "Phase",
      "Commentaire",
      "Historique",
      "Opérateur"

    ];

    const rows =

      leads.map((lead) => [

        lead.nom || "",
        lead.telephone || "",
        lead.email || "",
        lead.annonce || "",
        lead.statut || "",
        lead.phase || "",
        lead.commentaire || "",
        lead.historique || "",
        lead.operateur || ""

      ]);

    const csvContent =

      headers.join(",")

      +

      "\n"

      +

      rows

        .map((e) =>

          e

            .map((v) =>

              `"${String(v).replace(/"/g, '""')}"`

            )

            .join(",")

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
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "crm_export.csv";

    link.click();

  };

  /* =========================================
     STATUS COLORS
  ========================================= */

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

  /* =========================================
     RENDER
  ========================================= */

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
              <th style={th}>
                Message initial client
              </th>
              <th style={th}>Actions</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (lead, index) => {

                const phone =

                  String(
                    lead.telephone || ""
                  )

                    .replace(
                      /[^0-9]/g,
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

                          if (
                            e.target.checked
                          ) {

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
                          Réfléchit
                        </option>

                        <option>
                          Livraison
                        </option>

                        <option>
                          Client
                        </option>

                        <option>
                          Perdu
                        </option>

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

/* =========================================
   STYLES
========================================= */

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
  width: 180
};

const textarea = {
  width: 260,
  minHeight: 120
};

const exportBtn = {
  background: "#000",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6,
  cursor: "pointer"
};

const deleteBtn = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6,
  cursor: "pointer"
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
  textAlign: "center",
  border: "none",
  cursor: "pointer
