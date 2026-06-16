import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { supabase } from '../lib/supabase'

const FONT = "'Quicksand', system-ui, sans-serif"

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
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

export default function Home({ session, onNavigate }) {
  const [profile, setProfile]               = useState(null)
  const [connectionCount, setConnectionCount] = useState(0)
  const [showAbout, setShowAbout]           = useState(false)
  const [loading, setLoading]               = useState(true)
  const [editingStage, setEditingStage]     = useState(false)
  const [selectedStage, setSelectedStage]   = useState(null)
  const [saving, setSaving]                 = useState(false)

  const greetingRef = useRef(null)

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

  useGSAP(() => {
    if (!greetingRef.current || loading) return
    gsap.from(greetingRef.current, {
      opacity: 0, y: -14, duration: 0.45, ease: 'power3.out', delay: 0.05,
    })
  }, [loading])

  async function handleUpdateStage() {
    if (!selectedStage || saving) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ivf_stage: selectedStage })
      .eq('id', session.user.id)
    if (!error) {
      setProfile(prev => ({ ...prev, ivf_stage: selectedStage }))
      setEditingStage(false)
    } else {
      console.error('Stage update error:', error)
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '60px 48px', textAlign: 'center' }}>
      <p style={{ color: '#888888', fontFamily: FONT }}>Loading…</p>
    </div>
  )

  const firstName = (profile?.display_name || '').split(' ')[0]
  const stage     = profile?.ivf_stage
  const dailyLine = getDailyLine()

  // About view
  if (showAbout) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 60px', background: '#FFFFFF' }}>
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <button
          onClick={() => setShowAbout(false)}
          style={{ background: 'none', border: 'none', color: '#5B4BD4', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 28, padding: 0, fontFamily: FONT }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111111', letterSpacing: '-0.5px', margin: '0 0 32px', fontFamily: FONT }}>
          Why this space is yours
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
          <p style={{ color: '#555555', fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT }}>
            IVF can feel isolating. Clinics focus on the medical. But the emotional weight is real, and it's a lot to carry alone.
          </p>
          <p style={{ color: '#555555', fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT }}>
            Ember matches you with other women on a similar journey. Same stage. Similar path. People who actually get it.
          </p>
          <p style={{ color: '#555555', fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT }}>
            You can connect, chat privately, join communities, find things to help you unwind, and read honest articles about what IVF really involves.
          </p>
          <p style={{ color: '#555555', fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT }}>
            No forums. No strangers. Just people who understand because they're living it too.
          </p>
          <div style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 14, padding: '22px 24px', marginTop: 4 }}>
            <p style={{ color: '#111111', fontSize: 17, fontWeight: 700, margin: 0, fontFamily: FONT }}>
              This space is yours.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )

  // Main home view
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 60px', background: '#FFFFFF', fontFamily: FONT }}>

      {/* Greeting */}
      <div ref={greetingRef} style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111111', letterSpacing: '-0.5px', margin: '0 0 8px', fontFamily: FONT }}>
          {getGreeting(firstName)}
        </h1>
        <p style={{ color: '#888888', fontSize: 14, fontStyle: 'italic', margin: 0, fontFamily: FONT }}>
          "{dailyLine}"
        </p>
      </div>

      {/* Staggered cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } } }}
        style={{ maxWidth: 720 }}
      >

        {/* Stage card */}
        {stage && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } }}
            style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 18, padding: '24px', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5B4BD4', fontFamily: FONT }}>
                Your stage
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#888888', fontFamily: FONT }}>{stage} of 12</span>
                {!editingStage && (
                  <button
                    onClick={() => { setSelectedStage(stage); setEditingStage(true) }}
                    style={{ background: 'none', border: 'none', color: '#5B4BD4', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: FONT }}>
                    Update
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!editingStage ? (
                <motion.div key="stage-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div style={{ height: 4, background: '#EBEBEB', borderRadius: 4, marginBottom: 14 }}>
                    <div style={{ height: '100%', width: `${(stage / 12) * 100}%`, background: '#5B4BD4', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                  <p style={{ color: '#111111', fontSize: 16, fontWeight: 600, margin: '0 0 8px', fontFamily: FONT }}>
                    Stage {stage} · {STAGE_LABELS[stage]}
                  </p>
                  <p style={{ color: '#555555', fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: FONT }}>
                    {STAGE_SENTENCES[stage]}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="stage-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <p style={{ color: '#888888', fontSize: 13, marginBottom: 14, fontFamily: FONT }}>Which stage are you at now?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                      <button key={s} onClick={() => setSelectedStage(s)}
                        style={{
                          padding: '10px 0', borderRadius: 10,
                          border: `1px solid ${selectedStage === s ? '#5B4BD4' : '#EBEBEB'}`,
                          background: selectedStage === s ? '#5B4BD4' : 'transparent',
                          color: selectedStage === s ? '#fff' : '#555555',
                          fontSize: 14, fontWeight: selectedStage === s ? 700 : 400,
                          cursor: 'pointer', transition: 'all 0.12s ease', fontFamily: FONT,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <p style={{ color: '#111111', fontSize: 13, fontWeight: 600, marginBottom: 16, minHeight: 20, fontFamily: FONT }}>
                    {selectedStage ? `Stage ${selectedStage} · ${STAGE_LABELS[selectedStage]}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleUpdateStage} disabled={saving || !selectedStage}
                      style={{ flex: 1, background: '#5B4BD4', border: 'none', borderRadius: 10, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: FONT }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingStage(false)}
                      style={{ flex: 1, background: 'transparent', border: '1px solid #EBEBEB', borderRadius: 10, padding: '11px', color: '#888888', fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Action nudge */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } }}
          onClick={() => onNavigate?.('match')}
          style={{ background: '#F7F7FA', border: '1.5px solid #EBEBEB', borderRadius: 18, padding: '24px', marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
        >
          <div>
            <p style={{ color: '#111111', fontSize: 15, fontWeight: 600, margin: '0 0 6px', fontFamily: FONT }}>
              {connectionCount > 0
                ? `You're connected with ${connectionCount} ${connectionCount === 1 ? 'person' : 'people'}`
                : 'Your matches are ready'}
            </p>
            <p style={{ color: '#888888', fontSize: 13, margin: 0, lineHeight: 1.6, fontFamily: FONT }}>
              {connectionCount > 0
                ? 'Check in with someone today. A small message goes a long way.'
                : 'Meet someone on the same path as you.'}
            </p>
          </div>
          <span style={{ color: '#5B4BD4', fontSize: 20, flexShrink: 0 }}>→</span>
        </motion.div>

        {/* About button */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } }}
        >
          <button
            onClick={() => setShowAbout(true)}
            style={{
              width: '100%', background: 'transparent',
              border: '1.5px solid #EBEBEB', borderRadius: 14,
              padding: '18px 24px', color: '#555555', fontSize: 14,
              cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <span>Why this space is yours</span>
            <span style={{ color: '#5B4BD4', fontSize: 18 }}>→</span>
          </button>
        </motion.div>

      </motion.div>
    </div>
  )
}
