const ARTICLES = [
  {
    id: 1,
    tag: 'Understanding Treatment',
    tagColor: '#6BA4B8',
    title: 'Why your stage matters more than you think',
    excerpt:
      'IVF is not a single experience. It is 12 distinct phases, each with its own emotional and physical demands. Knowing exactly where you are changes how you interpret every symptom, feeling, and waiting period.',
    readTime: '4 min read',
    url: 'https://www.hfea.gov.uk/treatments/explore-all-treatments/in-vitro-fertilisation-ivf/',
  },
  {
    id: 2,
    tag: 'Emotional Wellbeing',
    tagColor: '#C084A0',
    title: 'Holding grief and hope at the same time',
    excerpt:
      'IVF can carry grief and hope simultaneously, often in the same hour. Clinical psychologists explain why this emotional tension is entirely normal, and how to sit with it rather than resist it.',
    readTime: '5 min read',
    url: 'https://fertilitynetworkuk.org/emotional-wellbeing/',
  },
  {
    id: 3,
    tag: 'What Doctors Say',
    tagColor: '#7AAB8A',
    title: 'The two-week wait: what is actually happening in your body',
    excerpt:
      'Consultants describe the TWW as the hardest part of IVF for most patients. Here is a plain-English breakdown of the biology, and what is worth paying attention to versus what to let go of.',
    readTime: '6 min read',
    url: 'https://www.nhs.uk/conditions/ivf/',
  },
  {
    id: 4,
    tag: 'Practical Guide',
    tagColor: '#C4A76E',
    title: 'Questions your clinic wants you to ask',
    excerpt:
      'Fertility specialists say empowered patients have better experiences. A senior consultant shared the five questions she wishes every patient asked at their first appointment, and almost none do.',
    readTime: '3 min read',
    url: 'https://www.hfea.gov.uk/treatments/explore-all-treatments/questions-to-ask-your-clinic/',
  },
]

export default function Learn() {
  return (
    <div style={{ padding: '28px 20px 16px' }}>
      <p style={{ color: 'var(--text-h)', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
        Learn
      </p>
      <p style={{ color: 'var(--text)', fontSize: '13px', opacity: 0.6, marginBottom: '28px' }}>
        Evidence-backed, written in plain English
      </p>

      {ARTICLES.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'block', marginBottom: '14px' }}
        >
          <div style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '18px 20px',
            transition: 'border-color 0.15s',
          }}>
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: article.tagColor,
              background: `${article.tagColor}22`,
              padding: '3px 9px',
              borderRadius: '6px',
              marginBottom: '10px',
            }}>
              {article.tag}
            </span>

            <p style={{
              color: 'var(--text-h)', fontSize: '16px', fontWeight: '600',
              marginBottom: '8px', lineHeight: '1.4',
            }}>
              {article.title}
            </p>

            <p style={{
              color: 'var(--text)', fontSize: '13px', opacity: 0.7,
              lineHeight: '1.6', marginBottom: '12px',
            }}>
              {article.excerpt}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text)', fontSize: '11px', opacity: 0.45 }}>
                {article.readTime}
              </span>
              <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '600' }}>
                Read more →
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}