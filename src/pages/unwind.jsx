import { useState } from 'react';

const moods = [
  { label: '😔 Low & tired', value: 'low and tired' },
  { label: '😰 Anxious', value: 'anxious' },
  { label: '😐 Numb / disconnected', value: 'numb and disconnected' },
  { label: '😤 Frustrated', value: 'frustrated' },
  { label: '🙂 Okay today', value: 'okay' },
  { label: '✨ Hopeful', value: 'hopeful' },
];

const activities = [
  { label: '🧘 Something calming', value: 'calming and gentle' },
  { label: '🎨 Creative outlet', value: 'creative' },
  { label: '🚶 Get moving', value: 'light movement' },
  { label: '📖 Learn / read', value: 'reading or learning' },
  { label: '🎵 Music / sound', value: 'music or sound' },
  { label: '💬 Connect with others', value: 'social connection' },
];

const FALLBACK = [
  {
    emoji: '🌬️',
    title: 'Box Breathing',
    description: 'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. This activates your parasympathetic nervous system and slows your heart rate within minutes.',
    duration: '5 minutes',
  },
  {
    emoji: '📓',
    title: 'Three Things That Were Okay',
    description: 'Write down just 3 small things that felt okay today. They do not need to be big. This gently shifts focus without bypassing how you actually feel.',
    duration: '10 minutes',
  },
  {
    emoji: '🚶',
    title: 'A Purposeless Walk',
    description: 'No destination, no pace target. Step outside and just move. Even 10 minutes of low-intensity walking lowers cortisol and gives your mind a soft reset.',
    duration: '10–15 minutes',
  },
];

const btnStyle = {
  background: 'var(--code-bg)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '16px 20px',
  color: 'var(--text-h)',
  fontSize: 16,
  textAlign: 'left',
  cursor: 'pointer',
  width: '100%',
};

export default function Unwind() {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState('');
  const [activity, setActivity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function fetchSuggestions(moodVal, activityVal) {
    setLoading(true);
    setNotice('');
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
          messages: [
            {
              role: 'user',
              content: `You are a compassionate wellness companion for someone going through IVF treatment. They feel "${moodVal}" and want "${activityVal}" activities.

Suggest exactly 3 short wellness activities suited to their emotional state. Each must be doable in under 20 minutes.

Reply ONLY with a raw JSON array. No markdown. No backticks. No explanation. Just the array:
[
  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},
  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"},
  {"emoji": "emoji here", "title": "short title", "description": "2-3 warm sentences", "duration": "X minutes"}
]`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error('Status ' + res.status);

      const data = await res.json();
      const rawText = data?.content?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length >= 1) {
        setSuggestions(parsed.slice(0, 3));
      } else {
        throw new Error('Bad shape');
      }
    } catch (err) {
      console.error('Unwind error:', err);
      setSuggestions(FALLBACK);
      setNotice('Showing curated suggestions — live recommendations temporarily unavailable.'); 
    } finally {
      setLoading(false);
    }
  }

  function pickMood(m) {
    setMood(m.label);
    setStep(1);
  }

  function pickActivity(a) {
    setActivity(a.label);
    setStep(2);
    fetchSuggestions(mood, a.value);
  }

  function reset() {
    setStep(0);
    setMood('');
    setActivity('');
    setSuggestions([]);
    setLoading(false);
    setNotice('');
  }

  if (step === 0) {
    return (
      <div style={{ padding: '28px 20px' }}>
        <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>How are you feeling?</h2>
        <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24 }}>Pick what's closest to right now</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {moods.map((m) => (
            <button key={m.value} style={btnStyle} onClick={() => pickMood(m)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={{ padding: '28px 20px' }}>
        <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>What sounds good?</h2>
        <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24 }}>Pick whatever feels right</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activities.map((a) => (
            <button key={a.value} style={btnStyle} onClick={() => pickActivity(a)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 20px' }}>
      <h2 style={{ color: 'var(--text-h)', fontSize: 22, marginBottom: 6 }}>Just for you, right now</h2>
      <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 24 }}>Based on how you're feeling today</p>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text)' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✨</div>
          <p style={{ fontSize: 15 }}>Finding something just for you…</p>
        </div>
      )}

      {!loading && notice && (
        <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>{notice}</p>
      )}

      {!loading && suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>{s.emoji}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h3 style={{ color: 'var(--text-h)', fontSize: 17, margin: 0 }}>{s.title}</h3>
                <span style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(139, 92, 246, 0.12)', padding: '3px 10px', borderRadius: 20 }}>
                  {s.duration}
                </span>
              </div>
              <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.description}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <button onClick={reset} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', color: 'var(--text)', fontSize: 15, cursor: 'pointer' }}>
          Start again
        </button>
      )}
    </div>
  );
}