"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
"https://tzlsdjzcxdjaatcpwqwn.supabase.co",
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

type Question = {
id: number;
category: string;
question: string;
answer_a: string;
answer_b: string;
answer_c: string;
answer_d: string;
correct_answer: string;
difficulty: number;
};

export default function TestQuestions() {

const [questions, setQuestions] = useState<Question[]>([]);
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState("");
const [answers, setAnswers] = useState<Record<number, string>>({});
const [score, setScore] = useState<number | null>(null);
 const [logicScore, setLogicScore] = useState(0);
const [frenchScore, setFrenchScore] = useState(0);
const [englishScore, setEnglishScore] = useState(0);

const EXAM_DURATION = 25 * 60;

const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);

const [examFinished, setExamFinished] = useState(false);


useEffect(() => {


const loadQuestions = async () => {

 const { data, error } = await supabase
.from("recruitment_questions")
.select("*");

if (error) {
setErrorMessage(error.message);
setLoading(false);
return;
}




const allQuestions = data || [];

const logicQuestions = allQuestions
.filter((q) => q.category === "logic")
.sort(() => Math.random() - 0.5)
.slice(0, 4);

const frenchQuestions = allQuestions
.filter((q) => q.category === "french")
.sort(() => Math.random() - 0.5)
.slice(0, 3);

const englishQuestions = allQuestions
.filter((q) => q.category === "english")
.sort(() => Math.random() - 0.5)
.slice(0, 3);

const finalExam = [
...logicQuestions,
...frenchQuestions,
...englishQuestions
].sort(() => Math.random() - 0.5);

setQuestions(finalExam);
setLoading(false);

};

loadQuestions();


}, []);

  useEffect(() => {

if (examFinished) return;

const timer = setInterval(() => {


setTimeLeft((prev) => {

  if (prev <= 1) {

    clearInterval(timer);

    setExamFinished(true);

    calculateScore();

    return 0;

  }

  return prev - 1;

});


}, 1000);

return () => clearInterval(timer);

}, [examFinished]);

const calculateScore = () => {

let total = 0;

let logic = 0;
let french = 0;
let english = 0;

questions.forEach((q) => {


const correct =
  answers[q.id] === q.correct_answer;

if (correct) {

  total++;

  if (q.category === "logic")
    logic++;

  if (q.category === "french")
    french++;

  if (q.category === "english")
    english++;

}


});

setScore(total);

setLogicScore(logic);
setFrenchScore(french);
setEnglishScore(english);

};


 const formatTime = (seconds: number) => {

const mins = Math.floor(seconds / 60);

const secs = seconds % 60;

return `${mins}:${secs
    .toString()
    .padStart(2, "0")}`;

};

 if (examFinished) {

return (

<main
  style={{
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px",
    textAlign: "center"
  }}
>

  <h1>Exam Finished</h1>

  <h2>
    Score: {score} / {questions.length}
  </h2>

</main>

);

}


return (

<>


{score !== null && (

  <h2>
    Score: {score} / {questions.length}
  </h2>
)}

<main
  style={{
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px",
    fontFamily: "Arial"
  }}
>

  <h1>Test Questions</h1>
 <div
  style={{
    background: "#ffeeba",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "24px",
    fontWeight: "bold",
    textAlign: "center"
  }}
>
  Time Remaining: {formatTime(timeLeft)}
</div>


  <p>
    Number of questions loaded: {questions.length}
  </p>

  {errorMessage && (
    <div
      style={{
        background: "#ffdddd",
        padding: "15px",
        marginBottom: "20px"
      }}
    >
      Error: {errorMessage}
    </div>
  )}

  {loading && (
    <p>Loading...</p>
  )}

  {!loading &&
    questions.map((q) => (

      <div
        key={q.id}
        style={{
          border: "1px solid #ddd",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "8px"
        }}
      >

        <h3>
          #{q.id} - {q.category}
        </h3>

        <p>
          <strong>{q.question}</strong>
        </p>

    <label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="A"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  A) {q.answer_a}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="B"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  B) {q.answer_b}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="C"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  C) {q.answer_c}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="D"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  D) {q.answer_d}
</label>


    

        <p>
          Difficulty: {q.difficulty}
        </p>

      </div>

    ))
  }

<div
  style={{
    marginTop: "30px",
    textAlign: "center"
  }}
>
  <button
    onClick={calculateScore}
    style={{
      padding: "15px 30px",
      fontSize: "18px",
      cursor: "pointer"
    }}
  >
    Submit Exam
  </button>

  {score !== null && (
    <h2>
      Score: {score} / {questions.length}
    </h2>
  )}
</div>

  </main>

</>

);

}
