import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { discordInviteWithUtm } from '@kpopquiz/shared/social-links';
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
              { label: 'Discord', href: discordInviteWithUtm('footer'), external: true },
            ].map(l => (
              <Link key={l.label} href={l.href} {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--txt2)', margin: 0, marginBottom: 6, textDecoration: 'none' }}>
                {l.label === 'Discord' && (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
                )}
                {l.label}
              </Link>
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
