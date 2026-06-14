import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { ThemeToggle } from './theme-toggle';

export function Footer(): React.ReactElement {
  return (
    <footer style={{
      padding: '28px 16px 18px',
      background: 'var(--surface-alt)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Brand */}
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>
              <span style={{ fontWeight: 800 }}>kpop</span><span style={{ color: 'var(--brand)' }}>quiz</span>
            </p>
            <p style={{ fontSize: 10, color: 'var(--txt3)', margin: 0, marginTop: 6, lineHeight: 1.5 }}>
              Made with {'\u2661'} by fans, for fans.
            </p>
            {/* F7 - very faint decorative mascot watermark (aria-hidden). */}
            <span aria-hidden="true" style={{ display: 'inline-flex', opacity: 0.12, marginTop: 10 }}>
              <Mascot variant="default" size={44} alt="" />
            </span>
          </div>

          {/* Discover */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--txt3)', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Discover</p>
            {[
              { label: 'Quizzes', href: '/quizzes' },
              { label: 'Trivia', href: '/trivia' },
              { label: 'Games', href: '/games' },
              { label: 'Blindtest', href: '/blindtest' },
              { label: 'Rankings', href: '/rankings' },
              { label: 'Leaderboard', href: '/leaderboard' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: 'var(--txt2)', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>

          {/* Community */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--txt3)', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Community</p>
            {[
              { label: 'Create a quiz', href: '/create' },
              { label: 'Reddit', href: 'https://reddit.com/r/Kpop_Verse' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: 'var(--txt2)', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>

          {/* Support */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--txt3)', margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Support</p>
            {[
              { label: 'About', href: '/about' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Contact', href: '/contact' },
              { label: 'Terms', href: '/terms' },
              { label: 'Privacy', href: '/privacy' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: 11, color: 'var(--txt2)', margin: 0, marginBottom: 6, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, color: 'var(--txt2)' }}>{'\u00A9'} {new Date().getFullYear()} kpopquiz.org</span>
          <span className="footer-theme" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>Theme</span>
            <ThemeToggle />
          </span>
        </div>
      </div>
    </footer>
  );
}
