import Link from 'next/link';

export function Footer(): React.ReactElement {
  return (
    <footer style={{
      padding: '28px 16px 18px',
      background: '#F5F3EE',
      borderTop: '1px solid #e8e6e0',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Brand */}
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>
              <span style={{ fontWeight: 800 }}>kpop</span><span style={{ color: '#D4537E' }}>quiz</span>
            </p>
            <p style={{ fontSize: 10, color: '#b4b2a9', margin: 0, marginTop: 6, lineHeight: 1.5 }}>
              Made with {'\u2661'} by fans, for fans.
            </p>
          </div>

          {/* Discover */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#b4b2a9', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Discover</p>
            {[
              { label: 'Quizzes', href: '/quizzes' },
              { label: 'Games', href: '/games' },
              { label: 'Cards', href: '/cards' },
              { label: 'Leaderboard', href: '/ranks' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: '#888780', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>

          {/* Community */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#b4b2a9', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Community</p>
            {[
              { label: 'Create a quiz', href: '/create' },
              { label: 'Reddit', href: 'https://reddit.com/r/Kpop_Verse' },
              { label: 'Blindtest', href: 'https://kpopblindtest.com' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: '#888780', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>

          {/* Support */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#b4b2a9', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Support</p>
            {[
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
              { label: 'Terms', href: '/terms' },
              { label: 'Privacy', href: '/privacy' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: '#888780', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #e8e6e0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#888780' }}>{'\u00A9'} 2025 kpopquiz.org</span>
          <div style={{ display: 'flex', gap: 12 }}>
            {['Twitter', 'Instagram', 'TikTok'].map(s => (
              <span key={s} style={{ fontSize: 9, color: '#b4b2a9', cursor: 'pointer' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
