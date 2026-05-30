
"use client";

import React, { useState } from "react";

import { createClient } from "@supabase/supabase-js";

/* =========================
SUPABASE
========================= */

const supabase = createClient(
  "https://tzlsdjzcxdjaatcpwqwn.supabase.co",
  "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

/* =========================
PAGE
========================= */

export default function HiringPage() {

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({

    fullName: "",
    age: "",
    country: "",
    city: "",
    phone: "",
    whatsapp: "",
    email: "",

    bacType: "",
    bacYear: "",
    bacAverage: "",

    university: "",
    degree: "",

    englishLevel: "",
    frenchLevel: "",

    currentJob: "",
    yearsExperience: "",

    logic1: "",
    logic2: "",
    logic3: "",
    logic4: "",

    english1: "",
    english2: "",

    technicalReport: "",

    technicalExperience: ""

  });

  const [cvFile, setCvFile] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);

  const [transcriptFile, setTranscriptFile] = useState(null);
  const [motivationLetterFile, setMotivationLetterFile] = useState(null);

  /* =========================
     HANDLE CHANGE
  ========================= */

  const handleChange = (e) => {

    setForm({

      ...form,

      [e.target.name]:
        e.target.value

    });

  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      /* =========================
         SCORE
      ========================= */

      let score = 0;

      /* LOGIC */

      if (form.logic1 === "C")
        score += 10;

      if (form.logic2 === "B")
        score += 10;

      if (form.logic3 === "C")
        score += 10;

      if (form.logic4 === "C")
        score += 10;

      /* ENGLISH */

      if (form.english1 === "B")
        score += 10;

      if (form.english2 === "A")
        score += 10;

      /* EDUCATION */

      if (
        Number(form.bacAverage) >= 15
      )
        score += 10;

      /* REPORT */

      if (
        form.technicalReport.length > 500
      )
        score += 20;

      /* =========================
         EVALUATION
      ========================= */

      let evaluation = "";

      if (score < 40) {

        evaluation =
          "Rejected - Low competency";

      } else if (score < 60) {

        evaluation =
          "Average candidate";

      } else if (score < 80) {

        evaluation =
          "Interesting candidate";

      } else {

        evaluation =
          "High potential candidate";

      }

      /* =========================
         INSERT
      ========================= */

      const {
        data,
        error
      } = await supabase

        .from("candidates")

        .insert([{

          ...form,

          score,
          evaluation

        }])

        .select()

        .single();

      if (error) {

        alert(error.message);

        return;

      }

      const candidateId =
        data.id;

      /* =========================
         UPLOAD CV
      ========================= */

      if (cvFile) {

        const {
          error: cvError
        } = await supabase.storage

          .from("candidate-files")

          .upload(

            `cv/${candidateId}-${Date.now()}-${cvFile.name}`,

            cvFile

          );

        if (cvError) {

          alert(cvError.message);

        }

      }

      /* =========================
         UPLOAD PHOTO
      ========================= */

      if (photoFile) {

        const {
          error: photoError
        } = await supabase.storage

          .from("candidate-files")

          .upload(

            `photos/${candidateId}-${Date.now()}-${photoFile.name}`,

            photoFile

          );

        if (photoError) {

          alert(photoError.message);

        }

      }

      /* =========================
UPLOAD MOTIVATION LETTER
========================= */

if (motivationLetterFile) {

  const {
    error: motivationError
  } = await supabase.storage

    .from("candidate-files")

    .upload(

      `motivation-letters/${candidateId}-${Date.now()}-${motivationLetterFile.name}`,

      motivationLetterFile

    );

  if (motivationError) {

    alert(motivationError.message);

  }

}

      /* =========================
         UPLOAD TRANSCRIPT
      ========================= */

      if (transcriptFile) {

        const {
          error: transcriptError
        } = await supabase.storage

          .from("candidate-files")

          .upload(

            `transcripts/${candidateId}-${Date.now()}-${transcriptFile.name}`,

            transcriptFile

          );

        if (transcriptError) {

          alert(transcriptError.message);

        }

      }

      alert(
        `Application submitted successfully.\nScore: ${score}\nEvaluation: ${evaluation}`
      );

    } catch (err) {

      console.log(err);

      alert(JSON.stringify(err));

    } finally {

      setLoading(false);

    }

  };

  /* =========================
     RENDER
  ========================= */

  return (

    <main style={container}>

      <h1 style={title}>
        Microdrive Engineering Recruitment
      </h1>

      <form
        onSubmit={handleSubmit}
        style={formStyle}
      >

        <h2>Basic Information</h2>

        <input
          name="fullName"
          placeholder="Full name"
          onChange={handleChange}
          style={input}
          required
        />

        <input
          name="age"
          placeholder="Age"
          onChange={handleChange}
          style={input}
        />

        <input
          name="country"
          placeholder="Country"
          onChange={handleChange}
          style={input}
        />

        <input
          name="city"
          placeholder="City"
          onChange={handleChange}
          style={input}
        />

        <input
          name="phone"
          placeholder="Phone"
          onChange={handleChange}
          style={input}
        />

        <input
          name="whatsapp"
          placeholder="WhatsApp"
          onChange={handleChange}
          style={input}
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          style={input}
        />

        <h2>Education</h2>

        <input
          name="bacType"
          placeholder="Baccalaureate type"
          onChange={handleChange}
          style={input}
        />

        <input
          name="bacYear"
          placeholder="Baccalaureate year"
          onChange={handleChange}
          style={input}
        />

        <input
          name="bacAverage"
          placeholder="Baccalaureate average"
          onChange={handleChange}
          style={input}
        />

        <input
          name="university"
          placeholder="University"
          onChange={handleChange}
          style={input}
        />

        <input
          name="degree"
          placeholder="Degree"
          onChange={handleChange}
          style={input}
        />

        <h2>Languages</h2>

        <select
          name="englishLevel"
          onChange={handleChange}
          style={input}
        >

          <option>
            English level
          </option>

          <option>
            Beginner
          </option>

          <option>
            Intermediate
          </option>

          <option>
            Excellent
          </option>

        </select>

        <h2>Logic Test</h2>

        <p>
          A train travels 120 km in 1h30.
          What is its average speed?
        </p>

        <p>
          A) 60 km/h
          <br />
          B) 70 km/h
          <br />
          C) 80 km/h
          <br />
          D) 90 km/h
        </p>

        <input
          name="logic1"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <p>
          If all batteries are electric devices,
          and some electric devices are dangerous,
          can we conclude that all batteries are dangerous?
        </p>

        <p>
          A) Yes
          <br />
          B) No
        </p>

        <input
          name="logic2"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <p>
          What comes next?
          <br />
          2 - 6 - 12 - 20 - 30 - ?
        </p>

        <p>
          A) 36
          <br />
          B) 40
          <br />
          C) 42
          <br />
          D) 44
        </p>

        <input
          name="logic3"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <p>
          A machine produces 5 parts in 5 minutes.
          How many parts will 5 machines produce in 5 minutes?
        </p>

        <p>
          A) 5
          <br />
          B) 10
          <br />
          C) 25
          <br />
          D) 50
        </p>

        <input
          name="logic4"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <h2>English Test</h2>

        <p>
          Choose the correct sentence:
        </p>

        <p>
          A) He go to work yesterday
          <br />
          B) He went to work yesterday
          <br />
          C) He going to work yesterday
          <br />
          D) He gone to work yesterday
        </p>

        <input
          name="english1"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <p>
          What does voltage mean?
        </p>

        <p>
          A) Electrical pressure
          <br />
          B) Mechanical force
          <br />
          C) Battery weight
          <br />
          D) Motor speed
        </p>

        <input
          name="english2"
          placeholder="Answer"
          onChange={handleChange}
          style={input}
        />

        <h2>Technical Report</h2>

        <textarea
          name="technicalReport"
          placeholder="Explain how you would diagnose an electric vehicle that suddenly stops moving."
          onChange={handleChange}
          style={bigTextarea}
        />

        <h2>Technical Experience</h2>

        <textarea
          name="technicalExperience"
          placeholder="Describe EXACTLY something technical you built or repaired yourself."
          onChange={handleChange}
          style={bigTextarea}
        />

        <h2>Documents</h2>

        <label>CV PDF</label>

        <input
          type="file"
          onChange={(e) =>
            setCvFile(
              e.target.files[0]
            )
          }
        />

        

        <label>Photo</label>

        <input
          type="file"
          onChange={(e) =>
            setPhotoFile(
              e.target.files[0]
            )
          }
        />

        <label>Handwritten Motivation Letter</label>

<input
  type="file"
  onChange={(e) =>
    setMotivationLetterFile(
      e.target.files[0]
    )
  }
  required
/>

        <label>School transcripts</label>

        <input
          type="file"
          onChange={(e) =>
            setTranscriptFile(
              e.target.files[0]
            )
          }
        />

        <button
          type="submit"
          style={button}
        >

          {loading
            ? "Submitting..."
            : "Submit Application"}

        </button>

      </form>

    </main>

  );

}

/* =========================
STYLES
========================= */

const container = {
  padding: 30,
  maxWidth: 1000,
  margin: "0 auto",
  fontFamily: "Arial"
};

const title = {
  fontSize: 42,
  marginBottom: 30
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 15
};

const input = {
  padding: 12,
  border: "1px solid #ccc",
  borderRadius: 6
};

const bigTextarea = {
  padding: 12,
  border: "1px solid #ccc",
  borderRadius: 6,
  minHeight: 250
};

const button = {
  background: "#000",
  color: "white",
  padding: 18,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 20
};

