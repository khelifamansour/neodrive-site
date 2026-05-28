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

      /* =========================
         QUOTES
      ========================= */

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

      /* =========================
         COLUMN
      ========================= */

      else if (
        char === "," &&
        !insideQuotes
      ) {

        row.push(current);

        current = "";

      }

      /* =========================
         NEW LINE
      ========================= */

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

      /* =========================
         NORMAL CHAR
      ========================= */

      else {

        current += char;

      }

    }

    /* =========================
       LAST VALUE
    ========================= */

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

  const csv =
    parseCSV(text);

  if (csv.length <= 1) {

    alert("CSV vide");

    return;

  }

  /* =========================
     HEADERS
  ========================= */

  const headers =

    csv[0].map((h) =>

      clean(h)

        .toLowerCase()

        .normalize("NFD")

        .replace(
          /[\u0300-\u036f]/g,
          ""
        )

    );

  console.log(headers);

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

  const annonceIndex =
    findIndex([
      "annonce"
    ]);

  const nomIndex =
    findIndex([
      "nom"
    ]);

  const telIndex =
    findIndex([
      "telephone"
    ]);

  const emailIndex =
    findIndex([
      "email"
    ]);

  const infoIndex =
    findIndex([
      "information"
    ]);

  const messageIndex =
    findIndex([
      "message"
    ]);

  console.log({
    annonceIndex,
    nomIndex,
    telIndex,
    emailIndex,
    infoIndex,
    messageIndex
  });

  /* =========================
     BUILD LEADS
  ========================= */

  const parsed =

    csv

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
            ""

        };

      })

      .filter(
        (lead) =>

          lead.nom ||

          lead.telephone ||

          lead.email
      );

  console.log(parsed);

  /* =========================
     INSERT SUPABASE
  ========================= */

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
