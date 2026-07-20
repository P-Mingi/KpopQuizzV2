import Link from 'next/link';

import { Logo } from './logo';
import { TopNavLinks } from './top-nav-links';
import { ThemeToggle } from './theme-toggle';
import { TopNavProfile } from './top-nav-profile';
import { NotificationBell } from './notification-bell';

/**
 * Top nav SHELL. Pure server-rendered with no cookie/auth reads, so every page
 * that uses this layout stays static/ISR-cacheable. The signed-in profile chip
 * lives in <TopNavProfile> (client island) which fetches /api/auth/me on
 * hydrate - that's the only place Supabase gets touched.
 *
 * Desktop: Logo + pill tabs + Search + Create + Profile chip.
 * Hidden on mobile via CSS (.top-nav).
 */
export function TopNav(): React.ReactElement {
  return (
    <header className="top-nav" style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 20px', maxWidth: 1240, margin: '0 auto',
      }}>
        <Logo size="md" />

        <TopNavLinks />

        <div style={{ flex: 1 }} />

        <ThemeToggle className="nav-theme-toggle" />

        {/* Search */}
        <Link href="/search" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600,
          transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="top-nav-search-label">Search</span>
        </Link>

        {/* Create */}
        <Link href="/create" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--brand-btn)', border: 'none',
          color: 'var(--accent-fg)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600,
          transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="top-nav-create-label">Create</span>
        </Link>

        {/* Notification bell + profile chip (client islands; layout stays static) */}
        <NotificationBell />
        <TopNavProfile />
      </div>
    </header>
  );
}
