import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ConnectionFeedback({ profile, onClose }) {
  const [quality, setQuality] = useState(null);
  const [emotional, setEmotional] = useState(3);
  const [shared, setShared] = useState(3);
  const [practical, setPractical] = useState(3);
  const [recommend, setRecommend] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!quality) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("connection_feedback").insert({
      reviewer_id: user.id,
      reviewed_id: profile.id,
      connection_quality: quality,
      emotional_support: emotional,
      shared_experience: shared,
      practical_value: practical,
      would_recommend: recommend,
      notes: notes.trim() || null
    });

    if (error) {
      console.error("Feedback error:", error.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setTimeout(() => onClose(), 2500);
  }

  const qualityOptions = [
    { value: "strong", label: "💚 Strong", desc: "We really clicked" },
    { value: "decent", label: "💛 Decent", desc: "Some common ground" },
    { value: "weak",   label: "🟠 Weak",   desc: "Not much in common" },
    { value: "poor",   label: "❌ Poor",   desc: "Wasn't a good fit" },
  ];

  if (submitted) {
    return (
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "80px 16px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: 52 }}>💛</div>
        <h2 style={{ marginTop: 20 }}>Thank you</h2>
        <p>Your feedback helps us make better matches for everyone.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: 14,
          marginBottom: 28,
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        ← Back to matches
      </button>

      <h1 style={{ marginBottom: 4 }}>Rate your connection</h1>
      <p style={{ marginBottom: 32 }}>
        How did it go with <strong style={{ color: "var(--text-h)" }}>{profile.display_name}</strong>?
      </p>

      {/* Overall quality */}
      <section style={{ marginBottom: 36 }}>
        <p style={{ fontWeight: 600, marginBottom: 14, color: "var(--text-h)" }}>
          Overall connection quality *
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {qualityOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setQuality(opt.value)}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: `2px solid ${quality === opt.value ? "var(--accent)" : "var(--border)"}`,
                background: quality === opt.value ? "var(--accent-bg)" : "var(--code-bg)",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-h)", marginBottom: 3 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text)" }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Dimension sliders */}
      <section style={{ marginBottom: 36 }}>
        <p style={{ fontWeight: 600, marginBottom: 14, color: "var(--text-h)" }}>
          Rate the dimensions
        </p>
        {[
          { label: "💬 Emotional support", value: emotional, set: setEmotional },
          { label: "🤝 Shared experience",  value: shared,    set: setShared },
          { label: "💡 Practical help",      value: practical, set: setPractical },
        ].map(dim => (
          <div key={dim.label} style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8
            }}>
              <span style={{ fontSize: 14 }}>{dim.label}</span>
              <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>
                {dim.value} / 5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={dim.value}
              onChange={e => dim.set(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text)",
              marginTop: 4
            }}>
              <span>Not helpful</span>
              <span>Very helpful</span>
            </div>
          </div>
        ))}
      </section>

      {/* Would recommend */}
      <section style={{ marginBottom: 36 }}>
        <p style={{ fontWeight: 600, marginBottom: 14, color: "var(--text-h)" }}>
          Would you connect with someone similar again?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => setRecommend(opt.val)}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: `2px solid ${recommend === opt.val ? "var(--accent)" : "var(--border)"}`,
                background: recommend === opt.val ? "var(--accent-bg)" : "var(--code-bg)",
                color: "var(--text-h)",
                cursor: "pointer",
                fontWeight: recommend === opt.val ? 700 : 400,
                fontSize: 14
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <section style={{ marginBottom: 36 }}>
        <p style={{ fontWeight: 600, marginBottom: 12, color: "var(--text-h)" }}>
          Anything else? <span style={{ fontWeight: 400, color: "var(--text)" }}>(optional)</span>
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What made this connection strong or not..."
          rows={3}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--code-bg)",
            color: "var(--text-h)",
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit"
          }}
        />
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!quality || submitting}
        style={{
          width: "100%",
          padding: "14px",
          background: quality ? "var(--accent)" : "var(--border)",
          color: quality ? "white" : "var(--text)",
          border: "none",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: quality ? "pointer" : "default",
          transition: "background 0.2s"
        }}
      >
        {submitting ? "Submitting..." : "Submit feedback"}
      </button>

      <p style={{ fontSize: 12, color: "var(--text)", marginTop: 12, textAlign: "center" }}>
        * Overall quality is required. Everything else is optional.
      </p>
    </div>
  );
}