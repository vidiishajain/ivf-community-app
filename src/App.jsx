import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/auth'
import Disclaimer from './pages/disclaimer'
import Questionnaire from './pages/questionnaire'
import Dashboard from './pages/dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [session])

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--text)', opacity: 0.55 }}>Loading…</p>
      </div>
    )
  }

  if (!session)              return <Auth />
  if (!profile?.consent)     return <Disclaimer session={session} />
  if (!profile?.feature_vec) return <Questionnaire session={session} />
  return <Dashboard session={session} />
}

export default App