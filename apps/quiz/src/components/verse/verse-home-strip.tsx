import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { WidgetShell } from '@/components/verse/primitives/widget-shell';
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
    // V-HARMONY-2B step 2 (owner ruling): the Verse cross-promo on the PLAY quiz
    // home wears the shared soft box. `scoped` carries .verse-scope so the frame
    // tokens resolve here (they are Verse-scoped); a bare scope tints to Play
    // pink and never adds .verse-page, so the home's head + 720px canvas are
    // byte-identical.
    <WidgetShell framed scoped eyebrow="Fandom spaces on Verse" as="h2" aria="Fandom spaces on Verse"
      action={<Link href="/verse" className="whitespace-nowrap no-underline hover:underline">Explore Verse</Link>}>
      <p className="mb-3 text-[13px]" style={{ color: 'var(--txt2)' }}>
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
            <GroupLogo groupName={t.name} logoUrl={t.logo_url} displayColor={t.display_color ?? 'var(--verse-accent)'} textColor={t.text_color ?? '#fff'} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{t.fandom_name}</span>
              <span className="block truncate text-[11px] text-tertiary">{t.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </WidgetShell>
  );
}
