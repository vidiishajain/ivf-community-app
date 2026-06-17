import { useState } from "react"
import { supabase } from "../lib/supabase"

const P = { purple: "#7C6EAA", light: "#EDE8F5", muted: "#6B6485" }

export default function Disclaimer({ session, onComplete }) {
  const [ticked, setTicked] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    setLoading(true)
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, consent: true })
    if (!error) onComplete()
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: 32, fontFamily: "sans-serif" }}>
      
      <h1 style={{ margin: "0 0 6px", color: "#2D2040" }}>Before you continue</h1>
      <p style={{ color: P.muted, marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
        This app connects people going through IVF based on shared experiences. To match you well, we ask about your journey and how you're feeling.
      </p>

      <div style={{ background: P.light, border: `1.5px solid #C4B8E0`, borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
        {[
          "Your answers are used only for matching. Never sold or shared with third parties.",
          "This is a peer support tool, not a medical service. For clinical advice, speak to your clinic.",
          "If you are in crisis, please contact the Samaritans on 116 123 (free, 24/7)."
        ].map((text, i) => (
          <p key={i} style={{ margin: i < 2 ? "0 0 10px" : 0, fontSize: 13, lineHeight: 1.7, color: "#3D2F6B" }}>
            · {text}
          </p>
        ))}
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 28 }}>
        <input
          type="checkbox"
          checked={ticked}
          onChange={e => setTicked(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: P.purple }}
        />
        <span style={{ fontSize: 14, lineHeight: 1.6, color: "#2D2040" }}>
          I understand and agree to share my information for peer matching purposes.
        </span>
      </label>

      <button
        onClick={handleContinue}
        disabled={!ticked || loading}
        style={{
          padding: "13px 28px", borderRadius: 8,
          background: ticked ? P.purple : "#E0D8F0",
          color: ticked ? "white" : "#AAA",
          border: "none", fontSize: 14, fontWeight: 700,
          cursor: ticked ? "pointer" : "not-allowed",
          transition: "all 0.2s"
        }}
      >
        {loading ? "Saving..." : "Continue to questionnaire →"}
      </button>
    </div>
  )
}