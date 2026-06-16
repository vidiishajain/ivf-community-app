import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Home from './home'
import Learn from './learn'
import Matches from './matches'
import Community from './community'
import Unwind, { INITIAL_UNWIND_STATE } from './unwind'

// Reads the same localStorage keys that matches.jsx writes
function getLastRead(myId, otherId) {
  return localStorage.getItem(`last_read_${myId}_${otherId}`) || null
}

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab]   = useState('learn')
  const [userId, setUserId]         = useState(null)
  const [hasUnread, setHasUnread]   = useState(false)
  const [firstName, setFirstName]   = useState('')
  const [displayName, setDisplayName] = useState('')

  // Unwind state lifted here so it survives tab switches
  const [unwindState, setUnwindState] = useState(INITIAL_UNWIND_STATE)

  // Get the logged-in user's ID and profile once
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        if (profile?.display_name) {
          setDisplayName(profile.display_name)
          setFirstName(profile.display_name.split(' ')[0])
        } else {
          const emailName = user.email?.split('@')[0] || ''
          setDisplayName(emailName)
          setFirstName(emailName)
        }
      }
    }
    getUser()
  }, [session])

  // Check for unread messages whenever userId is set or tab changes
  useEffect(() => {
    if (!userId) return
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
      case 'unwind':    return <Unwind state={unwindState} onStateChange={setUnwindState} />
      default:          return <Learn />
    }
  }

  const navItems = [
    {
      id: 'learn',
      label: 'Learn',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
    },
    {
      id: 'match',
      label: 'Match',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="5"/>
          <circle cx="15" cy="12" r="5"/>
        </svg>
      ),
    },
    {
      id: 'community',
      label: 'Community',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      id: 'unwind',
      label: 'Unwind',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
  ]

  const avatarLetter = (firstName || displayName || '?')[0].toUpperCase()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 200,
        minHeight: '100vh',
        background: '#FFFFFF',
        borderRight: '1px solid #EBEBEB',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 14px',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}>

        {/* Brand */}
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#5B4BD4',
          marginBottom: 36,
          paddingLeft: 8,
          letterSpacing: '-0.3px',
        }}>
          Ember
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const active = activeTab === item.id
            const showBadge = item.id === 'match' && hasUnread && !active
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 44,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#EEEDF9' : 'transparent',
                  color: active ? '#5B4BD4' : '#1A1A1A',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'background 0.15s ease',
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', position: 'relative' }}>
                  {item.icon}
                  {showBadge && (
                    <span style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#5B4BD4',
                      border: '2px solid #FFFFFF',
                    }} />
                  )}
                </span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Bottom section */}
        <div style={{ marginTop: 'auto' }}>

          {/* User profile */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #9B8ED6, #5B4BD4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {avatarLetter}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#1A1A1A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 110,
            }}>
              {displayName || session?.user?.email?.split('@')[0] || ''}
            </span>
          </div>

        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: '#F9F9FB',
        position: 'relative',
      }}>
        <button
          onClick={handleLogout}
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            zIndex: 10,
            background: 'transparent',
            border: '1px solid #EBEBEB',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#1A1A1A',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Log out
        </button>
        {renderContent()}
      </div>

    </div>
  )
}
