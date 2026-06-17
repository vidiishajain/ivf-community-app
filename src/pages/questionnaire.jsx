import { useState } from "react"
import { supabase } from "../lib/supabase"

const P = {
  purple: "#7C6EAA", light: "#EDE8F5", mid: "#C4B8E0",
  text: "#2D2040", muted: "#6B6485", hairline: "#EAE6F4", bg: "#F9F7FF"
}

const SECTIONS = [
  {
    id: "about", title: "About you",
    questions: [
      { id: "Q1", label: "What would you like to be called?", type: "text", placeholder: "Your name or nickname", required: true },
      { id: "Q2", label: "How old are you?", type: "number", placeholder: "e.g. 32", required: true },
      { id: "Q3", label: "Which region of the UK are you in?", type: "dropdown", required: false,
        options: ["London","South East","South West","East of England","East Midlands","West Midlands","Yorkshire and the Humber","North West","North East","Scotland","Wales","Northern Ireland","Other / prefer not to say"] }
    ]
  },
  {
    id: "journey", title: "Your IVF journey",
    questions: [
      { id: "Q4", label: "Who is on this journey with you?", type: "single_select", required: true,
        options: [
          { value: "1", label: "Just me — solo journey" },
          { value: "2", label: "Me and my partner (heterosexual couple)" },
          { value: "3", label: "Me and my partner (same-sex couple)" },
          { value: "4", label: "Using donor eggs, sperm or surrogacy" }
        ]
      },
      { id: "Q5", label: "How is your treatment funded?", type: "single_select", required: true,
        options: [
          { value: "1", label: "NHS funded" },
          { value: "2", label: "Privately funded" },
          { value: "3", label: "Mix of NHS and private" },
          { value: "4", label: "International clinic" }
        ]
      },
      { id: "Q6", label: "Where are you in your IVF journey right now?", type: "single_select", required: true,
        options: [
          { value: "1",  label: "1 · Initial investigations & consultation" },
          { value: "2",  label: "2 · Down-regulation" },
          { value: "3",  label: "3 · Ovarian stimulation" },
          { value: "4",  label: "4 · Trigger injection & egg collection" },
          { value: "5",  label: "5 · Fertilisation & embryo development watch" },
          { value: "6",  label: "6 · Fresh embryo transfer" },
          { value: "7",  label: "7 · Two-Week Wait (2WW)" },
          { value: "8",  label: "8 · Preparing for Frozen Embryo Transfer (FET)" },
          { value: "9",  label: "9 · Frozen Embryo Transfer (FET)" },
          { value: "10", label: "10 · Between cycles / taking a break" },
          { value: "11", label: "11 · Pursuing donor eggs, sperm or surrogacy" },
          { value: "12", label: "12 · Recurrent implantation failure — under investigation" }
        ]
      },
      { id: "Q7", label: "Which round of IVF is this?", type: "single_select", required: true,
        options: [
          { value: "1", label: "1st round" },
          { value: "2", label: "2nd round" },
          { value: "3", label: "3rd round" },
          { value: "4", label: "4th round or more" }
        ]
      },
      { id: "Q8", label: "Do you have a diagnosis? (Select all that apply)", type: "multi_select", required: false,
        options: [
          { value: "unexplained", label: "Unexplained infertility" },
          { value: "pcos", label: "PCOS" },
          { value: "low_reserve", label: "Low ovarian reserve" },
          { value: "male_factor", label: "Male factor infertility" },
          { value: "endometriosis", label: "Endometriosis" },
          { value: "other", label: "Other / prefer not to say" }
        ]
      }
    ]
  },
  {
    id: "feelings", title: "How you're feeling",
    questions: [
      { id: "Q11", label: "How full is your emotional battery right now?", type: "slider", required: true,
        sublabel: "0 = completely drained   ·   100 = doing really well" },
      { id: "Q12", label: "Do you have any clinical mental health history?", type: "single_select", required: true,
        options: [
          { value: "1", label: "No clinical mental health history" },
          { value: "2", label: "History of anxiety or depression (now managed)" },
          { value: "3", label: "Currently receiving mental health support" },
          { value: "4", label: "Prefer not to say" }
        ]
      },
      { id: "Q13", label: "Do you have professional support outside this community?", type: "single_select", required: true,
        options: [
          { value: "1", label: "Yes — therapy or counselling" },
          { value: "2", label: "Yes — peer support groups" },
          { value: "3", label: "No — this community is my primary outlet" },
          { value: "4", label: "No — I prefer to manage on my own" }
        ]
      },
      { id: "Q14", label: "What are your biggest emotional hurdles right now? (Pick all that apply)", type: "multi_select", required: false,
        options: [
          { value: "anxiety", label: "Anxiety about outcomes" },
          { value: "grief", label: "Grief from previous losses" },
          { value: "isolation", label: "Feeling isolated" },
          { value: "relationship_strain", label: "Relationship strain" },
          { value: "financial_stress", label: "Financial stress" }
        ]
      }
    ]
  },
  {
    id: "support", title: "Your support style",
    questions: [
      { id: "Q15", label: "What are you mainly looking for in a connection?", type: "single_select", required: true,
        options: [
          { value: "1", label: "A good listener — I want to support others" },
          { value: "2", label: "Practical advice — I like exchanging information" },
          { value: "3", label: "An accountability partner — regular check-ins" },
          { value: "4", label: "Someone to vent to — I just need to be heard" }
        ]
      }
    ]
  },
  {
    id: "life", title: "Life beyond IVF",
    questions: [
      { id: "Q9", label: "Your relationship with smoking or vaping:", type: "single_select", required: false,
        options: [
          { value: "1", label: "Non-smoker" },
          { value: "2", label: "Former smoker" },
          { value: "3", label: "Current smoker / vaper" }
        ]
      },
      { id: "Q10", label: "Your approach to alcohol during treatment:", type: "single_select", required: false,
        options: [
          { value: "1", label: "Alcohol-free during treatment" },
          { value: "2", label: "Occasional / social drinker" },
          { value: "3", label: "I haven't changed my habits" }
        ]
      },
      { id: "Q16", label: "What's your comfort watch right now?", type: "text", placeholder: "e.g. Schitt's Creek, Bake Off...", required: false },
      { id: "Q17", label: "Your caffeine approach:", type: "single_select", required: false,
        options: [
          { value: "1", label: "Coffee lover — not cutting back" },
          { value: "2", label: "Cutting back on caffeine" },
          { value: "3", label: "Caffeine-free" }
        ]
      },
      { id: "Q18", label: "How do you escape the IVF bubble? (Select all that apply)", type: "multi_select", required: false,
        options: [
          { value: "exercise",   label: "Exercise / movement" },
          { value: "creative",   label: "Creative activities" },
          { value: "nature",     label: "Nature and outdoors" },
          { value: "meditation", label: "Meditation / mindfulness" },
          { value: "social",     label: "Social time with friends" }
        ]
      }
    ]
  }
]

// ── Encoder: converts answers into the feature vector for KNN ─────────────
function encodeUser(answers) {
  const get    = (id) => answers[id]
  const getArr = (id) => answers[id] || []

  const stage   = parseInt(get("Q6")  || 1)  / 12
  const persona = parseInt(get("Q15") || 1)  / 4
  const battery = parseInt(get("Q11") ?? 50) / 100
  const round   = parseInt(get("Q7")  || 1)  / 4
  const pathway = parseInt(get("Q5")  || 1)  / 4
  const age     = Math.min(parseInt(get("Q2") || 30) / 55, 1)
  const partner = parseInt(get("Q4")  || 1)  / 4

  const diagOpts   = ["unexplained","pcos","low_reserve","male_factor","endometriosis","other"]
  const hurdleOpts = ["anxiety","grief","isolation","relationship_strain","financial_stress"]
  const escapeOpts = ["exercise","creative","nature","meditation","social"]

  const diagnosis = diagOpts.map(o   => getArr("Q8").includes(o)  ? 1 : 0)
  const hurdle    = hurdleOpts.map(o => getArr("Q14").includes(o) ? 1 : 0)
  const escape    = escapeOpts.map(o => getArr("Q18").includes(o) ? 1 : 0)

  return [stage, persona, battery, round, pathway, age, partner, ...diagnosis, ...hurdle, ...escape]
}

// ── Component ─────────────────────────────────────────────────────────────
export default function Questionnaire({ session, onComplete }) {
  const [section, setSection]   = useState(0)
  const [answers, setAnswers]   = useState({ Q11: 50 })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const current  = SECTIONS[section]
  const isLast   = section === SECTIONS.length - 1
  const progress = (section / SECTIONS.length) * 100

  function setAnswer(id, value) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  function toggleMulti(id, value) {
    const cur = answers[id] || []
    setAnswer(id, cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value])
  }

  function validateSection() {
    return current.questions
      .filter(q => q.required)
      .every(q => answers[q.id] !== undefined && answers[q.id] !== "")
  }

  function handleNext() {
    if (!validateSection()) { setError("Please answer the required questions before continuing."); return }
    setError(null)
    setSection(s => s + 1)
    window.scrollTo(0, 0)
  }

  async function handleSubmit() {
    if (!validateSection()) { setError("Please answer the required questions before submitting."); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.from("profiles").upsert({
      id:           session.user.id,
      display_name: answers.Q1,
      age:          parseInt(answers.Q2),
      ivf_stage:    parseInt(answers.Q6),
      mh_score:     parseInt(answers.Q11 ?? 50) / 100,
      persona:      parseInt(answers.Q15),
      pathway:      parseInt(answers.Q5),
      hobbies_vec:  answers.Q18 || [],
      feature_vec:  encodeUser(answers),
      consent:      true
    })
    if (!error) onComplete()
    else setError("Something went wrong. Please try again.")
    setLoading(false)
  }

  function renderQuestion(q) {
    const val = answers[q.id]

    if (q.type === "text") return (
      <input value={val || ""} onChange={e => setAnswer(q.id, e.target.value)}
        placeholder={q.placeholder}
        style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${P.mid}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    )

    if (q.type === "number") return (
      <input type="number" value={val || ""} onChange={e => setAnswer(q.id, e.target.value)}
        placeholder={q.placeholder} min={18} max={55}
        style={{ width: 120, padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${P.mid}`, fontSize: 14, outline: "none" }} />
    )

    if (q.type === "dropdown") return (
      <select value={val || ""} onChange={e => setAnswer(q.id, e.target.value)}
        style={{ padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${P.mid}`, fontSize: 14, background: "white", minWidth: 260 }}>
        <option value="">Select your region...</option>
        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )

    if (q.type === "slider") return (
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: P.muted }}>0</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: P.purple }}>{val ?? 50}</span>
          <span style={{ fontSize: 12, color: P.muted }}>100</span>
        </div>
        <input type="range" min={0} max={100} value={val ?? 50}
          onChange={e => setAnswer(q.id, parseInt(e.target.value))}
          style={{ width: "100%", accentColor: P.purple }} />
        {q.sublabel && <div style={{ fontSize: 11, color: P.muted, marginTop: 6, textAlign: "center" }}>{q.sublabel}</div>}
      </div>
    )

    if (q.type === "single_select") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map(opt => {
          const selected = val === opt.value
          return (
            <div key={opt.value} onClick={() => setAnswer(q.id, opt.value)}
              style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                border: `2px solid ${selected ? P.purple : P.hairline}`,
                background: selected ? P.light : "white",
                color: selected ? P.purple : P.text,
                fontSize: 13, fontWeight: selected ? 600 : 400, transition: "all 0.15s" }}>
              {opt.label}
            </div>
          )
        })}
      </div>
    )

    if (q.type === "multi_select") return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {q.options.map(opt => {
          const selected = (answers[q.id] || []).includes(opt.value)
          return (
            <div key={opt.value} onClick={() => toggleMulti(q.id, opt.value)}
              style={{ padding: "9px 14px", borderRadius: 20, cursor: "pointer",
                border: `2px solid ${selected ? P.purple : P.hairline}`,
                background: selected ? P.light : "white",
                color: selected ? P.purple : P.muted,
                fontSize: 13, fontWeight: selected ? 600 : 400, transition: "all 0.15s" }}>
              {selected ? "✓ " : ""}{opt.label}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ background: P.bg, minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: P.muted, fontWeight: 600 }}>Section {section + 1} of {SECTIONS.length}</span>
            <span style={{ fontSize: 12, color: P.muted }}>{Math.round(progress)}% complete</span>
          </div>
          <div style={{ height: 6, background: P.hairline, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: P.purple, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Section header */}
        <div style={{ marginBottom: 28 }}>
          
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.text }}>{current.title}</h2>
        </div>

        {/* Questions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {current.questions.map(q => (
            <div key={q.id}>
              <div style={{ fontSize: 14, fontWeight: 600, color: P.text, marginBottom: 10, lineHeight: 1.5 }}>
                {q.label}
                {!q.required && <span style={{ fontSize: 11, color: P.muted, fontWeight: 400, marginLeft: 6 }}>(optional)</span>}
              </div>
              {renderQuestion(q)}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#FDEDED", border: "1px solid #E06B6B", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#B04040", marginTop: 20 }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, paddingBottom: 40 }}>
          <button onClick={() => { setSection(s => s - 1); setError(null) }}
            disabled={section === 0}
            style={{ padding: "12px 24px", borderRadius: 8, border: `2px solid ${P.mid}`, background: "white",
              color: section === 0 ? P.muted : P.purple, fontSize: 14, fontWeight: 600,
              cursor: section === 0 ? "default" : "pointer", opacity: section === 0 ? 0.4 : 1 }}>
            ← Back
          </button>

          {isLast ? (
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: "12px 28px", borderRadius: 8, background: P.purple, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : "Find my matches"}
            </button>
          ) : (
            <button onClick={handleNext}
              style={{ padding: "12px 28px", borderRadius: 8, background: P.purple, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}