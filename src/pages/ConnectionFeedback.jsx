import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const FONT = "'Quicksand', system-ui, sans-serif"

export default function ConnectionFeedback({ reviewedId, onDone, onBack }) {
  const [quality,    setQuality]    = useState(null)
  const [emotional,  setEmotional]  = useState(3)
  const [shared,     setShared]     = useState(3)
  const [practical,  setPractical]  = useState(3)
  const [recommend,  setRecommend]  = useState(null)
  const [notes,      setNotes]      = useState("")
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileName, setProfileName] = useState("")

  useEffect(() => {
    if (!reviewedId) return
    supabase.from("profiles").select("display_name").eq("id", reviewedId).single()
      .then(({ data }) => { if (data?.display_name) setProfileName(data.display_name) })
  }, [reviewedId])

  async function handleSubmit() {
    if (!quality) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("connection_feedback").insert({
      reviewer_id:        user.id,
      reviewed_id:        reviewedId,
      connection_quality: quality,
      emotional_support:  emotional,
      shared_experience:  shared,
      practical_value:    practical,
      would_recommend:    recommend,
      notes:              notes.trim() || null,
    })
    if (error) { console.error("Feedback error:", error.message); setSubmitting(false); return }
    setSubmitted(true)
    setTimeout(() => onDone?.(), 2200)
  }

  const qualityOptions = [
    { value: "strong", label: "Really clicked",     desc: "Felt like genuine understanding" },
    { value: "decent", label: "Some common ground", desc: "A few things resonated" },
    { value: "weak",   label: "Not much in common", desc: "Hard to find a connection" },
    { value: "poor",   label: "Wasn't a good fit",  desc: "Probably not the right match" },
  ]

  const firstName = (profileName || "").split(" ")[0] || "this person"

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px", textAlign: "center", fontFamily: FONT }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(91,75,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B4BD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{ color: "#111111", fontWeight: 700, fontSize: 22, marginBottom: 10, fontFamily: FONT }}>Thank you</h2>
        <p style={{ color: "#888888", fontSize: 15, lineHeight: 1.6, fontFamily: FONT }}>
          Your thoughts help us make better matches for everyone on the journey.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: "48px 48px 60px", fontFamily: FONT }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#5B4BD4", fontSize: 14, fontWeight: 600, marginBottom: 36, padding: 0, fontFamily: FONT }}
      >
        Back
      </button>

      <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111111", letterSpacing: "-0.5px", margin: "0 0 8px", fontFamily: FONT }}>
        How has it been?
      </h1>
      <p style={{ color: "#888888", fontSize: 14, marginBottom: 40, fontFamily: FONT }}>
        Your connection with {firstName}
      </p>

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Overall feel */}
        <div>
          <p style={{ color: "#111111", fontSize: 15, fontWeight: 600, margin: "0 0 14px", fontFamily: FONT }}>
            How did the connection feel? <span style={{ color: "#5B4BD4" }}>*</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {qualityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1.5px solid ${quality === opt.value ? "#5B4BD4" : "#EBEBEB"}`,
                  background: quality === opt.value ? "rgba(91,75,212,0.06)" : "#F7F7FA",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                  fontFamily: FONT,
                }}
              >
                <div style={{ fontWeight: 600, color: "#111111", marginBottom: 3, fontSize: 14, fontFamily: FONT }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: "#888888", fontFamily: FONT }}>
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <p style={{ color: "#111111", fontSize: 15, fontWeight: 600, margin: "0 0 18px", fontFamily: FONT }}>
            A little more detail <span style={{ color: "#888888", fontWeight: 400 }}>(optional)</span>
          </p>
          {[
            { label: "Emotional support",  value: emotional,  set: setEmotional },
            { label: "Shared experience",  value: shared,     set: setShared },
            { label: "Practical help",     value: practical,  set: setPractical },
          ].map(dim => (
            <div key={dim.label} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: "#555555", fontFamily: FONT }}>{dim.label}</span>
                <span style={{ fontSize: 13, color: "#5B4BD4", fontWeight: 600, fontFamily: FONT }}>{dim.value} / 5</span>
              </div>
              <input
                type="range" min={1} max={5} value={dim.value}
                onChange={e => dim.set(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#5B4BD4" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#AAAAAA", marginTop: 4, fontFamily: FONT }}>
                <span>Not much</span>
                <span>A lot</span>
              </div>
            </div>
          ))}
        </div>

        {/* Would connect again */}
        <div>
          <p style={{ color: "#111111", fontSize: 15, fontWeight: 600, margin: "0 0 14px", fontFamily: FONT }}>
            Would you connect with someone similar again? <span style={{ color: "#888888", fontWeight: 400 }}>(optional)</span>
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ val: true, label: "Yes" }, { val: false, label: "Not sure" }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setRecommend(opt.val)}
                style={{
                  padding: "10px 28px",
                  borderRadius: 10,
                  border: `1.5px solid ${recommend === opt.val ? "#5B4BD4" : "#EBEBEB"}`,
                  background: recommend === opt.val ? "rgba(91,75,212,0.06)" : "#F7F7FA",
                  color: "#111111",
                  cursor: "pointer",
                  fontWeight: recommend === opt.val ? 700 : 400,
                  fontSize: 14,
                  fontFamily: FONT,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p style={{ color: "#111111", fontSize: 15, fontWeight: 600, margin: "0 0 12px", fontFamily: FONT }}>
            Anything else? <span style={{ color: "#888888", fontWeight: 400 }}>(optional)</span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything that stood out, good or hard…"
            rows={3}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid #EBEBEB",
              background: "#F7F7FA",
              color: "#111111",
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: FONT,
              outline: "none",
            }}
          />
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={handleSubmit}
            disabled={!quality || submitting}
            style={{
              width: "100%",
              padding: "14px",
              background: quality ? "#5B4BD4" : "#EBEBEB",
              color: quality ? "#FFFFFF" : "#AAAAAA",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: quality ? "pointer" : "default",
              fontFamily: FONT,
              transition: "background 0.2s ease",
            }}
          >
            {submitting ? "Sharing…" : "Share your thoughts"}
          </button>
          <p style={{ fontSize: 12, color: "#AAAAAA", marginTop: 10, textAlign: "center", fontFamily: FONT }}>
            Only the overall feel is required.
          </p>
        </div>

      </div>
    </div>
  )
}
