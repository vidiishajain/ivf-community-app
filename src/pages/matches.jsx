import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getMatches } from '../lib/matching'
import ConnectionFeedback from './ConnectionFeedback'

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#C084A0','#9B8EC4','#6BA4A0','#C4A76E','#7AAB8A','#8AAAC4']

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
  const color                   = getAvatarColor(profile.display_name)
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
      // Mark conversation as read when chat opens
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
        // Only add if it's from the person we're chatting with
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
    // Optimistic update
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
        {/* Live indicator */}
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
        const color     = getAvatarColor(profile.display_name)
        const ini       = getInitials(profile.display_name)
        const unread    = isUnread(myId, lastMessage)
        const preview   = lastMessage
          ? (lastMessage.content.length > 52 ? lastMessage.content.slice(0, 52) + '…' : lastMessage.content)
          : 'Start a conversation'
        const timeStr   = lastMessage ? formatTime(lastMessage.created_at) : ''

        return (
          <button key={profile.id} onClick={() => onOpenChat(profile)}
            style={{ width: '100%', background: unread ? 'var(--code-bg)' : 'var(--code-bg)', border: `1px solid ${unread ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}>

            {/* Avatar with unread dot */}
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

  // Re-check unread whenever view changes or myId is set
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
    <div style={{ padding: '28px 20px 16px' }}>

      <p style={{ color: 'var(--text-h)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {view === 'matches' ? 'Your Matches' : 'Messages'}
      </p>
      <p style={{ color: 'var(--text)', fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
        {view === 'matches' ? 'Women on a similar journey to yours' : 'Your connected conversations'}
      </p>

      {/* Toggle with unread badge */}
      <div style={{ display: 'flex', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        <button onClick={() => setView('matches')}
          style={{ flex: 1, padding: '9px', borderRadius: 9, background: view === 'matches' ? 'var(--accent)' : 'transparent', border: 'none', color: view === 'matches' ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: view === 'matches' ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
          Find Matches
        </button>
        <button onClick={() => setView('messages')}
          style={{ flex: 1, padding: '9px', borderRadius: 9, background: view === 'messages' ? 'var(--accent)' : 'transparent', border: 'none', color: view === 'messages' ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: view === 'messages' ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Messages
          {hasUnread && view !== 'messages' && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: view === 'messages' ? '#fff' : 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
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
              <p style={{ color: 'var(--text)', opacity: 0.6 }}>Finding your matches…</p>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
              <p style={{ color: 'var(--text-h)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>More people are joining</p>
              <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.7, margin: 0 }}>No close matches yet. As more women join, we'll find the right people for you.</p>
            </div>
          )}

          {!loading && visible.map(({ profile, matchPct }, i) => {
            const connected    = connections[profile.id]
            const isConnecting = connecting[profile.id]
            const hasRated     = rated[profile.id]
            const pct          = Math.round(matchPct)
            const color        = getAvatarColor(profile.display_name)
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

            const hasHighlightBox = sameStage || smartLine || hobbyLine

            return (
              <div key={profile.id} className="match-card-anim" style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, marginBottom: 16, animationDelay: `${i * 0.07}s` }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: `0 0 0 3px ${color}55` }}>{ini}</div>
                  <div>
                    <p className="card-name" style={{ marginBottom: 3, fontSize: 17 }}>{profile.display_name}{profile.age ? `, ${profile.age}` : ''}</p>
                    <p style={{ color: 'var(--text)', fontSize: 12, opacity: 0.6, margin: 0 }}>Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}</p>
                    {fundingRoundLine ? (
                      <p style={{ color: 'var(--text)', fontSize: 11, opacity: 0.45, margin: '3px 0 0' }}>{fundingRoundLine}</p>
                    ) : null}
                  </div>
                </div>

                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>✦ {matchLabel(pct)}</span>

                {hasHighlightBox && (
                  <div style={{ background: 'var(--border)', borderRadius: 10, borderLeft: `3px solid ${color}`, padding: '10px 14px', margin: '12px 0' }}>
                    {sameStage && (
                      <p style={{ color: 'var(--text)', fontSize: 12, opacity: 0.75, margin: '0 0 4px', fontWeight: 500 }}>You are both at the same stage of your journey.</p>
                    )}
                    {smartLine && (
                      <p style={{ color: 'var(--text)', fontSize: 13, opacity: 0.85, margin: sameStage ? '4px 0 0' : 0, fontStyle: 'italic' }}>"{smartLine}"</p>
                    )}
                    {hobbyLine && (
                      <p style={{ color: 'var(--text)', fontSize: 13, opacity: 0.85, margin: (sameStage || smartLine) ? '6px 0 0' : 0 }}>🌿 {hobbyLine}</p>
                    )}
                  </div>
                )}

                <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hasRated ? (
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Rated ✓</span>
                  ) : connected ? (
                    <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                      <button onClick={() => setChatTarget(profile)} style={{ flex: 1, padding: '10px 16px', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                        💬 Message {profile.display_name.split(' ')[0]}
                      </button>
                      {!hasRated && (
                        <button onClick={() => setFeedbackTarget(profile)} style={{ padding: '10px 14px', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 12, cursor: 'pointer', fontSize: 13 }}>Rate</button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => handleConnect(profile.id)} disabled={isConnecting} style={{ flex: 1, padding: '10px 16px', background: isConnecting ? 'var(--border)' : 'var(--accent)', border: 'none', color: '#fff', borderRadius: 12, cursor: isConnecting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: isConnecting ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                      {isConnecting ? 'Connecting…' : 'Request to connect'}
                    </button>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button onClick={() => handleThumbsUp(profile.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }}>👍</button>
                    <button onClick={() => handleThumbsDown(profile.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }}>👎</button>
                  </div>
                </div>

              </div>
            )
          })}
        </>
      )}
    </div>
  )
}