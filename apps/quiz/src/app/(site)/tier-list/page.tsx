import Link from 'next/link';

import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { getRecentPublicLists } from '@/lib/tier-list/db';

import type { Metadata } from 'next';

// The Tier Lists hub (Hub.dc.html). Static/ISR: featured templates derive from the
// bank (existing groups, no DB write), the maker is reached by link, and Trending
// (which needs published lists) renders an honest coming-soon rather than faking
// rows. No emoji: inline SVG icons throughout.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'K-pop Tier List Maker: Rank Anything',
  description: 'Pick a group, drag your favourites into tiers, and share the result. Make a members, title tracks or albums tier list, or start from a blank board. No sign-up to play.',
  alternates: { canonical: '/tier-list' },
  openGraph: { title: 'K-pop Tier Lists | KpopQuiz', description: 'Rank anything in K-pop. Drag your favourites into tiers and share the card.', url: '/tier-list' },
};

function Icon({ d, filled }: { d: string; filled?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

interface Template { slug: string; name: string; kind: 'members' | 'tracks' | 'albums'; kindLabel: string; logo: string | null; color: string }

export default async function TierListHub(): Promise<React.ReactElement> {
  const groups = await safeFetch(getAllGroups(), [], '[tier-list] groups');
  const trending = await safeFetch(getRecentPublicLists(8), [], '[tier-list] trending');
  // A featured set from the bank: the first groups that have a logo, as members
  // templates (always populated). Real, not invented.
  const featured: Template[] = (groups as Array<{ slug: string; name: string; logo_url: string | null; display_color?: string }>)
    .filter((g) => g.logo_url)
    .slice(0, 8)
    .map((g) => ({ slug: g.slug, name: g.name, kind: 'members', kindLabel: 'members', logo: g.logo_url, color: g.display_color ?? '#E8457A' }));

  const chips = ['All', 'Members', 'Title tracks', 'Albums', 'Girl groups', 'Boy groups', '4th gen', 'Soloists'];

  return (
    <div className="tl tl-wrap" data-testid="tl-hub">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="tl-kick">KpopQuiz Tier Lists</div>
        <h1 className="tl-d1" style={{ fontSize: 44 }}>Rank anything in K-pop</h1>
        <p className="tl-sub" style={{ margin: '0 auto 20px' }}>Pick a group, drag your favourites into tiers, share the result. No sign-up to play.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/tier-list/create" className="tl-btn grad lg" data-testid="make-your-own">
            <Icon d="M12 5v14M5 12h14" /> Make your own tier list
          </Link>
          <Link href="/tier-list/new" className="tl-btn out lg" data-testid="start-blank">Start blank</Link>
        </div>
      </div>

      {/* Filter chips (visual set; the client filter is a later polish). */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '0 0 30px' }}>
        {chips.map((c, i) => <span key={c} className={`tl-chip${i === 0 ? ' on' : ''}`}>{c}</span>)}
      </div>

      {/* Trending: real published public lists (Phase 3). Honest empty until the
          first list is published. */}
      <div className="tl-betw" style={{ marginBottom: 12 }}>
        <h2 className="tl-d2" style={{ margin: 0 }}>Trending this week</h2>
      </div>
      {trending.length === 0 ? (
        <div className="tl-card tl-empty" style={{ marginBottom: 30 }} data-testid="trending-empty">
          Published tier lists show up here soon. Make one and be first.
        </div>
      ) : (
        <div className="tl-g4" style={{ marginBottom: 30 }} data-testid="trending">
          {trending.map((t) => (
            <Link key={t.slug} href={`/tier-list/l/${t.slug}`} className="tl-card" style={{ padding: 16, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="tl-h3" style={{ margin: 0, fontSize: 15 }}>{t.title}</span>
              <span className="tl-mut">{t.likes.toLocaleString()} likes · {t.views.toLocaleString()} views</span>
            </Link>
          ))}
        </div>
      )}

      {/* Featured templates from the bank (no DB writes). */}
      <div className="tl-betw" style={{ margin: '28px 0 12px' }}>
        <h2 className="tl-d2" style={{ margin: 0 }}>Featured templates</h2>
        <span className="tl-mut">ready sets, official images</span>
      </div>
      <div className="tl-g4" data-testid="featured">
        {featured.map((t) => (
          <Link key={`${t.slug}-${t.kind}`} href={`/tier-list/new?group=${t.slug}&kind=${t.kind}`} className="tl-card" style={{ textDecoration: 'none', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.logo ? <img src={t.logo} alt="" width={40} height={40} style={{ objectFit: 'cover' }} /> : null}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="tl-h3" style={{ margin: 0, fontSize: 15 }}>{t.name} {t.kindLabel}</span>
                <span className="tl-mut">Official images</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
