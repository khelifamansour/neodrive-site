
"use client";


import React, {
  useState,
  useEffect
} from "react";

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
  const EXAM_DURATION = 60 * 60;

const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);

const [examFinished, setExamFinished] = useState(false);
  const [questions, setQuestions] = useState([]);
const [answers, setAnswers] = useState({});
const [score, setScore] = useState(null);

const [logicScore, setLogicScore] = useState(0);
const [frenchScore, setFrenchScore] = useState(0);
const [englishScore, setEnglishScore] = useState(0);

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
    bacfrench: "",
bacenglish: "",
bacmath: "",
bacphysics: "",
bachistory: "",


    university: "",
    degree: "",

    englishLevel: "",
    frenchLevel: "",

    currentJob: "",
    yearsexperience: "",
    experiencecompany: "",
experienceMission: "",


   
    technicalReport: "",

    technicalExperience: ""

  });

  const [cvFile, setCvFile] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);

  const [transcriptFile, setTranscriptFile] = useState(null);
  const [motivationLetterFile, setMotivationLetterFile] = useState(null);

  useEffect(() => {

  if (examFinished) return;

  const timer = setInterval(() => {

    setTimeLeft(prev => {

      if (prev <= 1) {

        clearInterval(timer);

        setExamFinished(true);

        return 0;

      }

      return prev - 1;

    });

  }, 1000);

  return () => clearInterval(timer);

}, [examFinished]);

  useEffect(() => {

  const loadQuestions = async () => {

    const { data, error } = await supabase
      .from("recruitment_questions")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    const allQuestions = data || [];

 const logicQuestions = allQuestions
  .filter(q => q.category === "logic")
  .sort(() => Math.random() - 0.5)
  .slice(0, 20);

const frenchQuestions = allQuestions
  .filter(q => q.category === "french")
  .sort(() => Math.random() - 0.5)
  .slice(0, 20);

const englishQuestions = allQuestions
  .filter(q => q.category === "english")
  .sort(() => Math.random() - 0.5)
  .slice(0, 20);

    const finalExam = [
      ...logicQuestions,
      ...frenchQuestions,
      ...englishQuestions
    ].sort(() => Math.random() - 0.5);

    setQuestions(finalExam);

  };

  loadQuestions();

}, []);

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
let candidateScore = 0;
let logic = 0;
let french = 0;
let english = 0;

questions.forEach((q) => {

  const correct =
    answers[q.id] === q.correct_answer;

  if (correct) {

    candidateScore++;

    if (q.category === "logic")
      logic++;

    if (q.category === "french")
      french++;

    if (q.category === "english")
      english++;

  }

});
   

      /* EDUCATION */

      if (
        Number(form.bacAverage) >= 15
      )
        candidateScore += 2;

      /* REPORT */

      if (
        form.technicalReport.length > 500
      )
        candidateScore += 3;

      /* =========================
         EVALUATION
      ========================= */

      let evaluation = "";

     if (candidateScore < 15) {

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

  logicscore: logic,
  frenchscore: french,
  englishscore: english,

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
        `Application submitted successfully.\nScore: ${candidateScore}`
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

  const formatTime = (seconds) => {

  const mins = Math.floor(seconds / 60);

  const secs = seconds % 60;

  return `${mins}:${secs
    .toString()
    .padStart(2, "0")}`;

};
  if (examFinished) {

  return (

    <main style={container}>

      <h1>
        Time is over
      </h1>

      <p>
        The recruitment test has ended.
      </p>

    </main>

  );

}
  

  return (

    <main style={container}>

  <h1 style={title}>
    Microdrive Engineering Recruitment
  </h1>

  <div
    style={{
      background: "#ffeeba",
      padding: 15,
      borderRadius: 8,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20
    }}
  >
    Time Remaining: {formatTime(timeLeft)}
  </div>

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
name="bacFrench"
placeholder="French grade at Baccalaureate"
onChange={handleChange}
style={input}
/>

<input
name="bacEnglish"
placeholder="English grade at Baccalaureate"
onChange={handleChange}
style={input}
/>

<input
name="bacMath"
placeholder="Mathematics grade at Baccalaureate"
onChange={handleChange}
style={input}
/>

<input
name="bacPhysics"
placeholder="Physics grade at Baccalaureate"
onChange={handleChange}
style={input}
/>

<input
name="bacHistory"
placeholder="History grade at Baccalaureate"
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
<h2>Professional Experience</h2>

<input
name="experienceCompany"
placeholder="Company name"
onChange={handleChange}
style={input}
/>

<textarea
  name="experienceMission"
  placeholder="Describe your missions and responsibilities"
  onChange={handleChange}
  style={bigTextarea}
/>

       <h2>Recruitment Exam</h2>

{questions.map((q) => (

  <div
    key={q.id}
    style={{
      border: "1px solid #ddd",
      padding: 15,
      marginBottom: 15,
      borderRadius: 8
    }}
  >

    <h3>
      {q.category.toUpperCase()}
    </h3>

    <p>
      <strong>{q.question}</strong>
    </p>

    {["A","B","C","D"].map(letter => (

      <label
        key={letter}
        style={{
          display: "block",
          marginBottom: 8
        }}
      >

        <input
          type="radio"
          name={`question-${q.id}`}
          value={letter}
          onChange={(e) =>
            setAnswers({
              ...answers,
              [q.id]: e.target.value
            })
          }
        />

        {" "}

        {letter === "A" && q.answer_a}
        {letter === "B" && q.answer_b}
        {letter === "C" && q.answer_c}
        {letter === "D" && q.answer_d}

      </label>

    ))}

  </div>

))}

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

