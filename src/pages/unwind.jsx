import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const FONT = "'Quicksand', system-ui, sans-serif"

const moods = [
  { label: 'Low & tired',         value: 'low and tired' },
  { label: 'Anxious',             value: 'anxious' },
  { label: 'Numb / disconnected', value: 'numb and disconnected' },
  { label: 'Frustrated',          value: 'frustrated' },
  { label: 'Okay today',          value: 'okay' },
  { label: 'Hopeful',             value: 'hopeful' },
]

const activities = [
  { label: 'Something calming',   value: 'calming and gentle' },
  { label: 'Creative outlet',     value: 'creative' },
  { label: 'Get moving',          value: 'light movement' },
  { label: 'Learn / read',        value: 'reading or learning' },
  { label: 'Music / sound',       value: 'music or sound' },
  { label: 'Connect with others', value: 'social connection' },
]

const FALLBACK = [
  {
    title: 'Box Breathing', duration: '5 minutes',
    description: 'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. This activates your parasympathetic nervous system and slows your heart rate within minutes.',
  },
  {
    title: 'Three Things That Were Okay', duration: '10 minutes',
    description: 'Write down just 3 small things that felt okay today. They do not need to be big. This gently shifts focus without bypassing how you actually feel.',
  },
  {
    title: 'A Purposeless Walk', duration: '10–15 minutes',
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

// ── Breathing blob ────────────────────────────────────────────────────────────

function BreathingBlob() {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 0.75 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 580,
        height: 580,
        borderRadius: '62% 38% 70% 30% / 45% 55% 45% 55%',
        background: `
          radial-gradient(ellipse at 30% 28%, rgba(135, 206, 235, 0.95) 0%, transparent 48%),
          radial-gradient(ellipse at 58% 36%, rgba(107, 127, 232, 0.90) 0%, transparent 44%),
          radial-gradient(ellipse at 45% 48%, rgba(123, 107, 212, 0.85) 0%, transparent 50%),
          radial-gradient(ellipse at 65% 62%, rgba(196, 186, 240, 0.55) 0%, transparent 52%),
          radial-gradient(ellipse at 50% 50%, rgba(220, 215, 250, 0.35) 0%, transparent 70%)
        `,
        filter: 'blur(48px)',
        zIndex: 0,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      animate={{
        scale:   [1, 1.15, 0.89, 1.11, 0.94, 1],
        rotate:  [0, 11, -8, 15, -5, 0],
        x:       ['-50%', '-50%', '-50%', '-50%', '-50%', '-50%'],
        y:       ['-50%', '-50%', '-50%', '-50%', '-50%', '-50%'],
        borderRadius: [
          '62% 38% 70% 30% / 45% 55% 45% 55%',
          '40% 60% 44% 56% / 66% 34% 66% 34%',
          '72% 28% 48% 52% / 34% 66% 38% 62%',
          '50% 50% 66% 34% / 56% 44% 60% 40%',
          '56% 44% 36% 64% / 46% 54% 48% 52%',
          '62% 38% 70% 30% / 45% 55% 45% 55%',
        ],
        opacity: [0.75, 0.92, 0.58, 0.86, 0.63, 0.75],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut',
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }}
    />
  )
}

// ── Bounce button ─────────────────────────────────────────────────────────────

function OptionButton({ onClick, children, style }) {
  const [springs, api] = useSpring(() => ({
    scale: 1,
    config: { tension: 420, friction: 14 },
  }))
  return (
    <animated.button
      onClick={onClick}
      style={{ ...style, scale: springs.scale, fontFamily: FONT }}
      onMouseDown={() => api.start({ scale: 0.94 })}
      onMouseUp={() => api.start({ scale: 1 })}
      onMouseLeave={() => api.start({ scale: 1 })}
    >
      {children}
    </animated.button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Unwind({ state, onStateChange }) {

  const suggestionsRef = useRef(null)

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

  useGSAP(() => {
    if (!suggestionsRef.current) return
    const cards = suggestionsRef.current.querySelectorAll('.suggestion-card')
    if (cards.length === 0) return
    gsap.from(cards, { opacity: 0, y: 18, duration: 0.35, ease: 'power2.out', stagger: 0.1 })
  }, [state.suggestions.length])

  async function fetchSuggestions() {
    const moodValue    = state.moodValue
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
            content: `You are a compassionate wellness companion for someone going through IVF treatment. They feel "${moodValue}" and want "${activityDesc}" activities.\n\nSuggest exactly 3 short wellness activities suited to their emotional state. Each must be doable in under 20 minutes.\n\nReply ONLY with a raw JSON array. No markdown. No backticks. No explanation. Just the array:\n[\n  {"title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},\n  {"title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},\n  {"title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"}\n]`,
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

  const { step, selectedActivities, suggestions, loading, chosenIndex } = state

  const stepVariants = {
    hidden:  { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0,   transition: { duration: 0.28, ease: 'easeOut' } },
    exit:    { opacity: 0, x: -16, transition: { duration: 0.2,  ease: 'easeIn' } },
  }

  const optionBase = {
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1.5px solid rgba(235, 235, 235, 0.5)',
    borderRadius: 14,
    padding: '18px 22px',
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    color: '#111111',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">

        {/* ── Step 0: Mood ──────────────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="step-0"
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: FONT,
              padding: '48px 24px',
            }}
          >
            <BreathingBlob />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
              <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111111', letterSpacing: '-0.5px', margin: '0 0 8px', textAlign: 'center', fontFamily: FONT }}>Unwind</h1>
              <p style={{ color: '#555555', fontSize: 14, marginBottom: 40, fontStyle: 'italic', textAlign: 'center', fontFamily: FONT }}>
                This space has no agenda. Just you, right now.
              </p>
              <p style={{ color: '#111111', fontSize: 18, fontWeight: 600, marginBottom: 4, textAlign: 'center', fontFamily: FONT }}>How are you feeling?</p>
              <p style={{ color: '#444444', fontSize: 13, marginBottom: 22, textAlign: 'center', fontFamily: FONT }}>Pick what's closest to right now</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                position: 'relative',
                zIndex: 1,
              }}>
                {moods.map((m) => (
                  <OptionButton
                    key={m.value}
                    onClick={() => update({ step: 1, moodLabel: m.label, moodValue: m.value })}
                    style={optionBase}
                  >
                    {m.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Activity ──────────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: FONT,
              padding: '48px 24px',
            }}
          >
            <BreathingBlob />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
              <button
                onClick={() => update({ step: 0, selectedActivities: [] })}
                style={{ background: 'none', border: 'none', color: '#5B4BD4', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 32, padding: 0, fontFamily: FONT, display: 'block' }}>
                ← Change mood
              </button>
              <p style={{ color: '#111111', fontSize: 18, fontWeight: 600, marginBottom: 4, textAlign: 'center', fontFamily: FONT }}>What sounds good?</p>
              <p style={{ color: '#444444', fontSize: 13, marginBottom: 22, textAlign: 'center', fontFamily: FONT }}>
                Pick up to 2 — we'll tailor your suggestions
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                marginBottom: 22,
                position: 'relative',
                zIndex: 1,
              }}>
                {activities.map((a) => {
                  const selected = isSelected(a)
                  const disabled = isDisabled(a)
                  return (
                    <OptionButton
                      key={a.value}
                      onClick={() => !disabled && toggleActivity(a)}
                      style={{
                        ...optionBase,
                        background:     selected ? '#5B4BD4' : 'rgba(255, 255, 255, 0.4)',
                        border:         `1.5px solid ${selected ? '#5B4BD4' : 'rgba(235, 235, 235, 0.5)'}`,
                        color:          selected ? '#fff' : '#111111',
                        cursor:         disabled ? 'not-allowed' : 'pointer',
                        opacity:        disabled ? 0.35 : 1,
                        transition:     'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{a.label}</span>
                      {selected && <span style={{ fontSize: 13, fontWeight: 700 }}>✓</span>}
                    </OptionButton>
                  )
                })}
              </div>

              <AnimatePresence>
                {selectedActivities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <button onClick={fetchSuggestions}
                      style={{ width: '100%', background: '#5B4BD4', border: 'none', borderRadius: 12, padding: '14px 20px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                      Find suggestions →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Suggestions ───────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 60px', fontFamily: FONT }}
          >
            <button
              onClick={() => update({ step: 1, suggestions: [], loading: false, chosenIndex: null })}
              style={{ background: 'none', border: 'none', color: '#5B4BD4', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 36, padding: 0, fontFamily: FONT }}>
              ← Change selection
            </button>
            <p style={{ color: '#111111', fontSize: 20, fontWeight: 600, marginBottom: 6, fontFamily: FONT }}>Just for you, right now</p>
            <p style={{ color: '#888888', fontSize: 14, marginBottom: 32, fontFamily: FONT }}>Based on how you're feeling today</p>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '48px 0' }}>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: 15, color: '#888888', fontFamily: FONT }}
                >
                  Finding something just for you…
                </motion.p>
              </motion.div>
            )}

            {!loading && suggestions.length > 0 && (
              <>
                <div ref={suggestionsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20, maxWidth: 640 }}>
                  {suggestions.map((s, i) => {
                    const isChosen = chosenIndex === i
                    const isDimmed = chosenIndex !== null && !isChosen

                    return (
                      <div
                        key={i}
                        className="suggestion-card"
                        style={{
                          background:   '#F7F7FA',
                          border:       `1.5px solid ${isChosen ? '#5B4BD4' : '#EBEBEB'}`,
                          borderRadius: 18,
                          padding:      '24px',
                          opacity:      isDimmed ? 0.25 : 1,
                          transition:   'opacity 0.4s ease, border-color 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                          <h3 style={{ color: '#111111', fontSize: 17, margin: 0, fontFamily: FONT }}>{s.title}</h3>
                          <span style={{ fontSize: 12, color: '#5B4BD4', background: 'rgba(91, 75, 212, 0.1)', padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontFamily: FONT }}>{s.duration}</span>
                        </div>
                        <p style={{ color: '#555555', fontSize: 14, lineHeight: 1.65, margin: '0 0 18px', fontFamily: FONT }}>{s.description}</p>

                        {chosenIndex === null && (
                          <OptionButton
                            onClick={() => update({ chosenIndex: i })}
                            style={{ width: '100%', background: '#5B4BD4', border: 'none', borderRadius: 10, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                          >
                            I'll try this
                          </OptionButton>
                        )}

                        {isChosen && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>✓</span>
                            <span style={{ color: '#5B4BD4', fontSize: 14, fontWeight: 600, fontFamily: FONT }}>You chose this</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <AnimatePresence>
                  {chosenIndex !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 14, padding: '22px 24px', marginBottom: 20, maxWidth: 640 }}
                    >
                      <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: '0 0 6px', fontFamily: FONT }}>
                        Take your time.
                      </p>
                      <p style={{ color: '#888888', fontSize: 14, margin: 0, fontFamily: FONT }}>
                        This space will be here when you get back.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={reset}
                  style={{ background: 'transparent', border: '1.5px solid #EBEBEB', borderRadius: 12, padding: '14px 24px', color: '#888888', fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>
                  Try something else
                </button>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
