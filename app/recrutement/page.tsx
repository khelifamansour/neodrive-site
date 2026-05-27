"use client";

import { useState } from "react";

export default function RecruitmentPage() {

  const [scores] = useState({
    logic: 18,
    communication: 15,
    technical: 17,
    autonomy: 19,
    english: 14,
  });

  const tests = [
    {
      title: "Logic Test",
      question:
        "A customer receives a vehicle that does not charge. Explain step-by-step what you do.",
    },

    {
      title: "Customer Support",
      question:
        "Write a response to an angry customer waiting for delayed delivery.",
    },

    {
      title: "Supplier Communication",
      question:
        "Write an email to supplier requesting urgent technical validation.",
    },

    {
      title: "Operational Reasoning",
      question:
        "A container arrives late at port. Explain how you reorganize operations.",
    },
  ];

  return (

    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <div className="bg-black text-white py-16 px-8">

        <div className="max-w-7xl mx-auto">

          <h1 className="text-5xl font-bold mb-6">
            Microdrive Recruitment Platform
          </h1>

          <p className="text-xl opacity-80 max-w-3xl">
            AI-assisted recruitment system for operational,
            technical and commercial talents.
          </p>

        </div>

      </div>

      {/* MAIN */}

      <div className="max-w-7xl mx-auto p-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}

          <div className="lg:col-span-2 space-y-8">

            {/* PERSONAL INFO */}

            <div className="bg-white rounded-3xl shadow-xl p-8">

              <h2 className="text-3xl font-bold mb-8">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <input
                  placeholder="Full Name"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="Email"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="Phone Number"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="WhatsApp"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="City / Country"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="LinkedIn"
                  className="border rounded-2xl p-4"
                />

              </div>

            </div>

            {/* EDUCATION */}

            <div className="bg-white rounded-3xl shadow-xl p-8">

              <h2 className="text-3xl font-bold mb-8">
                Education
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <input
                  placeholder="University / School"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="Degree"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="English Level"
                  className="border rounded-2xl p-4"
                />

                <input
                  placeholder="French Level"
                  className="border rounded-2xl p-4"
                />

              </div>

            </div>

            {/* EXPERIENCE */}

            <div className="bg-white rounded-3xl shadow-xl p-8">

              <h2 className="text-3xl font-bold mb-8">
                Professional Experience
              </h2>

              <div className="space-y-6">

                <textarea
                  rows={5}
                  placeholder="Describe previous experience..."
                  className="w-full border rounded-2xl p-4"
                />

                <input
                  placeholder="Previous Employer"
                  className="border rounded-2xl p-4 w-full"
                />

                <input
                  placeholder="Manager Contact"
                  className="border rounded-2xl p-4 w-full"
                />

              </div>

            </div>

            {/* FILE UPLOADS */}

            <div className="bg-white rounded-3xl shadow-xl p-8">

              <h2 className="text-3xl font-bold mb-8">
                Uploads
              </h2>

              <div className="space-y-6">

                <div className="border-2 border-dashed rounded-3xl p-10 text-center">

                  <p className="font-semibold text-lg mb-3">
                    Upload CV PDF
                  </p>

                  <input type="file" />

                </div>

                <div className="border-2 border-dashed rounded-3xl p-10 text-center">

                  <p className="font-semibold text-lg mb-3">
                    Upload Face Photo
                  </p>

                  <input type="file" />

                </div>

                <div className="border-2 border-dashed rounded-3xl p-10 text-center">

                  <p className="font-semibold text-lg mb-3">
                    Upload Introduction Video
                  </p>

                  <input type="file" />

                </div>

              </div>

            </div>

            {/* LOGIC TESTS */}

            <div className="bg-white rounded-3xl shadow-xl p-8">

              <h2 className="text-3xl font-bold mb-8">
                Operational & Logic Tests
              </h2>

              <div className="space-y-8">

                {tests.map((test, index) => (

                  <div
                    key={index}
                    className="border rounded-3xl p-6"
                  >

                    <h3 className="text-2xl font-bold mb-4">
                      {test.title}
                    </h3>

                    <p className="text-gray-700 mb-5">
                      {test.question}
                    </p>

                    <textarea
                      rows={6}
                      placeholder="Write your answer..."
                      className="w-full border rounded-2xl p-4"
                    />

                  </div>

                ))}

              </div>

            </div>

            {/* SUBMIT */}

            <button
              className="w-full bg-black text-white rounded-3xl py-5 text-2xl font-bold hover:opacity-90 transition"
            >
              Submit Application
            </button>

          </div>

          {/* RIGHT COLUMN */}

          <div className="space-y-8">

            {/* AI SCORE */}

            <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-10">

              <h2 className="text-3xl font-bold mb-8">
                AI Candidate Scoring
              </h2>

              <div className="space-y-6">

                {Object.entries(scores).map(([key, value]) => (

                  <div key={key}>

                    <div className="flex justify-between mb-2">

                      <span className="capitalize font-semibold">
                        {key}
                      </span>

                      <span className="font-bold">
                        {value}/20
                      </span>

                    </div>

                    <div className="bg-gray-200 rounded-full h-4">

                      <div
                        className="bg-black rounded-full h-4"
                        style={{
                          width: `${value * 5}%`,
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

              {/* GLOBAL SCORE */}

              <div className="mt-10 bg-green-100 border border-green-300 rounded-3xl p-8">

                <h3 className="text-2xl font-bold mb-4">
                  Global Score
                </h3>

                <div className="text-6xl font-bold">
                  83/100
                </div>

                <p className="mt-5 text-gray-700 leading-relaxed">
                  Strong operational and analytical profile.
                  Recommended for technical-commercial training.
                </p>

              </div>

              {/* AI ANALYSIS */}

              <div className="mt-8">

                <h3 className="text-2xl font-bold mb-5">
                  AI Analysis
                </h3>

                <div className="space-y-4">

                  <div className="border rounded-2xl p-4">

                    <h4 className="font-bold mb-2">
                      Strengths
                    </h4>

                    <ul className="space-y-2 text-gray-700">

                      <li>• Strong autonomy</li>
                      <li>• Good operational reasoning</li>
                      <li>• Strong communication</li>

                    </ul>

                  </div>

                  <div className="border rounded-2xl p-4">

                    <h4 className="font-bold mb-2">
                      Weaknesses
                    </h4>

                    <ul className="space-y-2 text-gray-700">

                      <li>• Needs technical training</li>
                      <li>• Medium logistics experience</li>

                    </ul>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </main>

  );

}
