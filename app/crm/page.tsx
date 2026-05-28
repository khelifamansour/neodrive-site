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

    const {
      data,
      error
    } = await supabase

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

    const {
      error
    } = await supabase

      .from("leads")

      .update({
        [field]: value
      })

      .eq("id", id);

    console.log(error);

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

  };

  /* =========================
     DELETE SELECTED
  ========================= */

  const deleteSelected =
  async () => {

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

    console.log(error);

    if (!error) {

      setSelected([]);

      loadLeads();

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

      const rows =
        text.split(/\r?\n/);

      const parsed =
        rows

        .slice(1)

        .filter(
          (row) =>
            row.trim() !== ""
        )

        .map((row) => {

          const cols =
            row.split(",");

          return {

            annonce:
              String(
                cols[1] || ""
              ).trim(),

            nom:
              String(
                cols[3] || ""
              ).trim(),

            telephone:
              String(
                cols[4] || ""
              ).trim(),

            email:
              String(
                cols[5] || ""
              ).trim(),

            statut:
              "Nouveau",

            phase:
              "À contacter",

            commentaire:
              "",

            historique:
              "",

            operateur:
              "",

            derniere_relance:
              "",

          };

        });

      console.log(parsed);

      const {
        error
      } = await supabase

        .from("leads")

        .insert(parsed);

      console.log(error);

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
              <th style={th}>Historique</th>
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

            })}

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
