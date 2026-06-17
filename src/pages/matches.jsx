import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { supabase } from '../lib/supabase'
import { getMatches } from '../lib/matching'
import ConnectionFeedback from './ConnectionFeedback'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FONT = "'Quicksand', system-ui, sans-serif"

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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  "Hi! It's really nice to connect with someone at a similar stage How are you finding things at the moment?",
  "Hey! I saw we matched — it feels reassuring to find someone who gets it. How are you doing?",
  "Hi there. How are you holding up through everything?",
  "Hello! It helps so much to talk to someone who actually understands. How's your journey going?",
  "Hi! I'd love to hear how you're navigating all of this.",
]

// ─── Card logic ───────────────────────────────────────────────────────────────

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

// ─── Animation components ────────────────────────────────────────────────────

function MatchCard({ children, style }) {
  const [springs, api] = useSpring(() => ({
    scale: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    config: { tension: 280, friction: 22 },
  }))
  return (
    <animated.div
      style={{ ...style, scale: springs.scale, boxShadow: springs.boxShadow }}
      onMouseEnter={() => api.start({ scale: 1.012, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' })}
      onMouseLeave={() => api.start({ scale: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' })}
    >
      {children}
    </animated.div>
  )
}

function ThumbButton({ onClick, children, style }) {
  const [springs, api] = useSpring(() => ({
    scale: 1,
    config: { tension: 400, friction: 12 },
  }))
  return (
    <animated.button
      style={{ ...style, scale: springs.scale }}
      onClick={onClick}
      onMouseDown={() => api.start({ scale: 0.88 })}
      onMouseUp={() => api.start({ scale: 1 })}
      onMouseLeave={() => api.start({ scale: 1 })}
    >
      {children}
    </animated.button>
  )
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!myId || !profile?.id) return
    const channel = supabase
      .channel(`chat_${[myId, profile.id].sort().join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${myId}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.sender_id !== profile.id) return
        setMessages(prev => [...prev, {
          id: msg.id, from: 'them', text: msg.content, time: formatTime(msg.created_at),
        }])
        markAsRead(myId, profile.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId, profile?.id])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#FFFFFF' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBEBEB', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', padding: '4px 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `linear-gradient(145deg, ${colorPair[0]}, ${colorPair[1]})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>{ini}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: 0, fontFamily: FONT }}>{profile.display_name}</p>
          <p style={{ color: '#888888', fontSize: 11, margin: 0, fontFamily: FONT }}>Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>
        {loadingMsgs && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#888888', fontSize: 14, fontFamily: FONT }}>Loading…</p>
          </div>
        )}

        {showIcebreakers && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#888888', fontSize: 12, marginBottom: 12, textAlign: 'center', fontFamily: FONT }}>
              You're connected. Start the conversation:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ICEBREAKERS.slice(0, 3).map((ic, i) => (
                <button key={i} onClick={() => setInput(ic)}
                  style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 12, padding: '12px 16px', color: '#555555', fontSize: 13, textAlign: 'left', cursor: 'pointer', lineHeight: 1.6, fontFamily: FONT }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.from === 'me'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 14, alignItems: 'flex-end', gap: 8 }}>
              {!isMe && (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(145deg, ${colorPair[0]}, ${colorPair[1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{ini}</div>
              )}
              <div style={{ maxWidth: '68%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? '#5B4BD4' : '#F7F7FA',
                  border: isMe ? 'none' : '1.5px solid #EBEBEB',
                }}>
                  <p style={{ color: isMe ? '#fff' : '#111111', fontSize: 14, lineHeight: 1.55, margin: 0, fontFamily: FONT }}>{msg.text}</p>
                </div>
                <p style={{ color: '#AAAAAA', fontSize: 10, margin: '3px 4px 0', textAlign: isMe ? 'right' : 'left', fontFamily: FONT }}>{msg.time}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 24px', background: '#FFFFFF', borderTop: '1px solid #EBEBEB', display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 350)}
          placeholder={`Message ${firstName}…`}
          style={{ flex: 1, background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 10, padding: '10px 14px', color: '#111111', fontSize: 14, outline: 'none', fontFamily: FONT }}
        />
        <button
          onClick={() => send()}
          style={{ background: '#5B4BD4', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT }}
        >
          Send
        </button>
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
        .eq('status', 'accepted')

      if (!conns || conns.length === 0) { setLoading(false); return }

      const otherIds = conns.map(c => c.requester_id === myId ? c.receiver_id : c.requester_id)

      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name, ivf_stage').in('id', otherIds)

      const { data: allMsgs } = await supabase
        .from('messages').select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false })

      const lastMsgMap = {}
      ;(allMsgs || []).forEach(msg => {
        const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id
        if (!lastMsgMap[otherId]) lastMsgMap[otherId] = msg
      })

      const convs = (profiles || []).map(p => ({
        profile: p, lastMessage: lastMsgMap[p.id] || null,
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
      <p style={{ color: '#888888', fontFamily: FONT }}>Loading conversations…</p>
    </div>
  )

  if (conversations.length === 0) return (
    <div style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(91,75,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B4BD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <p style={{ color: '#111111', fontSize: 16, fontWeight: 600, marginBottom: 8, fontFamily: FONT }}>No conversations yet</p>
      <p style={{ color: '#888888', fontSize: 14, margin: 0, fontFamily: FONT }}>Once a connection is accepted, your chat will appear here.</p>
    </div>
  )

  return (
    <div>
      {conversations.map(({ profile, lastMessage }) => {
        const colorPair = getAvatarColor(profile.display_name)
        const ini       = getInitials(profile.display_name)
        const unread    = isUnread(myId, lastMessage)
        const preview   = lastMessage
          ? (lastMessage.content.length > 52 ? lastMessage.content.slice(0, 52) + '…' : lastMessage.content)
          : 'Start a conversation'
        const timeStr = lastMessage ? formatTime(lastMessage.created_at) : ''

        return (
          <button key={profile.id} onClick={() => onOpenChat(profile)}
            style={{ width: '100%', background: '#F7F7FA', border: `1.5px solid ${unread ? '#5B4BD4' : '#EBEBEB'}`, borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(145deg, ${colorPair[0]}, ${colorPair[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>{ini}</div>
              {unread && <div style={{ position: 'absolute', top: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#5B4BD4', border: '2px solid #F7F7FA' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ color: '#111111', fontSize: 15, fontWeight: unread ? 700 : 600, margin: 0, fontFamily: FONT }}>{profile.display_name}</p>
                {timeStr && <span style={{ color: unread ? '#5B4BD4' : '#AAAAAA', fontSize: 11, flexShrink: 0, fontWeight: unread ? 600 : 400, fontFamily: FONT }}>{timeStr}</span>}
              </div>
              <p style={{ color: unread ? '#111111' : '#888888', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: lastMessage ? 'normal' : 'italic', fontWeight: unread ? 500 : 400, fontFamily: FONT }}>
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
  const [currentProfile, setCurrentProfile]   = useState(null)
  const [myId, setMyId]                       = useState(null)
  const [matches, setMatches]                 = useState([])
  const [loading, setLoading]                 = useState(true)
  const [connections, setConnections]         = useState({})
  const [pendingSent, setPendingSent]         = useState({})
  const [pendingReceived, setPendingReceived]       = useState([])
  const [pendingReceivedMap, setPendingReceivedMap] = useState({})
  const [connecting, setConnecting]           = useState({})
  const [removed, setRemoved]                 = useState({})
  const [rated, setRated]                     = useState({})
  const [feedbackTarget, setFeedbackTarget]   = useState(null)
  const [chatTarget, setChatTarget]           = useState(null)
  const [view, setView]                       = useState('matches')
  const [hasUnread, setHasUnread]             = useState(false)

  useEffect(() => { loadMatches() }, [])

  useEffect(() => {
    if (!myId) return
    if (view === 'messages') { setHasUnread(false); return }
    checkUnreads()
  }, [myId, view])

  async function checkUnreads() {
    if (!myId) return
    try {
      const { data: msgs } = await supabase
        .from('messages').select('sender_id, created_at')
        .eq('receiver_id', myId).order('created_at', { ascending: false }).limit(30)
      const anyUnreadMsg = (msgs || []).some(msg => {
        const lastRead = getLastRead(myId, msg.sender_id)
        if (!lastRead) return true
        return new Date(msg.created_at) > new Date(lastRead)
      })
      const { data: pending } = await supabase
        .from('connections').select('id')
        .eq('receiver_id', myId).eq('status', 'pending').limit(1)
      setHasUnread(anyUnreadMsg || (pending && pending.length > 0))
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

      const { data: allConns } = await supabase
        .from('connections')
        .select('id, requester_id, receiver_id, status')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

      const acceptedMap     = {}
      const pendingSentMap  = {}
      const pendingRecList  = []

      ;(allConns || []).forEach(c => {
        const otherId = c.requester_id === user.id ? c.receiver_id : c.requester_id
        if (c.status === 'accepted') {
          acceptedMap[otherId] = true
        } else if (c.status === 'pending') {
          if (c.requester_id === user.id) {
            pendingSentMap[otherId] = true
          } else {
            pendingRecList.push({ connectionId: c.id, requesterId: c.requester_id })
          }
        }
      })

      setConnections(acceptedMap)
      setPendingSent(pendingSentMap)

      if (pendingRecList.length > 0) {
        const ids = pendingRecList.map(p => p.requesterId)
        const { data: reqProfiles } = await supabase
          .from('profiles').select('id, display_name, ivf_stage').in('id', ids)
        const enriched = pendingRecList.map(p => ({
          connectionId: p.connectionId,
          profile: (reqProfiles || []).find(pr => pr.id === p.requesterId) || null,
        })).filter(p => p.profile !== null)
        setPendingReceived(enriched)
        const recMap = {}
        enriched.forEach(p => { recMap[p.profile.id] = p.connectionId })
        setPendingReceivedMap(recMap)
      } else {
        setPendingReceived([])
        setPendingReceivedMap({})
      }

      const { data: existingRatings } = await supabase
        .from('connection_feedback').select('reviewed_id').eq('reviewer_id', user.id)
      if (existingRatings) {
        const m = {}; existingRatings.forEach(r => { m[r.reviewed_id] = true }); setRated(m)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleConnect(profileId) {
    if (connecting[profileId]) return
    setConnecting(prev => ({ ...prev, [profileId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existing } = await supabase.from('connections').select('id, status')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`)
      if (existing && existing.length > 0) {
        const conn = existing[0]
        if (conn.status === 'accepted') setConnections(prev => ({ ...prev, [profileId]: true }))
        else setPendingSent(prev => ({ ...prev, [profileId]: true }))
        return
      }
      await supabase.from('connections').insert({ requester_id: user.id, receiver_id: profileId, status: 'pending' })
      setPendingSent(prev => ({ ...prev, [profileId]: true }))
    } catch (e) { console.error('Connect error:', e) }
    finally { setConnecting(prev => ({ ...prev, [profileId]: false })) }
  }

  async function handleAccept(connectionId, requesterId) {
    try {
      const { error } = await supabase
        .from('connections').update({ status: 'accepted' }).eq('id', connectionId)
      if (!error) {
        setConnections(prev => ({ ...prev, [requesterId]: true }))
        setPendingReceived(prev => prev.filter(p => p.connectionId !== connectionId))
        setPendingReceivedMap(prev => { const n = { ...prev }; delete n[requesterId]; return n })
      }
    } catch (e) { console.error('Accept error:', e) }
  }

  async function handleDecline(connectionId) {
    try {
      const { error } = await supabase
        .from('connections').delete().eq('id', connectionId)
      if (!error) {
        const entry = pendingReceived.find(p => p.connectionId === connectionId)
        if (entry) setPendingReceivedMap(m => { const n = { ...m }; delete n[entry.profile.id]; return n })
        setPendingReceived(prev => prev.filter(p => p.connectionId !== connectionId))
      }
    } catch (e) { console.error('Decline error:', e) }
  }

  async function handleThumbsUp(profileId) {
    try {
      const { error } = await supabase.from('feedback').insert({ rater_id: myId, rated_id: profileId, score: 5 })
      if (!error) setRated(prev => ({ ...prev, [profileId]: true }))
    } catch (e) { console.error('ThumbsUp error:', e) }
  }
  async function handleThumbsDown(profileId) {
    try {
      const { error } = await supabase.from('feedback').insert({ rater_id: myId, rated_id: profileId, score: 1 })
      if (!error) {
        setRated(prev => ({ ...prev, [profileId]: true }))
        setRemoved(prev => ({ ...prev, [profileId]: true }))
      }
    } catch (e) { console.error('ThumbsDown error:', e) }
  }

  if (chatTarget) return (
    <ChatView profile={chatTarget} myId={myId} onBack={() => { setChatTarget(null); checkUnreads() }} />
  )
  if (feedbackTarget) return (
    <ConnectionFeedback
      reviewedId={feedbackTarget.id}
      onDone={() => { setRated(p => ({...p, [feedbackTarget.id]: true})); setFeedbackTarget(null) }}
      onBack={() => setFeedbackTarget(null)} />
  )

  const visible           = matches.filter(m => !removed[m.profile.id])
  const showMessagesBadge = (hasUnread || pendingReceived.length > 0) && view !== 'messages'

  const cardStyle = {
    background: '#F7F7FA',
    border: '1.5px solid #EBEBEB',
    borderRadius: 18,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: FONT,
  }

  const thumbStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#EDEDF0',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  }

  return (
    <div style={{ padding: '48px 48px 60px 48px', background: '#FFFFFF', minHeight: '100%', fontFamily: FONT }}>

      <h1 style={{
        fontSize: 36,
        fontWeight: 700,
        color: '#111111',
        letterSpacing: '-0.5px',
        marginBottom: 32,
        fontFamily: FONT,
      }}>
        Match
      </h1>

      {/* View toggle — animated sliding pill */}
      <div style={{
        display: 'inline-flex',
        gap: 0,
        background: '#F0F0F4',
        padding: 4,
        borderRadius: 999,
        marginBottom: 28,
        position: 'relative',
      }}>
        {['matches', 'messages'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              position: 'relative',
              padding: '8px 22px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              fontWeight: view === v ? 600 : 500,
              color: view === v ? '#111111' : '#888888',
              cursor: 'pointer',
              zIndex: 1,
              fontFamily: FONT,
              transition: 'color 0.18s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {v === 'messages' && showMessagesBadge && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5B4BD4', display: 'inline-block', flexShrink: 0, order: 2 }} />
            )}
            {v === 'matches' ? 'Find Matches' : 'Messages'}
            {view === v && (
              <motion.div
                layoutId="togglePill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 999,
                  background: '#FFFFFF',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Animated view switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === 'matches' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === 'matches' ? 12 : -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >

          {/* Messages view */}
          {view === 'messages' && (
            <div>
              {pendingReceived.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <p style={{ color: '#888888', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: FONT }}>
                    Connection Requests
                  </p>
                  {pendingReceived.map(({ connectionId, profile: req }) => {
                    const reqColorPair = getAvatarColor(req.display_name)
                    return (
                      <div key={connectionId} style={{ background: '#F7F7FA', border: '1.5px solid #5B4BD4', borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(145deg, ${reqColorPair[0]}, ${reqColorPair[1]})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                          {getInitials(req.display_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: '0 0 3px', fontFamily: FONT }}>{req.display_name}</p>
                          <p style={{ color: '#888888', fontSize: 12, margin: 0, fontFamily: FONT }}>
                            Stage {req.ivf_stage} · {STAGE_LABELS[req.ivf_stage]}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                          <button onClick={() => handleAccept(connectionId, req.id)}
                            style={{ padding: '8px 18px', background: '#5B4BD4', border: 'none', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                            Accept
                          </button>
                          <button onClick={() => handleDecline(connectionId)}
                            style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid #EBEBEB', color: '#555555', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <ConversationList myId={myId} onOpenChat={(profile) => setChatTarget(profile)} />
            </div>
          )}

          {/* Matches view */}
          {view === 'matches' && (
            <>
              {loading && (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <p style={{ color: '#888888', fontSize: 15, fontFamily: FONT }}>Finding your matches…</p>
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
                  fontFamily: FONT,
                }}>
                  <p style={{ fontWeight: 600, color: '#111111', marginBottom: 8, fontSize: 16, fontFamily: FONT }}>More people are joining</p>
                  <p style={{ margin: 0, lineHeight: 1.6, fontFamily: FONT }}>No close matches yet. As more women join, we'll find the right people for you.</p>
                </div>
              )}

              {!loading && visible.length > 0 && (
                <motion.div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
                  }}
                >
                  <AnimatePresence>
                    {visible.map(({ profile, matchPct }) => {
                      const isAccepted        = !!connections[profile.id]
                      const isPending         = !!pendingSent[profile.id]
                      const incomingConnId    = pendingReceivedMap[profile.id] || null
                      const isConnecting      = connecting[profile.id]
                      const hasRated     = rated[profile.id]
                      const pct          = Math.round(matchPct)
                      const colorPair    = getAvatarColor(profile.display_name)
                      const ini          = getInitials(profile.display_name)
                      const smartLine    = getSmartLine(profile)

                      const round        = getRound(profile.feature_vec)
                      const roundLabel   = ROUND_LABELS[round] || null
                      const pathwayLabel = PATHWAY_LABELS[profile.pathway] || null
                      const sharedHobbies = getSharedHobbies(currentProfile?.hobbies_vec, profile.hobbies_vec)
                      const hobbyNames    = sharedHobbies.slice(0, 2).map(h => HOBBY_LABELS[h] || h)
                      const sameStage     = currentProfile?.ivf_stage === profile.ivf_stage

                      return (
                        <motion.div
                          key={profile.id}
                          layout
                          variants={{
                            hidden: { opacity: 0, y: 18 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
                          }}
                          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                        >
                          <MatchCard style={cardStyle}>

                            {/* Avatar + Name + Stage */}
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
                              }}>
                                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 700, letterSpacing: '0.5px' }}>
                                  {ini}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{ fontSize: 19, fontWeight: 700, color: '#111111', letterSpacing: '-0.2px', lineHeight: 1.2, fontFamily: FONT }}>
                                  {profile.display_name?.split(' ')[0]}{profile.age ? `, ${profile.age}` : ''}
                                </span>
                                <span style={{ fontSize: 13, color: '#888888', fontWeight: 500, fontFamily: FONT }}>
                                  Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}
                                </span>
                              </div>
                            </div>

                            {/* Match quality badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#111111">
                                <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"/>
                              </svg>
                              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#111111', fontFamily: FONT }}>
                                {matchLabel(pct)}
                              </span>
                            </div>

                            {/* Smart insight line */}
                            {smartLine && (
                              <p style={{ fontSize: 13.5, color: '#555555', lineHeight: 1.6, margin: 0, fontFamily: FONT, fontWeight: 500 }}>
                                {smartLine}
                              </p>
                            )}

                            {/* Action row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                              {hasRated ? (
                                <span style={{ fontSize: 13, color: '#5B4BD4', fontWeight: 600, fontFamily: FONT }}>Shared</span>
                              ) : isAccepted ? (
                                <>
                                  <button
                                    onClick={() => setChatTarget(profile)}
                                    style={{
                                      flex: 1, height: 42,
                                      background: '#5B4BD4', color: '#FFFFFF',
                                      border: 'none', borderRadius: 999,
                                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                      fontFamily: FONT,
                                    }}
                                  >
                                    Message {profile.display_name?.split(' ')[0]}
                                  </button>
                                  {!hasRated && (
                                    <button
                                      onClick={() => setFeedbackTarget(profile)}
                                      style={{
                                        padding: '0 18px', height: 42,
                                        background: 'transparent', border: '1.5px solid #DEDEDE',
                                        borderRadius: 999, color: '#555555',
                                        fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                                      }}
                                    >
                                      How has it been?
                                    </button>
                                  )}
                                </>
                              ) : incomingConnId ? (
                                <>
                                  <button
                                    onClick={() => handleAccept(incomingConnId, profile.id)}
                                    style={{
                                      flex: 1, height: 42,
                                      background: '#5B4BD4', color: '#FFFFFF',
                                      border: 'none', borderRadius: 999,
                                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                      fontFamily: FONT,
                                    }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDecline(incomingConnId)}
                                    style={{
                                      padding: '0 18px', height: 42,
                                      background: 'transparent', border: '1.5px solid #DEDEDE',
                                      borderRadius: 999, color: '#555555',
                                      fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : isPending ? (
                                <button
                                  disabled
                                  style={{
                                    flex: 1, height: 42,
                                    background: 'rgba(107, 95, 212, 0.08)', color: '#5B4BD4',
                                    border: 'none', borderRadius: 999,
                                    fontSize: 14, fontWeight: 500, cursor: 'not-allowed',
                                    opacity: 0.7, fontFamily: FONT,
                                  }}
                                >
                                  Request sent
                                </button>
                              ) : (
                                <>
                                  <motion.div whileTap={{ scale: 0.96 }} style={{ flex: 1 }}>
                                    <button
                                      onClick={() => handleConnect(profile.id)}
                                      disabled={!!isConnecting}
                                      style={{
                                        width: '100%', height: 42,
                                        background: isConnecting ? 'rgba(107, 95, 212, 0.08)' : 'rgba(107, 95, 212, 0.18)',
                                        color: '#5B4BD4', border: 'none', borderRadius: 999,
                                        fontSize: 14, fontWeight: 600,
                                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                                        opacity: isConnecting ? 0.6 : 1,
                                        transition: 'background 0.18s ease',
                                        fontFamily: FONT,
                                      }}
                                      onMouseEnter={e => { if (!isConnecting) e.currentTarget.style.background = 'rgba(107, 95, 212, 0.28)' }}
                                      onMouseLeave={e => { if (!isConnecting) e.currentTarget.style.background = 'rgba(107, 95, 212, 0.18)' }}
                                    >
                                      {isConnecting ? 'Connecting…' : 'Request to connect'}
                                    </button>
                                  </motion.div>
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    <ThumbButton
                                      onClick={() => handleThumbsUp(profile.id)}
                                      style={thumbStyle}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                    </ThumbButton>
                                    <ThumbButton
                                      onClick={() => handleThumbsDown(profile.id)}
                                      style={thumbStyle}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                                    </ThumbButton>
                                  </div>
                                </>
                              )}
                            </div>

                          </MatchCard>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
