"use client";

import React, {
  useEffect,
  useState
} from "react";

import Papa from "papaparse";

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

  phase?: string;

  commentaire?: string;

  operateur?: string;

  derniere_relance?: string;

};

/* =========================
   PAGE
========================= */

export default function CRMPage() {

  /* =========================
     STATES
  ========================= */

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

      console.log(data);
      console.log(error);

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

    console.log(data);
    console.log(error);

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

      Papa.parse(file, {

        header: true,

        skipEmptyLines: true,

        complete: async (
          results: any
        ) => {

          console.log(results);

          const parsed:
          Lead[] = results.data

            .map((row: any) => {

              return {

                nom:
                  row["Nom"] ||
                  "",

                telephone:
                  row["Téléphone"] ||
                  "",

                email:
                  row["Email"] ||
                  "",

                annonce:
                  row["Annonce"] ||
                  "",

                statut:
                  "Nouveau",

                phase:
                  "À contacter",

                commentaire:
                  "",

                operateur:
                  "",

                derniere_relance:
                  "",

              };

            })

            .filter(
              (lead: Lead) =>
                lead.nom ||
                lead.telephone ||
                lead.email
            );

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

            setLoading(false);

            return;

          }

          const {
            error
          } = await supabase

            .from("leads")

            .insert(parsed);

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

          setLoading(false);

        }

      });

    } catch (err: any) {

      console.log(err);

      alert(
        err.message
      );

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
    value: string
  ) => {

    await supabase

      .from("leads")

      .update({
        [field]: value
      })

      .eq("id", id);

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
        ${lead.commentaire}
        ${lead.phase}
        ${lead.operateur}
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
      leads.map(
        (lead: Lead) => [

        lead.nom,

        lead.telephone,

        lead.email,

        lead.annonce,

        lead.statut,

        lead.phase,

        lead.commentaire,

      ]);

    const csvContent =

      "Nom,Téléphone,Email,Annonce,Statut,Phase,Commentaire\n"

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

              <th style={th}>
                Phase
              </th>

              <th style={th}>
                Opérateur
              </th>

              <th style={th}>
                Commentaire
              </th>

              <th style={th}>
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (
                lead: Lead,
                index: number
              ) => {

              const phone =
                lead.telephone
                ?.replace(
                  /[^0-9+]/g,
                  ""
                );

              const whatsapp =
`https://wa.me/${phone}`;

              const emailLink =
`mailto:${lead.email}`;

              const smsLink =
`sms:${phone}`;

              return (

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

                    <select

                      value={
                        lead.statut
                      }

                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
                          "statut",
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
                        Perdu
                      </option>

                      <option>
                        Client
                      </option>

                    </select>

                  </td>

                  <td style={td}>

                    <select

                      value={
                        lead.phase
                      }

                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
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
                        Relance
                      </option>

                      <option>
                        RDV
                      </option>

                      <option>
                        Livraison
                      </option>

                    </select>

                  </td>

                  <td style={td}>

                    <input

                      value={
                        lead.operateur ||
                        ""
                      }

                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
                          "operateur",
                          e.target.value
                        )
                      }

                      placeholder="Nom opérateur"

                      style={input}

                    />

                  </td>

                  <td style={td}>

                    <textarea

                      value={
                        lead.commentaire ||
                        ""
                      }

                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
                          "commentaire",
                          e.target.value
                        )
                      }

                      style={textarea}

                    />

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
                        href={
                          emailLink
                        }
                        style={emailBtn}
                      >
                        Email
                      </a>

                      <a
                        href={
                          smsLink
                        }
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

const input:
React.CSSProperties = {

  padding: 8,

  width: 150,

};

const textarea:
React.CSSProperties = {

  width: 220,

  minHeight: 80,

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

  verticalAlign:
    "top",

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
    "none",

};

const emailBtn:
React.CSSProperties = {

  background:
    "#2563eb",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none",

};

const smsBtn:
React.CSSProperties = {

  background:
    "#f97316",

  color: "white",

  padding:
    "8px 12px",

  borderRadius: 6,

  textDecoration:
    "none",

};
