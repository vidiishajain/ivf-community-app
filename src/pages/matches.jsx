import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getMatches } from '../lib/matching'
import ConnectionFeedback from './ConnectionFeedback'

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

const STAGE_LABELS = {
  1:'Beginning the journey', 2:'Initial consultations', 3:'Preparing for treatment',
  4:'Medication & stimulation', 5:'Egg retrieval', 6:'Fertilisation',
  7:'Embryo development', 8:'Transfer preparation', 9:'Embryo transfer',
  10:'Two-week wait', 11:'Awaiting results', 12:'Reflection & recovery',
}

const PERSONA_PHRASES = {
  1:'finds comfort in open, honest conversations',
  2:'appreciates practical advice and clear answers',
  3:'loves connecting through shared stories',
  4:'values quiet understanding over advice',
}

const PATHWAY_CONTEXT = {
  1:'natural IVF protocol', 2:'standard IVF cycle',
  3:'donor egg pathway', 4:'freeze-all cycle',
}

function getSmartLine(profile) {
  const firstName = (profile.display_name || '').split(' ')[0]
  const persona   = PERSONA_PHRASES[profile.persona]
  const pathway   = PATHWAY_CONTEXT[profile.pathway]
  if (persona && pathway) return `${firstName} ${persona}, currently on a ${pathway}.`
  if (persona)            return `${firstName} ${persona}.`
  return null
}

function matchLabel(pct) {
  if (pct >= 92) return 'Remarkably close match'
  if (pct >= 85) return 'Very strong match'
  if (pct >= 75) return 'Strong match'
  if (pct >= 65) return 'Good match'
  return 'Worth connecting'
}

function ChatView({ profile, onBack }) {
  const firstName = (profile.display_name || '').split(' ')[0]
  const color     = getAvatarColor(profile.display_name)
  const ini       = getInitials(profile.display_name)
  const [messages, setMessages] = useState([
    { id: 1, from: 'them', text: `Hi! I saw we matched — it\'s really nice to connect with someone at the same stage 🌸`, time: 'just now' }
  ])
  const [input, setInput]         = useState('')
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)
  const [bottomOffset, setBottomOffset] = useState(68)

  // Adjust input position when keyboard opens on mobile
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

  function send() {
    if (!input.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'me', text: input.trim(), time: 'just now' }])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '22px' }}>←</button>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0,
        }}>{ini}</div>
        <div>
          <p style={{ color: 'var(--text-h)', fontSize: '15px', fontWeight: '600', margin: 0 }}>{profile.display_name}</p>
          <p style={{ color: 'var(--text)', fontSize: '11px', opacity: 0.5, margin: 0 }}>Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: `${bottomOffset + 60}px` }}>
        {messages.map(msg => {
          const isMe = msg.from === 'me'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '14px' }}>
              {!isMe && (
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0, marginRight: '8px', alignSelf: 'flex-end',
                }}>{ini}</div>
              )}
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe ? 'var(--accent)' : 'var(--code-bg)',
                border: isMe ? 'none' : '1px solid var(--border)',
              }}>
                <p style={{ color: isMe ? '#fff' : 'var(--text-h)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  {msg.text}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: `${bottomOffset}px`,
        padding: '12px 16px', background: 'var(--sidebar)', borderTop: '1px solid var(--border)',
        display: 'flex', gap: '10px',
        transition: 'bottom 0.15s ease',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 350)}
          placeholder={`Message ${firstName}...`}
          style={{
            flex: 1, background: 'var(--code-bg)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '10px 14px', color: 'var(--text-h)', fontSize: '14px', outline: 'none',
          }}
        />
        <button onClick={send} style={{
          background: 'var(--accent)', border: 'none', color: '#fff',
          borderRadius: '10px', padding: '10px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
        }}>Send</button>
      </div>
    </div>
  )
}

export default function Matches() {
  const [currentProfile, setCurrentProfile] = useState(null)
  const [matches, setMatches]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [connections, setConnections]       = useState({})
  const [connecting, setConnecting]         = useState({})
  const [removed, setRemoved]               = useState({})
  const [rated, setRated]                   = useState({})
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [chatTarget, setChatTarget]         = useState(null)

  useEffect(() => { loadMatches() }, [])

  async function loadMatches() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
      const { data: existing } = await supabase
        .from('connections')
        .select('id')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`)
      if (existing && existing.length > 0) {
        setConnections(prev => ({ ...prev, [profileId]: true }))
        return
      }
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

  if (chatTarget) return <ChatView profile={chatTarget} onBack={() => setChatTarget(null)} />
  if (feedbackTarget) return (
    <ConnectionFeedback reviewedId={feedbackTarget.id}
      onDone={() => { setRated(p => ({...p, [feedbackTarget.id]: true})); setFeedbackTarget(null) }}
      onBack={() => setFeedbackTarget(null)} />
  )

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>Finding your matches…</p>
    </div>
  )

  const visible = matches.filter(m => !removed[m.profile.id])

  return (
    <div style={{ padding: '28px 20px 16px' }}>
      <p style={{ color: 'var(--text-h)', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Your Matches</p>
      <p style={{ color: 'var(--text)', fontSize: '13px', opacity: 0.6, marginBottom: '28px' }}>Women on a similar journey to yours</p>

      {visible.length === 0 && (
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
          <p style={{ color: 'var(--text-h)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>More people are joining</p>
          <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.7, margin: 0 }}>No close matches yet. As more women join, we'll find the right people for you.</p>
        </div>
      )}

      {visible.map(({ profile, matchPct }, i) => {
        const connected    = connections[profile.id]
        const isConnecting = connecting[profile.id]
        const hasRated     = rated[profile.id]
        const pct          = Math.round(matchPct)
        const color        = getAvatarColor(profile.display_name)
        const ini          = getInitials(profile.display_name)
        const smartLine    = getSmartLine(profile)
        const sameStage    = currentProfile?.ivf_stage === profile.ivf_stage

        return (
          <div key={profile.id} className="match-card-anim" style={{
            background: 'var(--code-bg)', border: '1px solid var(--border)',
            borderRadius: '18px', padding: '20px', marginBottom: '16px',
            animationDelay: `${i * 0.07}s`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: '700', color: '#fff', flexShrink: 0,
                boxShadow: `0 0 0 3px ${color}55`,
              }}>{ini}</div>
              <div>
                <p className="card-name" style={{ marginBottom: '3px', fontSize: '17px' }}>
                  {profile.display_name}{profile.age ? `, ${profile.age}` : ''}
                </p>
                <p style={{ color: 'var(--text)', fontSize: '12px', opacity: 0.6, margin: 0 }}>
                  Stage {profile.ivf_stage} · {STAGE_LABELS[profile.ivf_stage]}
                </p>
              </div>
            </div>

            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              ✦ {matchLabel(pct)}
            </span>

            {(smartLine || sameStage) && (
              <div style={{ background: 'var(--border)', borderRadius: '10px', borderLeft: `3px solid ${color}`, padding: '10px 14px', margin: '12px 0' }}>
                {sameStage && <p style={{ color: 'var(--text)', fontSize: '12px', opacity: 0.75, margin: '0 0 4px', fontWeight: '500' }}>You are both at the same stage of your journey.</p>}
                {smartLine && <p style={{ color: 'var(--text)', fontSize: '13px', opacity: 0.85, margin: 0, fontStyle: 'italic' }}>"{smartLine}"</p>}
              </div>
            )}

            <div style={{ height: '1px', background: 'var(--border)', margin: '14px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasRated ? (
                <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>Rated ✓</span>
              ) : connected ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <button onClick={() => setChatTarget(profile)} style={{
                    flex: 1, padding: '10px 16px', background: 'var(--accent)', border: 'none',
                    color: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  }}>
                    💬 Message {profile.display_name.split(' ')[0]}
                  </button>
                  {!hasRated && (
                    <button onClick={() => setFeedbackTarget(profile)} style={{
                      padding: '10px 14px', background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px',
                    }}>Rate</button>
                  )}
                </div>
              ) : (
                <button onClick={() => handleConnect(profile.id)} disabled={isConnecting} style={{
                  flex: 1, padding: '10px 16px',
                  background: isConnecting ? 'var(--border)' : 'var(--accent)',
                  border: 'none', color: '#fff', borderRadius: '12px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '600', opacity: isConnecting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  {isConnecting ? 'Connecting…' : 'Request to connect'}
                </button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                <button onClick={() => handleThumbsUp(profile.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>👍</button>
                <button onClick={() => handleThumbsDown(profile.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>👎</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}