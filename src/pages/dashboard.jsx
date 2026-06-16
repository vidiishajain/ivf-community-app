import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Home from './home'
import Learn from './learn'
import Matches from './matches'
import Community from './community'
import Unwind, { INITIAL_UNWIND_STATE } from './unwind'
import { motion, AnimatePresence } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const FONT = "'Quicksand', system-ui, sans-serif"
const SIDEBAR_W = 240

function getLastRead(myId, otherId) {
  return localStorage.getItem(`last_read_${myId}_${otherId}`) || null
}

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab]   = useState('home')
  const [userId, setUserId]         = useState(null)
  const [hasUnread, setHasUnread]   = useState(false)
  const [unwindState, setUnwindState] = useState(INITIAL_UNWIND_STATE)

  const brandRef = useRef(null)

  useGSAP(() => {
    if (!brandRef.current) return
    gsap.from(brandRef.current, {
      opacity: 0, x: -12, duration: 0.5, ease: 'power2.out', delay: 0.1,
    })
  }, [])

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [session])

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
      case 'home':      return <Home session={session} onNavigate={setActiveTab} />
      case 'learn':     return <Learn />
      case 'match':     return <Matches session={session} />
      case 'community': return <Community />
      case 'unwind':    return <Unwind state={unwindState} onStateChange={setUnwindState} />
      default:          return <Home session={session} />
    }
  }

  const tabs = [
    {
      id: 'home', label: 'Home',
      icon: (active) => (
        <svg width="20" height="20" fill="none" stroke={active ? '#5B4BD4' : '#888888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'learn', label: 'Learn',
      icon: (active) => (
        <svg width="20" height="20" fill="none" stroke={active ? '#5B4BD4' : '#888888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'match', label: 'Match',
      icon: (active) => (
        <svg width="20" height="20" fill="none" stroke={active ? '#5B4BD4' : '#888888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'community', label: 'Community',
      icon: (active) => (
        <svg width="20" height="20" fill="none" stroke={active ? '#5B4BD4' : '#888888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'unwind', label: 'Unwind',
      icon: (active) => (
        <svg width="20" height="20" fill="none" stroke={active ? '#5B4BD4' : '#888888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#FFFFFF', fontFamily: FONT }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: SIDEBAR_W,
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #EBEBEB',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        padding: '32px 16px 24px',
      }}>
        {/* Brand */}
        <div ref={brandRef} style={{ padding: '0 8px', marginBottom: 36 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#111111', letterSpacing: '-0.5px', fontFamily: FONT }}>
            Ember
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            const showBadge = tab.id === 'match' && hasUnread && !active

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: FONT,
                }}
              >
                {active && (
                  <motion.div
                    layoutId="sideNavPill"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 10,
                      background: 'rgba(91, 75, 212, 0.08)',
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {tab.icon(active)}
                  {showBadge && (
                    <div style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#5B4BD4', border: '2px solid #FFFFFF',
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#5B4BD4' : '#888888',
                  zIndex: 1,
                  fontFamily: FONT,
                  transition: 'color 0.15s ease',
                }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'transparent',
            border: '1px solid #EBEBEB',
            borderRadius: 10,
            cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 500,
            color: '#888888',
            width: '100%',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: SIDEBAR_W,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  )
}
