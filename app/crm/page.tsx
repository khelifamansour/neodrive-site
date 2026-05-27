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

const supabaseUrl =
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co";

const supabaseKey =
  "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd";

const supabase =
  createClient(
    supabaseUrl,
    supabaseKey
  );

/* =========================
   PAGE
========================= */

export default function CRMPage() {

  /* =========================
     STATES
  ========================= */

  const [leads, setLeads] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =========================
     SETTINGS
  ========================= */

  const website =
    "https://easydrive-auto.fr";

  const videoLink =
    "https://youtube.com";

  /* =========================
     LOAD LEADS
  ========================= */

  useEffect(() => {

    loadLeads();

  }, []);

  const loadLeads =
  async () => {

    console.log(
      "Loading leads..."
    );

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

    if (error) {

      alert(
        "Erreur chargement : " +
        error.message
      );

      return;

    }

    setLeads(data || []);

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

    console.log(data);
    console.log(error);

    if (error) {

      alert(
        "Erreur : " +
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
  async (e: any) => {

    try {

      setLoading(true);

      const file =
        e.target.files[0];

      if (!file) {

        alert(
          "Aucun fichier"
        );

        return;

      }

      const text =
        await file.text();

      console.log(text);

      const rows =
        text.split("\n");

      console.log(rows);

      const parsed =
        rows
        .slice(1)
        .filter(
          (row) =>
            row.trim() !== ""
        )
        .map(
          (row) => {

          const cols =
            row.split(";");

          const nom =
            cols[3]
              ?.replace(/"/g, "")
              ?.trim() || "";

          const telephone =
            String(
              cols[4] || ""
            )
            .replace(/"/g, "")
            .trim();

          const email =
            cols[5]
              ?.replace(/"/g, "")
              ?.trim() || "";

          const annonce =
            cols[1]
              ?.replace(/"/g, "")
              ?.trim() || "";

          return {

            nom,

            telephone,

            email,

            annonce,

            statut:
              "Nouveau",

            tag: "",

            notes: "",

            assigned_to:
              "Mansour",

            selected:
              false

          };

        });

      console.log(parsed);

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

        return;

      }

      const {
        data,
        error
      } = await supabase
        .from("leads")
        .insert(parsed)
        .select();

      console.log(data);
      console.log(error);

      if (error) {

        alert(
          "Erreur insert : " +
          error.message
        );

        return;

      }

      alert(
        "Import réussi"
      );

      loadLeads();

    } catch (err: any) {

      console.log(err);

      alert(
        "Erreur : " +
        err.message
      );

    } finally {

      setLoading(false);

    }

  };

  /* =========================
     UPDATE LEAD
  ========================= */

  const updateLead =
  async (
    id: number,
    field: string,
    value: any
  ) => {

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

      alert(
        error.message
      );

      return;

    }

    loadLeads();

  };

  /* =========================
     DELETE LEAD
  ========================= */

  const deleteLead =
  async (
    id: number
  ) => {

    const ok =
      confirm(
        "Supprimer ce lead ?"
      );

    if (!ok) return;

    const {
      error
    } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) {

      alert(
        error.message
      );

      return;

    }

    loadLeads();

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
      ${lead.tag}
      ${lead.notes}
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
      filtered.map(
        (lead) => [

        lead.nom,

        lead.telephone,

        lead.email,

        lead.annonce,

        lead.statut,

        lead.tag,

        lead.notes

      ]);

    const csvContent =

`Nom;Téléphone;Email;Annonce;Statut;Tag;Notes
${rows
  .map((e) =>
    e.join(";")
  )
  .join("\n")}
`;

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
     BULK WHATSAPP
  ========================= */

  const sendBulkWhatsApp =
  () => {

    const selected =
      leads.filter(
        (lead) =>
          lead.selected
      );

    selected.forEach(
      (lead, index) => {

      const phone =
        String(
          lead.telephone || ""
        )
        .replace(
          /[^0-9]/g,
          ""
        );

      const message =
`Bonjour ${lead.nom},

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

${website}

Vidéo :
${videoLink}`;

      const url =
`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      setTimeout(() => {

        window.open(
          url,
          "_blank"
        );

      }, index * 800);

    });

  };

  /* =========================
     STATUS COLOR
  ========================= */

  const getStatusColor =
  (status: string) => {

    switch (status) {

      case "Chaud":
        return "#16a34a";

      case "Contacté":
        return "#2563eb";

      case "Client":
        return "#000";

      case "Livraison":
        return "#f97316";

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

        <button
          onClick={
            sendBulkWhatsApp
          }
          style={waBulkBtn}
        >
          WhatsApp groupé
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
                ✓
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
                Tag
              </th>

              <th style={th}>
                Assigné
              </th>

              <th style={th}>
                Actions
              </th>

              <th style={th}>
                Notes
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (lead) => {

              const phone =
                String(
                  lead.telephone || ""
                )
                .replace(
                  /[^0-9]/g,
                  ""
                );

              const whatsapp =
`https://wa.me/${phone}`;

              return (

                <tr
                  key={lead.id}
                >

                  <td style={td}>

                    <input
                      type="checkbox"
                      checked={
                        lead.selected ||
                        false
                      }
                      onChange={() =>
                        updateLead(
                          lead.id,
                          "selected",
                          !lead.selected
                        )
                      }
                    />

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

                    <input
                      value={
                        lead.tag || ""
                      }
                      onChange={(e) =>
                        updateLead(
                          lead.id,
                          "tag",
                          e.target.value
                        )
                      }
                      style={input}
                    />

                  </td>

                  <td style={td}>
                    {
                      lead.assigned_to
                    }
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
                          whatsapp
                        }
                        target="_blank"
                        style={waBtn}
                      >
                        WhatsApp
                      </a>

                      <a
                        href={`tel:${phone}`}
                        style={callBtn}
                      >
                        Appeler
                      </a>

                      <button
                        onClick={() =>
                          deleteLead(
                            lead.id
                          )
                        }
                        style={
                          deleteBtn
                        }
                      >
                        Supprimer
                      </button>

                    </div>

                  </td>

                  <td style={td}>

                    <textarea
                      value={
                        lead.notes || ""
                      }
                      onChange={(e) =>
                        updateLead(
                          lead.id,
                          "notes",
                          e.target.value
                        )
                      }
                      style={
                        textarea
                      }
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

/* =========================
   STYLES
========================= */

const container:
React.CSSProperties = {

  padding: 20,

  fontFamily:
    "Arial"

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

const input:
React.CSSProperties = {

  padding: 8,

  border:
    "1px solid #ccc",

  borderRadius: 6,

  width: 150

};

const exportBtn:
React.CSSProperties = {

  background: "#000",

  color: "white",

  border: "none",

  padding:
    "10px 15px",

  borderRadius: 6

};

const waBulkBtn:
React.CSSProperties = {

  background:
    "#25D366",

  color: "white",

  border: "none",

  padding:
    "10px 15px",

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

const callBtn:
React.CSSProperties = {

  background:
    "#000",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none",

  border: "none"

};

const deleteBtn:
React.CSSProperties = {

  background:
    "#dc2626",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  border: "none",

  cursor: "pointer"

};

const textarea:
React.CSSProperties = {

  width: 220,

  minHeight: 80

};
