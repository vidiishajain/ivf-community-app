import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'

const FONT = "'Quicksand', system-ui, sans-serif"

const SEEDED_MESSAGES = {
  1: [
    { id: 1, author: 'Rachel', initials: 'R', color: '#C084A0', text: 'Got my AFC results today. 8 follicles. Consultant said it\'s okay but I was hoping for more. Has anyone been through this?', time: '2h ago' },
    { id: 2, author: 'Sophie', initials: 'S', color: '#9B8EC4', text: '8 is actually a solid number. My consultant always says quality over quantity. Sending love your way.', time: '1h ago' },
    { id: 3, author: 'Bea', initials: 'B', color: '#7AAB8A', text: 'Starting stims tomorrow. Nervous and excited in equal measure. Any tips for the first injection?', time: '30m ago' },
  ],
  2: [
    { id: 1, author: 'Maya', initials: 'M', color: '#6BA4A0', text: 'Today was hard for no specific reason. Just needed to come here and say that.', time: '3h ago' },
    { id: 2, author: 'Priya', initials: 'P', color: '#C4A76E', text: 'Those days are real and they count. No reason needed. We\'re here.', time: '2h ago' },
    { id: 3, author: 'Rachel', initials: 'R', color: '#C084A0', text: 'Cried on the way to the clinic this morning for no clear reason. This space means everything.', time: '45m ago' },
  ],
  3: [
    { id: 1, author: 'Sophie', initials: 'S', color: '#9B8EC4', text: 'Found a gentle yoga flow that\'s safe during stims. Happy to share the link if anyone wants it?', time: '5h ago' },
    { id: 2, author: 'Aisha', initials: 'A', color: '#C4A76E', text: 'Please do! I\'ve been nervous about doing anything physical this cycle.', time: '4h ago' },
  ],
}

const COMMUNITIES = [
  { id: 1, color: '#3D7A65', name: 'Stage 3–4: Preparing Together',  members: 14, description: 'A space for women in the diagnostic and planning phase. Share test results, protocol questions, and pre-treatment nerves.' },
  { id: 2, color: '#5B6FA8', name: 'Emotional First Aid',             members: 31, description: 'For the days when it is just really hard. No advice, no silver linings. Just support. Open to all stages.' },
  { id: 3, color: '#8A5C9E', name: 'Yoga & Gentle Movement',          members: 11, description: 'Connecting women who use movement to cope. Share routines and encouragement.' },
  { id: 4, color: '#A06B3C', name: "Dr Mehra's Open Q&A",             members: 52, description: 'Monthly sessions with a fertility consultant. No question is too small.' },
  { id: 5, color: '#5B4BD4', name: 'First Round Forum',               members: 27, description: 'For women on their first IVF cycle. A judgment-free space for every question and every small win.' },
]

// ── Hover-animated community card ─────────────────────────────────────────────

function CommunityCard({ c, isJoined, onJoin, onEnter }) {
  const [springs, api] = useSpring(() => ({
    scale: 1,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    config: { tension: 300, friction: 20 },
  }))

  return (
    <animated.div
      onClick={onEnter}
      style={{
        background: '#F7F7FA',
        border: '1.5px solid #EBEBEB',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 14,
        cursor: isJoined ? 'pointer' : 'default',
        scale: springs.scale,
        boxShadow: springs.boxShadow,
      }}
      onMouseEnter={() => api.start({ scale: 1.012, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' })}
      onMouseLeave={() => api.start({ scale: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' })}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Color initial instead of emoji */}
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: c.color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#ffffff',
        }}>
          {c.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
            <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: 0, fontFamily: FONT }}>{c.name}</p>
            <button
              onClick={e => { e.stopPropagation(); onJoin() }}
              style={{
                fontSize: 12, padding: '5px 14px', borderRadius: 8, fontWeight: 600, flexShrink: 0,
                border: isJoined ? '1px solid #EBEBEB' : '1px solid #5B4BD4',
                background: isJoined ? 'transparent' : '#5B4BD4',
                color: isJoined ? '#888888' : '#fff',
                cursor: isJoined ? 'default' : 'pointer', fontFamily: FONT,
              }}>
              {isJoined ? 'Joined' : 'Join'}
            </button>
          </div>
          <p style={{ color: '#888888', fontSize: 11, marginBottom: 6, fontFamily: FONT }}>{c.members + (isJoined ? 1 : 0)} members</p>
          <p style={{ color: '#555555', fontSize: 13, lineHeight: 1.5, margin: 0, fontWeight: 500, fontFamily: FONT }}>{c.description}</p>
          {isJoined && <p style={{ color: '#5B4BD4', fontSize: 12, fontWeight: 500, marginTop: 8, marginBottom: 0, fontFamily: FONT }}>Click to enter room →</p>}
        </div>
      </div>
    </animated.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Community() {
  const [joined, setJoined]           = useState({})
  const [activeRoom, setActiveRoom]   = useState(null)
  const [messages, setMessages]       = useState(SEEDED_MESSAGES)
  const [newMessage, setNewMessage]   = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [myInitials, setMyInitials]   = useState('?')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.display_name) {
            const initials = data.display_name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
            setMyInitials(initials)
          }
        })
    })
  }, [])

  function sendMessage() {
    if (!newMessage.trim() || !activeRoom) return
    const msg = {
      id: Date.now(),
      author: 'You',
      initials: myInitials,
      color: '#9B8EC4',
      text: newMessage.trim(),
      time: 'just now',
    }
    setMessages(prev => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] || []), msg],
    }))
    setNewMessage('')
  }

  // ── Room view ─────────────────────────────────────────────────────────────
  if (activeRoom) {
    const roomMessages = messages[activeRoom.id] || []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: FONT }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBEBEB', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setActiveRoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', fontSize: 22, lineHeight: 1 }}>←</button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: activeRoom.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {activeRoom.name[0]}
          </div>
          <div>
            <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: 0, fontFamily: FONT }}>{activeRoom.name}</p>
            <p style={{ color: '#888888', fontSize: 11, margin: 0, fontFamily: FONT }}>{activeRoom.members + 1} members</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {roomMessages.length === 0 ? (
            <p style={{ color: '#888888', textAlign: 'center', marginTop: 40, fontFamily: FONT }}>Be the first to say something.</p>
          ) : (
            roomMessages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{msg.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#111111', fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{msg.author}</span>
                    <span style={{ color: '#888888', fontSize: 11, fontFamily: FONT }}>{msg.time}</span>
                  </div>
                  <p style={{ color: '#555555', fontSize: 14, lineHeight: 1.55, margin: 0, fontWeight: 500, fontFamily: FONT }}>{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, padding: '12px 24px', background: '#FFFFFF', borderTop: '1px solid #EBEBEB', display: 'flex', gap: 10 }}>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Say something to the group…"
            style={{ flex: 1, background: '#F7F7FA', border: '1px solid #EBEBEB', borderRadius: 10, padding: '10px 14px', color: '#111111', fontSize: 14, outline: 'none', fontFamily: FONT }}
          />
          <button onClick={sendMessage} style={{ background: '#5B4BD4', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT }}>Send</button>
        </div>
      </div>
    )
  }

  const filtered = COMMUNITIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 60px 48px', background: '#FFFFFF', fontFamily: FONT }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111111', letterSpacing: '-0.5px', margin: '0 0 8px 0', fontFamily: FONT }}>Communities</h1>
      <p style={{ color: '#888888', fontSize: 14, marginBottom: 28, fontFamily: FONT }}>Find your people within the journey</p>

      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search communities…"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#F7F7FA', border: '1.5px solid #EBEBEB',
          borderRadius: 12, padding: '11px 16px',
          color: '#111111', fontSize: 14, outline: 'none',
          marginBottom: 24, fontFamily: FONT,
        }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: '#888888', fontSize: 15, fontFamily: FONT }}>No communities match "{searchQuery}"</p>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
        }}
      >
        {filtered.map(c => {
          const isJoined = !!joined[c.id]
          return (
            <motion.div
              key={c.id}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
              }}
            >
              <CommunityCard
                c={c}
                isJoined={isJoined}
                onJoin={() => { if (!isJoined) setJoined(prev => ({ ...prev, [c.id]: true })) }}
                onEnter={() => isJoined && setActiveRoom(c)}
              />
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
