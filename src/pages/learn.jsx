import { useState } from 'react'

const ARTICLES = [
  {
    id: 1,
    category: 'UNDERSTANDING TREATMENT',
    color: { bg: '#E6EEFF', text: '#3D5FC4', readMore: '#3D5FC4' },
    title: 'Why your stage matters more than you think',
    description:
      'IVF is not a single experience. It is 12 distinct phases, each with its own emotional and physical demands. Knowing exactly where you are changes how you interpret every symptom, feeling, and waiting period.',
    readTime: '4 min read',
    url: 'https://www.hfea.gov.uk/treatments/explore-all-treatments/in-vitro-fertilisation-ivf/',
  },
  {
    id: 2,
    category: 'EMOTIONAL WELLBEING',
    color: { bg: '#FFE6F3', text: '#C4336A', readMore: '#C4336A' },
    title: 'Holding grief and hope at the same time',
    description:
      'IVF can carry grief and hope simultaneously, often in the same hour. Clinical psychologists explain why this emotional tension is entirely normal, and how to sit with it rather than resist it.',
    readTime: '5 min read',
    url: 'https://fertilitynetworkuk.org/emotional-wellbeing/',
  },
  {
    id: 3,
    category: 'WHAT DOCTORS SAY',
    color: { bg: '#E6FFF3', text: '#27926A', readMore: '#27926A' },
    title: 'The two-week wait: what is actually happening in your body',
    description:
      'Consultants describe the TWW as the hardest part of IVF for most patients. Here is a plain-English breakdown of the biology, and what is worth paying attention to versus what to let go of.',
    readTime: '6 min read',
    url: 'https://www.nhs.uk/conditions/ivf/',
  },
  {
    id: 4,
    category: 'PRACTICAL GUIDE',
    color: { bg: '#F5FFD6', text: '#6B8A0A', readMore: '#6B8A0A' },
    title: 'Questions your clinic wants you to ask',
    description:
      'Fertility specialists say empowered patients have better experiences. A senior consultant shared the five questions she wishes every patient asked at their first appointment, and almost none do.',
    readTime: '3 min read',
    url: 'https://www.hfea.gov.uk/treatments/explore-all-treatments/questions-to-ask-your-clinic/',
  },
]

function ArticleCard({ article }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.18s ease',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.07)' : 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Category pill */}
      <span style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        background: article.color.bg,
        color: article.color.text,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        padding: '5px 12px',
        borderRadius: 999,
      }}>
        {article.category}
      </span>

      {/* Title */}
      <p style={{
        fontSize: 17,
        fontWeight: 700,
        color: '#111111',
        lineHeight: 1.35,
        letterSpacing: '-0.2px',
        margin: 0,
      }}>
        {article.title}
      </p>

      {/* Description */}
      <p style={{
        fontSize: 13.5,
        color: '#555555',
        lineHeight: 1.65,
        flex: 1,
        margin: 0,
      }}>
        {article.description}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
      }}>
        <span style={{
          fontSize: 12.5,
          color: '#9E9E9E',
          fontWeight: 400,
        }}>
          {article.readTime}
        </span>
        <ReadMoreLink url={article.url} color={article.color.readMore} />
      </div>
    </div>
  )
}

function ReadMoreLink({ url, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 13,
        fontWeight: 600,
        color,
        textDecoration: hovered ? 'underline' : 'none',
      }}
    >
      Read More
    </a>
  )
}

function ViewMoreButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: hovered ? 'rgba(107, 95, 212, 0.6)' : 'rgba(107, 95, 212, 0.45)',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          padding: '14px 24px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.1px',
          transition: 'background 0.18s ease',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        View More Resources
        <span style={{
          width: 28,
          height: 28,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </button>
    </div>
  )
}

export default function Learn() {
  return (
    <div style={{
      padding: '48px 48px 60px 48px',
      background: '#FFFFFF',
      minHeight: '100%',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <h1 style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#111111',
        letterSpacing: '-0.8px',
        marginBottom: 32,
        margin: '0 0 32px 0',
      }}>
        Learn
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}>
        {ARTICLES.map(article => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      <ViewMoreButton />
    </div>
  )
}
