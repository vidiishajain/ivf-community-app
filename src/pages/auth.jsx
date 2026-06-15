import { useState } from "react"
import { supabase } from "../lib/supabase"

const P = { purple: "#7C6EAA", light: "#EDE8F5", muted: "#6B6485" }

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>💜</div>
      <h1 style={{ margin: "0 0 6px", color: "#2D2040" }}>IVF Community</h1>
      <p style={{ color: P.muted, marginBottom: 32, fontSize: 14 }}>
        {isLogin ? "Sign in to find your people." : "Create your account to get started."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #C4B8E0", fontSize: 14, outline: "none" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #C4B8E0", fontSize: 14, outline: "none" }}
        />

        {error && (
          <div style={{ background: "#FDEDED", border: "1px solid #E06B6B", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#B04040" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{ padding: "13px 16px", borderRadius: 8, background: P.purple, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
        </button>

        <button
          onClick={() => { setIsLogin(!isLogin); setError(null) }}
          style={{ background: "none", border: "none", color: P.purple, cursor: "pointer", fontSize: 13, padding: "4px 0" }}
        >
          {isLogin ? "No account yet? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  )
}