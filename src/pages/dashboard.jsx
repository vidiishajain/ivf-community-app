import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Home from './home'
import Learn from './learn'
import Matches from './matches'
import Community from './community'
import Unwind from './unwind'

// Reads the same localStorage keys that matches.jsx writes
function getLastRead(myId, otherId) {
  return localStorage.getItem(`last_read_${myId}_${otherId}`) || null
}

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('home')
  const [userId, setUserId]       = useState(null)
  const [hasUnread, setHasUnread] = useState(false)

  // Get the logged-in user's ID once
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [session])

  // Check for unread messages whenever userId is set or tab changes
  useEffect(() => {
    if (!userId) return
    // Clear badge when user goes to Match tab (the toggle inside will handle it)
    if (activeTab === 'match') { setHasUnread(false); return }
    checkUnreads()
  }, [userId, activeTab])

  async function checkUnreads() {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!data) return
      const anyUnread = data.some(msg => {
        const lastRead = getLastRead(userId, msg.sender_id)
        if (!lastRead) return true
        return new Date(msg.created_at) > new Date(lastRead)
      })
      setHasUnread(anyUnread)
    } catch (e) { console.error('Unread check error:', e) }
  }

  async function handleLogout() { await supabase.auth.signOut() }

  function renderContent() {
    switch (activeTab) {
      case 'home':      return <Home session={session} />
      case 'learn':     return <Learn />
      case 'match':     return <Matches session={session} />
      case 'community': return <Community />
      case 'unwind':    return <Unwind />
      default:          return <Home session={session} />
    }
  }

  const tabs = [
    {
      id: 'home', label: 'Home',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text)'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'learn', label: 'Learn',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text)'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'match', label: 'Match',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text)'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'community', label: 'Community',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text)'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'unwind', label: 'Unwind',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text)'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sidebar)', flexShrink: 0 }}>
        <span style={{ color: 'var(--text-h)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
          🔥 Ember
        </span>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
          Log out
        </button>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {renderContent()}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--sidebar)', zIndex: 100 }}>
        {tabs.map((tab) => {
          const active    = activeTab === tab.id
          const showBadge = tab.id === 'match' && hasUnread && !active

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0 14px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 4, position: 'relative' }}>

              {/* Icon with unread dot */}
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {tab.icon(active)}
                {showBadge && (
                  <div style={{
                    position:  'absolute',
                    top:       -2,
                    right:     -2,
                    width:     9,
                    height:    9,
                    borderRadius: '50%',
                    background:  'var(--accent)',
                    border:      '2px solid var(--sidebar)',
                  }} />
                )}
              </div>

              <span style={{ fontSize: 11, color: active ? 'var(--accent)' : 'var(--text)', fontWeight: active ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

    </div>
  )
}