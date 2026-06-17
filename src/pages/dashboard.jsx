import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
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

const FONT = "'Quicksand', system-ui, sans-serif"

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab]     = useState('home')
  const [userId, setUserId]           = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [hasUnread, setHasUnread]     = useState(false)

  // Unwind state lifted here so it survives tab switches
  const [unwindState, setUnwindState] = useState(INITIAL_UNWIND_STATE)

  const brandRef = useRef(null)

  useGSAP(() => {
    if (!brandRef.current) return
    gsap.from(brandRef.current, {
      opacity: 0,
      x: -12,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.1,
    })
  }, [])

  // Get the logged-in user's ID and display name once
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: prof } = await supabase
          .from('profiles').select('display_name').eq('id', user.id).single()
        if (prof?.display_name) setDisplayName(prof.display_name)
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
      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      const anyUnreadMsg = (msgs || []).some(msg => {
        const lastRead = getLastRead(userId, msg.sender_id)
        if (!lastRead) return true
        return new Date(msg.created_at) > new Date(lastRead)
      })
      const { data: pending } = await supabase
        .from('connections').select('id')
        .eq('receiver_id', userId).eq('status', 'pending').limit(1)
      setHasUnread(anyUnreadMsg || (pending && pending.length > 0))
    } catch (e) { console.error('Unread check error:', e) }
  }

  async function handleLogout() { await supabase.auth.signOut() }

  function renderContent() {
    switch (activeTab) {
      case 'home':      return <Home session={session} onNavigate={setActiveTab} />
      case 'learn':     return <Learn />
      case 'match':     return <Matches session={session} />
      case 'community': return <Community />
      case 'unwind':    return <Unwind state={unwindState} onStateChange={setUnwindState} />
      default:          return <Home session={session} />
    }
  }

  const avatarLetter = (displayName || session?.user?.email || 'U')[0].toUpperCase()

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <path d="M9 21V12h6v9"/>
        </svg>
      ),
    },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
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
        <div
          ref={brandRef}
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#5B4BD4',
            marginBottom: 36,
            paddingLeft: 8,
            letterSpacing: '-0.2px',
            fontFamily: FONT,
          }}
        >
          Ember
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const active    = activeTab === item.id
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
                  background: 'transparent',
                  color: active ? '#5B4BD4' : '#1A1A1A',
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  fontFamily: FONT,
                  textAlign: 'left',
                  width: '100%',
                  position: 'relative',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavPill"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 10,
                      background: '#EEEDF9',
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', flexShrink: 0 }}>
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
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Bottom section — pushed to bottom */}
        <div style={{ marginTop: 'auto' }}>

          {/* Log out */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 44,
              padding: '0 10px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#888888',
              fontWeight: 500,
              fontSize: 14,
              fontFamily: FONT,
              width: '100%',
              textAlign: 'left',
              marginBottom: 16,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Log out
          </button>

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
              flexShrink: 0,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: FONT,
            }}>
              {avatarLetter}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#1A1A1A',
              fontFamily: FONT,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 110,
            }}>
              {displayName || session?.user?.email || ''}
            </span>
          </div>

        </div>
      </div>

      {/* Main content area */}
      <div style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: '#FFFFFF',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ height: '100%' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  )
}
