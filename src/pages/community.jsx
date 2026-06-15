import { useState } from 'react'

const SEEDED_MESSAGES = {
  1: [
    { id: 1, author: 'Rachel', initials: 'R', color: '#C084A0', text: 'Got my AFC results today. 8 follicles. Consultant said it\'s okay but I was hoping for more. Has anyone been through this?', time: '2h ago' },
    { id: 2, author: 'Sophie', initials: 'S', color: '#9B8EC4', text: '8 is actually a solid number. My consultant always says quality over quantity. Sending love your way 💛', time: '1h ago' },
    { id: 3, author: 'Bea', initials: 'B', color: '#7AAB8A', text: 'Starting stims tomorrow. Nervous and excited in equal measure. Any tips for the first injection?', time: '30m ago' },
  ],
  2: [
    { id: 1, author: 'Maya', initials: 'M', color: '#6BA4A0', text: 'Today was hard for no specific reason. Just needed to come here and say that.', time: '3h ago' },
    { id: 2, author: 'Priya', initials: 'P', color: '#C4A76E', text: 'Those days are real and they count. No reason needed. We\'re here. 🤍', time: '2h ago' },
    { id: 3, author: 'Rachel', initials: 'R', color: '#C084A0', text: 'Cried on the way to the clinic this morning for no clear reason. This space means everything.', time: '45m ago' },
  ],
  3: [
    { id: 1, author: 'Sophie', initials: 'S', color: '#9B8EC4', text: 'Found a gentle yoga flow that\'s safe during stims. Happy to share the link if anyone wants it?', time: '5h ago' },
    { id: 2, author: 'Aisha', initials: 'A', color: '#C4A76E', text: 'Please do! I\'ve been nervous about doing anything physical this cycle.', time: '4h ago' },
  ],
}

const COMMUNITIES = [
  { id: 1, emoji: '🌱', name: 'Stage 3–4: Preparing Together',  members: 14, description: 'A space for women in the diagnostic and planning phase. Share test results, protocol questions, and pre-treatment nerves.' },
  { id: 2, emoji: '💛', name: 'Emotional First Aid',             members: 31, description: 'For the days when it is just really hard. No advice, no silver linings. Just support. Open to all stages.' },
  { id: 3, emoji: '🧘', name: 'Yoga & Gentle Movement',          members: 11, description: 'Connecting women who use movement to cope. Share routines and encouragement.' },
  { id: 4, emoji: '👩‍⚕️', name: "Dr Mehra's Open Q&A",           members: 52, description: 'Monthly sessions with a fertility consultant. No question is too small.' },
  { id: 5, emoji: '🌸', name: 'First Round Forum',               members: 27, description: 'For women on their first IVF cycle. A judgment-free space for every question and every small win.' },
]

export default function Community() {
  const [joined, setJoined]         = useState({})
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages]     = useState(SEEDED_MESSAGES)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')   // ← NEW

  function sendMessage() {
    if (!newMessage.trim() || !activeRoom) return
    const msg = {
      id: Date.now(),
      author: 'You',
      initials: 'V',
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => setActiveRoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '22px', lineHeight: 1 }}>←</button>
          <span style={{ fontSize: '24px' }}>{activeRoom.emoji}</span>
          <div>
            <p style={{ color: 'var(--text-h)', fontSize: '15px', fontWeight: '600', margin: 0 }}>{activeRoom.name}</p>
            <p style={{ color: 'var(--text)', fontSize: '11px', opacity: 0.5, margin: 0 }}>{activeRoom.members + 1} members</p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '90px' }}>
          {roomMessages.length === 0 ? (
            <p style={{ color: 'var(--text)', opacity: 0.5, textAlign: 'center', marginTop: '40px' }}>Be the first to say something 🌸</p>
          ) : (
            roomMessages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: msg.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{msg.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-h)', fontSize: '13px', fontWeight: '600' }}>{msg.author}</span>
                    <span style={{ color: 'var(--text)', fontSize: '11px', opacity: 0.4 }}>{msg.time}</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.55', margin: 0, opacity: 0.85 }}>{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ position: 'fixed', bottom: '68px', left: 0, right: 0, padding: '12px 16px', background: 'var(--sidebar)', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Say something to the group..."
            style={{ flex: 1, background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-h)', fontSize: '14px', outline: 'none' }} />
          <button onClick={sendMessage} style={{ background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Send</button>
        </div>
      </div>
    )
  }

  // ── Filter communities by search query ────────────────────────────────────
  const filtered = COMMUNITIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 20px 16px' }}>
      <p style={{ color: 'var(--text-h)', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Communities</p>
      <p style={{ color: 'var(--text)', fontSize: '13px', opacity: 0.6, marginBottom: '20px' }}>Find your people within the journey</p>

      {/* Search bar */}
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search communities…"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--code-bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '11px 16px',
          color: 'var(--text-h)', fontSize: 14, outline: 'none',
          marginBottom: 24,
        }}
      />

      {/* No results */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text)', opacity: 0.55, fontSize: 15 }}>No communities match "{searchQuery}"</p>
        </div>
      )}

      {filtered.map(c => {
        const isJoined = !!joined[c.id]
        return (
          <div key={c.id} onClick={() => isJoined && setActiveRoom(c)}
            style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px', marginBottom: '14px', cursor: isJoined ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{c.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '3px' }}>
                  <p style={{ color: 'var(--text-h)', fontSize: '15px', fontWeight: '600', margin: 0 }}>{c.name}</p>
                  <button onClick={e => { e.stopPropagation(); if (!isJoined) setJoined(prev => ({ ...prev, [c.id]: true })) }}
                    style={{ fontSize: '12px', padding: '5px 14px', borderRadius: '8px', fontWeight: '600', flexShrink: 0, border: isJoined ? '1px solid var(--border)' : '1px solid var(--accent)', background: isJoined ? 'transparent' : 'var(--accent)', color: isJoined ? 'var(--text)' : '#fff', cursor: isJoined ? 'default' : 'pointer' }}>
                    {isJoined ? 'Joined ✓' : 'Join'}
                  </button>
                </div>
                <p style={{ color: 'var(--text)', fontSize: '11px', opacity: 0.45, marginBottom: '6px' }}>{c.members + (isJoined ? 1 : 0)} members</p>
                <p style={{ color: 'var(--text)', fontSize: '13px', opacity: 0.72, lineHeight: '1.5', margin: 0 }}>{c.description}</p>
                {isJoined && <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '500', marginTop: '8px', marginBottom: 0 }}>Tap to enter room →</p>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}