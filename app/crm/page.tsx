ddddddddd"use client";

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

  const videoLink =
    "https://youtube.com";

  /* =========================
     LOAD LEADS CLOUD
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

    console.log(data);

    console.log(error);

    alert(
      "Supabase connecté"
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
            row: string,
            index: number
          ) => {

          const cols =
            row.split(",");

          return {

            nom:
              cols[3] || "",

            telephone:
              cols[4] || "",

            email:
              cols[5] || "",

            annonce:
              cols[1] || "",

            statut:
              "Nouveau",

            tag:
              "",

            notes:
              "",

            assigned_to:
              "Mansour"

          };

        });

      const { error } =
      await supabase
        .from("leads")
        .insert(parsed);

      if (!error) {

        loadLeads();

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
      ${lead.annonce}
      ${lead.tag}
      ${lead.notes}`
      .toLowerCase();

    return text.includes(
      search.toLowerCase()
    );

  });

  /* =========================
     UPDATE LEAD
  ========================= */

  const updateLead =
  async (
    id: number,
    field: string,
    value: string
  ) => {

    await supabase
      .from("leads")
      .update({
        [field]: value
      })
      .eq("id", id);

    loadLeads();

  };

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

      lead.statut,

      lead.tag,

      lead.notes

    ]);

    const csvContent =

      "Nom,Téléphone,Email,Annonce,Statut,Tag,Notes\n"

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
      .filter(
        (lead) =>
          lead.selected
      )
      .map(
        (lead) =>
          lead.email
      )
      .join(",");

    const message =
`Bonjour,

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

Découvrez notre site :
${website}

Vidéo :
${videoLink}

Cordialement,
EasyMicrodrive`;

    window.location.href =
`mailto:${senderEmail}?bcc=${emails}&subject=${encodeURIComponent("EasyMicrodrive")}&body=${encodeURIComponent(message)}`;

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

      const cleanPhone =
        lead.telephone
        ?.replace(
          /[^0-9]/g,
          ""
        );

      const message =
`Bonjour ${lead.nom},

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

${website}`;

      const link =
`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      setTimeout(() => {

        window.open(
          link,
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

      case "Client":
        return "#0f172a";

      case "Livraison":
        return "#f97316";

      case "Perdu":
        return "#dc2626";

      case "Contacté":
        return "#2563eb";

      default:
        return "#777";

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

        <button
          onClick={sendBulkWhatsApp}
          style={waBulkBtn}
        >
          WhatsApp groupé
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

              const cleanPhone =
                lead.telephone
                ?.replace(
                  /[^0-9]/g,
                  ""
                );

              const message =
`Bonjour ${lead.nom},

Merci pour votre intérêt concernant nos véhicules électriques sans permis EasyMicrodrive.

Découvrez notre site :
${website}

Vidéo :
${videoLink}`;

              const whatsappLink =
`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

              const emailLink =
`mailto:${lead.email}?subject=${encodeURIComponent("EasyMicrodrive")}&body=${encodeURIComponent(message)}`;

              return (

                <tr
                  key={lead.id}
                >

                  <td style={td}>

                    <input
                      type="checkbox"
                      checked={
                        lead.selected || false
                      }
                      onChange={async () => {

                        await supabase
                          .from("leads")
                          .update({
                            selected:
                            !lead.selected
                          })
                          .eq(
                            "id",
                            lead.id
                          );

                        loadLeads();

                      }}
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

                        padding: 6,

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
                      placeholder="Paris / SAV / Batterie"
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
                          whatsappLink
                        }
                        target="_blank"
                        style={waBtn}
                      >
                        WhatsApp
                      </a>

                      <a
                        href={
                          emailLink
                        }
                        style={
                          emailBtn
                        }
                      >
                        Email
                      </a>

                      <a
                        href={`tel:${cleanPhone}`}
                        style={
                          callBtn
                        }
                      >
                        Appeler
                      </a>

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

const input:
React.CSSProperties = {

  padding: 8,

  border:
    "1px solid #ccc",

  borderRadius: 6,

  width: 160

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

const waBulkBtn:
React.CSSProperties = {

  background: "#25D366",

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
