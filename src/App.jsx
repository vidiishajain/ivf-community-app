import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/auth'
import Disclaimer from './pages/disclaimer'
import Questionnaire from './pages/questionnaire'
import Dashboard from './pages/dashboard'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)

  async function handleReset() {
    if (password !== confirm)  { setError("Passwords don't match."); return }
    if (password.length < 6)   { setError("Password must be at least 6 characters."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(91,75,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B4BD4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h2 style={{ color: '#2D2040', marginBottom: 8 }}>Password updated</h2>
      <p style={{ color: '#6B6485', marginBottom: 24 }}>You can now sign in with your new password.</p>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ padding: '12px 28px', borderRadius: 8, background: '#7C6EAA', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        Sign in
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, fontFamily: 'sans-serif' }}>
      
      <h2 style={{ color: '#2D2040', marginBottom: 6 }}>Set a new password</h2>
      <p style={{ color: '#6B6485', marginBottom: 24, fontSize: 14 }}>Choose something you'll remember.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password" placeholder="New password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #C4B8E0', fontSize: 14, outline: 'none' }}
        />
        <input
          type="password" placeholder="Confirm new password" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #C4B8E0', fontSize: 14, outline: 'none' }}
        />
        {error && (
          <div style={{ background: '#FDEDED', border: '1px solid #E06B6B', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#B04040' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleReset} disabled={loading || !password || !confirm}
          style={{ padding: '13px 16px', borderRadius: 8, background: '#7C6EAA', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession]       = useState(null)
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [isResetting, setIsResetting] = useState(false)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return   // handled by getSession above
      if (_event === 'PASSWORD_RECOVERY') {
        setIsResetting(true)
        setSession(session)
        setLoading(false)
        return
      }
      setSession(session)
      if (!session) {
        setProfile(null)
        setIsResetting(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    fetchProfile(session.user.id)
  }, [session])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text)', opacity: 0.55 }}>Loading…</p>
    </div>
  )

  if (isResetting)           return <ResetPassword />
  if (!session)              return <Auth />
  if (!profile?.consent)     return <Disclaimer session={session} onComplete={() => fetchProfile(session.user.id)} />
  if (!Array.isArray(profile?.feature_vec) || profile.feature_vec.length === 0) return <Questionnaire session={session} onComplete={() => fetchProfile(session.user.id)} />
  return <Dashboard session={session} />
}

export default App