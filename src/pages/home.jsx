import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STAGE_LABELS = {
  1: 'Beginning the journey', 2: 'Initial consultations', 3: 'Preparing for treatment',
  4: 'Medication & stimulation', 5: 'Egg retrieval', 6: 'Fertilisation',
  7: 'Embryo development', 8: 'Transfer preparation', 9: 'Embryo transfer',
  10: 'Two-week wait', 11: 'Awaiting results', 12: 'Reflection & recovery',
}

const STAGE_SENTENCES = {
  1:  "The first steps carry a mix of hope and nerves. That's exactly as it should be.",
  2:  "Sitting in waiting rooms, absorbing new information. It's a lot to take in at once.",
  3:  "There's so much to organise, physically and emotionally. Give yourself credit for showing up.",
  4:  "Your body is working hard. So is your mind. Rest wherever you can find it.",
  5:  "A significant milestone. Many women find this day brings unexpected waves of emotion.",
  6:  "The waiting after retrieval can feel unbearable. You're doing better than you think.",
  7:  "These days of not knowing are genuinely hard. Uncertainty is exhausting to carry.",
  8:  "Getting close now. It's okay if hope and fear are sitting side by side.",
  9:  "One of the most surreal days of this whole process. You've made it here.",
  10: "Possibly the hardest stretch of all. You are not alone in how long this feels.",
  11: "Whatever happens next, you've shown extraordinary courage to get this far.",
  12: "Wherever this chapter ends, what you've carried deserves to be acknowledged.",
}

const DAILY_LINES = [
  "You're not behind. There's no 'behind' in this.",
  "One day at a time is enough.",
  "It's okay to not be okay today.",
  "Hoping quietly is still hoping.",
  "You are allowed to rest.",
  "This process asks a lot. You're giving it everything.",
  "Some days just need to be gotten through. That counts.",
  "You're not as alone in this as it might feel.",
  "Your pace is the right pace.",
  "It's okay if today is just about getting to tomorrow.",
]

function getDailyLine() {
  const day = new Date().getDate()
  return DAILY_LINES[day % DAILY_LINES.length]
}

function getGreeting(name) {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name} 🌤️`
  if (hour < 17) return `Good afternoon, ${name} ☀️`
  return `Good evening, ${name} 🌙`
}

export default function Home({ session }) {
  const [profile, setProfile]               = useState(null)
  const [connectionCount, setConnectionCount] = useState(0)
  const [showAbout, setShowAbout]           = useState(false)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user?.id) return
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data: conns } = await supabase
        .from('connections')
        .select('id')
        .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      setConnectionCount(conns?.length || 0)
      setLoading(false)
    }
    fetchData()
  }, [session])

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>Loading…</p>
    </div>
  )

  const firstName  = (profile?.display_name || '').split(' ')[0]
  const stage      = profile?.ivf_stage
  const dailyLine  = getDailyLine()

  // About modal view
  if (showAbout) return (
    <div style={{ padding: '28px 20px' }}>
      <button
        onClick={() => setShowAbout(false)}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 28, padding: 0 }}>
        ← Back
      </button>
      <div style={{ fontSize: 34, marginBottom: 14 }}>🔥</div>
      <h2 style={{ color: 'var(--text-h)', fontSize: 24, fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>
        Why this space is yours
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          IVF can feel isolating. Clinics focus on the medical. But the emotional weight is real, and it's a lot to carry alone.
        </p>
        <p style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Ember matches you with other women on a similar journey. Same stage. Similar path. People who actually get it.
        </p>
        <p style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          You can connect, chat privately, join communities, find things to help you unwind, and read honest articles about what IVF really involves.
        </p>
        <p style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          No forums. No strangers. Just people who understand because they're living it too.
        </p>
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginTop: 4, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-h)', fontSize: 17, fontWeight: 700, margin: 0 }}>
            This space is yours. 🔥
          </p>
        </div>
      </div>
    </div>
  )

  // Main home view
  return (
    <div style={{ padding: '28px 20px' }}>

      {/* Greeting */}
      <h2 style={{ color: 'var(--text-h)', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        {getGreeting(firstName)}
      </h2>
      <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.6, marginBottom: 28, fontStyle: 'italic' }}>
        "{dailyLine}"
      </p>

      {/* Stage card */}
      {stage && (
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Your stage
            </span>
            <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.5 }}>
              {stage} of 12
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginBottom: 14 }}>
            <div style={{
              height: '100%',
              width: `${(stage / 12) * 100}%`,
              background: 'var(--accent)',
              borderRadius: 4,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <p style={{ color: 'var(--text-h)', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
            Stage {stage} · {STAGE_LABELS[stage]}
          </p>
          <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.7, margin: 0, opacity: 0.85 }}>
            {STAGE_SENTENCES[stage]}
          </p>
        </div>
      )}

      {/* Action nudge */}
      <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
        <p style={{ color: 'var(--text-h)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
          {connectionCount > 0
            ? `You're connected with ${connectionCount} ${connectionCount === 1 ? 'person' : 'people'}`
            : 'Your matches are ready'}
        </p>
        <p style={{ color: 'var(--text)', fontSize: 13, opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
          {connectionCount > 0
            ? 'Check in with someone today. A small message goes a long way.'
            : 'Meet someone on the same path as you. Head to the Match tab.'}
        </p>
      </div>

      {/* Why this space is yours */}
      <button
        onClick={() => setShowAbout(true)}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 20px',
          color: 'var(--text)',
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <span>Why this space is yours</span>
        <span style={{ color: 'var(--accent)', fontSize: 18 }}>→</span>
      </button>

    </div>
  )
}