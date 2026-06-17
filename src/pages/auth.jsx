import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useIsMobile } from "../hooks/useIsMobile"

/* ── Grain noise SVG as a data URI ── */
const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`

/* ── Styles ── */
const S = {
  page: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },

  /* Left panel */
  left: {
    position: "relative",
    width: "62%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundColor: "#EDE8F4",
    backgroundImage: [
      "radial-gradient(ellipse 80% 70% at 35% 85%, #0D0B55 0%, #1a1266 30%, transparent 70%)",
      "radial-gradient(ellipse 65% 60% at 60% 75%, #2D1FA3 0%, transparent 60%)",
      "radial-gradient(ellipse 70% 50% at 20% 70%, #4B3EC7 0%, transparent 55%)",
      "radial-gradient(ellipse 55% 45% at 50% 55%, #6B5FD4 0%, transparent 50%)",
      "radial-gradient(ellipse 40% 30% at 70% 40%, #9080DC 0%, transparent 60%)",
      "radial-gradient(ellipse 60% 30% at 10% 90%, #0A0840 0%, transparent 60%)",
    ].join(", "),
  },

  /* Grain overlay — absolutely positioned inside left panel */
  grain: {
    position: "absolute",
    inset: 0,
    backgroundImage: GRAIN_URI,
    opacity: 0.17,
    mixBlendMode: "overlay",
    pointerEvents: "none",
    zIndex: 1,
  },

  /* Content wrapper sits above grain */
  leftContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
  },

  brand: {
    padding: "40px 0 0 0",
    textAlign: "center",
  },
  brandName: {
    fontSize: 34,
    fontWeight: 800,
    color: "#4B3EC7",
    letterSpacing: "-0.5px",
    lineHeight: 1,
  },
  brandTagline: {
    fontSize: 16,
    fontWeight: 400,
    color: "#2D2D2D",
    marginTop: 6,
  },

  spacer: { flex: 1 },

  bodyText: {
    padding: "0 48px",
    maxWidth: 460,
    textAlign: "center",
    marginBottom: "auto",
  },
  bodyTextP: {
    fontStyle: "italic",
    fontSize: 15,
    lineHeight: 1.65,
    color: "#FFFFFF",
    fontWeight: 400,
  },

  leftFooter: {
    padding: "0 0 36px 0",
    display: "flex",
    gap: 32,
  },
  footerLink: {
    fontSize: 13,
    color: "#FFFFFF",
    textDecoration: "underline",
    textUnderlineOffset: 3,
    fontWeight: 400,
  },

  /* Right panel */
  right: {
    width: "38%",
    height: "100%",
    background: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },

  formWrapper: {
    width: "100%",
    maxWidth: 400,
    margin: "auto",
  },

  formTitle: {
    fontSize: 42,
    fontWeight: 800,
    color: "#111111",
    letterSpacing: "-1px",
    marginBottom: 32,
  },

  input: (extra = {}) => ({
    width: "100%",
    height: 56,
    border: "1.5px solid #E8E8E8",
    borderRadius: 12,
    padding: "0 18px",
    fontSize: 15,
    color: "#111111",
    outline: "none",
    display: "block",
    ...extra,
  }),

  btnContinue: {
    width: "100%",
    height: 56,
    background: "linear-gradient(135deg, #7B6FE0 0%, #5B4BD4 50%, #4B3EC7 100%)",
    borderRadius: 12,
    border: "none",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: "0.2px",
    cursor: "pointer",
    position: "relative",
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  },

  arrowCircle: {
    position: "absolute",
    right: 16,
    width: 32,
    height: 32,
    background: "rgba(255,255,255,0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  btnRow: {
    display: "flex",
    gap: 12,
  },

  btnSecondary: {
    flex: 1,
    height: 46,
    border: "2px solid #6B5FD4",
    borderRadius: 12,
    color: "#6B5FD4",
    background: "transparent",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.18s ease",
  },

  errorBox: {
    background: "#FDEDED",
    border: "1px solid #E06B6B",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#B04040",
    marginBottom: 12,
  },

  successBox: {
    background: "#EDF7ED",
    border: "1px solid #6BAF6B",
    borderRadius: 8,
    padding: "14px 16px",
    fontSize: 14,
    color: "#2D6B2D",
    marginBottom: 20,
  },

  panelFooter: {
    textAlign: "center",
    fontSize: 12.5,
    color: "#B0B0B0",
    lineHeight: 1.6,
    maxWidth: 340,
    margin: "0 auto",
  },
}

/* ── Shared left-panel shell ── */
function LeftPanel() {
  return (
    <div style={S.left}>
      <div style={S.grain} />
      <div style={S.leftContent}>
        <div style={S.brand}>
          <div style={S.brandName}>Ember</div>
          <div style={S.brandTagline}>Find your people.</div>
        </div>
        <div style={S.spacer} />
        <div style={S.bodyText}>
          <p style={S.bodyTextP}>
            Ember is a community of women navigating the after-effects of IVF treatment,
            enabling you to connect with others going through the same journey and
            support each other along the way.
          </p>
        </div>
        <div style={S.spacer} />
        <div style={S.leftFooter}>
          <a href="#" style={S.footerLink}>Reach Out</a>
        </div>
      </div>
    </div>
  )
}

/* ── Arrow icon ── */
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/* ── Main Auth component ── */
export default function Auth() {
  const isMobile                  = useIsMobile()
  const [mode, setMode]           = useState("login")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [resetSent, setResetSent] = useState(false)

  /* Hover states */
  const [continueHover, setContinueHover]   = useState(false)
  const [createHover, setCreateHover]       = useState(false)
  const [forgotHover, setForgotHover]       = useState(false)
  const [emailFocus, setEmailFocus]         = useState(false)
  const [passwordFocus, setPasswordFocus]   = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const { error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleForgot() {
    if (!email) { setError("Please enter your email address first."); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError(null)
    setResetSent(false)
  }

  const focusStyle = { borderColor: "#6B5FD4", boxShadow: "0 0 0 3px rgba(107,95,212,0.12)" }

  /* ── Forgot password view ── */
  if (mode === "forgot") {
    return (
      <div style={S.page}>
        {!isMobile && <LeftPanel />}
        <div style={{ ...S.right, width: isMobile ? '100%' : S.right.width }}>
          <div style={S.formWrapper}>
            <h1 style={S.formTitle}>Reset Password</h1>

            {resetSent ? (
              <>
                <div style={S.successBox}>
                  Check your inbox — a reset link is on its way.
                </div>
                <button
                  onClick={() => switchMode("login")}
                  style={{ background: "none", border: "none", color: "#6B5FD4", cursor: "pointer", fontSize: 13 }}>
                  ← Back to sign in
                </button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  style={{
                    ...S.input({ background: "#F2F2F2", marginBottom: 22 }),
                    ...(emailFocus ? focusStyle : {}),
                  }}
                />
                {error && <div style={S.errorBox}>{error}</div>}
                <button
                  onClick={handleForgot}
                  disabled={loading || !email}
                  onMouseEnter={() => setContinueHover(true)}
                  onMouseLeave={() => setContinueHover(false)}
                  style={{
                    ...S.btnContinue,
                    opacity: (loading || !email) ? 0.6 : continueHover ? 0.92 : 1,
                    transform: continueHover && !(loading || !email) ? "translateY(-1px)" : "none",
                    marginBottom: 14,
                  }}>
                  {loading ? "Sending…" : "Send reset link"}
                  <span style={S.arrowCircle}><ChevronRight /></span>
                </button>
                <button
                  onClick={() => switchMode("login")}
                  style={{ background: "none", border: "none", color: "#6B5FD4", cursor: "pointer", fontSize: 13 }}>
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Login / Sign up view ── */
  return (
    <div style={S.page}>
      {!isMobile && <LeftPanel />}

      <div style={{ ...S.right, width: isMobile ? '100%' : S.right.width }}>
        <div style={S.formWrapper}>
          <h1 style={S.formTitle}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            style={{
              ...S.input({ background: "#F2F2F2", marginBottom: 14 }),
              ...(emailFocus ? focusStyle : {}),
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={() => setPasswordFocus(true)}
            onBlur={() => setPasswordFocus(false)}
            style={{
              ...S.input({ background: "#F5F3FA", marginBottom: 22 }),
              ...(passwordFocus ? focusStyle : {}),
            }}
          />

          {error && <div style={S.errorBox}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            onMouseEnter={() => setContinueHover(true)}
            onMouseLeave={() => setContinueHover(false)}
            style={{
              ...S.btnContinue,
              opacity: (loading || !email || !password) ? 0.6 : continueHover ? 0.92 : 1,
              transform: continueHover && !(loading || !email || !password) ? "translateY(-1px)" : "none",
            }}>
            {loading ? "Please wait…" : "Continue"}
            <span style={S.arrowCircle}><ChevronRight /></span>
          </button>

          <div style={S.btnRow}>
            <button
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              onMouseEnter={() => setCreateHover(true)}
              onMouseLeave={() => setCreateHover(false)}
              style={{
                ...S.btnSecondary,
                background: createHover ? "rgba(107,95,212,0.06)" : "transparent",
              }}>
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>

            <button
              onClick={() => switchMode("forgot")}
              onMouseEnter={() => setForgotHover(true)}
              onMouseLeave={() => setForgotHover(false)}
              style={{
                ...S.btnSecondary,
                background: forgotHover ? "rgba(107,95,212,0.06)" : "transparent",
              }}>
              Forgot Password
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
