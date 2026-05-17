// Full AI Recruitment Platform Prototype for Microdrive // Advanced candidate profiling: // - family background // - hobbies // - employer references // - French/English writing tests // - logic tests // - operational reasoning // - AI-style scoring structure // Next.js + React + Tailwind

export default function RecruitmentAIScoringConcept() { const sections = [ { title: "Informations générales", items: [ "Nom / prénom", "Téléphone / WhatsApp / Email", "Ville / pays", "CV PDF", ], }, { title: "Formation", items: [ "Université / école", "Diplôme", "Notes mathématiques", "Niveau anglais / français", ], }, { title: "Expérience", items: [ "Employeurs précédents", "Téléphones références", "Email managers", "Responsabilités", ], }, { title: "Tests logiques", items: [ "Suites logiques", "Dominos", "Organisation logistique", "Résolution problèmes", ], }, { title: "Écriture & communication", items: [ "Réponse client difficile", "Email fournisseur", "Explication technique", ], }, ];

const scoring = [ { label: "Logique", score: "18/20", }, { label: "Communication", score: "15/20", }, { label: "Technique", score: "17/20", }, { label: "Anglais", score: "14/20", }, { label: "Autonomie", score: "19/20", }, ];

return ( <main className="min-h-screen bg-gray-100 p-6"> <div className="max-w-7xl mx-auto">

<div className="bg-black text-white rounded-3xl p-10 mb-8 shadow-2xl">
      <h1 className="text-5xl font-bold mb-4">
        Microdrive Recruitment Platform
      </h1>

      <p className="text-lg opacity-90 max-w-3xl leading-relaxed">
        AI-assisted recruitment and scoring platform for selecting high-potential technical,
        operational and commercial talents.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

      <div className="bg-white rounded-3xl p-6 shadow-xl lg:col-span-2">
        <h2 className="text-3xl font-bold mb-6">
          Candidate Evaluation Pipeline
        </h2>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className="border rounded-2xl p-5"
            >
              <h3 className="text-xl font-bold mb-3">
                {section.title}
              </h3>

              <ul className="space-y-2 text-gray-700">
                {section.items.map((item, i) => (
                  <li key={i}>
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl">
        <h2 className="text-3xl font-bold mb-6">
          AI Scoring
        </h2>

        <div className="space-y-4">
          {scoring.map((item, index) => (
            <div
              key={index}
              className="border rounded-2xl p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">
                  {item.label}
                </span>

                <span className="font-bold text-xl">
                  {item.score}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-black h-3 rounded-full"
                  style={{ width: `${parseInt(item.score) * 5}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-100 border border-green-300 rounded-2xl p-5">
          <h3 className="text-2xl font-bold mb-2">
            Global Score
          </h3>

          <div className="text-5xl font-bold">
            83/100
          </div>

          <p className="mt-3 text-sm text-gray-700 leading-relaxed">
            Strong operational and analytical profile.
            Recommended for technical-commercial training.
          </p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-3xl p-8 shadow-xl">
      <h2 className="text-3xl font-bold mb-6">
        Suggested AI Evaluation Logic
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
        <div className="border rounded-2xl p-5">
          <h3 className="text-xl font-bold mb-3">
            Technical Potential
          </h3>

          <ul className="space-y-2">
            <li>• Engineering background</li>
            <li>• Logic test score</li>
            <li>• Technical writing quality</li>
            <li>• Diagnostic reasoning</li>
          </ul>
        </div>

        <div className="border rounded-2xl p-5">
          <h3 className="text-xl font-bold mb-3">
            Operational Potential
          </h3>

          <ul className="space-y-2">
            <li>• Communication quality</li>
            <li>• Problem solving</li>
            <li>• Motivation consistency</li>
            <li>• References quality</li>
          </ul>
        </div>
      </div>
    </div>

  </div>
</main>

); }
