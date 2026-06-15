const moods = [
  { label: '😔 Low & tired',        value: 'low and tired' },
  { label: '😰 Anxious',            value: 'anxious' },
  { label: '😐 Numb / disconnected', value: 'numb and disconnected' },
  { label: '😤 Frustrated',         value: 'frustrated' },
  { label: '🙂 Okay today',         value: 'okay' },
  { label: '✨ Hopeful',            value: 'hopeful' },
]

const activities = [
  { label: '🧘 Something calming', value: 'calming and gentle' },
  { label: '🎨 Creative outlet',   value: 'creative' },
  { label: '🚶 Get moving',        value: 'light movement' },
  { label: '📖 Learn / read',      value: 'reading or learning' },
  { label: '🎵 Music / sound',     value: 'music or sound' },
  { label: '💬 Connect with others', value: 'social connection' },
]

const FALLBACK = [
  {
    emoji: '🌬️', title: 'Box Breathing', duration: '5 minutes',
    description: 'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. This activates your parasympathetic nervous system and slows your heart rate within minutes.',
  },
  {
    emoji: '📓', title: 'Three Things That Were Okay', duration: '10 minutes',
    description: 'Write down just 3 small things that felt okay today. They do not need to be big. This gently shifts focus without bypassing how you actually feel.',
  },
  {
    emoji: '🚶', title: 'A Purposeless Walk', duration: '10–15 minutes',
    description: 'No destination, no pace target. Step outside and just move. Even 10 minutes of low-intensity walking lowers cortisol and gives your mind a soft reset.',
  },
]

export const INITIAL_UNWIND_STATE = {
  step:               0,
  moodLabel:          '',
  moodValue:          '',
  selectedActivities: [],
  suggestions:        [],
  loading:            false,
  chosenIndex:        null,
}

export default function Unwind({ state, onStateChange }) {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function update(patch) {
    onStateChange(prev => ({ ...prev, ...patch }))
  }

  function reset() {
    onStateChange(INITIAL_UNWIND_STATE)
  }

  function toggleActivity(activity) {
    const current  = state.selectedActivities
    const selected = current.some(a => a.value === activity.value)
    if (selected) {
      update({ selectedActivities: current.filter(a => a.value !== activity.value) })
    } else if (current.length < 2) {
      update({ selectedActivities: [...current, activity] })
    }
  }

  function isSelected(activity) {
    return state.selectedActivities.some(a => a.value === activity.value)
  }

  function isDisabled(activity) {
    return state.selectedActivities.length >= 2 && !isSelected(activity)
  }

  // ── API call ──────────────────────────────────────────────────────────────

  async function fetchSuggestions() {
    // Capture values before state update to avoid stale closure issues
    const moodValue   = state.moodValue
    const activityDesc = state.selectedActivities.map(a => a.value).join(' and ')

    update({ step: 2, loading: true, suggestions: [], chosenIndex: null })

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a compassionate wellness companion for someone going through IVF treatment. They feel "${moodValue}" and want "${activityDesc}" activities.\n\nSuggest exactly 3 short wellness activities suited to their emotional state. Each must be doable in under 20 minutes.\n\nReply ONLY with a raw JSON array. No markdown. No backticks. No explanation. Just the array:\n[\n  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},\n  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},\n  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"}\n]`,
          }],
        }),
      })
      if (!res.ok) throw new Error('Status ' + res.status)
      const data    = await res.json()
      const rawText = data?.content?.[0]?.text || ''
      const cleaned = rawText.replace(/```json|```/gi, '').trim()
      const parsed  = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length >= 1) {
        onStateChange(prev => ({ ...prev, suggestions: parsed.slice(0, 3), loading: false }))
      } else {
        throw new Error('Bad shape')
      }
    } catch (err) {
      console.error('Unwind error:', err)
      onStateChange(prev => ({ ...prev, suggestions: FALLBACK, loading: false }))
    }
  }

  const { step, moodLabel, selectedActivities, suggestions, loading, chosenIndex } = state

  // ── Step 0: Mood ──────────────────────────────────────────────────────────

  if (step === 0) return (
    <div style={{ padding: '28px 20px' }}>
      <p style={{ color: 'var(--text)', fontSize: 13, opacity: 0.55, marginBottom: 22, fontStyle: 'italic' }}>
        This space has no agenda. Just you, right now.
      </p>
      <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>How are you feeling?</h2>
      <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24, opacity: 0.7 }}>Pick what's closest to right now</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {moods.map((m) => (
          <button key={m.value}
            onClick={() => update({ step: 1, moodLabel: m.label, moodValue: m.value })}
            style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', color: 'var(--text-h)', fontSize: 16, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Step 1: Activity (multi-select, cap 2) ────────────────────────────────

  if (step === 1) return (
    <div style={{ padding: '28px 20px' }}>
      <button
        onClick={() => update({ step: 0, selectedActivities: [] })}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 24, padding: 0 }}>
        ← Change my mood
      </button>
      <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>What sounds good?</h2>
      <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24, opacity: 0.7 }}>
        Pick up to 2 — we'll tailor your suggestions
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {activities.map((a) => {
          const selected = isSelected(a)
          const disabled = isDisabled(a)
          return (
            <button key={a.value}
              onClick={() => !disabled && toggleActivity(a)}
              style={{
                background:    selected ? 'var(--accent)' : 'var(--code-bg)',
                border:        `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:  12,
                padding:       '16px 20px',
                color:         selected ? '#fff' : 'var(--text-h)',
                fontSize:      16,
                textAlign:     'left',
                cursor:        disabled ? 'not-allowed' : 'pointer',
                width:         '100%',
                opacity:       disabled ? 0.3 : 1,
                transition:    'all 0.15s ease',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
              }}>
              <span>{a.label}</span>
              {selected && <span style={{ fontSize: 15, fontWeight: 700 }}>✓</span>}
            </button>
          )
        })}
      </div>

      {selectedActivities.length > 0 && (
        <button onClick={fetchSuggestions}
          style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 12, padding: '14px 20px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Find suggestions →
        </button>
      )}
    </div>
  )

  // ── Step 2: Suggestions ───────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 20px' }}>
      <button
        onClick={() => update({ step: 1, suggestions: [], loading: false, chosenIndex: null })}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 24, padding: 0 }}>
        ← Change my selection
      </button>
      <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>Just for you, right now</h2>
      <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24, opacity: 0.7 }}>Based on how you're feeling today</p>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text)' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✨</div>
          <p style={{ fontSize: 15 }}>Finding something just for you…</p>
        </div>
      )}

      {/* Suggestion cards */}
      {!loading && suggestions.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            {suggestions.map((s, i) => {
              const isChosen = chosenIndex === i
              const isDimmed = chosenIndex !== null && !isChosen

              return (
                <div key={i} style={{
                  background:  'var(--code-bg)',
                  border:      `1px solid ${isChosen ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding:     '20px',
                  opacity:     isDimmed ? 0.25 : 1,
                  transition:  'opacity 0.4s ease, border-color 0.2s ease',
                }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{s.emoji}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <h3 style={{ color: 'var(--text-h)', fontSize: 17, margin: 0 }}>{s.title}</h3>
                    <span style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(139, 92, 246, 0.12)', padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>{s.duration}</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.65, margin: '0 0 16px' }}>{s.description}</p>

                  {/* Try this button — only shown before any choice is made */}
                  {chosenIndex === null && (
                    <button onClick={() => update({ chosenIndex: i })}
                      style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      I'll try this
                    </button>
                  )}

                  {/* Chosen indicator */}
                  {isChosen && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>✓</span>
                      <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>You chose this</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Completion message — shown after a choice */}
          {chosenIndex !== null && (
            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', textAlign: 'center', marginBottom: 20 }}>
              <p style={{ color: 'var(--text-h)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
                Take your time.
              </p>
              <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.75, margin: 0 }}>
                This space will be here when you get back. 🔥
              </p>
            </div>
          )}

          <button onClick={reset}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', color: 'var(--text)', fontSize: 15, cursor: 'pointer' }}>
            Try something else
          </button>
        </>
      )}
    </div>
  )
}