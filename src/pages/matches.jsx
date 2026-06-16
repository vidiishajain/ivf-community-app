import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getMatches } from '../lib/matching'
import ConnectionFeedback from './ConnectionFeedback'

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#3D7A65', '#1A3D30'],
  ['#5B6FA8', '#2A3660'],
  ['#8A5C9E', '#4A2560'],
  ['#A06B3C', '#5A3510'],
  ['#5A8A5A', '#2A4A2A'],
  ['#6B7FA0', '#333F60'],
]

function getAvatarColor(name) {
  const n = name ?? ''
  if (!n) return AVATAR_COLORS[0]
  return AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length]
}
function getInitials(name) {
  const n = name ?? ''
  if (!n) return '?'
  return n.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
}
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now  = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Track read state per conversation in localStorage
function getLastRead(myId, otherId) {
  return localStorage.getItem(`last_read_${myId}_${otherId}`) || null
}
function markAsRead(myId, otherId) {
  localStorage.setItem(`last_read_${myId}_${otherId}`, new Date().toISOString())
}
function isUnread(myId, lastMessage) {
  if (!lastMessage) return false
  if (lastMessage.sender_id === myId) return false
  const lastRead = getLastRead(myId, lastMessage.sender_id)
  if (!lastRead) return true
  return new Date(lastMessage.created_at) > new Date(lastRead)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  1:'Beginning the journey', 2:'Initial consultations', 3:'Preparing for treatment',
  4:'Medication & stimulation', 5:'Egg retrieval', 6:'Fertilisation',
  7:'Embryo development', 8:'Transfer preparation', 9:'Embryo transfer',
  10:'Two-week wait', 11:'Awaiting results', 12:'Reflection & recovery',
}
const PERSONA_PHRASES = {
  1: "She's someone who finds it easier to say the hard things out loud.",
  2: "She'd rather have honest answers than empty reassurance.",
  3: "She connects through real stories, not advice. She's been there.",
  4: "She's the kind of person who just sits with you. No fixing. No advice.",
}
const PATHWAY_CONTEXT = {
  1: "On the NHS pathway.",
  2: "Funding this herself.",
  3: "Combining NHS and private treatment.",
  4: "Going through treatment abroad.",
}
const PATHWAY_LABELS = {
  1: 'NHS funded', 2: 'Privately funded', 3: 'NHS & private', 4: 'International clinic',
}
const ROUND_LABELS = {
  1: '1st round', 2: '2nd round', 3: '3rd round', 4: '4th round or more',
}
const HOBBY_LABELS = {
  exercise:   'exercise',
  creative:   'creative activities',
  nature:     'being in nature',
  meditation: 'meditation',
  social:     'socialising',
}
const ICEBREAKERS = [
  "Hi! It's really nice to connect with someone at a similar stage 🌸 How are you finding things at the moment?",
  "Hey! I saw we matched — it feels reassuring to find someone who gets it. How are you doing?",
  "Hi there 💜 How are you holding up through everything?",
  "Hello! It helps so much to talk to someone who actually understands. How's your journey going?",
  "Hi! I'd love to hear how you're navigating all of this.",
]

// ─── Card logic ──────────────────────────────────────────────────────────────

function getRound(featureVec) {
  if (!featureVec || !Array.isArray(featureVec) || featureVec.length < 4) return null
  const raw = featureVec[3]
  if (raw === null || raw === undefined) return null
  const rounded = Math.round(raw * 4)
  return rounded > 0 ? rounded : null
}
function getSharedHobbies(myHobbies, theirHobbies) {
  if (!myHobbies || !theirHobbies) return []
  return myHobbies.filter(h => theirHobbies.includes(h))
}
function getSmartLine(profile) {
  const persona = PERSONA_PHRASES[profile.persona]
  const pathway = PATHWAY_CONTEXT[profile.pathway]
  if (persona && pathway) return `${persona} ${pathway}`
  if (persona)            return persona
  return null
}
function matchLabel(pct) {
  if (pct >= 92) return 'Remarkably close match'
  if (pct >= 85) return 'Very strong match'
  if (pct >= 75) return 'Strong match'
  if (pct >= 65) return 'Good match'
  return 'Worth connecting'
}

// ─── ChatView ────────────────────────────────────────────────────────────────

function ChatView({ profile, myId, onBack }) {
  const firstName               = (profile.display_name || '').split(' ')[0]
  const colorPair               = getAvatarColor(profile.display_name)
  const color                   = colorPair[0]
  const ini                     = getInitials(profile.display_name)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loadingMsgs, setLoadingMsgs]   = useState(true)
  const [bottomOffset, setBottomOffset] = useState(68)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load existing messages
  useEffect(() => { loadMessages() }, [])

  async function loadMessages() {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true })
      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          id:   m.id,
          from: m.sender_id === myId ? 'me' : 'them',
          text: m.content,
          time: formatTime(m.created_at),
        })))
      }
    } catch (e) { console.error('Load messages error:', e) }
    finally {
      setLoadingMsgs(false)
      markAsRead(myId, profile.id)
    }
  }

  // Realtime subscription — listens for new messages in this conversation
  useEffect(() => {
    if (!myId || !profile?.id) return

    const channel = supabase
      .channel(`chat_${[myId, profile.id].sort().join('_')}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `receiver_id=eq.${myId}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.sender_id !== profile.id) return
        setMessages(prev => [...prev, {
          id:   msg.id,
          from: 'them',
          text: msg.content,
          time: formatTime(msg.created_at),
        }])
        markAsRead(myId, profile.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myId, profile?.id])

  // Keyboard offset for mobile
  useEffect(() => {
    if (!window.visualViewport) return
    function onViewportChange() {
      const vv = window.visualViewport
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop
      setBottomOffset(Math.max(68, keyboardHeight + 8))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    window.visualViewport.addEventListener('resize', onViewportChange)
    window.visualViewport.addEventListener('scroll', onViewportChange)
    return () => {
      window.visualViewport.removeEventListener('resize', onViewportChange)
      window.visualViewport.removeEventListener('scroll', onViewportChange)
    }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text) {
    const content = (text !== undefined ? text : input).trim()
    if (!content) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'me', text: content, time: 'just now' }])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      await supabase.from('messages').insert({ sender_id: myId, receiver_id: profile.id, content })
    } catch (e) { console.error('Send error:', e) }
  }

  const showIcebreakers = !loadingMsgs && messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 22 }}>←</button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini}</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-h)', fontSize: 15, fontWeight: 600, margin: 0 }}>{profile.display_name}</p>
          <p style={{ color: 'var(--text)', fontSize: 11, opacity: 0.5, margin: 0 }}>Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: 11, color: 'var(--text)', opacity: 0.5 }}>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: `${bottomOffset + 60}px` }}>

        {loadingMsgs && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--text)', opacity: 0.5, fontSize: 14 }}>Loading…</p>
          </div>
        )}

        {showIcebreakers && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: 'var(--text)', fontSize: 12, opacity: 0.55, marginBottom: 12, textAlign: 'center' }}>
              You're connected 🌸 Start the conversation:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ICEBREAKERS.slice(0, 3).map((ic, i) => (
                <button key={i} onClick={() => setInput(ic)}
                  style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', color: 'var(--text)', fontSize: 13, textAlign: 'left', cursor: 'pointer', lineHeight: 1.55 }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.from === 'me'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
              {!isMe && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>{ini}</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{ padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--accent)' : 'var(--code-bg)', border: isMe ? 'none' : '1px solid var(--border)' }}>
                  <p style={{ color: isMe ? '#fff' : 'var(--text-h)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                </div>
                <p style={{ color: 'var(--text)', fontSize: 10, opacity: 0.4, margin: '3px 4px 0', textAlign: isMe ? 'right' : 'left' }}>{msg.time}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: `${bottomOffset}px`, padding: '12px 16px', background: 'var(--sidebar)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, transition: 'bottom 0.15s ease' }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 350)}
          placeholder={`Message ${firstName}…`}
          style={{ flex: 1, background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-h)', fontSize: 14, outline: 'none' }} />
        <button onClick={() => send()} style={{ background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Send</button>
      </div>
    </div>
  )
}

// ─── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({ myId, onOpenChat }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => { loadConversations() }, [])

  async function loadConversations() {
    try {
      const { data: conns } = await supabase
        .from('connections')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`)

      if (!conns || conns.length === 0) { setLoading(false); return }

      const otherIds = conns.map(c => c.requester_id === myId ? c.receiver_id : c.requester_id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, ivf_stage')
        .in('id', otherIds)

      const { data: allMsgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false })

      const lastMsgMap = {}
      ;(allMsgs || []).forEach(msg => {
        const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id
        if (!lastMsgMap[otherId]) lastMsgMap[otherId] = msg
      })

      const convs = (profiles || []).map(p => ({
        profile:     p,
        lastMessage: lastMsgMap[p.id] || null,
      })).sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
      })

      setConversations(convs)
    } catch (e) { console.error('Load conversations error:', e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>Loading conversations…</p>
    </div>
  )

  if (conversations.length === 0) return (
    <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
      <p style={{ color: 'var(--text-h)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No connections yet</p>
      <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.7, margin: 0 }}>Head to Find Matches to connect with someone on the same path.</p>
    </div>
  )

  return (
    <div>
      {conversations.map(({ profile, lastMessage }) => {
        const colorPair = getAvatarColor(profile.display_name)
        const color     = colorPair[0]
        const ini       = getInitials(profile.display_name)
        const unread    = isUnread(myId, lastMessage)
        const preview   = lastMessage
          ? (lastMessage.content.length > 52 ? lastMessage.content.slice(0, 52) + '…' : lastMessage.content)
          : 'Start a conversation'
        const timeStr   = lastMessage ? formatTime(lastMessage.created_at) : ''

        return (
          <button key={profile.id} onClick={() => onOpenChat(profile)}
            style={{ width: '100%', background: unread ? 'var(--code-bg)' : 'var(--code-bg)', border: `1px solid ${unread ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}>

            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>{ini}</div>
              {unread && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ color: 'var(--text-h)', fontSize: 15, fontWeight: unread ? 700 : 600, margin: 0 }}>{profile.display_name}</p>
                {timeStr && <span style={{ color: unread ? 'var(--accent)' : 'var(--text)', fontSize: 11, opacity: unread ? 1 : 0.45, flexShrink: 0, fontWeight: unread ? 600 : 400 }}>{timeStr}</span>}
              </div>
              <p style={{ color: unread ? 'var(--text-h)' : 'var(--text)', fontSize: 13, opacity: lastMessage ? (unread ? 0.9 : 0.65) : 0.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: lastMessage ? 'normal' : 'italic', fontWeight: unread ? 500 : 400 }}>
                {preview}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Matches export ──────────────────────────────────────────────────────

export default function Matches() {
  const [currentProfile, setCurrentProfile] = useState(null)
  const [myId, setMyId]                     = useState(null)
  const [matches, setMatches]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [connections, setConnections]       = useState({})
  const [connecting, setConnecting]         = useState({})
  const [removed, setRemoved]               = useState({})
  const [rated, setRated]                   = useState({})
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [chatTarget, setChatTarget]         = useState(null)
  const [view, setView]                     = useState('matches')
  const [hasUnread, setHasUnread]           = useState(false)

  useEffect(() => { loadMatches() }, [])

  useEffect(() => {
    if (!myId) return
    if (view === 'messages') { setHasUnread(false); return }
    checkUnreads()
  }, [myId, view])

  async function checkUnreads() {
    try {
      const { data } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('receiver_id', myId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!data) return
      const anyUnread = data.some(msg => {
        const lastRead = getLastRead(myId, msg.sender_id)
        if (!lastRead) return true
        return new Date(msg.created_at) > new Date(lastRead)
      })
      setHasUnread(anyUnread)
    } catch (e) { console.error(e) }
  }

  async function loadMatches() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user.id)
      const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentProfile(me)
      const { data: everyone } = await supabase.from('profiles').select('*').neq('id', user.id)
      const valid = (everyone || []).filter(p => p.display_name && p.feature_vec)
      setMatches(getMatches(me, valid).slice(0, 5))
      const { data: conns } = await supabase.from('connections').select('receiver_id').eq('requester_id', user.id)
      if (conns) { const m = {}; conns.forEach(c => { m[c.receiver_id] = true }); setConnections(m) }
      const { data: existingRatings } = await supabase.from('connection_feedback').select('reviewed_id').eq('reviewer_id', user.id)
      if (existingRatings) { const m = {}; existingRatings.forEach(r => { m[r.reviewed_id] = true }); setRated(m) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleConnect(profileId) {
    if (connecting[profileId]) return
    setConnecting(prev => ({ ...prev, [profileId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existing } = await supabase.from('connections').select('id')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`)
      if (existing && existing.length > 0) { setConnections(prev => ({ ...prev, [profileId]: true })); return }
      await supabase.from('connections').insert({ requester_id: user.id, receiver_id: profileId, status: 'accepted' })
      setConnections(prev => ({ ...prev, [profileId]: true }))
    } catch (e) { console.error('Connect error:', e) }
    finally { setConnecting(prev => ({ ...prev, [profileId]: false })) }
  }

  async function handleThumbsUp(profileId) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('feedback').insert({ rater_id: user.id, rated_id: profileId, score: 5 })
  }
  async function handleThumbsDown(profileId) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('feedback').insert({ rater_id: user.id, rated_id: profileId, score: 1 })
    setRemoved(prev => ({ ...prev, [profileId]: true }))
  }

  // Full-screen overlays
  if (chatTarget) return (
    <ChatView profile={chatTarget} myId={myId} onBack={() => { setChatTarget(null); checkUnreads() }} />
  )
  if (feedbackTarget) return (
    <ConnectionFeedback
      reviewedId={feedbackTarget.id}
      onDone={() => { setRated(p => ({...p, [feedbackTarget.id]: true})); setFeedbackTarget(null) }}
      onBack={() => setFeedbackTarget(null)} />
  )

  const visible = matches.filter(m => !removed[m.profile.id])

  return (
    <div style={{
      padding: '48px 48px 60px 48px',
      background: '#FFFFFF',
      minHeight: '100%',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Heading */}
      <h1 style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#111111',
        letterSpacing: '-0.8px',
        margin: '0 0 24px 0',
      }}>
        Match
      </h1>

      {/* View toggle */}
      <div style={{
        display: 'inline-flex',
        gap: 6,
        marginBottom: 28,
        background: '#F0F0F4',
        padding: 4,
        borderRadius: 999,
      }}>
        <button
          onClick={() => setView('matches')}
          style={{
            padding: '8px 22px',
            borderRadius: 999,
            border: 'none',
            fontSize: 14,
            fontWeight: view === 'matches' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: view === 'matches' ? '#FFFFFF' : 'transparent',
            color: view === 'matches' ? '#111111' : '#888888',
            boxShadow: view === 'matches' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
          }}
        >
          Find Matches
        </button>
        <button
          onClick={() => setView('messages')}
          style={{
            padding: '8px 22px',
            borderRadius: 999,
            border: 'none',
            fontSize: 14,
            fontWeight: view === 'messages' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: view === 'messages' ? '#FFFFFF' : 'transparent',
            color: view === 'messages' ? '#111111' : '#888888',
            boxShadow: view === 'messages' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Messages
          {hasUnread && view !== 'messages' && (
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#5B4BD4',
              display: 'inline-block',
              flexShrink: 0,
            }} />
          )}
        </button>
      </div>

      {/* Messages view */}
      {view === 'messages' && (
        <ConversationList myId={myId} onOpenChat={(profile) => setChatTarget(profile)} />
      )}

      {/* Matches view */}
      {view === 'matches' && (
        <>
          {loading && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ color: '#888888', fontSize: 15 }}>Finding your matches…</p>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div style={{
              background: '#F7F7FA',
              border: '1.5px solid #EBEBEB',
              borderRadius: 18,
              padding: 40,
              textAlign: 'center',
              color: '#888888',
              fontSize: 15,
              gridColumn: '1 / -1',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
              <p style={{ fontWeight: 600, color: '#111111', marginBottom: 8, fontSize: 16 }}>More people are joining</p>
              <p style={{ margin: 0, fontSize: 14 }}>No close matches yet. As more women join, we'll find the right people for you.</p>
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}>
              {visible.map(({ profile, matchPct }, i) => {
                const connected    = connections[profile.id]
                const isConnecting = connecting[profile.id]
                const hasRated     = rated[profile.id]
                const pct          = Math.round(matchPct)
                const colorPair    = getAvatarColor(profile.display_name)
                const ini          = getInitials(profile.display_name)
                const smartLine    = getSmartLine(profile)
                const sameStage    = currentProfile?.ivf_stage === profile.ivf_stage

                const round            = getRound(profile.feature_vec)
                const roundLabel       = ROUND_LABELS[round] || null
                const pathwayLabel     = PATHWAY_LABELS[profile.pathway] || null
                const fundingRoundLine = [pathwayLabel, roundLabel].filter(Boolean).join(' · ')

                const sharedHobbies = getSharedHobbies(currentProfile?.hobbies_vec, profile.hobbies_vec)
                const hobbyNames    = sharedHobbies.slice(0, 2).map(h => HOBBY_LABELS[h] || h)
                const hobbyLine     = hobbyNames.length > 0
                  ? `You both unwind through ${hobbyNames.join(' and ')}`
                  : null

                return (
                  <MatchCard
                    key={profile.id}
                    profile={profile}
                    pct={pct}
                    colorPair={colorPair}
                    ini={ini}
                    smartLine={smartLine}
                    connected={connected}
                    isConnecting={isConnecting}
                    hasRated={hasRated}
                    onConnect={() => handleConnect(profile.id)}
                    onThumbsUp={() => handleThumbsUp(profile.id)}
                    onThumbsDown={() => handleThumbsDown(profile.id)}
                    onMessage={() => setChatTarget(profile)}
                    onRate={() => setFeedbackTarget(profile)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ profile, pct, colorPair, ini, smartLine, connected, isConnecting, hasRated, onConnect, onThumbsUp, onThumbsDown, onMessage, onRate }) {
  const [hovered, setHovered]           = useState(false)
  const [connectHover, setConnectHover] = useState(false)
  const [msgHover, setMsgHover]         = useState(false)
  const [upHover, setUpHover]           = useState(false)
  const [downHover, setDownHover]       = useState(false)

  const firstName = profile.display_name?.split(' ')[0] || profile.display_name

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#F7F7FA',
        border: '1.5px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'box-shadow 0.18s ease',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* 1. Avatar + Name + Stage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: `linear-gradient(145deg, ${colorPair[0]}, ${colorPair[1]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}>
          {ini}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{
            fontSize: 19,
            fontWeight: 700,
            color: '#111111',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}>
            {profile.display_name?.split(' ')[0]}{profile.age ? `, ${profile.age}` : ''}
          </span>
          <span style={{ fontSize: 13, color: '#888888', fontWeight: 400 }}>
            Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}
          </span>
        </div>
      </div>

      {/* 2. Match quality badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#111111">
          <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"/>
        </svg>
        <span style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: '#111111',
        }}>
          {matchLabel(pct)}
        </span>
      </div>

      {/* 3. Smart insight line */}
      {smartLine && (
        <p style={{
          fontSize: 13.5,
          color: '#555555',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {smartLine}
        </p>
      )}

      {/* 4. Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        {hasRated ? (
          <span style={{ fontSize: 13, color: '#5B4BD4', fontWeight: 600 }}>Rated ✓</span>
        ) : connected ? (
          <>
            <button
              onClick={onMessage}
              onMouseEnter={() => setMsgHover(true)}
              onMouseLeave={() => setMsgHover(false)}
              style={{
                flex: 1,
                height: 42,
                background: '#5B4BD4',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: msgHover ? 0.9 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              💬 Message {firstName}
            </button>
            <button
              onClick={onRate}
              style={{
                padding: '0 18px',
                height: 42,
                background: 'transparent',
                border: '1.5px solid #DEDEDE',
                borderRadius: 999,
                color: '#555555',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Rate
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onConnect}
              disabled={isConnecting}
              onMouseEnter={() => setConnectHover(true)}
              onMouseLeave={() => setConnectHover(false)}
              style={{
                flex: 1,
                height: 42,
                background: isConnecting
                  ? 'rgba(107, 95, 212, 0.18)'
                  : connectHover
                  ? 'rgba(107, 95, 212, 0.28)'
                  : 'rgba(107, 95, 212, 0.18)',
                color: '#5B4BD4',
                border: 'none',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
                transition: 'background 0.18s ease',
              }}
            >
              {isConnecting ? 'Connecting…' : 'Request to connect'}
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={onThumbsUp}
                onMouseEnter={() => setUpHover(true)}
                onMouseLeave={() => setUpHover(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: upHover ? '#E0E0E5' : '#EDEDF0',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  transition: 'background 0.15s ease',
                }}
              >
                👍
              </button>
              <button
                onClick={onThumbsDown}
                onMouseEnter={() => setDownHover(true)}
                onMouseLeave={() => setDownHover(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: downHover ? '#E0E0E5' : '#EDEDF0',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  transition: 'background 0.15s ease',
                }}
              >
                👎
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
