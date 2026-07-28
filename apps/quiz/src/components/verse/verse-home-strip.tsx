import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { getVerseDirectory } from '@/lib/verse/space-data';
import { verseScopeStyle } from '@/lib/verse/theme';
import { safeFetch } from '@/lib/error-handling';

// Root portal v1 (Option A): the quiz home stays the converting home, unchanged
// in head + SEO. This ADDITIVE body strip surfaces the Verse world so both halves
// of the platform are visible from the home. Renders nothing if no spaces exist.
export async function VerseHomeStrip(): Promise<React.ReactElement | null> {
  const tiles = await safeFetch(getVerseDirectory(), [], 'verse-home-strip');
  if (tiles.length < 3) return null;
  const featured = tiles.slice(0, 4);

  return (
    <section aria-labelledby="verse-strip-title" style={{ marginBottom: 28 }}>
      <div style={HEAD}>
        <h2 id="verse-strip-title" style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt1)' }}>Fandom spaces on Verse</h2>
        <Link href="/verse" style={SEE_ALL}>Explore Verse</Link>
      </div>
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '0 0 12px' }}>
        Each fandom&apos;s home: members, discography, timeline and community, built on open data and run by fans.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {featured.map((t) => (
          <Link
            key={t.group_id}
            href={`/verse/${t.slug}`}
            className="verse-tile verse-scope flex items-center gap-3 rounded-xl border border-default bg-surface p-3 no-underline"
            style={verseScopeStyle(t)}
          >
            <GroupLogo groupName={t.name} logoUrl={t.logo_url} displayColor={t.display_color ?? '#E8457A'} textColor={t.text_color ?? '#fff'} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{t.fandom_name}</span>
              <span className="block truncate text-[11px] text-tertiary">{t.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const HEAD: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 };
const SEE_ALL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap' };
