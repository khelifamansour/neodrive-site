"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id?: number;
  nom?: string;
  telephone?: string;
  email?: string;
  annonce?: string;
  statut?: string;
  phase?: string;
  commentaire?: string;
  historique?: string;
  operateur?: string;
  derniere_relance?: string;
};

export default function CRMPage() {

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    loadLeads();

  }, []);

  const loadLeads = async () => {

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

  const updateLead = async (
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

  const handleCSV = async (
    e: any
  ) => {

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
          (row: string) =>
            row.trim() !== ""
        )

        .map((row: string) => {

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

      const { error } =
        await supabase
          .from("leads")
          .insert(parsed);

      console.log(error);

      if (error) {

        alert(error.message);

      } else {

        alert(
          "Import OK"
        );

        loadLeads();

      }

    } catch (err: any) {

      console.log(err);

      alert(err.message);

    } finally {

      setLoading(false);

    }

  };

  const filtered =
    leads.filter((lead) => {

      const text =
        `
        ${lead.nom}
        ${lead.telephone}
        ${lead.email}
        ${lead.annonce}
        ${lead.commentaire}
        ${lead.phase}
        ${lead.operateur}
        ${lead.historique}
        `
        .toLowerCase();

      return text.includes(
        search.toLowerCase()
      );

    });

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

      </div>

      {loading && (

        <p>
          Chargement...
        </p>

      )}

      <div
        style={{
          overflowX: "auto"
        }}
      >

        <table style={table}>

          <thead>

            <tr>

              <th style={th}>Nom</th>

              <th style={th}>Téléphone</th>

              <th style={th}>Email</th>

              <th style={th}>Annonce</th>

              <th style={th}>Statut</th>

              <th style={th}>Phase</th>

              <th style={th}>Opérateur</th>

              <th style={th}>Commentaire</th>

              <th style={th}>Historique</th>

              <th style={th}>Relance</th>

              <th style={th}>Actions</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (
                lead,
                index
              ) => {

              const phone =
                String(
                  lead.telephone || ""
                ).replace(
                  /[^0-9+]/g,
                  ""
                );

              const whatsapp =
                `https://wa.me/${phone}`;

              const emailLink =
                `mailto:${lead.email || ""}`;

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
                        lead.statut || ""
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
                        lead.operateur || ""
                      }
                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
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
                          lead.id || 0,
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
                          lead.id || 0,
                          "historique",
                          e.target.value
                        )
                      }
                      style={textarea}
                    />

                  </td>

                  <td style={td}>

                    <input
                      value={
                        lead.derniere_relance || ""
                      }
                      onChange={(e) =>
                        updateLead(
                          lead.id || 0,
                          "derniere_relance",
                          e.target.value
                        )
                      }
                      style={input}
                    />

                  </td>

                  <td style={td}>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >

                      <a
                        href={whatsapp}
                        target="_blank"
                        style={waBtn}
                      >
                        WhatsApp
                      </a>

                      <a
                        href={emailLink}
                        style={emailBtn}
                      >
                        Email
                      </a>

                      <a
                        href={smsLink}
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
  flexWrap: "wrap" as const
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

const table = {
  width: "100%",
  borderCollapse: "collapse" as const
};

const th = {
  border: "1px solid #ddd",
  padding: 10,
  background: "#000",
  color: "white",
  textAlign: "left" as const
};

const td = {
  border: "1px solid #ddd",
  padding: 10,
  verticalAlign: "top" as const
};

const testBtn = {
  padding: 10,
  marginBottom: 20
};

const exportBtn = {
  background: "#000",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: 6
};

const waBtn = {
  background: "#25D366",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center" as const
};

const emailBtn = {
  background: "#2563eb",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center" as const
};

const smsBtn = {
  background: "#f97316",
  color: "white",
  padding: "8px 12px",
  borderRadius: 6,
  textDecoration: "none",
  textAlign: "center" as const
};
