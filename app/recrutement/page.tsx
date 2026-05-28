
"use client";

import React, {
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

export default function HiringPage() {

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({

      fullName: "",
      age: "",
      country: "",
      city: "",
      phone: "",
      whatsapp: "",
      email: "",

      bacType: "",
      bacYear: "",
      mathGrade: "",
      physicsGrade: "",
      englishGrade: "",

      university: "",
      degree: "",

      frenchLevel: "",
      englishLevel: "",
      

      currentJob: "",
      yearsExperience: "",
      previousCompanies: "",

      hobbies: "",
      sports: "",
      projects: "",

      logic1: "",
      logic2: "",
      logic3: "",

      motivation: ""

    });

  const [cvFile, setCvFile] =
    useState(null);

  const [photoFile, setPhotoFile] =
    useState(null);

  const [transcriptFile, setTranscriptFile] =
    useState(null);

  /* =========================
     HANDLE CHANGE
  ========================= */

  const handleChange =
    (e) => {

      setForm({

        ...form,

        [e.target.name]:
          e.target.value

      });

    };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      try {

        setLoading(true);

        /* =========================
           SCORE
        ========================= */

        let score = 0;

        if (
          Number(form.mathGrade) >= 15
        ) score += 20;

        if (
          Number(form.physicsGrade) >= 15
        ) score += 20;

        if (
          Number(form.englishGrade) >= 15
        ) score += 10;

        if (
          form.englishLevel === "Excellent"
        ) score += 10;

        if (
          form.logic1 === "42"
        ) score += 15;

        if (
          form.logic2 === "128"
        ) score += 15;

        if (
          form.logic3 === "256"
        ) score += 10;

        /* =========================
           INSERT CANDIDATE
        ========================= */

        const {
          data,
          error
        } = await supabase

          .from("candidates")

          .insert([{

            ...form,

            score

          }])

          .select()

          .single();

        console.log(data);
        console.log(error);

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

          console.log(cvError);

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

          console.log(photoError);

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

          console.log(transcriptError);

        }

        alert(
          "Application submitted successfully"
        );

      } catch (err) {

        console.log(err);

        alert(
          JSON.stringify(err)
        );

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
        Microdrive Hiring Platform
      </h1>

      <form
        onSubmit={handleSubmit}
        style={formStyle}
      >

        {/* BASIC */}

        <h2>
          Basic Information
        </h2>

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

        {/* EDUCATION */}

        <h2>
          Education
        </h2>

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
          name="mathGrade"
          placeholder="Math grade"
          onChange={handleChange}
          style={input}
        />

        <input
          name="physicsGrade"
          placeholder="Physics grade"
          onChange={handleChange}
          style={input}
        />

        <input
          name="englishGrade"
          placeholder="English grade"
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

        {/* LANGUAGES */}

        <h2>
          Languages
        </h2>

        <select
          name="frenchLevel"
          onChange={handleChange}
          style={input}
        >

          <option>
            French level
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

        {/* EXPERIENCE */}

        <h2>
          Experience
        </h2>

        <textarea
          name="currentJob"
          placeholder="Current job"
          onChange={handleChange}
          style={textarea}
        />

        <textarea
          name="previousCompanies"
          placeholder="Previous companies"
          onChange={handleChange}
          style={textarea}
        />

        <input
          name="yearsExperience"
          placeholder="Years of experience"
          onChange={handleChange}
          style={input}
        />

        {/* PERSONALITY */}

        <h2>
          Personality / Projects
        </h2>

        <textarea
          name="hobbies"
          placeholder="Hobbies"
          onChange={handleChange}
          style={textarea}
        />

        <textarea
          name="sports"
          placeholder="Sports"
          onChange={handleChange}
          style={textarea}
        />

        <textarea
          name="projects"
          placeholder="Projects built"
          onChange={handleChange}
          style={textarea}
        />

        {/* LOGIC TEST */}

        <h2>
          Logic Test
        </h2>

        <p>
          6 × 7 = ?
        </p>

        <input
          name="logic1"
          onChange={handleChange}
          style={input}
        />

        <p>
          2⁷ = ?
        </p>

        <input
          name="logic2"
          onChange={handleChange}
          style={input}
        />

        <p>
          16 × 16 = ?
        </p>

        <input
          name="logic3"
          onChange={handleChange}
          style={input}
        />

        {/* MOTIVATION */}

        <h2>
          Motivation
        </h2>

        <textarea
          name="motivation"
          placeholder="Why should we hire you?"
          onChange={handleChange}
          style={bigTextarea}
        />

        {/* FILES */}

        <h2>
          Documents
        </h2>

        <label>
          CV PDF
        </label>

        <input
          type="file"
          onChange={(e) =>
            setCvFile(
              e.target.files[0]
            )
          }
        />

        <label>
          Photo
        </label>

        <input
          type="file"
          onChange={(e) =>
            setPhotoFile(
              e.target.files[0]
            )
          }
        />

        <label>
          School transcripts
        </label>

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
  maxWidth: 900,
  margin: "0 auto",
  fontFamily: "Arial"
};

const title = {
  fontSize: 48,
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

const textarea = {
  padding: 12,
  border: "1px solid #ccc",
  borderRadius: 6,
  minHeight: 100
};

const bigTextarea = {
  padding: 12,
  border: "1px solid #ccc",
  borderRadius: 6,
  minHeight: 200
};

const button = {
  background: "#000",
  color: "white",
  padding: 15,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 18
};

